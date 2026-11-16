    /* ==========================================================================
     * LAYER 5: PRESENTATION — core helpers, identity, charts, settings, sound
     * ========================================================================== */
    let gameState = null;
    let currentChoices = null;
    const setupConfig = { mode: 'CAREER', position: 'ST', continent: 'EUROPE', nation: 'ENG', transferInterval: 2, retirementAge: 35, agentType: 'BALANCED', scouting: 'FULL', seed: null };
    const ui = { page: 'home', sel: null, proj: {}, projKey: null, picks: {}, fit: {}, bestFit: null, moreOpen: false, justArrived: false, arrivalToken: null, tTab: 'offers', statsTab: 'seasons', inboxSel: null, asks: {}, hofFilter: { arch: 'NEW', cat: 'ALL', conf: 'ALL', mode: 'ALL' } };
    const prefs = Object.assign({ sound: false, colorblind: false, reduceMotion: false, tutorialDone: false, reviewSpeed: 1, keyMoments: false }, (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } })());
    const OS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionOff = () => OS_REDUCED || prefs.reduceMotion;
    const isQuick = () => !!(gameState && gameState.setup.mode === 'QUICK');
    const scoutLevel = () => (gameState ? gameState.setup.scouting || 'FULL' : 'FULL');
    function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }
    function applyPrefs() {
      document.body.classList.toggle('cb', !!prefs.colorblind);
      document.body.classList.toggle('rm', !!prefs.reduceMotion);
      document.body.classList.toggle('theme-programme', prefs.theme === 'programme');
      const b = document.getElementById('btnSound');
      if (b) b.textContent = prefs.sound ? '🔊' : '🔇';
    }

    const $ = (id) => document.getElementById(id);
    function esc(str) {
      return String(str ?? '').split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#39;');
    }
    const windowYear = (age) => BASE_YEAR + age - 17;
    function fmtM(v) {
      v = Number(v) || 0;
      if (v >= 100) return `€${Math.round(v)}M`;
      if (v >= 10) return `€${(Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '')}M`;
      return `€${v.toFixed(1)}M`;
    }
    const fmtWage = (w) => { const k = (Number(w) || 0) * 1e3 / 52; return k >= 1000 ? `€${(k / 1000).toFixed(1)}M p/w` : `€${Math.round(k)}K p/w`; };
    function pct(p) {
      if (p == null) return '—';
      if (p <= 0) return '0%';
      if (p < 0.01) return '<1%';
      if (p > 0.99 && p < 1) return '>99%';
      return `${Math.round(p * 100)}%`;
    }
    const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
    const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };
    function ratingColor(r) {
      r = Number(r);
      if (prefs.colorblind) {
        if (r >= 8.2) return '#4aa3ff'; if (r >= 7.8) return '#7cc4ff'; if (r >= 7.4) return '#c3d7e8'; if (r >= 7.0) return '#f2c94c'; if (r >= 6.6) return '#f59a3c'; return '#d55e00';
      }
      if (r >= 8.2) return '#2fd27a'; if (r >= 7.8) return '#7ad94a'; if (r >= 7.4) return '#c9d635'; if (r >= 7.0) return '#f2c94c'; if (r >= 6.6) return '#f59a3c'; return '#ef5350';
    }
    function attrColor(v) {
      v = Math.round(v);
      if (v >= 16) return prefs.colorblind ? '#4aa3ff' : '#2fd27a';
      if (v >= 13) return prefs.colorblind ? '#9fd0ff' : '#9be36b';
      if (v >= 10) return '#e9ebef';
      if (v >= 7) return '#f2c94c';
      return prefs.colorblind ? '#d55e00' : '#ef5350';
    }
    const ratingBadge = (r) => `<span class="rat" style="background:${ratingColor(r)}">${Number(r).toFixed(2)}</span>`;
    const starsHTML = (n) => `<span class="stars">${'★'.repeat(n)}<span class="off">${'☆'.repeat(Math.max(0, 5 - n))}</span></span>`;
    const roleLabel = (r) => (SQUAD_ROLES[r] ? SQUAD_ROLES[r].label : r);
    function trendHTML(clubId) {
      const t = clubTrend(gameState, clubId);
      if (t > 0) return `<span class="trend-up" title="Club on the rise">▲</span>`;
      if (t < 0) return `<span class="trend-down" title="Club in decline">▼</span>`;
      return '';
    }
    function statDefs(position) {
      const p = POSITION_PROFILES[position];
      if (p.primaryStatType === 'ATTACK') return [{ k: 'goals', sk: 'goals', l: 'Goals', s: 'G' }, { k: 'assists', sk: 'assists', l: 'Assists', s: 'A' }];
      if (p.primaryStatType === 'DEFENSE') return [{ k: 'cs', sk: 'cleanSheets', l: 'Clean sheets', s: 'CS' }, { k: 'tackles', sk: 'tackles', l: 'Tackles', s: 'Tkl' }];
      return [{ k: 'cs', sk: 'cleanSheets', l: 'Clean sheets', s: 'CS' }, { k: 'savePct', sk: 'savePct', l: 'Save %', s: 'Sv%', isPct: true }];
    }

    /* ---------------- Club identity ---------------- */
    const CLUB_COLORS = {
      real_madrid: ['#f3f3f3', '#c9a227'], barcelona: ['#a50044', '#004d98'], atletico_madrid: ['#cb3524', '#272e61'], man_city: ['#6cabdd', '#1c2c5b'],
      man_utd: ['#da291c', '#fbe122'], liverpool: ['#c8102e', '#00b2a9'], arsenal: ['#ef0107', '#ffffff'], chelsea: ['#034694', '#dba111'],
      tottenham: ['#f4f4f4', '#132257'], newcastle: ['#241f20', '#ffffff'], aston_villa: ['#670e36', '#95bfe5'], everton: ['#003399', '#ffffff'],
      west_ham: ['#7a263a', '#1bb1e7'], bayern: ['#dc052d', '#0066b2'], dortmund: ['#fde100', '#111111'], leverkusen: ['#e32221', '#111111'],
      rb_leipzig: ['#dd0741', '#001f47'], juventus: ['#111111', '#f4f4f4'], inter_milan: ['#0068a8', '#111111'], ac_milan: ['#fb090b', '#111111'],
      napoli: ['#12a0d7', '#003c82'], as_roma: ['#8e1f2f', '#f0bc42'], lazio: ['#87d8f7', '#ffffff'], atalanta: ['#1e71b8', '#111111'],
      fiorentina: ['#482e92', '#ffffff'], psg: ['#004170', '#da291c'], marseille: ['#2faee0', '#ffffff'], lyon: ['#f4f4f4', '#da0812'],
      monaco: ['#e51b22', '#ffffff'], sevilla: ['#f4f4f4', '#d71a28'], real_betis: ['#00954c', '#ffffff'], valencia: ['#f4f4f4', '#ee3524'],
      villarreal: ['#ffe667', '#005187'], athletic_bilbao: ['#ee2523', '#ffffff'], real_sociedad: ['#0067b1', '#ffffff'], flamengo: ['#c4161c', '#111111'],
      palmeiras: ['#006437', '#ffffff'], corinthians: ['#f4f4f4', '#111111'], santos: ['#f4f4f4', '#111111'], sao_paulo: ['#f4f4f4', '#e30613'],
      fluminense: ['#870a28', '#00613c'], boca_juniors: ['#0a3a85', '#f3b229'], river_plate: ['#f4f4f4', '#e2001a'], racing_club: ['#6cace4', '#ffffff'],
      independiente: ['#e2001a', '#ffffff'], al_hilal: ['#005eb8', '#ffffff'], al_nassr: ['#fdd700', '#0b2d8a'], al_ittihad: ['#fcd116', '#111111'],
      al_ahli_sa: ['#00843d', '#ffffff'], al_ahly_eg: ['#c8102e', '#ffffff'], zamalek: ['#f4f4f4', '#c8102e'], kaizer_chiefs: ['#ffcc00', '#111111'],
      orlando_pirates: ['#111111', '#f4f4f4'], mamelodi_sundowns: ['#ffd700', '#0b6e3a'], club_america: ['#ffd200', '#0a2240'], chivas: ['#cd1531', '#ffffff'],
      cruz_azul: ['#0047ab', '#ffffff'], monterrey: ['#002d62', '#ffffff'], tigres: ['#fdb913', '#00539f'], inter_miami: ['#f7b5cd', '#231f20'],
      la_galaxy: ['#00245d', '#ffd200'], lafc: ['#111111', '#c39e6d'], seattle_sounders: ['#5d9741', '#005595'], urawa_reds: ['#e60012', '#111111'],
      kashima_antlers: ['#b01a37', '#1f2a44'], vissel_kobe: ['#a50034', '#ffffff'], shanghai_port: ['#d6001c', '#ffffff'], beijing_guoan: ['#00843d', '#ffffff'],
      benfica: ['#e30613', '#ffffff'], porto: ['#003d8f', '#ffffff'], sporting_cp: ['#008057', '#ffffff'], braga: ['#d4001c', '#ffffff'],
      ajax: ['#f4f4f4', '#d2122e'], psv: ['#ed1c24', '#ffffff'], feyenoord: ['#e3001b', '#111111'], az_alkmaar: ['#d20f1e', '#ffffff'],
      club_brugge: ['#0067b1', '#111111'], anderlecht: ['#5a2a83', '#ffffff'], standard_liege: ['#e30613', '#ffffff'], genk: ['#0046ad', '#ffffff'],
      sydney_fc: ['#6cace4', '#0a2240'], melbourne_victory: ['#0a2240', '#ffffff'], melbourne_city: ['#6cabdd', '#ffffff'], wsw: ['#c8102e', '#111111'],
    };
    const CLUB_CODES = {
      psg: 'PSG', bayern: 'FCB', man_utd: 'MUN', man_city: 'MCI', dortmund: 'BVB', inter_milan: 'INT', ac_milan: 'ACM', juventus: 'JUV', real_madrid: 'RMA',
      barcelona: 'FCB', atletico_madrid: 'ATM', liverpool: 'LIV', tottenham: 'TOT', newcastle: 'NEW', rb_leipzig: 'RBL', leverkusen: 'B04', boca_juniors: 'BOC',
      river_plate: 'RIV', club_america: 'AME', al_ahly_eg: 'AHL', al_ahli_sa: 'AHL', lafc: 'LAFC', nycfc: 'NYC', ny_red_bulls: 'NYRB', la_galaxy: 'LAG',
      inter_miami: 'MIA', psv: 'PSV', ajax: 'AJA', benfica: 'SLB', porto: 'FCP', sporting_cp: 'SCP', club_brugge: 'CLB', wsw: 'WSW', az_alkmaar: 'AZ',
    };
    const CODE_STOP = new Set(['fc', 'cf', 'sc', 'afc', 'cd', 'ca', 'rc', 'as', 'ss', 'us', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'ogc', 'rcd', 'ec', 'se', 'cr', 'fbpa', 'club', 'de', 'del', 'la', 'y', 'and', '&', 'the', 'acf', 'ssc', 'ac', 'bc', 'cfc', 'sco', 'aj', 'osc', 'fr', 'sfc', 'sk', 'acc', 'ucd', 'sl', 'kv', 'kvc', 'krc', 'kaa', 'rsc', 'raal', 'oh', 'vv', 'eh', 'fcv', 'sad']);
    function hslToHex(h, s, l) {
      s /= 100; l /= 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
      return `#${f(0)}${f(8)}${f(4)}`;
    }
    function hexLum(hex) {
      const m = hex.replace('#', '');
      const c = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    const colorCache = {};
    function clubColors(club) {
      if (!club) return { c1: '#2b3a55', c2: '#9fb3d1', text: '#ffffff' };
      if (colorCache[club.id]) return colorCache[club.id];
      let pair = CLUB_COLORS[club.id];
      if (!pair) {
        const h = hashStr(club.id);
        const hue = h % 360;
        pair = [hslToHex(hue, 50 + (h >> 9) % 25, 28 + (h >> 13) % 14), hslToHex((hue + (h % 2 ? 180 : 35)) % 360, 65, 78)];
      }
      const res = { c1: pair[0], c2: pair[1], text: hexLum(pair[0]) > 0.45 ? '#111418' : '#ffffff' };
      colorCache[club.id] = res;
      return res;
    }
    function clubCode(club) {
      if (!club) return 'ACA';
      if (CLUB_CODES[club.id]) return CLUB_CODES[club.id];
      const tokens = club.name.replace(/[().'’-]/g, ' ').split(/\s+/).filter((w) => w && !CODE_STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
      if (tokens.length >= 2) return tokens.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
      return (tokens[0] || club.name).slice(0, 3).toUpperCase();
    }
    let svgSeq = 0;
    function crestSVG(club, size = 40) {
      const { c1, c2 } = clubColors(club);
      const id = `cr${++svgSeq}`;
      const code = esc(clubCode(club));
      const pat = hashStr(club ? club.id : 'academy') % 4;
      const shield = 'M20 1.5 L37.5 6 V21 C37.5 33 30 40.5 20 44.5 C10 40.5 2.5 33 2.5 21 V6 Z';
      const pattern = [`<rect x="15" y="0" width="10" height="46" fill="${c2}"/>`, `<path d="M-6 31 L31 -6 L44 6 L7 43 Z" fill="${c2}"/>`, `<rect x="20" y="0" width="20" height="46" fill="${c2}"/>`, `<rect x="0" y="0" width="40" height="13" fill="${c2}"/>`][pat];
      return `<svg width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath></defs><g clip-path="url(#${id})"><rect width="40" height="46" fill="${c1}"/>${pattern}<rect x="0" y="25.5" width="40" height="11" fill="rgba(0,0,0,.58)"/></g><path d="${shield}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.4"/><text x="20" y="34" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="900" font-size="${code.length > 3 ? 7.4 : 9}" fill="#fff">${code}</text></svg>`;
    }
    const findClubByName = (name) => CLUBS.find((c) => c.name === name) || null;

    /* ---------------- Icons & award graphics ---------------- */
    const ICONS = {
      home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
      inbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
      transfer: '<path d="M4 8h14l-3-3"/><path d="M20 16H6l3 3"/>',
      chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
      history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
      trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 21h8M9 17h6"/>',
      star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      reset: '<path d="M4 4v6h6"/><path d="M5 10a8 8 0 1 1 2 7"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
      mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
      dumbbell: '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>',
      coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M14 14h3M7 18h3"/>',
      album: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M6 8h3M6 12h3M15 8h3M15 12h3"/>',
      book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    };
    const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    function trophySVG(cat, size = 46) {
      const id = `tg${++svgSeq}`;
      const pal = { DOMESTIC_LEAGUE: ['#fff1b8', '#d9a520', '#8a6412'], DOMESTIC_CUP: ['#ffffff', '#b9c3d0', '#6c7686'], CONTINENTAL: ['#f4f7ff', '#a9b8d6', '#56627c'], INTERNATIONAL: ['#fff1b8', '#e0b030', '#7a5a0c'], SECOND_TIER: ['#ffe0c2', '#c98a4b', '#6e4520'], AWARD: ['#f3e8ff', '#b79cf0', '#5b3f9a'] }[cat] || ['#fff1b8', '#d9a520', '#8a6412'];
      const ears = cat === 'CONTINENTAL'
        ? `<path d="M15 9C5 6 4 22 15 22" fill="none" stroke="url(#${id})" stroke-width="3.2"/><path d="M33 9C43 6 44 22 33 22" fill="none" stroke="url(#${id})" stroke-width="3.2"/>`
        : `<path d="M15 10H9c0 6 3 9 7 10" fill="none" stroke="url(#${id})" stroke-width="2.6"/><path d="M33 10h6c0 6-3 9-7 10" fill="none" stroke="url(#${id})" stroke-width="2.6"/>`;
      if (cat === 'AWARD') return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient></defs><path d="M17 4h14l-4 12h-6z" fill="${pal[2]}"/><circle cx="24" cy="27" r="12" fill="url(#${id})"/><path d="M24 20l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="${pal[2]}" opacity=".7"/></svg>`;
      const top = cat === 'INTERNATIONAL' ? `<circle cx="24" cy="9" r="6" fill="url(#${id})"/><path d="M18 9h12M24 3c-2.5 3-2.5 9 0 12M24 3c2.5 3 2.5 9 0 12" stroke="${pal[2]}" stroke-width=".8" fill="none"/>` : '';
      return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient></defs>${ears}<path d="M14 ${cat === 'INTERNATIONAL' ? 13 : 6}h20v${cat === 'INTERNATIONAL' ? 4 : 9}c0 7-4.5 12-10 12s-10-5-10-12z" fill="url(#${id})"/>${top}<rect x="21.5" y="27" width="5" height="7" fill="url(#${id})"/><path d="M15 34h18l2 6H13z" fill="url(#${id})"/><rect x="11" y="40" width="26" height="4.5" rx="1" fill="${pal[2]}"/></svg>`;
    }
    function ballSVG(size = 120) {
      const id = `bl${++svgSeq}`;
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff8d6"/><stop offset=".45" stop-color="#f2c94c"/><stop offset="1" stop-color="#7d5a0e"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="url(#${id})" stroke="#6b4d0c" stroke-width="2"/><polygon points="50,31 64,41 59,57 41,57 36,41" fill="#6e4f0c" opacity=".8"/><path d="M50 31V8M64 41l21-8M59 57l14 19M41 57L27 76M36 41l-21-8" stroke="#6e4f0c" stroke-width="2" opacity=".7"/><path d="M42 6l8 2 8-2M86 30l-1 9 6 7M74 80l-1-6-8-3M26 80l1-6 8-3M14 30l1 9-6 7" stroke="#6e4f0c" stroke-width="2" fill="none" opacity=".55"/></svg>`;
    }

    /* ---------------- Market value chart ---------------- */
    function niceStep(x) {
      const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 0.0001))));
      for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p;
      return 10 * p;
    }
    function valueChartSVG({ history, proj = null, projColor = '#4ea8ff', w = 560, h = 190, maxAge = null, rival = null }) {
      const id = `vc${++svgSeq}`;
      const pad = { l: 46, r: 14, t: 12, b: 24 };
      const pts = history && history.length ? history : [{ age: 17, valueM: 0 }];
      const projPath = proj && proj.path && proj.path.length ? proj.path : null;
      const a0 = 17;
      const a1 = Math.max(a0 + 4, ...pts.map((p) => p.age), projPath ? projPath[projPath.length - 1].age : 0, maxAge || 0);
      const vMaxRaw = Math.max(4, ...pts.map((p) => p.valueM), ...(projPath ? projPath.map((p) => p.p90) : [0]), ...(rival ? rival.map((p) => p.valueM) : [0]));
      const step = niceStep(vMaxRaw / 4);
      const vMax = Math.ceil((vMaxRaw * 1.05) / step) * step;
      const X = (a) => pad.l + ((a - a0) / (a1 - a0)) * (w - pad.l - pad.r);
      const Y = (v) => h - pad.b - (v / vMax) * (h - pad.t - pad.b);
      let grid = '';
      for (let v = 0; v <= vMax + 1e-9; v += step) grid += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,${v === 0 ? 0.16 : 0.06})"/><text x="${pad.l - 6}" y="${Y(v) + 3.5}" text-anchor="end" font-size="10" fill="#6d7584" font-family="ui-monospace,monospace">€${v >= 10 ? Math.round(v) : v}M</text>`;
      const tickEvery = Math.max(1, Math.ceil((a1 - a0) / 9));
      for (let a = a0; a <= a1; a += tickEvery) grid += `<text x="${X(a)}" y="${h - 7}" text-anchor="middle" font-size="10" fill="#6d7584" font-family="ui-monospace,monospace">${a}</text>`;
      const line = pts.map((p) => `${X(p.age).toFixed(1)},${Y(p.valueM).toFixed(1)}`).join(' ');
      const area = `${X(pts[0].age)},${Y(0)} ${line} ${X(pts[pts.length - 1].age)},${Y(0)}`;
      let rivalSvg = '';
      if (rival && rival.length > 1) rivalSvg = `<polyline points="${rival.map((p) => `${X(p.age).toFixed(1)},${Y(p.valueM).toFixed(1)}`).join(' ')}" fill="none" stroke="#a78bfa" stroke-width="1.6" stroke-dasharray="3 3" opacity=".8"/>`;
      let projSvg = '';
      if (projPath) {
        const last = pts[pts.length - 1];
        const up = [{ age: last.age, v: last.valueM }, ...projPath.map((p) => ({ age: p.age, v: p.p90 }))];
        const lo = [{ age: last.age, v: last.valueM }, ...projPath.map((p) => ({ age: p.age, v: p.p10 }))].reverse();
        const band = [...up, ...lo].map((p) => `${X(p.age).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
        const med = [{ age: last.age, v: last.valueM }, ...projPath.map((p) => ({ age: p.age, v: p.med }))].map((p) => `${X(p.age).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
        const end = projPath[projPath.length - 1];
        const fog = scoutLevel() === 'FOG';
        projSvg = `<polygon points="${band}" fill="${projColor}" opacity="${fog ? 0.28 : 0.18}"/>${fog ? '' : `<polyline points="${med}" fill="none" stroke="${projColor}" stroke-width="2.4" stroke-dasharray="6 4"/><circle cx="${X(end.age)}" cy="${Y(end.med)}" r="4.5" fill="${projColor}" stroke="#0b0d10" stroke-width="1.5"/><text x="${Math.min(X(end.age), w - pad.r - 4)}" y="${Math.max(Y(end.p90) - 6, 10)}" text-anchor="end" font-size="10.5" font-weight="800" fill="${projColor}" font-family="ui-monospace,monospace">proj ${fmtM(end.med)}</text>`}`;
      }
      const dots = pts.map((p) => `<circle cx="${X(p.age)}" cy="${Y(p.valueM)}" r="2.6" fill="#3ecf6e"><title>Age ${p.age}: ${fmtM(p.valueM)}</title></circle>`).join('');
      const lastPt = pts[pts.length - 1];
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block; max-height:${h + 20}px" role="img" aria-label="Market value chart"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ecf6e" stop-opacity=".35"/><stop offset="1" stop-color="#3ecf6e" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${area}" fill="url(#${id})"/>${rivalSvg}<polyline points="${line}" fill="none" stroke="#3ecf6e" stroke-width="2.4" stroke-linejoin="round"/>${dots}${projSvg}<circle cx="${X(lastPt.age)}" cy="${Y(lastPt.valueM)}" r="5" fill="#8ff0b0" stroke="#0b0d10" stroke-width="1.5"/></svg>`;
    }

    /* ---------------- Events (inbox / review) ---------------- */
    const EVENT_META = {
      FIRST_CONTRACT: { icon: '✍️', cls: 'info', cat: 'Contract', color: '#4ea8ff' }, TRANSFER: { icon: '🔁', cls: 'info', cat: 'Transfer', color: '#4ea8ff' },
      FREE_AGENT: { icon: '🆓', cls: 'info', cat: 'Transfer', color: '#4ea8ff' }, RELEASE_CLAUSE: { icon: '⚡', cls: 'gold', cat: 'Transfer', color: '#f5a524' },
      BIDDING_WAR: { icon: '💰', cls: 'gold', cat: 'Transfer', color: '#f5a524' }, BOYHOOD_RETURN: { icon: '🏠', cls: 'good', cat: 'Transfer', color: '#3ecf6e' },
      RIVAL_BETRAYAL: { icon: '🔥', cls: 'bad', cat: 'Rivalry', color: '#ef5350' }, RESIGNED: { icon: '✍️', cls: 'info', cat: 'Contract', color: '#4ea8ff' },
      EXTENSION: { icon: '✍️', cls: 'info', cat: 'Contract', color: '#4ea8ff' }, EXTENSION_EARLY: { icon: '📝', cls: 'good', cat: 'Contract', color: '#3ecf6e' },
      MANAGER_CHANGE: { icon: '🔄', cls: 'good', cat: 'Club', color: '#3ecf6e' }, MANAGER_PEACE: { icon: '🤝', cls: 'good', cat: 'Club', color: '#3ecf6e' },
      UNWANTED: { icon: '⚠️', cls: 'bad', cat: 'Club', color: '#ef5350' }, TRANSFER_REQUEST: { icon: '📨', cls: 'bad', cat: 'Club', color: '#ef5350' },
      YOUTH_LOAN: { icon: '🌱', cls: 'info', cat: 'Loan', color: '#a78bfa' }, SEASON_LOAN: { icon: '🧳', cls: 'info', cat: 'Loan', color: '#a78bfa' },
      FOUGHT_BACK: { icon: '💪', cls: 'good', cat: 'Squad', color: '#3ecf6e' }, INJURY: { icon: '🏥', cls: 'bad', cat: 'Medical', color: '#ef5350' },
      ACCOLADE: { icon: '👟', cls: 'gold', cat: 'Award', color: '#f2c94c' }, AWARD: { icon: '🥇', cls: 'gold', cat: 'Award', color: '#f2c94c' },
      CAPTAIN: { icon: '©️', cls: 'good', cat: 'Club', color: '#3ecf6e' }, NATIONAL_CAPTAIN: { icon: '🎗️', cls: 'gold', cat: 'International', color: '#f2c94c' },
      TROPHY: { icon: '🏆', cls: 'gold', cat: 'Trophy', color: '#f2c94c' }, RELEGATED: { icon: '📉', cls: 'bad', cat: 'Club', color: '#ef5350' },
      PROMOTED: { icon: '⬆️', cls: 'good', cat: 'Club', color: '#3ecf6e' }, INTL_GLORY: { icon: '🌍', cls: 'gold', cat: 'International', color: '#f2c94c' },
      INTL_CAP: { icon: '🧳', cls: 'good', cat: 'International', color: '#3ecf6e' }, INTL_SNUB: { icon: '❌', cls: 'bad', cat: 'International', color: '#ef5350' },
      BALLON_DOR: { icon: '🌟', cls: 'gold', cat: "Ballon d'Or", color: '#f2c94c' }, BDO_PODIUM: { icon: '🥈', cls: 'gold', cat: "Ballon d'Or", color: '#f2c94c' },
      RIVAL_BDO: { icon: '😤', cls: 'bad', cat: 'Rival', color: '#a78bfa' }, RIVAL_MOVE: { icon: '🔁', cls: 'info', cat: 'Rival', color: '#a78bfa' },
      ROLE_UP: { icon: '📈', cls: 'good', cat: 'Squad', color: '#3ecf6e' }, CLUB_RECORD: { icon: '🏛️', cls: 'gold', cat: 'Record', color: '#f2c94c' },
      TAPPED_UP: { icon: '🤫', cls: 'info', cat: 'Transfer', color: '#4ea8ff' }, LOYAL: { icon: '❤️', cls: 'good', cat: 'Club', color: '#3ecf6e' },
      CLUB_RISE: { icon: '📈', cls: 'info', cat: 'Around the world', color: '#8b93a1' }, CLUB_FALL: { icon: '📉', cls: 'info', cat: 'Around the world', color: '#8b93a1' },
    };
    const metaFor = (t) => EVENT_META[t] || { icon: '📰', cls: 'info', cat: 'News', color: '#8b93a1' };
    function titleCase(s) { return s.toLowerCase().replace(/(^|[\s(])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/D'or/g, "d'Or").replace(/Fifa/g, 'FIFA'); }
    function splitHeadline(text, type) {
      let m = text.match(/^(.*?)\s*\(Age \d+\):\s*(.*)$/);
      if (m) return { title: titleCase(m[1].replace(/^[^A-Za-z0-9]+/, '').trim()), body: m[2] };
      m = text.match(/^Age \d+(?:–\d+)?:\s*(.*)$/);
      if (m) return { title: metaFor(type).cat, body: m[1] };
      return { title: metaFor(type).cat, body: text.replace(/^[^A-Za-z0-9€]+/, '') };
    }
    function flavorText(ev) {
      const n = gameState ? gameState.playerName : 'The player';
      const club = ev.clubId && CLUB_MAP[ev.clubId] ? CLUB_MAP[ev.clubId].name : 'the club';
      const t = {
        FIRST_CONTRACT: `The academy graduate put pen to paper on a first senior deal. Coaches at ${club} have earmarked ${n} as one to watch.`,
        TRANSFER: `Medicals done and shirt unveiled — ${n} arrives with a clear brief: hit the ground running.`,
        FREE_AGENT: 'No fee changed hands. Agents call it the smartest kind of move; the former employers call it something else.',
        RELEASE_CLAUSE: 'The buyout clause was triggered shortly before the deadline. There was nothing the selling club could do.',
        BIDDING_WAR: "Several of the continent's elite circled for weeks. In the end, one board simply went further than the rest.",
        BOYHOOD_RETURN: 'Supporters packed the training ground to welcome home one of their own for one last chapter.',
        RIVAL_BETRAYAL: `Scarves were burned outside the old stadium within hours. Derby day will never be the same for ${n}.`,
        RESIGNED: `Suitors were lined up, but ${n} chose continuity and fresh terms.`, MANAGER_CHANGE: `A new head coach, a clean slate. ${n} is back in the plans.`,
        UNWANTED: 'Training-ground sources describe the relationship with the manager as "beyond repair". Minutes will be scarce.',
        YOUTH_LOAN: "A season of regular first-team football should accelerate the youngster's development.", SEASON_LOAN: 'Regular football at last — a chance to remind everyone what they were missing.',
        INJURY: 'The medical team expects a lengthy recovery. A cautious return-to-play plan is in place.', ACCOLADE: 'A season to remember — the numbers speak for themselves and the awards followed.',
        AWARD: 'Peers, pundits and supporters agreed: few players had a better season.', CAPTAIN: 'The armband is a sign of trust from the dressing room and the coaching staff alike.',
        TROPHY: `Champagne in the dressing room, an open-top bus through the city, and a medal around ${n}'s neck.`, RELEGATED: 'A grim afternoon. The club drops a division and the rebuild starts immediately.',
        PROMOTED: 'Back where they belong. The club bounced straight back up.', INTL_GLORY: `National heroes. ${n} returns home with a winner's medal on the biggest stage of all.`,
        INTL_CAP: `${n} made the squad and pulled on the national shirt at a major tournament.`, INTL_SNUB: "The national coach was blunt: players who aren't playing well for their clubs don't play for their country.",
        BALLON_DOR: 'Voted the best footballer on the planet. A night that defines a career.', BDO_PODIUM: 'So close. On another night, in another year, the golden ball would have been theirs.',
        RIVAL_BDO: `Cameras caught ${n} applauding politely from the third row. Insiders say the hunger has never been greater.`, RIVAL_MOVE: 'The rivalry takes a new turn. Every derby, every award night, the comparisons continue.',
        ROLE_UP: 'The coaching staff have rewarded consistent performances with a bigger role in the squad.', CLUB_RECORD: 'History made. The name goes up on the honours board at the training ground.',
        NATIONAL_CAPTAIN: 'Leading the nation out is an honour few players ever get.', TAPPED_UP: 'Nothing official yet — but everyone in the game knows what is coming.',
        TRANSFER_REQUEST: 'The letter is on the chairman’s desk. A summer exit now looks inevitable.', MANAGER_PEACE: 'Handshakes, smiles and a group photo. Football moves on quickly.',
        LOYAL: 'The supporters responded with a banner at the next home game.', EXTENSION_EARLY: 'The club moved early to protect one of its most valuable assets.',
        FOUGHT_BACK: 'Extra sessions, no complaints — and the manager noticed.', CLUB_RISE: 'A sign of how quickly the football landscape can shift.', CLUB_FALL: 'A sign of how quickly the football landscape can shift.',
      };
      return t[ev.type] || ev.body || '';
    }

    /* ---------------- Reputation, form, attributes ---------------- */
    function reputation(s) {
      const pos = POSITION_PROFILES[s.setup.position];
      const majors = s.trophies.filter((t) => MAJOR_TROPHY_TYPES.has(t.category)).length;
      const score = (s.marketValueM / pos.maxBaseValueM) * 100 + majors * 3 + s.stats.ballonDOrs * 25;
      const levels = ['Local', 'Regional', 'National', 'Continental', 'Worldwide', 'Legendary'];
      const thresholds = [0, 8, 18, 34, 56, 85];
      let lvl = 0;
      thresholds.forEach((t, i) => { if (score >= t) lvl = i; });
      return { level: lvl, label: levels[lvl] };
    }
    function repHTML(s) {
      const r = reputation(s);
      return `<div class="rep" title="Reputation: ${r.label}">${[0, 1, 2, 3, 4, 5].map((i) => `<span class="${i <= r.level ? 'on' : ''}"></span>`).join('')}</div><div class="dim" style="font-size:11px">Reputation · <b style="color:var(--text)">${r.label}</b></div>`;
    }
    function formHTML(s) {
      const last = s.seasonLog.slice(-5);
      if (!last.length) return '<div class="dim" style="font-size:11px">No senior seasons yet</div>';
      return `<div class="form">${last.map((x) => `<span class="rat" style="background:${ratingColor(x.rating)}" title="${x.season}: ${x.rating}">${x.rating.toFixed(1)}</span>`).join('')}</div>`;
    }
    function attributesHTML(s, compareTo = null) {
      const keys = attrKeysFor(s.setup.position);
      const w = POS_ATTR_WEIGHTS[s.setup.position];
      const ovr = overallRating(s.setup.position, s.attributes);
      const prev = compareTo || (s.seasonLog.length ? s.seasonLog[s.seasonLog.length - 1].attrsBefore : null);
      return `<div class="ovr"><span class="n" style="color:${attrColor(ovr)}">${ovr.toFixed(1)}</span><span class="dim">overall (position-weighted, 1–20)</span></div>
        <div class="attr-grid">${keys.map((k) => {
          const v = s.attributes[k];
          const d = prev ? v - prev[k] : 0;
          return `<div class="attr-row" title="${ATTR_LABELS[k]} · weight ×${w[k]}"><span class="an">${ATTR_LABELS[k]}${w[k] >= 1.3 ? ' <span class="pill pill-info" style="font-size:9.5px">key</span>' : ''}</span><span><span class="av" style="color:${attrColor(v)}">${Math.round(v)}</span><span class="ad" style="color:${d > 0.15 ? 'var(--pos)' : d < -0.15 ? 'var(--neg)' : 'var(--text-3)'}">${Math.abs(d) > 0.15 ? `${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)}` : ''}</span></span></div>`;
        }).join('')}</div>`;
    }

    /* ---------------- Sound (synthesised, no files) ---------------- */
    let audioCtx = null;
    function sfx(kind) {
      if (!prefs.sound) return;
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtx;
        const now = ctx.currentTime;
        const tone = (freq, start, dur, type = 'sine', vol = 0.12) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = type; o.frequency.setValueAtTime(freq, now + start);
          g.gain.setValueAtTime(0.0001, now + start); g.gain.exponentialRampToValueAtTime(vol, now + start + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          o.connect(g).connect(ctx.destination); o.start(now + start); o.stop(now + start + dur + 0.05);
          return o;
        };
        const noise = (start, dur, vol = 0.18, freq = 900) => {
          const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
          const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource(); src.buffer = buf;
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.6;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now + start); g.gain.exponentialRampToValueAtTime(vol, now + start + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          src.connect(f).connect(g).connect(ctx.destination); src.start(now + start); src.stop(now + start + dur);
        };
        if (kind === 'whistle') { const o = tone(2600, 0, 0.35, 'sine', 0.08); o.frequency.setValueAtTime(2600, now); o.frequency.linearRampToValueAtTime(2900, now + 0.12); tone(2700, 0.42, 0.6, 'sine', 0.08); }
        else if (kind === 'crowd') noise(0, 1.6, 0.22, 700);
        else if (kind === 'trophy') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.1)); noise(0.2, 1.4, 0.16, 800); }
        else if (kind === 'stamp') { tone(110, 0, 0.18, 'square', 0.12); noise(0, 0.15, 0.2, 300); }
        else if (kind === 'click') tone(880, 0, 0.06, 'sine', 0.05);
        else if (kind === 'bad') { tone(330, 0, 0.25, 'sawtooth', 0.05); tone(247, 0.18, 0.35, 'sawtooth', 0.05); }
        else if (kind === 'buzz') { tone(180, 0, 0.09, 'square', 0.05); tone(180, 0.13, 0.09, 'square', 0.05); }
        else if (kind === 'drum') { for (let i = 0; i < 14; i++) noise(i * 0.09, 0.08, 0.14, 160); tone(98, 1.3, 0.4, 'triangle', 0.12); }
        else if (kind === 'ballon') { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.14, 0.7, 'triangle', 0.09)); noise(0.3, 2.2, 0.2, 750); }
      } catch { /* audio unavailable */ }
    }
    function toggleSound() { prefs.sound = !prefs.sound; savePrefs(); applyPrefs(); if (prefs.sound) sfx('whistle'); renderSettings(); }

    /* ---------------- Settings popover ---------------- */
    function toggleSettings() {
      const el = $('settingsPop');
      el.classList.toggle('hidden');
      if (!el.classList.contains('hidden')) renderSettings();
    }
    function renderSettings() {
      const el = $('settingsPop');
      if (!el || el.classList.contains('hidden')) return;
      const sw = (key, label, sub) => `<label class="set-row"><span><b>${label}</b><div class="dim" style="font-size:11px">${sub}</div></span><span class="switch"><input type="checkbox" ${prefs[key] ? 'checked' : ''} onchange="setPref('${key}', this.checked)"/><span></span></span></label>`;
      el.innerHTML = `<div class="panel-head"><span>Settings</span><button class="btn btn-ghost" style="padding:2px 8px" onclick="toggleSettings()">✕</button></div>
        ${sw('sound', 'Sound effects', 'Whistles, crowd and fanfare (synthesised)')}
        ${sw('colorblind', 'Colour-blind friendly', 'Blue/orange instead of green/red')}
        ${sw('reduceMotion', 'Reduce motion', 'Turn off animations and confetti')}
        ${typeof textSizeSettingHTML === 'function' ? textSizeSettingHTML() : ''}
        ${typeof difficultySettingHTML === 'function' ? difficultySettingHTML() : ''}
        ${typeof detailSettingHTML === 'function' ? detailSettingHTML() : ''}
        ${typeof savesSettingsHTML === 'function' ? savesSettingsHTML() : ''}
        <div class="set-row"><span><b>Look</b><div class="dim" style="font-size:11px">Floodlit night or matchday programme</div></span><span class="seg"><button class="${prefs.theme !== 'programme' ? 'on' : ''}" onclick="setTheme('night')">🌙 Night</button><button class="${prefs.theme === 'programme' ? 'on' : ''}" onclick="setTheme('programme')">📰 Programme</button></span></div>
        <label class="set-row"><span><b>Explain football terms</b><div class="dim" style="font-size:11px">Dotted words you can tap, the first few times</div></span><span class="switch"><input type="checkbox" ${prefs.glossary !== false ? 'checked' : ''} onchange="prefs.glossary = this.checked; savePrefs(); if (gameState) renderPage();"><span></span></span></label>
        <label class="set-row"><span><b>Show every page</b><div class="dim" style="font-size:11px">Skip the step-by-step reveal in guided careers</div></span><span class="switch"><input type="checkbox" ${prefs.showAll ? 'checked' : ''} onchange="prefs.showAll = this.checked; savePrefs(); if (gameState) renderApp();"><span></span></span></label>
        ${gameState && !$('screenApp').classList.contains('hidden') ? `<div class="set-row"><span><b>Main menu</b><div class="dim" style="font-size:11px">Your career is saved. Pick it up from the menu.</div></span><button class="btn" onclick="toggleSettings(); resetToSetup()">Main menu</button></div>` : ''}
        <div class="set-row"><span><b>Tutorial</b><div class="dim" style="font-size:11px">Walk through the Transfer Centre again</div></span><button class="btn" onclick="toggleSettings(); startTour(true)">Replay</button></div>
        <div class="panel-head" style="border-top:1px solid var(--line)">Keyboard shortcuts</div>
        <div class="shortcuts"><span class="kbd">Enter</span><span>Continue / confirm selected offer</span><span class="kbd">↑ ↓</span><span>Move between offers</span><span class="kbd">1–9</span><span>Select an offer</span><span class="kbd">G</span><span>Go to Transfer Centre</span><span class="kbd">H</span><span>Home</span><span class="kbd">Space</span><span>Skip the season review</span><span class="kbd">Esc</span><span>Close dialogs</span></div>`;
    }
    function setPref(key, val) {
      prefs[key] = !!val; savePrefs(); applyPrefs();
      if (gameState && !$('screenApp').classList.contains('hidden')) renderPage();
      if (!$('screenSetup').classList.contains('hidden')) updateSetupPreview();
    }

    /* ---------------- Toasts & confetti ---------------- */
    /* Single notification ticker: one message at a time, newest replaces older, queue of up to 3. */
    const tickerQ = [];
    let tickerBusy = false;
    function showToast(title, body, color = 'var(--accent)') {
      tickerQ.push({ title, body, color });
      while (tickerQ.length > 3) tickerQ.shift();
      if (!tickerBusy) nextTicker();
    }
    function nextTicker() {
      const host = $('toasts');
      const m = tickerQ.shift();
      if (!host || !m) { tickerBusy = false; if (host) host.classList.remove('on'); return; }
      tickerBusy = true;
      host.style.setProperty('--tk', m.color);
      host.innerHTML = `<div class="tk"><b>${esc(m.title)}</b><span>${esc(m.body)}</span>${tickerQ.length ? `<em>+${tickerQ.length}</em>` : ''}<button aria-label="Dismiss" onclick="nextTicker()">✕</button></div>`;
      host.classList.add('on');
      clearTimeout(host._t);
      host._t = setTimeout(nextTicker, tickerQ.length ? 2200 : 3800);
    }
    const confettiState = { parts: [], running: false };
    function confettiBurst({ count = 120, colors = ['#3ecf6e', '#f2c94c', '#4ea8ff', '#ef5350', '#a78bfa', '#ffffff'], x = 0.5, y = 0.32, spread = 1 } = {}) {
      if (motionOff()) return;
      const cv = $('confetti');
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== innerWidth * dpr || cv.height !== innerHeight * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (4 + Math.random() * 10) * spread;
        confettiState.parts.push({ x: x * innerWidth, y: y * innerHeight, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, size: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, color: colors[i % colors.length], life: 0, max: 110 + Math.random() * 80, round: Math.random() < 0.3 });
      }
      if (!confettiState.running) { confettiState.running = true; requestAnimationFrame(confettiTick); }
    }
    function confettiTick() {
      const cv = $('confetti');
      const ctx = cv.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      confettiState.parts.forEach((p) => {
        p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      confettiState.parts = confettiState.parts.filter((p) => p.life < p.max && p.y < innerHeight + 40);
      if (confettiState.parts.length) requestAnimationFrame(confettiTick);
      else { confettiState.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
