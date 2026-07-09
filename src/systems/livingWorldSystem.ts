import type {
  CaravanMarketState,
  CitySpecialty,
  DifficultyRuleSet,
  FactionUniqueMechanic,
  GameState,
  SeasonState,
  SeasonType,
  TalentRumor,
  WeatherState,
  WorldEvent,
} from "../types";

const currentTurn = (state: GameState) => Math.max(1, (state.year - 190) * 12 + state.month);

const seasonByMonth = (month: number): SeasonType => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

const seasonAdvice: Record<SeasonType, string> = {
  spring: "春季适合恢复民心与发展农业。",
  summer: "夏季行军顺畅，火计略强，但地方灾害也更易发生。",
  autumn: "秋季粮草收入较好，适合整军出征。",
  winter: "冬季远征补给压力上升，建议谨慎攻城。",
};

const weatherEffectText = (state: GameState) => {
  if (state.currentWeather === "rain") return "雨天削弱火计与弓兵，侦察更难。";
  if (state.currentWeather === "fog") return "雾天伏兵与奇袭更容易成功。";
  if (state.currentWeather === "snow") return "雪天骑兵和远征补给受压。";
  return state.seasonState?.season === "summer" ? "晴朗炎热，火计与快速推进更强。" : "天气平稳，适合常规调度。";
};

const defaultDifficultyRuleSet: DifficultyRuleSet = {
  aiLevel: "normal",
  liubeiProtection: "standard",
  eventFrequency: "normal",
  battleComplexity: "standard",
  stratagemPower: "normal",
  captureRule: "normal",
  supplyPressure: "normal",
  randomness: "historical",
  autoGovernance: "off",
};

const defaultFactionMechanics: Record<string, FactionUniqueMechanic> = {
  "liu-bei": {
    id: "benevolent-volunteers",
    name: "仁德乡勇",
    description: "民心高时更容易获得乡勇、人才与名望收益。",
    effects: ["释放俘虏名望收益提高", "低资源时更容易触发支援", "刘关张编成稳定性提高"],
  },
  "cao-cao": {
    id: "wei-command",
    name: "霸业号令",
    description: "中原调度和谋士献策更强，适合连续扩张。",
    effects: ["指令来源更稳定", "谋士建议更频繁", "威慑外交加成"],
  },
  "sun-quan": {
    id: "jiangdong-navy",
    name: "江东水师",
    description: "江河城市、水军训练和守成能力更强。",
    effects: ["水战加成", "江东城市发展加成", "防守士气恢复提高"],
  },
  "yuan-shao": {
    id: "hebei-clans",
    name: "河北豪强",
    description: "资源和兵源充足，但统治效率更依赖民心。",
    effects: ["兵源与初期资源强", "名望高", "低民心时统治负担更明显"],
  },
  "lv-bu": {
    id: "flying-general",
    name: "飞将突阵",
    description: "单挑、突击和以战养战能力强，内政与外交较弱。",
    effects: ["突击技能更强", "战胜后士气恢复", "招降和外交略难"],
  },
  "dong-zhuo": {
    id: "tyrant-pressure",
    name: "威压天下",
    description: "强征与威慑强，但名望与民心压力更大。",
    effects: ["强攻和威慑提高", "民心事件更频繁", "名望下降更快"],
  },
  independent: {
    id: "survival-path",
    name: "乱世求生",
    description: "小势力开局更容易获得搜索和第二城破局奖励。",
    effects: ["搜索概率小幅提高", "夺取第二城有奖励", "初期 AI 威胁略降"],
  },
};

const citySpecialtySeeds: CitySpecialty[] = [
  { cityId: "luoyang", name: "旧都遗脉", description: "朝廷名望与商业价值高。", effects: ["名望事件", "商业收益"] },
  { cityId: "xuchang", name: "中原军府", description: "适合调兵、谋士献策与霸业路线。", effects: ["指令效率", "军团调度"] },
  { cityId: "jianye", name: "江东水寨", description: "水军训练和防守更强。", effects: ["水军", "防守"] },
  { cityId: "jiangling", name: "荆州门户", description: "攻守转换要地，商旅和水路并重。", effects: ["补给", "水战"] },
  { cityId: "chengdu", name: "天府粮仓", description: "粮草收益高，适合长期经营。", effects: ["农业", "守成"] },
  { cityId: "chang-an", name: "关中重镇", description: "关隘与骑兵调度价值高。", effects: ["城防", "骑兵"] },
  { cityId: "xiangyang", name: "荆襄名士", description: "人才传闻和谋士事件更容易出现。", effects: ["人才", "计略"] },
  { cityId: "wuwei", name: "西凉马场", description: "骑兵训练与突击部队更强。", effects: ["骑兵", "突击"] },
  { cityId: "xiapi", name: "淮泗战场", description: "兵争频繁，治安和流寇压力更高。", effects: ["战场", "治安"] },
  { cityId: "beiping", name: "北地骑射", description: "骑兵与弓兵适配更好。", effects: ["骑兵", "弓兵"] },
];

const defaultPersonalityTraits: Record<string, string[]> = {
  "liu-bei": ["仁厚", "坚韧"],
  "guan-yu": ["忠义", "傲骨", "好单挑"],
  "zhang-fei": ["豪烈", "威吓", "冲阵"],
  "cao-cao": ["枭雄", "权谋", "号令"],
  "sun-quan": ["守成", "江东", "稳军"],
  "lv-bu": ["骁勇", "反复", "单挑"],
  "zhuge-liang": ["冷静", "谋略", "识破"],
  "zhou-yu": ["儒将", "火攻", "水战"],
  "sima-yi": ["隐忍", "反制", "深谋"],
  "jia-xu": ["自保", "毒计", "乱阵"],
};

const makeSeasonState = (state: GameState): SeasonState => {
  const season = seasonByMonth(state.month);
  return {
    season,
    turnInSeason: ((state.month - 1) % 3) + 1,
    advice: seasonAdvice[season],
  };
};

const makeWeatherState = (state: GameState): WeatherState => ({
  current: state.currentWeather,
  effectText: weatherEffectText(state),
});

const makeCaravan = (state: GameState): CaravanMarketState => {
  const turn = currentTurn(state);
  const playerCities = state.cities.filter((city) => city.factionId === state.playerFactionId);
  const bestMarket = playerCities.sort((a, b) => b.commerce - a.commerce)[0];
  const active = Boolean(bestMarket) && turn % 4 === 1;
  return {
    active,
    cityId: active ? bestMarket.id : undefined,
    expiresTurn: turn + 2,
    blackMarket: active && (state.rulerReputation ?? 50) < 35,
    goods: active
      ? [
          { id: "grain", name: "粮草车队", price: 120, effect: "粮草 +300" },
          { id: "intel", name: "敌情竹简", price: 80, effect: "侦察/密探成功率提高" },
          { id: "treasure-clue", name: "宝物线索", price: 160, effect: "触发人才或宝物传闻", risk: "黑市可能降低名望" },
        ]
      : [],
  };
};

const makeTalentRumor = (state: GameState): TalentRumor | undefined => {
  const turn = currentTurn(state);
  if (turn % 5 !== 2) return undefined;
  const city = state.cities.find((item) => item.id === "xiangyang") ?? state.cities.find((item) => item.factionId === state.playerFactionId);
  if (!city) return undefined;
  return {
    id: `rumor-${turn}-${city.id}`,
    cityId: city.id,
    text: city.id === "xiangyang" ? "荆襄名士近日频繁往来襄阳。" : "酒馆传闻有异乡武者正在附近游历。",
    clueLevel: 1,
    expiresTurn: turn + 8,
  };
};

export const ensureLivingWorldState = (state: GameState): GameState => {
  const seasonState = state.seasonState ?? makeSeasonState(state);
  const normalized: GameState = {
    ...state,
    cities: state.cities.map((city) => {
      const specialty = citySpecialtySeeds.find((item) => item.cityId === city.id);
      return {
        ...city,
        banditPressure: city.banditPressure ?? (city.publicOrder < 55 ? 20 : 0),
        localUnrest: city.localUnrest ?? Math.max(0, 60 - city.publicOrder),
        citySpecialtyId: city.citySpecialtyId ?? specialty?.cityId,
      };
    }),
    imperialPrestige: state.imperialPrestige ?? 50,
    rulerReputation: state.rulerReputation ?? 50,
    factionLegitimacy: state.factionLegitimacy ?? (state.playerFactionId === "liu-bei" ? 62 : state.playerFactionId === "cao-cao" ? 58 : 50),
    courtStance: state.courtStance ?? "neutral",
    emperorControlFactionId: state.emperorControlFactionId ?? (state.cities.some((city) => city.id === "xuchang" && city.factionId === "cao-cao") ? "cao-cao" : undefined),
    factionUniqueMechanics: { ...defaultFactionMechanics, ...(state.factionUniqueMechanics ?? {}) },
    seasonState,
    weatherState: state.weatherState ?? makeWeatherState({ ...state, seasonState }),
    caravanMarketState: state.caravanMarketState ?? makeCaravan(state),
    spyNetworks: state.spyNetworks ?? {},
    talentRumors: state.talentRumors ?? [],
    domesticCrises: state.domesticCrises ?? [],
    advisorTips: state.advisorTips ?? [],
    autoGovernanceSettings: state.autoGovernanceSettings ?? { mode: state.commandPreferences?.autoGovernanceMode ?? "off" },
    difficultyRuleSet: { ...defaultDifficultyRuleSet, ...(state.difficultyRuleSet ?? {}) },
    encyclopediaSeenState: state.encyclopediaSeenState ?? { opened: false, seenEntries: [] },
    tutorialState: state.tutorialState ?? { enabled: true, completedSteps: [], skipped: false },
    longSimStats: state.longSimStats ?? { turnsSimulated: 0, battles: 0, events: 0 },
    duelRecords: state.duelRecords ?? [],
    prisonerRecords: state.prisonerRecords ?? [],
    woundedStates: state.woundedStates ?? {},
    personalityTraits: { ...defaultPersonalityTraits, ...(state.personalityTraits ?? {}) },
    troopUpgrades: state.troopUpgrades ?? { infantry: 0, cavalry: 0, archer: 0, navy: 0 },
    citySpecialties: state.citySpecialties ?? citySpecialtySeeds,
    supplyState: state.supplyState ?? { pressure: 0, advice: "补给稳定，远征前仍需查看军议粮草消耗。" },
    stratagemRecords: state.stratagemRecords ?? [],
    factionStorylines: state.factionStorylines ?? {
      "liu-bei": { step: 1, title: "仁德立足：稳住平原，寻求第二城。", completed: false },
      "cao-cao": { step: 1, title: "中原号令：整合许昌与陈留。", completed: false },
      "sun-quan": { step: 1, title: "江东守成：稳固建业水师。", completed: false },
    },
    endingProgress: state.endingProgress ?? { title: "乱世未定", progress: 0, hint: "控制更多州郡目标后会形成结局倾向。" },
    enhancedWarArchive: state.enhancedWarArchive ?? [],
  };
  return {
    ...normalized,
    weatherState: makeWeatherState(normalized),
  };
};

export const advanceLivingWorld = (state: GameState) => {
  let next = ensureLivingWorldState(state);
  const turn = currentTurn(next);
  const logs: string[] = [];
  const seasonState = makeSeasonState(next);
  if (seasonState.season !== next.seasonState?.season) logs.push(`节令转为${seasonAdvice[seasonState.season]}`);

  const cities = next.cities.map((city) => {
    const unrestRise = city.publicOrder < 55 ? 4 : city.publicOrder >= 75 ? -2 : 1;
    const banditRise = city.publicOrder < 50 ? 5 : city.publicOrder >= 78 ? -2 : 0;
    return {
      ...city,
      localUnrest: Math.max(0, Math.min(100, (city.localUnrest ?? 0) + unrestRise)),
      banditPressure: Math.max(0, Math.min(100, (city.banditPressure ?? 0) + banditRise)),
    };
  });
  next = { ...next, cities, seasonState };

  const caravanMarketState = makeCaravan(next);
  if (caravanMarketState.active && caravanMarketState.cityId) {
    const city = next.cities.find((item) => item.id === caravanMarketState.cityId);
    logs.push(`商队抵达${city?.name ?? "后方城市"}，可在府衙市集采购粮草或情报。`);
  }

  const newRumor = makeTalentRumor(next);
  const talentRumors = [
    ...(newRumor ? [newRumor] : []),
    ...(next.talentRumors ?? []).filter((rumor) => !rumor.resolved && rumor.expiresTurn >= turn),
  ].slice(0, 8);
  if (newRumor) logs.push(`酒馆传闻：${newRumor.text}`);

  const crisisCity = next.cities.find((city) => city.factionId === next.playerFactionId && ((city.localUnrest ?? 0) >= 55 || (city.banditPressure ?? 0) >= 55));
  const domesticCrises = [...(next.domesticCrises ?? []).filter((crisis) => !crisis.handled).slice(0, 4)];
  if (crisisCity && !domesticCrises.some((crisis) => crisis.cityId === crisisCity.id) && turn % 3 === 0) {
    domesticCrises.unshift({
      id: `crisis-${turn}-${crisisCity.id}`,
      cityId: crisisCity.id,
      type: (crisisCity.banditPressure ?? 0) >= 55 ? "unrest" : "corruption",
      title: `${crisisCity.name}地方动荡`,
      severity: Math.max(crisisCity.localUnrest ?? 0, crisisCity.banditPressure ?? 0),
    });
    logs.push(`${crisisCity.name}出现内政危机，建议安抚或剿匪。`);
  }

  const playerCities = next.cities.filter((city) => city.factionId === next.playerFactionId);
  const avgOrder = playerCities.length ? Math.round(playerCities.reduce((sum, city) => sum + city.publicOrder, 0) / playerCities.length) : 0;
  const reputationDelta = avgOrder >= 75 ? 1 : avgOrder < 45 ? -1 : 0;
  const rulerReputation = Math.max(0, Math.min(100, (next.rulerReputation ?? 50) + reputationDelta));
  const courtStance = rulerReputation >= 75 ? "supportive" : rulerReputation < 30 ? "hostile" : rulerReputation < 45 ? "watching" : "neutral";
  const advisorTips = [
    ...(next.commandState?.commandAdvice ?? []),
    seasonState.advice,
    caravanMarketState.active ? "商队已到，市集采购可以缓解粮草或情报压力。" : "暂无商队，可优先处理城市发展和前线情报。",
    domesticCrises.length > 0 ? "有城市危机未处理，拖延会影响民心、治安和收益。" : "后方暂稳，可考虑侦察、密探或出征。",
  ].slice(0, 5);

  const event: WorldEvent | undefined = logs.length > 0 ? {
    id: `living-${turn}-${logs.length}`,
    turn,
    year: next.year,
    month: next.month,
    type: caravanMarketState.active ? "commerce" : newRumor ? "talent" : "regional",
    title: "天下活世界",
    message: logs[0],
    importance: logs.some((log) => log.includes("危机")) ? "major" : "normal",
    affectedFactionId: next.playerFactionId,
    effects: logs,
  } : undefined;

  next = {
    ...next,
    caravanMarketState,
    talentRumors,
    domesticCrises,
    rulerReputation,
    factionLegitimacy: Math.max(0, Math.min(100, (next.factionLegitimacy ?? 50) + (next.playerFactionId === "liu-bei" && avgOrder >= 70 ? 1 : 0))),
    courtStance,
    advisorTips,
    weatherState: makeWeatherState(next),
    eventHistory: event ? [event, ...(next.eventHistory ?? [])].slice(0, 50) : next.eventHistory,
    longSimStats: {
      turnsSimulated: (next.longSimStats?.turnsSimulated ?? 0) + 1,
      battles: next.longSimStats?.battles ?? 0,
      events: (next.longSimStats?.events ?? 0) + logs.length,
    },
  };
  return { state: next, logs };
};
