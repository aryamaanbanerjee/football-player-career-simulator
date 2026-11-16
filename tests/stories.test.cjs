// Story engine tests (v7). Run: node --test tests/stories.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');

function newCareer(E, over = {}) {
  const s = E.createInitialGameState({ playerName: 'Test Player', position: 'ST', continent: 'EUROPE', nation: 'ENG', transferInterval: 2, retirementAge: 35, seed: 'STORY1', ...over });
  E.RNG.holder = s;
  return s;
}
// Plays a whole career the way Quick mode / autoplay does, with stories auto-resolved.
function playWithStories(E, s, pick = (ch) => ch.offers[0]) {
  let ch = E.applyRelationshipToChoices(s, E.generateChoices(s));
  s.pendingChoices = ch;
  E.storyOpen(s, ch.offers.length, { auto: true });
  let guard = 0;
  while (!s.isRetired && guard++ < 50) {
    const d = pick(ch, s);
    const info = E.storyWindowInfo(s, d);
    const r = E.simulateWindow(s, d);
    E.storyWindow(s, info, { auto: true });
    r.report.seasons.forEach((se) => E.storySeason(s, se, { auto: true }));
    if (r.isRetired) break;
    ch = E.applyRelationshipToChoices(s, E.generateChoices(s));
    s.pendingChoices = ch;
    E.storyOpen(s, (ch.offers || []).length, { auto: true });
  }
  E.storyRetire(s, { auto: true });
  return s;
}
const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: 'ESP', SOUTH_AMERICA: 'BRA', ASIA: 'JPN', AFRICA: 'SEN', NORTH_AMERICA: 'MEX' };

test('the library has 150+ stories with unique ids, valid checkpoints and tone', () => {
  const { E } = loadEngine({ stories: true });
  const ids = new Set();
  for (const s of E.STORIES) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`); ids.add(s.id);
    assert.ok(['open', 'window', 'season', 'retire'].includes(s.when), s.id);
    assert.ok(['warm', 'funny', 'proud', 'drama'].includes(s.tone), s.id);
    assert.equal(typeof s.if, 'function', s.id);
    if (s.choices) s.choices.forEach((c) => assert.ok(c.label && c.out, s.id));
  }
  assert.ok(E.STORIES.length >= 150, `only ${E.STORIES.length} stories`);
});

test('every flag a story needs is set by some other story', () => {
  const { E } = loadEngine({ stories: true });
  const set = new Set();
  E.STORIES.forEach((s) => { (s.sets || []).forEach((f) => set.add(f)); (s.choices || []).forEach((c) => (c.sets || []).forEach((f) => set.add(f))); });
  E.STORIES.forEach((s) => (s.needs || []).forEach((f) => assert.ok(set.has(f), `${s.id} needs ${f}, never set`)));
});

test('stories never consume the match simulator’s random numbers', () => {
  const { E } = loadEngine({ stories: true });
  const s = newCareer(E);
  const d = E.generateChoices(s).offers[0];
  const info = E.storyWindowInfo(s, d);
  const r = E.simulateWindow(s, d);
  const before = s.rng.s;
  E.storyWindow(s, info, { auto: true });
  r.report.seasons.forEach((se) => E.storySeason(s, se, { auto: true }));
  E.storyOpen(s, 3, { auto: true });
  assert.equal(s.rng.s, before);
});

test('same career code + same choices = same cast, same stories, same career', () => {
  const { E } = loadEngine({ stories: true });
  const a = playWithStories(E, newCareer(E, { seed: 'TWIN01' }));
  const b = playWithStories(E, newCareer(E, { seed: 'TWIN01' }));
  assert.deepEqual(a.story.cast, b.story.cast);
  assert.deepEqual(a.story.journal.map((e) => e.id), b.story.journal.map((e) => e.id));
  assert.deepEqual(a.seasonLog.map((x) => [x.apps, x.goals, x.rating]), b.seasonLog.map((x) => [x.apps, x.goals, x.rating]));
  const c = playWithStories(E, newCareer(E, { seed: 'TWIN02' }));
  assert.notDeepEqual(a.story.cast, c.story.cast);
});

test('every fired story is fully filled in, fires once, and stays within its limits', () => {
  const { E } = loadEngine({ stories: true });
  for (let i = 0; i < 40; i++) {
    const cont = conts[i % conts.length];
    const s0 = newCareer(E, { seed: `FILL${i}`, position: positions[i % positions.length], continent: cont, nation: nationsFor[cont], transferInterval: 1 + (i % 3), retirementAge: 33 + (i % 6) });
    s0.setup.guided = i % 2 === 0;
    const s = playWithStories(E, s0);
    const j = s.story.journal;
    const ids = j.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, 'a story fired twice');
    j.forEach((e) => {
      assert.ok(!/\{[a-zA-Z]+\}/.test(e.title + e.text + (e.outcome || '')), `${e.id} has an unfilled token: ${e.text}`);
      assert.ok(!/undefined|null|NaN/.test(e.text + (e.outcome || '')), `${e.id}: ${e.text}`);
      if (e.choices) assert.ok(e.picked != null && e.outcome, `${e.id} left unresolved`);
    });
    const perSeason = {};
    j.filter((e) => e.when === 'season').forEach((e) => { perSeason[e.age] = (perSeason[e.age] || 0) + 1; });
    Object.values(perSeason).forEach((n) => assert.ok(n <= 2));
    assert.ok(j.some((e) => e.id === 'END-09'), 'retirement always asks what next');
    Object.values(s.story.aff).forEach((v) => assert.ok(v >= -3 && v <= 3));
    assert.ok(Math.abs(s.story.form) <= 0.05);
  }
});

test('v6 saves migrate to the current version and pick up a story on the next window', () => {
  const { E } = loadEngine({ stories: true });
  const s = newCareer(E, { seed: 'MIG7' });
  E.simulateWindow(s, E.generateChoices(s).offers[0]);
  const v6 = JSON.parse(JSON.stringify(s)); delete v6.story; v6.version = 6;
  const m = E.migrateState(v6, 6);
  assert.equal(m.version, 14);
  E.RNG.holder = m;
  playWithStories(E, m);
  assert.equal(m.isRetired, true);
  assert.ok(m.story.journal.length > 0);
});

/* ---------------- v8 ---------------- */
test('v8: 200+ stories, every one has a rarity, variants keep their tokens valid', () => {
  const { E } = loadEngine({ stories: true });
  const lib = E.STORIES.filter((x) => !x.custom);
  assert.ok(lib.length >= 200, `only ${lib.length}`);
  lib.forEach((x) => assert.ok(['c', 'u', 'r', 'l'].includes(E.storyRarity(x.id)), `${x.id} has no rarity`));
});

test('v8: the best mate and the protege have deterministic careers that never touch the match RNG', () => {
  const { E } = loadEngine({ stories: true });
  const a = playWithStories(E, newCareer(E, { seed: 'MATE01', retirementAge: 36 }));
  const b = playWithStories(E, newCareer(E, { seed: 'MATE01', retirementAge: 36 }));
  assert.deepEqual(a.story.mate.seasons, b.story.mate.seasons);
  assert.equal(a.story.mate.seasons.length, a.story.mate.retiredAge - 16, 'one season per year until he retires');
  assert.ok(a.story.mate.retired, 'the mate retires before a 36-year-old');
  const s = newCareer(E, { seed: 'MATE02' });
  const d = E.generateChoices(s).offers[0];
  const r = E.simulateWindow(s, d);
  const before = s.rng.s;
  r.report.seasons.forEach((se) => E.storySeason(s, se, { auto: true }));
  assert.equal(s.rng.s, before);
});

test('v8: headlines, where-are-they-now, promises and reputation are fully written', () => {
  const { E } = loadEngine({ stories: true });
  for (let i = 0; i < 25; i++) {
    const cont = conts[i % conts.length];
    const s = playWithStories(E, newCareer(E, { seed: `WN${i}`, position: positions[i % 8], continent: cont, nation: nationsFor[cont] }));
    assert.equal(s.story.headlines.length, s.seasonLog.length);
    const all = [...s.story.headlines.map((h) => h.text), ...E.whereNow(s).map((w) => w.line), ...E.promisesSummary(s).map((p) => p.text + p.owed), E.reputationLine(s)];
    all.forEach((t) => assert.ok(!/\{[a-zA-Z]+\}|undefined|NaN|null/.test(t), t));
    assert.ok(E.whereNow(s).length >= 8);
    assert.ok(E.storyJournalText(s).includes('Where are they now'));
  }
});

test('v8: a trusted agent improves wages once; relationships are capped', () => {
  const { E } = loadEngine({ stories: true });
  const s = newCareer(E, { seed: 'AGENT1' });
  E.ensureStory(s).aff.agent = 2;
  const ch = E.generateChoices(s);
  const w0 = ch.offers.map((o) => o.wageM);
  E.applyRelationshipToChoices(s, ch);
  E.applyRelationshipToChoices(s, ch);
  ch.offers.forEach((o, i) => assert.ok(Math.abs(o.wageM - w0[i] * 1.06) < 0.002, 'applied exactly once'));
  assert.ok(ch.offers.every((o) => /better wage/.test(o.agentNote)));
});

test('v8: custom-story triggers are safe on every checkpoint context', () => {
  const { E } = loadEngine({ stories: true });
  const fake = { rnd: () => true, trophies: 1, injured: true, first: true, total: 3, rating: 7.6, age: 30 };
  Object.values(E.CUSTOM_TRIGGERS).forEach((t) => assert.equal(typeof t.test(fake, { age: 25 }), 'boolean'));
});
