    /* ==========================================================================
     * v10 · TRAINING & CONTRACT PAGES
     * ========================================================================== */
    function attrBar(name, val, prev, focused) {
      const d = prev != null ? val - prev : 0;
      return `<div class="ab ${focused ? 'ab-on' : ''}"><span class="ab-n">${esc(name)}${focused ? ' <span class="ab-f">training</span>' : ''}</span><span class="ab-bar"><span style="width:${(clamp(val, 0, 20) / 20) * 100}%; background:${val >= 16 ? 'var(--pos)' : val >= 12 ? 'var(--gold)' : val >= 8 ? 'var(--info)' : 'var(--text-3)'}"></span></span><span class="ab-v">${val.toFixed(1)}</span><span class="ab-d ${d > 0.05 ? 'pos-t' : d < -0.05 ? 'neg-t' : 'dim'}">${Math.abs(d) >= 0.05 ? `${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)}` : ''}</span></div>`;
    }
    function renderTrainingPage() {
      const s = gameState;
      const v = ensureV10(s);
      const pos = s.setup.position;
      const ceil = scoutsCeiling(s);
      const groups = groupsFor(pos);
      const targets = trainingTargets(s);
      const team = TRAINING_FOCUS[s.trainingFocus] || TRAINING_FOCUS.BALANCED;
      const learning = v.learning && !v.knownPositions.includes(v.learning.pos) ? v.learning : null;
      const switchable = v.knownPositions.filter((p) => p !== pos);
      return `<div class="page-head"><div><div class="eyebrow">Attributes, training and fitness</div><h1>Training</h1>
          <div class="muted">${esc(POS_NAMES[pos])} · overall <b>${ceil.now.toFixed(1)}</b> · scouts’ ceiling <b>${ceil.lo.toFixed(1)}–${ceil.hi.toFixed(1)}</b> · ${v.foot} foot · weak foot ${'★'.repeat(v.weakFoot)}${'☆'.repeat(5 - v.weakFoot)}</div></div></div>
        <div class="tr-grid">
          <div class="panel"><div class="panel-head"><span>Individual training</span><span class="right">pick up to two</span></div><div class="panel-body">
            <div class="dim" style="font-size:12.5px; margin-bottom:8px">Team training (${esc(team.label)}) sets how fast your six main attributes grow. Individual training decides which details inside them grow most, and the right details give real edges: Finishing for goals, Vision and Crossing for assists, Tackling or Reflexes for clean sheets, Stamina for games and fitness.</div>
            <div class="foc-list">${targets.map((t) => `<label class="foc ${v.focus.includes(t.id) ? 'on' : ''}"><input type="checkbox" ${v.focus.includes(t.id) ? 'checked' : ''} ${!v.focus.includes(t.id) && v.focus.length >= 2 ? 'disabled' : ''} onchange="toggleFocus('${esc(t.id)}')"><span>${esc(t.label)}</span><em>${esc(t.group)}</em></label>`).join('')}</div>
            ${learning ? `<div class="learn"><b>Learning ${esc(POS_NAMES[learning.pos])}</b><div class="goal-bar"><div style="width:${Math.round(learning.progress * 100)}%"></div></div><span class="dim">${Math.round(learning.progress * 100)}% — usually one or two seasons, faster if you play a lot</span></div>` : ''}
            ${switchable.length ? `<div class="learn"><b>Positions you can play</b><div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px">${switchable.map((p) => `<button class="btn" onclick="doSwitchPosition('${p}')">Switch to ${esc(POS_NAMES[p])}</button>`).join('')}</div><div class="dim" style="font-size:12px; margin-top:4px">Switching changes your stats, peak years and what the manager expects of you from next season.</div></div>` : ''}
          </div></div>
          <div class="panel"><div class="panel-head"><span>Traits</span><span class="right">${v.traits.length} earned</span></div><div class="panel-body">
            <div class="traits">${Object.entries(TRAITS).map(([id, t]) => { const got = v.traits.find((x) => x.id === id); return `<div class="trait ${got ? 'got' : ''}" title="${esc(t.how)}"><span>${t.ic}</span><div><b>${esc(t.name)}</b><em>${got ? `earned at ${got.age}` : esc(t.how)}</em>${typeof TRAIT_EDGES !== 'undefined' && TRAIT_EDGES[id] ? `<em class="tr-fx">${esc(TRAIT_EDGES[id].text)}</em>` : ''}</div></div>`; }).join('')}</div>
            <div class="dim" style="font-size:12px; margin-top:6px">Each trait gives a small edge. All traits together add at most 6% to any one stat.</div></div></div>
        </div>
        ${typeof edgesSummary === 'function' ? (() => { const es = edgesSummary(s); return `<div class="panel edges"><div class="panel-head"><span>Your edges</span><span class="right">compared with a typical player at your stage</span></div><div class="panel-body">${es.rows.length ? `<div class="edge-rows">${es.rows.map(([k, x]) => `<div class="edge"><span>${esc(k)}</span><b class="${String(x).startsWith('-') && k !== 'Injury risk' && k !== 'Decline with age' ? 'neg-t' : 'pos-t'}">${esc(x)}</b></div>`).join('')}</div><div class="dim" style="font-size:12px; margin-top:6px">From: ${[...new Set(es.parts.map((p) => p.src))].map(esc).join(' · ')}</div>` : '<div class="dim">No edges yet. Train a detail, raise your weak foot or earn a trait.</div>'}</div></div>`; })() : ''}
        <div class="attr-grid">${groups.map((g) => `<div class="panel"><div class="panel-head"><span>${esc(ATTR_LABELS[g] || g)}</span><span class="right"><b>${(s.attributes[g] || 0).toFixed(1)}</b></span></div><div class="panel-body">${(SUB_ATTRS[g] || []).map((n) => attrBar(n, v.subs[n] || 0, v.prevSubs[n], v.focus.includes(n))).join('')}</div></div>`).join('')}
          <div class="panel"><div class="panel-head"><span>Mental</span></div><div class="panel-body">${MENTAL_ATTRS.map((n) => attrBar(n, v.mental[n], null, v.focus.includes(n))).join('')}</div></div></div>
        <div class="panel"><div class="panel-head"><span>Medical history</span><span class="right">${v.injuries.length} injur${v.injuries.length === 1 ? 'y' : 'ies'}</span></div><div class="panel-body">${v.injuries.length ? v.injuries.map((i) => `<div class="cast-row"><span>🏥</span><div><b>${esc(i.name)}</b> <span class="dim">· age ${i.age} · out for ${i.weeks} weeks${i.recurrence ? ' · a recurrence' : ''}</span></div></div>`).join('') : '<div class="dim">No serious injuries so far.</div>'}
          ${injuryRiskMult(s) > 1 ? '<div class="dim" style="font-size:12px; margin-top:6px">Recently injured: a slightly higher risk of another injury for two seasons. Athletic training lowers it.</div>' : ''}</div></div>`;
    }
    function toggleFocus(id) {
      const v = ensureV10(gameState);
      const f = v.focus.includes(id) ? v.focus.filter((x) => x !== id) : [...v.focus, id];
      setTrainingFocus(gameState, f.filter((x, i) => !(x.startsWith('POS:') && f.findIndex((y) => y.startsWith('POS:')) !== i)));
      saveCareer(gameState); sfx('click'); renderPage();
    }
    function doSwitchPosition(p) {
      if (!confirm(`Switch to ${POS_NAMES[p]}? It takes effect from next season.`)) return;
      if (switchPosition(gameState, p)) { saveCareer(gameState); showToast('New position', `You’re now a ${POS_NAMES[p]}.`); ui.proj = {}; renderApp(); }
    }

    function moneyFmt(m) { return m >= 1 ? `€${m.toFixed(2)}M` : `€${Math.round(m * 1000)}K`; }
    function renderContractPage() {
      const s = gameState;
      const v = ensureV10(s);
      const c = v.contract || contractPackage(s, { type: 'STAY', wageM: s.wageM }, s.currentClubId);
      const club = CLUB_MAP[c.clubId] || CLUB_MAP[s.currentClubId];
      const seasons = (s.seasonLog || []).filter((x) => x.money);
      const totG = careerEarnings(s); const totN = careerEarningsNet(s);
      const maxG = Math.max(0.01, ...seasons.map((x) => x.money.gross));
      const last = seasons[seasons.length - 1];
      const PART_LABEL = { wage: 'Basic wage', appearances: 'Appearance bonuses', goals: 'Goal bonuses', cleanSheets: 'Clean-sheet bonuses', signing: 'Signing-on fee', loyalty: 'Loyalty bonus', imageRights: 'Image rights', sponsors: 'Sponsors' };
      const clauseLine = (x) => x.type === 'sellon' ? `Sell-on: ${CLUB_MAP[x.clubId].name} get ${x.pct}% of your next transfer fee${x.paidM ? ` (paid €${x.paidM}M)` : ''}`
        : x.type === 'buyback' ? `Buy-back: ${CLUB_MAP[x.clubId].name} can re-sign you for €${x.priceM}M until age ${x.until}${x.expired ? ' (expired)' : ''}`
        : `Loan ${x.obligation ? 'obligation' : 'option'} to buy: ${CLUB_MAP[x.clubId].name}, €${x.priceM}M (age ${x.age})${x.outcome ? ` — ${x.outcome}` : ''}`;
      return `<div class="page-head"><div><div class="eyebrow">Your deal and your money</div><h1>Contract</h1><div class="muted">Game money only: wages and bonuses as the game simulates them, with a simplified top tax rate per country.</div></div></div>
        <div class="grid g-2">
          <div class="panel"><div class="panel-head"><span>${club ? crestSVG(club, 18) : ''} Current contract · ${esc(club ? club.name : '')}</span><span class="right">${s.contractYearsRemaining} year${s.contractYearsRemaining === 1 ? '' : 's'} left</span></div><div class="panel-body kv">
            <div><span>Basic wage</span><b>€${Math.round((c.wageM * 1e3) / 52)}K a week</b></div>
            <div><span>Appearance bonus</span><b>€${c.appBonusK}K a game</b></div>
            ${c.goalBonusK ? `<div><span>Goal bonus</span><b>€${c.goalBonusK}K a goal</b></div>` : ''}${c.csBonusK ? `<div><span>Clean-sheet bonus</span><b>€${c.csBonusK}K each</b></div>` : ''}
            <div><span>Signing-on fee</span><b>${c.signingFeeM ? moneyFmt(c.signingFeeM) : '—'}</b></div>
            <div><span>Loyalty bonus</span><b>${moneyFmt(c.loyaltyBonusM)} if you see the contract out</b></div>
            <div><span>Image rights</span><b>${c.imageRightsPct ? `${c.imageRightsPct}% to you` : 'kept by the club'}</b></div>
            <div><span>Release clause</span><b>${s.releaseClauseM ? `€${Number(s.releaseClauseM).toFixed(1)}M` : 'none'}</b></div>
            <div><span>Tax (${esc(CLUB_COUNTRY(club) || '')})</span><b>${taxRate(club)}% top rate</b></div>
          </div></div>
          <div class="panel"><div class="panel-head"><span>Career earnings</span><span class="right">${moneyFmt(totG)} gross · ${moneyFmt(totN)} after tax</span></div><div class="panel-body">
            <div class="earn-bars">${seasons.map((x) => `<div class="eb" title="Age ${x.age}: ${moneyFmt(x.money.gross)} gross, ${moneyFmt(x.money.net)} net"><span class="eb-g" style="height:${(x.money.gross / maxG) * 100}%"><span class="eb-n" style="height:${(x.money.net / x.money.gross) * 100}%"></span></span><em>${x.age}</em></div>`).join('') || '<div class="dim">Nothing earned yet.</div>'}</div>
            <div class="dim" style="font-size:12px">Whole bar: gross earnings. Bright part: what you keep after tax.</div></div></div>
        </div>
        ${last ? `<div class="panel"><div class="panel-head"><span>Last season · ${esc(last.season)}</span><span class="right">${moneyFmt(last.money.gross)} gross · ${last.money.taxRate}% tax · ${moneyFmt(last.money.net)} net</span></div><div class="panel-body kv">${Object.entries(last.money.parts).filter(([, x]) => x > 0).map(([k, x]) => `<div><span>${PART_LABEL[k]}</span><b>${moneyFmt(x)}</b></div>`).join('')}</div></div>` : ''}
        <div class="grid g-2"><div class="panel"><div class="panel-head">Clauses</div><div class="panel-body">${v.clauses.length ? v.clauses.map((x) => `<div class="prom">${esc(clauseLine(x))}</div>`).join('') : '<div class="dim">No sell-on, buy-back or loan-option clauses yet.</div>'}</div></div>
          <div class="panel"><div class="panel-head">Past contracts</div><div class="panel-body">${v.contracts.length ? v.contracts.slice().reverse().map((x) => `<div class="cast-row"><span>${CLUB_MAP[x.clubId] ? crestSVG(CLUB_MAP[x.clubId], 18) : ''}</span><div><b>${esc((CLUB_MAP[x.clubId] || {}).name || '')}</b> <span class="dim">· ${x.kind === 'STAY' ? 'renewed' : x.kind === 'TRANSFER' ? 'signed' : 'joined'} at ${x.startAge} · €${Math.round((x.wageM * 1e3) / 52)}K a week${x.loyaltyPaid ? ' · loyalty bonus paid' : ''}</span></div></div>`).join('') : '<div class="dim">This is your first contract.</div>'}</div></div></div>`;
    }
