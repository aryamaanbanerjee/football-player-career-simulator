// v11 living-world, press and sponsor tests. Run: node --test tests/v11.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');

const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };

// Plays a career the way the app does; optionally answers press and picks sponsors.
function play(E, seed, i, { press, sponsor, rngCheck } = {}) {
  const cont = conts[i % 5];
  const s = E.createInitialGameState({ playerName: 'Eleven Tester', position: positions[i % 8], continent: cont, nation: nationsFor[cont], transferInterval: 1 + (i % 3), retirementAge: 33 + (i % 5), seed });
  E.RNG.holder = s;
  let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    const d = ch.offers[(i + g) % Math.max(1, ch.offers.length)] || ch.stayOption;
    const info = E.storyWindowInfo(s, d);
    const ctx = E.beginWindow(s, d);
    while (ctx.seasons.length < ctx.years) E.simulateSeason(s, ctx);
    const r = E.endWindow(s, ctx);
    const before = s.rng ? s.rng.s : null;
    E.storyWindow(s, info, { auto: true });
    ctx.seasons.forEach((se) => {
      E.storySeason(s, se, { auto: true });
      if (press) E.pressQuestions(s, se).forEach((q, qi) => E.applyPressAnswer(s, se, q, (qi + se.age) % 3));
      if (sponsor && s.v11.offers) E.acceptSponsor(s, (se.age + i) % 3);
    });
    if (rngCheck) assert.equal(s.rng ? s.rng.s : null, before, 'world, press and sponsors must not use the engine’s random numbers');
    if (r.isRetired || s.isRetired) break;
    ch = E.generateChoices(s);
  }
  return s;
}
const all = () => loadEngine({ stories: true, matches: true, v10: true, v11: true });

test('the world agrees with your own results', () => {
  const { E } = all();
  for (let i = 0; i < 16; i++) {
    const s = play(E, `W11A${i}`, i, { rngCheck: true });
    const w = s.v11;
    s.seasonLog.forEach((se) => {
      const ch = w.champions[se.age];
      assert.ok(ch, `champions recorded at ${se.age}`);
      Object.keys(E.LEAGUES).forEach((lg) => { if (E.CLUBS.some((c) => c.league === lg)) assert.ok(ch[lg], `${lg} has a champion`); });
      // If you won your league, you are the champion; if you didn't, you aren't.
      const wonLeague = se.trophies.find((t) => t.category === 'DOMESTIC_LEAGUE');
      if (wonLeague && !se.onLoan) assert.equal(ch[se.league], se.clubId, `league title at ${se.age}`);
      const cont = Object.values(w.contChamps[se.age]);
      const wonCont = se.trophies.some((t) => t.category === 'CONTINENTAL');
      if (wonCont) assert.ok(cont.some((c) => c.clubId === se.clubId), 'continental winner is you');
      // Ballon d'Or podium: five distinct names, you at your rank, your win respected.
      const pod = w.ballon[se.age];
      assert.equal(pod.length, 5);
      assert.equal(new Set(pod.map((p) => p.name)).size, 5);
      if (se.ballonDor) assert.ok(pod[0].you);
      else assert.ok(!pod[0].you);
      if (se.bdRank && se.bdRank <= 5 && !se.ballonDor) assert.ok(pod[se.bdRank - 1].you, `you at ${se.bdRank}`);
    });
    const live = w.stars.filter((x) => !x.retired);
    assert.equal(live.length, 16, 'always sixteen active world stars');
    const names = w.stars.map((x) => x.name);
    assert.ok(!names.includes(s.playerName) && !names.includes(s.rival.name), 'stars never share your or your rival’s name');
  }
});

test('world stars age, move and retire sensibly', () => {
  const { E } = all();
  let moves = 0; let retired = 0; let records = 0;
  for (let i = 0; i < 12; i++) {
    const s = play(E, `W11S${i}`, i);
    const w = s.v11;
    w.stars.forEach((st) => {
      st.seasons.forEach((q) => { assert.ok(q.a >= 17 && q.a <= 38, `age ${q.a}`); assert.ok(q.rating >= 6.2 && q.rating <= 8.7); });
      if (st.retired) { retired++; assert.ok(st.retiredAge >= 33 && st.retiredAge <= 38); }
      moves += st.moves.length - 1;
      st.moves.slice(1).forEach((m) => assert.ok(m.feeM >= 8 && m.feeM <= 260));
    });
    if (w.record.name) records++;
  }
  assert.ok(moves > 20, `${moves} moves`); assert.ok(retired > 5, `${retired} retirements`);
});

test('press answers move fans and profile a little, and only once per question', () => {
  const { E } = all();
  for (let i = 0; i < 8; i++) {
    const s = play(E, `W11P${i}`, i, { press: true });
    const w = s.v11;
    assert.ok(w.press.length >= s.seasonLog.length, 'at least one answer per season');
    const keys = w.press.map((p) => `${p.age}|${p.q}`);
    assert.equal(new Set(keys).size, keys.length, 'no question answered twice');
    w.press.forEach((p) => { assert.ok(p.head && p.say && p.journo); assert.ok(!/\{[a-zA-Z]+\}/.test(p.say + p.head + p.question), 'no unfilled tokens'); });
    assert.equal(w.style.humble + w.style.confident + w.style.private, w.press.length);
    assert.ok(w.profile >= 1 && w.profile <= 100);
    assert.ok(E.mediaImage(w).label);
  }
});

test('sponsors pay into earnings and the money still adds up', () => {
  const { E } = all();
  let paid = 0;
  for (let i = 0; i < 14; i++) {
    const s = play(E, `W11M${i}`, i, { sponsor: true });
    const w = s.v11;
    s.seasonLog.forEach((se) => {
      const m = se.money;
      const sum = Object.values(m.parts).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - m.gross) < 0.01);
      assert.ok(Math.abs(m.parts.sponsors - (se.sponsor ? se.sponsor.total : 0)) < 0.001);
      if (m.parts.sponsors > 0) paid++;
      assert.ok(E.activeSponsors(w, se.age).length <= 3, 'at most three deals');
      assert.ok(E.activeSponsors(w, se.age).filter((d) => d.cat === 'boots').length <= 1, 'one boot deal at a time');
    });
    w.sponsors.forEach((d) => assert.ok(d.baseM > 0 && d.years >= 2 && d.brand));
  }
  assert.ok(paid > 20, `${paid} seasons with sponsor income`);
});

test('the world is deterministic for a career code', () => {
  const { E } = all();
  for (let i = 0; i < 5; i++) {
    E.MX_CACHE.clear();
    const a = JSON.stringify(play(E, `W11D${i}`, i, { press: true, sponsor: true }).v11);
    E.MX_CACHE.clear();
    const b = JSON.stringify(play(E, `W11D${i}`, i, { press: true, sponsor: true }).v11);
    assert.equal(a, b);
  }
});

test('press is off at Light and in quick mode, every season at Full', () => {
  const { E } = all();
  const s = E.createInitialGameState({ playerName: 'Detail', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 1, retirementAge: 35, seed: 'DETAIL' });
  const se = { age: 20, trophies: [], rating: 7.0, apps: 30, goals: 8 };
  s.setup.detail = 'LIGHT'; assert.equal(E.pressDue(s, se), false);
  s.setup.detail = 'STANDARD'; assert.equal(!!E.pressDue(s, se), false);
  assert.equal(!!E.pressDue(s, { ...se, rating: 7.95 }), true);
  s.setup.detail = 'FULL'; assert.equal(E.pressDue(s, se), true);
  s.setup.mode = 'QUICK'; assert.equal(E.pressDue(s, se), false);
});
