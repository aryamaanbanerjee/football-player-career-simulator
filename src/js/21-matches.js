    /* ==========================================================================
     * v9 · MATCH BY MATCH
     *   Every season becomes a real fixture list: the league (double round robin,
     *   or single for 22+ team leagues), the domestic cup, a league cup when needed
     *   and the continental competition. Results come from a simple strength model
     *   on their own hash-seeded random numbers, and are fitted to what the season
     *   engine already decided (title, relegation, promotion, cup wins, your apps,
     *   goals, assists, clean sheets and average rating). The engine stays the
     *   authority, so balance and projections are unchanged.
     *
     *   Also here: invented squads for every club (named rivals for your place,
     *   January signings, team-mates' injuries), the winter break with the January
     *   window and a meeting with the manager, and the Matches page.
     * ========================================================================== */
    const MX_CACHE = new Map();
    const MX_CACHE_MAX = 120; // about five long careers; anything evicted is simply rebuilt if needed
    const mxRng = (state, salt) => storyRng(state, `mx|${salt}`);
    const MX_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const WINTER_AT = 0.47; // share of the season played before the January break
    function poissonInv(lambda, u) { let k = 0; let p = Math.exp(-lambda); let c = p; while (u > c && k < 9) { k++; p *= lambda / k; c += p; } return k; }
    const TIER2_NAMES = {
      EUROPE: ['Harrowgate Town', 'Kestrel Vale', 'Northbridge', 'Ashcombe Rovers', 'Port Elden', 'Millhaven', 'Stonecross', 'Wexley United', 'Brackenford', 'Calderbrook', 'Fenwick Athletic', 'Greyhaven', 'Linmouth', 'Oakhurst', 'Redwater', 'Saltmarsh City', 'Tarnworth', 'Upton Vale', 'Westerby', 'Yarrowfield'],
      SOUTH_AMERICA: ['Atlético Serrano', 'Club Vila Serena', 'Deportivo Arenal', 'Independiente Norte', 'Real Cordillera', 'Sportivo Lagoa', 'Unión Pampa', 'Atlético Ribeira', 'Club Bahía Clara', 'Deportivo Sierra', 'Esporte Clube Vale', 'Juventud Austral', 'Racing Litoral', 'San Martín del Valle', 'Sociedade Morro Alto', 'Talleres Sur', 'Tigres de Altura', 'Unión Ribereña', 'Vila Nova do Campo', 'Club Puerto Lindo'],
      ASIA: ['Sakura Valley FC', 'Kaito Bay', 'Riverside Hoshi', 'Golden Crane FC', 'Jade Harbour', 'North Peak United', 'Lotus City', 'Blue Lantern FC', 'Cedar Coast', 'Falcon Ridge', 'Hanami Rovers', 'Mount Kiri FC', 'Pearl River Athletic', 'Red Maple FC', 'Silk Road United', 'Sunrise Port', 'Tiger Hill', 'Twin Bridges', 'White Heron FC', 'Yellow Sea Club'],
      AFRICA: ['Baobab FC', 'Atlas Rangers', 'Lake Shore United', 'Savanna Stars', 'Kilima City', 'Copper Valley', 'Desert Eagles', 'Golden Coast FC', 'Highveld Rovers', 'Ivory Bay', 'Jacaranda United', 'Kalahari FC', 'Lion Rock', 'Mango Grove', 'Nile Delta Club', 'Oasis Athletic', 'Palm Harbour', 'Red Earth FC', 'Sunset Valley', 'Tamarind City'],
      NORTH_AMERICA: ['Cedar Falls FC', 'Pine Harbor', 'Red Canyon United', 'Silver Lake', 'Bayview Athletic', 'Copper Springs', 'Eagle Pass FC', 'Grand Prairie', 'Harbor City', 'Iron Valley', 'Juniper Ridge', 'Lakeside SC', 'Maple Grove FC', 'North Shore', 'Oak Hollow', 'Prairie Wind', 'Riverbend FC', 'Sierra Vista', 'Timber Creek', 'Westport SC'],
    };
    const FORMATIONS = {
      '4-3-3': { GK: 1, CB: 2, FB: 2, DM: 1, CM: 2, AM: 0, W: 2, ST: 1 },
      '4-2-3-1': { GK: 1, CB: 2, FB: 2, DM: 2, CM: 0, AM: 1, W: 2, ST: 1 },
      '4-4-2': { GK: 1, CB: 2, FB: 2, DM: 0, CM: 2, AM: 0, W: 2, ST: 2 },
      '3-5-2': { GK: 1, CB: 3, FB: 2, DM: 1, CM: 2, AM: 0, W: 0, ST: 2 },
      '4-3-1-2': { GK: 1, CB: 2, FB: 2, DM: 1, CM: 2, AM: 1, W: 0, ST: 2 },
    };
    const POS_GROUP = { GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', CDM: 'DM', CM: 'CM', CAM: 'AM', LW: 'W', RW: 'W', ST: 'ST' };
    const GROUP_WORD = { GK: 'goalkeeper', CB: 'centre-back', FB: 'full-back', DM: 'holding midfielder', CM: 'midfielder', AM: 'playmaker', W: 'winger', ST: 'striker' };
    const GROUP_SIZE = { GK: 3, CB: 4, FB: 4, DM: 2, CM: 4, AM: 2, W: 4, ST: 3 };
    const START_SHARE = { STAR: 0.95, KEY_PLAYER: 0.86, ROTATION: 0.55, PROSPECT: 0.35 };
    const isDefStat = (state) => ['DEFENSE', 'GK'].includes(POSITION_PROFILES[state.setup.position].primaryStatType);

    /* ---------- The plan: what the engine decided, plus the inputs needed to redraw the season later ---------- */
    function seasonFormation(state, clubKey, age) {
      const keys = Object.keys(FORMATIONS);
      const r = mxRng(state, `form|${clubKey}|${Math.floor((age - 17) / 3)}`); // managers keep a shape for a few seasons
      return keys[Math.floor(r() * keys.length) % keys.length];
    }
    function buildSeasonPlan(state, se) {
      if (DRY_RUN || !se) return null;
      if (se.mx) return se.mx;
      const r = mxRng(state, `plan|${se.age}`);
      const parent = CLUB_MAP[se.clubId];
      const loanClub = se.onLoan ? CLUBS.find((c) => c.name === se.loanClubName) || null : null;
      const playClub = se.onLoan ? loanClub : parent;
      const has = (t) => (se.events || []).some((e) => e.type === t);
      const won = (cat) => se.trophies.some((t) => t.category === cat);
      const plan = { v: 1, onLoan: !!se.onLoan, playClubId: playClub ? playClub.id : null, playClubName: se.onLoan ? se.loanClubName : parent.name, base: { apps: se.apps, goals: se.goals, assists: se.assists, cs: se.cleanSheets, rating: se.rating } };
      if (playClub) {
        const tier2 = !se.onLoan && !!se.secondTier;
        let teams; let name; let hasRel = (LEAGUES[playClub.league] || {}).hasRelegation;
        if (tier2) {
          name = SECOND_TIERS[parent.league] || `${parent.league} second tier`;
          const pool = [...(TIER2_NAMES[parent.continent] || TIER2_NAMES.EUROPE)];
          const n = Math.min(20, Math.max(16, CLUBS.filter((c) => c.league === parent.league).length));
          teams = [[parent.id, 2.6]];
          for (let i = 0; i < n - 1; i++) teams.push([`x:${pool.splice(Math.floor(r() * pool.length), 1)[0]}`, Number((1.3 + r() * 1.4).toFixed(2))]);
          hasRel = true;
        } else {
          name = playClub.league;
          teams = CLUBS.filter((c) => c.league === playClub.league).map((c) => [c.id, c.starRating]);
        }
        const n = teams.length;
        const sorted = [...teams].sort((a, b) => b[1] - a[1] || hashStr(String(a[0])) - hashStr(String(b[0])));
        const expected = sorted.findIndex((t) => t[0] === playClub.id) + 1;
        let target;
        if (tier2) target = won('SECOND_TIER') ? 1 : has('PROMOTED') ? 2 + Math.floor(r() * 2) : clamp(4 + Math.floor(r() * 10), 4, n - 3);
        else if (!se.onLoan && won('DOMESTIC_LEAGUE')) target = 1;
        else if (!se.onLoan && has('RELEGATED')) target = n - Math.floor(r() * 3);
        else target = clamp(expected + Math.round((r() - 0.5) * 6), 2, hasRel ? n - 3 : n);
        plan.lg = { name, tier: tier2 ? 2 : 1, teams, target, us: playClub.id, rr: n <= 12 ? 3 : n <= 20 ? 2 : 1.5 };
        // Defenders and keepers: make the team's defence match the clean sheets the engine gave you.
        if (isDefStat(state) && se.apps > 0) { const p = clamp((se.cleanSheets / se.apps) * 0.95, 0.06, 0.75); plan.lg.def = Number(clamp(-Math.log(p) / 1.2, 0.35, 1.6).toFixed(3)); }
      }
      if (se.onLoan && loanClub) plan.cup = { name: (LEAGUES[loanClub.league] || {}).domesticCup || 'Domestic Cup', won: false, exit: Math.floor(r() * 3) };
      if (!se.onLoan) {
        const lm = LEAGUES[parent.league] || { domesticCup: 'Domestic Cup' };
        const cupWon = won('DOMESTIC_CUP');
        plan.cup = { name: lm.domesticCup, won: cupWon, exit: cupWon ? 99 : Math.floor(r() * (parent.starRating >= 4 ? 5 : 4)) };
        const contWon = won('CONTINENTAL');
        const contName = (CONTINENTS[parent.continent] || {}).clubContinentalCup || 'Continental Cup';
        if (!se.secondTier && (contWon || parent.starRating >= 4 || (parent.starRating === 3 && r() < 0.45))) {
          const exit = contWon ? 99 : parent.starRating >= 5 ? 1 + Math.floor(r() * 4) : parent.starRating === 4 ? Math.floor(r() * 4) : Math.floor(r() * 2);
          plan.cont = { name: contName, won: contWon, exit }; // 0 = out in the league phase, 1 = last 16, 2 = quarters, 3 = semis, 4 = final
        }
      }
      // Make sure the season has enough real fixtures for the games the engine gave you.
      const need = se.apps + 3;
      let count = 0;
      if (plan.lg) {
        const n = plan.lg.teams.length; const b = n % 2 ? n : n - 1;
        count += plan.lg.rr >= 3 ? 3 * b : plan.lg.rr >= 2 ? 2 * b : b + Math.floor(n / 2);
        if (n <= 16) { plan.lg.po = true; count += 10; } // smaller leagues finish with a championship or relegation round
      }
      if (plan.cont) count += 8 + (plan.cont.won ? 4 : plan.cont.exit >= 1 ? Math.min(4, plan.cont.exit) : 0);
      if (plan.cup) {
        count += plan.cup.won ? 5 : plan.cup.exit + 1;
        let short = need - count - 7;
        plan.cup.early = clamp(short, 0, 2); count += plan.cup.early; short -= plan.cup.early;
        if (!plan.cup.won && short > 0) { const ext = Math.min(4 - plan.cup.exit, short); plan.cup.exit += ext; count += ext; }
      }
      plan.lc = clamp(need - count, 0, 7);
      plan.formation = seasonFormation(state, plan.playClubId || 'none', se.age);
      const role = se.role || state.squadRole;
      const g = POS_GROUP[state.setup.position];
      const club = CLUB_MAP[se.clubId];
      const maxGames = club.starRating >= 4 ? 50 : club.starRating === 3 ? 44 : 38;
      plan.signing = !se.onLoan && (role === 'ROTATION' || role === 'PROSPECT') && se.apps < maxGames * 0.55 && r() < 0.45;
      plan.injuryOpen = !se.onLoan && !plan.signing && (role === 'ROTATION' || role === 'PROSPECT') && se.apps > maxGames * ((SQUAD_ROLES[role] || {}).appRate + 0.1);
      plan.outOfPos = !se.onLoan && FORMATIONS[plan.formation][g] === 0;
      se.mx = plan;
      return plan;
    }

    /* ---------- League simulation ---------- */
    function roundRobin(n) {
      const ids = [...Array(n).keys()];
      if (n % 2) ids.push(-1);
      const m = ids.length; const rounds = [];
      for (let r = 0; r < m - 1; r++) {
        const md = [];
        for (let i = 0; i < m / 2; i++) { const a = ids[i]; const b = ids[m - 1 - i]; if (a >= 0 && b >= 0) md.push(r % 2 ? [b, a] : [a, b]); }
        rounds.push(md);
        ids.splice(1, 0, ids.pop());
      }
      return rounds;
    }
    function teamObj(key) {
      if (String(key).startsWith('x:')) return { id: key, name: key.slice(2), invented: true };
      const c = CLUB_MAP[key]; return c ? { id: c.id, name: c.name } : { id: String(key), name: String(key) };
    }
    function playLeague(state, lg, salt, offset) {
      const n = lg.teams.length;
      const r = mxRng(state, `lgstr|${salt}`);
      const str = lg.teams.map((t) => t[1] + (r() - 0.5) * 0.8);
      const usIdx = lg.teams.findIndex((t) => t[0] === lg.us);
      if (usIdx >= 0) str[usIdx] += offset;
      const base = roundRobin(n);
      const mirror = base.map((md) => md.map(([a, b]) => [b, a]));
      const rr = lg.rr || (lg.double ? 2 : 1);
      let rounds = rr >= 2 ? [...base, ...mirror] : [...base, ...(rr > 1 ? mirror.slice(0, Math.floor(n / 2)) : [])];
      if (rr >= 3) rounds = [...rounds, ...base];
      const ru = mxRng(state, `lgu|${salt}`);
      const res = rounds.map((md) => md.map(([h, a]) => {
        let lh = clamp(1.32 * Math.exp(0.3 * (str[h] - str[a])), 0.3, 3.1); let la = clamp(1.08 * Math.exp(0.3 * (str[a] - str[h])), 0.25, 2.8);
        if (lg.def) { if (h === usIdx) la *= lg.def; if (a === usIdx) lh *= lg.def; }
        return { h, a, gh: poissonInv(lh, ru()), ga: poissonInv(la, ru()) };
      }));
      return res;
    }
    function leagueTable(lg, res, upto = Infinity) {
      const rows = lg.teams.map((t, i) => ({ i, key: t[0], p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }));
      res.forEach((md, k) => { if (k >= upto) return; md.forEach((m) => {
        const H = rows[m.h]; const A = rows[m.a];
        H.p++; A.p++; H.gf += m.gh; H.ga += m.ga; A.gf += m.ga; A.ga += m.gh;
        if (m.gh > m.ga) { H.w++; A.l++; H.pts += 3; H.form.push('W'); A.form.push('L'); } else if (m.gh < m.ga) { A.w++; H.l++; A.pts += 3; H.form.push('L'); A.form.push('W'); } else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('D'); A.form.push('D'); }
      }); });
      return rows.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.i - y.i);
    }
    function fitLeague(state, lg, salt) {
      const pos = (off) => leagueTable(lg, playLeague(state, lg, salt, off)).findIndex((r) => r.key === lg.us) + 1;
      let lo = -2.5; let hi = 3.5; let best = 0; let bestErr = 99;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2; const p = pos(mid);
        const err = Math.abs(p - lg.target);
        if (err < bestErr || (err === bestErr && Math.abs(mid) < Math.abs(best))) { bestErr = err; best = mid; }
        if (p === lg.target) break;
        if (p > lg.target) lo = mid; else hi = mid;
      }
      for (let k = 0; k < 30 && lg.target === 1 && pos(best) !== 1; k++) best += 0.25;
      for (let k = 0; k < 30 && lg.target > lg.teams.length - 3 && pos(best) <= lg.teams.length - 3; k++) best -= 0.25;
      for (let k = 0; k < 40 && lg.target !== 1 && pos(best) === 1; k++) best -= 0.25; // only champions finish first
      return playLeague(state, lg, salt, best);
    }

    /* ---------- Knockouts and the continental league phase ---------- */
    function forcedScore(r, win, draw) {
      if (draw) { const g = Math.floor(r() * 3); return [g, g]; }
      const a = 1 + Math.floor(r() * 3); const b = Math.floor(r() * a);
      return win ? [a, b] : [b, a];
    }
    const CUP_ROUNDS = ['Third round', 'Fourth round', 'Quarter-final', 'Semi-final', 'Final'];
    const CONT_ROUNDS = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

    /* ---------- Squads: invented players with careers of their own ---------- */
    const SQUAD_CACHE = new Map();
    function clubArcs(state, clubId) {
      const key = `${state.setup.seed}|${clubId}`;
      if (SQUAD_CACHE.has(key)) return SQUAD_CACHE.get(key);
      const club = CLUB_MAP[clubId] || { continent: state.setup.continent };
      const r = mxRng(state, `arcs|${clubId}`);
      const home = storyNamePool(club.continent || 'EUROPE');
      const conts = Object.keys(NAME_POOLS);
      const natFor = (cont) => { const list = NATIONS[cont] || []; return list.length ? storyPick(r, list).id : ''; };
      const arcs = [];
      const usedNames = new Set([state.playerName]);
      const mk = (group, joinAge) => {
        const foreign = r() < 0.27;
        const cont = foreign ? storyPick(r, conts) : (club.continent || 'EUROPE');
        const pool = foreign ? storyNamePool(cont) : home;
        let name = `${storyPick(r, pool.male)} ${storyPick(r, pool.last)}`;
        for (let i = 0; i < 6 && usedNames.has(name); i++) name = `${storyPick(r, pool.male)} ${storyPick(r, pool.last)}`;
        usedNames.add(name);
        const ageAtJoin = 17 + Math.floor(r() * 14);
        const stay = 1 + Math.floor(r() * 6);
        arcs.push({ name, group, nat: natFor(cont), born: joinAge - ageAtJoin, join: joinAge, leave: joinAge + stay, q: (r() - 0.5) * 2.4 });
      };
      for (let age = 17; age <= 46; age++) {
        Object.entries(GROUP_SIZE).forEach(([g, need]) => {
          const active = arcs.filter((a) => a.group === g && a.join <= age && a.leave > age).length;
          for (let k = active; k < need; k++) mk(g, age);
        });
      }
      SQUAD_CACHE.set(key, arcs);
      return arcs;
    }
    function playerOverallAt(state, age) {
      const h = state.attrHistory || [];
      let best = h[0];
      h.forEach((x) => { if (x.age <= age) best = x; });
      return best ? best.overall : overallRating(state.setup.position, state.attributes);
    }
    function clubSquadAt(state, clubId, age, stars, plan) {
      const arcs = clubArcs(state, clubId);
      const base = { 1: 9.4, 2: 10.9, 3: 12.4, 4: 13.9, 5: 15.3 }[clamp(Math.round(stars || 3), 1, 5)];
      const curve = (a) => (a < 24 ? -(24 - a) * 0.28 : a <= 30 ? 0 : -(a - 30) * 0.35);
      const list = arcs.filter((a) => a.join <= age && a.leave > age).map((a) => ({ ...a, age: age - a.born, ovr: Number((base + a.q + curve(age - a.born)).toFixed(1)) }));
      const mine = state.currentClubId === clubId || (plan && plan.playClubId === clubId);
      if (plan && plan.signing && mine) {
        const r = mxRng(state, `signing|${clubId}|${age}`);
        const g = POS_GROUP[state.setup.position];
        const pool = storyNamePool(CLUB_MAP[clubId] ? CLUB_MAP[clubId].continent : 'EUROPE');
        list.push({ name: `${storyPick(r, pool.male)} ${storyPick(r, pool.last)}`, group: g, nat: '', age: 22 + Math.floor(r() * 6), ovr: 0, january: true, fee: Math.round((stars || 3) * (6 + r() * 9)) });
      }
      return list;
    }
    /* Names the players around you, consistent with the role the engine gave you. */
    function squadContext(state, se) {
      const plan = se.mx || buildSeasonPlan(state, se);
      if (!plan || !plan.playClubId) return null;
      const stars = plan.lg ? (plan.lg.teams.find((t) => t[0] === plan.playClubId) || [0, 3])[1] : 3;
      const squad = clubSquadAt(state, plan.playClubId, se.age, stars, plan);
      const g = POS_GROUP[state.setup.position];
      const you = playerOverallAt(state, se.age);
      const role = se.onLoan ? 'KEY_PLAYER' : se.role || state.squadRole;
      const slots = Math.max(1, FORMATIONS[plan.formation][g] || 1);
      const ahead = role === 'STAR' || role === 'KEY_PLAYER' ? 0 : role === 'ROTATION' ? slots : slots + 1;
      const comp = squad.filter((p) => p.group === g && !p.january).sort((a, b) => b.ovr - a.ovr);
      comp.forEach((p, i) => { p.ovr = i < ahead ? Number(Math.max(p.ovr, you + 0.4 + (ahead - i) * 0.3).toFixed(1)) : Number(Math.min(p.ovr, you - 0.3 - i * 0.2).toFixed(1)); p.ahead = i < ahead; });
      const sig = squad.find((p) => p.january);
      if (sig) { sig.ovr = Number((you + 0.8).toFixed(1)); sig.ahead = true; }
      const others = squad.filter((p) => p.group !== g);
      const nat = state.setup.nation;
      const friend = [...others].sort((a, b) => (b.nat === nat) - (a.nat === nat) || Math.abs(a.age - se.age) - Math.abs(b.age - se.age))[0];
      const veteran = [...squad].filter((p) => !p.january).sort((a, b) => b.age - a.age)[0];
      const placeRival = sig || comp.find((p) => p.ahead) || comp[0];
      const injured = plan.injuryOpen ? comp.find((p) => p.ahead) || comp[0] : null;
      return { plan, squad, you, role, comp, sig, friend, veteran, placeRival, injured, group: g, formation: plan.formation };
    }

    /* ---------- The full season, match by match ---------- */
    function seasonMatches(state, se) {
      const plan = se.mx || buildSeasonPlan(state, se);
      if (!plan) return null;
      const jan = se.jan || null;
      const key = `${state.setup.seed}|${se.age}|${jan ? jan.sig : '-'}`;
      if (MX_CACHE.has(key)) return MX_CACHE.get(key);
      const r = mxRng(state, `fx|${se.age}`);
      const fixtures = [];
      let lgRes = null;
      const usKey = plan.playClubId;
      if (plan.lg) {
        lgRes = fitLeague(state, plan.lg, `${se.age}`);
        const L = lgRes.length;
        lgRes.forEach((md, k) => md.forEach((m) => {
          const usH = plan.lg.teams[m.h][0] === usKey; const usA = plan.lg.teams[m.a][0] === usKey;
          if (!usH && !usA) return;
          const opp = teamObj(plan.lg.teams[usH ? m.a : m.h][0]);
          fixtures.push({ comp: 'L', compName: plan.lg.name, round: `Matchday ${k + 1}`, md: k + 1, t: ((k + 0.5) / L) * (plan.lg.po ? 0.8 : 1), home: usH, opp, oppStars: plan.lg.teams[usH ? m.a : m.h][1], gf: usH ? m.gh : m.ga, ga: usH ? m.ga : m.gh, ref: m });
        }));
        if (plan.lg.po) {
          const tbl = leagueTable(plan.lg, lgRes);
          const n = tbl.length; const pos = tbl.findIndex((x) => x.key === usKey);
          const top = pos < n / 2;
          const group = (top ? tbl.slice(0, Math.min(6, n)) : tbl.slice(Math.max(0, n - 6))).filter((x) => x.key !== usKey).slice(0, 5);
          const rp = mxRng(state, `po|${se.age}`);
          const usStars = (plan.lg.teams.find((t) => t[0] === usKey) || [0, 3])[1];
          group.forEach((g, gi) => [0, 1].forEach((leg) => {
            const oS = (plan.lg.teams.find((t) => t[0] === g.key) || [0, 3])[1];
            const home = (gi + leg) % 2 === 0;
            const lh = clamp(1.3 * Math.exp(0.3 * ((home ? usStars : oS) - (home ? oS : usStars))), 0.3, 3); const la = clamp(1.08 * Math.exp(0.3 * ((home ? oS : usStars) - (home ? usStars : oS))), 0.25, 2.8);
            const a = poissonInv(lh, rp()); const b = poissonInv(la, rp());
            fixtures.push({ comp: 'P', compName: top ? 'Championship round' : 'Relegation round', round: `Round ${gi * 2 + leg + 1}`, t: 0.81 + (gi * 2 + leg) * 0.018, home, opp: teamObj(g.key), oppStars: oS, gf: home ? a : b, ga: home ? b : a });
          }));
        }
      }
      const league = plan.lg ? plan.lg.teams.map((t) => ({ key: t[0], stars: t[1] })) : [];
      const pickOpp = (minS, maxS, avoid) => {
        const pool = league.filter((t) => t.key !== usKey && t.stars >= minS && t.stars <= maxS && !avoid.has(t.key));
        const o = pool.length ? storyPick(r, pool) : storyPick(r, league.filter((t) => t.key !== usKey && !avoid.has(t.key))) || { key: 'x:Opponents', stars: 2 };
        avoid.add(o.key); return o;
      };
      if (plan.cup) {
        const avoid = new Set();
        const tPos = [0.14, 0.3, 0.52, 0.72, 0.97];
        for (let i = 0; i < CUP_ROUNDS.length; i++) {
          const exitHere = !plan.cup.won && plan.cup.exit === i;
          const o = i === 0 ? { key: `x:${storyPick(r, TIER2_NAMES[CLUB_MAP[se.clubId].continent] || TIER2_NAMES.EUROPE)}`, stars: 1.5 } : pickOpp(i >= 3 ? 3 : 1, 5, avoid);
          const [gf, ga] = forcedScore(r, !exitHere, false);
          fixtures.push({ ko: true, comp: 'C', compName: plan.cup.name, round: CUP_ROUNDS[i], t: tPos[i], home: r() < 0.5, opp: teamObj(o.key), oppStars: o.stars, gf, ga, lostOnPens: false });
          if (exitHere) break;
        }
      }
      if (plan.cont) {
        const cont = CLUB_MAP[se.clubId].continent;
        const pool = CLUBS.filter((c) => c.continent === cont && c.league !== CLUB_MAP[se.clubId].league && c.starRating >= 3);
        const avoid = new Set();
        const pickC = () => { const p = pool.filter((c) => !avoid.has(c.id)); const c = p.length ? storyPick(r, p) : storyPick(r, pool); avoid.add(c.id); return c; };
        const advance = plan.cont.won || plan.cont.exit >= 1;
        let pts = 0; const lp = [];
        for (let i = 0; i < 8; i++) {
          const c = pickC();
          const lh = clamp(1.3 * Math.exp(0.3 * (CLUB_MAP[se.clubId].starRating - c.starRating)), 0.3, 3); const la = clamp(1.1 * Math.exp(0.3 * (c.starRating - CLUB_MAP[se.clubId].starRating)), 0.25, 2.8);
          let gf = poissonInv(lh, r()); let ga = poissonInv(la, r());
          lp.push({ comp: 'E', compName: plan.cont.name, round: `League phase ${i + 1}`, t: 0.1 + i * 0.065, home: i % 2 === 0, opp: { id: c.id, name: c.name }, oppStars: c.starRating, gf, ga });
        }
        const ptsOf = () => lp.reduce((n, f) => n + (f.gf > f.ga ? 3 : f.gf === f.ga ? 1 : 0), 0);
        for (let k = 0; k < 8 && advance && ptsOf() < 13; k++) { const f = lp.find((x) => x.gf <= x.ga); if (!f) break; f.gf = f.ga + 1; }
        for (let k = 0; k < 8 && !advance && ptsOf() > 9; k++) { const f = lp.find((x) => x.gf >= x.ga); if (!f) break; f.ga = f.gf + 1; }
        pts = ptsOf();
        fixtures.push(...lp);
        if (advance) {
          const last = plan.cont.won ? 3 : plan.cont.exit - 1;
          for (let i = 0; i <= Math.min(3, last); i++) {
            const out = !plan.cont.won && i === last;
            const c = pickC();
            const [gf, ga] = forcedScore(r, !out, false);
            fixtures.push({ ko: true, comp: 'E', compName: plan.cont.name, round: CONT_ROUNDS[i], t: 0.66 + i * 0.1 + (i === 3 ? 0.02 : 0), home: i === 3 ? false : r() < 0.5, neutral: i === 3, opp: { id: c.id, name: c.name }, oppStars: c.starRating, gf, ga });
          }
        }
        plan.contPts = pts;
      }
      fixtures.sort((a, b) => a.t - b.t || (a.comp === 'L' ? -1 : 1));
      // Not enough fixtures for the games the engine gave you: add a league cup run.
      const contName = (CLUB_MAP[se.clubId] || {}).continent;
      for (let e = 0; plan.cup && e < (plan.cup.early || 0); e++) {
        const o = { key: `x:${storyPick(r, TIER2_NAMES[contName] || TIER2_NAMES.EUROPE)}`, stars: 1.2 };
        const [gf, ga] = forcedScore(r, true, false);
        fixtures.push({ ko: true, comp: 'C', compName: plan.cup.name, round: e ? 'First round' : 'Second round', t: 0.09 - e * 0.04, home: r() < 0.5, opp: teamObj(o.key), oppStars: o.stars, gf, ga });
      }
      let lcRound = 0;
      while (lcRound < (plan.lc != null ? plan.lc : 0)) {
        const o = { key: `x:${storyPick(r, TIER2_NAMES[(CLUB_MAP[se.clubId] || {}).continent] || TIER2_NAMES.EUROPE)}`, stars: 1.6 };
        const [gf, ga] = forcedScore(r, true, false);
        fixtures.push({ ko: true, comp: 'LC', compName: 'League Cup', round: ['First round', 'Second round', 'Third round', 'Fourth round', 'Quarter-final', 'Semi-final', 'Final'][lcRound], t: 0.08 + lcRound * 0.125, home: r() < 0.5, opp: teamObj(o.key), oppStars: o.stars, gf, ga });
        lcRound++;
      }
      fixtures.sort((a, b) => a.t - b.t || (a.comp === 'L' ? -1 : 1));
      fixtures.forEach((f, i) => { f.i = i; f.month = MX_MONTHS[Math.min(9, Math.floor(f.t * 10))]; f.second = f.t >= WINTER_AT; });
      const out = { plan, fixtures, lgRes, loanFixtures: [] };
      allocatePlayer(state, se, out);
      if (plan.lg && lgRes) out.table = leagueTable(plan.lg, lgRes);
      MX_CACHE.set(key, out);
      // Keep memory flat over long sessions: oldest seasons out first (a Map keeps insertion order).
      while (MX_CACHE.size > MX_CACHE_MAX) MX_CACHE.delete(MX_CACHE.keys().next().value);
      return out;
    }

    /* ---------- Your games: who plays, who scores, how you rated ---------- */
    function allocatePlayer(state, se, out) {
      const plan = out.plan; const jan = se.jan || null; const base = plan.base;
      const role = se.onLoan ? 'KEY_PLAYER' : se.role || state.squadRole;
      const fx = out.fixtures;
      const F = fx.length;
      // Injury block (never moves once drawn).
      const ri = mxRng(state, `inj|${se.age}`);
      const avail = fx.map(() => true);
      if (se.injured) {
        const len = clamp(Math.round((F - base.apps) * 0.55), 0, Math.max(0, F - base.apps));
        const start = Math.floor(ri() * Math.max(1, F - len));
        for (let k = start; k < start + len && k < F; k++) avail[k] = false;
        if (len) out.injury = { from: fx[start] ? fx[start].month : '', to: fx[Math.min(F - 1, start + len - 1)].month, games: len };
      }
      const a1 = fx.filter((f, i) => !f.second && avail[i]).length; const a2 = fx.filter((f, i) => f.second && avail[i]).length;
      let w1 = a1; let w2 = a2;
      if (plan.signing) w2 *= 0.55;
      if (plan.injuryOpen) w2 *= 1.35;
      const firstApps = clamp(Math.round(base.apps * (w1 / Math.max(1, w1 + w2))), Math.max(0, base.apps - a2), Math.min(a1, base.apps));
      let secondApps = base.apps - firstApps;
      let loan = null;
      if (jan) { secondApps = clamp(secondApps + jan.dParentApps, 0, a2); if (jan.loan) loan = jan.loan; }
      const weightOf = (f) => (f.comp === 'L' ? (role === 'ROTATION' || role === 'PROSPECT' ? 0.9 : 1.25) : f.comp === 'E' ? (role === 'PROSPECT' ? 0.5 : 1.05) : role === 'ROTATION' || role === 'PROSPECT' ? 1.4 : 0.7);
      const pick = (idxs, n, salt) => {
        const rr = mxRng(state, salt); const pool = [...idxs]; const chosen = [];
        while (chosen.length < n && pool.length) {
          const ws = pool.map((i) => weightOf(fx[i]) * (0.5 + rr()));
          let best = 0; ws.forEach((w, k) => { if (w > ws[best]) best = k; });
          chosen.push(pool.splice(best, 1)[0]);
        }
        return chosen;
      };
      const firstIdx = pick(fx.map((f, i) => i).filter((i) => !fx[i].second && avail[i]), firstApps, `pick1|${se.age}`);
      const secondIdx = pick(fx.map((f, i) => i).filter((i) => fx[i].second && avail[i]), secondApps, `pick2|${se.age}`);
      const startShare = START_SHARE[role] || 0.6;
      const rs = mxRng(state, `starts|${se.age}`);
      [...firstIdx, ...secondIdx].forEach((i) => { fx[i].you = { start: rs() < startShare, g: 0, a: 0, cs: false, r: 0 }; });
      fx.forEach((f, i) => { if (!f.you) f.you = null; if (!avail[i]) f.injured = true; });
      // Clean sheets first (swapping which games you played if needed), then goals and assists.
      const parentGoals = base.goals + (jan ? jan.dParentGoals : 0);
      const parentAssists = base.assists + (jan ? jan.dParentAssists : 0);
      const pool1 = fx.map((f, i) => i).filter((i) => !fx[i].second && avail[i] && !firstIdx.includes(i));
      const pool2 = fx.map((f, i) => i).filter((i) => fx[i].second && avail[i] && !secondIdx.includes(i));
      if (isDefStat(state)) {
        const cs1 = firstIdx.filter((i) => fx[i].ga === 0).length;
        const csTotal = base.cs + (jan ? jan.dParentCs : 0);
        fitCleanSheets(state, fx, firstIdx, pool1, Math.min(cs1, csTotal), `cs1|${se.age}`);
        fitCleanSheets(state, fx, secondIdx, pool2, Math.max(0, csTotal - Math.min(cs1, csTotal)), `cs2|${se.age}|${jan ? jan.sig : ''}`);
        const got2 = secondIdx.filter((i) => fx[i].ga === 0).length;
        if (got2 !== csTotal - Math.min(cs1, csTotal)) fitCleanSheets(state, fx, firstIdx, pool1, Math.max(0, csTotal - got2), `cs1b|${se.age}`);
      }
      const g1 = Math.round(base.goals * (base.apps ? firstApps / base.apps : 0.5));
      const as1 = Math.round(base.assists * (base.apps ? firstApps / base.apps : 0.5));
      const def = isDefStat(state);
      distribute(state, fx, firstIdx, g1, 'g', `g1|${se.age}`, def);
      distribute(state, fx, secondIdx, Math.max(0, parentGoals - g1), 'g', `g2|${se.age}|${jan ? jan.sig : ''}`, def);
      distribute(state, fx, firstIdx, as1, 'a', `a1|${se.age}`, def);
      distribute(state, fx, secondIdx, Math.max(0, parentAssists - as1), 'a', `a2|${se.age}|${jan ? jan.sig : ''}`, def);
      fx.forEach((f) => { if (f.you) f.you.cs = f.ga === 0; });
      // Match ratings: noisy, nudged by what happened, then shifted so the average is exactly the season's.
      const parentRating = jan && jan.loan ? jan.loan.parentRating : se.rating;
      rateMatches(state, fx.filter((f) => f.you), parentRating, `r|${se.age}|${jan ? jan.sig : ''}`);
      // A January loan: the rest of the season at the loan club.
      if (loan) {
        const lclub = CLUB_MAP[loan.clubId];
        const ln = CLUBS.filter((c) => c.league === lclub.league).length;
        const lg = { name: lclub.league, teams: CLUBS.filter((c) => c.league === lclub.league).map((c) => [c.id, c.starRating]), target: 0, us: lclub.id, rr: ln <= 12 ? 3 : ln <= 20 ? 2 : 1.5 };
        const res = playLeague(state, lg, `loan|${se.age}`, 0);
        const L = res.length; const lf = [];
        res.forEach((md, k) => { if ((k + 0.5) / L < WINTER_AT) return; md.forEach((m) => {
          const usH = lg.teams[m.h][0] === lclub.id; const usA = lg.teams[m.a][0] === lclub.id;
          if (!usH && !usA) return;
          lf.push({ comp: 'L', compName: lg.name, round: `Matchday ${k + 1}`, t: (k + 0.5) / L, home: usH, opp: teamObj(lg.teams[usH ? m.a : m.h][0]), oppStars: lg.teams[usH ? m.a : m.h][1], gf: usH ? m.gh : m.ga, ga: usH ? m.ga : m.gh, loan: true, month: MX_MONTHS[Math.min(9, Math.floor(((k + 0.5) / L) * 10))], second: true });
        }); });
        const rr = mxRng(state, `loanpick|${se.age}`);
        lf.forEach((f) => { f.you = null; });
        const order = lf.map((f, i) => i).sort(() => rr() - 0.5).slice(0, Math.min(loan.apps, lf.length));
        order.forEach((i) => { lf[i].you = { start: rr() < 0.85, g: 0, a: 0, cs: false, r: 0 }; });
        const li = order.sort((a, b) => a - b);
        const lpool = lf.map((f, i) => i).filter((i) => !li.includes(i));
        if (isDefStat(state)) fitCleanSheets(state, lf, li, lpool, Math.min(loan.cs, li.length), `lcs|${se.age}`);
        distribute(state, lf, li, loan.goals, 'g', `lg|${se.age}`, isDefStat(state));
        distribute(state, lf, li, loan.assists, 'a', `la|${se.age}`, isDefStat(state));
        lf.forEach((f) => { if (f.you) f.you.cs = f.ga === 0; });
        rateMatches(state, lf.filter((f) => f.you), loan.rating, `lr|${se.age}`);
        lf.forEach((f, i) => { f.i = 1000 + i; });
        out.loanFixtures = lf;
        out.loanClubId = lclub.id;
      }
      out.firstApps = firstIdx.length; out.secondApps = secondIdx.length;
      out.firstAvail = a1; out.secondAvail = a2;
    }
    function distribute(state, fx, idxs, total, k, salt, def) {
      if (!total || !idxs.length) return;
      const rr = mxRng(state, salt);
      for (let n = 0; n < total; n++) {
        const cap = (f) => f.gf - (f.you.g || 0) - (k === 'a' ? f.you.a || 0 : 0);
        let cands = idxs.filter((i) => cap(fx[i]) > 0);
        if (!cands.length) {
          // No room left in the score: add a goal where the result can't change.
          const pickFrom = (list) => list[Math.floor(rr() * list.length)];
          const wins = idxs.filter((i) => fx[i].gf > fx[i].ga);
          const bigLoss = idxs.filter((i) => fx[i].ga - fx[i].gf >= 2);
          const draws = idxs.filter((i) => fx[i].gf === fx[i].ga && (!def || fx[i].ga > 0));
          let j;
          if (wins.length) { j = pickFrom(wins); bumpGoal(fx[j]); }
          else if (bigLoss.length) { j = pickFrom(bigLoss); bumpGoal(fx[j]); }
          else if (draws.length) { j = pickFrom(draws); bumpGoal(fx[j]); setConceded(fx[j], fx[j].ga + 1); }
          else { j = pickFrom(idxs); bumpGoal(fx[j]); }
          cands = [j];
        }
        const ws = cands.map((i) => (fx[i].you.start ? 1 : 0.35) * (1 + 0.4 * (5 - (fx[i].oppStars || 3)) / 4) * (fx[i].home ? 1.1 : 1) * (0.3 + rr()));
        let best = 0; ws.forEach((w, q) => { if (w > ws[best]) best = q; });
        fx[cands[best]].you[k] = (fx[cands[best]].you[k] || 0) + 1;
      }
    }
    function bumpGoal(f) { f.gf += 1; if (f.ref) { if (f.home) f.ref.gh += 1; else f.ref.ga += 1; } }
    function setConceded(f, n) { f.ga = n; if (f.ref) { if (f.home) f.ref.ga = n; else f.ref.gh = n; } }
    function setScored(f, n) { f.gf = n; if (f.ref) { if (f.home) f.ref.gh = n; else f.ref.ga = n; } }
    /* Makes the games you played contain exactly `want` clean sheets without changing any result. */
    function fitCleanSheets(state, fx, idxs, pool, want, salt) {
      const rr = mxRng(state, salt);
      const count = () => idxs.filter((i) => fx[i].ga === 0).length;
      const pickFrom = (list) => list[Math.floor(rr() * list.length)];
      let guard = 0;
      while (count() < want && guard++ < 120) {
        const wins = idxs.filter((i) => fx[i].ga > 0 && fx[i].gf > fx[i].ga);
        const draws = idxs.filter((i) => fx[i].ga > 0 && fx[i].gf === fx[i].ga && !fx[i].ko);
        if (wins.length) { setConceded(fx[pickFrom(wins)], 0); continue; }
        if (draws.length) { const f = fx[pickFrom(draws)]; setConceded(f, 0); setScored(f, 0); continue; }
        // Swap a game you played for one you didn't, where the team kept (or could keep) a clean sheet.
        const out = idxs.filter((i) => fx[i].ga > 0);
        const inn = pool.filter((i) => fx[i].ga === 0 || fx[i].gf > fx[i].ga);
        if (!out.length || !inn.length) {
          // Last resort: a narrow league defeat becomes a goalless draw (the table is recalculated afterwards).
          const narrow = idxs.filter((i) => !fx[i].ko && fx[i].ga > 0 && fx[i].ga - fx[i].gf === 1);
          if (!narrow.length) break;
          const f = fx[pickFrom(narrow)]; setConceded(f, 0); setScored(f, 0); continue;
        }
        const o = pickFrom(out); const n = pickFrom(inn);
        fx[n].you = fx[o].you; fx[o].you = null;
        idxs.splice(idxs.indexOf(o), 1, n); pool.splice(pool.indexOf(n), 1, o);
        if (fx[n].ga > 0) setConceded(fx[n], 0);
      }
      guard = 0;
      while (count() > want && guard++ < 120) {
        const c = idxs.filter((i) => fx[i].ga === 0);
        if (!c.length) break;
        const f = fx[pickFrom(c)];
        if (f.gf === 0) { setScored(f, 1); setConceded(f, 1); } // 0–0 becomes 1–1: still a draw
        else { if (f.gf < 2) bumpGoal(f); setConceded(f, 1); } // a late consolation goal in a win
      }
    }
    function rateMatches(state, apps, target, salt) {
      if (!apps.length) return;
      const rr = mxRng(state, salt);
      apps.forEach((f) => { f.you.r = (target + (rr() - 0.5) * 1.0 + (f.you.g || 0) * 0.45 + (f.you.a || 0) * 0.25 + (f.you.cs ? 0.25 : 0) + (f.gf > f.ga ? 0.15 : f.gf < f.ga ? -0.25 : 0) - (f.you.start ? 0 : 0.2)); });
      for (let k = 0; k < 6; k++) {
        const mean = apps.reduce((n, f) => n + f.you.r, 0) / apps.length;
        apps.forEach((f) => { f.you.r = clamp(f.you.r + (target - mean), 5.2, 9.9); });
      }
      apps.forEach((f) => { f.you.r = Math.round(f.you.r * 10) / 10; });
    }

    /* ---------- Splits and form ---------- */
    function seasonSplits(m) {
      const all = [...m.fixtures, ...(m.loanFixtures || [])].filter((f) => f.you);
      const agg = (list) => ({ apps: list.length, g: list.reduce((n, f) => n + (f.you.g || 0), 0), a: list.reduce((n, f) => n + (f.you.a || 0), 0), cs: list.filter((f) => f.you.cs).length, r: list.length ? list.reduce((n, f) => n + f.you.r, 0) / list.length : 0 });
      const comps = [...new Set(all.map((f) => f.compName))];
      return [
        ...comps.map((c) => [c, agg(all.filter((f) => f.compName === c))]),
        ['Home', agg(all.filter((f) => f.home && !f.neutral))], ['Away', agg(all.filter((f) => !f.home && !f.neutral))],
        ['Against big clubs (4★+)', agg(all.filter((f) => (f.oppStars || 0) >= 4))],
        ['First half of the season', agg(all.filter((f) => !f.second))], ['After January', agg(all.filter((f) => f.second))],
      ];
    }

    /* ---------- The winter break: January window + a meeting with the manager ---------- */
    function winterOptions(state, se) {
      const m = seasonMatches(state, se);
      const plan = m.plan;
      const first = m.fixtures.filter((f) => !f.second);
      const yourFirst = first.filter((f) => f.you);
      const share = first.length ? yourFirst.length / Math.max(1, m.firstAvail) : 0;
      const rFirst = yourFirst.length ? yourFirst.reduce((n, f) => n + f.you.r, 0) / yourFirst.length : se.rating;
      const t = storyTokens(state);
      const cards = [];
      const meeting = { id: 'meeting', title: `A word with ${t.gaffer}`, text: share < 0.5 ? `You’ve played ${yourFirst.length} of ${first.length} games so far. ${t.gaffer} has an hour free on Monday.` : `It’s been a good first half: ${yourFirst.length} games, an average of ${rFirst.toFixed(2)}. ${t.gaffer} wants to talk about the rest of the season.`, options: [] };
      if (share < 0.75) meeting.options.push({ id: 'minutes', label: 'Ask for more minutes', desc: 'Make your case. Managers respect it — usually.' });
      meeting.options.push({ id: 'work', label: 'Accept your role, keep working', desc: 'Show the manager what you do in training.' });
      if (share >= 0.6 && POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK' && !plan.onLoan) meeting.options.push({ id: 'pens', label: 'Ask to take the penalties', desc: 'More responsibility, more chances to score.' });
      cards.push(meeting);
      const parent = CLUB_MAP[se.clubId];
      if (!plan.onLoan && share < 0.45 && se.age <= 31 && !se.secondTier) {
        const r = mxRng(state, `janloan|${se.age}`);
        const pool = CLUBS.filter((c) => c.continent === parent.continent && c.id !== parent.id && c.starRating < parent.starRating && c.starRating >= Math.max(1, parent.starRating - 2));
        if (pool.length) {
          const lc = storyPick(r, pool);
          cards.push({ id: 'window', title: 'January window: a loan offer', text: `${lc.name} want you on loan for the rest of the season, as a regular starter. ${t.agent} thinks it’s a good idea; ${t.gaffer} says it’s your call.`, loanClubId: lc.id, options: [
            { id: 'loan', label: `Go on loan to ${lc.name}`, desc: 'Play every week until the summer.' },
            { id: 'stay', label: 'Stay and fight for your place', desc: 'Prove them wrong here.' }] });
        }
      } else if (!plan.onLoan && rFirst >= 7.35 && parent.starRating <= 3) {
        const r = mxRng(state, `janbid|${se.age}`);
        const pool = CLUBS.filter((c) => c.continent === parent.continent && c.starRating >= parent.starRating + 1);
        if (pool.length) {
          const bc = storyPick(r, pool);
          cards.push({ id: 'window', title: 'January window: a bigger club calls', text: `${bc.name} made an enquiry. ${parent.name} said no, for now. ${t.agent} wants to know what to tell them.`, bidClubId: bc.id, options: [
            { id: 'focus', label: 'Stay focused here', desc: 'Finish the season properly.' },
            { id: 'open', label: '“Open to it in the summer”', desc: 'Your value rises; the fans hear about it.' }] });
        }
      }
      return { cards, m, rFirst, share };
    }
    function applyWinter(state, se, ctx, picks) {
      if (se.jan) return se.jan;
      const { cards, m } = winterOptions(state, se);
      const plan = m.plan; const base = plan.base;
      const st = ensureDepth(state);
      const t = storyTokens(state);
      const r = mxRng(state, `winter|${se.age}`);
      const prof = POSITION_PROFILES[state.setup.position];
      const a2 = m.secondApps; const avail2 = m.secondAvail;
      const perApp = (k) => (base.apps ? base[k] / base.apps : 0);
      const jan = { sig: '', cards: [], dParentApps: 0, dParentGoals: 0, dParentAssists: 0, dParentCs: 0, ratingDelta: 0, loan: null };
      cards.forEach((card) => {
        const choice = picks[card.id] || card.options[0].id;
        const opt = card.options.find((o) => o.id === choice) || card.options[0];
        let outcome = '';
        if (choice === 'minutes') {
          const p = clamp(0.55 + 0.1 * (st.aff.gaffer || 0) + (se.rating - 6.9) * 0.3, 0.2, 0.85);
          if (r() < p) { const add = clamp(Math.round(a2 * 0.3 + 2), 1, Math.max(0, avail2 - a2)); jan.dParentApps += add; outcome = add ? `${t.gaffer} agreed. You played ${add} more game${add === 1 ? '' : 's'} after January.` : `${t.gaffer} agreed, but the fixture list didn’t leave much room.`; }
          else { st.aff.gaffer = clamp((st.aff.gaffer || 0) - 1, -3, 3); outcome = `${t.gaffer} listened, then said nothing changes. The mood was cooler for a few weeks.`; }
        } else if (choice === 'work') {
          st.aff.gaffer = clamp((st.aff.gaffer || 0) + 1, -3, 3); jan.ratingDelta += 0.06; st.form = clamp((st.form || 0) + 0.02, -0.05, 0.05);
          outcome = `You stayed late every day. ${t.gaffer} noticed, and your form after Christmas showed it.`;
        } else if (choice === 'pens') {
          const add = r() < 0.75 ? 1 + Math.floor(r() * 2) : 0; jan.dParentGoals += add; jan.ratingDelta += 0.04;
          outcome = add ? `You took the penalties after January and scored ${add} of them.` : 'You took one penalty. The keeper guessed right. You’ll take the next one.';
        } else if (choice === 'loan') {
          const lc = CLUB_MAP[card.loanClubId];
          const parentLost = a2;
          const ln = CLUBS.filter((c) => c.league === lc.league).length;
          const base = ln % 2 ? ln : ln - 1;
          const L = ln <= 12 ? 3 * base : ln <= 20 ? 2 * base : base + Math.floor(ln / 2);
          const loanFix = L - Math.ceil(WINTER_AT * L - 0.5); // league games left after the break
          const apps = clamp(Math.round(loanFix * (0.78 + r() * 0.15)), Math.min(4, loanFix), loanFix);
          const goals = Math.round(apps * prof.baseGoalsPerApp * (0.9 + r() * 0.5));
          const assists = Math.round(apps * prof.baseAssistsPerApp * (0.9 + r() * 0.5));
          const cs = isDefStat(state) ? Math.round(apps * (0.22 + r() * 0.15)) : 0;
          const rating = Number(clamp(se.rating + 0.2 + (r() - 0.4) * 0.3, 6.0, 9.4).toFixed(2));
          jan.loan = { clubId: lc.id, apps, goals, assists, cs, rating, parentLost, parentRating: se.rating };
          jan.dParentApps -= parentLost;
          jan.dParentGoals -= Math.max(0, base.goals - Math.round(base.goals * (base.apps ? m.firstApps / base.apps : 0.5)));
          jan.dParentAssists -= Math.max(0, base.assists - Math.round(base.assists * (base.apps ? m.firstApps / base.apps : 0.5)));
          jan.dParentCs -= Math.max(0, base.cs - m.fixtures.filter((f) => f.you && !f.second && f.ga === 0).length);
          outcome = `You joined ${lc.name} until the summer and played ${apps} games there.`;
          state.loanHistory.push({ age: se.age, parentClubId: se.clubId, loanClubName: lc.name, appearances: apps, january: true });
        } else if (choice === 'stay') {
          st.aff.gaffer = clamp((st.aff.gaffer || 0) + 1, -3, 3); jan.ratingDelta += 0.03;
          outcome = `You turned the loan down. ${t.gaffer} said, “Good. Then show me.”`;
        } else if (choice === 'focus') {
          adjustMood(state, se.clubId, 3); outcome = 'You told your agent to wait. The fans heard you’d said no, and loved you for it.';
        } else if (choice === 'open') {
          state.marketValueM = Number((state.marketValueM * 1.04).toFixed(2)); se.valueEnd = state.marketValueM; adjustMood(state, se.clubId, -3);
          outcome = 'Word got out. Your value went up, and a few fans stopped singing your name for a while.';
        }
        jan.cards.push({ id: card.id, title: card.title, choice, label: opt.label, outcome, auto: !picks[card.id] });
      });
      // Second-half goals/assists follow the extra (or fewer) games at your usual rate.
      if (!jan.loan && jan.dParentApps) { jan.dParentGoals += Math.round(jan.dParentApps * perApp('goals')); jan.dParentAssists += Math.round(jan.dParentApps * perApp('assists')); if (isDefStat(state)) jan.dParentCs += Math.round(jan.dParentApps * perApp('cs')); }
      jan.sig = jan.cards.map((c) => c.choice).join('+');
      // Apply the change to the season record and every running total, so the engine's numbers stay consistent.
      const L = jan.loan;
      const dApps = jan.dParentApps + (L ? L.apps : 0);
      const dGoals = Math.max(-se.goals, jan.dParentGoals + (L ? L.goals : 0));
      const dAssists = Math.max(-se.assists, jan.dParentAssists + (L ? L.assists : 0));
      const dCs = Math.max(-se.cleanSheets, jan.dParentCs + (L ? L.cs : 0));
      const oldRating = se.rating;
      const parentApps = se.apps + jan.dParentApps;
      let newRating = se.rating + jan.ratingDelta;
      if (L) newRating = (se.rating * Math.max(0, parentApps) + L.rating * L.apps) / Math.max(1, parentApps + L.apps) + jan.ratingDelta;
      newRating = Number(clamp(newRating, 6.0, 9.6).toFixed(2));
      if (L) L.parentRating = Number(clamp(se.rating + jan.ratingDelta, 6.0, 9.6).toFixed(2));
      se.apps += dApps; se.goals += dGoals; se.assists += dAssists; se.cleanSheets += dCs; se.rating = newRating;
      const sst = state.stats;
      sst.appearances += dApps; sst.goals += dGoals; sst.assists += dAssists; sst.cleanSheets += dCs; sst.ratingSum += newRating - oldRating;
      if (state.currentStint) { const cs = state.currentStint; cs.appearances += jan.dParentApps; cs.goals += jan.dParentGoals; cs.assists += jan.dParentAssists; cs.cleanSheets += jan.dParentCs; }
      if (state.clubTallies && state.clubTallies[se.clubId]) { const ct = state.clubTallies[se.clubId]; ct.apps = (ct.apps || 0) + jan.dParentApps; ct.goals = (ct.goals || 0) + jan.dParentGoals; ct.cleanSheets = (ct.cleanSheets || 0) + jan.dParentCs; }
      if (ctx && ctx.acc) { const a = ctx.acc; a.apps += dApps; a.goals += dGoals; a.assists += dAssists; a.cs += dCs; a.rating += newRating - oldRating; }
      if (newRating !== oldRating) { state.marketValueM = Number(Math.max(0.1, state.marketValueM * (1 + (newRating - oldRating) * 0.12)).toFixed(2)); se.valueEnd = state.marketValueM; }
      se.jan = jan;
      plan.jan = jan.sig;
      return jan;
    }

    /* ---------- Season-reason lines that point at real causes ---------- */
    function seasonReasonV9(state, se) {
      const plan = se.mx;
      if (se.injury) return `A ${se.injury.name.toLowerCase()}${se.injury.recurrence ? ' (the same problem again)' : ''} kept you out for ${se.injury.weeks} weeks${se.injury.weeks >= 12 ? '. The comeback was the story of your spring' : ''}.`;
      if (plan) {
        const sq = squadContext(state, se);
        if (se.jan && se.jan.loan) return `In January you went on loan to ${CLUB_MAP[se.jan.loan.clubId].name} and played ${se.jan.loan.apps} games there.`;
        if (se.jan && se.jan.cards.some((c) => c.choice === 'minutes' && /agreed\. You played/.test(c.outcome))) return 'Asking the manager for more minutes in January paid off.';
        if (plan.signing && sq && sq.sig) return `In January the club signed ${sq.sig.name}, a €${sq.sig.fee}M ${GROUP_WORD[sq.group]}, and he took your place.`;
        if (plan.injuryOpen && sq && sq.injured) return `${sq.injured.name}’s injury opened a place in the team, and you took it.`;
        if (plan.outOfPos && se.apps < 30) return `The manager’s ${plan.formation} has no ${GROUP_WORD[POS_GROUP[state.setup.position]]}s, so you often played out of position.`;
      }
      return seasonReasonBase(state, se);
    }

    /* ---------- Story context from the squad ---------- */
    function squadStoryCtx(state, se) {
      const sq = squadContext(state, se);
      if (!sq) return { _tokens: {} };
      return {
        hasSquad: true, janSigning: !!(se.mx && se.mx.signing), placeRivalAhead: !!(sq.placeRival && sq.placeRival.ahead), outOfPos: !!(se.mx && se.mx.outOfPos), janLoan: !!(se.jan && se.jan.loan),
        _tokens: { teamFriend: sq.friend ? sq.friend.name : 'a team-mate', placeRival: sq.placeRival ? sq.placeRival.name : 'the player ahead of you', veteran: sq.veteran ? sq.veteran.name : 'the oldest player', formation: sq.formation, janLoanClub: se.jan && se.jan.loan ? CLUB_MAP[se.jan.loan.clubId].name : '' },
      };
    }

    function seasonReason(state, se) { return seasonReasonV9(state, se); }
    Object.assign(CHOICE_TRAITS, { 'SQD-02': ['grafter', 'team'], 'SQD-04': ['calm', 'ambitious'] });
