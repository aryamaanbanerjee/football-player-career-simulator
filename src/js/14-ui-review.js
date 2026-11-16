    /* ==========================================================================
     * RESULTS: interactive season review (career) or highlights reel (quick)
     * ========================================================================== */
    const RV = { speed: prefs.reviewSpeed || 1, boost: 1, skip: false, wake: null, timer: null, ctx: null, phase: null, lastCtx: null };
    function rvWait(ms) {
      if (RV.skip) return Promise.resolve();
      return new Promise((res) => { RV.wake = res; RV.timer = setTimeout(() => { RV.wake = null; res(); }, ms / (RV.speed * RV.boost)); });
    }
    function skipReview() {
      RV.skip = true;
      if (RV.timer) clearTimeout(RV.timer);
      if (RV.wake) { const w = RV.wake; RV.wake = null; w(); }
      document.querySelectorAll('.ceremony, .lift').forEach((el) => el.click());
    }
    function toggleReviewSpeed() { RV.speed = RV.speed === 1 ? 2 : RV.speed === 2 ? 4 : 1; prefs.reviewSpeed = RV.speed; savePrefs(); $('rvSpeed').textContent = `Speed ${RV.speed}×`; }
    // v13: one control for how much you see. Light detail means key moments only.
    function keyMomentsOnly() { return !!(gameState && typeof isLight === 'function' && isLight(gameState)); }
    function updateKeyBtn() { const b = $('rvKey'); if (b) { b.textContent = `Key moments: ${prefs.keyMoments ? 'on' : 'off'}`; b.classList.toggle('on', !!prefs.keyMoments); b.classList.toggle('hidden', isQuick()); } }
    const isKeySeason = (se) => se.trophies.length > 0 || se.ballonDor || (se.bdRank && se.bdRank <= 3) || se.events.some((e) => ['CLUB_RECORD', 'RELEGATED', 'PROMOTED', 'INTL_GLORY', 'INTL_SNUB', 'CAPTAIN', 'RIVAL_BDO'].includes(e.type)) || (se.awards || []).length > 0;
    function animateCount(el, to, dur, decimals = 0, suffix = '') {
      if (!el) return;
      if (RV.skip || motionOff()) { el.textContent = `${Number(to).toFixed(decimals)}${suffix}`; return; }
      const t0 = performance.now(); const d = dur / RV.speed;
      const step = (t) => { const k = Math.min(1, (t - t0) / d); const e = 1 - Math.pow(1 - k, 3); el.textContent = `${(to * e).toFixed(decimals)}${suffix}`; if (k < 1 && !RV.skip) requestAnimationFrame(step); else el.textContent = `${Number(to).toFixed(decimals)}${suffix}`; };
      requestAnimationFrame(step);
    }
    function animateValue(el, from, to, dur) {
      if (!el) return;
      if (RV.skip || motionOff()) { el.textContent = fmtM(to); return; }
      const t0 = performance.now(); const d = dur / RV.speed;
      const step = (t) => { const k = Math.min(1, (t - t0) / d); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmtM(from + (to - from) * e); if (k < 1 && !RV.skip) requestAnimationFrame(step); else el.textContent = fmtM(to); };
      requestAnimationFrame(step);
    }
    function setDots(active, total) { $('rvDots').innerHTML = Array.from({ length: total }, (_, i) => `<span class="rv-dot ${i < active ? 'done' : i === active ? 'on' : ''}"></span>`).join(''); }

    async function startReview(ctx) {
      RV.ctx = ctx; RV.skip = false; RV.phase = 'seasons';
      const win = ctx.win;
      const club = CLUB_MAP[gameState.currentClubId];
      const rv = $('review');
      rv.style.setProperty('--rv-c1', clubColors(club).c1);
      rv.classList.remove('hidden');
      $('rvTitle').textContent = `${isQuick() ? 'Highlights' : 'Window report'} · Age ${win.startAge}–${win.nextAge}`;
      $('rvSkip').classList.remove('hidden');
      $('rvSkip').textContent = isQuick() ? 'Skip ⏭' : 'Skip to report ⏭';
      $('rvSpeed').textContent = `Speed ${RV.speed}×`;
      updateKeyBtn();
      RV.boost = 1;
      ctx.objectives = [];
      ctx.objResults = [];
      const total = win.years + 2;
      setDots(0, total);
      await stageAnnounce(ctx);
      const winStories = storyWindow(gameState, ctx.storyInfo || storyWindowInfo(gameState, ctx.option), { auto: isQuick() });
      ctx.stories = [...winStories];
      if (!isQuick() && winStories.length) { RV.phase = 'story'; await stageStories(winStories, 'Signing day'); RV.phase = 'seasons'; }
      if (isQuick()) {
        while (win.seasons.length < win.years) {
          const se = simulateSeason(gameState, win);
          ctx.stories.push(...storySeason(gameState, se, { auto: true }));
        }
        setDots(1, 3);
        await stageHighlights(ctx);
      } else {
        for (let i = 0; i < win.years; i++) {
          const objs = isLight(gameState) ? [] : buildObjectives(gameState, ctx, i);
          ctx.objectives[i] = objs;
          if (objs.length) await stageObjectives(ctx, objs, i);
          const se = simulateSeason(gameState, win);
          ctx.objResults[i] = objs.map((o) => { try { return !!o.check(se); } catch { return false; } });
          setDots(i + 1, total);
          RV.boost = keyMomentsOnly() && !isKeySeason(se) ? 5 : 1;
          buildSeasonPlan(gameState, se);
          if (!isQuick() && !gameState.setup.noWinter) await stageWinter(ctx, se);
          storyDepthSeason(gameState, se);
          await stageSeason(ctx, se, i);
          // v13: press and the world round-up share one after-season screen.
          if (pressDue(gameState, se)) await stagePress(ctx, se, { world: isFull(gameState) });
          else if (isFull(gameState)) await stageWorld(ctx, se);
          RV.boost = 1;
          const seStories = storySeason(gameState, se, isLight(gameState) ? { max: 1 } : {});
          ctx.stories.push(...seStories);
          if (seStories.length) { RV.phase = 'story'; await stageStories(seStories, `Off the pitch · ${se.season}`); RV.phase = 'seasons'; }
          if (i < win.years - 1) {
            const ev = rollMidWindowEvent(gameState, win);
            if (ev) await stageDecision(ctx, ev);
          }
        }
      }
      finishWindow(ctx);
      RV.skip = false; RV.phase = 'summary';
      setDots(total - 1, total);
      stageSummary(ctx);
      if (!ctx.isRetired && typeof precomputeProjections === 'function') precomputeProjections(); // next window's offers, while the report is read
    }

    async function stageAnnounce(ctx) {
      const s = gameState;
      const o = ctx.option;
      const club = CLUB_MAP[gameState.currentClubId];
      const prev = ctx.prevClubId ? CLUB_MAP[ctx.prevClubId] : null;
      const name = esc(s.playerName);
      let stamp; let headline; let fee = ''; let sub;
      if (o.kind === 'FIRST_CONTRACT') { stamp = 'PRO CONTRACT'; headline = `${name} turns professional at ${esc(club.name)}`; sub = `${o.data.contractYears}-year deal · ${o.data.squadRoleLabel} · ${fmtWage(s.wageM)} · shirt #${s.shirtNumber}`; }
      else if (o.kind === 'STAY') { stamp = o.data.renegotiated ? 'NEW DEAL' : 'COMMITTED'; headline = `${name} stays at ${esc(club.name)}`; sub = `${roleLabel(ctx.prevRole)} · ${ctx.prevLoyalty} season(s) of loyalty and counting · ${fmtWage(s.wageM)}`; }
      else {
        const rival = o.data.dramaTag === 'ARCH_RIVAL' || o.data.dramaTag === 'RIVAL';
        stamp = rival ? 'SHOCK MOVE' : ({ BOYHOOD_RETURN: 'HOMECOMING', RELEASE_CLAUSE: 'CLAUSE TRIGGERED', BIDDING_WAR: 'BIDDING WAR WON', STEPPING_STONE: 'EUROPE CALLS', TAPPED_UP: 'DONE DEAL' })[o.data.dramaTag] || 'OFFICIAL';
        headline = `${name} joins ${esc(club.name)}`;
        fee = o.data.feeM ? fmtM(o.data.feeM) : 'FREE TRANSFER';
        sub = `${prev ? `From ${esc(prev.name)} · ` : ''}${o.data.contractYears}-year deal · ${o.data.squadRoleLabel} · ${fmtWage(s.wageM)} · #${s.shirtNumber}`;
      }
      let fanKind = 'arrival';
      if (o.kind === 'STAY') fanKind = 'stay';
      else if (o.data.dramaTag === 'BOYHOOD_RETURN') fanKind = 'homecoming';
      else if (o.data.dramaTag === 'ARCH_RIVAL' || o.data.dramaTag === 'RIVAL') fanKind = 'arrivalRival';
      else if (o.data.feeM >= 50) fanKind = 'arrivalBig';
      const posts = fanPosts(fanKind, club, { fee: o.data.feeM, num: s.shirtNumber }, 'announce');
      const oldPosts = prev && prev.id !== club.id ? fanPosts(o.data.dramaTag === 'ARCH_RIVAL' || o.data.dramaTag === 'RIVAL' ? 'betrayed' : 'farewell', prev, {}, 'farewell').slice(0, 1) : [];
      $('rvStage').innerHTML = `<div class="rv-card announce"><div class="stamp">${stamp}</div><h2>${headline}</h2>${o.kind !== 'STAY' ? signatureSVG(s.playerName) : ''}<div class="kit-reveal"><div class="crest-big">${crestSVG(club, 110)}</div><div class="kit-flip"><div class="kit-inner"><div class="kit-front">${crestSVG(club, 70)}</div><div class="kit-back">${shirtSVG(club, s.playerName, s.shirtNumber, 120)}</div></div></div></div>${fee ? `<div class="fee">${fee}</div>` : ''}<div class="sub">${sub}</div><div class="sub" style="margin-top:4px">Training focus: ${TRAINING_FOCUS[s.trainingFocus].icon} ${TRAINING_FOCUS[s.trainingFocus].label}</div>${isQuick() ? '' : `<div class="fan-wrap">${fanPostsHTML(posts, club)}${oldPosts.length ? `<div class="dim" style="font-size:11px; margin:6px 0 2px">Meanwhile, at ${esc(prev.name)}…</div>${fanPostsHTML(oldPosts, prev)}` : ''}</div>`}</div>`;
      sfx('stamp');
      if (o.kind === 'TRANSFER' && o.data.feeM >= 50) { confettiBurst({ count: 90, colors: [clubColors(club).c1, clubColors(club).c2, '#f2c94c'] }); sfx('crowd'); }
      await rvWait(isQuick() ? 1700 : 3600);
    }

    function stageObjectives(ctx, objs, idx) {
      const s = gameState;
      const age = ctx.win.startAge + idx;
      $('rvStage').innerHTML = `<div class="rv-card"><div style="text-align:center; margin-bottom:14px"><div class="eyebrow" style="color:#9fd0ff">Pre-season · ${seasonLabel(age)} · age ${age}</div><h2 style="font-size:24px; font-weight:900">This season's objectives</h2><div class="muted" style="font-size:12.5px">Set by the board, the fans and your own ambition.</div></div>${objectivesHTML(objs)}<div style="text-align:center; margin-top:16px"><button class="btn btn-go" onclick="skipWait()">Kick off ▸</button></div></div>`;
      sfx('click');
      return rvWait(keyMomentsOnly() ? 1200 : 2600);
    }
    function skipWait() { if (RV.timer) clearTimeout(RV.timer); if (RV.wake) { const w = RV.wake; RV.wake = null; w(); } }

    function evRowHTML(ev) {
      const m = metaFor(ev.type);
      const { title, body } = splitHeadline(ev.text, ev.type);
      return `<div class="rv-ev ${m.cls}"><span class="ic">${m.icon}</span><div><b>${esc(title)}</b> — ${esc(body)}</div></div>`;
    }
    function rivalLineHTML(se) {
      const r = se.rival;
      if (!r) return '';
      const prof = POSITION_PROFILES[gameState.setup.position];
      const stat = prof.primaryStatType === 'ATTACK' ? `${r.goals} goals` : `${r.cleanSheets} clean sheets`;
      return `<div class="rival-line">😤 <b style="color:var(--purple)">${esc(r.name)}</b> (${esc(r.clubName)}): ${ratingBadge(r.rating)} · ${stat} · ${r.trophies} troph${r.trophies === 1 ? 'y' : 'ies'}${r.ballonDor ? " · <b class='gold-t'>won the Ballon d'Or</b>" : r.bdRank ? ` · BdO ${ordinal(r.bdRank)}` : ''}${se.rating > r.rating ? ' — <span class="pos-t">you outshone him</span>' : ' — <span class="neg-t">he had the better season</span>'}</div>`;
    }

    async function stageSeason(ctx, se, idx) {
      const s = gameState;
      const p = ctx.proj;
      const defs = statDefs(s.setup.position);
      const parent = CLUB_MAP[se.clubId];
      const shown = se.onLoan ? findClubByName(se.loanClubName) || parent : parent;
      const col = clubColors(shown);
      const val = (def) => (def.isPct ? se.savePct || 0 : se[def.sk] || 0);
      const blind = scoutLevel() === 'BLIND';
      const xHTML = (actual, proj, decimals = 0) => {
        if (proj == null || blind) return '';
        const dd = actual - proj;
        if (Math.abs(dd) < (decimals ? 0.05 : 0.5)) return '<span style="color:#8d95a3">on projection</span>';
        return `<span style="color:${dd > 0 ? 'var(--pos)' : 'var(--neg)'}">${dd > 0 ? '+' : '−'}${Math.abs(dd).toFixed(decimals)} vs proj</span>`;
      };
      const preEvents = idx === 0 ? ctx.win.events.filter((e) => e.age === se.age && !se.events.includes(e) && ['RIVAL_BETRAYAL', 'MANAGER_CHANGE', 'UNWANTED', 'RESIGNED'].includes(e.type)) : [];
      const evs = [...preEvents, ...se.events.filter((e) => !['TROPHY', 'INTL_GLORY', 'BALLON_DOR'].includes(e.type))];
      const ovrB = overallRating(s.setup.position, se.attrsBefore);
      const ovrA = overallRating(s.setup.position, se.attrsAfter);
      $('rvStage').innerHTML = `<div class="rv-card">
        <div class="season-head" style="--sc1:${col.c1}; --sct:${col.text}">${crestSVG(shown, 56)}
          <div style="min-width:0"><div class="s-label">Season ${se.season} · Age ${se.age}${se.secondTier ? ` · ${esc(se.league)}` : ''}</div>
          <div class="s-club">${esc(se.onLoan ? se.loanClubName : se.clubName)}${se.onLoan ? ' <span class="pill pill-purple" style="vertical-align:middle">On loan</span>' : ''}</div>
          <div style="opacity:.82; font-size:12.5px">${se.onLoan ? `Loaned out by ${esc(se.clubName)}` : esc(se.league)} · ${roleLabel(se.role)}</div></div>
          <div style="margin-left:auto; text-align:right; opacity:.9"><div class="eyebrow" style="color:inherit; opacity:.7">Season</div><div style="font:900 22px var(--mono)">${idx + 1}/${ctx.win.years}</div></div>
        </div>
        <div class="season-body">
          <div class="md-row"><span id="mdTxt" style="min-width:96px">Matchday 1</span><div class="md-bar"><div id="mdBar"></div></div><span id="mdApps" class="num" style="min-width:70px; text-align:right">0 apps</span></div>
          <div class="counters">
            <div class="counter"><div class="v num" id="cApps">0</div><div class="l">Appearances</div><div class="x">${xHTML(se.apps, p ? p.apps : null)}</div></div>
            <div class="counter"><div class="v num" id="cS1">0</div><div class="l">${defs[0].l}</div><div class="x">${xHTML(val(defs[0]), p ? p[defs[0].k] : null, 0)}</div></div>
            <div class="counter"><div class="v num" id="cS2">0</div><div class="l">${defs[1].l}</div><div class="x">${xHTML(val(defs[1]), p ? p[defs[1].k] : null, defs[1].isPct ? 1 : 0)}</div></div>
            <div class="counter"><div class="v num"><span style="color:#f2c94c" id="cY">0</span><span style="color:#5d6573">/</span><span style="color:#ef5350" id="cR">0</span></div><div class="l">Cards</div><div class="x"></div></div>
            <div class="counter rating"><div class="v num" id="cRat" style="color:#5d6573">–.––</div><div class="l">Avg rating</div><div class="x" id="cRatX"></div></div>
          </div>
          <div class="rv-events" id="rvEvents"></div>
          <div id="rvV8"></div>
          <div id="rvMatch"></div>
          <div id="rvExtra"></div>
          <div class="value-strip"><div><div class="eyebrow">Market value</div><div class="vv" id="rvVal">${fmtM(se.valueStart)}</div></div><div style="text-align:right"><div id="rvValDelta" style="font:800 15px var(--mono)"></div><div class="dim" style="font-size:11.5px">Overall ${ovrB.toFixed(1)} → <b style="color:${ovrA >= ovrB ? 'var(--pos)' : 'var(--neg)'}">${ovrA.toFixed(1)}</b></div></div></div>
        </div>
      </div>`;
      sfx('whistle');
      const dur = 1800;
      const bar = $('mdBar');
      if (bar) { bar.style.transition = RV.skip ? 'none' : `width ${dur / RV.speed}ms cubic-bezier(.33,1,.68,1)`; requestAnimationFrame(() => { bar.style.width = '100%'; }); }
      animateCount($('cApps'), se.apps, dur);
      animateCount($('cS1'), val(defs[0]), dur, 0);
      animateCount($('cS2'), val(defs[1]), dur, defs[1].isPct ? 1 : 0, defs[1].isPct ? '%' : '');
      animateCount($('cY'), se.yellows, dur);
      animateCount($('cR'), se.reds, dur);
      const mdTxt = $('mdTxt'); const mdApps = $('mdApps');
      const games = parent.starRating >= 4 ? 50 : parent.starRating === 3 ? 44 : 38;
      if (!RV.skip && !motionOff()) {
        const t0 = performance.now();
        const tick = (t) => { const k0 = Math.min(1, (t - t0) / (dur / RV.speed)); const k = 1 - Math.pow(1 - k0, 3); if (mdTxt) mdTxt.textContent = `Matchday ${Math.max(1, Math.round(games * k))}`; if (mdApps) mdApps.textContent = `${Math.round(se.apps * k)} apps`; if (k0 < 1 && !RV.skip) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
      await rvWait(dur + 120);
      if (mdTxt) mdTxt.textContent = 'Full time · season complete';
      if (mdApps) mdApps.textContent = `${se.apps} apps`;
      const rat = $('cRat');
      if ($('cRat')) $('cRat').parentNode.querySelector('.l').textContent = `Avg rating · ${ratingWord(se.rating)}`;
      if (rat) { rat.textContent = se.rating.toFixed(2); rat.style.color = '#0a0c0f'; rat.style.background = ratingColor(se.rating); rat.style.animation = 'crestIn .45s cubic-bezier(.2,1.4,.3,1)'; $('cRatX').innerHTML = p ? xHTML(se.rating, p.rating, 2) : ''; }
      animateValue($('rvVal'), se.valueStart, se.valueEnd, 900);
      const vd = se.valueEnd - se.valueStart;
      const vdp = (vd / Math.max(0.1, se.valueStart)) * 100;
      $('rvValDelta').innerHTML = `<span style="color:${vd >= 0 ? 'var(--pos)' : 'var(--neg)'}">${vd >= 0 ? '▲' : '▼'} ${fmtM(Math.abs(vd))} (${vd >= 0 ? '+' : '−'}${Math.abs(Math.round(vdp))}%)</span>`;
      await rvWait(550);
      const feed = $('rvEvents');
      for (const ev of evs) {
        if (!feed) break;
        feed.insertAdjacentHTML('beforeend', evRowHTML(ev));
        if (metaFor(ev.type).cls === 'bad') sfx('bad'); else if (metaFor(ev.type).cls === 'gold') sfx('crowd');
        await rvWait(700);
      }
      const v8 = $('rvV8');
      if (v8) { v8.innerHTML = seasonV8HTML(s, se, shown); if (!RV.skip) await rvWait(900); }
      if (!RV.skip && RV.boost === 1) await playKeyMatch(buildKeyMatch(se, s), keyMomentsOnly());
      const tSorted = [...se.trophies].sort((x, y) => MAJOR_TROPHY_TYPES.has(x.category) - MAJOR_TROPHY_TYPES.has(y.category));
      for (const t of tSorted) {
        if (!feed) break;
        const major = MAJOR_TROPHY_TYPES.has(t.category);
        if (major && !RV.skip) await trophyLift(t, CLUB_MAP[se.clubId]);
        feed.insertAdjacentHTML('beforeend', `<div class="trophy-pop">${trophySVG(t.category, 52)}<div><div class="tp-name">${esc(t.title)}</div><div class="tp-sub">${esc(t.clubName)} · ${se.season}${major ? ' · Major honour' : ''}</div></div></div>`);
        if (!RV.skip) { confettiBurst({ count: major ? 140 : 60, colors: ['#f2c94c', '#fff1b8', col.c1, col.c2] }); sfx('trophy'); }
        await rvWait(major ? 1200 : 800);
      }
      if ((se.ballonDor || (se.bdRank && se.bdRank <= 3)) && !RV.skip) await podiumCeremony(se);
      if (se.ballonDor && feed) feed.insertAdjacentHTML('beforeend', `<div class="rv-ev gold"><span class="ic">🌟</span><div><b>Ballon d'Or</b> — crowned the best player in the world.</div></div>`);
      else if (se.bdRank && feed && !se.events.some((e) => e.type === 'BDO_PODIUM')) feed.insertAdjacentHTML('beforeend', `<div class="rv-ev info"><span class="ic">🗳️</span><div><b>Ballon d'Or voting</b> — finished ${ordinal(se.bdRank)}.</div></div>`);
      const extra = $('rvExtra');
      const objs = ctx.objectives[idx] || [];
      const nm = nearMisses(se, s);
      const fanKind = se.trophies.some((t) => MAJOR_TROPHY_TYPES.has(t.category)) ? 'trophy' : se.rating >= 7.8 ? 'great' : se.rating < 6.8 ? 'poor' : null;
      if (extra) extra.innerHTML = `${objs.length ? `<div class="eyebrow" style="margin:6px 0 4px">Objectives · ${ctx.objResults[idx].filter(Boolean).length}/${objs.length} met</div>${objectivesHTML(objs, ctx.objResults[idx])}` : ''}${nm.length ? `<div class="near">${nm.map((x) => `<div>😬 <b>So close:</b> ${esc(x)}</div>`).join('')}</div>` : ''}${fanKind && !se.onLoan ? fanPostsHTML(fanPosts(moodOf(s, se.clubId) < 25 ? 'hostile' : fanKind, CLUB_MAP[se.clubId], {}, `s${se.age}`).slice(0, 1), CLUB_MAP[se.clubId]) : ''}${se.moments && se.moments.length ? `<div class="moments"><div class="eyebrow" style="margin-bottom:4px">Moments</div>${se.moments.map((m, i) => `<div style="animation-delay:${i * 0.12}s">⚽ ${esc(m)}</div>`).join('')}</div>` : ''}${rivalLineHTML(se)}`;
      await rvWait(evs.length || se.trophies.length || objs.length ? 2600 : 1400);
    }

    function stageDecision(ctx, ev) {
      return new Promise((resolve) => {
        sfx('whistle');
        $('rvStage').innerHTML = `<div class="rv-card"><div class="decision"><div class="d-head"><div class="eyebrow" style="color:#ffd78f">Between seasons · decision needed</div><div class="d-ic">${ev.icon}</div><div class="d-t">${esc(ev.title)}</div><div class="d-b">${esc(ev.body)}</div></div>
          <div class="d-opts">${ev.options.map((o, i) => `<button class="d-opt" data-opt="${o.id}"><span class="kbd k">${i + 1}</span><b>${esc(o.label)}</b><span>${esc(o.desc)}</span></button>`).join('')}</div></div></div>`;
        const choose = (id) => {
          document.removeEventListener('keydown', onKey);
          const outcome = applyMidWindowChoice(gameState, ctx.win, ev, id);
          sfx('click');
          $('rvStage').innerHTML = `<div class="rv-card"><div class="decision"><div class="d-head"><div class="d-ic">${ev.icon}</div><div class="d-t">${esc(ev.options.find((o) => o.id === id).label)}</div><div class="d-b" style="font-size:16px; color:#fff">${esc(outcome)}</div></div><div style="text-align:center; padding:0 0 22px"><button class="btn btn-go" id="dContinue">Next season ▸</button></div></div></div>`;
          const go = () => { document.removeEventListener('keydown', onKey2); resolve(); };
          const onKey2 = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
          $('dContinue').onclick = go;
          document.addEventListener('keydown', onKey2);
          if (RV.skip) setTimeout(go, 900);
        };
        const onKey = (e) => { const n = Number(e.key); if (n >= 1 && n <= ev.options.length) { e.preventDefault(); choose(ev.options[n - 1].id); } };
        document.addEventListener('keydown', onKey);
        document.querySelectorAll('.d-opt').forEach((b) => { b.onclick = () => choose(b.dataset.opt); });
      });
    }

    async function stageHighlights(ctx) {
      const s = gameState;
      const defs = statDefs(s.setup.position);
      const seasons = ctx.win.seasons;
      $('rvStage').innerHTML = `<div class="rv-card"><div style="text-align:center; margin-bottom:14px"><div class="eyebrow" style="color:#9aa3b0">Highlights</div><h2 style="font-size:26px; font-weight:900">${seasons.length} seasons in ${seasons.length * 2} seconds</h2></div><div class="highlights" id="hlRows"></div><div class="rv-events" id="hlEvents" style="margin-top:12px"></div></div>`;
      const rows = $('hlRows'); const evs = $('hlEvents');
      for (const se of seasons) {
        const club = se.onLoan ? findClubByName(se.loanClubName) || CLUB_MAP[se.clubId] : CLUB_MAP[se.clubId];
        rows.insertAdjacentHTML('beforeend', `<div class="hl-row"><span class="num">${se.season}</span>${crestSVG(club, 28)}<b style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(se.onLoan ? se.loanClubName : se.clubName)}</b><span class="num">${se.apps}<span class="dim" style="font-size:10px"> apps</span></span><span class="num">${defs[0].isPct ? '' : se[defs[0].sk]}<span class="dim" style="font-size:10px"> ${defs[0].s}</span></span><span class="hide-m">${ratingBadge(se.rating)}</span><span class="hide-m">${se.trophies.map((t) => (t.category === 'INTERNATIONAL' ? '🌍' : t.category === 'CONTINENTAL' ? '⭐' : t.category === 'DOMESTIC_LEAGUE' ? '🏆' : '🥈')).join('')}${se.ballonDor ? '🌟' : ''}</span></div>`);
        sfx('click');
        se.events.filter((e) => ['TROPHY', 'INTL_GLORY', 'AWARD', 'CLUB_RECORD', 'RIVAL_BDO', 'BDO_PODIUM', 'RELEGATED', 'INJURY', 'ROLE_UP'].includes(e.type)).forEach((e) => evs.insertAdjacentHTML('beforeend', evRowHTML(e)));
        if (se.trophies.some((t) => MAJOR_TROPHY_TYPES.has(t.category)) && !RV.skip) { const cc = clubColors(club); confettiBurst({ count: 90, colors: [cc.c1, cc.c2, '#f2c94c', '#ffffff'] }); sfx('trophy'); }
        const hl = gameState.story && (gameState.story.headlines || []).find((x) => x.age === se.age);
        evs.insertAdjacentHTML('beforeend', `<div class="hl-why"><span class="why-k">${esc(se.season)}</span> ${esc(seasonReason(gameState, se))}</div>${hl ? headlineHTML(hl) : ''}`);
        if (se.ballonDor && !RV.skip) await ballonCeremony(se, 2600);
        (ctx.stories || []).filter((e) => e.age === se.age && e.when === 'season').forEach((e) => evs.insertAdjacentHTML('beforeend', storyCardHTML(e, { interactive: false, compact: true })));
        await rvWait(900);
      }
      await rvWait(800);
    }

    function ballonCeremony(se, ms = 5600) {
      return new Promise((res) => {
        const s = gameState;
        const el = document.createElement('div');
        el.className = 'ceremony';
        el.innerHTML = `<div style="padding:20px"><div class="ball">${ballSVG(150)}</div><div class="c-eyebrow">Ballon d'Or ${BASE_YEAR + se.age - 16}</div><div class="c-name">${esc(s.playerName)}</div><div class="c-sub">The best player on the planet · ${esc(se.clubName)} · season rating ${se.rating.toFixed(2)}</div>${se.rival ? `<div class="c-sub" style="margin-top:6px">${esc(se.rival.name)} finished ${se.rival.bdRank ? ordinal(se.rival.bdRank) : 'outside the top 30'}.</div>` : ''}<div class="c-sub" style="margin-top:22px; font-size:12px; opacity:.6">Click to continue</div></div>`;
        document.body.appendChild(el);
        confettiBurst({ count: 220, colors: ['#f2c94c', '#fff1b8', '#ffd76a', '#ffffff'], y: 0.3, spread: 1.4 });
        sfx('ballon');
        let closed = false;
        const close = () => { if (closed) return; closed = true; el.remove(); res(); };
        el.addEventListener('click', close);
        setTimeout(close, ms / RV.speed);
      });
    }

    function gradeFor(ctx) {
      const p = ctx.proj; const r = ctx.report;
      const defs = statDefs(gameState.setup.position);
      const n = Math.max(1, r.seasons.length);
      const actualPrimary = r.seasons.reduce((a, x) => a + (x[defs[0].sk] || 0), 0);
      const projPrimary = (p[defs[0].k] || 0) * n;
      const primRel = projPrimary > 0.8 ? (actualPrimary - projPrimary) / projPrimary : 0;
      const ratingDiff = r.averageRating - p.rating;
      const trophyDiff = r.trophiesWon.length - p.trophiesMean;
      const valRel = (r.valueEnd - p.valueMed) / Math.max(1, p.valueMed);
      const bdo = r.seasons.some((x) => x.ballonDor) ? 1 : 0;
      const majorsWon = r.trophiesWon.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length;
      const score = ratingDiff * 2.5 + primRel * 0.8 + trophyDiff * 0.5 + majorsWon * 0.25 + valRel + bdo * 1.2;
      const g = score >= 0.9 ? ['A+', '#f2c94c', 'Sensational'] : score >= 0.45 ? ['A', '#3ecf6e', 'Beat expectations'] : score >= 0.15 ? ['B+', '#7ad94a', 'Above projection'] : score >= -0.2 ? ['B', '#c9d635', 'As projected'] : score >= -0.55 ? ['C', '#f59a3c', 'Below projection'] : ['D', '#ef5350', 'Disappointing'];
      return { letter: g[0], color: g[1], label: g[2], ring: clamp(50 + score * 35, 8, 100) };
    }

    function stageSummary(ctx) {
      const s = gameState;
      const r = ctx.report; const p = ctx.proj;
      const defs = statDefs(s.setup.position);
      const n = Math.max(1, r.seasons.length);
      const grade = gradeFor(ctx);
      const club = CLUB_MAP[r.clubId];
      const sum = (k) => r.seasons.reduce((a, x) => a + (x[k] || 0), 0);
      const row = (label, actual, proj, fmt, decimals = 0) => {
        let verdict = '<span class="dim">●  on target</span>';
        if (proj != null) { const rel = proj === 0 ? (actual > 0 ? 1 : 0) : (actual - proj) / Math.abs(proj); if (rel > 0.06) verdict = '<span class="pos-t">▲ above</span>'; else if (rel < -0.06) verdict = '<span class="neg-t">▼ below</span>'; }
        return `<tr><td class="muted">${label}</td><td class="r dim">${proj == null ? '—' : fmt(proj, decimals)}</td><td class="r" style="font-weight:900">${fmt(actual, decimals)}</td><td>${verdict}</td></tr>`;
      };
      const num = (v, d) => Number(v).toFixed(d);
      const rows = [
        row('Appearances', r.appearances, p.apps * n, num), row(defs[0].l, sum(defs[0].sk), p[defs[0].k] * n, num),
        defs[1].isPct ? row('Save %', r.averageSavePct || 0, p.savePct, (v) => `${num(v, 1)}%`) : row(defs[1].l, sum(defs[1].sk), p[defs[1].k] * n, num),
        row('Avg rating', r.averageRating, p.rating, num, 2), row('Trophies', r.trophiesWon.length, p.trophiesMean, num, 1), row('Market value', r.valueEnd, p.valueMed, (v) => fmtM(v)),
      ].join('');
      const awards = r.seasons.flatMap((x) => (x.awards || []).map((a) => ({ title: a, season: x.season })));
      const trophies = r.trophiesWon.length || awards.length || r.seasons.some((x) => x.ballonDor)
        ? `<div class="shelf" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${r.trophiesWon.map((t) => `<div class="trophy-card gold" style="animation:trophyIn .6s both">${trophySVG(t.category, 40)}<div class="t-name">${esc(t.title)}</div><div class="t-meta">${seasonLabel(t.yearAge)}</div></div>`).join('')}${r.seasons.filter((x) => x.ballonDor).map((x) => `<div class="trophy-card gold">${ballSVG(40)}<div class="t-name">Ballon d'Or</div><div class="t-meta">${x.season}</div></div>`).join('')}${awards.map((a) => `<div class="trophy-card">${trophySVG('AWARD', 36)}<div class="t-name">${esc(a.title)}</div><div class="t-meta">${a.season}</div></div>`).join('')}</div>`
        : '<div class="empty" style="color:#8d95a3">No silverware this time.</div>';
      const milestones = (r.milestonesUnlocked || []).map((m) => `<div class="milestone-banner"><span style="font-size:24px">🏅</span><div><b>Milestone unlocked: ${esc(m.label)}</b><div class="muted" style="font-size:12px">${esc(m.description)}</div></div></div>`).join('');
      const decisions = (r.midEvents || []).map((m) => `<div class="rv-ev info"><span class="ic">🧭</span><div><b>${esc(m.title)}</b> — ${esc(m.outcome)}</div></div>`).join('');
      const vd = r.valueEnd - r.valueStart;
      const ovrNow = overallRating(s.setup.position, s.attributes);
      const ovrStart = r.seasons.length ? overallRating(s.setup.position, r.seasons[0].attrsBefore) : ovrNow;
      $('rvSkip').classList.add('hidden');
      RV.lastCtx = ctx;
      const allObj = (ctx.objResults || []).flat();
      $('rvStage').innerHTML = `<div class="rv-card">
        ${frontPageHTML(ctx)}
        <div style="text-align:center; margin:18px 0"><div class="eyebrow" style="color:#9aa3b0">Window complete · ${esc(club.name)} · age ${r.startAge}–${r.endAge}</div><h2 style="font-size:30px; font-weight:900; letter-spacing:-.5px">${grade.label}</h2>${allObj.length ? `<div class="muted">🎯 ${allObj.filter(Boolean).length} of ${allObj.length} season objectives met</div>` : ''}</div>
        <div class="summary-grid">
          <div style="text-align:center"><div class="grade" style="--gc:${grade.color}; --gp:${grade.ring}"><div><div class="g">${grade.letter}</div><div class="gl">Window grade</div></div></div>
            <div style="margin-top:14px" class="value-strip"><div style="text-align:left"><div class="eyebrow">Value</div><div class="vv" id="sumVal">${fmtM(r.valueStart)}</div></div><div style="font:800 14px var(--mono); color:${vd >= 0 ? 'var(--pos)' : 'var(--neg)'}">${vd >= 0 ? '▲' : '▼'} ${fmtM(Math.abs(vd))}</div></div>
            <div class="value-strip" style="margin-top:8px"><div class="eyebrow">Earned</div><div style="font-weight:900">${fmtM(r.seasons.some((x) => x.money) ? r.seasons.reduce((a, x) => a + (x.money ? x.money.gross : x.wageM || 0), 0) : r.earningsM)}</div></div>
            <div class="value-strip" style="margin-top:8px"><div class="eyebrow">Overall</div><div style="font-weight:900">${ovrStart.toFixed(1)} → <span class="${ovrNow >= ovrStart ? 'pos-t' : 'neg-t'}">${ovrNow.toFixed(1)}</span></div></div>
            ${r.roleEnd !== r.roleStart ? `<div class="value-strip" style="margin-top:8px"><div class="eyebrow">Squad role</div><div style="font-weight:900">${roleLabel(r.roleStart)} → <span class="${ROLE_ORDER.indexOf(r.roleEnd) > ROLE_ORDER.indexOf(r.roleStart) ? 'pos-t' : 'neg-t'}">${roleLabel(r.roleEnd)}</span></div></div>` : ''}
          </div>
          <div style="display:flex; flex-direction:column; gap:12px">
            <div class="panel" style="background:rgba(22,25,31,.9)"><div class="panel-head"><span>Projection vs reality</span><span class="right">${r.seasons.length} season(s)</span></div><table class="tbl vs-tbl"><thead><tr><th>Metric</th><th class="r">Projected</th><th class="r">Actual</th><th>Verdict</th></tr></thead><tbody>${rows}</tbody></table></div>
            ${milestones}${(ctx.stories || []).length ? `<div class="panel" style="background:rgba(22,25,31,.9)"><div class="panel-head"><span>Off the pitch</span><span class="right">${ctx.stories.length} stor${ctx.stories.length === 1 ? 'y' : 'ies'} · in My Story</span></div><div class="panel-body story-mini">${ctx.stories.map((e) => `<div>${STORY_TONE_ICON[e.tone] || '📖'} <b>${esc(e.title)}</b> <span class="dim">· age ${e.age}</span></div>`).join('')}</div></div>` : ''}${decisions ? `<div class="panel" style="background:rgba(22,25,31,.9)"><div class="panel-head">Your decisions</div><div class="panel-body rv-events" style="margin:0">${decisions}</div></div>` : ''}
            <div class="panel" style="background:rgba(22,25,31,.9)"><div class="panel-head">Silverware & awards</div><div class="panel-body">${trophies}</div></div>
            ${typeof worldStripHTML === 'function' ? worldStripHTML(gameState, r.seasons.map((x) => x.age)) : ''}
          </div>
        </div>
        <div style="display:flex; justify-content:center; margin-top:20px"><button class="btn btn-go btn-lg" onclick="finishReview()">${ctx.isRetired ? '🏁 Retirement ceremony ▸' : 'Continue to next window ▸'} <span class="kbd" style="margin-left:6px">Enter</span></button></div>
      </div>`;
      animateValue($('sumVal'), r.valueStart, r.valueEnd, 1100);
      if (grade.letter.startsWith('A')) { confettiBurst({ count: 120 }); sfx('crowd'); }
    }

    function finishReview() {
      confettiState.parts = [];
      $('review').classList.add('hidden');
      $('rvStage').innerHTML = '';
      const ctx = RV.ctx;
      RV.ctx = null; RV.phase = null;
      if (!ctx) return;
      if (ctx.isRetired) { showLegacy(); return; }
      ui.page = isQuick() ? 'transfers' : 'home';
      renderApp();
      $('main').scrollTop = 0;
    }
