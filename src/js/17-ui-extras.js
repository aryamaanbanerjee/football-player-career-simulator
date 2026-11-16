    /* ==========================================================================
     * v6 EXTRAS — plain language, glossary, Fit score, kits, fans, near misses,
     * key-match commentary, season objectives, ceremonies, front pages,
     * deadline-day arrivals, world map, career recap, weekly challenges.
     * Everything here is presentation: it never changes simulation outcomes.
     * ========================================================================== */

    /* ---------- Plain-language odds ---------- */
    function plainOdds(p) {
      if (p == null) return '—';
      if (p < 0.015) return 'Very unlikely';
      if (p < 0.45) return `About 1 in ${Math.max(2, Math.round(1 / p))}`;
      if (p < 0.56) return 'A coin flip';
      if (p < 0.93) return `About ${Math.round(p * 10)} in 10`;
      return 'Almost certain';
    }
    function plainShort(p) {
      if (p == null) return '—';
      if (p < 0.015) return 'Unlikely';
      if (p < 0.45) return `1 in ${Math.max(2, Math.round(1 / p))}`;
      if (p < 0.56) return '50/50';
      if (p < 0.93) return `${Math.round(p * 10)} in 10`;
      return 'Near-certain';
    }

    /* ---------- Glossary tooltips ---------- */
    const GLOSSARY = {
      PROSPECT: 'Prospect: a youngster on the fringe — plays roughly 1 game in 5.',
      ROTATION: 'Rotation: a squad player — starts about half the games.',
      KEY_PLAYER: 'Key Player: a regular starter — about 3 games in 4.',
      STAR: 'Star Player: the team is built around you — nearly every game, plus a ratings boost.',
      CLAUSE: 'Release clause: the fee at which another club can buy you without your club’s permission. Low = easier to move on; high or none = more security.',
      RUNDOWN: 'Running down your contract: let it expire so you can leave for free next window — but you play less in the final year.',
      LOYALTY: 'Loyalty: seasons at your current club. 3+ and 6+ seasons boost trophy odds and open the Club Legend path.',
      FIT: 'Fit: how well this offer matches the priority you picked, from 35 (worst here) to 100 (best here). It compares this window’s offers with each other.',
      OVERALL: 'Overall: your attributes weighted for your position, on Football Manager’s 1–20 scale.',
      FREE: 'Free transfer: you are out of contract, so no fee is paid (a Bosman move).',
      WAGE: 'Weekly wage. It adds up to your career earnings.',
      LEGACY: 'Legacy score: your whole career scored out of 1000 across eight capped categories.',
      FEE: 'Transfer fee paid to your current club. It counts towards your career transfer total.',
      ODDS: 'Odds come from simulating your next seasons 150 times with the real game engine.',
    };
    const help = (k) => (GLOSSARY[k] ? `<span class="help" tabindex="0" role="note" aria-label="${esc(GLOSSARY[k])}" data-tip="${esc(GLOSSARY[k])}">?</span>` : '');

    /* ---------- Priorities & Fit score ---------- */
    const PRIORITIES = {
      BALANCED: { label: 'Balanced', icon: '⚖️', w: { tro: 0.3, min: 0.3, mon: 0.2, val: 0.2 } },
      TROPHIES: { label: 'Trophies', icon: '🏆', w: { tro: 0.75, min: 0.1, val: 0.15 } },
      MINUTES: { label: 'Game time', icon: '⏱', w: { min: 0.75, tro: 0.1, val: 0.15 } },
      MONEY: { label: 'Money', icon: '💶', w: { mon: 0.75, val: 0.25 } },
      LEGACY: { label: 'Legacy', icon: '🌟', w: { tro: 0.35, min: 0.15, val: 0.2, awd: 0.3 } },
    };
    const FIT_TEXT = {
      tro: ['Best trophy chances', 'Good trophy chances', 'Weak trophy chances'],
      min: ['Most game time', 'Plenty of game time', 'Least game time'],
      mon: ['Best pay package', 'Good money', 'Lowest pay'],
      val: ['Fastest value growth', 'Value should rise', 'Slowest value growth'],
    };
    function computeFit() {
      ui.fit = {};
      ui.bestFit = null;
      const s = gameState;
      const opts = liveOptions().filter((o) => ui.proj[o.key]);
      if (!opts.length) return;
      const raw = opts.map((o) => {
        const p = ui.proj[o.key];
        return { key: o.key, tro: p.pAnyMajor + 0.5 * p.pBallon + 0.04 * p.trophiesMean, min: p.apps + (p.rating - 7) * 8, mon: (o.data.wageM || 0) * p.years + 0.25 * p.valueMed, val: p.valueMed / Math.max(0.1, s.marketValueM), awd: p.pAward + p.pPodium + p.pBallon };
      });
      ['tro', 'min', 'mon', 'val', 'awd'].forEach((m) => {
        const vals = raw.map((r) => r[m]);
        const lo = Math.min(...vals); const hi = Math.max(...vals);
        raw.forEach((r) => { r[`${m}N`] = hi - lo < 1e-9 ? 0.5 : (r[m] - lo) / (hi - lo); });
      });
      const pr = PRIORITIES[s.priority] || PRIORITIES.BALANCED;
      raw.forEach((r) => {
        let sc = 0;
        Object.entries(pr.w).forEach(([m, w]) => { sc += w * r[`${m}N`]; });
        ui.fit[r.key] = { fit: opts.length === 1 ? 80 : Math.round(35 + 65 * sc), reason: fitReason(r, opts.length) };
      });
      const best = Object.entries(ui.fit).sort((a, b) => b[1].fit - a[1].fit)[0];
      ui.bestFit = best && opts.length > 1 ? best[0] : null;
    }
    function fitReason(r, n) {
      if (n < 2) return 'Your only option this window';
      const ms = ['tro', 'min', 'mon', 'val'];
      const sorted = [...ms].sort((a, b) => r[`${b}N`] - r[`${a}N`]);
      const top = sorted[0]; const low = sorted[sorted.length - 1];
      const strong = r[`${top}N`] >= 0.999 ? FIT_TEXT[top][0] : r[`${top}N`] >= 0.6 ? FIT_TEXT[top][1] : null;
      const weak = r[`${low}N`] <= 0.001 ? FIT_TEXT[low][2] : null;
      if (strong && weak) return `${strong}, but ${weak.toLowerCase()}`;
      if (strong) return strong;
      if (weak) return `Middle of the pack — ${weak.toLowerCase()}`;
      return 'A middle-of-the-road option';
    }
    const fitColor = (f) => (f >= 85 ? '#2fd27a' : f >= 70 ? '#9be36b' : f >= 55 ? '#f2c94c' : '#8b93a1');
    function fitBadge(key, size = 'md') {
      const lvl = scoutLevel();
      const f = ui.fit && ui.fit[key];
      if (lvl === 'BLIND' || !f) return '';
      const label = lvl === 'FOG' ? (f.fit >= 85 ? 'Great' : f.fit >= 70 ? 'Good' : f.fit >= 55 ? 'OK' : 'Poor') : f.fit;
      return `<div class="fit fit-${size}" style="--fc:${fitColor(f.fit)}" title="Fit for your priority: ${PRIORITIES[gameState.priority || 'BALANCED'].label}"><b>${label}</b><span>fit</span></div>`;
    }
    function setPriority(p) {
      gameState.priority = p;
      computeFit();
      saveCareer(gameState);
      sfx('click');
      renderTopbar();
      renderPage();
    }
    function priorityBarHTML() {
      if (scoutLevel() === 'BLIND') return '';
      const cur = gameState.priority || 'BALANCED';
      return `<div class="priority-bar"><span class="pb-q">What matters most right now?</span><div class="seg">${Object.entries(PRIORITIES).map(([id, p]) => `<button class="${cur === id ? 'on' : ''}" onclick="setPriority('${id}')">${p.icon} ${p.label}</button>`).join('')}</div>${help('FIT')}</div>`;
    }

    /* ---------- Kit (shirt back with name & number) ---------- */
    function shirtSVG(club, name, number, size = 120) {
      const { c1, c2, text } = clubColors(club);
      const id = `sh${++svgSeq}`;
      const pat = hashStr(club ? club.id : 'academy') % 4;
      const body = 'M30 8 L48 3 Q60 11 72 3 L90 8 L117 30 L104 52 L92 45 L92 125 Q60 131 28 125 L28 45 L16 52 L3 30 Z';
      const patterns = [
        [36, 52, 68, 84].map((x) => `<rect x="${x}" y="0" width="8" height="140" fill="${c2}"/>`).join(''),
        `<path d="M3 30 L30 8 L28 45 L16 52Z" fill="${c2}"/><path d="M117 30 L90 8 L92 45 L104 52Z" fill="${c2}"/>`,
        `<rect x="0" y="58" width="120" height="12" fill="${c2}"/><rect x="0" y="86" width="120" height="12" fill="${c2}"/>`,
        `<path d="M20 20 L110 120 L95 130 L5 30Z" fill="${c2}" opacity=".85"/>`,
      ][pat];
      const surname = esc(String((name || '').trim().split(' ').pop() || name).toUpperCase().slice(0, 12));
      const outline = hexLum(text) > 0.5 ? '#111' : '#fff';
      return `<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 120 132" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="120" height="132" fill="${c1}"/>${patterns}</g><path d="${body}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="2"/><path d="M48 3 Q60 11 72 3" fill="none" stroke="${c2}" stroke-width="3"/><text x="60" y="42" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="${surname.length > 9 ? 9 : 11}" letter-spacing="1" fill="${text}" stroke="${outline}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke">${surname}</text><text x="60" y="100" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="900" font-size="50" fill="${text}" stroke="${outline}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${number || ''}</text></svg>`;
    }

    /* ---------- Fans ---------- */
    function seededPicker(key) {
      let h = hashStr(key) || 1;
      return () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), h | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    const FAN_TEMPLATES = {
      betrayed: ['Never forget what you did. 🐍', 'Burned the shirt. Hope the money was worth it.', 'Judas. Enjoy the noise at the derby.', 'Snake. Absolute snake.'],
      farewell: ['Thanks for everything, {first}. Go well 👋', 'Gutted to see you go, but fair play.', 'One of ours. Always welcome back.', 'Shame — we never replaced you properly.'],
      arrivalBig: ['€{fee}M?! Better be worth every cent 👀', 'WHAT A SIGNING 🔥🔥', 'Shirt ordered. #{num} on the back.', 'Statement signing. We mean business.'],
      arrival: ['Welcome, {first}! Let’s go 🙌', 'Didn’t know much about him — excited now.', 'Decent business. Let’s see him in the derby.', 'Give him time to settle, people.'],
      arrivalRival: ['From THEM? Don’t trust him yet.', 'Earn the badge first, mate.', 'Wild. Never thought I’d see that shirt here.'],
      homecoming: ['HE’S COME HOME 😭❤️', 'Where it all started. Goosebumps.', 'Prodigal son returns! Massive.'],
      stay: ['Loyalty. That’s what this club is about ❤️', 'Sign him for life 🙌', 'Glad he’s staying. Big season ahead.'],
      trophy: ['CHAMPIONS!!! {first} you legend 🏆', 'What a season. What a player.', 'Frame that medal, {first} 😭'],
      great: ['Best player in the league. No debate.', 'Ballon d’Or shout? Absolutely.', 'Every week. Every single week.'],
      poor: ['Needs a big pre-season.', 'Off the pace this year.', 'Not his season. Back him though.'],
      hostile: ['Booed again. Deserved.', 'Just let him go already.', 'Worst attitude in the squad.'],
    };
    function fanHandle(club, i) {
      const code = clubCode(club).replace(/[^A-Z0-9]/gi, '');
      return [`@${code}_Ultras`, `@${code}TilIDie`, `@Proper${code}Fan`, `@${code}Faithful`, `@The${code}Report`][i % 5];
    }
    function fanPosts(kind, club, extra = {}, key = '') {
      if (!club) return [];
      const r = seededPicker(`${key}|${kind}|${club.id}|${gameState ? gameState.windowCount : 0}`);
      const pool = FAN_TEMPLATES[kind] || FAN_TEMPLATES.arrival;
      const first = esc(((gameState && gameState.playerName) || '').split(' ')[0]);
      const picks = [];
      const used = new Set();
      for (let i = 0; i < Math.min(2, pool.length); i++) {
        let j = Math.floor(r() * pool.length);
        while (used.has(j)) j = (j + 1) % pool.length;
        used.add(j);
        picks.push({ handle: fanHandle(club, Math.floor(r() * 5)), text: pool[j].replace('{first}', first).replace('{fee}', extra.fee != null ? Math.round(extra.fee) : '').replace('{num}', extra.num || '') });
      }
      return picks;
    }
    function fanPostsHTML(posts, club) {
      if (!posts.length) return '';
      const c = clubColors(club);
      return `<div class="fan-posts">${posts.map((p, i) => `<div class="fan-post" style="animation-delay:${i * 0.25}s"><div class="fan-av" style="${readablePair(c.c1, c.text)}">${esc(clubCode(club).slice(0, 2))}</div><div><div class="fan-h">${esc(p.handle)}</div><div class="fan-t">${esc(p.text)}</div></div></div>`).join('')}</div>`;
    }
    function moodMeterHTML(s, clubId) {
      const m = moodOf(s, clubId);
      const [, label, emoji] = moodLabel(m);
      return `<div class="mood"><div class="mood-bar"><div style="width:${m}%"></div><span style="left:${m}%">${emoji}</span></div><div class="mood-l"><b>${label}</b> <span class="dim">${m}/100</span></div></div>`;
    }

    /* ---------- Near misses & things within reach ---------- */
    function nearMisses(se, s) {
      const out = [];
      const prof = POSITION_PROFILES[s.setup.position];
      if (!se.onLoan) {
        if (prof.primaryStatType === 'ATTACK' && se.goals >= 25 && se.goals < 30) out.push(`${30 - se.goals} goal${30 - se.goals > 1 ? 's' : ''} short of the Golden Boot`);
        if (se.assists >= 16 && se.assists < 20) out.push(`${20 - se.assists} assist${20 - se.assists > 1 ? 's' : ''} short of the Playmaker award`);
        if (prof.primaryStatType !== 'ATTACK' && se.cleanSheets >= 16 && se.cleanSheets < 20) out.push(`${20 - se.cleanSheets} clean sheet${20 - se.cleanSheets > 1 ? 's' : ''} short of the Golden Glove`);
      }
      if (se.bdRank >= 4 && se.bdRank <= 5) out.push(`Just missed the Ballon d'Or podium (${ordinal(se.bdRank)})`);
      if (se.tournament && !se.tournament.calledUp) out.push(`Missed the ${se.tournament.title} squad`);
      const t = s.clubTallies[se.clubId];
      if (t && !se.onLoan) {
        const rec = clubRecord(se.clubId);
        const k = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
        const gap = rec[k] - t[k];
        if (gap > 0 && gap <= Math.max(8, rec[k] * 0.12)) out.push(`${gap} ${k === 'goals' ? 'goals' : 'clean sheets'} from the ${CLUB_MAP[se.clubId].name} record`);
      }
      if (s.stats.appearances < 500 && s.stats.appearances >= 460) out.push(`${500 - s.stats.appearances} games from 500 career appearances`);
      return out;
    }
    function withinReach(s) {
      const items = [];
      const prof = POSITION_PROFILES[s.setup.position];
      const k = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
      const label = k === 'goals' ? 'goals' : 'clean sheets';
      if (s.currentClubId && s.clubTallies[s.currentClubId]) {
        const t = s.clubTallies[s.currentClubId];
        const rec = clubRecord(s.currentClubId);
        if (!s.clubRecordsBroken.some((r) => r.clubId === s.currentClubId && r.type === k)) items.push({ label: `${CLUB_MAP[s.currentClubId].name} ${label} record`, cur: t[k], target: rec[k] });
        if (t.seasons < 6) items.push({ label: 'Seasons towards a retired shirt', cur: t.seasons, target: 6 });
      }
      if (s.stats.appearances < 500) items.push({ label: '500 career appearances', cur: s.stats.appearances, target: 500 });
      if (s.stats[k] < 100) items.push({ label: `100 career ${label}`, cur: s.stats[k], target: 100 });
      if (s.stats.internationalCaps < 100) items.push({ label: '100 international caps', cur: s.stats.internationalCaps, target: 100 });
      if (careerEarnings(s) < 150) items.push({ label: '€150M earned (Money Man)', cur: Math.round(careerEarnings(s)), target: 150 });
      return items.filter((x) => x.cur > 0).sort((a, b) => b.cur / b.target - a.cur / a.target).slice(0, 4);
    }
    function withinReachHTML(s) {
      const items = withinReach(s);
      if (!items.length) return '<div class="dim">Play a season to start chasing records and milestones.</div>';
      return items.map((x) => `<div class="reach"><div class="reach-h"><span>${esc(x.label)}</span><span class="num">${x.cur}/${x.target}</span></div><div class="bar"><div style="width:${Math.min(100, (x.cur / x.target) * 100)}%; background:${x.cur / x.target >= 0.8 ? 'var(--gold)' : 'var(--accent)'}"></div></div></div>`).join('');
    }

    /* ---------- Key match of the season (live text commentary) ---------- */
    function pickOpponent(club, filter) {
      const pool = CLUBS.filter((c) => c.id !== club.id && filter(c));
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : CLUBS.find((c) => c.id !== club.id);
    }
    function buildKeyMatch(se, s) {
      const club = se.onLoan ? findClubByName(se.loanClubName) || CLUB_MAP[se.clubId] : CLUB_MAP[se.clubId];
      const leagueMeta = LEAGUES[club.league] || { domesticCup: 'Cup' };
      const prof = POSITION_PROFILES[s.setup.position];
      let comp; let opp; let mustWin = false; let isFinal = false;
      const cont = se.trophies.find((t) => t.category === 'CONTINENTAL');
      const cup = se.trophies.find((t) => t.category === 'DOMESTIC_CUP');
      const league = se.trophies.find((t) => t.category === 'DOMESTIC_LEAGUE');
      const derby = club.rivals.map((id) => CLUB_MAP[id]).filter((c) => c && c.league === club.league);
      if (cont) { comp = `${cont.title.replace(' Winner', '')} final`; opp = pickOpponent(club, (c) => c.continent === club.continent && c.league !== club.league && c.starRating >= 4); mustWin = true; isFinal = true; }
      else if (cup) { comp = `${leagueMeta.domesticCup} final`; opp = pickOpponent(club, (c) => c.league === club.league); mustWin = true; isFinal = true; }
      else if (league) { comp = 'Title decider'; opp = pickOpponent(club, (c) => c.league === club.league && c.starRating >= Math.max(1, club.starRating - 1)); mustWin = true; }
      else if (derby.length) { comp = 'Derby day'; opp = derby[Math.floor(Math.random() * derby.length)]; }
      else { comp = 'Big game'; opp = pickOpponent(club, (c) => c.league === club.league && c.starRating >= club.starRating); }
      let res;
      if (mustWin) res = 'W';
      else {
        const pw = clamp(0.35 + (se.rating - 7) * 0.25 + (club.starRating - opp.starRating) * 0.08, 0.1, 0.85);
        const r = Math.random();
        res = r < pw ? 'W' : r < pw + 0.25 ? 'D' : 'L';
      }
      let gf; let ga;
      if (res === 'W') { gf = 1 + Math.floor(Math.random() * 3); ga = Math.floor(Math.random() * gf); }
      else if (res === 'D') { gf = Math.floor(Math.random() * 3); ga = gf; }
      else { ga = 1 + Math.floor(Math.random() * 3); gf = Math.floor(Math.random() * ga); }
      const surname = String(s.playerName).trim().split(' ').pop();
      let mine = 0;
      if (prof.primaryStatType === 'ATTACK' && gf > 0 && se.goals > 0) {
        if (Math.random() < Math.min(0.9, (se.goals / Math.max(1, se.apps)) * 1.8)) mine = gf >= 2 && Math.random() < 0.3 ? 2 : 1;
      } else if (gf > 0 && Math.random() < 0.08) mine = 1;
      const mins = new Set();
      while (mins.size < gf + ga) mins.add(3 + Math.floor(Math.random() * 88));
      const order = [...mins].sort((a, b) => a - b);
      const sides = [...Array(gf).fill('F'), ...Array(ga).fill('A')].sort(() => Math.random() - 0.5);
      const FINISH = ['curls it into the top corner', 'smashes it in at the near post', 'heads home from the corner', 'rounds the keeper and slots it in', 'lashes in a volley', 'buries a penalty'];
      const MATE = ['A thumping header from the centre-back', 'The No. 10 drills one in from distance', 'A scrappy finish from the edge of the six-yard box', 'The winger cuts inside and finds the far corner'];
      const AGAINST = ['A sucker-punch on the counter', 'A deflected strike wrong-foots everyone', 'A towering header from a set piece', 'A defensive mix-up is punished'];
      const events = [{ min: 0, text: `Kick-off. ${comp}: ${club.name} v ${opp.name}.`, kind: 'ko' }];
      let a = 0; let b = 0; let mineLeft = mine;
      order.forEach((m, i) => {
        if (sides[i] === 'F') {
          a++;
          if (mineLeft > 0) { mineLeft--; events.push({ min: m, text: `GOAL! ${surname} ${FINISH[Math.floor(Math.random() * FINISH.length)]}! ${a}–${b}`, kind: 'goal-me', score: [a, b] }); }
          else events.push({ min: m, text: `GOAL! ${MATE[Math.floor(Math.random() * MATE.length)]}. ${a}–${b}`, kind: 'goal', score: [a, b] });
        } else { b++; events.push({ min: m, text: `${opp.name} score. ${AGAINST[Math.floor(Math.random() * AGAINST.length)]}. ${a}–${b}`, kind: 'goal-against', score: [a, b] }); }
      });
      const flavour = prof.category === 'GK'
        ? [`SAVE! ${surname} tips a rocket over the bar.`, `${surname} comes off his line to smother a one-on-one.`]
        : prof.category === 'DEF' ? [`Huge block from ${surname} on the goal line!`, `${surname} wins a crunching tackle — the crowd roars.`]
          : [`${surname} skips past two defenders… shot saved!`, `${surname} whips in a dangerous cross, just cleared.`];
      flavour.forEach((t) => events.push({ min: 10 + Math.floor(Math.random() * 78), text: t, kind: 'chance' }));
      if (se.yellows >= 5 && Math.random() < 0.5) events.push({ min: 30 + Math.floor(Math.random() * 55), text: `Yellow card for ${surname}.`, kind: 'card' });
      events.sort((x, y) => x.min - y.min);
      const ht = order.filter((m) => m <= 45);
      const htScore = [sides.slice(0, ht.length).filter((x) => x === 'F').length, sides.slice(0, ht.length).filter((x) => x === 'A').length];
      events.splice(events.findIndex((e) => e.min > 45) === -1 ? events.length : events.findIndex((e) => e.min > 45), 0, { min: 45, text: `Half-time: ${htScore[0]}–${htScore[1]}.`, kind: 'ht' });
      const end = isFinal && res === 'W' ? `Full-time: ${gf}–${ga}. 🏆 ${club.name} lift the trophy!` : `Full-time: ${gf}–${ga}. ${res === 'W' ? 'Three points!' : res === 'D' ? 'Honours even.' : 'A painful defeat.'}`;
      events.push({ min: 90, text: end, kind: 'ft' });
      return { comp, club, opp, gf, ga, res, events };
    }
    async function playKeyMatch(m, fast) {
      const host = $('rvMatch');
      if (!host) return;
      const ca = clubColors(m.club); const cb = clubColors(m.opp);
      host.innerHTML = `<div class="match"><div class="match-head"><span class="eyebrow">🎙 ${esc(m.comp)}</span></div><div class="scoreboard"><div class="sb-team">${crestSVG(m.club, 30)}<b>${esc(m.club.name)}</b></div><div class="sb-score" style="--ca:${ca.c1}; --cb:${cb.c1}"><span id="sbA">0</span><span class="sb-min" id="sbMin">0'</span><span id="sbB">0</span></div><div class="sb-team r"><b>${esc(m.opp.name)}</b>${crestSVG(m.opp, 30)}</div></div><div class="match-feed" id="matchFeed"></div></div>`;
      const feed = $('matchFeed');
      sfx('whistle');
      for (const e of m.events) {
        if (!feed) return;
        $('sbMin').textContent = `${e.min}'`;
        if (e.score) { $('sbA').textContent = e.score[0]; $('sbB').textContent = e.score[1]; }
        feed.insertAdjacentHTML('afterbegin', `<div class="mf mf-${e.kind}"><span class="mf-min">${e.min}'</span><span>${esc(e.text)}</span></div>`);
        if (e.kind === 'goal-me' || e.kind === 'goal') { sfx('crowd'); if (e.kind === 'goal-me' && !RV.skip) confettiBurst({ count: 50, colors: [ca.c1, ca.c2, '#fff'], y: 0.4 }); }
        if (e.kind === 'ft') sfx('whistle');
        await rvWait(fast ? 380 : 950);
      }
    }

    /* ---------- Season objectives (set before kick-off, ticked after) ---------- */
    function buildObjectives(s, ctx, idx) {
      const p = ctx.proj;
      const years = Math.max(1, ctx.win.years);
      const perSeason = (pw) => 1 - Math.pow(1 - clamp(pw, 0, 0.999), 1 / years);
      const club = CLUB_MAP[s.currentClubId];
      const prof = POSITION_PROFILES[s.setup.position];
      const age = ctx.win.startAge + idx;
      const out = [];
      const tour = TOURNAMENT_SCHEDULE[age];
      if (tour && age >= 18) {
        const n = getNation(s);
        const need = (age === 18 ? 16 : 22) + Math.round((n.str - 1) * 6);
        out.push({ id: 'squad', text: `Make the ${n.name} squad for the ${tour.type === 'WORLD_CUP' ? 'World Cup' : CONTINENTS[s.setup.continent].tournamentName.replace(/^(UEFA|CONMEBOL|AFC|CAF|CONCACAF)\s/, '')}`, sub: `${need}+ games and a good rating`, check: (se) => !!(se.tournament && se.tournament.calledUp) });
      }
      if (!s.relegatedLastWindow && club.starRating >= 3) out.push({ id: 'league', text: `Win the ${club.league}`, sub: p ? plainShort(perSeason(p.pLeague)) : '', check: (se) => se.trophies.some((t) => t.category === 'DOMESTIC_LEAGUE') });
      else if (s.relegatedLastWindow) out.push({ id: 'promo', text: 'Win promotion', sub: 'About 6 in 10', check: (se) => se.events.some((e) => e.type === 'PROMOTED') });
      else out.push({ id: 'silver', text: 'Win any trophy', sub: p ? plainShort(perSeason(p.pAnyTrophy)) : '', check: (se) => se.trophies.length > 0 });
      if (p) {
        if (prof.primaryStatType === 'ATTACK') { const t = Math.max(3, Math.round(p.goals * 1.05)); out.push({ id: 'goals', text: `Score ${t}+ goals`, sub: 'Your projected tally', check: (se) => se.goals >= t }); }
        else { const t = Math.max(3, Math.round(p.cs * 1.05)); out.push({ id: 'cs', text: `Keep ${t}+ clean sheets`, sub: 'Your projected tally', check: (se) => se.cleanSheets >= t }); }
        if (['PROSPECT', 'ROTATION'].includes(s.squadRole)) { const t = Math.round(p.apps); out.push({ id: 'apps', text: `Play ${t}+ games`, sub: 'Earn a bigger role', check: (se) => se.apps >= t }); }
      }
      const tally = s.clubTallies[club.id];
      const k = prof.primaryStatType === 'ATTACK' ? 'goals' : 'cleanSheets';
      if (tally && p) {
        const rec = clubRecord(club.id);
        const gap = rec[k] - tally[k];
        if (gap > 0 && gap <= (k === 'goals' ? p.goals : p.cs) * 1.3) out.push({ id: 'record', text: `Break the ${club.name} record`, sub: `${gap} to go`, check: (se) => se.events.some((e) => e.type === 'CLUB_RECORD') });
      }
      if (s.rival) out.push({ id: 'rival', text: `Outshine ${s.rival.name}`, sub: 'Higher season rating', check: (se) => !!se.rival && se.rating > se.rival.rating });
      return out.slice(0, 4);
    }
    function objectivesHTML(list, results = null) {
      if (!list.length) return '';
      return `<div class="objectives">${list.map((o, i) => { const r = results ? results[i] : null; return `<div class="obj ${r === true ? 'ok' : r === false ? 'no' : ''}" style="animation-delay:${i * 0.12}s"><span class="obj-ic">${r === true ? '✅' : r === false ? '❌' : '🎯'}</span><div><b>${esc(o.text)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</div></div>`; }).join('')}</div>`;
    }

    /* ---------- Full-screen trophy lift ---------- */
    function trophyLift(t, club, ms = 3400) {
      return new Promise((res) => {
        if (RV.skip || motionOff()) { res(); return; }
        const c = clubColors(club);
        const el = document.createElement('div');
        el.className = 'lift';
        el.style.setProperty('--lc1', c.c1);
        el.innerHTML = `<div class="lift-rays"></div><div class="lift-inner"><div class="lift-trophy">${trophySVG(t.category, 190)}</div><div class="lift-t">${t.category === 'INTERNATIONAL' ? 'WORLD STAGE' : 'CHAMPIONS'}</div><div class="lift-s">${esc(t.title)} · ${esc(t.clubName)}</div><div class="c-sub" style="margin-top:16px; font-size:12px; opacity:.6">Click to continue</div></div>`;
        document.body.appendChild(el);
        confettiBurst({ count: 220, colors: [c.c1, c.c2, '#f2c94c', '#ffffff'], y: 0.35, spread: 1.3 });
        sfx('trophy');
        let closed = false;
        const close = () => { if (closed) return; closed = true; el.remove(); res(); };
        el.addEventListener('click', close);
        setTimeout(close, ms / RV.speed);
      });
    }

    /* ---------- Ballon d'Or podium reveal (3rd → 2nd → winner) ---------- */
    function buildPodium(se, s) {
      const slots = { 1: null, 2: null, 3: null };
      const me = { name: s.playerName, club: se.clubName, me: true };
      if (se.ballonDor) slots[1] = me; else if (se.bdRank && se.bdRank <= 3) slots[se.bdRank] = me;
      if (se.rival) {
        const rv = { name: se.rival.name, club: se.rival.clubName, rival: true };
        let rr = se.rival.ballonDor ? 1 : se.rival.bdRank;
        if (rr && rr <= 3) { while (rr <= 3 && slots[rr]) rr++; if (rr <= 3) slots[rr] = rv; }
      }
      const conts = Object.keys(NAME_POOLS);
      const elite = CLUBS.filter((c) => c.starRating >= 4);
      [1, 2, 3].forEach((k) => {
        if (slots[k]) return;
        const pool = NAME_POOLS[conts[Math.floor(Math.random() * conts.length)]];
        slots[k] = { name: `${pool.first[Math.floor(Math.random() * pool.first.length)]} ${pool.last[Math.floor(Math.random() * pool.last.length)]}`, club: elite[Math.floor(Math.random() * elite.length)].name };
      });
      return slots;
    }
    function podiumCeremony(se) {
      return new Promise((res) => {
        if (RV.skip) { res(); return; }
        const s = gameState;
        const slots = buildPodium(se, s);
        const won = !!se.ballonDor;
        const el = document.createElement('div');
        el.className = 'ceremony';
        const card = (rank, p) => `<div class="pod pod-${rank} ${p.me ? 'me' : ''} ${p.rival ? 'rv' : ''}" id="pod${rank}"><div class="pod-r">${rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'} ${ordinal(rank)}</div><div class="pod-n">${esc(p.name)}${p.me ? ' <span class="pill pill-pos">YOU</span>' : p.rival ? ' <span class="pill pill-purple">RIVAL</span>' : ''}</div><div class="pod-c">${esc(p.club)}</div></div>`;
        el.innerHTML = `<div style="padding:20px; width:min(760px,100%)"><div class="c-eyebrow">Ballon d'Or ${BASE_YEAR + se.age - 16} · the podium</div><div class="podium">${card(2, slots[2])}${card(1, slots[1])}${card(3, slots[3])}</div><div class="c-sub" id="podMsg" style="margin-top:18px; min-height:24px"></div><div class="c-sub" style="margin-top:10px; font-size:12px; opacity:.6">Click to continue</div></div>`;
        document.body.appendChild(el);
        let closed = false;
        const close = () => { if (closed) return; closed = true; el.remove(); res(); };
        const step = (ms) => new Promise((r) => setTimeout(r, closed ? 0 : ms / RV.speed));
        (async () => {
          await step(500); $('pod3') && $('pod3').classList.add('show'); sfx('click');
          await step(1300); $('pod2') && $('pod2').classList.add('show'); sfx('click');
          await step(1100); if ($('podMsg')) $('podMsg').textContent = 'And the Ballon d’Or goes to…'; sfx('drum');
          await step(1700); $('pod1') && $('pod1').classList.add('show');
          if (won) { const b = el.querySelector('.pod-1'); if (b) b.insertAdjacentHTML('afterbegin', `<div class="pod-ball">${ballSVG(70)}</div>`); confettiBurst({ count: 240, colors: ['#f2c94c', '#fff1b8', '#ffd76a', '#ffffff'], y: 0.3, spread: 1.4 }); sfx('ballon'); if ($('podMsg')) $('podMsg').innerHTML = `<b style="color:#fff3c4; font-size:20px">${esc(s.playerName)} — the best player on the planet.</b>`; }
          else { sfx('bad'); if ($('podMsg')) $('podMsg').textContent = `So close. ${ordinal(se.bdRank)} place for ${s.playerName}.`; }
          await step(won ? 3600 : 2600); close();
        })();
        el.addEventListener('click', close);
      });
    }

    /* ---------- Newspaper front page after each window ---------- */
    function frontPageStory(ctx) {
      const s = gameState; const r = ctx.report;
      const surname = String(s.playerName).trim().split(' ').pop().toUpperCase();
      const club = CLUB_MAP[r.clubId];
      const ev = (t) => r.events.find((e) => e.type === t);
      const tro = (c) => r.trophiesWon.find((t) => t.category === c);
      if (r.seasons.some((x) => x.ballonDor)) return { h: `${surname}: KING OF THE WORLD`, sub: `Ballon d'Or crowns a stunning spell at ${club.name}` };
      if (tro('INTERNATIONAL')) return { h: `${surname} BRINGS IT HOME!`, sub: `${tro('INTERNATIONAL').title} glory with ${getNation(s).name}` };
      if (tro('CONTINENTAL')) return { h: `KINGS OF ${(CONTINENTS[club.continent] || {}).label ? CONTINENTS[club.continent].label.toUpperCase() : 'THE CONTINENT'}!`, sub: `${s.playerName} lifts the ${tro('CONTINENTAL').title.replace(' Winner', '')} with ${club.name}` };
      if (r.trophiesWon.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length >= 2) return { h: 'SILVERWARE GALORE', sub: `${r.trophiesWon.length} trophies in ${r.seasons.length} seasons for ${s.playerName}` };
      if (ev('RIVAL_BETRAYAL')) return { h: `${surname} THE TRAITOR`, sub: `Fury as ${s.playerName} crosses the divide to ${club.name}` };
      if (tro('DOMESTIC_LEAGUE')) return { h: 'CHAMPIONS!', sub: `${s.playerName} wins the ${club.league} with ${club.name}` };
      if (ev('CLUB_RECORD')) return { h: 'HISTORY MAKER', sub: `${s.playerName} rewrites the ${club.name} record books` };
      if (ev('RELEGATED')) return { h: 'DOWN AND OUT', sub: `${club.name} relegated — what next for ${s.playerName}?` };
      if (ev('INTL_SNUB')) return { h: 'SNUBBED!', sub: `${s.playerName} left out of the ${getNation(s).name} squad` };
      if (r.averageRating >= 7.6) return { h: `${surname} ON FIRE`, sub: `${r.seasons.length} brilliant seasons at ${club.name}` };
      if (r.averageRating < 6.9) return { h: 'CRISIS TALKS', sub: `Tough times for ${s.playerName} at ${club.name}` };
      return { h: 'STEADY AS SHE GOES', sub: `Another solid chapter for ${s.playerName} at ${club.name}` };
    }
    function frontPageHTML(ctx) {
      const s = gameState; const r = ctx.report;
      const story = frontPageStory(ctx);
      const club = CLUB_MAP[r.clubId];
      const defs = statDefs(s.setup.position);
      const stat = r.seasons.reduce((a, x) => a + (x[defs[0].sk] || 0), 0);
      return `<div class="frontpage"><div class="fp-mast"><span>THE FOOTBALL GAZETTE</span><span>${seasonLabel(r.endAge - 1)} · FINAL EDITION</span></div>
        <div class="fp-body"><div class="fp-text"><div class="fp-h">${esc(story.h)}</div><div class="fp-sub">${esc(story.sub)}</div>
        <div class="fp-cols"><div><b>${r.appearances}</b>apps</div><div><b>${defs[0].isPct ? '' : stat}</b>${defs[0].l.toLowerCase()}</div><div><b>${r.averageRating.toFixed(2)}</b>avg rating</div><div><b>${r.trophiesWon.length}</b>trophies</div></div></div>
        <div class="fp-photo">${shirtSVG(club, s.playerName, s.shirtNumber, 120)}</div></div>
        <div style="text-align:right; margin-top:8px"><button class="btn" onclick="downloadFrontPage()">📰 Save front page</button></div></div>`;
    }
    function frontPageSVG(ctx) {
      const s = gameState; const r = ctx.report;
      const story = frontPageStory(ctx);
      const club = CLUB_MAP[r.clubId];
      const shirt = shirtSVG(club, s.playerName, s.shirtNumber, 300).replace('<svg ', '<svg x="840" y="190" ');
      const defs = statDefs(s.setup.position);
      const stat = r.seasons.reduce((a, x) => a + (x[defs[0].sk] || 0), 0);
      const cols = [[r.appearances, 'APPS'], [stat, defs[0].l.toUpperCase()], [r.averageRating.toFixed(2), 'AVG RATING'], [r.trophiesWon.length, 'TROPHIES']];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Georgia, 'Times New Roman', serif"><rect width="1200" height="630" fill="#efe8d8"/><text x="60" y="80" font-family="Segoe UI, Arial" font-size="34" font-weight="900" letter-spacing="8" fill="#1b1a17">THE FOOTBALL GAZETTE</text><text x="1140" y="80" text-anchor="end" font-family="Segoe UI, Arial" font-size="16" font-weight="700" fill="#1b1a17">${seasonLabel(r.endAge - 1)} · FINAL EDITION</text><rect x="60" y="96" width="1080" height="4" fill="#1b1a17"/><rect x="60" y="104" width="1080" height="1.5" fill="#1b1a17"/>
        <text x="60" y="230" font-size="${story.h.length > 18 ? 68 : 88}" font-weight="900" fill="#1b1a17">${esc(story.h)}</text><text x="60" y="290" font-size="30" font-style="italic" fill="#3a362e">${esc(story.sub).slice(0, 60)}</text>
        ${cols.map(([v, l], i) => `<g transform="translate(${60 + i * 190}, 380)"><text font-size="56" font-weight="900" fill="#1b1a17">${esc(String(v))}</text><text y="34" font-family="Segoe UI, Arial" font-size="15" font-weight="800" letter-spacing="2" fill="#5b564a">${esc(l)}</text></g>`).join('')}
        ${shirt}<text x="60" y="590" font-family="Segoe UI, Arial" font-size="15" fill="#5b564a">${esc(s.playerName)} · ${esc(club.name)} · Football Career &amp; Transfer Simulator</text></svg>`;
    }
    function svgToPng(svg, filename) {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => { const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; cv.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url); cv.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${filename}.png`; a.click(); showToast('Saved', `${filename}.png`); }); };
      img.onerror = () => { const a = document.createElement('a'); a.href = url; a.download = `${filename}.svg`; a.click(); };
      img.src = url;
    }
    function downloadFrontPage() { if (RV.lastCtx) svgToPng(frontPageSVG(RV.lastCtx), `front-page-${RV.lastCtx.report.endAge}`); }

    /* ---------- Deadline-day arrivals ---------- */
    const arrivalNeeded = () => gameState && currentChoices && gameState.arrivedWindow !== gameState.windowCount && !gameState.isRetired;
    function arrivalsHTML() {
      return `<div class="arrivals panel" id="arrivals"><div class="arr-head"><div><div class="eyebrow" style="color:#ffd78f">📱 ${currentChoices.isFirstTurn ? 'Graduation day' : 'Deadline day'}</div><h2>${currentChoices.isFirstTurn ? 'Clubs want to sign you…' : 'Your agent is working the phones…'}</h2></div><div class="arr-clock" id="arrClock">23:59:40</div></div><div class="arr-feed" id="arrFeed"><div class="typing"><span></span><span></span><span></span></div></div><div style="text-align:right; padding:0 14px 14px"><button class="btn" onclick="finishArrivals()">Show all offers ▸</button></div></div>`;
    }
    let arrivalTimer = null;
    async function runArrivals() {
      const token = `${gameState.windowCount}`;
      ui.arrivalToken = token;
      const feed = $('arrFeed');
      const offers = getOptions().filter((o) => o.kind !== 'STAY');
      let secs = 20;
      clearInterval(arrivalTimer);
      arrivalTimer = setInterval(() => { secs = Math.max(0, secs - 1); const c = $('arrClock'); if (c) c.textContent = `23:59:${String(secs).padStart(2, '0')}`; }, 1000);
      for (const o of offers) {
        await new Promise((r) => setTimeout(r, motionOff() ? 60 : 850));
        if (ui.arrivalToken !== token || !$('arrFeed')) return;
        const d = o.data;
        const msg = d.dramaTag === 'RELEASE_CLAUSE' ? `${o.club.name} just triggered your release clause — ${fmtM(d.feeM)}!` : d.dramaTag === 'BIDDING_WAR' ? `Bidding war! ${o.club.name} have gone to ${fmtM(d.feeM)}.` : d.dramaTag === 'ARCH_RIVAL' || d.dramaTag === 'RIVAL' ? `Careful… ${o.club.name} want you. Your old fans won't forgive it.` : d.dramaTag === 'BOYHOOD_RETURN' ? `${o.club.name} want to bring you home ❤️` : d.dramaTag === 'TAPPED_UP' ? `${o.club.name} have made their move, as promised 🤫` : o.kind === 'FIRST_CONTRACT' ? `${o.club.name} are offering a ${d.contractYears}-year pro deal as a ${d.squadRoleLabel}.` : `${o.club.name} offer ${d.feeM ? fmtM(d.feeM) : 'a free transfer'} — ${d.squadRoleLabel}, ${fmtWage(d.wageM)}.`;
        feed.querySelector('.typing') && feed.querySelector('.typing').remove();
        feed.insertAdjacentHTML('beforeend', `<div class="arr-msg">${crestSVG(o.club, 26)}<div><b>${currentChoices.isFirstTurn ? 'Academy director' : 'Agent'}</b><span>${esc(msg)}</span></div></div><div class="typing"><span></span><span></span><span></span></div>`);
        sfx('buzz');
      }
      await new Promise((r) => setTimeout(r, motionOff() ? 60 : 700));
      if (ui.arrivalToken === token) finishArrivals();
    }
    function finishArrivals() {
      clearInterval(arrivalTimer);
      ui.arrivalToken = null;
      if (!gameState) return;
      gameState.arrivedWindow = gameState.windowCount;
      saveCareer(gameState);
      ui.justArrived = true;
      renderApp();
      setTimeout(() => { ui.justArrived = false; maybeStartTour(); }, 900);
    }

    /* ---------- Stylised world map with your career route ---------- */
    const LEAGUE_GEO = {
      'Premier League': [51.5, -0.6], 'La Liga': [40.4, -3.7], Bundesliga: [51, 9.5], 'Serie A': [42.5, 12.5], 'Ligue 1': [46.8, 2.4], 'Primeira Liga': [39.6, -8.3], Eredivisie: [52.2, 5.2], 'Belgian Pro League': [50.7, 4.5],
      'Saudi Pro League': [24.7, 46.7], 'Major League Soccer': [39.5, -97], 'Liga MX': [22.5, -102], 'Campeonato Brasileiro Série A': [-18, -46], 'Argentine Primera División': [-34.6, -60], 'J1 League': [36, 138.5],
      'Chinese Super League': [33, 113], 'Egyptian Premier League': [29.8, 31.2], 'South African Premier Division': [-26.5, 27.5], 'A-League Men': [-33, 148],
    };
    const LAND = [
      [[-168, 66], [-156, 71], [-130, 70], [-100, 73], [-80, 72], [-64, 60], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 30], [-97, 26], [-97, 21], [-91, 18], [-87, 21], [-88, 15], [-83, 10], [-79, 9], [-84, 9], [-87, 13], [-92, 15], [-100, 17], [-106, 23], [-112, 30], [-117, 33], [-121, 36], [-124, 41], [-124, 48], [-131, 55], [-140, 60], [-152, 59], [-160, 58], [-166, 61]],
      [[-55, 60], [-44, 60], [-22, 70], [-20, 80], [-58, 82], [-72, 78], [-58, 70]],
      [[-80, 9], [-74, 11], [-62, 11], [-52, 5], [-50, 0], [-35, -5], [-35, -9], [-39, -15], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-63, -41], [-65, -47], [-68, -52], [-72, -53], [-75, -48], [-73, -40], [-72, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-78, 3]],
      [[-10, 36], [-9, 43], [-2, 43.5], [-4.5, 48], [2, 51], [5, 53], [8, 54], [9, 57], [5, 58], [5, 62], [14, 67], [20, 70], [30, 70], [40, 67], [45, 68], [60, 68], [60, 50], [50, 45], [40, 45], [30, 45], [28, 41], [23, 40], [20, 40], [18, 42], [12, 44], [15, 40], [16, 38], [12, 38], [8, 44], [4, 43], [0, 39], [-2, 37], [-6, 36]],
      [[-5.5, 50], [1.5, 51], [1.8, 53], [-1, 55], [-3, 58.5], [-6, 58], [-5, 55], [-3.2, 54], [-5, 52]],
      [[-10, 52], [-6, 52], [-6, 55], [-8, 55.3], [-10, 54]],
      [[-17, 21], [-13, 28], [-10, 31], [-6, 35], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [34, 28], [38, 18], [43, 12], [51, 12], [48, 5], [40, -3], [39, -10], [40, -16], [35, -24], [32, -29], [27, -34], [20, -35], [18, -30], [15, -27], [12, -17], [13, -8], [9, -1], [9, 4], [5, 5], [-4, 5], [-8, 4], [-13, 8], [-17, 13]],
      [[26, 40], [36, 36.5], [35, 32], [34, 28], [43, 13], [52, 16], [58, 22], [56, 26], [50, 30], [57, 25], [62, 25], [67, 24], [72, 20], [77, 8], [80, 13], [80, 16], [87, 21], [92, 22], [98, 16], [100, 13], [103, 1.5], [104, 10], [106, 10], [109, 12], [108, 21], [114, 22], [121, 28], [122, 31], [120, 36], [122, 40], [126, 38], [129, 35], [129, 42], [135, 43], [140, 48], [142, 53], [137, 54], [155, 60], [162, 62], [170, 65], [180, 66], [180, 71], [140, 73], [110, 77], [80, 73], [68, 70], [60, 68], [60, 50], [50, 45], [40, 45], [30, 45]],
      [[130, 31], [132, 34], [136, 35], [140, 36], [141, 41], [142, 45], [145, 44], [141, 39], [140, 35], [137, 34]],
      [[114, -22], [114, -34], [118, -35], [124, -33], [131, -31], [137, -35], [140, -38], [146, -39], [150, -37], [153, -31], [153, -25], [146, -19], [142, -11], [136, -12], [131, -12], [126, -14], [122, -18]],
      [[172, -34], [178, -38], [175, -41], [170, -46], [167, -46], [172, -41]],
      [[109, 2], [117, 7], [119, 1], [116, -4], [110, -3]], [[95, 5], [104, -6], [106, -5], [98, 2]], [[44, -25], [47, -25], [50, -15], [49, -12], [44, -16]],
    ];
    function worldMapSVG(s, { w = 1000, h = 470 } = {}) {
      const P = (lat, lon) => [((lon + 180) / 360) * w, ((78 - lat) / 136) * h];
      const land = LAND.map((poly) => `<polygon points="${poly.map(([lon, lat]) => P(lat, lon).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="#232a33" stroke="#2f3843" stroke-width="1"/>`).join('');
      const stops = [];
      [...s.clubHistory, ...(s.currentStint && !s.isRetired ? [s.currentStint] : [])].forEach((st) => {
        const club = CLUB_MAP[st.clubId];
        const g = LEAGUE_GEO[club.league] || [0, 0];
        const hsh = hashStr(club.id);
        const lat = g[0] + (((hsh % 100) / 100) - 0.5) * 5;
        const lon = g[1] + ((((hsh >> 7) % 100) / 100) - 0.5) * 7;
        stops.push({ st, club, xy: P(lat, lon) });
      });
      let path = '';
      for (let i = 1; i < stops.length; i++) {
        const [x1, y1] = stops[i - 1].xy; const [x2, y2] = stops[i].xy;
        const mx = (x1 + x2) / 2; const my = Math.min(y1, y2) - Math.max(30, Math.hypot(x2 - x1, y2 - y1) * 0.25);
        path += `<path class="route" d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" style="animation-delay:${i * 0.6}s"/>`;
      }
      const dots = stops.map(({ st, club, xy }, i) => { const c = clubColors(club); return `<g class="stop" style="animation-delay:${i * 0.6}s"><circle cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="9" fill="${c.c1}" stroke="${c.c2}" stroke-width="3"/><text x="${xy[0].toFixed(1)}" y="${(xy[1] + 3.5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="900" fill="${c.text}">${i + 1}</text><text x="${(xy[0] + 13).toFixed(1)}" y="${(xy[1] - 10).toFixed(1)}" font-size="11.5" font-weight="700" fill="#e9ebef" stroke="#111317" stroke-width="3" paint-order="stroke">${esc(club.name)} · ${st.startAge}–${st.endAge}</text></g>`; }).join('');
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block; background:#151a21; border-radius:6px" role="img" aria-label="World map of your career">${land}${path}${dots}</svg>`;
    }

    /* ---------- Career in 60 seconds ---------- */
    async function playCareerRecap() {
      const s = gameState;
      const el = document.createElement('div');
      el.className = 'montage recap';
      document.body.appendChild(el);
      let stop = false;
      el.addEventListener('click', () => { stop = true; });
      const wait = (ms) => new Promise((r) => setTimeout(r, stop ? 0 : motionOff() ? 300 : ms));
      const defs = statDefs(s.setup.position);
      const stints = s.clubHistory;
      el.innerHTML = `<div class="recap-card"><div class="eyebrow" style="color:#9fd0ff">A career in ${stints.length} chapters</div><div class="lg-name" style="margin-top:6px">${esc(s.playerName)}</div><div class="muted">${POSITION_PROFILES[s.setup.position].name} · ${esc(getNation(s).name)}</div></div>`;
      sfx('whistle');
      await wait(2200);
      for (let i = 0; i < stints.length && !stop; i++) {
        const st = stints[i];
        const club = CLUB_MAP[st.clubId];
        const seasons = s.seasonLog.filter((x) => x.clubId === st.clubId && x.age >= st.startAge && x.age < st.endAge);
        const trophies = s.trophies.filter((t) => t.clubId === st.clubId && t.yearAge >= st.startAge && t.yearAge < st.endAge);
        const best = seasons.reduce((b, x) => (!b || x.rating > b.rating ? x : b), null);
        const moment = best && best.moments && best.moments[0];
        el.innerHTML = `<div class="recap-card"><div class="eyebrow" style="color:#9fd0ff">Chapter ${i + 1} of ${stints.length} · ${seasonLabel(st.startAge).slice(0, 4)}–${seasonLabel(st.endAge - 1).slice(5)}</div><div class="mt-crest" style="margin:14px auto; display:flex; gap:18px; justify-content:center; align-items:center">${crestSVG(club, 90)}${shirtSVG(club, s.playerName, st.shirtNumber, 90)}</div><div style="font-size:26px; font-weight:900">${esc(club.name)}</div><div class="recap-stats"><div><b>${st.seasons}</b>seasons</div><div><b>${st.appearances}</b>apps</div><div><b>${defs[0].k === 'goals' ? st.goals : st.cleanSheets}</b>${defs[0].k === 'goals' ? 'goals' : 'clean sheets'}</div><div><b>${trophies.length}</b>trophies</div></div>${trophies.length ? `<div style="margin-top:10px">${trophies.slice(0, 6).map((t) => trophySVG(t.category, 34)).join('')}</div>` : ''}${moment ? `<div class="muted" style="margin-top:10px">⚽ ${esc(moment)}</div>` : ''}<div class="mt-bar"><div style="width:${((i + 1) / stints.length) * 100}%"></div></div></div>`;
        sfx(trophies.length ? 'crowd' : 'click');
        await wait(trophies.length ? 3200 : 2400);
      }
      el.innerHTML = `<div class="recap-card"><div class="eyebrow" style="color:#ffe8a3">Final whistle</div><div style="font:900 72px var(--mono); color:var(--gold); margin:8px 0">${s.legacyScore}<span style="font-size:24px; color:#c9cfd8">/1000</span></div><div class="lg-tier">${legacyTier(s.legacyScore)}</div><div class="muted" style="margin-top:12px">Click anywhere to close</div></div>`;
      if (!stop) { confettiBurst({ count: 160 }); sfx('trophy'); }
      await new Promise((r) => { const end = () => { el.remove(); r(); }; el.addEventListener('click', end); setTimeout(end, stop ? 0 : 6000); });
    }

    /* ---------- Weekly challenge ---------- */
    const CHALLENGES = [
      { id: 'DESERT_KEEPER', icon: '🧤', title: 'Desert Keeper', desc: 'Start as a Saudi Arabian goalkeeper and win a continental cup.', setup: { position: 'GK', continent: 'ASIA', nation: 'KSA' }, goal: (s) => s.trophies.some((t) => t.category === 'CONTINENTAL') },
      { id: 'GOAL_MACHINE', icon: '⚽', title: 'Goal Machine', desc: 'As a Uruguayan striker, score 300+ career goals.', setup: { position: 'ST', continent: 'SOUTH_AMERICA', nation: 'URU' }, goal: (s) => s.stats.goals >= 300 },
      { id: 'DEFENDERS_DREAM', icon: '🛡️', title: "Defender's Dream", desc: "Win the Ballon d'Or as a Nigerian centre-back.", setup: { position: 'CB', continent: 'AFRICA', nation: 'NGA' }, goal: (s) => s.stats.ballonDOrs >= 1 },
      { id: 'SHOW_ME_THE_MONEY', icon: '💶', title: 'Show Me the Money', desc: 'Earn €200M+ in your career as an American winger.', setup: { position: 'RW', continent: 'NORTH_AMERICA', nation: 'USA' }, goal: (s) => careerEarnings(s) >= 200 },
      { id: 'ONE_CLUB', icon: '❤️', title: 'One-Club Legend', desc: 'As a Japanese midfielder, never transfer and win 3 league titles.', setup: { position: 'CM', continent: 'ASIA', nation: 'JPN' }, goal: (s) => s.transferCount === 0 && s.trophies.filter((t) => t.category === 'DOMESTIC_LEAGUE').length >= 3 },
      { id: 'UNDERDOG_NATION', icon: '🌍', title: 'Underdog Nation', desc: 'Win an international tournament with Scotland as an attacking midfielder.', setup: { position: 'CAM', continent: 'EUROPE', nation: 'SCO' }, goal: (s) => s.trophies.some((t) => t.category === 'INTERNATIONAL') },
      { id: 'GLOBETROTTER', icon: '🧭', title: 'Globetrotter', desc: 'As an Egyptian left-back, play in 3 confederations.', setup: { position: 'LB', continent: 'AFRICA', nation: 'EGY' }, goal: (s) => new Set(s.clubHistory.map((x) => CLUB_MAP[x.clubId] && CLUB_MAP[x.clubId].continent)).size >= 3 },
      { id: 'IMMORTAL', icon: '🌟', title: 'Immortal', desc: 'Reach a 700+ legacy score as a Brazilian left winger.', setup: { position: 'LW', continent: 'SOUTH_AMERICA', nation: 'BRA' }, goal: (s) => s.legacyScore >= 700 },
    ];
    const CHALLENGE_KEY = 'fcts_challenges_v1';
    function currentChallenge() {
      const week = Math.floor((Date.now() - Date.UTC(2026, 0, 5)) / (7 * 864e5));
      const c = CHALLENGES[((week % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
      return { ...c, week, weekKey: `W${week}`, seed: `WK${String(week).padStart(4, '0')}` };
    }
    function challengeBoard(weekKey) { return (storageGet(CHALLENGE_KEY, {})[weekKey] || []); }
    function recordChallengeResult(s) {
      const ch = s.setup.challenge;
      if (!ch) return null;
      const def = CHALLENGES.find((c) => c.id === ch.id);
      if (!def) return null;
      const achieved = !!def.goal(s);
      const all = storageGet(CHALLENGE_KEY, {});
      const list = all[ch.weekKey] || [];
      list.push({ name: s.playerName, legacy: s.legacyScore, achieved, date: new Date().toISOString().slice(0, 10) });
      list.sort((a, b) => (b.achieved - a.achieved) || (b.legacy - a.legacy));
      all[ch.weekKey] = list.slice(0, 10);
      storageSet(CHALLENGE_KEY, all);
      return { achieved, def, rank: all[ch.weekKey].findIndex((x) => x.name === s.playerName && x.legacy === s.legacyScore) + 1 };
    }
    function challengeCardHTML() {
      const c = currentChallenge();
      const board = challengeBoard(c.weekKey);
      const pos = POSITION_PROFILES[c.setup.position];
      return `<div class="challenge"><div class="ch-l"><div class="eyebrow" style="color:#ffd78f">🗓 Weekly challenge · week ${c.week + 1}</div><div class="ch-t">${c.icon} ${esc(c.title)}</div><div class="ch-d">${esc(c.desc)}</div><div class="dim" style="font-size:11.5px; margin-top:4px">${pos.name} · ${esc(NATION_MAP[c.setup.nation].name)} · same seed for everyone this week (${c.seed})</div></div>
        <div class="ch-r">${board.length ? `<div class="eyebrow" style="margin-bottom:4px">Your attempts</div>${board.slice(0, 3).map((b, i) => `<div class="ch-row"><span>${i + 1}. ${esc(b.name)}</span><span>${b.achieved ? '✅' : '❌'} ${b.legacy}</span></div>`).join('')}` : '<div class="dim" style="font-size:12px">No attempts yet this week.</div>'}<button class="btn btn-go" style="margin-top:8px; width:100%" onclick="startChallenge()">Take the challenge ▸</button></div></div>`;
    }
    function startChallenge() {
      const c = currentChallenge();
      Object.assign(setupConfig, { mode: 'CAREER', position: c.setup.position, continent: c.setup.continent, nation: c.setup.nation, transferInterval: 2, agentType: 'BALANCED', scouting: 'FULL', seed: c.seed, challenge: { id: c.id, weekKey: c.weekKey, title: c.title } });
      setupConfig.retirementAge = 35;
      if ($('inputRetireAge')) $('inputRetireAge').value = 35;
      startNewCareer();
    }
