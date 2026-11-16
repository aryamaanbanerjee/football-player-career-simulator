    /* ==========================================================================
     * LAYER 4: TRANSFER MARKET, NEGOTIATION & AGENT AUTO-PICK
     * ========================================================================== */
    function pickSample(arr, count) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, count);
    }

    function determineOfferedRole(state, targetClub, isFreeAgent, dramaTag) {
      const posProfile = POSITION_PROFILES[state.setup.position];
      const standing = state.marketValueM / posProfile.maxBaseValueM;
      let idx = 1;
      if (targetClub.starRating === 5) idx = standing < 0.22 ? 0 : standing < 0.36 ? 1 : standing < 0.56 ? 2 : 3;
      else if (targetClub.starRating === 4) idx = standing < 0.12 ? 0 : standing < 0.24 ? 1 : standing < 0.42 ? 2 : 3;
      else if (targetClub.starRating === 3) idx = standing < 0.08 && state.currentAge <= 20 ? 1 : standing < 0.22 ? 2 : 3;
      else idx = state.currentAge <= 19 && state.marketValueM < 4 ? 2 : 3;
      if (state.currentAge >= 34 && targetClub.starRating >= 4 && idx > 1) idx -= 1;
      if (state.currentAge >= 35 && targetClub.starRating === 3 && state.marketValueM < 6) idx = Math.min(idx, 1);
      if (isFreeAgent && state.freeAgentExits >= 2 && targetClub.starRating >= 4 && idx > 0) idx -= 1;
      if (dramaTag === 'RELEASE_CLAUSE' || dramaTag === 'AGENT_PUSH') idx = Math.max(idx, 1);
      if (dramaTag === 'BIDDING_WAR' || dramaTag === 'TAPPED_UP') idx = Math.max(idx, 2);
      return ROLE_ORDER[clamp(idx, 0, ROLE_ORDER.length - 1)];
    }

    function generateChoices(state) {
      const interval = state.setup.transferInterval;
      const agent = agentOf(state);

      if (!state.currentClubId || state.windowCount === 0) {
        const maxStars = state.setup.continent === 'EUROPE' ? 3 : 2;
        const academies = CLUBS.filter((c) => c.continent === state.setup.continent && YOUTH_ACADEMY_CLUBS.has(c.id) && c.starRating <= 4);
        const starters = CLUBS.filter((c) => c.continent === state.setup.continent && c.starRating <= maxStars && !YOUTH_ACADEMY_CLUBS.has(c.id));
        const chosen = [...pickSample(academies, 1), ...pickSample(starters, 3)].slice(0, 3);
        return {
          isFirstTurn: true, stayOption: null, canRetireEarly: false,
          offers: chosen.map((club) => {
            const isAcad = YOUTH_ACADEMY_CLUBS.has(club.id);
            const role = club.starRating <= 2 ? 'KEY_PLAYER' : 'ROTATION';
            return {
              type: 'FIRST_CONTRACT', clubId: club.id, clubName: club.name, league: club.league, starRating: club.starRating,
              squadRole: role, squadRoleLabel: SQUAD_ROLES[role].label, contractYears: interval * 2, feeM: 0, isFreeAgent: false,
              wageM: computeWage(state, club, role), releaseClause: 'standard',
              dramaTag: null, dramaBadge: isAcad ? '🌱 Youth Pathway' : null,
              pitchText: isAcad ? `Renowned youth factory offering direct senior development in ${club.league}.` : `First senior pro deal in ${club.league} with strong early minutes.`,
            };
          }),
        };
      }

      const { currentClub, boyhoodClub, canToggleRunDownContract, isFinalWindow } = getDerivedState(state);
      const isFreeAgent = state.contractYearsRemaining <= 0;
      const stayWarnings = [];
      if (state.unwantedByManager) stayWarnings.push(DRAMA_TYPES.UNWANTED.badge);
      if (state.relegatedLastWindow) stayWarnings.push(`📉 ${displayLeague(state, currentClub)}`);
      if (state.transferRequested) stayWarnings.push('📨 Transfer requested');
      let contractStatus = `${state.contractYearsRemaining} yr(s) remaining`;
      if (isFinalWindow) contractStatus = 'Final career window before retirement';
      else if (canToggleRunDownContract) contractStatus = state.runDownContractActive ? '⚠️ Running down deal (free agent next window)' : 'Final contract window (auto-renews unless you run it down)';
      const stayOption = {
        type: 'STAY', clubId: currentClub.id, clubName: currentClub.name, league: currentClub.league, starRating: currentClub.starRating,
        squadRoleLabel: SQUAD_ROLES[state.squadRole].label, loyaltyYears: state.loyaltyYears, isCaptain: state.isCaptain,
        contractStatus, warnings: stayWarnings, canToggleRunDownContract, runDownContractActive: state.runDownContractActive,
        wageM: state.wageM, releaseClause: state.releaseClause,
      };

      const eligible = CLUBS.filter((c) => c.id !== currentClub.id && !state.blacklistedClubIds.includes(c.id) && state.currentAge >= (state.clubCooldowns[c.id] || 0));
      const recentTrophy = state.trophies.some((t) => t.yearAge >= state.currentAge - interval && MAJOR_TROPHY_TYPES.has(t.category));
      const recentBd = state.stats.ballonDOrYears.some((yr) => yr >= state.currentAge - interval);
      let targetCount = isFreeAgent || recentTrophy || recentBd ? 4 : state.currentAge >= 35 || state.unwantedByManager ? 2 : 3;
      if (state.setup.position === 'GK' && !isFreeAgent && !state.unwantedByManager) targetCount = Math.max(1, targetCount - 1);
      targetCount = Math.min(targetCount, 3);
      if (state.transferRequested) targetCount += 1;

      const offers = [];
      const used = new Set();
      const addOffer = (club, forcedTag = null) => {
        used.add(club.id);
        const { level: rivLevel, betrayedClub } = getCareerRivalryStatus(state, club.id);
        const dramaTag = forcedTag || (rivLevel !== 'NONE' ? rivLevel : null);
        const role = determineOfferedRole(state, club, isFreeAgent, dramaTag);
        let feeM = 0;
        if (!isFreeAgent) {
          let raw = state.marketValueM * randRange(0.92, 1.18);
          if (club.wealthTier === 'rich') raw *= 1.18;
          if (state.contractYearsRemaining >= 3) raw *= 1.12;
          else if (state.contractYearsRemaining === 1) raw *= 0.82;
          if (dramaTag && DRAMA_TYPES[dramaTag] && DRAMA_TYPES[dramaTag].feeMultiplier) raw *= DRAMA_TYPES[dramaTag].feeMultiplier;
          raw *= agent.feeMult;
          if (state.transferRequested) raw *= 0.8;
          if (dramaTag === 'RELEASE_CLAUSE' && state.releaseClauseM) raw = state.releaseClauseM;
          feeM = Math.max(0.5, Number(raw.toFixed(1)));
        }
        const contractYears = dramaTag === 'BOYHOOD_RETURN' || state.currentAge >= 35 ? interval : rand() < 0.38 ? interval * 3 : interval * 2;
        const loanOut = willTriggerYouthLoan(state.currentAge, club, role, state.marketValueM);
        let badge = dramaTag ? (DRAMA_TYPES[dramaTag] && DRAMA_TYPES[dramaTag].badge) : null;
        if (isFreeAgent && !badge) badge = '🆓 Free Transfer (€0)';
        let pitch = `${club.league} • ${SQUAD_ROLES[role].label} promise`;
        if (dramaTag === 'ARCH_RIVAL' || dramaTag === 'RIVAL') pitch = `Betray ${betrayedClub.name}! Derby stat boost & higher card risk.`;
        else if (dramaTag === 'RELEASE_CLAUSE') pitch = `Triggered your €${feeM}M release clause — ${currentClub.name} cannot block this!`;
        else if (dramaTag === 'BIDDING_WAR') pitch = 'Superclub auction after your trophy-winning season.';
        else if (dramaTag === 'BOYHOOD_RETURN') pitch = 'Emotional homecoming to finish your career where it began.';
        else if (dramaTag === 'AGENT_PUSH') pitch = 'Lucrative high-fee deal boosting your global brand PR.';
        else if (dramaTag === 'STEPPING_STONE') pitch = `A European shop window in the ${club.league} — the classic route to the elite.`;
        else if (dramaTag === 'TAPPED_UP') pitch = 'The club you flirted with mid-window has made its move.';
        else if (loanOut) pitch = 'Includes immediate 1-year U-21 loan spell for regular minutes.';
        offers.push({
          type: 'TRANSFER', clubId: club.id, clubName: club.name, league: club.league, starRating: club.starRating,
          squadRole: role, squadRoleLabel: SQUAD_ROLES[role].label, contractYears, feeM, isFreeAgent,
          wageM: computeWage(state, club, role), releaseClause: 'standard',
          dramaTag, dramaBadge: badge, pitchText: pitch,
        });
      };

      if (state.flirtClubId && CLUB_MAP[state.flirtClubId] && !state.blacklistedClubIds.includes(state.flirtClubId)) addOffer(CLUB_MAP[state.flirtClubId], 'TAPPED_UP');
      if (state.currentAge >= 33 && boyhoodClub && currentClub.id !== boyhoodClub.id && !state.blacklistedClubIds.includes(boyhoodClub.id) && state.currentAge >= (state.clubCooldowns[boyhoodClub.id] || 0) && !used.has(boyhoodClub.id) && rand() < 0.45) addOffer(boyhoodClub, 'BOYHOOD_RETURN');
      // v5: stepping-stone moves to mid-tier European leagues for players outside Europe.
      if (currentClub.continent !== 'EUROPE' && ['AFRICA', 'ASIA', 'SOUTH_AMERICA', 'NORTH_AMERICA'].includes(state.setup.continent) && state.currentAge <= 24 && state.marketValueM >= 4 && offers.length < targetCount && rand() < 0.55) {
        const stones = eligible.filter((c) => !used.has(c.id) && EURO_STEPPING_STONE_LEAGUES.has(c.league) && c.starRating >= 3 && c.starRating <= 4);
        if (stones.length) addOffer(pickOne(stones), 'STEPPING_STONE');
      }
      const rivals = eligible.filter((c) => !used.has(c.id) && getCareerRivalryStatus(state, c.id).level !== 'NONE' && c.starRating >= Math.max(2, currentClub.starRating - 1));
      if (rivals.length && offers.length < targetCount && rand() < 0.35) addOffer(pickSample(rivals, 1)[0]);
      // Release clause hijacks: odds depend on your clause, and spike when the clause is a bargain.
      const clause = CLAUSE_TYPES[state.releaseClause] || CLAUSE_TYPES.standard;
      let hijackOdds = clause.hijack;
      if (state.releaseClauseM && state.marketValueM > state.releaseClauseM) hijackOdds *= 1.5;
      if (!isFreeAgent && state.contractYearsRemaining > 0 && state.marketValueM >= 28 && state.currentAge <= 30 && offers.length < targetCount && rand() < hijackOdds) {
        const hijackers = eligible.filter((c) => !used.has(c.id) && c.starRating >= Math.min(5, currentClub.starRating + 1));
        if (hijackers.length) addOffer(pickSample(hijackers, 1)[0], 'RELEASE_CLAUSE');
      }
      if ((recentTrophy || recentBd) && offers.length < targetCount && rand() < 0.45) {
        const elites = eligible.filter((c) => !used.has(c.id) && c.starRating >= 4);
        if (elites.length) addOffer(pickSample(elites, 1)[0], 'BIDDING_WAR');
      }
      if (offers.length < targetCount && state.marketValueM >= 20 && rand() < agent.pushChance) {
        const rich = eligible.filter((c) => !used.has(c.id) && c.wealthTier === 'rich' && c.starRating >= 3);
        if (rich.length) addOffer(pickSample(rich, 1)[0], 'AGENT_PUSH');
      }
      const [minS, maxS] = state.marketValueM >= 75 && state.currentAge <= 31 ? [4, 5] : state.marketValueM >= 35 && state.currentAge <= 33 ? [3, 5] : state.marketValueM >= 12 ? [2, 4] : [1, 3];
      const stdPool = eligible.filter((c) => {
        if (used.has(c.id) || c.starRating < minS || c.starRating > maxS) return false;
        if (state.currentAge <= 20 && state.setup.continent !== 'EUROPE' && state.marketValueM < 15) return c.continent === state.setup.continent || c.starRating <= 3;
        return true;
      });
      for (const c of pickSample(stdPool, Math.max(0, targetCount - offers.length))) addOffer(c);
      if (offers.length === 0) {
        const low = eligible.filter((c) => c.starRating <= 2);
        const fbPool = low.length ? low : [...eligible].sort((a, b) => a.starRating - b.starRating).slice(0, 5);
        if (fbPool.length) {
          const fbClub = pickSample(fbPool, 1)[0];
          addOffer(fbClub);
          const last = offers[offers.length - 1];
          last.feeM = 0; last.isFreeAgent = true; last.dramaBadge = '🆓 Lifeline Free Transfer'; last.pitchText = `A fresh start on a free transfer in ${fbClub.league}.`;
        }
      }
      const canRetireEarly = state.currentAge >= 33 && (state.unwantedByManager || state.marketValueM <= 4 || state.currentAge >= 36);
      return { isFirstTurn: false, stayOption, offers, canRetireEarly };
    }

    /* ---------- Negotiation ---------- */
    const WAGE_ASKS = [0, 0.15, 0.3];
    function nextRole(role) { const i = ROLE_ORDER.indexOf(role); return ROLE_ORDER[Math.min(ROLE_ORDER.length - 1, i + 1)]; }
    function negotiationOdds(state, offer, asks, { isStay = false, isLastOption = false } = {}) {
      const any = asks.role || asks.wage > 0 || asks.length !== 'same' || asks.clause !== (offer.releaseClause || 'standard');
      if (!any) return { accept: 1, counter: 0, walk: 0 };
      let accept = 0.88;
      if (asks.role) accept -= offer.type === 'FIRST_CONTRACT' ? 0.25 : 0.32;
      accept -= ({ 0: 0, 0.15: 0.12, 0.3: 0.28 })[asks.wage] || 0;
      if (asks.length === 'shorter') accept -= 0.07;
      if (asks.length === 'longer') accept -= state.currentAge >= 30 ? 0.15 : -0.03;
      accept -= ({ standard: 0, low: 0.16, high: -0.04, none: -0.07 })[asks.clause] || 0;
      if (['BIDDING_WAR', 'RELEASE_CLAUSE', 'TAPPED_UP'].includes(offer.dramaTag)) accept += 0.12;
      if (isStay && ['KEY_PLAYER', 'STAR'].includes(state.squadRole)) accept += 0.06;
      if (isStay && state.unwantedByManager) accept -= 0.25;
      const club = CLUB_MAP[offer.clubId];
      const standing = state.marketValueM / POSITION_PROFILES[state.setup.position].maxBaseValueM;
      if (club.starRating <= 2) accept += 0.06;
      if (club.starRating === 5 && standing < 0.4) accept -= 0.08;
      accept += agentOf(state).negotiateBonus;
      accept = clamp(accept, 0.05, 0.97);
      const rest = 1 - accept;
      const walk = isStay || isLastOption ? 0 : clamp(rest * 0.4 * agentOf(state).walkAwayMult, 0, rest);
      return { accept, counter: rest - walk, walk };
    }
    function counterAsks(asks) {
      const c = { ...asks };
      if (c.role) c.role = 0;
      else if (c.wage > 0) c.wage = c.wage === 0.3 ? 0.15 : 0;
      else if (c.clause === 'low') c.clause = 'standard';
      else c.length = 'same';
      return c;
    }
    function applyNegotiatedTerms(state, offer, asks, isStay) {
      const interval = state.setup.transferInterval;
      if (isStay) {
        offer.renegotiated = {
          wageM: Number((state.wageM * (1 + asks.wage)).toFixed(2)),
          contractYears: asks.length === 'longer' ? interval * 3 : interval * 2,
          releaseClause: asks.clause,
        };
        offer.wageM = offer.renegotiated.wageM;
        offer.releaseClause = asks.clause;
        return;
      }
      if (asks.role) { offer.squadRole = nextRole(offer.squadRole); offer.squadRoleLabel = SQUAD_ROLES[offer.squadRole].label; }
      if (asks.wage) offer.wageM = Number((offer.wageM * (1 + asks.wage)).toFixed(2));
      if (asks.wage === 0 && asks.role) offer.wageM = Number(computeWage(state, CLUB_MAP[offer.clubId], offer.squadRole).toFixed(2));
      if (asks.length === 'shorter') offer.contractYears = Math.max(interval, offer.contractYears - interval);
      if (asks.length === 'longer') offer.contractYears += interval;
      offer.releaseClause = asks.clause;
    }
    function negotiateOffer(state, offer, asks, opts = {}) {
      const odds = negotiationOdds(state, offer, asks, opts);
      const r = rand();
      let outcome;
      if (r < odds.accept) outcome = 'accepted';
      else if (r < odds.accept + odds.counter) outcome = 'countered';
      else outcome = 'rejected';
      offer.negotiation = { asks, odds, outcome, counter: outcome === 'countered' ? counterAsks(asks) : null, resolved: outcome !== 'countered' };
      if (outcome === 'accepted') applyNegotiatedTerms(state, offer, asks, opts.isStay);
      if (outcome === 'rejected' && !opts.isStay) offer.withdrawn = true;
      return offer.negotiation;
    }
    function resolveCounter(state, offer, accept, isStay) {
      if (!offer.negotiation || offer.negotiation.resolved) return;
      if (accept) applyNegotiatedTerms(state, offer, offer.negotiation.counter, isStay);
      offer.negotiation.resolved = true;
      offer.negotiation.counterAccepted = !!accept;
    }

    /* ---------- "Let my agent decide" ---------- */
    function agentChoose(options, projections, priority) {
      const live = options.filter((o) => !o.data.withdrawn && projections[o.key]);
      if (!live.length) return options[0];
      const score = (o) => {
        const p = projections[o.key];
        const wage = (o.data.wageM || 0) * p.years;
        if (priority === 'TROPHIES') return p.pAnyMajor * 10 + p.trophiesMean + p.pBallon * 5;
        if (priority === 'MINUTES') return p.apps + p.rating * 3;
        if (priority === 'MONEY') return wage + p.valueMed * 0.3;
        return p.pAnyMajor * 4 + p.apps / 12 + (p.valueMed / Math.max(1, p.valueStart)) * 1.5 + p.pBallon * 6 + wage * 0.05;
      };
      return live.reduce((best, o) => (score(o) > score(best) ? o : best), live[0]);
    }
