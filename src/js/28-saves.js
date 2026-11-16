    /* ==========================================================================
     * v13 · SAFE SAVES
     *   Warn when the browser refuses a save, back up a career (or everything)
     *   to a file, load it back on any device, and ask the browser to keep the
     *   game's storage.
     * ========================================================================== */
    let lastSaveWarning = 0;
    function onSaveProblem() {
      ui.saveFailed = true;
      if (Date.now() - lastSaveWarning < 120000) return;
      lastSaveWarning = Date.now();
      showToast('Couldn’t save', 'Your browser refused to store this career (storage full or private browsing). Download a backup from Settings.', 'var(--neg)');
    }
    function downloadJSON(obj, filename) {
      const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    const slug = (s) => String(s || 'player').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'player';
    function exportCareerFile() {
      if (!gameState) return;
      saveCareer(gameState);
      downloadJSON({ kind: 'fcs-career', app: 'Football Career Simulator', saveVersion: SAVE_VERSION, exportedAt: new Date().toISOString(), state: gameState },
        `career-${slug(gameState.playerName)}-age${gameState.currentAge}.json`);
      showToast('Backup downloaded', 'Load it from the main menu on any device.');
    }
    function exportEverything() {
      if (gameState && ACTIVE_SLOT != null) saveCareer(gameState);
      const data = { kind: 'fcs-backup', app: 'Football Career Simulator', saveVersion: SAVE_VERSION, exportedAt: new Date().toISOString(),
        slots: SLOT_KEYS.map((k, i) => loadSlot(i)), hallOfFame: storageGet(HALL_OF_FAME_KEY, []), album: storageGet(ALBUM_KEY, null) };
      downloadJSON(data, `football-career-backup-${new Date().toISOString().slice(0, 10)}.json`);
      showToast('Backup downloaded', 'All saved careers, your Hall of Fame and your sticker album.');
    }
    // A career is usable only if it has the basics and every club in it still exists.
    function validCareer(s) {
      if (!(s && typeof s === 'object' && s.setup && typeof s.playerName === 'string' && Array.isArray(s.seasonLog) && s.setup.position && POSITION_PROFILES[s.setup.position])) return false;
      // A career saved before its first contract has no club yet; after that the club must exist.
      return s.currentClubId == null ? s.seasonLog.length === 0 : !!CLUB_MAP[s.currentClubId];
    }
    function importGameFile() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        if (f.size > 8 * 1024 * 1024) { showToast('Not loaded', 'That file is too large to be a saved career.', 'var(--neg)'); return; }
        const reader = new FileReader();
        reader.onload = () => {
          let data = null;
          try { data = JSON.parse(reader.result); } catch { data = null; }
          if (!data || (data.kind !== 'fcs-career' && data.kind !== 'fcs-backup')) { showToast('Not loaded', 'That file isn’t a Football Career Simulator backup.', 'var(--neg)'); return; }
          if (data.kind === 'fcs-career') return importCareer(data.state);
          return importBackup(data);
        };
        reader.readAsText(f);
      };
      input.click();
    }
    function importCareer(raw) {
      let s = raw;
      if (!validCareer(s)) { showToast('Not loaded', 'The career in that file is incomplete or from an incompatible version.', 'var(--neg)'); return; }
      if (s.isRetired) { showToast('Not loaded', 'That career is finished. Its record lives in the Hall of Fame.', 'var(--neg)'); return; }
      if (!s.version || s.version < SAVE_VERSION) s = migrateState(s, s.version || 4);
      let slot = firstEmptySlot();
      if (slot == null || slot < 0) {
        const oldest = SLOT_KEYS.map((k, i) => ({ i, s: loadSlot(i) })).sort((a, b) => ((a.s && a.s.savedAt) || 0) - ((b.s && b.s.savedAt) || 0))[0];
        if (!confirm(`All three slots are full. Replace the oldest (${oldest.s.playerName}) with ${s.playerName}?`)) return;
        slot = oldest.i;
      }
      if (!storageSet(SLOT_KEYS[slot], s)) { onSaveProblem(); return; }
      showToast('Career loaded', `${s.playerName} is in slot ${slot + 1}.`);
      renderSlots();
    }
    function importBackup(data) {
      const slots = Array.isArray(data.slots) ? data.slots : [];
      const careers = slots.filter((s) => s && validCareer(s));
      if (!confirm(`Restore this backup? It replaces the saved careers on this device (${careers.length} in the file), and adds its Hall of Fame and stickers to yours.`)) return;
      let ok = true;
      SLOT_KEYS.forEach((k, i) => {
        let s = slots[i];
        if (s && validCareer(s) && !s.isRetired) { if (!s.version || s.version < SAVE_VERSION) s = migrateState(s, s.version || 4); ok = storageSet(k, s) && ok; }
        else ok = storageSet(k, null) && ok;
      });
      // Hall of Fame: merge by id so nothing on this device is lost.
      if (Array.isArray(data.hallOfFame)) {
        const mine = storageGet(HALL_OF_FAME_KEY, []);
        const ids = new Set(mine.map((h) => h.id));
        ok = storageSet(HALL_OF_FAME_KEY, [...mine, ...data.hallOfFame.filter((h) => h && h.id && !ids.has(h.id))]) && ok;
      }
      if (data.album && typeof data.album === 'object') {
        const mine = storageGet(ALBUM_KEY, null);
        ok = storageSet(ALBUM_KEY, mine ? mergeAlbums(mine, data.album) : data.album) && ok;
      }
      if (!ok) onSaveProblem(); else showToast('Backup restored', `${careers.length} career${careers.length === 1 ? '' : 's'}, plus Hall of Fame and stickers.`);
      renderSlots();
    }
    // The album is { seen: { storyId: { n, first, player, age } } }: keep every sticker, the higher count and the earliest date.
    function mergeAlbums(a, b) {
      const out = { ...a, seen: { ...((a && a.seen) || {}) } };
      Object.entries((b && b.seen) || {}).forEach(([id, x]) => {
        const cur = out.seen[id];
        out.seen[id] = !cur ? x : { ...cur, n: Math.max(cur.n || 1, x.n || 1), first: Math.min(cur.first || Infinity, x.first || Infinity) };
      });
      return out;
    }
    function savesSettingsHTML() {
      const inCareer = gameState && !$('screenApp').classList.contains('hidden');
      return `<div class="set-row"><span><b>Backups</b><div class="dim" style="font-size:11px">${ui.saveFailed ? '<span class="neg-t">The last save failed. Download a backup now.</span>' : 'Keep a copy of your careers or move them to another device'}</div></span><span style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end">${inCareer ? '<button class="btn" onclick="exportCareerFile()">This career</button>' : ''}<button class="btn" onclick="exportEverything()">Everything</button></span></div>`;
    }
    // Ask the browser to keep the game's storage (installed apps especially).
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); } catch { /* not supported */ }
