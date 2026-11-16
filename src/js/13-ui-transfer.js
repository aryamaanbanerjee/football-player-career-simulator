    /* ==========================================================================
     * PAGE: TRANSFER CENTRE (v6: lean layout, Fit score, dialogs, arrivals)
     * ========================================================================== */
    function resetUiForWindow() { ui.sel = null; ui.proj = {}; ui.projKey = null; ui.fit = {}; ui.bestFit = null; ui.tTab = 'offers'; ui.asks = {}; }
    function projKeyNow() {
      return `${gameState.windowCount}|${gameState.currentAge}|${gameState.trainingFocus}|${getOptions().map((o) => `${o.key}${o.club.id}${o.data.squadRole}${o.data.wageM}${o.data.contractYears}${o.data.withdrawn ? 'w' : ''}`).join(',')}`;
    }
    function ensureProjections(force = false) {
      if (!gameState || !currentChoices || gameState.isRetired) return;
      const key = projKeyNow();
      if (!force && ui.projKey === key) { computeFit(); return; }
      ui.projKey = key;
      // Projections are deterministic (v14), so the save keeps them: reopening a career doesn't recompute them.
      const saved = gameState.projCache;
      if (!force && saved && saved.key === key && saved.data) { ui.proj = saved.data; computeFit(); return; }
      // Anything already worked out in the background (during the window report) is reused.
      ui.proj = !force && ui.projWork && ui.projWork.key === key ? { ...ui.projWork.data } : {};
      ui.projWork = null;
      getOptions().forEach((o) => { if (!o.data.withdrawn && !ui.proj[o.key]) ui.proj[o.key] = projectDecision(gameState, o.data); });
      gameState.projCache = { key, data: ui.proj };
      if (typeof saveCareer === 'function' && ACTIVE_SLOT != null) saveCareer(gameState);
      computeFit();
    }
    // While the player reads the window report, work out the next window's offers one at a time.
    function precomputeProjections() {
      if (!gameState || !currentChoices || gameState.isRetired) return;
      const key = projKeyNow();
      if (ui.projKey === key || (gameState.projCache && gameState.projCache.key === key)) return;
      const work = (ui.projWork = { key, data: {} });
      const opts = getOptions().filter((o) => !o.data.withdrawn);
      let i = 0;
      const step = () => {
        if (ui.projWork !== work || i >= opts.length) return;
        const o = opts[i++];
        work.data[o.key] = projectDecision(gameState, o.data);
        setTimeout(step, 40);
      };
      setTimeout(step, 400);
    }

    /* ---------- Display helpers that respect scouting difficulty ---------- */
    const fogTier = (p) => (p < 0.15 ? 'Low' : p < 0.45 ? 'Medium' : 'High');
    function showPlain(p, short = false) {
      if (p == null) return '—';
      const lvl = scoutLevel();
      if (lvl === 'BLIND') return '?';
      if (lvl === 'FOG') return fogTier(p);
      return `<span title="${pct(p)}">${short ? plainShort(p) : plainOdds(p)}</span>`;
    }
    function showNum(v, digits = 1, spread = 0.18) {
      if (v == null) return '—';
      const lvl = scoutLevel();
      if (lvl === 'BLIND') return '?';
      if (lvl === 'FOG') { const lo = v * (1 - spread); const hi = v * (1 + spread); return digits ? `${fmt1(lo)}–${fmt1(hi)}` : `${Math.round(lo)}–${Math.round(hi)}`; }
      return digits ? fmt1(v) : String(Math.round(v));
    }
    const showMoney = (v) => (scoutLevel() === 'BLIND' ? '?' : scoutLevel() === 'FOG' ? `~${fmtM(v)}` : fmtM(v));
    function deltaHTML(val, base, { digits = 1, pctMode = false, invert = false, money = false } = {}) {
      if (base == null || val == null || scoutLevel() !== 'FULL') return '';
      const diff = val - base;
      const thresh = pctMode ? 0.015 : money ? Math.max(0.3, Math.abs(base) * 0.03) : digits === 0 ? 0.5 : 0.05;
      if (Math.abs(diff) < thresh) return '<span class="delta flat">= stay</span>';
      const up = invert ? diff < 0 : diff > 0;
      const txt = pctMode ? `${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff) * 100)} pts` : money ? `${diff > 0 ? '+' : '−'}${fmtM(Math.abs(diff))}` : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(digits)}`;
      return `<span class="delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${txt}</span>`;
    }
    function projStatVal(p, def) {
      if (!p) return '—';
      if (def.isPct) return p.savePct != null ? (scoutLevel() === 'FULL' ? `${fmt1(p.savePct)}%` : scoutLevel() === 'FOG' ? `${fmt1(p.savePct - 1.5)}–${fmt1(p.savePct + 1.5)}%` : '?') : '—';
      return showNum(p[def.k], 1);
    }

    /* ---------- One-line status bar (replaces the stacked context chips) ---------- */
    function statusLineHTML() {
      const s = gameState;
      const d = getDerivedState(s);
      const bits = [];
      if (d.currentClub) {
        bits.push(s.contractYearsRemaining <= 0 ? `🆓 <b class="pos-t">Out of contract</b> ${help('FREE')}` : `📄 <b>${s.contractYearsRemaining} yr</b> left${s.runDownContractActive ? ' <span class="pill pill-warn">running down</span>' : ''}`);
        bits.push(`👕 ${roleLabel(s.squadRole)} · ${fmtWage(s.wageM)}`);
        if (s.releaseClauseM) bits.push(`🔓 ${fmtM(s.releaseClauseM)}${s.marketValueM > s.releaseClauseM ? ' <span class="pill pill-warn">bargain</span>' : ''} ${help('CLAUSE')}`);
      }
      bits.push(`💶 ${fmtM(s.marketValueM)}`);
      for (let a = s.currentAge; a < d.nextAge; a++) {
        const t = TOURNAMENT_SCHEDULE[a];
        if (t) { const nt = nextTournament({ ...s, currentAge: a }); bits.push(`🌍 ${t.type === 'WORLD_CUP' ? 'World Cup' : 'Continental cup'} at ${a}: need ${nt ? nt.need : 22}+ games`); }
      }
      if (d.isFinalWindow) bits.push('🏁 <b>Final window</b>');
      if (s.unwantedByManager) bits.push('⚠️ <b class="neg-t">Frozen out</b>');
      if (s.relegatedLastWindow) bits.push(`📉 <b class="neg-t">${esc(displayLeague(s, d.currentClub))}</b>`);
      if (s.transferRequested) bits.push('📨 Transfer requested');
      if (scoutLevel() !== 'FULL') bits.push(`🔭 ${scoutLevel() === 'FOG' ? 'Scouting fog' : 'Blind'}`);
      const tf = TRAINING_FOCUS[s.trainingFocus];
      return `<div class="status-line"><div class="sl-items">${bits.map((b) => `<span class="sl">${b}</span>`).join('')}</div>${isQuick() ? '' : `<button class="sl-train" id="trainingChip" onclick="openTraining()">${tf.icon} Training: <b>${tf.label}</b> ✎</button>`}</div>`;
    }

    function impactHTML(sel) {
      const s = gameState;
      if (!sel) return '<div class="impact-empty">👆 Pick an offer — this strip shows how your club, role, minutes, value and trophy chances would change.</div>';
      const p = ui.proj[sel.key];
      const stay = ui.proj.stay;
      const cur = s.currentClubId ? CLUB_MAP[s.currentClubId] : null;
      const tgt = sel.club;
      const roleNew = sel.kind === 'STAY' ? s.squadRole : sel.data.squadRole;
      const roleDiff = cur ? ROLE_ORDER.indexOf(roleNew) - ROLE_ORDER.indexOf(s.squadRole) : 0;
      const vPct = p ? ((p.valueMed - s.marketValueM) / Math.max(0.1, s.marketValueM)) * 100 : 0;
      const wageNew = sel.data.wageM || 0;
      const wageDiff = cur ? wageNew - s.wageM : 0;
      const blind = scoutLevel() === 'BLIND';
      return `<div class="impact ${ui.justSelected ? 'pop' : ''}" id="impactStrip">
        <div class="impact-cell"><div class="impact-lbl">Club</div><div class="impact-val">${cur && cur.id !== tgt.id ? `${crestSVG(cur, 16)}<span class="arrow">→</span>` : ''}${crestSVG(tgt, 18)}<span style="overflow:hidden;text-overflow:ellipsis">${esc(tgt.name)}</span></div><div class="impact-sub">${starsHTML(tgt.starRating)} ${trendHTML(tgt.id)} ${esc(tgt.league)}</div></div>
        <div class="impact-cell"><div class="impact-lbl">Role · wage</div><div class="impact-val">${cur ? `<span class="muted">${roleLabel(s.squadRole)}</span><span class="arrow">→</span>` : ''}<span class="${roleDiff > 0 ? 'pos-t' : roleDiff < 0 ? 'neg-t' : ''}">${roleLabel(roleNew)}</span> ${help(roleNew)}</div><div class="impact-sub">${fmtWage(wageNew)}${cur && Math.abs(wageDiff) > 0.01 ? ` <span class="${wageDiff > 0 ? 'pos-t' : 'neg-t'}">(${wageDiff > 0 ? '+' : '−'}${fmtWage(Math.abs(wageDiff)).replace(' p/w', '')})</span>` : ''}</div></div>
        <div class="impact-cell"><div class="impact-lbl">Games / season</div><div class="impact-val num">${p ? showNum(p.apps, 0, 0.15) : '…'} ${sel.key !== 'stay' && stay && p ? deltaHTML(p.apps, stay.apps, { digits: 0 }) : ''}</div><div class="impact-sub">${p && p.pLoan > 0.5 && !blind ? '🌱 Includes a youth loan year' : p && !blind ? `Avg rating ≈ ${showNum(p.rating, 1, 0.02)}` : 'No scouting data'}</div></div>
        <div class="impact-cell"><div class="impact-lbl">Value in ${p ? p.years : ''} yr${p && p.years > 1 ? 's' : ''}</div><div class="impact-val num">${fmtM(s.marketValueM)}<span class="arrow">→</span><span class="${vPct >= 0 ? 'pos-t' : 'neg-t'}">${p ? showMoney(p.valueMed) : '…'}</span></div><div class="impact-sub">${p && !blind ? `range ${fmtM(p.valueP10)}–${fmtM(p.valueP90)}` : ''}</div></div>
        <div class="impact-cell"><div class="impact-lbl">Chance of a major trophy</div><div class="impact-val"><span class="gold-t">${p ? showPlain(p.pAnyMajor, true) : '…'}</span> ${sel.key !== 'stay' && stay && p ? deltaHTML(p.pAnyMajor, stay.pAnyMajor, { pctMode: true }) : ''}</div><div class="impact-sub">${p && scoutLevel() === 'FULL' ? `${pct(p.pAnyMajor)} · ≈ ${fmt1(p.trophiesMean)} trophies` : ''}</div></div>
      </div>`;
    }

    function optionTags(o) {
      const tags = [];
      const d = o.data;
      if (o.kind === 'STAY') {
        tags.push('<span class="pill pill-info">🛡 Stay</span>');
        if (d.isCaptain) tags.push('<span class="pill pill-gold">© Captain</span>');
        (d.warnings || []).forEach((w) => tags.push(`<span class="pill pill-neg">${esc(w)}</span>`));
        if (d.runDownContractActive) tags.push('<span class="pill pill-warn">Running down</span>');
      } else if (d.dramaBadge) {
        const rival = d.dramaTag === 'ARCH_RIVAL' || d.dramaTag === 'RIVAL';
        tags.push(`<span class="pill ${rival ? 'pill-neg' : d.dramaTag ? 'pill-gold' : d.isFreeAgent ? 'pill-pos' : 'pill-purple'}">${esc(d.dramaBadge)}</span>`);
      }
      if (gameState.rival && o.club.id === gameState.rival.clubId) tags.push(`<span class="pill pill-purple">😤 ${esc(gameState.rival.name)} plays here</span>`);
      if (d.negotiation) tags.push(`<span class="pill ${d.negotiation.outcome === 'accepted' || d.negotiation.counterAccepted ? 'pill-pos' : d.negotiation.outcome === 'rejected' ? 'pill-neg' : 'pill-warn'}">🤝 ${d.negotiation.outcome === 'accepted' || d.negotiation.counterAccepted ? 'Improved terms' : d.negotiation.outcome === 'rejected' ? 'Talks failed' : d.negotiation.resolved ? 'Original terms' : 'Counter-offer'}</span>`);
      return tags.join('');
    }
    function optionRowHTML(o, idx) {
      const s = gameState;
      const c = clubColors(o.club);
      const d = o.data;
      if (d.withdrawn) return `<div class="opt withdrawn" style="--c1:${c.c1}"><div>${crestSVG(o.club, 40)}</div><div><div class="opt-name">${esc(o.club.name)}</div><div class="opt-league neg-t">Offer withdrawn — talks collapsed</div></div><div></div></div>`;
      const fee = o.kind === 'STAY' ? '—' : d.feeM ? fmtM(d.feeM) : '<span class="pos-t">FREE</span>';
      const yrs = o.kind === 'STAY' ? (d.renegotiated ? `${d.renegotiated.contractYears}y` : s.contractYearsRemaining > 0 ? `${s.contractYearsRemaining}y` : 'new') : `${d.contractYears}y`;
      const role = o.kind === 'STAY' ? roleLabel(s.squadRole) : d.squadRoleLabel;
      const f = ui.fit && ui.fit[o.key];
      const isBest = ui.bestFit === o.key && scoutLevel() !== 'BLIND';
      return `<div class="opt ${ui.sel === o.key ? 'sel' : ''} ${ui.justArrived ? 'arrive' : ''}" style="--c1:${c.c1}; animation-delay:${idx * 0.08}s" role="button" tabindex="0" onclick="selectOption('${o.key}')" onkeydown="if(event.key===' '){event.preventDefault();selectOption('${o.key}');}">
        ${isBest ? `<span class="agent-pick">⭐ Best fit for ${PRIORITIES[s.priority || 'BALANCED'].label.toLowerCase()}</span>` : ''}
        <div style="position:relative">${crestSVG(o.club, 40)}<span class="kbd" style="position:absolute; left:-6px; top:-6px; font-size:9.5px; min-width:16px; padding:0 4px">${idx + 1}</span></div>
        <div style="min-width:0">
          <div class="opt-name">${esc(o.club.name)} ${trendHTML(o.club.id)}</div>
          <div class="opt-league">${starsHTML(o.club.starRating)}<span>${esc(o.kind === 'STAY' ? displayLeague(s, o.club) : o.club.league)}</span></div>
          <div class="opt-plain">${esc(offerPlainLine(o))}</div>
          ${o.kind !== 'STAY' && scoutLevel() !== 'BLIND' ? `<div class="opt-pkg">${esc(packageLine(gameState, o.data, o.club.id))}</div>` : ''}
          ${f && scoutLevel() !== 'BLIND' ? `<div class="opt-reason">${esc(f.reason)}</div>` : ''}
          <div class="opt-tags">${optionTags(o)}</div>
        </div>
        <div class="opt-terms">
          <div class="k">Fee</div><div class="k">Role</div><div class="k">Wage</div><div class="k">Deal</div>
          <div class="v">${fee}</div><div class="v" style="font-family:var(--font)">${role}</div><div class="v">${fmtWage(d.wageM).replace(' p/w', '')}</div><div class="v">${yrs}</div>
        </div>
        <div class="opt-fit">${fitBadge(o.key)}</div>
      </div>`;
    }

    function probRow(label, p, base, kind = 'good', tip = '') {
      const col = { good: 'var(--pos)', bad: 'var(--neg)', gold: 'var(--gold)', info: 'var(--info)', purple: 'var(--purple)' }[kind];
      const w = scoutLevel() === 'FOG' ? (p < 0.15 ? 12 : p < 0.45 ? 45 : 85) : Math.max(p > 0 ? 2 : 0, p * 100);
      return `<div class="prob" ${tip ? `title="${esc(tip)}"` : ''}><span class="muted">${label}</span><div class="bar"><div style="width:${w}%; background:${col}"></div></div><span class="pv">${showPlain(p, true)} ${base != null ? deltaHTML(p, base, { pctMode: true, invert: kind === 'bad' }) : ''}</span></div>`;
    }

    function buildScout(o, p, stay) {
      const s = gameState;
      const d = getDerivedState(s);
      const cur = d.currentClub;
      const tgt = o.club;
      const data = o.data;
      const pros = []; const cons = []; const notes = [];
      const isStay = o.kind === 'STAY';
      const exact = scoutLevel() === 'FULL';
      if (!isStay && cur) {
        const roleDiff = ROLE_ORDER.indexOf(data.squadRole) - ROLE_ORDER.indexOf(s.squadRole);
        if (roleDiff > 0) pros.push(`Promised <b>${roleLabel(data.squadRole)}</b> role — up from ${roleLabel(s.squadRole)}`);
        if (roleDiff < 0) cons.push(`Drops you to <b>${roleLabel(data.squadRole)}</b> (you're ${roleLabel(s.squadRole)} now)`);
        const sd = tgt.starRating - cur.starRating;
        if (sd > 0) pros.push(`Bigger club: ${sd} star${sd > 1 ? 's' : ''} above ${esc(cur.name)}`);
        if (sd < 0) cons.push(`Step down: ${-sd} star${sd < -1 ? 's' : ''} below ${esc(cur.name)}`);
        const wr = (data.wageM - s.wageM) / Math.max(0.05, s.wageM);
        if (wr >= 0.25) pros.push(`Pay rise: ${fmtWage(data.wageM)} (${Math.round(wr * 100)}% more)`);
        if (wr <= -0.2) cons.push(`Pay cut to ${fmtWage(data.wageM)}`);
      }
      if (clubTrend(s, tgt.id) > 0) pros.push(`${esc(tgt.name)} are a club on the rise`);
      if (clubTrend(s, tgt.id) < 0) cons.push(`${esc(tgt.name)} are in decline`);
      if (p && stay && !isStay && scoutLevel() !== 'BLIND') {
        const ad = p.apps - stay.apps;
        if (ad >= 5) pros.push(exact ? `About ${Math.round(ad)} more games a season than staying` : 'Noticeably more game time than staying');
        if (ad <= -5) cons.push(exact ? `About ${Math.round(-ad)} fewer games a season than staying` : 'Less game time than staying');
        const td = p.pAnyMajor - stay.pAnyMajor;
        if (td >= 0.1) pros.push(exact ? `Better trophy chances: ${plainOdds(p.pAnyMajor).toLowerCase()} vs ${plainOdds(stay.pAnyMajor).toLowerCase()} if you stay` : 'Better trophy chances than staying');
        if (td <= -0.1) cons.push(exact ? `Worse trophy chances: ${plainOdds(p.pAnyMajor).toLowerCase()} (staying: ${plainOdds(stay.pAnyMajor).toLowerCase()})` : 'Worse trophy chances than staying');
        const vr = (p.valueMed - stay.valueMed) / Math.max(1, stay.valueMed);
        if (vr >= 0.1) pros.push(`Projected value ${showMoney(p.valueMed)} vs ${showMoney(stay.valueMed)} staying`);
        if (vr <= -0.1) cons.push(`Projected value ${showMoney(p.valueMed)} vs ${showMoney(stay.valueMed)} staying`);
      }
      if (p && scoutLevel() !== 'BLIND') {
        if (p.pBallon >= 0.04) pros.push(`A real Ballon d'Or chance (${plainOdds(p.pBallon).toLowerCase()})`);
        else if (p.pPodium >= 0.15) pros.push(`Ballon d'Or podium in reach (${plainOdds(p.pPodium).toLowerCase()})`);
        if (p.pInjury >= 0.25) cons.push(`High injury risk (${plainOdds(p.pInjury).toLowerCase()})`);
        if (p.pReleg >= 0.06) cons.push(`Relegation risk: ${plainOdds(p.pReleg).toLowerCase()}`);
        if (p.pFallout >= 0.06) cons.push(`Could fall out with the manager (${plainOdds(p.pFallout).toLowerCase()})`);
        if (p.tournaments.length && p.pCalled < 0.7) cons.push(`Only ${plainOdds(p.pCalled).toLowerCase()} chance of making the ${esc(p.tournaments[0].title)} squad`);
        if (p.tournaments.length && p.pCalled >= 0.9) pros.push(`Near-certain ${esc(p.tournaments[0].title)} call-up`);
        if (p.pLoan >= 0.5) notes.push('Likely sent on a 1-year youth loan to a smaller club for minutes');
        if (p.pCaptain >= 0.15) pros.push('Good chance of being made captain');
        if (p.legacy != null && exact) notes.push(`Projected final legacy score ≈ <b>${Math.round(p.legacy)}/1000</b>`);
      }
      if (s.rival && tgt.id === s.rival.clubId) notes.push(`Your rival ${esc(s.rival.name)} plays here — team-mates, for now.`);
      if (!isStay) {
        if (data.dramaTag === 'ARCH_RIVAL' || data.dramaTag === 'RIVAL') {
          const { betrayedClub } = getCareerRivalryStatus(s, tgt.id);
          cons.push(`Betrays ${esc(betrayedClub ? betrayedClub.name : 'a former club')} — their fans will turn on you and you earn <b>The Judas</b> badge`);
          pros.push('Derby boost to your output (but more cards)');
        }
        if (data.dramaTag === 'STEPPING_STONE') pros.push('A shop window in Europe: the classic route to the elite');
        if (data.feeM >= 100 && !s.milestonesUnlocked.includes('TRANSFER_100M')) pros.push('A €100M+ fee unlocks the Galáctico Move milestone');
        if (data.dramaTag === 'BOYHOOD_RETURN') pros.push('Homecoming — finish here for the <b>Prodigal Son</b> badge');
        if (tgt.wealthTier === 'rich' && data.feeM >= 35) pros.push("Global brand boost: better Ballon d'Or odds and late-career stamina");
        if (cur) cons.push('Settling-in period: about 15% lower output in your first season');
        if (s.isCaptain) cons.push(`Gives up the ${esc(cur.name)} captaincy`);
        if (s.loyaltyYears >= 3 && cur) cons.push(`Resets ${s.loyaltyYears} seasons of loyalty bonus`);
        const t = s.clubTallies[cur ? cur.id : ''];
        if (cur && t) { const rec = clubRecord(cur.id); const k = POSITION_PROFILES[s.setup.position].primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets'; if (t[k] < rec[k] && t[k] >= rec[k] * 0.7) cons.push(`Walks away ${rec[k] - t[k]} short of the ${esc(cur.name)} club record`); }
        if (o.kind !== 'FIRST_CONTRACT') notes.push(data.isFreeAgent || !data.feeM ? 'Free transfer — nothing added to your career fees' : `Adds ${fmtM(data.feeM)} to your career fees (${fmtM(s.stats.totalTransferFeesM)} so far)`);
      } else {
        if (s.loyaltyYears >= 1) pros.push(`Loyalty builds: ${s.loyaltyYears} season(s) here (bonus at 3 and 6)`);
        if (s.isCaptain) pros.push("Keeps the captain's armband (+5% title odds)");
        if (s.unwantedByManager) cons.push('Frozen out — far fewer minutes (30% chance a new manager arrives)');
        if (s.relegatedLastWindow) cons.push(`Playing in the ${esc(displayLeague(s, cur))} — no league title until promotion`);
        if (data.runDownContractActive) notes.push('Running the deal down: free agent next window, but fewer minutes in the final year');
        const st = s.currentStint;
        if (st && cur && !s.betrayedClubIds.includes(cur.id) && st.seasons < 6 && st.seasons + d.actualWindowYears >= 6) notes.push('Staying puts you at 6+ seasons here — Club Legend and a retired shirt come into reach');
        const m = moodOf(s, cur.id);
        if (m >= 70) pros.push('The fans adore you here');
        if (m < 30) cons.push('The fans have turned on you');
      }
      return { pros, cons, notes };
    }

    /* ---------- Negotiation dialog ---------- */
    function asksFor(o) {
      if (!ui.asks[o.key]) ui.asks[o.key] = { role: 0, wage: 0, length: 'same', clause: o.data.releaseClause || 'standard' };
      return ui.asks[o.key];
    }
    function setAsk(key, field, val) {
      const o = getOptions().find((x) => x.key === key);
      const a = asksFor(o);
      a[field] = field === 'wage' || field === 'role' ? Number(val) : val;
      sfx('click');
      renderNegotiation(key);
    }
    function openNegotiation(key) {
      const o = getOptions().find((x) => x.key === key);
      if (!o || isQuick()) return;
      $('negoModal').classList.remove('hidden');
      renderNegotiation(key);
    }
    function closeNegotiation() { $('negoModal').classList.add('hidden'); renderApp(); }
    function renderNegotiation(key, phase = null) {
      const o = getOptions().find((x) => x.key === key);
      if (!o) return;
      const s = gameState;
      const d = o.data;
      const isStay = o.kind === 'STAY';
      const n = d.negotiation;
      const c = clubColors(o.club);
      const head = `<div class="nego-head" style="--c1:${c.c1}; color:${c.text}">${crestSVG(o.club, 44)}<div><div class="eyebrow" style="color:inherit; opacity:.75">${isStay ? 'Talks about a new deal' : 'Contract talks'}</div><div style="font-size:19px; font-weight:900">${esc(o.club.name)}</div></div><button class="btn btn-ghost" style="margin-left:auto; color:inherit" onclick="closeNegotiation()">✕</button></div>`;
      let body;
      if (phase === 'talking') {
        body = `<div class="nego-talk"><div class="typing big"><span></span><span></span><span></span></div><div>Your agent is on the phone with ${esc(o.club.name)}…</div></div>`;
      } else if (n && n.resolved) {
        const ok = n.outcome === 'accepted' || n.counterAccepted;
        body = `<div class="nego-result ${ok ? 'ok' : n.outcome === 'rejected' ? 'bad' : 'mid'}" style="font-size:14px">${ok ? `✅ <b>Deal improved.</b><br>${roleLabel(isStay ? s.squadRole : d.squadRole)} · ${fmtWage(d.wageM)} · ${isStay ? (d.renegotiated ? `${d.renegotiated.contractYears}-year deal` : '') : `${d.contractYears}-year deal`} · ${CLAUSE_TYPES[d.releaseClause || 'standard'].label.toLowerCase()}` : n.outcome === 'rejected' ? (isStay ? '❌ The board refused to improve your terms.' : `❌ ${esc(o.club.name)} walked away. The offer is gone.`) : '↩️ You turned down the counter-offer. The original terms stand.'}</div><div style="text-align:right; margin-top:12px"><button class="btn btn-go" onclick="closeNegotiation()">Done</button></div>`;
      } else if (n && !n.resolved) {
        const ct = n.counter; const parts = [];
        if (ct.role) parts.push(`${roleLabel(nextRole(isStay ? s.squadRole : d.squadRole))} role`);
        if (ct.wage) parts.push(`+${Math.round(ct.wage * 100)}% wages`);
        if (ct.length !== 'same') parts.push(`${ct.length} contract`);
        if (ct.clause !== (d.releaseClause || 'standard')) parts.push(CLAUSE_TYPES[ct.clause].label.toLowerCase());
        body = `<div class="nego-result mid" style="font-size:14px">↔️ <b>They came back with a counter-offer:</b><br>${parts.length ? parts.join(' · ') : 'your current terms plus a goodwill gesture'}.</div><div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px"><button class="btn" onclick="answerCounter('${o.key}', false)">Keep original terms</button><button class="btn btn-go" onclick="answerCounter('${o.key}', true)">Accept counter</button></div>`;
      } else {
        const a = asksFor(o);
        const lastOption = liveOptions().length <= 1;
        const odds = negotiationOdds(s, d, a, { isStay, isLastOption: lastOption || currentChoices.isFirstTurn });
        const segBtns = (field, opts) => `<div class="seg">${opts.map(([v, l, dis]) => `<button class="${String(a[field]) === String(v) ? 'on' : ''}" ${dis ? 'disabled' : ''} onclick="setAsk('${o.key}','${field}','${v}')">${l}</button>`).join('')}</div>`;
        const curRole = isStay ? s.squadRole : d.squadRole;
        body = `${isStay ? '' : `<div class="nego-row"><span class="muted">Squad role ${help(curRole)}</span>${segBtns('role', [[0, roleLabel(curRole)], [1, `↑ ${roleLabel(nextRole(curRole))}`, curRole === 'STAR']])}</div>`}
          <div class="nego-row"><span class="muted">Wages ${help('WAGE')}</span>${segBtns('wage', [[0, `As offered (${fmtWage(isStay ? s.wageM : d.wageM).replace(' p/w', '')})`], [0.15, '+15%'], [0.3, '+30%']])}</div>
          <div class="nego-row"><span class="muted">Contract</span>${segBtns('length', isStay ? [['same', 'Standard'], ['longer', 'Longer']] : [['same', `${d.contractYears} yr`], ['shorter', 'Shorter'], ['longer', 'Longer']])}</div>
          <div class="nego-row"><span class="muted">Release clause ${help('CLAUSE')}</span>${segBtns('clause', [['standard', 'Standard'], ['low', 'Low'], ['high', 'High'], ['none', 'None']])}</div>
          <div class="odds-bar"><div style="width:${odds.accept * 100}%; background:var(--pos)"></div><div style="width:${odds.counter * 100}%; background:var(--warn)"></div><div style="width:${odds.walk * 100}%; background:var(--neg)"></div></div>
          <div class="odds-legend"><span>Yes: <b>${plainShort(odds.accept)}</b></span><span>Counter: <b>${plainShort(odds.counter)}</b></span><span>${isStay ? 'Refuse' : 'Walk away'}: <b>${odds.walk ? plainShort(odds.walk) : 'no risk'}</b></span><span class="dim">${agentOf(s).icon} ${agentOf(s).label} agent</span></div>
          <div class="dim" style="font-size:11.5px; margin-top:6px">One attempt per offer. Ask for more and the club is likelier to counter — or walk away.</div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px"><button class="btn" onclick="closeNegotiation()">Cancel</button><button class="btn btn-go" onclick="submitNegotiation('${o.key}')" ${odds.accept >= 1 ? 'disabled' : ''}>🤝 Make proposal</button></div>`;
      }
      $('negoBody').innerHTML = `${head}<div class="nego-body">${body}</div>`;
    }
    function submitNegotiation(key) {
      const o = getOptions().find((x) => x.key === key);
      if (!o || o.data.negotiation) return;
      const isStay = o.kind === 'STAY';
      renderNegotiation(key, 'talking');
      sfx('buzz');
      setTimeout(() => {
        const res = negotiateOffer(gameState, o.data, { ...asksFor(o) }, { isStay, isLastOption: liveOptions().length <= 1 || currentChoices.isFirstTurn });
        sfx(res.outcome === 'accepted' ? 'trophy' : res.outcome === 'rejected' ? 'bad' : 'click');
        if (res.outcome === 'rejected' && !isStay) ui.sel = null;
        gameState.pendingChoices = currentChoices;
        saveCareer(gameState);
        ensureProjections(true);
        renderNegotiation(key);
      }, motionOff() ? 50 : 1300);
    }
    function answerCounter(key, accept) {
      const o = getOptions().find((x) => x.key === key);
      resolveCounter(gameState, o.data, accept, o.kind === 'STAY');
      gameState.pendingChoices = currentChoices;
      saveCareer(gameState);
      ensureProjections(true);
      renderNegotiation(key);
    }

    /* ---------- Training drawer ---------- */
    function openTraining() {
      const s = gameState;
      const d = getDerivedState(s);
      $('negoModal').classList.remove('hidden');
      $('negoBody').innerHTML = `<div class="nego-head" style="--c1:#2b3a55; color:#fff"><div style="font-size:26px">🏋️</div><div><div class="eyebrow" style="color:inherit; opacity:.75">Next ${d.actualWindowYears} season${d.actualWindowYears > 1 ? 's' : ''}</div><div style="font-size:19px; font-weight:900">Training focus</div></div><button class="btn btn-ghost" style="margin-left:auto; color:inherit" onclick="closeNegotiation()">✕</button></div>
        <div class="nego-body"><div class="dim" style="font-size:12.5px; margin-bottom:10px">Attributes grow with minutes and coaching. Focus on what your position needs — your overall is <b style="color:var(--text)">${overallRating(s.setup.position, s.attributes).toFixed(1)}</b> ${help('OVERALL')}.</div>
        <div class="train-grid">${trainingOptionsFor(s.setup.position).map((t) => `<button class="train-opt ${s.trainingFocus === t.id ? 'on' : ''}" onclick="setTraining('${t.id}')"><b>${t.icon} ${t.label}</b><span>${t.desc}${t.attrs.length ? ` (${t.attrs.map((k) => ATTR_LABELS[k]).join(', ')})` : ''}</span></button>`).join('')}</div>
        <div style="margin-top:14px">${attributesHTML(s)}</div></div>`;
    }
    function setTraining(id) {
      gameState.trainingFocus = id;
      saveCareer(gameState);
      ensureProjections(true);
      sfx('click');
      showToast('Training updated', `${TRAINING_FOCUS[id].icon} ${TRAINING_FOCUS[id].label} for the next window.`);
      closeNegotiation();
    }

    /* ---------- Offer detail (shorter: verdict → scout → key numbers → more) ---------- */
    function detailHTML(o) {
      const s = gameState;
      if (!o) {
        return `<div class="panel"><div class="panel-body" style="padding:40px 20px; text-align:center"><div style="font-size:38px; margin-bottom:8px">🧭</div><div style="font-weight:800; font-size:15px; margin-bottom:4px">Pick an offer to see the scouting report</div><div class="muted">${scoutLevel() === 'BLIND' ? "You're playing Blind: no projections, just the terms and your instincts." : 'Tell us what matters to you above, and the best fit gets a ⭐.'}</div></div></div>`;
      }
      const d = getDerivedState(s);
      const c = clubColors(o.club);
      const p = ui.proj[o.key];
      const stay = o.key !== 'stay' ? ui.proj.stay : null;
      const data = o.data;
      const defs = statDefs(s.setup.position);
      const scout = buildScout(o, p, ui.proj.stay);
      const isStay = o.kind === 'STAY';
      const blind = scoutLevel() === 'BLIND';
      const f = ui.fit && ui.fit[o.key];
      const terms = isStay
        ? [['Wage', fmtWage(data.wageM), 'WAGE'], ['Contract', data.renegotiated ? `${data.renegotiated.contractYears} yr (new)` : s.contractYearsRemaining > 0 ? `${s.contractYearsRemaining} yr` : 'Re-sign', 'RUNDOWN'], ['Role', roleLabel(s.squadRole), s.squadRole], ['Clause', s.releaseClauseM ? fmtM(s.releaseClauseM) : 'None', 'CLAUSE']]
        : [['Fee', data.feeM ? fmtM(data.feeM) : 'FREE', data.feeM ? 'FEE' : 'FREE'], ['Wage', fmtWage(data.wageM), 'WAGE'], ['Contract', `${data.contractYears} yr`, null], ['Role', data.squadRoleLabel, data.squadRole]];
      const probs = [];
      if (p && !blind) {
        probs.push(probRow('League title', p.pLeague, stay ? stay.pLeague : null, 'gold'));
        probs.push(probRow('Domestic cup', p.pCup, stay ? stay.pCup : null, 'gold'));
        probs.push(probRow('Continental cup', p.pCont, stay ? stay.pCont : null, 'gold'));
        if (p.tournaments.length) {
          probs.push(probRow(`${p.tournaments[0].title.replace(/^(UEFA|CONMEBOL|CAF|AFC|CONCACAF)\s/, '')} call-up`, p.pCalled, stay ? stay.pCalled : null, 'info', `Age ${p.tournaments[0].age}`));
          probs.push(probRow(`Win it with ${getNation(s).name}`, p.pIntlWin, stay ? stay.pIntlWin : null, 'gold'));
        }
        probs.push(probRow("Ballon d'Or", p.pBallon, stay ? stay.pBallon : null, 'purple'));
        probs.push(probRow('Ballon d’Or podium', p.pPodium, stay ? stay.pPodium : null, 'purple'));
        probs.push(probRow('Individual award', p.pAward, stay ? stay.pAward : null, 'gold'));
        probs.push(probRow('Injury spell', p.pInjury, stay ? stay.pInjury : null, 'bad'));
        if (p.pReleg > 0 || (stay && stay.pReleg > 0)) probs.push(probRow('Relegation', p.pReleg, stay ? stay.pReleg : null, 'bad'));
        if (p.pFallout > 0) probs.push(probRow('Manager fallout', p.pFallout, stay ? stay.pFallout : null, 'bad'));
      }
      const tile = (v, l, dl) => `<div class="pt"><div class="v">${v}</div><div class="l">${l}</div>${dl || ''}</div>`;
      const projColor = hexLum(c.c1) > 0.45 || hexLum(c.c1) < 0.02 ? '#4ea8ff' : c.c1;
      const preview = { club: o.club, years: isStay ? Math.max(d.actualWindowYears, s.contractYearsRemaining) : data.contractYears };
      const canNegotiate = !isQuick() && !(data.negotiation && data.negotiation.resolved);
      return `<div class="panel detail">
        <div class="det-head" style="--c1:${c.c1}; --c2:${c.c2}; --dt:${c.text}">
          <div class="det-title">${crestSVG(o.club, 62)}<div style="min-width:0"><div class="eyebrow" style="color:inherit; opacity:.75">${isStay ? 'Current club' : o.kind === 'FIRST_CONTRACT' ? 'First professional contract' : 'Incoming offer'}</div><div class="det-name">${isStay ? `Stay at ${esc(o.club.name)}` : esc(o.club.name)}</div><div class="det-sub">${starsHTML(o.club.starRating)} ${trendHTML(o.club.id)} · ${esc(isStay ? displayLeague(s, o.club) : o.club.league)}</div></div><div style="margin-left:auto">${fitBadge(o.key, 'lg')}</div></div>
          <div class="det-pitch">${esc(isStay ? data.contractStatus : data.pitchText || '')}</div>
        </div>
        <div class="terms">${terms.map(([k, v, h]) => `<div class="term"><div class="k">${k} ${h ? help(h) : ''}</div><div class="v">${v}</div></div>`).join('')}</div>
        ${f && !blind ? `<div class="verdict"><b>Agent's verdict:</b> ${esc(f.reason)}.</div>` : ''}
        ${isStay && data.canToggleRunDownContract && !data.renegotiated ? `<div class="sec"><label class="rundown"><span><b>Run down my contract</b> ${help('RUNDOWN')} — leave for free next window (fewer minutes in the final year)</span><span class="switch"><input type="checkbox" ${data.runDownContractActive ? 'checked' : ''} onchange="toggleRunDown()"/><span></span></span></label></div>` : ''}
        <div class="sec"><div class="scout">
            <div class="pros"><h4 class="pos-t">Why sign</h4><ul>${scout.pros.length ? scout.pros.map((x) => `<li>${x}</li>`).join('') : '<li class="dim">Nothing stands out</li>'}</ul></div>
            <div class="cons"><h4 class="neg-t">Watch out</h4><ul>${scout.cons.length ? scout.cons.map((x) => `<li>${x}</li>`).join('') : '<li class="dim">No major red flags</li>'}</ul></div>
          </div>${scout.notes.length ? `<div class="scout" style="grid-template-columns:1fr; margin-top:10px"><div class="notes"><ul>${scout.notes.map((x) => `<li class="muted">${x}</li>`).join('')}</ul></div></div>` : ''}</div>
        <div class="sec">
          <div class="sec-title"><span>Each season, roughly ${help('ODDS')}</span><span>${blind ? 'blind' : stay && scoutLevel() === 'FULL' ? 'vs staying' : ''}</span></div>
          ${blind ? '<div class="fog">No projections in Blind mode. Read the terms, the club and the scout notes.</div>' : p ? `<div class="proj-tiles">
            ${tile(showNum(p.apps, 0, 0.15), 'Games', stay ? deltaHTML(p.apps, stay.apps, { digits: 0 }) : '')}
            ${tile(projStatVal(p, defs[0]), defs[0].l, stay ? deltaHTML(p[defs[0].k], stay[defs[0].k]) : '')}
            ${tile(projStatVal(p, defs[1]), defs[1].l, stay ? deltaHTML(p[defs[1].k], stay[defs[1].k]) : '')}
            ${tile(scoutLevel() === 'FULL' ? `<span class="rat" style="background:${ratingColor(p.rating)}; font-size:15px">${p.rating.toFixed(2)}</span>` : showNum(p.rating, 1, 0.03), 'Avg rating', stay ? deltaHTML(p.rating, stay.rating, { digits: 2 }) : '')}
          </div><div class="dim" style="font-size:11.5px; margin-top:8px">💶 You'd earn <b style="color:var(--text)">${fmtM(p.earnings)}</b> over the window ${stay && scoutLevel() === 'FULL' ? deltaHTML(p.earnings, stay.earnings, { money: true }) : ''}</div>` : '<div class="skeleton" style="height:56px"></div>'}
        </div>
        <details class="more"${ui.moreOpen ? ' open' : ''} ontoggle="ui.moreOpen = this.open"><summary>More detail: odds, value forecast, career timeline</summary>
          ${blind ? '' : `<div class="sec"><div class="sec-title"><span>Chances over the whole window</span><span>${stay && scoutLevel() === 'FULL' ? 'change vs staying' : ''}</span></div>${probs.join('')}</div>
          <div class="sec"><div class="sec-title"><span>Market value forecast</span><span>${p ? `${showMoney(p.valueMed)} · range ${fmtM(p.valueP10)}–${fmtM(p.valueP90)}` : ''}</span></div>${valueChartSVG({ history: s.valueHistory, proj: p, projColor, w: 520, h: 150, maxAge: Math.min(s.setup.retirementAge, d.nextAge + 2) })}</div>`}
          <div class="sec"><div class="sec-title"><span>Where this fits in your career</span><span>🌍 tournaments</span></div>${journeyHTML(s, preview)}</div>
        </details>
        <div class="action-bar">${canNegotiate ? `<button class="btn btn-nego" onclick="openNegotiation('${o.key}')">🤝 Negotiate</button>` : ''}<button class="btn btn-go btn-lg" onclick="confirmSelection()">${isStay ? `Commit to ${esc(o.club.name)}` : o.kind === 'FIRST_CONTRACT' ? 'Sign pro contract' : `Accept offer`} ▸</button></div>
      </div>`;
    }

    function compareHTML() {
      const s = gameState;
      const opts = liveOptions();
      const defs = statDefs(s.setup.position);
      const blind = scoutLevel() === 'BLIND';
      const first = ui.proj[opts[0].key];
      const rows = [
        ...(blind ? [] : [{ l: `Fit (${PRIORITIES[s.priority || 'BALANCED'].label})`, v: (p, o) => (ui.fit[o.key] || {}).fit || 0, f: (o) => fitBadge(o.key, 'sm'), always: true }]),
        { l: 'Fee', f: (o) => (o.kind === 'STAY' ? '—' : o.data.feeM ? fmtM(o.data.feeM) : 'FREE') },
        { l: 'Role', f: (o) => (o.kind === 'STAY' ? roleLabel(s.squadRole) : o.data.squadRoleLabel) },
        { l: 'Wage', v: (p, o) => o.data.wageM || 0, f: (o) => fmtWage(o.data.wageM), always: true },
        { l: 'Contract', f: (o) => (o.kind === 'STAY' ? `${Math.max(0, s.contractYearsRemaining)} yr` : `${o.data.contractYears} yr`) },
        ...(blind ? [] : [
          { l: 'Games / season', v: (p) => p.apps, f: (o, p) => showNum(p.apps, 0, 0.15) },
          { l: `${defs[0].l} / season`, v: (p) => p[defs[0].k], f: (o, p) => projStatVal(p, defs[0]) },
          { l: 'Avg rating', v: (p) => p.rating, f: (o, p) => (scoutLevel() === 'FULL' ? ratingBadge(p.rating) : showNum(p.rating, 1, 0.03)) },
          { l: 'Value at end', v: (p) => p.valueMed, f: (o, p) => showMoney(p.valueMed) },
          { l: 'Earnings', v: (p) => p.earnings, f: (o, p) => fmtM(p.earnings) },
          { l: 'League title', v: (p) => p.pLeague, f: (o, p) => showPlain(p.pLeague, true) },
          { l: 'Any major trophy', v: (p) => p.pAnyMajor, f: (o, p) => showPlain(p.pAnyMajor, true) },
          { l: "Ballon d'Or", v: (p) => p.pBallon, f: (o, p) => showPlain(p.pBallon, true) },
          ...(first && first.tournaments.length ? [{ l: 'Tournament call-up', v: (p) => p.pCalled, f: (o, p) => showPlain(p.pCalled, true) }] : []),
          { l: 'Injury risk', v: (p) => -p.pInjury, f: (o, p) => showPlain(p.pInjury, true) },
          ...(first && first.legacy != null && scoutLevel() === 'FULL' ? [{ l: 'Final legacy (/1000)', v: (p) => p.legacy, f: (o, p) => Math.round(p.legacy) }] : []),
        ]),
      ];
      return `<div class="panel" style="overflow-x:auto"><table class="tbl cmp"><thead><tr><th>${blind ? 'Terms' : `Over ${getDerivedState(s).actualWindowYears} season(s)`}</th>${opts.map((o) => `<th class="opt-h"><div style="display:flex; flex-direction:column; align-items:center; gap:4px">${crestSVG(o.club, 30)}<span style="color:var(--text); text-transform:none; letter-spacing:0">${esc(o.club.name)}</span>${o.kind === 'STAY' ? '<span class="pill pill-info">Stay</span>' : ''}</div></th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => {
          const vals = r.v ? opts.map((o) => r.v(ui.proj[o.key] || {}, o)) : [];
          const max = vals.length ? Math.max(...vals) : null;
          const min = vals.length ? Math.min(...vals) : null;
          const hl = r.v && (scoutLevel() === 'FULL' || r.always);
          return `<tr><td class="muted">${r.l}</td>${opts.map((o, i) => `<td class="c ${hl && opts.length > 1 && max !== min && vals[i] === max ? 'best' : ''} ${hl && opts.length > 2 && max !== min && vals[i] === min ? 'worst' : ''}">${r.f(o, ui.proj[o.key] || {})}</td>`).join('')}</tr>`;
        }).join('')}
        <tr><td></td>${opts.map((o) => `<td class="c"><button class="btn ${ui.sel === o.key ? 'btn-go' : ''}" onclick="selectOption('${o.key}'); setTransferTab('offers')">${ui.sel === o.key ? 'Selected' : 'Select'}</button></td>`).join('')}</tr></tbody></table></div>`;
    }
    function setTransferTab(t) { ui.tTab = t; renderPage(); }

    function renderTransfers() {
      const s = gameState;
      const d = getDerivedState(s);
      const head = `<div class="page-head">
          <div><div class="eyebrow">Transfer Centre</div><h1>${currentChoices.isFirstTurn ? 'First professional contract' : `Summer window ${windowYear(s.currentAge)}`}</h1><div class="sub">Age ${s.currentAge} → ${d.nextAge} · ${d.actualWindowYears} season${d.actualWindowYears > 1 ? 's' : ''} until the next window</div></div>
          <div style="display:flex; gap:8px">${currentChoices.canRetireEarly ? '<button class="btn btn-danger" onclick="handleEarlyRetirement()">🏁 Retire</button>' : ''}</div>
        </div>`;
      if (arrivalNeeded()) return head + arrivalsHTML();
      if (isQuick()) return renderTransfersQuick();
      const opts = getOptions();
      const sel = selectedOption();
      return `${head}${statusLineHTML()}${priorityBarHTML()}${impactHTML(sel)}
        <div class="tabs"><button class="tab ${ui.tTab === 'offers' ? 'active' : ''}" onclick="setTransferTab('offers')">Offers <span class="dim" style="font-weight:600">· ${liveOptions().length}</span></button><button class="tab ${ui.tTab === 'compare' ? 'active' : ''}" onclick="setTransferTab('compare')">Compare side by side</button><span class="tab-hint dim"><span class="kbd">↑↓</span> pick · <span class="kbd">Enter</span> confirm</span></div>
        ${ui.tTab === 'offers' ? `<div class="tc-grid"><div class="opt-list">${opts.map((o, i) => optionRowHTML(o, i)).join('')}</div><div>${detailHTML(sel)}</div></div>` : compareHTML()}`;
    }

    /* ---------- Quick mode: big cards ---------- */
    function renderTransfersQuick() {
      const s = gameState;
      const d = getDerivedState(s);
      const opts = liveOptions();
      return `<div class="quick-head"><div><div class="eyebrow" style="color:#9fd0ff">⚡ Quick mode · decision ${s.stepIndex + 1} of ${s.ageSteps.length - 1}</div><h2 style="font-size:20px; font-weight:900">${currentChoices.isFirstTurn ? 'Pick your first club' : 'Where next?'}</h2><div class="muted" style="font-size:12.5px">Age ${s.currentAge} → ${d.nextAge}. Tap a card to sign.</div></div>
        <div style="display:flex; gap:6px; flex-wrap:wrap"><button class="btn" onclick="agentDecide('TROPHIES')">🏆 Agent: trophies</button><button class="btn" onclick="agentDecide('MINUTES')">⏱ Agent: game time</button><button class="btn" onclick="agentDecide('MONEY')">💶 Agent: money</button><button class="btn btn-go" onclick="autoplayCareer()">⏩ Auto-play to retirement</button></div></div>
        ${priorityBarHTML()}
        <div class="qcards">${opts.map((o, i) => {
          const c = clubColors(o.club);
          const p = ui.proj[o.key];
          const f = ui.fit[o.key];
          return `<div class="qcard ${ui.bestFit === o.key ? 'best' : ''} ${ui.justArrived ? 'arrive' : ''}" style="--c1:${c.c1}; --ct:${c.text}; animation-delay:${i * 0.1}s">
            <div class="qh">${crestSVG(o.club, 48)}<div style="min-width:0"><div class="qn">${o.kind === 'STAY' ? `Stay at ${esc(o.club.name)}` : esc(o.club.name)}</div><div style="opacity:.85; font-size:12px">${starsHTML(o.club.starRating)} ${esc(o.club.league)}</div></div><div style="margin-left:auto">${fitBadge(o.key)}</div></div>
            <div class="qplain">${esc(offerPlainLine(o))}</div>
            ${f ? `<div class="qreason">${ui.bestFit === o.key ? '⭐ ' : ''}${esc(f.reason)}</div>` : ''}
            <div class="qb"><div><div class="v">${p ? Math.round(p.apps) : '–'}</div><div class="l">Games/yr</div></div><div><div class="v gold-t" style="font-size:15px">${p ? plainShort(p.pAnyMajor) : '–'}</div><div class="l">Trophy chance</div></div><div><div class="v ${p && p.valueMed >= s.marketValueM ? 'pos-t' : 'neg-t'}">${p ? fmtM(p.valueMed) : '–'}</div><div class="l">Value after</div></div></div>
            <div class="qt">${o.kind === 'STAY' ? '<span class="pill pill-info">Stay</span>' : `<span class="pill">${o.data.feeM ? fmtM(o.data.feeM) : 'Free'}</span>`}<span class="pill">${roleLabel(o.kind === 'STAY' ? s.squadRole : o.data.squadRole)}</span><span class="pill">${fmtWage(o.data.wageM)}</span>${o.data.dramaBadge && o.kind !== 'STAY' ? `<span class="pill pill-gold">${esc(o.data.dramaBadge)}</span>` : ''}</div>
            <div class="qf"><button class="btn btn-go" style="width:100%" onclick="selectOption('${o.key}'); confirmSelection()"><span class="kbd" style="margin-right:4px">${i + 1}</span> ${o.kind === 'STAY' ? 'Stay' : 'Sign'} ▸</button></div>
          </div>`;
        }).join('')}</div>`;
    }

    /* ---------- Actions ---------- */
    function selectOption(key) {
      const o = getOptions().find((x) => x.key === key);
      if (!o || o.data.withdrawn || arrivalNeeded()) return;
      ui.justSelected = ui.sel !== key;
      ui.sel = key;
      sfx('click');
      renderTopbar();
      renderPage();
      ui.justSelected = false;
    }
    function toggleRunDown() {
      const { canToggleRunDownContract } = getDerivedState(gameState);
      if (!canToggleRunDownContract || !currentChoices.stayOption) return;
      gameState.runDownContractActive = !gameState.runDownContractActive;
      if (gameState.runDownContractActive) gameState.isCaptain = false;
      const st = currentChoices.stayOption;
      st.runDownContractActive = gameState.runDownContractActive;
      st.isCaptain = gameState.isCaptain;
      st.contractStatus = gameState.runDownContractActive ? '⚠️ Running down deal (free agent next window)' : 'Final contract window (auto-renews unless you run it down)';
      gameState.pendingChoices = currentChoices;
      saveCareer(gameState);
      ui.proj.stay = projectDecision(gameState, st);
      computeFit();
      showToast(gameState.runDownContractActive ? 'Running down your contract' : 'Contract will auto-renew', gameState.runDownContractActive ? 'Every offer next window will be a free transfer.' : 'You will sign an extension at the end of this window.', gameState.runDownContractActive ? 'var(--warn)' : 'var(--accent)');
      renderApp();
    }
    function handleEarlyRetirement() {
      if (!confirm(`Retire now at age ${gameState.currentAge}? This ends your career.`)) return;
      gameState.setup.retirementAge = gameState.currentAge;
      finalizeCareerRetirement(gameState);
      showLegacy();
    }
    function agentDecide(priority) {
      ensureProjections();
      const pick = agentChoose(liveOptions(), ui.proj, priority);
      if (!pick) return;
      showToast('Your agent has decided', `${pick.kind === 'STAY' ? 'Stay at' : 'Go to'} ${pick.club.name}.`);
      selectOption(pick.key);
      if (isQuick()) confirmSelection();
    }
    function confirmSelection() {
      const o = selectedOption();
      if (!o || !gameState) return;
      if (!ui.proj[o.key]) ui.proj[o.key] = projectDecision(gameState, o.data);
      const ctx = { option: o, proj: ui.proj[o.key], prevClubId: gameState.currentClubId, prevValue: gameState.marketValueM, prevRole: gameState.squadRole, prevLoyalty: gameState.loyaltyYears };
      ctx.storyInfo = storyWindowInfo(gameState, o);
      ctx.win = beginWindow(gameState, o.data);
      resetUiForWindow();
      startReview(ctx);
    }
    function finishWindow(ctx) {
      const result = endWindow(gameState, ctx.win);
      ctx.report = result.report;
      ctx.isRetired = result.isRetired;
      if (!result.isRetired) {
        currentChoices = applyRelationshipToChoices(gameState, generateChoices(gameState));
        gameState.pendingChoices = currentChoices;
        storyOpen(gameState, (currentChoices.offers || []).length, { auto: isQuick() });
        saveCareer(gameState);
      }
    }

    /* ---------- Quick mode autoplay ---------- */
    async function autoplayCareer() {
      if (!confirm('Let your agent make every remaining decision and jump to your retirement?')) return;
      gameState.arrivedWindow = gameState.windowCount;
      const el = document.createElement('div');
      el.className = 'montage';
      document.body.appendChild(el);
      const total = gameState.ageSteps.length - 1;
      while (!gameState.isRetired) {
        ensureProjections(true);
        const pick = agentChoose(liveOptions(), ui.proj, gameState.priority || 'BALANCED');
        const club = pick.club;
        el.innerHTML = `<div><div class="eyebrow" style="color:#9fd0ff">Auto-play · age ${gameState.currentAge}</div><div class="mt-crest" style="margin:14px auto; width:96px">${crestSVG(club, 96)}</div><div style="font-size:22px; font-weight:900">${pick.kind === 'STAY' ? 'Stays at' : 'Signs for'} ${esc(club.name)}</div><div class="mt-bar"><div style="width:${(gameState.stepIndex / total) * 100}%"></div></div><div class="dim">${gameState.trophies.length} trophies · ${fmtM(gameState.marketValueM)}</div></div>`;
        sfx('click');
        const info = storyWindowInfo(gameState, pick);
        const r = simulateWindow(gameState, pick.data);
        storyWindow(gameState, info, { auto: true });
        r.report.seasons.forEach((se) => storySeason(gameState, se, { auto: true }));
        if (r.isRetired) break;
        currentChoices = applyRelationshipToChoices(gameState, generateChoices(gameState));
        gameState.pendingChoices = currentChoices;
        storyOpen(gameState, (currentChoices.offers || []).length, { auto: true });
        gameState.arrivedWindow = gameState.windowCount;
        saveCareer(gameState);
        resetUiForWindow();
        await new Promise((res) => setTimeout(res, motionOff() ? 60 : 650));
      }
      el.remove();
      showLegacy();
    }
