import { getFormationGenerals } from "./armyFormationSystem";
import type { ArmyFormation, BattleControlMode, BattlePhase, BattleTacticalChoice, BattleTacticalEffects, GameState, General } from "../types";

export interface TacticalOption {
  id: string;
  label: string;
  phase: BattlePhase;
  description: string;
  requirements: string[];
  predictedEffects: string;
  actualEffects: string;
  recommendedWhen: string;
  effects: BattleTacticalEffects;
  supportRole: "commander" | "advisor" | "vanguard" | "left" | "right" | "reserve";
  successRate: number;
  risk: "低" | "中" | "高";
  disabledReason?: string;
  recommended?: boolean;
}

export const battlePhaseLabels: Record<BattlePhase, string> = {
  deployment: "布阵",
  probe: "试探",
  clash: "交锋",
  breakthrough: "破阵",
  resolution: "收束",
};

export const phaseDescriptions: Record<BattlePhase, string> = {
  deployment: "整军布阵，决定开局军心与战线稳定。",
  probe: "试探敌阵，争夺战机并识别破绽。",
  clash: "主力交锋，决定军势与破阵节奏。",
  breakthrough: "抓住破绽推进破阵，风险与收益都更高。",
  resolution: "收束战果，选择追击、整备或保全士气。",
};

const hasAny = (general: General | undefined, skills: string[]) => Boolean(general?.skills.some((skill) => skills.includes(skill)));
const clampRate = (value: number) => Math.max(0.18, Math.min(0.94, value));
const generalName = (state: GameState, id?: string) => state.generals.find((general) => general.id === id)?.name ?? "部队";

const supportGeneral = (state: GameState, formation: ArmyFormation, role: TacticalOption["supportRole"]) => {
  const generals = getFormationGenerals(state, formation);
  return generals[role] ?? generals.commander ?? generals.advisor;
};

export const getBattlePhaseSequence = (mode: BattleControlMode): BattlePhase[] => {
  if (mode === "auto") return [];
  if (mode === "deep") return ["deployment", "probe", "clash", "breakthrough", "resolution"];
  return ["probe", "clash", "resolution"];
};

const addSkillRate = (general: General | undefined, skills: string[], value = 0.1) => (hasAny(general, skills) ? value : 0);

const option = (config: TacticalOption): TacticalOption => config;

// 五阶段战术池：成功率受武将、技能、地形、天气、编成和兵种倾向共同影响。
export const getTacticalOptions = (
  state: GameState,
  attackerCityId: string,
  defenderCityId: string,
  formation: ArmyFormation,
  phase: BattlePhase = "clash",
): TacticalOption[] => {
  const defenderCity = state.cities.find((city) => city.id === defenderCityId);
  const attackerCity = state.cities.find((city) => city.id === attackerCityId);
  const generals = getFormationGenerals(state, formation);
  const commander = generals.commander;
  const advisor = generals.advisor;
  const vanguard = generals.vanguard;
  const left = generals.left;
  const right = generals.right;
  const reserve = generals.reserve;
  const cavalryReady = (attackerCity?.troops.cavalry ?? 0) > 0 && formation.troopPreference !== "archer";
  const archerReady = (attackerCity?.troops.archer ?? 0) > 0;
  const navyReady = (attackerCity?.troops.navy ?? 0) > 0 && defenderCity?.terrain === "river";
  const fireReady = (advisor?.intelligence ?? 0) >= 78 || hasAny(advisor, ["fire", "strategy", "assist"]);
  const advisorReady = (advisor?.intelligence ?? 0) >= 74 || hasAny(advisor, ["strategy", "assist", "lure", "counter"]);
  const wingReady = Boolean(left && right);
  const terrain = defenderCity?.terrain;
  const weather = state.currentWeather;
  const scores = formation.scores;

  const pools: Record<BattlePhase, TacticalOption[]> = {
    deployment: [
      option({
        id: "hold-line",
        label: "稳住阵脚",
        phase,
        description: "以主将统率整军，后军压住阵脚，降低前期战损。",
        requirements: ["主将统率", "后军稳定"],
        predictedEffects: "军心稳定，损失降低，破阵推进较慢。",
        actualEffects: "阵线稳定，后续损失风险下降。",
        recommendedWhen: "敌强我弱、城防较高或军团稳定性不足时。",
        effects: { momentum: 0, opportunity: 1, breakthrough: 0, morale: 3, lossRisk: -3, pressure: -1 },
        supportRole: "commander",
        successRate: clampRate(0.54 + (commander?.command ?? 55) / 280 + (reserve?.command ?? 45) / 420 + addSkillRate(commander, ["hold", "guard", "command"], 0.08)),
        risk: "低",
      }),
      option({
        id: "fast-advance",
        label: "快速推进",
        phase,
        description: "先锋压前抢占战场节奏，适合高武力或机动部队。",
        requirements: ["先锋武力", "突击/神速"],
        predictedEffects: "军势上升，损失风险上升。",
        actualEffects: "部队迅速接敌，军势提升。",
        recommendedWhen: "我方兵力和武将优势明显时。",
        effects: { momentum: 2, opportunity: 1, breakthrough: 1, morale: 0, lossRisk: 2, pressure: 1 },
        supportRole: "vanguard",
        successRate: clampRate(0.42 + (vanguard?.force ?? commander?.force ?? 55) / 300 + addSkillRate(vanguard, ["swift", "charge", "breakArmy"], 0.12) - (weather === "snow" ? 0.06 : 0)),
        risk: "中",
      }),
      option({
        id: "rally",
        label: "鼓舞全军",
        phase,
        description: "主将或君主以威望鼓舞士气，适合强魅力主公与鼓舞技能。",
        requirements: ["主将魅力", "鼓舞/仁德/霸业"],
        predictedEffects: "士气提升，后续战术更稳。",
        actualEffects: "全军士气上涨，战术执行更有韧性。",
        recommendedWhen: "军心不足、长途进攻或需要连续强攻时。",
        effects: { momentum: 1, opportunity: 0, breakthrough: 0, morale: 4, lossRisk: -1, pressure: -1 },
        supportRole: "commander",
        successRate: clampRate(0.46 + (commander?.charm ?? 55) / 260 + addSkillRate(commander, ["inspire", "benevolence", "hegemony"], 0.14)),
        risk: "低",
      }),
    ],
    probe: [
      option({
        id: "cavalry-probe",
        label: "骑兵试探",
        phase,
        description: "派骑兵试探敌阵，张辽、赵云、马超一类机动武将更擅长。",
        requirements: ["骑兵", "右翼统率/武力"],
        predictedEffects: "增加战机，有小损失风险。",
        actualEffects: "骑兵扰动敌阵，获得侧翼战机。",
        recommendedWhen: "平原、骑兵充足、右翼强时。",
        effects: { momentum: 1, opportunity: 3, breakthrough: 0, morale: 0, lossRisk: 1, pressure: 1 },
        supportRole: "right",
        successRate: clampRate(0.38 + (right?.command ?? commander?.command ?? 55) / 300 + (right?.force ?? 55) / 500 + (terrain === "plain" ? 0.08 : 0) + addSkillRate(right, ["swift", "cavalryMaster", "charge"], 0.13) - (weather === "snow" ? 0.1 : 0)),
        risk: "中",
        disabledReason: cavalryReady ? undefined : "骑兵不足或当前兵种倾向不适合骑兵试探",
      }),
      option({
        id: "archer-pressure",
        label: "弓兵压制",
        phase,
        description: "以弓兵压低敌军势，黄忠、太史慈一类武将更适合。",
        requirements: ["弓兵", "左翼统率"],
        predictedEffects: "降低敌军势，稳定获得少量破阵。",
        actualEffects: "箭雨压住敌方前阵，削弱对手军势。",
        recommendedWhen: "林地、攻城、敌骑兵较多时。",
        effects: { momentum: 1, opportunity: 1, breakthrough: 1, morale: 0, lossRisk: 0, enemyMomentum: -1 },
        supportRole: "left",
        successRate: clampRate(0.46 + (left?.command ?? commander?.command ?? 55) / 310 + (terrain === "forest" ? 0.08 : 0) + (formation.troopPreference === "archer" ? 0.08 : 0)),
        risk: "低",
        disabledReason: archerReady ? undefined : "弓兵不足",
      }),
      option({
        id: "advisor-probe",
        label: "谋士试探",
        phase,
        description: "军师判断敌阵虚实，成功可提高后续战术成功率。",
        requirements: ["军师智力", "鬼谋/奇佐/诱敌"],
        predictedEffects: "增加战机，低风险。",
        actualEffects: "军师识破敌阵虚实，后续战机增加。",
        recommendedWhen: "拥有诸葛亮、周瑜、郭嘉、贾诩、法正等军师时。",
        effects: { momentum: 0, opportunity: 4, breakthrough: 0, morale: 0, lossRisk: -1, pressure: -1 },
        supportRole: "advisor",
        successRate: clampRate(0.4 + (advisor?.intelligence ?? 45) / 230 + addSkillRate(advisor, ["strategy", "assist", "lure"], 0.12)),
        risk: "低",
        disabledReason: advisorReady ? undefined : "军师智力不足",
      }),
      option({
        id: "observe",
        label: "保守观察",
        phase,
        description: "不冒进，保留军心，等待主力交锋。",
        requirements: ["无"],
        predictedEffects: "低风险，战机较少。",
        actualEffects: "部队保持阵型，避免试探损失。",
        recommendedWhen: "敌情不明、我方兵力较弱时。",
        effects: { momentum: 0, opportunity: 1, breakthrough: 0, morale: 1, lossRisk: -2, pressure: -1 },
        supportRole: "reserve",
        successRate: clampRate(0.68 + (reserve?.command ?? commander?.command ?? 55) / 520),
        risk: "低",
      }),
    ],
    clash: [
      option({
        id: "center-assault",
        label: "中军强攻",
        phase,
        description: "主将压中军强攻，依靠统率和武力正面突破。",
        requirements: ["主将武力/统率", "先锋配合"],
        predictedEffects: "破阵上升，损失上升。",
        actualEffects: "中军正面压迫敌阵，破阵值提高。",
        recommendedWhen: "吕布、关羽、张飞、曹操等主将压阵时。",
        effects: { momentum: 2, opportunity: 0, breakthrough: 3, morale: 0, lossRisk: 2, pressure: 2 },
        supportRole: "commander",
        successRate: clampRate(0.4 + (commander?.force ?? 55) / 300 + (commander?.command ?? 55) / 420 + addSkillRate(commander, ["charge", "breakArmy", "prowess", "command"], 0.1)),
        risk: "高",
      }),
      option({
        id: "left-flank",
        label: "左翼包抄",
        phase,
        description: "左翼绕击侧后，成功可制造战机并推动破阵。",
        requirements: ["左翼统率/机动"],
        predictedEffects: "战机和破阵上升，失败损军心。",
        actualEffects: "左翼压迫敌侧，战机明显增加。",
        recommendedWhen: "左翼武将统率高或有神速/骑兵技能时。",
        effects: { momentum: 1, opportunity: 3, breakthrough: 2, morale: -1, lossRisk: 1, pressure: 1 },
        supportRole: "left",
        successRate: clampRate(0.42 + (left?.command ?? commander?.command ?? 55) / 270 + (left?.force ?? 55) / 540 + addSkillRate(left, ["swift", "cavalryMaster", "charge"], 0.1)),
        risk: "中",
        disabledReason: left ? undefined : "缺少左翼武将",
      }),
      option({
        id: "right-charge",
        label: "右翼突击",
        phase,
        description: "右翼快速突进，适合骑兵和高机动武将。",
        requirements: ["右翼武将", "骑兵/神速/突击"],
        predictedEffects: "军势和破阵上升，风险较高。",
        actualEffects: "右翼突击制造突破口。",
        recommendedWhen: "赵云、张辽、马超、夏侯渊等右翼武将适合时。",
        effects: { momentum: 2, opportunity: 1, breakthrough: 2, morale: 0, lossRisk: 2, pressure: 2 },
        supportRole: "right",
        successRate: clampRate(0.4 + (right?.force ?? commander?.force ?? 55) / 290 + (right?.command ?? 55) / 430 + addSkillRate(right, ["swift", "cavalryMaster", "charge"], 0.12) + (terrain === "plain" ? 0.05 : 0) - (weather === "snow" ? 0.08 : 0)),
        risk: "高",
        disabledReason: right ? undefined : "缺少右翼武将",
      }),
      option({
        id: "hold-formation",
        label: "全军稳守",
        phase,
        description: "保持阵线并降低损失，适合劣势和高城防目标。",
        requirements: ["主将统率", "后军稳定"],
        predictedEffects: "降低损失，破阵较慢。",
        actualEffects: "全军稳住阵脚，减少无谓损耗。",
        recommendedWhen: "敌强我弱、需要等待破绽时。",
        effects: { momentum: 0, opportunity: 1, breakthrough: 1, morale: 2, lossRisk: -3, pressure: -2 },
        supportRole: "reserve",
        successRate: clampRate(0.58 + (commander?.command ?? 55) / 320 + (reserve?.command ?? 45) / 450 + addSkillRate(reserve, ["hold", "guard", "counter"], 0.08)),
        risk: "低",
      }),
      option({
        id: "fire-attack",
        label: "火攻",
        phase,
        description: weather === "rain" ? "雨天火势受限，但高智军师仍可尝试扰乱敌阵。" : "军师发动火攻，林地与城池战更容易扩大战果。",
        requirements: ["军师智力", "火攻/鬼谋/奇佐", "非雨天更佳"],
        predictedEffects: "破阵大幅上升，雨天削弱。",
        actualEffects: weather === "rain" ? "火势受雨天压制，效果有限。" : "火势扰乱敌阵，破阵值提高。",
        recommendedWhen: "周瑜、诸葛亮、陆逊、司马懿等军师在场时。",
        effects: { momentum: weather === "rain" ? 0 : 1, opportunity: 1, breakthrough: terrain === "forest" || terrain === "city" ? 4 : 3, morale: 0, lossRisk: weather === "rain" ? 1 : 0, pressure: 2 },
        supportRole: "advisor",
        successRate: clampRate(0.32 + (advisor?.intelligence ?? 40) / 220 + addSkillRate(advisor, ["fire", "strategy", "assist"], 0.16) + (terrain === "forest" || terrain === "city" ? 0.08 : 0) - (weather === "rain" ? 0.18 : 0)),
        risk: weather === "rain" ? "高" : "中",
        disabledReason: fireReady ? undefined : "需要高智军师或火攻/鬼谋/奇佐技能",
      }),
      option({
        id: "lure-trap",
        label: "诱敌",
        phase,
        description: "诱敌深入再反击，雾天和谋略型军师更容易成功。",
        requirements: ["军师智力", "诱敌/伏兵/鬼谋"],
        predictedEffects: "战机上升，失败影响军心。",
        actualEffects: "敌军阵线被牵动，我方获得反击战机。",
        recommendedWhen: "贾诩、郭嘉、法正、司马懿等谋士在场时。",
        effects: { momentum: 0, opportunity: weather === "fog" ? 5 : 3, breakthrough: 1, morale: -1, lossRisk: 0, pressure: 1 },
        supportRole: "advisor",
        successRate: clampRate(0.36 + (advisor?.intelligence ?? 40) / 240 + addSkillRate(advisor, ["lure", "strategy", "ambush"], 0.14) + (weather === "fog" ? 0.08 : 0)),
        risk: "中",
        disabledReason: advisorReady ? undefined : "缺少可靠军师",
      }),
    ],
    breakthrough: [
      option({
        id: "commander-charge",
        label: "主将突击",
        phase,
        description: "主将亲自压阵突击，可能直接推动破阵，但损失风险高。",
        requirements: ["主将武力", "突击/无双/破军"],
        predictedEffects: "破阵大幅上升，战损风险高。",
        actualEffects: "主将强行突破敌阵，决胜压力提高。",
        recommendedWhen: "吕布、关羽、张飞、马超等强武将任主将时。",
        effects: { momentum: 2, opportunity: 0, breakthrough: 5, morale: 0, lossRisk: 3, pressure: 3 },
        supportRole: "commander",
        successRate: clampRate(0.34 + (commander?.force ?? 55) / 240 + addSkillRate(commander, ["charge", "prowess", "breakArmy", "duel"], 0.16)),
        risk: "高",
      }),
      option({
        id: "advisor-stratagem",
        label: "军师奇策",
        phase,
        description: "由军师抓住破绽发动奇策，成功收益很高。",
        requirements: ["军师智力", "鬼谋/奇佐"],
        predictedEffects: "战机和破阵上升，失败影响军心。",
        actualEffects: "军师奇策打开突破口。",
        recommendedWhen: "诸葛亮、周瑜、司马懿、庞统、法正在场时。",
        effects: { momentum: 1, opportunity: 3, breakthrough: 4, morale: -1, lossRisk: 1, pressure: 2 },
        supportRole: "advisor",
        successRate: clampRate(0.34 + (advisor?.intelligence ?? 45) / 210 + addSkillRate(advisor, ["strategy", "fire", "assist", "lure"], 0.14)),
        risk: "中",
        disabledReason: advisorReady ? undefined : "缺少可靠军师",
      }),
      option({
        id: "double-envelopment",
        label: "两翼合围",
        phase,
        description: "左右翼同时压迫，成功效果极强，失败会造成较高损失。",
        requirements: ["左右翼武将", "机动/统率"],
        predictedEffects: "战机和破阵大幅上升，风险较高。",
        actualEffects: "两翼合围压缩敌阵空间。",
        recommendedWhen: "左右翼都有可靠武将且骑兵/机动充足时。",
        effects: { momentum: 2, opportunity: 3, breakthrough: 4, morale: -1, lossRisk: 3, pressure: 3 },
        supportRole: "left",
        successRate: clampRate(0.28 + (left?.command ?? 45) / 330 + (right?.command ?? 45) / 330 + addSkillRate(left, ["swift", "cavalryMaster"], 0.06) + addSkillRate(right, ["swift", "cavalryMaster"], 0.06)),
        risk: "高",
        disabledReason: wingReady ? undefined : "需要左右翼都已编成",
      }),
      option({
        id: "steady-push",
        label: "稳扎推进",
        phase,
        description: "稳步推进破阵，收益不爆炸但风险较低。",
        requirements: ["主将统率"],
        predictedEffects: "稳定小幅推进，低风险。",
        actualEffects: "军团稳步前压，减少冒进损耗。",
        recommendedWhen: "评分不占优或需要保留兵力时。",
        effects: { momentum: 0, opportunity: 1, breakthrough: 2, morale: 1, lossRisk: -2, pressure: -1 },
        supportRole: "commander",
        successRate: clampRate(0.6 + (commander?.command ?? 55) / 360),
        risk: "低",
      }),
      option({
        id: "guard-counter",
        label: "守军反击",
        phase,
        description: "以稳守引敌露出破绽再反击，坚守和反制技能更强。",
        requirements: ["坚守/反制/护主"],
        predictedEffects: "降低损失并增加战机。",
        actualEffects: "阵脚不乱，反击夺取局部优势。",
        recommendedWhen: "我军处于劣势或防守型武将多时。",
        effects: { momentum: 0, opportunity: 2, breakthrough: 1, morale: 2, lossRisk: -3, pressure: -2 },
        supportRole: "reserve",
        successRate: clampRate(0.5 + (reserve?.command ?? commander?.command ?? 55) / 310 + addSkillRate(reserve, ["hold", "counter", "guard"], 0.12)),
        risk: "低",
      }),
    ],
    resolution: [
      option({
        id: "pursuit",
        label: "追击扩大战果",
        phase,
        description: "追击退势敌军，提高歼灭但增加战损。",
        requirements: ["先锋/右翼武力", "神速/突击"],
        predictedEffects: "敌损增加，我损也可能增加。",
        actualEffects: "追击扩大敌方损失。",
        recommendedWhen: "胜势明显、骑兵或先锋强时。",
        effects: { momentum: 1, opportunity: 0, breakthrough: 3, morale: 0, lossRisk: 2, pressure: 2 },
        supportRole: "vanguard",
        successRate: clampRate(0.46 + (vanguard?.force ?? commander?.force ?? 55) / 280 + addSkillRate(vanguard, ["swift", "charge"], 0.1)),
        risk: "高",
      }),
      option({
        id: "conservative-withdraw",
        label: "保守收兵",
        phase,
        description: "降低自身损失，减少追击收益。",
        requirements: ["无"],
        predictedEffects: "自身损失下降，战果减少。",
        actualEffects: "收束阵线，保留兵力。",
        recommendedWhen: "我方兵力损耗大或后续仍需连续作战时。",
        effects: { momentum: 0, opportunity: 0, breakthrough: 0, morale: 2, lossRisk: -4, pressure: -2 },
        supportRole: "reserve",
        successRate: clampRate(0.72 + (reserve?.command ?? commander?.command ?? 55) / 520),
        risk: "低",
      }),
      option({
        id: "secure-city",
        label: "整备入城",
        phase,
        description: "攻城胜利后整备入城，降低民心损失和混乱。",
        requirements: ["攻城/城池战"],
        predictedEffects: "降低占城后混乱，追击收益较少。",
        actualEffects: "军纪较稳，城市混乱降低。",
        recommendedWhen: "攻城胜利、目标民心偏低时。",
        effects: { momentum: 0, opportunity: 0, breakthrough: 1, morale: 1, lossRisk: -2, pressure: -1 },
        supportRole: "advisor",
        successRate: clampRate(0.58 + (advisor?.politics ?? advisor?.intelligence ?? 50) / 350 + addSkillRate(advisor, ["pacify", "benevolence", "assist"], 0.08)),
        risk: "低",
        disabledReason: terrain === "city" || (defenderCity?.defense ?? 0) >= 50 ? undefined : "非攻城战，整备收益较低",
      }),
      option({
        id: "no-pursuit",
        label: "放弃追击",
        phase,
        description: "保留士气与阵型，战果较少但风险最低。",
        requirements: ["无"],
        predictedEffects: "战果较少，军心稳定。",
        actualEffects: "部队保持阵型，避免追击风险。",
        recommendedWhen: "敌情复杂或我方损失偏高时。",
        effects: { momentum: 0, opportunity: 0, breakthrough: 0, morale: 3, lossRisk: -5, pressure: -3 },
        supportRole: "commander",
        successRate: 0.9,
        risk: "低",
      }),
    ],
  };

  const options = pools[phase].map((item) => {
    const support = supportGeneral(state, formation, item.supportRole);
    const scoreBoost = scores ? (scores.opportunity + scores.breakthrough + scores.stability) / 900 : 0;
    const successRate = clampRate(item.successRate + scoreBoost);
    return { ...item, successRate };
  });
  const available = options.map((item) => {
    const support = supportGeneral(state, formation, item.supportRole);
    const recommended =
      !item.disabledReason &&
      (item.successRate >= 0.68 ||
        (support?.skills.some((skill) => ["fire", "strategy", "charge", "swift", "inspire", "command", "breakArmy"].includes(skill)) ?? false));
    return { ...item, recommended };
  });
  if (!available.some((item) => item.recommended && !item.disabledReason)) {
    const fallback = available.filter((item) => !item.disabledReason).sort((a, b) => b.successRate - a.successRate)[0];
    if (fallback) fallback.recommended = true;
  }
  return available;
};

export const recommendTacticalOption = (options: TacticalOption[]) =>
  options.filter((option) => !option.disabledReason).sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.successRate - a.successRate)[0];

export const createTacticalChoice = (
  state: GameState,
  formation: ArmyFormation,
  option: TacticalOption,
  chosenBy: BattleTacticalChoice["chosenBy"],
): BattleTacticalChoice => {
  const support = supportGeneral(state, formation, option.supportRole);
  const success = Math.random() < option.successRate;
  const effects = success
    ? option.effects
    : {
        momentum: Math.floor(option.effects.momentum / 2),
        opportunity: Math.floor(option.effects.opportunity / 2),
        breakthrough: Math.floor(option.effects.breakthrough / 2),
        morale: Math.min(option.effects.morale, 0),
        lossRisk: option.effects.lossRisk + 1,
        enemyMomentum: option.effects.enemyMomentum,
        pressure: (option.effects.pressure ?? 0) + 1,
      };
  const skillReason = support?.skills.length ? `${support.name}的技能参与判定` : `${generalName(state, support?.id)}以能力支撑战术`;
  return {
    phase: option.phase,
    choiceId: option.id,
    label: option.label,
    chosenBy,
    supportingGeneralId: support?.id,
    success,
    effects,
    requirements: option.requirements,
    predictedEffects: option.predictedEffects,
    actualEffects: success ? option.actualEffects : `执行受阻，${option.label}未能完全发挥；${skillReason}。`,
    recommendedWhen: option.recommendedWhen,
    riskLevel: option.risk,
    description: `【${battlePhaseLabels[option.phase]}】${generalName(state, support?.id)}支持【${option.label}】${success ? "成功" : "未完全奏效"}：${success ? option.actualEffects : option.description}`,
  };
};

export const createAutoTacticalChoices = (
  state: GameState,
  attackerCityId: string,
  defenderCityId: string,
  formation: ArmyFormation,
  chosenBy: BattleTacticalChoice["chosenBy"] = "auto",
  mode: BattleControlMode = "standard",
) => {
  const phases = mode === "deep" ? getBattlePhaseSequence("deep") : ["deployment", "probe", "clash", "resolution"] as BattlePhase[];
  return phases
    .map((phase) => recommendTacticalOption(getTacticalOptions(state, attackerCityId, defenderCityId, formation, phase)))
    .filter((selected): selected is TacticalOption => Boolean(selected))
    .map((selected) => createTacticalChoice(state, formation, selected, chosenBy));
};

export const summarizeTacticalEffects = (choices: BattleTacticalChoice[]) =>
  choices.reduce(
    (sum, choice) => ({
      momentum: sum.momentum + choice.effects.momentum,
      opportunity: sum.opportunity + choice.effects.opportunity,
      breakthrough: sum.breakthrough + choice.effects.breakthrough,
      morale: sum.morale + choice.effects.morale,
      lossRisk: sum.lossRisk + choice.effects.lossRisk,
      enemyMomentum: (sum.enemyMomentum ?? 0) + (choice.effects.enemyMomentum ?? 0),
      pressure: (sum.pressure ?? 0) + (choice.effects.pressure ?? 0),
    }),
    { momentum: 0, opportunity: 0, breakthrough: 0, morale: 0, lossRisk: 0, enemyMomentum: 0, pressure: 0 },
  );
