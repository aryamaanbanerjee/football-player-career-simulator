    /* ==========================================================================
     * LAYER 3: SIMULATION ENGINE (v5: season-by-season so the player can act mid-window)
     *   beginWindow(state, decision) -> ctx
     *   simulateSeason(state, ctx)   -> season record   (repeat ctx.years times)
     *   endWindow(state, ctx)        -> { isRetired, report }
     *   simulateWindow(state, decision) = all three in one go (used by projections & tests)
     * ========================================================================== */
    function pushEvent(state, ctx, age, type, text) {
      logDramaEvent(state, age, type, text);
      ctx.events.push({ age, type, text });
      ctx.majorHeadline = true;
    }

    function beginWindow(state, decision) {
      const { nextAge, actualWindowYears } = getDerivedState(state);
      const startAge = state.currentAge;
      const ctx = {
        startAge, nextAge, years: actualWindowYears, decision, events: [], trophies: [], seasons: [], milestones: [], midEvents: [],
        settling: false, majorHeadline: false, valueStart: state.marketValueM, next: {},
        feeM: decision.type === 'TRANSFER' ? Math.max(0, Number(decision.feeM) || 0) : 0,
      };
      const push = (age, type, text) => pushEvent(state, ctx, age, type, text);
      const interval = state.setup.transferInterval;

      if (decision.type === 'FIRST_CONTRACT') {
        const club = CLUB_MAP[decision.clubId];
        beginNewStint(state, club.id, startAge, decision.squadRole, decision.contractYears);
        state.wageM = decision.wageM || computeWage(state, club, decision.squadRole);
        state.releaseClause = decision.releaseClause || 'standard';
        state.releaseClauseM = clauseAmount(state.marketValueM, state.releaseClause);
        push(startAge, 'FIRST_CONTRACT', `Age ${startAge}: Signed first pro contract with ${club.name} (${club.league}).`);
        adjustMood(state, club.id, 10);
      } else if (decision.type === 'TRANSFER') {
        const prevClub = CLUB_MAP[state.currentClubId];
        const targetClub = CLUB_MAP[decision.clubId];
        const feeM = ctx.feeM;
        const isFreeAgent = Boolean(decision.isFreeAgent || feeM === 0);
        const rivalryTier = prevClub ? getRivalryLevel(prevClub.id, targetClub.id) : 'NONE';
        finalizeCurrentStint(state, startAge, rivalryTier !== 'NONE');
        const minYears = isFreeAgent && targetClub.starRating >= 4 ? interval * 2 : interval;
        beginNewStint(state, targetClub.id, startAge, decision.squadRole, Math.max(minYears, decision.contractYears));
        state.wageM = decision.wageM || computeWage(state, targetClub, decision.squadRole);
        state.releaseClause = decision.releaseClause || 'standard';
        state.releaseClauseM = clauseAmount(state.marketValueM, state.releaseClause);
        state.transferCount += 1;
        state.stats.totalTransferFeesM = Number((state.stats.totalTransferFeesM + feeM).toFixed(1));
        if (isFreeAgent) state.freeAgentExits += 1;
        if (targetClub.wealthTier === 'rich' && feeM >= 35) state.globalBrandPRBoost = clamp(state.globalBrandPRBoost + 0.08, 0, 0.35);
        ctx.settling = true;
        if (prevClub) adjustMood(state, prevClub.id, rivalryTier === 'ARCH_RIVAL' ? -70 : rivalryTier === 'RIVAL' ? -50 : decision.dramaTag === 'RELEASE_CLAUSE' ? -8 : -15);
        adjustMood(state, targetClub.id, decision.dramaTag === 'BOYHOOD_RETURN' ? 40 : rivalryTier !== 'NONE' ? -15 : feeM >= 60 ? 8 : 0);
        if (rivalryTier !== 'NONE' && prevClub) push(startAge, 'RIVAL_BETRAYAL', `🔥 SHOCK BETRAYAL (Age ${startAge}): Crossed from ${prevClub.name} to rivals ${targetClub.name} for €${feeM}M!`);
        else if (decision.dramaTag === 'RELEASE_CLAUSE') push(startAge, 'RELEASE_CLAUSE', `⚡ RELEASE CLAUSE (Age ${startAge}): ${targetClub.name} triggered your €${feeM}M buyout clause!`);
        else if (decision.dramaTag === 'BIDDING_WAR') push(startAge, 'BIDDING_WAR', `💰 BIDDING WAR (Age ${startAge}): ${targetClub.name} won a superclub auction for €${feeM}M!`);
        else if (decision.dramaTag === 'BOYHOOD_RETURN') push(startAge, 'BOYHOOD_RETURN', `🏠 HOMECOMING (Age ${startAge}): Returned to boyhood club ${targetClub.name} for a farewell chapter.`);
        else if (decision.dramaTag === 'STEPPING_STONE') push(startAge, 'TRANSFER', `🪜 EUROPE CALLS (Age ${startAge}): Joined ${targetClub.name} (${targetClub.league}) for €${feeM}M — the first step towards the elite.`);
        else if (isFreeAgent) push(startAge, 'FREE_AGENT', `🆓 BOSMAN MOVE (Age ${startAge}): Joined ${targetClub.name} on a €0 free transfer.`);
        else push(startAge, 'TRANSFER', `Age ${startAge}: Transferred to ${targetClub.name} (${targetClub.league}) for €${feeM}M.`);
        if (feeM >= 100) { const m = unlockMilestone(state, 'TRANSFER_100M'); if (m) ctx.milestones.push(m); }
      } else if (decision.type === 'STAY') {
        const club = CLUB_MAP[state.currentClubId];
        state.transferRequested = false;
        state.flirtClubId = null;
        adjustMood(state, club.id, 5);
        if (decision.renegotiated) {
          const r = decision.renegotiated;
          state.wageM = r.wageM * (typeof pressRenewalMult === 'function' ? pressRenewalMult(state) : 1);
          state.contractYearsRemaining = Math.max(state.contractYearsRemaining, r.contractYears);
          state.releaseClause = r.releaseClause;
          state.releaseClauseM = clauseAmount(state.marketValueM, r.releaseClause);
          state.runDownContractActive = false;
          push(startAge, 'RESIGNED', `✍️ NEW DEAL (Age ${startAge}): Agreed improved terms with ${club.name} — €${(state.wageM * 1e3 / 52).toFixed(0)}K a week.`);
        } else if (state.contractYearsRemaining <= 0) {
          // v4 fix kept: staying after running a deal down re-signs you.
          state.contractYearsRemaining = interval * 2;
          state.runDownContractActive = false;
          state.wageM = Math.max(state.wageM, computeWage(state, club, state.squadRole)) * (typeof pressRenewalMult === 'function' ? pressRenewalMult(state) : 1);
          push(startAge, 'RESIGNED', `✍️ RE-SIGNED (Age ${startAge}): Turned down free-agent suitors and signed a new ${state.contractYearsRemaining}-year deal with ${club.name}.`);
        }
        if (state.unwantedByManager && rand() < 0.30) {
          state.unwantedByManager = false;
          push(startAge, 'MANAGER_CHANGE', `🔄 NEW MANAGER (Age ${startAge}): ${club.name} appointed a new coach, giving you a fresh start!`);
        } else {
          const falloutRisk = startAge >= 33 ? 0.22 : startAge >= 31 ? 0.10 : 0.04;
          if (!state.unwantedByManager && !state.isCaptain && rand() < falloutRisk) {
            state.unwantedByManager = true;
            push(startAge, 'UNWANTED', `⚠️ FROZEN OUT (Age ${startAge}): Clashed with ${club.name}'s manager; minutes slashed.`);
          }
        }
      }
      if (decision.trainingFocus && TRAINING_FOCUS[decision.trainingFocus]) state.trainingFocus = decision.trainingFocus;
      ctx.roleStart = state.squadRole;
      ctx.acc = { apps: 0, goals: 0, assists: 0, cs: 0, tackles: 0, saves: 0, savePct: 0, yellows: 0, reds: 0, rating: 0 };
      return ctx;
    }

    /* ---------- Rival (fictional nemesis who chases the same awards) ---------- */
    function simulateRivalSeason(state, age) {
      const r = state.rival;
      if (!r || r.retired) return null;
      const prof = POSITION_PROFILES[r.position] || POSITION_PROFILES.ST;
      let moved = null;
      const club0 = CLUB_MAP[r.clubId] || CLUBS[0];
      if (age >= 19 && rand() < (age <= 27 ? 0.16 : 0.1)) {
        const minStar = age >= 32 ? 3 : age <= 20 ? 3 : 4;
        const pool = CLUBS.filter((c) => c.id !== r.clubId && c.starRating >= minStar && (age >= 32 || c.continent === 'EUROPE' || rand() < 0.1));
        if (pool.length) {
          const to = pickOne(pool);
          moved = { from: club0.name, to: to.name, feeM: Number((r.valueM * randRange(0.95, 1.3)).toFixed(1)) };
          r.clubId = to.id; r.clubs += 1;
        }
      }
      const club = CLUB_MAP[r.clubId];
      const form = age < prof.peakStart ? 0.8 + ((age - 17) / Math.max(1, prof.peakStart - 17)) * 0.2 : age <= prof.peakEnd ? 1 : clamp(1 - (age - prof.peakEnd) * 0.05, 0.7, 1);
      const rating = Number(clamp(6.6 + (r.talent - 6.6) * form + randRange(-0.32, 0.3), 6.2, 9.3).toFixed(2));
      const apps = Math.round(clamp(randRange(26, 48) * (age >= 33 ? 0.75 : 1), 8, 52));
      const goals = Math.round(apps * prof.baseGoalsPerApp * (rating / 7.3) * randRange(0.8, 1.2));
      const assists = Math.round(apps * prof.baseAssistsPerApp * (rating / 7.3) * randRange(0.8, 1.2));
      const cs = prof.baseCleanSheetRate > 0 ? Math.round(apps * prof.baseCleanSheetRate * randRange(0.8, 1.2)) : 0;
      let trophies = 0;
      if (rand() < club.trophyOdds + (rating - 7.2) * 0.05) trophies++;
      if (rand() < club.trophyOdds * 0.5) trophies++;
      r.apps += apps; r.goals += goals; r.assists += assists; r.cleanSheets += cs; r.trophies += trophies;
      const deltaPct = age < prof.peakStart ? (rating - 6.8) * 0.4 + 0.12 : age <= prof.peakEnd ? (rating - 7.2) * 0.25 : -prof.postPeakDecline;
      r.valueM = clamp(r.valueM * (1 + deltaPct), 0.5, prof.maxBaseValueM * 1.1);
      const season = { age, clubId: r.clubId, clubName: club.name, rating, apps, goals, assists, cleanSheets: cs, trophies, moved, ballonDor: false, bdRank: null, valueM: Number(r.valueM.toFixed(1)) };
      r.history.push(season);
      return season;
    }

    /* ---------- Match moments (flavour lines for the season review) ---------- */
    const MONTHS = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
    function buildMoments(state, club, s, leagueMeta) {
      if (DRY_RUN) return [];
      const prof = POSITION_PROFILES[state.setup.position];
      const opp = () => { const p = CLUBS.filter((c) => c.league === club.league && c.id !== club.id); return (p.length ? pickOne(p) : club).name; };
      const min = () => 60 + Math.floor(rand() * 34);
      const derby = club.rivals.map((id) => CLUB_MAP[id]).filter((c) => c && c.league === club.league);
      const out = [];
      if (derby.length && rand() < 0.75) {
        const d = pickOne(derby);
        out.push(prof.primaryStatType === 'ATTACK' && s.goals > 0 ? `${min()}' — scored the winner in the derby against ${d.name}.` : prof.category === 'GK' ? `Derby day vs ${d.name}: a string of saves to keep a clean sheet.` : `Derby day vs ${d.name}: a last-ditch block in stoppage time sealed it.`);
      }
      if (s.trophies.some((t) => t.category === 'DOMESTIC_LEAGUE')) out.push(`Title clinched on the final day away at ${opp()}.`);
      const cup = s.trophies.find((t) => t.category === 'DOMESTIC_CUP');
      if (cup) out.push(`${leagueMeta.domesticCup} final: ${prof.primaryStatType === 'ATTACK' ? `${1 + Math.floor(rand() * 2)} goal(s) in a 3–1 win` : 'a clean sheet in a 1–0 win'}.`);
      if (s.trophies.some((t) => t.category === 'CONTINENTAL')) out.push('Named man of the match in the continental final.');
      if (prof.primaryStatType === 'ATTACK' && s.goals >= 18 && rand() < 0.8) out.push(`Hat-trick against ${opp()} in ${pickOne(MONTHS)}.`);
      if (s.assists >= 12 && rand() < 0.6) out.push(`Three assists in a 4–1 rout of ${opp()}.`);
      if (prof.category === 'GK' && s.cleanSheets >= 12 && rand() < 0.7) out.push(`Saved a penalty against ${opp()} to protect a 1–0 lead.`);
      if (s.injured) out.push(`Stretchered off against ${opp()} in ${pickOne(MONTHS)}.`);
      if (s.reds > 0) out.push(`Sent off with a ${min()}' red card against ${opp()}.`);
      if (s.rating < 6.75) out.push(`Booed off after a 0–3 home defeat to ${opp()}.`);
      return out.slice(0, 3);
    }

    function addAward(state, ctx, age, kind, title, clubName, eventText) {
      state.awards.push({ age, kind, title, clubName });
      if (eventText) pushEvent(state, ctx, age, kind === 'ACCOLADE' ? 'ACCOLADE' : 'AWARD', eventText);
    }

    function simulateSeason(state, ctx) {
      const y = ctx.seasons.length;
      const yearAge = ctx.startAge + y;
      const posProfile = POSITION_PROFILES[state.setup.position];
      const continentData = CONTINENTS[state.setup.continent];
      const nation = getNation(state);
      const club = CLUB_MAP[state.currentClubId];
      const leagueMeta = LEAGUES[club.league] || { prestige: 1.0, domesticCup: 'Domestic Cup', hasRelegation: false };
      const isBoundaryTransferYear = y === 0 && ctx.decision.type === 'TRANSFER';
      const evStart = ctx.events.length;
      const trStart = ctx.trophies.length;
      const valueStart = state.marketValueM;
      const wasRelegated = state.relegatedLastWindow;
      const mods = ctx.next || {};
      ctx.next = {};
      const push = (age, type, text) => pushEvent(state, ctx, age, type, text);
      const focus = TRAINING_FOCUS[state.trainingFocus] || TRAINING_FOCUS.BALANCED;

      let onLoan = false;
      let loanClub = null;
      let effStars = club.starRating;
      let roleCfg = SQUAD_ROLES[state.squadRole] || SQUAD_ROLES.ROTATION;
      if ((y === 0 && willTriggerYouthLoan(yearAge, club, state.squadRole, state.marketValueM)) || mods.forceLoan) {
        onLoan = true;
        const maxS = mods.forceLoan ? 3 : 3;
        const minS = mods.forceLoan ? 2 : 1;
        const loanPool = CLUBS.filter((c) => c.id !== club.id && c.continent === club.continent && c.starRating <= maxS && c.starRating >= minS);
        loanClub = loanPool.length ? pickOne(loanPool) : { name: `${club.name} B`, starRating: 2 };
        roleCfg = SQUAD_ROLES.KEY_PLAYER;
        effStars = mods.forceLoan ? loanClub.starRating || 2 : 2;
        if (mods.forceLoan) push(yearAge, 'SEASON_LOAN', `🧳 SEASON LOAN (Age ${yearAge}): Joined ${loanClub.name} on loan for a season of regular football.`);
        else push(yearAge, 'YOUTH_LOAN', `🌱 YOUTH LOAN (Age ${yearAge}): ${club.name} loaned you to ${loanClub.name} for regular minutes.`);
      }

      const maxGames = effStars >= 4 ? 50 : effStars === 3 ? 44 : 38;
      let appRate = roleCfg.appRate;
      // v13: small, capped edges from training details, weak foot, traits and positions (no random numbers).
      const edges = typeof v13EngineEdges === 'function' ? v13EngineEdges(state) : { goals: 0, assists: 0, cs: 0, games: 0, rating: 0, injury: 0, decline: 0, final: 0 };
      if (yearAge <= 19 && continentData.earlyMinutesBonus > 0 && !onLoan) appRate = clamp(appRate + continentData.earlyMinutesBonus / maxGames, 0.45, 0.96);
      if (state.unwantedByManager && !onLoan) appRate *= DRAMA_TYPES.UNWANTED.appPenalty;
      if (state.runDownContractActive && state.contractYearsRemaining <= 1) appRate *= 0.65;
      if (state.relegatedLastWindow) appRate *= DRAMA_TYPES.RELEGATED.appPenalty;
      if (mods.appMult) appRate *= mods.appMult;
      // v8: a manager who trusts you finds a few more games (never during projections), and guided first careers are gentler at 17-19.
      if (typeof storyAppMult === 'function') appRate *= storyAppMult(state);
      appRate *= 1 + edges.games;
      const diff = difficultyOf(state);
      appRate *= diff.apps;
      const gentle = !!(state.setup && state.setup.guided) && yearAge <= 19;
      if (gentle) appRate *= 1.08;
      if (yearAge > posProfile.peakEnd + 4) {
        const yearsOver = yearAge - (posProfile.peakEnd + 4);
        appRate *= clamp(1 - yearsOver * (state.globalBrandPRBoost > 0 ? 0.05 : 0.07), 0.35, 1.0);
      }

      let injured = false;
      let injuryChance = (yearAge >= 32 ? 0.16 : 0.10) * (focus === TRAINING_FOCUS.ATHLETIC || focus === TRAINING_FOCUS.GK_ATHLETIC ? 0.75 : 1) * (mods.injuryMult || 1) * (gentle ? 0.5 : 1) * (typeof injuryRiskMult === 'function' ? injuryRiskMult(state) : 1);
      injuryChance *= (1 + edges.injury) * diff.injury;
      if (mods.rush) { appRate *= 1.15; injuryChance = Math.max(injuryChance, 0.35); }
      if (rand() < injuryChance) {
        injured = true;
        appRate *= randRange(0.45, 0.70);
        if (y === 0 || mods.rush) push(yearAge, 'INJURY', mods.rush ? `🏥 SETBACK (Age ${yearAge}): Rushing back backfired — another long spell on the sidelines.` : `🏥 INJURY SPELL (Age ${yearAge}): Missed months of action due to injury.`);
      }
      appRate = clamp(appRate, 0.05, 1);

      const seasonApps = Math.max(2, Math.round(maxGames * appRate + randRange(-3, 3)));
      if (onLoan && loanClub) {
        state.loanHistory.push({ age: yearAge, parentClubId: club.id, loanClubName: loanClub.name, appearances: seasonApps });
        state.lastStintAppearances = Math.max(state.lastStintAppearances, seasonApps);
      }

      const { level: leagueRivalry } = getCareerRivalryStatus(state, club.id, { sameLeagueOnly: true });
      const derbyBoost = leagueRivalry === 'ARCH_RIVAL' ? 1.25 : leagueRivalry === 'RIVAL' ? 1.15 : 1.0;
      const cardMult = leagueRivalry === 'ARCH_RIVAL' ? 1.35 : leagueRivalry === 'RIVAL' ? 1.20 : 1.0;
      const ageForm = yearAge < posProfile.peakStart
        ? 0.85 + ((yearAge - 17) / Math.max(1, posProfile.peakStart - 17)) * 0.2
        : yearAge <= posProfile.peakEnd ? 1.08 : clamp(1.05 - (yearAge - posProfile.peakEnd) * 0.045 * (1 + edges.decline), 0.68, 1.05);
      const attrMod = attributeModifier(state);
      const outMult = (ctx.settling && y === 0 ? 0.85 : 1.0) * ageForm * (0.85 + effStars * 0.06) * (1 + (derbyBoost - 1) * 0.35) * attrMod;

      const seasonGoals = Math.max(0, Math.round(seasonApps * posProfile.baseGoalsPerApp * outMult * randRange(0.75, 1.3) * (1 + edges.goals)));
      const seasonAssists = Math.max(0, Math.round(seasonApps * posProfile.baseAssistsPerApp * outMult * randRange(0.75, 1.3) * (1 + edges.assists)));
      const seasonCleanSheets = posProfile.baseCleanSheetRate > 0
        ? Math.max(0, Math.round(seasonApps * posProfile.baseCleanSheetRate * (0.78 + effStars * 0.08) * ageForm * Math.sqrt(attrMod) * randRange(0.8, 1.2) * (1 + edges.cs))) : 0;
      const seasonTackles = posProfile.baseTacklesPerApp > 0 ? Math.round(seasonApps * posProfile.baseTacklesPerApp * ageForm * attrMod * randRange(0.85, 1.15)) : 0;
      let seasonSaves = 0;
      let seasonSavePct = 0;
      if (posProfile.category === 'GK') {
        seasonSaves = Math.round(seasonApps * randRange(2.6, 3.8));
        seasonSavePct = Number(clamp(posProfile.baseSavePct + (effStars - 3) * 1.4 + (ageForm - 1) * 8 + (attrMod - 1) * 5 + randRange(-2.5, 3.2), 64.0, 86.5).toFixed(1));
        state.stats.savePctSum += seasonSavePct;
        state.stats.savePctYears += 1;
        ctx.acc.savePct += seasonSavePct;
      }

      const tierTag = state.relegatedLastWindow ? ' (2nd Div)' : '';
      if (!onLoan && seasonGoals >= 30) addAward(state, ctx, yearAge, 'ACCOLADE', `Golden Boot${tierTag}`, club.name, `👟 GOLDEN BOOT${tierTag} (Age ${yearAge}): Scored ${seasonGoals} goals in ${seasonApps} games!`);
      else if (!onLoan && seasonAssists >= 20) addAward(state, ctx, yearAge, 'ACCOLADE', `Playmaker Award${tierTag}`, club.name, `🎯 PLAYMAKER${tierTag} (Age ${yearAge}): Recorded ${seasonAssists} assists at ${club.name}!`);
      else if (!onLoan && posProfile.primaryStatType !== 'ATTACK' && seasonCleanSheets >= 20) addAward(state, ctx, yearAge, 'ACCOLADE', `Golden Glove${tierTag}`, club.name, `🧤 GOLDEN GLOVE${tierTag} (Age ${yearAge}): Kept ${seasonCleanSheets} clean sheets!`);

      const seasonYellows = Math.max(0, Math.round(seasonApps * posProfile.yellowProbPerApp * cardMult * randRange(0.7, 1.35)));
      const seasonReds = rand() < seasonApps * posProfile.redProbPerApp * cardMult ? 1 : 0;

      let rawScore = 6.85 + roleCfg.ratingBonus + (effStars - 3) * 0.16;
      if (posProfile.primaryStatType === 'ATTACK') {
        const actualIdx = (seasonGoals + seasonAssists * 0.8 + seasonTackles * 0.07 + seasonCleanSheets * 0.25) / Math.max(1, seasonApps);
        const baseIdx = posProfile.baseGoalsPerApp + posProfile.baseAssistsPerApp * 0.8 + posProfile.baseTacklesPerApp * 0.07 + posProfile.baseCleanSheetRate * 0.25;
        // v5: compare output to the position's own expectation as a ratio, so low-volume roles (CM/CDM) aren't penalised.
        rawScore += (actualIdx / Math.max(0.05, baseIdx) - 0.78) * 1.1;
      } else if (posProfile.primaryStatType === 'DEFENSE') {
        const csRate = seasonCleanSheets / Math.max(1, seasonApps);
        const tklRate = seasonTackles / Math.max(1, seasonApps);
        rawScore += (csRate - 0.31) * 2.0 + (tklRate - posProfile.baseTacklesPerApp * 0.85) * 0.18 + (seasonGoals + seasonAssists) * 0.02;
      } else {
        const csRate = seasonCleanSheets / Math.max(1, seasonApps);
        rawScore += (csRate - 0.33) * 1.9 + (seasonSavePct - 74.0) * 0.08;
      }
      // v13: the rating formula undervalued keepers and holding midfielders slightly.
      rawScore += ({ GK: 0.08, CDM: 0.05 })[state.setup.position] || 0;
      if (injured) rawScore -= 0.22;
      if (seasonReds > 0) rawScore -= 0.15;
      const storyForm = !DRY_RUN && state.story && state.story.form ? state.story.form : 0;
      if (storyForm) state.story.form = 0;
      rawScore += (mods.ratingBonus || 0) + storyForm + edges.rating + diff.rating + randRange(-0.22, 0.28);
      const seasonRating = Number(clamp(rawScore, 6.0, 9.6).toFixed(2));

      const st = state.stats;
      st.appearances += seasonApps; st.goals += seasonGoals; st.assists += seasonAssists; st.cleanSheets += seasonCleanSheets;
      st.tackles += seasonTackles; st.saves += seasonSaves; st.yellowCards += seasonYellows; st.redCards += seasonReds;
      st.ratingSum += seasonRating; st.ratedYears += 1;
      st.careerEarningsM = Number((st.careerEarningsM + state.wageM).toFixed(2));
      if (state.currentStint) {
        const cs = state.currentStint;
        cs.seasons += 1; cs.appearances += seasonApps; cs.goals += seasonGoals; cs.assists += seasonAssists; cs.cleanSheets += seasonCleanSheets;
      }
      const a = ctx.acc;
      a.apps += seasonApps; a.goals += seasonGoals; a.assists += seasonAssists; a.cs += seasonCleanSheets; a.tackles += seasonTackles;
      a.saves += seasonSaves; a.yellows += seasonYellows; a.reds += seasonReds; a.rating += seasonRating;

      state.loyaltyYears += 1;
      if (state.contractYearsRemaining > 0) state.contractYearsRemaining -= 1;

      const loyaltyBonus = (state.loyaltyYears >= 6 ? 0.08 : state.loyaltyYears >= 3 ? 0.04 : 0) + (state.loyaltyYears >= 3 ? agentOf(state).loyaltyBonus : 0);
      const capChance = posProfile.captaincyChance * (focus === TRAINING_FOCUS.LEADERSHIP ? 1.8 : 1);
      if (!state.isCaptain && !onLoan && state.loyaltyYears >= 3 && yearAge >= 23 && rand() < capChance) {
        state.isCaptain = true;
        push(yearAge, 'CAPTAIN', `©️ CLUB CAPTAIN (Age ${yearAge}): Named captain of ${club.name}, boosting trophy odds!`);
      }

      const relPenalty = state.relegatedLastWindow ? DRAMA_TYPES.RELEGATED.prestigePenalty : 1.0;
      const leagueWinProb = clamp((club.trophyOdds + loyaltyBonus + (state.isCaptain ? 0.05 : 0) + (seasonRating - 7.0) * 0.06) * relPenalty, 0.01, 0.72);
      let majorTrophiesThisYear = 0;
      let wonLeagueThisYear = false;
      const awardTrophy = (clubId, clubName, title, category) => {
        const t = { yearAge, clubId, clubName, title, category };
        state.trophies.push(t);
        if (state.currentStint && state.currentStint.clubId === clubId) state.currentStint.trophiesWon += 1;
        if (state.clubTallies[clubId]) state.clubTallies[clubId].trophies += 1;
        ctx.trophies.push(t);
      };
      if (!state.clubTallies[club.id]) state.clubTallies[club.id] = { apps: 0, goals: 0, cleanSheets: 0, seasons: 0, trophies: 0 };

      if (!onLoan && !state.relegatedLastWindow && rand() < leagueWinProb) {
        awardTrophy(club.id, club.name, `${club.league} Champion`, 'DOMESTIC_LEAGUE');
        majorTrophiesThisYear += 1;
        wonLeagueThisYear = true;
        push(yearAge, 'TROPHY', `🏆 LEAGUE CHAMPIONS (Age ${yearAge}): Won the ${club.league} title with ${club.name}!`);
      }
      if (!onLoan && rand() < leagueWinProb * 0.85 + edges.final) awardTrophy(club.id, club.name, `${leagueMeta.domesticCup} Winner`, 'DOMESTIC_CUP');
      // Continental cup belongs to the club's confederation (v4 fix).
      const clubCup = (CONTINENTS[club.continent] || continentData).clubContinentalCup;
      const contProb = state.relegatedLastWindow ? 0 : club.starRating >= 4 ? leagueWinProb * 0.52 : club.starRating === 3 ? leagueWinProb * 0.22 : 0.02;
      if (!onLoan && rand() < contProb + (contProb > 0.02 ? edges.final : 0)) {
        awardTrophy(club.id, club.name, `${clubCup} Winner`, 'CONTINENTAL');
        majorTrophiesThisYear += 1.5;
        push(yearAge, 'TROPHY', `🌟 CONTINENTAL GLORY (Age ${yearAge}): Lifted the ${clubCup} with ${club.name}!`);
      }

      // Relegation & promotion with named second divisions.
      const secondTier = SECOND_TIERS[club.league] || `${club.league} second tier`;
      if (!onLoan && !wonLeagueThisYear && leagueMeta.hasRelegation && club.starRating <= 2 && !state.relegatedLastWindow && rand() < 0.14) {
        state.relegatedLastWindow = true;
        push(yearAge, 'RELEGATED', `📉 RELEGATED (Age ${yearAge}): ${club.name} dropped into the ${secondTier}!`);
      } else if (state.relegatedLastWindow && rand() < 0.60) {
        state.relegatedLastWindow = false;
        if (rand() < 0.5 && !onLoan) {
          awardTrophy(club.id, club.name, `${secondTier} Champion`, 'SECOND_TIER');
          push(yearAge, 'PROMOTED', `⬆️ CHAMPIONS & PROMOTED (Age ${yearAge}): Won the ${secondTier} title — ${club.name} are back in the ${club.league}!`);
        } else {
          push(yearAge, 'PROMOTED', `⬆️ PROMOTED (Age ${yearAge}): Helped ${club.name} bounce back from the ${secondTier} to the ${club.league}!`);
        }
      }

      if (!onLoan) {
        const won = ctx.trophies.slice(trStart).filter((t) => t.clubId === club.id);
        adjustMood(state, club.id, won.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length * 10 + won.filter((t) => !MAJOR_TROPHY_TYPES.has(t.category)).length * 4
          + (seasonRating >= 7.8 ? 5 : seasonRating < 6.8 ? -5 : 1) + (state.relegatedLastWindow && !wasRelegated ? -10 : 0) + (state.isCaptain ? 2 : 0));
      }

      // International football: real nation, call-up bar scales with nation strength.
      let seasonTournament = null;
      const tournament = TOURNAMENT_SCHEDULE[yearAge];
      const hadLoanAt17 = yearAge === 18 && state.loanHistory.some((l) => l.age === 17);
      const eligApps = isBoundaryTransferYear ? Math.max(seasonApps, state.lastStintAppearances) : hadLoanAt17 ? Math.max(seasonApps, state.lastStintAppearances) : seasonApps;
      const needApps = (yearAge === 18 ? 16 : 22) + Math.round((nation.str - 1) * 6);
      const needRating = 6.65 + (nation.str - 0.6) * 0.7;
      const selected = eligApps >= needApps && seasonRating >= needRating;
      if (selected && yearAge >= 18) {
        const caps = Math.round(randRange(3, 7));
        st.internationalCaps += caps;
        st.internationalGoals += Math.round(caps * posProfile.baseGoalsPerApp * 0.7 * randRange(0.5, 1.4));
        if (!state.nationalCaptain && st.internationalCaps >= 40 && yearAge >= 25 && rand() < posProfile.captaincyChance * 1.2) {
          state.nationalCaptain = true;
          push(yearAge, 'NATIONAL_CAPTAIN', `🎗️ NATIONAL CAPTAIN (Age ${yearAge}): Handed the ${nation.name} armband after ${st.internationalCaps} caps.`);
        }
      }
      if (tournament) {
        const tTitle = tournament.type === 'WORLD_CUP' ? 'FIFA World Cup' : continentData.tournamentName;
        seasonTournament = { title: tTitle, type: tournament.type, calledUp: selected, won: false };
        if (selected) {
          st.internationalCaps += Math.round(randRange(4, 7));
          const base = tournament.type === 'WORLD_CUP' ? clamp(0.02 + (nation.str - 0.8) * 0.3, 0.01, 0.2) : clamp(0.08 + (nation.str - 0.7) * 0.35, 0.03, 0.32);
          if (rand() < clamp(base + (seasonRating - 7.2) * 0.06, 0.01, 0.45)) {
            seasonTournament.won = true;
            awardTrophy('NATIONAL_TEAM', nation.name, tTitle, 'INTERNATIONAL');
            majorTrophiesThisYear += tournament.type === 'WORLD_CUP' ? 2.5 : 1.5;
            push(yearAge, 'INTL_GLORY', `🌍 INTERNATIONAL GLORY (Age ${yearAge}): Won the ${tTitle} with ${nation.name}!`);
          } else {
            push(yearAge, 'INTL_CAP', `🧳 CALLED UP (Age ${yearAge}): Represented ${nation.name} at the ${tTitle}.`);
          }
        } else {
          push(yearAge, 'INTL_SNUB', `❌ INTERNATIONAL SNUB (Age ${yearAge}): ${eligApps < needApps ? 'Low club minutes' : 'Patchy form'} cost you a ${nation.name} spot at the ${tTitle}.`);
        }
      }

      // Rival season + Ballon d'Or race with ranking.
      const rivalSeason = simulateRivalSeason(state, yearAge);
      let seasonBallonDor = false;
      let bdRank = null;
      let bdProb = 0;
      if (!state.relegatedLastWindow && seasonRating >= 7.75 && seasonApps >= 26) {
        const rFactor = Math.pow((seasonRating - 7.5) / 1.8, 2);
        // Keepers rarely win it (design doc): extra 0.25× voting penalty.
        bdProb = clamp(rFactor * posProfile.ballonDOrWeight * (posProfile.category === 'GK' ? 0.25 : 1) * leagueMeta.prestige * (0.28 + majorTrophiesThisYear * 0.24 + state.globalBrandPRBoost * 0.5), 0, 0.82);
        if (rivalSeason && rivalSeason.rating >= 7.7 && rivalSeason.rating > seasonRating) bdProb *= 0.8;
        if (rand() < bdProb) {
          seasonBallonDor = true;
          bdRank = 1;
          st.ballonDOrs += 1;
          st.ballonDOrYears.push(yearAge);
          push(yearAge, 'BALLON_DOR', `🏆 BALLON D'OR (Age ${yearAge}): Crowned world's best player at ${club.name} (#${st.ballonDOrs})!`);
          const m = unlockMilestone(state, 'FIRST_BALLON_DOR');
          if (m) ctx.milestones.push(m);
        }
      }
      let rivalWonBdo = false;
      if (rivalSeason && !seasonBallonDor && rivalSeason.rating >= 7.7) {
        const rp = clamp(Math.pow((rivalSeason.rating - 7.55) / 0.9, 2) * 0.4 * (rivalSeason.trophies ? 1.3 : 1), 0, 0.4);
        if (rand() < rp) {
          rivalWonBdo = true;
          rivalSeason.ballonDor = true;
          rivalSeason.bdRank = 1;
          state.rival.ballonDOrs += 1;
          push(yearAge, 'RIVAL_BDO', `😤 RIVAL'S NIGHT (Age ${yearAge}): ${state.rival.name} won the Ballon d'Or at ${rivalSeason.clubName}.`);
        }
      }
      if (!seasonBallonDor && seasonApps >= 20 && seasonRating >= 7.3) {
        const score = (seasonRating - 7.0) * 10 + majorTrophiesThisYear * 3 + (leagueMeta.prestige - 1) * 10 + state.globalBrandPRBoost * 10;
        bdRank = clamp(Math.round(34 - score * 2.2 + randRange(-2, 2)), 2, 31);
        if (bdProb > 0.15) bdRank = Math.min(bdRank, 2 + Math.floor(rand() * 4));
        if (bdRank > 30) bdRank = null;
      }
      if (rivalSeason && !rivalSeason.ballonDor && rivalSeason.rating >= 7.3) {
        rivalSeason.bdRank = clamp(Math.round(34 - (rivalSeason.rating - 7.0) * 10 * 2.2 - rivalSeason.trophies * 4 + randRange(-2, 2)), 2, 30);
        if (bdRank && rivalSeason.bdRank === bdRank) rivalSeason.bdRank = Math.min(30, bdRank + 1);
      }
      if (rivalSeason && (rivalSeason.bdRank != null) && (state.rival.bestRank == null || rivalSeason.bdRank < state.rival.bestRank)) state.rival.bestRank = rivalSeason.bdRank;
      if (bdRank != null) {
        if (st.bestBdORank == null || bdRank < st.bestBdORank) st.bestBdORank = bdRank;
        if (bdRank >= 2 && bdRank <= 3) {
          st.bdoPodiums += 1;
          push(yearAge, 'BDO_PODIUM', `🥈 BALLON D'OR PODIUM (Age ${yearAge}): Finished ${bdRank === 2 ? '2nd' : '3rd'} in the Ballon d'Or voting.`);
        }
      }

      // Other individual awards.
      if (!onLoan && seasonApps >= 28 && seasonRating >= 7.55) addAward(state, ctx, yearAge, 'TOTS', `${club.league} Team of the Season`, club.name, null);
      if (!onLoan && seasonApps >= 30 && seasonRating >= 7.85 && rand() < (wonLeagueThisYear ? 0.75 : 0.5)) addAward(state, ctx, yearAge, 'POTY', `${club.league} Player of the Year`, club.name, `🥇 PLAYER OF THE YEAR (Age ${yearAge}): Voted the best player in the ${club.league}.`);
      if (yearAge <= 23 && seasonApps >= 24 && seasonRating >= 7.4 && rand() < 0.6) addAward(state, ctx, yearAge, 'YPOTY', `${onLoan ? 'Loan' : club.league} Young Player of the Year`, onLoan && loanClub ? loanClub.name : club.name, `🌟 YOUNG PLAYER OF THE YEAR (Age ${yearAge}): The brightest young talent in the league.`);
      if (yearAge <= 21 && seasonApps >= 25 && seasonRating >= 7.45 && state.marketValueM >= 12 && !state.awards.some((x) => x.kind === 'GOLDEN_BOY') && rand() < 0.35) addAward(state, ctx, yearAge, 'GOLDEN_BOY', 'Golden Boy', club.name, `✨ GOLDEN BOY (Age ${yearAge}): Named the best under-21 player in Europe's eyes.`);

      // Club tallies & records.
      if (!onLoan) {
        const t = state.clubTallies[club.id];
        t.apps += seasonApps; t.goals += seasonGoals; t.cleanSheets += seasonCleanSheets; t.seasons += 1;
        const rec = clubRecord(club.id);
        const already = (type) => state.clubRecordsBroken.some((r) => r.clubId === club.id && r.type === type);
        const statKey = posProfile.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
        if (t[statKey] > rec[statKey] && !already(statKey)) {
          state.clubRecordsBroken.push({ clubId: club.id, clubName: club.name, type: statKey, age: yearAge });
          adjustMood(state, club.id, 10);
          push(yearAge, 'CLUB_RECORD', `🏛️ CLUB RECORD (Age ${yearAge}): ${t[statKey]} ${statKey === 'goals' ? 'goals' : 'clean sheets'} — now ${club.name}'s all-time leader!`);
        }
        if (t.apps > rec.apps && !already('apps')) {
          state.clubRecordsBroken.push({ clubId: club.id, clubName: club.name, type: 'apps', age: yearAge });
          push(yearAge, 'CLUB_RECORD', `🏛️ CLUB RECORD (Age ${yearAge}): ${t.apps} appearances — the most in ${club.name} history!`);
        }
      }

      // Market value & ageing curve.
      const breakoutMult = yearAge <= 20 && state.setup.continent !== 'EUROPE' ? continentData.breakoutMultiplier : 1.0;
      let deltaPct = 0;
      if (yearAge < posProfile.peakStart) deltaPct = ((seasonRating - 6.7) * 0.35 + majorTrophiesThisYear * 0.08 + 0.14) * breakoutMult;
      else if (yearAge <= posProfile.peakEnd) deltaPct = (seasonRating - 7.1) * 0.24 + majorTrophiesThisYear * 0.07;
      else { const past = yearAge - posProfile.peakEnd; deltaPct = -(posProfile.postPeakDecline * (1 + past * 0.12)) + Math.max(0, (seasonRating - 7.4) * 0.12); }
      // v13: the transfer market pays most for forwards and least for goalkeepers; growth is scaled by position
      // so a keeper's longer growth years don't make him worth more than a striker.
      if (deltaPct > 0) deltaPct *= (VALUE_GROWTH[state.setup.position] || 1);
      const capM = posProfile.maxBaseValueM * (0.45 + club.starRating * 0.13) * leagueMeta.prestige;
      state.marketValueM = Number(clamp(state.marketValueM * (1 + deltaPct), 0.5, Math.max(25, capM)).toFixed(1));
      if (state.marketValueM > state.peakMarketValueM) { state.peakMarketValueM = state.marketValueM; state.peakValueAge = yearAge + 1; }
      state.valueHistory.push({ age: yearAge + 1, valueM: state.marketValueM });

      // Attribute development (minutes, coaching, training focus).
      const attrsBefore = developAttributes(state, { apps: seasonApps, maxGames, clubStars: effStars, yearAge });
      if (!DRY_RUN) state.attrHistory.push({ age: yearAge + 1, overall: Number(overallRating(state.setup.position, state.attributes).toFixed(2)) });

      const record = {
        age: yearAge, season: seasonLabel(yearAge), clubId: club.id, clubName: club.name, league: wasRelegated ? secondTier : club.league,
        onLoan, loanClubName: onLoan && loanClub ? loanClub.name : null, role: onLoan ? 'KEY_PLAYER' : state.squadRole,
        apps: seasonApps, goals: seasonGoals, assists: seasonAssists, cleanSheets: seasonCleanSheets, tackles: seasonTackles,
        saves: seasonSaves, savePct: posProfile.category === 'GK' ? seasonSavePct : null, yellows: seasonYellows, reds: seasonReds,
        rating: seasonRating, injured, secondTier: wasRelegated, ballonDor: seasonBallonDor, bdRank, rivalWonBdo,
        tournament: seasonTournament,
        trophies: ctx.trophies.slice(trStart).map((t) => ({ title: t.title, category: t.category, clubName: t.clubName })),
        awards: state.awards.filter((x) => x.age === yearAge).map((x) => x.title),
        events: ctx.events.slice(evStart),
        valueStart, valueEnd: state.marketValueM, wageM: state.wageM,
        attrsBefore, attrsAfter: { ...state.attributes },
        edges: edges.parts ? { goals: seasonGoals - Math.round(seasonGoals / (1 + edges.goals)), assists: seasonAssists - Math.round(seasonAssists / (1 + edges.assists)), cs: seasonCleanSheets - Math.round(seasonCleanSheets / (1 + edges.cs)), rating: edges.rating, games: edges.games, parts: edges.parts } : null,
        rival: rivalSeason ? { name: state.rival.name, clubName: rivalSeason.clubName, rating: rivalSeason.rating, goals: rivalSeason.goals, cleanSheets: rivalSeason.cleanSheets, apps: rivalSeason.apps, trophies: rivalSeason.trophies, moved: rivalSeason.moved, ballonDor: rivalSeason.ballonDor, bdRank: rivalSeason.bdRank } : null,
      };
      record.moments = buildMoments(state, club, record, leagueMeta);
      if (rivalSeason && rivalSeason.moved && !DRY_RUN) logDramaEvent(state, yearAge, 'RIVAL_MOVE', `🔁 RIVAL ON THE MOVE (Age ${yearAge}): ${state.rival.name} swapped ${rivalSeason.moved.from} for ${rivalSeason.moved.to} (€${rivalSeason.moved.feeM}M).`);
      ctx.seasons.push(record);
      if (!DRY_RUN) state.seasonLog.push(record);
      return record;
    }

    function endWindow(state, ctx) {
      const posProfile = POSITION_PROFILES[state.setup.position];
      const club = CLUB_MAP[state.currentClubId];
      const years = ctx.seasons.length;
      const windowAvgRating = years > 0 ? Number((ctx.acc.rating / years).toFixed(2)) : 7.0;
      const roleIdx = ROLE_ORDER.indexOf(state.squadRole);
      // v5: promotion bar depends on your current role and the club's level (v4 used a flat 7.6).
      const promoteBar = ({ PROSPECT: 7.15, ROTATION: 7.35, KEY_PLAYER: 7.6 }[state.squadRole] || 9.9) + (club.starRating - 3) * 0.06;
      if (!state.unwantedByManager && windowAvgRating >= promoteBar && roleIdx < ROLE_ORDER.length - 1) {
        state.squadRole = ROLE_ORDER[roleIdx + 1];
        pushEvent(state, ctx, ctx.nextAge, 'ROLE_UP', `📈 PROMOTED (Age ${ctx.nextAge}): Strong form earned ${SQUAD_ROLES[state.squadRole].label} status at ${club.name}!`);
      } else if (ctx.nextAge >= 34 && windowAvgRating < 7.0 && roleIdx > 1) {
        state.squadRole = ROLE_ORDER[roleIdx - 1];
      }
      if (ctx.decision.type === 'STAY' && state.contractYearsRemaining <= 0 && !state.runDownContractActive && ctx.nextAge < state.setup.retirementAge) {
        const extYears = state.setup.transferInterval * 2;
        state.contractYearsRemaining = extYears;
        state.wageM = Number((Math.max(state.wageM, computeWage(state, club, state.squadRole)) * 1.05).toFixed(2));
        ctx.events.push({ age: ctx.nextAge, type: 'EXTENSION', text: `✍️ Signed a ${extYears}-year contract extension with ${club.name}.` });
      }
      const primaryTotal = posProfile.primaryStatType === 'ATTACK' ? state.stats.goals : state.stats.cleanSheets;
      if (primaryTotal >= 100) { const m = unlockMilestone(state, 'CENTURY_PRIMARY'); if (m) ctx.milestones.push(m); }
      if (state.stats.appearances >= 500) { const m = unlockMilestone(state, 'APPEARANCES_500'); if (m) ctx.milestones.push(m); }
      if (!ctx.majorHeadline) {
        const summary = posProfile.primaryStatType === 'ATTACK' ? `${ctx.acc.goals}G, ${ctx.acc.assists}A` : `${ctx.acc.cs} clean sheets`;
        state.latestHeadline = `Age ${ctx.startAge}–${ctx.nextAge} at ${club.name}: ${ctx.acc.apps} apps, ${summary} (Avg Rating: ${windowAvgRating}).`;
      }
      state.currentAge = ctx.nextAge;
      state.stepIndex += 1;
      state.windowCount += 1;

      let clubChanges = [];
      if (!DRY_RUN) {
        clubChanges = evolveClubs(state);
        const relevant = new Set([state.currentClubId, ...state.clubHistory.map((s) => s.clubId), state.rival && state.rival.clubId]);
        clubChanges.filter((c) => relevant.has(c.id) || c.to >= 5 || c.from >= 5).slice(0, 4).forEach((c) => {
          const cl = CLUB_MAP[c.id];
          logDramaEvent(state, state.currentAge, c.to > c.from ? 'CLUB_RISE' : 'CLUB_FALL', `${c.to > c.from ? '📈 ON THE RISE' : '📉 IN DECLINE'} (Age ${state.currentAge}): ${cl.name} ${c.to > c.from ? 'climb' : 'slip'} to a ${c.to}-star club.`);
        });
      }

      const report = {
        startAge: ctx.startAge, endAge: ctx.nextAge, clubName: club.name, clubId: club.id, decisionType: ctx.decision.type, feeM: ctx.feeM,
        appearances: ctx.acc.apps, goals: ctx.acc.goals, assists: ctx.acc.assists, cleanSheets: ctx.acc.cs, tackles: ctx.acc.tackles, saves: ctx.acc.saves,
        averageSavePct: posProfile.category === 'GK' && years > 0 ? Number((ctx.acc.savePct / years).toFixed(1)) : null,
        averageRating: windowAvgRating, trophiesWon: ctx.trophies, events: ctx.events, milestonesUnlocked: ctx.milestones,
        seasons: ctx.seasons, midEvents: ctx.midEvents, valueStart: ctx.valueStart, valueEnd: state.marketValueM,
        roleStart: ctx.roleStart, roleEnd: state.squadRole, earningsM: Number(ctx.seasons.reduce((s, x) => s + x.wageM, 0).toFixed(2)), clubChanges,
      };
      state.lastWindowReport = DRY_RUN ? null : { ...report, events: undefined, seasons: undefined };
      if (state.currentAge >= state.setup.retirementAge) {
        finalizeCareerRetirement(state);
        return { isRetired: true, report };
      }
      saveCareer(state);
      return { isRetired: false, report };
    }

    function simulateWindow(state, decision) {
      const ctx = beginWindow(state, decision);
      while (ctx.seasons.length < ctx.years) simulateSeason(state, ctx);
      return endWindow(state, ctx);
    }

    /* ==========================================================================
     * MID-WINDOW DECISIONS (between seasons of a 2- or 3-year window)
     * ========================================================================== */
    const MID_EVENTS = {
      LOAN_REQUEST: {
        icon: '🪑', title: 'Stuck on the bench',
        body: (s, last) => `Only ${last.apps} appearances last season. Your agent says a loan could be arranged before the next campaign.`,
        options: [
          { id: 'fight', label: 'Stay and fight for my place', desc: '40% chance the manager rewards your attitude with far more minutes.' },
          { id: 'loan', label: 'Push for a season-long loan', desc: 'Guaranteed starts at a 2–3★ club next season. No trophies with your parent club that year.' },
        ],
      },
      FALLOUT: {
        icon: '😠', title: 'War with the manager',
        body: (s) => `The manager has frozen you out at ${CLUB_MAP[s.currentClubId].name}. How do you respond?`,
        options: [
          { id: 'apologise', label: 'Apologise publicly', desc: '55% chance to clear the air and win your place back.' },
          { id: 'board', label: 'Go over his head to the board', desc: '35% chance it works. If it fails, half your loyalty years are lost.' },
          { id: 'request', label: 'Hand in a transfer request', desc: 'Stay frozen out, but more clubs bid next window and fees drop 20%.' },
        ],
      },
      CAPTAINCY: {
        icon: '©️', title: 'The armband is yours — if you want it',
        body: (s) => `The dressing room wants you as captain of ${CLUB_MAP[s.currentClubId].name}.`,
        options: [
          { id: 'accept', label: 'Accept the captaincy', desc: '+5% title odds while you stay. Leaving later means giving it up.' },
          { id: 'decline', label: 'Decline and focus on my game', desc: 'A small rating boost next season.' },
        ],
      },
      INJURY_RUSH: {
        icon: '🩹', title: 'Back in time for the big games?',
        body: () => 'Your injury has healed faster than expected. The medical team is split.',
        options: [
          { id: 'rush', label: 'Rush back', desc: '+15% minutes next season, but a 35% chance of a fresh setback.' },
          { id: 'rest', label: 'Take it slowly', desc: 'Much lower injury risk next season, slightly fewer games.' },
        ],
      },
      EXTENSION: {
        icon: '📝', title: 'Early contract extension offered',
        body: (s) => `${CLUB_MAP[s.currentClubId].name} want to tie you down now: +${s.setup.transferInterval * 2} years and a 20% pay rise.`,
        options: [
          { id: 'sign', label: 'Sign it', desc: '20% raise and security. A high release clause makes you harder to poach.' },
          { id: 'wait', label: 'Keep my options open', desc: 'Nothing changes — you can still run your deal down.' },
        ],
      },
      TAPPED_UP: {
        icon: '🤫', title: 'A bigger club is sniffing around',
        body: (s, last, ev) => `Representatives of ${CLUB_MAP[ev.clubId].name} made contact through intermediaries.`,
        options: [
          { id: 'flirt', label: 'Signal I’m interested', desc: 'Guaranteed offer from them next window (Key Player+). Loyalty halves; 25% chance your manager freezes you out.' },
          { id: 'shut', label: 'Shut it down publicly', desc: 'Fans love it: +1 loyalty year and a small rating boost.' },
        ],
      },
    };

    function rollMidWindowEvent(state, ctx) {
      if (ctx.seasons.length === 0 || ctx.seasons.length >= ctx.years) return null;
      const last = ctx.seasons[ctx.seasons.length - 1];
      const club = CLUB_MAP[state.currentClubId];
      const maxGames = club.starRating >= 4 ? 50 : club.starRating === 3 ? 44 : 38;
      const elig = [];
      if (!last.onLoan && last.apps < maxGames * 0.5 && state.currentAge + ctx.seasons.length <= 27) elig.push(['LOAN_REQUEST', 3]);
      if (state.unwantedByManager) elig.push(['FALLOUT', 5]);
      if (!state.isCaptain && state.loyaltyYears >= 2 && last.age >= 21 && ['KEY_PLAYER', 'STAR'].includes(state.squadRole)) elig.push(['CAPTAINCY', 2]);
      if (last.injured) elig.push(['INJURY_RUSH', 3]);
      if (state.contractYearsRemaining <= 2 && !state.runDownContractActive && state.squadRole !== 'PROSPECT') elig.push(['EXTENSION', 2]);
      let tapClub = null;
      if (state.marketValueM >= 12 && !state.flirtClubId) {
        const pool = CLUBS.filter((c) => c.starRating > club.starRating && c.starRating >= 3 && !state.blacklistedClubIds.includes(c.id) && c.id !== club.id);
        if (pool.length) { tapClub = pickOne(pool); elig.push(['TAPPED_UP', 2]); }
      }
      if (!elig.length || rand() > 0.62) return null;
      const total = elig.reduce((a, [, w]) => a + w, 0);
      let r = rand() * total;
      let type = elig[0][0];
      for (const [t, w] of elig) { if ((r -= w) <= 0) { type = t; break; } }
      const def = MID_EVENTS[type];
      const ev = { type, age: last.age + 1, clubId: tapClub ? tapClub.id : null };
      ev.icon = def.icon; ev.title = def.title; ev.body = def.body(state, last, ev); ev.options = def.options;
      return ev;
    }

    function applyMidWindowChoice(state, ctx, ev, optionId) {
      const club = CLUB_MAP[state.currentClubId];
      const age = ev.age;
      const push = (type, text) => pushEvent(state, ctx, age, type, text);
      let outcome = '';
      switch (`${ev.type}:${optionId}`) {
        case 'LOAN_REQUEST:fight':
          if (rand() < 0.4) { ctx.next.appMult = 1.35; outcome = 'The manager noticed. You start the new season in the team.'; push('FOUGHT_BACK', `💪 FOUGHT BACK (Age ${age}): Won the manager over in training — more minutes ahead.`); }
          else outcome = 'Nothing changed. You start the season on the bench again.';
          break;
        case 'LOAN_REQUEST:loan': ctx.next.forceLoan = true; outcome = 'Loan agreed. You will start every week next season.'; break;
        case 'FALLOUT:apologise':
          if (rand() < 0.55) { state.unwantedByManager = false; outcome = 'Peace restored. You are back in the squad.'; push('MANAGER_PEACE', `🤝 BRIDGES MENDED (Age ${age}): A public apology ended the stand-off with the ${club.name} manager.`); }
          else outcome = 'The manager was not impressed. Still frozen out.';
          break;
        case 'FALLOUT:board':
          if (rand() < 0.35) { state.unwantedByManager = false; outcome = 'The board sided with you. Back in the team.'; push('MANAGER_PEACE', `🏛️ BOARD BACKS YOU (Age ${age}): The ${club.name} hierarchy forced the manager's hand.`); }
          else { state.loyaltyYears = Math.floor(state.loyaltyYears / 2); outcome = 'It backfired. The fans turned on you and half your loyalty is gone.'; push('UNWANTED', `⚠️ POWER STRUGGLE LOST (Age ${age}): Going to the ${club.name} board backfired badly.`); }
          break;
        case 'FALLOUT:request':
          state.transferRequested = true; adjustMood(state, club.id, -25); outcome = 'Transfer request lodged. Expect more bids — and lower fees — next window.';
          push('TRANSFER_REQUEST', `📨 TRANSFER REQUEST (Age ${age}): Formally asked to leave ${club.name}.`);
          break;
        case 'CAPTAINCY:accept': adjustMood(state, club.id, 10); state.isCaptain = true; outcome = 'You lead the team out as captain.'; push('CAPTAIN', `©️ CLUB CAPTAIN (Age ${age}): Accepted the ${club.name} armband.`); break;
        case 'CAPTAINCY:decline': ctx.next.ratingBonus = 0.06; outcome = 'You stay focused on your own game.'; break;
        case 'INJURY_RUSH:rush': ctx.next.rush = true; outcome = 'Straight back into training. Fingers crossed.'; break;
        case 'INJURY_RUSH:rest': ctx.next.injuryMult = 0.55; ctx.next.appMult = 0.95; outcome = 'A careful build-up. You should stay fit.'; break;
        case 'EXTENSION:sign':
          state.contractYearsRemaining += state.setup.transferInterval * 2;
          state.wageM = Number((state.wageM * 1.2).toFixed(2));
          state.releaseClause = 'high'; state.releaseClauseM = clauseAmount(state.marketValueM, 'high');
          state.runDownContractActive = false;
          outcome = 'Extension signed with a 20% raise.';
          push('EXTENSION_EARLY', `📝 EXTENDED (Age ${age}): Signed an improved long-term deal with ${club.name}.`);
          break;
        case 'EXTENSION:wait': outcome = 'You keep your options open.'; break;
        case 'TAPPED_UP:flirt':
          state.flirtClubId = ev.clubId; adjustMood(state, club.id, -15);
          state.loyaltyYears = Math.floor(state.loyaltyYears / 2);
          if (rand() < 0.25) state.unwantedByManager = true;
          outcome = `${CLUB_MAP[ev.clubId].name} will bid next window.${state.unwantedByManager ? ' Your manager found out and froze you out.' : ''}`;
          push('TAPPED_UP', `🤫 TAPPED UP (Age ${age}): Word is out — ${CLUB_MAP[ev.clubId].name} are preparing a bid.`);
          break;
        case 'TAPPED_UP:shut': adjustMood(state, club.id, 15); state.loyaltyYears += 1; ctx.next.ratingBonus = 0.03; outcome = 'The fans sing your name. Loyalty +1 year.'; push('LOYAL', `❤️ NOT FOR SALE (Age ${age}): Publicly committed to ${club.name}.`); break;
        default: outcome = '';
      }
      ctx.midEvents.push({ type: ev.type, title: ev.title, choice: optionId, outcome, age });
      state.midEventsSeen = (state.midEventsSeen || 0) + 1;
      return outcome;
    }
