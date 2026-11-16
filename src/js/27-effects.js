    /* ==========================================================================
     * v13 · CHOICES WITH REAL EFFECTS
     *   Detailed attributes, weak foot, traits and learned positions now give
     *   small, capped edges to the engine: goals, assists, clean sheets, rating,
     *   games, injury risk, decline with age, and odds in cup finals.
     *   Pure function of state (no random numbers), so projections agree.
     * ========================================================================== */
    // Which details drive which stat. Deviation from the group's average is what counts:
    // training Finishing makes you a better finisher than your Shooting number alone says.
    const EDGE_DETAILS = {
      goals: ['Finishing', 'Shot power'],
      assists: ['Vision', 'Crossing', 'Short passing'],
      cs: ['Tackling', 'Marking', 'Interceptions', 'Reflexes', 'Positioning', 'Handling', 'Command of area'],
      games: ['Stamina'],
      rating: ['Ball control', 'Agility'],
    };
    const TRAIT_EDGES = {
      clinical: { goals: 0.04, text: '+4% goals' }, creator: { assists: 0.04, text: '+4% assists' }, wall: { cs: 0.04, text: '+4% clean sheets' },
      biggame: { final: 0.03, text: 'Better odds in cup and continental finals' }, leader: { rating: 0.015, games: 0.02, text: '+0.015 rating, +2% games' },
      ironman: { injury: -0.15, text: '15% fewer injuries' }, twofooted: { rating: 0.01, text: '+0.01 rating' },
      speed: { rating: 0.01, goals: 0.02, text: '+0.01 rating, +2% goals' }, freekick: { goals: 0.03, text: '+3% goals (set pieces)' },
      penalty: { goals: 0.03, text: '+3% goals (penalties)' }, bloomer: { decline: -0.25, text: 'Slower decline after 30' },
      comeback: { injury: -0.1, text: '10% fewer injuries' }, versatile: { games: 0.03, text: '+3% games' },
      aerial: { goals: 0.03, cs: 0.02, text: '+3% goals, +2% clean sheets' },
    };
    const TRAIT_CAP = 0.06; // all traits together: at most +6% on any one stat
    const EDGE_CAP = { goals: [-0.05, 0.1], assists: [-0.05, 0.1], cs: [-0.05, 0.1], games: [-0.02, 0.05], rating: [-0.03, 0.04], injury: [-0.25, 0.1], decline: [-0.25, 0], final: [0, 0.03] };

    function v13Edges(state) {
      const out = { goals: 0, assists: 0, cs: 0, games: 0, rating: 0, injury: 0, decline: 0, final: 0, parts: [] };
      const v = state && state.v10;
      if (!v || !v.subs) return out;
      const pos = state.setup.position;
      const add = (stat, val, src) => { if (!val) return; out[stat] += val; out.parts.push({ src, stat, val: Number(val.toFixed(3)) }); };
      // Details: how far the key details sit above or below their group's average.
      const groupOf = {};
      Object.entries(SUB_ATTRS).forEach(([g, list]) => list.forEach((n) => { groupOf[n] = g; }));
      const dev = (n) => (v.subs[n] == null || state.attributes[groupOf[n]] == null ? null : v.subs[n] - state.attributes[groupOf[n]]);
      const detailEdge = (stat, per, cap) => {
        const ds = EDGE_DETAILS[stat].map(dev).filter((x) => x != null);
        if (!ds.length) return;
        const m = ds.reduce((a, b) => a + b, 0) / ds.length;
        add(stat, clamp(m * per, -cap, cap), 'Training: detailed attributes');
      };
      detailEdge('goals', 0.02, 0.04); detailEdge('assists', 0.02, 0.04); detailEdge('cs', 0.02, 0.04);
      detailEdge('games', 0.01, 0.02); detailEdge('rating', 0.008, 0.015);
      const stam = dev('Stamina');
      if (stam != null && stam > 0.3) add('injury', -clamp(stam * 0.04, 0, 0.08), 'Training: stamina');
      // Composure only counts when you trained it (it grows with age for everyone otherwise).
      if (v.mental && (v.focus || []).includes('Composure')) add('goals', 0.01, 'Training: composure');
      // Weak foot (outfield only).
      if (pos !== 'GK') {
        const wf = v.weakFoot || 3;
        const att = ['ST', 'LW', 'RW', 'CAM'].includes(pos);
        const g = wf >= 5 ? 0.02 : wf === 4 ? 0.01 : wf === 3 ? 0 : att ? -0.015 * (3 - wf) : -0.005 * (3 - wf);
        add('goals', g, `Weak foot ${wf}★`);
        add('rating', wf >= 5 ? 0.015 : wf === 4 ? 0.008 : wf <= 2 && att ? -0.015 : 0, `Weak foot ${wf}★`);
      }
      // Learned positions: the manager can use you in more places.
      if ((v.knownPositions || []).length > 1) add('games', 0.02 * Math.min(2, v.knownPositions.length - 1), 'Plays more than one position');
      // Traits, capped together.
      const traitSum = {};
      (v.traits || []).forEach((t) => { const e = TRAIT_EDGES[t.id]; if (!e) return; Object.entries(e).forEach(([k, x]) => { if (k !== 'text') traitSum[k] = (traitSum[k] || 0) + x; }); });
      Object.entries(traitSum).forEach(([k, x]) => {
        const capped = k === 'injury' || k === 'decline' ? Math.max(x, -0.2) : k === 'rating' ? Math.min(x, 0.025) : Math.min(x, TRAIT_CAP);
        add(k, capped, 'Traits');
      });
      Object.entries(EDGE_CAP).forEach(([k, [lo, hi]]) => { out[k] = Number(clamp(out[k], lo, hi).toFixed(4)); });
      return out;
    }
    // Calibration: what a typical career collects anyway (measured over 200 careers).
    // The engine applies edges relative to this, so an ordinary player ends up where v12 did,
    // and only above- or below-average choices change the outcome.
    const EDGE_BASELINE = { goals: 0.035, assists: 0.005, cs: 0.006, games: 0.015, rating: 0.025, injury: -0.06, decline: 0, final: 0 };
    function v13EngineEdges(state) {
      const e = v13Edges(state);
      if (!state || !state.v10) return e;
      const out = { ...e };
      Object.keys(EDGE_BASELINE).forEach((k) => { out[k] = e[k] - EDGE_BASELINE[k] * Math.min(1, (state.seasonLog || []).length / 6); });
      return out;
    }
    function edgesSummary(state) {
      const raw = v13Edges(state);
      const e = { ...v13EngineEdges(state), parts: raw.parts };
      const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
      const rows = [];
      if (e.goals) rows.push(['Goals', pct(e.goals)]);
      if (e.assists) rows.push(['Assists', pct(e.assists)]);
      if (e.cs) rows.push(['Clean sheets', pct(e.cs)]);
      if (e.games) rows.push(['Games', pct(e.games)]);
      if (e.rating) rows.push(['Match rating', `${e.rating > 0 ? '+' : ''}${e.rating.toFixed(2)}`]);
      if (e.injury) rows.push(['Injury risk', pct(e.injury)]);
      if (e.decline) rows.push(['Decline with age', pct(e.decline)]);
      if (e.final) rows.push(['Odds in finals', `+${Math.round(e.final * 100)} points`]);
      return { rows, parts: e.parts, e };
    }

    /* ---------- Press answers with consequences ---------- */
    // Some confident answers become promises. The game checks them over the next season or two.
    const PRESS_PROMISES = {
      'bdo|confident': { type: 'bdo', within: 1, text: 'win the Ballon d’Or again' },
      'trophy|confident': { type: 'trophy', within: 1, text: 'win more trophies next season' },
      'great|confident': { type: 'beat', within: 2, text: 'have an even better season' },
      'poor|confident': { type: 'rating7', within: 1, text: 'bounce back next season' },
      'next|confident': { type: 'stat', within: 1, text: 'beat this season’s numbers' },
      'bdorank|confident': { type: 'bdoTop3', within: 2, text: 'reach the Ballon d’Or top three soon' },
      'inj|confident': { type: 'beat', within: 1, text: 'come back stronger' },
      'newclub|confident': { type: 'beat', within: 1, text: 'show the new club more' },
      'loan|confident': { type: 'apps20', within: 1, text: 'earn a place back at your club' },
    };
    function v13PressAftermath(state, se, q, a) {
      const w = ensureV11(state);
      w.promises = w.promises || [];
      const p = PRESS_PROMISES[`${q.id}|${a.style}`];
      if (p && !w.promises.some((x) => x.made === se.age && x.key === q.id)) {
        w.promises.push({ key: q.id, type: p.type, text: p.text, made: se.age, due: se.age + p.within, base: { rating: se.rating, goals: se.goals, cs: se.cleanSheets }, att: POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK', result: null });
      }
      // Transfer talk sets your stance for the next window.
      if (q.id === 'rumour') w.stance = { type: a.style === 'humble' ? 'loyal' : a.style === 'confident' ? 'ambitious' : 'quiet', age: se.age, clubId: state.currentClubId };
    }
    function promiseKept(p, se) {
      switch (p.type) {
        case 'bdo': return !!se.ballonDor;
        case 'trophy': return se.trophies.length > 0;
        case 'beat': return se.rating > p.base.rating;
        case 'rating7': return se.rating >= 7.0;
        case 'stat': return p.att ? se.goals > p.base.goals : se.cleanSheets > p.base.cs;
        case 'bdoTop3': return !!se.ballonDor || (se.bdRank != null && se.bdRank <= 3);
        case 'apps20': return !se.onLoan && se.apps >= 20;
        default: return false;
      }
    }
    function v13CheckPromises(state, se) {
      const w = state.v11;
      if (!w || !w.promises) return [];
      const notes = [];
      w.promises.filter((p) => p.result == null && se.age > p.made).forEach((p) => {
        if (promiseKept(p, se)) {
          p.result = 'kept'; p.at = se.age;
          adjustMood(state, se.clubId, 4); w.profile = Math.round(clamp(w.profile + 3, 1, 100));
          notes.push(`You said you’d ${p.text}, and you did. Fans and papers noticed.`);
          newsPush(w, se.age, '✅', `Promise kept: you said you’d ${p.text}.`, 'promise', true);
        } else if (se.age >= p.due) {
          p.result = 'broken'; p.at = se.age;
          adjustMood(state, se.clubId, -4); w.profile = Math.round(clamp(w.profile - 1, 1, 100));
          notes.push(`You said you’d ${p.text}. It didn’t happen this time, and a few fans reminded you.`);
          newsPush(w, se.age, '🗒️', `The papers remembered: you said you’d ${p.text}.`, 'promise', true);
        }
      });
      return notes;
    }
    // Your press image follows you: confident players get bigger sponsor offers, humble ones a warmer welcome.
    function pressStyleShares(w) {
      const s = (w && w.style) || { humble: 0, confident: 0, private: 0 };
      const tot = s.humble + s.confident + s.private;
      return tot < 2 ? { humble: 0, confident: 0, private: 0 } : { humble: s.humble / tot, confident: s.confident / tot, private: s.private / tot };
    }
    const sponsorStyleMult = (w) => { const sh = pressStyleShares(w); return 1 + 0.2 * sh.confident - 0.1 * sh.private; };
    // Transfer stance changes the next window's offers.
    function applyPressToChoices(state, choices) {
      const w = state.v11;
      if (!w || !w.stance || choices._press) return choices;
      choices._press = true;
      if (state.currentAge - w.stance.age > 2) return choices;
      const st = w.stance;
      const so = choices.stayOption;
      if (st.type === 'loyal' && so && state.currentClubId === st.clubId) so.pressNote = 'You said you were happy here: +6% on a new deal';
      if (st.type === 'ambitious') {
        if (so && state.currentClubId === st.clubId) so.pressNote = 'You hinted at leaving: −7% on a new deal here';
        const here = CLUB_MAP[state.currentClubId];
        (choices.offers || []).forEach((o) => { const c = CLUB_MAP[o.clubId]; if (c && here && c.starRating > here.starRating && o.wageM != null) { o.wageM = Number((o.wageM * 1.05).toFixed(3)); o.pressNote = 'Bigger clubs heard you (+5%)'; } });
      }
      return choices;
    }
    // Applied by the engine when you renew with the club you spoke about.
    function pressRenewalMult(state) {
      const st = state.v11 && state.v11.stance;
      if (!st || st.done || state.currentClubId !== st.clubId || state.currentAge - st.age > 3) return 1;
      return st.type === 'loyal' ? 1.06 : st.type === 'ambitious' ? 0.93 : 1;
    }
    // After the window: did you keep your word?
    function v13WindowStance(state, info) {
      const w = state.v11;
      if (!w || !w.stance || w.stance.done) return;
      const st = w.stance;
      if (state.currentAge - st.age > 3) { st.done = true; return; }
      if (info.prevClubId !== st.clubId) return;
      st.done = true;
      if (st.type === 'loyal' && info.kind === 'TRANSFER' && info.clubId !== st.clubId) {
        adjustMood(state, st.clubId, -8);
        newsPush(w, state.currentAge, '💬', `You said you were happy at ${(CLUB_MAP[st.clubId] || {}).name}. Some fans there feel let down by the move.`, 'promise', true);
      }
      if (st.type === 'loyal' && info.kind === 'STAY') adjustMood(state, st.clubId, 4);
    }
