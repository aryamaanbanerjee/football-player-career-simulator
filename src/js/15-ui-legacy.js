    /* ==========================================================================
     * SCREEN 3: RETIREMENT / LEGACY + shareable career card
     * ========================================================================== */
    const BADGE_ICONS = { ONE_CLUB_MAN: '🛡', THE_JUDAS: '🗡', GALACTICO: '💫', MERCENARY: '💼', PRODIGAL_SON: '🏠', CLUB_LEGEND: '👑', ALL_TIME_GREAT: '🐐', LATE_BLOOMER: '🌸', RETIRED_ON_TOP: '🎩', IRONMAN: '🦾', MONEY_MAN: '💰', GLOBETROTTER: '🧭', NATIONAL_HERO: '🎗️', RECORD_BREAKER: '🏛️', BRIDESMAID: '🥈' };

    function showLegacy() {
      const s = gameState;
      const pos = POSITION_PROFILES[s.setup.position];
      const nation = getNation(s);
      const lastClub = CLUB_MAP[(s.clubHistory[s.clubHistory.length - 1] || {}).clubId] || null;
      applyClubTheme(lastClub);
      showScreen('screenLegacy');
      const majors = s.trophies.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length;
      const clubs = new Set(s.clubHistory.map((x) => x.clubId)).size;
      const tier = legacyTier(s.legacyScore);
      const parts = s.legacyParts || {};
      let chal = null;
      if (s.setup.challenge) {
        if (!s.challengeResult) { const r0 = recordChallengeResult(s); if (r0) { s.challengeResult = { achieved: r0.achieved, rank: r0.rank }; saveCareer(s); } }
        const def = CHALLENGES.find((c) => c.id === s.setup.challenge.id);
        if (def && s.challengeResult) chal = { ...s.challengeResult, def };
      }
      const nextTier = LEGACY_TIERS.slice().reverse().find((t) => t.min > s.legacyScore);
      const r = s.rival;
      const prof = POSITION_PROFILES[s.setup.position];
      const statKey = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
      const beatRival = r ? (s.stats.ballonDOrs * 3 + s.trophies.length + s.stats[statKey] / 50) >= (r.ballonDOrs * 3 + r.trophies + r[statKey] / 50) : true;
      sfx('crowd');
      storyRetire(s);
      $('screenLegacy').innerHTML = `
        <div class="lg-hero"><div class="lg-inner">
          <div style="display:flex; gap:18px; align-items:center">
            ${crestSVG(lastClub, 84)}
            <div><div class="eyebrow" style="color:inherit; opacity:.75">Career retrospective · ${BASE_YEAR}–${BASE_YEAR + s.currentAge - 17}${s.setup.mode === 'QUICK' ? ' · ⚡ Quick' : ''}</div>
            <div class="lg-name">${esc(s.playerName)}</div>
            <div style="opacity:.85; margin-top:4px">${pos.name} · ${esc(nation.name)} · retired at ${s.currentAge} · ${clubs} club${clubs === 1 ? '' : 's'}</div>
            <div class="chips" style="margin-top:10px">${[`${s.stats.appearances} apps`, `${s.trophies.length} trophies`, `${majors} major`, `${s.stats.ballonDOrs} Ballon d'Or`, `peak ${fmtM(s.peakMarketValueM)}`, `${fmtM(careerEarnings(s))} earned`].map((t) => `<span class="chip" style="background:rgba(0,0,0,.35); color:#fff">${t}</span>`).join('')}</div></div>
          </div>
          <div class="lg-score"><div class="eyebrow" style="color:#ffe8a3">Legacy score</div><div class="n"><span id="lgScore">0</span><span class="lg-max">/${LEGACY_TOTAL}</span></div><div class="lg-tier">${tier}</div>${nextTier ? `<div style="font-size:11.5px; color:#c9cfd8">${nextTier.min - s.legacyScore} pts short of ${nextTier.label}</div>` : ''}<div style="font-size:12px; margin-top:6px; color:#c9cfd8">${s.hofRank ? `#${s.hofRank} in the Hall of Fame` : `Outside the Hall of Fame top ${HOF_LIMIT}`}</div></div>
        </div></div>
        <div class="lg-body">
          ${legacyPosterHTML(s)}
          ${chal ? `<div class="chal-result ${chal.achieved ? 'ok' : 'no'}"><div style="font-size:30px">${chal.achieved ? '✅' : '❌'}</div><div><div class="eyebrow">Weekly challenge · ${esc(chal.def.title)}</div><b>${chal.achieved ? 'Challenge complete!' : 'Challenge failed'}</b> <span class="muted">${esc(chal.def.desc)}</span>${chal.rank ? `<div class="dim" style="font-size:12px">#${chal.rank} on this week's board on this device</div>` : ''}</div></div>` : ''}
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap"><button class="btn btn-go btn-lg" onclick="playCareerRecap()">▶ Watch my career in 60 seconds</button><button class="btn btn-lg" onclick="downloadCareerCard()">📸 Career card</button><button class="btn btn-lg" onclick="replaySameSeed()">🔁 Replay this career code</button><button class="btn btn-lg" onclick="resetToSetup()">Start a new career ▸</button></div>
          <div><div class="eyebrow" style="margin-bottom:8px">Career archetypes</div>${s.earnedBadges.length ? `<div class="badges">${s.earnedBadges.map((b, i) => `<div class="badge" style="animation-delay:${0.4 + i * 0.18}s"><div class="b-ic">${BADGE_ICONS[b.id] || '🏅'}</div><div class="b-t">${esc(b.label)}</div><div class="b-d">${esc(b.description)}</div></div>`).join('')}</div>` : '<div class="empty">A solid professional career — no archetype badges this time.</div>'}</div>
          <div id="lgStory">${legacyStoryHTML(s)}</div>
          ${legacyDepthHTML(s)}
          <div class="grid g-2">
            <div class="panel"><div class="panel-head"><span>How your legacy score adds up</span><span class="right">${s.legacyScore} of ${LEGACY_TOTAL}</span></div><div class="panel-body">${legacyBreakdownHTML(parts)}</div></div>
            ${r ? `<div class="panel"><div class="panel-head"><span>Final verdict on the rivalry</span><span class="right ${beatRival ? 'pos-t' : 'neg-t'}">${beatRival ? 'You won it' : `${esc(r.name)} edged it`}</span></div><div class="panel-body"><div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:900"><span>${esc(s.playerName)}</span><span style="color:var(--purple)">${esc(r.name)}</span></div><div class="h2h">
              ${[['Apps', s.stats.appearances, r.apps], [prof.primaryStatType === 'ATTACK' ? 'Goals' : 'Clean sheets', s.stats[statKey], r[statKey]], ['Trophies', s.trophies.length, r.trophies], ["Ballon d'Or", s.stats.ballonDOrs, r.ballonDOrs], ['Clubs', clubs, r.clubs]].map(([l, a, b]) => `<div class="l ${a > b ? 'win' : ''}">${a}</div><div class="m">${l}</div><div class="r ${b > a ? 'win' : ''}">${b}</div>`).join('')}
            </div></div></div>` : ''}
          </div>
          <div class="panel"><div class="panel-head">Final scorecard</div><div class="panel-body">${tilesHTML(careerTiles(s))}</div></div>
          <div class="panel"><div class="panel-head"><span>Your career around the world</span><span class="right">${clubs} club${clubs === 1 ? '' : 's'} · ${new Set(s.clubHistory.map((x) => CLUB_MAP[x.clubId].league)).size} league(s)</span></div><div class="panel-body world-map">${worldMapSVG(s)}</div></div>
          <div class="panel"><div class="panel-head"><span>Club journey</span><span class="right">🌍 tournaments · 🌱 loans</span></div><div class="panel-body">${journeyHTML(s, null, true)}</div></div>
          <div class="grid g-2">
            <div class="panel"><div class="panel-head"><span>Market value</span><span class="right">Peak ${fmtM(s.peakMarketValueM)} at ${s.peakValueAge}</span></div><div class="panel-body">${valueChartSVG({ history: s.valueHistory, h: 210, rival: rivalValueHistory(s) })}</div></div>
            <div class="panel"><div class="panel-head">Final attributes</div><div class="panel-body">${attributesHTML(s, (s.seasonLog[0] || {}).attrsBefore)}<div class="dim" style="font-size:11.5px; margin-top:6px">Arrows compare with age 17.</div></div></div>
          </div>
          <div class="panel"><div class="panel-head">Hall of Fame</div><div class="panel-body">${hofBlockHTML()}</div></div>
          <div class="panel"><div class="panel-head">Trophy cabinet</div><div class="panel-body">${trophyShelfHTML(s)}</div></div>
          <div class="panel"><div class="panel-head">Season by season</div>${seasonTableHTML(s)}</div>
          <div class="panel"><div class="panel-head">Defining moments</div><div class="panel-body" style="max-height:360px; overflow-y:auto">${s.dramaLog.filter((e) => !['INTL_CAP', 'CLUB_RISE', 'CLUB_FALL'].includes(e.type)).map((e) => { const m = metaFor(e.type); const h = splitHeadline(e.headline, e.type); return `<div class="news-item" style="cursor:default"><div class="news-ico" style="background:${m.color}22; color:${m.color}">${m.icon}</div><div><div class="news-title">${esc(h.title)}</div><div class="muted" style="font-size:12px">${esc(h.body)}</div><div class="news-meta">${seasonLabel(e.age)} · Age ${e.age}</div></div></div>`; }).join('')}</div></div>
          <div class="dim" style="text-align:center; font-size:12px">Career code: <span class="num">${esc(careerCode(s.setup))}</span> — share it and a friend can play the same world.</div>
        </div>`;
      $('screenLegacy').scrollTop = 0;
      bindLegacyStory(s);
      const el = $('lgScore');
      const target = s.legacyScore;
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1800);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
        else if (s.hofRank === 1 || target >= 600) { confettiBurst({ count: 200, colors: ['#f2c94c', '#fff1b8', '#ffffff', clubColors(lastClub).c1] }); sfx('trophy'); }
      };
      if (motionOff()) el.textContent = target; else requestAnimationFrame(tick);
    }
    function legacyBreakdownHTML(parts) {
      return Object.entries(LEGACY_MAX).map(([k, max]) => {
        const v = Math.round(parts[k] || 0);
        const full = v >= max;
        return `<div class="lb-row"><div class="lb-h"><span><b>${esc(LEGACY_INFO[k].label)}</b>${full ? ' <span class="pill pill-gold">maxed</span>' : ''}</span><span class="num"><b>${v}</b><span class="dim"> / ${max}</span></span></div><div class="bar"><div style="width:${(v / max) * 100}%; background:${full ? 'var(--gold)' : 'var(--accent)'}"></div></div><div class="dim lb-how">${esc(LEGACY_INFO[k].how)}</div></div>`;
      }).join('');
    }
    function replaySameSeed() {
      const st = gameState.setup;
      Object.assign(setupConfig, { mode: st.mode, position: st.position, continent: st.continent, nation: st.nation, transferInterval: st.transferInterval, agentType: st.agentType, scouting: st.scouting, seed: st.seed });
      const name = gameState.playerName;
      resetToSetup();
      $('inputPlayerName').value = name;
      $('inputRetireAge').value = st.retirementAge;
      renderSetupChoices();
      updateSetupPreview();
      showToast('Same career code loaded', 'Make the same choices and the world will play out identically.');
    }

    /* ---------- Career card (1200×630 PNG for sharing) ---------- */
    function careerCardSVG(s) {
      const pos = POSITION_PROFILES[s.setup.position];
      const lastClub = CLUB_MAP[(s.clubHistory[s.clubHistory.length - 1] || {}).clubId] || null;
      const c = clubColors(lastClub);
      const crest = crestSVG(lastClub, 150).replace('<svg ', '<svg x="70" y="150" ');
      const defs = statDefs(s.setup.position);
      const stat1 = defs[0].k === 'goals' ? s.stats.goals : s.stats.cleanSheets;
      const tiles = [[s.stats.appearances, 'Apps'], [stat1, defs[0].l], [s.trophies.length, 'Trophies'], [s.stats.ballonDOrs, "Ballon d'Or"], [fmtM(s.peakMarketValueM), 'Peak value'], [fmtM(careerEarnings(s)), 'Earned']];
      const total = Math.max(1, s.setup.retirementAge - 17);
      const segs = s.clubHistory.map((st) => { const cc = clubColors(CLUB_MAP[st.clubId]); const x = 290 + ((st.startAge - 17) / total) * 840; const w = Math.max(4, ((st.endAge - st.startAge) / total) * 840 - 3); return `<rect x="${x}" y="520" width="${w}" height="26" rx="3" fill="${cc.c1}" stroke="${cc.c2}" stroke-width="2"/>${w > 90 ? `<text x="${x + 8}" y="538" font-size="13" font-weight="700" fill="${cc.text}">${esc(st.clubName).slice(0, Math.floor(w / 8))}</text>` : ''}`; }).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Segoe UI, Arial, sans-serif">
        <defs><linearGradient id="bgc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.c1}"/><stop offset=".55" stop-color="#14171c"/><stop offset="1" stop-color="#0b0d11"/></linearGradient></defs>
        <rect width="1200" height="630" fill="url(#bgc)"/>
        <circle cx="1100" cy="40" r="230" fill="none" stroke="${c.c2}" stroke-opacity=".25" stroke-width="40"/>
        <text x="70" y="80" font-size="18" font-weight="800" letter-spacing="4" fill="#ffffff" fill-opacity=".75">CAREER RETROSPECTIVE · ${BASE_YEAR}–${BASE_YEAR + s.currentAge - 17}</text>
        <text x="70" y="128" font-size="52" font-weight="900" fill="#ffffff">${esc(s.playerName)}</text>
        ${crest}
        <text x="290" y="190" font-size="22" fill="#e9ebef">${pos.name} · ${esc(getNation(s).name)} · retired at ${s.currentAge}</text>
        ${tiles.map(([v, l], i) => `<g transform="translate(${290 + (i % 3) * 200}, ${230 + Math.floor(i / 3) * 110})"><rect width="185" height="92" rx="8" fill="#000" fill-opacity=".35"/><text x="16" y="50" font-size="34" font-weight="900" fill="#fff">${esc(String(v))}</text><text x="16" y="76" font-size="14" font-weight="700" fill="#aab2bf">${esc(l.toUpperCase())}</text></g>`).join('')}
        <g transform="translate(920, 230)"><rect width="210" height="202" rx="12" fill="#000" fill-opacity=".5" stroke="#f2c94c" stroke-opacity=".7"/><text x="105" y="44" text-anchor="middle" font-size="15" font-weight="800" letter-spacing="2" fill="#ffe8a3">LEGACY SCORE</text><text x="105" y="118" text-anchor="middle" font-size="68" font-weight="900" fill="#f2c94c">${s.legacyScore}</text><text x="105" y="140" text-anchor="middle" font-size="14" font-weight="700" fill="#c9cfd8">OUT OF ${LEGACY_TOTAL}</text><text x="105" y="166" text-anchor="middle" font-size="16" font-weight="900" letter-spacing="2" fill="#ffe8a3">${esc(legacyTier(s.legacyScore).toUpperCase())}</text><text x="105" y="188" text-anchor="middle" font-size="13" fill="#c9cfd8">${s.hofRank ? `#${s.hofRank} Hall of Fame` : ''}</text></g>
        <text x="290" y="500" font-size="15" font-weight="700" fill="#aab2bf">${esc(s.earnedBadges.map((b) => b.label).join(' · ') || 'Professional career')}</text>
        ${segs}
        <text x="70" y="600" font-size="14" fill="#8d95a3">Football Career &amp; Transfer Simulator · career code ${esc(careerCode(s.setup))}</text>
      </svg>`;
    }
    function downloadCareerCard() {
      const svg = careerCardSVG(gameState);
      const name = `${gameState.playerName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-career`;
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = 1200; cv.height = 630;
        cv.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);
        cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${name}.png`; a.click(); showToast('Career card saved', `${name}.png`); });
      };
      img.onerror = () => { const a = document.createElement('a'); a.href = svgUrl; a.download = `${name}.svg`; a.click(); showToast('Career card saved', `${name}.svg (PNG not supported here)`); };
      img.src = svgUrl;
    }
