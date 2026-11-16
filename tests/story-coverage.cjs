// How often each story fires across many careers. Usage: node tests/story-coverage.cjs [careers]
const { loadEngine } = require('./load-engine.cjs');
const { E } = loadEngine({ stories: true });
const N = Number(process.argv[2]) || 300;
const positions = ['ST', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'RB', 'GK'];
const conts = ['EUROPE', 'SOUTH_AMERICA', 'ASIA', 'AFRICA', 'NORTH_AMERICA'];
const nationsFor = { EUROPE: ['ENG', 'ESP', 'NOR'], SOUTH_AMERICA: ['BRA', 'PER'], ASIA: ['JPN', 'QAT'], AFRICA: ['SEN', 'GHA'], NORTH_AMERICA: ['MEX', 'CAN'] };
const count = {}; let total = 0; let cbs = 0; const perCareer = [];
for (let i = 0; i < N; i++) {
  const cont = conts[i % conts.length];
  const s = E.createInitialGameState({ playerName: 'Cov Er', position: positions[i % 8], continent: cont, nation: nationsFor[cont][i % nationsFor[cont].length], transferInterval: 1 + (i % 3), retirementAge: 32 + (i % 8), seed: `COV${i}` });
  E.RNG.holder = s;
  let ch = E.generateChoices(s);
  for (let g = 0; g < 50 && !s.isRetired; g++) {
    const d = E.agentChoose ? ch.offers[Math.floor((i * 7 + g) % Math.max(1, ch.offers.length))] || ch.stayOption : ch.offers[0];
    const pick = (g > 0 && i % 3 === 0 && ch.stayOption) ? ch.stayOption : d;
    const info = E.storyWindowInfo(s, pick);
    const r = E.simulateWindow(s, pick);
    E.storyWindow(s, info, { auto: true });
    r.report.seasons.forEach((se) => E.storySeason(s, se, { auto: true }));
    if (r.isRetired) break;
    ch = E.generateChoices(s);
    E.storyOpen(s, (ch.offers || []).length, { auto: true });
  }
  E.storyRetire(s, { auto: true });
  s.story.journal.forEach((e) => { count[e.id] = (count[e.id] || 0) + 1; total++; if (e.cat === 'CB') cbs++; });
  perCareer.push(s.story.journal.length);
}
const never = E.STORIES.filter((s) => !count[s.id]).map((s) => s.id);
perCareer.sort((a, b) => a - b);
console.log(`${N} careers · ${E.STORIES.length} stories in the library`);
console.log(`stories per career: median ${perCareer[Math.floor(N / 2)]}, min ${perCareer[0]}, max ${perCareer[N - 1]} · callbacks per career ${(cbs / N).toFixed(1)}`);
console.log(`distinct stories seen: ${Object.keys(count).length}/${E.STORIES.length}`);
console.log(`never fired: ${never.join(' ') || 'none'}`);
const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${(v / N * 100).toFixed(0)}%`);
console.log(`most common: ${top.join(', ')}`);
