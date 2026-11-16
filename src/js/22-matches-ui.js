    /* ==========================================================================
     * v9 · MATCHES UI
     *   The winter-break stage in the season review, the "where you finished" line,
     *   and the Matches page: fixtures and results, the league table at any
     *   matchday, splits and form, and the squad around you.
     * ========================================================================== */
    const COMP_BADGE = { L: 'lg', C: 'cup', LC: 'lc', E: 'eu', P: 'po' };
    function ordinalShort(n) { return ordinalWord(n); }
    function resultClass(f) { return f.gf > f.ga ? 'w' : f.gf < f.ga ? 'l' : 'd'; }
    function seasonFinishLine(state, se) {
      const m = seasonMatches(state, se);
      if (!m) return '';
      const p = m.plan; const bits = [];
      if (p.lg && m.table) { const pos = m.table.findIndex((r) => r.key === p.playClubId) + 1; bits.push(`<b>${ordinalShort(pos)}</b> in the ${esc(p.lg.name)}${p.onLoan ? ` (on loan at ${esc(p.playClubName)})` : ''}`); }
      if (p.cup) bits.push(`${esc(p.cup.name)}: <b>${p.cup.won ? 'Winners' : CUP_ROUNDS[p.cup.exit]}</b>`);
      if (p.cont) bits.push(`${esc(p.cont.name)}: <b>${p.cont.won ? 'Winners' : p.cont.exit === 0 ? 'League phase' : p.cont.exit === 4 ? 'Final' : CONT_ROUNDS[p.cont.exit - 1]}</b>`);
      if (se.jan && se.jan.loan) bits.push(`January loan: <b>${esc(CLUB_MAP[se.jan.loan.clubId].name)}</b>`);
      return `<div class="finish-line">${bits.join(' · ')} <button class="link-btn" onclick="openMatchesFor(${se.age})">All ${m.fixtures.length + m.loanFixtures.length} matches ▸</button></div>`;
    }
    function openMatchesFor(age) { ui.mxAge = age; ui.mxTab = 'fixtures'; if (!$('review').classList.contains('hidden')) { showToast('Matches', 'Open the Matches page after the review to see every game.'); return; } navTo('matches'); }

    /* ---------- Mini table and form strip ---------- */
    function miniTableHTML(state, lg, table, usKey, around = 2) {
      const pos = table.findIndex((r) => r.key === usKey);
      const keep = new Set([0, 1, 2, pos - around, pos - 1, pos, pos + 1, pos + around, table.length - 1].filter((i) => i >= 0 && i < table.length));
      let last = -1; let rows = '';
      [...keep].sort((a, b) => a - b).forEach((i) => {
        if (i > last + 1) rows += '<tr class="gap"><td colspan="5">⋯</td></tr>';
        const r = table[i]; const t = teamObj(r.key);
        rows += `<tr class="${r.key === usKey ? 'us' : ''}"><td>${i + 1}</td><td class="tn">${crestSVG(t, 16)} ${esc(t.name)}</td><td>${r.p}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td></tr>`;
        last = i;
      });
      return `<table class="mini-table"><thead><tr><th>#</th><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
    function formStripHTML(list) {
      return `<div class="form-strip">${list.map((f) => `<span class="fr ${resultClass(f)}" title="${esc(f.opp.name)} ${f.gf}–${f.ga}">${f.gf > f.ga ? 'W' : f.gf < f.ga ? 'L' : 'D'}</span>`).join('')}</div>`;
    }
    function ratingLineSVG(apps, w = 520, h = 110) {
      if (apps.length < 2) return '';
      const xs = (i) => 14 + (i / (apps.length - 1)) * (w - 28);
      const ys = (r) => h - 14 - ((clamp(r, 5.5, 9.5) - 5.5) / 4) * (h - 28);
      const pts = apps.map((f, i) => `${xs(i).toFixed(1)},${ys(f.you.r).toFixed(1)}`).join(' ');
      const avg = apps.reduce((n, f) => n + f.you.r, 0) / apps.length;
      const winterI = apps.findIndex((f) => f.second);
      return `<svg class="rline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Match ratings across the season, average ${avg.toFixed(2)}">
        ${[6, 7, 8, 9].map((v) => `<line x1="0" x2="${w}" y1="${ys(v)}" y2="${ys(v)}" class="rl-grid"/><text x="2" y="${ys(v) - 2}" class="rl-t">${v}</text>`).join('')}
        <line x1="0" x2="${w}" y1="${ys(avg)}" y2="${ys(avg)}" class="rl-avg"/>
        ${winterI > 0 ? `<line x1="${xs(winterI) - 3}" x2="${xs(winterI) - 3}" y1="6" y2="${h - 6}" class="rl-winter"/><text x="${xs(winterI) + 1}" y="12" class="rl-t">January</text>` : ''}
        <polyline points="${pts}" class="rl-line" fill="none"/>
        ${apps.map((f, i) => (f.you.g || f.you.cs ? `<circle cx="${xs(i).toFixed(1)}" cy="${ys(f.you.r).toFixed(1)}" r="3.2" class="${f.you.g ? 'rl-goal' : 'rl-cs'}"/>` : '')).join('')}</svg>`;
    }

    /* ---------- Winter break stage (career mode) ---------- */
    function stageWinter(rctx, se) {
      if (RV.skip) return Promise.resolve(); // skipping to the report: no January decisions this season
      const s = gameState;
      const { cards, m, rFirst } = winterOptions(s, se);
      const plan = m.plan;
      const first = m.fixtures.filter((f) => !f.second);
      const yourFirst = first.filter((f) => f.you);
      const isAtt = POSITION_PROFILES[s.setup.position].primaryStatType === 'ATTACK';
      let halfTable = '';
      if (plan.lg && m.lgRes) {
        const half = Math.round(m.lgRes.length * WINTER_AT);
        halfTable = miniTableHTML(s, plan.lg, leagueTable(plan.lg, m.lgRes, half), plan.playClubId);
      }
      const statG = yourFirst.reduce((n, f) => n + (f.you.g || 0), 0);
      const statCs = yourFirst.filter((f) => f.you.cs).length;
      const picks = {};
      return new Promise((resolve) => {
        const render = (done) => {
          $('rvStage').innerHTML = `<div class="rv-card winter${done ? ' settled' : ''}"><div class="winter-head"><div class="eyebrow" style="color:#bfe3ff">❄️ Winter break · ${esc(se.season)}</div><h2>Halfway at ${esc(plan.playClubName)}</h2></div>
            <div class="winter-grid"><div class="winter-left">
              <div class="w-stats"><div><b>${yourFirst.length}</b><span>games of ${first.length}</span></div><div><b>${isAtt ? statG : statCs}</b><span>${isAtt ? 'goals' : 'clean sheets'}</span></div><div><b>${yourFirst.length ? rFirst.toFixed(2) : '–'}</b><span>avg rating</span></div></div>
              ${formStripHTML(first.slice(-8))}
              ${halfTable ? `<div class="w-table">${halfTable}</div>` : ''}
            </div><div class="winter-right">
              ${cards.map((c) => { const j = se.jan && se.jan.cards.find((x) => x.id === c.id); return `<div class="w-card"><div class="w-title">${esc(c.title)}</div><div class="w-text">${esc(c.text)}</div>
                ${j ? `<div class="st-out"><b>${esc(j.label)}</b> — ${esc(j.outcome)}</div>` : `<div class="st-choices">${c.options.map((o, i) => `<button class="st-opt w-opt ${picks[c.id] === o.id ? 'picked' : ''}" data-card="${c.id}" data-opt="${o.id}"><span class="kbd k">${i + 1}</span><b>${esc(o.label)}</b><span>${esc(o.desc)}</span></button>`).join('')}</div>`}</div>`; }).join('')}
            </div></div>
            <div style="text-align:center; margin-top:14px"><button class="btn btn-go" id="wContinue" ${!done && cards.some((c) => !picks[c.id]) ? 'disabled' : ''}>${done ? 'Play the second half ▸' : 'Confirm ▸'}</button></div></div>`;
          document.querySelectorAll('.w-opt').forEach((b) => { b.onclick = () => { picks[b.dataset.card] = b.dataset.opt; sfx('click'); render(false); }; });
          $('wContinue').onclick = () => {
            if (!done) { applyWinter(s, se, rctx.win, picks); saveCareer(s); sfx('whistle'); render(true); return; }
            document.removeEventListener('keydown', onKey); resolve();
          };
        };
        const onKey = (e) => {
          if (e.key === 'Enter' && !$('wContinue').disabled) { e.preventDefault(); $('wContinue').click(); return; }
          const open = cards.find((c) => !picks[c.id]);
          const n = Number(e.key);
          if (!se.jan && open && n >= 1 && n <= open.options.length) { e.preventDefault(); picks[open.id] = open.options[n - 1].id; render(false); }
        };
        document.addEventListener('keydown', onKey);
        RV.phase = 'story';
        render(false);
      }).then(() => { RV.phase = 'seasons'; });
    }

    /* ---------- The Matches page ---------- */
    function renderMatchesPage() {
      const s = gameState;
      const log = s.seasonLog || [];
      if (!log.length) return '<div class="page-head"><div><div class="eyebrow">Every game you play</div><h1>Matches</h1></div></div><div class="empty">Your first season’s matches appear here once it has been played.</div>';
      if (!ui.mxAge || !log.some((x) => x.age === ui.mxAge)) ui.mxAge = log[log.length - 1].age;
      const se = log.find((x) => x.age === ui.mxAge);
      const m = seasonMatches(s, se);
      const tab = ui.mxTab || 'fixtures';
      const isAtt = POSITION_PROFILES[s.setup.position].primaryStatType === 'ATTACK';
      const all = [...m.fixtures, ...(m.loanFixtures || [])].sort((a, b) => a.t - b.t);
      const apps = all.filter((f) => f.you);
      const chips = log.map((x) => `<button class="chip ${x.age === se.age ? 'on' : ''}" onclick="ui.mxAge=${x.age}; ui.mxMd=null; renderPage()">${x.age}<span class="dim"> · ${esc(x.season)}</span></button>`).join('');
      const tabs = [['fixtures', `Fixtures & results · ${all.length}`], ['table', 'League table'], ['splits', 'Splits & form'], ['squad', 'Squad']].map(([id, l]) => `<button class="tab ${tab === id ? 'active' : ''}" onclick="ui.mxTab='${id}'; renderPage()">${l}</button>`).join('');
      let body = '';
      if (tab === 'fixtures') {
        let month = '';
        body = `<div class="fx-list">${all.map((f) => {
          const head = f.month !== month ? `<div class="fx-month">${f.month}${f.loan && !all.some((x) => x.loan && x.month === f.month && x.t < f.t) ? ` · <span class="dim">on loan at ${esc(CLUB_MAP[m.loanClubId].name)}</span>` : ''}</div>` : '';
          month = f.month;
          const y = f.you;
          const yourLine = y ? `<span class="fx-you">${y.start ? '' : '<span class="dim">sub</span> '}${y.g ? `⚽${y.g > 1 ? `×${y.g}` : ''} ` : ''}${y.a ? `🅰️${y.a > 1 ? `×${y.a}` : ''} ` : ''}${!isAtt && y.cs ? '🧤 ' : ''}<b class="fx-r" style="background:${ratingColor(y.r)}">${y.r.toFixed(1)}</b></span>` : `<span class="fx-you dim">${f.injured ? '🏥 injured' : 'did not play'}</span>`;
          return `${head}<div class="fx ${resultClass(f)}${f.loan ? ' loan' : ''}"><span class="fx-comp ${COMP_BADGE[f.comp]}" title="${esc(f.compName)}">${f.comp === 'L' ? 'L' : f.comp === 'E' ? 'EU' : f.comp === 'LC' ? 'LC' : f.comp === 'P' ? 'PO' : 'C'}</span><span class="fx-round">${esc(f.round)}</span><span class="fx-ha">${f.neutral ? 'N' : f.home ? 'H' : 'A'}</span><span class="fx-opp">${crestSVG(f.opp, 18)} ${esc(f.opp.name)}</span><span class="fx-score">${f.gf}–${f.ga}</span>${yourLine}</div>`;
        }).join('')}</div>`;
      } else if (tab === 'table') {
        if (!m.plan.lg) body = '<div class="empty">No league table for this season.</div>';
        else {
          const L = m.lgRes.length; const md = clamp(ui.mxMd || L, 1, L);
          body = `<div class="tbl-head"><b>${esc(m.plan.lg.name)}</b>${m.plan.lg.tier === 2 ? ' <span class="pill pill-info">second division</span>' : ''} <span class="dim">after matchday</span> <b id="mdLabel">${md}</b> <span class="dim">of ${L}</span>
            <input type="range" min="1" max="${L}" value="${md}" class="md-range" aria-label="Matchday" oninput="mxSetMd(this.value)"></div><div id="mxTable">${mxTableHTML(m, md)}</div>`;
        }
      } else if (tab === 'splits') {
        const sp = seasonSplits(m);
        body = `<div class="panel"><div class="panel-head">Your ratings, game by game</div><div class="panel-body">${ratingLineSVG(apps) || '<div class="dim">Not enough games to draw a line.</div>'}<div class="dim" style="font-size:12px">Dots mark games where you ${isAtt ? 'scored' : 'kept a clean sheet'}. The dashed line is your season average.</div></div></div>
          <table class="tbl"><thead><tr><th></th><th>Games</th><th>${isAtt ? 'Goals' : 'Clean sheets'}</th><th>Assists</th><th>Avg rating</th></tr></thead><tbody>
          ${sp.map(([l, a]) => `<tr><td>${esc(l)}</td><td>${a.apps}</td><td>${isAtt ? a.g : a.cs}</td><td>${a.a}</td><td>${a.apps ? a.r.toFixed(2) : '–'}</td></tr>`).join('')}</tbody></table>`;
      } else {
        const sq = squadContext(s, se);
        if (!sq) body = '<div class="empty">No squad for this season.</div>';
        else {
          const groups = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'];
          const youRow = { name: s.playerName, age: se.age, ovr: Number(sq.you.toFixed(1)), group: sq.group, you: true };
          const rel = (p) => (p.you ? '<span class="pill pill-pos">You</span>' : p.january ? `<span class="pill pill-neg">January signing · €${p.fee}M</span>` : p === sq.injured ? '<span class="pill">Injured mid-season</span>' : p.ahead ? '<span class="pill pill-warn">Ahead of you</span>' : p === sq.friend ? '<span class="pill pill-info">Closest friend</span>' : p === sq.veteran ? '<span class="pill">Dressing-room veteran</span>' : '');
          body = `<div class="sq-head">Formation <b>${sq.formation}</b> · ${FORMATIONS[sq.formation][sq.group] ? `${FORMATIONS[sq.formation][sq.group]} ${GROUP_WORD[sq.group]} slot${FORMATIONS[sq.formation][sq.group] > 1 ? 's' : ''}` : `<span class="neg-t">no ${GROUP_WORD[sq.group]} slot — you play out of position</span>`} · your overall <b>${sq.you.toFixed(1)}</b></div>
            <div class="sq-grid">${groups.map((g) => { const list = [...sq.squad.filter((p) => p.group === g), ...(g === sq.group ? [youRow] : [])].sort((a, b) => b.ovr - a.ovr); return `<div class="panel"><div class="panel-head">${GROUP_WORD[g]}s</div><div class="panel-body">${list.map((p) => `<div class="sq-row ${p.you ? 'you' : ''}"><span class="sq-ovr">${p.ovr.toFixed(1)}</span><span class="sq-n">${esc(p.name)}<span class="dim"> · ${p.age}</span></span>${rel(p)}</div>`).join('')}</div></div>`; }).join('')}</div>
            <div class="dim" style="font-size:12px; margin-top:8px">Team-mates are invented for each career. Overall is on the same scale as yours.</div>`;
        }
      }
      return `<div class="page-head"><div><div class="eyebrow">Every game you play</div><h1>Matches</h1><div class="muted">${esc(se.season)} · ${esc(m.plan.playClubName)} · ${apps.length} games, ${isAtt ? `${se.goals} goals, ${se.assists} assists` : `${se.cleanSheets} clean sheets`}, average ${se.rating.toFixed(2)}</div></div></div>
        <div class="season-chips">${chips}</div><div class="finish-wrap">${seasonFinishLine(s, se).replace(/<button[^>]*>.*?<\/button>/, '')}</div><div class="tabs">${tabs}</div>${body}`;
    }

    function mxTableHTML(m, md) {
      const plan = m.plan;
      const table = leagueTable(plan.lg, m.lgRes, md);
      const n = table.length;
      const rel = plan.lg.tier === 1 && (LEAGUES[plan.lg.name] || {}).hasRelegation;
      return `<table class="tbl league"><thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead><tbody>
        ${table.map((r, i) => { const t = teamObj(r.key); const zone = i === 0 ? 'z-top' : plan.lg.tier === 2 && i < 2 ? 'z-up' : rel && i >= n - 3 ? 'z-rel' : ''; return `<tr class="${r.key === plan.playClubId ? 'us' : ''} ${zone}"><td>${i + 1}</td><td class="tn">${crestSVG(t, 18)} ${esc(t.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td>${formStripHTML(r.form.slice(-5).map((x) => ({ gf: x === 'W' ? 1 : 0, ga: x === 'L' ? 1 : 0, opp: { name: '' } })))}</td></tr>`; }).join('')}</tbody></table>
        <div class="dim" style="font-size:12px; margin-top:6px">${plan.lg.tier === 2 ? 'Top two go up. ' : ''}${rel ? 'Bottom three go down. ' : ''}Drag the slider to see the table at any point of the season.</div>`;
    }
    function mxSetMd(v) {
      ui.mxMd = Number(v);
      const se = gameState.seasonLog.find((x) => x.age === ui.mxAge);
      const m = seasonMatches(gameState, se);
      $('mdLabel').textContent = ui.mxMd;
      $('mxTable').innerHTML = mxTableHTML(m, ui.mxMd);
    }
