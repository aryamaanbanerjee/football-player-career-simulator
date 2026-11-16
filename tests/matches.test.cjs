// v9 match-by-match tests. Run: node --test tests/matches.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');

const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };

// Plays a career season by season, the way the career-mode review does, with a winter policy.
function play(E, seed, i, winter) {
  const cont = conts[i % 5];
  const s = E.createInitialGameState({ playerName: 'Match Tester', position: positions[i % 8], continent: cont, nation: nationsFor[cont], transferInterval: 1 + (i % 3), retirementAge: 33 + (i % 5), seed });
  E.RNG.holder = s;
  let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    const d = ch.offers[(i + g) % Math.max(1, ch.offers.length)] || ch.stayOption;
    const ctx = E.beginWindow(s, d);
    while (ctx.seasons.length < ctx.years) {
      const se = E.simulateSeason(s, ctx);
      E.buildSeasonPlan(s, se);
      if (winter) {
        const w = E.winterOptions(s, se);
        const picks = {}; w.cards.forEach((c) => { picks[c.id] = winter(c, se); });
        E.applyWinter(s, se, ctx, picks);
      }
      E.storySeason(s, se, { auto: true });
    }
    const r = E.endWindow(s, ctx);
    if (r.isRetired || s.isRetired) break;
    ch = E.generateChoices(s);
  }
  return s;
}
const yourApps = (m) => [...m.fixtures, ...m.loanFixtures].filter((f) => f.you);

test('every season’s matches add up exactly to the season record', () => {
  const { E } = loadEngine({ stories: true, matches: true });
  for (let i = 0; i < 24; i++) {
    const s = play(E, `MX${i}`, i, i % 2 ? (c) => c.options[i % c.options.length].id : null);
    const def = ['DEFENSE', 'GK'].includes(E.POSITION_PROFILES[s.setup.position].primaryStatType);
    s.seasonLog.forEach((se) => {
      const m = E.seasonMatches(s, se);
      const a = yourApps(m);
      assert.equal(a.length, se.apps, `apps ${s.setup.seed} age ${se.age}`);
      assert.equal(a.reduce((n, f) => n + f.you.g, 0), se.goals, `goals ${s.setup.seed} age ${se.age}`);
      assert.equal(a.reduce((n, f) => n + f.you.a, 0), se.assists, `assists ${s.setup.seed} age ${se.age}`);
      if (def) assert.equal(a.filter((f) => f.you.cs).length, se.cleanSheets, `clean sheets ${s.setup.seed} age ${se.age}`);
      if (a.length) assert.ok(Math.abs(a.reduce((n, f) => n + f.you.r, 0) / a.length - se.rating) < 0.08, 'average rating matches');
      a.forEach((f) => assert.ok(f.you.g + f.you.a <= f.gf, 'you can’t score or assist more than your team scored'));
    });
    const sum = (k) => s.seasonLog.reduce((n, se) => n + se[k], 0);
    assert.equal(s.stats.appearances, sum('apps')); assert.equal(s.stats.goals, sum('goals')); assert.equal(s.stats.assists, sum('assists')); assert.equal(s.stats.cleanSheets, sum('cleanSheets'));
  }
});

test('tables and cups agree with what the engine decided', () => {
  const { E } = loadEngine({ stories: true, matches: true });
  let titles = 0;
  for (let i = 0; i < 30; i++) {
    const s = play(E, `TB${i}`, i, null);
    s.seasonLog.forEach((se) => {
      const m = E.seasonMatches(s, se);
      const p = m.plan;
      if (!p.lg || p.onLoan) return;
      const pos = m.table.findIndex((r) => r.key === p.playClubId) + 1;
      const won = se.trophies.some((t) => t.category === 'DOMESTIC_LEAGUE');
      if (p.lg.tier === 1) {
        if (won) { titles++; assert.equal(pos, 1, `${s.setup.seed} ${se.age} champions must finish first`); } else assert.notEqual(pos, 1, `${s.setup.seed} ${se.age} not champions`);
        if (se.events.some((e) => e.type === 'RELEGATED')) assert.ok(pos > m.table.length - 3, 'relegated clubs finish in the bottom three');
      }
      if (p.cup) {
        const cup = m.fixtures.filter((f) => f.comp === 'C');
        const last = cup[cup.length - 1];
        if (p.cup.won) { assert.equal(last.round, 'Final'); assert.ok(last.gf > last.ga); } else assert.ok(last.gf < last.ga, 'the cup run ends with a defeat');
      }
      const n = m.table.length;
      m.table.forEach((r) => assert.equal(r.p, m.lgRes.length, 'every club plays every matchday'));
    });
  }
  assert.ok(titles > 0, 'some careers win a league');
});

test('matches are deterministic, never touch the match RNG, and January never rewrites the first half', () => {
  const { E } = loadEngine({ stories: true, matches: true });
  const a = play(E, 'DET1', 3, null); const b = play(E, 'DET1', 3, null);
  E.MX_CACHE.clear();
  const ma = a.seasonLog.map((se) => JSON.stringify(E.seasonMatches(a, se).fixtures.map((f) => [f.opp.name, f.gf, f.ga, f.you && f.you.r])));
  E.MX_CACHE.clear();
  const mb = b.seasonLog.map((se) => JSON.stringify(E.seasonMatches(b, se).fixtures.map((f) => [f.opp.name, f.gf, f.ga, f.you && f.you.r])));
  assert.deepEqual(ma, mb);
  const s = E.createInitialGameState({ playerName: 'Jan Uary', position: 'ST', continent: 'EUROPE', nation: 'ENG', transferInterval: 3, retirementAge: 35, seed: 'JAN1' });
  E.RNG.holder = s;
  const ctx = E.beginWindow(s, E.generateChoices(s).offers[0]);
  for (let k = 0; k < 3; k++) {
    const se = E.simulateSeason(s, ctx);
    E.buildSeasonPlan(s, se);
    const before = E.seasonMatches(s, se).fixtures.filter((f) => !f.second).map((f) => [f.opp.name, f.gf, f.ga, f.you && [f.you.g, f.you.a, f.you.r]]);
    const rng = s.rng.s;
    const w = E.winterOptions(s, se);
    const picks = {}; w.cards.forEach((c) => { picks[c.id] = c.options[0].id; });
    E.applyWinter(s, se, ctx, picks);
    assert.equal(s.rng.s, rng, 'January uses its own random numbers');
    const after = E.seasonMatches(s, se).fixtures.filter((f) => !f.second).map((f) => [f.opp.name, f.ga, f.you && [f.you.g, f.you.a]]);
    assert.deepEqual(after.map((x) => [x[0], x[2] && x[2][0]]), before.map((x) => [x[0], x[3] && x[3][0]]), 'first-half games and goals stay as shown at the winter break');
  }
});

test('squads name the players around you consistently with your role', () => {
  const { E } = loadEngine({ stories: true, matches: true });
  for (let i = 0; i < 12; i++) {
    const s = play(E, `SQ${i}`, i, null);
    s.seasonLog.forEach((se) => {
      const q = E.squadContext(s, se);
      if (!q) return;
      const ahead = q.comp.filter((p) => p.ahead).length;
      if (se.role === 'STAR' || se.role === 'KEY_PLAYER' || se.onLoan) assert.equal(ahead, 0);
      else assert.ok(ahead >= 1 || q.sig, `${se.role} has someone ahead`);
      assert.ok(q.squad.length >= 26, 'a full squad');
      q.squad.forEach((p) => assert.ok(p.name && Number.isFinite(p.ovr)));
    });
  }
});
