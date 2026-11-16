    /* ==========================================================================
     * v11 · PRESS ROOM, AROUND THE WORLD, WORLD & MEDIA PAGES, DETAIL LEVEL
     * ========================================================================== */
    const clubNameOf = (k) => (CLUB_MAP[k] ? CLUB_MAP[k].name : String(k || '—'));
    const crestOf = (k, n = 16) => (CLUB_MAP[k] ? crestSVG(CLUB_MAP[k], n) : '');

    /* ---------- Press conference (career review) ---------- */
    function stagePress(rctx, se, opts = {}) {
      if (RV.skip) return Promise.resolve();
      const s = gameState;
      const qs = pressQuestions(s, se);
      if (!qs.length) return Promise.resolve();
      const journo = ensureStory(s).cast.journo;
      const picks = {};
      const done = () => qs.every((q) => picks[q.id] != null);
      return new Promise((resolve) => {
        const render = () => {
          const fin = done();
          const answered = (ensureV11(s).press || []).filter((p) => p.age === se.age);
          $('rvStage').innerHTML = `<div class="rv-card press${fin ? ' settled' : ''}">
            <div class="press-head"><div class="eyebrow" style="color:#d8c8ff">🎙️ Press conference · ${esc(se.season)}</div><h2>${esc(journo)} has the first question</h2><div class="dim">Your answers shape the headlines, fans and sponsors. Confident answers can become promises the papers check later.</div></div>
            ${qs.map((q, qi) => `<div class="pq"><div class="pq-q"><span class="pq-who">${qi ? 'Next question' : esc(journo.split(' ')[0])}</span>${esc(q.text)}</div>
              ${picks[q.id] != null ? `<div class="pq-a"><b>You:</b> “${esc(q.answers[picks[q.id]].say)}”</div>` : `<div class="pq-opts">${q.answers.map((a, i) => `<button class="st-opt pq-opt" data-q="${q.id}" data-a="${i}"><span class="pq-style ${a.style}">${a.style === 'humble' ? 'Humble' : a.style === 'confident' ? 'Confident' : 'Keep it private'}</span>${esc(a.say)}${typeof PRESS_PROMISES !== 'undefined' && PRESS_PROMISES[`${q.id}|${a.style}`] ? '<em class="pq-fx">Makes a promise the papers will check</em>' : q.id === 'rumour' ? `<em class="pq-fx">${a.style === 'humble' ? 'Better new deal here; leaving next window upsets fans' : a.style === 'confident' ? 'Bigger clubs offer more; your club’s new deal is lower' : 'No effect on offers'}</em>` : ''}</button>`).join('')}</div>`}</div>`).join('')}
            ${fin ? `<div class="press-papers">${answered.map((p) => `<div class="pp"><span>Tomorrow’s back page</span><b>${esc(p.head)}</b></div>`).join('')}</div>` : ''}
            ${opts.world && typeof worldRoundupHTML === 'function' ? `<div class="after-world"><div class="eyebrow" style="color:#9fd0ff; text-align:center; margin:14px 0 6px">🌍 Meanwhile, around the world</div>${worldRoundupHTML(s, se)}</div>` : ''}
            <div style="text-align:center; margin-top:12px"><button class="btn btn-go" id="pContinue" ${fin ? '' : 'disabled'}>Continue ▸</button></div></div>`;
          document.querySelectorAll('.pq-opt').forEach((b) => { b.onclick = () => {
            const q = qs.find((x) => x.id === b.dataset.q);
            if (picks[q.id] != null) return;
            picks[q.id] = Number(b.dataset.a);
            applyPressAnswer(s, se, q, picks[q.id]);
            saveCareer(s); sfx('click'); render();
          }; });
          $('pContinue').onclick = () => { if (!done()) return; document.removeEventListener('keydown', onKey); resolve(); };
        };
        const onKey = (e) => {
          if (e.key === 'Enter' && done()) { e.preventDefault(); $('pContinue').click(); return; }
          const open = qs.find((q) => picks[q.id] == null);
          const n = Number(e.key);
          if (open && n >= 1 && n <= 3) { e.preventDefault(); picks[open.id] = n - 1; applyPressAnswer(s, se, open, n - 1); saveCareer(s); render(); }
        };
        document.addEventListener('keydown', onKey);
        RV.phase = 'story';
        render();
      }).then(() => { RV.phase = 'seasons'; });
    }

    /* ---------- Around the world (Full detail, after each season) ---------- */
    function worldStripHTML(s, ages) {
      const w = s.v11;
      if (!w) return '';
      const items = ages.flatMap((a) => (w.news[a] || []).map((n) => ({ ...n, age: a })));
      const pods = ages.map((a) => ({ a, p: w.ballon[a] })).filter((x) => x.p && x.p[0]);
      if (!items.length && !pods.length) return '';
      const pick = [...items.filter((n) => n.mine), ...items.filter((n) => ['record', 'ballon', 'league'].includes(n.kind) && !n.mine), ...items.filter((n) => !n.mine && !['record', 'ballon', 'league'].includes(n.kind))].slice(0, 6);
      return `<div class="world-strip"><div class="ws-head">🌍 Around the world</div>${pick.map((n) => `<div class="ws-item"><span>${n.ic}</span><span>${esc(n.text)}</span></div>`).join('')}</div>`;
    }
    function stageWorld(rctx, se) {
      if (RV.skip) return Promise.resolve();
      const s = gameState; const w = s.v11;
      if (!w) return Promise.resolve();
      const pod = w.ballon[se.age] || [];
      const champs = w.champions[se.age] || {};
      const big = Object.entries(champs).filter(([lg]) => (LEAGUES[lg] || {}).prestige >= 1.15).slice(0, 6);
      const cont = Object.values(w.contChamps[se.age] || {}).slice(0, 4);
      return new Promise((resolve) => {
        $('rvStage').innerHTML = `<div class="rv-card worldcard"><div style="text-align:center"><div class="eyebrow" style="color:#9fd0ff">🌍 Meanwhile · ${esc(se.season)}</div><h2>Around the world</h2></div>
          <div class="wc-grid">
            <div><div class="wc-h">Ballon d’Or</div>${pod.map((p) => `<div class="bd-row ${p.you ? 'you' : p.rival ? 'rival' : ''}"><b>${p.rank}</b><span>${esc(p.name)}${p.you ? ' (you)' : p.rival ? ' (your rival)' : ''}</span><em>${esc(p.clubName)}</em></div>`).join('')}</div>
            <div><div class="wc-h">Champions</div>${big.map(([lg, k]) => `<div class="bd-row"><span>${crestOf(k)}</span><span>${esc(clubNameOf(k))}</span><em>${esc(lg)}</em></div>`).join('')}${cont.map((c) => `<div class="bd-row"><span>${crestOf(c.clubId)}</span><span>${esc(clubNameOf(c.clubId))}</span><em>${esc(c.name)}</em></div>`).join('')}</div>
          </div>
          ${worldStripHTML(s, [se.age])}
          <div style="text-align:center; margin-top:12px"><button class="btn btn-go" id="wdContinue">Continue ▸</button></div></div>`;
        const go = () => { document.removeEventListener('keydown', onKey); resolve(); };
        const onKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
        $('wdContinue').onclick = go;
        document.addEventListener('keydown', onKey);
      });
    }

    /* ---------- World page ---------- */
    function renderWorldPage() {
      const s = gameState;
      const w = ensureV11(s);
      const ages = (s.seasonLog || []).map((x) => x.age).filter((a) => w.seasonsDone.includes(a));
      const tab = ui.wTab && ui.wTab !== 'news' ? ui.wTab : 'champions';
      const tabs = [['champions', 'Champions'], ['ballon', 'Ballon d’Or'], ['stars', 'World stars'], ['records', 'Records & managers']];
      const head = `<div class="page-head"><div><div class="eyebrow">The game goes on around you</div><h1>World</h1><div class="muted">Clubs are real. Every player and manager here is invented for your career. World news is in Story › News.</div></div></div>
        <div class="tabs">${tabs.map(([id, l]) => `<button class="tab ${tab === id ? 'active' : ''}" onclick="ui.wTab='${id}'; renderPage()">${l}</button>`).join('')}</div>`;
      if (!ages.length) return head + '<div class="empty">The world’s first season happens alongside yours. Check back after it.</div>';
      const sl = (a) => seasonLabel(a);
      if (tab === 'news') {
        return head + ages.slice().reverse().map((a) => `<div class="panel"><div class="panel-head"><span>${sl(a)}</span><span class="right">you were ${a}</span></div><div class="panel-body">${(w.news[a] || []).map((n) => `<div class="ws-item ${n.mine ? 'mine' : ''}"><span>${n.ic}</span><span>${esc(n.text)}</span></div>`).join('') || '<div class="dim">A quiet season around the world.</div>'}</div></div>`).join('');
      }
      if (tab === 'champions') {
        const leagues = Object.keys(LEAGUES).sort((a, b) => (LEAGUES[b].prestige || 0) - (LEAGUES[a].prestige || 0));
        const show = ages.slice(-8);
        return head + `<div class="panel"><div class="panel-head">League champions <span class="right">last ${show.length} seasons</span></div><div class="panel-body" style="overflow-x:auto"><table class="tbl wtbl"><thead><tr><th>League</th>${show.map((a) => `<th>${sl(a)}</th>`).join('')}</tr></thead><tbody>
          ${leagues.map((lg) => `<tr><td><b>${esc(lg)}</b></td>${show.map((a) => { const k = (w.champions[a] || {})[lg]; const mine = (s.seasonLog.find((x) => x.age === a) || { trophies: [] }).trophies.some((t) => t.title === `${lg} Champion`); return `<td class="${mine ? 'mine' : ''}">${k ? `${crestOf(k, 14)} ${esc(clubNameOf(k))}` : '—'}</td>`; }).join('')}</tr>`).join('')}
          </tbody></table></div></div>
          <div class="panel"><div class="panel-head">Continental champions</div><div class="panel-body" style="overflow-x:auto"><table class="tbl wtbl"><thead><tr><th>Competition</th>${show.map((a) => `<th>${sl(a)}</th>`).join('')}</tr></thead><tbody>
          ${Object.keys(CONTINENTS).map((k) => `<tr><td><b>${esc(CONTINENTS[k].clubContinentalCup || k)}</b></td>${show.map((a) => { const c = (w.contChamps[a] || {})[k]; return `<td class="${c && c.clubId === (s.seasonLog.find((x) => x.age === a) || {}).clubId && (s.seasonLog.find((x) => x.age === a) || { trophies: [] }).trophies.some((t) => t.category === 'CONTINENTAL') ? 'mine' : ''}">${c ? `${crestOf(c.clubId, 14)} ${esc(clubNameOf(c.clubId))}` : '—'}</td>`; }).join('')}</tr>`).join('')}
          </tbody></table></div></div>`;
      }
      if (tab === 'ballon') {
        return head + `<div class="bd-grid">${ages.slice().reverse().map((a) => { const p = w.ballon[a] || []; return `<div class="panel"><div class="panel-head">${sl(a)}</div><div class="panel-body">${p.map((x) => `<div class="bd-row ${x.you ? 'you' : x.rival ? 'rival' : ''}"><b>${x.rank}</b><span>${esc(x.name)}${x.you ? ' (you)' : x.rival ? ' (rival)' : ''}</span><em>${esc(x.clubName)}</em></div>`).join('')}</div></div>`; }).join('')}</div>`;
      }
      if (tab === 'stars') {
        const last = ages[ages.length - 1];
        const row = (st) => { const x = st.seasons[st.seasons.length - 1] || {}; const a = starAge(w, st, last); return `<tr class="${st.retired ? 'dim' : ''}"><td><b>${esc(st.name)}</b> <span class="dim">${esc(st.natName)}</span></td><td>${st.pos}</td><td>${st.retired ? `retired at ${st.retiredAge}` : a}</td><td>${st.retired ? '—' : `${crestOf(st.clubId, 14)} ${esc(clubNameOf(st.clubId))}`}</td><td>${x.rating ? x.rating.toFixed(2) : '—'}</td><td>${st.seasons.reduce((n, q) => n + q.goals, 0)}</td><td>${st.bdo ? `🏆×${st.bdo}` : ''}</td><td class="dim">${st.moves.length - 1} move${st.moves.length === 2 ? '' : 's'}</td></tr>`; };
        const live = w.stars.filter((x) => !x.retired && starAge(w, x, last) >= 17).sort((a, b) => ((b.seasons[b.seasons.length - 1] || {}).rating || 0) - ((a.seasons[a.seasons.length - 1] || {}).rating || 0));
        const gone = w.stars.filter((x) => x.retired);
        return head + (typeof peopleYouKnowHTML === 'function' ? peopleYouKnowHTML(s) : '') + `<div class="panel"><div class="panel-head">Stars of your era</div><div class="panel-body" style="overflow-x:auto"><table class="tbl wtbl"><thead><tr><th>Player</th><th>Pos</th><th>Age</th><th>Club</th><th>Last season</th><th>Goals</th><th>Ballon d’Or</th><th><span class="sr-only">Moves</span></th></tr></thead><tbody>${live.map(row).join('')}${gone.length ? `<tr><td colspan="8" class="dim" style="padding-top:12px">Retired</td></tr>${gone.map(row).join('')}` : ''}</tbody></table></div></div>`;
      }
      // records & managers
      const myClubs = [...new Set((s.seasonLog || []).filter((x) => !x.onLoan).map((x) => x.clubId))];
      return head + `<div class="grid g-2"><div class="panel"><div class="panel-head">World transfer record</div><div class="panel-body"><div class="rec-big">€${w.record.feeM}M</div><div>${w.record.name ? `${esc(w.record.name)}${w.record.you ? ' (you)' : ''}: ${esc(w.record.from || '')} → ${esc(w.record.to || '')}, ${sl(w.record.age)}` : 'Unbroken since your career began.'}</div></div></div>
        <div class="panel"><div class="panel-head">Managers at your clubs</div><div class="panel-body">${myClubs.map((id) => { const list = w.managers[id] || [{ name: clubPeople(s, id).gaffer, from: null }]; return `<div class="mgr"><div>${crestOf(id, 18)} <b>${esc(clubNameOf(id))}</b></div>${list.map((m) => `<div class="mgr-row"><span>${esc(m.name)}</span><em>${m.from != null ? `from ${seasonLabel(m.from)}` : ''}${m.to != null ? ` to ${seasonLabel(m.to)}` : ''}</em></div>`).join('')}</div>`; }).join('')}</div></div></div>`;
    }

    /* ---------- Media page: profile, followers, sponsors, press ---------- */
    function renderMediaPage() {
      const s = gameState;
      const w = ensureV11(s);
      const im = mediaImage(w);
      const hist = w.followerHist;
      const maxK = Math.max(1, ...hist.map((h) => h.k));
      const age = s.currentAge;
      const active = activeSponsors(w, age);
      const income = (s.seasonLog || []).filter((x) => x.sponsor && x.sponsor.total).reduce((a, x) => a + x.sponsor.total, 0);
      const offers = w.offers;
      const bonusLine = (d) => BONUS_KIND[d.bonus.kind](d.bonus.k);
      return `<div class="page-head"><div><div class="eyebrow">Fame, press and sponsors</div><h1>Media</h1><div class="muted">Every brand here is invented. Earnings are game money and are included on the Contract page.</div></div></div>
        ${offers ? `<div class="panel offers-panel"><div class="panel-head"><span>🤝 ${esc(SPONSOR_CAT[offers.cat])} offers</span><span class="right">your agent takes the safe one if you don’t choose by next season</span></div><div class="panel-body"><div class="sp-grid">${offers.options.map((o, i) => `<div class="sp-card"><div class="sp-k">${esc(o.label)}</div><div class="sp-brand">${esc(o.brand)}</div><div class="sp-v">€${o.baseM}M <span>a year · ${o.years} years</span></div><div class="sp-b">+ ${esc(bonusLine(o))}</div>${o.perk ? `<div class="sp-p">${esc(o.perk)}</div>` : ''}<button class="btn btn-go" onclick="pickSponsor(${i})">Sign with ${esc(o.brand)}</button></div>`).join('')}</div><div style="text-align:right; margin-top:8px"><button class="btn btn-ghost" onclick="noSponsor()">Not interested</button></div></div></div>` : ''}
        <div class="grid g-2">
          <div class="panel"><div class="panel-head"><span>Your profile</span><span class="right">${fmtFollowers(w.followersK)} followers</span></div><div class="panel-body">
            <div class="prof-meter"><div style="width:${w.profile}%"></div></div><div class="dim" style="font-size:12px; margin:4px 0 10px">Profile ${w.profile}/100 · sponsors offer more as it grows. It rises with good seasons, trophies and big clubs, and fades slowly without them.</div>
            <div class="fol-bars">${hist.map((h) => `<div title="Age ${h.age}: ${fmtFollowers(h.k)}"><span style="height:${Math.max(2, (h.k / maxK) * 100)}%"></span><em>${h.age}</em></div>`).join('')}</div>
            <div class="img-card"><b>${esc(im.label)}</b><span>${esc(im.sub)}</span><div class="dim" style="font-size:11.5px; margin-top:4px">Press answers so far: ${w.style.humble} humble · ${w.style.confident} confident · ${w.style.private} private</div></div>
          </div></div>
          <div class="panel"><div class="panel-head"><span>Sponsors</span><span class="right">${income ? `€${income.toFixed(2)}M earned` : ''}</span></div><div class="panel-body">
            ${active.length ? active.map((d) => `<div class="sp-row"><div><b>${esc(d.brand)}</b> <span class="dim">· ${esc(SPONSOR_CAT[d.cat])}</span></div><div class="dim">€${d.baseM}M a year + ${esc(bonusLine(d))} · until age ${d.from + d.years}${d.perk ? ` · ${esc(d.perk)}` : ''}</div></div>`).join('') : `<div class="dim">${w.profile < 22 ? `No sponsors yet. Brands start calling when your profile reaches about 22 (now ${w.profile}).` : 'No active deals right now.'}</div>`}
            ${w.sponsorHist.length ? `<div class="dim" style="font-size:12px; margin-top:10px">${w.sponsorHist.map((h) => `${seasonLabel(h.age)}: ${h.brand ? `${esc(h.brand)} (${esc(h.label.toLowerCase())}${h.auto ? ', signed by your agent' : ''})` : `declined ${esc(SPONSOR_CAT[h.cat].toLowerCase())} offers`}`).join(' · ')}</div>` : ''}
          </div></div>
        </div>
        ${(w.promises || []).length || w.stance ? `<div class="panel"><div class="panel-head"><span>Your word</span><span class="right">what you said, and whether it happened</span></div><div class="panel-body">
          ${w.stance && !w.stance.done ? `<div class="prom">${w.stance.type === 'loyal' ? `You said you’re happy at ${esc((CLUB_MAP[w.stance.clubId] || {}).name || '')}: a new deal there pays 6% more, but leaving next window will upset their fans.` : w.stance.type === 'ambitious' ? 'You hinted you want a bigger club: bigger clubs offer 5% more next window, and your own club’s new deal is 7% lower.' : 'You kept your transfer plans private. No effect either way.'}</div>` : ''}
          ${(w.promises || []).slice().reverse().map((p) => `<div class="prom ${p.result || 'open'}"><span>${p.result === 'kept' ? '✅' : p.result === 'broken' ? '🗒️' : '⏳'}</span> You said you’d ${esc(p.text)} <span class="dim">(${seasonLabel(p.made)}${p.result ? ` · ${p.result}` : ` · checked by ${seasonLabel(p.due)}`})</span></div>`).join('')}
          <div class="dim" style="font-size:12px; margin-top:6px">Kept promises lift fans and your profile a little; broken ones cost a little. Confident answers make promises; humble and private ones don’t.</div></div></div>` : ''}
        <div class="panel"><div class="panel-head"><span>Press cuttings</span><span class="right">${w.press.length} answers</span></div><div class="panel-body">${w.press.length ? `<div class="cuttings">${w.press.slice().reverse().map((p) => `<div class="cut"><div class="cut-h">${esc(p.head)}</div><div class="cut-q">${esc(p.question)}</div><div class="cut-a">“${esc(p.say)}”</div><div class="dim" style="font-size:11px">${seasonLabel(p.age)} · asked by ${esc(p.journo)}</div></div>`).join('')}</div>` : `<div class="dim">${isLight(s) ? 'Press conferences are off at the Light detail level. Change it in Settings.' : 'No press conferences yet. They follow big seasons (or every season at Full detail).'}</div>`}</div></div>`;
    }
    function pickSponsor(i) { if (acceptSponsor(gameState, i)) { saveCareer(gameState); sfx('fanfare'); showToast('Sponsor signed', 'The deal starts next season.'); renderPage(); } }
    function noSponsor() { declineSponsors(gameState); saveCareer(gameState); renderPage(); }

    /* ---------- Detail level: setup and settings ---------- */
    function detailChooserHTML() {
      const cur = setupConfig.detail || 'STANDARD';
      return `<div class="choice-grid c3">${Object.entries(DETAIL_LEVELS).map(([id, d]) => `<button class="choice ${cur === id ? 'active' : ''}" onclick="selectDetail('${id}')"><span class="choice-main">${d.ic} ${d.label}</span><span class="choice-sub">${esc(d.sub)}</span></button>`).join('')}</div>`;
    }
    function selectDetail(id) { setupConfig.detail = id; sfx('click'); renderSetupChoices(); }
    function setCareerDetail(id) {
      if (!gameState || !DETAIL_LEVELS[id]) return;
      gameState.setup.detail = id;
      gameState.setup.noWinter = id === 'LIGHT';
      saveCareer(gameState); renderSettings(); showToast('Detail level', `${DETAIL_LEVELS[id].label}: ${DETAIL_LEVELS[id].sub}`);
    }
    function detailSettingHTML() {
      if (!gameState || gameState.setup.mode === 'QUICK') return '';
      const cur = detailLevel(gameState);
      return `<div class="set-row"><span><b>Detail level</b><div class="dim" style="font-size:11px">${esc(DETAIL_LEVELS[cur].sub)}</div></span><span class="seg">${Object.entries(DETAIL_LEVELS).map(([id, d]) => `<button class="${cur === id ? 'on' : ''}" onclick="setCareerDetail('${id}')">${d.label}</button>`).join('')}</span></div>`;
    }
