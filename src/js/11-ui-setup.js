    /* ==========================================================================
     * SCREEN 1: CREATE PLAYER (modes, slots, import, nation, agent, scouting, code)
     * ========================================================================== */
    const POS_COORDS = { ST: [50, 13], LW: [17, 22], RW: [83, 22], CAM: [50, 31], CM: [50, 47], CDM: [50, 61], LB: [15, 73], CB: [50, 77], RB: [85, 73], GK: [50, 92] };
    const INTERVALS = [
      { v: 1, main: 'Every year', sub: 'Max drama · low loyalty' },
      { v: 2, main: 'Every 2 years', sub: 'Balanced arc' },
      { v: 3, main: 'Every 3 years', sub: 'High stakes · loyalty+' },
    ];
    const SCOUTING = {
      FULL: { label: 'Full scouting', sub: 'Exact projections for every offer' },
      FOG: { label: 'Scouting fog', sub: 'Ranges and Low/Med/High odds only' },
      BLIND: { label: 'Blind', sub: 'No projections — trust your gut' },
    };

    function initSetupUI() {
      applyPrefs();
      if (!setupConfig.length) setupConfig.length = isFirstEverCareer() ? 'SHORT' : 'FULL';
      if (setupConfig.length === 'SHORT') { setupConfig.transferInterval = SHORT_CAREER.transferInterval; $('inputRetireAge').value = SHORT_CAREER.retirementAge; }
      $('setupHero').innerHTML = setupHeroHTML();
      $('brandSub').textContent = `${CLUBS.length} clubs · ${Object.keys(LEAGUES).length} leagues · 5 confederations`;
      const pitchLines = `<svg class="lines" viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".6"><rect x="4" y="3" width="92" height="119"/><line x1="4" y1="62.5" x2="96" y2="62.5"/><circle cx="50" cy="62.5" r="11"/><rect x="25" y="3" width="50" height="17"/><rect x="38" y="3" width="24" height="7"/><rect x="25" y="105" width="50" height="17"/><rect x="38" y="115" width="24" height="7"/></g></svg>`;
      $('pitchSelector').innerHTML = pitchLines + Object.entries(POS_COORDS).map(([code, [x, y]]) => `<button class="pos-dot" style="left:${x}%; top:${y}%" data-pos="${code}" onclick="selectPosition('${code}')" aria-label="${POSITION_PROFILES[code].name}">${code}</button>`).join('');
      renderSlots();
      renderSetupChoices();
      updateSetupPreview();
    }

    function renderSetupChoices() {
      $('modeSwitch').innerHTML = [
        { id: 'CAREER', ic: '🏆', t: 'Career mode', d: 'The full experience: negotiate contracts, choose training, handle mid-season dilemmas, dig into every stat.', tag: '<span class="pill pill-pos">Deep</span>' },
        { id: 'QUICK', ic: '⚡', t: 'Quick mode', d: 'Casual and fast: ~6 decisions, simple offer cards, “let my agent decide”, highlight reels. A full career in about 5 minutes.', tag: '<span class="pill pill-info">~5 min</span>' },
      ].map((m) => `<button class="mode-card ${setupConfig.mode === m.id ? 'active' : ''}" onclick="selectMode('${m.id}')"><span class="m-tag">${m.tag}</span><div class="m-ic">${m.ic}</div><div class="m-t">${m.t}</div><div class="m-d">${m.d}</div></button>`).join('');
      document.querySelectorAll('#pitchSelector .pos-dot').forEach((el) => el.classList.toggle('active', el.dataset.pos === setupConfig.position));
      $('continentSelector').innerHTML = Object.values(CONTINENTS).map((c) => `<button class="choice ${c.id === setupConfig.continent ? 'active' : ''}" onclick="selectContinent('${c.id}')"><span class="choice-main">${c.confederation}</span><span class="choice-sub">${c.label}</span></button>`).join('');
      $('nationSelector').innerHTML = NATIONS[setupConfig.continent].map((n) => `<button class="nation-chip ${n.id === setupConfig.nation ? 'active' : ''}" onclick="selectNation('${n.id}')">${esc(n.name)} <span class="str">${'●'.repeat(Math.max(1, Math.round((n.str - 0.5) * 5)))}</span></button>`).join('');
      $('intervalSelector').innerHTML = INTERVALS.map((i) => `<button class="choice ${i.v === setupConfig.transferInterval ? 'active' : ''}" onclick="selectInterval(${i.v})"><span class="choice-main">${i.main}</span><span class="choice-sub">${i.sub}</span></button>`).join('');
      $('agentSelector').innerHTML = Object.values(AGENT_TYPES).map((a) => `<button class="choice ${a.id === setupConfig.agentType ? 'active' : ''}" onclick="selectAgent('${a.id}')"><span class="choice-main">${a.icon} ${a.label}</span><span class="choice-sub">${a.sub}</span></button>`).join('');
      $('scoutSelector').innerHTML = Object.entries(SCOUTING).map(([id, s]) => `<button class="choice ${id === setupConfig.scouting ? 'active' : ''}" onclick="selectScouting('${id}')"><span class="choice-main">${s.label}</span><span class="choice-sub">${s.sub}</span></button>`).join('');
      const quick = setupConfig.mode === 'QUICK';
      $('styleChooser').innerHTML = styleChooserHTML();
      $('lengthChooser').innerHTML = lengthChooserHTML();
      $('goalChooser').innerHTML = goalChooserHTML();
      if ($('detailChooser')) $('detailChooser').innerHTML = detailChooserHTML();
      if ($('difficultyChooser')) $('difficultyChooser').innerHTML = difficultyChooserHTML();
      $('fullLengthFields').classList.toggle('hidden', setupConfig.length !== 'FULL');
      $('careerOnlyFields').classList.toggle('hidden', quick);
      $('quickNote').classList.toggle('hidden', !quick);
      $('seedNote').textContent = setupConfig.seed ? `Using seed ${setupConfig.seed} from a career code.` : 'Leave empty for a fresh random career. Your code is shown on the Home screen once you start.';
    }

    function renderSlots() {
      if ($('challengeCard')) $('challengeCard').innerHTML = challengeCardHTML();
      const slots = SLOT_KEYS.map((k, i) => ({ i, s: loadSlot(i) }));
      const old = OLD_SAVE_KEYS.map((o) => ({ ...o, s: storageGet(o.key, null) })).filter((o) => o.s && !o.s.isRetired && o.s.setup && o.s.currentClubId && CLUB_MAP[o.s.currentClubId]);
      const any = slots.some((x) => x.s) || old.length;
      const fileRow = `<div class="file-row"><button class="btn btn-ghost" onclick="importGameFile()">📂 Load a career from a file</button>${any ? '<button class="btn btn-ghost" onclick="exportEverything()">⬇ Back up everything</button>' : ''}</div>`;
      if (!any) { $('slotsPanel').innerHTML = fileRow; return; }
      $('slotsPanel').innerHTML = `<div class="eyebrow" style="margin-bottom:8px">Saved careers</div>
        <div class="slots">${slots.map(({ i, s }) => {
          if (!s) return `<div class="slot"><div class="s-h"><span>Slot ${i + 1}</span><span class="dim">empty</span></div><div class="dim" style="font-size:12px">New careers go into the first empty slot.</div></div>`;
          const club = CLUB_MAP[s.currentClubId];
          return `<div class="slot filled"><div class="s-h"><span>Slot ${i + 1} · ${s.setup.mode === 'QUICK' ? '⚡ Quick' : '🏆 Career'}</span><span>${s.savedAt ? new Date(s.savedAt).toLocaleDateString() : ''}</span></div>
            <div class="s-n">${club ? crestSVG(club, 20) : ''}${esc(s.playerName)} <span class="pill">${s.setup.position}</span></div>
            <div class="dim" style="font-size:12px">Age ${s.currentAge} · ${club ? esc(club.name) : ''} · ${fmtM(s.marketValueM)} · ${s.trophies.length} 🏆</div>
            <div class="s-actions"><button class="btn btn-go" onclick="resumeSlot(${i})">▶ Continue</button><button class="btn btn-danger" onclick="deleteSlot(${i})">Delete</button></div></div>`;
        }).join('')}</div>
        ${old.map((o) => `<div class="resume" style="margin-top:-6px"><div><strong style="color:#7fe7a2">v${o.version} save found</strong> · ${esc(o.s.playerName)} (${o.s.setup.position}) · Age ${o.s.currentAge} at ${esc(CLUB_MAP[o.s.currentClubId].name)}</div><button class="btn btn-go" onclick="importOldSave('${o.key}', ${o.version})">Import into a slot</button></div>`).join('')}${fileRow}`;
    }
    function deleteSlot(i) {
      if (!confirm(`Delete the career in slot ${i + 1}? This cannot be undone.`)) return;
      clearSlot(i);
      renderSlots();
    }
    function importOldSave(key, version) {
      const slot = firstEmptySlot();
      if (slot < 0) { alert('All 3 slots are full. Delete one first.'); return; }
      const migrated = migrateState(storageGet(key, null), version);
      migrated.savedAt = Date.now();
      storageSet(SLOT_KEYS[slot], migrated);
      storageSet(key, null);
      showToast('Save imported', `${migrated.playerName} is now in slot ${slot + 1}. Earlier per-season stats weren't recorded in v${version}.`);
      renderSlots();
    }

    function selectMode(m) {
      setupConfig.mode = m;
      if (m === 'QUICK') { setupConfig.transferInterval = 3; $('inputRetireAge').value = 34; }
      sfx('click');
      renderSetupChoices();
      updateSetupPreview();
    }
    function selectPosition(code) { setupConfig.position = code; sfx('click'); renderSetupChoices(); updateSetupPreview(); }
    function selectContinent(id) { setupConfig.continent = id; setupConfig.nation = NATIONS[id][0].id; setupConfig.seed = null; renderSetupChoices(); updateSetupPreview(); }
    function selectNation(id) { setupConfig.nation = id; renderSetupChoices(); updateSetupPreview(); }
    function selectInterval(v) { setupConfig.transferInterval = v; renderSetupChoices(); updateSetupPreview(); }
    function selectAgent(id) { setupConfig.agentType = id; renderSetupChoices(); updateSetupPreview(); }
    function selectScouting(id) { setupConfig.scouting = id; renderSetupChoices(); updateSetupPreview(); }
    function randomisePlayer() {
      const conts = Object.keys(CONTINENTS);
      setupConfig.continent = conts[Math.floor(Math.random() * conts.length)];
      const nats = NATIONS[setupConfig.continent];
      setupConfig.nation = nats[Math.floor(Math.random() * nats.length)].id;
      const poss = Object.keys(POSITION_PROFILES);
      setupConfig.position = poss[Math.floor(Math.random() * poss.length)];
      const pool = NAME_POOLS[setupConfig.continent];
      $('inputPlayerName').value = `${pool.first[Math.floor(Math.random() * pool.first.length)]} ${pool.last[Math.floor(Math.random() * pool.last.length)]}`;
      if (setupConfig.mode === 'CAREER') { setupConfig.transferInterval = 1 + Math.floor(Math.random() * 3); $('inputRetireAge').value = 32 + Math.floor(Math.random() * 7); }
      setupConfig.seed = null;
      sfx('whistle');
      renderSetupChoices();
      updateSetupPreview();
    }
    function applyCareerCode() {
      const parsed = parseCareerCode($('inputCode').value);
      if (!parsed) { showToast('Invalid career code', 'Codes look like ST-EU-ENG-2-35-B-C-K7Q2M9.', 'var(--neg)'); return; }
      Object.assign(setupConfig, parsed);
      $('inputRetireAge').value = parsed.retirementAge;
      showToast('Career code loaded', `Seed ${parsed.seed}. Make the same choices to replay the same career.`);
      renderSetupChoices();
      updateSetupPreview();
    }

    function updateSetupPreview() {
      const retire = Number($('inputRetireAge').value);
      setupConfig.retirementAge = retire;
      $('retireAgeDisplay').textContent = retire;
      const pos = POSITION_PROFILES[setupConfig.position];
      const cont = CONTINENTS[setupConfig.continent];
      const nation = NATION_MAP[setupConfig.nation] || NATIONS[setupConfig.continent][0];
      const steps = buildAgeSteps(retire, setupConfig.transferInterval);
      const hasFarewell = steps.length >= 2 && steps[steps.length - 1] - steps[steps.length - 2] < setupConfig.transferInterval;
      const name = ($('inputPlayerName').value || 'Alex Rivera').trim() || 'Alex Rivera';
      const startVal = Number(((pos.maxBaseValueM / 100) * 1.4).toFixed(1));
      const tours = Object.entries(TOURNAMENT_SCHEDULE).filter(([a]) => Number(a) < retire);
      const agent = AGENT_TYPES[setupConfig.agentType];
      const w = POS_ATTR_WEIGHTS[pos.code];
      const keyAttrs = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => ATTR_LABELS[k]);
      $('posInfo').innerHTML = `<h3 aria-level="2">${pos.name}</h3><dl class="kv">
        <dt>Prime years</dt><dd>${pos.peakStart}–${pos.peakEnd}</dd><dt>Value ceiling</dt><dd>${fmtM(pos.maxBaseValueM)}</dd>
        <dt>Captaincy odds</dt><dd>${Math.round(pos.captaincyChance * 100)}%</dd><dt>Key attributes</dt><dd>${keyAttrs.join(', ')}</dd>
        <dt>Rated on</dt><dd>${statDefs(pos.code).map((d) => d.l).join(' & ')}</dd></dl>
        <div class="dim" style="font-size:11.5px">${pos.category === 'FWD' ? 'Highest goals and valuations; sharpest decline after 30.' : pos.category === 'MID' ? 'Balanced output; best captaincy odds.' : pos.category === 'DEF' ? 'Clean-sheet driven; more cards; long careers.' : "Longest prime; fewer offers; the Ballon d'Or is very rare."}</div>`;
      $('cardPreview').innerHTML = `<div class="cp-top"><div class="cp-pos">${pos.code}</div><div><div class="cp-name">${esc(name)}</div><div class="cp-meta">${pos.name} · ${esc(nation.name)} (${cont.confederation}) · Age 17</div></div></div>
        <div class="tiles" style="position:relative; z-index:1">
          <div class="tile"><div class="v">${fmtM(startVal)}</div><div class="l">Start value</div></div>
          <div class="tile"><div class="v">${steps.length - 1}</div><div class="l">Decisions</div></div>
          <div class="tile"><div class="v">${retire - 17}</div><div class="l">Seasons</div></div>
          <div class="tile"><div class="v">${tours.length}</div><div class="l">Tournaments</div></div>
        </div>`;
      $('blueprint').innerHTML = `<dl class="kv" style="margin-bottom:10px">
          <dt>Mode</dt><dd>${setupConfig.mode === 'QUICK' ? '⚡ Quick' : '🏆 Career'}</dd>
          <dt>National team</dt><dd>${esc(nation.name)} · ${nation.str >= 1.1 ? 'title contender' : nation.str >= 0.9 ? 'dark horse' : 'underdog'}</dd>
          <dt>Continental cup</dt><dd>${cont.clubContinentalCup}</dd>
          <dt>Youth breakout</dt><dd>×${cont.breakoutMultiplier}${cont.earlyMinutesBonus ? ` · +${cont.earlyMinutesBonus} early games` : ''}</dd>
          ${setupConfig.mode === 'CAREER' ? `<dt>Agent</dt><dd>${agent.icon} ${agent.label}</dd><dt>Scouting</dt><dd>${SCOUTING[setupConfig.scouting].label}</dd>` : ''}
        </dl>
        <div class="field-label" style="margin-bottom:6px">Transfer windows${hasFarewell ? ' <span class="dim" style="text-transform:none;letter-spacing:0">(short farewell window)</span>' : ''}</div>
        <div class="chips" style="margin-bottom:10px">${steps.map((a, i) => `<span class="chip ${i === steps.length - 1 ? 'r' : ''}">${i === steps.length - 1 ? `${a} R` : a}</span>`).join('')}</div>
        <div class="field-label" style="margin-bottom:6px">Tournaments in your career</div>
        <div class="chips">${tours.length ? tours.map(([a, t]) => `<span class="chip t">🌍 ${t.type === 'WORLD_CUP' ? 'World Cup' : cont.tournamentName.replace(/^(UEFA|CONMEBOL|AFC|CAF|CONCACAF)\s/, '')} · ${a}</span>`).join('') : '<span class="dim">None</span>'}</div>`;
      $('btnStart').textContent = setupConfig.mode === 'QUICK' ? '⚡ Start quick career ▸' : setupConfig.length === 'SHORT' ? 'Start a short career ▸' : 'Start career at age 17 ▸';
    }

    function startNewCareer() {
      let slot = firstEmptySlot();
      if (slot < 0) {
        const slots = SLOT_KEYS.map((k, i) => ({ i, s: loadSlot(i) })).sort((a, b) => (a.s.savedAt || 0) - (b.s.savedAt || 0));
        if (!confirm(`All 3 save slots are full. Overwrite slot ${slots[0].i + 1} (${slots[0].s.playerName})?`)) return;
        slot = slots[0].i;
      }
      ACTIVE_SLOT = slot;
      latestHofEntryId = null;
      const quick = setupConfig.mode === 'QUICK';
      if (!quick && setupConfig.length === 'SHORT') { setupConfig.transferInterval = SHORT_CAREER.transferInterval; setupConfig.retirementAge = SHORT_CAREER.retirementAge; }
      const guided = !!setupConfig.forceGuided || isFirstEverCareer();
      setupConfig.forceGuided = false;
      gameState = createInitialGameState({
        playerName: $('inputPlayerName').value, position: setupConfig.position, continent: setupConfig.continent, nation: setupConfig.nation,
        transferInterval: quick ? 3 : setupConfig.transferInterval, retirementAge: quick ? 34 : setupConfig.retirementAge,
        mode: setupConfig.mode, scouting: quick ? 'FULL' : setupConfig.scouting, agentType: quick ? 'BALANCED' : setupConfig.agentType, seed: setupConfig.seed,
      });
      setupConfig.seed = null;
      if (setupConfig.challenge) { gameState.setup.challenge = setupConfig.challenge; setupConfig.challenge = null; }
      gameState.setup.goal = setupConfig.goal || 'NONE';
      gameState.setup.guided = guided;
      gameState.setup.length = quick ? 'QUICK' : setupConfig.length;
      gameState.setup.detail = quick ? 'STANDARD' : setupConfig.detail || 'STANDARD';
      gameState.setup.difficulty = quick ? 'NORMAL' : setupConfig.difficulty || 'NORMAL';
      gameState.setup.noWinter = gameState.setup.detail === 'LIGHT';
      gameState.revealed = [];
      currentChoices = applyRelationshipToChoices(gameState, generateChoices(gameState));
      gameState.pendingChoices = currentChoices;
      storyOpen(gameState, (currentChoices.offers || []).length, { auto: quick });
      saveCareer(gameState);
      resetUiForWindow();
      ui.page = guided && !quick ? 'home' : 'transfers';
      showScreen('screenApp');
      sfx('whistle');
      renderApp();
      setTimeout(() => maybeStartTour(), 600);
    }
    function resumeSlot(i) {
      let saved = loadSlot(i);
      if (!saved) return;
      if (!saved.version || saved.version < SAVE_VERSION) saved = migrateState(saved, saved.version || 4);
      ACTIVE_SLOT = i;
      latestHofEntryId = null;
      gameState = saved;
      RNG.holder = gameState;
      applyClubDynamics(gameState);
      const pc = saved.pendingChoices;
      const pcValid = pc && Array.isArray(pc.offers) && pc.offers.every((o) => CLUB_MAP[o.clubId]);
      currentChoices = pcValid ? pc : generateChoices(gameState);
      gameState.pendingChoices = currentChoices;
      resetUiForWindow();
      ui.page = 'home';
      showScreen('screenApp');
      renderApp();
    }
    function resetToSetup() {
      if (gameState && !gameState.isRetired && gameState.windowCount > 0 && !$('screenApp').classList.contains('hidden')) {
        if (!confirm('Leave this career? It stays saved in its slot, so you can continue it later.')) return;
      }
      gameState = null;
      currentChoices = null;
      ACTIVE_SLOT = null;
      applyClubDynamics(null);
      applyClubTheme(null);
      initSetupUI();
      showScreen('screenSetup');
    }
    function showScreen(id) {
      ['screenSetup', 'screenApp', 'screenLegacy'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    }

    /* ---------- Difficulty (v14) ---------- */
    function difficultyChooserHTML() {
      const cur = setupConfig.difficulty || 'NORMAL';
      return `<div class="choice-grid c3">${Object.entries(DIFFICULTY).map(([id, d]) => `<button class="choice ${cur === id ? 'active' : ''}" aria-pressed="${cur === id}" onclick="selectDifficulty('${id}')"><span class="choice-main">${d.ic} ${d.label}</span><span class="choice-sub">${esc(d.sub)}</span></button>`).join('')}</div>`;
    }
    function selectDifficulty(id) { if (!DIFFICULTY[id]) return; setupConfig.difficulty = id; sfx('click'); renderSetupChoices(); }
    function difficultySettingHTML() {
      if (!gameState || gameState.setup.mode === 'QUICK' || $('screenApp').classList.contains('hidden')) return '';
      const d = difficultyOf(gameState);
      return `<div class="set-row"><span><b>Difficulty</b><div class="dim" style="font-size:11px">${esc(d.sub)} Set at the start of a career.</div></span><span class="pill">${d.ic} ${d.label}</span></div>`;
    }
