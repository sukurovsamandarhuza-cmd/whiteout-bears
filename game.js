(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const SAVE_KEY = "whiteout-bears-save-v1";
  const WEAPON_IDS = ["rifle", "shotgun", "smg", "crossbow"];
  const WEAPON_MAX_LEVEL = 10;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };
  const angleDiff = (a, b) => {
    let d = (b - a + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  };
  const angleLerp = (a, b, t) => a + angleDiff(a, b) * clamp(t, 0, 1);
  const formatNumber = (value) => Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const formatTime = (seconds) => {
    const total = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const hash2 = (x, y, seed = 0) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const WEAPONS = {
    rifle: {
      id: "rifle",
      name: "Винтовка «Полярник»",
      shortName: "Полярник",
      type: "УНИВЕРСАЛЬНАЯ",
      description: "Надёжный ствол для любой дистанции. Точный, быстрый, без сюрпризов.",
      color: "#8bdcff",
      icon: "rifle",
      unlockCost: 0,
      upgradeBase: 90,
      damage: 18,
      fireRate: 2.65,
      bulletSpeed: 860,
      range: 610,
      spread: 0.022,
      count: 1,
      pierce: 0,
      bulletColor: "#ffd36b",
      recoil: 1.6,
    },
    shotgun: {
      id: "shotgun",
      name: "Дробовик «Буран»",
      shortName: "Буран",
      type: "БЛИЖНИЙ БОЙ",
      description: "Шесть картечин в упор. Разрывает стаю, пока она не разорвала тебя.",
      color: "#ffbd6b",
      icon: "shotgun",
      unlockCost: 320,
      upgradeBase: 120,
      damage: 11,
      fireRate: 1.2,
      bulletSpeed: 760,
      range: 390,
      spread: 0.36,
      count: 6,
      pierce: 0,
      bulletColor: "#ffc15c",
      recoil: 6,
    },
    smg: {
      id: "smg",
      name: "Автомат «Стужа»",
      shortName: "Стужа",
      type: "СКОРОСТРЕЛЬНАЯ",
      description: "Шквал свинца для тех, кто любит держать медведей на расстоянии.",
      color: "#8affc8",
      icon: "smg",
      unlockCost: 780,
      upgradeBase: 150,
      damage: 7.5,
      fireRate: 8.2,
      bulletSpeed: 930,
      range: 485,
      spread: 0.085,
      count: 1,
      pierce: 0,
      bulletColor: "#a4ffd3",
      recoil: 0.8,
    },
    crossbow: {
      id: "crossbow",
      name: "Арбалет «Клык»",
      shortName: "Клык",
      type: "СНАЙПЕРСКАЯ",
      description: "Тяжёлый болт прошивает сразу нескольких зверей. Требует холодной головы.",
      color: "#c8a9ff",
      icon: "crossbow",
      unlockCost: 1250,
      upgradeBase: 170,
      damage: 54,
      fireRate: 0.95,
      bulletSpeed: 1160,
      range: 750,
      spread: 0.006,
      count: 1,
      pierce: 2,
      bulletColor: "#d8c2ff",
      recoil: 3.8,
    },
  };

  const SKILLS = {
    vitality: {
      id: "vitality",
      name: "Крепкое здоровье",
      icon: "heart",
      color: "#ff8a84",
      baseCost: 110,
      max: 10,
      format: (level) => `+${level * 12} к максимуму здоровья`,
      empty: "Без бонуса к здоровью",
    },
    power: {
      id: "power",
      name: "Боевой азарт",
      icon: "fist",
      color: "#ffbe62",
      baseCost: 130,
      max: 8,
      format: (level) => `+${level * 4}% ко всему урону`,
      empty: "Без бонуса к урону",
    },
    speed: {
      id: "speed",
      name: "Снегоступы",
      icon: "boot",
      color: "#8af2a2",
      baseCost: 120,
      max: 8,
      format: (level) => `+${(level * 2.5).toFixed(1)}% к скорости`,
      empty: "Без бонуса к скорости",
    },
    magnet: {
      id: "magnet",
      name: "Чутьё охотника",
      icon: "magnet",
      color: "#7fdcff",
      baseCost: 90,
      max: 6,
      format: (level) => `+${level * 13}% к радиусу сбора`,
      empty: "Без бонуса к сбору",
    },
    armor: {
      id: "armor",
      name: "Меховая броня",
      icon: "shield",
      color: "#bba6ff",
      baseCost: 140,
      max: 8,
      format: (level) => `-${level * 4}% входящего урона`,
      empty: "Без защиты от урона",
    },
  };

  const RUN_UPGRADES = [
    {
      id: "damage",
      name: "Каленый ствол",
      icon: "damage",
      rarity: "common",
      max: 6,
      desc: "+22% урона",
      apply: (run) => {
        run.stats.damageMult *= 1.22;
      },
    },
    {
      id: "firerate",
      name: "Быстрый затвор",
      icon: "rate",
      rarity: "common",
      max: 6,
      desc: "+14% скорости стрельбы",
      apply: (run) => {
        run.stats.fireRateMult *= 1.14;
      },
    },
    {
      id: "projectile",
      name: "Веер картечи",
      icon: "projectiles",
      rarity: "epic",
      max: 3,
      desc: "+1 снаряд за выстрел",
      apply: (run) => {
        run.stats.extraProjectiles += 1;
      },
    },
    {
      id: "pierce",
      name: "Бронебойные пули",
      icon: "pierce",
      rarity: "rare",
      max: 4,
      desc: "+1 пробитие на выстрел",
      apply: (run) => {
        run.stats.extraPierce += 1;
      },
    },
    {
      id: "crit",
      name: "Холодный расчёт",
      icon: "crit",
      rarity: "rare",
      max: 5,
      desc: "+9% шанс крита",
      apply: (run) => {
        run.stats.critChance = Math.min(0.68, run.stats.critChance + 0.09);
      },
    },
    {
      id: "vitality",
      name: "Закалка",
      icon: "heart",
      rarity: "common",
      max: 5,
      desc: "+22 к максимуму здоровья",
      apply: (run) => {
        run.stats.maxHp += 22;
        run.hp = Math.min(run.stats.maxHp, run.hp + 22);
      },
    },
    {
      id: "speed",
      name: "Снегоступы",
      icon: "boot",
      rarity: "common",
      max: 5,
      desc: "+9% скорости движения",
      apply: (run) => {
        run.stats.speedMult *= 1.09;
      },
    },
    {
      id: "magnet",
      name: "Чутьё",
      icon: "magnet",
      rarity: "common",
      max: 4,
      desc: "+35% радиус сбора",
      apply: (run) => {
        run.stats.magnetMult *= 1.35;
      },
    },
    {
      id: "regen",
      name: "Тёплая кровь",
      icon: "regen",
      rarity: "rare",
      max: 4,
      desc: "+0.7 здоровья в секунду",
      apply: (run) => {
        run.stats.regen += 0.7;
      },
    },
    {
      id: "frost",
      name: "Ледяные пули",
      icon: "frost",
      rarity: "epic",
      max: 2,
      desc: "Пули замедляют медведей",
      apply: (run) => {
        if (run.stats.slowFactor >= 1) {
          run.stats.slowFactor = 0.7;
        } else {
          run.stats.slowFactor = Math.max(0.45, run.stats.slowFactor - 0.15);
        }
        run.stats.slowDuration = 1.6 + run.upgrades.frost * 0.25;
      },
    },
    {
      id: "dash",
      name: "Скольжение",
      icon: "dash",
      rarity: "rare",
      max: 3,
      desc: "-18% перезарядка рывка",
      apply: (run) => {
        run.stats.dashCooldown = Math.max(3.3, run.stats.dashCooldown * 0.82);
        run.dashCooldown = Math.min(run.dashCooldown, run.stats.dashCooldown);
      },
    },
    {
      id: "bomb",
      name: "Воронёный заряд",
      icon: "bomb",
      rarity: "rare",
      max: 3,
      desc: "-18% перезарядка взрыва",
      apply: (run) => {
        run.stats.bombCooldown = Math.max(8.5, run.stats.bombCooldown * 0.82);
        run.bombCooldown = Math.min(run.bombCooldown, run.stats.bombCooldown);
      },
    },
    {
      id: "armor",
      name: "Снежная закалка",
      icon: "armor",
      rarity: "rare",
      max: 4,
      desc: "-8% входящего урона",
      apply: (run) => {
        run.stats.damageTaken = Math.max(0.4, run.stats.damageTaken * 0.92);
      },
    },
  ];

  const RARITY_LABELS = {
    common: "ОБЫЧНОЕ",
    rare: "РЕДКОЕ",
    epic: "ЭПИЧЕСКОЕ",
  };

  const ICONS = {
    rifle: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 38.5 12 32h13l4-4h16v5h13l3 4-15 2-4 7h-6l2-7H25l-4 8h-7l3-8-8-2Z" fill="currentColor"/><path d="M44 34.5h13M27 34h9M35 27v5" fill="none" stroke="#0b2232" stroke-width="2"/><path d="M9 36h8" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/></svg>',
    shotgun: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M4 39l7-6h12l4-3h17v4h15l2 4-13 2-4 7h-7l2-7H24l-3 8h-7l2-8H9l-4 4H2l2-5Z" fill="currentColor"/><path d="M22 33h26M43 37h15" fill="none" stroke="#0b2232" stroke-width="2"/><path d="M26 33v-3M30 33v-3" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/></svg>',
    smg: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 30h27l6 5h15v5H44l-4 7h-8l2-7H26l2 9h-7l-4-11-7-2 1-6Z" fill="currentColor"/><path d="M33 35v9M44 35h15" fill="none" stroke="#0b2232" stroke-width="2"/><path d="M18 33h9M50 37h8" stroke="rgba(255,255,255,.5)" stroke-width="1.4"/></svg>',
    crossbow: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M27 20c9-6 21-6 30 0M27 20l15 12 15-12M42 32v21M35 53h14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 36h26m0 0-5-5m5 5-5 5M7 36v8m0-8V28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M54 51c2 1 3 2 4 4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.7" stroke-linecap="round"/></svg>',
    damage: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l5 10-5 14-5-14 5-10Z" fill="currentColor"/><path d="M7 8l3 4M25 8l-3 4M6 17l4 1M26 17l-4 1M10 25l3-3M22 25l-3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    rate: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 2 6 18h9l-2 12 13-17h-9l1-11Z" fill="currentColor"/></svg>',
    projectiles: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 5v22M14 5v22M23 5v22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m9 10-4 4 4 4M18 10l-4 4 4 4M27 10l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pierce: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16h22m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 7c3 1 5 4 5 9s-2 8-5 9M14 8c2 1 3 4 3 8s-1 7-3 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>',
    crit: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="2.5" fill="currentColor"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27S5 21 5 13.2C5 8.8 8 6 11.8 6c2.2 0 3.8 1.1 4.2 2.8C16.4 7.1 18 6 20.2 6 24 6 27 8.8 27 13.2 27 21 16 27 16 27Z" fill="currentColor"/><path d="M16 12v7M12.5 15.5h7" fill="none" stroke="#0b2232" stroke-width="2" stroke-linecap="round"/></svg>',
    boot: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h8v11c0 3 2 4 5 5l5 2c2 1 2 4 0 4H8c-2 0-3-1-3-3V8c0-2 1-3 3-3Z" fill="currentColor"/><path d="M5 23h20" fill="none" stroke="#0b2232" stroke-width="2"/><path d="M18 2v7M23 4l-3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    magnet: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 5v12a10 10 0 0 0 20 0V5h-7v12a3 3 0 0 1-6 0V5H6Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M6 10h7M19 10h7" stroke="currentColor" stroke-width="3"/><path d="M7 19c1 5 3 8 6 10" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1.3" stroke-linecap="round"/></svg>',
    regen: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 26S6 20.5 6 13.5C6 9.4 8.8 7 12.3 7c1.9 0 3.2.9 3.7 2.1C16.5 7.9 17.8 7 19.7 7 23.2 7 26 9.4 26 13.5 26 20.5 16 26 16 26Z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 16h4l2-4 3 8 2-4h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    frost: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3v26M5 9l22 14M27 9 5 23M16 7l-3-3M16 7l3-3M16 25l-3 3M16 25l3 3M7 13 3 14M7 13l1-4M25 19l4-1M25 19l-1 4M25 13l4 1M25 13l-1-4M7 19l-4 1M7 19l1 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    dash: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 9h16M2 16h19M7 23h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="m21 5 7 11-7 11V16h-5l5-5V5Z" fill="currentColor"/></svg>',
    bomb: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="15" cy="19" r="8" fill="currentColor"/><path d="M20 11c1-3 4-4 6-2M22 8l-2-4M25 10l4-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    armor: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.5 11.5-11 14C9.5 26.5 5 22 5 15V7l11-4Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 8v15M11 12h10M11 17h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".7"/></svg>',
    fist: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 14V9c0-1.5 2-1.5 2 0v4h1V6c0-1.7 2-1.7 2 0v7h1V4c0-1.7 2-1.7 2 0v9h1V7c0-1.6 2-1.6 2 0v9h1v-4c0-1.5 2-1.5 2 0v6c0 5-3 9-8 9h-1c-3 0-5-1.5-6-4l-2-6c-.6-2 1.8-2.7 2.4-.8L8 19v-5Z" fill="currentColor"/><path d="M11 23h9" stroke="#0b2232" stroke-width="1.5" stroke-linecap="round"/></svg>',
    shield: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v8c0 7-4.5 11.5-11 14C9.5 26.5 5 22 5 15V7l11-4Z" fill="currentColor"/><path d="M16 8v15M11 12h10M11 17h10" fill="none" stroke="#0b2232" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  function makeDefaultSave() {
    return {
      version: 1,
      coins: 300,
      bestTime: 0,
      bestWave: 0,
      totalKills: 0,
      selectedWeapon: "rifle",
      weapons: {
        rifle: { unlocked: true, level: 1 },
        shotgun: { unlocked: false, level: 1 },
        smg: { unlocked: false, level: 1 },
        crossbow: { unlocked: false, level: 1 },
      },
      skills: {
        vitality: 0,
        power: 0,
        speed: 0,
        magnet: 0,
        armor: 0,
      },
      sound: true,
      vibration: true,
      seenTutorial: false,
    };
  }

  function loadSave() {
    const fallback = makeDefaultSave();
    try {
      const raw = JSON.parse(window.localStorage.getItem(SAVE_KEY) || "null");
      if (!raw || typeof raw !== "object") return fallback;
      const merged = { ...fallback, ...raw };
      merged.coins = Math.max(0, Math.floor(Number(raw.coins) || 0));
      merged.bestTime = Math.max(0, Number(raw.bestTime) || 0);
      merged.bestWave = Math.max(0, Math.floor(Number(raw.bestWave) || 0));
      merged.totalKills = Math.max(0, Math.floor(Number(raw.totalKills) || 0));
      merged.sound = raw.sound !== false;
      merged.vibration = raw.vibration !== false;
      merged.seenTutorial = raw.seenTutorial === true;
      merged.weapons = {};
      for (const id of WEAPON_IDS) {
        const savedWeapon = raw.weapons && raw.weapons[id];
        merged.weapons[id] = {
          unlocked: Boolean((savedWeapon && savedWeapon.unlocked) || fallback.weapons[id].unlocked),
          level: clamp(Math.round(Number(savedWeapon && savedWeapon.level) || 1), 1, WEAPON_MAX_LEVEL),
        };
      }
      merged.skills = {};
      for (const id of Object.keys(SKILLS)) {
        const value = raw.skills && raw.skills[id];
        merged.skills[id] = clamp(Math.round(Number(value) || 0), 0, SKILLS[id].max);
      }
      if (!WEAPONS[raw.selectedWeapon] || !merged.weapons[raw.selectedWeapon].unlocked) {
        merged.selectedWeapon = "rifle";
      } else {
        merged.selectedWeapon = raw.selectedWeapon;
      }
      return merged;
    } catch (error) {
      return fallback;
    }
  }

  let save = loadSave();

  const state = {
    screen: "menu",
    panelReturn: "menu",
    armoryTab: "weapons",
    gameMode: "idle",
    installPrompt: null,
    isStandalone: false,
    hudTick: 0,
    lastFrame: 0,
    menuTime: 0,
    lastShotSound: 0,
    bannerTimer: null,
    tutorialShown: false,
    currentUpgrades: [],
  };

  const view = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    zoom: 1,
    w: window.innerWidth,
    h: window.innerHeight,
  };

  let game = null;
  let camera = { x: 0, y: 0, shake: 0 };
  let snow = [];
  let windPhase = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const dom = {
    canvas: $("#gameCanvas"),
    damageVignette: $("#damageVignette"),
    hud: $("#hud"),
    playerLevelBadge: $("#playerLevelBadge"),
    hpFill: $("#hpFill"),
    hpLagFill: $("#hpLagFill"),
    hpText: $("#hpText"),
    xpFill: $("#xpFill"),
    runCoins: $("#runCoins"),
    pauseButton: $("#pauseButton"),
    runTime: $("#runTime"),
    waveValue: $("#waveValue"),
    killValue: $("#killValue"),
    bossHud: $("#bossHud"),
    bossName: $("#bossName"),
    bossHpText: $("#bossHpText"),
    bossFill: $("#bossFill"),
    waveBanner: $("#waveBanner"),
    joystick: $("#joystick"),
    joystickKnob: $("#joystickKnob"),
    bombButton: $("#bombButton"),
    dashButton: $("#dashButton"),
    bombCdText: $("#bombCdText"),
    dashCdText: $("#dashCdText"),
    menuScreen: $("#menuScreen"),
    menuCoins: $("#menuCoins"),
    menuCoinsButton: $("#menuCoinsButton"),
    settingsButton: $("#settingsButton"),
    bestTime: $("#bestTime"),
    playButton: $("#playButton"),
    armoryButton: $("#armoryButton"),
    guideButton: $("#guideButton"),
    installButton: $("#installButton"),
    armoryScreen: $("#armoryScreen"),
    armoryBackButton: $("#armoryBackButton"),
    armoryContent: $("#armoryContent"),
    weaponsTab: $("#weaponsTab"),
    skillsTab: $("#skillsTab"),
    armoryCoins: $$(".armory-coins"),
    guideScreen: $("#guideScreen"),
    guideBackButton: $("#guideBackButton"),
    guideDoneButton: $("#guideDoneButton"),
    settingsScreen: $("#settingsScreen"),
    settingsBackButton: $("#settingsBackButton"),
    soundToggle: $("#soundToggle"),
    vibrationToggle: $("#vibrationToggle"),
    installSettingsButton: $("#installSettingsButton"),
    installHelp: $("#installHelp"),
    resetButton: $("#resetButton"),
    pauseOverlay: $("#pauseOverlay"),
    pauseResumeButton: $("#pauseResumeButton"),
    pauseSoundButton: $("#pauseSoundButton"),
    pauseQuitButton: $("#pauseQuitButton"),
    levelupOverlay: $("#levelupOverlay"),
    levelupLevel: $("#levelupLevel"),
    upgradeCards: $("#upgradeCards"),
    gameoverOverlay: $("#gameoverOverlay"),
    gameoverKicker: $("#gameoverKicker"),
    gameoverTitle: $("#gameoverTitle"),
    gameoverSubtitle: $("#gameoverSubtitle"),
    newRecordRibbon: $("#newRecordRibbon"),
    resultTime: $("#resultTime"),
    resultWave: $("#resultWave"),
    resultKills: $("#resultKills"),
    resultBosses: $("#resultBosses"),
    rewardCoins: $("#rewardCoins"),
    retryButton: $("#retryButton"),
    gameoverArmoryButton: $("#gameoverArmoryButton"),
    gameoverMenuButton: $("#gameoverMenuButton"),
    confirmOverlay: $("#confirmOverlay"),
    confirmCancelButton: $("#confirmCancelButton"),
    confirmResetButton: $("#confirmResetButton"),
    toastStack: $("#toastStack"),
  };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.ambientStarted = false;
      this.enabled = save.sound;
      this.lastShot = 0;
      this.lastHit = 0;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.5 : 0;
        this.master.connect(this.ctx.destination);
        this.buildNoise();
        this.startAmbience();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    buildNoise() {
      if (!this.ctx) return;
      const length = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      this.noiseBuffer = buffer;
    }

    startAmbience() {
      if (!this.ctx || !this.noiseBuffer || this.ambientStarted) return;
      this.ambientStarted = true;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 0.45;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.15;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      try {
        source.start();
      } catch (error) {
        this.ambientStarted = false;
      }
    }

    setEnabled(enabled) {
      this.enabled = enabled;
      if (enabled) this.ensure();
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(enabled ? 0.5 : 0, this.ctx.currentTime, 0.04);
      }
    }

    unlock() {
      this.ensure();
    }

    tone(freq, endFreq, duration, type, volume, delay) {
      if (!this.ctx || !this.master) return;
      const start = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(Math.max(20, freq), start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq || freq), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    noise(duration, volume, frequency, type, delay) {
      if (!this.ctx || !this.master || !this.noiseBuffer) return;
      const start = this.ctx.currentTime + (delay || 0);
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type || "lowpass";
      filter.frequency.setValueAtTime(frequency || 800, start);
      filter.Q.value = 0.65;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(start);
      source.stop(start + duration + 0.03);
    }

    click() {
      if (!this.enabled || !this.ctx) return;
      this.tone(520, 360, 0.055, "triangle", 0.025);
    }

    shoot(weaponId) {
      if (!this.enabled || !this.ensure()) return;
      const now = this.ctx.currentTime;
      if (now - this.lastShot < 0.038) return;
      this.lastShot = now;
      if (weaponId === "shotgun") {
        this.noise(0.12, 0.05, 760);
        this.tone(120, 46, 0.13, "triangle", 0.035);
      } else if (weaponId === "smg") {
        this.noise(0.028, 0.018, 1800, "bandpass");
        this.tone(250, 105, 0.035, "square", 0.011);
      } else if (weaponId === "crossbow") {
        this.noise(0.065, 0.03, 2300, "highpass");
        this.tone(560, 160, 0.08, "triangle", 0.022);
      } else {
        this.noise(0.055, 0.033, 1400, "bandpass");
        this.tone(190, 70, 0.075, "triangle", 0.026);
      }
    }

    hit() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (now - this.lastHit < 0.055) return;
      this.lastHit = now;
      this.noise(0.022, 0.014, 2600, "highpass");
      this.tone(140, 90, 0.03, "triangle", 0.009);
    }

    kill() {
      if (!this.enabled || !this.ctx) return;
      this.noise(0.09, 0.025, 440);
      this.tone(95, 52, 0.1, "sawtooth", 0.012);
    }

    hurt() {
      if (!this.enabled || !this.ensure()) return;
      this.noise(0.16, 0.055, 540);
      this.tone(130, 54, 0.22, "sawtooth", 0.045);
    }

    dash() {
      if (!this.enabled || !this.ensure()) return;
      this.noise(0.2, 0.038, 1500, "bandpass");
      this.tone(360, 780, 0.15, "sine", 0.018);
    }

    explosion() {
      if (!this.enabled || !this.ensure()) return;
      this.noise(0.5, 0.11, 420);
      this.tone(82, 28, 0.48, "sine", 0.09);
      this.tone(180, 65, 0.2, "triangle", 0.035, 0.02);
    }

    levelUp() {
      if (!this.enabled || !this.ensure()) return;
      this.tone(523, 523, 0.18, "triangle", 0.04);
      this.tone(659, 659, 0.22, "triangle", 0.04, 0.09);
      this.tone(880, 880, 0.35, "triangle", 0.035, 0.18);
    }

    boss() {
      if (!this.enabled || !this.ensure()) return;
      this.tone(52, 32, 0.8, "sawtooth", 0.05);
      this.noise(0.7, 0.045, 300);
    }

    pickup() {
      if (!this.enabled || !this.ctx) return;
      this.tone(720, 980, 0.08, "sine", 0.018);
    }

    heal() {
      if (!this.enabled || !this.ensure()) return;
      this.tone(520, 620, 0.13, "sine", 0.03);
      this.tone(780, 900, 0.18, "sine", 0.025, 0.1);
    }

    coin() {
      if (!this.enabled || !this.ctx) return;
      this.tone(880, 1180, 0.08, "triangle", 0.018);
    }

    denied() {
      if (!this.enabled || !this.ctx) return;
      this.tone(210, 165, 0.1, "square", 0.016);
    }
  }

  const audio = new AudioEngine();

  function persist() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
      return false;
    }
    return true;
  }

  function vibrate(pattern) {
    if (!save.vibration || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      return;
    }
  }

  function getWeaponStats(weaponId) {
    const base = WEAPONS[weaponId];
    const weaponSave = save.weapons[weaponId];
    const level = weaponSave ? weaponSave.level : 1;
    const upgradeTier = level - 1;
    return {
      ...base,
      level,
      damage: base.damage * (1 + upgradeTier * 0.16),
      fireRate: base.fireRate * (1 + upgradeTier * 0.034),
      range: base.range + upgradeTier * 11,
      pierce: base.pierce + (level >= 7 ? 1 : 0),
    };
  }

  function weaponUpgradeCost(weaponId) {
    const base = WEAPONS[weaponId];
    const level = save.weapons[weaponId].level;
    if (level >= WEAPON_MAX_LEVEL) return 0;
    return Math.round((base.upgradeBase * level * (1 + (level - 1) * 0.2)) / 5) * 5;
  }

  function skillUpgradeCost(skillId) {
    const skill = SKILLS[skillId];
    const level = save.skills[skillId];
    if (level >= skill.max) return 0;
    return Math.round((skill.baseCost * Math.pow(level + 1, 1.22)) / 5) * 5;
  }

  function getMetaStats() {
    return {
      maxHp: 100 + save.skills.vitality * 12,
      damageMult: 1 + save.skills.power * 0.04,
      speedMult: 1 + save.skills.speed * 0.025,
      magnetMult: 1 + save.skills.magnet * 0.13,
      damageTaken: Math.max(0.55, 1 - save.skills.armor * 0.04),
    };
  }

  function updateCoinUI() {
    const text = formatNumber(save.coins);
    dom.menuCoins.textContent = text;
    dom.armoryCoins.forEach((element) => {
      element.textContent = text;
    });
    updateInstallState();
  }

  function refreshMenuUI() {
    updateCoinUI();
    dom.bestTime.textContent = formatTime(save.bestTime);
    dom.playButton.disabled = state.gameMode === "running";
  }

  function weaponStatsMarkup(weapon) {
    const damage = Math.round(weapon.damage);
    const damageText = weapon.count > 1 ? `${damage}×${weapon.count}` : `${damage}`;
    return `
      <span class="weapon-stat">УРОН <b>${damageText}</b></span>
      <span class="weapon-stat">ТЕМП <b>${weapon.fireRate.toFixed(1)}/с</b></span>
      <span class="weapon-stat">ДАЛЬН. <b>${Math.round(weapon.range)}</b></span>
    `;
  }

  function pipsMarkup(filled, total, extraClass) {
    let output = `<div class="${extraClass || "level-pips"}">`;
    for (let i = 0; i < total; i += 1) {
      output += `<i class="${i < filled ? "is-filled" : ""}"></i>`;
    }
    return `${output}</div>`;
  }

  function renderWeaponArmory() {
    const cards = WEAPON_IDS.map((id) => {
      const base = WEAPONS[id];
      const weapon = getWeaponStats(id);
      const weaponSave = save.weapons[id];
      const selected = save.selectedWeapon === id;
      const locked = !weaponSave.unlocked;
      const atMax = weapon.level >= WEAPON_MAX_LEVEL;
      const upgradeCost = weaponUpgradeCost(id);
      let actionMarkup = "";
      if (locked) {
        actionMarkup = `<button class="card-action card-action--locked" type="button" data-weapon-action="unlock" data-weapon="${id}">ОТКРЫТЬ · ${formatNumber(base.unlockCost)}</button>`;
      } else {
        actionMarkup = `
          <button class="card-action ${selected ? "card-action--equipped" : "card-action--equip"}" type="button" data-weapon-action="equip" data-weapon="${id}" ${selected ? "disabled" : ""}>${selected ? "В РУКАХ" : "ВЗЯТЬ"}</button>
          <button class="card-action card-action--upgrade" type="button" data-weapon-action="upgrade" data-weapon="${id}" ${atMax ? "disabled" : ""}>${atMax ? "МАКС." : `УЛУЧШИТЬ · ${formatNumber(upgradeCost)}`}</button>
        `;
      }
      const tagLine = locked
        ? `<span class="weapon-type">ЗАКРЫТО</span>`
        : `${selected ? '<span class="weapon-owned">В РУКАХ</span>' : ""}<span class="weapon-type">${base.type}</span>`;
      return `
        <article class="weapon-card ${selected ? "is-selected" : ""} ${locked ? "is-locked" : ""}" data-weapon-card="${id}" style="--weapon-color:${base.color}">
          <div class="weapon-art">${ICONS[base.icon]}</div>
          <div class="weapon-info">
            <div class="weapon-tags">${tagLine}</div>
            <h3>${base.name}</h3>
            <p class="weapon-desc">${base.description}</p>
            <div class="weapon-stats">${weaponStatsMarkup(weapon)}${weapon.pierce > 0 ? `<span class="weapon-stat">ПРОБИТИЕ <b>${weapon.pierce}</b></span>` : ""}</div>
          </div>
          <div class="weapon-footer">
            <div class="level-block">
              <div class="level-line"><span>УРОВЕНЬ</span><b>${weapon.level} / ${WEAPON_MAX_LEVEL}</b></div>
              ${pipsMarkup(weapon.level, WEAPON_MAX_LEVEL)}
            </div>
            <div class="card-actions">${actionMarkup}</div>
          </div>
        </article>
      `;
    }).join("");
    dom.armoryContent.innerHTML = cards;
  }

  function renderSkillArmory() {
    const cards = Object.values(SKILLS).map((skill) => {
      const level = save.skills[skill.id];
      const maxed = level >= skill.max;
      const cost = skillUpgradeCost(skill.id);
      const current = level > 0 ? skill.format(level) : skill.empty;
      const next = !maxed ? ` · далее <b>${skill.format(level + 1)}</b>` : "";
      return `
        <article class="skill-card" style="--skill-color:${skill.color}">
          <div class="skill-icon">${ICONS[skill.icon]}</div>
          <div class="skill-body">
            <div class="skill-heading"><h3>${skill.name}</h3><span class="skill-level">${level} / ${skill.max}</span></div>
            <p class="skill-desc">${current}${next}</p>
            <div class="skill-bottom">
              ${pipsMarkup(level, skill.max, "skill-pips")}
              <button class="card-action card-action--upgrade" type="button" data-skill-upgrade="${skill.id}" ${maxed ? "disabled" : ""}>${maxed ? "МАКС." : `УЛУЧШИТЬ · ${formatNumber(cost)}`}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
    dom.armoryContent.innerHTML = `<div class="skill-grid">${cards}</div>`;
  }

  function renderArmory() {
    if (state.armoryTab === "skills") {
      renderSkillArmory();
    } else {
      renderWeaponArmory();
    }
    dom.weaponsTab.classList.toggle("is-active", state.armoryTab === "weapons");
    dom.skillsTab.classList.toggle("is-active", state.armoryTab === "skills");
    dom.weaponsTab.setAttribute("aria-selected", state.armoryTab === "weapons" ? "true" : "false");
    dom.skillsTab.setAttribute("aria-selected", state.armoryTab === "skills" ? "true" : "false");
    updateCoinUI();
  }

  function setArmoryTab(tab) {
    state.armoryTab = tab === "skills" ? "skills" : "weapons";
    renderArmory();
    audio.click();
  }

  function updateSoundUI() {
    dom.soundToggle.classList.toggle("is-on", save.sound);
    dom.soundToggle.setAttribute("aria-checked", save.sound ? "true" : "false");
    dom.vibrationToggle.classList.toggle("is-on", save.vibration);
    dom.vibrationToggle.setAttribute("aria-checked", save.vibration ? "true" : "false");
    dom.pauseSoundButton.textContent = save.sound ? "ЗВУК: ВКЛ" : "ЗВУК: ВЫКЛ";
  }

  function updateInstallState() {
    const standalone = state.isStandalone;
    dom.installSettingsButton.disabled = standalone;
    dom.installSettingsButton.textContent = standalone ? "УСТАНОВЛЕНО" : "УСТАНОВИТЬ";
    if (standalone) {
      dom.installHelp.textContent = "Игра уже открыта как приложение. Всё сохранено на этом устройстве.";
    } else if (state.installPrompt) {
      dom.installHelp.textContent = "Нажми «Установить», чтобы добавить игру на главный экран.";
    } else if (isAppleMobile()) {
      dom.installHelp.textContent = "В Safari нажми «Поделиться» → «На экран Домой».";
    } else {
      dom.installHelp.textContent = "Открой меню браузера и выбери «Установить приложение» или «На главный экран».";
    }
    const visible = !standalone && (Boolean(state.installPrompt) || isAppleMobile());
    dom.installButton.classList.toggle("is-hidden", !visible);
  }

  function isAppleMobile() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function updateSoundFromSave() {
    audio.setEnabled(save.sound);
    updateSoundUI();
  }

  function toggleSound() {
    save.sound = !save.sound;
    persist();
    updateSoundFromSave();
    if (save.sound) audio.click();
    vibrate(8);
  }

  function toggleVibration() {
    save.vibration = !save.vibration;
    persist();
    updateSoundUI();
    if (save.vibration) vibrate(16);
    audio.click();
  }

  function showToast(message, duration) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    dom.toastStack.appendChild(toast);
    while (dom.toastStack.children.length > 3) {
      dom.toastStack.firstElementChild.remove();
    }
    const life = duration || 2400;
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 260);
    }, life);
  }

  function clearToasts() {
    if (dom.toastStack) dom.toastStack.innerHTML = "";
  }

  function setActiveScreen(screen) {
    dom.menuScreen.classList.toggle("is-active", screen === "menu");
    dom.armoryScreen.classList.toggle("is-active", screen === "armory");
    dom.guideScreen.classList.toggle("is-active", screen === "guide");
    dom.settingsScreen.classList.toggle("is-active", screen === "settings");
    if (dom.toastStack) dom.toastStack.dataset.screen = screen || "game";
  }

  function hideGameOverlay() {
    dom.pauseOverlay.classList.add("is-hidden");
    dom.pauseOverlay.setAttribute("aria-hidden", "true");
    dom.levelupOverlay.classList.add("is-hidden");
    dom.levelupOverlay.setAttribute("aria-hidden", "true");
    dom.gameoverOverlay.classList.add("is-hidden");
    dom.gameoverOverlay.setAttribute("aria-hidden", "true");
    dom.confirmOverlay.classList.add("is-hidden");
    dom.confirmOverlay.setAttribute("aria-hidden", "true");
  }

  function openPanel(name, returnTo) {
    state.panelReturn = returnTo || "menu";
    state.screen = name;
    hideGameOverlay();
    setActiveScreen(name);
    dom.hud.classList.add("is-hidden");
    dom.damageVignette.classList.remove("is-hit");
    if (name === "armory") renderArmory();
    if (name === "settings") updateSoundUI();
    updateInstallState();
    window.scrollTo(0, 0);
    const scroller = name === "armory" ? dom.armoryScreen : name === "guide" ? dom.guideScreen : dom.settingsScreen;
    const scrollBox = scroller.querySelector(".screen-scroll");
    if (scrollBox) scrollBox.scrollTop = 0;
  }

  function navigateMenu() {
    state.screen = "menu";
    state.gameMode = "idle";
    game = null;
    hideGameOverlay();
    setActiveScreen("menu");
    dom.hud.classList.add("is-hidden");
    dom.damageVignette.classList.remove("is-hit");
    refreshMenuUI();
    updateInstallState();
  }

  function closePanel() {
    if (state.panelReturn === "gameover") {
      state.screen = "game";
      setActiveScreen(null);
      dom.gameoverOverlay.classList.remove("is-hidden");
      dom.gameoverOverlay.setAttribute("aria-hidden", "false");
    } else {
      navigateMenu();
    }
  }

  function openGuide() {
    openPanel("guide", "menu");
    audio.click();
  }

  function openSettings() {
    openPanel("settings", "menu");
    audio.click();
  }

  function equipWeapon(id) {
    if (!save.weapons[id].unlocked) {
      audio.denied();
      return;
    }
    if (save.selectedWeapon === id) {
      audio.click();
      return;
    }
    save.selectedWeapon = id;
    persist();
    audio.click();
    renderArmory();
    showToast(`Выбрано: ${WEAPONS[id].name}`);
    updateSoundButtonState();
  }

  function upgradeWeapon(id) {
    const current = save.weapons[id];
    if (!current.unlocked || current.level >= WEAPON_MAX_LEVEL) return;
    const cost = weaponUpgradeCost(id);
    if (save.coins < cost) {
      audio.denied();
      vibrate(20);
      showToast(`Не хватает ${formatNumber(cost - save.coins)} монет`);
      return;
    }
    save.coins -= cost;
    current.level += 1;
    persist();
    audio.coin();
    vibrate(12);
    renderArmory();
    showToast(`${WEAPONS[id].shortName}: уровень ${current.level}`);
  }

  function unlockWeapon(id) {
    const base = WEAPONS[id];
    const current = save.weapons[id];
    if (current.unlocked) return;
    if (save.coins < base.unlockCost) {
      audio.denied();
      vibrate(20);
      showToast(`Не хватает ${formatNumber(base.unlockCost - save.coins)} монет`);
      return;
    }
    save.coins -= base.unlockCost;
    current.unlocked = true;
    save.selectedWeapon = id;
    persist();
    audio.coin();
    vibrate(16);
    renderArmory();
    showToast(`Открыто оружие: ${base.name}`, 3000);
  }

  function upgradeSkill(id) {
    const skill = SKILLS[id];
    const level = save.skills[id];
    if (level >= skill.max) return;
    const cost = skillUpgradeCost(id);
    if (save.coins < cost) {
      audio.denied();
      vibrate(20);
      showToast(`Не хватает ${formatNumber(cost - save.coins)} монет`);
      return;
    }
    save.coins -= cost;
    save.skills[id] = level + 1;
    persist();
    audio.coin();
    vibrate(12);
    renderArmory();
    showToast(`${skill.name}: уровень ${level + 1}`);
  }

  function updateSoundButtonState() {
    dom.pauseSoundButton.textContent = save.sound ? "ЗВУК: ВКЛ" : "ЗВУК: ВЫКЛ";
  }

  function handleArmoryClick(event) {
    const upgradeSkillButton = event.target.closest("[data-skill-upgrade]");
    if (upgradeSkillButton) {
      upgradeSkill(upgradeSkillButton.getAttribute("data-skill-upgrade"));
      return;
    }
    const actionButton = event.target.closest("[data-weapon-action]");
    if (actionButton) {
      const id = actionButton.getAttribute("data-weapon");
      const action = actionButton.getAttribute("data-weapon-action");
      if (action === "upgrade") upgradeWeapon(id);
      if (action === "unlock") unlockWeapon(id);
      if (action === "equip") equipWeapon(id);
      return;
    }
    const card = event.target.closest("[data-weapon-card]");
    if (card) {
      const id = card.getAttribute("data-weapon-card");
      if (!save.weapons[id].unlocked) {
        unlockWeapon(id);
      } else {
        equipWeapon(id);
      }
    }
  }

  function requestInstall() {
    if (state.isStandalone) {
      showToast("Игра уже установлена на это устройство.");
      return;
    }
    if (state.installPrompt) {
      const prompt = state.installPrompt;
      state.installPrompt = null;
      prompt.prompt();
      prompt.userChoice.then(() => {
        updateInstallState();
      }).catch(() => {
        updateInstallState();
      });
      return;
    }
    if (isAppleMobile()) {
      showToast("Safari: «Поделиться» → «На экран Домой». Игра появится как приложение.", 6200);
      return;
    }
    showToast("Открой меню браузера → «Установить приложение» или «На главный экран».", 6000);
  }

  function requestReset() {
    dom.confirmOverlay.classList.remove("is-hidden");
    dom.confirmOverlay.setAttribute("aria-hidden", "false");
    audio.click();
  }

  function cancelReset() {
    dom.confirmOverlay.classList.add("is-hidden");
    dom.confirmOverlay.setAttribute("aria-hidden", "true");
    audio.click();
  }

  function confirmReset() {
    save = makeDefaultSave();
    persist();
    updateSoundFromSave();
    refreshMenuUI();
    renderArmory();
    cancelReset();
    navigateMenu();
    showToast("Прогресс сброшен. Новая экспедиция ждёт.", 3000);
    vibrate([20, 30, 20]);
  }

  const ENEMY_TYPES = {
    polar: { hp: 1, speed: 56, damage: 9, radius: 22, scale: 1, xp: 7, loot: 2 },
    cub: { hp: 0.52, speed: 79, damage: 5.5, radius: 15, scale: 0.68, xp: 4, loot: 1 },
    alpha: { hp: 2.35, speed: 45, damage: 14, radius: 30, scale: 1.34, xp: 16, loot: 5 },
    frost: { hp: 1.75, speed: 62, damage: 11, radius: 24, scale: 1.08, xp: 12, loot: 4 },
  };

  const BOSS_NAMES = ["ЛЕДЯНОЙ ГИГАНТ", "СТАРШИЙ ХИЩНИК", "ХРАНИТЕЛЬ ПУРГИ"];
  const input = {
    keys: new Set(),
    joyX: 0,
    joyY: 0,
    joyPointerId: null,
    joyMax: 40,
  };
  let damageFlashTimer = null;
  let runSequence = 0;

  function addShake(amount) {
    if (!game) return;
    camera.shake = Math.min(16, camera.shake + amount);
  }

  function createRun(weaponId) {
    const meta = getMetaStats();
    const weapon = getWeaponStats(weaponId);
    runSequence += 1;
    return {
      id: runSequence,
      time: 0,
      hp: meta.maxHp,
      hpLag: meta.maxHp,
      level: 1,
      xp: 0,
      xpNext: 30,
      pendingLevels: 0,
      kills: 0,
      bossKills: 0,
      loot: 0,
      wave: 1,
      nextWaveAt: 20,
      nextBossTime: 60,
      bossWarned: false,
      boss: null,
      bossCount: 0,
      spawnTimer: 0.6,
      fireTimer: 0.2,
      dashCooldown: 0,
      bombCooldown: 0,
      uiTimer: 0,
      upgrades: {},
      weapon,
      stats: {
        maxHp: meta.maxHp,
        damageMult: meta.damageMult,
        fireRateMult: 1,
        speedMult: meta.speedMult,
        magnetMult: meta.magnetMult,
        extraProjectiles: 0,
        extraPierce: 0,
        critChance: 0.05,
        critMult: 1.8,
        regen: 0,
        slowFactor: 1,
        slowDuration: 0,
        damageTaken: meta.damageTaken,
        dashCooldown: 6.5,
        bombCooldown: 16.5,
      },
      player: {
        x: 0,
        y: 0,
        radius: 17,
        aim: -Math.PI / 2,
        bodyAngle: -Math.PI / 2,
        moving: false,
        walk: 0,
        walkTimer: 0,
        invuln: 1.6,
        hurtFlash: 0,
        muzzleFlash: 0,
        recoil: 0,
        dashTime: 0,
        dashX: 0,
        dashY: 0,
        target: null,
      },
      bears: [],
      bullets: [],
      grenades: [],
      orbs: [],
      particles: [],
      rings: [],
      damageTexts: [],
      afterimages: [],
      footprints: [],
      nextEntityId: 1,
      finished: false,
      reward: 0,
    };
  }

  function difficultyHp(gameRef) {
    return 1 + gameRef.time * 0.012 + (gameRef.wave - 1) * 0.105;
  }

  function difficultyDamage(gameRef) {
    return 1 + gameRef.time * 0.0035;
  }

  function spawnBearAt(typeName, x, y) {
    if (!game) return null;
    const config = ENEMY_TYPES[typeName] || ENEMY_TYPES.polar;
    const scale = difficultyHp(game);
    const maxHp = 46 * config.hp * scale;
    const bear = {
      id: game.nextEntityId,
      type: typeName,
      x,
      y,
      radius: config.radius,
      scale: config.scale,
      hp: maxHp,
      maxHp,
      speed: config.speed * (1 + game.time * 0.0009) * rand(0.9, 1.08),
      damage: config.damage * difficultyDamage(game),
      xp: Math.round(config.xp * (1 + game.time / 190)),
      loot: config.loot,
      angle: Math.atan2(-y, -x),
      walk: rand(0, TAU),
      hitFlash: 0,
      attackCd: rand(0.2, 1),
      attackPulse: 0,
      slowTimer: 0,
      slowFactor: 1,
      alive: true,
      isBoss: false,
      chargeWindup: 0,
      charging: 0,
      chargeX: 0,
      chargeY: 0,
      chargeCooldown: rand(3.5, 5.5),
      summonTimer: rand(7, 10),
    };
    game.nextEntityId += 1;
    game.bears.push(bear);
    return bear;
  }

  function spawnBoss() {
    if (!game || game.boss) return;
    const g = game;
    const angle = rand(-Math.PI, Math.PI);
    const distance = Math.max(view.width, view.height) / view.zoom * 0.56 + 120;
    const x = g.player.x + Math.cos(angle) * distance;
    const y = g.player.y + Math.sin(angle) * distance;
    const bossIndex = g.bossCount;
    const maxHp = (900 + bossIndex * 480) * (1 + g.time / 280);
    const boss = {
      id: g.nextEntityId,
      type: "boss",
      bossName: BOSS_NAMES[bossIndex % BOSS_NAMES.length],
      x,
      y,
      radius: 49,
      scale: 1.94,
      hp: maxHp,
      maxHp,
      speed: 42,
      damage: 22 * difficultyDamage(g),
      xp: 120,
      loot: 110,
      angle: Math.atan2(g.player.y - y, g.player.x - x),
      walk: 0,
      hitFlash: 0,
      attackCd: 0.8,
      attackPulse: 0,
      slowTimer: 0,
      slowFactor: 1,
      alive: true,
      isBoss: true,
      chargeWindup: 0,
      charging: 0,
      chargeX: 0,
      chargeY: 0,
      chargeCooldown: 4,
      summonTimer: 9,
    };
    g.nextEntityId += 1;
    g.bears.push(boss);
    g.boss = boss;
    g.bossCount += 1;
    addRing(x, y, 30, 220, "rgba(255, 126, 72, .55)", 0.9);
    addSnowBurst(x, y, 28, 250, true);
    addShake(11);
    vibrate([30, 40, 60]);
    audio.boss();
    clearToasts();
    showBanner(boss.bossName, "ЛЕДЯНАЯ ОХОТА · БОСС");
    showToast("Босс на арене. Берегись рывка!", 3200);
    updateBossUI();
  }

  function spawnStartingPack() {
    if (!game) return;
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU + rand(-0.28, 0.28);
      const radius = rand(245, 410);
      spawnBearAt(i === 2 ? "cub" : "polar", Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    for (let i = 0; i < randInt(1, 2); i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const radius = rand(360, 510);
      spawnBearAt("polar", Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }

  function selectEnemyType() {
    const pool = [{ type: "polar", weight: 1 }];
    if (game.time > 22) pool.push({ type: "cub", weight: 0.36 });
    if (game.time > 46) pool.push({ type: "alpha", weight: 0.25 });
    if (game.time > 84) pool.push({ type: "frost", weight: 0.24 });
    let total = 0;
    for (const item of pool) total += item.weight;
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) return item.type;
    }
    return "polar";
  }

  function spawnWaveBear() {
    if (!game) return;
    const angle = rand(-Math.PI, Math.PI);
    const halfDiagonal = Math.hypot(view.width / view.zoom, view.height / view.zoom) * 0.5;
    const radius = halfDiagonal + rand(80, 320);
    const x = game.player.x + Math.cos(angle) * radius;
    const y = game.player.y + Math.sin(angle) * radius;
    if (spawnBearAt(selectEnemyType(), x, y)) addSnowBurst(x, y, 4, 18, false);
  }

  function updateSpawning(dt) {
    const g = game;
    const bossPressure = g.boss ? 1.5 : 1;
    const intervalBase = Math.max(0.23, (0.95 - g.time * 0.0045 - g.wave * 0.033) * bossPressure);
    const cap = view.width * view.height > 700000 ? 88 : 72;
    if (g.bears.length < cap) {
      g.spawnTimer -= dt;
      while (g.spawnTimer <= 0) {
        g.spawnTimer += intervalBase * rand(0.7, 1.25);
        const count = clamp(1 + Math.floor(g.wave / 4) + (Math.random() < 0.22 ? 1 : 0), 1, 3);
        for (let i = 0; i < count; i += 1) {
          if (g.bears.length < cap) spawnWaveBear();
        }
      }
    } else {
      g.spawnTimer = Math.max(g.spawnTimer, 0.4);
    }
  }

  function getMoveDirection() {
    let x = input.joyX;
    let y = input.joyY;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) x -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) x += 1;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) y -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) y += 1;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y, length: Math.min(1, length) };
  }

  function findNearestTarget(g) {
    const p = g.player;
    const maxRange = g.weapon.range;
    let best = null;
    let bestDistance = maxRange * maxRange;
    for (const bear of g.bears) {
      if (!bear.alive) continue;
      const d = dist2(p.x, p.y, bear.x, bear.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = bear;
      }
    }
    return best;
  }

  function fireWeapon(g) {
    const p = g.player;
    const target = p.target;
    if (!target) return;
    const w = g.weapon;
    const stats = g.stats;
    const count = w.count + stats.extraProjectiles;
    const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
    p.aim = angleLerp(p.aim, baseAngle, 0.6);
    const muzzleX = p.x + Math.cos(p.aim) * 33 - Math.sin(p.aim) * 5;
    const muzzleY = p.y + Math.sin(p.aim) * 33 + Math.cos(p.aim) * 5;
    for (let i = 0; i < count; i += 1) {
      let angle;
      if (count === 1) {
        angle = p.aim + rand(-w.spread, w.spread);
      } else {
        const fan = w.id === "shotgun" ? w.spread * 2 : Math.min(0.55, (count - 1) * 0.12);
        angle = p.aim + (i / (count - 1) - 0.5) * fan + rand(-w.spread * 0.55, w.spread * 0.55);
      }
      const crit = Math.random() < stats.critChance;
      const damage = w.damage * stats.damageMult * (crit ? stats.critMult : 1) * rand(0.94, 1.065);
      const speed = w.bulletSpeed * rand(0.97, 1.03);
      g.bullets.push({
        x: muzzleX,
        y: muzzleY,
        px: muzzleX,
        py: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        life: w.range / speed,
        damage,
        crit,
        pierce: w.pierce + stats.extraPierce,
        radius: w.id === "shotgun" ? 2.5 : 3,
        color: w.bulletColor,
        weaponId: w.id,
        hit: new Set(),
        dead: false,
      });
    }
    g.fireTimer = 1 / (w.fireRate * stats.fireRateMult);
    p.recoil = w.recoil;
    p.muzzleFlash = 0.065;
    addShake(w.recoil * 0.22 + 0.2);
    addMuzzleFlash(muzzleX, muzzleY, p.aim, w.bulletColor);
    audio.shoot(w.id);
  }

  function updatePlayer(dt) {
    const g = game;
    const p = g.player;
    const stats = g.stats;
    const move = getMoveDirection();
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.muzzleFlash = Math.max(0, p.muzzleFlash - dt);
    p.recoil = Math.max(0, p.recoil - dt * 18);
    g.fireTimer = Math.max(0, g.fireTimer - dt);
    g.dashCooldown = Math.max(0, g.dashCooldown - dt);
    g.bombCooldown = Math.max(0, g.bombCooldown - dt);

    if (stats.regen > 0 && g.hp < stats.maxHp) {
      g.hp = Math.min(stats.maxHp, g.hp + stats.regen * dt);
    }

    p.moving = move.length > 0.07;
    if (p.dashTime > 0) {
      p.dashTime = Math.max(0, p.dashTime - dt);
      const dashSpeed = 195 * stats.speedMult * 3.35;
      p.x += p.dashX * dashSpeed * dt;
      p.y += p.dashY * dashSpeed * dt;
      p.walk += dt * 22;
      if (Math.random() < 0.55) {
        g.afterimages.push({
          x: p.x,
          y: p.y,
          angle: p.bodyAngle,
          aim: p.aim,
          life: 0.22,
          maxLife: 0.22,
        });
      }
      if (Math.random() < 0.32) addSnowPuff(p.x, p.y + 8, 2, 30);
    } else if (p.moving) {
      const speed = 195 * stats.speedMult;
      p.x += move.x * speed * dt;
      p.y += move.y * speed * dt;
      p.walk += dt * (7 + 2 * move.length);
      p.walkTimer -= dt;
      if (p.walkTimer <= 0) {
        p.walkTimer = 0.27;
        addFootprint(p.x, p.y, Math.atan2(move.y, move.x));
      }
    }

    if (p.dashTime > 0) {
      p.bodyAngle = angleLerp(p.bodyAngle, Math.atan2(p.dashY, p.dashX), 0.7);
    } else if (p.moving) {
      p.bodyAngle = angleLerp(p.bodyAngle, Math.atan2(move.y, move.x), 1 - Math.exp(-dt * 13));
    }

    p.target = findNearestTarget(g);
    if (p.target) {
      const targetAngle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      p.aim = angleLerp(p.aim, targetAngle, 1 - Math.exp(-dt * 17));
      if (g.fireTimer <= 0) fireWeapon(g);
    } else if (p.moving) {
      p.aim = angleLerp(p.aim, Math.atan2(move.y, move.x), 1 - Math.exp(-dt * 8));
    }

    const follow = 1 - Math.exp(-dt * 7);
    camera.x = lerp(camera.x, p.x + Math.cos(p.aim) * 22, follow);
    camera.y = lerp(camera.y, p.y + Math.sin(p.aim) * 22, follow);
    camera.shake *= Math.exp(-dt * 9);
  }

  function tryDash() {
    if (!game || state.gameMode !== "running") return;
    const g = game;
    if (g.dashCooldown > 0 || g.player.dashTime > 0) return;
    const move = getMoveDirection();
    let dx = move.x;
    let dy = move.y;
    if (Math.hypot(dx, dy) < 0.1) {
      dx = Math.cos(g.player.aim);
      dy = Math.sin(g.player.aim);
    }
    const length = Math.hypot(dx, dy) || 1;
    g.player.dashX = dx / length;
    g.player.dashY = dy / length;
    g.player.dashTime = 0.2;
    g.player.invuln = Math.max(g.player.invuln, 0.36);
    g.dashCooldown = g.stats.dashCooldown;
    addSnowPuff(g.player.x, g.player.y + 7, 12, 90);
    addRing(g.player.x, g.player.y, 8, 52, "rgba(170, 247, 255, .34)", 0.33);
    addShake(2.2);
    audio.dash();
    vibrate(12);
    updateAbilityUI();
  }

  function tryBomb() {
    if (!game || state.gameMode !== "running") return;
    const g = game;
    if (g.bombCooldown > 0 || g.grenades.length > 0) return;
    let target = null;
    let bestDistance = Infinity;
    for (const bear of g.bears) {
      if (!bear.alive) continue;
      const d = Math.hypot(bear.x - g.player.x, bear.y - g.player.y);
      if (d < 720 && d < bestDistance) {
        bestDistance = d;
        target = bear;
      }
    }
    const tx = target ? target.x : g.player.x + Math.cos(g.player.aim) * 300;
    const ty = target ? target.y : g.player.y + Math.sin(g.player.aim) * 300;
    g.grenades.push({
      startX: g.player.x,
      startY: g.player.y,
      x: g.player.x,
      y: g.player.y,
      targetX: tx,
      targetY: ty,
      t: 0,
      duration: 0.62,
      height: 0,
    });
    g.bombCooldown = g.stats.bombCooldown;
    audio.tone(260, 620, 0.18, "triangle", 0.035);
    vibrate(10);
    updateAbilityUI();
  }

  function explodeGrenade(grenade) {
    const g = game;
    const radius = 145;
    addRing(grenade.targetX, grenade.targetY, 12, radius * 1.4, "rgba(255, 167, 69, .7)", 0.55);
    addRing(grenade.targetX, grenade.targetY, 8, radius, "rgba(255, 235, 178, .42)", 0.35);
    addExplosion(grenade.targetX, grenade.targetY);
    addShake(10);
    vibrate([18, 24, 28]);
    audio.explosion();
    for (const bear of g.bears) {
      if (!bear.alive) continue;
      const dx = bear.x - grenade.targetX;
      const dy = bear.y - grenade.targetY;
      const distance = Math.hypot(dx, dy);
      if (distance < radius + bear.radius * 0.5) {
        const falloff = 1 - clamp(distance / (radius + bear.radius * 0.5), 0, 1) * 0.35;
        const angle = Math.atan2(dy, dx);
        if (!bear.isBoss) {
          bear.x += Math.cos(angle) * 34;
          bear.y += Math.sin(angle) * 34;
        }
        damageBear(bear, 92 * g.stats.damageMult * falloff, { crit: false, explosion: true });
      }
    }
  }

  function segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 0.0001) {
      return dist2(x1, y1, cx, cy) <= radius * radius ? { x: cx, y: cy } : null;
    }
    const t = clamp(((cx - x1) * dx + (cy - y1) * dy) / lengthSq, 0, 1);
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    return dist2(px, py, cx, cy) <= radius * radius ? { x: px, y: py } : null;
  }

  function updateBullets(dt) {
    const g = game;
    const bears = g.bears;
    for (const bullet of g.bullets) {
      if (bullet.dead) continue;
      bullet.px = bullet.x;
      bullet.py = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      for (const bear of bears) {
        if (!bear.alive || bullet.hit.has(bear.id)) continue;
        const hit = segmentCircleHit(
          bullet.px,
          bullet.py,
          bullet.x,
          bullet.y,
          bear.x,
          bear.y,
          bear.radius * 0.86 + bullet.radius
        );
        if (!hit) continue;
        bullet.hit.add(bear.id);
        damageBear(bear, bullet.damage, {
          crit: bullet.crit,
          angle: Math.atan2(bullet.vy, bullet.vx),
          knockback: bullet.crit ? 8 : 4,
          slow: g.stats.slowFactor < 1 ? g.stats.slowFactor : 1,
        });
        addImpact(hit.x, hit.y, bullet.color, bullet.crit);
        audio.hit();
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullet.dead = true;
          break;
        }
      }
      if (bullet.life <= 0) bullet.dead = true;
    }
    g.bullets = g.bullets.filter((bullet) => !bullet.dead);
  }

  function damageBear(bear, amount, options) {
    if (!bear.alive || !game) return;
    const opts = options || {};
    const damage = Math.max(1, Math.round(amount));
    bear.hp -= damage;
    bear.hitFlash = 0.12;
    if (opts.slow && opts.slow < 1) {
      bear.slowFactor = Math.min(bear.slowFactor, opts.slow);
      bear.slowTimer = Math.max(bear.slowTimer, game.stats.slowDuration);
    }
    if (opts.knockback && !bear.isBoss) {
      const angle = opts.angle || 0;
      bear.x += Math.cos(angle) * opts.knockback;
      bear.y += Math.sin(angle) * opts.knockback;
    }
    addDamageText(bear.x + rand(-8, 8), bear.y - bear.radius * 0.6, damage, Boolean(opts.crit), opts.explosion);
    if (opts.crit) addShake(1.2);
    if (bear.hp <= 0) killBear(bear);
  }

  function killBear(bear) {
    if (!bear.alive || !game) return;
    const g = game;
    bear.alive = false;
    g.kills += 1;
    g.loot += bear.loot;
    addDeathBurst(bear.x, bear.y, bear.scale, bear.isBoss);
    if (bear.isBoss) {
      g.bossKills += 1;
      g.boss = null;
      g.loot += 100;
      g.nextBossTime = g.time + 55;
      g.bossWarned = false;
      spawnXpOrb(bear.x, bear.y, bear.xp, true);
      spawnHealthPickup(bear.x + rand(-30, 30), bear.y + rand(-30, 30));
      spawnHealthPickup(bear.x + rand(-36, 36), bear.y + rand(-36, 36));
      addRing(bear.x, bear.y, 10, 200, "rgba(255, 164, 83, .65)", 0.9);
      addShake(13);
      showBanner("ГИГАНТ ПОВЕРЖЕН", "ТРОФЕИ ТВОИ");
      audio.levelUp();
      vibrate([25, 35, 35]);
      updateBossUI();
    } else {
      spawnXpOrb(bear.x, bear.y, bear.xp, false);
      audio.kill();
      if (g.kills % 25 === 0) spawnHealthPickup(bear.x, bear.y);
    }
    addShake(bear.isBoss ? 5 : 0.7);
    g.bears = g.bears.filter((item) => item.alive);
    updateHUD();
  }

  function hurtPlayer(rawDamage) {
    if (!game || state.gameMode !== "running") return;
    const g = game;
    if (g.player.invuln > 0 || g.hp <= 0) return;
    const damage = Math.max(1, Math.round(rawDamage * g.stats.damageTaken));
    g.hp = Math.max(0, g.hp - damage);
    g.player.invuln = 0.46;
    g.player.hurtFlash = 0.36;
    addShake(5.5);
    vibrate(24);
    audio.hurt();
    addHurtBurst(g.player.x, g.player.y);
    dom.damageVignette.classList.add("is-hit");
    if (damageFlashTimer) window.clearTimeout(damageFlashTimer);
    damageFlashTimer = window.setTimeout(() => {
      dom.damageVignette.classList.remove("is-hit");
    }, 170);
    updateHUD();
  }

  function updateBossBear(bear, dt, distance) {
    const g = game;
    const p = g.player;
    if (bear.chargeWindup > 0) {
      bear.chargeWindup -= dt;
      if (bear.chargeWindup <= 0) {
        bear.charging = 0.5;
        const angle = Math.atan2(p.y - bear.y, p.x - bear.x);
        bear.chargeX = Math.cos(angle);
        bear.chargeY = Math.sin(angle);
        addShake(5);
        audio.boss();
      }
      return;
    }
    if (bear.charging > 0) {
      bear.charging -= dt;
      if (bear.charging <= 0) bear.chargeCooldown = rand(5.5, 7.5);
      return;
    }
    bear.chargeCooldown -= dt;
    if (bear.chargeCooldown <= 0 && distance > 95 && distance < 640) {
      bear.chargeWindup = 0.82;
      bear.chargeCooldown = 7;
      addRing(bear.x, bear.y, bear.radius * 0.7, bear.radius * 1.8, "rgba(255, 111, 67, .4)", 0.7);
      return;
    }
    bear.summonTimer -= dt;
    if (bear.summonTimer <= 0) {
      bear.summonTimer = rand(10, 13);
      const cap = view.width * view.height > 700000 ? 88 : 72;
      for (let i = 0; i < 2; i += 1) {
        if (g.bears.length >= cap) break;
        const angle = rand(-Math.PI, Math.PI);
        spawnBearAt("cub", bear.x + Math.cos(angle) * rand(40, 85), bear.y + Math.sin(angle) * rand(40, 85));
        addSnowBurst(bear.x, bear.y, 6, 60, false);
      }
      addRing(bear.x, bear.y, bear.radius * 0.8, bear.radius * 1.9, "rgba(158, 227, 255, .35)", 0.65);
    }
  }

  function updateBears(dt) {
    if (!game) return;
    const g = game;
    const p = g.player;
    const bears = g.bears;
    for (const bear of bears) {
      if (!bear.alive) continue;
      bear.hitFlash = Math.max(0, bear.hitFlash - dt);
      bear.attackPulse = Math.max(0, bear.attackPulse - dt);
      bear.attackCd = Math.max(0, bear.attackCd - dt);
      bear.slowTimer = Math.max(0, bear.slowTimer - dt);
      if (bear.slowTimer <= 0) bear.slowFactor = 1;
      const dx = p.x - bear.x;
      const dy = p.y - bear.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const dirX = dx / distance;
      const dirY = dy / distance;
      const slow = bear.slowFactor < 1 ? bear.slowFactor : 1;
      const attackRange = p.radius + bear.radius * 0.68 + 3;

      if (bear.isBoss) updateBossBear(bear, dt, distance);

      if (bear.charging > 0) {
        const chargeSpeed = bear.speed * 4.25 * slow;
        bear.x += bear.chargeX * chargeSpeed * dt;
        bear.y += bear.chargeY * chargeSpeed * dt;
        bear.walk += dt * 26;
        if (Math.random() < 0.6) addSnowPuff(bear.x, bear.y + bear.radius * 0.45, 2, 38);
        if (distance < attackRange + 10 && bear.attackCd <= 0) {
          bear.attackCd = 0.9;
          bear.attackPulse = 0.24;
          hurtPlayer(bear.damage * 0.9);
        }
        continue;
      }

      if (bear.isBoss && bear.chargeWindup > 0) {
        bear.walk += dt * 7;
        if (distance > attackRange) {
          bear.x += dirX * bear.speed * slow * 0.18 * dt;
          bear.y += dirY * bear.speed * slow * 0.18 * dt;
        }
        continue;
      }

      if (distance > attackRange) {
        const wobble = Math.sin(bear.walk * 1.6 + bear.id) * 0.1;
        const speed = bear.speed * slow;
        bear.x += (dirX - dirY * wobble) * speed * dt;
        bear.y += (dirY + dirX * wobble) * speed * dt;
        bear.walk += dt * (4 + speed * 0.075);
      } else if (bear.attackCd <= 0) {
        bear.attackCd = bear.isBoss ? 0.85 : rand(0.95, 1.3);
        bear.attackPulse = 0.22;
        hurtPlayer(bear.damage);
      }
      bear.angle = Math.atan2(p.y - bear.y, p.x - bear.x);
    }

    separateBears(dt);
    g.bears = g.bears.filter((bear) => bear.alive);
    updateBossUI();
  }

  function separateBears(dt) {
    const bears = game.bears;
    const strength = clamp(dt * 18, 0, 0.7);
    for (let i = 0; i < bears.length; i += 1) {
      const a = bears[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < bears.length; j += 1) {
        const b = bears[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDistance = (a.radius + b.radius) * 0.63;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minDistance * minDistance || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const overlap = (minDistance - d) / minDistance;
        const push = overlap * strength * (a.isBoss ? 0.18 : 1) * (b.isBoss ? 0.18 : 1) * 8;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  function updateGrenades(dt) {
    if (!game) return;
    const g = game;
    for (const grenade of g.grenades) {
      grenade.t += dt;
      const t = clamp(grenade.t / grenade.duration, 0, 1);
      grenade.x = lerp(grenade.startX, grenade.targetX, t);
      grenade.y = lerp(grenade.startY, grenade.targetY, t);
      grenade.height = Math.sin(t * Math.PI) * 95;
      if (t >= 1) {
        grenade.exploded = true;
        explodeGrenade(grenade);
      }
    }
    g.grenades = g.grenades.filter((grenade) => !grenade.exploded);
    updateAbilityUI();
  }

  function spawnXpOrb(x, y, value, big) {
    game.orbs.push({
      x,
      y,
      vx: rand(-45, 45),
      vy: rand(-35, 20),
      value,
      type: "xp",
      big: Boolean(big),
      phase: rand(0, TAU),
      attracted: false,
      dead: false,
    });
  }

  function spawnHealthPickup(x, y) {
    game.orbs.push({
      x,
      y,
      vx: rand(-20, 20),
      vy: rand(-10, 10),
      value: 28,
      type: "health",
      phase: rand(0, TAU),
      attracted: false,
      dead: false,
    });
  }

  function updateOrbs(dt) {
    if (!game) return;
    const g = game;
    const p = g.player;
    const magnetRadius = 112 * g.stats.magnetMult;
    for (const orb of g.orbs) {
      if (orb.dead) continue;
      orb.phase += dt * 4;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.vx *= Math.exp(-dt * 3.8);
      orb.vy *= Math.exp(-dt * 3.8);
      const dx = p.x - orb.x;
      const dy = p.y - orb.y;
      const distance = Math.hypot(dx, dy) || 1;
      const attraction = orb.type === "health" ? 150 : magnetRadius;
      if (distance < attraction) orb.attracted = true;
      if (orb.attracted) {
        const speed = clamp(290 + (attraction - distance) * 3.2, 290, 720);
        orb.x += (dx / distance) * speed * dt;
        orb.y += (dy / distance) * speed * dt;
      }
      if (distance < p.radius + 16) {
        orb.dead = true;
        if (orb.type === "health") {
          const before = g.hp;
          g.hp = Math.min(g.stats.maxHp, g.hp + orb.value);
          addHealBurst(p.x, p.y);
          addDamageText(p.x, p.y - 28, `+${Math.round(g.hp - before)}`, false, false, true);
          audio.heal();
        } else {
          addXp(orb.value);
          addSparkle(p.x, p.y, "#8be8ff", 4);
          audio.pickup();
        }
      }
    }
    g.orbs = g.orbs.filter((orb) => !orb.dead);
  }

  function addXp(amount) {
    if (!game) return;
    const g = game;
    g.xp += amount;
    while (g.xp >= g.xpNext) {
      g.xp -= g.xpNext;
      g.level += 1;
      g.xpNext = Math.round(g.xpNext * 1.24 + 9);
      g.pendingLevels += 1;
      addRing(g.player.x, g.player.y, 18, 80, "rgba(155, 235, 255, .48)", 0.55);
      addSparkle(g.player.x, g.player.y, "#a9f2ff", 8);
      audio.levelUp();
    }
    updateHUD();
  }

  function addParticle(particle) {
    if (!game) return;
    if (game.particles.length > 420) game.particles.splice(0, 24);
    game.particles.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: 3,
      color: "#ffffff",
      type: "dot",
      gravity: 0,
      drag: 0,
      rotation: 0,
      spin: 0,
      ...particle,
    });
  }

  function addSnowPuff(x, y, count, force) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(10, force || 30);
      addParticle({
        x: x + rand(-6, 6),
        y: y + rand(-5, 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(0, 20),
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        size: rand(1.2, 3.3),
        color: i % 3 === 0 ? "rgba(255,255,255,.9)" : "rgba(196,226,243,.8)",
        type: "snow",
        gravity: 12,
        drag: 2.8,
      });
    }
  }

  function addSnowBurst(x, y, count, force, cold) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(20, force || 80);
      addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - rand(10, 70),
        life: rand(0.4, 1),
        maxLife: 1,
        size: rand(2, 6),
        color: cold ? "rgba(148, 231, 255, .8)" : "rgba(255,255,255,.9)",
        type: i % 3 === 0 ? "shard" : "snow",
        rotation: rand(0, TAU),
        spin: rand(-4, 4),
        gravity: 45,
        drag: 2.1,
      });
    }
  }

  function addMuzzleFlash(x, y, angle, color) {
    addParticle({
      x,
      y,
      vx: Math.cos(angle) * 25,
      vy: Math.sin(angle) * 25,
      life: 0.095,
      maxLife: 0.095,
      size: 15,
      color: color || "#ffd369",
      type: "flash",
      rotation: angle,
      drag: 8,
    });
    for (let i = 0; i < 3; i += 1) {
      addParticle({
        x,
        y,
        vx: Math.cos(angle + rand(-0.5, 0.5)) * rand(40, 150),
        vy: Math.sin(angle + rand(-0.5, 0.5)) * rand(40, 150),
        life: rand(0.1, 0.24),
        maxLife: 0.24,
        size: rand(1, 2.5),
        color: color || "#ffd369",
        type: "spark",
        drag: 5,
      });
    }
  }

  function addImpact(x, y, color, crit) {
    const count = crit ? 9 : 4;
    for (let i = 0; i < count; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(30, crit ? 170 : 95);
      addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.12, 0.32),
        maxLife: 0.32,
        size: rand(1, crit ? 3 : 2.2),
        color: i % 3 === 0 ? "rgba(255,255,255,.9)" : color || "#ffd369",
        type: "spark",
        gravity: 90,
        drag: 3,
      });
    }
  }

  function addDeathBurst(x, y, scale, boss) {
    const count = boss ? 42 : Math.round(12 * scale + 5);
    for (let i = 0; i < count; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(20, boss ? 260 : 150);
      addParticle({
        x: x + rand(-8, 8) * scale,
        y: y + rand(-8, 8) * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(20, 130),
        life: rand(0.4, boss ? 1.2 : 0.8),
        maxLife: 1.2,
        size: rand(2, boss ? 7 : 5) * scale,
        color: i % 4 === 0 ? "rgba(169, 222, 244, .85)" : "rgba(255,255,255,.92)",
        type: i % 5 === 0 ? "shard" : "fur",
        rotation: rand(0, TAU),
        spin: rand(-6, 6),
        gravity: 65,
        drag: 2.2,
      });
    }
    addRing(x, y, 8, boss ? 160 : 42 + scale * 18, boss ? "rgba(255,195,106,.55)" : "rgba(219,244,255,.44)", boss ? 0.8 : 0.35);
  }

  function addHurtBurst(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(30, 130);
      addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.2, 0.5),
        maxLife: 0.5,
        size: rand(1.5, 3.5),
        color: i % 2 ? "rgba(255,107,98,.8)" : "rgba(255,177,134,.8)",
        type: "spark",
        gravity: 80,
        drag: 3,
      });
    }
  }

  function addHealBurst(x, y) {
    for (let i = 0; i < 12; i += 1) {
      addParticle({
        x: x + rand(-15, 15),
        y: y + rand(-10, 20),
        vx: rand(-25, 25),
        vy: rand(-80, -25),
        life: rand(0.4, 0.8),
        maxLife: 0.8,
        size: rand(1.5, 3),
        color: i % 2 ? "rgba(122,255,158,.9)" : "rgba(218,255,213,.9)",
        type: "spark",
        drag: 1.6,
      });
    }
  }

  function addExplosion(x, y) {
    for (let i = 0; i < 28; i += 1) {
      const angle = rand(-Math.PI, Math.PI);
      const speed = rand(40, 260);
      addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.65 - rand(20, 110),
        life: rand(0.3, 0.8),
        maxLife: 0.8,
        size: rand(3, 8),
        color: i % 3 === 0 ? "rgba(255,246,195,.9)" : i % 3 === 1 ? "rgba(255,163,60,.85)" : "rgba(92,115,126,.65)",
        type: i % 4 === 0 ? "smoke" : "spark",
        rotation: rand(0, TAU),
        spin: rand(-5, 5),
        gravity: 60,
        drag: 2.7,
      });
    }
    for (let i = 0; i < 12; i += 1) {
      addParticle({
        x: x + rand(-55, 55),
        y: y + rand(-20, 30),
        vx: rand(-20, 20),
        vy: rand(-60, -15),
        life: rand(0.7, 1.5),
        maxLife: 1.5,
        size: rand(12, 28),
        color: "rgba(84, 98, 107, .32)",
        type: "smoke",
        drag: 1.1,
      });
    }
  }

  function addRing(x, y, startRadius, endRadius, color, life) {
    if (!game) return;
    game.rings.push({
      x,
      y,
      radius: startRadius,
      startRadius,
      endRadius,
      color,
      life,
      maxLife: life,
    });
  }

  function addDamageText(x, y, value, crit, explosion, heal) {
    if (!game) return;
    if (game.damageTexts.length > 44) game.damageTexts.shift();
    game.damageTexts.push({
      x,
      y,
      vy: rand(-36, -20),
      value: String(value),
      life: 0.72,
      maxLife: 0.72,
      crit: Boolean(crit),
      explosion: Boolean(explosion),
      heal: Boolean(heal),
    });
  }

  function addSparkle(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      addParticle({
        x: x + rand(-10, 10),
        y: y + rand(-10, 10),
        vx: rand(-40, 40),
        vy: rand(-90, -25),
        life: rand(0.3, 0.6),
        maxLife: 0.6,
        size: rand(1, 2.7),
        color,
        type: "spark",
        drag: 2.2,
      });
    }
  }

  function addFootprint(x, y, angle) {
    if (!game) return;
    const side = Math.sin(game.player.walk * 5) > 0 ? 1 : -1;
    game.footprints.push({
      x: x + Math.cos(angle + Math.PI / 2) * 8 * side - Math.cos(angle) * 8,
      y: y + Math.sin(angle + Math.PI / 2) * 8 * side - Math.sin(angle) * 8,
      angle,
      age: 0,
      life: 12,
    });
    if (game.footprints.length > 90) game.footprints.shift();
  }

  function updateEffects(dt) {
    if (!game) return;
    const g = game;
    for (const particle of g.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-(particle.drag || 0) * dt);
      particle.vy *= Math.exp(-(particle.drag || 0) * dt);
      particle.vy += (particle.gravity || 0) * dt;
      particle.rotation += (particle.spin || 0) * dt;
    }
    g.particles = g.particles.filter((particle) => particle.life > 0);
    for (const ring of g.rings) {
      ring.life -= dt;
      const progress = 1 - clamp(ring.life / ring.maxLife, 0, 1);
      ring.radius = lerp(ring.startRadius, ring.endRadius, progress);
    }
    g.rings = g.rings.filter((ring) => ring.life > 0);
    for (const text of g.damageTexts) {
      text.life -= dt;
      text.y += text.vy * dt;
      text.vy *= Math.exp(-dt * 3.5);
    }
    g.damageTexts = g.damageTexts.filter((text) => text.life > 0);
    for (const image of g.afterimages) image.life -= dt;
    g.afterimages = g.afterimages.filter((image) => image.life > 0);
    for (const footprint of g.footprints) footprint.age += dt;
    g.footprints = g.footprints.filter((footprint) => footprint.age < footprint.life);
  }

  function updateGame(dt) {
    if (!game || state.gameMode !== "running") return;
    const g = game;
    g.time += dt;

    while (g.time >= g.nextWaveAt) {
      g.wave += 1;
      g.nextWaveAt += 20;
      if (!g.boss || g.wave % 2 === 0) {
        showBanner(`ВОЛНА ${g.wave}`, g.wave >= 5 ? "СТАЯ РАСТЁТ" : "ДЕРЖИСЬ");
      }
      audio.tone(300, 460, 0.16, "triangle", 0.02);
    }

    if (!g.bossWarned && !g.boss && g.time >= g.nextBossTime - 10) {
      g.bossWarned = true;
      showToast("Сейсмограф ловит тяжёлые шаги. Гигант близко.", 3400);
      audio.tone(74, 48, 0.5, "sawtooth", 0.032);
    }

    updatePlayer(dt);
    updateSpawning(dt);
    updateBears(dt);
    if (g.hp <= 0) {
      endRun("death");
      return;
    }
    updateBullets(dt);
    updateGrenades(dt);
    updateOrbs(dt);
    updateEffects(dt);
    g.hpLag = Math.max(g.hp, g.hpLag - Math.max(35, g.stats.maxHp * 0.62) * dt);
    if (g.hp > g.hpLag) g.hpLag = g.hp;

    if (!g.boss && g.time >= g.nextBossTime) spawnBoss();

    g.uiTimer -= dt;
    if (g.uiTimer <= 0) {
      g.uiTimer = 0.075;
      updateHUD();
    }

    if (g.pendingLevels > 0) showLevelUp();
  }

  function updateHUD() {
    if (!game) return;
    const g = game;
    dom.hpFill.style.width = `${clamp(g.hp / g.stats.maxHp, 0, 1) * 100}%`;
    dom.hpLagFill.style.width = `${clamp(g.hpLag / g.stats.maxHp, 0, 1) * 100}%`;
    dom.hpText.textContent = `${Math.ceil(g.hp)} / ${Math.round(g.stats.maxHp)}`;
    dom.xpFill.style.width = `${clamp(g.xp / g.xpNext, 0, 1) * 100}%`;
    dom.playerLevelBadge.textContent = String(g.level);
    dom.runTime.textContent = formatTime(g.time);
    dom.waveValue.textContent = String(g.wave);
    dom.killValue.textContent = String(g.kills);
    dom.runCoins.textContent = formatNumber(g.loot);
    updateBossUI();
    updateAbilityUI();
  }

  function updateBossUI() {
    if (!game || !game.boss || !game.boss.alive) {
      dom.bossHud.classList.add("is-hidden");
      return;
    }
    dom.bossHud.classList.remove("is-hidden");
    dom.bossName.textContent = game.boss.bossName;
    const percent = clamp(game.boss.hp / game.boss.maxHp, 0, 1);
    dom.bossFill.style.width = `${percent * 100}%`;
    dom.bossHpText.textContent = `${Math.ceil(percent * 100)}%`;
  }

  function setAbilityCooldown(button, label, remaining, total) {
    const cooling = remaining > 0.03;
    button.classList.toggle("is-cooling", cooling);
    button.disabled = cooling;
    if (cooling) {
      button.style.setProperty("--cd-angle", `${clamp(remaining / total, 0, 1) * 360}deg`);
      label.textContent = String(Math.ceil(remaining));
    } else {
      button.style.setProperty("--cd-angle", "0deg");
      label.textContent = "";
    }
  }

  function updateAbilityUI() {
    if (!game) {
      setAbilityCooldown(dom.dashButton, dom.dashCdText, 0, 1);
      setAbilityCooldown(dom.bombButton, dom.bombCdText, 0, 1);
      return;
    }
    setAbilityCooldown(dom.dashButton, dom.dashCdText, game.dashCooldown, game.stats.dashCooldown);
    setAbilityCooldown(dom.bombButton, dom.bombCdText, game.bombCooldown, game.stats.bombCooldown);
  }

  function getUpgradePool() {
    return RUN_UPGRADES.filter((upgrade) => (game.upgrades[upgrade.id] || 0) < upgrade.max);
  }

  function pickUpgradeCards() {
    const pool = getUpgradePool();
    const weighted = [];
    for (const upgrade of pool) {
      const weight = upgrade.rarity === "epic" ? 2 : upgrade.rarity === "rare" ? 2 : 3;
      for (let i = 0; i < weight; i += 1) weighted.push(upgrade);
    }
    const chosen = [];
    const used = new Set();
    let attempts = 0;
    while (chosen.length < 3 && attempts < 90 && weighted.length > 0) {
      attempts += 1;
      const candidate = weighted[Math.floor(Math.random() * weighted.length)];
      if (!candidate || used.has(candidate.id)) continue;
      used.add(candidate.id);
      chosen.push(candidate);
    }
    for (const upgrade of pool) {
      if (chosen.length >= 3) break;
      if (!used.has(upgrade.id)) {
        used.add(upgrade.id);
        chosen.push(upgrade);
      }
    }
    return chosen;
  }

  function showLevelUp() {
    if (!game || state.gameMode !== "running") return;
    const cards = pickUpgradeCards();
    if (cards.length === 0) {
      game.pendingLevels = 0;
      return;
    }
    state.gameMode = "levelup";
    clearToasts();
    dom.levelupLevel.textContent = String(game.level);
    dom.upgradeCards.innerHTML = cards.map((upgrade) => {
      const currentLevel = game.upgrades[upgrade.id] || 0;
      return `
        <button class="upgrade-card rarity-${upgrade.rarity}" type="button" data-upgrade-id="${upgrade.id}">
          <span class="upgrade-icon">${ICONS[upgrade.icon]}</span>
          <span class="upgrade-rarity">${RARITY_LABELS[upgrade.rarity]}</span>
          <strong class="upgrade-name">${upgrade.name}</strong>
          <span class="upgrade-desc">${upgrade.desc}</span>
          ${pipsMarkup(currentLevel, upgrade.max, "upgrade-pips")}
        </button>
      `;
    }).join("");
    dom.levelupOverlay.classList.remove("is-hidden");
    dom.levelupOverlay.setAttribute("aria-hidden", "false");
    updateAbilityUI();
    audio.levelUp();
    vibrate([14, 20, 14]);
  }

  function chooseUpgrade(id) {
    if (!game || state.gameMode !== "levelup") return;
    const upgrade = RUN_UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;
    const currentLevel = game.upgrades[id] || 0;
    if (currentLevel >= upgrade.max) return;
    game.upgrades[id] = currentLevel + 1;
    upgrade.apply(game);
    game.pendingLevels = Math.max(0, game.pendingLevels - 1);
    audio.coin();
    vibrate(12);
    updateHUD();
    if (game.pendingLevels > 0) {
      showLevelUp();
    } else {
      dom.levelupOverlay.classList.add("is-hidden");
      dom.levelupOverlay.setAttribute("aria-hidden", "true");
      state.gameMode = "running";
      updateAbilityUI();
    }
  }

  function showBanner(main, sub) {
    if (!dom.waveBanner) return;
    dom.waveBanner.innerHTML = `${sub ? `<small>${sub}</small>` : ""}${main}`;
    dom.waveBanner.classList.add("is-showing");
    if (state.bannerTimer) window.clearTimeout(state.bannerTimer);
    state.bannerTimer = window.setTimeout(() => {
      dom.waveBanner.classList.remove("is-showing");
    }, 1650);
  }

  function startRun() {
    audio.unlock();
    clearToasts();
    hideGameOverlay();
    if (!save.weapons[save.selectedWeapon] || !save.weapons[save.selectedWeapon].unlocked) {
      save.selectedWeapon = "rifle";
      persist();
    }
    game = createRun(save.selectedWeapon);
    camera.x = 0;
    camera.y = 0;
    camera.shake = 0;
    spawnStartingPack();
    state.screen = "game";
    state.gameMode = "running";
    setActiveScreen(null);
    dom.hud.classList.remove("is-hidden");
    dom.bossHud.classList.add("is-hidden");
    dom.damageVignette.classList.remove("is-hit");
    resetJoystick();
    updateHUD();
    updateAbilityUI();
    showBanner("ВОЛНА 1", "БЕЛАЯ ОХОТА НАЧАЛАСЬ");
    audio.ensure();
    if (!save.seenTutorial) {
      save.seenTutorial = true;
      persist();
      const runId = game.id;
      window.setTimeout(() => {
        if (game && game.id === runId && state.gameMode === "running") {
          showToast("Тяни джойстик · оружие стреляет само · рывок спасает жизнь", 4400);
        }
      }, 1600);
    }
  }

  function pauseGame() {
    if (!game || state.gameMode !== "running") return;
    state.gameMode = "paused";
    clearToasts();
    resetJoystick();
    dom.pauseOverlay.classList.remove("is-hidden");
    dom.pauseOverlay.setAttribute("aria-hidden", "false");
    updateSoundUI();
    audio.click();
  }

  function resumeGame() {
    if (!game || state.gameMode !== "paused") return;
    state.gameMode = "running";
    dom.pauseOverlay.classList.add("is-hidden");
    dom.pauseOverlay.setAttribute("aria-hidden", "true");
    resetJoystick();
    audio.click();
  }

  function endRun(reason) {
    if (!game || game.finished) return;
    const g = game;
    g.finished = true;
    state.gameMode = "gameover";
    clearToasts();
    resetJoystick();
    dom.pauseOverlay.classList.add("is-hidden");
    dom.pauseOverlay.setAttribute("aria-hidden", "true");
    dom.levelupOverlay.classList.add("is-hidden");
    dom.levelupOverlay.setAttribute("aria-hidden", "true");
    dom.bossHud.classList.add("is-hidden");
    dom.hud.classList.add("is-hidden");
    dom.damageVignette.classList.remove("is-hit");
    const reward = Math.max(1, Math.floor(g.loot + g.time * 1.05 + g.wave * 6 + g.level * 2));
    g.reward = reward;
    const oldBest = save.bestTime;
    const oldBestWave = save.bestWave;
    const newRecord = g.time > oldBest || g.wave > oldBestWave;
    save.coins += reward;
    save.totalKills += g.kills;
    save.bestTime = Math.max(save.bestTime, g.time);
    save.bestWave = Math.max(save.bestWave, g.wave);
    persist();
    dom.resultTime.textContent = formatTime(g.time);
    dom.resultWave.textContent = String(g.wave);
    dom.resultKills.textContent = String(g.kills);
    dom.resultBosses.textContent = String(g.bossKills);
    dom.rewardCoins.textContent = `+${formatNumber(reward)}`;
    dom.newRecordRibbon.classList.toggle("is-hidden", !newRecord);
    if (reason === "quit") {
      dom.gameoverKicker.textContent = "РЕЙД СВЁРНУТ";
      dom.gameoverTitle.textContent = "ВОЗВРАЩЕНИЕ НА БАЗУ";
      dom.gameoverSubtitle.textContent = "Ты успел уйти из белой мглы. Трофеи и монеты сохранены.";
    } else {
      dom.gameoverKicker.textContent = "ЭКСПЕДИЦИЯ ЗАВЕРШЕНА";
      dom.gameoverTitle.textContent = "БЕЛАЯ МГЛА ПОБЕДИЛА";
      dom.gameoverSubtitle.textContent = "Ты сражался достойно. Прокачай арсенал и возвращайся сильнее.";
    }
    setActiveScreen(null);
    dom.gameoverOverlay.classList.remove("is-hidden");
    dom.gameoverOverlay.setAttribute("aria-hidden", "false");
    audio.tone(120, 52, 0.6, "sine", 0.04);
    vibrate([30, 40, 80]);
    refreshMenuUI();
  }

  function resetJoystick() {
    input.joyX = 0;
    input.joyY = 0;
    input.joyPointerId = null;
    input.keys.clear();
    if (!dom.joystick || !dom.joystickKnob) return;
    dom.joystick.classList.remove("is-active");
    dom.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function updateJoystickFromEvent(event) {
    const rect = dom.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const max = rect.width * 0.3;
    const distance = Math.hypot(dx, dy);
    if (distance > max) {
      dx = (dx / distance) * max;
      dy = (dy / distance) * max;
    }
    input.joyMax = max;
    input.joyX = dx / max;
    input.joyY = dy / max;
    dom.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function bindJoystick() {
    dom.joystick.addEventListener("pointerdown", (event) => {
      if (!game || state.gameMode !== "running") return;
      event.preventDefault();
      input.joyPointerId = event.pointerId;
      dom.joystick.classList.add("is-active");
      try {
        dom.joystick.setPointerCapture(event.pointerId);
      } catch (error) {
        return;
      }
      updateJoystickFromEvent(event);
      audio.unlock();
    });

    dom.joystick.addEventListener("pointermove", (event) => {
      if (input.joyPointerId !== event.pointerId) return;
      event.preventDefault();
      updateJoystickFromEvent(event);
    });

    const endJoystick = (event) => {
      if (input.joyPointerId !== event.pointerId) return;
      input.joyPointerId = null;
      input.joyX = 0;
      input.joyY = 0;
      dom.joystick.classList.remove("is-active");
      dom.joystickKnob.style.transform = "translate(-50%, -50%)";
      try {
        if (dom.joystick.hasPointerCapture(event.pointerId)) {
          dom.joystick.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        return;
      }
    };

    dom.joystick.addEventListener("pointerup", endJoystick);
    dom.joystick.addEventListener("pointercancel", endJoystick);
    dom.joystick.addEventListener("lostpointercapture", () => {
      input.joyPointerId = null;
      input.joyX = 0;
      input.joyY = 0;
      dom.joystick.classList.remove("is-active");
      dom.joystickKnob.style.transform = "translate(-50%, -50%)";
    });
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (state.screen !== "game") {
        if (event.code === "Escape") {
          if (state.screen === "guide" || state.screen === "settings") navigateMenu();
          else if (state.screen === "armory") closePanel();
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        input.keys.add(event.code);
      }
      if (event.repeat) return;
      if (event.code === "Escape" || event.code === "KeyP") {
        if (state.gameMode === "running") pauseGame();
        else if (state.gameMode === "paused") resumeGame();
        return;
      }
      if (state.gameMode === "running") {
        if (event.code === "Space" || event.code === "ShiftLeft" || event.code === "ShiftRight") {
          tryDash();
        } else if (event.code === "KeyQ" || event.code === "KeyE") {
          tryBomb();
        }
      }
    });

    window.addEventListener("keyup", (event) => input.keys.delete(event.code));
    window.addEventListener("blur", () => input.keys.clear());
  }

  function bindUIEvents() {
    document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
    dom.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    dom.playButton.addEventListener("click", () => {
      audio.click();
      startRun();
    });
    dom.retryButton.addEventListener("click", () => {
      audio.click();
      startRun();
    });
    dom.menuCoinsButton.addEventListener("click", () => {
      openPanel("armory", "menu");
      audio.click();
    });
    dom.armoryButton.addEventListener("click", () => {
      openPanel("armory", "menu");
      audio.click();
    });
    dom.guideButton.addEventListener("click", openGuide);
    dom.settingsButton.addEventListener("click", openSettings);
    dom.armoryBackButton.addEventListener("click", () => {
      audio.click();
      closePanel();
    });
    dom.guideBackButton.addEventListener("click", () => {
      audio.click();
      navigateMenu();
    });
    dom.guideDoneButton.addEventListener("click", () => {
      audio.click();
      navigateMenu();
    });
    dom.settingsBackButton.addEventListener("click", () => {
      audio.click();
      navigateMenu();
    });
    dom.weaponsTab.addEventListener("click", () => setArmoryTab("weapons"));
    dom.skillsTab.addEventListener("click", () => setArmoryTab("skills"));
    dom.armoryContent.addEventListener("click", handleArmoryClick);
    dom.installButton.addEventListener("click", requestInstall);
    dom.installSettingsButton.addEventListener("click", requestInstall);
    dom.soundToggle.addEventListener("click", toggleSound);
    dom.vibrationToggle.addEventListener("click", toggleVibration);
    dom.resetButton.addEventListener("click", requestReset);
    dom.confirmCancelButton.addEventListener("click", cancelReset);
    dom.confirmResetButton.addEventListener("click", confirmReset);

    dom.pauseButton.addEventListener("click", pauseGame);
    dom.pauseResumeButton.addEventListener("click", resumeGame);
    dom.pauseSoundButton.addEventListener("click", () => {
      toggleSound();
      updateSoundUI();
    });
    dom.pauseQuitButton.addEventListener("click", () => {
      if (game) endRun("quit");
    });

    dom.gameoverMenuButton.addEventListener("click", () => {
      audio.click();
      navigateMenu();
    });
    dom.gameoverArmoryButton.addEventListener("click", () => {
      openPanel("armory", "gameover");
      audio.click();
    });

    dom.upgradeCards.addEventListener("click", (event) => {
      const card = event.target.closest("[data-upgrade-id]");
      if (card) chooseUpgrade(card.getAttribute("data-upgrade-id"));
    });

    dom.dashButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      tryDash();
    });
    dom.bombButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      tryBomb();
    });

    bindJoystick();
    bindKeyboard();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", () => window.setTimeout(resizeCanvas, 180));
    if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.gameMode === "running") pauseGame();
    });
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      updateInstallState();
    });
    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      state.isStandalone = true;
      updateInstallState();
      showToast("Игра установлена. Ищи её на главном экране.", 3500);
    });

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const handleDisplayMode = () => {
      state.isStandalone = displayMode.matches || window.navigator.standalone === true;
      updateInstallState();
    };
    if (displayMode.addEventListener) displayMode.addEventListener("change", handleDisplayMode);
    state.isStandalone = displayMode.matches || window.navigator.standalone === true;
  }

  const ctx = dom.canvas.getContext("2d");

  function resizeCanvas() {
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    view.w = view.width;
    view.h = view.height;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.zoom = clamp(Math.min(view.width / 520, view.height / 880), 0.72, 1.2);
    dom.canvas.width = Math.max(1, Math.round(view.width * view.dpr));
    dom.canvas.height = Math.max(1, Math.round(view.height * view.dpr));
    dom.canvas.style.width = `${view.width}px`;
    dom.canvas.style.height = `${view.height}px`;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const desired = clamp(Math.round((view.width * view.height) / 7800), 45, 160);
    snow = Array.from({ length: desired }, () => ({
      x: Math.random() * view.width,
      y: Math.random() * view.height,
      depth: rand(0.3, 1),
      radius: rand(0.8, 2.5),
      speed: rand(11, 38),
      drift: rand(-7, 14),
      phase: rand(0, TAU),
    }));
  }

  function updateSnow(dt) {
    for (const flake of snow) {
      flake.phase += dt * (0.4 + flake.depth);
      flake.x += (flake.drift + windPhase * 7 + Math.sin(flake.phase) * 8) * dt;
      flake.y += flake.speed * (0.6 + flake.depth) * dt;
      if (flake.y > view.height + 10) {
        flake.y = -10;
        flake.x = Math.random() * view.width;
      }
      if (flake.x < -12) flake.x = view.width + 10;
      if (flake.x > view.width + 12) flake.x = -10;
    }
  }

  function drawSnowfall() {
    ctx.save();
    for (const flake of snow) {
      ctx.globalAlpha = 0.22 + flake.depth * 0.55;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(flake.x, flake.y, flake.radius, flake.radius * 1.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPine(x, y, height, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(-height * 0.018, -height * 0.2, height * 0.036, height * 0.2);
    for (let i = 0; i < 4; i += 1) {
      const base = height * (0.16 + i * 0.19);
      const spread = height * (0.3 - i * 0.045);
      const top = -height * (0.25 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(spread, base);
      ctx.quadraticCurveTo(0, base - height * 0.035, -spread, base);
      ctx.closePath();
      ctx.fill();
      if (i === 3) {
        ctx.fillStyle = "rgba(238,248,255,.22)";
        ctx.beginPath();
        ctx.moveTo(0, top);
        ctx.lineTo(spread * 0.6, base - height * 0.05);
        ctx.quadraticCurveTo(0, base - height * 0.08, -spread * 0.6, base - height * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = color;
      }
    }
    ctx.restore();
  }

  function drawMountainRange(baseY, amplitude, color, offset, step) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-40, view.height);
    ctx.lineTo(-40, baseY);
    for (let x = -40; x <= view.width + 60; x += step) {
      const seed = Math.sin((x + offset) * 0.0071) * 0.55 + Math.sin((x + offset) * 0.017) * 0.3;
      const peak = baseY - amplitude * (0.45 + Math.abs(seed) * 0.85);
      const midX = x + step * 0.48;
      ctx.lineTo(midX - step * 0.15, peak);
      ctx.lineTo(midX + step * 0.12, baseY - amplitude * 0.1);
    }
    ctx.lineTo(view.width + 60, view.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMenuScene() {
    const w = view.width;
    const h = view.height;
    const t = state.menuTime;
    const horizon = h * 0.5;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#040c15");
    sky.addColorStop(0.34, "#0d2537");
    sky.addColorStop(0.62, "#315b72");
    sky.addColorStop(0.76, "#9bb8c9");
    sky.addColorStop(1, "#dbeaf3");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (let i = 0; i < 70; i += 1) {
      const sx = hashString(`star${i}`) * w;
      const sy = hashString(`sky${i}`) * horizon * 0.62;
      const twinkle = 0.35 + Math.sin(t * 1.7 + i) * 0.3;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = i % 9 === 0 ? "#bfeeff" : "#e6f6ff";
      ctx.fillRect(sx, sy, i % 11 === 0 ? 1.6 : 1, i % 11 === 0 ? 1.6 : 1);
    }
    ctx.restore();

    const moonX = w * 0.75;
    const moonY = h * 0.2;
    const moonRadius = clamp(w * 0.12, 34, 75);
    const glow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.2, moonX, moonY, moonRadius * 3.2);
    glow.addColorStop(0, "rgba(213,246,255,.38)");
    glow.addColorStop(0.45, "rgba(151,218,244,.12)");
    glow.addColorStop(1, "rgba(151,218,244,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#e8f7ff";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(163,198,217,.35)";
    ctx.beginPath();
    ctx.arc(moonX - moonRadius * 0.28, moonY - moonRadius * 0.2, moonRadius * 0.17, 0, TAU);
    ctx.arc(moonX + moonRadius * 0.22, moonY + moonRadius * 0.3, moonRadius * 0.11, 0, TAU);
    ctx.arc(moonX + moonRadius * 0.08, moonY - moonRadius * 0.42, moonRadius * 0.08, 0, TAU);
    ctx.fill();

    const aurora = ctx.createLinearGradient(0, h * 0.08, 0, h * 0.48);
    aurora.addColorStop(0, "rgba(87, 234, 209, 0)");
    aurora.addColorStop(0.35, "rgba(83, 230, 203, .13)");
    aurora.addColorStop(0.65, "rgba(110, 168, 255, .09)");
    aurora.addColorStop(1, "rgba(110, 168, 255, 0)");
    ctx.fillStyle = aurora;
    ctx.beginPath();
    ctx.moveTo(-20, h * 0.18);
    ctx.bezierCurveTo(w * 0.28, h * (0.04 + Math.sin(t * 0.22) * 0.02), w * 0.58, h * 0.3, w + 30, h * 0.14);
    ctx.lineTo(w + 30, h * 0.42);
    ctx.bezierCurveTo(w * 0.6, h * 0.35, w * 0.3, h * 0.28, -20, h * 0.4);
    ctx.closePath();
    ctx.fill();

    drawMountainRange(horizon + h * 0.01, h * 0.23, "#6d91aa", 120, w * 0.22);
    drawMountainRange(horizon + h * 0.045, h * 0.16, "#51768f", 430, w * 0.17);

    const field = ctx.createLinearGradient(0, horizon, 0, h);
    field.addColorStop(0, "#c4dbe7");
    field.addColorStop(0.4, "#b1cedf");
    field.addColorStop(1, "#e8f3f9");
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.moveTo(0, horizon + h * 0.03);
    ctx.bezierCurveTo(w * 0.3, horizon - h * 0.015, w * 0.6, horizon + h * 0.055, w, horizon + h * 0.015);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(198,220,234,.65)";
    ctx.beginPath();
    ctx.ellipse(w * 0.24, horizon + h * 0.05, w * 0.3, h * 0.022, -0.03, 0, TAU);
    ctx.fill();

    for (let i = 0; i < 15; i += 1) {
      const px = (hashString(`pine${i}`) * 1.15 - 0.08) * w;
      const side = Math.abs(px - w / 2) / (w / 2);
      const ph = h * (0.055 + hashString(`pineh${i}`) * 0.08) * (0.75 + side * 0.7);
      const py = horizon + h * 0.035 + hashString(`piney${i}`) * h * 0.035;
      drawPine(px, py, ph, i % 3 === 0 ? "#1b3342" : "#254454", 0.88 - side * 0.1);
    }

    const bearBaseX = w * 0.72;
    const bearBaseY = horizon + h * 0.095;
    const bearScale = clamp(w / 380, 0.85, 1.65);
    const bearBob = Math.sin(t * 0.9) * 2;
    drawSideBear(bearBaseX + 58 * bearScale, bearBaseY + bearBob - 12 * bearScale, bearScale * 0.88, -0.12, "#dceaf2", 0.55);
    drawSideBear(bearBaseX, bearBaseY + bearBob, bearScale * 1.18, 0, "#edf7fb", 1);
    drawSideBear(bearBaseX - 66 * bearScale, bearBaseY + 9 * bearScale, bearScale * 0.8, 0.1, "#c8dbe6", 0.5);

    const survivorX = w * 0.28;
    const survivorY = horizon + h * 0.14;
    const flash = t % 2.6 < 0.09 ? 1 : 0;
    drawSideSurvivor(survivorX, survivorY + Math.sin(t * 1.6) * 1.2, bearScale, flash);
    if (flash) {
      const flare = ctx.createRadialGradient(survivorX + 66 * bearScale, survivorY - 14 * bearScale, 2, survivorX + 66 * bearScale, survivorY - 14 * bearScale, 100);
      flare.addColorStop(0, "rgba(255,247,196,.95)");
      flare.addColorStop(0.22, "rgba(255,194,76,.5)");
      flare.addColorStop(1, "rgba(255,163,44,0)");
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(survivorX + 66 * bearScale, survivorY - 14 * bearScale, 100, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(246, 252, 255, .38)";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.bezierCurveTo(w * 0.24, h * 0.83, w * 0.5, h * 0.93, w, h * 0.86);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(w / 2, h * 0.48, h * 0.1, w / 2, h * 0.52, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(2,8,14,.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    drawSnowfall();
  }

  function drawSideBear(x, y, scale, lean, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(21, 46, 62, .28)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 72, 10, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#355263";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.fillStyle = "#afc8d5";
    ctx.beginPath();
    ctx.ellipse(-50, 22, 10, 17, 0.15, 0, TAU);
    ctx.ellipse(-24, 24, 11, 18, 0.04, 0, TAU);
    ctx.ellipse(22, 25, 11, 18, -0.06, 0, TAU);
    ctx.ellipse(46, 22, 9, 16, -0.12, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-56, -2);
    ctx.bezierCurveTo(-58, -26, -42, -38, -18, -36);
    ctx.bezierCurveTo(4, -35, 20, -28, 34, -20);
    ctx.bezierCurveTo(52, -12, 64, 0, 60, 14);
    ctx.bezierCurveTo(58, 26, 44, 28, 30, 24);
    ctx.bezierCurveTo(4, 18, -26, 20, -50, 18);
    ctx.bezierCurveTo(-62, 16, -64, 4, -56, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, -20);
    ctx.bezierCurveTo(44, -38, 62, -46, 72, -34);
    ctx.bezierCurveTo(80, -24, 78, -6, 66, 2);
    ctx.bezierCurveTo(56, 8, 42, 2, 36, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b7ccd9";
    ctx.beginPath();
    ctx.ellipse(59, -32, 7, 6, -0.7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(70, -4);
    ctx.quadraticCurveTo(84, -2, 83, 3);
    ctx.quadraticCurveTo(78, 8, 69, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#152b38";
    ctx.beginPath();
    ctx.ellipse(78, 1, 4, 3, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(64, -14, 2.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#91b3c6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-44, -28);
    ctx.quadraticCurveTo(-20, -38, 2, -27);
    ctx.stroke();
    ctx.restore();
  }

  function drawSideSurvivor(x, y, scale, flash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(23, 48, 63, .3)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 31, 7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#253b48";
    ctx.beginPath();
    ctx.ellipse(-8, 24, 7, 14, 0.1, 0, TAU);
    ctx.ellipse(8, 24, 7, 14, -0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#b73433";
    ctx.strokeStyle = "#60282a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.quadraticCurveTo(0, -24, 15, -14);
    ctx.lineTo(13, 20);
    ctx.quadraticCurveTo(0, 27, -13, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f4e9dd";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-11, -12);
    ctx.lineTo(11, -10);
    ctx.stroke();
    ctx.fillStyle = "#c7dae5";
    ctx.beginPath();
    ctx.arc(0, -26, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ecc2a2";
    ctx.beginPath();
    ctx.arc(3, -25, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8e2828";
    ctx.beginPath();
    ctx.arc(1, -30, 8, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = "#223b48";
    ctx.beginPath();
    ctx.arc(7, -25, 1.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#84302b";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(31, -14);
    ctx.stroke();
    ctx.fillStyle = "#2d3c45";
    ctx.fillRect(22, -17, 39, 5);
    ctx.fillStyle = "#7597a9";
    ctx.fillRect(35, -20, 16, 3);
    ctx.fillStyle = "#402d22";
    ctx.fillRect(16, -19, 9, 8);
    if (flash) {
      ctx.fillStyle = "#fff2a6";
      ctx.beginPath();
      ctx.moveTo(61, -15);
      ctx.lineTo(78, -23);
      ctx.lineTo(72, -13);
      ctx.lineTo(80, -8);
      ctx.lineTo(61, -11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function hashString(value) {
    let seed = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    seed ^= seed >>> 13;
    return (Math.imul(seed, 1274126177) >>> 0) / 4294967296;
  }

  function drawArenaBackground() {
    const w = view.width;
    const h = view.height;
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#c6dde9");
    base.addColorStop(0.48, "#dcecf4");
    base.addColorStop(1, "#bcd5e3");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-camera.x, -camera.y);

    const halfW = w / (2 * view.zoom) + 180;
    const halfH = h / (2 * view.zoom) + 180;
    const left = camera.x - halfW;
    const right = camera.x + halfW;
    const top = camera.y - halfH;
    const bottom = camera.y + halfH;
    ctx.fillStyle = "rgba(225, 240, 248, .52)";
    ctx.fillRect(left, top, right - left, bottom - top);

    const cell = 190;
    const startX = Math.floor(left / cell);
    const endX = Math.ceil(right / cell);
    const startY = Math.floor(top / cell);
    const endY = Math.ceil(bottom / cell);
    for (let ix = startX; ix <= endX; ix += 1) {
      for (let iy = startY; iy <= endY; iy += 1) {
        const seed = hash2(ix * 3 + 11, iy * 7 - 13);
        const x = (ix + 0.5) * cell + (seed - 0.5) * 62;
        const y = (iy + 0.5) * cell + (hash2(ix + 4, iy + 9) - 0.5) * 62;
        const driftAngle = (hash2(ix + 5, iy + 4) - 0.5) * 0.7;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(driftAngle);
        ctx.strokeStyle = "rgba(133, 170, 190, .08)";
        ctx.lineWidth = 13;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-44, 18);
        ctx.quadraticCurveTo(-8, 3, 40, 12);
        ctx.stroke();
        ctx.strokeStyle = "rgba(250, 254, 255, .28)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-38, 14);
        ctx.quadraticCurveTo(-4, -1, 45, 8);
        ctx.stroke();
        ctx.restore();
        if (seed > 0.82) {
          ctx.fillStyle = "rgba(137, 185, 208, .23)";
          ctx.beginPath();
          ctx.ellipse(x, y, 38 + seed * 27, 14 + seed * 12, seed * 3, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(212, 237, 248, .28)";
          ctx.beginPath();
          ctx.ellipse(x - 4, y - 2, 26 + seed * 18, 8 + seed * 7, seed * 3, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "rgba(104, 151, 176, .22)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x - 30, y + 9);
          ctx.lineTo(x - 5, y + 4);
          ctx.lineTo(x + 14, y + 14);
          ctx.lineTo(x + 34, y + 7);
          ctx.stroke();
        } else if (seed < 0.12) {
          ctx.fillStyle = "rgba(247, 252, 255, .44)";
          ctx.beginPath();
          ctx.ellipse(x, y, 52, 15, seed * 6, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(189, 218, 232, .2)";
          ctx.beginPath();
          ctx.ellipse(x + 10, y + 4, 38, 7, seed * 6, 0, TAU);
          ctx.fill();
        } else if (seed > 0.46 && seed < 0.5) {
          const rock = 0.82 + hash2(ix + 7, iy + 6) * 0.4;
          ctx.fillStyle = "rgba(67, 99, 114, .26)";
          ctx.beginPath();
          ctx.ellipse(x + 5, y + 6, 15 * rock, 8 * rock, 0.4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(121, 155, 169, .72)";
          ctx.beginPath();
          ctx.ellipse(x, y + 1, 11 * rock, 6.5 * rock, 0.4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(236, 247, 253, .76)";
          ctx.beginPath();
          ctx.ellipse(x - 2, y - 1.5, 8 * rock, 3.8 * rock, 0.4, 0, TAU);
          ctx.fill();
        } else if (seed > 0.56 && seed < 0.61) {
          const shrub = 0.8 + hash2(ix + 8, iy + 2) * 0.35;
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = "rgba(49, 84, 84, .18)";
          ctx.beginPath();
          ctx.ellipse(3, 5, 20 * shrub, 9 * shrub, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(88, 118, 106, .55)";
          ctx.beginPath();
          ctx.arc(-8 * shrub, 0, 7 * shrub, 0, TAU);
          ctx.arc(0, -5 * shrub, 8.5 * shrub, 0, TAU);
          ctx.arc(9 * shrub, 1, 6.5 * shrub, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "rgba(232, 247, 250, .55)";
          ctx.beginPath();
          ctx.ellipse(-1, -7 * shrub, 7 * shrub, 2.4 * shrub, -0.15, 0, TAU);
          ctx.fill();
          ctx.restore();
        } else if (seed > 0.27 && seed < 0.3) {
          ctx.fillStyle = "rgba(78, 113, 123, .32)";
          for (let track = 0; track < 4; track += 1) {
            const tx = x - 32 + track * 20;
            const ty = y + Math.sin(track * 1.7 + ix) * 7;
            const flip = track % 2 === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.arc(tx, ty - 4 * flip, 2.2, 0, TAU);
            ctx.arc(tx - 3, ty + 1.5 * flip, 1.5, 0, TAU);
            ctx.arc(tx + 3, ty + 1.5 * flip, 1.5, 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    ctx.strokeStyle = "rgba(116, 156, 177, .13)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const sx = (hash2(i + 3, 17) - 0.5) * 2400;
      const sy = (hash2(i + 9, 21) - 0.5) * 2400;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 60, sy + 8, sx + 84, sy - 23, sx + 148, sy + 2);
      ctx.stroke();
    }

    ctx.restore();

    const cold = ctx.createRadialGradient(w / 2, h * 0.38, h * 0.05, w / 2, h * 0.48, Math.max(w, h) * 0.8);
    cold.addColorStop(0, "rgba(255,255,255,.03)");
    cold.addColorStop(0.68, "rgba(72, 122, 150, .04)");
    cold.addColorStop(1, "rgba(24, 69, 96, .24)");
    ctx.fillStyle = cold;
    ctx.fillRect(0, 0, w, h);
  }

  function drawFootprints() {
    if (!game) return;
    for (const footprint of game.footprints) {
      const alpha = (1 - footprint.age / footprint.life) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(footprint.x, footprint.y);
      ctx.rotate(footprint.angle);
      ctx.fillStyle = "rgba(102, 142, 162, .7)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.4, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawOrbs() {
    if (!game) return;
    for (const orb of game.orbs) {
      const bob = Math.sin(orb.phase) * 3;
      if (orb.type === "health") {
        ctx.save();
        ctx.translate(orb.x, orb.y + bob);
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
        glow.addColorStop(0, "rgba(166,255,173,.55)");
        glow.addColorStop(1, "rgba(104,255,153,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#f4fff2";
        ctx.strokeStyle = "#3baf62";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-9, -7, 18, 14, 4) : ctx.rect(-9, -7, 18, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#48c76e";
        ctx.fillRect(-1.8, -4, 3.6, 8);
        ctx.fillRect(-4.5, -1.2, 9, 3.4);
        ctx.restore();
      } else {
        const size = orb.big ? 14 : 7;
        ctx.save();
        ctx.translate(orb.x, orb.y + bob);
        ctx.rotate(orb.phase * 0.4);
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 2.4);
        glow.addColorStop(0, "rgba(126, 239, 255, .62)");
        glow.addColorStop(1, "rgba(79, 202, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = orb.big ? "#eaffff" : "#c7f5ff";
        ctx.strokeStyle = orb.big ? "#6cd5ff" : "#3fa9d3";
        ctx.lineWidth = orb.big ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawBullets() {
    if (!game) return;
    ctx.save();
    ctx.lineCap = "round";
    for (const bullet of game.bullets) {
      ctx.strokeStyle = bullet.color;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = bullet.weaponId === "crossbow" ? 4.5 : 3;
      ctx.beginPath();
      ctx.moveTo(bullet.x - bullet.vx * 0.018, bullet.y - bullet.vy * 0.018);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      if (bullet.weaponId === "crossbow") {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
        ctx.fillRect(-8, -1.2, 13, 2.4);
        ctx.restore();
      } else {
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawGrenades() {
    if (!game) return;
    for (const grenade of game.grenades) {
      const height = grenade.height;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#284a5c";
      ctx.beginPath();
      ctx.ellipse(grenade.x, grenade.y, 7 - height * 0.018, 3.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(grenade.x, grenade.y - height);
      ctx.rotate(grenade.t * 13);
      ctx.fillStyle = "#e68b32";
      ctx.strokeStyle = "#69391b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4b3829";
      ctx.fillRect(-2.5, -10, 5, 4);
      ctx.restore();
    }
  }

  function drawParticles() {
    if (!game) return;
    for (const particle of game.particles) {
      const progress = 1 - clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / particle.maxLife)) * (particle.type === "smoke" ? 0.8 : 1);
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      if (particle.type === "spark") {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * (1 - progress * 0.5), 0, TAU);
        ctx.fill();
      } else if (particle.type === "fur" || particle.type === "shard") {
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(particle.size * 0.65, particle.size * 0.7);
        ctx.lineTo(-particle.size * 0.5, particle.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else if (particle.type === "flash") {
        const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
        flash.addColorStop(0, "rgba(255,255,222,.95)");
        flash.addColorStop(0.4, particle.color);
        flash.addColorStop(1, "rgba(255,178,54,0)");
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, TAU);
        ctx.fill();
      } else if (particle.type === "smoke") {
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * (0.7 + progress * 1.1), 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * (1 - progress * 0.35), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawRings() {
    if (!game) return;
    ctx.save();
    for (const ring of game.rings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2 + alpha * 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDamageTexts() {
    if (!game) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const text of game.damageTexts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      const size = text.crit ? 22 : text.explosion ? 17 : 13;
      ctx.font = `${text.crit ? 400 : 800} ${size}px ${text.crit ? '"Russo One"' : "Manrope"}, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(14, 38, 52, .72)";
      ctx.fillStyle = text.heal ? "#9dffb0" : text.crit ? "#ffe072" : "#ffffff";
      ctx.strokeText(text.value, text.x, text.y);
      ctx.fillText(text.value, text.x, text.y);
    }
    ctx.restore();
  }

  function drawPlayer(p) {
    const flicker = p.invuln > 0 ? 0.58 + Math.sin(p.invuln * 60) * 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = "rgba(22, 49, 64, .3)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 17, 29, 10, 0, 0, TAU);
    ctx.fill();
    ctx.translate(p.x, p.y);
    ctx.scale(1.18, 1.18);
    ctx.rotate(p.bodyAngle);
    const stride = Math.sin(p.walk) * (p.moving ? 9 : 1.5);
    ctx.strokeStyle = "#2a333a";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-5 + stride, -13);
    ctx.moveTo(-7, 8);
    ctx.lineTo(-3 - stride, 13);
    ctx.stroke();
    ctx.fillStyle = "#30363b";
    ctx.beginPath();
    ctx.ellipse(-3 + stride, -14, 6.4, 3.7, -0.15, 0, TAU);
    ctx.ellipse(-1 - stride, 14, 6.4, 3.7, 0.15, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#6b241f";
    ctx.strokeStyle = "#321b1c";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(-17, 0, 12, 14, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d7a05a";
    ctx.fillRect(-20, -8, 5, 16);
    ctx.fillStyle = "#6e3321";
    ctx.fillRect(-20, -8, 5, 3);

    ctx.fillStyle = "#bd3a34";
    ctx.strokeStyle = "#5c2526";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 20, 15.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 120, 104, .3)";
    ctx.beginPath();
    ctx.ellipse(-2, -5, 13, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#f1e8da";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-14, -7);
    ctx.quadraticCurveTo(-10, 0, -14, 8);
    ctx.stroke();

    ctx.save();
    ctx.translate(11, 0);
    ctx.rotate(-0.05 + Math.sin(p.walk * 2) * 0.04);
    ctx.fillStyle = "#e4eef5";
    ctx.strokeStyle = "#7897a8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10.7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#efc3a4";
    ctx.beginPath();
    ctx.arc(2.6, 0, 7.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#324452";
    ctx.beginPath();
    ctx.arc(4.6, -2.5, 1.15, 0, TAU);
    ctx.arc(4.6, 2.5, 1.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#b03a32";
    ctx.beginPath();
    ctx.arc(1.5, 0, 9, Math.PI * 0.86, Math.PI * 1.14);
    ctx.lineTo(2.5, -7.4);
    ctx.fill();
    ctx.fillStyle = "#fff4e7";
    ctx.beginPath();
    ctx.moveTo(-1, 8);
    ctx.lineTo(8, 10);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#a92e2a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(5, -9);
    ctx.lineTo(16, -10);
    ctx.moveTo(5, 9);
    ctx.lineTo(17, 7);
    ctx.stroke();

    const scarfWave = Math.sin(p.walk * 2) * 3;
    ctx.strokeStyle = "#f2e7d7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(5, -2);
    ctx.bezierCurveTo(-7, -5, -19, -4 + scarfWave, -27, -8 + scarfWave);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1.18, 1.18);
    ctx.rotate(p.aim);
    ctx.strokeStyle = "#7c4a36";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(4, 7);
    ctx.lineTo(21, 7);
    ctx.stroke();
    ctx.fillStyle = "#243c49";
    ctx.strokeStyle = "#101e27";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, 2);
    ctx.lineTo(-15, 5);
    ctx.lineTo(-11, 11);
    ctx.lineTo(6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#466270";
    ctx.fillRect(6, 4, 35, 4.4);
    ctx.fillStyle = "#8ca7b5";
    ctx.fillRect(29, 2, 11, 3);
    ctx.fillStyle = "#4c3324";
    ctx.fillRect(15, 1, 8, 3.4);
    ctx.strokeStyle = "#d5e6ee";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(16.5, 1.5, 5, 2.2);
    ctx.fillStyle = "#a68f66";
    ctx.beginPath();
    ctx.arc(8, 6, 2.6, 0, TAU);
    ctx.fill();
    if (p.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(255, 243, 173, .92)";
      ctx.beginPath();
      ctx.moveTo(40, 6.2);
      ctx.lineTo(57, 1);
      ctx.lineTo(50, 6.2);
      ctx.lineTo(58, 10);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#6f8997";
      ctx.fillRect(40, 5.7, 3, 3);
    }
    ctx.restore();
  }

  function drawBear(bear) {
    const r = bear.radius;
    const isBoss = bear.isBoss;
    const pulse = bear.attackPulse > 0 ? Math.sin((0.22 - bear.attackPulse) / 0.22 * Math.PI) * 0.12 : 0;
    const walk = Math.sin(bear.walk) * (bear.charging > 0 ? 6 : 3.5);
    if (bear.charging > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = "#f6fdff";
      ctx.lineWidth = 3;
      for (let i = 1; i <= 4; i += 1) {
        const offset = i * 14;
        ctx.beginPath();
        ctx.moveTo(bear.x - bear.chargeX * (r + offset) - bear.chargeY * r * 0.5, bear.y - bear.chargeY * (r + offset) + bear.chargeX * r * 0.5);
        ctx.lineTo(bear.x - bear.chargeX * (r + offset) + bear.chargeY * r * 0.4, bear.y - bear.chargeY * (r + offset) - bear.chargeX * r * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (isBoss && bear.chargeWindup > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 105, 68, ${0.35 + Math.sin(bear.chargeWindup * 34) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bear.x, bear.y, r * (1.5 + Math.sin(bear.chargeWindup * 12) * 0.08), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    const artScale = isBoss ? 1.05 : 1.34;
    ctx.save();
    ctx.fillStyle = "rgba(26, 54, 68, .32)";
    ctx.beginPath();
    ctx.ellipse(bear.x, bear.y + r * 0.78, r * artScale * 1.05, r * artScale * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.translate(bear.x, bear.y);
    ctx.rotate(bear.angle);
    ctx.scale((1 + pulse) * artScale, (1 - pulse * 0.35) * artScale);

    const bodyColor = bear.bodyColor || (bear.type === "boss" ? "#e3eff5" : "#edf6fa");
    const shadeColor = bear.shadeColor || "#c4dae4";
    ctx.fillStyle = shadeColor;
    ctx.strokeStyle = "#3e6275";
    ctx.lineWidth = Math.max(1.7, 2.3 * bear.scale);
    ctx.lineJoin = "round";
    const legSwing = walk * 0.45;
    ctx.beginPath();
    ctx.ellipse(-r * 0.56 + legSwing, -r * 0.46, r * 0.24, r * 0.14, -0.18, 0, TAU);
    ctx.ellipse(-r * 0.56 - legSwing, r * 0.46, r * 0.24, r * 0.14, 0.18, 0, TAU);
    ctx.ellipse(r * 0.52 - legSwing, -r * 0.48, r * 0.22, r * 0.13, -0.1, 0, TAU);
    ctx.ellipse(r * 0.52 + legSwing, r * 0.48, r * 0.22, r * 0.13, 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(62, 98, 117, .7)";
    ctx.lineWidth = Math.max(1, 1.35 * bear.scale);
    ctx.stroke();

    ctx.fillStyle = "rgba(65, 95, 109, .32)";
    ctx.beginPath();
    ctx.ellipse(-r * 1.02, 0, r * 0.2, r * 0.13, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = "#365a6d";
    ctx.lineWidth = Math.max(2, 2.6 * bear.scale);
    ctx.beginPath();
    ctx.ellipse(-r * 0.08, 0, r * 0.92, r * 0.56, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(251, 255, 255, .42)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, -r * 0.16, r * 0.66, r * 0.26, -0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(116, 153, 170, .16)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.18, r * 0.22, r * 0.6, r * 0.22, 0.05, 0, TAU);
    ctx.fill();

    ctx.fillStyle = shadeColor;
    ctx.strokeStyle = "#426579";
    ctx.lineWidth = Math.max(1.2, 1.6 * bear.scale);
    ctx.beginPath();
    ctx.ellipse(r * 0.6, -r * 0.32, r * 0.15, r * 0.14, -0.3, 0, TAU);
    ctx.ellipse(r * 0.6, r * 0.32, r * 0.15, r * 0.14, 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(r * 0.79, 0, r * 0.37, r * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8aa9b8";
    ctx.beginPath();
    ctx.ellipse(r * 0.79, -r * 0.32, r * 0.07, r * 0.06, -0.3, 0, TAU);
    ctx.ellipse(r * 0.79, r * 0.32, r * 0.07, r * 0.06, 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f8fbfc";
    ctx.beginPath();
    ctx.ellipse(r * 1.07, r * 0.02, r * 0.28, r * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#263c48";
    ctx.beginPath();
    ctx.ellipse(r * 1.26, -r * 0.01, r * 0.1, r * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#4d6571";
    ctx.lineWidth = Math.max(1, 1.4 * bear.scale);
    ctx.beginPath();
    ctx.moveTo(r * 1.02, r * 0.13);
    ctx.quadraticCurveTo(r * 1.1, r * 0.21, r * 1.2, r * 0.08);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108, 143, 158, .55)";
    ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath();
    ctx.moveTo(r * 0.49, -r * 0.26);
    ctx.quadraticCurveTo(r * 0.55, 0, r * 0.49, r * 0.26);
    ctx.stroke();

    if (isBoss) {
      ctx.fillStyle = "#f1d15d";
      ctx.strokeStyle = "#665025";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r * 0.85, -r * 0.14, r * 0.047, 0, TAU);
      ctx.arc(r * 0.85, r * 0.14, r * 0.047, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(155, 222, 244, .9)";
      ctx.strokeStyle = "#497d94";
      ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i += 1) {
        const sx = i * r * 0.25 - r * 0.05;
        ctx.beginPath();
        ctx.moveTo(sx - r * 0.06, -r * 0.47);
        ctx.lineTo(sx, -r * (0.78 + Math.abs(i) * -0.04));
        ctx.lineTo(sx + r * 0.07, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#233a46";
      ctx.beginPath();
      ctx.arc(r * 0.84, -r * 0.15, Math.max(1.4, r * 0.052), 0, TAU);
      ctx.arc(r * 0.84, r * 0.15, Math.max(1.4, r * 0.052), 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.795, -r * 0.169, Math.max(0.5, r * 0.017), 0, TAU);
      ctx.arc(r * 0.795, r * 0.131, Math.max(0.5, r * 0.017), 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fill();
      ctx.strokeStyle = "rgba(44, 68, 80, .72)";
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(r * 1.04, r * 0.17);
      ctx.lineTo(r * 1.14, r * 0.2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(112, 151, 168, .45)";
    ctx.lineWidth = Math.max(0.8, r * 0.025);
    for (let i = 0; i < 4; i += 1) {
      const fx = -r * 0.6 + i * r * 0.32;
      ctx.beginPath();
      ctx.moveTo(fx, -r * 0.34);
      ctx.quadraticCurveTo(fx + r * 0.08, -r * 0.2, fx + r * 0.02, -r * 0.06);
      ctx.stroke();
    }

    if (bear.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.75, bear.hitFlash * 5);
      ctx.fillStyle = "#fff8d8";
      ctx.beginPath();
      ctx.ellipse(-r * 0.08, 0, r * 0.92, r * 0.56, 0, 0, TAU);
      ctx.ellipse(r * 0.79, 0, r * 0.37, r * 0.34, 0, 0, TAU);
      ctx.fill();
    }
    if (bear.slowFactor < 1) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#79dfff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-r * 0.08, 0, r * 1.02, r * 0.64, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    const percent = clamp(bear.hp / bear.maxHp, 0, 1);
    const width = isBoss ? r * 1.7 : r * 1.5;
    const bx = bear.x - width / 2;
    const by = bear.y - r * (isBoss ? 1.18 : 1.5);
    ctx.save();
    ctx.globalAlpha = percent < 1 || isBoss ? 1 : 0.72;
    ctx.fillStyle = "rgba(10, 32, 44, .64)";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx - 1.5, by - 1.5, width + 3, 6.5, 3) : ctx.rect(bx - 1.5, by - 1.5, width + 3, 6.5);
    ctx.fill();
    const hpGradient = ctx.createLinearGradient(bx, 0, bx + width, 0);
    hpGradient.addColorStop(0, percent > 0.35 ? "#7ee883" : "#ff725c");
    hpGradient.addColorStop(1, percent > 0.35 ? "#45c86e" : "#df4d46");
    ctx.fillStyle = hpGradient;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, width * percent, 3.5, 2) : ctx.rect(bx, by, width * percent, 3.5);
    ctx.fill();
    ctx.restore();
  }

  function renderGame() {
    const g = game;
    const w = view.width;
    const h = view.height;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!g) {
      drawMenuScene();
      return;
    }
    drawArenaBackground();
    ctx.save();
    const shakeX = camera.shake > 0.05 ? rand(-camera.shake, camera.shake) : 0;
    const shakeY = camera.shake > 0.05 ? rand(-camera.shake, camera.shake) : 0;
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawFootprints();
    for (const afterimage of g.afterimages) {
      const alpha = clamp(afterimage.life / afterimage.maxLife, 0, 1) * 0.22;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#d9f7ff";
      ctx.beginPath();
      ctx.ellipse(afterimage.x, afterimage.y, 20, 12, afterimage.angle, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    drawOrbs();
    drawGrenades();

    const drawables = g.bears.filter((bear) => bear.alive).map((bear) => ({ kind: "bear", y: bear.y, bear }));
    drawables.push({ kind: "player", y: g.player.y });
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) {
      if (item.kind === "bear") drawBear(item.bear);
      else drawPlayer(g.player);
    }

    drawBullets();
    drawParticles();
    drawRings();
    drawDamageTexts();
    ctx.restore();

    if (g.boss && g.boss.alive) {
      const dx = g.boss.x - camera.x;
      const dy = g.boss.y - camera.y;
      const screenX = w / 2 + dx * view.zoom;
      const screenY = h / 2 + dy * view.zoom;
      const margin = 38;
      if (screenX < -20 || screenX > w + 20 || screenY < -20 || screenY > h + 20) {
        const angle = Math.atan2(dy, dx);
        const radiusX = w / 2 - margin;
        const radiusY = h / 2 - margin;
        const scale = 1 / Math.max(Math.abs(Math.cos(angle)) / radiusX, Math.abs(Math.sin(angle)) / radiusY);
        const ix = w / 2 + Math.cos(angle) * scale;
        const iy = h / 2 + Math.sin(angle) * scale;
        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(255, 111, 71, .8)";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-7, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-7, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    const frost = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.5, w / 2, h * 0.5, Math.max(w, h) * 0.8);
    frost.addColorStop(0, "rgba(255,255,255,0)");
    frost.addColorStop(1, "rgba(21, 68, 94, .32)");
    ctx.fillStyle = frost;
    ctx.fillRect(0, 0, w, h);
    drawSnowfall();
  }

  function loop(timestamp) {
    if (!state.lastFrame) state.lastFrame = timestamp;
    const dt = clamp((timestamp - state.lastFrame) / 1000, 0, 0.05);
    state.lastFrame = timestamp;
    state.menuTime += dt;
    windPhase += dt * 0.7;
    updateSnow(dt);

    if (game && state.screen !== "menu") {
      if (state.gameMode === "running") updateGame(dt);
      renderGame();
    } else {
      drawMenuScene();
    }
    window.requestAnimationFrame(loop);
  }

  function init() {
    resizeCanvas();
    bindUIEvents();
    state.screen = "menu";
    state.gameMode = "idle";
    setActiveScreen("menu");
    dom.hud.classList.add("is-hidden");
    dom.bossHud.classList.add("is-hidden");
    dom.pauseOverlay.classList.add("is-hidden");
    dom.levelupOverlay.classList.add("is-hidden");
    dom.gameoverOverlay.classList.add("is-hidden");
    dom.confirmOverlay.classList.add("is-hidden");
    updateSoundUI();
    refreshMenuUI();
    updateAbilityUI();
    state.lastFrame = 0;
    window.requestAnimationFrame(loop);

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
    }

    if (new URLSearchParams(location.search).has("debug")) {
      window.whiteoutDebug = {
        getGame: () => game,
        getMode: () => state.gameMode,
        startRun,
        endRun,
        spawnBoss: () => {
          if (game) {
            game.time = Math.max(game.time, game.nextBossTime);
          }
        },
      };
    }
  }

  init();
})();
