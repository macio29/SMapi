/**
 * ShootMania API Parser & Live Server / Channel Tracker
 * Pure Vanilla JS — Zero dependencies, static GitHub Pages ready.
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. MANIAPLANET TEXT FORMATTING ($-CODE) PARSER
     Handles $000-$fff hex colors, $o, $i, $s, $w, $n, $m, $g, $z, $<, $>, $l, $h, $p, $$
     ========================================================================== */
  const ManiaText = {
    /**
     * Strips all ManiaPlanet $ formatting codes and returns clean plain text.
     */
    strip(raw) {
      if (!raw || typeof raw !== 'string') return '';
      let s = raw.replace(/\$\$/g, '\u0000'); // Preserve literal $$
      // Strip link targets like $l[http://...]text$l or $h[...]text$h
      s = s.replace(/\$(?:l|h|p)\[[^\]]*\]/gi, '');
      // Strip 3-digit hex color codes ($000 to $fff, including partial hex in MP)
      s = s.replace(/\$[0-9a-fA-F]{1,3}/g, '');
      // Strip style & control codes: o, i, s, w, n, m, g, z, t, <, >, l, h, p
      s = s.replace(/\$(?:o|i|s|w|n|m|g|z|t|<|>|l|h|p)/gi, '');
      // Catch any stray single $ followed by non-space
      s = s.replace(/\$[^\s]/g, '');
      s = s.replace(/\u0000/g, '$');
      return s.replace(/\s+/g, ' ').trim();
    },

    /**
     * Cleans decorative ASCII noise often found in ugly server names while keeping real words.
     */
    prettifyServerName(raw) {
      const stripped = this.strip(raw);
      if (!stripped) return 'Unnamed ShootMania Server';
      return stripped
        .replace(/^[\s~*=<>|•«»—\-_]+|[\s~*=<>|•«»—\-_]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || stripped;
    },

    /**
     * Converts ManiaPlanet $-formatted string into safe, contrast-adjusted HTML spans.
     */
    toHtml(raw) {
      if (!raw || typeof raw !== 'string') return '';
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      let s = raw.replace(/\$\$/g, '\u0000');
      // Remove link brackets
      s = s.replace(/\$(?:l|h|p)\[[^\]]*\]/gi, '');

      let color = null;
      let bold = false;
      let italic = false;
      let uppercase = false;

      const tokens = s.split(/(\$[0-9a-fA-F]{1,3}|\$[oiswnmgzt<>lhp])/gi);
      let html = '';

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (!tok) continue;

        if (tok.startsWith('$') && tok.length >= 2) {
          const code = tok.slice(1).toLowerCase();
          if (/^[0-9a-f]{1,3}$/i.test(code)) {
            const hex = code.padEnd(3, '0');
            color = this.adjustContrastHex(hex, isDark);
          } else if (code === 'o') {
            bold = true;
          } else if (code === 'i') {
            italic = true;
          } else if (code === 't') {
            uppercase = true;
          } else if (code === 'g') {
            color = null;
          } else if (code === 'z' || code === '>') {
            color = null;
            bold = false;
            italic = false;
            uppercase = false;
          }
        } else {
          const text = this.escapeHtml(tok.replace(/\u0000/g, '$'));
          if (!text) continue;
          const styles = [];
          if (color) styles.push(`color:${color}`);
          if (bold) styles.push('font-weight:700');
          if (italic) styles.push('font-style:italic');
          if (uppercase) styles.push('text-transform:uppercase');

          if (styles.length > 0) {
            html += `<span style="${styles.join(';')}">${text}</span>`;
          } else {
            html += text;
          }
        }
      }
      return html;
    },

    /**
     * Clamps ManiaPlanet 3-digit RGB hex so it stays readable on Light or Dark backgrounds.
     */
    adjustContrastHex(hex3, isDark) {
      let r = parseInt(hex3[0] + hex3[0], 16);
      let g = parseInt(hex3[1] + hex3[1], 16);
      let b = parseInt(hex3[2] + hex3[2], 16);

      // Relative luminance perception
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (!isDark && lum > 0.72) {
        // Darken overly bright colors on light backgrounds
        r = Math.round(r * 0.55);
        g = Math.round(g * 0.55);
        b = Math.round(b * 0.55);
      } else if (isDark && lum < 0.28) {
        // Brighten overly dark colors on dark backgrounds
        r = Math.min(255, Math.round(r + (255 - r) * 0.55));
        g = Math.min(255, Math.round(g + (255 - g) * 0.55));
        b = Math.min(255, Math.round(b + (255 - b) * 0.55));
      }
      return `rgb(${r},${g},${b})`;
    },

    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  /* ==========================================================================
     2. SHOOTMANIA TITLE ID & GAMEMODE SCRIPT TRANSLATION DICTIONARY
     Maps raw API titleUids and script_name values to clean display names.
     ========================================================================== */
  const TITLE_MAP = {
    'smstorm@nadeo': { name: 'ShootMania Storm', category: 'storm', author: 'Nadeo' },
    'smstorm': { name: 'ShootMania Storm', category: 'storm', author: 'Nadeo' },
    'smstormelite@nadeolabs': { name: 'Elite', category: 'elite', author: 'Nadeolabs' },
    'smstormroyal@nadeolabs': { name: 'Royal', category: 'royal', author: 'Nadeolabs' },
    'smstormsiege@nadeolabs': { name: 'Siege', category: 'siege', author: 'Nadeolabs' },
    'smstormbattle@nadeolabs': { name: 'Battle', category: 'battle', author: 'Nadeolabs' },
    'smstormjoust@nadeolabs': { name: 'Joust', category: 'joust', author: 'Nadeolabs' },
    'smstormcombo@nadeolabs': { name: 'Combo', category: 'combo', author: 'Nadeolabs' },
    'smstormheroes@nadeolabs': { name: 'Heroes', category: 'elite', author: 'Nadeolabs' },
    'smstormwarlords@nadeolabs': { name: 'Warlords', category: 'siege', author: 'Nadeolabs' },
    'smstormmaker@nadeo': { name: 'SM Storm Maker', category: 'storm', author: 'Nadeo' },
    'obstacle@smokegun': { name: 'Obstacle', category: 'obstacle', author: 'Smokegun' },
    'speedball@steeffeen': { name: 'SpeedBall', category: 'speedball', author: 'steeffeen' },
    'stormium@guerro.unbitn': { name: 'Stormium', category: 'storm', author: 'guerro.unbitn' },
    'stormium@guerro': { name: 'Stormium', category: 'storm', author: 'guerro.unbitn' },
    'infection@dmark': { name: 'Infection', category: 'infection', author: 'Dmark' },
    'infection@smokegun': { name: 'Infection', category: 'infection', author: 'Smokegun' },
    'cardmelee@fadden': { name: 'CardMelee', category: 'melee', author: 'Fadden' },
    'deathmatch@cime62': { name: 'Deathmatch', category: 'melee', author: 'cime62' },
    'deathmatch@ziyx': { name: 'Deathmatch', category: 'melee', author: 'Ziyx' },
    'duelelite@xenom': { name: 'Duel Elite', category: 'elite', author: 'Xen0m' },
    'heroes@triss': { name: 'Heroes', category: 'elite', author: 'Triss' },
    'reign@wawawawu': { name: 'Reign', category: 'storm', author: 'wawawawu' },
    'turbofrogger@guerro.unbitn': { name: 'TurboFrogger', category: 'obstacle', author: 'guerro.unbitn' },
    'battlepro@joustice': { name: 'BattlePro', category: 'battle', author: 'Joustice League' },
    'royalroulette@weerwolf': { name: 'Royal Roulette', category: 'royal', author: 'WeerWolf' },
    'arenaduel@professorlaw': { name: 'Arena Duel', category: 'joust', author: 'Professor Law' },
    'eliteextreme@njin': { name: 'Elite Extreme', category: 'elite', author: 'N-Jin' },
    'meltdown@ministry': { name: 'Meltdown', category: 'melee', author: 'ministry' },
    'rabbitmods@rabbit': { name: 'Rabbit Mods', category: 'storm', author: 'Rabbit' },
    'assault@ziyx': { name: 'Assault', category: 'siege', author: 'Ziyx' }
  };

  const SCRIPT_MAP = {
    'elite': 'Elite',
    'elitepro': 'Elite Pro',
    'eliteduel': 'Duel Elite',
    'royal': 'Royal',
    'royalarena': 'Royal Arena',
    'royalroulette': 'Royal Roulette',
    'smurfsroyal': 'Smurfs Royal',
    'royalsquad': 'Royal Squad',
    'siege': 'Siege',
    'siegev2': 'Siege v2',
    'siegeaddition': 'Siege Unlimited',
    'obstacle': 'Obstacle Course',
    'timeattack': 'Time Attack',
    'speedball': 'SpeedBall',
    'battle': 'Battle',
    'battlewaves': 'BattleWaves',
    'battlepro': 'BattlePro',
    'joust': 'Joust',
    'combo': 'Combo',
    'melee': 'Melee',
    'freeforall': 'Free For All',
    'deathmatch': 'Deathmatch',
    'cardmelee': 'CardMelee',
    'infection': 'Infection',
    'zombie': 'Zombie Infection',
    'dodgeball': 'Dodgeball',
    'flagrun': 'Flag Run',
    'ctf': 'Capture The Flag',
    'assault': 'Assault',
    'heroes': 'Heroes',
    'warlords': 'Warlords',
    'laser': 'Laser Instagib',
    'instagib': 'Laser Instagib',
    'lobby': 'Matchmaking Lobby',
    'kingofthelobby': 'King of the Lobby'
  };

  // Explicit TrackMania exclusions so TrackMania servers never leak into the view
  const TRACKMANIA_ENVS = new Set(['canyon', 'stadium', 'valley', 'lagoon', 'bay', 'island', 'desert', 'rally', 'snow', 'coast', 'stunt']);
  const TRACKMANIA_TITLE_PREFIXES = ['tmcanyon', 'tmstadium', 'tmvalley', 'tmlagoon', 'tmone', 'trackmania', 'esl_comp@lt_forever', 'envimix'];

  const ShootManiaParser = {
    /**
     * Strictly verifies that a server record belongs to the ShootMania branch (Storm)
     * and NOT TrackMania.
     */
    isShootManiaServer(srv) {
      if (!srv) return false;
      const rawEnvField = srv.environment ?? srv.env ?? srv.environments ?? '';
      const envList = Array.isArray(rawEnvField)
        ? rawEnvField.map((e) => String(e || '').toLowerCase().trim()).filter(Boolean)
        : String(rawEnvField).toLowerCase().trim()
            .split(/[,|]+/)
            .map((e) => e.trim())
            .filter(Boolean);
      const env = envList.join(',');

      const rawTitleObj = srv.title && typeof srv.title === 'object' ? (srv.title.id || srv.title.uid || srv.title.name || '') : srv.title;
      const title = String(rawTitleObj || srv.titleId || srv.title_uid || srv.titleUid || '').toLowerCase().trim();
      const script = String(srv.script_name || srv.scriptName || srv.gamemode || srv.mode || '').toLowerCase().trim();

      // Accept explicit Storm / ShootMania environment (before generic prefix checks)
      if (envList.includes('storm') || envList.includes('shootmania')) return true;

      // Reject explicit TrackMania environments
      if (envList.length > 0 && envList.some((e) => TRACKMANIA_ENVS.has(e))) return false;

      // Reject explicit TrackMania title packs
      for (const prefix of TRACKMANIA_TITLE_PREFIXES) {
        if (title.startsWith(prefix) || title.includes('trackmania')) return false;
      }

      // Accept known ShootMania title packs or SMStorm prefixes
      if (
        title.startsWith('smstorm') ||
        TITLE_MAP[title] ||
        title.includes('obstacle@') ||
        title.includes('speedball') ||
        title.includes('stormium') ||
        title.includes('infection') ||
        title.includes('cardmelee') ||
        title.includes('joust') ||
        title.includes('siege') ||
        title.includes('royal') ||
        title.includes('elite') ||
        script.includes('shootmania')
      ) {
        return true;
      }

      // If no environment field was provided, default to true only if not TM
      return env === '';
    },

    /**
     * Resolves an ugly API titleId (e.g. "SMStormElite@nadeolabs") to a clean human-readable object.
     */
    parseTitle(rawTitleId) {
      if (!rawTitleId) {
        return { raw: 'SMStorm@nadeo', cleanName: 'ShootMania Storm', category: 'storm', author: 'Nadeo' };
      }
      const key = String(rawTitleId).toLowerCase().trim();
      if (TITLE_MAP[key]) {
        return {
          raw: rawTitleId,
          cleanName: TITLE_MAP[key].name,
          category: TITLE_MAP[key].category,
          author: TITLE_MAP[key].author
        };
      }

      // Smart fallback for custom ShootMania title IDs like "MyCustomTitle@author_login"
      const [basePart, authorPart] = String(rawTitleId).split('@');
      let cleanBase = basePart
        .replace(/^SMStorm/i, '')
        .replace(/^SM/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_\-]+/g, ' ')
        .trim();

      if (!cleanBase) cleanBase = 'ShootMania Storm';
      let category = 'storm';
      const lower = cleanBase.toLowerCase();
      if (lower.includes('elite')) category = 'elite';
      else if (lower.includes('royal')) category = 'royal';
      else if (lower.includes('siege') || lower.includes('assault')) category = 'siege';
      else if (lower.includes('obstacle') || lower.includes('jump')) category = 'obstacle';

      return {
        raw: rawTitleId,
        cleanName: cleanBase,
        category,
        author: authorPart || 'Community'
      };
    },

    /**
     * Resolves an ugly API script_name (e.g. "ShootMania\Elite\ElitePro.Script.txt")
     * into a clean, human-readable Gamemode label.
     */
    parseGamemode(rawScript, parsedTitle) {
      if (!rawScript) {
        return parsedTitle ? parsedTitle.cleanName : 'ShootMania Mode';
      }

      // Extract filename from paths like "ShootMania\Elite\ElitePro.Script.txt" or "Modes/ShootMania/Royal.Script.txt"
      let base = String(rawScript)
        .split(/[\\/]/)
        .pop()
        .replace(/\.Script\.txt$/i, '')
        .replace(/\.txt$/i, '')
        .trim();

      const lookupKey = base.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Special case: TimeAttack inside Obstacle title pack -> "Obstacle Time Attack"
      if (lookupKey === 'timeattack' && parsedTitle && parsedTitle.category === 'obstacle') {
        return 'Obstacle Time Attack';
      }

      if (SCRIPT_MAP[lookupKey]) {
        return SCRIPT_MAP[lookupKey];
      }

      // Smart CamelCase & underscore normalizer
      let humanized = base
        .replace(/^SM_?/i, '')
        .replace(/^ShootMania_?/i, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!humanized) {
        return parsedTitle ? parsedTitle.cleanName : 'Custom Mode';
      }

      return humanized.charAt(0).toUpperCase() + humanized.slice(1);
    },

    /**
     * Detects whether a server is the official ShootMania Live Channels server.
     */
    isChannelServer(srv) {
      if (!srv) return false;
      if (srv.is_channel || srv.isChannel || srv.channel) return true;
      const login = String(srv.login || '').toLowerCase();
      const cleanName = ManiaText.strip(srv.name || '').toLowerCase();
      return (
        login.includes('channel') ||
        login === 'sm_live_channel' ||
        cleanName.includes('shootmania live') ||
        cleanName.includes('maniaplanet channel') ||
        cleanName.startsWith('channel ')
      );
    },

    /**
     * Cleans zone path like "World|Europe|France|Île-de-France" -> "Europe / France"
     */
    formatZone(rawZone) {
      if (!rawZone) return 'Global';
      const parts = String(rawZone).split('|').filter(Boolean);
      if (parts[0] === 'World') parts.shift();
      if (parts.length === 0) return 'Global';
      return parts.slice(0, 2).join(' / ');
    }
  };

  /* ==========================================================================
     3. SHOOTMANIA LIVE CHANNEL HOURLY SCHEDULE ENGINE
     Based on the official ManiaPlanet 4 "Shootmania Live" hourly program grid
     (sourced from prod.live.maniaplanet.com/channels/programs/*).
     Changes every hour on the hour (00:00 - 24:00 UTC).
     ========================================================================== */
  const HOURLY_CHANNEL_PROGRAMS = [
    { hourUtc: 0, programId: 104, title: 'SIEGE EVERYTHING ALLOWED', rawScript: 'ShootMania\\Siege\\SiegeAddition.Script.txt', rawTitleId: 'SMStormSiege@nadeolabs', author: 'Λtría ɀıצx', map: 'Siege - Fortress Valley' },
    { hourUtc: 1, programId: 87, title: 'Smurfs Royal', rawScript: 'ShootMania\\Royal\\SmurfsRoyal.Script.txt', rawTitleId: 'SMStormRoyal@nadeolabs', author: '=THB= HYPE Smurf', map: 'Royal - Smurf Archipelago' },
    { hourUtc: 2, programId: 28, title: 'Infection', rawScript: 'Modes\\ShootMania\\Infection.Script.txt', rawTitleId: 'Infection@dmark', author: 'ζѻア॥ Đmαяκ', map: 'Infection - Quarantine Sector' },
    { hourUtc: 3, programId: 104, title: 'SIEGE EVERYTHING ALLOWED', rawScript: 'ShootMania\\Siege\\SiegeAddition.Script.txt', rawTitleId: 'SMStormSiege@nadeolabs', author: 'Λtría ɀıצx', map: 'Siege - Highwatch Keep' },
    { hourUtc: 4, programId: 87, title: 'Smurfs Royal', rawScript: 'ShootMania\\Royal\\SmurfsRoyal.Script.txt', rawTitleId: 'SMStormRoyal@nadeolabs', author: '=THB= HYPE Smurf', map: 'Royal - Meteor Crater' },
    { hourUtc: 5, programId: 315, title: 'DUST II BATTLE', rawScript: 'ShootMania\\Battle\\Battle.Script.txt', rawTitleId: 'SMStormBattle@nadeolabs', author: 'c2', map: 'Storm Dust II - Arena' },
    { hourUtc: 6, programId: 315, title: 'DUST II BATTLE', rawScript: 'ShootMania\\Battle\\Battle.Script.txt', rawTitleId: 'SMStormBattle@nadeolabs', author: 'c2', map: 'Storm Dust II - B Site' },
    { hourUtc: 7, programId: 201, title: 'Obstacle Live Discovery', rawScript: 'Modes\\ShootMania\\Obstacle.Script.txt', rawTitleId: 'obstacle@smokegun', author: 'Smokegun', map: 'Obstacle - Epica Run #04' },
    { hourUtc: 8, programId: 215, title: 'Elite Warmup 3v3', rawScript: 'ShootMania\\Elite\\ElitePro.Script.txt', rawTitleId: 'SMStormElite@nadeolabs', author: 'Nadeolabs', map: 'Elite - Colosseum Pro' },
    { hourUtc: 9, programId: 28, title: 'Infection', rawScript: 'Modes\\ShootMania\\Infection.Script.txt', rawTitleId: 'Infection@dmark', author: 'ζѻア॥ Đmαяκ', map: 'Infection - BioLab Escape' },
    { hourUtc: 10, programId: 315, title: 'DUST II BATTLE', rawScript: 'ShootMania\\Battle\\Battle.Script.txt', rawTitleId: 'SMStormBattle@nadeolabs', author: 'c2', map: 'Storm Dust II - Mid Doors' },
    { hourUtc: 11, programId: 87, title: 'Smurfs Royal', rawScript: 'ShootMania\\Royal\\SmurfsRoyal.Script.txt', rawTitleId: 'SMStormRoyal@nadeolabs', author: '=THB= HYPE Smurf', map: 'Royal - Tornado Spire' },
    { hourUtc: 12, programId: 247, title: 'Assault', rawScript: 'Modes\\ShootMania\\Assault.Script.txt', rawTitleId: 'Assault@ziyx', author: 'Λtría ɀıצx', map: 'Assault - Citadel Breach' },
    { hourUtc: 13, programId: 87, title: 'Smurfs Royal', rawScript: 'ShootMania\\Royal\\SmurfsRoyal.Script.txt', rawTitleId: 'SMStormRoyal@nadeolabs', author: '=THB= HYPE Smurf', map: 'Royal - Obsidian Peak' },
    { hourUtc: 14, programId: 321, title: 'ShootMania DODGEBALL', rawScript: 'Modes\\ShootMania\\Dodgeball.Script.txt', rawTitleId: 'STORMIUM@guerro.unbitn', author: 'Λtría / guerro.unbitn', map: 'Dodgeball - Neon Court' },
    { hourUtc: 15, programId: 28, title: 'Infection', rawScript: 'Modes\\ShootMania\\Infection.Script.txt', rawTitleId: 'Infection@dmark', author: 'ζѻア॥ Đmαяκ', map: 'Infection - Bunker 17' },
    { hourUtc: 16, programId: 332, title: 'ShootMania Flag Run', rawScript: 'Modes\\ShootMania\\FlagRun.Script.txt', rawTitleId: 'STORMIUM@guerro.unbitn', author: 'Λtría / guerro.unbitn', map: 'Flag Run - Twin Citadels' },
    { hourUtc: 17, programId: 28, title: 'Infection', rawScript: 'Modes\\ShootMania\\Infection.Script.txt', rawTitleId: 'Infection@dmark', author: 'ζѻア॥ Đmαяκ', map: 'Infection - Outpost Omega' },
    { hourUtc: 18, programId: 321, title: 'ShootMania DODGEBALL', rawScript: 'Modes\\ShootMania\\Dodgeball.Script.txt', rawTitleId: 'STORMIUM@guerro.unbitn', author: 'Λtría / guerro.unbitn', map: 'Dodgeball - Laser Stadium' },
    { hourUtc: 19, programId: 28, title: 'Infection', rawScript: 'Modes\\ShootMania\\Infection.Script.txt', rawTitleId: 'Infection@dmark', author: 'ζѻア॥ Đmαяκ', map: 'Infection - Dark Reactor' },
    { hourUtc: 20, programId: 332, title: 'ShootMania Flag Run', rawScript: 'Modes\\ShootMania\\FlagRun.Script.txt', rawTitleId: 'STORMIUM@guerro.unbitn', author: 'Λtría / guerro.unbitn', map: 'Flag Run - Skybridge' },
    { hourUtc: 21, programId: 104, title: 'SIEGE EVERYTHING ALLOWED', rawScript: 'ShootMania\\Siege\\SiegeAddition.Script.txt', rawTitleId: 'SMStormSiege@nadeolabs', author: 'Λtría ɀıצx', map: 'Siege - Storm Bastion' },
    { hourUtc: 22, programId: 87, title: 'Smurfs Royal', rawScript: 'ShootMania\\Royal\\SmurfsRoyal.Script.txt', rawTitleId: 'SMStormRoyal@nadeolabs', author: '=THB= HYPE Smurf', map: 'Royal - Canyon Vortex' },
    { hourUtc: 23, programId: 321, title: 'ShootMania DODGEBALL', rawScript: 'Modes\\ShootMania\\Dodgeball.Script.txt', rawTitleId: 'STORMIUM@guerro.unbitn', author: 'Λtría / guerro.unbitn', map: 'Dodgeball - Midnight Arena' }
  ];

  function getChannelRotationState(now = new Date()) {
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const utcSec = now.getUTCSeconds();

    const currentSlot = HOURLY_CHANNEL_PROGRAMS[utcHour] || HOURLY_CHANNEL_PROGRAMS[0];
    const nextSlot = HOURLY_CHANNEL_PROGRAMS[(utcHour + 1) % 24];

    const elapsedSec = utcMin * 60 + utcSec;
    const remainingSec = 3600 - elapsedSec;
    const progressPct = Math.min(100, Math.max(0, (elapsedSec / 3600) * 100));

    const remMin = Math.floor(remainingSec / 60);
    const remS = remainingSec % 60;

    return {
      utcHour,
      currentSlot,
      nextSlot,
      elapsedSec,
      remainingSec,
      progressPct,
      countdownFormatted: `${String(remMin).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`,
      windowUtc: `${String(utcHour).padStart(2, '0')}:00 – ${String((utcHour + 1) % 24).padStart(2, '0')}:00 UTC`
    };
  }

  /* ==========================================================================
     4. APPLICATION STATE
     ========================================================================== */
  const AUTO_REFRESH_SEC = 60;

  const state = {
    theme: localStorage.getItem('sm_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    activeTab: 'servers', // 'servers' | 'dictionary'
    nameFormat: 'clean',  // 'clean' | 'colored' | 'raw'
    searchQuery: '',
    categoryFilter: 'all',
    hideEmpty: false,
    sortBy: 'players_desc',
    scheduleDrawerOpen: false,

    // Data & API Connection State (never pre-populated with fake data)
    dataMode: 'loading', // 'loading' | 'servers' | 'titles' | 'error'
    apiStatus: 'live_proxy', // 'live_api' | 'live_proxy' | 'fallback'
    apiStatusLabel: 'Syncing Live Data...',
    apiErrorNote: '',
    lastUpdated: null,

    rawServers: [],
    normalizedServers: [],
    liveTitles: [],
    liveChannelOverride: null
  };

  /* ==========================================================================
     5. DATA NORMALIZATION PIPELINE (STRICT SHOOTMANIA ONLY)
     ========================================================================== */
  function normalizeServerList(rawArray) {
    if (!Array.isArray(rawArray)) return;

    // Strictly filter out TrackMania and keep only ShootMania branch
    const shootmaniaOnly = rawArray.filter((srv) => ShootManiaParser.isShootManiaServer(srv));

    const servers = shootmaniaOnly.map((srv) => {
      const rawName = String(srv.name || srv.server_name || srv.login || 'ShootMania Server');
      const rawTitleField = srv.title && typeof srv.title === 'object' ? (srv.title.id || srv.title.uid || srv.title.name || '') : srv.title;
      const rawTitle = String(rawTitleField || srv.titleId || srv.title_uid || srv.titleUid || 'SMStorm@nadeo');
      const rawScript = String(srv.script_name || srv.scriptName || srv.gamemode || srv.mode || '');

      const parsedTitle = ShootManiaParser.parseTitle(rawTitle);
      const cleanGamemode = ShootManiaParser.parseGamemode(rawScript, parsedTitle);
      const isChannel = ShootManiaParser.isChannelServer(srv);

      const playerCount = Math.max(0, parseInt(srv.player_count ?? srv.playerCount ?? srv.playersCount ?? srv.nbPlayers ?? 0, 10) || 0);
      const playerMax = Math.max(1, parseInt(srv.player_max ?? srv.playerMax ?? srv.playersMax ?? srv.maxPlayers ?? 32, 10) || 32);
      const spectatorCount = Math.max(0, parseInt(srv.spectator_count ?? srv.spectatorCount ?? srv.nbSpectators ?? 0, 10) || 0);

      const login = String(srv.login || srv.server_login || 'sm_server');
      const joinUrl = `maniaplanet://#join=${encodeURIComponent(login)}@${encodeURIComponent(parsedTitle.raw)}`;
      const rawMap = srv.map && typeof srv.map === 'object' ? (srv.map.name || srv.map.uid || '') : (srv.map || srv.currentMap || '');

      return {
        login,
        rawName,
        cleanName: ManiaText.prettifyServerName(rawName),
        coloredNameHtml: ManiaText.toHtml(rawName),
        rawTitle: parsedTitle.raw,
        cleanTitle: parsedTitle.cleanName,
        category: isChannel ? 'channel' : parsedTitle.category,
        titleAuthor: parsedTitle.author,
        rawScript: rawScript || 'Default.Script.txt',
        cleanGamemode,
        playerCount,
        playerMax,
        spectatorCount,
        zone: ShootManiaParser.formatZone(srv.zone || srv.zonePath || srv.path),
        isPrivate: Boolean(srv.is_private ?? srv.isPrivate ?? srv.private),
        isChannel,
        mapClean: ManiaText.strip(String(rawMap)),
        joinUrl,
        programAuthor: srv.program_author || parsedTitle.author
      };
    });

    state.normalizedServers = servers;
  }

  function normalizeLiveTitles(rawTitles) {
    if (!Array.isArray(rawTitles)) return [];
    const seen = new Set();
    const out = [];

    for (const t of rawTitles) {
      const titleId = String(t.titleId || t.id || '').trim();
      if (!titleId || seen.has(titleId.toLowerCase())) continue;

      // Strictly exclude TrackMania titles
      if (!ShootManiaParser.isShootManiaServer({ title: titleId, environment: t.environment || '' })) {
        continue;
      }
      const lowerId = titleId.toLowerCase();
      if (lowerId.includes('trackmania') || lowerId.startsWith('tm')) continue;

      seen.add(lowerId);
      const parsed = ShootManiaParser.parseTitle(titleId);
      const rawDisplayName = String(t.name || '').trim();
      const cleanName = ManiaText.strip(rawDisplayName) || parsed.cleanName;
      const author = ManiaText.strip(String(t.author || '')) || parsed.author;
      const onlinePlayers = Math.max(0, parseInt(t.onlinePlayers ?? t.playersOnline ?? 0, 10) || 0);

      out.push({
        titleId,
        rawName: rawDisplayName || cleanName,
        cleanName,
        coloredNameHtml: ManiaText.toHtml(rawDisplayName || cleanName),
        author,
        category: parsed.category,
        onlinePlayers,
        webUrl: `https://www.maniaplanet.com/titles/${encodeURIComponent(titleId)}`,
        joinUrl: `maniaplanet://#qjoin=${encodeURIComponent(titleId)}`
      });
    }

    return out;
  }

  /* ==========================================================================
     6. PURE CLIENT-SIDE LIVE FETCHING ENGINE (MANIAPLANET API & WEB VIA JS)
     ========================================================================== */
  function buildCorsProxyRequest(targetUrl, proxyType) {
    const sep = targetUrl.includes('?') ? '&' : '?';
    const bustedUrl = `${targetUrl}${sep}_cb=${Date.now()}`;

    if (proxyType === 'allorigins_json') {
      return {
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(bustedUrl)}`,
        isAllOriginsJson: true
      };
    }
    if (proxyType === 'corsproxy') {
      return {
        url: `https://corsproxy.io/?url=${encodeURIComponent(bustedUrl)}`,
        isAllOriginsJson: false
      };
    }
    if (proxyType === 'codetabs') {
      return {
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(bustedUrl)}`,
        isAllOriginsJson: false
      };
    }
    if (proxyType === 'allorigins_raw') {
      return {
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(bustedUrl)}`,
        isAllOriginsJson: false
      };
    }
    return { url: bustedUrl, isAllOriginsJson: false };
  }

  let lastWorkingCorsProxy = null;

  async function fetchTextViaCorsProxies(targetUrl, validatorFn, timeoutMs = 7000) {
    const baseProxies = ['allorigins_json', 'corsproxy', 'codetabs', 'allorigins_raw'];
    const proxies = lastWorkingCorsProxy
      ? [lastWorkingCorsProxy, ...baseProxies.filter((p) => p !== lastWorkingCorsProxy)]
      : baseProxies;

    for (const proxy of proxies) {
      const { url, isAllOriginsJson } = buildCorsProxyRequest(targetUrl, proxy);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) {
          if (proxy !== 'allorigins_json' && (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404)) {
            return null;
          }
          continue;
        }

        let payload = '';
        if (isAllOriginsJson) {
          const json = await res.json();
          const httpCode = Number(json && json.status && json.status.http_code);
          if (httpCode === 400 || httpCode === 401 || httpCode === 403 || httpCode === 404) {
            return null; // Upstream explicitly rejected or does not exist; skip retrying other proxies
          }
          if (httpCode && httpCode >= 400) continue;
          payload = json && typeof json.contents === 'string' ? json.contents : '';
        } else {
          payload = await res.text();
        }

        if (payload) {
          const check = validatorFn ? validatorFn(payload) : true;
          if (check === 'stop') return null;
          if (check) {
            lastWorkingCorsProxy = proxy;
            return payload;
          }
        }
      } catch (_) {
        clearTimeout(timer);
      }
    }
    return null;
  }

  async function fetchHtmlViaCorsProxies(targetUrl, validationMarker, timeoutMs = 7000) {
    return fetchTextViaCorsProxies(
      targetUrl,
      (html) => html.length > 500 && (!validationMarker || html.toLowerCase().includes(validationMarker.toLowerCase())),
      timeoutMs
    );
  }

  function extractServerArray(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.servers)) return json.servers;
    if (json && Array.isArray(json.items)) return json.items;
    if (json && Array.isArray(json.data)) return json.data;
    return null;
  }

  /**
   * Probes ManiaPlanet's documented Swagger endpoint GET /webservices/servers/online
   * directly in the browser (plus via CORS proxies if direct browser CORS is blocked).
   * Rejects HTML / error responses and keeps strictly Storm/ShootMania servers.
   */
  async function tryFetchAnonymousWsServers() {
    const endpoints = [
      'https://prod.live.maniaplanet.com/webservices/servers/online?environment=Storm&orderBy=playerCount&length=100',
      'https://prod.live.maniaplanet.com/webservices/servers/online?orderBy=playerCount&length=100',
      'https://prod.live.maniaplanet.com/webservices/servers/online'
    ];

    const parseCandidateServers = (text) => {
      if (!text) return { isJson: false, servers: null };
      const trimmed = text.trim();
      if (!trimmed || trimmed.startsWith('<')) return { isJson: false, servers: null };
      try {
        const parsed = JSON.parse(trimmed);
        const arr = extractServerArray(parsed);
        if (arr) {
          const smOnly = arr.filter((srv) => ShootManiaParser.isShootManiaServer(srv));
          return { isJson: true, servers: smOnly.length > 0 ? smOnly : null };
        }
        return { isJson: true, servers: null };
      } catch (_) {
        return { isJson: false, servers: null };
      }
    };

    for (const endpoint of endpoints) {
      // 1) Fast direct browser attempt in case upstream permits CORS
      const directController = new AbortController();
      const directTimer = setTimeout(() => directController.abort(), 3000);
      try {
        const res = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: directController.signal
        });
        clearTimeout(directTimer);
        if (res.ok) {
          const { isJson, servers } = parseCandidateServers(await res.text());
          if (servers) return servers;
          if (isJson) continue; // Valid JSON received directly without SM servers; try next endpoint
        } else if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
          continue;
        }
      } catch (_) {
        clearTimeout(directTimer);
      }

      // 2) CORS proxy attempt (also stops cleanly on 400/401/403/404 or valid non-matching JSON)
      let validParsed = null;
      await fetchTextViaCorsProxies(
        endpoint,
        (payload) => {
          const { isJson, servers } = parseCandidateServers(payload);
          if (servers) {
            validParsed = servers;
            return true;
          }
          return isJson ? 'stop' : false;
        },
        5000
      );
      if (validParsed) return validParsed;
    }

    return null;
  }

  async function fetchManiaPlanetData() {
    const btnRefresh = document.getElementById('btn-refresh');
    const statusText = document.getElementById('status-text');
    if (btnRefresh) {
      btnRefresh.disabled = true;
      const labelSpan = btnRefresh.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Refreshing...';
    }
    if (statusText) statusText.textContent = 'Fetching Live ManiaPlanet Data...';

    const finishRefresh = () => {
      if (btnRefresh) {
        btnRefresh.disabled = false;
        const labelSpan = btnRefresh.querySelector('span');
        if (labelSpan) labelSpan.textContent = 'Refresh';
      }
    };

    state.apiErrorNote = '';

    // 1. Pure client-side live fetch directly in the browser (WS JSON + public pages via CORS proxies)
    const [wsServers, titlesRes, channelTitle] = await Promise.all([
      tryFetchAnonymousWsServers(),
      tryFetchPublicShootManiaTitles(),
      tryFetchPublicShootManiaChannel()
    ]);

    if (channelTitle) {
      state.liveChannelOverride = channelTitle;
    }

    if (wsServers && wsServers.length > 0) {
      state.dataMode = 'servers';
      state.rawServers = wsServers;
      state.liveTitles = titlesRes;
      state.apiStatus = 'live_api';
      state.apiStatusLabel = 'Live Servers (Browser JS)';
      state.lastUpdated = new Date();
      normalizeServerList(state.rawServers);
      renderAll();
      finishRefresh();
      return;
    }

    if (titlesRes.length > 0) {
      state.dataMode = 'titles';
      state.rawServers = [];
      state.normalizedServers = [];
      state.liveTitles = titlesRes;
      state.apiStatus = 'live_api';
      state.apiStatusLabel = 'Live Titles (Browser JS)';
      state.lastUpdated = new Date();
      renderAll();
      finishRefresh();
      return;
    }

    // 2. Nothing reachable — show honest empty/offline state (zero fabricated data)
    state.liveChannelOverride = channelTitle || null;
    state.dataMode = 'error';
    state.rawServers = [];
    state.normalizedServers = [];
    state.liveTitles = [];
    state.apiStatus = 'fallback';
    state.apiStatusLabel = 'Live Sync Unavailable';
    state.lastUpdated = new Date();
    renderAll();
    finishRefresh();
  }

  function parseShootManiaTitlesHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href*="/titles/"]'));
    const byId = new Map();

    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const idMatch = href.match(/\/titles\/([^/?#]+)/i);
      if (!idMatch) continue;
      const titleId = decodeURIComponent(idMatch[1]).trim();
      if (!titleId || titleId.includes('filters')) continue;

      // Walk up cautiously to the individual card container (stop before enclosing multiple title cards)
      let card = a;
      let blockText = '';
      for (let depth = 0; depth < 6 && card; depth++) {
        const distinctIdsInNode = new Set(
          Array.from(card.querySelectorAll('a[href*="/titles/"]'))
            .map((el) => {
              const m = (el.getAttribute('href') || '').match(/\/titles\/([^/?#]+)/i);
              return m ? decodeURIComponent(m[1]).trim().toLowerCase() : '';
            })
            .filter(Boolean)
        );
        if (distinctIdsInNode.size > 1) break;

        const txt = (card.textContent || '').replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/\d+\s+online\s+players?/i.test(txt)) {
          blockText = txt;
          break;
        }
        card = card.parentElement;
      }
      if (!blockText) continue;

      const countMatch = blockText.match(/(\d+)\s+online\s+players?/i);
      if (!countMatch) continue;

      const onlinePlayers = parseInt(countMatch[1], 10) || 0;

      // Prefer non-empty text anchor inside this card so image-wrapping anchors don't shadow the title name
      let linkText = (a.textContent || '').replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!linkText && card) {
        const siblingTextLink = Array.from(card.querySelectorAll('a[href*="/titles/"]'))
          .map((el) => (el.textContent || '').replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim())
          .find(Boolean);
        if (siblingTextLink) linkText = siblingTextLink;
      }

      const beforeCount = blockText.slice(0, countMatch.index).trim();
      let author = titleId.includes('@') ? titleId.split('@')[1] : 'Community';
      if (linkText && beforeCount.startsWith(linkText)) {
        const rem = beforeCount.slice(linkText.length).trim();
        if (rem) author = rem;
      }

      const key = titleId.toLowerCase();
      const existing = byId.get(key);
      if (!existing || (!existing._hasNamedLink && linkText)) {
        byId.set(key, {
          titleId,
          name: linkText || titleId.split('@')[0],
          author,
          onlinePlayers,
          _hasNamedLink: Boolean(linkText)
        });
      }
    }

    return Array.from(byId.values());
  }

  /**
   * Fetches real live ShootMania title packs and online player counts from
   * https://www.maniaplanet.com/titles?filters%5B0%5D=shootmania&orderBy=onlinePlayers (pages 1 & 2)
   * purely via browser JavaScript.
   */
  async function tryFetchPublicShootManiaTitles() {
    const pages = [1, 2];
    const htmlResults = await Promise.all(
      pages.map((p) =>
        fetchHtmlViaCorsProxies(
          `https://www.maniaplanet.com/titles?filters%5B0%5D=shootmania&orderBy=onlinePlayers&page=${p}`,
          'online player'
        )
      )
    );

    const combinedRaw = [];
    for (const html of htmlResults) {
      if (html) {
        combinedRaw.push(...parseShootManiaTitlesHtml(html));
      }
    }

    return normalizeLiveTitles(combinedRaw);
  }

  /**
   * Reads the public ManiaPlanet homepage ("Currently on the Maniaplanet Channels -> Shootmania Live")
   * and ShootMania channel page via CORS proxy to retrieve the currently airing program title.
   */
  async function tryFetchPublicShootManiaChannel() {
    const homeHtml = await fetchHtmlViaCorsProxies('https://maniaplanet.com/', 'Shootmania Live', 6500);
    if (homeHtml) {
      const doc = new DOMParser().parseFromString(homeHtml, 'text/html');
      const bodyText = (doc.body && doc.body.textContent) ? doc.body.textContent : homeHtml.replace(/<[^>]+>/g, ' ');
      const normalized = bodyText.replace(/\s+/g, ' ');

      const match = normalized.match(/Shootmania\s+Live\s+LIVE\s+(.+?)(?=\s+S\d+\s*E\d+|\s+Trackmania\s+Live|\s+Popular\s+Titles|$)/i);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned) return cleaned;
      }
    }

    const chHtml = await fetchHtmlViaCorsProxies('https://www.maniaplanet.com/channels/shootmania', 'Shootmania', 6500);
    if (chHtml) {
      const doc = new DOMParser().parseFromString(chHtml, 'text/html');
      const bodyText = (doc.body && doc.body.textContent) ? doc.body.textContent : chHtml.replace(/<[^>]+>/g, ' ');
      const normalized = bodyText.replace(/\s+/g, ' ');
      const match = normalized.match(/LIVE\s+(.+?)(?=\s+S\d+\s*E\d+|\s+Schedule|\s+Programs|$)/i);
      if (match && match[1]) {
        const cleaned = match[1].replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned && cleaned.length < 80) return cleaned;
      }
    }

    return null;
  }

  /* ==========================================================================
     8. UI RENDERING FUNCTIONS
     ========================================================================== */
  function formatServerOrPlayerName(clean, coloredHtml, raw) {
    if (state.nameFormat === 'colored') return coloredHtml;
    if (state.nameFormat === 'raw') return `<span class="mono">${ManiaText.escapeHtml(raw)}</span>`;
    return ManiaText.escapeHtml(clean);
  }

  function getCategoryBadgeClass(cat) {
    switch (cat) {
      case 'elite': return 'mode-elite';
      case 'royal': return 'mode-royal';
      case 'siege': return 'mode-siege';
      case 'channel': return 'mode-channel';
      case 'obstacle': return 'mode-obstacle';
      default: return '';
    }
  }

  function renderHeaderStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;

    dot.className = 'status-dot';
    if (state.apiStatus === 'live_proxy') {
      dot.classList.add('status-proxy');
    } else if (state.apiStatus === 'fallback') {
      dot.classList.add('status-fallback');
    }
    const timeStr = state.lastUpdated
      ? state.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '';
    text.textContent = timeStr ? `${state.apiStatusLabel} • ${timeStr}` : state.apiStatusLabel;
  }

  function renderSummaryKPIs() {
    const totalPlayersEl = document.getElementById('kpi-total-players');
    const totalSpecsEl = document.getElementById('kpi-total-specs');
    const serversTitleEl = document.getElementById('kpi-servers-title');
    const onlineServersEl = document.getElementById('kpi-online-servers');
    const serversSubEl = document.getElementById('kpi-servers-sub');
    const topModeEl = document.getElementById('kpi-top-mode');
    const topModeSubEl = document.getElementById('kpi-top-mode-sub');

    if (state.dataMode === 'servers') {
      const servers = state.normalizedServers;
      const activeServers = servers.filter((s) => s.playerCount > 0);
      const totalPlayers = servers.reduce((acc, s) => acc + s.playerCount, 0);
      const totalSpecs = servers.reduce((acc, s) => acc + s.spectatorCount, 0);

      const modeCounts = {};
      for (const s of servers) {
        modeCounts[s.cleanGamemode] = (modeCounts[s.cleanGamemode] || 0) + s.playerCount;
      }
      let topMode = '—';
      let topModePlayers = 0;
      for (const [m, count] of Object.entries(modeCounts)) {
        if (count > topModePlayers) {
          topMode = m;
          topModePlayers = count;
        }
      }

      if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
      if (totalSpecsEl) {
        totalSpecsEl.textContent = totalSpecs > 0 ? `+ ${totalSpecs} spectators watching` : 'From live server list';
      }
      if (serversTitleEl) serversTitleEl.innerHTML = '<span>Online Servers</span>';
      if (onlineServersEl) onlineServersEl.textContent = `${activeServers.length} / ${servers.length}`;
      if (serversSubEl) serversSubEl.textContent = `${activeServers.length} populated, ${servers.length} ShootMania`;
      if (topModeEl) topModeEl.textContent = topMode;
      if (topModeSubEl) topModeSubEl.textContent = topModePlayers > 0 ? `${topModePlayers} players in mode` : 'No active players';
    } else if (state.dataMode === 'titles') {
      const titles = state.liveTitles;
      const activeTitles = titles.filter((t) => t.onlinePlayers > 0);
      const totalPlayers = titles.reduce((acc, t) => acc + t.onlinePlayers, 0);

      let topTitle = '—';
      let topCount = 0;
      for (const t of titles) {
        if (t.onlinePlayers > topCount) {
          topTitle = t.cleanName;
          topCount = t.onlinePlayers;
        }
      }

      if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
      if (totalSpecsEl) totalSpecsEl.textContent = 'Live across ShootMania title packs';
      if (serversTitleEl) serversTitleEl.innerHTML = '<span>Active Title Packs</span>';
      if (onlineServersEl) onlineServersEl.textContent = `${activeTitles.length} / ${titles.length}`;
      if (serversSubEl) serversSubEl.textContent = `${activeTitles.length} with players on maniaplanet.com`;
      if (topModeEl) topModeEl.textContent = topTitle;
      if (topModeSubEl) {
        topModeSubEl.textContent = topCount > 0 ? `${topCount} online players` : '0 online players right now';
      }
    } else {
      if (totalPlayersEl) totalPlayersEl.textContent = '—';
      if (totalSpecsEl) {
        totalSpecsEl.textContent = state.dataMode === 'error' ? 'Live sync unavailable' : 'Fetching live ManiaPlanet counts';
      }
      if (serversTitleEl) serversTitleEl.innerHTML = '<span>Active Servers</span>';
      if (onlineServersEl) onlineServersEl.textContent = '—';
      if (serversSubEl) serversSubEl.textContent = 'Storm environment only';
      if (topModeEl) topModeEl.textContent = '—';
      if (topModeSubEl) topModeSubEl.textContent = 'Waiting for live data';
    }

    const rot = getChannelRotationState();
    const timerEl = document.getElementById('kpi-channel-timer');
    const subEl = document.getElementById('kpi-channel-sub');
    if (timerEl) timerEl.textContent = rot.countdownFormatted;
    if (subEl) subEl.textContent = `Schedule ref: ${rot.nextSlot.title}`;
  }

  function renderChannelSpotlight() {
    const rot = getChannelRotationState();
    const channelSrv = state.normalizedServers.find((s) => s.isChannel) || null;
    const liveTitle = state.liveChannelOverride || null;

    const matchedSlot = liveTitle
      ? HOURLY_CHANNEL_PROGRAMS.find((slot) =>
          slot.title.toLowerCase() === liveTitle.toLowerCase() ||
          liveTitle.toLowerCase().includes(slot.title.toLowerCase()) ||
          slot.title.toLowerCase().includes(liveTitle.toLowerCase())
        )
      : null;

    const programTitle = channelSrv
      ? channelSrv.cleanName
      : liveTitle || rot.currentSlot.title;

    const refSlot = matchedSlot || rot.currentSlot;
    const refTitleParsed = ShootManiaParser.parseTitle(channelSrv ? channelSrv.rawTitle : refSlot.rawTitleId);
    const cleanMode = channelSrv
      ? channelSrv.cleanGamemode
      : liveTitle && !matchedSlot
        ? ManiaText.strip(liveTitle)
        : ShootManiaParser.parseGamemode(refSlot.rawScript, refTitleParsed);

    document.getElementById('channel-program-name').textContent = programTitle;
    document.getElementById('channel-clean-mode').textContent = cleanMode;
    document.getElementById('channel-clean-title').textContent =
      channelSrv || matchedSlot || !liveTitle
        ? `Title Pack: ${refTitleParsed.cleanName}`
        : 'Source: ManiaPlanet Channels';

    const scriptEl = document.getElementById('channel-raw-api-script');
    if (scriptEl) {
      scriptEl.textContent = channelSrv
        ? `API Script: ${channelSrv.rawScript}`
        : matchedSlot
          ? `Script Ref: ${refSlot.rawScript}`
          : liveTitle
            ? 'Live from maniaplanet.com'
            : 'Reference UTC Slot';
    }

    document.getElementById('channel-author').textContent = channelSrv
      ? `By ${channelSrv.programAuthor || refTitleParsed.author}`
      : liveTitle
        ? (matchedSlot ? `Host: ${matchedSlot.author} • Synced live` : 'Synced live from maniaplanet.com')
        : 'Schedule reference only';

    const mapEl = document.getElementById('channel-map');
    const mapSep = document.getElementById('channel-map-sep');
    if (mapEl && mapSep) {
      if (channelSrv && channelSrv.mapClean) {
        mapEl.textContent = `Map: ${channelSrv.mapClean}`;
        mapEl.style.display = 'inline';
        mapSep.style.display = 'inline';
      } else {
        mapEl.textContent = '';
        mapEl.style.display = 'none';
        mapSep.style.display = 'none';
      }
    }

    document.getElementById('channel-players-val').textContent = channelSrv
      ? `${channelSrv.playerCount} / ${channelSrv.playerMax}`
      : '—';
    document.getElementById('channel-window-utc').textContent = rot.windowUtc;
    document.getElementById('channel-countdown').textContent = rot.countdownFormatted;
    document.getElementById('channel-progress-bar').style.width = `${rot.progressPct.toFixed(1)}%`;

    const nextModeClean = ShootManiaParser.parseGamemode(
      rot.nextSlot.rawScript,
      ShootManiaParser.parseTitle(rot.nextSlot.rawTitleId)
    );
    document.getElementById('channel-next-program').textContent =
      rot.nextSlot.title.toLowerCase() === nextModeClean.toLowerCase()
        ? rot.nextSlot.title
        : `${rot.nextSlot.title} — ${nextModeClean}`;

    const joinBtn = document.getElementById('channel-join-btn');
    if (joinBtn) {
      joinBtn.setAttribute(
        'href',
        channelSrv ? channelSrv.joinUrl : `maniaplanet://#qjoin=${encodeURIComponent(refSlot.rawTitleId)}`
      );
      joinBtn.textContent = channelSrv ? 'Join Channel Server' : 'Launch in ShootMania';
    }

    // Update 24h schedule grid if present
    const gridEl = document.getElementById('channel-schedule-grid');
    if (gridEl) {
      let html = '';
      for (const slot of HOURLY_CHANNEL_PROGRAMS) {
        const isCurrent = slot.hourUtc === rot.utcHour;
        const parsedTitle = ShootManiaParser.parseTitle(slot.rawTitleId);
        const slotMode = ShootManiaParser.parseGamemode(slot.rawScript, parsedTitle);
        const hStart = String(slot.hourUtc).padStart(2, '0') + ':00';
        const hEnd = String((slot.hourUtc + 1) % 24).padStart(2, '0') + ':00';
        html += `
          <div class="schedule-slot ${isCurrent ? 'active-slot' : ''}">
            <span class="slot-time">${hStart} – ${hEnd} UTC ${isCurrent ? '• WINDOW' : ''}</span>
            <span class="slot-name">${ManiaText.escapeHtml(slot.title)}</span>
            <span class="server-raw-sub">${ManiaText.escapeHtml(slotMode)} • ${ManiaText.escapeHtml(parsedTitle.cleanName)}</span>
          </div>
        `;
      }
      gridEl.innerHTML = html;
    }
  }

  function getFilteredAndSortedServers() {
    const q = state.searchQuery.toLowerCase().trim();
    const filtered = state.normalizedServers.filter((srv) => {
      if (state.hideEmpty && srv.playerCount === 0) return false;
      if (state.categoryFilter !== 'all') {
        if (state.categoryFilter === 'channel' && !srv.isChannel) return false;
        if (state.categoryFilter !== 'channel' && srv.category !== state.categoryFilter) return false;
      }
      if (!q) return true;
      return (
        srv.cleanName.toLowerCase().includes(q) ||
        srv.cleanGamemode.toLowerCase().includes(q) ||
        srv.cleanTitle.toLowerCase().includes(q) ||
        srv.rawTitle.toLowerCase().includes(q) ||
        srv.rawScript.toLowerCase().includes(q) ||
        srv.login.toLowerCase().includes(q) ||
        srv.mapClean.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (state.sortBy === 'players_desc') {
        if (a.isChannel !== b.isChannel) return a.isChannel ? -1 : 1;
        if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'players_asc') {
        if (a.playerCount !== b.playerCount) return a.playerCount - b.playerCount;
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'name_asc') {
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'mode_asc') {
        return a.cleanGamemode.localeCompare(b.cleanGamemode);
      }
      return 0;
    });

    return filtered;
  }

  function getFilteredAndSortedTitles() {
    const q = state.searchQuery.toLowerCase().trim();
    const filtered = state.liveTitles.filter((t) => {
      if (state.hideEmpty && t.onlinePlayers === 0) return false;
      if (state.categoryFilter !== 'all' && state.categoryFilter !== 'channel') {
        if (t.category !== state.categoryFilter) return false;
      } else if (state.categoryFilter === 'channel') {
        return false;
      }
      if (!q) return true;
      return (
        t.cleanName.toLowerCase().includes(q) ||
        t.titleId.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      if (state.sortBy === 'players_desc') {
        if (b.onlinePlayers !== a.onlinePlayers) return b.onlinePlayers - a.onlinePlayers;
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'players_asc') {
        if (a.onlinePlayers !== b.onlinePlayers) return a.onlinePlayers - b.onlinePlayers;
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'name_asc') {
        return a.cleanName.localeCompare(b.cleanName);
      }
      if (state.sortBy === 'mode_asc') {
        return a.category.localeCompare(b.category) || a.cleanName.localeCompare(b.cleanName);
      }
      return 0;
    });

    return filtered;
  }

  function renderServersTable() {
    const tbody = document.getElementById('servers-tbody');
    const thead = document.getElementById('servers-thead');
    const noticeEl = document.getElementById('servers-notice');
    const tabLabelEl = document.getElementById('tab-label-servers');
    const countBadge = document.getElementById('tab-count-servers');
    if (!tbody) return;

    // Case 1: Live dedicated server list from /webservices/servers/online
    if (state.dataMode === 'servers') {
      if (tabLabelEl) tabLabelEl.textContent = 'Online Servers';
      if (noticeEl) noticeEl.innerHTML = '';
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Server Name</th>
            <th>Gamemode</th>
            <th>Title Pack</th>
            <th>Zone</th>
            <th>Players</th>
            <th style="text-align:right;">Action</th>
          </tr>
        `;
      }

      const filtered = getFilteredAndSortedServers();
      if (countBadge) countBadge.textContent = filtered.length;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">
              No ShootMania servers match your current filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      for (const srv of filtered) {
        const pct = Math.min(100, Math.round((srv.playerCount / srv.playerMax) * 100));
        const displayName = formatServerOrPlayerName(srv.cleanName, srv.coloredNameHtml, srv.rawName);
        const badgeClass = getCategoryBadgeClass(srv.category);

        html += `
          <tr class="${srv.isChannel ? 'is-channel-row' : ''}">
            <td>
              <div class="server-name-cell">
                <div class="server-title-line">
                  ${srv.isChannel ? '<span class="live-indicator" style="font-size:0.65rem;padding:0.1rem 0.45rem;">CHANNEL</span>' : ''}
                  ${srv.isPrivate ? '<span class="next-pill" title="Password Protected">Private</span>' : ''}
                  <span>${displayName}</span>
                </div>
                <div class="server-raw-sub">
                  login: ${ManiaText.escapeHtml(srv.login)}${srv.mapClean ? ` • map: ${ManiaText.escapeHtml(srv.mapClean)}` : ''}
                </div>
              </div>
            </td>
            <td>
              <span class="mode-badge ${badgeClass}">${ManiaText.escapeHtml(srv.cleanGamemode)}</span>
              <span class="title-pack-sub mono" title="Raw API script_name">${ManiaText.escapeHtml(srv.rawScript)}</span>
            </td>
            <td>
              <span style="font-weight:600;">${ManiaText.escapeHtml(srv.cleanTitle)}</span>
              <span class="title-pack-sub mono" title="Raw API titleId">${ManiaText.escapeHtml(srv.rawTitle)}</span>
            </td>
            <td>
              <span style="font-size:0.8rem;color:var(--text-secondary);">${ManiaText.escapeHtml(srv.zone)}</span>
            </td>
            <td>
              <div class="player-count-wrap">
                <div class="player-count-nums">
                  <span class="player-active-num ${srv.playerCount > 0 ? 'has-players' : ''}">${srv.playerCount}</span>
                  <span class="player-max-num">/ ${srv.playerMax}${srv.spectatorCount > 0 ? ` +${srv.spectatorCount} spec` : ''}</span>
                </div>
                <div class="mini-bar">
                  <div class="mini-bar-fill ${srv.isChannel ? 'fill-channel' : ''}" style="width:${pct}%"></div>
                </div>
              </div>
            </td>
            <td style="text-align:right;">
              <a href="${ManiaText.escapeHtml(srv.joinUrl)}" class="btn btn-sm ${srv.isChannel ? 'btn-primary' : ''}" title="Launch in ManiaPlanet">
                Join
              </a>
            </td>
          </tr>
        `;
      }

      tbody.innerHTML = html;
      return;
    }

    // Case 2: Live ShootMania Title Packs player counts from maniaplanet.com
    if (state.dataMode === 'titles') {
      if (tabLabelEl) tabLabelEl.textContent = 'Live ShootMania Titles';
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div class="notice-banner">
            <strong>Live ShootMania Title Pack Counts (from maniaplanet.com)</strong>
            <span>
              Showing real live ShootMania online player counts per Title Pack fetched from <code>maniaplanet.com</code>.
            </span>
          </div>
        `;
      }
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>ShootMania Title Pack</th>
            <th>Mode / Category</th>
            <th>Author</th>
            <th>Title ID</th>
            <th>Online Players</th>
            <th style="text-align:right;">Action</th>
          </tr>
        `;
      }

      const filtered = getFilteredAndSortedTitles();
      if (countBadge) countBadge.textContent = filtered.length;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">
              No ShootMania title packs match your current filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      const maxPlayers = Math.max(1, ...filtered.map((t) => t.onlinePlayers));
      let html = '';
      for (const t of filtered) {
        const displayName = formatServerOrPlayerName(t.cleanName, t.coloredNameHtml, t.rawName);
        const badgeClass = getCategoryBadgeClass(t.category);
        const pct = Math.min(100, Math.round((t.onlinePlayers / maxPlayers) * 100));
        const catLabel = t.category.charAt(0).toUpperCase() + t.category.slice(1);

        html += `
          <tr>
            <td>
              <div class="server-name-cell">
                <div class="server-title-line">
                  <span>${displayName}</span>
                </div>
                <div class="server-raw-sub">
                  <a href="${ManiaText.escapeHtml(t.webUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">
                    maniaplanet.com/titles/${ManiaText.escapeHtml(t.titleId)}
                  </a>
                </div>
              </div>
            </td>
            <td>
              <span class="mode-badge ${badgeClass}">${ManiaText.escapeHtml(catLabel)}</span>
            </td>
            <td>
              <span style="font-size:0.84rem;color:var(--text-secondary);">${ManiaText.escapeHtml(t.author)}</span>
            </td>
            <td>
              <span class="mono" style="font-size:0.78rem;color:var(--text-muted);">${ManiaText.escapeHtml(t.titleId)}</span>
            </td>
            <td>
              <div class="player-count-wrap">
                <div class="player-count-nums">
                  <span class="player-active-num ${t.onlinePlayers > 0 ? 'has-players' : ''}">${t.onlinePlayers}</span>
                  <span class="player-max-num">online</span>
                </div>
                <div class="mini-bar">
                  <div class="mini-bar-fill" style="width:${pct}%"></div>
                </div>
              </div>
            </td>
            <td style="text-align:right;">
              <a href="${ManiaText.escapeHtml(t.joinUrl)}" class="btn btn-sm" title="Launch Title Pack in ManiaPlanet">
                Launch
              </a>
            </td>
          </tr>
        `;
      }

      tbody.innerHTML = html;
      return;
    }

    // Case 3: Loading or Offline/Error (zero fake entries)
    if (tabLabelEl) tabLabelEl.textContent = 'Live Activity';
    if (countBadge) countBadge.textContent = '0';

    if (noticeEl) {
      noticeEl.innerHTML = state.dataMode === 'error'
        ? `
          <div class="notice-banner notice-warning">
            <strong>Unable to reach live ManiaPlanet data</strong>
            <span>
              Could not reach <code>prod.live.maniaplanet.com</code> or <code>maniaplanet.com</code> right now (a browser extension, adblocker, or network policy may be blocking the request).
              Click <strong>Refresh</strong> to retry.
            </span>
          </div>
        `
        : '';
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          ${state.dataMode === 'error'
            ? 'No live ShootMania data loaded. Click Refresh to retry.'
            : 'Syncing live ShootMania data from ManiaPlanet...'}
        </td>
      </tr>
    `;
  }

  function renderNameDictionaryView() {
    const titleListEl = document.getElementById('dict-titles-list');
    const scriptListEl = document.getElementById('dict-scripts-list');
    if (!titleListEl || !scriptListEl) return;

    let titlesHtml = '';
    for (const [rawKey, info] of Object.entries(TITLE_MAP)) {
      if (rawKey === 'smstorm') continue;
      titlesHtml += `
        <div class="mapping-item">
          <span class="mapping-raw">${ManiaText.escapeHtml(rawKey)}</span>
          <span class="mapping-clean">→ ${ManiaText.escapeHtml(info.name)} <span style="font-weight:400;color:var(--text-muted);font-size:0.74rem;">• ${ManiaText.escapeHtml(info.author)}</span></span>
        </div>
      `;
    }
    titleListEl.innerHTML = titlesHtml;

    const sampleScripts = [
      'ShootMania\\Elite\\ElitePro.Script.txt',
      'ShootMania\\Elite\\Elite.Script.txt',
      'ShootMania\\Royal\\Royal.Script.txt',
      'ShootMania\\Royal\\SmurfsRoyal.Script.txt',
      'ShootMania\\Siege\\Siege.Script.txt',
      'ShootMania\\Siege\\SiegeAddition.Script.txt',
      'Modes\\ShootMania\\Obstacle.Script.txt',
      'Modes\\ShootMania\\TimeAttack.Script.txt',
      'Modes\\ShootMania\\SpeedBall.Script.txt',
      'ShootMania\\Battle\\Battle.Script.txt',
      'ShootMania\\Battle\\BattleWaves.Script.txt',
      'ShootMania\\Joust\\Joust.Script.txt',
      'ShootMania\\Combo\\Combo.Script.txt',
      'Modes\\ShootMania\\Infection.Script.txt',
      'Modes\\ShootMania\\Dodgeball.Script.txt',
      'Modes\\ShootMania\\FlagRun.Script.txt',
      'Modes\\ShootMania\\CTF.Script.txt',
      'Modes\\ShootMania\\Assault.Script.txt',
      'Modes\\ShootMania\\CardMelee.Script.txt',
      'Modes\\ShootMania\\Laser.Script.txt',
      'ShootMania\\Lobby\\KingOfTheLobby.Script.txt'
    ];

    let scriptsHtml = '';
    for (const rawScript of sampleScripts) {
      const isObs = rawScript.includes('TimeAttack');
      const clean = ShootManiaParser.parseGamemode(rawScript, isObs ? { category: 'obstacle' } : null);
      scriptsHtml += `
        <div class="mapping-item">
          <span class="mapping-raw">${ManiaText.escapeHtml(rawScript)}</span>
          <span class="mapping-clean">→ ${ManiaText.escapeHtml(clean)}</span>
        </div>
      `;
    }
    scriptListEl.innerHTML = scriptsHtml;
  }

  function renderAll() {
    renderHeaderStatus();
    renderSummaryKPIs();
    renderChannelSpotlight();
    renderServersTable();
  }

  /* ==========================================================================
     9. THEME & INTERACTIVE EVENT BINDINGS
     ========================================================================== */
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sm_theme', theme);

    const label = document.getElementById('theme-toggle-label');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    if (iconSun && iconMoon) {
      iconSun.style.display = theme === 'dark' ? 'inline-block' : 'none';
      iconMoon.style.display = theme === 'dark' ? 'none' : 'inline-block';
    }

    // Re-render colored ManiaPlanet text if in colored mode so contrast adapts
    if (state.rawServers.length > 0) {
      normalizeServerList(state.rawServers);
      renderServersTable();
    } else if (state.liveTitles.length > 0) {
      renderServersTable();
    }
  }

  function initEvents() {
    // Theme toggle
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    // Refresh button
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        fetchManiaPlanetData();
      });
    }

    // Schedule drawer toggle
    const btnSchedule = document.getElementById('btn-toggle-schedule');
    const drawer = document.getElementById('channel-schedule-drawer');
    if (btnSchedule && drawer) {
      btnSchedule.addEventListener('click', () => {
        state.scheduleDrawerOpen = !state.scheduleDrawerOpen;
        drawer.classList.toggle('open', state.scheduleDrawerOpen);
        btnSchedule.textContent = state.scheduleDrawerOpen ? 'Hide 24h Schedule' : '24h Rotation Schedule';
      });
    }

    // Main View Tabs (Live Activity / Name Parser Reference)
    const tabButtons = document.querySelectorAll('.view-tab');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        state.activeTab = target;
        tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.panel-section').forEach((sec) => {
          sec.classList.toggle('active', sec.id === `panel-${target}`);
        });
      });
    });

    // Search input
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderServersTable();
      });
    }

    // Category filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderServersTable();
      });
    }

    // Sort selector
    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderServersTable();
      });
    }

    // Name formatting selector (Clean / Colored / Raw)
    const fmtSelect = document.getElementById('filter-name-format');
    if (fmtSelect) {
      fmtSelect.addEventListener('change', (e) => {
        state.nameFormat = e.target.value;
        renderServersTable();
      });
    }

    // Hide empty toggle
    const hideEmptyCheckbox = document.getElementById('filter-hide-empty');
    if (hideEmptyCheckbox) {
      hideEmptyCheckbox.addEventListener('change', (e) => {
        state.hideEmpty = e.target.checked;
        renderServersTable();
      });
    }

    // Interactive Live String Tester inside Dictionary tab
    const testerInput = document.getElementById('live-parser-input');
    const testerTitleInput = document.getElementById('live-parser-title');
    const testerScriptInput = document.getElementById('live-parser-script');
    const runTester = () => {
      const rawStr = testerInput ? testerInput.value : '';
      const rawTitle = testerTitleInput ? testerTitleInput.value : '';
      const rawScript = testerScriptInput ? testerScriptInput.value : '';

      const cleanStrEl = document.getElementById('tester-out-clean');
      const coloredStrEl = document.getElementById('tester-out-colored');
      const modeOutEl = document.getElementById('tester-out-mode');

      if (cleanStrEl) cleanStrEl.textContent = ManiaText.prettifyServerName(rawStr);
      if (coloredStrEl) coloredStrEl.innerHTML = ManiaText.toHtml(rawStr);
      if (modeOutEl) {
        const pt = ShootManiaParser.parseTitle(rawTitle);
        const gm = ShootManiaParser.parseGamemode(rawScript, pt);
        modeOutEl.textContent = `${gm} — Title: ${pt.cleanName} • ${pt.author}`;
      }
    };
    if (testerInput) testerInput.addEventListener('input', runTester);
    if (testerTitleInput) testerTitleInput.addEventListener('input', runTester);
    if (testerScriptInput) testerScriptInput.addEventListener('input', runTester);
    runTester();
  }

  /* ==========================================================================
     10. INITIALIZATION & 1-SECOND CHANNEL ROTATION TICKER
     ========================================================================== */
  function init() {
    applyTheme(state.theme);
    renderNameDictionaryView();
    initEvents();

    // Render clean loading state (zero fake data), then fetch live data immediately
    renderAll();
    fetchManiaPlanetData();

    // Periodic background refresh (60s)
    setInterval(() => {
      fetchManiaPlanetData();
    }, AUTO_REFRESH_SEC * 1000);

    // 1-second ticker for the hourly ShootMania Live Channel countdown & UTC slot refresh
    let lastUtcHour = new Date().getUTCHours();
    setInterval(() => {
      const now = new Date();
      const currentHour = now.getUTCHours();

      if (currentHour !== lastUtcHour) {
        lastUtcHour = currentHour;
        fetchManiaPlanetData();
      }

      const rot = getChannelRotationState(now);
      const timerKpi = document.getElementById('kpi-channel-timer');
      const countdownEl = document.getElementById('channel-countdown');
      const progressBar = document.getElementById('channel-progress-bar');

      if (timerKpi) timerKpi.textContent = rot.countdownFormatted;
      if (countdownEl) countdownEl.textContent = rot.countdownFormatted;
      if (progressBar) progressBar.style.width = `${rot.progressPct.toFixed(1)}%`;
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
