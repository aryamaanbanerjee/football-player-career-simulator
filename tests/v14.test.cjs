// v14 tests: difficulty levels, stable projections, migration.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');
const positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };
function play(E, seed, i, difficulty) {
  const pos = positions[i % 10]; const cont = conts[Math.floor(i / 10) % 5];
  const s = E.createInitialGameState({ playerName: 'Fourteen', position: pos, continent: cont, nation: nationsFor[cont], transferInterval: 2, retirementAge: 35, seed });
  if (difficulty) s.setup.difficulty = difficulty;
  E.RNG.holder = s; let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    const d = ch.offers[(i + g) % Math.max(1, ch.offers.length)] || ch.stayOption;
    const c = E.beginWindow(s, d);
    while (c.seasons.length < c.years) E.simulateSeason(s, c);
    const r = E.endWindow(s, c); if (r.isRetired || s.isRetired) break; ch = E.generateChoices(s);
  }
  return s;
}

test('Normal difficulty is exactly the game without a difficulty set', () => {
  const { E } = loadEngine({});
  for (let i = 0; i < 20; i++) {
    const a = play(E, `N14${i}`, i, null); const b = play(E, `N14${i}`, i, 'NORMAL');
    assert.equal(JSON.stringify([a.legacyScore, a.stats, a.seasonLog.map((x) => x.rating)]), JSON.stringify([b.legacyScore, b.stats, b.seasonLog.map((x) => x.rating)]));
  }
});

test('Relaxed is kinder and Ambitious harder, on average', () => {
  const { E } = loadEngine({});
  const avg = {};
  ['RELAXED', 'NORMAL', 'AMBITIOUS'].forEach((lvl) => {
    let leg = 0; let inj = 0; let apps = 0; const N = 120;
    for (let i = 0; i < N; i++) { const s = play(E, `D14${i}`, i, lvl); leg += s.legacyScore; apps += s.stats.appearances; inj += s.seasonLog.filter((x) => x.injured).length / s.seasonLog.length; }
    avg[lvl] = { leg: leg / N, inj: inj / N, apps: apps / N };
  });
  assert.ok(avg.RELAXED.leg > avg.NORMAL.leg && avg.NORMAL.leg > avg.AMBITIOUS.leg, JSON.stringify(avg));
  assert.ok(avg.RELAXED.inj < avg.NORMAL.inj && avg.NORMAL.inj < avg.AMBITIOUS.inj, 'injury rates follow difficulty');
  assert.ok(avg.RELAXED.apps > avg.AMBITIOUS.apps, 'more games when managers are patient');
  // Not a different game: within about a fifth of Normal either way.
  assert.ok(avg.RELAXED.leg / avg.NORMAL.leg < 1.22 && avg.AMBITIOUS.leg / avg.NORMAL.leg > 0.78);
});

test('fans react harder on Ambitious and softer on Relaxed', () => {
  const { E } = loadEngine({});
  const s = E.createInitialGameState({ playerName: 'Mood', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'MOOD14' });
  const club = 'arsenal';
  const run = (lvl) => { s.setup.difficulty = lvl; s.fanMood = { [club]: 50 }; E.adjustMood(s, club, -10); return E.moodOf(s, club); };
  assert.equal(run('NORMAL'), 40); assert.equal(run('RELAXED'), 44); assert.equal(run('AMBITIOUS'), 37);
});

test('projections are stable: the same offer gives the same estimate, and the career is untouched', () => {
  const { E } = loadEngine({});
  const s = E.createInitialGameState({ playerName: 'Proj', position: 'CM', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'PROJ14' });
  E.RNG.holder = s;
  const ch = E.generateChoices(s);
  const d = ch.offers[0];
  const before = JSON.stringify(s);
  const a = JSON.stringify(E.projectDecision(s, d)); const b = JSON.stringify(E.projectDecision(s, d));
  assert.equal(a, b);
  assert.equal(JSON.stringify(s), before);
  if (ch.offers[1]) assert.notEqual(JSON.stringify(E.projectDecision(s, ch.offers[1])), a, 'different offers get their own estimates');
});

test('saves from v13 become v14 with Normal difficulty', () => {
  const { E } = loadEngine({});
  const s = E.createInitialGameState({ playerName: 'Old', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'OLD14' });
  const raw = JSON.parse(JSON.stringify(s)); delete raw.setup.difficulty; raw.version = 13;
  const m = E.migrateState(raw, 13);
  assert.equal(m.version, 14); assert.equal(m.setup.difficulty, 'NORMAL');
});
