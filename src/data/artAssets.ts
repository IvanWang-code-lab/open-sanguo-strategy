// 公开版不打包版权来源不明图片，统一使用代码生成的 SVG 占位视觉。
const svgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const makeBackground = (label: string, primary = "#15100c", accent = "#8f2f24") =>
  svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="0.52" stop-color="#090806"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="60%">
      <stop offset="0" stop-color="#d6b46a" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0v80" fill="none" stroke="#d6b46a" stroke-opacity="0.12" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#grid)"/>
  <rect width="1600" height="900" fill="url(#glow)"/>
  <path d="M120 690 C330 610 430 740 620 660 S900 560 1120 650 1370 610 1500 700" fill="none" stroke="#d6b46a" stroke-opacity="0.28" stroke-width="8"/>
  <path d="M180 230 L360 170 L520 250 L700 160 L920 260 L1160 175 L1450 260" fill="none" stroke="#7b5530" stroke-opacity="0.34" stroke-width="10"/>
  <text x="800" y="475" text-anchor="middle" font-family="serif" font-size="80" fill="#d6b46a" fill-opacity="0.42">${label}</text>
</svg>`);

const makePortrait = (label: string, color = "#7b5530") =>
  svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#221813"/>
      <stop offset="1" stop-color="${color}"/>
    </linearGradient>
  </defs>
  <rect width="420" height="560" rx="18" fill="url(#p)"/>
  <circle cx="210" cy="168" r="88" fill="#d6b46a" fill-opacity="0.28" stroke="#d6b46a" stroke-opacity="0.65" stroke-width="8"/>
  <path d="M120 430 C145 315 275 315 300 430 Z" fill="#080807" fill-opacity="0.5" stroke="#d6b46a" stroke-opacity="0.45" stroke-width="6"/>
  <path d="M104 92 C164 48 258 48 316 92" fill="none" stroke="#d6b46a" stroke-opacity="0.5" stroke-width="10"/>
  <text x="210" y="505" text-anchor="middle" font-family="serif" font-size="52" fill="#f0d89a">${label}</text>
</svg>`);

export const ART_ASSETS = {
  backgrounds: {
    titleBattlefield: makeBackground("开源战略沙盒", "#18120e", "#4a1714"),
    lordSelect: makeBackground("主公选择", "#15100c", "#273d33"),
    mapClean: makeBackground("战略地图", "#101812", "#203a28"),
    mapOrnate: makeBackground("天下形势", "#17130f", "#553f23"),
    battlefieldStandoff: makeBackground("两军对峙", "#140e0d", "#5c1f1a"),
    battleOpenField: makeBackground("野战", "#11170f", "#4a1714"),
    battleSiegeCity: makeBackground("攻城", "#17110f", "#6a2c20"),
    battleCityGate: makeBackground("城门战", "#101016", "#4a1714"),
    warRoom: makeBackground("军议", "#13100c", "#342514"),
  },

  portraits: {
    liubei: makePortrait("刘备", "#b88a42"),
    caocao: makePortrait("曹操", "#344257"),
    sunquan: makePortrait("孙权", "#235f56"),
    yuanshao: makePortrait("袁绍", "#55406b"),
    dongzhuo: makePortrait("董卓", "#5b221d"),
    lvbu: makePortrait("吕布", "#771f24"),
    liubiao: makePortrait("刘表", "#3f5a4b"),
    mateng: makePortrait("马腾", "#6c5b39"),
    liuzhang: makePortrait("刘璋", "#4c5f63"),
    selflord: makePortrait("自立", "#55504a"),
    sheet: makeBackground("头像占位", "#15100c", "#7b5530"),
  },

  ui: {
    assetSheet: makeBackground("UI 占位", "#080807", "#7b5530"),
  },
} as const;

export type ArtBackgroundKey = keyof typeof ART_ASSETS.backgrounds;
export type ArtPortraitKey = keyof typeof ART_ASSETS.portraits;

export const FACTION_PORTRAIT_MAP: Record<string, string> = {
  "liu-bei": ART_ASSETS.portraits.liubei,
  liubei: ART_ASSETS.portraits.liubei,
  "cao-cao": ART_ASSETS.portraits.caocao,
  caocao: ART_ASSETS.portraits.caocao,
  "sun-quan": ART_ASSETS.portraits.sunquan,
  sunquan: ART_ASSETS.portraits.sunquan,
  "yuan-shao": ART_ASSETS.portraits.yuanshao,
  yuanshao: ART_ASSETS.portraits.yuanshao,
  "dong-zhuo": ART_ASSETS.portraits.dongzhuo,
  dongzhuo: ART_ASSETS.portraits.dongzhuo,
  "lv-bu": ART_ASSETS.portraits.lvbu,
  lvbu: ART_ASSETS.portraits.lvbu,
  "liu-biao": ART_ASSETS.portraits.liubiao,
  liubiao: ART_ASSETS.portraits.liubiao,
  "ma-teng": ART_ASSETS.portraits.mateng,
  mateng: ART_ASSETS.portraits.mateng,
  "liu-zhang": ART_ASSETS.portraits.liuzhang,
  liuzhang: ART_ASSETS.portraits.liuzhang,
  selflord: ART_ASSETS.portraits.selflord,
  independent: ART_ASSETS.portraits.selflord,
  zili: ART_ASSETS.portraits.selflord,
};

export function getFactionPortrait(factionId?: string): string {
  if (!factionId) return ART_ASSETS.portraits.selflord;
  return FACTION_PORTRAIT_MAP[factionId] ?? ART_ASSETS.portraits.selflord;
}

export function getBattleBackground(params?: { isSiege?: boolean; isDefendingCity?: boolean; terrain?: string }): string {
  if (params?.isSiege) return ART_ASSETS.backgrounds.battleSiegeCity;
  if (params?.isDefendingCity || params?.terrain === "city") return ART_ASSETS.backgrounds.battleCityGate;
  return ART_ASSETS.backgrounds.battleOpenField;
}
