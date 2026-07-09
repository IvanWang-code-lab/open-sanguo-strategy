// 《三国：新霸王大陆》美术资源路径表
// 说明：本项目使用 Vite，public 目录下的资源会以站点根路径访问。
// 例如 public/assets/images/backgrounds/map-clean.png 在代码中写成 /assets/images/backgrounds/map-clean.png

export const ART_ASSETS = {
  backgrounds: {
    titleBattlefield: "/assets/images/backgrounds/title-battlefield-overlook.png",
    lordSelect: "/assets/images/backgrounds/lord-select-palace.png",
    mapClean: "/assets/images/backgrounds/map-clean.png",
    mapOrnate: "/assets/images/backgrounds/map-ornate-with-title.png",
    battlefieldStandoff: "/assets/images/backgrounds/battlefield-standoff.png",
    battleOpenField: "/assets/images/backgrounds/battle-open-field.png",
    battleSiegeCity: "/assets/images/backgrounds/battle-siege-city.png",
    battleCityGate: "/assets/images/backgrounds/battle-city-gate.png",
    warRoom: "/assets/images/backgrounds/war-room.png",
  },

  portraits: {
    liubei: "/assets/images/portraits/liubei.png",
    caocao: "/assets/images/portraits/caocao.png",
    sunquan: "/assets/images/portraits/sunquan.png",
    yuanshao: "/assets/images/portraits/yuanshao.png",
    dongzhuo: "/assets/images/portraits/dongzhuo.png",
    lvbu: "/assets/images/portraits/lvbu.png",
    liubiao: "/assets/images/portraits/liubiao.png",
    mateng: "/assets/images/portraits/mateng.png",
    liuzhang: "/assets/images/portraits/liuzhang.png",
    selflord: "/assets/images/portraits/selflord.png",
    sheet: "/assets/images/portraits/ruler-portraits-sheet.png",
  },

  ui: {
    assetSheet: "/assets/images/ui/ui-asset-sheet.png",
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
