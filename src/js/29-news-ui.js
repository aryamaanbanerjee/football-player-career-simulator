    /* ==========================================================================
     * v13 · ONE NEWS FEED, PEOPLE YOU KNOW, AFTER-SEASON SCREEN
     * ========================================================================== */
    const CLUB_NEWS_TYPES = new Set(['MANAGER', 'RELEGATED', 'PROMOTED', 'CLUB_TAKEOVER', 'TAKEOVER', 'NEW_MANAGER']);
    function feedItems(s) {
      const read = s.inboxRead || 0;
      const out = s.dramaLog.map((e, i) => {
        const m = metaFor(e.type); const h = splitHeadline(e.headline, e.type);
        return { key: `d${i}`, age: e.age, order: i, ic: m.icon, color: m.color, cat: m.cat, title: h.title, body: h.body, flavor: flavorText(e), clubId: e.clubId, scope: CLUB_NEWS_TYPES.has(e.type) ? 'club' : 'you', unread: i >= read };
      });
      const w = s.v11;
      if (w) Object.entries(w.news).forEach(([age, list]) => list.forEach((n, j) => {
        // Items about you already appear from your own news; keep world items and your club's manager news only once.
        if (n.mine && n.kind === 'manager') return;
        out.push({ key: `w${age}_${j}`, age: Number(age), order: 1e6 + j, ic: n.ic, color: '#8b93a1', cat: n.mine ? 'You' : 'Around the world', title: n.mine ? 'About you' : ({ record: 'Transfer record', move: 'Transfer', ballon: "Ballon d'Or", league: 'Champions', club: 'Club news', retire: 'Retirement', kid: 'Wonderkid', manager: 'Manager', promise: 'Your word', rival: 'Your rival' })[n.kind] || 'World', body: n.text, flavor: '', scope: n.mine ? 'you' : 'world', unread: false });
      }));
      return out.sort((a, b) => b.age - a.age || a.order - b.order);
    }
    function selectFeed(key) { ui.feedSel = key; renderPage(); }
    function setFeedFilter(f) { ui.feedFilter = f; ui.feedSel = null; renderPage(); }
    function renderNewsFeed() {
      const s = gameState;
      const all = feedItems(s);
      const head = (n) => `<div class="page-head"><div><div class="eyebrow">You, your club and the world</div><h1>News</h1><div class="sub">${n} item(s)</div></div></div>`;
      if (!all.length) return `${head(0)}<div class="empty">No news yet. Headlines arrive as your career unfolds.</div>`;
      const f = ui.feedFilter || 'all';
      const counts = { all: all.length, you: all.filter((x) => x.scope === 'you').length, club: all.filter((x) => x.scope === 'club').length, world: all.filter((x) => x.scope === 'world').length };
      const items = f === 'all' ? all : all.filter((x) => x.scope === f);
      if (!ui.feedSel || !items.some((x) => x.key === ui.feedSel)) ui.feedSel = items[0] && items[0].key;
      const cur = items.find((x) => x.key === ui.feedSel);
      const club = cur && cur.clubId ? CLUB_MAP[cur.clubId] : null;
      const shown = items.slice(0, 250);
      return `${head(all.length)}
        <div class="feed-filters">${[['all', 'All'], ['you', 'You'], ['club', 'Club'], ['world', 'World']].map(([id, l]) => `<button class="chip-btn ${f === id ? 'on' : ''}" onclick="setFeedFilter('${id}')">${l} <span>${counts[id]}</span></button>`).join('')}</div>
        ${!items.length ? '<div class="empty">Nothing here yet.</div>' : `<div class="inbox">
          <div class="panel inbox-list">${shown.map((e) => `<div class="inbox-row ${e.key === ui.feedSel ? 'sel' : ''} ${e.unread ? 'unread' : ''}" onclick="selectFeed('${e.key}')"><div class="news-ico" style="background:${e.color}22; color:${e.color}">${e.ic}</div><div style="min-width:0"><div class="news-title">${esc(e.title)}</div><div class="muted" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(e.body)}</div><div class="news-meta">${seasonLabel(e.age)} · ${e.scope === 'world' ? 'World' : e.scope === 'club' ? 'Club' : `Age ${e.age}`}</div></div></div>`).join('')}</div>
          <div style="overflow-y:auto">${cur ? `<div class="paper">
            <div class="paper-mast"><span>The Football Gazette</span><span>${seasonLabel(cur.age)}</span></div>
            <span class="kicker" style="background:${cur.color}">${esc(cur.cat)} · ${esc(cur.title)}</span>
            <h2>${esc(cur.body)}</h2>${cur.flavor ? `<p>${esc(cur.flavor)}</p>` : ''}
            ${cur.scope !== 'world' ? `<p style="margin-top:12px; font-size:13px; color:#5b564a">${esc(s.playerName)}, age ${cur.age}${club ? ` · ${esc(club.name)}` : ''}</p>` : ''}
          </div>` : ''}</div>
        </div>`}`;
    }

    /* ---------- People you know (World › World stars) ---------- */
    function peopleYouKnowHTML(s) {
      const rows = [];
      const lastSe = (s.seasonLog || [])[s.seasonLog.length - 1];
      const r = s.rival;
      if (r) rows.push({ who: 'Your academy rival', name: r.name, clubId: r.clubId, status: r.retired ? 'retired' : (lastSe && lastSe.rival ? `last season ${lastSe.rival.rating.toFixed(2)}` : ''), line: `${r.goals || 0} goals · ${r.trophies || 0} trophies` });
      const st = s.story;
      if (st && st.mate) {
        const last = st.mate.seasons[st.mate.seasons.length - 1];
        rows.push({ who: 'Your best mate', name: st.cast.mate, clubId: st.mate.clubId || st.cast.mateClubId, status: st.mate.retired ? `retired at ${st.mate.retiredAge}` : last ? `last season ${last.rating.toFixed(2)}` : '', line: `${st.mate.seasons.reduce((a, x) => a + (x.goals || 0), 0)} goals in ${st.mate.seasons.length} seasons` });
      }
      if (st && st.protege) {
        const p = st.protege; const last = p.last || p.seasons[p.seasons.length - 1];
        rows.push({ who: 'The kid you mentored', name: st.cast.protege, clubId: p.clubId, status: last ? `last season ${(last.rating || p.rating).toFixed(2)}` : '', line: p.capped ? 'now an international' : p.moved ? 'moved on to a bigger club' : 'still learning' });
      }
      if (!rows.length) return '';
      return `<div class="panel"><div class="panel-head">People you know</div><div class="panel-body people">${rows.map((x) => `<div class="person"><div class="dim" style="font-size:11px; text-transform:uppercase; letter-spacing:.08em">${esc(x.who)}</div><div><b>${esc(x.name)}</b> ${CLUB_MAP[x.clubId] ? `· ${crestSVG(CLUB_MAP[x.clubId], 14)} ${esc(CLUB_MAP[x.clubId].name)}` : ''}</div><div class="dim" style="font-size:12px">${esc([x.status, x.line].filter(Boolean).join(' · '))}</div></div>`).join('')}</div></div>`;
    }

    /* ---------- After the season: press and the world on one screen ---------- */
    function worldRoundupHTML(s, se) {
      const w = s.v11;
      if (!w) return '';
      const pod = w.ballon[se.age] || [];
      const champs = w.champions[se.age] || {};
      const big = Object.entries(champs).filter(([lg]) => (LEAGUES[lg] || {}).prestige >= 1.15).slice(0, 5);
      const cont = Object.values(w.contChamps[se.age] || {}).slice(0, 4);
      return `<div class="wc-grid">
          <div><div class="wc-h">Ballon d’Or</div>${pod.map((p) => `<div class="bd-row ${p.you ? 'you' : p.rival ? 'rival' : ''}"><b>${p.rank}</b><span>${esc(p.name)}${p.you ? ' (you)' : p.rival ? ' (your rival)' : ''}</span><em>${esc(p.clubName)}</em></div>`).join('')}</div>
          <div><div class="wc-h">Champions</div>${big.map(([lg, k]) => `<div class="bd-row"><span>${crestOf(k)}</span><span>${esc(clubNameOf(k))}</span><em>${esc(lg)}</em></div>`).join('')}${cont.map((c) => `<div class="bd-row"><span>${crestOf(c.clubId)}</span><span>${esc(clubNameOf(c.clubId))}</span><em>${esc(c.name)}</em></div>`).join('')}</div>
        </div>${worldStripHTML(s, [se.age])}`;
    }
