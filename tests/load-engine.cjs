// Loads the engine source files (01–06) into an isolated context for Node tests.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// Options: stories, matches, player (training, contracts, effects, saves), world (world, press, sponsors).
// v10 / v11 are the older names for player / world and still work.
function loadEngine({ stories = false, matches = false, player = false, world = false, v10 = false, v11 = false } = {}) {
  player = player || v10; world = world || v11;
  const dir = path.join(__dirname, '..', 'src', 'js');
  const files = fs.readdirSync(dir).filter((f) => /^0\d-.*\.js$/.test(f) || (stories && /^18-stories-/.test(f)) || (matches && /^21-matches\.js$/.test(f)) || (player && /^2[378]-(player|effects|saves)\.js$/.test(f)) || (world && /^25-world\.js$/.test(f))).sort();
  const store = {};
  const ctx = { console, Math, Date, JSON, structuredClone, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } };
  vm.createContext(ctx);
  const exportsList = ['createInitialGameState', 'generateChoices', 'simulateWindow', 'beginWindow', 'simulateSeason', 'endWindow', 'projectDecision', 'rollMidWindowEvent', 'applyMidWindowChoice', 'negotiateOffer', 'negotiationOdds', 'resolveCounter', 'agentChoose', 'migrateState', 'computeLegacy', 'careerCode', 'parseCareerCode', 'getDerivedState', 'POSITION_PROFILES', 'CONTINENTS', 'NATIONS', 'CLUBS', 'CLUB_MAP', 'LEAGUES', 'RNG', 'MAJOR_TROPHY_TYPES', 'ROLE_ORDER', 'applyClubDynamics', 'overallRating', 'storageGet', 'HALL_OF_FAME_KEY', 'LEGACY_MAX', 'legacyTier', 'moodOf', 'STORIES', 'storySeason', 'storyWindow', 'storyOpen', 'storyRetire', 'storyWindowInfo', 'ensureStory', 'storyJournalText', 'storyTokens', 'resolveStory', 'finalizeCareerRetirement', 'promisesSummary', 'whereNow', 'reputationLine', 'headlineFor', 'applyRelationshipToChoices', 'STORY_BY_ID', 'CUSTOM_TRIGGERS', 'storyRarity', 'buildSeasonPlan', 'seasonMatches', 'leagueTable', 'applyWinter', 'winterOptions', 'squadContext', 'seasonSplits', 'seasonReasonV9', 'MX_CACHE', 'ensureV10', 'v10SeasonHook', 'v10WindowHook', 'SUB_ATTRS', 'MENTAL_ATTRS', 'switchPosition', 'setTrainingFocus', 'trainingTargets', 'scoutsCeiling', 'injuryRiskMult', 'contractPackage', 'packageLine', 'TRAITS', 'attrKeysFor', 'ensureV11', 'v11SeasonHook', 'pressQuestions', 'applyPressAnswer', 'pressDue', 'acceptSponsor', 'sponsorIncome', 'activeSponsors', 'starAge', 'moodOf', 'LEAGUES', 'CONTINENTS', 'mediaImage', 'detailLevel', 'careerEarnings', 'careerEarningsNet', 'computeLegacy', 'v13Edges', 'v13EngineEdges', 'TRAIT_EDGES', 'legacyTier', 'validCareer', 'mergeAlbums', 'pressRenewalMult', 'applyPressToChoices', 'v13PressAftermath', 'v13CheckPromises', 'PRESS_PROMISES', 'VALUE_GROWTH', 'storageSet', 'SUB_ATTRS', 'saveCareer', 'adjustMood', 'DIFFICULTY', 'difficultyOf', 'projectDecision', 'moodOf'];
  const src = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + `\n;globalThis.__E = { ${exportsList.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ')}, setActiveSlot: (i) => { ACTIVE_SLOT = i; }, setDry: (v) => { DRY_RUN = v; } };`;
  vm.runInContext(src, ctx, { filename: 'engine-bundle.js' });
  return { E: ctx.__E, store, ctx };
}
module.exports = { loadEngine };
