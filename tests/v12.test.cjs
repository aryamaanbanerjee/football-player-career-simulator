// v12 tests: one earnings figure, press variety, migration defaults, story depth once per season.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');
const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };
const all = () => loadEngine({ stories: true, matches: true, v10: true, v11: true });
// Career-mode order: each season is simulated, then the review's depth step, then the story checkpoint (which repeats it).
function play(E, seed, i, { press = false, detail = 'FULL' } = {}) {
  const cont = conts[i % 5];
  const s = E.createInitialGameState({ playerName: 'Twelve Tester', position: positions[i % 8], continent: cont, nation: nationsFor[cont], transferInterval: 1 + (i % 3), retirementAge: 33 + (i % 5), seed });
  s.setup.detail = detail;
  E.RNG.holder = s;
  let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    const d = ch.offers[(i + g) % Math.max(1, ch.offers.length)] || ch.stayOption;
    const info = E.storyWindowInfo(s, d);
    E.storyWindow(s, info, { auto: true });
    const ctx = E.beginWindow(s, d);
    while (ctx.seasons.length < ctx.years) {
      const se = E.simulateSeason(s, ctx);
      E.buildSeasonPlan(s, se);
      E.storySeason(s, se, { auto: true });
      if (press && E.pressDue(s, se)) E.pressQuestions(s, se).forEach((q, qi) => E.applyPressAnswer(s, se, q, (qi + se.age) % 3));
    }
    const r = E.endWindow(s, ctx);
    if (r.isRetired || s.isRetired) break;
    ch = E.generateChoices(s);
  }
  return s;
}

test('one career-earnings figure: the sum of every season’s gross, used by the Hall of Fame too', () => {
  const { E, store } = all();
  for (let i = 0; i < 10; i++) {
    const s = play(E, `T12E${i}`, i);
    assert.ok(s.isRetired);
    const sum = s.seasonLog.reduce((a, se) => a + se.money.gross, 0);
    assert.ok(Math.abs(E.careerEarnings(s) - sum) < 0.02, `${E.careerEarnings(s)} vs ${sum}`);
    assert.ok(E.careerEarningsNet(s) <= E.careerEarnings(s));
    assert.ok(E.careerEarnings(s) >= s.stats.careerEarningsM * 0.95, 'gross is never below wages');
  }
  const hof = JSON.parse(store[Object.keys(store).find((k) => /hall_of_fame/.test(k))] || '[]');
  assert.ok(hof.length >= 1);
  hof.forEach((h) => assert.ok(h.earningsM > 0));
});

test('older saves without a money breakdown fall back to wages', () => {
  const { E } = all();
  const s = play(E, 'T12OLD', 3);
  s.seasonLog.forEach((se) => { delete se.money; });
  assert.ok(Math.abs(E.careerEarnings(s) - s.stats.careerEarningsM) < 0.05);
});

test('press conferences vary: cooldowns hold and the generic question is rare', () => {
  const { E } = all();
  const COOL = { rival: 4, next: 3, young: 3, veteran: 3, captain: 5 };
  let total = 0; let breaks = 0; const count = {};
  for (let i = 0; i < 16; i++) {
    const s = play(E, `T12P${i}`, i, { press: true });
    const press = s.v11.press;
    total += press.length;
    press.forEach((p) => { count[p.q] = (count[p.q] || 0) + 1; });
    Object.entries(COOL).forEach(([id, n]) => {
      const ages = press.filter((p) => p.q === id).map((p) => p.age);
      for (let k = 1; k < ages.length; k++) if (ages[k] - ages[k - 1] < n) breaks++;
    });
    press.forEach((p) => assert.ok(!/\{[a-zA-Z]+\}|undefined/.test(p.question + p.say + p.head), `clean text: ${p.question}`));
  }
  assert.ok(breaks / total < 0.06, `cooldown broken ${breaks} times in ${total} answers (only when nothing fresh fits)`);
  assert.ok((count.next || 0) / total < 0.2, `generic question share ${((count.next || 0) / total).toFixed(2)}`);
  assert.ok((count.rival || 0) / total < 0.2, `rival question share ${((count.rival || 0) / total).toFixed(2)}`);
  assert.ok(Object.keys(count).length >= 10, `${Object.keys(count).length} kinds of question`);
});

test('the season depth step runs once per season, so your best mate’s season survives the story checkpoint', () => {
  const { E } = all();
  const s = play(E, 'T12MATE', 2);
  const ages = s.story.depthDone;
  assert.equal(new Set(ages).size, ages.length);
  assert.equal(ages.length, s.seasonLog.length);
  const mateAges = s.story.mate.seasons.map((x) => x.age);
  assert.equal(new Set(mateAges).size, mateAges.length, 'no duplicate mate seasons');
});

test('every migrated save has a detail level', () => {
  const { E } = all();
  const s = E.createInitialGameState({ playerName: 'Old', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'OLDSAVE' });
  const raw = JSON.parse(JSON.stringify(s)); delete raw.setup.detail; raw.version = 11;
  const m = E.migrateState(raw, 11);
  assert.equal(m.version, 14); assert.equal(m.setup.detail, 'STANDARD');
});
