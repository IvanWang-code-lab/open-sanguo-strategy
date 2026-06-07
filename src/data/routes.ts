export const cityRoutes: [string, string][] = [
  ["beiping", "ji"], ["ji", "nanpi"], ["nanpi", "pingyuan"], ["nanpi", "yecheng"], ["pingyuan", "chenliu"],
  ["yecheng", "jinyang"], ["yecheng", "luoyang"], ["jinyang", "luoyang"], ["luoyang", "changan"], ["luoyang", "xuchang"],
  ["xuchang", "chenliu"], ["xuchang", "wancheng"], ["xuchang", "runan"], ["chenliu", "xiapi"], ["runan", "shouchun"],
  ["xiapi", "shouchun"], ["shouchun", "lujiang"], ["lujiang", "jianye"], ["jianye", "wu"], ["wu", "kuaiji"],
  ["jianye", "chaisang"], ["chaisang", "jiangxia"], ["chaisang", "lujiang"], ["wancheng", "xiangyang"], ["runan", "jiangxia"],
  ["xiangyang", "jiangling"], ["xiangyang", "hanzhong"], ["jiangling", "jiangxia"], ["jiangling", "changsha"],
  ["changsha", "lingling"], ["changsha", "guiyang"], ["lingling", "guiyang"], ["changan", "tianshui"], ["tianshui", "wuwei"],
  ["changan", "hanzhong"], ["hanzhong", "chengdu"], ["chengdu", "jiangzhou"], ["jiangzhou", "yunnan"], ["jiangzhou", "jiangling"],
  ["yunnan", "lingling"], ["guiyang", "kuaiji"],
];

export const areAdjacent = (a: string, b: string) =>
  cityRoutes.some(([from, to]) => (from === a && to === b) || (from === b && to === a));

export const getNeighbors = (cityId: string) =>
  cityRoutes.flatMap(([from, to]) => (from === cityId ? [to] : to === cityId ? [from] : []));
