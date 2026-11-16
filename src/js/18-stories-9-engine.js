    /* ==========================================================================
     * STORY ENGINE (v7)
     *   A recurring, seeded cast + 177 short stories that fire at four checkpoints:
     *   'open' (a window opens), 'window' (a decision is announced), 'season' (after
     *   each season) and 'retire' (the legacy screen). Choices set flags; later
     *   callback stories look for those flags. Nothing here calls rand(): stories use
     *   their own hash-seeded stream, so match results never depend on them.
     * ========================================================================== */
    const STORY_BY_ID = {};
    STORIES.forEach((s) => { STORY_BY_ID[s.id] = s; if ((s.cat === 'CB' || s.cat === 'LON') && s.w < 2) s.w = 2; });
    const LEAGUE_NATION = {
      'Premier League': 'ENG', 'La Liga': 'ESP', 'Bundesliga': 'GER', 'Serie A': 'ITA', 'Ligue 1': 'FRA', 'Campeonato Brasileiro Série A': 'BRA',
      'Argentine Primera División': 'ARG', 'Saudi Pro League': 'KSA', 'J1 League': 'JPN', 'Chinese Super League': 'CHN', 'Egyptian Premier League': 'EGY',
      'South African Premier Division': 'RSA', 'Liga MX': 'MEX', 'Major League Soccer': 'USA', 'Primeira Liga': 'POR', 'Eredivisie': 'NED',
      'Belgian Pro League': 'BEL', 'A-League Men': 'AUS',
    };
    /* Extra names for the story cast only (the rival still uses NAME_POOLS, so v6 career codes keep their rival). */
    const STORY_NAMES = {
      EUROPE: { male: ['Oskar', 'Sami', 'Lorenzo', 'Pieter', 'Callum', 'Ivan', 'Mikkel', 'Pablo'], female: ['Elena', 'Sofie', 'Clara', 'Ines', 'Freya', 'Marta', 'Anouk', 'Giulia', 'Hanna', 'Leonie'], last: ['Novak', 'Hughes', 'Bianchi', 'Jansen', 'Kowalski', 'Dubois', 'Larsen', 'Ortega', 'Fischer', 'Walsh'] },
      SOUTH_AMERICA: { male: ['Lautaro', 'Diego', 'Nicolás', 'Felipe', 'Caio', 'Sebastián', 'Ignacio', 'Vitor'], female: ['Valentina', 'Camila', 'Luciana', 'Mariana', 'Florencia', 'Beatriz', 'Agustina', 'Renata', 'Isabela', 'Paula'], last: ['Rojas', 'Silva', 'Fernández', 'Correa', 'Benítez', 'Moura', 'Castro', 'Vega', 'Pereira', 'Sosa'] },
      ASIA: { male: ['Haruto', 'Ji-ho', 'Reza', 'Tomoya', 'Faisal', 'Seo-jun', 'Yusuf', 'Kaito'], female: ['Yui', 'Seo-yeon', 'Mina', 'Aiko', 'Laleh', 'Noor', 'Hana', 'Ji-woo', 'Sakura', 'Maryam'], last: ['Tanaka', 'Lee', 'Karimi', 'Yamamoto', 'Choi', 'Al-Harbi', 'Suzuki', 'Han', 'Nakamura', 'Hosseini'] },
      AFRICA: { male: ['Kwame', 'Ibrahima', 'Youssef', 'Chidi', 'Moussa', 'Thabo', 'Karim', 'Emeka'], female: ['Amina', 'Fatou', 'Nadia', 'Adaeze', 'Zanele', 'Aïcha', 'Esi', 'Salma', 'Nomvula', 'Mariam'], last: ['Diallo', 'Mensah', 'Okafor', 'Haddad', 'Ndlovu', 'Traoré', 'Boateng', 'Benali', 'Eze', 'Sow'] },
      NORTH_AMERICA: { male: ['Tyler', 'Diego', 'Owen', 'Javier', 'Marcus', 'Andrés', 'Cole', 'Darnell'], female: ['Maya', 'Sofía', 'Jordan', 'Ximena', 'Avery', 'Lucía', 'Keisha', 'Paige', 'Daniela', 'Riley'], last: ['Ramírez', 'Thompson', 'Herrera', 'Mitchell', 'Navarro', 'Brooks', 'Campbell', 'Morales', 'Reid', 'Gutiérrez'] },
    };
    function storyNamePool(cont) {
      const base = NAME_POOLS[cont] || NAME_POOLS.EUROPE;
      const ex = STORY_NAMES[cont] || STORY_NAMES.EUROPE;
      return { male: [...base.first, ...ex.male], any: [...base.first, ...ex.male, ...ex.female, ...ex.female], last: [...base.last, ...ex.last] };
    }
    const STORY_PAPERS = ['The Evening Post', 'The Sports Gazette', 'The Daily Herald', 'The Morning Star', 'The Weekend Pitch', 'The City Echo'];
    const STORY_TONE_ICON = { warm: '💛', funny: '😄', proud: '🏅', drama: '🎭' };
    const STORY_WHEN_LABEL = { open: 'Summer', window: 'Signing day', season: 'Season', retire: 'Retirement' };

    function storyRng(state, salt) {
      let s = hashSeed(`${state.setup.seed}|story|${salt}`);
      return () => {
        let t = (s = (s + 0x6d2b79f5) | 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const storyPick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

    function buildStoryCast(state) {
      const r = storyRng(state, 'cast');
      const home = storyNamePool(state.setup.continent);
      const taken = new Set([state.playerName, state.rival && state.rival.name]);
      const firstTaken = new Set([String(state.playerName).split(' ')[0]]);
      const lastTaken = new Set([...taken].filter(Boolean).map((n) => n.split(' ').slice(1).join(' ')));
      const full = (firsts = home.any) => {
        for (let i = 0; i < 40; i++) { const f = storyPick(r, firsts), l = storyPick(r, home.last); if (!firstTaken.has(f) && !lastTaken.has(l)) { firstTaken.add(f); lastTaken.add(l); return `${f} ${l}`; } }
        return `${storyPick(r, firsts)} ${storyPick(r, home.last)}`;
      };
      const first = (firsts = home.any) => { for (let i = 0; i < 40; i++) { const n = storyPick(r, firsts); if (!firstTaken.has(n)) { firstTaken.add(n); return n; } } return storyPick(r, firsts); };
      const lowClubs = CLUBS.filter((c) => c.continent === state.setup.continent && BASE_CLUB_STATS[c.id].starRating <= 2);
      const mateClubPool = lowClubs.length ? lowClubs : CLUBS.filter((c) => BASE_CLUB_STATS[c.id].starRating <= 2);
      const cast = {
        coach: full(), mate: full(home.male), agent: full(), journo: full(),
        paper: storyPick(r, STORY_PAPERS), parent: r() < 0.5 ? 'Mum' : 'Dad',
        sibling: first(), superfan: first(), protege: first(home.male),
        mateClubId: storyPick(r, mateClubPool).id,
        clubPeople: {},
      };
      cast.usedFirst = [...firstTaken];
      return cast;
    }
    function ensureStory(state) {
      if (!state.story) state.story = { cast: buildStoryCast(state), flags: [], aff: {}, seen: [], journal: [], form: 0, lastTone: null, pending: [] };
      const st = state.story;
      st.pending = st.pending || [];
      return st;
    }
    function clubPeople(state, clubKey) {
      const st = ensureStory(state);
      if (!clubKey) return { gaffer: 'the gaffer', kitman: 'the kit man', captain: 'the captain' };
      if (!st.cast.clubPeople[clubKey]) {
        const club = CLUB_MAP[clubKey];
        const pool = storyNamePool(club ? (club.continent || 'EUROPE') : state.setup.continent);
        const r = storyRng(state, `club|${clubKey}`);
        // Club people avoid the first names (and surnames) of the recurring cast, so nobody is confused with the coach or the agent.
        const usedF = new Set([...(st.cast.usedFirst || []), ...[st.cast.coach, st.cast.mate, st.cast.agent, st.cast.journo].map((n) => n.split(' ')[0])]);
        const usedL = new Set([st.cast.coach, st.cast.mate, st.cast.agent, st.cast.journo, state.playerName, state.rival && state.rival.name].filter(Boolean).map((n) => n.split(' ').slice(1).join(' ')));
        const nm = (firsts) => {
          for (let i = 0; i < 40; i++) { const f = storyPick(r, firsts), l = storyPick(r, pool.last); if (!usedF.has(f) && !usedL.has(l)) { usedF.add(f); usedL.add(l); return `${f} ${l}`; } }
          return `${storyPick(r, firsts)} ${storyPick(r, pool.last)}`;
        };
        st.cast.clubPeople[clubKey] = { gaffer: nm(pool.any), kitman: nm(pool.any), captain: nm(pool.male) };
      }
      return st.cast.clubPeople[clubKey];
    }

    /* ---------- Tokens ---------- */
    function storyTokens(state, extra = {}) {
      const st = ensureStory(state);
      const cast = st.cast;
      const prof = POSITION_PROFILES[state.setup.position];
      const stints = state.clubHistory || [];
      const club = CLUB_MAP[state.currentClubId] || CLUB_MAP[(stints[stints.length - 1] || {}).clubId];
      const prevStint = extra.prevClubId ? { clubId: extra.prevClubId } : [...stints].reverse().find((x) => x.clubId !== state.currentClubId);
      const prevClub = prevStint ? CLUB_MAP[prevStint.clubId] : null;
      const academy = CLUB_MAP[state.boyhoodClubId] || club;
      const people = clubPeople(state, state.currentClubId);
      const lastLoan = (state.loanHistory || []).slice(-1)[0];
      const parts = String(state.playerName).trim().split(/\s+/);
      const clubsPlayed = new Set([...stints.map((x) => x.clubId), state.currentClubId].filter(Boolean)).size;
      return {
        first: parts[0], surname: parts.slice(1).join(' ') || parts[0], nation: getNation(state).name, hometown: 'your hometown',
        num: String(state.shirtNumber || CLASSIC_NUMBERS[state.setup.position]),
        club: club ? club.name : 'the academy', boyhood: academy ? academy.name : 'your first club', academyClub: academy ? academy.name : 'the academy',
        prevClub: prevClub ? prevClub.name : (academy ? academy.name : 'your old club'),
        coach: cast.coach, mate: cast.mate, mateClub: (CLUB_MAP[(st.mate && st.mate.clubId) || cast.mateClubId] || {}).name || 'a club down the road', agent: cast.agent,
        journo: cast.journo, paper: cast.paper, parent: cast.parent, sibling: cast.sibling, superfan: cast.superfan, protege: cast.protege,
        gaffer: people.gaffer, kitman: people.kitman, captain: people.captain,
        prevKitman: prevClub ? clubPeople(state, prevClub.id).kitman : people.kitman,
        rival: state.rival ? state.rival.name : 'your rival',
        firstStat: prof.primaryStatType === 'ATTACK' ? 'goal' : 'clean sheet',
        loanClub: lastLoan ? lastLoan.loanClubName : 'the loan club',
        loanGaffer: lastLoan ? clubPeople(state, `loan:${lastLoan.loanClubName}`).gaffer : 'the loan manager',
        tourName: extra.tourName || CONTINENTS[state.setup.continent].tournamentName,
        pizzas: Math.max(1, Math.round(((extra.fee || 0) * 1e6) / 12)).toLocaleString('en-GB'),
        bigOffer: extra.bigOffer || 'a bigger club', award: extra.award || 'an award', clubs: String(clubsPlayed),
        ...extra.tokens,
      };
    }
    function storyFill(text, tok) {
      let out = String(text).replace(/\{([a-zA-Z]+)\}/g, (m, k) => (tok[k] != null ? tok[k] : m));
      // Capitalise a sentence that now starts with a lower-case token ("your hometown…").
      out = out.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
      return out;
    }

    /* ---------- Context for the story conditions ---------- */
    function storyBase(state, salt) {
      const st = ensureStory(state);
      const r = storyRng(state, salt);
      return {
        has: (f) => st.flags.includes(f),
        aff: (k) => st.aff[k] || 0,
        rnd: (p) => r() < p,
        guided: !!(state.setup && state.setup.guided),
        age: state.currentAge,
        total: (state.seasonLog || []).length,
        atBoyhood: !!state.currentClubId && state.currentClubId === state.boyhoodClubId && (state.clubHistory || []).some((x) => x.clubId !== state.boyhoodClubId),
        _r: r,
      };
    }
    const isAbroad = (state, club) => !!club && (LEAGUE_NATION[club.league] || '') !== state.setup.nation && !(state.setup.nation === 'CAN' && club.league === 'Major League Soccer');

    function seasonStoryCtx(state, se) {
      const prof = POSITION_PROFILES[state.setup.position];
      const isAtt = prof.primaryStatType === 'ATTACK';
      const club = CLUB_MAP[se.clubId];
      const log = state.seasonLog || [];
      const idx = log.indexOf(se);
      const prev = idx > 0 ? log[idx - 1] : log.length && log[log.length - 1] !== se ? log[log.length - 1] : null;
      const careerStat = isAtt ? state.stats.goals : state.stats.cleanSheets;
      const seasonStat = isAtt ? se.goals : se.cleanSheets;
      const prevStint = [...(state.clubHistory || [])].reverse().find((x) => x.clubId !== se.clubId);
      const prevClub = prevStint ? CLUB_MAP[prevStint.clubId] : null;
      const rv = se.rival;
      const rivalTotal = state.rival ? (isAtt ? state.rival.goals : state.rival.cleanSheets) : 0;
      let stint = 1;
      for (let k = (idx >= 0 ? idx : log.length) - 1; k >= 0 && log[k].clubId === se.clubId; k--) stint++;
      const c = storyBase(state, `season|${se.age}`);
      Object.assign(c, {
        age: se.age, total: idx >= 0 ? idx + 1 : log.length,
        club, stint, first: stint === 1,
        rating: se.rating, apps: se.apps, stat: seasonStat, isAtt, isGK: prof.category === 'GK', loan: !!se.onLoan,
        injured: !!se.injured, prevInjured: !!(prev && prev.injured),
        trophies: se.trophies.length, trophiesTotal: state.trophies.length,
        major: se.trophies.some((t) => MAJOR_TROPHY_TYPES.has(t.category)),
        majorCount: se.trophies.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length,
        won: (cat) => se.trophies.some((t) => t.category === cat),
        ev: (type) => se.events.some((e) => e.type === type),
        bd: se.bdRank || null, ballon: !!se.ballonDor, tour: se.tournament,
        awardCount: (se.awards || []).length, awardNames: se.awards || [],
        captain: !!state.isCaptain, stars: club ? club.starRating : 3,
        mood: moodOf(state, se.clubId), caps: state.stats.internationalCaps,
        abroad: isAbroad(state, club),
        rival: !!rv, rivalBetter: !!rv && rv.rating > se.rating, rivalTrophies: rv ? rv.trophies : 0,
        rivalHere: !!state.rival && state.rival.clubId === se.clubId,
        rivalSameNation: !!state.rival && state.rival.nationId === state.setup.nation,
        statClose: !!state.rival && careerStat > 10 && Math.abs(careerStat - rivalTotal) <= Math.max(5, careerStat * 0.1),
        crossed: (n) => careerStat >= n && careerStat - seasonStat < n,
        secondTier: !!se.secondTier,
        prevSameLeague: !!prevClub && !!club && prevClub.league === club.league,
        stepDown: !!prevClub && !!club && club.starRating < prevClub.starRating,
        siblingAge: se.age - 8,
        yearsLeft: state.setup.retirementAge - (se.age + 1),
      });
      c._extra = { tourName: se.tournament ? se.tournament.title : null, award: (se.awards || [])[0] };
      return c;
    }
    function windowStoryCtx(state, info) {
      const c = storyBase(state, `window|${state.windowCount}|${info.kind}`);
      const target = CLUB_MAP[info.clubId || state.currentClubId];
      Object.assign(c, {
        kind: info.kind, fee: info.fee || 0, tag: info.tag || null, free: !!info.free,
        prevStint: info.prevStint || 0, abroad: isAbroad(state, target), bigOffer: info.bigOffer || null,
        renegotiated: !!info.renegotiated,
        leavingBoyhood: info.prevClubId === state.boyhoodClubId && !!target && target.id !== state.boyhoodClubId,
        returning: info.kind === 'TRANSFER' && (state.clubHistory || []).some((x) => x.clubId === target.id && x.endAge < state.currentAge),
        atBoyhood: !!target && target.id === state.boyhoodClubId,
        wasOnLoan: (state.loanHistory || []).length > 0,
      });
      c._extra = { fee: info.fee || 0, bigOffer: info.bigOffer, prevClubId: info.prevClubId };
      return c;
    }
    function openStoryCtx(state, offers) {
      const c = storyBase(state, `open|${state.windowCount}`);
      const pc = state.pendingChoices;
      Object.assign(c, { final: getDerivedState(state).isFinalWindow, offers: offers || 0, hasLoan: !!(pc && (pc.offers || []).some((o) => o.type === 'LOAN')) });
      return c;
    }
    function retireStoryCtx(state) {
      const c = storyBase(state, 'retire');
      const leg = computeLegacy(state);
      Object.assign(c, {
        apps: state.stats.appearances, isAtt: POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK',
        clubs: new Set([...(state.clubHistory || []).map((x) => x.clubId), state.currentClubId].filter(Boolean)).size,
        legend: !!leg.legend, retiredShirt: (state.retiredShirts || []).length > 0,
      });
      c._extra = {};
      return c;
    }

    /* ---------- Selection ---------- */
    function eligibleStories(state, when, c) {
      const st = ensureStory(state);
      const mode = state.setup.mode === 'QUICK' ? 'quick' : 'career';
      return STORIES.filter((s) => {
        if (s.when !== when || st.seen.includes(s.id)) return false;
        if (s.modes !== 'both' && s.modes !== mode) return false;
        if (s.needs && s.needs.some((f) => !st.flags.includes(f))) return false;
        try { return !!s.if(c); } catch { return false; }
      });
    }
    function pickStories(state, when, c, max) {
      const st = ensureStory(state);
      let pool = eligibleStories(state, when, c);
      const out = [];
      const r = c._r;
      let lastTone = st.lastTone;
      while (out.length < max && pool.length) {
        if (out.length >= 1 && when === 'season' && r() < 0.5) break;
        const weights = pool.map((s) => (s.w || 1) * (s.tone === 'drama' && lastTone === 'drama' ? 0.15 : 1));
        const sum = weights.reduce((a, b) => a + b, 0);
        let x = r() * sum; let i = 0;
        while (i < pool.length - 1 && x >= weights[i]) { x -= weights[i]; i++; }
        const s = pool[i];
        out.push(s); lastTone = s.tone;
        pool = pool.filter((p) => p !== s);
      }
      return out;
    }

    /* ---------- Firing and resolving ---------- */
    function fireStory(state, story, c, meta) {
      const st = ensureStory(state);
      const tok = storyTokens(state, c._extra || {});
      st.seen.push(story.id);
      st.lastTone = story.tone;
      (story.sets || []).forEach((f) => { if (!st.flags.includes(f)) st.flags.push(f); });
      if (story.fx) applyStoryFx(state, story.fx);
      const entry = {
        id: story.id, title: storyFill(story.title, tok), text: storyFill(typeof storyVariantText === 'function' ? storyVariantText(state, story) : story.text, tok), tone: story.tone, cat: story.cat,
        when: story.when, age: meta.age, season: seasonLabel(meta.age), clubName: tok.club, window: state.windowCount,
        choices: story.choices ? story.choices.map((ch) => ({ label: storyFill(ch.label, tok), desc: storyFill(ch.desc || '', tok) })) : null,
        picked: null, outcome: null, auto: false,
        xt: story.choices && c._extra && c._extra.tokens ? { ...c._extra.tokens } : undefined,
      };
      st.journal.push(entry);
      if (typeof albumRecord === 'function') albumRecord(state, entry);
      return entry;
    }
    function applyStoryFx(state, fx) {
      const st = ensureStory(state);
      if (fx.mood && state.currentClubId) adjustMood(state, state.currentClubId, clamp(fx.mood, -8, 8));
      if (fx.aff) Object.entries(fx.aff).forEach(([k, v]) => { st.aff[k] = clamp((st.aff[k] || 0) + clamp(v, -2, 2), -3, 3); });
      if (fx.form) st.form = clamp((st.form || 0) + fx.form, -0.05, 0.05);
    }
    function resolveStory(state, entry, idx, auto = false) {
      if (!entry || entry.picked != null || !entry.choices) return entry;
      const story = STORY_BY_ID[entry.id];
      const ch = story.choices[idx] || story.choices[0];
      const st = ensureStory(state);
      const tok = storyTokens(state, { tokens: entry.xt || {} });
      tok.club = entry.clubName;
      entry.picked = idx; entry.auto = auto;
      entry.outcome = storyFill(ch.out, tok);
      (ch.sets || []).forEach((f) => { if (!st.flags.includes(f)) st.flags.push(f); });
      if (ch.fx) applyStoryFx(state, ch.fx);
      return entry;
    }
    function runStoryCheckpoint(state, when, c, meta, { max = 1, auto = false, force = [] } = {}) {
      if (DRY_RUN || !state || !state.setup) return [];
      ensureStory(state);
      const picked = [];
      force.forEach((id) => { const s = STORY_BY_ID[id]; if (s && eligibleStories(state, when, c).includes(s)) picked.push(s); });
      pickStories(state, when, c, max - picked.length).forEach((s) => { if (!picked.includes(s)) picked.push(s); });
      const entries = picked.map((s) => fireStory(state, s, c, meta));
      if (auto) entries.forEach((e) => resolveStory(state, e, 0, true));
      return entries;
    }
    function storySeason(state, se, opts = {}) {
      if (DRY_RUN || !state || !state.setup) return [];
      storyDepthSeason(state, se);
      const c = seasonStoryCtx(state, se);
      const d = seasonDepthCtx(state, se);
      Object.assign(c, d);
      c._extra.tokens = { ...(c._extra.tokens || {}), ...d._tokens };
      if (typeof squadStoryCtx === 'function') { const q = squadStoryCtx(state, se); Object.assign(c, q); c._extra.tokens = { ...c._extra.tokens, ...q._tokens }; }
      return runStoryCheckpoint(state, 'season', c, { age: se.age }, { max: 2, ...opts });
    }
    const storyWindow = (state, info, opts = {}) => (typeof v10WindowHook === 'function' && v10WindowHook(state, info), typeof v11WindowHook === 'function' && v11WindowHook(state, info), info.kind !== 'LOAN' && info.clubId !== info.prevClubId && !DRY_RUN && swapClubRelations(state, info.prevClubId, info.clubId), runStoryCheckpoint(state, 'window', windowStoryCtx(state, info), { age: state.currentAge }, { max: info.kind === 'FIRST_CONTRACT' ? 3 : 1, force: info.kind === 'FIRST_CONTRACT' ? ['ACA-01', 'ACA-02'] : [], ...opts }));
    const storyOpen = (state, offers, opts = {}) => runStoryCheckpoint(state, 'open', openStoryCtx(state, offers), { age: state.currentAge }, { max: 1, ...opts });
    const storyRetire = (state, opts = {}) => (state.story && state.story.journal.some((e) => e.when === 'retire')) ? state.story.journal.filter((e) => e.when === 'retire')
      : runStoryCheckpoint(state, 'retire', retireStoryCtx(state), { age: state.currentAge }, { max: 4, force: ['END-09'], ...opts });

    /* Info about a decision, captured before beginWindow changes the state. */
    function storyWindowInfo(state, option) {
      const d = option.data || option;
      const prevStint = state.currentStint;
      let bigOffer = null;
      const cc = typeof currentChoices !== 'undefined' ? currentChoices : null;
      if ((option.kind || d.type) === 'STAY' && cc && Array.isArray(cc.offers)) {
        const best = cc.offers.map((o) => CLUB_MAP[o.clubId]).filter((c) => c && c.starRating >= 4 && c.id !== state.currentClubId).sort((a, b) => b.starRating - a.starRating)[0];
        if (best) bigOffer = best.name;
      }
      return {
        kind: d.type || option.kind, clubId: d.clubId || state.currentClubId, fee: Number(d.feeM) || 0, tag: d.dramaTag || null,
        free: d.type === 'TRANSFER' && (!!d.isFreeAgent || !d.feeM), prevClubId: state.currentClubId, prevStint: prevStint ? prevStint.seasons : 0,
        renegotiated: !!d.renegotiated, bigOffer,
      };
    }
    function storyCallbacksLanded(state) {
      const st = state.story;
      return st ? st.journal.filter((e) => e.cat === 'CB') : [];
    }
    function storyJournalText(state) {
      const st = ensureStory(state);
      const lines = [`${state.playerName} — My story`, `${getNation(state).name} · ${POSITION_PROFILES[state.setup.position].label || state.setup.position} · career code ${typeof careerCode === 'function' ? careerCode(state.setup) : state.setup.seed}`, ''];
      st.journal.forEach((e) => {
        lines.push(`${e.season} · age ${e.age} · ${e.clubName} — ${e.title}`);
        lines.push(e.text);
        if (e.picked != null && e.choices) lines.push(`→ ${e.choices[e.picked].label}${e.auto ? ' (decided for you)' : ''}: ${e.outcome}`);
        const h = (st.headlines || []).find((x) => x.age === e.age && e.when === 'season');
        if (h && !lines.includes(`   ${h.paper}: “${h.text}”`)) lines.push(`   ${h.paper}: “${h.text}”`);
        lines.push('');
      });
      if (state.isRetired && typeof whereNow === 'function') {
        lines.push(reputationLine(state), '', 'Where are they now');
        whereNow(state).forEach((w) => lines.push(`- ${w.line}`));
        const pr = promisesSummary(state);
        if (pr.length) { lines.push('', 'Promises'); pr.forEach((p) => lines.push(`${p.kept ? '✓' : '○'} ${p.text}${p.kept ? '' : ` — ${p.owed}`}`)); }
      }
      return lines.join('\n');
    }

    /* ---------- UI pieces ---------- */
    function storyCardHTML(e, { idx = 0, interactive = true, compact = false } = {}) {
      const choices = e.choices && e.picked == null && interactive
        ? `<div class="st-choices">${e.choices.map((c, i) => `<button class="st-opt" data-story="${idx}" data-choice="${i}"><span class="kbd k">${i + 1}</span><b>${esc(c.label)}</b>${c.desc ? `<span>${esc(c.desc)}</span>` : ''}</button>`).join('')}</div>` : '';
      const out = e.picked != null && e.choices ? `<div class="st-out"><b>${esc(e.choices[e.picked].label)}${e.auto ? ' <span class="dim" style="font-weight:600">· decided for you</span>' : ''}</b> — ${esc(e.outcome)}</div>` : '';
      return `<div class="story-card tone-${e.tone}${compact ? ' compact' : ''}">${typeof sceneSVG === 'function' ? `<div class="st-scene">${sceneSVG(sceneFor(e))}</div>` : ''}<div class="st-head"><span class="st-ic">${STORY_TONE_ICON[e.tone] || '📖'}</span><div><div class="st-eyebrow">${STORY_WHEN_LABEL[e.when] || 'Story'} · ${esc(e.season)} · age ${e.age}</div><div class="st-title">${esc(e.title)}</div></div></div><div class="st-text">${esc(e.text)}</div>${choices}${out}</div>`;
    }
    /* Shows story entries in the review overlay and waits for any choices. */
    function stageStories(entries, label = 'Off the pitch') {
      if (!entries || !entries.length) return Promise.resolve();
      return new Promise((resolve) => {
        let renders = 0;
        const render = () => {
          $('rvStage').innerHTML = `<div class="rv-card${renders++ ? ' settled' : ''}"><div style="text-align:center; margin-bottom:12px"><div class="eyebrow" style="color:#ffd78f">${esc(label)}</div></div><div class="story-stack">${entries.map((e, i) => storyCardHTML(e, { idx: i })).join('')}</div><div style="text-align:center; margin-top:16px"><button class="btn btn-go" id="stContinue" ${entries.some((e) => e.choices && e.picked == null) ? 'disabled' : ''}>Continue ▸</button></div></div>`;
          document.querySelectorAll('.st-opt').forEach((b) => { b.onclick = () => choose(Number(b.dataset.story), Number(b.dataset.choice)); });
          const btn = $('stContinue');
          if (btn) btn.onclick = done;
        };
        const choose = (si, ci) => { resolveStory(gameState, entries[si], ci); sfx('click'); saveCareer(gameState); render(); };
        const done = () => { document.removeEventListener('keydown', onKey); resolve(); };
        const onKey = (e) => {
          const open = entries.findIndex((x) => x.choices && x.picked == null);
          const n = Number(e.key);
          if (open >= 0 && n >= 1 && n <= entries[open].choices.length) { e.preventDefault(); choose(open, n - 1); return; }
          if (open < 0 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); done(); }
        };
        document.addEventListener('keydown', onKey);
        sfx('click');
        render();
        if (RV.skip) {
          entries.forEach((e) => { if (e.choices && e.picked == null) resolveStory(gameState, e, 0, true); });
          render();
          setTimeout(done, 400);
        }
      });
    }
    function bindStoryButtons(root, entries, after) {
      (root || document).querySelectorAll('.st-opt').forEach((b) => {
        b.onclick = () => { resolveStory(gameState, entries[Number(b.dataset.story)], Number(b.dataset.choice)); sfx('click'); saveCareer(gameState); after(); };
      });
    }

    function copyStoryJournal() {
      const txt = storyJournalText(gameState);
      try { navigator.clipboard.writeText(txt).then(() => showToast('Copied', 'Your story is on the clipboard.')); } catch { showToast('Copy failed', 'Use Export instead.'); }
    }
    function downloadStoryJournal() {
      const blob = new Blob([storyJournalText(gameState)], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${String(gameState.playerName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-my-story.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    /* Home: this summer's story (and any choice still waiting). */
    function homeStoriesHTML(s) {
      const st = ensureStory(s);
      const list = st.journal.map((e, i) => ({ e, i })).filter(({ e }) => (e.when === 'open' && e.window === s.windowCount) || (e.choices && e.picked == null));
      if (!list.length) return '';
      return `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span>📖 This summer</span><button class="btn btn-ghost" style="padding:2px 8px" onclick="navTo('story')">My story ▸</button></div><div class="panel-body story-stack" id="homeStories">${list.map(({ e, i }) => storyCardHTML(e, { idx: i })).join('')}</div></div>`;
    }

    /* Legacy screen: the last chapter, and the callbacks that landed. */
    function legacyStoryHTML(s) {
      const st = ensureStory(s);
      const last = st.journal.map((e, i) => ({ e, i })).filter(({ e }) => e.when === 'retire');
      const cbs = storyCallbacksLanded(s).filter((e) => e.when !== 'retire');
      if (!last.length && !cbs.length) return '';
      return `<div class="grid g-2"><div class="panel"><div class="panel-head"><span>📖 The last chapter</span><span class="right">${st.journal.length} chapters in all</span></div><div class="panel-body story-stack">${last.map(({ e, i }) => storyCardHTML(e, { idx: i })).join('')}</div></div>
        <div class="panel"><div class="panel-head"><span>🔁 Callbacks that landed</span><span class="right">${cbs.length}</span></div><div class="panel-body story-mini">${cbs.length ? cbs.map((e) => `<div>${STORY_TONE_ICON[e.tone] || '📖'} <b>${esc(e.title)}</b> <span class="dim">· age ${e.age} · ${esc(e.clubName)}</span><div class="muted" style="font-size:12px; margin:2px 0 8px">${esc(e.text)}</div></div>`).join('') : '<div class="empty">No callbacks this time — the seeds were planted, but the stories went another way.</div>'}
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap"><button class="btn" onclick="copyStoryJournal()">Copy my story</button><button class="btn" onclick="downloadStoryJournal()">Export my story (.txt)</button></div></div></div></div>`;
    }
    function bindLegacyStory(s) {
      const root = $('lgStory');
      if (!root) return;
      bindStoryButtons(root, ensureStory(s).journal, () => { root.innerHTML = legacyStoryHTML(s); bindLegacyStory(s); });
    }
