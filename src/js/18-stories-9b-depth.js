    /* ==========================================================================
     * v8 · STORY DEPTH
     *   Relationships with small real effects, promises, reputation, your best
     *   mate's own career, your protege growing up, journalist headlines,
     *   "where are they now", story variants, the sticker album and your own
     *   stories. Like the v7 engine, nothing here calls rand().
     * ========================================================================== */
    const ALBUM_KEY = 'fcts_story_album_v8';
    const CUSTOM_STORIES_KEY = 'fcts_custom_stories_v8';

    function ensureDepth(state) {
      const st = ensureStory(state);
      st.clubAff = st.clubAff || {};
      st.headlines = st.headlines || [];
      st.traits = st.traits || {};
      if (!st.mate) st.mate = { clubId: st.cast.mateClubId, seasons: [], retired: false, last: null };
      return st;
    }

    /* ---------- Relationships with small real effects ---------- */
    const REL_EFFECTS = {
      agent: (v) => (v >= 1 ? `Better wages on offers (+${Math.min(2, v) * 3}%)` : v <= -1 ? `Wage demands leak (−${Math.min(2, -v) * 3}%)` : ''),
      gaffer: (v) => (v >= 1 ? `A few more games each season (+${Math.min(2, v) * 3}%)` : v <= -1 ? `A few fewer games (−${Math.min(2, -v) * 3}%)` : ''),
      superfan: (v) => (v >= 2 ? 'Fans warm to you faster at your first club' : ''),
    };
    function applyRelationshipToChoices(state, choices) {
      if (!choices || !state || choices._rel) return choices;
      if (typeof applyPressToChoices === 'function') applyPressToChoices(state, choices);
      const st = ensureDepth(state);
      const a = clamp(st.aff.agent || 0, -2, 2);
      choices._rel = true;
      if (!a) return choices;
      const mult = 1 + 0.03 * a;
      (choices.offers || []).forEach((o) => {
        if (o.wageM != null) o.wageM = Number((o.wageM * mult).toFixed(3));
        o.agentNote = a > 0 ? `${storyTokens(state).agent} got you a better wage` : `a leak cost you a little on wages`;
      });
      return choices;
    }
    /* Manager trust and the gaffer/kit man/captain relationships belong to one club. */
    function swapClubRelations(state, fromId, toId) {
      if (!fromId || !toId || fromId === toId) return;
      const st = ensureDepth(state);
      st.clubAff[fromId] = { gaffer: st.aff.gaffer || 0, kitman: st.aff.kitman || 0, captain: st.aff.captain || 0 };
      const back = st.clubAff[toId] || {};
      ['gaffer', 'kitman', 'captain'].forEach((k) => { st.aff[k] = back[k] || 0; });
    }
    /* Used by simulateSeason (never during projections). */
    function storyAppMult(state) {
      if (DRY_RUN || !state.story || !state.story.aff) return 1;
      return 1 + 0.03 * clamp(state.story.aff.gaffer || 0, -2, 2);
    }

    /* ---------- Your best mate's career (deterministic, never touches rand()) ---------- */
    function pickClubNear(state, r, continent, stars, avoidId) {
      let pool = CLUBS.filter((c) => c.continent === continent && c.starRating === stars && c.id !== avoidId);
      if (!pool.length) pool = CLUBS.filter((c) => c.starRating === stars && c.id !== avoidId);
      return pool.length ? storyPick(r, pool) : null;
    }
    function simulateMateSeason(state, se) {
      const st = ensureDepth(state);
      const m = st.mate;
      m.last = null;
      if (m.retired || m.seasons.some((x) => x.age === se.age)) return;
      const r = storyRng(state, `mate|${se.age}`);
      const age = se.age;
      const retireAt = 32 + Math.floor(storyRng(state, 'mate|retire')() * 4);
      let club = CLUB_MAP[m.clubId] || CLUB_MAP[st.cast.mateClubId];
      const curve = age <= 24 ? (age - 17) * 0.05 : age <= 30 ? 0.35 : 0.35 - (age - 30) * 0.07;
      const rating = Number((6.55 + curve + (club.starRating - 2) * 0.05 + (r() - 0.5) * 0.7).toFixed(2));
      const apps = Math.round(18 + r() * 20);
      const goals = Math.round(apps * 0.09 * (0.5 + r()));
      const rec = { age, clubId: club.id, clubName: club.name, rating, apps, goals };
      const mine = CLUB_MAP[se.onLoan ? se.clubId : se.clubId];
      const myClub = se.onLoan ? CLUBS.find((c) => c.name === se.loanClubName) || mine : mine;
      if (myClub && myClub.id !== club.id && myClub.league === club.league) {
        const res = [0, 1].map(() => { const a = Math.floor(r() * 4); const b = Math.floor(r() * 4); return `${a > b ? 'W' : a < b ? 'L' : 'D'} ${a}–${b}`; });
        rec.meet = res;
      }
      if (age >= retireAt) { rec.retired = true; m.retired = true; m.retiredAge = age; }
      else if (rating >= 7.1 && club.starRating < 4 && r() < 0.35) {
        const to = r() < 0.12 && myClub && myClub.starRating === club.starRating + 1 && !se.onLoan ? myClub : pickClubNear(state, r, club.continent, club.starRating + 1, club.id);
        if (to) { rec.movedTo = to.id; rec.movedUp = true; m.clubId = to.id; if (myClub && to.id === myClub.id) rec.teammate = true; }
      } else if (rating < 6.5 && club.starRating > 1 && r() < 0.25) {
        const to = pickClubNear(state, r, club.continent, club.starRating - 1, club.id);
        if (to) { rec.movedTo = to.id; m.clubId = to.id; }
      } else if (club.starRating <= 2 && rating >= 7.0 && r() < 0.15) rec.promoted = true;
      m.seasons.push(rec);
      m.last = rec;
    }

    /* ---------- Your protege grows up ---------- */
    function simulateProtegeSeason(state, se) {
      const st = ensureDepth(state);
      if (!st.flags.includes('protege_met')) return;
      if (!st.protege) {
        const club = CLUB_MAP[se.clubId];
        st.protege = { metAge: se.age, startClubId: club.id, clubId: club.id, rating: 6.4, seasons: [], moved: false, capped: false, last: null };
        return;
      }
      const p = st.protege;
      p.last = null;
      if (p.seasons.some((x) => x.age === se.age)) return;
      const r = storyRng(state, `pro|${se.age}`);
      const pAge = 17 + (se.age - p.metAge);
      p.rating = Number(clamp(p.rating + 0.18 + (r() - 0.45) * 0.25, 6.2, 8.3).toFixed(2));
      const rec = { age: se.age, proAge: pAge, clubId: p.clubId, rating: p.rating };
      if (!p.moved && pAge >= 19 && p.rating >= 7.0 && r() < 0.6) {
        const to = pickClubNear(state, r, CLUB_MAP[p.clubId].continent, r() < 0.4 ? 5 : 4, se.clubId);
        if (to) { p.clubId = to.id; p.moved = true; rec.movedTo = to.id; }
      }
      if (!p.capped && pAge >= 20 && p.rating >= 7.3 && r() < 0.5) { p.capped = true; rec.capped = true; }
      const mine = CLUB_MAP[se.clubId];
      if (p.moved && mine && CLUB_MAP[p.clubId] && mine.league === CLUB_MAP[p.clubId].league && mine.id !== p.clubId) rec.meet = true;
      p.seasons.push(rec);
      p.last = rec;
    }

    /* ---------- Headlines by your journalist ---------- */
    const HEADLINES = {
      ballon: { kind: ['THE BEST IN THE WORLD: {SURNAME}', 'FROM {ACADEMY} TO THE TOP OF THE WORLD'], neutral: ['{SURNAME} WINS BALLON D’OR'], harsh: ['{SURNAME} WINS IT. WE’LL ADMIT IT.'] },
      major: { kind: ['{SURNAME} DELIVERS: {CLUB} LIFT THE {TROPHY}', 'SILVERWARE FOR {SURNAME}'], neutral: ['{CLUB} WIN THE {TROPHY}'], harsh: ['{CLUB} WIN DESPITE THE NOISE AROUND {SURNAME}'] },
      injury: { kind: ['GET WELL SOON, {SURNAME}', '{SURNAME} WILL BE BACK — AND BETTER'], neutral: ['INJURY BLOW FOR {SURNAME}'], harsh: ['{SURNAME} SIDELINED AGAIN'] },
      goals: { kind: ['{SURNAME} CAN’T STOP SCORING: {STAT} THIS SEASON', 'GOAL MACHINE {SURNAME}'], neutral: ['{STAT} GOALS FOR {SURNAME}'], harsh: ['{STAT} GOALS — BUT CAN {SURNAME} DO IT IN BIG GAMES?'] },
      wall: { kind: ['{SURNAME} THE WALL: {STAT} CLEAN SHEETS', 'NOTHING GETS PAST {SURNAME}'], neutral: ['{STAT} CLEAN SHEETS FOR {SURNAME}'], harsh: ['{STAT} CLEAN SHEETS. FINE. GOOD.'] },
      great: { kind: ['{SURNAME} IS THE SEASON’S STANDOUT', 'MAGNIFICENT {SURNAME}'], neutral: ['A FINE SEASON FOR {SURNAME}'], harsh: ['{SURNAME} SILENCES THE DOUBTERS (INCLUDING US)'] },
      newclub: { kind: ['{SURNAME} SETTLES IN AT {CLUB}', 'NEW HOME, SAME {SURNAME}'], neutral: ['FIRST SEASON AT {CLUB} FOR {SURNAME}'], harsh: ['{CLUB} STILL WAITING FOR THE REAL {SURNAME}'] },
      loan: { kind: ['LOAN STAR {SURNAME} SHINES AT {CLUB}'], neutral: ['{SURNAME} GAINS EXPERIENCE ON LOAN'], harsh: ['{SURNAME} SENT AWAY TO LEARN'] },
      poor: { kind: ['A HARD YEAR — {SURNAME} WILL BOUNCE BACK'], neutral: ['QUIET SEASON FOR {SURNAME}'], harsh: ['WHAT HAS HAPPENED TO {SURNAME}?'] },
      young: { kind: ['ONE TO WATCH: {SURNAME}', 'THE KID FROM {ACADEMY}'], neutral: ['{SURNAME} GETS FIRST-TEAM MINUTES'], harsh: ['TOO SOON FOR {SURNAME}?'] },
      steady: { kind: ['STEADY {SURNAME} KEEPS {CLUB} TICKING', 'RELIABLE AS EVER: {SURNAME}'], neutral: ['ANOTHER SOLID YEAR FOR {SURNAME}'], harsh: ['{SURNAME}: SOLID. JUST SOLID.'] },
    };
    function headlineFor(state, se) {
      const st = ensureDepth(state);
      const tok = storyTokens(state);
      const a = st.aff.journo || 0;
      const tone = a >= 1 ? 'kind' : a <= -1 ? 'harsh' : 'neutral';
      const isAtt = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      const log = state.seasonLog || [];
      const prev = log[log.indexOf(se) - 1];
      const major = se.trophies.find((t) => MAJOR_TROPHY_TYPES.has(t.category));
      let sit = 'steady';
      if (se.ballonDor) sit = 'ballon';
      else if (major) sit = 'major';
      else if (se.injured) sit = 'injury';
      else if (isAtt && se.goals >= 22) sit = 'goals';
      else if (!isAtt && se.cleanSheets >= 18) sit = 'wall';
      else if (se.onLoan) sit = 'loan';
      else if (se.rating >= 7.6) sit = 'great';
      else if (se.rating < 6.6) sit = 'poor';
      else if (prev && prev.clubId !== se.clubId) sit = 'newclub';
      else if (se.age <= 19) sit = 'young';
      const opts = HEADLINES[sit][tone];
      const r = storyRng(state, `headline|${se.age}`);
      const club = se.onLoan ? se.loanClubName : se.clubName;
      const text = storyPick(r, opts).replace(/\{SURNAME\}/g, tok.surname.toUpperCase()).replace(/\{CLUB\}/g, String(club).toUpperCase())
        .replace(/\{ACADEMY\}/g, tok.academyClub.toUpperCase()).replace(/\{TROPHY\}/g, major ? major.title.toUpperCase() : 'TROPHY')
        .replace(/\{STAT\}/g, String(isAtt ? se.goals : se.cleanSheets));
      return { age: se.age, season: se.season, text, paper: tok.paper, journo: tok.journo, tone, sit };
    }
    function headlineHTML(h, big = false) {
      if (!h) return '';
      return `<div class="npaper ${big ? 'big' : ''} tone-${h.tone}"><div class="np-top"><span>${esc(h.paper)}</span><span>${esc(h.season)}</span></div><div class="np-h">${esc(h.text)}</div><div class="np-by">by ${esc(h.journo)}</div></div>`;
    }
    function homeHeadlineHTML(s) {
      const st = s.story;
      const h = st && st.headlines && st.headlines[st.headlines.length - 1];
      return h ? `<div style="margin-bottom:14px">${headlineHTML(h)}</div>` : '';
    }

    /* ---------- The season hook (runs before the season's stories) ---------- */
    function storyDepthSeason(state, se) {
      if (DRY_RUN) return;
      if (typeof buildSeasonPlan === 'function') buildSeasonPlan(state, se);
      if (typeof v11SeasonHook === 'function') v11SeasonHook(state, se);
      if (typeof v10SeasonHook === 'function') v10SeasonHook(state, se);
      const st = ensureDepth(state);
      // v12: the career review and the story checkpoint both call this; only the first call counts.
      st.depthDone = st.depthDone || [];
      if (st.depthDone.includes(se.age)) return;
      st.depthDone.push(se.age);
      simulateMateSeason(state, se);
      simulateProtegeSeason(state, se);
      if (!st.headlines.some((h) => h.age === se.age)) st.headlines.push(headlineFor(state, se));
      if ((st.aff.superfan || 0) >= 2 && se.clubId === state.boyhoodClubId) adjustMood(state, se.clubId, 2);
    }
    function seasonDepthCtx(state, se) {
      const st = ensureDepth(state);
      const m = st.mate.last && st.mate.last.age === se.age ? st.mate.last : null;
      const p = st.protege && st.protege.last && st.protege.last.age === se.age ? st.protege.last : null;
      return {
        mateMeet: !!(m && m.meet), mateMovedUp: !!(m && m.movedUp && !m.teammate), mateTeammate: !!(m && m.teammate), mateRetired: !!(m && m.retired), matePromoted: !!(m && m.promoted),
        proMoved: !!(p && p.movedTo), proMeet: !!(p && p.meet), proCapped: !!(p && p.capped),
        _tokens: {
          mateResults: m && m.meet ? m.meet.join(' and ') : '',
          proClub: st.protege ? (CLUB_MAP[st.protege.clubId] || {}).name || 'a big club' : 'a big club',
          rating: se.rating.toFixed(2), bdRank: se.bdRank ? ordinalWord(se.bdRank) : '',
        },
      };
    }
    function ordinalWord(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

    /* ---------- Promises ---------- */
    const PROMISES = [
      { flag: 'promised_mate_shirt', text: 'Swap shirts with {mate} one day', kept: (s, has) => has('mate_shirt_swapped') || has('cb_shirt'), owed: '{mate} still mentions the shirt every Christmas.' },
      { flag: 'stayed_after_relegation', text: 'Stay and get the club back up', kept: (s) => (s.seasonLog || []).some((se) => se.events.some((e) => e.type === 'PROMOTED')), owed: 'The club came back without you in the end, and they still sent a thank-you card.' },
      { flag: 'next_tournament_promise', text: 'Win the tournament you missed', kept: (s, has) => has('cb_cushion'), owed: '{sibling} kept the cushion anyway.' },
      { flag: 'promise_hometown', text: 'Bring a trophy home to your hometown', kept: (s) => s.trophies.length > 0, owed: 'The kids from the square grew up. One of them still writes to you.' },
      { flag: 'promise_sibling_game', text: 'Watch {sibling}’s big games', kept: (s, has) => has('cb_sibling_debut') || has('sibling_academy'), owed: '{sibling} says you can make it up to them at their wedding.' },
      { flag: 'promise_return', text: 'Come back to your first club one day', kept: (s, has) => has('homecoming') || (s.clubHistory || []).some((x, i) => i > 0 && x.clubId === s.boyhoodClubId) || (s.currentClubId === s.boyhoodClubId && (s.clubHistory || []).length > 1), owed: 'The strip of tape is still over your name on the peg.' },
    ];
    function promisesSummary(state) {
      const st = ensureDepth(state);
      const has = (f) => st.flags.includes(f);
      const tok = storyTokens(state);
      return PROMISES.filter((p) => has(p.flag)).map((p) => ({ text: storyFill(p.text, tok), kept: !!p.kept(state, has), owed: storyFill(p.owed, tok) }));
    }

    /* ---------- Reputation from your choices ---------- */
    const CHOICE_TRAITS = {
      'ACA-02': ['loyal', 'warm'], 'ACA-07': ['grafter', 'ambitious', 'calm'], 'ACA-08': ['calm', 'showman'], 'ACA-09': ['warm', null],
      'TRN-01': ['calm', 'grafter'], 'TRN-07': ['hothead', 'showman'], 'CLB-02': ['team', 'ambitious'], 'CLB-05': ['showman', 'warm'],
      'CLB-07': ['grafter', 'warm'], 'CLB-09': ['loyal', 'showman'], 'CLB-18': ['loyal', null], 'LON-05': ['warm', 'warm'], 'INJ-05': ['grafter', 'calm', null],
      'INT-03': ['loyal', 'family', 'family'], 'RIV-05': ['ambitious', 'calm'], 'END-02': ['team', 'grafter'], 'END-04': ['showman', 'family'],
      'END-09': ['mentor', 'showman', 'family'], 'OFF-18': ['showman', 'calm'], 'OFF-19': ['family', 'showman'], 'TRN-21': ['loyal', 'calm'],
      'CLB-22': ['showman', 'team'], 'LDR-11': ['mentor', 'mentor'], 'OFF-20': ['showman', 'warm'],
    };
    const TRAIT_LINES = {
      loyal: 'never forgot where they came from', warm: 'always had time for people', family: 'kept their family close the whole way',
      grafter: 'outworked everyone in every training session', ambitious: 'always wanted the next, bigger thing', showman: 'loved a big moment and a bigger crowd',
      calm: 'stayed calm when everyone else didn’t', team: 'put the team first, even when it cost them', hothead: 'never let anything go, which made them great and difficult',
      mentor: 'made the players around them better',
    };
    function reputationLine(state) {
      const st = ensureDepth(state);
      const count = {};
      st.journal.forEach((e) => { if (e.picked != null && !e.auto) { const t = (CHOICE_TRAITS[e.id] || [])[e.picked]; if (t) count[t] = (count[t] || 0) + 1; } });
      const clubs = new Set([...(state.clubHistory || []).map((x) => x.clubId), state.currentClubId].filter(Boolean)).size;
      if (clubs === 1) count.loyal = (count.loyal || 0) + 2;
      if (st.flags.includes('protege_goal') || st.flags.includes('badges')) count.mentor = (count.mentor || 0) + 1;
      if (state.isCaptain || state.nationalCaptain) count.team = (count.team || 0) + 1;
      const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
      const kind = clubs === 1 ? 'a one-club player' : clubs >= 5 ? 'a well-travelled player' : 'a player';
      if (!top.length) return `Remembered as ${kind} who let their football do the talking.`;
      const a = TRAIT_LINES[top[0][0]];
      const b = top[1] ? TRAIT_LINES[top[1][0]] : null;
      return `Remembered as ${kind} who ${a}${b ? `, and ${b}` : ''}.`;
    }

    /* ---------- Where are they now ---------- */
    function whereNow(state) {
      const st = ensureDepth(state);
      const t = storyTokens(state);
      const has = (f) => st.flags.includes(f);
      const aff = (k) => st.aff[k] || 0;
      const firstKit = state.boyhoodClubId ? clubPeople(state, state.boyhoodClubId).kitman : t.kitman;
      const m = st.mate;
      const mApps = m.seasons.reduce((n, x) => n + x.apps, 0);
      const mBest = [...m.seasons].sort((a, b) => (CLUB_MAP[b.clubId] || {}).starRating - (CLUB_MAP[a.clubId] || {}).starRating)[0];
      const L = [];
      L.push(['🧑‍🏫', t.coach, has('after_coach') ? `${t.coach} comes to your Tuesday sessions, mostly to criticise the cones.`
        : has('dog') ? `${t.coach} visits the dog that shares their name twice a month. The dog is pleased every time.`
        : has('coach_has_shirt') ? `${t.coach} retired from ${t.academyClub}. Your first international shirt hangs in their hallway.`
        : `${t.coach} still coaches the under-12s at ${t.academyClub}, and still tells them about you.`]);
      L.push(['🤝', t.mate, m.retired || m.seasons.length ? `${t.mate} ${m.retired ? `retired at ${m.retiredAge}` : 'is still playing'} after ${mApps} games${mBest ? `, the best of them at ${mBest.clubName}` : ''}. ${has('podcast') ? 'The podcast now has 900 listeners, and 120 of them are still his family.' : 'He runs a five-a-side league and takes it far too seriously.'}`
        : `${t.mate} runs a five-a-side league and takes it far too seriously.`]);
      L.push(['💼', t.agent, aff('agent') >= 1 ? `${t.agent} now represents three kids from your old academy and tells them all about your first contract.` : aff('agent') <= -1 ? `You and ${t.agent} went separate ways, but still swap birthday messages every year.` : `${t.agent} retired to a house with no phone signal, on purpose.`]);
      L.push(['📰', t.journo, aff('journo') >= 1 ? `${t.journo} wrote a book about your career. ${has('pie_queue') ? 'Chapter one is about a pie queue.' : 'Chapter one is about your first match report.'}` : `${t.journo} still writes for ${t.paper} and still spells one name wrong per column.`]);
      L.push(['🧺', firstKit, has('old_boots_signed') || has('kitman_mint') ? `${firstKit} retired from ${t.academyClub}. Your first boots are in a glass case by the kit room door.` : `${firstKit} still opens the training ground at 6 a.m. and still knows everyone’s boot size.`]);
      if (has('met_superfan')) L.push(['🪧', t.superfan, has('cb_superfan') ? `${t.superfan} is head physio at a top club now. The Row F sign is in a frame in their treatment room.` : `${t.superfan} still sits in Row F. The sign has been laminated.`]);
      L.push(['🏠', t.sibling, has('cb_sibling_debut') ? `${t.sibling} is in their own prime now, and you are the one in the stands who can’t sit still.` : has('sibling_academy') ? `${t.sibling} chose university over football in the end, and has never let you win at anything since.` : `${t.sibling} kept every sticker of you, including the doubles.`]);
      L.push(['❤️', t.parent, has('lucky_scarf') ? `${t.parent} finally washed the lucky scarf. They regret it.` : has('mug_photo') ? `${t.parent} still drinks from the mug with your eyes closed on it.` : has('first_trophy') ? `${t.parent} still keeps your first medal in the drawer with the takeaway menus.` : `${t.parent} kept every programme from every game you played.`]);
      if (st.protege) { const pc = CLUB_MAP[st.protege.clubId]; L.push(['🌱', t.protege, st.protege.moved ? `${t.protege} is a regular at ${pc ? pc.name : 'a big club'} now, and still calls you before big games.` : `${t.protege} is still at ${(CLUB_MAP[st.protege.startClubId] || {}).name || 'your old club'}, nutmegging the new kids.`]); }
      L.push(['😤', t.rival, has('rival_respect') ? `${t.rival} and you play a charity match every summer. It has never been a draw.` : `${t.rival} still says in interviews that he was better. Then he says your name first.`]);
      return L.map(([ic, who, line]) => ({ ic, who, line }));
    }

    /* ---------- Story variants ---------- */
    function storyVariantText(state, story) {
      const alts = (typeof STORY_VARIANTS !== 'undefined' && STORY_VARIANTS[story.id]) || [];
      if (!alts.length) return story.text;
      const pool = [story.text, ...alts];
      return pool[Math.floor(storyRng(state, `variant|${story.id}`)() * pool.length) % pool.length];
    }

    /* ---------- Sticker album (kept across careers) ---------- */
    function albumLoad() { return storageGet(ALBUM_KEY, { seen: {} }) || { seen: {} }; }
    function albumRecord(state, entry) {
      if (DRY_RUN || typeof localStorage === 'undefined') return;
      const a = albumLoad();
      const cur = a.seen[entry.id];
      a.seen[entry.id] = cur ? { ...cur, n: cur.n + 1 } : { n: 1, first: Date.now(), player: state.playerName, age: entry.age };
      storageSet(ALBUM_KEY, a);
    }
    const RARITY_LABEL = { c: 'Common', u: 'Uncommon', r: 'Rare', l: 'Legendary' };
    function storyRarity(id) { return (typeof STORY_RARITY !== 'undefined' && STORY_RARITY[id]) || (id.startsWith('MY-') ? 'c' : 'r'); }
    function renderAlbumPage() {
      const a = albumLoad();
      const list = STORIES.filter((s) => !s.custom);
      const got = list.filter((s) => a.seen[s.id]).length;
      const cats = Object.keys(STORY_CATS).filter((k) => list.some((s) => s.cat === k));
      const byRar = ['l', 'r', 'u', 'c'].map((r) => { const all = list.filter((s) => storyRarity(s.id) === r); return `<span class="rar-pill rar-${r}">${RARITY_LABEL[r]} ${all.filter((s) => a.seen[s.id]).length}/${all.length}</span>`; }).join('');
      return `<div class="page-head"><div><div class="eyebrow">Collected across every career</div><h1>Sticker album</h1><div class="muted">${got} of ${list.length} stories collected · ${Math.round((got / list.length) * 100)}%</div></div><div class="rar-row">${byRar}</div></div>
        <div class="album-prog"><div style="width:${(got / list.length) * 100}%"></div></div>
        ${cats.map((k) => `<div class="album-sec"><div class="album-h">${esc(STORY_CATS[k])} <span class="dim">${list.filter((s) => s.cat === k && a.seen[s.id]).length}/${list.filter((s) => s.cat === k).length}</span></div><div class="album-grid">${list.filter((s) => s.cat === k).map((s) => stickerHTML(s, a.seen[s.id])).join('')}</div></div>`).join('')}`;
    }
    function stickerHTML(s, seen) {
      const r = storyRarity(s.id);
      if (!seen) return `<div class="sticker empty rar-${r}" title="${esc(RARITY_LABEL[r])} · not collected yet"><div class="stk-q">?</div><div class="stk-id">${esc(s.id)}</div><div class="stk-r">${RARITY_LABEL[r]}</div></div>`;
      const title = String(s.title).replace(/\{[a-zA-Z]+\}/g, '…');
      return `<div class="sticker tone-${s.tone} rar-${r}" title="${esc(s.trig || '')}"><div class="stk-ic">${STORY_TONE_ICON[s.tone] || '📖'}</div><div class="stk-t">${esc(title)}</div><div class="stk-id">${esc(s.id)}${seen.n > 1 ? ` · ×${seen.n}` : ''}</div><div class="stk-r">${RARITY_LABEL[r]}</div><div class="stk-who">${esc(seen.player || '')}</div></div>`;
    }
    function afterRenderAlbum() { /* static page */ }
    function openAlbumStandalone() {
      $('hofModalBody').innerHTML = renderAlbumPage();
      $('hofModal').querySelector('.panel-head span').textContent = 'Sticker album';
      $('hofModal').classList.remove('hidden');
    }

    /* ---------- Your own stories ---------- */
    const CUSTOM_TRIGGERS = {
      ANY_SEASON: { label: 'After any season (now and then)', when: 'season', test: (c) => c.rnd(0.3) },
      TROPHY: { label: 'After a season where you win a trophy', when: 'season', test: (c) => c.trophies > 0 },
      INJURY: { label: 'After a season with an injury', when: 'season', test: (c) => c.injured },
      NEW_CLUB: { label: 'After your first season at a new club', when: 'season', test: (c) => c.first && c.total > 1 },
      BIG_SEASON: { label: 'After a big season (rating 7.5+)', when: 'season', test: (c) => c.rating >= 7.5 },
      AGE: { label: 'When you reach a certain age', when: 'season', test: (c, d) => c.age >= (d.age || 25) },
      WINDOW: { label: 'When a transfer window opens (now and then)', when: 'open', test: (c) => c.rnd(0.3) },
      RETIRE: { label: 'At retirement', when: 'retire', test: () => true },
    };
    function customStoriesLoad() { return storageGet(CUSTOM_STORIES_KEY, []) || []; }
    function registerCustomStories() {
      for (let i = STORIES.length - 1; i >= 0; i--) if (STORIES[i].custom) { delete STORY_BY_ID[STORIES[i].id]; STORIES.splice(i, 1); }
      customStoriesLoad().forEach((d, i) => {
        const trg = CUSTOM_TRIGGERS[d.trigger] || CUSTOM_TRIGGERS.ANY_SEASON;
        const id = `MY-${String(i + 1).padStart(2, '0')}`;
        const story = { id, cat: 'MY', custom: true, w: 1.5, modes: 'both', sets: [], fx: null, title: d.title, text: d.text, tone: d.tone || 'warm', when: trg.when, trig: trg.label,
          if: (c) => { try { return !!trg.test(c, d); } catch { return false; } },
          choices: d.choices && d.choices.filter((x) => x.label && x.out).length === 2 ? d.choices.map((x) => ({ label: x.label, desc: '', out: x.out })) : null };
        STORIES.push(story); STORY_BY_ID[id] = story;
      });
      STORY_CATS.MY = 'Your own stories';
    }
    const EDITOR_TOKENS = ['first', 'surname', 'club', 'coach', 'mate', 'agent', 'journo', 'parent', 'sibling', 'superfan', 'kitman', 'gaffer', 'captain', 'rival', 'num', 'nation'];
    function openStoryEditor(idx = null) {
      const list = customStoriesLoad();
      const d = idx != null ? list[idx] : { title: '', text: '', trigger: 'ANY_SEASON', tone: 'warm', age: 25, choices: [{ label: '', out: '' }, { label: '', out: '' }] };
      const m = $('negoModal');
      $('negoBody').innerHTML = `<div class="panel-head"><span>✍️ ${idx != null ? 'Edit your story' : 'Write your own story'}</span><button class="btn btn-ghost" onclick="closeNegotiation()">✕</button></div>
        <div class="panel-body editor">
          <label class="field-label" for="edTitle">Title</label><input id="edTitle" class="text-input" maxlength="40" value="${esc(d.title)}" placeholder="The lucky socks">
          <label class="field-label" for="edText">Story</label><textarea id="edText" class="text-input" rows="4" maxlength="400" placeholder="{parent} bought you new socks before the derby. You scored twice. You have not washed them since.">${esc(d.text)}</textarea>
          <div class="tok-row">${EDITOR_TOKENS.map((k) => `<button class="chip" onclick="edInsert('{${k}}')">{${k}}</button>`).join('')}</div>
          <div class="ed-grid"><div><label class="field-label" for="edTrig">When it happens</label><select id="edTrig" class="text-input">${Object.entries(CUSTOM_TRIGGERS).map(([k, v]) => `<option value="${k}" ${d.trigger === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>
            <div><label class="field-label" for="edAge">Age (for “certain age”)</label><input id="edAge" type="number" min="17" max="42" class="text-input" value="${d.age || 25}"></div>
            <div><label class="field-label" for="edTone">Feel</label><select id="edTone" class="text-input">${Object.keys(STORY_TONE_ICON).map((t) => `<option ${d.tone === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
          <div class="field-label" style="margin-top:8px">Optional: two choices</div>
          ${[0, 1].map((i) => `<div class="ed-grid c2"><input id="edC${i}" class="text-input" maxlength="40" placeholder="Choice ${i + 1}" value="${esc((d.choices[i] || {}).label || '')}"><input id="edO${i}" class="text-input" maxlength="200" placeholder="What happens" value="${esc((d.choices[i] || {}).out || '')}"></div>`).join('')}
          <div class="field-label" style="margin-top:8px">Preview with ${gameState ? 'this career’s people' : 'example names'}</div><div id="edPrev" class="ed-prev"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">${idx != null ? `<button class="btn btn-danger" onclick="deleteCustomStory(${idx})">Delete</button>` : ''}<button class="btn" onclick="closeNegotiation()">Cancel</button><button class="btn btn-go" onclick="saveCustomStory(${idx == null ? 'null' : idx})">Save story</button></div>
        </div>`;
      m.classList.remove('hidden');
      ['edTitle', 'edText', 'edTone'].forEach((id) => { $(id).oninput = edPreview; });
      edPreview();
    }
    function edInsert(tok) { const t = $('edText'); const p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + tok + t.value.slice(p); t.focus(); edPreview(); }
    function edPreview() {
      const tok = gameState ? storyTokens(gameState) : { first: 'Alex', surname: 'Rivera', club: 'your club', coach: 'Coach Mendes', mate: 'Sam Okafor', agent: 'Lena Brandt', journo: 'Ray Hughes', parent: 'Mum', sibling: 'Mia', superfan: 'Leo', kitman: 'Pat', gaffer: 'the gaffer', captain: 'the captain', rival: 'your rival', num: '9', nation: 'your country' };
      $('edPrev').innerHTML = storyCardHTML({ title: storyFill($('edTitle').value || 'Untitled', tok), text: storyFill($('edText').value || '…', tok), tone: $('edTone').value, when: 'season', season: 'Preview', age: gameState ? gameState.currentAge : 17, choices: null, picked: null }, { interactive: false, compact: true });
    }
    function saveCustomStory(idx) {
      const d = { title: $('edTitle').value.trim(), text: $('edText').value.trim(), trigger: $('edTrig').value, tone: $('edTone').value, age: Number($('edAge').value) || 25,
        choices: [0, 1].map((i) => ({ label: $(`edC${i}`).value.trim(), out: $(`edO${i}`).value.trim() })) };
      if (!d.title || !d.text) { showToast('Almost there', 'A story needs a title and some text.', 'var(--warn)'); return; }
      const list = customStoriesLoad();
      if (idx == null) list.push(d); else list[idx] = d;
      storageSet(CUSTOM_STORIES_KEY, list.slice(0, 40));
      registerCustomStories();
      closeNegotiation();
      showToast('Story saved', 'It can now happen in any career, including this one.');
      if (gameState && ui.page === 'story') renderPage();
    }
    function deleteCustomStory(idx) {
      if (!confirm('Delete this story?')) return;
      const list = customStoriesLoad(); list.splice(idx, 1); storageSet(CUSTOM_STORIES_KEY, list);
      registerCustomStories(); closeNegotiation(); if (gameState && ui.page === 'story') renderPage();
    }
    function customStoriesHTML() {
      const list = customStoriesLoad();
      return `<div class="panel"><div class="panel-head"><span>✍️ Your own stories</span><button class="btn btn-ghost" style="padding:2px 8px" onclick="openStoryEditor()">+ Write one</button></div><div class="panel-body">${list.length ? list.map((d, i) => `<div class="cast-row" style="cursor:pointer" onclick="openStoryEditor(${i})"><span>${STORY_TONE_ICON[d.tone] || '📖'}</span><div><b>${esc(d.title)}</b><div class="dim" style="font-size:11px">${esc((CUSTOM_TRIGGERS[d.trigger] || {}).label || '')}</div></div></div>`).join('') : '<div class="dim" style="font-size:12.5px">Write a story about anything — a ritual, a family joke, a hero. It can then happen in any career, with this career’s people in it.</div>'}</div></div>`;
    }
    registerCustomStories();
