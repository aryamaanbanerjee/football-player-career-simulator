    /* ==========================================================================
     * LAYER 2: GAME STATE — save slots, migration, career creation, legacy
     * ========================================================================== */
    const SAVE_VERSION = 14; // v14: difficulty (setup.difficulty), accessibility, one stylesheet
    const HALL_OF_FAME_KEY = 'fcts_hall_of_fame_v3'; // v6: 0–1000 legacy scale
    const OLD_HOF_KEY = 'fcts_hall_of_fame_v2';     // v3–v5 entries (old, unbounded scale) shown as an archive
    const HOF_LIMIT = 50;
    const SLOT_KEYS = ['fcts_v5_slot_1', 'fcts_v5_slot_2', 'fcts_v5_slot_3'];
    const OLD_SAVE_KEYS = [{ key: 'fcts_active_career_v4', version: 4 }, { key: 'fcts_active_career_v2', version: 3 }];
    const PREFS_KEY = 'fcts_prefs_v5';
    const BASE_YEAR = 2026; // Age 17 = 2026/27 season
    let DRY_RUN = false;    // true while projecting "what if" outcomes: no saves, no Hall of Fame, Math.random
    let latestHofEntryId = null;
    let ACTIVE_SLOT = null;

    function seasonLabel(age) {
      const y = BASE_YEAR + age - 17;
      return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
    }

    const hasStorage = () => { try { return typeof localStorage !== 'undefined' && localStorage !== null; } catch { return false; } };
    const storageGet = (key, fallback) => {
      if (!hasStorage()) return fallback;
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    };
    // v13: returns whether the write worked, so callers can warn the player instead of failing silently.
    const storageSet = (key, value) => {
      if (DRY_RUN) return true;
      if (!hasStorage()) return false;
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; /* quota / privacy mode */ }
    };
    function saveCareer(state) {
      if (DRY_RUN || ACTIVE_SLOT == null || !state) return;
      state.savedAt = Date.now();
      const ok = storageSet(SLOT_KEYS[ACTIVE_SLOT], state.isRetired ? null : state);
      if (!ok && typeof onSaveProblem === 'function') onSaveProblem();
      else if (ok && typeof ui !== 'undefined') ui.saveFailed = false;
    }
    const loadSlot = (i) => storageGet(SLOT_KEYS[i], null);
    const clearSlot = (i) => storageSet(SLOT_KEYS[i], null);
    function firstEmptySlot() {
      for (let i = 0; i < SLOT_KEYS.length; i++) if (!loadSlot(i)) return i;
      return -1;
    }

    function buildAgeSteps(retirementAge, transferInterval) {
      const steps = [];
      for (let age = 17; age < retirementAge; age += transferInterval) steps.push(age);
      steps.push(retirementAge);
      return steps;
    }

    /* ---------- Career codes (seed + setup) ---------- */
    const CONT_CODES = { EUROPE: 'EU', SOUTH_AMERICA: 'SA', ASIA: 'AS', AFRICA: 'AF', NORTH_AMERICA: 'NA' };
    const AGENT_CODES = { SHARK: 'S', BALANCED: 'B', LOYAL: 'L' };
    /* v14: difficulty, chosen at the start of a career. Normal is the game exactly as balanced in v13.
       apps: how often managers pick you · injury: injury risk · rating: match ratings · moodDown/moodUp: how hard fans react. */
    const DIFFICULTY = {
      RELAXED: { label: 'Relaxed', code: 'R', ic: '🌤️', sub: 'Patient managers, fewer injuries, forgiving fans.', apps: 1.06, injury: 0.75, rating: 0.03, moodDown: 0.6, moodUp: 1.1 },
      NORMAL: { label: 'Normal', code: 'N', ic: '⚽', sub: 'The game as designed.', apps: 1, injury: 1, rating: 0, moodDown: 1, moodUp: 1 },
      AMBITIOUS: { label: 'Ambitious', code: 'A', ic: '🔥', sub: 'Demanding managers, more injuries, fans who expect more.', apps: 0.95, injury: 1.2, rating: -0.04, moodDown: 1.3, moodUp: 0.85 },
    };
    const difficultyOf = (state) => DIFFICULTY[(state && state.setup && state.setup.difficulty) || 'NORMAL'] || DIFFICULTY.NORMAL;
    function careerCode(setup) {
      return [setup.originalPosition || setup.position, CONT_CODES[setup.continent], setup.nation, setup.transferInterval, setup.retirementAge, AGENT_CODES[setup.agentType] || 'B', setup.mode === 'QUICK' ? 'Q' : 'C', setup.seed, ...(setup.difficulty && setup.difficulty !== 'NORMAL' ? [DIFFICULTY[setup.difficulty].code] : [])].join('-');
    }
    function parseCareerCode(code) {
      const parts = String(code || '').trim().toUpperCase().split('-');
      if (parts.length !== 8 && parts.length !== 9) return null; // a 9th part is the difficulty (v14)
      const [position, cc, nation, interval, retire, agent, mode, seed, diff] = parts;
      const difficulty = diff ? Object.keys(DIFFICULTY).find((k) => DIFFICULTY[k].code === diff) : 'NORMAL';
      if (!difficulty) return null;
      const continent = Object.keys(CONT_CODES).find((k) => CONT_CODES[k] === cc);
      const agentType = Object.keys(AGENT_CODES).find((k) => AGENT_CODES[k] === agent);
      const ti = Number(interval);
      const ra = Number(retire);
      if (!POSITION_PROFILES[position] || !continent || !NATION_MAP[nation] || ![1, 2, 3].includes(ti) || !(ra >= 30 && ra <= 42) || !agentType || !seed) return null;
      return { position, continent, nation, transferInterval: ti, retirementAge: ra, agentType, mode: mode === 'Q' ? 'QUICK' : 'CAREER', seed, difficulty };
    }

    /* ---------- Rival ---------- */
    function createRival(state) {
      const conts = Object.keys(NAME_POOLS);
      const cont = rand() < 0.5 ? state.setup.continent : pickOne(conts);
      const pool = NAME_POOLS[cont];
      let name = `${pickOne(pool.first)} ${pickOne(pool.last)}`;
      if (name === state.playerName) name = `${pickOne(pool.first)} ${pickOne(pool.last)}`;
      const nation = pickOne(NATIONS[cont]);
      const elite = CLUBS.filter((c) => BASE_CLUB_STATS[c.id].starRating >= 4 && c.continent === 'EUROPE');
      const academy = pickOne(CLUBS.filter((c) => YOUTH_ACADEMY_CLUBS.has(c.id) && c.continent === 'EUROPE'));
      return {
        name, nationId: nation.id, nationName: nation.name, position: state.setup.position,
        talent: Number(randRange(7.45, 8.05).toFixed(2)),
        clubId: academy ? academy.id : pickOne(elite).id,
        valueM: state.marketValueM * randRange(0.9, 1.3),
        apps: 0, goals: 0, assists: 0, cleanSheets: 0, trophies: 0, ballonDOrs: 0, bestRank: null, clubs: 1, history: [],
      };
    }

    function createInitialGameState({ playerName, position, continent, nation, transferInterval, retirementAge, mode = 'CAREER', scouting = 'FULL', agentType = 'BALANCED', seed }) {
      const ageSteps = buildAgeSteps(retirementAge, transferInterval);
      const posProfile = POSITION_PROFILES[position];
      const startingValueM = Number(((posProfile.maxBaseValueM / 100) * 1.4).toFixed(1));
      const seedStr = String(seed || randomSeedString()).toUpperCase();
      const state = {
        version: SAVE_VERSION,
        isRetired: false,
        playerName: (playerName || '').trim() || 'Alex Rivera',
        setup: { position, continent, nation: nation || NATIONS[continent][0].id, transferInterval, retirementAge, mode, scouting, agentType, seed: seedStr },
        rng: { s: hashSeed(`${seedStr}|${position}|${continent}|${nation}|${transferInterval}|${retirementAge}|${agentType}`) },
        currentAge: 17, ageSteps, stepIndex: 0, windowCount: 0,

        currentClubId: null, boyhoodClubId: null, squadRole: 'PROSPECT', contractYearsRemaining: 0, runDownContractActive: false,
        isCaptain: false, loyaltyYears: 0, unwantedByManager: false, relegatedLastWindow: false, globalBrandPRBoost: 0,
        freeAgentExits: 0, transferCount: 0,
        wageM: 0, releaseClause: 'standard', releaseClauseM: null, shirtNumber: null,
        trainingFocus: 'BALANCED', transferRequested: false, flirtClubId: null, nationalCaptain: false,

        marketValueM: startingValueM, peakMarketValueM: startingValueM, peakValueAge: 17,
        valueHistory: [{ age: 17, valueM: startingValueM }],

        clubHistory: [], currentStint: null, loanHistory: [], lastStintAppearances: 0,
        betrayedClubIds: [], blacklistedClubIds: [], clubCooldowns: {},
        clubTallies: {}, clubRecordsBroken: [], retiredShirts: [], clubDynamics: {},

        stats: {
          appearances: 0, goals: 0, assists: 0, cleanSheets: 0, tackles: 0, saves: 0, savePctSum: 0, savePctYears: 0,
          yellowCards: 0, redCards: 0, ratingSum: 0, ratedYears: 0, totalTransferFeesM: 0, ballonDOrs: 0, ballonDOrYears: [],
          internationalCaps: 0, internationalGoals: 0, careerEarningsM: 0, bestBdORank: null, bdoPodiums: 0,
        },

        fanMood: {}, priority: 'BALANCED', arrivedWindow: -1,
        trophies: [], awards: [], dramaLog: [], seasonLog: [], inboxRead: 0, pendingChoices: null, midEventsSeen: 0,
        milestonesUnlocked: [], latestHeadline: 'Age 17: Academy graduation day. Choose your first professional contract.',
        lastWindowReport: null, earnedBadges: [], legacyScore: 0, hofRank: null,
        story: null,
      };
      RNG.holder = state;
      applyClubDynamics(state);
      state.attributes = initAttributes(position);
      state.attrBaseline = { ...state.attributes };
      state.attrHistory = [{ age: 17, overall: Number(overallRating(position, state.attributes).toFixed(2)) }];
      state.rival = createRival(state);
      return state;
    }

    /* ---------- v3 / v4 save migration ---------- */
    function migrateState(raw, fromVersion) {
      const m = migrateStateSteps(raw, fromVersion);
      if (m && m.setup && !m.setup.detail) m.setup.detail = 'STANDARD';
      if (m && m.setup && !m.setup.difficulty) m.setup.difficulty = 'NORMAL';
      return m;
    }
    function migrateStateSteps(raw, fromVersion) {
      if (fromVersion === 13) { const s13 = JSON.parse(JSON.stringify(raw)); s13.version = SAVE_VERSION; s13.setup.difficulty = s13.setup.difficulty || 'NORMAL'; return s13; }
      if (fromVersion === 12) { const s12 = JSON.parse(JSON.stringify(raw)); s12.version = SAVE_VERSION; return s12; }
      if (fromVersion === 11) { const s11 = JSON.parse(JSON.stringify(raw)); s11.version = SAVE_VERSION; return s11; }
      if (fromVersion === 10) {
        // v10 -> v11: the world starts from the current season; past seasons keep no world history.
        const s10 = JSON.parse(JSON.stringify(raw)); s10.version = SAVE_VERSION; s10.setup.detail = s10.setup.detail || 'STANDARD'; return s10;
      }
      if (fromVersion === 9) {
        // v9 -> v10: the detailed player layer is created lazily from the current attributes.
        const s9 = JSON.parse(JSON.stringify(raw)); s9.version = SAVE_VERSION; return s9;
      }
      if (fromVersion === 8) {
        // v8 -> v9: older seasons get their match plan drawn lazily the first time they are viewed.
        const s8 = JSON.parse(JSON.stringify(raw)); s8.version = SAVE_VERSION; return s8;
      }
      if (fromVersion === 7) {
        // v7 -> v8: story depth is filled in lazily; guided stays off for existing careers.
        const s7 = JSON.parse(JSON.stringify(raw));
        s7.version = SAVE_VERSION; s7.setup.goal = s7.setup.goal || 'NONE'; s7.setup.guided = false; s7.revealed = s7.revealed || [];
        return s7;
      }
      if (fromVersion === 6) {
        // v6 -> v7: identical engine; the story block is built lazily (fresh cast, empty journal).
        const s6 = JSON.parse(JSON.stringify(raw));
        s6.version = SAVE_VERSION; s6.story = null;
        return s6;
      }
      if (fromVersion === 5) {
        // v5 -> v6: same engine and seed; only new presentation fields.
        const s5 = JSON.parse(JSON.stringify(raw));
        s5.version = SAVE_VERSION; s5.fanMood = s5.fanMood || {}; s5.priority = s5.priority || 'BALANCED'; s5.arrivedWindow = -1;
        return s5;
      }
      const s = JSON.parse(JSON.stringify(raw));
      s.version = SAVE_VERSION;
      s.setup = { mode: 'CAREER', scouting: 'FULL', agentType: 'BALANCED', ...s.setup };
      if (!s.setup.nation) s.setup.nation = NATIONS[s.setup.continent][0].id;
      if (!s.setup.seed) s.setup.seed = randomSeedString();
      s.rng = { s: hashSeed(`${s.setup.seed}|migrated|${s.currentAge}`) };
      RNG.holder = s;
      s.seasonLog = s.seasonLog || [];
      s.inboxRead = s.inboxRead ?? s.dramaLog.length;
      s.pendingChoices = null;
      s.awards = s.awards || [];
      s.clubDynamics = s.clubDynamics || {};
      s.clubRecordsBroken = s.clubRecordsBroken || [];
      s.retiredShirts = s.retiredShirts || [];
      s.trainingFocus = s.trainingFocus || 'BALANCED';
      s.fanMood = s.fanMood || {}; s.priority = s.priority || 'BALANCED'; s.arrivedWindow = -1;
      s.releaseClause = s.releaseClause || 'standard';
      s.releaseClauseM = s.releaseClauseM ?? clauseAmount(s.marketValueM, 'standard');
      s.transferRequested = false; s.flirtClubId = null; s.nationalCaptain = !!s.nationalCaptain; s.midEventsSeen = s.midEventsSeen || 0;
      s.stats = { internationalGoals: 0, careerEarningsM: 0, bestBdORank: null, bdoPodiums: 0, ...s.stats };
      applyClubDynamics(s);
      const club = CLUB_MAP[s.currentClubId];
      s.wageM = s.wageM || (club ? computeWage(s, club, s.squadRole) : 0);
      s.shirtNumber = s.shirtNumber || CLASSIC_NUMBERS[s.setup.position];
      // Rebuild club tallies from stints so records can still be broken after import.
      s.clubTallies = s.clubTallies || {};
      [...s.clubHistory, ...(s.currentStint ? [s.currentStint] : [])].forEach((st) => {
        const t = s.clubTallies[st.clubId] || (s.clubTallies[st.clubId] = { apps: 0, goals: 0, cleanSheets: 0, seasons: 0, trophies: 0 });
        t.apps += st.appearances || 0; t.goals += st.goals || 0; t.cleanSheets += st.cleanSheets || 0; t.seasons += st.seasons || 0; t.trophies += st.trophiesWon || 0;
      });
      if (!s.attributes) {
        s.attributes = initAttributes(s.setup.position);
        s.attrBaseline = { ...s.attributes };
        for (let a = 17; a < s.currentAge; a++) developAttributes(s, { apps: 30, maxGames: 46, clubStars: 3, yearAge: a });
        s.attrHistory = [{ age: s.currentAge, overall: Number(overallRating(s.setup.position, s.attributes).toFixed(2)) }];
      }
      if (!s.rival) {
        s.rival = createRival(s);
        for (let a = 17; a < s.currentAge; a++) simulateRivalSeason(s, a);
      }
      s.importedFrom = fromVersion;
      if (!s.lastWindowReport || !Array.isArray(s.lastWindowReport.seasons)) s.lastWindowReport = null;
      return s;
    }

    function getDerivedState(state) {
      const nextAge = state.stepIndex + 1 < state.ageSteps.length ? state.ageSteps[state.stepIndex + 1] : state.setup.retirementAge;
      const actualWindowYears = Math.max(0, nextAge - state.currentAge);
      const isFinalWindow = state.stepIndex + 1 === state.ageSteps.length - 1;
      const averageRating = state.stats.ratedYears > 0 ? Number((state.stats.ratingSum / state.stats.ratedYears).toFixed(2)) : 6.8;
      const averageSavePct = state.stats.savePctYears > 0 ? Number((state.stats.savePctSum / state.stats.savePctYears).toFixed(1)) : 74.5;
      const currentClub = state.currentClubId ? CLUB_MAP[state.currentClubId] : null;
      const boyhoodClub = state.boyhoodClubId ? CLUB_MAP[state.boyhoodClubId] : null;
      const canToggleRunDownContract = Boolean(currentClub) && !isFinalWindow && state.contractYearsRemaining > 0 && state.contractYearsRemaining <= actualWindowYears;
      return { nextAge, actualWindowYears, isFinalWindow, averageRating, averageSavePct, currentClub, boyhoodClub, canToggleRunDownContract };
    }
    function displayLeague(state, club) {
      if (club && state.relegatedLastWindow && state.currentClubId === club.id && SECOND_TIERS[club.league]) return SECOND_TIERS[club.league];
      return club ? club.league : '';
    }

    function getCareerRivalryStatus(state, targetClubId, { sameLeagueOnly = false } = {}) {
      const targetClub = CLUB_MAP[targetClubId];
      if (!targetClub) return { level: 'NONE', betrayedClub: null };
      const stints = [...state.clubHistory, ...(state.currentStint ? [state.currentStint] : [])];
      let bestLevel = 'NONE';
      let betrayedClub = null;
      for (const stint of stints) {
        if (stint.clubId === targetClubId) continue;
        const pastClub = CLUB_MAP[stint.clubId];
        if (!pastClub) continue;
        if (sameLeagueOnly && pastClub.league !== targetClub.league) continue;
        const isSignificant = state.currentClubId === stint.clubId || stint.seasons >= 2 || stint.trophiesWon >= 1;
        if (!isSignificant) continue;
        const lvl = getRivalryLevel(stint.clubId, targetClubId);
        if (lvl === 'ARCH_RIVAL') return { level: 'ARCH_RIVAL', betrayedClub: pastClub };
        if (lvl === 'RIVAL' && bestLevel === 'NONE') { bestLevel = 'RIVAL'; betrayedClub = pastClub; }
      }
      return { level: bestLevel, betrayedClub };
    }

    function finalizeCurrentStint(state, endAge, leftOnBadTerms = false) {
      if (!state.currentStint) return;
      const clubId = state.currentStint.clubId;
      const completed = { ...state.currentStint, endAge };
      state.lastStintAppearances = completed.appearances;
      state.clubHistory.push(completed);
      state.clubCooldowns[clubId] = endAge + 3;
      if (leftOnBadTerms && !state.blacklistedClubIds.includes(clubId)) state.blacklistedClubIds.push(clubId);
      state.currentStint = null;
    }

    function beginNewStint(state, clubId, startAge, squadRole, contractYears) {
      const club = CLUB_MAP[clubId];
      for (const past of state.clubHistory) {
        if (past.clubId !== clubId && (past.seasons >= 2 || past.trophiesWon >= 1)) {
          if (getRivalryLevel(past.clubId, clubId) !== 'NONE' && !state.betrayedClubIds.includes(past.clubId)) state.betrayedClubIds.push(past.clubId);
        }
      }
      state.currentClubId = clubId;
      if (!state.boyhoodClubId) state.boyhoodClubId = clubId;
      state.squadRole = squadRole;
      state.contractYearsRemaining = Math.max(1, contractYears);
      state.runDownContractActive = false;
      state.isCaptain = false;
      state.loyaltyYears = 0;
      state.unwantedByManager = false;
      state.relegatedLastWindow = false;
      state.transferRequested = false;
      state.flirtClubId = null;
      state.shirtNumber = assignShirtNumber(state.setup.position, squadRole);
      state.currentStint = { clubId: club.id, clubName: club.name, league: club.league, startAge, endAge: startAge, seasons: 0, appearances: 0, goals: 0, assists: 0, cleanSheets: 0, trophiesWon: 0, shirtNumber: state.shirtNumber };
    }

    /* ---------- Fan mood (0 hostile … 100 idolised), per club ---------- */
    const moodOf = (state, id) => (state.fanMood && state.fanMood[id] != null ? state.fanMood[id] : 50);
    function adjustMood(state, id, delta) {
      if (!id || !CLUB_MAP[id]) return;
      if (!state.fanMood) state.fanMood = {};
      const d = difficultyOf(state);
      state.fanMood[id] = clamp(Math.round(moodOf(state, id) + delta * (delta < 0 ? d.moodDown : d.moodUp)), 0, 100);
    }
    const MOOD_LABELS = [[85, 'Idolised', '😍'], [65, 'Adored', '🙌'], [45, 'Settled', '🙂'], [25, 'Frustrated', '😒'], [0, 'Hostile', '😡']];
    const moodLabel = (m) => MOOD_LABELS.find(([min]) => m >= min);

    /* v12: one career-earnings figure everywhere — wages, bonuses, sponsors and fees, before tax.
       Seasons from saves older than v10 have no breakdown, so they count their wage. */
    function careerEarnings(state) {
      const log = state.seasonLog || [];
      if (!log.some((se) => se.money)) return Number((state.stats.careerEarningsM || 0).toFixed(2));
      return Number(log.reduce((a, se) => a + (se.money ? se.money.gross : se.wageM || 0), 0).toFixed(2));
    }
    function careerEarningsNet(state) {
      const log = state.seasonLog || [];
      return Number(log.reduce((a, se) => a + (se.money ? se.money.net : se.wageM || 0), 0).toFixed(2));
    }
    function logDramaEvent(state, age, type, headline) {
      state.latestHeadline = headline;
      state.dramaLog.push({ age, type, headline, clubId: state.currentClubId });
    }

    function unlockMilestone(state, milestoneId) {
      if (state.milestonesUnlocked.includes(milestoneId)) return null;
      const m = MILESTONES.find((item) => item.id === milestoneId);
      if (!m) return null;
      state.milestonesUnlocked.push(milestoneId);
      return m;
    }

    /* ---------- Retirement, badges, legacy score (v6: fixed 0–1000 scale) ----------
     * Eight components, each capped, so every player knows the maximum (1000) and what is left to earn.
     * Targets are position-aware so a keeper can max out "Output & longevity" just like a striker. */
    const LEGACY_MAX = { performance: 150, trophies: 200, ballonDor: 150, awards: 100, international: 100, clubLegacy: 100, peakValue: 100, longevity: 100 };
    const LEGACY_TOTAL = Object.values(LEGACY_MAX).reduce((a, b) => a + b, 0);
    const LEGACY_INFO = {
      performance: { label: 'Match performance', how: 'Career average rating: 6.7 = 0 pts, 8.1+ = 150' },
      trophies: { label: 'Team trophies', how: '10 pts per major trophy (league, continental, international), 2.5 per cup, 1.5 per 2nd-tier title; full marks at 200' },
      ballonDor: { label: "Ballon d'Or", how: "50 pts per Ballon d'Or — three wins maxes it out" },
      awards: { label: 'Individual awards', how: 'Player of the Year 12, Ballon d’Or podium 12, Golden Boy 10, Golden Boot/Glove/Playmaker 5, Young Player 5, Team of the Season 4' },
      international: { label: 'International career', how: 'World Cup 45, continental title 30, 1 pt per 5 caps (max 20), national captain 10' },
      clubLegacy: { label: 'Club legacy', how: 'Club legend 40, each retired shirt 20, each club record 10, one-club career 20' },
      peakValue: { label: 'Peak market value', how: 'Peak value vs an elite peak for your position (e.g. €214M striker, €136M keeper), so every position competes fairly' },
      longevity: { label: 'Output & longevity', how: 'Appearances (750 = 50 pts) plus career goals+assists (outfield) or clean sheets (defenders, keepers) vs an elite total for your position (50 pts)' },
    };
    // Full-marks references = the 90th-percentile career for each position (measured with tests/balance.cjs).
    const LEGEND_OUTPUT = { ST: 640, LW: 585, RW: 585, CAM: 640, CM: 390, CDM: 200, CB: 315, LB: 285, RB: 285, GK: 355 };
    const PEAK_REF = { ST: 268, LW: 191, RW: 191, CAM: 210, CM: 175, CDM: 121, CB: 146, LB: 100, RB: 100, GK: 117 }; // v13: recalibrated to each position's typical peak value
    const AWARD_POINTS = { POTY: 12, GOLDEN_BOY: 10, ACCOLADE: 5, YPOTY: 5, TOTS: 4 };
    // v13: some positions collect awards more easily (strikers have the Golden Boot); legacy evens that out.
    const AWARD_NORM = { ST: 0.82, LW: 1.2, RW: 1.1, CAM: 0.95, CM: 1.0, CDM: 1.08, CB: 1.2, LB: 1.05, RB: 1.08, GK: 1.12 };
    function computeLegacy(state) {
      const { averageRating } = getDerivedState(state);
      const pos = POSITION_PROFILES[state.setup.position];
      const st = state.stats;
      const majors = state.trophies.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length;
      const cups = state.trophies.filter((t) => t.category === 'DOMESTIC_CUP').length;
      const second = state.trophies.filter((t) => t.category === 'SECOND_TIER').length;
      const wc = state.trophies.filter((t) => t.category === 'INTERNATIONAL' && /World Cup/.test(t.title)).length;
      const contIntl = state.trophies.filter((t) => t.category === 'INTERNATIONAL').length - wc;
      const stints = [...state.clubHistory, ...(state.currentStint ? [state.currentStint] : [])];
      const legend = stints.some((x) => x.seasons >= 6 && x.trophiesWon >= 2 && !state.betrayedClubIds.includes(x.clubId)) ? 1 : 0;
      const oneClub = new Set(stints.map((x) => x.clubId)).size === 1 && state.transferCount === 0 && stints.length > 0 ? 1 : 0;
      const output = pos.primaryStatType === 'ATTACK' ? st.goals + st.assists : st.cleanSheets;
      const cap = (k, v) => Math.max(0, Math.min(LEGACY_MAX[k], v));
      const parts = {
        performance: cap('performance', ((averageRating - 6.7) / (8.1 - 6.7)) * LEGACY_MAX.performance),
        trophies: cap('trophies', majors * 10 + cups * 2.5 + second * 1.5),
        ballonDor: cap('ballonDor', st.ballonDOrs * 50),
        awards: cap('awards', (state.awards.reduce((a, x) => a + (AWARD_POINTS[x.kind] || 0), 0) + (st.bdoPodiums || 0) * 12) * (AWARD_NORM[pos.code] || 1)),
        international: cap('international', wc * 45 + contIntl * 30 + Math.min(20, st.internationalCaps / 5) + (state.nationalCaptain ? 10 : 0)),
        clubLegacy: cap('clubLegacy', legend * 40 + (state.retiredShirts || []).length * 20 + (state.clubRecordsBroken || []).length * 10 + oneClub * 20),
        peakValue: cap('peakValue', (state.peakMarketValueM / (PEAK_REF[pos.code] || pos.maxBaseValueM)) * LEGACY_MAX.peakValue),
        longevity: cap('longevity', Math.min(50, (st.appearances / 750) * 50) + Math.min(50, (output / (LEGEND_OUTPUT[pos.code] || 400)) * 50)),
      };
      Object.keys(parts).forEach((k) => { parts[k] = Math.round(parts[k]); });
      const total = Object.values(parts).reduce((a, b) => a + b, 0);
      return { total, max: LEGACY_TOTAL, parts, legend: !!legend, majors };
    }
    // Tiers calibrated with tests/balance.cjs (agent-guided careers): p50 ≈ 500, p80 ≈ 630, p95 ≈ 745, p99 ≈ 845.
    const LEGACY_TIERS = [
      { min: 800, label: 'Immortal' }, { min: 700, label: 'All-time legend' }, { min: 600, label: 'World class' },
      { min: 480, label: 'Club hero' }, { min: 330, label: 'Established pro' }, { min: 0, label: 'Journeyman' },
    ];
    const legacyTier = (score) => LEGACY_TIERS.find((t) => score >= t.min).label;

    function finalizeCareerRetirement(state) {
      const actualAge = state.currentAge;
      if (state.currentStint) finalizeCurrentStint(state, actualAge, false);
      state.isRetired = true;
      state.contractYearsRemaining = 0;
      // v12: make sure every season has its money before the Hall of Fame records career earnings.
      if (!DRY_RUN) (state.seasonLog || []).forEach((se) => {
        if (se.money) return;
        if (typeof buildSeasonPlan === 'function') buildSeasonPlan(state, se);
        if (typeof v11SeasonHook === 'function') v11SeasonHook(state, se);
        if (typeof v10SeasonHook === 'function') v10SeasonHook(state, se);
      });
      const { averageRating, averageSavePct } = getDerivedState(state);
      const posProfile = POSITION_PROFILES[state.setup.position];
      const allStints = state.clubHistory;
      const distinctClubs = new Set(allStints.map((s) => s.clubId));
      const majorTrophies = state.trophies.filter((t) => MAJOR_TROPHY_TYPES.has(t.category));
      const intlTitles = state.trophies.filter((t) => t.category === 'INTERNATIONAL').length;

      // Retired shirts: long, loyal, decorated spells.
      state.retiredShirts = [];
      Object.entries(state.clubTallies).forEach(([clubId, t]) => {
        const broke = state.clubRecordsBroken.some((r) => r.clubId === clubId);
        if (t.seasons >= 6 && (broke || t.trophies >= 3) && !state.betrayedClubIds.includes(clubId) && CLUB_MAP[clubId]) {
          const stint = [...allStints].reverse().find((s) => s.clubId === clubId);
          state.retiredShirts.push({ clubId, clubName: CLUB_MAP[clubId].name, number: (stint && stint.shirtNumber) || CLASSIC_NUMBERS[state.setup.position] });
        }
      });

      const badges = [];
      if (distinctClubs.size === 1 && state.transferCount === 0) badges.push(CAREER_BADGES.ONE_CLUB_MAN);
      if (state.betrayedClubIds.length > 0) badges.push(CAREER_BADGES.THE_JUDAS);
      if (state.stats.totalTransferFeesM >= 250) badges.push(CAREER_BADGES.GALACTICO);
      if (state.transferCount >= 5) badges.push(CAREER_BADGES.MERCENARY);
      const leftBoyhood = allStints.some((s) => s.clubId !== state.boyhoodClubId);
      if (allStints.length > 1 && allStints[allStints.length - 1].clubId === state.boyhoodClubId && leftBoyhood) badges.push(CAREER_BADGES.PRODIGAL_SON);
      const hasLegend = allStints.some((s) => s.seasons >= 6 && s.trophiesWon >= 2 && !state.betrayedClubIds.includes(s.clubId));
      if (hasLegend) badges.push(CAREER_BADGES.CLUB_LEGEND);
      if (state.stats.ballonDOrs >= 1 && majorTrophies.length >= 5) badges.push(CAREER_BADGES.ALL_TIME_GREAT);
      const firstMajorAge = majorTrophies.length > 0 ? Math.min(...majorTrophies.map((t) => t.yearAge)) : 99;
      if (state.peakValueAge >= posProfile.peakEnd + 1 || (firstMajorAge >= 29 && firstMajorAge < 99)) badges.push(CAREER_BADGES.LATE_BLOOMER);
      if (actualAge <= 33 && averageRating >= 7.6) badges.push(CAREER_BADGES.RETIRED_ON_TOP);
      if (actualAge >= 38) badges.push(CAREER_BADGES.IRONMAN);
      if (careerEarnings(state) >= 150) badges.push(CAREER_BADGES.MONEY_MAN);
      const leagues = new Set(allStints.map((s) => s.league));
      const confs = new Set(allStints.map((s) => CLUB_MAP[s.clubId] && CLUB_MAP[s.clubId].continent));
      if (leagues.size >= 4 || confs.size >= 3) badges.push(CAREER_BADGES.GLOBETROTTER);
      if (intlTitles >= 1 || (state.nationalCaptain && state.stats.internationalCaps >= 80)) badges.push(CAREER_BADGES.NATIONAL_HERO);
      if (state.clubRecordsBroken.length) badges.push(CAREER_BADGES.RECORD_BREAKER);
      if (state.stats.ballonDOrs === 0 && state.stats.bdoPodiums >= 2) badges.push(CAREER_BADGES.BRIDESMAID);

      state.earnedBadges = badges;
      const legacy = computeLegacy(state);
      state.legacyScore = legacy.total;
      state.legacyParts = legacy.parts;
      state.rival.retired = true;

      const nation = getNation(state);
      const entry = {
        id: `hof_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        playerName: state.playerName, position: state.setup.position, category: posProfile.category,
        continent: state.setup.continent, nation: nation.name, mode: state.setup.mode, code: careerCode(state.setup),
        retirementAge: actualAge, legacyScore: state.legacyScore, legacyMax: LEGACY_TOTAL, scale: 1000, challenge: state.setup.challenge || null, averageRating, averageSavePct,
        appearances: state.stats.appearances, goals: state.stats.goals, assists: state.stats.assists, cleanSheets: state.stats.cleanSheets,
        trophiesCount: state.trophies.length, ballonDOrs: state.stats.ballonDOrs, peakMarketValueM: state.peakMarketValueM,
        earningsM: Number(careerEarnings(state).toFixed(1)), difficulty: state.setup.difficulty || 'NORMAL', awards: state.awards.length, caps: state.stats.internationalCaps,
        badges: badges.map((b) => b.label), date: new Date().toISOString().slice(0, 10),
      };
      if (DRY_RUN) return entry;
      latestHofEntryId = entry.id;
      if (ACTIVE_SLOT != null) clearSlot(ACTIVE_SLOT);
      const hof = storageGet(HALL_OF_FAME_KEY, []);
      const updated = [...hof, entry].sort((a, b) => b.legacyScore - a.legacyScore).slice(0, HOF_LIMIT);
      const rankIdx = updated.findIndex((h) => h.id === entry.id);
      state.hofRank = rankIdx >= 0 ? rankIdx + 1 : null;
      storageSet(HALL_OF_FAME_KEY, updated);
      return entry;
    }
