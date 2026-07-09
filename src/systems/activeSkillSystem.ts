import type { ActiveSkill, BattleUnit, GameState, General, WeatherType } from "../types";

export const activeSkills: ActiveSkill[] = [
  { id: "active-ren-de", name: "仁德鼓舞", type: "buff", cost: 36, cooldown: 3, targetType: "allAlly", range: 100, effect: "liubei_benevolence", description: "刘备以仁德稳住军心，低兵力友军额外恢复士气并获得防守加成。", requiredRole: ["commander", "advisor", "rear"], visualText: "仁德鼓舞" },
  { id: "active-wusheng", name: "武圣突阵", type: "attack", cost: 55, cooldown: 4, targetType: "enemyUnit", range: 18, effect: "guanyu_wusheng", description: "关羽正面突阵，重创敌军；若目标士气低，有概率直接击溃。", requiredRole: ["commander", "vanguard", "left", "right"], visualText: "武圣突阵" },
  { id: "active-yanren-roar", name: "燕人咆哮", type: "debuff", cost: 44, cooldown: 3, targetType: "lane", range: 28, effect: "zhangfei_roar", description: "张飞震慑一条战线，敌军士气大降并后退。", requiredRole: ["commander", "vanguard"], visualText: "燕人咆哮" },
  { id: "active-longdan", name: "龙胆救场", type: "buff", cost: 42, cooldown: 3, targetType: "allAlly", range: 100, effect: "zhaoyun_rescue", description: "赵云高速穿插，保护低兵力友军并提升自身防御。", requiredRole: ["commander", "vanguard", "left", "right"], visualText: "龙胆救场" },
  { id: "active-weiwu", name: "魏武号令", type: "buff", cost: 48, cooldown: 3, targetType: "allAlly", range: 100, effect: "caocao_order", description: "曹操号令三军，提升攻击、推进和技能能量。", requiredRole: ["commander"], visualText: "魏武号令" },
  { id: "active-jiangdong-guard", name: "江东稳军", type: "buff", cost: 38, cooldown: 3, targetType: "allAlly", range: 100, effect: "sunquan_guard", description: "孙权稳住江东军心，提升防守和士气恢复；江河战更强。", requiredRole: ["commander", "rear"], visualText: "江东稳军" },
  { id: "active-supreme-peerless", name: "天下无双", type: "attack", cost: 78, cooldown: 5, targetType: "lane", range: 30, effect: "lvbu_peerless", description: "吕布爆发范围杀伤，消耗极高但能撕开一路防线。", requiredRole: ["commander", "vanguard"], visualText: "天下无双" },
  { id: "active-eight-array", name: "八阵识破", type: "tactic", cost: 44, cooldown: 3, targetType: "allAlly", range: 100, effect: "zhuge_counter", description: "诸葛亮布八阵识破敌策，提升全军防御并削弱敌方技能效果。", requiredRole: ["advisor", "commander", "rear"], visualText: "八阵识破" },
  { id: "active-chibi-fire", name: "赤壁火攻", type: "tactic", cost: 56, cooldown: 4, targetType: "lane", range: 100, effect: "zhouyu_chibi_fire", description: "周瑜强化火攻，晴天和江河战更强，雨天削弱。", requiredRole: ["advisor", "commander", "rear"], visualText: "赤壁火攻" },
  { id: "active-deep-counter", name: "深谋反制", type: "control", cost: 46, cooldown: 3, targetType: "allAlly", range: 100, effect: "simayi_counter", description: "司马懿后发制人，降低敌军命令效率并提升己方反击。", requiredRole: ["advisor", "commander", "rear"], visualText: "深谋反制" },
  { id: "active-xiliang-charge", name: "西凉冲阵", type: "attack", cost: 50, cooldown: 3, targetType: "enemyUnit", range: 22, effect: "machao_charge", description: "马超骑兵冲阵，平原更强，山地或雪天降低。", requiredRole: ["commander", "vanguard", "left", "right"], visualText: "西凉冲阵" },
  { id: "active-hundred-step", name: "百步穿杨", type: "attack", cost: 42, cooldown: 3, targetType: "enemyUnit", range: 100, effect: "huangzhong_shot", description: "黄忠远程压制敌先锋或主将，降低目标士气。", requiredRole: ["commander", "vanguard", "left", "right", "rear"], visualText: "百步穿杨" },
  { id: "active-surprise-raid", name: "突袭合围", type: "attack", cost: 46, cooldown: 3, targetType: "enemyUnit", range: 26, effect: "zhangliao_raid", description: "张辽侧翼突袭，低防线敌军承受更高损失。", requiredRole: ["vanguard", "left", "right", "commander"], visualText: "突袭合围" },
  { id: "active-lianying-fire", name: "稳火连营", type: "tactic", cost: 48, cooldown: 3, targetType: "lane", range: 100, effect: "luxun_fire_guard", description: "陆逊稳守中放火，兼具火攻与防守反击。", requiredRole: ["advisor", "commander", "rear"], visualText: "稳火连营" },
  { id: "active-poison-tactic", name: "毒计乱阵", type: "control", cost: 44, cooldown: 3, targetType: "enemyUnit", range: 100, effect: "jiaxu_poison", description: "贾诩扰乱敌阵，降低目标士气、攻击和命令效率。", requiredRole: ["advisor", "commander", "rear"], visualText: "毒计乱阵" },
  { id: "active-charge", name: "突击", type: "attack", cost: 35, cooldown: 2, targetType: "enemyUnit", range: 18, effect: "damage_push", description: "对目标部队造成额外损失，并向前推进。", requiredRole: ["commander", "vanguard", "left", "right"], visualText: "突击破阵" },
  { id: "active-break-army", name: "破军", type: "attack", cost: 50, cooldown: 3, targetType: "enemyUnit", range: 16, effect: "heavy_damage_morale", description: "重创前方敌军并降低士气。", requiredRole: ["commander", "vanguard"], visualText: "破军" },
  { id: "active-peerless", name: "无双", type: "attack", cost: 70, cooldown: 4, targetType: "lane", range: 24, effect: "lane_damage", description: "对同路敌军造成大范围杀伤。", requiredRole: ["commander", "vanguard"], visualText: "无双乱舞" },
  { id: "active-roar", name: "咆哮", type: "debuff", cost: 38, cooldown: 2, targetType: "lane", range: 24, effect: "lane_morale_down", description: "震慑同路敌军，降低士气并可能迫退。", requiredRole: ["commander", "vanguard"], visualText: "咆哮震军" },
  { id: "active-inspire", name: "鼓舞", type: "buff", cost: 34, cooldown: 2, targetType: "allAlly", range: 100, effect: "ally_morale_up", description: "提升我方全军士气。", visualText: "全军鼓舞" },
  { id: "active-steady", name: "稳军", type: "buff", cost: 32, cooldown: 2, targetType: "allAlly", range: 100, effect: "ally_defense_up", description: "降低己方本轮损失，并稳住溃退风险。", visualText: "稳住阵脚" },
  { id: "active-order", name: "号令", type: "buff", cost: 45, cooldown: 3, targetType: "allAlly", range: 100, effect: "ally_attack_push", description: "提升全军攻击和推进。", requiredRole: ["commander"], visualText: "号令三军" },
  { id: "active-fire", name: "火计", type: "tactic", cost: 45, cooldown: 3, targetType: "lane", range: 100, effect: "lane_fire_damage", description: "火攻一条战线敌军，造成伤害和士气下降，雨天削弱。", requiredRole: ["advisor", "commander", "rear"], visualText: "火计" },
  { id: "active-cunning", name: "奇谋", type: "control", cost: 40, cooldown: 3, targetType: "enemyUnit", range: 100, effect: "enemy_order_down", description: "降低敌方一支部队本轮命令效率。", requiredRole: ["advisor", "rear", "commander"], visualText: "奇谋" },
  { id: "active-detect", name: "识破", type: "tactic", cost: 30, cooldown: 2, targetType: "self", range: 100, effect: "counter_tactic", description: "反制敌方谋略并提升我方战机。", requiredRole: ["advisor", "rear", "commander"], visualText: "识破" },
  { id: "active-govern", name: "治军", type: "heal", cost: 28, cooldown: 2, targetType: "allyUnit", range: 100, effect: "ally_recover", description: "恢复一支己方部队士气并降低疲劳影响。", visualText: "治军" },
  { id: "active-siege", name: "攻城令", type: "siege", cost: 42, cooldown: 3, targetType: "gate", range: 100, effect: "gate_damage", description: "攻城战中额外削减城防。", requiredRole: ["commander", "vanguard", "left", "right"], visualText: "攻城令" },
];

const byId = new Map(activeSkills.map((skill) => [skill.id, skill]));

export const getActiveSkill = (skillId: string) => byId.get(skillId);

const pushUnique = (skills: string[], skillId: string) => {
  if (!skills.includes(skillId)) skills.push(skillId);
};

const signatureSkillByGeneralId: Record<string, string> = {
  "liu-bei": "active-ren-de",
  "guan-yu": "active-wusheng",
  "zhang-fei": "active-yanren-roar",
  "zhao-yun": "active-longdan",
  "cao-cao": "active-weiwu",
  "sun-quan": "active-jiangdong-guard",
  "lv-bu": "active-supreme-peerless",
  "zhuge-liang": "active-eight-array",
  "zhou-yu": "active-chibi-fire",
  "sima-yi": "active-deep-counter",
  "ma-chao": "active-xiliang-charge",
  "huang-zhong": "active-hundred-step",
  "zhang-liao": "active-surprise-raid",
  "lu-xun": "active-lianying-fire",
  "jia-xu": "active-poison-tactic",
};

// 将现有武将技能映射为 V13 战场主动技能。
export const getGeneralActiveSkillIds = (general?: General) => {
  const skillIds: string[] = [];
  if (!general) return ["active-charge", "active-inspire"];
  const signature = signatureSkillByGeneralId[general.id];
  if (signature) pushUnique(skillIds, signature);
  if (general.skills.some((id) => ["charge", "swift", "cavalryMaster"].includes(id))) pushUnique(skillIds, "active-charge");
  if (general.skills.includes("breakArmy")) pushUnique(skillIds, "active-break-army");
  if (general.skills.includes("prowess") || general.force >= 98) pushUnique(skillIds, "active-peerless");
  if (general.skills.includes("roar")) pushUnique(skillIds, "active-roar");
  if (general.skills.some((id) => ["inspire", "benevolence", "jiangdong", "hegemony", "gentry"].includes(id)) || general.charm >= 88) pushUnique(skillIds, "active-inspire");
  if (general.skills.some((id) => ["hold", "guard", "counter"].includes(id)) || general.command >= 90) pushUnique(skillIds, "active-steady");
  if (general.skills.includes("command") || general.command >= 94) pushUnique(skillIds, "active-order");
  if (general.skills.includes("fire")) pushUnique(skillIds, "active-fire");
  if (general.skills.some((id) => ["strategy", "lure", "ambush", "assist"].includes(id)) || general.intelligence >= 92) pushUnique(skillIds, "active-cunning");
  if (general.skills.some((id) => ["counter", "strategy", "assist"].includes(id)) || general.intelligence >= 95) pushUnique(skillIds, "active-detect");
  if (general.skills.some((id) => ["farm", "pacify", "finance", "recruitTalent"].includes(id)) || general.politics >= 88) pushUnique(skillIds, "active-govern");
  if (general.skills.some((id) => ["command", "breakArmy", "hold"].includes(id)) || general.command >= 88) pushUnique(skillIds, "active-siege");
  if (skillIds.length === 0) {
    pushUnique(skillIds, general.force >= general.intelligence ? "active-charge" : "active-cunning");
    pushUnique(skillIds, general.command >= 76 ? "active-steady" : "active-inspire");
  }
  return skillIds.slice(0, 4);
};

export const getUnitActiveSkills = (state: GameState, unit: BattleUnit) => {
  const general = state.generals.find((item) => item.id === unit.generalId);
  return getGeneralActiveSkillIds(general).map((skillId) => getActiveSkill(skillId)).filter((skill): skill is ActiveSkill => Boolean(skill));
};

export const getSkillUnavailableReason = (unit: BattleUnit, skill: ActiveSkill, weather: WeatherType, hasTarget: boolean, isSiege: boolean) => {
  if (unit.isRouted || unit.troops <= 0) return "部队已溃退";
  if (unit.skillEnergy < skill.cost) return `能量不足（需 ${skill.cost}）`;
  if ((unit.cooldowns[skill.id] ?? 0) > 0) return `冷却中 ${unit.cooldowns[skill.id]} 回合`;
  if (skill.requiredRole && !skill.requiredRole.includes(unit.role)) return "职位不适合";
  if (!hasTarget && skill.targetType !== "self" && skill.targetType !== "allAlly" && skill.targetType !== "gate") return "无目标";
  if (skill.targetType === "gate" && !isSiege) return "非攻城战";
  if (skill.id === "active-fire" && weather === "rain") return "雨天削弱，可用但收益降低";
  return "";
};
