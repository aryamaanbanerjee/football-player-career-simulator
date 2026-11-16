    /* ==========================================================================
     * FIRST-RUN TUTORIAL (spotlight tour of the Transfer Centre)
     * ========================================================================== */
    const TOUR_STEPS = [
      { sel: '.priority-bar', title: 'What matters to you?', text: 'Pick a priority — trophies, game time, money or legacy. Every offer gets a Fit score for it, and the best fit is starred.' },
      { sel: '.opt-list', title: 'Your offers', text: 'Every club that wants you, plus staying put. Click one (or press 1–9). The line under each club tells you its biggest strength and weakness in plain words.' },
      { sel: '#impactStrip, .impact-empty', title: 'Live preview', text: 'As soon as you select an offer, this strip shows your new club, role, minutes, value and trophy chances — compared with staying.' },
      { sel: '#trainingChip', title: 'Training', text: 'Your training focus for the next window. Tap to change it.' },
      { sel: '.detail', title: 'Scouting report', text: 'The verdict, why to sign, what to watch out for, and the key numbers. Open “More detail” for every odd, the value forecast and your career timeline. The ? icons explain any term.' },
      { sel: '.btn-nego', title: 'Negotiate', text: 'Ask for a bigger role, more wages, a different contract or release clause. Push too hard and the club may counter — or walk away.' },
      { sel: '.action-bar .btn-go', title: 'Confirm', text: 'Happy? Confirm here or press Enter. Then watch your seasons play out, with objectives, big matches and decisions along the way.' },
    ];
    let tourIdx = 0;
    function maybeStartTour() {
      if (prefs.tutorialDone || isQuick() || ui.page !== 'transfers' || arrivalNeeded() || !$('review').classList.contains('hidden')) return;
      startTour(false);
    }
    function startTour(force) {
      if (!gameState || $('screenApp').classList.contains('hidden')) { showToast('Tutorial', 'Start or resume a career first.'); return; }
      if (ui.page !== 'transfers') { ui.page = 'transfers'; renderApp(); }
      if (isQuick()) { showToast('Quick mode', 'Tap a card to sign, or let your agent decide. That’s it!'); return; }
      if (arrivalNeeded()) finishArrivals();
      if (!ui.sel && liveOptions().length) { ui.sel = liveOptions()[0].key; renderTopbar(); renderPage(); }
      tourIdx = 0;
      $('tourLayer').classList.remove('hidden');
      showTourStep(force);
    }
    function showTourStep() {
      let step = TOUR_STEPS[tourIdx];
      let el = step && document.querySelector(step.sel);
      while (step && (!el || el.getBoundingClientRect().height === 0)) { tourIdx++; step = TOUR_STEPS[tourIdx]; el = step && document.querySelector(step.sel); }
      if (!step) { endTour(); return; }
      el.scrollIntoView({ block: 'center', behavior: motionOff() ? 'auto' : 'smooth' });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const spot = $('tourSpot');
        const pad = 6;
        const h = Math.min(r.height, window.innerHeight - 40);
        Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${Math.max(4, r.top) - pad}px`, width: `${r.width + pad * 2}px`, height: `${h + pad * 2}px` });
        const b = $('tourBubble');
        b.innerHTML = `<h4>${step.title} <span class="dim" style="font-weight:600; font-size:11px">${tourIdx + 1}/${TOUR_STEPS.length}</span></h4><p>${step.text}</p><div class="t-foot"><button class="btn btn-ghost" onclick="endTour()">Skip tutorial</button><button class="btn btn-go" onclick="nextTourStep()">${tourIdx === TOUR_STEPS.length - 1 ? 'Got it' : 'Next ▸'}</button></div>`;
        const below = r.bottom + 180 < window.innerHeight;
        const left = Math.min(window.innerWidth - 340, Math.max(10, r.left));
        Object.assign(b.style, { left: `${left}px`, top: below ? `${Math.min(window.innerHeight - 170, r.top + h + 14)}px` : `${Math.max(10, r.top - 170)}px` });
      }, motionOff() ? 0 : 280);
    }
    function nextTourStep() { tourIdx++; showTourStep(); }
    function endTour() { $('tourLayer').classList.add('hidden'); prefs.tutorialDone = true; savePrefs(); }
    window.addEventListener('resize', () => { if (!$('tourLayer').classList.contains('hidden')) showTourStep(); });
