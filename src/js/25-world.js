    /* ==========================================================================
     * v11 · A LIVING WORLD
     *   The football world moves on around you: champions of every league and
     *   continental cup (consistent with your own results), a cast of fictional
     *   world stars who age, move and retire, Ballon d'Or podiums, managers
     *   coming and going, transfer records, clubs rising and falling.
     *   Press conferences, a public profile with followers, and sponsors.
     *   A detail level (Light / Standard / Full) decides how much you see.
     *   Uses its own hash-seeded numbers: never the engine's rand().
     *   Clubs are real; every person is fictional and generated per career.
     * ========================================================================== */
    const v11Rng = (state, salt) => storyRng(state, `v11|${salt}`);
    const DETAIL_LEVELS = {
      LIGHT: { label: 'Light', sub: 'The big moments only: quick seasons, no winter meetings, press or season goals, one story at most per season.', ic: '🍃' },
      STANDARD: { label: 'Standard', sub: 'Winter meetings every season, press conferences after big seasons.', ic: '⚽' },
      FULL: { label: 'Full', sub: 'Everything: press after every season and a look around the world each season.', ic: '🌍' },
    };
    const detailLevel = (state) => (state && state.setup && DETAIL_LEVELS[state.setup.detail] ? state.setup.detail : 'STANDARD');
    const isLight = (state) => detailLevel(state) === 'LIGHT';
    const isFull = (state) => detailLevel(state) === 'FULL';

    const ATTACKERS = ['ST', 'LW', 'RW', 'CAM'];
    const STAR_POSITIONS = ['ST', 'ST', 'LW', 'RW', 'CAM', 'CAM', 'CM', 'CM', 'CDM', 'CB', 'CB', 'RB', 'LB', 'GK'];
    const STAR_CONTS = ['EUROPE', 'EUROPE', 'EUROPE', 'EUROPE', 'EUROPE', 'SOUTH_AMERICA', 'SOUTH_AMERICA', 'SOUTH_AMERICA', 'AFRICA', 'AFRICA', 'ASIA', 'NORTH_AMERICA'];
    const BASE_RECORD_M = 180; // the game world's transfer record when your career starts (fictional)

    function v11EliteClubs(minStars = 4, cont = null) { return CLUBS.filter((c) => c.starRating >= minStars && (!cont || c.continent === cont)); }
    function weightedClub(r, clubs, exclude = []) {
      const pool = clubs.filter((c) => !exclude.includes(c.id));
      if (!pool.length) return null;
      const wt = (c) => Math.pow(c.starRating, 6) * (1 + (c.trophyOdds || 0.05) * 6);
      let x = r() * pool.reduce((a, c) => a + wt(c), 0);
      return pool.find((c) => (x -= wt(c)) < 0) || pool[0];
    }
    function v11Name(state, r, cont, used) {
      const pool = storyNamePool(cont);
      for (let i = 0; i < 40; i++) { const n = `${storyPick(r, pool.male)} ${storyPick(r, pool.last)}`; if (!used.has(n) && !used.has(n.split(' ').slice(1).join(' '))) { used.add(n); used.add(n.split(' ').slice(1).join(' ')); return n; } }
      return `${storyPick(r, pool.male)} ${storyPick(r, pool.last)}`;
    }
    function usedNames(state) {
      const st = ensureStory(state);
      const used = new Set([state.playerName, state.rival && state.rival.name, st.cast.coach, st.cast.mate, st.cast.agent, st.cast.journo].filter(Boolean));
      [...used].forEach((n) => used.add(n.split(' ').slice(1).join(' ')));
      ((state.v11 && state.v11.stars) || []).forEach((s) => { used.add(s.name); used.add(s.name.split(' ').slice(1).join(' ')); });
      return used;
    }
    function makeStar(state, r, idx, age, used) {
      const cont = storyPick(r, STAR_CONTS);
      const nats = NATIONS[cont] || NATIONS.EUROPE;
      const nat = storyPick(r, nats);
      const pos = storyPick(r, STAR_POSITIONS);
      const peak = 7.35 + r() * 0.75; // world-class peak season ratings
      const club = age <= 19 && r() < 0.5 ? weightedClub(r, v11EliteClubs(3, cont)) || weightedClub(r, v11EliteClubs(4)) : weightedClub(r, v11EliteClubs(4, r() < 0.8 ? 'EUROPE' : cont)) || weightedClub(r, v11EliteClubs(4));
      return { id: `w${idx}`, name: v11Name(state, r, cont, used), nat: nat.id, natName: nat.name, pos, peak: Number(peak.toFixed(2)), a0: age, clubId: club.id, retireAt: 33 + Math.floor(r() * 5), moves: [{ age, clubId: club.id, feeM: 0 }], seasons: [], bdo: 0, retired: false };
    }

    function ensureV11(state) {
      if (state.v11) return state.v11;
      const r = v11Rng(state, 'init');
      const w = { start: state.currentAge, stars: [], champions: {}, contChamps: {}, cupChamps: {}, ballon: {}, news: {}, managers: {}, record: { feeM: BASE_RECORD_M, name: null, age: null }, clubSnap: { ...(state.clubDynamics || {}) },
        profile: Math.round(4 + r() * 4), followersK: Math.round(2 + r() * 6), followerHist: [], press: [], style: { humble: 0, confident: 0, private: 0 }, sponsors: [], offers: null, sponsorHist: [], seasonsDone: [], nextStar: 0 };
      state.v11 = w;
      const used = usedNames(state);
      for (let i = 0; i < 16; i++) w.stars.push(makeStar(state, r, w.nextStar++, 17 + Math.floor(r() * 14), used));
      return w;
    }
    const starAge = (w, s, age) => s.a0 + (age - w.start);
    function newsPush(w, age, ic, text, kind = 'world', mine = false) { (w.news[age] = w.news[age] || []).push({ ic, text, kind, mine }); }

    /* ---------- One season of the world ---------- */
    function worldSeason(state, se) {
      const w = ensureV11(state);
      const age = se.age;
      const r = v11Rng(state, `season|${age}`);
      const m = typeof seasonMatches === 'function' ? seasonMatches(state, se) : null;
      const youClubId = se.onLoan ? (CLUBS.find((c) => c.name === se.loanClubName) || {}).id : se.clubId;
      const youClub = CLUB_MAP[youClubId] || CLUB_MAP[se.clubId];

      // World stars play their season, maybe move, maybe retire.
      const used = usedNames(state);
      const moves = [];
      w.stars.filter((s) => !s.retired).forEach((s) => {
        const a = starAge(w, s, age);
        if (a < 17) return;
        const ab = s.peak - (a < 26 ? (26 - a) * 0.11 : a > 30 ? (a - 30) * 0.14 : 0);
        const rating = Number(clamp(ab + (r() - 0.5) * 0.4, 6.2, 8.7).toFixed(2));
        const att = ATTACKERS.includes(s.pos);
        const goals = s.pos === 'GK' ? 0 : Math.max(0, Math.round((att ? (rating - 6.5) * 21 : (rating - 6.6) * 5) + r() * 5));
        const cs = s.pos === 'GK' || ['CB', 'LB', 'RB', 'CDM'].includes(s.pos) ? Math.round(8 + (rating - 6.8) * 10 + r() * 5) : 0;
        const club = CLUB_MAP[s.clubId];
        s.seasons.push({ age, a, rating, goals, cs, clubId: s.clubId });
        if (a >= s.retireAt) { s.retired = true; s.retiredAge = a; newsPush(w, age, '👋', `${s.name} (${s.natName}) retires at ${a}${club ? `, after his last season at ${club.name}` : ''}.`, 'retire'); return; }
        if (a >= 19 && a <= 31 && r() < (a <= 27 ? 0.17 : 0.1)) {
          const to = weightedClub(r, v11EliteClubs(club && club.starRating >= 5 ? 5 : 4), [s.clubId, youClubId]);
          if (to) {
            const value = Math.pow(Math.max(0.2, rating - 6.6), 1.6) * 70 * (a <= 24 ? 1.35 : a <= 28 ? 1.1 : 0.7);
            const feeM = Number(clamp(value * (0.85 + r() * 0.4), 8, 260).toFixed(1));
            s.moves.push({ age: a, clubId: to.id, feeM, from: s.clubId });
            moves.push({ s, from: club, to, feeM });
            s.clubId = to.id;
          }
        }
      });
      // New wonderkids replace the retired, so there are always about sixteen.
      while (w.stars.filter((s) => !s.retired).length < 16) { const s = makeStar(state, r, w.nextStar++, 17, used); s.a0 = 17 - (age + 1 - w.start); w.stars.push(s); newsPush(w, age, '🌱', `Wonderkid alert: ${s.name}, 17, is the name on every scout’s list at ${CLUB_MAP[s.clubId].name}.`, 'kid'); }
      moves.sort((a, b) => b.feeM - a.feeM).slice(0, 3).forEach((mv, i) => {
        const rec = mv.feeM > w.record.feeM;
        if (rec) { w.record = { feeM: mv.feeM, name: mv.s.name, age, from: mv.from && mv.from.name, to: mv.to.name }; }
        if (rec || i < 2) newsPush(w, age, rec ? '💥' : '🔁', `${rec ? 'World record: ' : ''}${mv.s.name} joins ${mv.to.name} from ${mv.from ? mv.from.name : 'abroad'} for €${mv.feeM}M.`, rec ? 'record' : 'move');
      });

      if (se.rival && se.rival.moved && se.rival.moved.to) newsPush(w, age, '🔥', `Your rival ${se.rival.name} joins ${se.rival.moved.to} from ${se.rival.moved.from} for €${se.rival.moved.feeM}M.`, 'rival');
      // League champions everywhere. Yours comes from your own table.
      const champs = {};
      const myTableLeague = m && m.table && m.plan && m.plan.lg ? m.plan.lg.name : null;
      if (myTableLeague && m.table.length) { const top = m.table[0]; champs[myTableLeague] = CLUB_MAP[top.key] ? top.key : String(top.key).replace(/^x:/, ''); }
      Object.keys(LEAGUES).forEach((lg) => {
        if (champs[lg]) return;
        const clubs = CLUBS.filter((c) => c.league === lg);
        if (!clubs.length) return;
        const c = weightedClub(r, clubs, [youClubId]);
        if (c) champs[lg] = c.id;
      });
      w.champions[age] = champs;
      // Continental cups and your domestic cup: whoever beat you in a final won it.
      const cont = {};
      const finalOf = (comp) => m && [...m.fixtures].reverse().find((f) => f.comp === comp && f.round === 'Final');
      Object.keys(CONTINENTS).forEach((k) => {
        const name = CONTINENTS[k].clubContinentalCup || 'Continental Cup';
        let winner = null;
        if (youClub && youClub.continent === k && m && m.plan && m.plan.cont) {
          if (m.plan.cont.won) winner = youClub.id;
          else { const f = finalOf('E'); if (f && f.opp && CLUB_MAP[f.opp.id]) winner = f.opp.id; }
        }
        if (!winner) { const c = weightedClub(r, v11EliteClubs(4, k).length ? v11EliteClubs(4, k) : v11EliteClubs(3, k), youClub && youClub.continent === k ? [youClub.id] : []); winner = c && c.id; }
        if (winner) cont[k] = { name, clubId: winner };
      });
      w.contChamps[age] = cont;
      if (m && m.plan && m.plan.cup) {
        const f = finalOf('C');
        w.cupChamps[age] = { name: m.plan.cup.name, winner: m.plan.cup.won ? (youClub ? youClub.name : '') : f && f.gf < f.ga ? f.opp.name : null };
      }

      // Ballon d'Or podium (top five), with you and your rival where the engine placed you.
      const cand = w.stars.map((s) => ({ s, x: s.seasons.find((q) => q.age === age) })).filter((o) => o.x).map((o) => ({ name: o.s.name, clubName: (CLUB_MAP[o.x.clubId] || {}).name || '', score: o.x.rating + (CLUB_MAP[o.x.clubId] ? CLUB_MAP[o.x.clubId].starRating * 0.04 : 0) + (ATTACKERS.includes(o.s.pos) ? 0.08 : 0), star: o.s }))
        .sort((a, b) => b.score - a.score);
      const podium = [];
      const fixed = [];
      if (se.ballonDor) fixed.push({ rank: 1, name: state.playerName, clubName: youClub ? youClub.name : '', you: true });
      else if (se.bdRank && se.bdRank <= 5) fixed.push({ rank: se.bdRank, name: state.playerName, clubName: youClub ? youClub.name : '', you: true });
      const rv = se.rival;
      if (rv) { const rr = se.rivalWonBdo ? 1 : rv.bdRank; if (rr && rr <= 5 && !fixed.some((f) => f.rank === rr)) fixed.push({ rank: rr, name: rv.name, clubName: rv.clubName, rival: true }); }
      let ci = 0;
      for (let rank = 1; rank <= 5; rank++) {
        const f = fixed.find((x) => x.rank === rank);
        if (f) podium.push(f);
        else if (cand[ci]) { const c = cand[ci++]; podium.push({ rank, name: c.name, clubName: c.clubName, star: c.star.id }); if (rank === 1) c.star.bdo += 1; }
      }
      w.ballon[age] = podium;
      const bw = podium[0];
      if (bw && !bw.you) newsPush(w, age, '🏆', `${bw.name} (${bw.clubName}) wins the Ballon d'Or${bw.rival ? '. Your old academy rival' : ''}.`, 'ballon');

      // Clubs rising and falling (the engine moves club strength; we report it).
      Object.keys(state.clubDynamics || {}).filter((id) => CLUB_MAP[id] && (state.clubDynamics[id] || 0) !== (w.clubSnap[id] || 0) && (CLUB_MAP[id].starRating >= 4 || CLUB_MAP[id].league === (youClub && youClub.league)))
        .sort((a, b) => (CLUB_MAP[b].league === (youClub && youClub.league)) - (CLUB_MAP[a].league === (youClub && youClub.league)) || CLUB_MAP[b].starRating - CLUB_MAP[a].starRating).slice(0, 2).forEach((id) => {
        const now = state.clubDynamics[id] || 0; const was = w.clubSnap[id] || 0;
        const c = CLUB_MAP[id];
        newsPush(w, age, now > was ? '📈' : '📉', now > was ? `${c.name} are on the rise: new owners, new signings, now a ${c.starRating}★ club.` : `${c.name} are rebuilding after a hard spell, down to ${c.starRating}★.`, 'club');
      });
      w.clubSnap = { ...(state.clubDynamics || {}) };

      // Your manager: a bad season can cost him his job; long reigns end too.
      managerSeason(state, w, se, m, r);
      if (myTableLeague && champs[myTableLeague] !== m.plan.lg.us) {
        const cc = CLUB_MAP[champs[myTableLeague]];
        newsPush(w, age, '🥇', `${cc ? cc.name : champs[myTableLeague]} are ${myTableLeague} champions.`, 'league');
      }
      return w;
    }

    function managerSeason(state, w, se, m, r) {
      if (se.onLoan) return;
      const club = CLUB_MAP[se.clubId];
      if (!club) return;
      const ppl = clubPeople(state, club.id);
      const list = (w.managers[club.id] = w.managers[club.id] || [{ name: ppl.gaffer, from: se.age }]);
      const cur = list[list.length - 1];
      const tenure = se.age - cur.from;
      let pos = null; let expected = null;
      if (m && m.table && m.plan && m.plan.lg && m.plan.lg.us != null) {
        pos = m.table.findIndex((row) => row.key === m.plan.lg.us) + 1;
        const mine = m.plan.lg.teams.find((t) => t[0] === m.plan.lg.us);
        const ranks = m.plan.lg.teams.map((t) => t[1]).sort((a, b) => b - a);
        expected = mine ? ranks.indexOf(mine[1]) + 1 : null;
      }
      const wonSomething = se.trophies.length > 0;
      let p = 0.15 + Math.max(0, tenure - 2) * 0.06;
      if (pos && expected && pos - expected >= 3) p += 0.4;
      if (se.secondTier) p += 0.35;
      if (wonSomething) p *= 0.35;
      if (tenure < 1 || r() >= p) return;
      const used = usedNames(state);
      const pool = storyNamePool(club.continent || 'EUROPE');
      let name = null;
      for (let i = 0; i < 30 && !name; i++) { const n = `${storyPick(r, pool.any)} ${storyPick(r, pool.last)}`; if (!used.has(n.split(' ').slice(1).join(' '))) name = n; }
      name = name || `${storyPick(r, pool.any)} ${storyPick(r, pool.last)}`;
      cur.to = se.age;
      const why = pos && expected && pos - expected >= 4 ? 'after a season well below expectations' : se.secondTier ? 'after relegation' : tenure >= 5 ? `after ${tenure} years in charge` : 'by mutual consent';
      list.push({ name, from: se.age + 1, prev: cur.name, why });
      ensureStory(state).cast.clubPeople[club.id].gaffer = name;
      const st = state.story;
      const before = st.aff.gaffer || 0;
      st.aff.gaffer = before > 0 ? Math.floor(before / 2) : Math.ceil(before / 2); // a fresh start, either way
      se.newManager = { name, prev: cur.name, why };
      newsPush(w, se.age, '🔄', `${club.name}: ${cur.name} leaves ${why}. ${name} is the new manager.`, 'manager', true);
      logDramaEvent(state, se.age, 'MANAGER', `🔄 NEW MANAGER (Age ${se.age}): ${name} replaces ${cur.name} at ${club.name}, ${why}.`);
    }

    /* ---------- Profile and followers ---------- */
    function profileSeason(state, w, se) {
      const club = CLUB_MAP[se.clubId];
      let d = (se.rating - 7.0) * 6 + se.trophies.length * 1.5 + (club ? (club.starRating - 3) * 0.8 : 0);
      if (se.ballonDor) d += 10; else if (se.bdRank && se.bdRank <= 10) d += (11 - se.bdRank) * 0.6;
      if (se.tournament && se.tournament.won) d += 4;
      d -= Math.max(0, w.profile - 25) * 0.085; // fame fades without fresh reasons
      if (state.currentAge >= 34) d -= 1.5;
      w.profile = Math.round(clamp(w.profile + d, 1, 100));
      const target = Math.round(Math.pow(w.profile / 100, 4) * 120000 + w.profile * 20);
      w.followersK = Math.max(Math.round(w.followersK * 0.98), Math.round(w.followersK + (target - w.followersK) * 0.6));
      w.followerHist.push({ age: se.age, k: w.followersK, profile: w.profile });
    }
    const fmtFollowers = (k) => (k >= 1000 ? `${(k / 1000).toFixed(k >= 10000 ? 0 : 1)}M` : `${Math.round(k)}K`);
    function mediaImage(w) {
      const s = w.style; const tot = s.humble + s.confident + s.private;
      if (tot < 2) return { label: 'Still finding your voice', sub: 'Do a few press conferences and the papers will decide who you are.' };
      const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
      return { humble: { label: 'The team player', sub: 'Journalists like you. Fans trust you. Sponsors call you “safe”.' }, confident: { label: 'The showman', sub: 'Great quotes, big headlines. Sponsors love it; some fans love it less.' }, private: { label: 'The quiet one', sub: 'You let your football talk. Fewer headlines, no controversies.' } }[top];
    }

    /* ---------- Sponsors (all brands are invented) ---------- */
    const SPONSOR_BRANDS = {
      boots: ['Stridewell', 'Kestrel Athletic', 'Aerowing', 'Talon Sport', 'Northpeak Boots'],
      drink: ['Fizzwell', 'Glacier Isotonic', 'Sunrun Juice'],
      watch: ['Meridian & Co.', 'Halden Watches'],
      tech: ['Lumen Audio', 'Brightline Mobile', 'Pixel Pitch (video game)'],
      car: ['Corvane Motors', 'Ostra Electric'],
      fashion: ['Marlowe Tailoring', 'Juniper Street'],
    };
    const SPONSOR_CAT = { boots: 'Boot deal', drink: 'Sports drink', watch: 'Watches', tech: 'Tech', car: 'Cars', fashion: 'Fashion' };
    const kM = (k) => (k >= 1000 ? `€${(k / 1000).toFixed(1)}M` : `€${k}K`);
    const BONUS_KIND = { goals: (k) => `${kM(k)} per goal`, apps: (k) => `${kM(k)} per game`, cs: (k) => `${kM(k)} per clean sheet`, trophy: (k) => `${kM(k)} per trophy`, ballon: (k) => `${kM(k)} for a Ballon d’Or top-3` };
    function sponsorSlots(w) { return w.profile >= 70 ? 3 : w.profile >= 45 ? 2 : w.profile >= 22 ? 1 : 0; }
    function activeSponsors(w, age) { return w.sponsors.filter((d) => age >= d.from && age < d.from + d.years); }
    function makeSponsorOffers(state, w, age) {
      const active = activeSponsors(w, age + 1);
      const slots = sponsorSlots(w);
      if (active.length >= slots) return null;
      const hasBoots = active.some((d) => d.cat === 'boots');
      const r = v11Rng(state, `spons|${age}`);
      const cat = !hasBoots ? 'boots' : storyPick(r, Object.keys(SPONSOR_BRANDS).filter((c) => c !== 'boots' && !active.some((d) => d.cat === c)));
      const scale = (cat === 'boots' ? 12 : 4) * Math.pow(w.profile / 100, 3) * (typeof sponsorStyleMult === 'function' ? sponsorStyleMult(w) : 1);
      const att = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      const brands = [...SPONSOR_BRANDS[cat]].sort(() => r() - 0.5);
      const bonusKind = att ? 'goals' : state.setup.position === 'GK' || ['CB', 'LB', 'RB'].includes(state.setup.position) ? 'cs' : 'apps';
      const im = mediaImage(w).label;
      const mk = (i, kind) => {
        const base = kind === 'safe' ? scale * (0.9 + r() * 0.2) : kind === 'perf' ? scale * (0.45 + r() * 0.1) : scale * (0.7 + r() * 0.1);
        const per = kind === 'perf' ? Math.max(1, Math.round(scale * 1000 / (att ? 18 : 30))) : Math.max(1, Math.round(scale * 1000 / (att ? 70 : 110)));
        const years = kind === 'long' ? 5 : kind === 'safe' ? 3 : 2;
        const perk = cat === 'boots' && w.profile >= 70 ? 'Your own signature boot' : cat === 'boots' && w.profile >= 45 ? 'Your name on a colourway' : kind === 'long' ? 'Rises 10% a year' : '';
        return { brand: brands[i % brands.length], cat, kind, label: kind === 'safe' ? 'The safe deal' : kind === 'perf' ? 'Bet on yourself' : 'The long one', years, baseM: Number(Math.max(0.02, base).toFixed(2)), bonus: { kind: kind === 'perf' && w.profile >= 60 ? 'ballon' : bonusKind, k: kind === 'perf' && w.profile >= 60 ? per * 40 : per }, perk, rise: kind === 'long' ? 0.1 : 0, image: im };
      };
      return { age, cat, options: [mk(0, 'safe'), mk(1, 'perf'), mk(2, 'long')] };
    }
    function acceptSponsor(state, idx) {
      const w = ensureV11(state);
      if (!w.offers) return false;
      const o = w.offers.options[idx];
      if (!o) return false;
      w.sponsors.push({ ...o, from: w.offers.age + 1 });
      w.sponsorHist.push({ age: w.offers.age, brand: o.brand, cat: o.cat, label: o.label });
      logDramaEvent(state, w.offers.age, 'SPONSOR', `🤝 SPONSOR DEAL (Age ${w.offers.age}): ${o.brand} — ${SPONSOR_CAT[o.cat].toLowerCase()}, ${o.years} years, €${o.baseM}M a year plus ${BONUS_KIND[o.bonus.kind](o.bonus.k)}.`);
      w.offers = null;
      return true;
    }
    function declineSponsors(state) { const w = ensureV11(state); if (w.offers) { w.sponsorHist.push({ age: w.offers.age, brand: null, cat: w.offers.cat, label: 'declined' }); w.offers = null; } }
    function sponsorIncome(state, se) {
      const w = state.v11;
      if (!w) return { total: 0, lines: [] };
      const lines = activeSponsors(w, se.age).map((d) => {
        const base = d.baseM * Math.pow(1 + (d.rise || 0), se.age - d.from);
        const n = d.bonus.kind === 'goals' ? se.goals : d.bonus.kind === 'apps' ? se.apps : d.bonus.kind === 'cs' ? se.cleanSheets : d.bonus.kind === 'trophy' ? se.trophies.length : (se.ballonDor || (se.bdRank && se.bdRank <= 3)) ? 1 : 0;
        const bonus = (n * d.bonus.k) / 1000;
        return { brand: d.brand, cat: d.cat, base: Number(base.toFixed(3)), bonus: Number(bonus.toFixed(3)) };
      });
      return { total: Number(lines.reduce((a, l) => a + l.base + l.bonus, 0).toFixed(3)), lines };
    }

    /* ---------- Press conferences ---------- */
    function pressDue(state, se) {
      if (DRY_RUN || isLight(state) || state.setup.mode === 'QUICK') return false;
      if (isFull(state)) return true;
      const major = se.trophies.some((t) => ['DOMESTIC_LEAGUE', 'CONTINENTAL', 'INTERNATIONAL'].includes(t.category));
      return major || se.ballonDor || (se.bdRank && se.bdRank <= 5) || se.secondTier || se.rating >= 7.9 || se.rating <= 6.3 || !!se.newManager || !!(se.injury && se.injury.weeks >= 12);
    }
    // Each answer: style, what you say, the headline it makes, and small effects (fans at your club, your profile, the manager).
    function pressQuestions(state, se) {
      const t = storyTokens(state, {});
      const club = CLUB_MAP[se.clubId] || {};
      const att = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      const stat = att ? `${se.goals} goals` : `${se.cleanSheets} clean sheets`;
      const q = [];
      const add = (id, text, answers) => q.push({ id, text, answers });
      const big = se.trophies.find((x) => x.category === 'DOMESTIC_LEAGUE' || x.category === 'CONTINENTAL' || x.category === 'INTERNATIONAL') || se.trophies[0];
      if (se.ballonDor) add('bdo', `You’ve won the Ballon d’Or. What goes through your head?`, [
        { style: 'humble', say: 'Every one of my team-mates should have a piece of it. And the people who drove me to training at six in the morning.', head: `“IT BELONGS TO ALL OF US”`, fx: { fans: 6, profile: 3 } },
        { style: 'confident', say: 'I said at sixteen I’d win this. I’m saying now I’ll win it again.', head: `“I’LL WIN IT AGAIN”`, fx: { fans: 3, profile: 6 } },
        { style: 'private', say: 'Honestly? That I’d like to go home and see my family.', head: `BALLON D’OR WINNER KEEPS IT SIMPLE`, fx: { fans: 4, profile: 2 } }]);
      if (big) add('trophy', `You’ve just won the ${big.title}. Where does this one rank?`, [
        { style: 'humble', say: 'Top of the list, because of this group. Nobody here did it alone.', head: `“NOBODY DID IT ALONE”`, fx: { fans: 5, profile: 1 } },
        { style: 'confident', say: 'It’s the first of many. This club is only getting started.', head: `“FIRST OF MANY”, PROMISES ${state.playerName.split(' ').slice(-1)[0].toUpperCase()}`, fx: { fans: 4, profile: 4 } },
        { style: 'private', say: 'Ask me after the parade. Right now I just want to enjoy it.', head: `PARTY FIRST, RANKINGS LATER`, fx: { fans: 3, profile: 1 } }]);
      if (se.secondTier) add('releg', `${club.name || 'The club'} have gone down. Will you be here next season?`, [
        { style: 'humble', say: 'I was part of this, so I want to be part of fixing it.', head: `“I’LL HELP FIX THIS”`, fx: { fans: 8, profile: 0 } },
        { style: 'confident', say: 'My agent and the club will talk. I want to play at the top level.', head: `STAR KEEPS OPTIONS OPEN`, fx: { fans: -5, profile: 2 } },
        { style: 'private', say: 'Today isn’t the day for that. Today is for the fans who travelled.', head: `“TODAY IS FOR THE FANS”`, fx: { fans: 3, profile: 0 } }]);
      if (se.newManager) add('mgr', `${se.newManager.name} is the new manager. Have you spoken yet?`, [
        { style: 'humble', say: `Briefly. Everyone starts from zero now, me included. I’ll earn my place.`, head: `“EVERYONE STARTS FROM ZERO”`, fx: { fans: 2, gaffer: 1 } },
        { style: 'confident', say: 'He knows what I bring. I expect to be at the centre of his plans.', head: `“I EXPECT TO PLAY”`, fx: { profile: 2 } },
        { style: 'private', say: `That conversation stays between us. And thanks to ${se.newManager.prev}, for everything.`, head: `CLASSY TRIBUTE TO DEPARTED BOSS`, fx: { fans: 3 } }]);
      if (se.injury && se.injury.weeks >= 8) add('inj', `You missed ${se.injury.weeks} weeks with a ${se.injury.name.toLowerCase()}. How is it now?`, [
        { style: 'humble', say: 'Better every day. The medical team were brilliant. I owe them.', head: `“I OWE THE MEDICAL TEAM”`, fx: { fans: 2 } },
        { style: 'confident', say: 'Stronger than before. Next season you’ll see.', head: `“STRONGER THAN BEFORE”`, fx: { profile: 2 } },
        { style: 'private', say: `The ${se.injury.part} is fine. That’s all there is to say.`, head: `NO DRAMA, NO SETBACKS`, fx: {} }]);
      if (se.bdRank && se.bdRank <= 10 && !se.ballonDor) add('bdorank', `Top ${se.bdRank <= 3 ? 3 : 10} in the Ballon d’Or voting. Can you win it?`, [
        { style: 'humble', say: 'Individual awards come from team success. If we win, the rest follows.', head: `TEAM FIRST, SAYS BALLON D’OR CONTENDER`, fx: { fans: 3 } },
        { style: 'confident', say: 'Yes. And not in five years. Soon.', head: `“NOT IN FIVE YEARS. SOON.”`, fx: { profile: 5 } },
        { style: 'private', say: 'I don’t think about it until December.', head: `CONTENDER PLAYS IT COOL`, fx: { profile: 1 } }]);
      const prevSe = (state.seasonLog || [])[(state.seasonLog || []).indexOf(se) - 1];
      if (prevSe && prevSe.clubId !== se.clubId && !se.onLoan) add('newclub', `Your first season at ${club.name || 'the club'} is done. Has it been what you hoped?`, [
        { style: 'humble', say: 'The dressing room made it easy. I’m still learning how this club works.', head: `“STILL LEARNING THIS CLUB”`, fx: { fans: 4 } },
        { style: 'confident', say: 'Better. And I haven’t shown them everything yet.', head: `“THEY HAVEN’T SEEN EVERYTHING”`, fx: { profile: 3 } },
        { style: 'private', say: 'Ask me again in a year. Settling in takes longer than people think.', head: `SETTLING IN TAKES TIME`, fx: {} }]);
      if (se.onLoan) add('loan', `You spent the season on loan at ${se.loanClubName}. What did you take from it?`, [
        { style: 'humble', say: 'Games every week. I’m grateful to them for trusting a young player.', head: `“GRATEFUL FOR THE TRUST”`, fx: { fans: 2 } },
        { style: 'confident', say: 'That I’m ready. My parent club should know that now.', head: `LOAN STAR: “I’M READY”`, fx: { profile: 3 } },
        { style: 'private', say: 'A lot of football and a lot of bus journeys. Both were good for me.', head: `MILES ON THE CLOCK, LESSONS LEARNED`, fx: {} }]);
      if (se.tournament && se.tournament.calledUp) add('intl', se.tournament.won ? `You won the ${se.tournament.title} with ${getNation(state).name}. How does that compare to club trophies?` : `You played at the ${se.tournament.title} for ${getNation(state).name}. What did it mean?`, [
        { style: 'humble', say: 'Wearing that shirt is for everyone back home. I never take it for granted.', head: `“IT’S FOR EVERYONE BACK HOME”`, fx: { fans: 3, profile: 2 } },
        { style: 'confident', say: se.tournament.won ? 'Nothing compares. And I want another one.' : 'It meant we’re close. Next time we go further.', head: se.tournament.won ? `“I WANT ANOTHER ONE”` : `“NEXT TIME WE GO FURTHER”`, fx: { profile: 4 } },
        { style: 'private', say: 'Some things you keep for yourself. That tournament is one of them.', head: `SOME MEMORIES STAY PRIVATE`, fx: { profile: 1 } }]);
      if (state.isCaptain && !se.onLoan) add('captain', 'You wear the armband now. Has it changed you?', [
        { style: 'humble', say: 'It means I speak last and listen first. The young lads need that.', head: `“LISTEN FIRST, SPEAK LAST”`, fx: { fans: 4, gaffer: 1 } },
        { style: 'confident', say: 'I was already a leader. Now it’s official.', head: `“NOW IT’S OFFICIAL”`, fx: { profile: 3 } },
        { style: 'private', say: 'That’s for the dressing room to judge, not me.', head: `CAPTAIN LETS DRESSING ROOM DECIDE`, fx: { fans: 2 } }]);
      if (se.rating >= 7.6 && !big) add('great', `${stat} and a ${se.rating.toFixed(2)} average. Your best season?`, [
        { style: 'humble', say: 'The numbers are nice, but the lads made most of them possible.', head: `“THE LADS MADE IT POSSIBLE”`, fx: { fans: 4 } },
        { style: 'confident', say: 'So far. I’ve got better seasons in me.', head: `“BETTER SEASONS TO COME”`, fx: { profile: 4 } },
        { style: 'private', say: 'I’ll look at the numbers when I retire.', head: `NUMBERS CAN WAIT`, fx: { profile: 1 } }]);
      if (se.rating <= 6.4) add('poor', 'A difficult season for you. What happened?', [
        { style: 'humble', say: 'I wasn’t at my level. I take responsibility, and I’ll fix it in pre-season.', head: `“I’LL FIX IT”: HONEST ${state.playerName.split(' ').slice(-1)[0].toUpperCase()}`, fx: { fans: 5, gaffer: 1 } },
        { style: 'confident', say: 'Every player has a season like this. Watch the next one.', head: `“WATCH THE NEXT ONE”`, fx: { fans: -1, profile: 2 } },
        { style: 'private', say: 'We’ll talk about it inside the dressing room.', head: `HARD SEASON, QUIET RESPONSE`, fx: {} }]);
      if (state.contractYearsRemaining <= 1 && state.marketValueM >= 15 && !se.secondTier && !se.onLoan) add('rumour', `Your contract is running down and big clubs are watching. Are you staying?`, [
        { style: 'humble', say: `I’m happy here. My agent and ${club.name || 'the club'} will sort it out.`, head: `“I’M HAPPY HERE”`, fx: { fans: 5 } },
        { style: 'confident', say: 'I want to win the biggest trophies. We’ll see where that is.', head: `STAR HINTS AT BIG MOVE`, fx: { fans: -4, profile: 4 } },
        { style: 'private', say: 'No comment. And that’s not a yes or a no.', head: `“NOT A YES OR A NO”`, fx: { profile: 2 } }]);
      if (se.rival && se.rival.rating >= se.rating - 0.15 && se.rival.rating >= 7.2) add('rival', `${se.rival.name} had a big season too. Who’s better?`, [
        { style: 'humble', say: `${se.rival.name.split(' ')[0]} pushes me. We came through together; I’m glad we’re both here.`, head: `RIVALS WITH RESPECT`, fx: { fans: 2 } },
        { style: 'confident', say: 'Count the trophies at the end.', head: `“COUNT THE TROPHIES”`, fx: { profile: 4 } },
        { style: 'private', say: 'I only compare myself to last season’s me.', head: `NO WAR OF WORDS`, fx: {} }]);
      if (state.currentAge <= 20) add('young', 'Everyone’s talking about you. How do you handle the attention?', [
        { style: 'humble', say: `I listen to ${t.coach} and my family. Nothing else changes.`, head: `GROUNDED TEENAGER`, fx: { fans: 3 } },
        { style: 'confident', say: 'I enjoy it. Pressure means people expect something.', head: `“PRESSURE? I ENJOY IT”`, fx: { profile: 3 } },
        { style: 'private', say: 'I turned my phone off for most of the season.', head: `PHONE OFF, HEAD DOWN`, fx: { profile: -1 } }]);
      if (state.currentAge >= 33) add('veteran', 'How long will you keep going?', [
        { style: 'humble', say: 'While I can still help the younger players and the team, I’ll be here.', head: `STILL HELPING, STILL HUNGRY`, fx: { fans: 4 } },
        { style: 'confident', say: 'My body will tell me. So far it’s saying “one more”.', head: `“ONE MORE”`, fx: { profile: 2 } },
        { style: 'private', say: 'One season at a time. That’s all I’ve ever done.', head: `ONE SEASON AT A TIME`, fx: {} }]);
      add('next', `What’s the target for next season?`, [
        { style: 'humble', say: 'Help the team as much as I can. The rest will follow.', head: `TEAM COMES FIRST`, fx: { fans: 2 } },
        { style: 'confident', say: att ? `More goals than this season. That’s the minimum.` : 'More clean sheets and a trophy. That’s the minimum.', head: `“THAT’S THE MINIMUM”`, fx: { profile: 3 } },
        { style: 'private', say: 'I keep my targets in a notebook, not in the papers.', head: `TARGETS STAY PRIVATE`, fx: {} }]);
      // v12: no question comes back too soon, and the generic one is a last resort.
      const w = ensureV11(state);
      const COOL = { rival: 4, next: 3, young: 3, veteran: 3, captain: 5, rumour: 2, great: 2, poor: 2, bdorank: 2, intl: 2, inj: 2 };
      const recent = (id) => w.press.some((p) => p.q === id && p.age !== se.age && se.age - p.age < (COOL[id] || 0));
      const fresh = q.filter((x) => !recent(x.id));
      const specific = fresh.filter((x) => x.id !== 'next');
      let pool = specific.length >= 2 ? specific : fresh;
      if (!pool.length) { // everything was asked recently: take the one asked longest ago
        const lastAsked = (id) => Math.max(-1, ...w.press.filter((p) => p.q === id && p.age !== se.age).map((p) => p.age));
        pool = [q.slice().sort((a, b) => lastAsked(a.id) - lastAsked(b.id))[0]];
      }
      const r = v11Rng(state, `press|${se.age}`);
      const first = pool[0];
      const rest = pool.slice(1).sort(() => r() - 0.5);
      return [first, rest[0]].filter(Boolean);
    }
    function applyPressAnswer(state, se, q, idx) {
      const w = ensureV11(state);
      if (w.press.some((p) => p.age === se.age && p.q === q.id)) return null;
      const a = q.answers[idx];
      const fx = a.fx || {};
      if (fx.fans) adjustMood(state, state.currentClubId, fx.fans);
      if (fx.profile) w.profile = Math.round(clamp(w.profile + fx.profile, 1, 100));
      if (fx.gaffer && state.story) state.story.aff.gaffer = clamp((state.story.aff.gaffer || 0) + fx.gaffer, -3, 3);
      w.style[a.style] += 1;
      const entry = { age: se.age, q: q.id, question: q.text, say: a.say, head: a.head, style: a.style, journo: ensureStory(state).cast.journo };
      w.press.push(entry);
      if (typeof v13PressAftermath === 'function') v13PressAftermath(state, se, q, a);
      logDramaEvent(state, se.age, 'PRESS', `🎙️ PRESS (Age ${se.age}): ${a.head.replace(/“|”/g, '"')}`);
      return entry;
    }

    /* ---------- Hooks ---------- */
    function v11SeasonHook(state, se) {
      if (DRY_RUN || !se) return;
      const w = ensureV11(state);
      if (w.seasonsDone.includes(se.age)) return;
      w.seasonsDone.push(se.age);
      // Unanswered sponsor offers from last summer: your agent takes the safe one.
      if (w.offers && w.offers.age < se.age) { const o = w.offers; acceptSponsor(state, 0); w.sponsorHist[w.sponsorHist.length - 1].auto = true; se.v11notes = [`Your agent signed the ${o.options[0].brand} deal while you were busy.`]; }
      se.sponsor = sponsorIncome(state, se);
      if (typeof v13CheckPromises === 'function') { const pn = v13CheckPromises(state, se); if (pn.length) se.v11notes = [...(se.v11notes || []), ...pn]; }
      worldSeason(state, se);
      profileSeason(state, w, se);
      const offers = makeSponsorOffers(state, w, se.age);
      if (offers) {
        w.offers = offers;
        (se.v11notes = se.v11notes || []).push(`${offers.options.map((o) => o.brand).join(', ')} want you for a ${SPONSOR_CAT[offers.cat].toLowerCase()} deal. Choose on the Media page.`);
        if (state.setup.mode === 'QUICK') acceptSponsor(state, 0);
      }
    }
    function v11WindowHook(state, info) {
      if (DRY_RUN) return;
      const w = ensureV11(state);
      if (typeof v13WindowStance === 'function') v13WindowStance(state, info);
      // A humble press image earns a warmer welcome at a new club.
      if (info.kind === 'TRANSFER' && typeof pressStyleShares === 'function') { const sh = pressStyleShares(w); if (sh.humble) adjustMood(state, info.clubId, Math.round(5 * sh.humble)); }
      if (info.kind === 'TRANSFER' && info.fee > w.record.feeM) {
        w.record = { feeM: info.fee, name: state.playerName, age: state.currentAge, from: (CLUB_MAP[info.prevClubId] || {}).name, to: (CLUB_MAP[info.clubId] || {}).name, you: true };
        newsPush(w, state.currentAge, '💥', `World record: you join ${w.record.to} for €${info.fee}M.`, 'record', true);
      }
    }
    if (typeof EVENT_META !== 'undefined') Object.assign(EVENT_META, {
      MANAGER: { icon: '🔄', cls: 'info', cat: 'Club news', color: '#8b93a1' },
      SPONSOR: { icon: '🤝', cls: 'good', cat: 'Sponsor', color: '#16c784' },
      PRESS: { icon: '🎙️', cls: 'info', cat: 'Press', color: '#a78bfa' },
    });
