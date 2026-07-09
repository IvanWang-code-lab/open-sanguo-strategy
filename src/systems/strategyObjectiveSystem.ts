import type { FactionRoute, GameState, RegionObjective } from "../types";

const objectiveSeeds: Array<Omit<RegionObjective, "progress" | "completed">> = [
  {
    id: "central-plains",
    name: "控制中原三城",
    category: "region",
    description: "中原是天下兵粮与道路枢纽，握住许昌、陈留、洛阳、汝南一线，才能持续向四方用兵。",
    conditionText: "控制许昌、陈留、洛阳、汝南中的 3 座",
    target: 3,
    reward: "中原军政稳固：政令效率更容易保持稳定",
    advice: "优先侦察相邻弱城，避免在民心偏低时连续扩张。",
    relatedCityIds: ["xuchang", "chenliu", "luoyang", "runan"],
  },
  {
    id: "hebei-unification",
    name: "统一河北",
    category: "region",
    description: "河北城池相连，骑兵与粮道兼备，是北方霸业的根基。",
    conditionText: "控制北平、蓟、南皮、邺城、晋阳中的 4 座",
    target: 4,
    reward: "河北军势成形：北方前线压力下降",
    advice: "河北路线密集，先稳住一座重镇，再连续推进。",
    relatedCityIds: ["beiping", "ji", "nanpi", "yecheng", "jinyang"],
  },
  {
    id: "jingzhou-gate",
    name: "控制荆州门户",
    category: "region",
    description: "襄阳、江陵、江夏连通南北，是入蜀、下江东与北伐的关键门户。",
    conditionText: "控制襄阳、江陵、江夏、长沙中的 3 座",
    target: 3,
    reward: "荆州门户：南北战略选择增多",
    advice: "水军、弓兵和守城能力会在荆州战线更有价值。",
    relatedCityIds: ["xiangyang", "jiangling", "jiangxia", "changsha"],
  },
  {
    id: "jiangdong-line",
    name: "稳定江东防线",
    category: "region",
    description: "江东以江河为屏障，建业、吴、会稽、柴桑、庐江构成水战防线。",
    conditionText: "控制江东五城中的 4 座",
    target: 4,
    reward: "江东水网：水军作战风险降低",
    advice: "江东战线应保留足够水军，避免陆军孤军深入。",
    relatedCityIds: ["jianye", "wu", "kuaiji", "chaisang", "lujiang"],
  },
  {
    id: "enter-yizhou",
    name: "入蜀据险",
    category: "region",
    description: "益州地势险固，成都、江州、汉中、云南一线适合长期经营。",
    conditionText: "控制成都、江州、汉中、云南中的 3 座",
    target: 3,
    reward: "益州根基：后方粮草更有保障",
    advice: "山地出征损耗高，战前留守和补给必须更谨慎。",
    relatedCityIds: ["chengdu", "jiangzhou", "hanzhong", "yunnan"],
  },
];

const routeTemplates: Record<string, Omit<FactionRoute, "factionId" | "currentStep">> = {
  "cao-cao": {
    title: "中原扩张",
    steps: ["稳住许昌与陈留", "吞并汝南、宛城", "北向河北争雄", "以军政统一天下"],
    endingHint: "霸业结局：中原军政一统，挟天下之势平定诸侯。",
  },
  "liu-bei": {
    title: "仁德立业",
    steps: ["守住平原", "招贤纳士", "转进荆益立足", "以民心凝聚天下"],
    endingHint: "仁德结局：以人心与名望完成复兴之业。",
  },
  "sun-quan": {
    title: "江东守成",
    steps: ["稳固建业", "经营江东水网", "争夺荆州门户", "以水陆并进定鼎"],
    endingHint: "江东结局：以长江天险和水军优势划定天下大势。",
  },
  "lv-bu": {
    title: "飞将破局",
    steps: ["保存下邳兵锋", "以战养战夺第二城", "快速突破中原", "在高风险扩张中称雄"],
    endingHint: "飞将结局：以武勇和速度打穿诸侯包围。",
  },
  independent: {
    title: "自立逆袭",
    steps: ["保住第一座城", "夺取第二城", "招募在野群英", "从边地逆袭天下"],
    endingHint: "自立结局：无名之主由边陲立国，改写天下。",
  },
};

const countControlled = (state: GameState, cityIds: string[]) =>
  cityIds.filter((cityId) => state.cities.find((city) => city.id === cityId)?.factionId === state.playerFactionId).length;

export const buildRegionObjectives = (state: GameState): RegionObjective[] =>
  objectiveSeeds.map((seed) => {
    const progress = countControlled(state, seed.relatedCityIds);
    return {
      ...seed,
      progress,
      completed: progress >= seed.target,
    };
  });

export const buildFactionRoute = (state: GameState): FactionRoute => {
  const template = routeTemplates[state.playerFactionId] ?? routeTemplates.independent;
  const ownedCities = state.cities.filter((city) => city.factionId === state.playerFactionId).length;
  const completedObjectives = (state.regionObjectives ?? []).filter((objective) => objective.completed).length;
  const stepIndex = Math.min(template.steps.length - 1, Math.max(0, Math.floor(ownedCities / 3) + completedObjectives - 1));
  return {
    factionId: state.playerFactionId,
    ...template,
    currentStep: template.steps[stepIndex],
  };
};

export const ensureStrategyObjectives = (state: GameState): GameState => {
  const withObjectives = {
    ...state,
    regionObjectives: buildRegionObjectives(state),
  };
  return {
    ...withObjectives,
    factionRoute: buildFactionRoute(withObjectives),
  };
};

export const summarizeObjectives = (state: GameState) => {
  const objectives = state.regionObjectives ?? buildRegionObjectives(state);
  const active = objectives.find((objective) => !objective.completed) ?? objectives[0];
  const completed = objectives.filter((objective) => objective.completed).length;
  return {
    active,
    completed,
    total: objectives.length,
    route: state.factionRoute ?? buildFactionRoute({ ...state, regionObjectives: objectives }),
  };
};
