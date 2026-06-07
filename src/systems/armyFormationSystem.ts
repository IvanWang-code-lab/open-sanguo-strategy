import { totalTroops } from "./unitSystem";
import type { ArmyFormation, City, FormationRoleOverrides, FormationScores, FormationStyle, FormationTroopPreference, GameState, General, TroopAssignment, Troops } from "../types";

const zeroTroops: Troops = { infantry: 0, cavalry: 0, archer: 0, navy: 0 };

export const formationStyleLabels: Record<FormationStyle, string> = {
  auto: "均衡编成",
  cavalry: "骑兵突击",
  archer: "弓兵压制",
  steady: "稳守反击",
  siege: "攻城编成",
};

export const troopPreferenceLabels: Record<FormationTroopPreference, string> = {
  balanced: "均衡",
  infantry: "步兵为主",
  cavalry: "骑兵为主",
  archer: "弓兵为主",
  navy: "水军为主",
  siege: "攻城为主",
};

export const roleLabels: Record<TroopAssignment["role"], string> = {
  commander: "主将",
  advisor: "军师",
  vanguard: "先锋",
  left: "左翼",
  right: "右翼",
  reserve: "后军",
};

export const commandCapacity = (general?: General) => (general ? 500 + general.command * 25 + general.level * 50 : 0);

const getCityGenerals = (state: GameState, city: City) =>
  state.generals.filter((general) => city.generals.includes(general.id) && general.status === "active");

export const getFormationCandidates = (state: GameState, cityId: string) => {
  const city = state.cities.find((item) => item.id === cityId);
  return city ? getCityGenerals(state, city) : [];
};

const scoreGeneral = (general: General, mode: "commander" | "advisor" | "vanguard" | "wing" | "reserve") => {
  if (mode === "advisor") return general.intelligence * 0.62 + general.politics * 0.2 + general.command * 0.18;
  if (mode === "vanguard") return general.force * 0.62 + general.command * 0.28 + general.charm * 0.1;
  if (mode === "wing") return general.command * 0.5 + general.force * 0.32 + general.intelligence * 0.18;
  if (mode === "reserve") return general.command * 0.42 + general.intelligence * 0.3 + general.politics * 0.28;
  return general.command * 0.45 + general.force * 0.3 + general.intelligence * 0.18 + general.charm * 0.07;
};

const pickGeneral = (generals: General[], mode: Parameters<typeof scoreGeneral>[1], used: Set<string>) =>
  [...generals]
    .filter((general) => !used.has(general.id))
    .sort((a, b) => scoreGeneral(b, mode) - scoreGeneral(a, mode))[0];

const validOverride = (generals: General[], id?: string, used?: Set<string>) => {
  if (!id || used?.has(id)) return undefined;
  return generals.find((general) => general.id === id);
};

const pickRole = (
  generals: General[],
  roleId: string | undefined,
  mode: Parameters<typeof scoreGeneral>[1],
  used: Set<string>,
) => {
  const manual = validOverride(generals, roleId, used);
  const picked = manual ?? pickGeneral(generals, mode, used);
  if (picked) used.add(picked.id);
  return picked;
};

const scaleByStyle = (troops: Troops, style: FormationStyle, preference: FormationTroopPreference, defender?: City): Troops => {
  const ratios: Record<FormationStyle, Troops> = {
    auto: { infantry: 0.55, cavalry: 0.55, archer: 0.55, navy: 0.55 },
    cavalry: { infantry: 0.45, cavalry: 0.72, archer: 0.44, navy: defender?.terrain === "river" ? 0.5 : 0.38 },
    archer: { infantry: 0.46, cavalry: 0.42, archer: 0.72, navy: defender?.terrain === "river" ? 0.52 : 0.38 },
    steady: { infantry: 0.48, cavalry: 0.42, archer: 0.48, navy: 0.45 },
    siege: { infantry: 0.68, cavalry: 0.36, archer: 0.58, navy: defender?.terrain === "river" ? 0.56 : 0.35 },
  };
  const preferenceRatio: Record<FormationTroopPreference, Troops> = {
    balanced: { infantry: 1, cavalry: 1, archer: 1, navy: 1 },
    infantry: { infantry: 1.22, cavalry: 0.84, archer: 0.92, navy: 0.86 },
    cavalry: { infantry: 0.86, cavalry: 1.25, archer: 0.86, navy: 0.75 },
    archer: { infantry: 0.9, cavalry: 0.82, archer: 1.28, navy: 0.8 },
    navy: { infantry: 0.82, cavalry: 0.68, archer: 0.9, navy: defender?.terrain === "river" ? 1.35 : 0.95 },
    siege: { infantry: 1.25, cavalry: 0.72, archer: 1.12, navy: defender?.terrain === "river" ? 1 : 0.72 },
  };
  const ratio = ratios[style];
  const pref = preferenceRatio[preference];
  return {
    infantry: Math.floor(troops.infantry * ratio.infantry * pref.infantry),
    cavalry: Math.floor(troops.cavalry * ratio.cavalry * pref.cavalry),
    archer: Math.floor(troops.archer * ratio.archer * pref.archer),
    navy: Math.floor(troops.navy * ratio.navy * pref.navy),
  };
};

const splitTroops = (troops: Troops, slots: Array<Pick<TroopAssignment, "generalId" | "role" | "capacity">>) => {
  if (slots.length === 0) return [];
  const weights: Record<TroopAssignment["role"], number> = {
    commander: 1.25,
    advisor: 0.45,
    vanguard: 1,
    left: 0.85,
    right: 0.85,
    reserve: 0.6,
  };
  const totalWeight = slots.reduce((sum, slot) => sum + weights[slot.role], 0);
  const assignments = slots.map((slot) => {
    const share = weights[slot.role] / totalWeight;
    const assigned: Troops = {
      infantry: Math.floor(troops.infantry * share),
      cavalry: Math.floor(troops.cavalry * share),
      archer: Math.floor(troops.archer * share),
      navy: Math.floor(troops.navy * share),
    };
    const total = totalTroops(assigned);
    return {
      ...slot,
      ...assigned,
      total,
      efficiency: Math.min(1, slot.capacity / Math.max(1, total)),
    };
  });
  const used = assignments.reduce<Troops>(
    (sum, item) => ({
      infantry: sum.infantry + item.infantry,
      cavalry: sum.cavalry + item.cavalry,
      archer: sum.archer + item.archer,
      navy: sum.navy + item.navy,
    }),
    zeroTroops,
  );
  const first = assignments[0];
  if (first) {
    first.infantry += troops.infantry - used.infantry;
    first.cavalry += troops.cavalry - used.cavalry;
    first.archer += troops.archer - used.archer;
    first.navy += troops.navy - used.navy;
    first.total = totalTroops(first);
    first.efficiency = Math.min(1, first.capacity / Math.max(1, first.total));
  }
  return assignments;
};

export const sumAssignedTroops = (formation?: ArmyFormation): Troops => {
  if (!formation) return zeroTroops;
  return formation.troopAssignments.reduce<Troops>(
    (sum, item) => ({
      infantry: sum.infantry + item.infantry,
      cavalry: sum.cavalry + item.cavalry,
      archer: sum.archer + item.archer,
      navy: sum.navy + item.navy,
    }),
    zeroTroops,
  );
};

const calculateFormationScores = (
  generals: ReturnType<typeof getFormationGenerals>,
  formation: Pick<ArmyFormation, "totalTroops" | "capacityPressure" | "formationStyle" | "troopPreference">,
  defender?: City,
): FormationScores => {
  const commander = generals.commander;
  const advisor = generals.advisor;
  const vanguard = generals.vanguard;
  const left = generals.left;
  const right = generals.right;
  const reserve = generals.reserve;
  const militaryPower = Math.round(((commander?.command ?? 45) * 0.42 + (commander?.force ?? 45) * 0.28 + (vanguard?.force ?? 45) * 0.2 + formation.totalTroops / 180) * (1 - formation.capacityPressure));
  const opportunity = Math.round((advisor?.intelligence ?? 45) * 0.45 + (left?.command ?? 45) * 0.18 + (right?.command ?? 45) * 0.18 + (commander?.charm ?? 45) * 0.12);
  const breakthrough = Math.round((vanguard?.force ?? 45) * 0.36 + (commander?.force ?? 45) * 0.25 + (left?.force ?? 45) * 0.14 + (right?.force ?? 45) * 0.14 + (formation.formationStyle === "siege" ? 8 : 0));
  const stability = Math.round((commander?.command ?? 45) * 0.35 + (reserve?.command ?? 45) * 0.25 + (advisor?.intelligence ?? 45) * 0.16 + (defender?.defense ?? 40) * 0.05 - formation.capacityPressure * 35);
  const expectedLossRisk = Math.max(12, Math.min(88, Math.round(52 - stability * 0.22 + formation.capacityPressure * 60 + (formation.formationStyle === "cavalry" ? 8 : 0) - (formation.formationStyle === "steady" ? 8 : 0))));
  const average = (militaryPower + opportunity + breakthrough + stability - expectedLossRisk * 0.35) / 4;
  const rating: FormationScores["rating"] = average >= 70 ? "S" : average >= 58 ? "A" : average >= 46 ? "B" : "C";
  const advice =
    rating === "S"
      ? "军团结构完整，可主动争取破阵。"
      : rating === "A"
        ? "编成稳健，建议配合侦察后出兵。"
        : rating === "B"
          ? "可战但存在短板，注意降低损失。"
          : "风险偏高，建议补充武将或先训练征兵。";
  return { militaryPower, opportunity, breakthrough, stability, expectedLossRisk, rating, advice };
};

// 根据城市武将能力自动生成轻量军团编成。
export const createAutoFormation = (
  state: GameState,
  attackerCityId: string,
  defenderCityId: string,
  style: FormationStyle = "auto",
  troopPreference: FormationTroopPreference = "balanced",
  overrides: FormationRoleOverrides = {},
): ArmyFormation => {
  const city = state.cities.find((item) => item.id === attackerCityId);
  const defender = state.cities.find((item) => item.id === defenderCityId);
  const generals = city ? getCityGenerals(state, city) : [];
  const used = new Set<string>();
  const commander = pickRole(generals, overrides.commanderId, "commander", used);
  const advisor = pickRole(generals, overrides.advisorId, "advisor", used);
  const vanguard = pickRole(generals, overrides.vanguardGeneralId, "vanguard", used);
  const left = pickRole(generals, overrides.leftGeneralId, "wing", used);
  const right = pickRole(generals, overrides.rightGeneralId, "wing", used);
  const reserve = pickRole(generals, overrides.reserveGeneralId, "reserve", used);

  const slots = [
    commander && { generalId: commander.id, role: "commander" as const, capacity: commandCapacity(commander) },
    advisor && { generalId: advisor.id, role: "advisor" as const, capacity: commandCapacity(advisor) },
    vanguard && { generalId: vanguard.id, role: "vanguard" as const, capacity: commandCapacity(vanguard) },
    left && { generalId: left.id, role: "left" as const, capacity: commandCapacity(left) },
    right && { generalId: right.id, role: "right" as const, capacity: commandCapacity(right) },
    reserve && { generalId: reserve.id, role: "reserve" as const, capacity: commandCapacity(reserve) },
  ].filter((slot): slot is Pick<TroopAssignment, "generalId" | "role" | "capacity"> => Boolean(slot));

  const sentTroops = city ? scaleByStyle(city.troops, style, troopPreference, defender) : zeroTroops;
  const assignments = splitTroops(sentTroops, slots);
  const total = totalTroops(sentTroops);
  const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const capacityPressure = total > totalCapacity ? Math.min(0.35, (total - totalCapacity) / Math.max(1, total) * 0.5) : 0;

  const direction: ArmyFormation["attackDirection"] =
    style === "cavalry" ? "right" : style === "archer" ? "left" : style === "steady" ? "balanced" : "center";
  const summary = `${formationStyleLabels[style]} / ${troopPreferenceLabels[troopPreference]}：${commander?.name ?? "无主将"}统军，${advisor?.name ?? "无军师"}参赞，出兵${total.toLocaleString()}。`;

  const basicFormation = {
    commanderId: commander?.id,
    advisorId: advisor?.id,
    vanguardGeneralId: vanguard?.id,
    leftGeneralId: left?.id,
    rightGeneralId: right?.id,
    reserveGeneralId: reserve?.id,
    troopAssignments: assignments,
    formationStyle: style,
    troopPreference,
    tacticStyle: `${formationStyleLabels[style]} · ${troopPreferenceLabels[troopPreference]}`,
    attackDirection: direction,
    totalTroops: total,
    capacityPressure,
    summary,
  } satisfies Omit<ArmyFormation, "scores">;
  const scores = calculateFormationScores(getFormationGenerals(state, basicFormation), basicFormation, defender);

  return {
    ...basicFormation,
    scores,
  };
};

export const getFormationGenerals = (state: GameState, formation?: ArmyFormation) => {
  const byId = (id?: string) => state.generals.find((general) => general.id === id);
  return {
    commander: byId(formation?.commanderId),
    advisor: byId(formation?.advisorId),
    vanguard: byId(formation?.vanguardGeneralId),
    left: byId(formation?.leftGeneralId),
    right: byId(formation?.rightGeneralId),
    reserve: byId(formation?.reserveGeneralId),
  };
};

export const getFormationWarnings = (formation: ArmyFormation) => {
  const warnings: string[] = [];
  if (!formation.commanderId) warnings.push("缺少主将，无法发挥军团统御。");
  if (!formation.advisorId) warnings.push("缺少军师，计策类战术成功率下降。");
  if (formation.capacityPressure > 0) warnings.push("部分武将带兵超过统率上限，战斗效率下降。");
  if (formation.totalTroops < 200) warnings.push("出兵不足 200，无法开战。");
  return warnings;
};

export const getRoleGeneralName = (state: GameState, id?: string) =>
  id ? state.generals.find((general) => general.id === id)?.name ?? "未知武将" : "未任命";
