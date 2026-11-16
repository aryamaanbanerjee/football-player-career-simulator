    /* ==========================================================================
     * v8 · VISUALS
     *   Floodlit night / matchday programme themes, club-colour accent (contrast
     *   checked), story scenes, staggered entrances, season extras (reason, headline,
     *   pitch sketch), signing-day signature, the My Story timeline, the retirement
     *   poster and a shareable career card drawn on a canvas. No images are
     *   downloaded: everything is drawn in SVG, CSS or canvas.
     * ========================================================================== */

    /* ---------- Colour helpers and the club accent ---------- */
    function hexToRgb(h) {
      const m = String(h).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!m) return [128, 128, 128];
      let x = m[1]; if (x.length === 3) x = x.split('').map((c) => c + c).join('');
      return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
    }
    const rgbToHex = (r) => `#${r.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
    function luminance(rgb) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); }
    function contrast(a, b) { const la = luminance(a); const lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
    function mixRgb(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
    /* Returns a colour from the club palette that reads at least 3:1 on the page background. */
    function readableAccent(club, light) {
      const bg = light ? hexToRgb('#f6f1e7') : hexToRgb('#111317');
      const c = clubColors(club);
      const cands = [c.c1, c.c2].map(hexToRgb).sort((x, y) => contrast(y, bg) - contrast(x, bg));
      let col = cands[0];
      const toward = light ? [20, 18, 14] : [255, 255, 255];
      for (let i = 0; i < 12 && contrast(col, bg) < 3; i++) col = mixRgb(col, toward, 0.15);
      return rgbToHex(col);
    }
    function applyClubAccent(club) {
      const root = document.documentElement.style;
      if (!club) { root.removeProperty('--accent'); root.removeProperty('--accent-ink'); root.removeProperty('--accent-dim'); return; }
      const light = prefs.theme === 'programme';
      const hex = readableAccent(club, light);
      const rgb = hexToRgb(hex);
      root.setProperty('--accent', hex);
      root.setProperty('--accent-dim', `rgba(${rgb.join(',')}, ${light ? 0.12 : 0.16})`);
      root.setProperty('--accent-ink', luminance(rgb) > 0.35 ? '#111317' : '#ffffff');
    }

    /* ---------- Staggered entrances ---------- */
    function staggerIn(root) {
      if (!root || motionOff()) return;
      const items = root.querySelectorAll(':scope > *, :scope .grid > .panel, :scope .story-stack > .story-card, :scope .tl-item');
      let i = 0;
      items.forEach((el) => { if (i > 18) return; el.style.setProperty('--stg', `${i * 45}ms`); el.classList.add('stg'); i++; });
    }

    /* ---------- Story scenes (small line drawings behind story cards) ---------- */
    const SCENE_BY_CAT = { ACA: 'training', TRN: 'press', CLB: 'dressing', LON: 'mud', INJ: 'physio', INT: 'flags', RIV: 'floodlights', BIG: 'podium', LDR: 'dressing', END: 'sunset', OFF: 'home', CB: 'floodlights', TUT: 'training', MAT: 'floodlights', PRO: 'training', MY: 'home' };
    function sceneFor(e) {
      const t = `${e.title} ${e.text}`.toLowerCase();
      if (/\brain|poured|wet\b/.test(t)) return 'rain';
      if (/\bcar\b|car park|drove|drive\b|satnav|bus\b/.test(t)) return 'road';
      if (/kitchen|dinner|cook|cereal|mug|drawer|tea\b/.test(t)) return 'home';
      if (/trophy|medal|title|champion|parade/.test(t)) return 'podium';
      if (/press|camera|interview|journalist|photograph/.test(t)) return 'press';
      return SCENE_BY_CAT[e.cat] || 'floodlights';
    }
    function sceneSVG(kind) {
      const L = 'currentColor';
      const A = 'var(--accent)';
      const g = {
        floodlights: `<path d="M20 8v60M100 8v60" stroke="${L}"/><rect x="10" y="4" width="20" height="9" rx="2" fill="${A}" opacity=".7"/><rect x="90" y="4" width="20" height="9" rx="2" fill="${A}" opacity=".7"/><path d="M14 13 L-4 70 M26 13 L44 70 M94 13 L76 70 M106 13 L124 70" stroke="${A}" opacity=".25"/><path d="M0 70h120" stroke="${L}"/>`,
        training: `<path d="M0 70h120" stroke="${L}"/>${[18, 42, 66, 90].map((x) => `<path d="M${x} 70l5-12 5 12z" fill="${A}" opacity=".75"/>`).join('')}<circle cx="104" cy="64" r="6" stroke="${L}"/><path d="M8 40h40M8 46h28" stroke="${L}" opacity=".5"/>`,
        press: `<rect x="30" y="38" width="60" height="22" rx="3" stroke="${L}"/>${[42, 60, 78].map((x) => `<path d="M${x} 38v-14" stroke="${L}"/><rect x="${x - 4}" y="16" width="8" height="10" rx="4" fill="${A}" opacity=".7"/>`).join('')}<path d="M20 70h80" stroke="${L}"/>`,
        dressing: `${[16, 40, 64, 88].map((x, i) => `<path d="M${x} 20h16v6h-3v26h-10v-26h-3z" stroke="${L}" fill="${i === 1 ? A : 'none'}" fill-opacity=".35"/>`).join('')}<path d="M6 60h108M10 60v10M110 60v10" stroke="${L}"/>`,
        mud: `<path d="M0 62c20-6 40 6 60 0s40-6 60 0" stroke="${L}"/><path d="M0 70c20-5 40 5 60 0s40-5 60 0" stroke="${L}" opacity=".5"/>${[20, 50, 80].map((x) => `<ellipse cx="${x}" cy="56" rx="7" ry="2.5" fill="${A}" opacity=".35"/>`).join('')}<circle cx="96" cy="44" r="7" stroke="${L}"/>`,
        physio: `<rect x="20" y="40" width="80" height="10" rx="3" stroke="${L}"/><path d="M28 50v18M92 50v18" stroke="${L}"/><path d="M60 14v18M51 23h18" stroke="${A}" stroke-width="4"/>`,
        flags: `<path d="M4 16 Q60 34 116 16" stroke="${L}"/>${[14, 32, 50, 68, 86, 104].map((x, i) => `<path d="M${x} ${19 + Math.sin(i) * 3}l7 14 7-13z" fill="${i % 2 ? A : 'none'}" stroke="${L}" opacity=".8"/>`).join('')}<path d="M0 70h120" stroke="${L}"/>`,
        podium: `<rect x="44" y="40" width="32" height="30" stroke="${L}"/><rect x="14" y="52" width="30" height="18" stroke="${L}"/><rect x="76" y="58" width="30" height="12" stroke="${L}"/><path d="M52 18h16v6a8 8 0 0 1-16 0zM60 32v8M54 40h12" stroke="${A}" fill="${A}" fill-opacity=".3"/>`,
        sunset: `<circle cx="60" cy="62" r="20" fill="${A}" opacity=".35"/><path d="M0 62h120" stroke="${L}"/><path d="M14 56v-30M106 56v-30" stroke="${L}"/>`,
        home: `<path d="M20 70V36l40-24 40 24v34" stroke="${L}"/><rect x="50" y="48" width="20" height="22" stroke="${L}"/><rect x="28" y="42" width="14" height="12" fill="${A}" opacity=".45"/><rect x="78" y="42" width="14" height="12" fill="${A}" opacity=".45"/>`,
        road: `<path d="M0 70h120" stroke="${L}"/><path d="M18 60h56l10-12h18l8 12h4v8H18z" stroke="${L}"/><circle cx="36" cy="68" r="6" fill="${A}" opacity=".55"/><circle cx="96" cy="68" r="6" fill="${A}" opacity=".55"/><path d="M8 20v40M2 20h12" stroke="${L}" opacity=".6"/>`,
        rain: `${Array.from({ length: 14 }, (_, i) => `<path d="M${6 + i * 8} ${8 + (i % 3) * 8}l-4 12" stroke="${A}" opacity=".6"/>`).join('')}<path d="M0 70h120" stroke="${L}"/><path d="M40 70V50h40v20" stroke="${L}"/>`,
      };
      return `<svg viewBox="0 0 120 76" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g[kind] || g.floodlights}</svg>`;
    }

    /* ---------- Season extras: reason, headline, pitch sketch ---------- */
    function pitchSketchSVG(state, se) {
      const isAtt = POSITION_PROFILES[state.setup.position].primaryStatType === 'ATTACK';
      const n = Math.min(40, isAtt ? se.goals : se.cleanSheets);
      if (!n) return '';
      const r = storyRng(state, `sketch|${se.age}`);
      const pos = state.setup.position;
      const spread = { ST: [0.5, 0.22, 0.18], LW: [0.32, 0.25, 0.2], RW: [0.68, 0.25, 0.2], CAM: [0.5, 0.33, 0.25], CM: [0.5, 0.42, 0.3] }[pos] || [0.5, 0.3, 0.3];
      const dots = Array.from({ length: n }, () => {
        if (isAtt) { const x = clamp(spread[0] + (r() - 0.5) * spread[2] * 1.6, 0.22, 0.78); const y = clamp(0.06 + Math.abs(r() - 0.15) * spread[1], 0.04, 0.42); return [x, y]; }
        return [0.36 + r() * 0.28, 0.9 + r() * 0.05];
      });
      return `<div class="sketch"><svg viewBox="0 0 100 64" aria-hidden="true"><rect x="1" y="1" width="98" height="62" rx="2" class="sk-pitch"/>
        <g class="sk-lines" fill="none"><path d="M1 32h98"/><circle cx="50" cy="32" r="8"/><rect x="30" y="1" width="40" height="12"/><rect x="40" y="1" width="20" height="5"/><rect x="30" y="51" width="40" height="12"/><rect x="40" y="58" width="20" height="5"/></g>
        ${dots.map(([x, y], i) => `<circle cx="${(x * 100).toFixed(1)}" cy="${(isAtt ? y * 64 : y * 64).toFixed(1)}" r="1.6" class="sk-dot" style="animation-delay:${i * 40}ms"/>`).join('')}</svg>
        <div class="sk-cap"><b>${n} ${isAtt ? (n === 1 ? 'goal' : 'goals') : n === 1 ? 'clean sheet' : 'clean sheets'}</b> <span>· sketch only: the count is real, the positions are illustrative</span></div></div>`;
    }
    function seasonV8HTML(state, se) {
      const st = state.story || {};
      const h = (st.headlines || []).find((x) => x.age === se.age);
      const m = st.mate && st.mate.last && st.mate.last.age === se.age && st.mate.last.meet ? st.mate.last : null;
      return `<div class="season-v8">${typeof seasonFinishLine === 'function' ? seasonFinishLine(state, se) : ''}<div class="why"><span class="why-k">Why</span> ${esc(seasonReason(state, se))}</div>
        ${(se.v10notes || []).map((n) => `<div class="why"><span class="why-k">Training</span> ${esc(n)}</div>`).join('')}
        ${se.edges && (se.edges.goals > 0 || se.edges.assists > 0 || se.edges.cs > 0) ? `<div class="why"><span class="why-k">Edges</span> Compared with a typical player, your training, weak foot and traits were worth ${[se.edges.goals > 0 ? `${se.edges.goals} goal${se.edges.goals === 1 ? '' : 's'}` : '', se.edges.assists > 0 ? `${se.edges.assists} assist${se.edges.assists === 1 ? '' : 's'}` : '', se.edges.cs > 0 ? `${se.edges.cs} clean sheet${se.edges.cs === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')} this season.</div>` : ''}
        ${se.newManager ? `<div class="why"><span class="why-k">Club</span> ${esc(se.newManager.prev)} leaves ${esc(se.newManager.why)}. ${esc(se.newManager.name)} is the new manager: everyone starts again.</div>` : ''}
        ${(se.v11notes || []).map((n) => `<div class="why"><span class="why-k">Media</span> ${esc(n)}</div>`).join('')}
        ${m ? `<div class="why"><span class="why-k">🤝</span> You played ${esc(storyTokens(state).mate)}’s ${esc(m.clubName)}: ${esc(m.meet.join(' and '))}.</div>` : ''}
        <div class="sv8-row">${h ? headlineHTML(h) : ''}${pitchSketchSVG(state, se)}</div></div>`;
    }

    /* ---------- Signing day ---------- */
    function signatureSVG(name) {
      const w = Math.min(260, 60 + String(name).length * 11);
      return `<div class="signature" aria-hidden="true"><svg viewBox="0 0 ${w + 40} 50"><path class="sig-line" d="M8 34 C 28 6, 40 44, 58 24 S 92 12, 104 30 S ${w - 40} 40, ${w} 18" fill="none" stroke-width="2.4" stroke-linecap="round"/><path d="M8 42h${w + 20}" class="sig-rule"/><g class="sig-pen" transform="translate(${w},10)"><path d="M0 8 L18 -10 L24 -4 L6 14 Z" /><path d="M0 8 L-3 17 L6 14" /></g></svg><div class="sig-label">Signed</div></div>`;
    }

    /* ---------- My Story: a timeline with a club-colour ribbon ---------- */
    function renderStoryPage2() {
      const s = gameState;
      const st = ensureDepth(s);
      const t = storyTokens(s);
      const ages = [];
      for (let a = 17; a <= s.currentAge; a++) ages.push(a);
      const seasonAt = (a) => (s.seasonLog || []).find((x) => x.age === a);
      const items = ages.reverse().map((a) => {
        const se = seasonAt(a);
        const club = se ? CLUB_MAP[se.clubId] : CLUB_MAP[s.currentClubId];
        const col = clubColors(club);
        const ents = st.journal.map((e, i) => ({ e, i })).filter(({ e }) => e.age === a);
        const h = st.headlines.find((x) => x.age === a);
        if (!se && !ents.length) return '';
        const tro = se ? se.trophies.map((x) => `<span class="tl-tro">🏆 ${esc(x.title)}</span>`).join('') : '';
        return `<div class="tl-item" style="--rc1:${col.c1}; --rc2:${col.c2}"><div class="tl-rib"></div><div class="tl-age"><b>${a}</b><span>${seasonLabel(a)}</span>${club ? `<span class="tl-club">${crestSVG(club, 18)} ${esc(se && se.onLoan ? se.loanClubName : club.name)}</span>` : ''}</div>
          <div class="tl-body">${se ? `<div class="tl-sum"><span class="rat" style="background:${ratingColor(se.rating)}">${se.rating.toFixed(2)}</span> ${esc(ratingWord(se.rating))} · ${se.apps} games${tro}</div><div class="tl-why">${esc(seasonReason(s, se))}</div>` : ''}${h ? headlineHTML(h) : ''}
          <div class="story-stack">${ents.map(({ e, i }) => storyCardHTML(e, { idx: i, compact: true })).join('')}</div></div></div>`;
      }).join('');
      const castRow = (ic, role, name, key) => { const v = key ? st.aff[key] || 0 : 0; const eff = key && REL_EFFECTS[key] ? REL_EFFECTS[key](v) : ''; return `<div class="cast-row"><span>${ic}</span><div><div class="dim" style="font-size:11px">${role}</div><b>${esc(name)}</b> ${v ? `<span class="${v > 0 ? 'pos-t' : 'neg-t'}">${v > 0 ? '♥'.repeat(Math.min(3, v)) : '−'.repeat(Math.min(3, -v))}</span>` : ''}${eff ? `<div class="eff">${esc(eff)}</div>` : ''}</div></div>`; };
      const m = st.mate;
      const mc = CLUB_MAP[m.clubId];
      const proms = promisesSummary(s);
      return `<div class="page-head"><div><div class="eyebrow">Your career, as it happened</div><h1>My story</h1><div class="muted">${st.journal.length} chapters · ${storyCallbacksLanded(s).length} callbacks landed · ${st.headlines.length} headlines</div></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap"><button class="btn" onclick="navTo('album')">📒 Sticker album</button><button class="btn" onclick="copyStoryJournal()">Copy text</button><button class="btn" onclick="downloadStoryJournal()">Export .txt</button></div></div>
        <div class="story-layout"><div class="grid" style="align-content:start">
          <div class="panel"><div class="panel-head">The people in your story</div><div class="panel-body cast-list">
            ${castRow('🧑‍🏫', 'Academy coach', t.coach, 'coach')}${castRow('🤝', `Best mate · ${mc ? mc.name : ''}${m.retired ? ' (retired)' : ''}`, t.mate, 'mate')}
            ${castRow('💼', 'Agent', t.agent, 'agent')}${castRow('📰', `Journalist · ${t.paper}`, t.journo, 'journo')}
            ${castRow('🏠', 'Family', `${t.parent} and ${t.sibling}`, null)}${castRow('🪧', 'Superfan · Row F', t.superfan, 'superfan')}${castRow('😤', 'Rival', t.rival, 'rival')}
            ${st.protege ? castRow('🌱', `Protege · ${(CLUB_MAP[st.protege.clubId] || {}).name || ''}`, t.protege, null) : ''}
            ${s.currentClubId ? castRow('📋', `Manager at ${t.club}`, t.gaffer, 'gaffer') + castRow('🧺', `Kit man at ${t.club}`, t.kitman, 'kitman') : ''}</div></div>
          ${proms.length ? `<div class="panel"><div class="panel-head">Promises</div><div class="panel-body">${proms.map((p) => `<div class="prom ${p.kept ? 'kept' : ''}">${p.kept ? '✓' : '○'} ${esc(p.text)}</div>`).join('')}</div></div>` : ''}
          ${customStoriesHTML()}</div>
          <div class="timeline" id="storyJournal">${items || '<div class="empty">Your story starts when you sign your first contract.</div>'}</div></div>`;
    }
    function afterRenderStoryPage2() { bindStoryButtons($('storyJournal'), ensureStory(gameState).journal, () => renderApp()); }

    /* ---------- Retirement poster, where are they now, share card ---------- */
    function clubRibbon(state) {
      const log = state.seasonLog || [];
      const runs = [];
      log.forEach((se) => { const id = se.clubId; const last = runs[runs.length - 1]; if (last && last.id === id) last.n++; else runs.push({ id, n: 1 }); });
      return runs.map((r) => ({ ...r, club: CLUB_MAP[r.id], col: clubColors(CLUB_MAP[r.id]) }));
    }
    function bestMoments(state) {
      const st = ensureDepth(state);
      const score = (e) => (e.cat === 'CB' ? 5 : 0) + (e.tone === 'proud' ? 3 : e.tone === 'warm' ? 2 : 1) + (e.cat === 'BIG' ? 2 : 0) + (e.when === 'retire' ? -3 : 0);
      return [...st.journal].sort((a, b) => score(b) - score(a)).slice(0, 3);
    }
    function legacyPosterHTML(s) {
      const runs = clubRibbon(s);
      const total = runs.reduce((n, r) => n + r.n, 0) || 1;
      const g = goalProgress(s);
      const moments = bestMoments(s);
      return `<div class="poster" id="lgPoster"><div class="poster-top"><div class="eyebrow">A career in ${total} seasons · ${esc(getNation(s).name)}</div><div class="poster-name">${esc(s.playerName)}</div><div class="poster-rep">${esc(reputationLine(s))}</div></div>
        <div class="ribbon">${runs.map((r) => `<div class="rb" style="flex:${r.n}; background:linear-gradient(180deg, ${r.col.c1}, ${r.col.c1} 62%, ${r.col.c2} 62%, ${r.col.c2})" title="${esc(r.club ? r.club.name : '')} · ${r.n} season${r.n > 1 ? 's' : ''}"><span>${r.club ? crestSVG(r.club, 22) : ''}</span></div>`).join('')}</div>
        <div class="ribbon-names">${runs.map((r) => `<span style="flex:${r.n}">${esc(r.club ? r.club.name : '')}</span>`).join('')}</div>
        ${g ? `<div class="poster-goal ${g.done ? 'done' : ''}">${g.done ? '✓ Goal achieved' : '○ Goal'} · <b>${esc(g.t)}</b> — ${esc(g.label)}</div>` : ''}
        ${moments.length ? `<div class="poster-moments">${moments.map((e) => `<div><span>${STORY_TONE_ICON[e.tone] || '📖'}</span><b>${esc(e.title)}</b><em>age ${e.age}</em></div>`).join('')}</div>` : ''}
        <div class="poster-actions"><button class="btn btn-go" onclick="downloadPosterCard()">⬇ Download poster</button>${navigator.share ? '<button class="btn" onclick="shareCareerCard()">Share poster</button>' : ''}</div></div>`;
    }
    function legacyDepthHTML(s) {
      const wn = whereNow(s);
      const proms = promisesSummary(s);
      return `<div class="grid g-2"><div class="panel"><div class="panel-head"><span>🕰️ Where are they now</span></div><div class="panel-body where">${wn.map((w) => `<div class="wn"><span>${w.ic}</span><div>${esc(w.line)}</div></div>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><span>🤞 Promises</span><span class="right">${proms.filter((p) => p.kept).length}/${proms.length} kept</span></div><div class="panel-body">${proms.length ? proms.map((p) => `<div class="prom ${p.kept ? 'kept' : ''}"><b>${p.kept ? '✓' : '○'} ${esc(p.text)}</b>${p.kept ? '' : `<div class="dim">${esc(p.owed)}</div>`}</div>`).join('') : '<div class="dim">You never made a promise you might not keep. Sensible.</div>'}</div></div></div>`;
    }

    /* The shareable career card: drawn on a canvas, 1080 × 1350, downloaded as PNG. */
    function drawCareerCard(s) {
      const W = 1080; const H = 1350;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const light = prefs.theme === 'programme';
      const bg = light ? '#f6f1e7' : '#0f1115'; const ink = light ? '#17150f' : '#f2f3f5'; const quiet = light ? '#6a6150' : '#9aa3b0';
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W * 0.2, 0, 10, W * 0.2, 0, 900); glow.addColorStop(0, light ? 'rgba(255,214,120,.35)' : 'rgba(255,246,214,.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const disp = (sz, wt = 800) => `${wt} ${sz}px "Barlow Condensed", "Arial Narrow", sans-serif`;
      g.fillStyle = quiet; g.font = disp(30, 700); g.fillText(`A CAREER IN ${(s.seasonLog || []).length} SEASONS · ${getNation(s).name.toUpperCase()}`, 80, 120);
      g.fillStyle = ink; let size = 132; g.font = disp(size); while (g.measureText(s.playerName.toUpperCase()).width > W - 160 && size > 60) { size -= 6; g.font = disp(size); }
      g.fillText(s.playerName.toUpperCase(), 80, 120 + size);
      g.fillStyle = quiet; g.font = '400 30px system-ui, sans-serif';
      wrapText(g, reputationLine(s), 80, 120 + size + 56, W - 160, 40, 3);
      const runs = clubRibbon(s); const total = runs.reduce((n, r) => n + r.n, 0) || 1;
      let x = 80; const y = 560; const w = W - 160;
      runs.forEach((r) => { const ww = (r.n / total) * w; g.fillStyle = r.col.c1; g.fillRect(x, y, ww - 4, 70); g.fillStyle = r.col.c2; g.fillRect(x, y + 70, ww - 4, 22); x += ww; });
      g.fillStyle = quiet; g.font = disp(26, 700); x = 80;
      runs.forEach((r) => { const ww = (r.n / total) * w; if (ww > 70) { let t = (r.club ? r.club.name : '').toUpperCase(); if (g.measureText(t).width > ww - 8) { while (t.length > 2 && g.measureText(`${t}…`).width > ww - 8) t = t.slice(0, -1); t = `${t.trim()}…`; } g.fillText(t, x, y + 128); } x += ww; });
      const isAtt = POSITION_PROFILES[s.setup.position].primaryStatType === 'ATTACK';
      const stats = [[s.stats.appearances, 'GAMES'], [isAtt ? s.stats.goals : s.stats.cleanSheets, isAtt ? 'GOALS' : 'CLEAN SHEETS'], [s.trophies.length, 'TROPHIES'], [s.stats.internationalCaps, 'CAPS']];
      stats.forEach(([v, l], i) => { const cx = 80 + i * ((W - 160) / 4); g.fillStyle = ink; g.font = disp(96); g.fillText(String(v), cx, 820); g.fillStyle = quiet; g.font = disp(28, 700); g.fillText(l, cx, 860); });
      const lg = s.legacyScore || computeLegacy(s).score || 0;
      g.fillStyle = ink; g.font = disp(40, 700); g.fillText('LEGACY', 80, 960); g.font = disp(150); g.fillStyle = light ? '#8a6a12' : '#f2c94c'; g.fillText(String(Math.round(lg)), 80, 1100);
      const lw = g.measureText(String(Math.round(lg))).width;
      g.fillStyle = quiet; g.font = disp(40, 700); g.fillText('/ 1000', 80 + lw + 14, 1100);
      const mo = bestMoments(s);
      g.font = disp(34, 700); g.fillStyle = ink;
      mo.forEach((e, i) => g.fillText(`${['①', '②', '③'][i]}  ${String(e.title).toUpperCase()}`, 560, 980 + i * 52));
      g.fillStyle = quiet; g.font = '400 24px system-ui, sans-serif';
      g.fillText(`Career code ${careerCode(s.setup)}`, 80, H - 70);
      g.textAlign = 'right'; g.fillText('Football Career Simulator', W - 80, H - 70); g.textAlign = 'left';
      return cv;
    }
    function wrapText(g, text, x, y, maxW, lh, maxLines) {
      const words = String(text).split(' '); let line = ''; let n = 0;
      for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y + n * lh); n++; line = w; if (n >= maxLines) return; } else line = test; }
      if (line && n < maxLines) g.fillText(line, x, y + n * lh);
    }
    function careerCardBlob(cb) { const s = gameState; (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => drawCareerCard(s).toBlob(cb, 'image/png')); }
    function downloadPosterCard() {
      careerCardBlob((blob) => { if (!blob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${String(gameState.playerName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-poster.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); });
    }
    function shareCareerCard() {
      careerCardBlob((blob) => {
        const file = new File([blob], 'career-card.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: `${gameState.playerName}’s career` }).catch(() => {});
        else downloadPosterCard();
      });
    }

    /* ---------- Theme ---------- */
    function setTheme(t) { prefs.theme = t; savePrefs(); applyPrefs(); if (gameState) applyClubAccent(CLUB_MAP[gameState.currentClubId]); if (gameState && !$('screenApp').classList.contains('hidden')) renderPage(); renderSettings(); }
