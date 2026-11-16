    /* ==========================================================================
     * LAYER 1: DATA & WORLD LAYER (346 CLUBS, 18 LEAGUES, 5 CONFEDS)
     * ========================================================================== */
    const ROLE_ORDER = ['PROSPECT', 'ROTATION', 'KEY_PLAYER', 'STAR'];
    const MAJOR_TROPHY_TYPES = new Set(['DOMESTIC_LEAGUE', 'CONTINENTAL', 'INTERNATIONAL']);

    const randRange = (min, max) => min + rand() * (max - min);
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const CONTINENTS = {
      EUROPE: {
        id: 'EUROPE',
        confederation: 'UEFA',
        label: 'Europe',
        tournamentName: 'UEFA European Championship',
        clubContinentalCup: 'UEFA Champions League',
        breakoutMultiplier: 1.0,
        earlyMinutesBonus: 0,
      },
      SOUTH_AMERICA: {
        id: 'SOUTH_AMERICA',
        confederation: 'CONMEBOL',
        label: 'South America',
        tournamentName: 'CONMEBOL Copa América',
        clubContinentalCup: 'CONMEBOL Copa Libertadores',
        breakoutMultiplier: 1.25,
        earlyMinutesBonus: 6,
      },
      ASIA: {
        id: 'ASIA',
        confederation: 'AFC',
        label: 'Asia',
        tournamentName: 'AFC Asian Cup',
        clubContinentalCup: 'AFC Champions League Elite',
        breakoutMultiplier: 1.3,
        earlyMinutesBonus: 8,
      },
      AFRICA: {
        id: 'AFRICA',
        confederation: 'CAF',
        label: 'Africa',
        tournamentName: 'CAF Africa Cup of Nations (AFCON)',
        clubContinentalCup: 'CAF Champions League',
        breakoutMultiplier: 1.3,
        earlyMinutesBonus: 8,
      },
      NORTH_AMERICA: {
        id: 'NORTH_AMERICA',
        confederation: 'CONCACAF',
        label: 'North & Central America',
        tournamentName: 'CONCACAF Gold Cup',
        clubContinentalCup: 'CONCACAF Champions Cup',
        breakoutMultiplier: 1.25,
        earlyMinutesBonus: 7,
      },
    };

    const TOURNAMENT_SCHEDULE = {
      18: { type: 'CONTINENTAL', label: 'Continental Championship' },
      22: { type: 'WORLD_CUP', label: 'FIFA World Cup' },
      26: { type: 'CONTINENTAL', label: 'Continental Championship' },
      30: { type: 'WORLD_CUP', label: 'FIFA World Cup' },
      34: { type: 'CONTINENTAL', label: 'Continental Championship' },
      38: { type: 'WORLD_CUP', label: 'FIFA World Cup' },
    };

    const WINGER_BASE = {
      category: 'FWD', primaryStatType: 'ATTACK',
      baseGoalsPerApp: 0.42, baseAssistsPerApp: 0.30, baseCleanSheetRate: 0,
      baseTacklesPerApp: 0.6, baseSavePct: 0,
      yellowProbPerApp: 0.08, redProbPerApp: 0.005,
      peakStart: 24, peakEnd: 28, postPeakDecline: 0.15,
      captaincyChance: 0.12, ballonDOrWeight: 1.20, maxBaseValueM: 170,
    };

    const FULLBACK_BASE = {
      category: 'DEF', primaryStatType: 'DEFENSE',
      baseGoalsPerApp: 0.06, baseAssistsPerApp: 0.19, baseCleanSheetRate: 0.33,
      baseTacklesPerApp: 2.7, baseSavePct: 0,
      yellowProbPerApp: 0.16, redProbPerApp: 0.011,
      peakStart: 25, peakEnd: 30, postPeakDecline: 0.11,
      captaincyChance: 0.22, ballonDOrWeight: 0.90, maxBaseValueM: 105,
    };

    // v13: value growth per position (positive seasons only). Forwards appreciate fastest, keepers slowest.
    const VALUE_GROWTH = { ST: 1.2, LW: 1.24, RW: 1.24, CAM: 1.1, CM: 0.93, CDM: 0.9, CB: 0.97, LB: 1.0, RB: 1.0, GK: 0.78 };
    const POSITION_PROFILES = {
      ST: {
        code: 'ST', name: 'Striker', category: 'FWD', primaryStatType: 'ATTACK',
        baseGoalsPerApp: 0.58, baseAssistsPerApp: 0.16, baseCleanSheetRate: 0,
        baseTacklesPerApp: 0.4, baseSavePct: 0,
        yellowProbPerApp: 0.09, redProbPerApp: 0.006,
        peakStart: 25, peakEnd: 29, postPeakDecline: 0.14,
        captaincyChance: 0.15, ballonDOrWeight: 1.25, maxBaseValueM: 180,
      },
      LW: { code: 'LW', name: 'Left Winger', ...WINGER_BASE },
      RW: { code: 'RW', name: 'Right Winger', ...WINGER_BASE },
      CAM: {
        code: 'CAM', name: 'Attacking Midfielder', category: 'MID', primaryStatType: 'ATTACK',
        baseGoalsPerApp: 0.30, baseAssistsPerApp: 0.40, baseCleanSheetRate: 0,
        baseTacklesPerApp: 1.1, baseSavePct: 0,
        yellowProbPerApp: 0.10, redProbPerApp: 0.006,
        peakStart: 25, peakEnd: 30, postPeakDecline: 0.11,
        captaincyChance: 0.25, ballonDOrWeight: 1.15, maxBaseValueM: 155,
      },
      CM: {
        code: 'CM', name: 'Central Midfielder', category: 'MID', primaryStatType: 'ATTACK',
        baseGoalsPerApp: 0.16, baseAssistsPerApp: 0.28, baseCleanSheetRate: 0,
        baseTacklesPerApp: 2.3, baseSavePct: 0,
        yellowProbPerApp: 0.15, redProbPerApp: 0.009,
        peakStart: 26, peakEnd: 31, postPeakDecline: 0.09,
        captaincyChance: 0.40, ballonDOrWeight: 1.05, maxBaseValueM: 140,
      },
      CDM: {
        code: 'CDM', name: 'Defensive Midfielder', category: 'MID', primaryStatType: 'ATTACK',
        baseGoalsPerApp: 0.08, baseAssistsPerApp: 0.16, baseCleanSheetRate: 0.25,
        baseTacklesPerApp: 3.4, baseSavePct: 0,
        yellowProbPerApp: 0.21, redProbPerApp: 0.014,
        peakStart: 26, peakEnd: 31, postPeakDecline: 0.09,
        captaincyChance: 0.38, ballonDOrWeight: 0.95, maxBaseValueM: 125,
      },
      CB: {
        code: 'CB', name: 'Center Back', category: 'DEF', primaryStatType: 'DEFENSE',
        baseGoalsPerApp: 0.07, baseAssistsPerApp: 0.04, baseCleanSheetRate: 0.36,
        baseTacklesPerApp: 3.1, baseSavePct: 0,
        yellowProbPerApp: 0.19, redProbPerApp: 0.016,
        peakStart: 26, peakEnd: 32, postPeakDecline: 0.08,
        captaincyChance: 0.42, ballonDOrWeight: 0.92, maxBaseValueM: 115,
      },
      LB: { code: 'LB', name: 'Left Back', ...FULLBACK_BASE },
      RB: { code: 'RB', name: 'Right Back', ...FULLBACK_BASE },
      GK: {
        code: 'GK', name: 'Goalkeeper', category: 'GK', primaryStatType: 'GK',
        baseGoalsPerApp: 0.001, baseAssistsPerApp: 0.01, baseCleanSheetRate: 0.38,
        baseTacklesPerApp: 0, baseSavePct: 74.5,
        yellowProbPerApp: 0.03, redProbPerApp: 0.004,
        peakStart: 28, peakEnd: 34, postPeakDecline: 0.06,
        captaincyChance: 0.35, ballonDOrWeight: 0.88, maxBaseValueM: 95,
      },
    };

    const LEAGUES = {
      'Premier League': { prestige: 1.30, domesticCup: 'FA Cup', hasRelegation: true },
      'La Liga': { prestige: 1.28, domesticCup: 'Copa del Rey', hasRelegation: true },
      'Bundesliga': { prestige: 1.22, domesticCup: 'DFB-Pokal', hasRelegation: true },
      'Serie A': { prestige: 1.22, domesticCup: 'Coppa Italia', hasRelegation: true },
      'Ligue 1': { prestige: 1.15, domesticCup: 'Coupe de France', hasRelegation: true },
      'Campeonato Brasileiro Série A': { prestige: 1.08, domesticCup: 'Copa do Brasil', hasRelegation: true },
      'Argentine Primera División': { prestige: 1.04, domesticCup: 'Copa Argentina', hasRelegation: true },
      'Saudi Pro League': { prestige: 0.96, domesticCup: "King's Cup", hasRelegation: true },
      'J1 League': { prestige: 0.92, domesticCup: "Emperor's Cup", hasRelegation: true },
      'Chinese Super League': { prestige: 0.84, domesticCup: 'Chinese FA Cup', hasRelegation: true },
      'Egyptian Premier League': { prestige: 0.90, domesticCup: 'Egypt Cup', hasRelegation: true },
      'South African Premier Division': { prestige: 0.88, domesticCup: 'Nedbank Cup', hasRelegation: true },
      'Liga MX': { prestige: 0.96, domesticCup: 'Campeón de Campeones', hasRelegation: false },
      'Major League Soccer': { prestige: 0.90, domesticCup: 'U.S. Open Cup', hasRelegation: false },
      'Primeira Liga': { prestige: 1.06, domesticCup: 'Taça de Portugal', hasRelegation: true },
      'Eredivisie': { prestige: 1.04, domesticCup: 'KNVB Cup', hasRelegation: true },
      'Belgian Pro League': { prestige: 0.98, domesticCup: 'Belgian Cup', hasRelegation: true },
      'A-League Men': { prestige: 0.80, domesticCup: 'Australia Cup', hasRelegation: false },
    };
    // v5: named second divisions, so relegation sends you somewhere real.
    const SECOND_TIERS = {
      'Premier League': 'EFL Championship', 'La Liga': 'Segunda División', 'Bundesliga': '2. Bundesliga', 'Serie A': 'Serie B',
      'Ligue 1': 'Ligue 2', 'Campeonato Brasileiro Série A': 'Campeonato Brasileiro Série B', 'Argentine Primera División': 'Primera Nacional',
      'Saudi Pro League': 'Saudi First Division League', 'J1 League': 'J2 League', 'Chinese Super League': 'China League One',
      'Egyptian Premier League': 'Egyptian Second Division', 'South African Premier Division': 'Motsepe Foundation Championship',
      'Primeira Liga': 'Liga Portugal 2', 'Eredivisie': 'Eerste Divisie', 'Belgian Pro League': 'Challenger Pro League',
    };
    const EURO_STEPPING_STONE_LEAGUES = new Set(['Primeira Liga', 'Eredivisie', 'Belgian Pro League', 'Ligue 1']);

    const SQUAD_ROLES = {
      PROSPECT: { id: 'PROSPECT', label: 'Prospect', appRate: 0.32, ratingBonus: -0.2 },
      ROTATION: { id: 'ROTATION', label: 'Rotation', appRate: 0.58, ratingBonus: 0.0 },
      KEY_PLAYER: { id: 'KEY_PLAYER', label: 'Key Player', appRate: 0.82, ratingBonus: 0.25 },
      STAR: { id: 'STAR', label: 'Star Player', appRate: 0.94, ratingBonus: 0.45 },
    };

    const MILESTONES = [
      { id: 'CENTURY_PRIMARY', label: 'Century Club', description: 'Reached 100 career goals (or 100 clean sheets for DEF/GK).' },
      { id: 'APPEARANCES_500', label: '500 Club Appearances', description: 'Made 500 senior career appearances.' },
      { id: 'TRANSFER_100M', label: '€100M+ Galáctico Move', description: 'Completed a blockbuster transfer worth €100M or more.' },
      { id: 'FIRST_BALLON_DOR', label: "First Ballon d'Or", description: 'Crowned the best footballer on the planet.' },
    ];

    const CAREER_BADGES = {
      ONE_CLUB_MAN: { id: 'ONE_CLUB_MAN', label: 'One-Club Man', description: 'Spent your entire professional career at a single club.' },
      THE_JUDAS: { id: 'THE_JUDAS', label: 'The Judas', description: 'Crossed enemy lines to join fierce rivals during your career.' },
      GALACTICO: { id: 'GALACTICO', label: 'Galáctico', description: 'Commanded €250M+ in cumulative career transfer fees.' },
      MERCENARY: { id: 'MERCENARY', label: 'Mercenary', description: 'Transferred 5 or more times chasing top fees and new challenges.' },
      PRODIGAL_SON: { id: 'PRODIGAL_SON', label: 'Prodigal Son', description: 'Left your boyhood club and returned later to finish your career.' },
      CLUB_LEGEND: { id: 'CLUB_LEGEND', label: 'Club Legend', description: 'Served 6+ loyal seasons and won major silverware at one club without betraying them.' },
      ALL_TIME_GREAT: { id: 'ALL_TIME_GREAT', label: 'All-Time Great', description: "Won at least one Ballon d'Or and 5+ major trophies." },
      LATE_BLOOMER: { id: 'LATE_BLOOMER', label: 'Late Bloomer', description: 'Reached peak market value after prime years or won your first major trophy at 29+.' },
      RETIRED_ON_TOP: { id: 'RETIRED_ON_TOP', label: 'Retired on Top', description: 'Hung up your boots at age 33 or younger with an elite career rating.' },
      IRONMAN: { id: 'IRONMAN', label: 'Ironman', description: 'Played professionally until age 38 or older.' },
      MONEY_MAN: { id: 'MONEY_MAN', label: 'Money Man', description: 'Earned €150M+ in wages over your career.' },
      GLOBETROTTER: { id: 'GLOBETROTTER', label: 'Globetrotter', description: 'Played in 4+ different leagues or 3+ confederations.' },
      NATIONAL_HERO: { id: 'NATIONAL_HERO', label: 'National Hero', description: 'Won an international title or captained your country with 80+ caps.' },
      RECORD_BREAKER: { id: 'RECORD_BREAKER', label: 'Record Breaker', description: "Broke a club's all-time scoring, clean-sheet or appearance record." },
      BRIDESMAID: { id: 'BRIDESMAID', label: 'Always the Bridesmaid', description: "Finished on the Ballon d'Or podium twice or more without ever winning it." },
    };

    const ARCH_RIVAL_PAIRS = [
      ['real_madrid', 'barcelona'], ['man_utd', 'liverpool'], ['man_utd', 'man_city'],
      ['arsenal', 'tottenham'], ['newcastle', 'sunderland'], ['bayern', 'dortmund'],
      ['hamburger_sv', 'st_pauli'], ['inter_milan', 'ac_milan'], ['inter_milan', 'juventus'],
      ['as_roma', 'lazio'], ['psg', 'marseille'], ['flamengo', 'fluminense'],
      ['flamengo', 'vasco'], ['corinthians', 'palmeiras'], ['gremio', 'internacional'],
      ['atletico_mg', 'cruzeiro'], ['boca_juniors', 'river_plate'], ['racing_club', 'independiente'],
      ['newells', 'rosario_central'], ['al_hilal', 'al_nassr'], ['al_ittihad', 'al_ahli_sa'],
      ['gamba_osaka', 'cerezo_osaka'], ['shanghai_port', 'shanghai_shenhua'], ['al_ahly_eg', 'zamalek'],
      ['kaizer_chiefs', 'orlando_pirates'], ['club_america', 'chivas'], ['monterrey', 'tigres'],
      ['la_galaxy', 'lafc'], ['seattle_sounders', 'portland_timbers'],
      ['benfica', 'sporting_cp'], ['benfica', 'porto'], ['ajax', 'feyenoord'], ['club_brugge', 'anderlecht'],
      ['anderlecht', 'standard_liege'], ['sydney_fc', 'wsw'], ['melbourne_victory', 'melbourne_city'],
    ];

    const YOUTH_ACADEMY_CLUBS = new Set([
      'dortmund', 'brighton', 'leverkusen', 'stuttgart', 'real_sociedad', 'athletic_bilbao',
      'monaco', 'lyon', 'rennes', 'atalanta', 'santos', 'fluminense', 'palmeiras',
      'river_plate', 'argentinos_jrs', 'velez', 'pachuca', 'fc_dallas', 'philadelphia_union',
      'kashima_antlers', 'urawa_reds', 'shandong_taishan', 'al_ahly_eg', 'zed_fc', 'supersport_utd',
      'benfica', 'sporting_cp', 'porto', 'ajax', 'psv', 'az_alkmaar', 'genk', 'anderlecht', 'club_brugge', 'wsw', 'cc_mariners',
    ]);

    const DRAMA_TYPES = {
      ARCH_RIVAL: { badge: '🔥 Arch-Rival Betrayal', feeMultiplier: 1.30, derbyBoost: 1.25, cardMultiplier: 1.35 },
      RIVAL: { badge: '🔥 Fierce Rival', feeMultiplier: 1.20, derbyBoost: 1.15, cardMultiplier: 1.20 },
      RELEASE_CLAUSE: { badge: '⚡ Release Clause Hijack', feeMultiplier: 1.15 },
      BIDDING_WAR: { badge: '💰 Bidding War', feeMultiplier: 1.35 },
      AGENT_PUSH: { badge: '💼 Agent Push', feeMultiplier: 1.20 },
      BOYHOOD_RETURN: { badge: '🏠 Boyhood Homecoming', feeMultiplier: 0.25 },
      STEPPING_STONE: { badge: '🪜 Stepping Stone to Europe', feeMultiplier: 1.05 },
      TAPPED_UP: { badge: '🤫 Tapped Up', feeMultiplier: 1.10 },
      UNWANTED: { badge: '⚠️ Unwanted by Manager', appPenalty: 0.45 },
      RELEGATED: { badge: '📉 Club Relegated', appPenalty: 0.85, prestigePenalty: 0.70 },
    };

    // Complete 282-Club Roster across 14 Leagues and 5 Confederations
    const RAW_CLUBS = [
      // English Premier League (20)
      { id: 'arsenal', name: 'Arsenal', continent: 'EUROPE', league: 'Premier League', starRating: 5, wealthTier: 'historic', trophyOdds: 0.28, rivals: ['tottenham', 'chelsea', 'man_utd'] },
      { id: 'aston_villa', name: 'Aston Villa', continent: 'EUROPE', league: 'Premier League', starRating: 4, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['wolves'] },
      { id: 'bournemouth', name: 'AFC Bournemouth', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['brighton'] },
      { id: 'brentford', name: 'Brentford', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['fulham', 'chelsea'] },
      { id: 'brighton', name: 'Brighton & Hove Albion', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['crystal_palace', 'bournemouth'] },
      { id: 'burnley', name: 'Burnley', continent: 'EUROPE', league: 'Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['leeds'] },
      { id: 'chelsea', name: 'Chelsea', continent: 'EUROPE', league: 'Premier League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.22, rivals: ['arsenal', 'tottenham', 'fulham', 'brentford'] },
      { id: 'crystal_palace', name: 'Crystal Palace', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['brighton'] },
      { id: 'everton', name: 'Everton', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['liverpool'] },
      { id: 'fulham', name: 'Fulham', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['chelsea', 'brentford'] },
      { id: 'leeds', name: 'Leeds United', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['man_utd', 'burnley'] },
      { id: 'liverpool', name: 'Liverpool', continent: 'EUROPE', league: 'Premier League', starRating: 5, wealthTier: 'historic', trophyOdds: 0.36, rivals: ['man_utd', 'everton', 'man_city'] },
      { id: 'man_city', name: 'Manchester City', continent: 'EUROPE', league: 'Premier League', starRating: 5, wealthTier: 'rich', trophyOdds: 0.44, rivals: ['man_utd', 'liverpool'] },
      { id: 'man_utd', name: 'Manchester United', continent: 'EUROPE', league: 'Premier League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.21, rivals: ['man_city', 'liverpool', 'arsenal', 'leeds'] },
      { id: 'newcastle', name: 'Newcastle United', continent: 'EUROPE', league: 'Premier League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.14, rivals: ['sunderland'] },
      { id: 'nottm_forest', name: 'Nottingham Forest', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.06, rivals: [] },
      { id: 'sunderland', name: 'Sunderland', continent: 'EUROPE', league: 'Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['newcastle'] },
      { id: 'tottenham', name: 'Tottenham Hotspur', continent: 'EUROPE', league: 'Premier League', starRating: 4, wealthTier: 'standard', trophyOdds: 0.14, rivals: ['arsenal', 'chelsea', 'west_ham'] },
      { id: 'west_ham', name: 'West Ham United', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['tottenham'] },
      { id: 'wolves', name: 'Wolverhampton Wanderers', continent: 'EUROPE', league: 'Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['aston_villa'] },

      // La Liga (20)
      { id: 'alaves', name: 'Deportivo Alavés', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['athletic_bilbao', 'real_sociedad'] },
      { id: 'athletic_bilbao', name: 'Athletic Bilbao', continent: 'EUROPE', league: 'La Liga', starRating: 4, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['real_sociedad', 'alaves', 'osasuna'] },
      { id: 'atletico_madrid', name: 'Atlético Madrid', continent: 'EUROPE', league: 'La Liga', starRating: 4, wealthTier: 'standard', trophyOdds: 0.21, rivals: ['real_madrid', 'barcelona'] },
      { id: 'barcelona', name: 'FC Barcelona', continent: 'EUROPE', league: 'La Liga', starRating: 5, wealthTier: 'historic', trophyOdds: 0.38, rivals: ['real_madrid', 'espanyol', 'atletico_madrid'] },
      { id: 'real_betis', name: 'Real Betis', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.09, rivals: ['sevilla'] },
      { id: 'celta_vigo', name: 'Celta Vigo', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'elche', name: 'Elche CF', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['valencia', 'levante'] },
      { id: 'espanyol', name: 'RCD Espanyol', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['barcelona', 'girona'] },
      { id: 'getafe', name: 'Getafe CF', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['rayo_vallecano'] },
      { id: 'girona', name: 'Girona FC', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'rich', trophyOdds: 0.08, rivals: ['espanyol'] },
      { id: 'levante', name: 'Levante UD', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['valencia', 'villarreal', 'elche'] },
      { id: 'mallorca', name: 'RCD Mallorca', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'osasuna', name: 'CA Osasuna', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['athletic_bilbao', 'real_sociedad'] },
      { id: 'real_oviedo', name: 'Real Oviedo', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'rayo_vallecano', name: 'Rayo Vallecano', continent: 'EUROPE', league: 'La Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['getafe'] },
      { id: 'real_madrid', name: 'Real Madrid', continent: 'EUROPE', league: 'La Liga', starRating: 5, wealthTier: 'historic', trophyOdds: 0.43, rivals: ['barcelona', 'atletico_madrid'] },
      { id: 'real_sociedad', name: 'Real Sociedad', continent: 'EUROPE', league: 'La Liga', starRating: 4, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['athletic_bilbao', 'alaves', 'osasuna'] },
      { id: 'sevilla', name: 'Sevilla FC', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.11, rivals: ['real_betis'] },
      { id: 'valencia', name: 'Valencia CF', continent: 'EUROPE', league: 'La Liga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.09, rivals: ['villarreal', 'levante', 'elche'] },
      { id: 'villarreal', name: 'Villarreal CF', continent: 'EUROPE', league: 'La Liga', starRating: 4, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['valencia', 'levante'] },

      // German Bundesliga (18)
      { id: 'augsburg', name: 'FC Augsburg', continent: 'EUROPE', league: 'Bundesliga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['bayern'] },
      { id: 'union_berlin', name: '1. FC Union Berlin', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['rb_leipzig'] },
      { id: 'werder_bremen', name: 'SV Werder Bremen', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['hamburger_sv'] },
      { id: 'dortmund', name: 'Borussia Dortmund', continent: 'EUROPE', league: 'Bundesliga', starRating: 4, wealthTier: 'historic', trophyOdds: 0.19, rivals: ['bayern'] },
      { id: 'frankfurt', name: 'Eintracht Frankfurt', continent: 'EUROPE', league: 'Bundesliga', starRating: 4, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['mainz'] },
      { id: 'freiburg', name: 'SC Freiburg', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['stuttgart'] },
      { id: 'hamburger_sv', name: 'Hamburger SV', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['st_pauli', 'werder_bremen'] },
      { id: 'heidenheim', name: '1. FC Heidenheim', continent: 'EUROPE', league: 'Bundesliga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['stuttgart'] },
      { id: 'hoffenheim', name: 'TSG Hoffenheim', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['stuttgart'] },
      { id: 'koln', name: '1. FC Köln', continent: 'EUROPE', league: 'Bundesliga', starRating: 2, wealthTier: 'historic', trophyOdds: 0.04, rivals: ['gladbach', 'leverkusen'] },
      { id: 'rb_leipzig', name: 'RB Leipzig', continent: 'EUROPE', league: 'Bundesliga', starRating: 4, wealthTier: 'rich', trophyOdds: 0.17, rivals: ['union_berlin', 'bayern'] },
      { id: 'leverkusen', name: 'Bayer 04 Leverkusen', continent: 'EUROPE', league: 'Bundesliga', starRating: 5, wealthTier: 'standard', trophyOdds: 0.26, rivals: ['koln', 'gladbach', 'bayern'] },
      { id: 'mainz', name: '1. FSV Mainz 05', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['frankfurt'] },
      { id: 'gladbach', name: 'Borussia Mönchengladbach', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['koln', 'leverkusen'] },
      { id: 'bayern', name: 'Bayern Munich', continent: 'EUROPE', league: 'Bundesliga', starRating: 5, wealthTier: 'historic', trophyOdds: 0.45, rivals: ['dortmund', 'leverkusen', 'rb_leipzig', 'augsburg'] },
      { id: 'st_pauli', name: 'FC St. Pauli', continent: 'EUROPE', league: 'Bundesliga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['hamburger_sv'] },
      { id: 'stuttgart', name: 'VfB Stuttgart', continent: 'EUROPE', league: 'Bundesliga', starRating: 4, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['freiburg', 'hoffenheim', 'heidenheim'] },
      { id: 'wolfsburg', name: 'VfL Wolfsburg', continent: 'EUROPE', league: 'Bundesliga', starRating: 3, wealthTier: 'rich', trophyOdds: 0.06, rivals: [] },

      // Italian Serie A (20)
      { id: 'atalanta', name: 'Atalanta BC', continent: 'EUROPE', league: 'Serie A', starRating: 4, wealthTier: 'standard', trophyOdds: 0.16, rivals: ['inter_milan', 'ac_milan'] },
      { id: 'bologna', name: 'Bologna FC', continent: 'EUROPE', league: 'Serie A', starRating: 3, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['fiorentina', 'parma'] },
      { id: 'cagliari', name: 'Cagliari Calcio', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'como', name: 'Como 1907', continent: 'EUROPE', league: 'Serie A', starRating: 3, wealthTier: 'rich', trophyOdds: 0.05, rivals: ['ac_milan'] },
      { id: 'cremonese', name: 'US Cremonese', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['parma'] },
      { id: 'fiorentina', name: 'ACF Fiorentina', continent: 'EUROPE', league: 'Serie A', starRating: 4, wealthTier: 'historic', trophyOdds: 0.11, rivals: ['juventus', 'bologna', 'pisa'] },
      { id: 'genoa', name: 'Genoa CFC', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'historic', trophyOdds: 0.04, rivals: [] },
      { id: 'hellas_verona', name: 'Hellas Verona', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'inter_milan', name: 'Inter Milan', continent: 'EUROPE', league: 'Serie A', starRating: 5, wealthTier: 'historic', trophyOdds: 0.34, rivals: ['ac_milan', 'juventus', 'atalanta'] },
      { id: 'juventus', name: 'Juventus', continent: 'EUROPE', league: 'Serie A', starRating: 5, wealthTier: 'historic', trophyOdds: 0.28, rivals: ['inter_milan', 'ac_milan', 'torino', 'fiorentina', 'napoli'] },
      { id: 'lazio', name: 'SS Lazio', continent: 'EUROPE', league: 'Serie A', starRating: 4, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['as_roma'] },
      { id: 'lecce', name: 'US Lecce', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'ac_milan', name: 'AC Milan', continent: 'EUROPE', league: 'Serie A', starRating: 5, wealthTier: 'historic', trophyOdds: 0.26, rivals: ['inter_milan', 'juventus', 'atalanta', 'como'] },
      { id: 'napoli', name: 'SSC Napoli', continent: 'EUROPE', league: 'Serie A', starRating: 4, wealthTier: 'standard', trophyOdds: 0.20, rivals: ['juventus', 'as_roma'] },
      { id: 'parma', name: 'Parma Calcio 1913', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'historic', trophyOdds: 0.04, rivals: ['bologna', 'cremonese'] },
      { id: 'pisa', name: 'Pisa SC', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['fiorentina'] },
      { id: 'as_roma', name: 'AS Roma', continent: 'EUROPE', league: 'Serie A', starRating: 4, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['lazio', 'napoli'] },
      { id: 'sassuolo', name: 'US Sassuolo', continent: 'EUROPE', league: 'Serie A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'torino', name: 'Torino FC', continent: 'EUROPE', league: 'Serie A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['juventus'] },
      { id: 'udinese', name: 'Udinese Calcio', continent: 'EUROPE', league: 'Serie A', starRating: 3, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },

      // French Ligue 1 (18)
      { id: 'angers', name: 'Angers SCO', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['nantes'] },
      { id: 'auxerre', name: 'AJ Auxerre', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'historic', trophyOdds: 0.03, rivals: [] },
      { id: 'brest', name: 'Stade Brestois 29', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['rennes', 'lorient'] },
      { id: 'le_havre', name: 'Le Havre AC', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'lens', name: 'RC Lens', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['lille'] },
      { id: 'lille', name: 'Lille OSC', continent: 'EUROPE', league: 'Ligue 1', starRating: 4, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['lens'] },
      { id: 'lorient', name: 'FC Lorient', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['rennes', 'brest'] },
      { id: 'lyon', name: 'Olympique Lyonnais', continent: 'EUROPE', league: 'Ligue 1', starRating: 4, wealthTier: 'historic', trophyOdds: 0.12, rivals: ['marseille', 'psg'] },
      { id: 'marseille', name: 'Olympique de Marseille', continent: 'EUROPE', league: 'Ligue 1', starRating: 4, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['psg', 'lyon', 'nice', 'monaco'] },
      { id: 'metz', name: 'FC Metz', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['strasbourg'] },
      { id: 'monaco', name: 'AS Monaco', continent: 'EUROPE', league: 'Ligue 1', starRating: 4, wealthTier: 'rich', trophyOdds: 0.16, rivals: ['nice', 'marseille', 'psg'] },
      { id: 'nantes', name: 'FC Nantes', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['rennes', 'angers'] },
      { id: 'nice', name: 'OGC Nice', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'rich', trophyOdds: 0.08, rivals: ['monaco', 'marseille'] },
      { id: 'paris_fc', name: 'Paris FC', continent: 'EUROPE', league: 'Ligue 1', starRating: 2, wealthTier: 'rich', trophyOdds: 0.04, rivals: ['psg'] },
      { id: 'psg', name: 'Paris Saint-Germain', continent: 'EUROPE', league: 'Ligue 1', starRating: 5, wealthTier: 'rich', trophyOdds: 0.46, rivals: ['marseille', 'lyon', 'monaco', 'paris_fc'] },
      { id: 'rennes', name: 'Stade Rennais', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['nantes', 'brest', 'lorient'] },
      { id: 'strasbourg', name: 'RC Strasbourg', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['metz'] },
      { id: 'toulouse', name: 'Toulouse FC', continent: 'EUROPE', league: 'Ligue 1', starRating: 3, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },

      // Campeonato Brasileiro Série A (20)
      { id: 'atletico_mg', name: 'Atlético Mineiro', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'rich', trophyOdds: 0.24, rivals: ['cruzeiro', 'flamengo'] },
      { id: 'bahia', name: 'EC Bahia', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'rich', trophyOdds: 0.11, rivals: ['vitoria', 'sport_recife'] },
      { id: 'botafogo', name: 'Botafogo FR', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'rich', trophyOdds: 0.25, rivals: ['flamengo', 'fluminense', 'vasco'] },
      { id: 'ceara', name: 'Ceará SC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['fortaleza'] },
      { id: 'corinthians', name: 'SC Corinthians', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'historic', trophyOdds: 0.20, rivals: ['palmeiras', 'sao_paulo', 'santos'] },
      { id: 'cruzeiro', name: 'Cruzeiro EC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.14, rivals: ['atletico_mg'] },
      { id: 'flamengo', name: 'CR Flamengo', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'rich', trophyOdds: 0.34, rivals: ['fluminense', 'vasco', 'botafogo', 'palmeiras', 'atletico_mg'] },
      { id: 'fluminense', name: 'Fluminense FC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['flamengo', 'vasco', 'botafogo'] },
      { id: 'fortaleza', name: 'Fortaleza EC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'standard', trophyOdds: 0.13, rivals: ['ceara'] },
      { id: 'gremio', name: 'Grêmio FBPA', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['internacional', 'juventude'] },
      { id: 'internacional', name: 'SC Internacional', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['gremio', 'juventude'] },
      { id: 'juventude', name: 'EC Juventude', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['gremio', 'internacional'] },
      { id: 'mirassol', name: 'Mirassol FC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['rb_bragantino'] },
      { id: 'palmeiras', name: 'SE Palmeiras', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'rich', trophyOdds: 0.33, rivals: ['corinthians', 'sao_paulo', 'santos', 'flamengo'] },
      { id: 'rb_bragantino', name: 'Red Bull Bragantino', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'rich', trophyOdds: 0.09, rivals: ['mirassol'] },
      { id: 'santos', name: 'Santos FC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['corinthians', 'palmeiras', 'sao_paulo'] },
      { id: 'sao_paulo', name: 'São Paulo FC', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 4, wealthTier: 'historic', trophyOdds: 0.21, rivals: ['corinthians', 'palmeiras', 'santos'] },
      { id: 'sport_recife', name: 'Sport Club do Recife', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['bahia'] },
      { id: 'vasco', name: 'CR Vasco da Gama', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 3, wealthTier: 'historic', trophyOdds: 0.11, rivals: ['flamengo', 'fluminense', 'botafogo'] },
      { id: 'vitoria', name: 'EC Vitória', continent: 'SOUTH_AMERICA', league: 'Campeonato Brasileiro Série A', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['bahia'] },

      // Argentine Primera División (30)
      { id: 'aldosivi', name: 'CA Aldosivi', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'argentinos_jrs', name: 'Argentinos Juniors', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.08, rivals: ['platense'] },
      { id: 'atletico_tucuman', name: 'Atlético Tucumán', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'banfield', name: 'CA Banfield', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['lanus'] },
      { id: 'barracas_central', name: 'Barracas Central', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['riestra'] },
      { id: 'belgrano', name: 'CA Belgrano', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['talleres', 'instituto'] },
      { id: 'boca_juniors', name: 'Boca Juniors', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 4, wealthTier: 'historic', trophyOdds: 0.30, rivals: ['river_plate', 'racing_club', 'independiente', 'san_lorenzo'] },
      { id: 'central_cordoba', name: 'Central Córdoba (SdE)', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'defensa_justicia', name: 'Defensa y Justicia', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'standard', trophyOdds: 0.08, rivals: [] },
      { id: 'riestra', name: 'Deportivo Riestra', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['barracas_central'] },
      { id: 'estudiantes', name: 'Estudiantes de La Plata', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.15, rivals: ['gimnasia_lp'] },
      { id: 'gimnasia_lp', name: 'Gimnasia y Esgrima La Plata', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['estudiantes'] },
      { id: 'godoy_cruz', name: 'CD Godoy Cruz', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['ind_rivadavia', 'san_martin_sj'] },
      { id: 'huracan', name: 'CA Huracán', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['san_lorenzo'] },
      { id: 'independiente', name: 'CA Independiente', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.12, rivals: ['racing_club', 'boca_juniors', 'river_plate'] },
      { id: 'ind_rivadavia', name: 'Independiente Rivadavia', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['godoy_cruz'] },
      { id: 'instituto', name: 'Instituto ACC', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['talleres', 'belgrano'] },
      { id: 'lanus', name: 'CA Lanús', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['banfield'] },
      { id: 'newells', name: "Newell's Old Boys", continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['rosario_central'] },
      { id: 'platense', name: 'CA Platense', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['argentinos_jrs', 'tigre'] },
      { id: 'racing_club', name: 'Racing Club', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 4, wealthTier: 'historic', trophyOdds: 0.19, rivals: ['independiente', 'boca_juniors', 'river_plate'] },
      { id: 'river_plate', name: 'River Plate', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 4, wealthTier: 'historic', trophyOdds: 0.32, rivals: ['boca_juniors', 'racing_club', 'independiente', 'san_lorenzo'] },
      { id: 'rosario_central', name: 'Rosario Central', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.09, rivals: ['newells'] },
      { id: 'san_lorenzo', name: 'San Lorenzo de Almagro', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.10, rivals: ['huracan', 'boca_juniors', 'river_plate'] },
      { id: 'san_martin_sj', name: 'San Martín de San Juan', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['godoy_cruz'] },
      { id: 'sarmiento', name: 'CA Sarmiento', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'talleres', name: 'Talleres de Córdoba', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['belgrano', 'instituto'] },
      { id: 'tigre', name: 'CA Tigre', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['platense', 'velez'] },
      { id: 'union_sf', name: 'Unión de Santa Fe', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'velez', name: 'Vélez Sarsfield', continent: 'SOUTH_AMERICA', league: 'Argentine Primera División', starRating: 3, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['tigre'] },

      // Saudi Pro League (18)
      { id: 'al_ahli_sa', name: 'Al-Ahli Saudi FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.22, rivals: ['al_ittihad', 'al_hilal'] },
      { id: 'al_ettifaq', name: 'Al-Ettifaq FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.08, rivals: ['al_qadsiah'] },
      { id: 'al_fateh', name: 'Al-Fateh SC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'al_fayha', name: 'Al-Fayha FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'al_hazem', name: 'Al-Hazem SC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['al_taawoun', 'al_kholood'] },
      { id: 'al_hilal', name: 'Al-Hilal SFC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.42, rivals: ['al_nassr', 'al_ittihad', 'al_shabab', 'al_ahli_sa'] },
      { id: 'al_ittihad', name: 'Al-Ittihad Club', continent: 'ASIA', league: 'Saudi Pro League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.24, rivals: ['al_ahli_sa', 'al_hilal'] },
      { id: 'al_khaleej', name: 'Al-Khaleej FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['al_qadsiah'] },
      { id: 'al_kholood', name: 'Al-Kholood Club', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['al_hazem'] },
      { id: 'al_najma', name: 'Al-Najma SC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'al_nassr', name: 'Al-Nassr FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 4, wealthTier: 'rich', trophyOdds: 0.28, rivals: ['al_hilal', 'al_shabab'] },
      { id: 'al_okhdood', name: 'Al-Okhdood Club', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['damac'] },
      { id: 'al_qadsiah', name: 'Al-Qadsiah FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.14, rivals: ['al_ettifaq', 'al_khaleej'] },
      { id: 'al_riyadh', name: 'Al-Riyadh SC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['al_shabab'] },
      { id: 'al_shabab', name: 'Al-Shabab FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.11, rivals: ['al_hilal', 'al_nassr', 'al_riyadh'] },
      { id: 'al_taawoun', name: 'Al-Taawoun FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['al_hazem'] },
      { id: 'damac', name: 'Damac FC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['al_okhdood'] },
      { id: 'neom_sc', name: 'NEOM SC', continent: 'ASIA', league: 'Saudi Pro League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.12, rivals: [] },

      // J1 League (20)
      { id: 'albirex_niigata', name: 'Albirex Niigata', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'avispa_fukuoka', name: 'Avispa Fukuoka', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'cerezo_osaka', name: 'Cerezo Osaka', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['gamba_osaka', 'vissel_kobe'] },
      { id: 'fagiano_okayama', name: 'Fagiano Okayama', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['sanfrecce_hiroshima'] },
      { id: 'fc_tokyo', name: 'FC Tokyo', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.09, rivals: ['tokyo_verdy', 'kawasaki_frontale', 'machida_zelvia'] },
      { id: 'gamba_osaka', name: 'Gamba Osaka', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['cerezo_osaka', 'vissel_kobe', 'kyoto_sanga'] },
      { id: 'kashima_antlers', name: 'Kashima Antlers', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.19, rivals: ['urawa_reds', 'kashiwa_reysol'] },
      { id: 'kashiwa_reysol', name: 'Kashiwa Reysol', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['kashima_antlers'] },
      { id: 'kawasaki_frontale', name: 'Kawasaki Frontale', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.18, rivals: ['yokohama_fm', 'fc_tokyo'] },
      { id: 'kyoto_sanga', name: 'Kyoto Sanga FC', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['gamba_osaka'] },
      { id: 'machida_zelvia', name: 'FC Machida Zelvia', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.12, rivals: ['fc_tokyo', 'tokyo_verdy'] },
      { id: 'nagoya_grampus', name: 'Nagoya Grampus', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.11, rivals: ['shimizu_spulse'] },
      { id: 'sanfrecce_hiroshima', name: 'Sanfrecce Hiroshima', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.17, rivals: ['fagiano_okayama'] },
      { id: 'shimizu_spulse', name: 'Shimizu S-Pulse', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['nagoya_grampus'] },
      { id: 'shonan_bellmare', name: 'Shonan Bellmare', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['yokohama_fm'] },
      { id: 'tokyo_verdy', name: 'Tokyo Verdy', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['fc_tokyo', 'machida_zelvia'] },
      { id: 'urawa_reds', name: 'Urawa Red Diamonds', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['kashima_antlers'] },
      { id: 'vissel_kobe', name: 'Vissel Kobe', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.22, rivals: ['gamba_osaka', 'cerezo_osaka'] },
      { id: 'yokohama_fc', name: 'Yokohama FC', continent: 'ASIA', league: 'J1 League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['yokohama_fm'] },
      { id: 'yokohama_fm', name: 'Yokohama F. Marinos', continent: 'ASIA', league: 'J1 League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['kawasaki_frontale', 'yokohama_fc', 'shonan_bellmare'] },

      // Chinese Super League (16)
      { id: 'beijing_guoan', name: 'Beijing Guoan', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['shanghai_shenhua', 'tianjin_jmt', 'shandong_taishan'] },
      { id: 'changchun_yatai', name: 'Changchun Yatai', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['dalian_yingbo'] },
      { id: 'chengdu_rongcheng', name: 'Chengdu Rongcheng', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.14, rivals: [] },
      { id: 'dalian_yingbo', name: 'Dalian Yingbo', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['changchun_yatai'] },
      { id: 'henan_fc', name: 'Henan FC', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'meizhou_hakka', name: 'Meizhou Hakka', continent: 'ASIA', league: 'Chinese Super League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['shenzhen_peng'] },
      { id: 'qingdao_hainiu', name: 'Qingdao Hainiu', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['qingdao_west_coast', 'shandong_taishan'] },
      { id: 'qingdao_west_coast', name: 'Qingdao West Coast', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['qingdao_hainiu'] },
      { id: 'shandong_taishan', name: 'Shandong Taishan', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.21, rivals: ['beijing_guoan', 'qingdao_hainiu'] },
      { id: 'shanghai_port', name: 'Shanghai Port', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.30, rivals: ['shanghai_shenhua'] },
      { id: 'shanghai_shenhua', name: 'Shanghai Shenhua', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.24, rivals: ['shanghai_port', 'beijing_guoan'] },
      { id: 'shenzhen_peng', name: 'Shenzhen Peng City', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'rich', trophyOdds: 0.05, rivals: ['meizhou_hakka'] },
      { id: 'tianjin_jmt', name: 'Tianjin Jinmen Tiger', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['beijing_guoan'] },
      { id: 'wuhan_three_towns', name: 'Wuhan Three Towns', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: [] },
      { id: 'yunnan_yukun', name: 'Yunnan Yukun', continent: 'ASIA', league: 'Chinese Super League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'zhejiang_fc', name: 'Zhejiang Professional FC', continent: 'ASIA', league: 'Chinese Super League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.11, rivals: [] },

      // Egyptian Premier League (18)
      { id: 'al_ahly_eg', name: 'Al Ahly SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 4, wealthTier: 'historic', trophyOdds: 0.44, rivals: ['zamalek', 'pyramids', 'ismaily'] },
      { id: 'al_ittihad_alex', name: 'Al Ittihad Alexandria', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['smouha', 'pharcos'] },
      { id: 'al_masry', name: 'Al Masry SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['ismaily'] },
      { id: 'ceramica_cleopatra', name: 'Ceramica Cleopatra FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'rich', trophyOdds: 0.07, rivals: [] },
      { id: 'el_gouna', name: 'El Gouna FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'enppi', name: 'ENPPI SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['petrojet'] },
      { id: 'ghazl_el_mahalla', name: 'Ghazl El Mahalla SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'historic', trophyOdds: 0.04, rivals: [] },
      { id: 'haras_el_hodood', name: 'Haras El Hodood SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'ismaily', name: 'Ismaily SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['al_ahly_eg', 'al_masry'] },
      { id: 'modern_sport', name: 'Modern Sport FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.09, rivals: ['pyramids'] },
      { id: 'national_bank_eg', name: 'National Bank of Egypt SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'petrojet', name: 'Petrojet FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['enppi'] },
      { id: 'pharcos', name: 'Pharco FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['al_ittihad_alex', 'smouha'] },
      { id: 'pyramids', name: 'Pyramids FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 3, wealthTier: 'rich', trophyOdds: 0.24, rivals: ['al_ahly_eg', 'zamalek', 'modern_sport'] },
      { id: 'smouha', name: 'Smouha SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['al_ittihad_alex', 'pharcos'] },
      { id: 'talaea_el_gaish', name: "Tala'ea El Gaish SC", continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'zamalek', name: 'Zamalek SC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.26, rivals: ['al_ahly_eg', 'pyramids'] },
      { id: 'zed_fc', name: 'ZED FC', continent: 'AFRICA', league: 'Egyptian Premier League', starRating: 2, wealthTier: 'rich', trophyOdds: 0.06, rivals: [] },

      // South African Premier Division (16)
      { id: 'amazulu', name: 'AmaZulu FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['golden_arrows', 'richards_bay'] },
      { id: 'cape_town_city', name: 'Cape Town City FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['stellenbosch'] },
      { id: 'chippa_united', name: 'Chippa United FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'golden_arrows', name: 'Lamontville Golden Arrows', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['amazulu'] },
      { id: 'kaizer_chiefs', name: 'Kaizer Chiefs', continent: 'AFRICA', league: 'South African Premier Division', starRating: 3, wealthTier: 'historic', trophyOdds: 0.15, rivals: ['orlando_pirates', 'mamelodi_sundowns'] },
      { id: 'magesi', name: 'Magesi FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['polokwane_city', 'sekhukhune'] },
      { id: 'mamelodi_sundowns', name: 'Mamelodi Sundowns', continent: 'AFRICA', league: 'South African Premier Division', starRating: 4, wealthTier: 'rich', trophyOdds: 0.42, rivals: ['orlando_pirates', 'kaizer_chiefs', 'supersport_utd'] },
      { id: 'marumo_gallants', name: 'Marumo Gallants FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'orlando_pirates', name: 'Orlando Pirates', continent: 'AFRICA', league: 'South African Premier Division', starRating: 3, wealthTier: 'historic', trophyOdds: 0.24, rivals: ['kaizer_chiefs', 'mamelodi_sundowns'] },
      { id: 'polokwane_city', name: 'Polokwane City FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['magesi', 'sekhukhune'] },
      { id: 'richards_bay', name: 'Richards Bay FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['amazulu'] },
      { id: 'royal_am', name: 'Royal AM FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'sekhukhune', name: 'Sekhukhune United', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['polokwane_city', 'magesi'] },
      { id: 'stellenbosch', name: 'Stellenbosch FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 3, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['cape_town_city'] },
      { id: 'supersport_utd', name: 'SuperSport United', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.09, rivals: ['mamelodi_sundowns'] },
      { id: 'ts_galaxy', name: 'TS Galaxy FC', continent: 'AFRICA', league: 'South African Premier Division', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },

      // Liga MX (18)
      { id: 'club_america', name: 'Club América', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 4, wealthTier: 'rich', trophyOdds: 0.34, rivals: ['chivas', 'cruz_azul', 'pumas_unam'] },
      { id: 'atlas', name: 'Atlas FC', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['chivas'] },
      { id: 'atletico_san_luis', name: 'Atlético San Luis', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['queretaro'] },
      { id: 'cruz_azul', name: 'Cruz Azul', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'rich', trophyOdds: 0.21, rivals: ['club_america', 'pumas_unam'] },
      { id: 'fc_juarez', name: 'FC Juárez', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'chivas', name: 'CD Guadalajara (Chivas)', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['club_america', 'atlas'] },
      { id: 'club_leon', name: 'Club León', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['pachuca'] },
      { id: 'mazatlan', name: 'Mazatlán FC', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'monterrey', name: 'CF Monterrey', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 4, wealthTier: 'rich', trophyOdds: 0.26, rivals: ['tigres', 'santos_laguna'] },
      { id: 'necaxa', name: 'Club Necaxa', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'pachuca', name: 'CF Pachuca', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'standard', trophyOdds: 0.17, rivals: ['club_leon'] },
      { id: 'puebla', name: 'Club Puebla', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: [] },
      { id: 'queretaro', name: 'Querétaro FC', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 1, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['atletico_san_luis'] },
      { id: 'santos_laguna', name: 'Santos Laguna', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['monterrey', 'tigres'] },
      { id: 'tijuana', name: 'Club Tijuana', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'tigres', name: 'Tigres UANL', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 4, wealthTier: 'rich', trophyOdds: 0.25, rivals: ['monterrey', 'santos_laguna'] },
      { id: 'toluca', name: 'Deportivo Toluca', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['club_america'] },
      { id: 'pumas_unam', name: 'Pumas UNAM', continent: 'NORTH_AMERICA', league: 'Liga MX', starRating: 3, wealthTier: 'historic', trophyOdds: 0.13, rivals: ['club_america', 'cruz_azul'] },

      // Major League Soccer (30)
      { id: 'atlanta_utd', name: 'Atlanta United FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'rich', trophyOdds: 0.10, rivals: ['orlando_city', 'charlotte_fc'] },
      { id: 'austin_fc', name: 'Austin FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['fc_dallas', 'houston_dynamo'] },
      { id: 'cf_montreal', name: 'CF Montréal', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['toronto_fc', 'vancouver_whitecaps'] },
      { id: 'charlotte_fc', name: 'Charlotte FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['atlanta_utd'] },
      { id: 'chicago_fire', name: 'Chicago Fire FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: ['st_louis_city'] },
      { id: 'colorado_rapids', name: 'Colorado Rapids', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['real_salt_lake'] },
      { id: 'columbus_crew', name: 'Columbus Crew', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'standard', trophyOdds: 0.18, rivals: ['fc_cincinnati'] },
      { id: 'dc_united', name: 'D.C. United', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'historic', trophyOdds: 0.05, rivals: ['ny_red_bulls', 'philadelphia_union'] },
      { id: 'fc_cincinnati', name: 'FC Cincinnati', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'standard', trophyOdds: 0.14, rivals: ['columbus_crew'] },
      { id: 'fc_dallas', name: 'FC Dallas', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['houston_dynamo', 'austin_fc'] },
      { id: 'houston_dynamo', name: 'Houston Dynamo FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['fc_dallas', 'austin_fc'] },
      { id: 'inter_miami', name: 'Inter Miami CF', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'rich', trophyOdds: 0.22, rivals: ['orlando_city', 'la_galaxy'] },
      { id: 'la_galaxy', name: 'LA Galaxy', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'rich', trophyOdds: 0.17, rivals: ['lafc', 'san_jose_earthquakes', 'inter_miami', 'san_diego_fc'] },
      { id: 'lafc', name: 'Los Angeles FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'rich', trophyOdds: 0.20, rivals: ['la_galaxy', 'san_diego_fc'] },
      { id: 'minnesota_utd', name: 'Minnesota United FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['sporting_kc'] },
      { id: 'nashville_sc', name: 'Nashville SC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: [] },
      { id: 'new_england_rev', name: 'New England Revolution', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['nycfc'] },
      { id: 'nycfc', name: 'New York City FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'rich', trophyOdds: 0.12, rivals: ['ny_red_bulls', 'new_england_rev'] },
      { id: 'ny_red_bulls', name: 'New York Red Bulls', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['nycfc', 'dc_united', 'philadelphia_union'] },
      { id: 'orlando_city', name: 'Orlando City SC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.09, rivals: ['inter_miami', 'atlanta_utd'] },
      { id: 'philadelphia_union', name: 'Philadelphia Union', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'standard', trophyOdds: 0.11, rivals: ['ny_red_bulls', 'dc_united'] },
      { id: 'portland_timbers', name: 'Portland Timbers', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['seattle_sounders', 'vancouver_whitecaps'] },
      { id: 'real_salt_lake', name: 'Real Salt Lake', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.09, rivals: ['colorado_rapids'] },
      { id: 'san_diego_fc', name: 'San Diego FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'rich', trophyOdds: 0.07, rivals: ['la_galaxy', 'lafc'] },
      { id: 'san_jose_earthquakes', name: 'San Jose Earthquakes', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['la_galaxy'] },
      { id: 'seattle_sounders', name: 'Seattle Sounders FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['portland_timbers', 'vancouver_whitecaps'] },
      { id: 'sporting_kc', name: 'Sporting Kansas City', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['st_louis_city', 'minnesota_utd'] },
      { id: 'st_louis_city', name: 'St. Louis City SC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: ['sporting_kc', 'chicago_fire'] },
      { id: 'toronto_fc', name: 'Toronto FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'rich', trophyOdds: 0.06, rivals: ['cf_montreal', 'vancouver_whitecaps'] },
      { id: 'vancouver_whitecaps', name: 'Vancouver Whitecaps FC', continent: 'NORTH_AMERICA', league: 'Major League Soccer', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['seattle_sounders', 'portland_timbers', 'toronto_fc', 'cf_montreal'] },

      // Portuguese Primeira Liga (18) — v5
      { id: 'benfica', name: 'SL Benfica', continent: 'EUROPE', league: 'Primeira Liga', starRating: 4, wealthTier: 'historic', trophyOdds: 0.34, rivals: ['sporting_cp', 'porto'] },
      { id: 'porto', name: 'FC Porto', continent: 'EUROPE', league: 'Primeira Liga', starRating: 4, wealthTier: 'historic', trophyOdds: 0.32, rivals: ['benfica', 'sporting_cp', 'braga'] },
      { id: 'sporting_cp', name: 'Sporting CP', continent: 'EUROPE', league: 'Primeira Liga', starRating: 4, wealthTier: 'historic', trophyOdds: 0.34, rivals: ['benfica', 'porto'] },
      { id: 'braga', name: 'SC Braga', continent: 'EUROPE', league: 'Primeira Liga', starRating: 3, wealthTier: 'standard', trophyOdds: 0.12, rivals: ['vitoria_sc', 'porto'] },
      { id: 'vitoria_sc', name: 'Vitória SC', continent: 'EUROPE', league: 'Primeira Liga', starRating: 3, wealthTier: 'historic', trophyOdds: 0.06, rivals: ['braga'] },
      { id: 'santa_clara', name: 'CD Santa Clara', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'famalicao', name: 'FC Famalicão', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.04, rivals: ['gil_vicente'] },
      { id: 'estoril', name: 'Estoril Praia', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['casa_pia'] },
      { id: 'casa_pia', name: 'Casa Pia AC', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['estoril', 'estrela_amadora'] },
      { id: 'moreirense', name: 'Moreirense FC', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['vitoria_sc'] },
      { id: 'rio_ave', name: 'Rio Ave FC', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'arouca', name: 'FC Arouca', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'gil_vicente', name: 'Gil Vicente FC', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['famalicao'] },
      { id: 'nacional', name: 'CD Nacional', continent: 'EUROPE', league: 'Primeira Liga', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'estrela_amadora', name: 'Estrela da Amadora', continent: 'EUROPE', league: 'Primeira Liga', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['casa_pia'] },
      { id: 'avs', name: 'AVS Futebol SAD', continent: 'EUROPE', league: 'Primeira Liga', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'tondela', name: 'CD Tondela', continent: 'EUROPE', league: 'Primeira Liga', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'alverca', name: 'FC Alverca', continent: 'EUROPE', league: 'Primeira Liga', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },

      // Dutch Eredivisie (18) — v5
      { id: 'ajax', name: 'AFC Ajax', continent: 'EUROPE', league: 'Eredivisie', starRating: 4, wealthTier: 'historic', trophyOdds: 0.28, rivals: ['feyenoord', 'psv', 'az_alkmaar'] },
      { id: 'psv', name: 'PSV Eindhoven', continent: 'EUROPE', league: 'Eredivisie', starRating: 4, wealthTier: 'standard', trophyOdds: 0.34, rivals: ['ajax', 'feyenoord'] },
      { id: 'feyenoord', name: 'Feyenoord', continent: 'EUROPE', league: 'Eredivisie', starRating: 4, wealthTier: 'historic', trophyOdds: 0.28, rivals: ['ajax', 'psv', 'sparta_rotterdam', 'excelsior'] },
      { id: 'az_alkmaar', name: 'AZ Alkmaar', continent: 'EUROPE', league: 'Eredivisie', starRating: 3, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['ajax'] },
      { id: 'twente', name: 'FC Twente', continent: 'EUROPE', league: 'Eredivisie', starRating: 3, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['heracles', 'go_ahead_eagles'] },
      { id: 'fc_utrecht', name: 'FC Utrecht', continent: 'EUROPE', league: 'Eredivisie', starRating: 3, wealthTier: 'standard', trophyOdds: 0.06, rivals: [] },
      { id: 'nec', name: 'NEC Nijmegen', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'go_ahead_eagles', name: 'Go Ahead Eagles', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['heracles', 'twente'] },
      { id: 'heerenveen', name: 'SC Heerenveen', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['fc_groningen'] },
      { id: 'sparta_rotterdam', name: 'Sparta Rotterdam', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'historic', trophyOdds: 0.02, rivals: ['feyenoord', 'excelsior'] },
      { id: 'fortuna_sittard', name: 'Fortuna Sittard', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'pec_zwolle', name: 'PEC Zwolle', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'fc_groningen', name: 'FC Groningen', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['heerenveen'] },
      { id: 'nac_breda', name: 'NAC Breda', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'heracles', name: 'Heracles Almelo', continent: 'EUROPE', league: 'Eredivisie', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['twente', 'go_ahead_eagles'] },
      { id: 'excelsior', name: 'Excelsior Rotterdam', continent: 'EUROPE', league: 'Eredivisie', starRating: 1, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['feyenoord', 'sparta_rotterdam'] },
      { id: 'telstar', name: 'SC Telstar', continent: 'EUROPE', league: 'Eredivisie', starRating: 1, wealthTier: 'standard', trophyOdds: 0.01, rivals: [] },
      { id: 'fc_volendam', name: 'FC Volendam', continent: 'EUROPE', league: 'Eredivisie', starRating: 1, wealthTier: 'standard', trophyOdds: 0.01, rivals: [] },

      // Belgian Pro League (16) — v5
      { id: 'club_brugge', name: 'Club Brugge', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 4, wealthTier: 'standard', trophyOdds: 0.32, rivals: ['anderlecht', 'cercle_brugge', 'kaa_gent'] },
      { id: 'union_sg', name: 'Union Saint-Gilloise', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.20, rivals: ['anderlecht'] },
      { id: 'anderlecht', name: 'RSC Anderlecht', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['club_brugge', 'standard_liege', 'union_sg'] },
      { id: 'genk', name: 'KRC Genk', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.14, rivals: ['sint_truiden'] },
      { id: 'kaa_gent', name: 'KAA Gent', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['club_brugge'] },
      { id: 'antwerp', name: 'Royal Antwerp FC', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['kv_mechelen'] },
      { id: 'standard_liege', name: 'Standard Liège', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 3, wealthTier: 'historic', trophyOdds: 0.08, rivals: ['anderlecht'] },
      { id: 'cercle_brugge', name: 'Cercle Brugge', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['club_brugge'] },
      { id: 'charleroi', name: 'Sporting Charleroi', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: [] },
      { id: 'kv_mechelen', name: 'KV Mechelen', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.03, rivals: ['antwerp'] },
      { id: 'westerlo', name: 'KVC Westerlo', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'oh_leuven', name: 'OH Leuven', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'sint_truiden', name: 'Sint-Truidense VV', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: ['genk'] },
      { id: 'dender', name: 'FCV Dender EH', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.01, rivals: [] },
      { id: 'zulte_waregem', name: 'SV Zulte Waregem', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 2, wealthTier: 'standard', trophyOdds: 0.02, rivals: [] },
      { id: 'la_louviere', name: 'RAAL La Louvière', continent: 'EUROPE', league: 'Belgian Pro League', starRating: 1, wealthTier: 'standard', trophyOdds: 0.01, rivals: [] },

      // A-League Men (12) — v5 (Australia competes in the AFC)
      { id: 'adelaide_utd', name: 'Adelaide United', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['melbourne_victory'] },
      { id: 'auckland_fc', name: 'Auckland FC', continent: 'ASIA', league: 'A-League Men', starRating: 3, wealthTier: 'rich', trophyOdds: 0.16, rivals: ['wellington_phoenix'] },
      { id: 'brisbane_roar', name: 'Brisbane Roar', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.07, rivals: [] },
      { id: 'cc_mariners', name: 'Central Coast Mariners', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.10, rivals: ['newcastle_jets'] },
      { id: 'macarthur', name: 'Macarthur FC', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.08, rivals: ['wsw'] },
      { id: 'melbourne_city', name: 'Melbourne City', continent: 'ASIA', league: 'A-League Men', starRating: 3, wealthTier: 'rich', trophyOdds: 0.22, rivals: ['melbourne_victory'] },
      { id: 'melbourne_victory', name: 'Melbourne Victory', continent: 'ASIA', league: 'A-League Men', starRating: 3, wealthTier: 'historic', trophyOdds: 0.16, rivals: ['melbourne_city', 'sydney_fc', 'adelaide_utd'] },
      { id: 'newcastle_jets', name: 'Newcastle Jets', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['cc_mariners'] },
      { id: 'perth_glory', name: 'Perth Glory', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.05, rivals: [] },
      { id: 'sydney_fc', name: 'Sydney FC', continent: 'ASIA', league: 'A-League Men', starRating: 3, wealthTier: 'historic', trophyOdds: 0.18, rivals: ['wsw', 'melbourne_victory'] },
      { id: 'wellington_phoenix', name: 'Wellington Phoenix', continent: 'ASIA', league: 'A-League Men', starRating: 2, wealthTier: 'standard', trophyOdds: 0.06, rivals: ['auckland_fc'] },
      { id: 'wsw', name: 'Western Sydney Wanderers', continent: 'ASIA', league: 'A-League Men', starRating: 3, wealthTier: 'standard', trophyOdds: 0.14, rivals: ['sydney_fc', 'macarthur'] },
    ];

    const CLUBS = (() => {
      const map = new Map(RAW_CLUBS.map((c) => [c.id, { ...c, rivals: new Set(c.rivals || []) }]));
      for (const [id, club] of map.entries()) {
        for (const rivalId of [...club.rivals]) {
          if (!map.has(rivalId) || rivalId === id) club.rivals.delete(rivalId);
          else map.get(rivalId).rivals.add(id);
        }
      }
      return Array.from(map.values()).map((c) => ({ ...c, rivals: Array.from(c.rivals) }));
    })();

    const CLUB_MAP = CLUBS.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    function getRivalryLevel(clubIdA, clubIdB) {
      if (!clubIdA || !clubIdB || clubIdA === clubIdB) return 'NONE';
      const isArch = ARCH_RIVAL_PAIRS.some(
        ([a, b]) => (a === clubIdA && b === clubIdB) || (a === clubIdB && b === clubIdA)
      );
      if (isArch) return 'ARCH_RIVAL';
      return CLUB_MAP[clubIdA]?.rivals.includes(clubIdB) ? 'RIVAL' : 'NONE';
    }

    function willTriggerYouthLoan(age, club, role, marketValueM) {
      return (
        age <= 20 &&
        club.starRating >= 4 &&
        !YOUTH_ACADEMY_CLUBS.has(club.id) &&
        (role === 'PROSPECT' || marketValueM < 14)
      );
    }
