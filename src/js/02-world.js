    /* ==========================================================================
     * LAYER 1b: v5 WORLD EXTENSIONS
     * Seeded RNG, nations, attributes, training, agents, wages, club dynamics.
     * ========================================================================== */

    /* ---------- Seeded randomness (shareable career codes) ---------- */
    // rand() uses the active career's seed. Projections (DRY_RUN) use their own stream, so
    // previewing offers never changes what will actually happen. v14: that stream is seeded from the
    // career, the window and the offer, so the same offer always shows the same Fit after a reload.
    const RNG = { holder: null };
    const PROJ_RNG = { s: 0 };
    function hashSeed(str) {
      let h = 1779033703 ^ String(str).length;
      for (let i = 0; i < String(str).length; i++) {
        h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) || 1;
    }
    function rand() {
      const h = RNG.holder;
      if (DRY_RUN && PROJ_RNG.s) {
        let t = (PROJ_RNG.s = (PROJ_RNG.s + 0x6d2b79f5) | 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      if (DRY_RUN || !h || !h.rng) return Math.random();
      let t = (h.rng.s = (h.rng.s + 0x6d2b79f5) | 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function randomSeedString() {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let out = '';
      for (let i = 0; i < 6; i++) out += abc[Math.floor(Math.random() * abc.length)];
      return out;
    }
    const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];

    /* ---------- Nations (international careers) ---------- */
    const NATIONS = {
      EUROPE: [
        { id: 'ESP', name: 'Spain', str: 1.25 }, { id: 'FRA', name: 'France', str: 1.25 }, { id: 'ENG', name: 'England', str: 1.15 },
        { id: 'GER', name: 'Germany', str: 1.15 }, { id: 'POR', name: 'Portugal', str: 1.12 }, { id: 'ITA', name: 'Italy', str: 1.08 },
        { id: 'NED', name: 'Netherlands', str: 1.05 }, { id: 'BEL', name: 'Belgium', str: 1.0 }, { id: 'CRO', name: 'Croatia', str: 0.95 },
        { id: 'NOR', name: 'Norway', str: 0.85 }, { id: 'POL', name: 'Poland', str: 0.8 }, { id: 'SCO', name: 'Scotland', str: 0.75 },
      ],
      SOUTH_AMERICA: [
        { id: 'ARG', name: 'Argentina', str: 1.3 }, { id: 'BRA', name: 'Brazil', str: 1.25 }, { id: 'URU', name: 'Uruguay', str: 1.0 },
        { id: 'COL', name: 'Colombia', str: 0.95 }, { id: 'ECU', name: 'Ecuador', str: 0.85 }, { id: 'PAR', name: 'Paraguay', str: 0.75 },
        { id: 'CHI', name: 'Chile', str: 0.75 }, { id: 'PER', name: 'Peru', str: 0.65 },
      ],
      ASIA: [
        { id: 'JPN', name: 'Japan', str: 1.0 }, { id: 'KOR', name: 'South Korea', str: 0.95 }, { id: 'IRN', name: 'Iran', str: 0.85 },
        { id: 'AUS', name: 'Australia', str: 0.85 }, { id: 'KSA', name: 'Saudi Arabia', str: 0.8 }, { id: 'UZB', name: 'Uzbekistan', str: 0.72 },
        { id: 'QAT', name: 'Qatar', str: 0.7 }, { id: 'CHN', name: 'China', str: 0.6 },
      ],
      AFRICA: [
        { id: 'MAR', name: 'Morocco', str: 1.05 }, { id: 'SEN', name: 'Senegal', str: 1.0 }, { id: 'CIV', name: 'Ivory Coast', str: 0.95 },
        { id: 'NGA', name: 'Nigeria', str: 0.95 }, { id: 'EGY', name: 'Egypt', str: 0.9 }, { id: 'ALG', name: 'Algeria', str: 0.85 },
        { id: 'CMR', name: 'Cameroon', str: 0.85 }, { id: 'GHA', name: 'Ghana', str: 0.8 }, { id: 'RSA', name: 'South Africa', str: 0.7 },
      ],
      NORTH_AMERICA: [
        { id: 'USA', name: 'United States', str: 0.95 }, { id: 'MEX', name: 'Mexico', str: 0.95 }, { id: 'CAN', name: 'Canada', str: 0.85 },
        { id: 'CRC', name: 'Costa Rica', str: 0.7 }, { id: 'PAN', name: 'Panama', str: 0.65 }, { id: 'JAM', name: 'Jamaica', str: 0.6 },
      ],
    };
    const NATION_MAP = Object.values(NATIONS).flat().reduce((a, n) => { a[n.id] = n; return a; }, {});
    function getNation(state) {
      return NATION_MAP[state.setup.nation] || NATIONS[state.setup.continent][0];
    }

    /* ---------- Fictional names for the career rival ---------- */
    const NAME_POOLS = {
      EUROPE: { first: ['Luca', 'Mateus', 'Jonas', 'Hugo', 'Marco', 'Kai', 'Theo', 'Rafael', 'Niklas', 'Emil', 'Adrien', 'Tomás'], last: ['Varga', 'Lindqvist', 'Moreau', 'Kessler', 'Ferreira', 'Rossi', 'Novak', 'Brandt', 'Vidal', 'Hartmann', 'Costa', 'Delacroix'] },
      SOUTH_AMERICA: { first: ['Thiago', 'Facundo', 'Joaquín', 'Gabriel', 'Enzo', 'Matías', 'Rodrigo', 'Bruno'], last: ['Almeida', 'Paredes', 'Quiroga', 'Salgado', 'Medina', 'Barros', 'Acosta', 'Duarte'] },
      ASIA: { first: ['Kenji', 'Min-jun', 'Daichi', 'Arash', 'Ryo', 'Hamad', 'Jae-won', 'Liam'], last: ['Takeda', 'Park', 'Mori', 'Rahimi', 'Kwon', 'Al-Sayed', 'Sato', 'Bennett'] },
      AFRICA: { first: ['Moussa', 'Kwame', 'Youssef', 'Ibrahim', 'Samuel', 'Achraf', 'Chidi', 'Thabo'], last: ['Diallo', 'Mensah', 'El Amrani', 'Okafor', 'Traoré', 'Haddad', 'Nkosi', 'Sarr'] },
      NORTH_AMERICA: { first: ['Tyler', 'Diego', 'Jordan', 'Alonso', 'Cameron', 'Marcus', 'Iván', 'Owen'], last: ['Reyes', 'Coleman', 'Navarro', 'Brooks', 'Ochoa', 'Whitaker', 'Vega', 'Sinclair'] },
    };

    /* ---------- FM-style attributes (1–20) ---------- */
    const ATTR_KEYS_OUT = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
    const ATTR_KEYS_GK = ['REF', 'HAN', 'POS', 'KIC', 'COM', 'PHY'];
    const ATTR_LABELS = { PAC: 'Pace', SHO: 'Shooting', PAS: 'Passing', DRI: 'Dribbling', DEF: 'Defending', PHY: 'Physical', REF: 'Reflexes', HAN: 'Handling', POS: 'Positioning', KIC: 'Kicking', COM: 'Command' };
    const PHYSICAL_ATTRS = new Set(['PAC', 'PHY', 'REF']);
    const WINGER_W = { PAC: 1.5, SHO: 1.0, PAS: 0.9, DRI: 1.5, DEF: 0.2, PHY: 0.5 };
    const FULLBACK_W = { PAC: 1.4, SHO: 0.2, PAS: 1.0, DRI: 0.8, DEF: 1.4, PHY: 0.9 };
    const POS_ATTR_WEIGHTS = {
      ST: { PAC: 1.1, SHO: 1.6, PAS: 0.6, DRI: 1.0, DEF: 0.15, PHY: 0.9 },
      LW: WINGER_W, RW: WINGER_W,
      CAM: { PAC: 0.7, SHO: 1.0, PAS: 1.6, DRI: 1.3, DEF: 0.3, PHY: 0.5 },
      CM: { PAC: 0.6, SHO: 0.6, PAS: 1.5, DRI: 0.9, DEF: 0.9, PHY: 0.9 },
      CDM: { PAC: 0.5, SHO: 0.3, PAS: 1.1, DRI: 0.6, DEF: 1.6, PHY: 1.3 },
      CB: { PAC: 0.7, SHO: 0.1, PAS: 0.6, DRI: 0.3, DEF: 1.8, PHY: 1.5 },
      LB: FULLBACK_W, RB: FULLBACK_W,
      GK: { REF: 1.6, HAN: 1.3, POS: 1.4, KIC: 0.6, COM: 1.0, PHY: 0.6 },
    };
    const attrKeysFor = (pos) => (pos === 'GK' ? ATTR_KEYS_GK : ATTR_KEYS_OUT);

    const TRAINING_FOCUS = {
      BALANCED: { label: 'Balanced', icon: '⚖️', desc: 'Small gains across every attribute.', attrs: [] },
      FINISHING: { label: 'Finishing', icon: '🎯', desc: 'Shooting & dribbling drills.', attrs: ['SHO', 'DRI'], outfield: true },
      PLAYMAKING: { label: 'Playmaking', icon: '🧠', desc: 'Passing & dribbling.', attrs: ['PAS', 'DRI'], outfield: true },
      DEFENDING: { label: 'Defending', icon: '🛡️', desc: 'Tackling, positioning, strength.', attrs: ['DEF', 'PHY'], outfield: true },
      ATHLETIC: { label: 'Athleticism', icon: '⚡', desc: 'Pace & physique; 25% lower injury risk.', attrs: ['PAC', 'PHY'], outfield: true },
      SHOT_STOPPING: { label: 'Shot-stopping', icon: '🧤', desc: 'Reflexes & handling.', attrs: ['REF', 'HAN'], gk: true },
      DISTRIBUTION: { label: 'Distribution', icon: '🦶', desc: 'Kicking & positioning.', attrs: ['KIC', 'POS'], gk: true },
      COMMAND: { label: 'Command', icon: '📣', desc: 'Command of area & positioning.', attrs: ['COM', 'POS'], gk: true },
      GK_ATHLETIC: { label: 'Athleticism', icon: '⚡', desc: 'Reflexes & physique; 25% lower injury risk.', attrs: ['REF', 'PHY'], gk: true },
      LEADERSHIP: { label: 'Leadership', icon: '©️', desc: 'No attribute gains, but captaincy is far more likely.', attrs: [] },
    };
    function trainingOptionsFor(pos) {
      return Object.entries(TRAINING_FOCUS).filter(([, f]) => (pos === 'GK' ? !f.outfield : !f.gk)).map(([id, f]) => ({ id, ...f }));
    }

    function initAttributes(position) {
      const w = POS_ATTR_WEIGHTS[position];
      const out = {};
      attrKeysFor(position).forEach((k) => { out[k] = Number(clamp(6 + w[k] * 2.6 + randRange(-1.4, 1.4), 3, 14).toFixed(2)); });
      return out;
    }
    function overallRating(position, attrs) {
      const w = POS_ATTR_WEIGHTS[position];
      let sum = 0; let tw = 0;
      Object.keys(w).forEach((k) => { sum += (attrs[k] || 0) * w[k]; tw += w[k]; });
      return sum / tw;
    }
    // Output modifier: how far your attributes are above or below a "neutral development" twin.
    // Keeps the v4 balance on average while rewarding good training & minutes.
    function attributeModifier(state) {
      if (!state.attributes || !state.attrBaseline) return 1;
      const pos = state.setup.position;
      return clamp(1 + (overallRating(pos, state.attributes) - overallRating(pos, state.attrBaseline)) * 0.045, 0.82, 1.22);
    }
    function developAttributes(state, { apps, maxGames, clubStars, yearAge }) {
      const pos = state.setup.position;
      const prof = POSITION_PROFILES[pos];
      const focus = TRAINING_FOCUS[state.trainingFocus] || TRAINING_FOCUS.BALANCED;
      const minutes = clamp(apps / Math.max(1, maxGames) / 0.65, 0.5, 1.35);
      const coach = 0.85 + clubStars * 0.05;
      const before = { ...state.attributes };
      const step = (attrs, neutral) => {
        attrKeysFor(pos).forEach((k) => {
          let g;
          if (yearAge < prof.peakStart) g = 0.62 * (yearAge <= 20 ? 1.15 : 1);
          else if (yearAge <= prof.peakEnd) g = 0.08;
          else g = (PHYSICAL_ATTRS.has(k) ? -0.75 : -0.3) * (1 + (yearAge - prof.peakEnd) * 0.08);
          if (!neutral && g > 0) g *= minutes * coach;
          const f = neutral ? TRAINING_FOCUS.BALANCED : focus;
          if (f.attrs.length) { if (f.attrs.includes(k)) g += yearAge <= prof.peakEnd + 2 ? 0.45 : 0.25; else g -= 0.05; }
          else if (f === TRAINING_FOCUS.BALANCED) g += 0.12;
          if (!neutral) g += randRange(-0.25, 0.25);
          attrs[k] = Number(clamp(attrs[k] + g, 1, 20).toFixed(2));
        });
      };
      step(state.attributes, false);
      step(state.attrBaseline, true);
      return before;
    }

    /* ---------- Agents ---------- */
    const AGENT_TYPES = {
      SHARK: { id: 'SHARK', label: 'Shark', icon: '🦈', sub: 'Bigger fees & wages · more drama · tougher talks', feeMult: 1.12, wageMult: 1.12, pushChance: 0.55, negotiateBonus: -0.06, walkAwayMult: 1.45, loyaltyBonus: 0 },
      BALANCED: { id: 'BALANCED', label: 'Balanced', icon: '🤝', sub: 'No strong bias either way', feeMult: 1, wageMult: 1, pushChance: 0.35, negotiateBonus: 0, walkAwayMult: 1, loyaltyBonus: 0 },
      LOYAL: { id: 'LOYAL', label: 'Loyalist', icon: '🏠', sub: 'Smoother talks · loyalty pays · fewer big moves', feeMult: 0.95, wageMult: 0.93, pushChance: 0.15, negotiateBonus: 0.1, walkAwayMult: 0.6, loyaltyBonus: 0.02 },
    };
    const agentOf = (state) => AGENT_TYPES[state.setup.agentType] || AGENT_TYPES.BALANCED;

    /* ---------- Wages ---------- */
    const LEAGUE_WAGE = {
      'Premier League': 1.3, 'La Liga': 1.1, 'Bundesliga': 1.05, 'Serie A': 1.0, 'Ligue 1': 0.95, 'Saudi Pro League': 3.0,
      'Chinese Super League': 1.5, 'Major League Soccer': 1.05, 'Liga MX': 0.8, 'Campeonato Brasileiro Série A': 0.7,
      'Argentine Primera División': 0.45, 'J1 League': 0.6, 'Egyptian Premier League': 0.35, 'South African Premier Division': 0.35,
      'Primeira Liga': 0.6, 'Eredivisie': 0.65, 'Belgian Pro League': 0.55, 'A-League Men': 0.45,
    };
    const WEALTH_WAGE = { rich: 1.35, historic: 1.1, standard: 0.85 };
    const ROLE_WAGE = { PROSPECT: 0.45, ROTATION: 0.75, KEY_PLAYER: 1.0, STAR: 1.35 };
    function computeWage(state, club, role) {
      const base = Math.max(0.2, state.marketValueM * 0.085 + 0.4);
      let w = base * (LEAGUE_WAGE[club.league] || 0.8) * (WEALTH_WAGE[club.wealthTier] || 1) * (ROLE_WAGE[role] || 0.75);
      if (state.currentAge >= 32) w *= 0.9;
      w *= agentOf(state).wageMult;
      return Number(clamp(w, 0.04, 90).toFixed(2));
    }

    /* ---------- Release clauses ---------- */
    const CLAUSE_TYPES = {
      none: { label: 'No clause', mult: null, hijack: 0 },
      high: { label: 'High clause', mult: 1.7, hijack: 0.12 },
      standard: { label: 'Standard clause', mult: 1.25, hijack: 0.25 },
      low: { label: 'Low clause', mult: 0.95, hijack: 0.45 },
    };
    const clauseAmount = (valueM, clause) => (CLAUSE_TYPES[clause] && CLAUSE_TYPES[clause].mult ? Number(Math.max(1, valueM * CLAUSE_TYPES[clause].mult).toFixed(1)) : null);

    /* ---------- Dynamic club strength ---------- */
    const BASE_CLUB_STATS = CLUBS.reduce((a, c) => { a[c.id] = { starRating: c.starRating, trophyOdds: c.trophyOdds }; return a; }, {});
    function applyClubDynamics(state) {
      CLUBS.forEach((c) => {
        const b = BASE_CLUB_STATS[c.id];
        const d = (state && state.clubDynamics && state.clubDynamics[c.id]) || 0;
        c.starRating = clamp(b.starRating + d, 1, 5);
        c.trophyOdds = Number(clamp(b.trophyOdds * (1 + d * 0.35), 0.01, 0.5).toFixed(3));
      });
    }
    function evolveClubs(state) {
      const changes = [];
      CLUBS.forEach((c) => {
        if (rand() >= 0.05) return;
        const cur = state.clubDynamics[c.id] || 0;
        let dir = rand() < 0.5 ? -1 : 1;
        if (cur >= 1) dir = rand() < 0.72 ? -1 : 1;
        if (cur <= -1) dir = rand() < 0.72 ? 1 : -1;
        const next = clamp(cur + dir, -2, 2);
        const base = BASE_CLUB_STATS[c.id].starRating;
        const from = clamp(base + cur, 1, 5);
        const to = clamp(base + next, 1, 5);
        if (from === to) return;
        state.clubDynamics[c.id] = next;
        changes.push({ id: c.id, from, to });
      });
      applyClubDynamics(state);
      return changes;
    }
    const clubTrend = (state, id) => ((state && state.clubDynamics && state.clubDynamics[id]) || 0);

    /* ---------- Club records & shirt numbers ---------- */
    function clubRecord(clubId) {
      const b = BASE_CLUB_STATS[clubId] || { starRating: 3 };
      const h = hashStr(clubId);
      return {
        goals: Math.round(70 + b.starRating * 45 + (h % 60)),
        cleanSheets: Math.round(60 + b.starRating * 25 + ((h >> 9) % 40)),
        apps: Math.round(330 + b.starRating * 55 + ((h >> 5) % 120)),
      };
    }
    const CLASSIC_NUMBERS = { ST: 9, LW: 11, RW: 7, CAM: 10, CM: 8, CDM: 6, CB: 4, LB: 3, RB: 2, GK: 1 };
    function assignShirtNumber(position, role) {
      if (role === 'STAR' || (role === 'KEY_PLAYER' && rand() < 0.7) || (role === 'ROTATION' && rand() < 0.3)) return CLASSIC_NUMBERS[position];
      if (position === 'GK') return pickOne([13, 23, 25, 31]);
      return 14 + Math.floor(rand() * 26);
    }
