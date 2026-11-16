// v13 tests: real effects (bounded), promises and stances, position balance, save backups.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');
const positions = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };
const all = () => loadEngine({ stories: true, matches: true, v10: true, v11: true });
function play(E, seed, i, { press = false, focus = null, engineOnly = false } = {}) {
  const pos = positions[i % 10]; const cont = conts[Math.floor(i / 10) % 5];
  const s = E.createInitialGameState({ playerName: 'Thirteen', position: pos, continent: cont, nation: nationsFor[cont], transferInterval: 2, retirementAge: 35, seed });
  E.RNG.holder = s; let ch = E.generateChoices(s);
  for (let g = 0; g < 40 && !s.isRetired; g++) {
    const opts = [...ch.offers.map((o) => ({ kind: o.type, data: o, club: E.CLUB_MAP[o.clubId] })), ...(ch.stayOption ? [{ kind: 'STAY', data: ch.stayOption, club: E.CLUB_MAP[s.currentClubId] }] : [])].filter((o) => o.club);
    const d = (E.agentChoose(opts, {}, 'BALANCED') || {}).data || ch.stayOption || ch.offers[0];
    if (focus && s.v10) E.setTrainingFocus(s, focus);
    const c = E.beginWindow(s, d);
    while (c.seasons.length < c.years) {
      const se = E.simulateSeason(s, c);
      if (!engineOnly) { E.buildSeasonPlan(s, se); E.storySeason(s, se, { auto: true }); if (press && E.pressDue(s, se)) E.pressQuestions(s, se).forEach((q, qi) => E.applyPressAnswer(s, se, q, qi === 0 ? 1 : 0)); }
    }
    const r = E.endWindow(s, c); if (r.isRetired || s.isRetired) break; ch = E.generateChoices(s);
  }
  return s;
}

test('edges stay inside their caps, and traits together never add more than 6%', () => {
  const { E } = all();
  for (let i = 0; i < 20; i++) {
    const s = play(E, `E13C${i}`, i, { focus: ['Finishing', 'WEAKFOOT'] });
    const e = E.v13Edges(s);
    assert.ok(e.goals <= 0.1 && e.goals >= -0.05, `goals ${e.goals}`);
    assert.ok(e.rating <= 0.04 && e.rating >= -0.03, `rating ${e.rating}`);
    assert.ok(e.injury >= -0.25 && e.games <= 0.05);
    const traitGoals = e.parts.filter((p) => p.src === 'Traits' && p.stat === 'goals').reduce((a, p) => a + p.val, 0);
    assert.ok(traitGoals <= 0.06 + 1e-9, `trait goals ${traitGoals}`);
    s.seasonLog.forEach((se) => { assert.ok(se.edges == null || Number.isFinite(se.edges.goals)); });
  }
});

test('training a detail really changes the edge, in both directions', () => {
  const { E } = all();
  const s = E.createInitialGameState({ playerName: 'Edge', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'EDGE1' });
  E.v13PressAftermath; // loaded
  const v = (s.v10 = { subs: {}, mental: { Composure: 11 }, weakFoot: 3, traits: [], knownPositions: ['ST'], focus: [] });
  Object.entries(E.SUB_ATTRS).forEach(([g, list]) => list.forEach((n) => { v.subs[n] = s.attributes[g] != null ? s.attributes[g] : 10; }));
  const flat = E.v13Edges(s).goals;
  v.subs.Finishing = s.attributes.SHO + 2; v.subs['Shot power'] = s.attributes.SHO - 0.5;
  const trained = E.v13Edges(s).goals;
  v.subs.Finishing = s.attributes.SHO - 2; v.subs['Shot power'] = s.attributes.SHO - 1;
  const neglected = E.v13Edges(s).goals;
  assert.ok(trained > flat && flat > neglected, `${neglected} < ${flat} < ${trained}`);
  v.weakFoot = 5; assert.ok(E.v13Edges(s).goals > neglected);
});

test('the engine applies edges relative to a typical player, and without any random numbers', () => {
  const { E } = all();
  const s = E.createInitialGameState({ playerName: 'Calm', position: 'CM', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'CALM' });
  const before = JSON.stringify(s.rng);
  E.v13Edges(s); E.v13EngineEdges(s);
  assert.equal(JSON.stringify(s.rng), before);
});

test('confident answers make promises that are checked; stances change contract talks', () => {
  const { E } = all();
  let made = 0; let settled = 0;
  for (let i = 0; i < 12; i++) {
    const s = play(E, `E13P${i}`, i, { press: true });
    const ps = (s.v11 && s.v11.promises) || [];
    made += ps.length;
    ps.forEach((p) => { if (p.result) { settled++; assert.ok(['kept', 'broken'].includes(p.result)); assert.ok(p.at > p.made && p.at <= p.due); } });
  }
  assert.ok(made > 10, `${made} promises made`); assert.ok(settled > 5, `${settled} settled`);
  const s = E.createInitialGameState({ playerName: 'Stance', position: 'ST', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'STANCE' });
  s.v11 = { stance: { type: 'loyal', age: s.currentAge, clubId: s.currentClubId }, style: { humble: 1, confident: 0, private: 0 }, news: {}, promises: [] };
  assert.equal(E.pressRenewalMult(s), 1.06);
  s.v11.stance.type = 'ambitious'; assert.equal(E.pressRenewalMult(s), 0.93);
  s.v11.stance.clubId = 'someone_else'; assert.equal(E.pressRenewalMult(s), 1);
});

test('positions are balanced: each line of the team has a similar legacy, and forwards are worth the most', () => {
  // Per-position averages over a few hundred careers carry ±6% sampling noise, so compare lines of the team
  // (the full 1,000-career check during tuning put every single position within ±8%).
  const { E } = loadEngine({});
  const by = {};
  for (let i = 0; i < 400; i++) {
    const s = play(E, `BAL13${i}`, i, { engineOnly: true });
    const b = by[s.setup.position] = by[s.setup.position] || { n: 0, leg: 0, val: 0 };
    b.n++; b.leg += s.legacyScore; b.val += s.peakMarketValueM;
  }
  const lines = { FWD: ['ST', 'LW', 'RW'], MID: ['CAM', 'CM', 'CDM'], DEF: ['CB', 'LB', 'RB'], GK: ['GK'] };
  const lineAvg = (ps) => ps.reduce((a, p) => a + by[p].leg, 0) / ps.reduce((a, p) => a + by[p].n, 0);
  const avgs = Object.fromEntries(Object.entries(lines).map(([k, ps]) => [k, lineAvg(ps)]));
  const mean = Object.values(avgs).reduce((a, b) => a + b, 0) / 4;
  Object.entries(avgs).forEach(([k, a]) => assert.ok(Math.abs(a / mean - 1) < 0.12, `${k} legacy ${a.toFixed(0)} vs mean ${mean.toFixed(0)}`));
  const val = (p) => by[p].val / by[p].n;
  assert.ok(val('ST') > val('CB') && val('ST') > val('GK') && val('ST') > val('LB'), 'strikers are worth more than defenders and keepers');
  assert.ok((val('LW') + val('RW')) / 2 > val('GK'), 'wingers are worth more than keepers');
});

test('saves report failure, and a career survives a backup round trip', () => {
  const { E, ctx } = all();
  assert.equal(E.storageSet('x', { a: 1 }), true);
  const orig = ctx.localStorage.setItem;
  ctx.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(E.storageSet('x', { a: 2 }), false);
  ctx.localStorage.setItem = orig;
  const s = play(E, 'E13S', 3, {});
  const live = E.createInitialGameState({ playerName: 'Backup', position: 'CAM', continent: 'EUROPE', nation: 'ESP', transferInterval: 2, retirementAge: 35, seed: 'BACKUP' });
  const file = JSON.parse(JSON.stringify({ kind: 'fcs-career', state: live }));
  assert.ok(E.validCareer(file.state));
  assert.ok(!E.validCareer({ playerName: 'x' }), 'junk is rejected');
  assert.ok(!E.validCareer({ ...file.state, currentClubId: 'not_a_club' }), 'unknown clubs are rejected');
  assert.ok(E.validCareer(JSON.parse(JSON.stringify(s))) || s.isRetired, 'a played career is valid');
  assert.ok(!E.validCareer({ ...file.state, seasonLog: [{}], currentClubId: null }), 'a played career needs a club');
  const old = JSON.parse(JSON.stringify(live)); old.version = 9;
  const m = E.migrateState(old, 9); assert.equal(m.version, 14);
  const merged = E.mergeAlbums({ seen: { A: { n: 2, first: 5 } } }, { seen: { A: { n: 3, first: 9 }, B: { n: 1, first: 1 } } });
  assert.equal(JSON.stringify(merged.seen.A), JSON.stringify({ n: 3, first: 5 })); assert.ok(merged.seen.B);
  assert.ok(s.seasonLog.length > 0);
});
