(function () {
  'use strict';

  const API_URL = 'https://www.maniaplanet.com/webservices/servers/online?environments[]=Storm&length=1000';
  const CHANNELS_URL = 'https://www.maniaplanet.com/channels/shootmania';
  const REFRESH_INTERVAL_MS = 60_000;
  const PARIS_TZ = 'Europe/Paris';

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WEEKDAY_MAP = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  /**
   * Official Shootmania Channel programs mapped to their clean channel tile names
   * as displayed on https://www.maniaplanet.com/channels/shootmania.
   */
  const CHANNEL_PROGRAMS = {
    57: {
      id: '57',
      tileName: 'BATTLE',
      displayLabel: 'Battle',
      rawName: 'play ›› BATTLE',
      subtitle: 'Wave-based territory capture',
      url: 'https://www.maniaplanet.com/channels/programs/57',
    },
    306: {
      id: '306',
      tileName: 'CTF',
      displayLabel: 'CTF',
      rawName: 'Capture The Flag',
      subtitle: 'Capture The Flag',
      url: 'https://www.maniaplanet.com/channels/programs/306',
    },
    28: {
      id: '28',
      tileName: 'INFECTION',
      displayLabel: 'Infection',
      rawName: 'Infection',
      subtitle: 'Survivors vs Infected',
      url: 'https://www.maniaplanet.com/channels/programs/28',
    },
    87: {
      id: '87',
      tileName: 'SMURFS ROYAL',
      displayLabel: 'Smurfs Royal',
      rawName: 'Smurfs Royal',
      subtitle: 'Free-for-all survival',
      url: 'https://www.maniaplanet.com/channels/programs/87',
    },
    104: {
      id: '104',
      tileName: 'SIEGE EVERYTHING ALLOWED',
      displayLabel: 'Siege Everything Allowed',
      rawName: 'SIEGE EVERYTHING ALLOWED',
      subtitle: 'Attack & defend checkpoints',
      url: 'https://www.maniaplanet.com/channels/programs/104',
    },
    55: {
      id: '55',
      tileName: 'STORMIUM AGE',
      displayLabel: 'Stormium Age',
      rawName: 'STORMIUM AgE',
      subtitle: 'Class-based team combat',
      url: 'https://www.maniaplanet.com/channels/programs/55',
    },
    315: {
      id: '315',
      tileName: 'DUSTBATTLE',
      displayLabel: 'Dustbattle',
      rawName: 'DUST II BATTLE',
      subtitle: 'Dust II inspired Battle',
      url: 'https://www.maniaplanet.com/channels/programs/315',
    },
    291: {
      id: '291',
      tileName: 'ROYAL SQUAD BY TRISS',
      displayLabel: 'Royal Squad by Triss',
      rawName: 'Royal Squad',
      subtitle: 'Team survival Royal',
      url: 'https://www.maniaplanet.com/channels/programs/291',
    },
    321: {
      id: '321',
      tileName: 'DODGEBALL',
      displayLabel: 'Dodgeball',
      rawName: 'ShootMania DODGEBALL',
      subtitle: 'Arena dodgeball elimination',
      url: 'https://www.maniaplanet.com/channels/programs/321',
    },
    332: {
      id: '332',
      tileName: 'FLAG RUN',
      displayLabel: 'Flag Run',
      rawName: 'ShootMania FlagRun',
      subtitle: 'Fast-paced flag escort',
      url: 'https://www.maniaplanet.com/channels/programs/332',
    },
  };

  /**
   * Verified 7-day x 24-hour Shootmania Channel rotation (Europe/Paris time).
   * Hours 0..13 are shared across all days; hours 14..23 alternate between
   * Mon/Wed/Fri/Sun (even day indices: 0, 2, 4, 6) and Tue/Thu/Sat (odd: 1, 3, 5).
   */
  const SHARED_MORNING_HOURS = [
    '57', '306', '28', '87', '104', '55', '315', '291', '306', '28', '104', '315', '87', '55',
  ];
  const EVEN_DAY_AFTERNOON = ['306', '28', '332', '104', '306', '28', '332', '87', '104', '321'];
  const ODD_DAY_AFTERNOON = ['321', '104', '306', '28', '321', '104', '306', '291', '28', '332'];

  const WEEKLY_SCHEDULE = Array.from({ length: 7 }, (_, dayIndex) => {
    const afternoon = dayIndex % 2 === 0 ? EVEN_DAY_AFTERNOON : ODD_DAY_AFTERNOON;
    return SHARED_MORNING_HOURS.concat(afternoon);
  });

  const SCRIPT_MODE_MAP = {
    CTFMode: 'CTF',
    DodgeballFun: 'Dodgeball',
    SiegePro: 'Siege',
    BattlePro: 'Battle',
    ElitePro: 'Elite',
    '777modenewM': 'Elite',
    ElitePractice: 'Elite Practice',
    EliteTrainingDefense: 'Elite Defense',
    DuelElite: 'Duel Elite',
    JoustPro: 'Joust',
    ComboPro: 'Combo',
    Obstacle: 'Obstacle',
    SpeedBall: 'SpeedBall',
    ArenaDuelLegacy: 'Arena Duel',
    ArenaDuelLegacyDev: 'Arena Duel',
    InstaDM: 'InstaDM',
    MeleeParty: 'Melee',
    MidAirV2: 'MidAir',
    Annihilation: 'Annihilation',
    Annihilationv2: 'Annihilation',
    AnnihilationPlus: 'Annihilation',
    HungerGames: 'Hunger Games',
    JailbreakV2: 'Jailbreak',
    ChaseTag: 'Chase Tag',
    Target: 'Target',
    CrazyFrog: 'Turbo Frogger',
    CardMelee: 'Card Melee',
    CardMeleeTeams: 'Card Melee',
    RoyalPro: 'Royal',
    RoyalTurn: 'Royal',
    TeamFNG_Royal: 'Team FNG Royal',
    deadgame: 'Custom Mode',
  };

  const TITLE_MODE_MAP = {
    'SMStormElite@nadeolabs': 'Elite',
    'SMStormSiege@nadeolabs': 'Siege',
    'SMStormJoust@nadeolabs': 'Joust',
    'SMStormCombo@nadeolabs': 'Combo',
    'SMStormRoyal@nadeolabs': 'Royal',
    'SMStormBattle@nadeolabs': 'Battle',
    'obstacle@smokegun': 'Obstacle',
    'DuelElite@xenome77': 'Duel Elite',
    'SpeedBall@steeffeen': 'SpeedBall',
    'ArenaDuel4@darkminus': 'Arena Duel',
    'TurboFrogger@guerro': 'Turbo Frogger',
  };

  const state = {
    servers: [],
    channelServer: null,
    searchQuery: '',
    onlyWithPlayers: false,
    modeFilter: 'all',
    sortBy: 'players-desc',
    scheduleOpen: false,
    selectedScheduleDay: 0,
    lastFetchAt: null,
    nextFetchAt: Date.now() + REFRESH_INTERVAL_MS,
    lastParisHourKey: '',
    isFetching: false,
    lastError: null,
  };

  const dom = {};

  function cacheDom() {
    dom.statusPill = document.getElementById('status-pill');
    dom.statusText = document.getElementById('status-text');
    dom.lastUpdated = document.getElementById('last-updated');
    dom.nextRefresh = document.getElementById('next-refresh');
    dom.refreshBtn = document.getElementById('refresh-btn');
    dom.themeToggle = document.getElementById('theme-toggle');

    dom.metricPlayers = document.getElementById('metric-players');
    dom.metricSpectators = document.getElementById('metric-spectators');
    dom.metricChannelPlayers = document.getElementById('metric-channel-players');
    dom.metricChannelMode = document.getElementById('metric-channel-mode');
    dom.metricActiveServers = document.getElementById('metric-active-servers');
    dom.metricTotalServers = document.getElementById('metric-total-servers');

    dom.channelTileName = document.getElementById('channel-tile-name');
    dom.channelSubtitle = document.getElementById('channel-subtitle');
    dom.channelTimeslot = document.getElementById('channel-timeslot');
    dom.channelLogin = document.getElementById('channel-login');
    dom.channelZone = document.getElementById('channel-zone');
    dom.channelRotationTimer = document.getElementById('channel-rotation-timer');
    dom.channelPlayerCount = document.getElementById('channel-player-count');
    dom.channelPlayerMax = document.getElementById('channel-player-max');
    dom.channelPopBar = document.getElementById('channel-pop-bar');
    dom.channelSpectatorCount = document.getElementById('channel-spectator-count');
    dom.channelJoinBtn = document.getElementById('channel-join-btn');
    dom.channelUpNext = document.getElementById('channel-up-next');

    dom.toggleScheduleBtn = document.getElementById('toggle-schedule-btn');
    dom.schedulePanel = document.getElementById('schedule-panel');
    dom.scheduleDays = document.getElementById('schedule-days');
    dom.scheduleTzNote = document.getElementById('schedule-tz-note');
    dom.scheduleGrid = document.getElementById('schedule-grid');

    dom.statusBanner = document.getElementById('status-banner');
    dom.searchInput = document.getElementById('search-input');
    dom.filterAll = document.getElementById('filter-all');
    dom.filterPopulated = document.getElementById('filter-populated');
    dom.modeFilter = document.getElementById('mode-filter');
    dom.sortSelect = document.getElementById('sort-select');
    dom.filteredCount = document.getElementById('filtered-count');
    dom.serversList = document.getElementById('servers-list');
  }

  /**
   * Strips Maniaplanet color/style escape codes ($fff, $o, $i, $l[...], etc.)
   * and Private Use Area icon glyphs (U+E000..U+F8FF) that break in standard web fonts.
   */
  function stripManiaplanetCodes(input) {
    if (typeof input !== 'string' || !input) return '';
    // Single left-to-right pass matching Maniaplanet formatting syntax:
    // $$ (escaped literal $), $l[...]/$h[...] (links), $RGB (3-hex colors),
    // formatting flags ($o, $i, $w, $n, $s, $t, $m, $g, $z, $l, $h, $<, $>),
    // or a truncated trailing color / stray escape sequence.
    let text = input.replace(
      /\$(?:\$|[lh]\[[^\]]*\]|[0-9a-f]{3}|[oiwnstmgzlh<>]|[0-9a-f]{1,2}$|.?)/gi,
      (match) => (match === '$$' ? '$' : '')
    );
    // Remove Private Use Area glyphs (FontAwesome icons used inside Maniaplanet names)
    text = text.replace(/[\uE000-\uF8FF]/g, '');
    return text.replace(/\s+/g, ' ').trim();
  }

  function getParisDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PARIS_TZ,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    const dayIndex = WEEKDAY_MAP[map.weekday] ?? 0;
    const hour = Number(map.hour) % 24;
    const minute = Number(map.minute);
    const second = Number(map.second);
    return { dayIndex, hour, minute, second };
  }

  function getScheduledProgram(dayIndex, hour) {
    const daySlots = WEEKLY_SCHEDULE[((dayIndex % 7) + 7) % 7];
    const progId = daySlots[((hour % 24) + 24) % 24];
    return CHANNEL_PROGRAMS[progId];
  }

  function getSlotLocalDate(dayOffsetFromToday, targetHour, now = new Date()) {
    const parisNow = getParisDateParts(now);
    const deltaSeconds =
      (dayOffsetFromToday * 24 + (targetHour - parisNow.hour)) * 3600 -
      parisNow.minute * 60 -
      parisNow.second;
    return new Date(now.getTime() + deltaSeconds * 1000);
  }

  function formatTimeShort(date) {
    return (
      String(date.getHours()).padStart(2, '0') +
      ':' +
      String(date.getMinutes()).padStart(2, '0')
    );
  }

  function formatParisHourRange(hour) {
    const start = String(hour).padStart(2, '0') + ':00';
    const end = String((hour + 1) % 24).padStart(2, '0') + ':00';
    return `${start}-${end} Paris`;
  }

  function formatLocalSlotRange(dayOffset, targetHour, now = new Date()) {
    const start = getSlotLocalDate(dayOffset, targetHour, now);
    const end = new Date(start.getTime() + 3600_000);
    return `${formatTimeShort(start)} - ${formatTimeShort(end)}`;
  }

  function isChannelServer(server) {
    if (!server) return false;
    if (/^channel_/i.test(server.login || '')) return true;
    const cleaned = stripManiaplanetCodes(server.name || '');
    return /^Channel\s*:/i.test(cleaned);
  }

  function matchChannelProgram(rawName, scriptName, fallbackProgram) {
    const norm = stripManiaplanetCodes(rawName || '').toLowerCase();
    const script = (scriptName || '').trim();

    if (norm.includes('capture the flag') || script === 'CTFMode') {
      return CHANNEL_PROGRAMS['306'];
    }
    if (norm.includes('dust ii battle') || norm.includes('dustbattle')) {
      return CHANNEL_PROGRAMS['315'];
    }
    if (norm.includes('battle') && (norm.includes('play') || norm.includes('››'))) {
      return CHANNEL_PROGRAMS['57'];
    }
    if (norm.includes('infection')) {
      return CHANNEL_PROGRAMS['28'];
    }
    if (norm.includes('smurfs royal') || (norm.includes('smurf') && norm.includes('royal'))) {
      return CHANNEL_PROGRAMS['87'];
    }
    if (norm.includes('siege everything allowed')) {
      return CHANNEL_PROGRAMS['104'];
    }
    if (norm.includes('stormium age')) {
      return CHANNEL_PROGRAMS['55'];
    }
    if (norm.includes('royal squad')) {
      return CHANNEL_PROGRAMS['291'];
    }
    if (norm.includes('dodgeball') || script === 'DodgeballFun') {
      return CHANNEL_PROGRAMS['321'];
    }
    if ((norm.includes('flag') && norm.includes('run')) || /^FlagRun/i.test(script)) {
      return CHANNEL_PROGRAMS['332'];
    }
    if (script === 'BattlePro') return CHANNEL_PROGRAMS['57'];
    if (script === 'SiegePro') return CHANNEL_PROGRAMS['104'];

    return fallbackProgram || CHANNEL_PROGRAMS['306'];
  }

  function cleanFallbackScriptName(scriptName) {
    if (!scriptName) return 'Custom';
    let cleaned = scriptName
      .replace(/\.Script\.txt$/i, '')
      .replace(/Pro$/i, '')
      .replace(/V\d+$/i, '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
    return cleaned || scriptName;
  }

  function formatGamemode(server, cleanName) {
    const script = (server.script_name || '').trim();
    const title = (server.title || '').trim();

    if (/^FlagRun/i.test(script)) return 'Flag Run';
    if (/^Dodgeball/i.test(script)) return 'Dodgeball';

    if (script === 'RoyalPro' || script === 'RoyalTurn' || title === 'SMStormRoyal@nadeolabs') {
      if (/smurf/i.test(cleanName)) return 'Smurfs Royal';
      if (script === 'TeamFNG_Royal') return 'Team FNG Royal';
      return 'Royal';
    }

    if (SCRIPT_MODE_MAP[script]) {
      return SCRIPT_MODE_MAP[script];
    }

    if (TITLE_MODE_MAP[title]) {
      return TITLE_MODE_MAP[title];
    }

    return cleanFallbackScriptName(script);
  }

  function formatRegion(zone) {
    if (!zone || typeof zone !== 'string') return 'Unknown';
    const parts = zone.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) return parts[2];
    if (parts.length > 0) return parts[parts.length - 1];
    return 'Unknown';
  }

  function buildJoinUri(server) {
    const safeLogin = String(server.login || '').replace(/[^A-Za-z0-9_.-]/g, '');
    const safeTitle = String(server.title || '').replace(/[^A-Za-z0-9_@.-]/g, '');
    if (!safeLogin || !safeTitle) return '#';
    return `maniaplanet://#join=${safeLogin}@${safeTitle}`;
  }

  function normalizeServer(rawServer, parisScheduledProgram) {
    const channel = isChannelServer(rawServer);
    const strippedName = stripManiaplanetCodes(rawServer.name || '');
    let cleanName = strippedName || rawServer.login || 'Unnamed Server';
    let cleanMode = '';
    let channelProgram = null;

    if (channel) {
      const innerName = strippedName.replace(/^Channel\s*:\s*/i, '').replace(/\s+\d+$/, '').trim();
      channelProgram = matchChannelProgram(innerName, rawServer.script_name, parisScheduledProgram);
      cleanName = `Channel: ${channelProgram.tileName}`;
      cleanMode = channelProgram.tileName;
    } else {
      cleanMode = formatGamemode(rawServer, cleanName);
    }

    const playerCount = Math.max(0, Number(rawServer.player_count) || 0);
    const playerMax = Math.max(0, Number(rawServer.player_max) || 0);
    const spectatorCount = Math.max(0, Number(rawServer.spectator_count) || 0);

    return {
      login: rawServer.login || '',
      title: rawServer.title || '',
      rawName: rawServer.name || '',
      cleanName,
      cleanMode,
      isChannel: channel,
      channelProgram,
      playerCount,
      playerMax,
      spectatorCount,
      region: formatRegion(rawServer.zone),
      zone: rawServer.zone || '',
      isPrivate: Boolean(rawServer.is_private),
      scriptName: rawServer.script_name || '',
      joinUri: buildJoinUri(rawServer),
    };
  }

  /**
   * Parses the weekly Shootmania channel grid directly from the HTML of
   * https://www.maniaplanet.com/channels/shootmania (.mp-channels-grid).
   */
  function parseChannelsWebsiteHtml(htmlString) {
    if (typeof htmlString !== 'string' || !htmlString) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const cells = doc.querySelectorAll('.mp-channels-grid td[data-day][data-start]');
    if (!cells.length) return null;

    const grid = Array.from({ length: 7 }, () => Array(24).fill(null));
    cells.forEach((cell) => {
      const day = Number(cell.getAttribute('data-day'));
      const startSlot = Number(cell.getAttribute('data-start'));
      const hour = Math.floor(startSlot / 2);
      const link = cell.querySelector('a');
      const href = link ? link.getAttribute('href') || '' : '';
      const idMatch = href.match(/\/programs\/(\d+)/);
      const progId = idMatch ? idMatch[1] : null;
      const rawTitle = (cell.getAttribute('title') || '').split(/\r?\n/)[1] || '';

      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        grid[day][hour] =
          (progId && CHANNEL_PROGRAMS[progId]) ||
          matchChannelProgram(rawTitle, '', null);
      }
    });
    return grid;
  }

  async function fetchShootmaniaServers() {
    if (state.isFetching) return;
    state.isFetching = true;
    dom.refreshBtn.disabled = true;
    setStatusPill('loading', 'Updating...');

    try {
      const response = await fetch(API_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Maniaplanet API returned HTTP ${response.status}`);
      }
      const payload = await response.json();
      const rawList = Array.isArray(payload) ? payload : Object.values(payload || {});

      const parisNow = getParisDateParts();
      const currentSlotProgram = getScheduledProgram(parisNow.dayIndex, parisNow.hour);

      // Keep ONLY Shootmania servers (environment === 'Storm')
      const stormServers = rawList
        .filter((srv) => srv && srv.environment === 'Storm')
        .map((srv) => normalizeServer(srv, currentSlotProgram));

      // Identify active channel server (prefer channel_101 or highest player count)
      const channelCandidates = stormServers.filter((srv) => srv.isChannel);
      channelCandidates.sort((a, b) => {
        if (a.login === 'channel_101' && b.login !== 'channel_101') return -1;
        if (b.login === 'channel_101' && a.login !== 'channel_101') return 1;
        return b.playerCount - a.playerCount;
      });

      state.servers = stormServers;
      state.channelServer = channelCandidates[0] || null;
      state.lastFetchAt = new Date();
      state.nextFetchAt = Date.now() + REFRESH_INTERVAL_MS;
      state.lastError = null;

      hideBanner();
      setStatusPill('live', 'Live');
      updateModeFilterOptions();
      renderAll();
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : 'Failed to fetch Maniaplanet API';
      setStatusPill('error', 'Error');
      showBanner(`Unable to reach Maniaplanet API (${state.lastError}). Will retry automatically.`);
      // Still render schedule-based Channel highlight even if API fails
      renderChannelHighlight();
      renderSchedule();
    } finally {
      state.isFetching = false;
      dom.refreshBtn.disabled = false;
      updateTimers();
    }
  }

  function setStatusPill(mode, text) {
    dom.statusPill.classList.remove('is-live', 'is-error');
    if (mode === 'live') dom.statusPill.classList.add('is-live');
    if (mode === 'error') dom.statusPill.classList.add('is-error');
    dom.statusText.textContent = text;
    if (state.lastFetchAt) {
      dom.lastUpdated.textContent = state.lastFetchAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }
  }

  function showBanner(msg) {
    dom.statusBanner.textContent = msg;
    dom.statusBanner.hidden = false;
  }

  function hideBanner() {
    dom.statusBanner.hidden = true;
    dom.statusBanner.textContent = '';
  }

  function renderAll() {
    renderMetrics();
    renderChannelHighlight();
    renderServersTable();
    renderSchedule();
  }

  function renderMetrics() {
    const totalPlayers = state.servers.reduce((acc, s) => acc + s.playerCount, 0);
    const totalSpectators = state.servers.reduce((acc, s) => acc + s.spectatorCount, 0);
    const activeServers = state.servers.filter((s) => s.playerCount > 0).length;

    dom.metricPlayers.textContent = String(totalPlayers);
    dom.metricSpectators.textContent =
      totalSpectators > 0
        ? `${totalSpectators} spectating across Storm`
        : '0 spectators across Storm';

    dom.metricActiveServers.textContent = String(activeServers);
    dom.metricTotalServers.textContent = `${state.servers.length} online Storm servers`;

    const parisNow = getParisDateParts();
    const scheduled = getScheduledProgram(parisNow.dayIndex, parisNow.hour);
    if (state.channelServer) {
      dom.metricChannelPlayers.textContent = `${state.channelServer.playerCount} / ${state.channelServer.playerMax}`;
      dom.metricChannelMode.textContent = state.channelServer.channelProgram
        ? state.channelServer.channelProgram.tileName
        : scheduled.tileName;
    } else {
      dom.metricChannelPlayers.textContent = '0 / -';
      dom.metricChannelMode.textContent = `${scheduled.tileName} (offline/restarting)`;
    }
  }

  function renderChannelHighlight() {
    const now = new Date();
    const parisNow = getParisDateParts(now);
    const scheduledProg = getScheduledProgram(parisNow.dayIndex, parisNow.hour);
    const srv = state.channelServer;
    const activeProg = (srv && srv.channelProgram) || scheduledProg;

    dom.channelTileName.textContent = activeProg.tileName;
    dom.channelSubtitle.textContent = activeProg.subtitle;

    const localRange = formatLocalSlotRange(0, parisNow.hour, now);
    const parisRange = formatParisHourRange(parisNow.hour);
    dom.channelTimeslot.textContent =
      localRange.slice(0, 5) === parisRange.slice(0, 5)
        ? `${localRange} (Paris)`
        : `${localRange} local (${parisRange})`;

    if (srv) {
      dom.channelLogin.textContent = srv.login;
      dom.channelZone.textContent = srv.region;
      dom.channelPlayerCount.textContent = String(srv.playerCount);
      dom.channelPlayerMax.textContent = String(srv.playerMax);
      const pct = srv.playerMax > 0 ? Math.min(100, Math.round((srv.playerCount / srv.playerMax) * 100)) : 0;
      dom.channelPopBar.style.width = `${pct}%`;
      dom.channelSpectatorCount.textContent =
        srv.spectatorCount === 1 ? '1 spectator' : `${srv.spectatorCount} spectators`;
      dom.channelJoinBtn.href = srv.joinUri;
      dom.channelJoinBtn.removeAttribute('aria-disabled');
      dom.channelJoinBtn.textContent = 'Join Channel';
    } else {
      dom.channelLogin.textContent = 'channel_101 (offline)';
      dom.channelZone.textContent = 'Europe';
      dom.channelPlayerCount.textContent = '0';
      dom.channelPlayerMax.textContent = '-';
      dom.channelPopBar.style.width = '0%';
      dom.channelSpectatorCount.textContent = 'Channel server currently restarting or offline';
      dom.channelJoinBtn.href = CHANNELS_URL;
      dom.channelJoinBtn.textContent = 'Open Channel Page';
    }

    // Up next 3 hours
    const chipsFragment = document.createDocumentFragment();
    for (let offset = 1; offset <= 3; offset++) {
      const nextDate = new Date(now.getTime() + offset * 3600_000);
      const nextParis = getParisDateParts(nextDate);
      const nextProg = getScheduledProgram(nextParis.dayIndex, nextParis.hour);
      const slotStart = getSlotLocalDate(0, parisNow.hour + offset, now);

      const chip = document.createElement('span');
      chip.className = 'up-next-chip';

      const timeEl = document.createElement('span');
      timeEl.className = 'up-next-time tabular';
      timeEl.textContent = formatTimeShort(slotStart);

      const nameEl = document.createElement('span');
      nameEl.textContent = nextProg.tileName;

      chip.append(timeEl, nameEl);
      chipsFragment.appendChild(chip);
    }
    dom.channelUpNext.replaceChildren(chipsFragment);
  }

  function renderSchedule() {
    if (!state.scheduleOpen) return;

    const now = new Date();
    const parisNow = getParisDateParts(now);

    // Day tabs
    const tabsFragment = document.createDocumentFragment();
    DAY_NAMES.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab' + (idx === state.selectedScheduleDay ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(idx === state.selectedScheduleDay));
      btn.textContent = idx === parisNow.dayIndex ? `${DAY_SHORT[idx]} (Today)` : DAY_SHORT[idx];
      btn.addEventListener('click', () => {
        state.selectedScheduleDay = idx;
        renderSchedule();
      });
      tabsFragment.appendChild(btn);
    });
    dom.scheduleDays.replaceChildren(tabsFragment);

    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    dom.scheduleTzNote.textContent = `Showing ${DAY_NAMES[state.selectedScheduleDay]} (${tzName} time, synced to Europe/Paris schedule)`;

    // 24-hour slots for selected day
    const dayOffset = state.selectedScheduleDay - parisNow.dayIndex;
    const gridFragment = document.createDocumentFragment();
    for (let hour = 0; hour < 24; hour++) {
      const prog = getScheduledProgram(state.selectedScheduleDay, hour);
      const isCurrent = state.selectedScheduleDay === parisNow.dayIndex && hour === parisNow.hour;

      const slot = document.createElement('div');
      slot.className = 'schedule-slot' + (isCurrent ? ' is-current' : '');

      const hourEl = document.createElement('div');
      hourEl.className = 'slot-hour tabular';
      hourEl.textContent = formatLocalSlotRange(dayOffset, hour, now) + (isCurrent ? ' • LIVE' : '');

      const modeEl = document.createElement('div');
      modeEl.className = 'slot-mode';
      modeEl.textContent = prog.tileName;
      modeEl.title = `${prog.tileName} (${prog.subtitle})`;

      slot.append(hourEl, modeEl);
      gridFragment.appendChild(slot);
    }
    dom.scheduleGrid.replaceChildren(gridFragment);
  }

  function updateModeFilterOptions() {
    const current = state.modeFilter;
    const modeCounts = new Map();
    for (const s of state.servers) {
      modeCounts.set(s.cleanMode, (modeCounts.get(s.cleanMode) || 0) + 1);
    }

    const sortedModes = Array.from(modeCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const frag = document.createDocumentFragment();

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Gamemodes';
    frag.appendChild(allOpt);

    for (const [mode, count] of sortedModes) {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = `${mode} (${count})`;
      frag.appendChild(opt);
    }

    dom.modeFilter.replaceChildren(frag);
    dom.modeFilter.value = modeCounts.has(current) ? current : 'all';
    state.modeFilter = dom.modeFilter.value;
  }

  function getFilteredAndSortedServers() {
    const q = state.searchQuery.trim().toLowerCase();

    const filtered = state.servers.filter((s) => {
      if (state.onlyWithPlayers && s.playerCount === 0) return false;
      if (state.modeFilter !== 'all' && s.cleanMode !== state.modeFilter) return false;
      if (q) {
        const hay = `${s.cleanName} ${s.cleanMode} ${s.region} ${s.login}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      // Keep the highlighted Channel server pinned first when sorting by players
      if (state.sortBy === 'players-desc') {
        if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
        if (a.isChannel !== b.isChannel) return a.isChannel ? -1 : 1;
        if (b.spectatorCount !== a.spectatorCount) return b.spectatorCount - a.spectatorCount;
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'name-asc') {
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'mode-asc') {
        const cmp = a.cleanMode.localeCompare(b.cleanMode);
        return cmp !== 0 ? cmp : b.playerCount - a.playerCount;
      }
      return 0;
    });

    return filtered;
  }

  function renderServersTable() {
    const list = getFilteredAndSortedServers();
    dom.filteredCount.textContent =
      list.length === 1 ? '1 server' : `${list.length} servers`;

    if (list.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'empty-cell';
      td.textContent = state.servers.length === 0
        ? 'No online Shootmania servers found right now.'
        : 'No Shootmania servers match your current search or filters.';
      tr.appendChild(td);
      dom.serversList.replaceChildren(tr);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const srv of list) {
      const tr = document.createElement('tr');
      if (srv.isChannel) tr.className = 'row-channel';

      // Column 1: Server Name + badges + login
      const nameTd = document.createElement('td');
      const nameWrap = document.createElement('div');
      nameWrap.className = 'server-name-cell';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'server-title';
      titleSpan.textContent = srv.cleanName;
      nameWrap.appendChild(titleSpan);

      if (srv.isChannel) {
        const chTag = document.createElement('span');
        chTag.className = 'tag tag-channel';
        chTag.textContent = 'CHANNEL';
        nameWrap.appendChild(chTag);
      }

      if (srv.isPrivate) {
        const privTag = document.createElement('span');
        privTag.className = 'tag tag-private';
        privTag.textContent = 'Private';
        nameWrap.appendChild(privTag);
      }

      const subDiv = document.createElement('div');
      subDiv.className = 'server-sub mono';
      subDiv.textContent = srv.login;

      nameTd.append(nameWrap, subDiv);

      // Column 2: Clean Gamemode
      const modeTd = document.createElement('td');
      const modeTag = document.createElement('span');
      modeTag.className = 'tag tag-mode';
      modeTag.textContent = srv.cleanMode;
      modeTd.appendChild(modeTag);

      // Column 3: Player Count & Fill Bar
      const playersTd = document.createElement('td');
      playersTd.className = 'players-cell tabular';

      const playersLine = document.createElement('div');
      playersLine.className = 'players-line';

      const countSpan = document.createElement('span');
      countSpan.className = srv.playerCount > 0 ? 'players-active' : 'players-zero';
      countSpan.textContent = `${srv.playerCount} / ${srv.playerMax}`;
      playersLine.appendChild(countSpan);

      if (srv.spectatorCount > 0) {
        const specTag = document.createElement('span');
        specTag.className = 'tag tag-spec';
        specTag.textContent = `+${srv.spectatorCount} spec`;
        playersLine.appendChild(specTag);
      }

      const barTrack = document.createElement('div');
      barTrack.className = 'mini-bar-track';
      const barFill = document.createElement('div');
      barFill.className = 'mini-bar-fill';
      const pct = srv.playerMax > 0 ? Math.min(100, Math.round((srv.playerCount / srv.playerMax) * 100)) : 0;
      barFill.style.width = `${pct}%`;
      barTrack.appendChild(barFill);

      playersTd.append(playersLine, barTrack);

      // Column 4: Region
      const regionTd = document.createElement('td');
      regionTd.className = 'region-cell';
      regionTd.textContent = srv.region;

      // Column 5: Join Link
      const actionTd = document.createElement('td');
      actionTd.className = 'col-action';
      const joinLink = document.createElement('a');
      joinLink.className = 'btn btn-sm';
      joinLink.href = srv.joinUri;
      joinLink.textContent = 'Join';
      joinLink.title = `Launch Maniaplanet and join ${srv.cleanName}`;
      actionTd.appendChild(joinLink);

      tr.append(nameTd, modeTd, playersTd, regionTd, actionTd);
      fragment.appendChild(tr);
    }

    dom.serversList.replaceChildren(fragment);
  }

  function updateTimers() {
    const now = new Date();
    const parisNow = getParisDateParts(now);

    // Refresh countdown
    const secLeft = Math.max(0, Math.ceil((state.nextFetchAt - now.getTime()) / 1000));
    dom.nextRefresh.textContent = `${secLeft}s`;

    // Hourly channel rotation countdown
    const secsToHour = (59 - parisNow.minute) * 60 + (60 - parisNow.second);
    const mins = Math.floor(secsToHour / 60);
    const secs = secsToHour % 60;
    dom.channelRotationTimer.textContent =
      `Changes every hour • Next in ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;

    // If the Paris hour rolled over while the page is open, immediately update channel highlight & fetch fresh API data
    const hourKey = `${parisNow.dayIndex}-${parisNow.hour}`;
    if (state.lastParisHourKey && state.lastParisHourKey !== hourKey) {
      state.lastParisHourKey = hourKey;
      state.selectedScheduleDay = parisNow.dayIndex;
      renderChannelHighlight();
      renderSchedule();
      fetchShootmaniaServers();
    } else if (!state.lastParisHourKey) {
      state.lastParisHourKey = hourKey;
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('sm_theme', next);
    } catch (_) {}
    updateThemeAria();
  }

  function updateThemeAria() {
    const isDark = document.documentElement.dataset.theme !== 'light';
    dom.themeToggle.setAttribute('aria-pressed', String(isDark));
    dom.themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function bindEvents() {
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.refreshBtn.addEventListener('click', () => {
      fetchShootmaniaServers();
    });

    dom.toggleScheduleBtn.addEventListener('click', () => {
      state.scheduleOpen = !state.scheduleOpen;
      dom.schedulePanel.hidden = !state.scheduleOpen;
      dom.toggleScheduleBtn.setAttribute('aria-expanded', String(state.scheduleOpen));
      dom.toggleScheduleBtn.textContent = state.scheduleOpen
        ? 'Hide Schedule'
        : 'View 24h / Weekly Schedule';
      if (state.scheduleOpen) {
        state.selectedScheduleDay = getParisDateParts().dayIndex;
        renderSchedule();
      }
    });

    dom.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderServersTable();
    });

    dom.filterAll.addEventListener('click', () => {
      state.onlyWithPlayers = false;
      dom.filterAll.classList.add('active');
      dom.filterPopulated.classList.remove('active');
      renderServersTable();
    });

    dom.filterPopulated.addEventListener('click', () => {
      state.onlyWithPlayers = true;
      dom.filterPopulated.classList.add('active');
      dom.filterAll.classList.remove('active');
      renderServersTable();
    });

    dom.modeFilter.addEventListener('change', (e) => {
      state.modeFilter = e.target.value;
      renderServersTable();
    });

    dom.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderServersTable();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.lastFetchAt) {
        const elapsed = Date.now() - state.lastFetchAt.getTime();
        if (elapsed >= REFRESH_INTERVAL_MS) {
          fetchShootmaniaServers();
        }
      }
    });
  }

  function init() {
    cacheDom();
    updateThemeAria();
    bindEvents();

    const parisNow = getParisDateParts();
    state.selectedScheduleDay = parisNow.dayIndex;
    state.lastParisHourKey = `${parisNow.dayIndex}-${parisNow.hour}`;

    // Render schedule-backed Channel highlight immediately while API loads
    renderChannelHighlight();
    updateTimers();

    // Initial live API fetch + 60s polling loop + 1s lightweight timer tick
    fetchShootmaniaServers();
    setInterval(fetchShootmaniaServers, REFRESH_INTERVAL_MS);
    setInterval(updateTimers, 1000);
  }

  // Expose pure helpers for testing / HTML schedule parsing
  window.ShootmaniaTracker = {
    stripManiaplanetCodes,
    matchChannelProgram,
    formatGamemode,
    formatRegion,
    parseChannelsWebsiteHtml,
    getScheduledProgram,
    CHANNEL_PROGRAMS,
    WEEKLY_SCHEDULE,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
