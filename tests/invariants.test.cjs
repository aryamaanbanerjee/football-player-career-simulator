// Engine invariant tests. Run: node --test tests/
// Each test plays real careers through the engine and checks a rule from the design doc.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadEngine } = require('./load-engine.cjs');

function newCareer(E, over = {}) {
  const s = E.createInitialGameState({ playerName: 'Test', position: 'ST', continent: 'EUROPE', nation: 'ENG', transferInterval: 2, retirementAge: 35, seed: 'TEST01', ...over });
  E.RNG.holder = s;
  return s;
}
function playCareer(E, s, pick = (ch) => ch.offers[0]) {
  let ch = E.generateChoices(s);
  const reports = [];
  let guard = 0;
  while (!s.isRetired && guard++ < 50) {
    const r = E.simulateWindow(s, pick(ch, s));
    reports.push(r.report);
    if (r.isRetired) break;
    ch = E.generateChoices(s);
  }
  return reports;
}
const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];

test('every career retires exactly at the target age with one season record per year (Rules 1 & 13)', () => {
  const { E } = loadEngine();
  for (let k = 0; k < 60; k++) {
    const cont = conts[k % 5];
    const s = newCareer(E, { position: positions[k % 8], continent: cont, nation: E.NATIONS[cont][0].id, transferInterval: 1 + (k % 3), retirementAge: 30 + (k % 13), seed: `R${k}` });
    playCareer(E, s, (ch) => (ch.stayOption && k % 2 ? ch.stayOption : ch.offers[k % ch.offers.length]));
    assert.equal(s.isRetired, true);
    assert.equal(s.currentAge, s.setup.retirementAge);
    assert.equal(s.seasonLog.length, s.setup.retirementAge - 17);
    assert.equal(s.contractYearsRemaining, 0);
  }
});

test('a club never wins the league and gets relegated in the same season', () => {
  const { E } = loadEngine();
  for (let k = 0; k < 80; k++) {
    const s = newCareer(E, { seed: `L${k}`, position: positions[k % 8] });
    playCareer(E, s, (ch) => [...ch.offers].sort((a, b) => a.starRating - b.starRating)[0]);
    s.seasonLog.forEach((se) => {
      const wonLeague = se.trophies.some((t) => t.category === 'DOMESTIC_LEAGUE');
      const relegated = se.events.some((e) => e.type === 'RELEGATED');
      assert.ok(!(wonLeague && relegated), `season ${se.season} had both`);
    });
  }
});

test("continental cups are named after the club's confederation, not the player's", () => {
  const { E } = loadEngine();
  for (let k = 0; k < 60; k++) {
    const s = newCareer(E, { seed: `C${k}`, continent: 'EUROPE', nation: 'FRA' });
    playCareer(E, s, (ch) => ch.offers[ch.offers.length - 1]);
    s.trophies.filter((t) => t.category === 'CONTINENTAL').forEach((t) => {
      const club = E.CLUB_MAP[t.clubId];
      assert.equal(t.title, `${E.CONTINENTS[club.continent].clubContinentalCup} Winner`);
    });
  }
});

test('same career code + same choices = identical career; different seed = different career', () => {
  const { E } = loadEngine();
  const run = (seed) => { const s = newCareer(E, { seed }); playCareer(E, s); return JSON.stringify([s.stats, s.trophies, s.marketValueM, s.legacyScore, s.rival.name, s.awards]); };
  assert.equal(run('SAME11'), run('SAME11'));
  assert.notEqual(run('SAME11'), run('OTHER2'));
});

test('career codes round-trip', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { position: 'CDM', continent: 'AFRICA', nation: 'SEN', transferInterval: 3, retirementAge: 37, agentType: 'SHARK', mode: 'QUICK', seed: 'ABC234' });
  const parsed = E.parseCareerCode(E.careerCode(s.setup));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), { position: 'CDM', continent: 'AFRICA', nation: 'SEN', transferInterval: 3, retirementAge: 37, agentType: 'SHARK', mode: 'QUICK', seed: 'ABC234', difficulty: 'NORMAL' });
  assert.equal(E.parseCareerCode('nonsense'), null);
  // v14: difficulty travels in the code; codes from before v14 (8 parts) still load as Normal.
  assert.equal(E.careerCode(s.setup).split('-').length, 8, 'Normal careers keep the old code format');
  s.setup.difficulty = 'AMBITIOUS';
  assert.equal(E.parseCareerCode(E.careerCode(s.setup)).difficulty, 'AMBITIOUS');
  assert.equal(E.parseCareerCode('ST-EU-ENG-2-35-B-C-K7Q2M9').difficulty, 'NORMAL');
  assert.equal(E.parseCareerCode('ST-EU-ENG-2-35-B-C-K7Q2M9-X'), null, 'unknown difficulty letters are rejected');
});

test('projections never change the career or consume its random numbers', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { seed: 'PROJ01' });
  const ch = E.generateChoices(s);
  const before = JSON.stringify(s);
  ch.offers.forEach((o) => E.projectDecision(s, o, 60));
  assert.equal(JSON.stringify(s), before);
});

test('staying after running a contract down re-signs the player (v4 fix)', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { seed: 'RD0001' });
  const ch0 = E.generateChoices(s);
  E.simulateWindow(s, ch0.offers[0]);
  s.contractYearsRemaining = 0;
  s.runDownContractActive = true;
  const ch = E.generateChoices(s);
  assert.ok(ch.offers.every((o) => o.feeM === 0 || o.dramaBadge === '🆓 Lifeline Free Transfer'), 'free agent offers are €0');
  E.simulateWindow(s, ch.stayOption);
  assert.equal(s.runDownContractActive, false);
  assert.ok(s.contractYearsRemaining > 0);
});

test('cards are proportional to appearances and ratings stay in 6.0–9.6', () => {
  const { E } = loadEngine();
  for (let k = 0; k < 30; k++) {
    const s = newCareer(E, { seed: `K${k}`, position: positions[k % 8] });
    playCareer(E, s);
    s.seasonLog.forEach((se) => {
      assert.ok(se.reds <= 1 && se.yellows <= se.apps, 'cards bounded by appearances');
      assert.ok(se.rating >= 6 && se.rating <= 9.6);
      assert.ok(se.apps >= 2);
    });
  }
});

test('negotiation: odds sum to 1, no walk-away on a last option, accepted terms are applied', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { seed: 'NEG001' });
  const ch = E.generateChoices(s);
  const offer = ch.offers[0];
  const asks = { role: 1, wage: 0.3, length: 'same', clause: 'low' };
  const o1 = E.negotiationOdds(s, offer, asks, {});
  assert.ok(Math.abs(o1.accept + o1.counter + o1.walk - 1) < 1e-9);
  assert.equal(E.negotiationOdds(s, offer, asks, { isLastOption: true }).walk, 0);
  const none = E.negotiationOdds(s, offer, { role: 0, wage: 0, length: 'same', clause: 'standard' }, {});
  assert.equal(none.accept, 1);
  for (let i = 0; i < 40; i++) {
    const o = JSON.parse(JSON.stringify(offer));
    const before = { role: o.squadRole, wage: o.wageM };
    const res = E.negotiateOffer(s, o, asks, {});
    if (res.outcome === 'accepted') { assert.notEqual(o.squadRole, before.role); assert.ok(o.wageM > before.wage); assert.equal(o.releaseClause, 'low'); }
    if (res.outcome === 'rejected') assert.equal(o.withdrawn, true);
  }
});

test('mid-window decisions only appear between seasons and always apply cleanly', () => {
  const { E } = loadEngine();
  let seen = 0;
  for (let k = 0; k < 40; k++) {
    const s = newCareer(E, { seed: `M${k}`, transferInterval: 3 });
    let ch = E.generateChoices(s);
    while (!s.isRetired) {
      const ctx = E.beginWindow(s, ch.stayOption && k % 2 ? ch.stayOption : ch.offers[0]);
      assert.equal(E.rollMidWindowEvent(s, ctx), null, 'no event before the first season');
      while (ctx.seasons.length < ctx.years) {
        E.simulateSeason(s, ctx);
        const ev = E.rollMidWindowEvent(s, ctx);
        if (ev) { seen++; assert.ok(ctx.seasons.length < ctx.years); E.applyMidWindowChoice(s, ctx, ev, ev.options[seen % ev.options.length].id); }
      }
      if (E.endWindow(s, ctx).isRetired) break;
      ch = E.generateChoices(s);
    }
  }
  assert.ok(seen > 10, `expected some mid-window events, saw ${seen}`);
});

test('dynamic club strength keeps every club between 1 and 5 stars', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { seed: 'DYN001', retirementAge: 40, transferInterval: 1 });
  playCareer(E, s);
  E.CLUBS.forEach((c) => assert.ok(c.starRating >= 1 && c.starRating <= 5));
  E.applyClubDynamics(null);
});

test('v4 saves migrate to the current version and keep playing', () => {
  const { E } = loadEngine();
  const s = newCareer(E, { seed: 'MIG001' });
  E.simulateWindow(s, E.generateChoices(s).offers[0]);
  const v4 = JSON.parse(JSON.stringify(s));
  ['attributes', 'attrBaseline', 'attrHistory', 'rival', 'awards', 'clubTallies', 'wageM', 'rng', 'version'].forEach((k) => delete v4[k]);
  delete v4.setup.nation; delete v4.setup.seed;
  const m = E.migrateState(v4, 4);
  assert.equal(m.version, 14);
  assert.ok(m.attributes && m.rival && m.setup.nation);
  playCareer(E, m);
  assert.equal(m.isRetired, true);
});

test('Hall of Fame keeps at most 50 careers, sorted by legacy score', () => {
  const { E } = loadEngine();
  for (let k = 0; k < 55; k++) {
    const s = newCareer(E, { seed: `H${k}`, retirementAge: 30, transferInterval: 3 });
    playCareer(E, s);
  }
  const hof = E.storageGet(E.HALL_OF_FAME_KEY, []);
  assert.ok(hof.length <= 50);
  for (let i = 1; i < hof.length; i++) assert.ok(hof[i - 1].legacyScore >= hof[i].legacyScore);
});

test('legacy score is on a fixed 0–1000 scale and every component respects its cap', () => {
  const { E } = loadEngine();
  for (let k = 0; k < 40; k++) {
    const s = newCareer(E, { seed: `LG${k}`, position: positions[k % 8] });
    playCareer(E, s, (ch) => ch.offers[k % ch.offers.length]);
    const L = E.computeLegacy(s);
    assert.equal(L.max, 1000);
    assert.ok(L.total >= 0 && L.total <= 1000);
    Object.entries(L.parts).forEach(([key, v]) => assert.ok(v >= 0 && v <= E.LEGACY_MAX[key], `${key}=${v}`));
    assert.equal(s.legacyScore, L.total);
  }
});
