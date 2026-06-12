/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum RoleFaction {
  CITIZEN = "CITIZEN",
  MAFIA = "MAFIA",
}

export interface Role {
  id: string;
  name: string; // Persian name (e.g. "پدرخوانده")
  englishName: string;
  faction: RoleFaction;
  description: string;
  maxCount: number;
  hasNightAction: boolean;
}

export interface Player {
  id: string;
  name: string;
  roleId: string | null;
  isAlive: boolean;
  warnings: number; // Disciplinary warnings (اخطار انضباطی), maximum 3 or 4
  isMuted: boolean; // Muted by Psychologist for the current day
  votesCount?: number; // Nominal votes received in day voting
  hasExtraLifeUsed?: boolean; // For Diehard/Tough Guy survival
}

export interface GameEvent {
  id: string;
  cycleNumber: number; // Day or Night index
  phase: "SETUP" | "NIGHT" | "DAY" | "VOTING" | "TRIAL";
  timestamp: string;
  description: string;
  details?: string;
  type: "DEATH" | "INQUIRY" | "SAVE" | "MUTE" | "WARNING" | "VOTE" | "GENERAL" | "GAME_OVER";
}

export interface NightState {
  mafiaTarget: string | null;       // Player ID
  doctorSave: string | null;        // Player ID
  detectiveInquiry: string | null;  // Player ID
  detectiveResult: "MAFIA" | "CITIZEN" | null;
  lecterSave: string | null;        // Player ID
  sniperTarget: string | null;      // Player ID
  psychologistMute: string | null;  // Player ID
  diehardInquiry: boolean;          // Whether Diehard inquired this night
}

export interface GameState {
  players: Player[];
  rolesConfig: { [roleId: string]: number }; // roleId -> count in play
  currentPhase: "SETUP" | "SECRET_REVEAL" | "NIGHT" | "DAY" | "VOTING" | "TRIAL" | "GAME_OVER";
  cycleNumber: number; // Starts from 1 (Night 1, Day 1, Night 2, Day 2...)
  events: GameEvent[];
  nightActions: NightState;
  selectedMayorVeto: boolean; // Whether mayor vetoed current trial
  lastMutedPlayerId: string | null;
  daySpeechDuration: number; // timer default (seconds)
  winner: RoleFaction | null;
}

export const KNOWN_ROLES: Role[] = [
  // MAFIA FACTION
  {
    id: "godfather",
    name: "پدرخوانده (رئیس)",
    englishName: "Godfather",
    faction: RoleFaction.MAFIA,
    description: "رئیس تیم مافیا ابهت خاصی دارد. او شلیک نهایی مافیا را اعلام می‌کند و استعلام کارآگاه برای او همیشه منفی (شهروند) است.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "lecter",
    name: "دکتر لکتر (جراح)",
    englishName: "Dr. Lecter",
    faction: RoleFaction.MAFIA,
    description: "پزشک تیم مافیا. او می‌تواند هر شب یک عضو مافیا (حتی خودش را یک بار) از شلیک تک‌تیرانداز نجات دهد.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "negotiator",
    name: "مذاکره‌کننده",
    englishName: "Negotiator",
    faction: RoleFaction.MAFIA,
    description: "سیاستمدار مافیا. در صورت خروج یکی از اعضای مافیا، او می‌تواند با یکی از شهروندان مذاکره کند تا او را به تیم مافیا ملحق کند.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "simple_mafia",
    name: "مافیای ساده",
    englishName: "Simple Mafia",
    faction: RoleFaction.MAFIA,
    description: "عضو تیم مافیا که در همفکری شبانه شرکت می‌کند و تلاش می‌کند با رای‌گیری در روز شهروندان را بیرون کند.",
    maxCount: 5,
    hasNightAction: false,
  },

  // CITIZEN FACTION
  {
    id: "doctor",
    name: "دکتر",
    englishName: "Doctor",
    faction: RoleFaction.CITIZEN,
    description: "پزشک جان‌سخت شهروندان. او هر شب یک نفر را از شلیک مافیا نجات می‌دهد (خودش را معمولاً یک یا دو بار کل بازی می‌تواند نجات دهد).",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "detective",
    name: "کارآگاه",
    englishName: "Detective",
    faction: RoleFaction.CITIZEN,
    description: "چشم هوشیار شهروندان. او هر شب استعلام یک بازیکن را از گرداننده می‌گیرد. استعلام پدرخوانده منفی و بقیه مافیاها مثبت است.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "sniper",
    name: "حرفه‌ای (تک‌تیرانداز)",
    englishName: "Sniper",
    faction: RoleFaction.CITIZEN,
    description: "مسلح شجاع شهر. اگر به مافیا شلیک کند، مافیا کشته می‌شود. ولی اگر به اشتباه به شهروند شلیک کند، خودش از بازی خارج می‌شود.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "diehard",
    name: "جان‌سخت (تفنگدار)",
    englishName: "Diehard",
    faction: RoleFaction.CITIZEN,
    description: "او سفت و سخت است. اولین شلیک شب روی او اثر ندارد. او می‌تواند در روز از گرداننده بخواهد تا نقش‌های خارج شده بازی را استعلام کند.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "mayor",
    name: "شهردار",
    englishName: "Mayor",
    faction: RoleFaction.CITIZEN,
    description: "دارای قدرت سیاسی خاص. او در مرحله رای‌گیری نهایی می‌تواند حکم ملغی کردن رای‌گیری (وتو) یا اخراج مستقیم یک بازیکن را بدهد.",
    maxCount: 1,
    hasNightAction: false,
  },
  {
    id: "psychologist",
    name: "روان‌پزشک",
    englishName: "Psychologist",
    faction: RoleFaction.CITIZEN,
    description: "طبیب روح شهر. او می‌تواند هر شب یک بازیکن را برای روز بعد ساکت (لال) کند تا نتواند صحبت یا رای دهد.",
    maxCount: 1,
    hasNightAction: true,
  },
  {
    id: "simple_citizen",
    name: "شهروند ساده",
    englishName: "Simple Citizen",
    faction: RoleFaction.CITIZEN,
    description: "اکثریت شهروندان که قدرتی در شب ندارند اما سلاح اصلی آنها قدرت استدلال، اتهام‌زنی و رای‌گیری در روز است.",
    maxCount: 10,
    hasNightAction: false,
  },
];

export interface PlayerPreset {
  name: string;
  description: string;
  totalPlayers: number;
  roles: { [roleId: string]: number };
}

export const GAME_PRESETS: PlayerPreset[] = [
  {
    name: "سناریوی کلاسیک (۸ نفره)",
    description: "مناسب برای جمع‌های کوچک. شامل ۲ مافیا و ۶ شهروند.",
    totalPlayers: 8,
    roles: {
      godfather: 1,
      simple_mafia: 1,
      doctor: 1,
      detective: 1,
      sniper: 1,
      simple_citizen: 3,
    },
  },
  {
    name: "سناریوی شب‌های مافیا (۱۰ نفره)",
    description: "محبوب‌ترین سناریو. ۳ مافیا (پدرخوانده، دکتر لکتر، مافیا ساده) و ۷ شهروند.",
    totalPlayers: 10,
    roles: {
      godfather: 1,
      lecter: 1,
      simple_mafia: 1,
      doctor: 1,
      detective: 1,
      sniper: 1,
      diehard: 1,
      mayor: 1,
      psychologist: 1,
      simple_citizen: 1,
    },
  },
  {
    name: "سناریوی پدرخوانده (۱۲ نفره)",
    description: "حرفه‌ای و پویا با کارت‌های خروج و نقش‌های پیشرفته.",
    totalPlayers: 12,
    roles: {
      godfather: 1,
      lecter: 1,
      negotiator: 1,
      simple_mafia: 1,
      doctor: 1,
      detective: 1,
      sniper: 1,
      diehard: 1,
      mayor: 1,
      psychologist: 1,
      simple_citizen: 2,
    },
  },
];

export interface LastMoveCard {
  id: string;
  name: string;
  description: string;
}

export const LAST_MOVE_CARDS: LastMoveCard[] = [
  {
    id: "vip_shot",
    name: "شلیک نهایی (شلیک مرگ)",
    description: "بازیکن اخراج شده می‌تواند یک تفنگ بردارد و پیش از خروج، به یکی از بازیکنان فعال شلیک کند (تفنگ به او جفت می‌شود).",
  },
  {
    id: "lamb_silence",
    name: "سکوت بره‌ها",
    description: "بازیکن اخراج شده می‌تواند دو نفر را انتخاب کند که فردا حق صحبت کردن در روز را نخواهند داشت.",
  },
  {
    id: "green_path",
    name: "مسیر سبز",
    description: "بازیکن از بازی خارج می‌شود، اما می‌تواند یک کارت به بازیکن دیگری بدهد تا او فردا مصونیت موقت از تارگت داشته باشد یا برای کسی راه باز کند.",
  },
  {
    id: "red_carpet",
    name: "فرش قرمز",
    description: "بازیکنی که این کارت را می‌کشد فردا مستقیماً برای دفاع به روی سن/دادگاه می‌آید بدون رای‌گیری مقدماتی.",
  },
  {
    id: "beautiful_mind",
    name: "ذهن زیبا",
    description: "بازیکن اخراج شده حدس می‌زند فلان شخص چه نقشی دارد. اگر درست بگوید، او در بازی می‌ماند و اخراج ملغی می‌شود!",
  },
  {
    id: "lie_detector",
    name: "دروغ‌سنج",
    description: "بازیکن اخراج شده می‌تواند یک سوال بله/خیر بپرسد و گرداننده موظف است حقیقت مطلق را بگوید.",
  },
];
