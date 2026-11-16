    /* ==========================================================================
     * STORY LIBRARY (v7) — short, true-to-life stories that recur and pay off.
     * Each story: id, title, trig (plain words), when (phase), if (condition on
     * the story context `c`), text (with {tokens}), optional choices, fx, sets.
     * Phases: open (window opens) · window (after a decision) · season (after a
     * season) · retire (career end). Stories never change a season already played.
     * ========================================================================== */
    const STORIES = [];
    const STORY_CATS = {
      ACA: 'Academy and breakthrough', TRN: 'Transfers, agents and contracts', CLB: 'Life at a club', LON: 'Loans and lower leagues',
      INJ: 'Injuries and setbacks', INT: 'International duty', RIV: 'The rivalry', BIG: 'Big moments', LDR: 'Prime and leadership',
      END: 'Late career and retirement', OFF: 'Off the pitch', CB: 'Callbacks and payoffs',
    };
    function S(id, o) {
      STORIES.push({ id, cat: id.split('-')[0], w: 1, tone: 'warm', modes: 'both', choices: null, fx: null, sets: [], ...o });
    }
