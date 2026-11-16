    /* ==========================================================================
     * v10 · YOUR PLAYER IN FULL
     *   ~20 detailed attributes under the six the engine uses (their average is
     *   always the engine's value, so balance is unchanged), mental attributes,
     *   preferred foot and weak foot, traits earned through the career, a scouts'
     *   ceiling, individual training, learning a new position, injuries with a type
     *   and recovery time (plus a small re-injury risk), and contracts in full:
     *   bonuses, signing-on fee, loyalty bonus, image rights, sell-on and buy-back
     *   clauses, loan options, and earnings with country tax.
     *   Nothing here calls rand(); it uses its own hash-seeded numbers.
     * ========================================================================== */
    const SUB_ATTRS = {
      PAC: ['Acceleration', 'Sprint speed'],
      SHO: ['Finishing', 'Shot power', 'Long shots', 'Penalties'],
      PAS: ['Short passing', 'Long passing', 'Vision', 'Crossing'],
      DRI: ['Ball control', 'Dribbling', 'Agility'],
      DEF: ['Tackling', 'Marking', 'Interceptions', 'Heading'],
      PHY: ['Strength', 'Stamina', 'Jumping'],
      REF: ['Reflexes', 'Diving'],
      HAN: ['Handling', 'Catching'],
      POS: ['Positioning', 'Anticipation'],
      KIC: ['Kicking', 'Throwing', 'Passing range'],
      COM: ['Command of area', 'Communication', 'Aerial reach'],
    };
    const MENTAL_ATTRS = ['Composure', 'Decisions', 'Work rate', 'Leadership'];
    // When attributes decline with age, these fall first (positive = falls faster than its group).
    const AGE_TILT = { 'Sprint speed': 0.12, Acceleration: 0.08, Stamina: 0.15, Strength: -0.15, Agility: 0.1, 'Ball control': -0.1, Positioning: -0.1, Anticipation: -0.1, Vision: -0.08, 'Long passing': -0.05 };
    const POSITION_MOVES = { ST: ['LW', 'RW', 'CAM'], LW: ['RW', 'ST', 'LB'], RW: ['LW', 'ST', 'RB'], CAM: ['CM', 'ST'], CM: ['CDM', 'CAM'], CDM: ['CM', 'CB'], CB: ['CDM', 'RB', 'LB'], LB: ['LW', 'CB'], RB: ['RW', 'CB'], GK: [] };
    const POS_NAMES = { ST: 'striker', LW: 'left winger', RW: 'right winger', CAM: 'attacking midfielder', CM: 'central midfielder', CDM: 'holding midfielder', CB: 'centre-back', LB: 'left-back', RB: 'right-back', GK: 'goalkeeper' };
    // Weeks out: typical range for each type. The type is chosen to fit how long you were out.
    const INJURY_TYPES = [
      { id: 'calf', name: 'Calf strain', part: 'calf', w: [2, 7], f: 12 }, { id: 'groin', name: 'Groin strain', part: 'groin', w: [2, 7], f: 9 }, { id: 'back', name: 'Back problem', part: 'back', w: [2, 9], f: 7 },
      { id: 'hamstring', name: 'Hamstring strain', part: 'hamstring', w: [3, 10], f: 22 }, { id: 'ankle', name: 'Ankle ligament sprain', part: 'ankle', w: [3, 12], f: 14 }, { id: 'thigh', name: 'Thigh muscle tear', part: 'thigh', w: [5, 12], f: 11 },
      { id: 'shoulder', name: 'Dislocated shoulder', part: 'shoulder', gk: true, w: [5, 14], f: 3 }, { id: 'foot', name: 'Broken metatarsal', part: 'foot', w: [7, 16], f: 6 },
      { id: 'meniscus', name: 'Knee cartilage tear', part: 'knee', w: [8, 20], f: 7 }, { id: 'acl', name: 'Cruciate ligament injury', part: 'knee', w: [20, 45], f: 3 },
    ];
    const TAX_BY_NATION = { CAN: 53.5, ENG: 45, ESP: 47, GER: 45, ITA: 43, FRA: 45, BRA: 27.5, ARG: 35, KSA: 0, JPN: 45, CHN: 45, EGY: 22.5, RSA: 45, MEX: 35, USA: 43, POR: 48, NED: 49.5, BEL: 50, AUS: 45 };
    const TRAITS = {
      clinical: { name: 'Clinical finisher', ic: '🎯', how: 'A 20-goal season' }, creator: { name: 'Creator', ic: '🪄', how: '12 assists in a season' },
      wall: { name: 'The wall', ic: '🧱', how: '18 clean sheets in a season' }, biggame: { name: 'Big-game player', ic: '🏟️', how: 'Decisive in a cup or continental final you won' },
      leader: { name: 'Leader', ic: '©️', how: 'Named club captain' }, ironman: { name: 'Iron man', ic: '🔩', how: '700 career games, or five 50-game seasons' },
      twofooted: { name: 'Two-footed', ic: '🦶', how: 'Weak foot raised to five stars' }, speed: { name: 'Speed merchant', ic: '💨', how: 'Sprint speed of 17 or more' },
      freekick: { name: 'Free-kick specialist', ic: '🌀', how: 'Long shots 17.5+ and shot power 15+' }, penalty: { name: 'Penalty taker', ic: '⚪', how: 'Took the penalties after a winter meeting' },
      bloomer: { name: 'Late bloomer', ic: '🌸', how: 'Overall up by 2 or more after turning 25' }, comeback: { name: 'Comeback', ic: '🔁', how: 'A 7.4 season straight after three months out' },
      versatile: { name: 'Versatile', ic: '🔀', how: 'Learned a second position' }, aerial: { name: 'Aerial threat', ic: '🦅', how: 'Heading 18+ and jumping 16+' },
    };
    const v10Rng = (state, salt) => storyRng(state, `v10|${salt}`);
    const groupsFor = (pos) => attrKeysFor(pos);

    function ensureV10(state) {
      if (state.v10) return state.v10;
      const r = v10Rng(state, 'init');
      const pos = state.setup.position;
      const subs = {};
      groupsFor(pos).forEach((g) => {
        const names = SUB_ATTRS[g] || [g];
        const offs = names.map(() => (r() - 0.5) * 2.6);
        const mean = offs.reduce((a, b) => a + b, 0) / offs.length;
        names.forEach((n, i) => { subs[n] = Number(clamp((state.attributes[g] || 8) + offs[i] - mean, 1, 20).toFixed(2)); });
      });
      const mental = {}; MENTAL_ATTRS.forEach((n) => { mental[n] = Number((7 + r() * 4 + (state.currentAge - 17) * 0.25).toFixed(2)); });
      const leftLean = ['LW', 'LB'].includes(pos) ? 0.6 : ['RW', 'RB'].includes(pos) ? 0.1 : 0.22;
      state.v10 = {
        subs, mental, prevSubs: { ...subs }, foot: r() < leftLean ? 'Left' : 'Right', weakFoot: 2 + Math.floor(r() * 3), weakProgress: 0,
        traits: [], focus: [], learning: null, knownPositions: [pos], injuries: [], seasonsDone: [],
        contract: null, contracts: [], money: [], clauses: [],
      };
      return state.v10;
    }

    /* ---------- Detailed attributes follow the engine ---------- */
    function syncSubs(state, before, after, age) {
      const v = ensureV10(state);
      v.prevSubs = { ...v.subs };
      const pos = state.setup.position;
      const prof = POSITION_PROFILES[pos];
      const r = v10Rng(state, `subs|${age}`);
      groupsFor(pos).forEach((g) => {
        const names = SUB_ATTRS[g] || [g];
        const d = (after[g] || 0) - (before[g] || 0);
        const focused = names.filter((n) => v.focus.includes(n));
        const tilt = {};
        names.forEach((n) => { tilt[n] = (r() - 0.5) * 0.12; });
        focused.forEach((n) => { tilt[n] += 0.35; });
        if (d < 0 && age > prof.peakEnd) names.forEach((n) => { tilt[n] -= (AGE_TILT[n] || 0) * 1.5; });
        const mean = names.reduce((a, n) => a + tilt[n], 0) / names.length;
        names.forEach((n) => { v.subs[n] = (v.subs[n] == null ? after[g] : v.subs[n]) + d + tilt[n] - mean; });
        // Keep the group's average exactly on the engine's value.
        for (let k = 0; k < 3; k++) {
          const m = names.reduce((a, n) => a + v.subs[n], 0) / names.length;
          names.forEach((n) => { v.subs[n] = clamp(v.subs[n] + (after[g] - m), 1, 20); });
        }
        names.forEach((n) => { v.subs[n] = Number(v.subs[n].toFixed(2)); });
      });
      MENTAL_ATTRS.forEach((n) => {
        let g = age <= 30 ? 0.22 : 0.05;
        if (n === 'Leadership' && state.isCaptain) g += 0.3;
        if (n === 'Composure' && v.focus.includes('Composure')) g += 0.3;
        v.mental[n] = Number(clamp(v.mental[n] + g + (r() - 0.5) * 0.15, 1, 20).toFixed(2));
      });
    }
    function scoutsCeiling(state) {
      const pos = state.setup.position;
      const prof = POSITION_PROFILES[pos];
      const now = overallRating(pos, state.attributes);
      let a = { ...state.attributes }; let best = now;
      for (let age = state.currentAge; age <= prof.peakEnd; age++) {
        attrKeysFor(pos).forEach((k) => { const g = age < prof.peakStart ? 0.62 * (age <= 20 ? 1.15 : 1) + 0.12 : 0.2; a[k] = clamp(a[k] + g, 1, 20); });
        best = Math.max(best, overallRating(pos, a));
      }
      const spread = clamp((prof.peakStart - state.currentAge) * 0.25, 0, 1.6);
      return { lo: Number(Math.max(now, best - spread).toFixed(1)), hi: Number(Math.min(20, best + spread).toFixed(1)), now: Number(now.toFixed(1)) };
    }

    /* ---------- Training plan: up to two individual focuses ---------- */
    function trainingTargets(state) {
      const v = ensureV10(state);
      const pos = state.setup.position;
      const list = [];
      groupsFor(pos).forEach((g) => (SUB_ATTRS[g] || []).forEach((n) => list.push({ id: n, label: n, group: ATTR_LABELS[g] || g })));
      list.push({ id: 'Composure', label: 'Composure', group: 'Mental' });
      if (v.weakFoot < 5 && pos !== 'GK') list.push({ id: 'WEAKFOOT', label: `Weak foot (${v.weakFoot}★ → ${v.weakFoot + 1}★)`, group: 'Technique' });
      (POSITION_MOVES[pos] || []).filter((p) => !v.knownPositions.includes(p)).forEach((p) => list.push({ id: `POS:${p}`, label: `Learn ${POS_NAMES[p]} (${p})`, group: 'Positions' }));
      return list;
    }
    function setTrainingFocus(state, ids) { const v = ensureV10(state); v.focus = ids.slice(0, 2); }

    /* ---------- Injuries ---------- */
    function injuryRiskMult(state) {
      const v = state.v10;
      if (!v || !v.injuries.length) return 1;
      const last = v.injuries[v.injuries.length - 1];
      return state.currentAge - last.age <= 2 ? 1.12 : 1; // a small re-injury risk for two seasons
    }
    function describeInjury(state, se, games) {
      const v = ensureV10(state);
      const existing = v.injuries.find((x) => x.age === se.age);
      if (existing) return existing;
      const r = v10Rng(state, `inj|${se.age}`);
      // The match list blocks out every game you missed; the injury itself is usually shorter.
      const cap = Math.max(3, Math.round(games * 0.95 + 1));
      const pool = INJURY_TYPES.filter((t) => (state.setup.position === 'GK' || !t.gk) && t.w[0] <= cap);
      const recent = v.injuries.filter((x) => se.age - x.age <= 2);
      const recur = recent.length && r() < 0.3 ? pool.find((t) => t.id === recent[recent.length - 1].id) : null;
      let t = recur;
      if (!t) { let x = r() * pool.reduce((a, p) => a + p.f, 0); t = pool.find((p) => (x -= p.f) < 0) || pool[0]; }
      const hi = Math.min(t.w[1], cap);
      const weeks = Math.round(t.w[0] + (hi - t.w[0]) * (0.25 + r() * 0.75));
      const inj = { age: se.age, id: t.id, name: t.name, part: t.part, weeks, recurrence: !!recur };
      v.injuries.push(inj);
      return inj;
    }

    /* ---------- Contracts and money ---------- */
    function contractPackage(state, d, clubId) {
      const club = CLUB_MAP[clubId] || CLUB_MAP[state.currentClubId];
      const r = v10Rng(state, `pkg|${clubId}|${state.windowCount}|${d.type || ''}`);
      const wageM = d.wageM != null ? d.wageM : state.wageM;
      const weeklyK = (wageM * 1e3) / 52;
      const isAtt = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      const big = club && club.starRating >= 4;
      return {
        clubId: club ? club.id : null, years: d.contractYears || d.years || state.contractYearsRemaining || 3,
        wageM, appBonusK: Math.round(weeklyK * (0.08 + r() * 0.07)), goalBonusK: isAtt ? Math.round(weeklyK * (0.15 + r() * 0.2)) : 0,
        csBonusK: !isAtt ? Math.round(weeklyK * (0.1 + r() * 0.15)) : 0, signingFeeM: d.type === 'TRANSFER' ? Number(((d.feeM ? d.feeM * 0.04 : wageM * 0.25) * (0.7 + r() * 0.6)).toFixed(2)) : d.type === 'FIRST_CONTRACT' ? Number((wageM * 0.3).toFixed(2)) : 0,
        loyaltyBonusM: Number((wageM * (0.2 + r() * 0.2)).toFixed(2)), imageRightsPct: big && state.marketValueM >= 20 ? 10 + Math.floor(r() * 16) : 0,
        loanOptionM: d.type === 'LOAN' ? Number(Math.max(1, state.marketValueM * (1.1 + r() * 0.5)).toFixed(1)) : 0,
      };
    }
    function packageLine(state, d, clubId) {
      const p = contractPackage(state, d, clubId);
      const bits = [];
      if (p.appBonusK) bits.push(`+€${p.appBonusK}K a game`);
      if (p.goalBonusK) bits.push(`€${p.goalBonusK}K a goal`);
      if (p.csBonusK) bits.push(`€${p.csBonusK}K a clean sheet`);
      if (p.signingFeeM) bits.push(`€${p.signingFeeM}M signing fee`);
      if (p.imageRightsPct) bits.push(`${p.imageRightsPct}% image rights`);
      if (p.loanOptionM) bits.push(`option to buy €${p.loanOptionM}M`);
      return bits.join(' · ');
    }
    // A few leagues cross borders: Canadian clubs in MLS pay Canadian tax.
    const CLUB_COUNTRY = (club) => (club && /Toronto|Montr[eé]al|Vancouver/.test(club.name) ? 'CAN' : club ? LEAGUE_NATION[club.league] : '');
    const taxRate = (club) => (club ? TAX_BY_NATION[CLUB_COUNTRY(club)] ?? 40 : 40);

    /* Called when a decision is announced (every mode). */
    function v10WindowHook(state, info) {
      if (DRY_RUN) return;
      const v = ensureV10(state);
      if (v.contract && v.contract.window === state.windowCount) return;
      const prevClub = CLUB_MAP[info.prevClubId];
      const d = { type: info.kind, wageM: state.wageM, feeM: info.fee, contractYears: state.contractYearsRemaining };
      const changed = info.kind !== 'LOAN' && info.clubId !== info.prevClubId;
      if (v.contract && (changed || info.kind === 'STAY') && v.contract.clubId === info.prevClubId) {
        // Loyalty bonus when a full contract was served.
        if (v.contract.startAge != null && v.contract.startAge + v.contract.years <= state.currentAge && !v.contract.loyaltyPaid) { v.contract.loyaltyPaid = true; v.pendingLoyalty = v.contract.loyaltyBonusM; }
        v.contracts.push(v.contract);
      }
      // Sell-on and buy-back clauses when you're sold.
      if (info.kind === 'TRANSFER' && info.fee > 0 && prevClub) {
        const r = v10Rng(state, `clauses|${state.windowCount}`);
        const prior = v.clauses.find((c) => c.type === 'sellon' && c.clubId !== info.clubId && !c.used);
        if (prior) { prior.used = true; prior.paidM = Number((info.fee * prior.pct / 100).toFixed(2)); }
        if (state.currentAge <= 24 && r() < 0.6) v.clauses.push({ type: 'sellon', clubId: prevClub.id, pct: 10 + Math.floor(r() * 3) * 5, age: state.currentAge });
        if (prevClub.id === state.boyhoodClubId && state.currentAge <= 23 && r() < 0.5) v.clauses.push({ type: 'buyback', clubId: prevClub.id, priceM: Number((info.fee * (1.4 + r() * 0.6)).toFixed(1)), until: state.currentAge + 3, age: state.currentAge });
      }
      const club = info.kind === 'LOAN' ? CLUB_MAP[info.prevClubId] : CLUB_MAP[info.clubId] || CLUB_MAP[state.currentClubId];
      v.contract = { ...contractPackage(state, d, club ? club.id : state.currentClubId), startAge: null, window: state.windowCount, kind: info.kind };
    }

    /* Called once per season after the engine (and January) are done, in every mode. */
    function v10SeasonHook(state, se) {
      if (DRY_RUN || !se) return;
      const v = ensureV10(state);
      if (v.seasonsDone.includes(se.age)) return;
      v.seasonsDone.push(se.age);
      if (se.attrsBefore && se.attrsAfter) syncSubs(state, se.attrsBefore, se.attrsAfter, se.age);
      const r = v10Rng(state, `season|${se.age}`);
      const minutes = clamp(se.apps / 40, 0.4, 1.2);
      const notes = [];
      // Weak foot and position learning use a training slot.
      if (v.focus.includes('WEAKFOOT') && v.weakFoot < 5) {
        v.weakProgress += 0.45 + r() * 0.25;
        if (v.weakProgress >= 1) { v.weakFoot += 1; v.weakProgress = 0; notes.push(`Your weak foot improved to ${v.weakFoot}★.`); }
      }
      const posFocus = v.focus.find((f) => f.startsWith('POS:'));
      if (posFocus) {
        const p = posFocus.slice(4);
        if (!v.learning || v.learning.pos !== p) v.learning = { pos: p, progress: 0 };
        v.learning.progress = Number(Math.min(1, v.learning.progress + (0.42 + r() * 0.2) * minutes).toFixed(2));
        if (v.learning.progress >= 1 && !v.knownPositions.includes(p)) { v.knownPositions.push(p); notes.push(`You can now play ${POS_NAMES[p]}.`); v.focus = v.focus.filter((f) => f !== posFocus); }
      }
      // Injury details from the season's match list (when the match layer is present).
      if (se.injured) {
        let games = 6;
        if (typeof seasonMatches === 'function') { const m = seasonMatches(state, se); if (m && m.injury) games = m.injury.games; }
        se.injury = describeInjury(state, se, games);
      }
      // Money for the season.
      if (!v.contract) v.contract = { ...contractPackage(state, { type: 'FIRST_CONTRACT', wageM: se.wageM || state.wageM }, se.clubId), startAge: se.age, window: 0, kind: 'FIRST_CONTRACT' };
      const c = v.contract;
      if (c.startAge == null) c.startAge = se.age;
      const club = se.onLoan ? CLUBS.find((x) => x.name === se.loanClubName) || CLUB_MAP[se.clubId] : CLUB_MAP[se.clubId];
      const parts = { wage: se.wageM != null ? se.wageM : c.wageM, appearances: (se.apps * c.appBonusK) / 1000, goals: (se.goals * c.goalBonusK) / 1000, cleanSheets: (se.cleanSheets * c.csBonusK) / 1000, signing: 0, loyalty: 0, imageRights: 0, sponsors: se.sponsor ? se.sponsor.total : 0 };
      if (c.signingFeeM && !c.signingPaid) { parts.signing = c.signingFeeM; c.signingPaid = true; }
      if (v.pendingLoyalty) { parts.loyalty = v.pendingLoyalty; v.pendingLoyalty = 0; }
      if (c.imageRightsPct) parts.imageRights = Number((state.marketValueM * 0.04 * (c.imageRightsPct / 25)).toFixed(2));
      const sellon = v.clauses.filter((x) => x.paidM && !x.reported);
      sellon.forEach((x) => { x.reported = true; });
      const gross = Object.values(parts).reduce((a, b) => a + b, 0);
      const rate = taxRate(club);
      const tax = gross * (rate / 100);
      se.money = { parts: Object.fromEntries(Object.entries(parts).map(([k, x]) => [k, Number(x.toFixed(3))])), gross: Number(gross.toFixed(3)), taxRate: rate, tax: Number(tax.toFixed(3)), net: Number((gross - tax).toFixed(3)), country: CLUB_COUNTRY(club) || '' };
      v.money.push({ age: se.age, gross: se.money.gross, net: se.money.net });
      // Buy-back clauses lapse.
      v.clauses.filter((x) => x.type === 'buyback' && !x.expired && se.age >= x.until).forEach((x) => { x.expired = true; notes.push(`${CLUB_MAP[x.clubId].name}’s buy-back clause expired.`); });
      // Loan options: did the loan club try to make it permanent?
      // Loans (a season loan, or a January loan) come with an option to buy, sometimes an obligation.
      const loanClub = se.jan && se.jan.loan ? CLUB_MAP[se.jan.loan.clubId] : se.onLoan ? CLUBS.find((x) => x.name === se.loanClubName) : null;
      const loanRating = se.jan && se.jan.loan ? se.jan.loan.rating : se.rating;
      if (loanClub && !v.clauses.some((x) => x.type === 'loanoption' && x.age === se.age)) {
        const obligation = r() < 0.25;
        v.clauses.push({ type: 'loanoption', clubId: loanClub.id, priceM: Number(Math.max(0.5, state.marketValueM * (1.1 + r() * 0.5)).toFixed(1)), obligation, age: se.age, outcome: null });
      }
      v.clauses.filter((x) => x.type === 'loanoption' && x.outcome == null && x.age === se.age).forEach((x) => {
        const club2 = CLUB_MAP[x.clubId];
        if (x.obligation) { x.outcome = 'condition not met'; notes.push(`The ${club2.name} loan had an obligation to buy you for €${x.priceM}M if they won promotion. They didn’t, so you go back.`); return; }
        x.outcome = loanRating >= 7.2 && r() < 0.6 ? 'triggered' : 'not triggered';
        notes.push(x.outcome === 'triggered' ? `${club2.name} tried to trigger the €${x.priceM}M option to buy you. Your club had a recall clause and kept you.` : `${club2.name} didn’t take up their €${x.priceM}M option to buy you.`);
      });
      earnTraits(state, se);
      se.v10notes = notes;
    }
    function earnTraits(state, se) {
      const v = ensureV10(state);
      const add = (id) => { if (!v.traits.some((t) => t.id === id)) v.traits.push({ id, age: se.age }); };
      const isAtt = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      if (isAtt && se.goals >= 20) add('clinical');
      if (se.assists >= 12) add('creator');
      if (!isAtt && se.cleanSheets >= 18) add('wall');
      if (state.isCaptain) add('leader');
      if (state.stats.appearances >= 700 || state.seasonLog.filter((x) => x.apps >= 50).length >= 5) add('ironman');
      if (v.weakFoot >= 5) add('twofooted');
      if ((v.subs['Sprint speed'] || 0) >= 17) add('speed');
      if ((v.subs['Long shots'] || 0) >= 17.5 && (v.subs['Shot power'] || 0) >= 15) add('freekick');
      if ((v.subs.Heading || 0) >= 18 && (v.subs.Jumping || 0) >= 16) add('aerial');
      if (v.knownPositions.length > 1) add('versatile');
      if (se.jan && se.jan.cards.some((c) => c.choice === 'pens')) add('penalty');
      const at25 = (state.attrHistory || []).find((h) => h.age === 25);
      if (at25 && overallRating(state.setup.position, state.attributes) - at25.overall >= 2) add('bloomer');
      const prev = state.seasonLog[state.seasonLog.indexOf(se) - 1];
      if (prev && prev.injury && prev.injury.weeks >= 12 && se.rating >= 7.4) add('comeback');
      if (typeof seasonMatches === 'function') {
        const m = seasonMatches(state, se);
        if (m && m.fixtures.some((f) => f.round === 'Final' && (f.comp === 'E' || f.comp === 'C') && f.gf > f.ga && f.you && f.you.start && (f.you.g >= 1 || f.you.cs) && (f.comp === 'E' || se.rating >= 7.4))) add('biggame');
      }
    }

    /* ---------- Switching position (between seasons, once learned) ---------- */
    function switchPosition(state, pos) {
      const v = ensureV10(state);
      if (!v.knownPositions.includes(pos) || pos === state.setup.position || pos === 'GK' || state.setup.position === 'GK') return false;
      const from = state.setup.position;
      if (!state.setup.originalPosition) state.setup.originalPosition = from;
      state.setup.position = pos;
      v.positionHistory = [...(v.positionHistory || []), { age: state.currentAge, from, to: pos }];
      return true;
    }
