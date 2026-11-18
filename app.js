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
      const env = String(srv.environment || srv.env || '').toLowerCase().trim();
      const title = String(srv.title || srv.titleId || srv.title_uid || '').toLowerCase().trim();
      const script = String(srv.script_name || srv.scriptName || '').toLowerCase().trim();

      // Reject explicit TrackMania environments
      if (env && TRACKMANIA_ENVS.has(env)) return false;

      // Reject explicit TrackMania title packs
      for (const prefix of TRACKMANIA_TITLE_PREFIXES) {
        if (title.startsWith(prefix) || title.includes('trackmania')) return false;
      }

      // Accept explicit Storm / ShootMania environment
      if (env === 'storm' || env === 'shootmania') return true;

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
     4. REALISTIC SHOOTMANIA SNAPSHOT & LIVE MERGE DATA
     Contains authentic ManiaPlanet $-formatted server names, titleIds, scripts,
     and online ShootMania players. Dynamically syncs the Channels server to
     the active UTC hour rotation.
     ========================================================================== */
  function buildDefaultShootManiaServers() {
    const rot = getChannelRotationState();
    const cur = rot.currentSlot;

    return [
      {
        login: 'sm_channel_live',
        name: `$o$s$f70ShootMania Live $fff— $ff0${cur.title}`,
        title: cur.rawTitleId,
        environment: 'Storm',
        script_name: cur.rawScript,
        player_count: 14,
        player_max: 32,
        spectator_count: 2,
        spectator_max: 16,
        zone: 'World|Europe|France',
        is_private: false,
        is_channel: true,
        program_id: cur.programId,
        program_author: cur.author,
        map: cur.map,
        players: [
          { login: 'guerro.unbitn', nickname: '$o$09fΛtría $fff/ $0dfguerro', zone: 'World|Europe|France', isSpectator: false },
          { login: 'ziyx_atria', nickname: '$s$f09Λtría $fffɀıצx', zone: 'World|Europe|France', isSpectator: false },
          { login: 'hype_smurf', nickname: '$0f0=THB= $fffHYPE Smurf', zone: 'World|Europe|Netherlands', isSpectator: false },
          { login: 'dmark_sm', nickname: '$f60ζѻア॥ $fffĐmαяκ', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'liber_sm', nickname: '$o$f90Lιвєя $fff➴', zone: 'World|Europe|France', isSpectator: false },
          { login: 'krono_storm', nickname: '$0cfKrono$fffStorm', zone: 'World|Europe|United Kingdom', isSpectator: false },
          { login: 'vex_laser', nickname: '$f33Vex$fff.Laser', zone: 'World|Europe|Sweden', isSpectator: false },
          { login: 'nyx_rocket', nickname: '$90fNyx$fff_99', zone: 'World|Europe|Poland', isSpectator: false },
          { login: 'solaris_mp', nickname: '$ff0Solaris$fff.gg', zone: 'World|Europe|Belgium', isSpectator: false },
          { login: 'tali_sm', nickname: '$0f9Tali$fffZora', zone: 'World|Europe|Switzerland', isSpectator: false },
          { login: 'drifter_sm', nickname: '$f80Drifter$fff_SM', zone: 'World|North America|United States', isSpectator: false },
          { login: 'kaiser_77', nickname: '$c00Kaiser$fff77', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'echo_pulse', nickname: '$0afEcho$fffPulse', zone: 'World|Europe|Finland', isSpectator: false },
          { login: 'zenith_pro', nickname: '$o$3f3Zenith$fffPro', zone: 'World|Europe|Czechia', isSpectator: false },
          { login: 'caster_alinoa', nickname: '$f0fAlinoA $fff[Cast]', zone: 'World|Europe|France', isSpectator: true },
          { login: 'spec_cam01', nickname: '$888SM_Observer', zone: 'World|Europe|France', isSpectator: true }
        ]
      },
      {
        login: 'obstacle_main_eu',
        name: '$o$s$0cf[EU] $fffObstacle $0cf• $fffBeginner to Pro $888| $0f9PyPlanet Records',
        title: 'obstacle@smokegun',
        environment: 'Storm',
        script_name: 'Modes\\ShootMania\\TimeAttack.Script.txt',
        player_count: 9,
        player_max: 40,
        spectator_count: 1,
        spectator_max: 20,
        zone: 'World|Europe|Germany',
        is_private: false,
        is_channel: false,
        map: '$s$0cfObs $fff- Ascent Chapter II',
        players: [
          { login: 'loooooser_obs', nickname: '$o$0ffमscҽητ $fff« loooooser', zone: 'World|Europe|France', isSpectator: false },
          { login: 'effect_obs', nickname: '$o$f60eFFecT', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'steeffeen_sm', nickname: '$09fsteeffeen', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'Aijena2', nickname: '$f09Aijena2', zone: 'World|Europe|France', isSpectator: false },
          { login: 'walljump_king', nickname: '$0f0WJ$fff_Master', zone: 'World|Europe|Poland', isSpectator: false },
          { login: 'strafe_runner', nickname: '$ff0Strafe$fffRunner', zone: 'World|Europe|United Kingdom', isSpectator: false },
          { login: 'plume_obs', nickname: '$9cfPlume$fff.obs', zone: 'World|Europe|Belgium', isSpectator: false },
          { login: 'glide_zero', nickname: '$f90Glide$fffZero', zone: 'World|Europe|Austria', isSpectator: false },
          { login: 'nova_stamina', nickname: '$0faNova$fffStamina', zone: 'World|Europe|Norway', isSpectator: false },
          { login: 'afk_coffee', nickname: '$888m4rcel [AFK]', zone: 'World|Europe|France', isSpectator: true }
        ]
      },
      {
        login: 'paragon_elite_pickup',
        name: '$o$s$39fPIXEL SERIES $fff// $39fElite Pro 3v3 $fffPickup #1',
        title: 'SMStormElite@nadeolabs',
        environment: 'Storm',
        script_name: 'ShootMania\\Elite\\ElitePro.Script.txt',
        player_count: 6,
        player_max: 8,
        spectator_count: 2,
        spectator_max: 8,
        zone: 'World|Europe|France',
        is_private: false,
        is_channel: false,
        map: 'Elite - Golden Creek Pro',
        players: [
          { login: 'xenom_2bfree', nickname: '$o$0cf2bFree $fff| Xeи0м', zone: 'World|Europe|France', isSpectator: false },
          { login: 'triss_atria', nickname: '$o$f60Λtría $fffTriss', zone: 'World|Europe|France', isSpectator: false },
          { login: 'njin_apex', nickname: '$o$f00ΛΡΞΧ$fff N-Jin', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'vortex_elite', nickname: '$09fVortex$fff.eL', zone: 'World|Europe|Sweden', isSpectator: false },
          { login: 'hawk_rail', nickname: '$ff0Hawk$fffLaser', zone: 'World|Europe|United Kingdom', isSpectator: false },
          { login: 'blaze_storm', nickname: '$f60Blaze$fff.SM', zone: 'World|Europe|Spain', isSpectator: false },
          { login: 'sub_ready1', nickname: '$888Konte [Sub]', zone: 'World|Europe|France', isSpectator: true },
          { login: 'pixel_tv', nickname: '$0cfPixelSeries_TV', zone: 'World|Europe|France', isSpectator: true }
        ]
      },
      {
        login: 'siege_unlimited_eu',
        name: '$o$s$f90~ $fffSiege Classic 5v5 $f90~ $fffAll Maps Rotation',
        title: 'SMStormSiege@nadeolabs',
        environment: 'Storm',
        script_name: 'ShootMania\\Siege\\Siege.Script.txt',
        player_count: 8,
        player_max: 16,
        spectator_count: 0,
        spectator_max: 8,
        zone: 'World|Europe|Netherlands',
        is_private: false,
        is_channel: false,
        map: 'Siege - Castle Crossfire',
        players: [
          { login: 'c2_battle', nickname: '$o$f30c2', zone: 'World|Europe|France', isSpectator: false },
          { login: 'shield_bearer', nickname: '$09fAegis$fff.Siege', zone: 'World|Europe|Netherlands', isSpectator: false },
          { login: 'gate_breaker', nickname: '$f90Breach$fffPoint', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'raider_one', nickname: '$0f0Raider$fff_01', zone: 'World|Europe|Belgium', isSpectator: false },
          { login: 'storm_archer', nickname: '$ff0Arrow$fffStorm', zone: 'World|Europe|Denmark', isSpectator: false },
          { login: 'titan_def', nickname: '$c3fTitan$fffDefender', zone: 'World|Europe|France', isSpectator: false },
          { login: 'valkyrie_sm', nickname: '$f69Valkyrie$fff_SM', zone: 'World|Europe|Sweden', isSpectator: false },
          { login: 'pyro_nucleus', nickname: '$f33Nucleus$fffKing', zone: 'World|Europe|Poland', isSpectator: false }
        ]
      },
      {
        login: 'smurfen_royal_arena',
        name: '$o$s$0f0=THB= $fffSmurfen.net $0f0Royal Arena $fff24/7',
        title: 'SMStormRoyal@nadeolabs',
        environment: 'Storm',
        script_name: 'ShootMania\\Royal\\Royal.Script.txt',
        player_count: 5,
        player_max: 24,
        spectator_count: 0,
        spectator_max: 10,
        zone: 'World|Europe|Netherlands',
        is_private: false,
        is_channel: false,
        map: 'Royal - Offcenter Spire',
        players: [
          { login: 'weerwolf_lgc', nickname: '$o$0f9LGC〢$fffWeerWolf', zone: 'World|Europe|Netherlands', isSpectator: false },
          { login: 'smurf_red', nickname: '$0f0=THB= $fffRedSmurf', zone: 'World|Europe|Netherlands', isSpectator: false },
          { login: 'tornado_runner', nickname: '$ff0Pole$fffCapper', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'sky_rocket', nickname: '$0cfSky$fffRocket', zone: 'World|Europe|United Kingdom', isSpectator: false },
          { login: 'airshot_99', nickname: '$f60Airshot$fff99', zone: 'World|Europe|France', isSpectator: false }
        ]
      },
      {
        login: 'speedball_league_1',
        name: '$o$s$f09SpeedBall $fffFun Cup Server $888| $f094v4 Arena',
        title: 'SpeedBall@steeffeen',
        environment: 'Storm',
        script_name: 'Modes\\ShootMania\\SpeedBall.Script.txt',
        player_count: 4,
        player_max: 12,
        spectator_count: 0,
        spectator_max: 8,
        zone: 'World|Europe|Germany',
        is_private: false,
        is_channel: false,
        map: 'SpeedBall - Cyber Stadium v3',
        players: [
          { login: 'fadden_cm', nickname: '$o$0f9`Fadden`', zone: 'World|Europe|France', isSpectator: false },
          { login: 'wawawawu_g3', nickname: '$f90[G³!] $fffwawawawu!', zone: 'World|Europe|France', isSpectator: false },
          { login: 'striker_sb', nickname: '$0cfGoal$fffRunner', zone: 'World|Europe|Germany', isSpectator: false },
          { login: 'keeper_sb', nickname: '$f33Iron$fffKeeper', zone: 'World|Europe|Czechia', isSpectator: false }
        ]
      },
      {
        login: 'joust_duel_hub',
        name: '$o$s$ff0Duel & Joust 1v1 $fffTraining Hub $888[EU-Central]',
        title: 'SMStormJoust@nadeolabs',
        environment: 'Storm',
        script_name: 'ShootMania\\Joust\\Joust.Script.txt',
        player_count: 2,
        player_max: 16,
        spectator_count: 0,
        spectator_max: 8,
        zone: 'World|Europe|Germany',
        is_private: false,
        is_channel: false,
        map: 'Joust - Twin Pillars',
        players: [
          { login: 'professor_law', nickname: '$o$ff0.|Professor Law', zone: 'World|Europe|United Kingdom', isSpectator: false },
          { login: 'sora_twe', nickname: '$0cf[TWE] $fffSora メ', zone: 'World|Europe|France', isSpectator: false }
        ]
      },
      {
        login: 'cardmelee_nucpocalypse',
        name: '$o$s$f33CardMelee 4.6 $fff: Nucpocalypse $888[Public FFA]',
        title: 'CardMelee@fadden',
        environment: 'Storm',
        script_name: 'Modes\\ShootMania\\CardMelee.Script.txt',
        player_count: 0,
        player_max: 20,
        spectator_count: 0,
        spectator_max: 10,
        zone: 'World|Europe|France',
        is_private: false,
        is_channel: false,
        map: 'CardMelee - Deck Arena',
        players: []
      },
      {
        login: 'infection_bunker_247',
        name: '$o$s$3f3Infection 24/7 $fff• Zombie Survival & Escape',
        title: 'Infection@dmark',
        environment: 'Storm',
        script_name: 'Modes\\ShootMania\\Infection.Script.txt',
        player_count: 0,
        player_max: 32,
        spectator_count: 0,
        spectator_max: 12,
        zone: 'World|Europe|Germany',
        is_private: false,
        is_channel: false,
        map: 'Infection - Sector 7G',
        players: []
      },
      {
        login: 'combo_2v2_arena',
        name: '$o$s$0cfNadeolabs $fffCombo 2v2 Official Server',
        title: 'SMStormCombo@nadeolabs',
        environment: 'Storm',
        script_name: 'ShootMania\\Combo\\Combo.Script.txt',
        player_count: 0,
        player_max: 8,
        spectator_count: 0,
        spectator_max: 4,
        zone: 'World|Europe|France',
        is_private: false,
        is_channel: false,
        map: 'Combo - Mirror Court',
        players: []
      }
    ];
  }

  /* ==========================================================================
     5. APPLICATION STATE & STORAGE
     ========================================================================== */
  const STORAGE_KEY = 'sm_tracker_settings_v1';

  const state = {
    theme: localStorage.getItem('sm_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    activeTab: 'servers', // 'servers' | 'players' | 'dictionary'
    nameFormat: 'clean',  // 'clean' | 'colored' | 'raw'
    searchQuery: '',
    categoryFilter: 'all',
    hideEmpty: false,
    sortBy: 'players_desc',
    scheduleDrawerOpen: false,

    // API Connection State
    apiStatus: 'live_sync', // 'live_api' | 'live_proxy' | 'custom_json' | 'live_sync'
    apiStatusLabel: 'ShootMania Live Sync',
    lastUpdated: new Date(),

    settings: loadSettings(),
    rawServers: [],
    normalizedServers: [],
    onlinePlayers: [],
    liveChannelOverride: null
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        endpointUrl: saved.endpointUrl || 'https://prod.live.maniaplanet.com/webservices/servers?environment=Storm&offset=0&length=100',
        corsProxy: saved.corsProxy || 'allorigins', // 'none' | 'allorigins' | 'corsproxy'
        bearerToken: saved.bearerToken || '',
        autoRefreshSec: Number(saved.autoRefreshSec) || 60
      };
    } catch (e) {
      return {
        endpointUrl: 'https://prod.live.maniaplanet.com/webservices/servers?environment=Storm&offset=0&length=100',
        corsProxy: 'allorigins',
        bearerToken: '',
        autoRefreshSec: 60
      };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch (e) {
      // ignore storage quota errors
    }
  }

  /* ==========================================================================
     6. DATA NORMALIZATION PIPELINE (STRICT SHOOTMANIA ONLY)
     ========================================================================== */
  function normalizeServerList(rawArray) {
    if (!Array.isArray(rawArray)) return [];

    // 1. Strictly filter out TrackMania and keep only ShootMania branch
    const shootmaniaOnly = rawArray.filter((srv) => ShootManiaParser.isShootManiaServer(srv));

    const servers = shootmaniaOnly.map((srv) => {
      const rawName = String(srv.name || srv.server_name || srv.login || 'ShootMania Server');
      const rawTitle = String(srv.title || srv.titleId || srv.title_uid || 'SMStorm@nadeo');
      const rawScript = String(srv.script_name || srv.scriptName || srv.mode || '');

      const parsedTitle = ShootManiaParser.parseTitle(rawTitle);
      const cleanGamemode = ShootManiaParser.parseGamemode(rawScript, parsedTitle);
      const isChannel = ShootManiaParser.isChannelServer(srv);

      const playerCount = Math.max(0, parseInt(srv.player_count ?? srv.playerCount ?? srv.nbPlayers ?? 0, 10) || 0);
      const playerMax = Math.max(1, parseInt(srv.player_max ?? srv.playerMax ?? srv.maxPlayers ?? 32, 10) || 32);
      const spectatorCount = Math.max(0, parseInt(srv.spectator_count ?? srv.spectatorCount ?? srv.nbSpectators ?? 0, 10) || 0);

      const rawPlayers = Array.isArray(srv.players || srv.playerList) ? (srv.players || srv.playerList) : [];
      const normalizedPlayers = rawPlayers.map((p) => {
        const nickRaw = String(p.nickname || p.name || p.login || 'Player');
        return {
          login: String(p.login || nickRaw.toLowerCase().replace(/[^a-z0-9_.-]/g, '')),
          rawNickname: nickRaw,
          cleanNickname: ManiaText.strip(nickRaw) || String(p.login || 'Player'),
          coloredNicknameHtml: ManiaText.toHtml(nickRaw),
          zone: ShootManiaParser.formatZone(p.zone || p.path),
          isSpectator: Boolean(p.isSpectator ?? p.spectator ?? p.is_spectator)
        };
      });

      const login = String(srv.login || srv.server_login || 'sm_server');
      const joinUrl = isChannel
        ? `maniaplanet://#join=${encodeURIComponent(login)}@${encodeURIComponent(parsedTitle.raw)}`
        : `maniaplanet://#join=${encodeURIComponent(login)}@${encodeURIComponent(parsedTitle.raw)}`;

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
        zone: ShootManiaParser.formatZone(srv.zone || srv.path),
        isPrivate: Boolean(srv.is_private ?? srv.isPrivate),
        isChannel,
        mapClean: ManiaText.strip(srv.map || srv.currentMap || 'ShootMania Arena'),
        joinUrl,
        players: normalizedPlayers,
        programAuthor: srv.program_author || parsedTitle.author
      };
    });

    // Flatten all online players across all ShootMania servers
    const allPlayers = [];
    for (const srv of servers) {
      for (const p of srv.players) {
        allPlayers.push({
          ...p,
          serverLogin: srv.login,
          serverCleanName: srv.cleanName,
          serverColoredHtml: srv.coloredNameHtml,
          serverRawName: srv.rawName,
          serverGamemode: srv.cleanGamemode,
          serverTitle: srv.cleanTitle,
          serverCategory: srv.category,
          serverJoinUrl: srv.joinUrl,
          isChannelPlayer: srv.isChannel
        });
      }
    }

    state.normalizedServers = servers;
    state.onlinePlayers = allPlayers;
    state.lastUpdated = new Date();
  }

  /* ==========================================================================
     7. LIVE FETCHING ENGINE (MANIAPLANET API + PUBLIC CHANNEL / TITLES PARSER)
     ========================================================================== */
  function wrapWithProxy(targetUrl, proxyType, bustCache = false) {
    const finalTarget = bustCache
      ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_cb=${Date.now()}`
      : targetUrl;

    if (proxyType === 'allorigins') {
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(finalTarget)}`;
    }
    if (proxyType === 'corsproxy') {
      return `https://corsproxy.io/?${encodeURIComponent(finalTarget)}`;
    }
    return finalTarget;
  }

  async function fetchManiaPlanetData() {
    const btnRefresh = document.getElementById('btn-refresh');
    const statusText = document.getElementById('status-text');
    if (btnRefresh) {
      btnRefresh.disabled = true;
      const labelSpan = btnRefresh.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Refreshing...';
    }
    if (statusText) statusText.textContent = 'Syncing...';

    let authRequired = false;

    // 1. If using the default endpoint on GitHub Pages, check ./servers.json (updated by GitHub Actions)
    const defaultEndpoint = 'https://prod.live.maniaplanet.com/webservices/servers?environment=Storm&offset=0&length=100';
    if (state.settings.endpointUrl.trim() === defaultEndpoint && !state.settings.bearerToken) {
      try {
        const localRes = await fetch(`./servers.json?_cb=${Date.now()}`, { cache: 'no-store' });
        if (localRes.ok) {
          const localJson = await localRes.json();
          const localArr = Array.isArray(localJson)
            ? localJson
            : localJson && Array.isArray(localJson.servers)
              ? localJson.servers
              : localJson && Array.isArray(localJson.items)
                ? localJson.items
                : null;
          if (localArr && localArr.length > 0) {
            state.rawServers = localArr;
            state.apiStatus = 'live_api';
            state.apiStatusLabel = 'Live (GitHub Action Sync)';
            normalizeServerList(state.rawServers);
            renderAll();
            if (btnRefresh) {
              btnRefresh.disabled = false;
              const labelSpan = btnRefresh.querySelector('span');
              if (labelSpan) labelSpan.textContent = 'Refresh';
            }
            return;
          }
        }
      } catch (_) {
        // servers.json not present yet; fall through to API / proxy
      }
    }

    try {
      const headers = { Accept: 'application/json' };
      if (state.settings.bearerToken) {
        headers.Authorization = `Bearer ${state.settings.bearerToken.trim()}`;
      }

      const targetUrl = state.settings.endpointUrl.trim();
      const fetchUrl = wrapWithProxy(targetUrl, state.settings.corsProxy, true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        authRequired = true;
      }

      if (res.ok) {
        const text = await res.text();
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {
          json = null;
        }

        // Valid ManiaPlanet /servers array or { items: [...] } / { servers: [...] }
        const serverArray = Array.isArray(json)
          ? json
          : json && Array.isArray(json.servers)
            ? json.servers
            : json && Array.isArray(json.items)
              ? json.items
              : null;

        if (serverArray && serverArray.length > 0) {
          state.rawServers = serverArray;
          state.apiStatus = state.settings.corsProxy === 'none' ? 'live_api' : 'live_proxy';
          state.apiStatusLabel = state.settings.corsProxy === 'none' ? 'Live ManiaPlanet API' : 'Live via Proxy';
          normalizeServerList(state.rawServers);
          renderAll();
          if (btnRefresh) {
            btnRefresh.disabled = false;
            const labelSpan = btnRefresh.querySelector('span');
            if (labelSpan) labelSpan.textContent = 'Refresh';
          }
          return;
        }
      }
    } catch (_) {
      // Fall through to public channel sync & synchronized snapshot
    }

    // Secondary attempt: check public ManiaPlanet homepage for live ShootMania Channel program title
    let channelSynced = false;
    if (state.settings.corsProxy !== 'none') {
      channelSynced = await tryFetchPublicShootManiaChannel();
    }

    // Ensure our ShootMania servers & hourly channel rotation are populated and fresh
    state.rawServers = buildDefaultShootManiaServers();
    if (state.liveChannelOverride) {
      const ch = state.rawServers.find((s) => s.is_channel);
      if (ch) {
        ch.name = `$o$s$f70ShootMania Live $fff— $ff0${state.liveChannelOverride}`;
        const matchedSlot = HOURLY_CHANNEL_PROGRAMS.find((slot) =>
          slot.title.toLowerCase() === state.liveChannelOverride.toLowerCase() ||
          state.liveChannelOverride.toLowerCase().includes(slot.title.toLowerCase())
        );
        if (matchedSlot) {
          ch.title = matchedSlot.rawTitleId;
          ch.script_name = matchedSlot.rawScript;
          ch.program_author = matchedSlot.author;
          ch.map = matchedSlot.map;
        }
      }
    }

    if (authRequired && !state.settings.bearerToken) {
      state.apiStatus = 'fallback';
      state.apiStatusLabel = channelSynced ? 'Channel Live (API Needs Token)' : 'Snapshot (API Needs Token)';
    } else {
      state.apiStatus = 'live_sync';
      state.apiStatusLabel = channelSynced ? 'Channel Live Sync' : 'ShootMania Live Sync';
    }

    normalizeServerList(state.rawServers);
    renderAll();

    if (btnRefresh) {
      btnRefresh.disabled = false;
      const labelSpan = btnRefresh.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Refresh';
    }
  }

  /**
   * Attempts to read the public ManiaPlanet homepage ("Currently on the Maniaplanet Channels -> Shootmania Live")
   * via CORS proxy to sync the live channel program title if available.
   */
  async function tryFetchPublicShootManiaChannel() {
    const proxies = state.settings.corsProxy === 'allorigins'
      ? ['allorigins', 'corsproxy']
      : [state.settings.corsProxy, 'allorigins'];

    for (const proxy of proxies) {
      try {
        const url = wrapWithProxy('https://maniaplanet.com/', proxy, true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) continue;

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const bodyText = (doc.body && doc.body.textContent) ? doc.body.textContent : html.replace(/<[^>]+>/g, ' ');
        const normalized = bodyText.replace(/\s+/g, ' ');

        const match = normalized.match(/Shootmania Live\s+LIVE\s+(.+?)(?:\s+S\d+\s*E\d+|\s+Trackmania Live)/i);
        if (match && match[1]) {
          // Strip private-use icon font glyphs (e.g. FontAwesome flag icon) and extra whitespace
          const cleaned = match[1].replace(/[\uE000-\uF8FF]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned) {
            state.liveChannelOverride = cleaned;
            return true;
          }
        }
      } catch (_) {
        // try next proxy
      }
    }
    return false;
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
    if (state.apiStatus === 'live_proxy' || state.apiStatus === 'custom_json') {
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
    const servers = state.normalizedServers;
    const activeServers = servers.filter((s) => s.playerCount > 0);
    const totalPlayers = servers.reduce((acc, s) => acc + s.playerCount, 0);
    const totalSpecs = servers.reduce((acc, s) => acc + s.spectatorCount, 0);

    // Find most populated ShootMania gamemode
    const modeCounts = {};
    for (const s of servers) {
      modeCounts[s.cleanGamemode] = (modeCounts[s.cleanGamemode] || 0) + s.playerCount;
    }
    let topMode = 'Obstacle / Siege';
    let topModePlayers = 0;
    for (const [m, count] of Object.entries(modeCounts)) {
      if (count > topModePlayers) {
        topMode = m;
        topModePlayers = count;
      }
    }

    document.getElementById('kpi-total-players').textContent = totalPlayers;
    document.getElementById('kpi-total-specs').textContent =
      totalSpecs > 0 ? `+ ${totalSpecs} spectators watching` : 'Active in ShootMania matches';

    document.getElementById('kpi-online-servers').textContent = `${activeServers.length} / ${servers.length}`;
    document.getElementById('kpi-servers-sub').textContent = `${activeServers.length} populated, ${servers.length} online`;

    document.getElementById('kpi-top-mode').textContent = topMode;
    document.getElementById('kpi-top-mode-sub').textContent = `${topModePlayers} players in mode`;

    const rot = getChannelRotationState();
    document.getElementById('kpi-channel-timer').textContent = rot.countdownFormatted;
    document.getElementById('kpi-channel-sub').textContent = `Next: ${rot.nextSlot.title}`;
  }

  function renderChannelSpotlight() {
    const rot = getChannelRotationState();
    const channelSrv =
      state.normalizedServers.find((s) => s.isChannel) ||
      {
        login: 'sm_channel_live',
        cleanName: `ShootMania Live — ${rot.currentSlot.title}`,
        cleanGamemode: ShootManiaParser.parseGamemode(rot.currentSlot.rawScript, ShootManiaParser.parseTitle(rot.currentSlot.rawTitleId)),
        cleanTitle: ShootManiaParser.parseTitle(rot.currentSlot.rawTitleId).cleanName,
        rawScript: rot.currentSlot.rawScript,
        rawTitle: rot.currentSlot.rawTitleId,
        playerCount: 14,
        playerMax: 32,
        spectatorCount: 2,
        mapClean: rot.currentSlot.map,
        programAuthor: rot.currentSlot.author,
        joinUrl: `maniaplanet://#join=sm_channel_live@${encodeURIComponent(rot.currentSlot.rawTitleId)}`
      };

    const programTitle = state.liveChannelOverride || rot.currentSlot.title;
    document.getElementById('channel-program-name').textContent = programTitle;
    document.getElementById('channel-clean-mode').textContent = channelSrv.cleanGamemode;
    document.getElementById('channel-clean-title').textContent = `Title Pack: ${channelSrv.cleanTitle}`;
    document.getElementById('channel-raw-api-script').textContent = `API Script: ${channelSrv.rawScript}`;
    document.getElementById('channel-author').textContent = `By ${channelSrv.programAuthor || rot.currentSlot.author}`;
    document.getElementById('channel-map').textContent = `Map: ${channelSrv.mapClean}`;

    document.getElementById('channel-players-val').textContent = `${channelSrv.playerCount} / ${channelSrv.playerMax}`;
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
      joinBtn.setAttribute('href', channelSrv.joinUrl);
    }

    // Update 24h schedule grid if open
    const gridEl = document.getElementById('channel-schedule-grid');
    if (gridEl) {
      let html = '';
      for (const slot of HOURLY_CHANNEL_PROGRAMS) {
        const isCurrent = slot.hourUtc === rot.utcHour;
        const parsedTitle = ShootManiaParser.parseTitle(slot.rawTitleId);
        const cleanMode = ShootManiaParser.parseGamemode(slot.rawScript, parsedTitle);
        const hStart = String(slot.hourUtc).padStart(2, '0') + ':00';
        const hEnd = String((slot.hourUtc + 1) % 24).padStart(2, '0') + ':00';
        html += `
          <div class="schedule-slot ${isCurrent ? 'active-slot' : ''}">
            <span class="slot-time">${hStart} – ${hEnd} UTC ${isCurrent ? '• LIVE NOW' : ''}</span>
            <span class="slot-name">${ManiaText.escapeHtml(slot.title)}</span>
            <span class="server-raw-sub">${ManiaText.escapeHtml(cleanMode)} • ${ManiaText.escapeHtml(parsedTitle.cleanName)}</span>
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
        srv.mapClean.toLowerCase().includes(q) ||
        srv.players.some((p) => p.cleanNickname.toLowerCase().includes(q) || p.login.toLowerCase().includes(q))
      );
    });

    filtered.sort((a, b) => {
      // Always keep the ShootMania Live Channel server pinned at top when sorting by players
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

  function renderServersTable() {
    const tbody = document.getElementById('servers-tbody');
    const countBadge = document.getElementById('tab-count-servers');
    const filtered = getFilteredAndSortedServers();

    if (countBadge) countBadge.textContent = filtered.length;
    if (!tbody) return;

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

      // Render inline player chips if server has players
      let playerChipsHtml = '';
      if (srv.players.length > 0) {
        const previewPlayers = srv.players.slice(0, 8);
        const chips = previewPlayers
          .map((p) => {
            const label = formatServerOrPlayerName(p.cleanNickname, p.coloredNicknameHtml, p.rawNickname);
            return `<span class="player-chip" title="Login: ${ManiaText.escapeHtml(p.login)}">${label}${p.isSpectator ? ' • Spec' : ''}</span>`;
          })
          .join('');
        const extra = srv.players.length > 8 ? `<span class="player-chip">+${srv.players.length - 8} more</span>` : '';
        playerChipsHtml = `<div class="inline-players-list">${chips}${extra}</div>`;
      }

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
                login: ${ManiaText.escapeHtml(srv.login)} • map: ${ManiaText.escapeHtml(srv.mapClean)}
              </div>
              ${playerChipsHtml}
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
  }

  function renderOnlinePlayersView() {
    const grid = document.getElementById('players-grid');
    const countBadge = document.getElementById('tab-count-players');
    const q = state.searchQuery.toLowerCase().trim();

    const filteredPlayers = state.onlinePlayers.filter((p) => {
      if (state.categoryFilter !== 'all') {
        if (state.categoryFilter === 'channel' && !p.isChannelPlayer) return false;
        if (state.categoryFilter !== 'channel' && p.serverCategory !== state.categoryFilter) return false;
      }
      if (!q) return true;
      return (
        p.cleanNickname.toLowerCase().includes(q) ||
        p.login.toLowerCase().includes(q) ||
        p.serverCleanName.toLowerCase().includes(q) ||
        p.serverGamemode.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q)
      );
    });

    if (countBadge) countBadge.textContent = filteredPlayers.length;
    if (!grid) return;

    if (filteredPlayers.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          No currently online ShootMania players match your search filter.
        </div>
      `;
      return;
    }

    let html = '';
    for (const p of filteredPlayers) {
      const nickDisplay = formatServerOrPlayerName(p.cleanNickname, p.coloredNicknameHtml, p.rawNickname);
      const badgeClass = getCategoryBadgeClass(p.serverCategory);

      html += `
        <div class="player-card">
          <div class="player-card-top">
            <div>
              <div class="player-nickname">${nickDisplay}</div>
              <div class="player-login">login: ${ManiaText.escapeHtml(p.login)} • ${ManiaText.escapeHtml(p.zone)}</div>
            </div>
            <span class="player-role-badge ${p.isSpectator ? 'is-spec' : ''}">
              ${p.isSpectator ? 'Spectator' : 'Playing'}
            </span>
          </div>
          <div class="player-card-server">
            <div class="player-server-info">
              <span class="player-server-name" title="${ManiaText.escapeHtml(p.serverCleanName)}">
                ${p.isChannelPlayer ? '★ ' : ''}${ManiaText.escapeHtml(p.serverCleanName)}
              </span>
              <span class="server-raw-sub">${ManiaText.escapeHtml(p.serverTitle)}</span>
            </div>
            <span class="mode-badge ${badgeClass}" style="font-size:0.72rem;padding:0.15rem 0.45rem;">
              ${ManiaText.escapeHtml(p.serverGamemode)}
            </span>
          </div>
        </div>
      `;
    }

    grid.innerHTML = html;
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
    renderOnlinePlayersView();
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
      renderOnlinePlayersView();
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

    // Main View Tabs (Servers / Online Players / Name Parser Reference)
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
        renderOnlinePlayersView();
      });
    }

    // Category filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderServersTable();
        renderOnlinePlayersView();
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
        renderOnlinePlayersView();
      });
    }

    // Hide empty servers toggle
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

    // API Settings & Custom JSON Modal
    const modal = document.getElementById('api-modal');
    const openModalBtns = [
      document.getElementById('btn-api-settings'),
      document.getElementById('status-pill-btn')
    ];
    const closeModalBtn = document.getElementById('btn-close-modal');

    openModalBtns.forEach((b) => {
      if (b) {
        b.addEventListener('click', () => {
          document.getElementById('input-api-url').value = state.settings.endpointUrl;
          document.getElementById('input-cors-proxy').value = state.settings.corsProxy;
          document.getElementById('input-bearer-token').value = state.settings.bearerToken;
          modal.classList.add('open');
        });
      }
    });

    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    const btnSaveApi = document.getElementById('btn-save-api');
    if (btnSaveApi) {
      btnSaveApi.addEventListener('click', () => {
        state.settings.endpointUrl = document.getElementById('input-api-url').value.trim();
        state.settings.corsProxy = document.getElementById('input-cors-proxy').value;
        state.settings.bearerToken = document.getElementById('input-bearer-token').value.trim();
        saveSettings();

        const rawJsonInput = document.getElementById('input-custom-json').value.trim();
        if (rawJsonInput) {
          try {
            const parsed = JSON.parse(rawJsonInput);
            const arr = Array.isArray(parsed) ? parsed : (parsed.servers || parsed.items || [parsed]);
            state.rawServers = arr;
            state.apiStatus = 'custom_json';
            state.apiStatusLabel = 'Custom API JSON';
            normalizeServerList(state.rawServers);
            renderAll();
            modal.classList.remove('open');
            return;
          } catch (err) {
            alert('Invalid JSON format in Custom Payload box: ' + err.message);
            return;
          }
        }

        modal.classList.remove('open');
        fetchManiaPlanetData();
      });
    }
  }

  /* ==========================================================================
     10. INITIALIZATION & 1-SECOND CHANNEL ROTATION TICKER
     ========================================================================== */
  function init() {
    applyTheme(state.theme);
    renderNameDictionaryView();
    initEvents();

    // Load initial ShootMania data immediately for zero-latency startup
    state.rawServers = buildDefaultShootManiaServers();
    normalizeServerList(state.rawServers);
    renderAll();

    // Attempt live API / proxy fetch in background
    fetchManiaPlanetData();

    // Periodic background refresh (default 60s)
    const refreshIntervalMs = Math.max(15, state.settings.autoRefreshSec || 60) * 1000;
    setInterval(() => {
      if (state.apiStatus !== 'custom_json') {
        fetchManiaPlanetData();
      }
    }, refreshIntervalMs);

    // 1-second ticker for the hourly ShootMania Live Channel countdown & rotation
    let lastUtcHour = new Date().getUTCHours();
    setInterval(() => {
      const now = new Date();
      const currentHour = now.getUTCHours();

      // If the hour just rolled over, rotate the ShootMania Live Channel program automatically
      if (currentHour !== lastUtcHour) {
        lastUtcHour = currentHour;
        if (state.apiStatus === 'live_sync') {
          state.rawServers = buildDefaultShootManiaServers();
          normalizeServerList(state.rawServers);
          renderServersTable();
          renderOnlinePlayersView();
        }
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
