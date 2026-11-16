// v10 player-detail and contract tests. Run: node --test tests/v10.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');

const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };

// Plays a career the way the app does: the engine plays the window, then the window hook, then each season's hooks.
function play(E, seed, i, { focus, rngCheck } = {}) {
  const cont = conts[i % 5];
  const s = E.createInitialGameState({ playerName: 'Ten Tester', position: positions[i % 8], continent: cont, nation: nationsFor[cont], transferInterval: 1 + (i % 3), retirementAge: 33 + (i % 5), seed });
  E.RNG.holder = s;
  let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    if (focus) focus(s, g);
    const d = ch.offers[(i + g) % Math.max(1, ch.offers.length)] || ch.stayOption;
    const info = E.storyWindowInfo(s, d);
    const ctx = E.beginWindow(s, d);
    while (ctx.seasons.length < ctx.years) E.simulateSeason(s, ctx);
    const r = E.endWindow(s, ctx);
    const before = s.rng ? s.rng.s : null;
    E.storyWindow(s, info, { auto: true });
    ctx.seasons.forEach((se) => E.storySeason(s, se, { auto: true }));
    if (rngCheck) assert.equal(s.rng ? s.rng.s : null, before, 'the v10, story and match layers must not use the engine’s random numbers');
    if (r.isRetired || s.isRetired) break;
    ch = E.generateChoices(s);
  }
  return s;
}

test('detailed attributes always average to the engine’s six values', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  for (let i = 0; i < 16; i++) {
    const s = play(E, `V10A${i}`, i, { rngCheck: true });
    const v = s.v10;
    assert.ok(v, 'v10 layer exists');
    E.attrKeysFor(s.setup.position).forEach((g) => {
      const names = E.SUB_ATTRS[g];
      const avg = names.reduce((a, n) => a + v.subs[n], 0) / names.length;
      assert.ok(Math.abs(avg - s.attributes[g]) < 0.15, `${g}: ${avg.toFixed(2)} vs ${s.attributes[g].toFixed(2)} (${s.setup.position})`);
      names.forEach((n) => assert.ok(v.subs[n] >= 1 && v.subs[n] <= 20, `${n} in range`));
    });
    E.MENTAL_ATTRS.forEach((n) => assert.ok(v.mental[n] >= 1 && v.mental[n] <= 20));
    assert.ok(v.weakFoot >= 2 && v.weakFoot <= 5);
    assert.ok(['Left', 'Right'].includes(v.foot));
  }
});

test('every season has money that adds up, and tax is applied', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  for (let i = 0; i < 16; i++) {
    const s = play(E, `V10M${i}`, i);
    assert.equal(s.v10.money.length, s.seasonLog.length, 'one money entry per season');
    s.seasonLog.forEach((se) => {
      const m = se.money;
      assert.ok(m, `age ${se.age} has money`);
      const sum = Object.values(m.parts).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - m.gross) < 0.01, 'parts add up to gross');
      assert.ok(Math.abs(m.gross - m.tax - m.net) < 0.01, 'net is gross minus tax');
      assert.ok(m.taxRate >= 0 && m.taxRate <= 55);
      assert.ok(m.parts.wage > 0);
      Object.values(m.parts).forEach((x) => assert.ok(x >= 0));
    });
    s.v10.clauses.forEach((c) => assert.ok(['sellon', 'buyback', 'loanoption'].includes(c.type) && E.CLUB_MAP[c.clubId]));
  }
});

test('injured seasons get an injury type and recovery time', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  let seen = 0;
  for (let i = 0; i < 20; i++) {
    const s = play(E, `V10I${i}`, i);
    s.seasonLog.filter((se) => se.injured).forEach((se) => {
      seen++;
      assert.ok(se.injury && se.injury.name && se.injury.weeks >= 2, `age ${se.age} injury described`);
      if (s.setup.position !== 'GK') assert.notEqual(se.injury.id, 'shoulder');
    });
  }
  assert.ok(seen > 0, 'some injuries happened');
});

test('the v10 layer is deterministic', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  for (let i = 0; i < 6; i++) {
    E.MX_CACHE.clear();
    const a = JSON.stringify(play(E, `V10D${i}`, i).v10);
    E.MX_CACHE.clear();
    const b = JSON.stringify(play(E, `V10D${i}`, i).v10);
    assert.equal(a, b);
  }
});

test('learning a position with training unlocks it, and switching keeps the career running', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  let learned = 0; let switched = 0;
  for (let i = 0; i < 14; i++) {
    if (positions[i % 8] === 'GK') continue;
    const s = play(E, `V10P${i}`, i, {
      focus: (st, g) => {
        if (!st.v10 && g === 0) return;
        const v = E.ensureV10(st);
        const target = E.trainingTargets(st).find((t) => t.id.startsWith('POS:'));
        if (target) E.setTrainingFocus(st, [target.id, 'WEAKFOOT']);
        const other = v.knownPositions.find((p) => p !== st.setup.position);
        if (other && !v.positionHistory) { assert.ok(E.switchPosition(st, other)); switched++; }
      },
    });
    if (s.v10.knownPositions.length > 1) learned++;
    if (s.v10.positionHistory) {
      assert.ok(s.setup.originalPosition, 'original position kept for the career code');
      assert.equal(E.parseCareerCode(E.careerCode(s.setup)).position, s.setup.originalPosition);
    }
  }
  assert.ok(learned >= 6, `positions learned in ${learned} careers`);
  assert.ok(switched >= 3, `switched in ${switched} careers`);
});

test('a recent injury raises injury risk a little, then it fades', () => {
  const { E } = loadEngine({ stories: true, matches: true, v10: true });
  const s = E.createInitialGameState({ playerName: 'Risk', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 1, retirementAge: 35, seed: 'RISK' });
  const v = E.ensureV10(s);
  assert.equal(E.injuryRiskMult(s), 1);
  v.injuries.push({ age: s.currentAge, id: 'calf', name: 'Calf strain', weeks: 5 });
  assert.ok(E.injuryRiskMult(s) > 1 && E.injuryRiskMult(s) < 1.2);
  s.currentAge += 3;
  assert.equal(E.injuryRiskMult(s), 1);
});
