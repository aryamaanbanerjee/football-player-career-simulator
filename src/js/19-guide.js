    /* ==========================================================================
     * v8 · NEW-PLAYER GUIDE
     *   "Just play", positions by playing style, short first career, career goals,
     *   plain words beside numbers, tap-to-explain football terms, offers described
     *   by consequence, one-line season reasons, and pages revealed over time.
     * ========================================================================== */
    const PLAY_STYLES = [
      { pos: 'ST', ic: '⚽', t: 'I score goals', d: 'Striker. Most goals, most headlines.' },
      { pos: 'LW', ic: '💨', t: 'I beat defenders', d: 'Winger. Speed and tricks on the flank.' },
      { pos: 'CAM', ic: '🎯', t: 'I create chances', d: 'Playmaker. The pass before the goal.' },
      { pos: 'CM', ic: '🔄', t: 'I run the midfield', d: 'Midfielder. Everywhere, all game.' },
      { pos: 'CDM', ic: '🛡️', t: 'I win the ball back', d: 'Holding midfielder. The team’s shield.' },
      { pos: 'CB', ic: '🧱', t: 'I stop attacks', d: 'Centre-back. Blocks, headers, leadership.' },
      { pos: 'RB', ic: '🏃', t: 'I attack and defend', d: 'Full-back. Up and down the wing.' },
      { pos: 'GK', ic: '🧤', t: 'I’m the last line', d: 'Goalkeeper. Saves and clean sheets.' },
    ];
    const CAREER_GOALS = {
      NONE: { t: 'No goal', d: 'Just see what happens.' },
      LEAGUE25: { t: 'Champion before 25', d: 'Win a league title before you turn 25.' },
      ONECLUB: { t: 'One-club hero', d: 'Play 10 seasons for the same club.' },
      ABROAD3: { t: 'Globetrotter', d: 'Play in three different countries.' },
      CENTURY: { t: 'The century', d: '100 career goals (or 100 clean sheets for defenders).' },
      PODIUM: { t: 'Best in the world', d: 'Finish top 3 in the Ballon d’Or.' },
      CAPS50: { t: 'National hero', d: 'Win 50 caps for your country.' },
    };
    const SHORT_CAREER = { transferInterval: 2, retirementAge: 33 };

    /* ---------- Plain words beside numbers ---------- */
    function ratingWord(r) {
      if (r == null) return '';
      return r >= 8.2 ? 'World class' : r >= 7.8 ? 'Excellent' : r >= 7.4 ? 'Very good' : r >= 7.1 ? 'Good' : r >= 6.8 ? 'Solid' : r >= 6.4 ? 'Steady' : 'Tough season';
    }
    function appsWord(apps, maxGames) {
      const k = apps / Math.max(1, maxGames);
      return k >= 0.75 ? 'You’d start most games' : k >= 0.5 ? 'You’d play about half the games' : k >= 0.28 ? 'You’d rotate in and out' : 'You’d mostly be on the bench';
    }
    function chanceWord(p) { return p >= 0.6 ? 'Good chance of a trophy' : p >= 0.3 ? 'Some chance of a trophy' : p >= 0.1 ? 'Small chance of a trophy' : 'Trophies unlikely'; }

    /* Offers described by what happens to you (numbers stay underneath). */
    function offerPlainLine(o) {
      const s = gameState;
      const p = ui.proj && ui.proj[o.key];
      const club = o.club;
      const parts = [];
      const maxGames = club.starRating >= 4 ? 50 : club.starRating === 3 ? 44 : 38;
      if (p && scoutLevel() !== 'BLIND') { parts.push(appsWord(p.apps, maxGames)); parts.push(chanceWord(p.pAnyTrophy != null ? p.pAnyTrophy : p.pAnyMajor || 0)); }
      else {
        const role = o.kind === 'STAY' ? s.squadRole : o.data.squadRole;
        parts.push({ KEY_PLAYER: 'You’d start most games', STARTER: 'You’d start most games', ROTATION: 'You’d rotate in and out', BENCH: 'You’d mostly be on the bench', PROSPECT: 'You’d mostly be on the bench' }[role] || 'Your role isn’t clear yet');
      }
      if (o.kind === 'LOAN' || o.data.type === 'LOAN') parts.push('back after the loan');
      else if (o.kind !== 'STAY') {
        const home = (LEAGUE_NATION[club.league] || '') === s.setup.nation;
        parts.push(home ? 'close to home' : club.continent === s.setup.continent ? 'abroad' : 'far from home');
      }
      if (o.data.agentNote) parts.push(o.data.agentNote);
      if (o.data.pressNote) parts.push(o.data.pressNote);
      return parts.join(' · ');
    }

    /* ---------- One line on why a season went the way it did ---------- */
    function seasonReasonBase(state, se) {
      const pos = POSITION_PROFILES[state.setup.position];
      const log = state.seasonLog || [];
      const prev = log[log.indexOf(se) - 1];
      const has = (t) => (se.events || []).some((e) => e.type === t);
      const club = CLUB_MAP[se.clubId];
      const maxGames = club && club.starRating >= 4 ? 50 : club && club.starRating === 3 ? 44 : 38;
      const prevClub = prev ? CLUB_MAP[prev.clubId] : null;
      if (se.ballonDor) return 'The best season in the world. Everything clicked.';
      if (se.injured) return 'An injury kept you out for a long spell. You came back stronger for it.';
      if (has('MANAGER_CHANGE')) return 'A new manager arrived and reshuffled the team around you.';
      if (se.secondTier) return 'The club went down a division, so you played a level lower this year.';
      if (se.onLoan) return se.apps >= 25 ? 'Regular football on loan sped up your development.' : 'Even on loan, minutes were hard to come by.';
      if (se.trophies.some((t) => MAJOR_TROPHY_TYPES.has(t.category))) return 'Winning a major trophy lifted everyone, you included.';
      if (se.apps < maxGames * 0.35) {
        if (prevClub && prev.clubId !== se.clubId && club.starRating > prevClub.starRating) return 'Stepping up to a bigger club meant fighting hard for a place.';
        if (se.age <= 19) return 'At your age, most players wait their turn. The minutes will come.';
        return 'You were mostly a squad player this season.';
      }
      if (se.age > pos.peakEnd + 1 && prev && se.rating < prev.rating) return 'Your legs are slowing a little, but your reading of the game keeps you valuable.';
      if (se.age <= 20 && se.rating >= 7.0) return 'A breakthrough year: the club trusted you with real minutes.';
      if (se.rating >= 7.6) return 'You were in top form all season.';
      if (se.rating < 6.6) return 'A tough season. Form comes and goes; the next one is a fresh start.';
      if (prev && prev.clubId !== se.clubId) return 'A first season at a new club, settling in and finding your feet.';
      return 'A steady season of solid football.';
    }

    /* ---------- Career goals ---------- */
    function countriesPlayed(state) {
      const ids = new Set([...(state.clubHistory || []).map((x) => x.clubId), state.currentClubId].filter(Boolean));
      return new Set([...ids].map((id) => CLUB_MAP[id] && (LEAGUE_NATION[CLUB_MAP[id].league] || CLUB_MAP[id].league))).size;
    }
    function goalProgress(state) {
      const g = state.setup.goal;
      if (!g || g === 'NONE' || !CAREER_GOALS[g]) return null;
      const log = state.seasonLog || [];
      const isAtt = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      let pct = 0; let label = ''; let done = false; let over = false;
      if (g === 'LEAGUE25') {
        done = log.some((se) => se.age < 25 && se.trophies.some((t) => t.category === 'DOMESTIC_LEAGUE'));
        over = !done && state.currentAge >= 25;
        pct = done ? 1 : clamp((state.currentAge - 17) / 8, 0, 1);
        label = done ? 'League champion before 25' : over ? 'No league title before 25 — it still counts if you win one later' : `${Math.max(0, 25 - state.currentAge)} season(s) left to win the league`;
      } else if (g === 'ONECLUB') {
        let best = 0; let run = 0; let last = null;
        log.forEach((se) => { run = se.clubId === last ? run + 1 : 1; last = se.clubId; best = Math.max(best, run); });
        pct = Math.min(1, best / 10); done = best >= 10; label = `${best} of 10 seasons at one club`;
      } else if (g === 'ABROAD3') {
        const n = countriesPlayed(state); pct = Math.min(1, n / 3); done = n >= 3; label = `${n} of 3 countries`;
      } else if (g === 'CENTURY') {
        const n = isAtt ? state.stats.goals : state.stats.cleanSheets; pct = Math.min(1, n / 100); done = n >= 100; label = `${n} of 100 ${isAtt ? 'goals' : 'clean sheets'}`;
      } else if (g === 'PODIUM') {
        const best = Math.min(99, ...log.map((se) => se.bdRank || 99));
        done = best <= 3; pct = done ? 1 : best <= 30 ? (31 - best) / 28 : 0; label = best <= 30 ? `Best Ballon d’Or finish: ${best}${best === 1 ? 'st' : best === 2 ? 'nd' : best === 3 ? 'rd' : 'th'}` : 'Not on the Ballon d’Or list yet';
      } else if (g === 'CAPS50') {
        const n = state.stats.internationalCaps; pct = Math.min(1, n / 50); done = n >= 50; label = `${n} of 50 caps`;
      }
      return { id: g, ...CAREER_GOALS[g], pct, label, done, over };
    }
    function goalCardHTML(state) {
      const g = goalProgress(state);
      if (!g) return '';
      return `<div class="goal-card ${g.done ? 'done' : ''}"><div class="goal-top"><span class="eyebrow">Your goal</span><b>${esc(g.t)}</b><span class="dim">${esc(g.d)}</span></div>
        <div class="goal-bar"><div style="width:${Math.round(g.pct * 100)}%"></div></div><div class="goal-label">${g.done ? '✓ ' : ''}${esc(g.label)}</div></div>`;
    }

    /* ---------- Guided careers and pages revealed over time ---------- */
    const isGuided = (s = gameState) => !!(s && s.setup && s.setup.guided);
    const REVEAL_RULES = {
      inbox: { when: (s) => s.windowCount >= 1, msg: 'Inbox: news, rumours and messages from your career.' },
      stats: { when: (s) => s.seasonLog.length >= 1, msg: 'Player Stats: every number from your seasons.' },
      world: { when: (s) => s.seasonLog.length >= 1, msg: 'World: champions, Ballon d’Or podiums, transfer records and the stars of your era.' },
      media: { when: (s) => s.seasonLog.length >= 2, msg: 'Media: your profile, followers, press cuttings and sponsor offers.' },
      training: { when: (s) => s.seasonLog.length >= 1, msg: 'Training: your detailed attributes, traits, and what to work on next.' },
      contract: { when: (s) => s.seasonLog.length >= 2, msg: 'Contract: your wage, bonuses, clauses and career earnings.' },
      matches: { when: (s) => s.seasonLog.length >= 1, msg: 'Matches: every game you played, the league table at any point, and your squad.' },
      album: { when: (s) => s.seasonLog.length >= 1, msg: 'Sticker album: every story you’ve collected, across all careers.' },
      career: { when: (s) => s.seasonLog.length >= 2, msg: 'Career: your clubs, transfers and value over time.' },
      trophies: { when: (s) => s.trophies.length >= 1 || s.seasonLog.length >= 3, msg: 'Trophy Cabinet: everything you’ve won.' },
      hof: { when: (s) => s.windowCount >= 4, msg: 'Hall of Fame: how your career compares with your best ones.' },
    };
    function navVisible(id, s = gameState) {
      if (!s || !isGuided(s) || prefs.showAll || !REVEAL_RULES[id]) return true;
      return (s.revealed || []).includes(id);
    }
    function checkReveals(s = gameState) {
      if (!s || !isGuided(s) || prefs.showAll) return;
      s.revealed = s.revealed || [];
      Object.entries(REVEAL_RULES).forEach(([id, r]) => {
        if (!s.revealed.includes(id) && r.when(s)) {
          s.revealed.push(id);
          const g = typeof groupOf === 'function' ? groupOf(id) : null;
          s.revealToasts = [...(s.revealToasts || []), g && g.pages.length > 1 ? `${r.msg} (in ${g.label})` : r.msg];
        }
      });
      // Announce new pages only once the season review has closed, so nothing covers the results.
      if ((s.revealToasts || []).length && $('review').classList.contains('hidden')) {
        const msgs = s.revealToasts; s.revealToasts = [];
        msgs.forEach((m, i) => setTimeout(() => {
          // Still no review on screen? Show it. Otherwise hold it for the next quiet moment.
          if ($('review').classList.contains('hidden')) showToast('New page unlocked', m, 'var(--gold)');
          else s.revealToasts = [...(s.revealToasts || []), m];
        }, 900 + i * 2600));
      }
    }

    /* ---------- Tap-to-explain football terms ---------- */
    const TERMS_V8 = [
      ['transfer window', 'The summer period when clubs can buy and sell players. In this game, each window is one big decision.'],
      ['loan', 'You play for another club for a season or two, then come back. Great for young players who need minutes.'],
      ['release clause', 'A fixed price in your contract. If a club pays it, your club has to let you talk to them.'],
      ['Ballon d’Or', 'The award for the best player in the world, voted every year. A top-3 finish is a career highlight.'],
      ["Ballon d'Or", 'The award for the best player in the world, voted every year. A top-3 finish is a career highlight.'],
      ['relegated', 'Finishing near the bottom of the league, so the club drops to the division below.'],
      ['relegation', 'Finishing near the bottom of the league, so the club drops to the division below.'],
      ['promoted', 'Moving up: a club winning promotion to a higher division, or a player earning a bigger role.'],
      ['market value', 'Roughly what a club would pay to sign you today. It rises with good seasons and falls with age.'],
      ['clean sheet', 'A game where your team doesn’t concede a goal. How defenders and keepers are judged.'],
      ['caps', 'Appearances for your national team. One game = one cap.'],
      ['free agent', 'A player whose contract has ended, so any club can sign them without paying a fee.'],
      ['squad role', 'How the manager sees you: key player, starter, rotation or bench. It decides your minutes.'],
      ['captain', 'The player who wears the armband, leads the team and speaks to the referee.'],
      ['Champions League', 'Europe’s top club competition, for the best teams from each league.'],
      ['continental cup', 'Each region’s competition between the best clubs from different countries.'],
      ['legacy', 'Your career score from 0 to 1000: trophies, awards, international success, loyalty and longevity.'],
      ['wage', 'What the club pays you, shown per week.'],
    ];
    const GL_SKIP = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'SCRIPT', 'STYLE', 'svg', 'SVG', 'CODE', 'KBD']);
    function glossaryLimitReached(term) { return ((prefs.glSeen || {})[term] || 0) >= 6; }
    function applyGlossary(root) {
      if (!root || prefs.glossary === false || (!isGuided() && (prefs.glSeenTotal || 0) > 60)) return;
      prefs.glSeen = prefs.glSeen || {};
      const used = new Set();
      const terms = TERMS_V8.filter(([t]) => !glossaryLimitReached(t));
      if (!terms.length) return;
      const re = new RegExp(`\\b(${terms.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (GL_SKIP.has(p.nodeName) || (p.classList && (p.classList.contains('gloss') || p.classList.contains('no-gl')))) return NodeFilter.FILTER_REJECT;
          return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      let changed = false;
      nodes.forEach((n) => {
        const m = n.nodeValue.match(re);
        if (!m) return;
        const entry = TERMS_V8.find(([t]) => t.toLowerCase() === m[1].toLowerCase());
        if (!entry || used.has(entry[1])) return;
        used.add(entry[1]);
        const span = document.createElement('span');
        span.className = 'gloss'; span.tabIndex = 0; span.setAttribute('role', 'button');
        span.dataset.gl = entry[1]; span.textContent = m[1];
        const after = n.splitText(m.index);
        after.nodeValue = after.nodeValue.slice(m[1].length);
        n.parentNode.insertBefore(span, after);
        // Count a term once per page per window, so it stays explained for the first few windows, not the first few clicks.
        const key = `${gameState ? gameState.windowCount : 'x'}|${ui.page}`;
        prefs.glLast = prefs.glLast || {};
        if (prefs.glLast[entry[0]] !== key) {
          prefs.glLast[entry[0]] = key;
          prefs.glSeen[entry[0]] = (prefs.glSeen[entry[0]] || 0) + 1;
          prefs.glSeenTotal = (prefs.glSeenTotal || 0) + 1;
          changed = true;
        }
      });
      if (changed) savePrefs();
    }
    function showGlossaryPop(el) {
      closeGlossaryPop();
      const pop = document.createElement('div');
      pop.className = 'gloss-pop'; pop.id = 'glPop'; pop.setAttribute('role', 'tooltip');
      pop.innerHTML = `<b>${esc(el.textContent)}</b><div>${esc(el.dataset.gl)}</div>`;
      document.body.appendChild(pop);
      const r = el.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 24);
      pop.style.width = `${w}px`;
      pop.style.left = `${clamp(r.left + r.width / 2 - w / 2, 12, window.innerWidth - w - 12)}px`;
      const below = r.bottom + 8 + pop.offsetHeight < window.innerHeight;
      pop.style.top = `${below ? r.bottom + 8 : r.top - pop.offsetHeight - 8}px`;
    }
    function closeGlossaryPop() { const p = $('glPop'); if (p) p.remove(); }
    document.addEventListener('click', (e) => {
      const g = e.target.closest && e.target.closest('.gloss');
      if (g) { e.stopPropagation(); e.preventDefault(); showGlossaryPop(g); return; }
      closeGlossaryPop();
    }, true);
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('gloss')) { e.preventDefault(); showGlossaryPop(document.activeElement); }
      if (e.key === 'Escape') closeGlossaryPop();
    });

    /* ---------- Setup screen: title, Just play, style picker, length, goal ---------- */
    function setupHeroHTML() {
      return `<div class="hero"><div class="hero-copy"><div class="eyebrow">Football career simulator</div>
        <h1 class="hero-title">Live a whole football career, one summer decision at a time.</h1>
        <p class="hero-sub">Start at 17. Each summer you choose where to play. The seasons play out, the people around you remember, and at the end you see the career you built. No football knowledge needed.</p>
        <div class="hero-cta"><button class="btn btn-go btn-lg" id="btnJustPlay" onclick="justPlay()">Just play ▸</button><span class="dim">A short career with tips along the way · about 15 minutes</span></div></div>
        <div class="hero-art" aria-hidden="true">${heroArtSVG()}</div></div>
        <div class="or-build"><span>or build your player</span></div>`;
    }
    function styleChooserHTML() {
      return `<div class="style-grid">${PLAY_STYLES.map((p) => `<button class="style-card ${setupConfig.position === p.pos ? 'active' : ''}" onclick="selectPosition('${p.pos}')"><span class="sc-ic">${p.ic}</span><span class="sc-t">${p.t}</span><span class="sc-d">${p.d}</span><span class="sc-code">${p.pos}</span></button>`).join('')}</div>`;
    }
    function lengthChooserHTML() {
      const short = setupConfig.length !== 'FULL';
      return `<div class="choice-grid c2"><button class="choice ${short ? 'active' : ''}" onclick="selectLength('SHORT')"><span class="choice-main">Short · 8 summers</span><span class="choice-sub">About 15 minutes · retire at 33</span></button>
        <button class="choice ${!short ? 'active' : ''}" onclick="selectLength('FULL')"><span class="choice-main">Full · you choose</span><span class="choice-sub">Pick window frequency and retirement age</span></button></div>`;
    }
    function goalChooserHTML() {
      return `<div class="goal-grid">${Object.entries(CAREER_GOALS).map(([id, g]) => `<button class="choice ${(setupConfig.goal || 'NONE') === id ? 'active' : ''}" onclick="selectGoal('${id}')"><span class="choice-main">${esc(g.t)}</span><span class="choice-sub">${esc(g.d)}</span></button>`).join('')}</div>`;
    }
    function selectLength(l) {
      setupConfig.length = l;
      if (l === 'SHORT') { setupConfig.transferInterval = SHORT_CAREER.transferInterval; $('inputRetireAge').value = SHORT_CAREER.retirementAge; }
      sfx('click'); renderSetupChoices(); updateSetupPreview();
    }
    function selectGoal(id) { setupConfig.goal = id; sfx('click'); renderSetupChoices(); }
    function isFirstEverCareer() {
      const hof = storageGet(HALL_OF_FAME_KEY, []);
      const anySlot = SLOT_KEYS.some((k, i) => loadSlot(i));
      return !(hof && hof.length) && !anySlot;
    }
    function justPlay() {
      setupConfig.mode = 'CAREER';
      setupConfig.length = 'SHORT';
      setupConfig.transferInterval = SHORT_CAREER.transferInterval;
      $('inputRetireAge').value = SHORT_CAREER.retirementAge;
      setupConfig.retirementAge = SHORT_CAREER.retirementAge;
      setupConfig.scouting = 'FULL';
      setupConfig.agentType = 'BALANCED';
      if (!setupConfig.goal || setupConfig.goal === 'NONE') setupConfig.goal = 'LEAGUE25';
      setupConfig.forceGuided = true;
      startNewCareer();
    }
    function heroArtSVG() {
      return `<svg viewBox="0 0 320 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="hl1" cx="0.2" cy="0" r="0.9"><stop offset="0" stop-color="#fff6d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient><radialGradient id="hl2" cx="0.85" cy="0" r="0.9"><stop offset="0" stop-color="#fff6d6" stop-opacity=".45"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></radialGradient></defs>
        <rect width="320" height="220" fill="url(#hl1)"/><rect width="320" height="220" fill="url(#hl2)"/>
        <g stroke="var(--text-3)" stroke-width="2" fill="none"><path d="M40 10v70M28 10h24v10H28z"/><path d="M280 10v70M268 10h24v10h-24z"/></g>
        <g fill="var(--club-1)" opacity=".55">${Array.from({ length: 60 }, (_, i) => `<circle cx="${8 + (i % 30) * 10.6}" cy="${108 + Math.floor(i / 30) * 9 + (i % 2) * 3}" r="3.2"/>`).join('')}</g>
        <path d="M0 140 L320 140 L320 220 L0 220Z" fill="var(--pitch-1, #1f6f3a)"/><g fill="var(--pitch-2, #237a41)">${[0, 2, 4].map((i) => `<rect x="${i * 64}" y="140" width="32" height="80"/>`).join('')}${[1, 3].map((i) => `<rect x="${i * 64 + 32}" y="140" width="32" height="80"/>`).join('')}</g>
        <g stroke="rgba(255,255,255,.55)" stroke-width="1.6" fill="none"><path d="M0 182h320"/><ellipse cx="160" cy="182" rx="40" ry="14"/></g>
        <circle cx="200" cy="170" r="7" fill="#fff"/><path d="M196 167l4-2 4 2-1 4h-6z" fill="#222"/></svg>`;
    }
