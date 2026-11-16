    /* ==========================================================================
     * LAYER 3.5: WHAT-IF PROJECTION ENGINE (Monte Carlo over the real simulator)
     * Runs simulateWindow() on throwaway clones of the career so every offer can
     * show expected minutes, output, trophies, value and risks before you commit.
     * ========================================================================== */
    const PROJ_RUNS = 150;

    function cloneForProjection(state) {
      // Drop the heavy, sim-irrelevant arrays before cloning to keep 600+ runs fast.
      const light = { ...state, dramaLog: [], seasonLog: [], pendingChoices: null, valueHistory: [], lastWindowReport: null, attrHistory: [], rival: state.rival ? { ...state.rival, history: [] } : null };
      return typeof structuredClone === 'function' ? structuredClone(light) : JSON.parse(JSON.stringify(light));
    }

    function quantile(sorted, q) {
      if (!sorted.length) return 0;
      const pos = (sorted.length - 1) * q;
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }

    const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    function projectDecision(state, decision, runs = PROJ_RUNS) {
      const { actualWindowYears, isFinalWindow } = getDerivedState(state);
      const years = actualWindowYears;
      const acc = {
        bestRank: [], apps: [], goals: [], assists: [], cs: [], tackles: [], savePct: [], rating: [], value: [], trophies: [], legacy: [],
        pathByYear: Array.from({ length: years }, () => []),
      };
      const hits = { award: 0, podium: 0, league: 0, cup: 0, cont: 0, intlWin: 0, anyMajor: 0, anyTrophy: 0, ballon: 0, injury: 0, loan: 0, releg: 0, fallout: 0, captain: 0, roleUp: 0, snub: 0, called: 0 };
      const tournaments = [];
      for (let y = 0; y < years; y++) {
        const t = TOURNAMENT_SCHEDULE[state.currentAge + y];
        if (t) tournaments.push({ age: state.currentAge + y, title: t.type === 'WORLD_CUP' ? 'FIFA World Cup' : CONTINENTS[state.setup.continent].tournamentName });
      }

      const prevDry = DRY_RUN;
      const prevHof = latestHofEntryId;
      const prevProj = PROJ_RNG.s;
      PROJ_RNG.s = hashSeed(`${state.setup.seed}|proj|${state.windowCount}|${state.currentAge}|${decision.type}|${decision.clubId || ''}|${decision.contractYears || ''}|${decision.wageM || ''}|${decision.loanClubId || ''}`);
      DRY_RUN = true;
      try {
        for (let i = 0; i < runs; i++) {
          const c = cloneForProjection(state);
          const { report } = simulateWindow(c, decision);
          const n = Math.max(1, years);
          acc.apps.push(report.appearances / n);
          acc.goals.push(report.goals / n);
          acc.assists.push(report.assists / n);
          acc.cs.push(report.cleanSheets / n);
          acc.tackles.push(report.tackles / n);
          if (report.averageSavePct != null) acc.savePct.push(report.averageSavePct);
          acc.rating.push(report.averageRating);
          acc.value.push(report.valueEnd);
          acc.trophies.push(report.trophiesWon.length);
          if (isFinalWindow) acc.legacy.push(c.legacyScore || 0);
          report.seasons.forEach((s, idx) => acc.pathByYear[idx] && acc.pathByYear[idx].push(s.valueEnd));

          const cats = new Set(report.trophiesWon.map((t) => t.category));
          if (cats.has('DOMESTIC_LEAGUE')) hits.league++;
          if (cats.has('DOMESTIC_CUP')) hits.cup++;
          if (cats.has('CONTINENTAL')) hits.cont++;
          if (cats.has('INTERNATIONAL')) hits.intlWin++;
          if (report.trophiesWon.some((t) => MAJOR_TROPHY_TYPES.has(t.category))) hits.anyMajor++;
          if (report.trophiesWon.length) hits.anyTrophy++;
          if (report.seasons.some((s) => s.ballonDor)) hits.ballon++;
          if (report.seasons.some((s) => s.awards && s.awards.length)) hits.award++;
          if (report.seasons.some((s) => s.bdRank != null && s.bdRank <= 3)) hits.podium++;
          acc.bestRank.push(Math.min(99, ...report.seasons.map((s) => (s.bdRank == null ? 99 : s.bdRank))));
          const types = new Set(report.events.map((e) => e.type));
          if (types.has('INJURY')) hits.injury++;
          if (types.has('YOUTH_LOAN')) hits.loan++;
          if (types.has('RELEGATED')) hits.releg++;
          if (types.has('UNWANTED')) hits.fallout++;
          if (types.has('CAPTAIN')) hits.captain++;
          if (types.has('ROLE_UP')) hits.roleUp++;
          if (types.has('INTL_SNUB')) hits.snub++;
          if (types.has('INTL_GLORY') || types.has('INTL_CAP')) hits.called++;
        }
      } finally {
        DRY_RUN = prevDry;
        PROJ_RNG.s = prevProj;
        latestHofEntryId = prevHof;
      }

      const sortedValue = [...acc.value].sort((a, b) => a - b);
      const p = (k) => hits[k] / runs;
      return {
        runs,
        years,
        apps: mean(acc.apps),
        goals: mean(acc.goals),
        assists: mean(acc.assists),
        cs: mean(acc.cs),
        tackles: mean(acc.tackles),
        savePct: acc.savePct.length ? mean(acc.savePct) : null,
        rating: mean(acc.rating),
        trophiesMean: mean(acc.trophies),
        valueStart: state.marketValueM,
        valueMed: quantile(sortedValue, 0.5),
        valueP10: quantile(sortedValue, 0.1),
        valueP90: quantile(sortedValue, 0.9),
        path: acc.pathByYear.map((vals, idx) => {
          const s = [...vals].sort((a, b) => a - b);
          return { age: state.currentAge + idx + 1, med: quantile(s, 0.5), p10: quantile(s, 0.1), p90: quantile(s, 0.9) };
        }),
        legacy: acc.legacy.length ? quantile([...acc.legacy].sort((a, b) => a - b), 0.5) : null,
        pLeague: p('league'),
        pCup: p('cup'),
        pCont: p('cont'),
        pIntlWin: p('intlWin'),
        pAnyMajor: p('anyMajor'),
        pAward: p('award'),
        pPodium: p('podium'),
        bdRankMed: (() => { const v = [...acc.bestRank].sort((a, b) => a - b); const m = quantile(v, 0.5); return m >= 31 ? null : Math.round(m); })(),
        earnings: (decision.wageM != null ? decision.wageM : state.wageM) * years,
        pAnyTrophy: p('anyTrophy'),
        pBallon: p('ballon'),
        pInjury: p('injury'),
        pLoan: p('loan'),
        pReleg: p('releg'),
        pFallout: p('fallout'),
        pCaptain: p('captain'),
        pRoleUp: p('roleUp'),
        tournaments,
        pCalled: tournaments.length ? hits.called / runs : null,
      };
    }
