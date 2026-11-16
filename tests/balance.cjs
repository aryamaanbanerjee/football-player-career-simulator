// Balance harness: plays many careers per position and prints averages.
// Usage: node tests/balance.cjs [careersPerPosition=60] [strategy=agent|random]
const { loadEngine } = require('./load-engine.cjs');
const { E } = loadEngine();
const N = Number(process.argv[2] || 60);
const STRATEGY = process.argv[3] || 'agent';
const positions = Object.keys(E.POSITION_PROFILES);
const conts = Object.keys(E.CONTINENTS);
const rows = [];
const roleSeasons = { PROSPECT: 0, ROTATION: 0, KEY_PLAYER: 0, STAR: 0 };
const allLegacy = [];
const partSums = {};
for (const pos of positions) {
  const agg = { legacy: 0, rating: 0, trophies: 0, majors: 0, bdo: 0, peak: 0, earn: 0, intl: 0, awards: 0, caps: 0, primary: 0 };
  for (let k = 0; k < N; k++) {
    const cont = conts[k % 5];
    const s = E.createInitialGameState({ playerName: 'B', position: pos, continent: cont, nation: E.NATIONS[cont][k % E.NATIONS[cont].length].id, transferInterval: 1 + (k % 3), retirementAge: 33 + (k % 5), seed: `${pos}${k}` });
    let ch = E.generateChoices(s);
    while (!s.isRetired) {
      const opts = [...(ch.stayOption ? [{ key: 'stay', data: ch.stayOption }] : []), ...ch.offers.map((o, i) => ({ key: 'o' + i, data: o }))];
      let pick;
      if (STRATEGY === 'random') pick = opts[Math.floor(Math.random() * opts.length)];
      else { const proj = {}; opts.forEach((o) => { proj[o.key] = E.projectDecision(s, o.data, 40); }); pick = E.agentChoose(opts, proj, 'BALANCED'); }
      const r = E.simulateWindow(s, pick.data);
      if (r.isRetired) break;
      ch = E.generateChoices(s);
    }
    s.seasonLog.forEach((x) => { roleSeasons[x.role]++; });
    const d = E.getDerivedState(s);
    agg.legacy += s.legacyScore; allLegacy.push(s.legacyScore);
    Object.entries(s.legacyParts || {}).forEach(([k, v]) => { partSums[k] = (partSums[k] || 0) + v; }); agg.rating += d.averageRating; agg.trophies += s.trophies.length;
    agg.majors += s.trophies.filter((t) => E.MAJOR_TROPHY_TYPES.has(t.category)).length; agg.bdo += s.stats.ballonDOrs;
    agg.peak += s.peakMarketValueM; agg.earn += s.stats.careerEarningsM; agg.intl += s.trophies.filter((t) => t.category === 'INTERNATIONAL').length;
    agg.awards += s.awards.length; agg.caps += s.stats.internationalCaps;
    agg.primary += E.POSITION_PROFILES[pos].primaryStatType === 'ATTACK' ? s.stats.goals : s.stats.cleanSheets;
  }
  const f = (v, d = 1) => (v / N).toFixed(d);
  rows.push({ pos, legacy: f(agg.legacy, 0), rating: f(agg.rating, 2), trophies: f(agg.trophies), majors: f(agg.majors), bdo: f(agg.bdo, 2), peakM: f(agg.peak, 0), earnM: f(agg.earn, 0), intl: f(agg.intl, 2), awards: f(agg.awards), caps: f(agg.caps, 0), primary: f(agg.primary, 0) });
}
console.log(`Balance: ${N} careers per position, strategy=${STRATEGY}`);
console.table(rows);
const tot = Object.values(roleSeasons).reduce((a, b) => a + b, 0);
console.log('Season share by squad role:', Object.fromEntries(Object.entries(roleSeasons).map(([k, v]) => [k, `${Math.round((v / tot) * 100)}%`])));
const legacies = rows.map((r) => Number(r.legacy));
console.log(`Legacy spread across positions: ${Math.min(...legacies)}–${Math.max(...legacies)} (max/min ${(Math.max(...legacies) / Math.min(...legacies)).toFixed(2)})`);

allLegacy.sort((a, b) => a - b);
const q = (p) => allLegacy[Math.min(allLegacy.length - 1, Math.floor(p * allLegacy.length))];
console.log(`Legacy (out of 1000) percentiles: p50 ${q(0.5)} · p80 ${q(0.8)} · p95 ${q(0.95)} · p99 ${q(0.99)} · max ${allLegacy[allLegacy.length - 1]}`);
console.log('Average points per legacy component:', Object.fromEntries(Object.entries(partSums).map(([k, v]) => [k, Math.round(v / allLegacy.length)])));
