    /* ==========================================================================
     * ACCESSIBILITY
     *   Screen readers hear each new review screen and page; keyboard focus
     *   moves to the first choice; clickable cards work with Enter and Space;
     *   icon-only buttons get names; text can be made larger.
     * ========================================================================== */
    function announce(msg) {
      const el = $('srLive');
      if (!el || !msg) return;
      el.textContent = '';
      setTimeout(() => { el.textContent = msg; }, 60);
    }
    const NATIVE_INTERACTIVE = 'button, a, input, select, textarea, label, summary';
    const FOCUS_TARGETS = '.pq-opt, .w-card .w-opt:not(.picked), .st-opt:not(.picked):not([disabled]), .d-opt, button.btn-go:not([disabled]), button:not([disabled])';

    // Review screens: announce each new screen once, and put focus on its first choice
    // unless the player is already somewhere sensible inside the review.
    function watchReviewForA11y() {
      const stage = $('rvStage');
      const review = $('review');
      if (!stage || stage.dataset.a11y) return;
      stage.dataset.a11y = '1';
      let lastHead = '';
      let timer = null;
      let firstAt = 0;
      const check = () => {
        timer = null; firstAt = 0;
        if (review.classList.contains('hidden')) return;
        // Season screens title themselves with styled text rather than a heading.
        const h = stage.querySelector('h1, h2') || stage.querySelector('.s-club');
        const head = h ? h.textContent.trim() : '';
        if (head && head !== lastHead) {
          lastHead = head;
          const eb = h.classList.contains('s-club') ? stage.querySelector('.s-label') : stage.querySelector('.eyebrow');
          announce([eb ? eb.textContent.trim() : '', head].filter(Boolean).join('. '));
        }
        const act = document.activeElement;
        const lost = !act || act === document.body || !document.contains(act) || !review.contains(act);
        if (lost) {
          const target = stage.querySelector(FOCUS_TARGETS);
          if (target) target.focus({ preventScroll: true });
        }
      };
      new MutationObserver(() => {
        // Wait for a quiet moment, but never more than 400 ms: animated screens change constantly.
        const now = Date.now();
        if (!firstAt) firstAt = now;
        clearTimeout(timer);
        timer = setTimeout(check, now - firstAt > 400 ? 0 : 90);
      }).observe(stage, { childList: true, subtree: true });
    }

    // After the player moves to another page: say where they are and start reading from the title.
    function afterNavA11y() {
      const h = document.querySelector('#main h1');
      if (!h) return;
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      const tab = document.querySelector('#main .sect-tab.active');
      announce(tab ? `${h.textContent.trim()}, ${tab.textContent.trim()} tab` : `${h.textContent.trim()} page`);
    }

    // Clickable cards and rows that aren't buttons: make them reachable and usable from the keyboard.
    // Icon-only buttons: give them a name from their title.
    function fixInteractive(root) {
      root.querySelectorAll('[onclick]').forEach((el) => {
        if (el.matches(NATIVE_INTERACTIVE)) return;
        if (el.parentElement && el.parentElement.closest('[role="button"], [onclick]:not(.modal):not(#hofModal):not(#negoModal)')) return; // inside a clickable card
        if (el.matches('.modal, .tour-layer, #hofModal, #negoModal')) return; // backdrops close dialogs; not controls
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      });
      // A glossary term inside a clickable card stays clickable but leaves the tab order (no controls inside controls).
      root.querySelectorAll('[role="button"] .gloss[tabindex], [role="button"] [onclick][tabindex]').forEach((el) => { el.removeAttribute('tabindex'); if (el.getAttribute('role') === 'button') el.removeAttribute('role'); });
      // Sideways-scrolling tables need to be reachable with the keyboard so they can be scrolled.
      root.querySelectorAll('[style*="overflow-x:auto"], [style*="overflow-x: auto"], #main table.tbl').forEach((el) => {
        if (el.tagName === 'TABLE' && el.scrollWidth <= el.clientWidth + 1) return; // only tables that actually scroll
        if (el.hasAttribute('tabindex') || el.querySelector('a, button, input, select, [tabindex]')) return;
        const head = el.closest('.panel') && el.closest('.panel').querySelector('.panel-head');
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'region'); el.setAttribute('aria-label', head ? head.textContent.trim() : 'Scrollable table');
      });
      root.querySelectorAll('button:not([aria-label])').forEach((b) => {
        if (b.textContent.trim()) return;
        const name = b.getAttribute('title') || b.dataset.label || '';
        if (name) b.setAttribute('aria-label', name);
      });
    }
    let fixTimer = null;
    new MutationObserver(() => { clearTimeout(fixTimer); fixTimer = setTimeout(() => fixInteractive(document), 60); }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('role') === 'button' && !e.target.matches(NATIVE_INTERACTIVE)) {
        e.preventDefault(); e.stopPropagation();
        e.target.click();
      }
    }, true);

    // Larger text: scales the whole interface, like browser zoom, so layouts stay in proportion.
    const TEXT_SIZES = { normal: { label: 'Standard', zoom: 1 }, large: { label: 'Large', zoom: 1.12 }, larger: { label: 'Larger', zoom: 1.25 } };
    function applyTextSize() {
      const z = (TEXT_SIZES[prefs.textSize] || TEXT_SIZES.normal).zoom;
      document.documentElement.style.zoom = z === 1 ? '' : String(z);
      document.documentElement.dataset.textSize = prefs.textSize || 'normal';
    }
    function setTextSize(id) {
      if (!TEXT_SIZES[id]) return;
      prefs.textSize = id; savePrefs(); applyTextSize(); renderSettings();
      announce(`Text size ${TEXT_SIZES[id].label}`);
    }
    function textSizeSettingHTML() {
      const cur = TEXT_SIZES[prefs.textSize] ? prefs.textSize : 'normal';
      return `<div class="set-row"><span><b>Text size</b><div class="dim" style="font-size:11px">Makes everything larger, like zooming in</div></span><span class="seg" role="group" aria-label="Text size">${Object.entries(TEXT_SIZES).map(([id, t]) => `<button class="${cur === id ? 'on' : ''}" aria-pressed="${cur === id}" onclick="setTextSize('${id}')">${t.label}</button>`).join('')}</span></div>`;
    }
    applyTextSize();
    watchReviewForA11y();

    // Text on a club colour: keep the club's colours where they're readable (4.5:1), otherwise
    // switch to black or white, and darken the background a little if neither is enough.
    function hexLum(hex) {
      const h = String(hex || '').replace('#', '');
      if (!/^[0-9a-f]{6}$/i.test(h)) return null;
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(parseInt(h.slice(0, 2), 16)) + 0.7152 * f(parseInt(h.slice(2, 4), 16)) + 0.0722 * f(parseInt(h.slice(4, 6), 16));
    }
    const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    function readablePair(bg, fg) {
      const lb = hexLum(bg); const lf = hexLum(fg);
      if (lb == null) return `background:${bg}; color:${fg}`;
      if (lf != null && ratio(lb, lf) >= 4.5) return `background:${bg}; color:${fg}`;
      if (ratio(lb, 1) >= 4.5) return `background:${bg}; color:#fff`;
      if (ratio(lb, 0) >= 4.5) return `background:${bg}; color:#111`;
      return `background:color-mix(in srgb, ${bg} 78%, #000); color:#fff`;
    }
