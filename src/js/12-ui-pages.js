    /* ==========================================================================
     * SCREEN 2: SHELL + PAGES
     * ========================================================================== */
    function applyClubTheme(club) {
      const c = clubColors(club);
      const root = document.documentElement.style;
      root.setProperty('--club-1', c.c1);
      root.setProperty('--club-2', c.c2);
      root.setProperty('--club-text', c.text);
    }
    function getOptions() {
      if (!currentChoices) return [];
      const list = [];
      if (currentChoices.stayOption) list.push({ key: 'stay', kind: 'STAY', data: currentChoices.stayOption, club: CLUB_MAP[currentChoices.stayOption.clubId] });
      currentChoices.offers.forEach((o, i) => list.push({ key: `o${i}`, kind: o.type, data: o, club: CLUB_MAP[o.clubId] }));
      return list;
    }
    const liveOptions = () => getOptions().filter((o) => !o.data.withdrawn);
    const selectedOption = () => getOptions().find((o) => o.key === ui.sel && !o.data.withdrawn) || null;

    function renderTopbar() {
      const s = gameState;
      if (!s) return;
      const pos = POSITION_PROFILES[s.setup.position];
      let club = s.currentClubId ? CLUB_MAP[s.currentClubId] : null;
      let preview = false;
      const sel = selectedOption();
      if (ui.page === 'transfers' && sel && sel.club && sel.club.id !== s.currentClubId) { club = sel.club; preview = true; }
      applyClubTheme(club);
      $('tbCrest').innerHTML = crestSVG(club, 38);
      $('tbClub').innerHTML = `${club ? esc(club.name) : 'Academy Graduate'}${preview ? '<span class="tb-preview">PREVIEW</span>' : ''}${isQuick() ? ' <span class="pill pill-info" style="font-size:10px">⚡ QUICK</span>' : ''}`;
      $('tbPlayer').textContent = `${s.playerName}${s.shirtNumber && !preview ? ` #${s.shirtNumber}` : ''} · ${pos.code} · Age ${s.currentAge}${club ? ` · ${preview ? club.league : displayLeague(s, club)}` : ''}`;
      $('tbDate').textContent = `Summer ${windowYear(s.currentAge)}`;
      $('tbStatus').textContent = currentChoices ? (currentChoices.isFirstTurn ? 'First pro contract' : 'Transfer window open') : '';
      const btn = $('btnContinue');
      btn.disabled = false;
      if (ui.page !== 'transfers') btn.innerHTML = 'Transfer Centre ▸';
      else if (!sel) { btn.innerHTML = isQuick() ? 'Pick a card' : 'Pick an option'; btn.disabled = true; }
      else if (sel.kind === 'STAY') btn.innerHTML = 'Confirm: stay ▸';
      else btn.innerHTML = `Confirm: ${esc(clubCode(sel.club))} ▸`;
      applyPrefs();
    }

    const NAV_FULL = [
      { id: 'home', label: 'Home', icon: 'home' }, { id: 'inbox', label: 'Inbox', icon: 'inbox' }, { id: 'transfers', label: 'Transfer Centre', icon: 'transfer' }, null,
      { id: 'stats', label: 'Player Stats', icon: 'chart' }, { id: 'career', label: 'Career', icon: 'history' }, { id: 'trophies', label: 'Trophy Cabinet', icon: 'trophy' }, { id: 'matches', label: 'Matches', icon: 'calendar' }, { id: 'training', label: 'Training', icon: 'dumbbell' }, { id: 'contract', label: 'Contract', icon: 'coins' }, { id: 'media', label: 'Media', icon: 'mic' }, { id: 'world', label: 'World', icon: 'globe' }, { id: 'story', label: 'My Story', icon: 'book' }, { id: 'album', label: 'Sticker Album', icon: 'album' }, null,
      { id: 'hof', label: 'Hall of Fame', icon: 'star' },
    ];
    const NAV_QUICK = [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'transfers', label: 'Offers', icon: 'transfer' }, { id: 'trophies', label: 'Trophies', icon: 'trophy' }, { id: 'career', label: 'Career', icon: 'history' }, { id: 'matches', label: 'Matches', icon: 'calendar' }, { id: 'training', label: 'Training', icon: 'dumbbell' }, { id: 'world', label: 'World', icon: 'globe' }, { id: 'story', label: 'My Story', icon: 'book' }, { id: 'album', label: 'Album', icon: 'album' }, null, { id: 'hof', label: 'Hall of Fame', icon: 'star' }];
    /* v12: fifteen pages folded into seven sections; pages that share a section get tabs. */
    const NAV_GROUPS = [
      { id: 'home', label: 'Home', icon: 'home', pages: ['home'] },
      { id: 'transfers', label: 'Transfer Centre', short: 'Transfers', icon: 'transfer', pages: ['transfers'] },
      { id: 'matches', label: 'Matches', icon: 'calendar', pages: ['matches'] },
      { id: 'player', label: 'Player', icon: 'chart', pages: ['stats', 'training', 'contract', 'media'] },
      { id: 'storyg', label: 'Story', icon: 'book', pages: ['story', 'inbox', 'album'] },
      { id: 'world', label: 'World', icon: 'globe', pages: ['world'] },
      { id: 'legacy', label: 'Legacy', icon: 'trophy', pages: ['career', 'trophies', 'hof'] },
    ];
    const PAGE_TAB_LABEL = { stats: 'Stats', training: 'Training', contract: 'Contract', media: 'Media', story: 'My Story', inbox: 'News', album: 'Sticker Album', career: 'Club journey', trophies: 'Trophies', hof: 'Hall of Fame' };
    const lastTab = {};
    function pagesAvailable() { return new Set((isQuick() ? NAV_QUICK : NAV_FULL).filter(Boolean).map((n) => n.id)); }
    function groupPages(g) { const av = pagesAvailable(); return g.pages.filter((p) => av.has(p) && navVisible(p)); }
    function groupOf(page) { return NAV_GROUPS.find((g) => g.pages.includes(page)) || NAV_GROUPS[0]; }
    function visibleGroups() { return NAV_GROUPS.filter((g) => groupPages(g).length); }
    function goGroup(id) { const g = NAV_GROUPS.find((x) => x.id === id); const pages = groupPages(g); navTo(pages.includes(lastTab[id]) ? lastTab[id] : pages[0]); }
    function navBadge(g, unread, nOpts) {
      if (g.id === 'storyg' && unread) return `<span class="nav-badge">${unread > 99 ? '99+' : unread}</span>`;
      if (g.id === 'transfers' && nOpts) return `<span class="nav-badge go">${nOpts}</span>`;
      if (g.id === 'player' && gameState.v11 && gameState.v11.offers) return '<span class="nav-badge go">!</span>';
      return '';
    }
    function sectionTabsHTML(page) {
      const g = groupOf(page);
      const pages = groupPages(g);
      if (pages.length < 2) return '';
      const unread = Math.max(0, gameState.dramaLog.length - (gameState.inboxRead || 0));
      return `<div class="sect-tabs" role="tablist">${pages.map((p) => `<button role="tab" class="sect-tab ${p === page ? 'active' : ''}" onclick="navTo('${p}')">${PAGE_TAB_LABEL[p] || p}${p === 'inbox' && unread ? ` <span class="nav-badge">${unread > 99 ? '99+' : unread}</span>` : ''}${p === 'media' && gameState.v11 && gameState.v11.offers ? ' <span class="nav-badge go">!</span>' : ''}</button>`).join('')}</div>`;
    }
    function renderSidebar() {
      const s = gameState;
      const unread = Math.max(0, s.dramaLog.length - (s.inboxRead || 0));
      const nOpts = liveOptions().length;
      const total = s.ageSteps.length - 1;
      const cur = groupOf(ui.page).id;
      const groups = visibleGroups();
      $('sidebar').innerHTML = `<div class="nav">${groups.map((g, i) => `${i === 3 ? '<div class="nav-sep"></div>' : ''}<button class="nav-item ${cur === g.id ? 'active' : ''}" onclick="goGroup('${g.id}')">${icon(g.icon)}<span>${g.label}</span>${navBadge(g, unread, nOpts)}</button>`).join('')}</div>
      <div class="side-foot">
        <div class="eyebrow">Career progress</div>
        <div class="side-prog"><div style="width:${(s.stepIndex / total) * 100}%"></div></div>
        <div class="dim" style="font-size:11px; margin-bottom:10px">Window ${Math.min(s.stepIndex + 1, total)} of ${total} · retires at ${s.setup.retirementAge}</div>
        <button class="nav-item" style="padding:7px 8px; color:#ff9e9b" onclick="resetToSetup()">${icon('reset')}<span>Main menu</span></button>
      </div>`;
      $('bottomnav').innerHTML = groups.map((g) => `<button class="bn-item ${cur === g.id ? 'active' : ''}" onclick="goGroup('${g.id}')" aria-label="${g.label}">${icon(g.icon)}<span>${g.short || g.label}</span>${navBadge(g, unread, nOpts)}</button>`).join('');
    }
    function navTo(page) {
      ui.page = page;
      renderApp();
      $('main').scrollTop = 0;
      if (typeof afterNavA11y === 'function') afterNavA11y();
      if (page === 'transfers') setTimeout(() => maybeStartTour(), 350);
    }
    function handleContinue() {
      if (ui.page !== 'transfers') return navTo('transfers');
      if (ui.sel) confirmSelection();
    }
    function renderApp() {
      if (!gameState) return;
      ensureProjections();
      checkReveals(gameState);
      applyClubAccent(CLUB_MAP[gameState.currentClubId]);
      renderTopbar();
      renderSidebar();
      renderPage();
    }
    function renderPage() {
      const pages = { home: renderHome, inbox: renderNewsFeed, transfers: renderTransfers, stats: renderStats, career: renderCareer, trophies: renderTrophies, hof: renderHofPage, story: renderStoryPage2, album: renderAlbumPage, matches: renderMatchesPage, training: renderTrainingPage, contract: renderContractPage, media: renderMediaPage, world: renderWorldPage };
      lastTab[groupOf(ui.page).id] = ui.page;
      $('main').innerHTML = sectionTabsHTML(ui.page) + (pages[ui.page] || renderHome)();
      if (ui.page === 'inbox') markInboxRead();
      if (ui.page === 'story') afterRenderStoryPage2();
      if (ui.page === 'home') bindStoryButtons($('homeStories'), ensureStory(gameState).journal, () => renderApp());
      if (ui.page === 'transfers' && arrivalNeeded() && $('arrFeed')) runArrivals();
      if (ui.page === 'album') afterRenderAlbum();
      if (!navVisible(ui.page)) { ui.page = 'home'; renderPage(); return; }
      applyGlossary($('main'));
      staggerIn($('main'));
    }

    /* ---------------- Keyboard shortcuts ---------------- */
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'Escape') {
        if (!$('settingsPop').classList.contains('hidden')) { toggleSettings(); return; }
        if (!$('hofModal').classList.contains('hidden')) { closeHofStandalone(); return; }
        if (!$('tourLayer').classList.contains('hidden')) { endTour(); return; }
        if (!$('negoModal').classList.contains('hidden')) { closeNegotiation(); return; }
      }
      if (!$('negoModal').classList.contains('hidden')) return;
      if (!$('review').classList.contains('hidden')) {
        if (e.key === ' ' && RV.phase === 'seasons') { e.preventDefault(); skipReview(); }
        if (e.key === 'Enter' && RV.phase === 'summary') { e.preventDefault(); finishReview(); }
        return;
      }
      if ($('screenApp').classList.contains('hidden') || !gameState || !$('tourLayer').classList.contains('hidden')) return;
      if (e.key === 'Enter') { e.preventDefault(); if (ui.page === 'transfers' && arrivalNeeded()) finishArrivals(); else handleContinue(); return; }
      if (e.key.toLowerCase() === 'g') { navTo('transfers'); return; }
      if (e.key.toLowerCase() === 'h') { navTo('home'); return; }
      if (ui.page !== 'transfers' || arrivalNeeded()) return;
      const opts = liveOptions();
      if (/^[1-9]$/.test(e.key) && opts[Number(e.key) - 1]) { selectOption(opts[Number(e.key) - 1].key); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = opts.findIndex((o) => o.key === ui.sel);
        const next = e.key === 'ArrowDown' ? Math.min(opts.length - 1, idx + 1) : Math.max(0, idx - 1);
        if (opts[next]) selectOption(opts[next].key);
      }
    });

    /* ---------------- HOME ---------------- */
    function careerTiles(s) {
      const d = getDerivedState(s);
      const defs = statDefs(s.setup.position);
      const st = s.stats;
      const v = (def) => (def.k === 'goals' ? st.goals : def.k === 'assists' ? st.assists : def.k === 'cs' ? st.cleanSheets : def.k === 'tackles' ? st.tackles : `${d.averageSavePct}%`);
      return [
        { v: st.appearances, l: 'Appearances' }, { v: v(defs[0]), l: defs[0].l }, { v: v(defs[1]), l: defs[1].l },
        { v: st.ratedYears ? d.averageRating.toFixed(2) : '—', l: 'Avg rating' }, { v: s.trophies.length, l: 'Trophies' },
        { v: `${st.ballonDOrs}${st.bestBdORank && !st.ballonDOrs ? ` <span class="dim" style="font-size:12px">best ${ordinal(st.bestBdORank)}</span>` : ''}`, l: "Ballon d'Ors" },
        { v: `${st.internationalCaps}<span class="dim" style="font-size:12px"> / ${st.internationalGoals}g</span>`, l: 'Caps / int’l goals' }, { v: `${fmtM(careerEarnings(s))}<span class="dim" style="font-size:12px"> · ${fmtM(careerEarningsNet(s))} after tax</span>`, l: 'Career earnings' },
      ];
    }
    const tilesHTML = (tiles) => `<div class="tiles">${tiles.map((t) => `<div class="tile"><div class="v">${t.v}</div><div class="l">${t.l}</div></div>`).join('')}</div>`;
    function nextTournament(s) {
      const age = Object.keys(TOURNAMENT_SCHEDULE).map(Number).find((a) => a >= s.currentAge && a < s.setup.retirementAge);
      if (!age) return null;
      const t = TOURNAMENT_SCHEDULE[age];
      const nation = getNation(s);
      return { age, title: t.type === 'WORLD_CUP' ? 'FIFA World Cup' : CONTINENTS[s.setup.continent].tournamentName, need: (age === 18 ? 16 : 22) + Math.round((nation.str - 1) * 6), rating: (6.65 + (nation.str - 0.6) * 0.7).toFixed(2) };
    }
    function playerBadges(s) {
      const b = [];
      if (s.isCaptain) b.push('<span class="pill pill-gold">© Captain</span>');
      if (s.nationalCaptain) b.push('<span class="pill pill-gold">🎗️ National captain</span>');
      if (s.globalBrandPRBoost > 0) b.push('<span class="pill pill-info">🌐 Global icon</span>');
      if (s.unwantedByManager) b.push('<span class="pill pill-neg">⚠ Frozen out</span>');
      if (s.relegatedLastWindow) b.push('<span class="pill pill-neg">📉 2nd tier</span>');
      if (s.transferRequested) b.push('<span class="pill pill-warn">📨 Transfer request</span>');
      if (s.stats.ballonDOrs) b.push(`<span class="pill pill-gold">🌟 ${s.stats.ballonDOrs}× Ballon d'Or</span>`);
      return b.join('');
    }
    function profileCardHTML(s) {
      const pos = POSITION_PROFILES[s.setup.position];
      const nation = getNation(s);
      const club = s.currentClubId ? CLUB_MAP[s.currentClubId] : null;
      const trend = s.valueHistory.length > 1 ? s.marketValueM - s.valueHistory[s.valueHistory.length - 2].valueM : 0;
      const contract = !club ? '—' : s.contractYearsRemaining <= 0 ? '<span class="pos-t">Free agent</span>' : `${s.contractYearsRemaining} yr${s.contractYearsRemaining > 1 ? 's' : ''}${s.runDownContractActive ? ' <span class="pill pill-warn">running down</span>' : ''}`;
      return `<div class="panel profile-card">
        ${club ? `<div class="pc-kit" title="Your shirt">${shirtSVG(club, s.playerName, s.shirtNumber, 74)}</div>` : `<div class="pc-shield">${pos.code}</div>`}
        <div>
          <div class="pc-name">${esc(s.playerName)} ${playerBadges(s)}</div>
          <div class="pc-meta">${pos.name} · ${esc(nation.name)} · Age ${s.currentAge} · overall <b style="color:${attrColor(overallRating(s.setup.position, s.attributes))}">${overallRating(s.setup.position, s.attributes).toFixed(1)}</b></div>
          <div class="pc-facts">
            <div><div class="k">Club</div><div class="v club-cell">${club ? crestSVG(club, 16) : ''}${club ? esc(club.name) : 'Unattached'} ${club ? trendHTML(club.id) : ''}</div></div>
            <div><div class="k">Role</div><div class="v">${club ? roleLabel(s.squadRole) : 'Prospect'}</div></div>
            <div><div class="k">Contract · wage</div><div class="v">${contract}${club ? ` · ${fmtWage(s.wageM)}` : ''}</div></div>
            <div><div class="k">Release clause</div><div class="v">${club ? (s.releaseClauseM ? fmtM(s.releaseClauseM) : 'None') : '—'}</div></div>
          </div>
        </div>
        <div class="pc-value">
          <div class="eyebrow">Market value</div>
          <div class="big">${fmtM(s.marketValueM)} <span style="font-size:15px; color:${trend > 0 ? 'var(--pos)' : trend < 0 ? 'var(--neg)' : 'var(--text-3)'}">${trend > 0 ? '▲' : trend < 0 ? '▼' : ''}</span></div>
          <div class="dim" style="font-size:11px">Peak ${fmtM(s.peakMarketValueM)} at ${s.peakValueAge}</div>
          ${repHTML(s)}${formHTML(s)}
        </div>
      </div>`;
    }
    function newsListHTML(s, count) {
      const items = s.dramaLog.map((e, i) => ({ ...e, idx: i })).reverse().slice(0, count);
      if (!items.length) return '<div class="empty">No news yet. Sign your first contract to get the headlines rolling.</div>';
      return items.map((e) => {
        const m = metaFor(e.type);
        const { title, body } = splitHeadline(e.headline, e.type);
        return `<div class="news-item" onclick="openInbox(${e.idx})"><div class="news-ico" style="background:${m.color}22; color:${m.color}">${m.icon}</div><div style="min-width:0"><div class="news-title">${esc(title)}</div><div class="muted" style="font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(body)}</div><div class="news-meta">${seasonLabel(e.age)} · Age ${e.age}</div></div></div>`;
      }).join('');
    }
    function rivalPanelHTML(s) {
      const r = s.rival;
      if (!r) return '';
      const prof = POSITION_PROFILES[s.setup.position];
      const statKey = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
      const club = CLUB_MAP[r.clubId];
      const row = (label, mine, theirs, fmt = (x) => x) => `<div class="l ${mine > theirs ? 'win' : ''}">${fmt(mine)}</div><div class="m">${label}</div><div class="r ${theirs > mine ? 'win' : ''}">${fmt(theirs)}</div>`;
      return `<div class="panel"><div class="panel-head"><span>Your rival</span><span class="right">${club ? crestSVG(club, 14) : ''} ${esc(club ? club.name : '')}</span></div><div class="panel-body">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:900"><span>${esc(s.playerName)}</span><span style="color:var(--purple)">${esc(r.name)} <span class="dim" style="font-weight:600">· ${esc(r.nationName)}</span></span></div>
        <div class="h2h">
          ${row('Apps', s.stats.appearances, r.apps)}
          ${row(prof.primaryStatType === 'ATTACK' ? 'Goals' : 'Clean sheets', s.stats[statKey], r[statKey])}
          ${row('Trophies', s.trophies.length, r.trophies)}
          ${row("Ballon d'Or", s.stats.ballonDOrs, r.ballonDOrs)}
          ${row('Best BdO finish', -(s.stats.bestBdORank || 99), -(r.bestRank || 99), (x) => (x === -99 ? '—' : ordinal(-x)))}
          ${row('Value', s.marketValueM, r.valueM, fmtM)}
        </div></div></div>`;
    }
    function renderHome() {
      const s = gameState;
      const d = getDerivedState(s);
      const opts = liveOptions();
      const nt = nextTournament(s);
      const pos = POSITION_PROFILES[s.setup.position];
      const prime = s.currentAge < pos.peakStart ? `Prime starts in ${pos.peakStart - s.currentAge} yr(s)` : s.currentAge <= pos.peakEnd ? `In your prime (until ${pos.peakEnd})` : `${s.currentAge - pos.peakEnd} yr(s) past peak`;
      const cta = yourMoveHTML(s, opts, nt);
      const code = careerCode(s.setup);
      return `<h1 class="sr-only">Home: ${esc(s.playerName)}</h1>${profileCardHTML(s)}
        <div style="height:14px"></div>${cta}<div style="height:14px"></div>${goalCardHTML(s)}${homeHeadlineHTML(s)}${homeStoriesHTML(s)}
        <div class="grid g-home">
          <div class="grid">
            <div class="panel"><div class="panel-head"><span>Career statistics</span><span class="right">${s.seasonLog.length} season(s)</span></div><div class="panel-body">${tilesHTML(careerTiles(s))}</div></div>
            <div class="panel"><div class="panel-head"><span>Market value</span><span class="right"><span style="color:#3ecf6e">━</span> you · <span style="color:#a78bfa">┅</span> ${esc(s.rival ? s.rival.name : 'rival')}</span></div><div class="panel-body">${valueChartSVG({ history: s.valueHistory, maxAge: s.setup.retirementAge, rival: rivalValueHistory(s) })}</div></div>
            ${isQuick() ? '' : `<div class="panel"><div class="panel-head"><span>Attributes</span><span class="right">Training: ${TRAINING_FOCUS[s.trainingFocus].icon} ${TRAINING_FOCUS[s.trainingFocus].label}</span></div><div class="panel-body">${attributesHTML(s)}</div></div>`}
          </div>
          <div class="grid" style="align-content:start">
            ${s.currentClubId ? `<div class="panel"><div class="panel-head"><span>The fans</span><span class="right">${crestSVG(CLUB_MAP[s.currentClubId], 14)} ${esc(CLUB_MAP[s.currentClubId].name)}</span></div><div class="panel-body">${moodMeterHTML(s, s.currentClubId)}${fanPostsHTML(homeFanPosts(s), CLUB_MAP[s.currentClubId])}</div></div>` : ''}
            ${s.seasonLog.length ? `<div class="panel"><div class="panel-head"><span>Within reach</span><span class="right">records & milestones</span></div><div class="panel-body">${withinReachHTML(s)}</div></div>` : ''}
            ${rivalPanelHTML(s)}
            <div class="panel"><div class="panel-head"><span>Latest news</span>${isQuick() ? '' : '<button class="btn btn-ghost" style="padding:2px 8px" onclick="navTo(\'inbox\')">Inbox ▸</button>'}</div><div class="panel-body" style="padding:4px 12px">${newsListHTML(s, 5)}</div></div>
            <div class="panel"><div class="panel-head">Outlook</div><div class="panel-body"><dl class="kv">
              <dt>Next tournament</dt><dd>${nt ? `${nt.title} · age ${nt.age}` : 'None left'}</dd>
              ${nt ? `<dt>Call-up needs</dt><dd>${nt.need}+ apps & ${nt.rating}+ rating</dd>` : ''}
              <dt>Peak curve</dt><dd>${prime}</dd>
              <dt>Retirement</dt><dd>${s.setup.retirementAge - s.currentAge} season(s) left</dd>
              <dt>Window length</dt><dd>${d.actualWindowYears} season(s)</dd>
              <dt>Agent</dt><dd>${agentOf(s).icon} ${agentOf(s).label}</dd>
              <dt>Career code</dt><dd><span class="num" style="font-size:11.5px">${esc(code)}</span> <button class="btn btn-ghost" style="padding:1px 6px" onclick="copyCode()">Copy</button></dd>
            </dl></div></div>
          </div>
        </div>`;
    }
    function yourMoveHTML(s, opts, nt) {
      const d = getDerivedState(s);
      const club = s.currentClubId ? CLUB_MAP[s.currentClubId] : null;
      const offers = opts.filter((o) => o.kind !== 'STAY').length;
      const arrived = s.arrivedWindow === s.windowCount;
      let headline;
      if (currentChoices.isFirstTurn) headline = `${offers} club${offers === 1 ? '' : 's'} want${offers === 1 ? 's' : ''} to give you your first pro contract`;
      else if (!arrived) headline = 'Deadline day — the phones are ringing';
      else if (s.contractYearsRemaining <= 0) headline = `You're a free agent — ${offers} club${offers === 1 ? '' : 's'} on the table`;
      else headline = `${offers} offer${offers === 1 ? '' : 's'} on the table${club ? ` — or stay at ${club.name}` : ''}`;
      const lines = [];
      if (club) lines.push(s.contractYearsRemaining <= 0 ? '🆓 Out of contract: every move is a free transfer' : `📄 ${s.contractYearsRemaining} year${s.contractYearsRemaining === 1 ? '' : 's'} left on your deal · ${roleLabel(s.squadRole)}`);
      if (nt) lines.push(`🌍 ${nt.title} at ${nt.age}: you need ${nt.need}+ games a season to make the squad`);
      if (club) { const m = moodOf(s, club.id); const [, l, e] = moodLabel(m); lines.push(`${e} ${club.name} fans: ${l.toLowerCase()}`); }
      if (d.isFinalWindow) lines.push('🏁 Final window — this decision ends your career');
      if (ui.bestFit && arrived && scoutLevel() !== 'BLIND') { const b = getOptions().find((o) => o.key === ui.bestFit); if (b) lines.push(`⭐ Best fit for ${PRIORITIES[s.priority || 'BALANCED'].label.toLowerCase()}: ${b.kind === 'STAY' ? `stay at ${b.club.name}` : b.club.name}`); }
      return `<div class="panel hero-move" style="--hc:${club ? clubColors(club).c1 : '#2a7d4f'}">
          <div class="hm-l"><div class="eyebrow" style="color:#7fe7a2">Your move · ${currentChoices.isFirstTurn ? 'career start' : `window ${s.stepIndex + 1} of ${s.ageSteps.length - 1}`}</div>
            <h3 aria-level="2">${esc(headline)}</h3>
            <div class="hm-lines">${lines.slice(0, 3).map((l) => `<div>${esc(l)}</div>`).join('')}</div>
            ${arrived ? `<div class="mini-offers">${opts.map((o) => `<span class="mini-offer">${crestSVG(o.club, 16)}${esc(o.club.name)} <span class="dim">${o.kind === 'STAY' ? 'stay' : o.data.feeM ? fmtM(o.data.feeM) : 'free'}</span></span>`).join('')}</div>` : ''}
          </div>
          <div class="hm-r">${isQuick() ? '<button class="btn btn-lg" onclick="autoplayCareer()">⏩ Auto-play</button>' : ''}<button class="btn btn-go btn-lg" onclick="navTo('transfers')">${arrived ? (isQuick() ? 'See offers ▸' : 'Make your decision ▸') : '📱 See who calls ▸'}</button></div>
        </div>`;
    }
    function homeFanPosts(s) {
      const club = CLUB_MAP[s.currentClubId];
      const last = s.seasonLog[s.seasonLog.length - 1];
      const m = moodOf(s, club.id);
      let kind = 'stay';
      if (m < 25) kind = 'hostile';
      else if (last && last.clubId === club.id && last.trophies.length) kind = 'trophy';
      else if (last && last.rating >= 7.8) kind = 'great';
      else if (last && last.rating < 6.8) kind = 'poor';
      else if (!last || last.clubId !== club.id) kind = 'arrival';
      return fanPosts(kind, club, {}, `home${s.currentAge}`);
    }
    function rivalValueHistory(s) {
      if (!s.rival || !s.rival.history.length) return null;
      // Reconstruct an approximate value path from the rival's seasons for the chart.
      let v = s.valueHistory[0].valueM * 1.1;
      const out = [{ age: 17, valueM: v }];
      const prof = POSITION_PROFILES[s.rival.position] || POSITION_PROFILES.ST;
      s.rival.history.forEach((h) => {
        if (h.valueM != null) v = h.valueM;
        else { const dp = h.age < prof.peakStart ? (h.rating - 6.8) * 0.4 + 0.12 : h.age <= prof.peakEnd ? (h.rating - 7.2) * 0.25 : -prof.postPeakDecline; v = clamp(v * (1 + dp), 0.5, prof.maxBaseValueM * 1.1); }
        out.push({ age: h.age + 1, valueM: v });
      });
      return out;
    }
    function copyCode() {
      const code = careerCode(gameState.setup);
      try { navigator.clipboard.writeText(code); showToast('Career code copied', `${code} — share it so a friend can play the same career.`); } catch { prompt('Copy your career code:', code); }
    }

    /* ---------------- INBOX ---------------- */
    function openInbox(idx) { ui.inboxSel = idx; navTo(isQuick() ? 'home' : 'inbox'); }
    function markInboxRead() {
      if (gameState && gameState.inboxRead !== gameState.dramaLog.length) {
        gameState.inboxRead = gameState.dramaLog.length;
        saveCareer(gameState);
        renderSidebar();
      }
    }
    function selectInbox(idx) { ui.inboxSel = idx; renderPage(); }

    /* ---------------- PLAYER STATS ---------------- */
    function seasonTableHTML(s) {
      const defs = statDefs(s.setup.position);
      if (!s.seasonLog.length) return `<div class="empty" style="margin:12px">No completed seasons yet${s.importedFrom ? ` (seasons before the v${s.importedFrom} import weren't recorded)` : ''}.</div>`;
      const val = (row, def) => (def.isPct ? (row.savePct != null ? `${row.savePct}%` : '—') : row[def.sk]);
      const tot = { apps: 0, a: 0, b: 0, y: 0, r: 0 };
      s.seasonLog.forEach((r) => { tot.apps += r.apps; tot.a += r[defs[0].sk] || 0; tot.b += defs[1].isPct ? 0 : r[defs[1].sk] || 0; tot.y += r.yellows; tot.r += r.reds; });
      const d = getDerivedState(s);
      return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Season</th><th class="r">Age</th><th>Club</th><th>Role</th><th class="r">Apps</th><th class="r">${defs[0].s}</th><th class="r">${defs[1].s}</th><th class="r">Cards</th><th class="c">Av Rat</th><th class="r">BdO</th><th class="r">Value</th><th class="r">Wage</th><th>Honours</th></tr></thead><tbody>
        ${s.seasonLog.map((r) => {
          const club = r.onLoan ? findClubByName(r.loanClubName) : CLUB_MAP[r.clubId];
          const hon = `${r.trophies.map((t) => (t.category === 'INTERNATIONAL' ? '🌍' : t.category === 'CONTINENTAL' ? '⭐' : t.category === 'DOMESTIC_LEAGUE' ? '🏆' : t.category === 'SECOND_TIER' ? '⬆️' : '🥈')).join('')}${r.ballonDor ? '🌟' : ''}${(r.awards || []).length ? `<span title="${esc(r.awards.join(', '))}">🏅${r.awards.length > 1 ? `×${r.awards.length}` : ''}</span>` : ''}${r.injured ? ' <span class="dim" title="Injury">🏥</span>' : ''}`;
          return `<tr><td class="num">${r.season}</td><td class="r">${r.age}</td><td><div class="club-cell">${crestSVG(club || CLUB_MAP[r.clubId], 15)}${esc(r.onLoan ? r.loanClubName : r.clubName)}${r.onLoan ? ' <span class="pill pill-purple">loan</span>' : ''}${r.secondTier ? ` <span class="pill pill-neg" title="${esc(r.league)}">2nd tier</span>` : ''}</div></td><td class="muted">${roleLabel(r.role)}</td><td class="r">${r.apps}</td><td class="r">${val(r, defs[0])}</td><td class="r">${val(r, defs[1])}</td><td class="r"><span style="color:#f2c94c">${r.yellows}</span>/<span style="color:#ef5350">${r.reds}</span></td><td class="c">${ratingBadge(r.rating)}</td><td class="r">${r.bdRank ? (r.bdRank === 1 ? '<b class="gold-t">1st</b>' : ordinal(r.bdRank)) : '<span class="dim">—</span>'}</td><td class="r">${fmtM(r.valueEnd)}</td><td class="r dim">${r.wageM != null ? fmtWage(r.wageM) : '—'}</td><td>${hon || '<span class="dim">—</span>'}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="4">Career total</td><td class="r">${tot.apps}</td><td class="r">${tot.a}</td><td class="r">${defs[1].isPct ? `${d.averageSavePct}%` : tot.b}</td><td class="r">${tot.y}/${tot.r}</td><td class="c">${ratingBadge(d.averageRating)}</td><td class="r">${s.stats.bestBdORank ? ordinal(s.stats.bestBdORank) : '—'}</td><td class="r">${fmtM(s.peakMarketValueM)} pk</td><td class="r">${fmtM(careerEarnings(s))}</td><td>${s.trophies.length} 🏆</td></tr></tfoot></table></div>`;
    }
    function clubTotalsHTML(s) {
      const defs = statDefs(s.setup.position);
      const map = new Map();
      s.seasonLog.forEach((r) => {
        const key = r.onLoan ? `loan:${r.loanClubName}` : r.clubId;
        if (!map.has(key)) map.set(key, { name: r.onLoan ? r.loanClubName : r.clubName, club: r.onLoan ? findClubByName(r.loanClubName) : CLUB_MAP[r.clubId], loan: r.onLoan, seasons: 0, apps: 0, a: 0, b: 0, rs: 0, tro: 0, from: r.age, to: r.age });
        const m = map.get(key);
        m.seasons++; m.apps += r.apps; m.a += r[defs[0].sk] || 0; m.b += defs[1].isPct ? r.savePct || 0 : r[defs[1].sk] || 0; m.rs += r.rating; m.tro += r.trophies.length; m.to = r.age;
      });
      if (!map.size) return '<div class="empty" style="margin:12px">No completed seasons yet.</div>';
      return `<table class="tbl"><thead><tr><th>Club</th><th class="r">Ages</th><th class="r">Seasons</th><th class="r">Apps</th><th class="r">${defs[0].s}</th><th class="r">${defs[1].s}</th><th class="c">Av Rat</th><th class="r">Trophies</th></tr></thead><tbody>${[...map.values()].map((m) => `<tr><td><div class="club-cell">${crestSVG(m.club, 15)}${esc(m.name)}${m.loan ? ' <span class="pill pill-purple">loan</span>' : ''}</div></td><td class="r">${m.from}–${m.to + 1}</td><td class="r">${m.seasons}</td><td class="r">${m.apps}</td><td class="r">${m.a}</td><td class="r">${defs[1].isPct ? `${fmt1(m.b / m.seasons)}%` : m.b}</td><td class="c">${ratingBadge(m.rs / m.seasons)}</td><td class="r">${m.tro}</td></tr>`).join('')}</tbody></table>`;
    }
    function attrHistoryChart(s) {
      const pts = (s.attrHistory || []).filter((p) => p.overall);
      if (pts.length < 2) return '<div class="dim">Attribute history builds up as you play seasons.</div>';
      return valueChartSVG({ history: pts.map((p) => ({ age: p.age, valueM: p.overall })), w: 520, h: 150, maxAge: s.setup.retirementAge }).replace(/€/g, '').replace(/M</g, '<');
    }
    function setStatsTab(t) { ui.statsTab = t; renderPage(); }
    function renderStats() {
      const s = gameState;
      const tabs = [['seasons', 'Season by season'], ['clubs', 'By club'], ['attributes', 'Attributes'], ['value', 'Market value']];
      let body;
      if (ui.statsTab === 'seasons') body = seasonTableHTML(s);
      else if (ui.statsTab === 'clubs') body = clubTotalsHTML(s);
      else if (ui.statsTab === 'attributes') body = `<div class="panel-body grid g-2"><div>${attributesHTML(s)}<div class="dim" style="font-size:12px; margin-top:10px">Attributes grow with minutes, coaching (club stars) and your training focus, and fade after your prime — pace and physique first. Being above a “neutral development” baseline boosts your output by up to 22%.</div></div><div><div class="eyebrow" style="margin-bottom:6px">Overall rating over time</div>${attrHistoryChart(s)}</div></div>`;
      else body = `<div class="panel-body">${valueChartSVG({ history: s.valueHistory, w: 900, h: 260, maxAge: s.setup.retirementAge, rival: rivalValueHistory(s) })}</div>`;
      return `<div class="page-head"><div><div class="eyebrow">Player stats</div><h1>${esc(s.playerName)}</h1><div class="sub">${POSITION_PROFILES[s.setup.position].name} · ${s.seasonLog.length} senior season(s)</div></div></div>
        <div class="panel" style="margin-bottom:14px"><div class="panel-body">${tilesHTML(careerTiles(s))}</div></div>
        <div class="tabs">${tabs.map(([id, l]) => `<button class="tab ${ui.statsTab === id ? 'active' : ''}" onclick="setStatsTab('${id}')">${l}</button>`).join('')}</div>
        <div class="panel">${body}</div>`;
    }

    /* ---------------- CAREER ---------------- */
    function journeyHTML(s, preview = null, tall = false) {
      const a0 = 17;
      const a1 = s.setup.retirementAge;
      const X = (a) => ((Math.min(a, a1) - a0) / Math.max(1, a1 - a0)) * 100;
      const seg = (club, from, to, label, extra = '') => {
        if (to <= from) return '';
        const c = clubColors(club);
        const wPct = X(to) - X(from);
        return `<div class="j-seg ${extra}" style="left:${X(from)}%; width:calc(${wPct}% - 2px); background:${c.c1}; color:${c.text}; border-left:3px solid ${c.c2}" title="${esc(label)} · ${from}–${to}">${wPct > 6 ? crestSVG(club, 14) : ''}${wPct > 11 ? `<span>${esc(label)}</span>` : ''}</div>`;
      };
      let html = '';
      s.clubHistory.forEach((st) => { html += seg(CLUB_MAP[st.clubId], st.startAge, st.endAge, st.clubName); });
      if (s.currentStint && s.currentAge > s.currentStint.startAge) html += seg(CLUB_MAP[s.currentStint.clubId], s.currentStint.startAge, s.currentAge, s.currentStint.clubName);
      if (preview) html += seg(preview.club, s.currentAge, Math.min(a1, s.currentAge + preview.years), `${preview.club.name} · ${preview.years} yr`, 'preview');
      const steps = s.ageSteps;
      const k = Math.max(1, Math.ceil(steps.length / 12));
      const ticks = steps.map((a, i) => (i % k === 0 || i === steps.length - 1 ? `<span class="j-tick" style="left:${X(a)}%">${i === steps.length - 1 ? `${a}R` : a}</span>` : '')).join('');
      const tours = Object.entries(TOURNAMENT_SCHEDULE).filter(([a]) => Number(a) < a1).map(([a, t]) => `<span class="j-tour" style="left:${X(Number(a) + 0.5)}%" title="${t.type === 'WORLD_CUP' ? 'FIFA World Cup' : 'Continental championship'} · age ${a}">🌍</span>`).join('');
      const loans = (s.loanHistory || []).map((l) => `<span class="j-loan" style="left:${X(l.age + 0.5)}%" title="Loan: ${esc(l.loanClubName)}">🌱</span>`).join('');
      return `<div class="journey ${tall ? 'tall' : ''}"><div class="j-track">${html}${tours}${loans}${s.isRetired ? '' : `<div class="j-now" style="left:${X(s.currentAge)}%"></div>`}</div><div class="j-axis">${ticks}</div></div>`;
    }
    function clubRecordsHTML(s) {
      const prof = POSITION_PROFILES[s.setup.position];
      const statKey = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
      const rows = Object.entries(s.clubTallies).filter(([id]) => CLUB_MAP[id]).map(([id, t]) => {
        const rec = clubRecord(id);
        const shirtPath = t.seasons >= 6 && (s.clubRecordsBroken.some((r) => r.clubId === id) || t.trophies >= 3) && !s.betrayedClubIds.includes(id);
        const bar = (v, max) => `<div class="bar" style="width:120px; display:inline-block; vertical-align:middle"><div style="width:${Math.min(100, (v / max) * 100)}%; background:${v >= max ? 'var(--gold)' : 'var(--accent)'}"></div></div>`;
        return `<tr><td><div class="club-cell">${crestSVG(CLUB_MAP[id], 15)}${esc(CLUB_MAP[id].name)}</div></td><td class="r">${t.seasons}</td><td>${bar(t[statKey], rec[statKey])} <span class="num">${t[statKey]}/${rec[statKey]}</span></td><td>${bar(t.apps, rec.apps)} <span class="num">${t.apps}/${rec.apps}</span></td><td class="r">${t.trophies}</td><td>${shirtPath ? '<span class="pill pill-gold">Shirt retirement on track</span>' : `<span class="dim" style="font-size:11.5px">${Math.max(0, 6 - t.seasons)} more season(s) · ${t.trophies}/3 trophies or a record</span>`}</td></tr>`;
      });
      if (!rows.length) return '<div class="empty" style="margin:12px">Play a season to start chasing club records.</div>';
      return `<table class="tbl"><thead><tr><th>Club</th><th class="r">Seasons</th><th>${prof.primaryStatType === 'ATTACK' ? 'Goals' : 'Clean sheets'} vs club record</th><th>Apps vs club record</th><th class="r">Trophies</th><th>Retired shirt?</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    }
    function renderCareer() {
      const s = gameState;
      const defs = statDefs(s.setup.position);
      const stints = [...s.clubHistory.map((x) => ({ ...x, active: false })), ...(s.currentStint ? [{ ...s.currentStint, endAge: s.currentAge, active: true }] : [])];
      const windows = s.ageSteps.map((a, i) => { const last = i === s.ageSteps.length - 1; return `<span class="chip ${last ? 'r' : i === s.stepIndex ? 't' : i > s.stepIndex ? 'future' : ''}"${i > s.stepIndex && !last ? ' title="Not played yet"' : ''}>${last ? `${a} R` : a}</span>`; }).join('');
      return `<div class="page-head"><div><div class="eyebrow">Career</div><h1>Club journey</h1><div class="sub">${s.transferCount} transfer(s) · ${fmtM(s.stats.totalTransferFeesM)} in fees · ${fmtM(careerEarnings(s))} earned</div></div></div>
        <div class="panel" style="margin-bottom:14px"><div class="panel-head"><span>Timeline 17 → ${s.setup.retirementAge}</span><span class="right">🌍 tournaments · 🌱 loans</span></div><div class="panel-body">${journeyHTML(s, null, true)}<div class="chips">${windows}</div></div></div>
        <div class="panel" style="margin-bottom:14px"><div class="panel-head">Clubs</div>${stints.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Club</th><th>League</th><th class="r">#</th><th class="r">Ages</th><th class="r">Seasons</th><th class="r">Apps</th><th class="r">${defs[0].s}</th><th class="r">Trophies</th><th>Status</th></tr></thead><tbody>${stints.slice().reverse().map((st) => {
          const c = CLUB_MAP[st.clubId];
          const status = st.active ? '<span class="pill pill-pos">Current</span>' : s.blacklistedClubIds.includes(st.clubId) ? '<span class="pill pill-neg">Burned bridge</span>' : st.clubId === s.boyhoodClubId ? '<span class="pill pill-info">Boyhood club</span>' : '<span class="dim">Former</span>';
          return `<tr><td><div class="club-cell">${crestSVG(c, 16)}<b>${esc(st.clubName)}</b> ${trendHTML(st.clubId)}</div></td><td class="muted">${esc(st.league)}</td><td class="r">${st.shirtNumber || '—'}</td><td class="r">${st.startAge}–${st.endAge}</td><td class="r">${st.seasons}</td><td class="r">${st.appearances}</td><td class="r">${defs[0].k === 'goals' ? st.goals : st.cleanSheets}</td><td class="r">${st.trophiesWon}</td><td>${status}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="panel-body"><div class="empty">No clubs yet.</div></div>'}</div>
        ${isQuick() ? '' : `<div class="panel" style="margin-bottom:14px"><div class="panel-head"><span>Club records</span><span class="right">${s.clubRecordsBroken.length} broken</span></div><div style="overflow-x:auto">${clubRecordsHTML(s)}</div></div>`}
        ${(s.loanHistory || []).length ? `<div class="panel"><div class="panel-head">Loans</div><table class="tbl"><thead><tr><th>Loan club</th><th>Parent club</th><th class="r">Age</th><th class="r">Apps</th></tr></thead><tbody>${s.loanHistory.map((l) => `<tr><td><div class="club-cell">${crestSVG(findClubByName(l.loanClubName), 15)}${esc(l.loanClubName)}</div></td><td class="muted">${esc((CLUB_MAP[l.parentClubId] || {}).name || '')}</td><td class="r">${l.age}</td><td class="r">${l.appearances}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
    }

    /* ---------------- TROPHIES ---------------- */
    function trophyShelfHTML(s) {
      const groups = [
        { cat: 'BALLON', label: "Ballon d'Or", items: s.stats.ballonDOrYears.map((a) => ({ title: "Ballon d'Or", clubName: (s.seasonLog.find((x) => x.age === a) || {}).clubName || '', yearAge: a })) },
        { cat: 'INTERNATIONAL', label: 'International', items: s.trophies.filter((t) => t.category === 'INTERNATIONAL') },
        { cat: 'CONTINENTAL', label: 'Continental', items: s.trophies.filter((t) => t.category === 'CONTINENTAL') },
        { cat: 'DOMESTIC_LEAGUE', label: 'League titles', items: s.trophies.filter((t) => t.category === 'DOMESTIC_LEAGUE') },
        { cat: 'DOMESTIC_CUP', label: 'Domestic cups', items: s.trophies.filter((t) => t.category === 'DOMESTIC_CUP') },
        { cat: 'SECOND_TIER', label: 'Second-tier titles', items: s.trophies.filter((t) => t.category === 'SECOND_TIER') },
        { cat: 'AWARD', label: 'Individual awards', items: s.awards.map((a) => ({ title: a.title, clubName: a.clubName, yearAge: a.age })) },
        { cat: 'SHIRT', label: 'Retired shirts', items: (s.retiredShirts || []).map((r) => ({ title: `#${r.number} retired`, clubName: r.clubName, yearAge: s.currentAge })) },
      ].filter((g) => g.items.length);
      if (!groups.length) return '<div class="empty">The cabinet is empty — for now. Big clubs, loyalty and captaincy all raise your odds.</div>';
      return groups.map((g) => {
        const byKey = new Map();
        g.items.forEach((t) => { const k = `${t.title}|${t.clubName}`; if (!byKey.has(k)) byKey.set(k, { ...t, ages: [] }); byKey.get(k).ages.push(t.yearAge); });
        const gold = ['BALLON', 'INTERNATIONAL', 'CONTINENTAL', 'DOMESTIC_LEAGUE', 'SHIRT'].includes(g.cat);
        return `<div class="shelf-group"><h3 aria-level="2">${g.label} <span class="pill pill-gold">${g.items.length}</span></h3><div class="shelf">${[...byKey.values()].map((t) => `<div class="trophy-card ${gold ? 'gold' : ''}">${t.ages.length > 1 ? `<span class="t-count">×${t.ages.length}</span>` : ''}${g.cat === 'BALLON' ? ballSVG(46) : g.cat === 'SHIRT' ? `<div style="font:900 34px var(--mono); color:var(--gold); height:50px; line-height:50px">${esc(t.title.split(' ')[0])}</div>` : trophySVG(g.cat, 50)}<div class="t-name">${esc(t.title)}</div><div class="t-meta">${esc(t.clubName)}</div>${g.cat === 'SHIRT' ? '' : `<div class="t-meta">${t.ages.map((a) => seasonLabel(a)).join(', ')}</div>`}</div>`).join('')}</div></div>`;
      }).join('');
    }
    function renderTrophies() {
      const s = gameState;
      return `<div class="page-head"><div><div class="eyebrow">Honours</div><h1>Trophy cabinet</h1><div class="sub">${s.trophies.length} trophies · ${s.awards.length} individual awards · ${s.stats.ballonDOrs} Ballon d'Or</div></div></div>${trophyShelfHTML(s)}`;
    }

    /* ---------------- HALL OF FAME (top 50 + filters) ---------------- */
    function setHofFilter(key, val) { ui.hofFilter[key] = val; if (!$('hofModal').classList.contains('hidden')) $('hofModalBody').innerHTML = hofBlockHTML(); else renderPage(); }
    function hofBlockHTML() {
      const f = ui.hofFilter;
      const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${f[key] === v ? 'on' : ''}" onclick="setHofFilter('${key}','${v}')">${l}</button>`).join('')}</div>`;
      return `<div class="hof-filters">${seg('arch', [['NEW', 'Legacy /1000'], ['OLD', 'Archive (old scoring)']])}${seg('cat', [['ALL', 'All'], ['FWD', 'Forwards'], ['MID', 'Midfield'], ['DEF', 'Defence'], ['GK', 'Keepers']])}${seg('conf', [['ALL', 'All confeds'], ...Object.values(CONTINENTS).map((c) => [c.id, c.confederation])])}${seg('mode', [['ALL', 'Any mode'], ['CAREER', 'Career'], ['QUICK', 'Quick']])}</div>${hofTableHTML()}`;
    }
    function hofTableHTML() {
      const f = ui.hofFilter;
      const old = f.arch === 'OLD';
      const all = storageGet(old ? OLD_HOF_KEY : HALL_OF_FAME_KEY, []);
      const hof = all.map((h, i) => ({ ...h, rank: i + 1 })).filter((h) => (f.cat === 'ALL' || (h.category || POSITION_PROFILES[h.position]?.category) === f.cat) && (f.conf === 'ALL' || h.continent === f.conf) && (f.mode === 'ALL' || (h.mode || 'CAREER') === f.mode));
      if (!hof.length) return `<div class="empty">${old ? 'No careers from earlier versions on this device.' : 'No careers match. Finish a career to enter the Hall of Fame.'}</div>`;
      return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Nation</th><th class="r">Retired</th><th class="r">Apps</th><th class="c">Rating</th><th class="r">Trophies</th><th class="r">BdO</th><th class="r">Peak</th><th class="r">Earned</th><th class="r">Legacy</th></tr></thead><tbody>${hof.map((h) => `<tr class="${latestHofEntryId && h.id === latestHofEntryId ? 'hl' : ''}"><td class="num gold-t" style="font-weight:900">${h.rank}</td><td><b>${esc(h.playerName)}</b>${latestHofEntryId && h.id === latestHofEntryId ? ' <span class="pill pill-pos">NEW</span>' : ''}${h.mode === 'QUICK' ? ' <span class="pill pill-info">⚡</span>' : ''}${h.difficulty && h.difficulty !== 'NORMAL' && DIFFICULTY[h.difficulty] ? ` <span class="pill" title="${DIFFICULTY[h.difficulty].label} difficulty">${DIFFICULTY[h.difficulty].ic} ${DIFFICULTY[h.difficulty].label}</span>` : ''}<div class="dim" style="font-size:11px">${esc((h.badges || []).slice(0, 3).join(' · ') || 'Professional career')}</div></td><td><span class="pill">${esc(h.position)}</span></td><td class="muted">${esc(h.nation || '—')}</td><td class="r">${h.retirementAge}</td><td class="r">${h.appearances}</td><td class="c">${ratingBadge(h.averageRating)}</td><td class="r">${h.trophiesCount}</td><td class="r">${h.ballonDOrs}</td><td class="r">${fmtM(h.peakMarketValueM)}</td><td class="r">${h.earningsM != null ? fmtM(h.earningsM) : '—'}</td><td class="r" style="color:var(--pos); font-weight:900">${h.legacyScore}${old ? '' : `<span class="dim" style="font-weight:600; font-size:10.5px">/1000</span><div class="dim" style="font-size:10px; font-weight:600">${esc(legacyTier(h.legacyScore))}</div>`}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function renderHofPage() {
      return `<div class="page-head"><div><div class="eyebrow">Records</div><h1>Hall of Fame</h1><div class="sub">Top ${HOF_LIMIT} retired careers on this device</div></div><button class="btn btn-danger" onclick="clearHallOfFame()">Clear Hall of Fame</button></div><div class="panel"><div class="panel-body">${hofBlockHTML()}</div></div>
        <div class="panel" style="margin-top:14px"><div class="panel-head"><span>How legacy is scored</span><span class="right">max ${LEGACY_TOTAL} points</span></div><div class="panel-body"><div class="legacy-key">${Object.entries(LEGACY_MAX).map(([k, m]) => `<div><b>${esc(LEGACY_INFO[k].label)}</b><span class="num gold-t">${m}</span><div class="dim">${esc(LEGACY_INFO[k].how)}</div></div>`).join('')}</div>
        <div class="dim" style="font-size:12px; margin-top:10px">Tiers: ${LEGACY_TIERS.slice().reverse().map((t) => `${t.label} ${t.min}+`).join(' · ')}. A typical well-managed career scores about 500; 800+ is very rare. Careers from v5 and earlier used an uncapped formula, so they live in the Archive tab.</div></div></div>`;
    }
    function clearHallOfFame() {
      if (!confirm('Clear every career from the Hall of Fame?')) return;
      storageSet(HALL_OF_FAME_KEY, null);
      latestHofEntryId = null;
      if (gameState && !$('screenApp').classList.contains('hidden')) renderPage();
      if (!$('hofModal').classList.contains('hidden')) $('hofModalBody').innerHTML = hofBlockHTML();
    }
    function openHofStandalone() { $('hofModal').querySelector('.panel-head span').textContent = 'Hall of Fame · top 50 careers'; $('hofModalBody').innerHTML = `${hofBlockHTML()}<div style="margin-top:12px; text-align:right"><button class="btn btn-danger" onclick="clearHallOfFame()">Clear Hall of Fame</button></div>`; $('hofModal').classList.remove('hidden'); }
    function closeHofStandalone() { $('hofModal').classList.add('hidden'); }
