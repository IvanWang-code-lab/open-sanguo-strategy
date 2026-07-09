import { getNeighbors } from "../data/routes";
import { totalTroops, troopTypes } from "./unitSystem";
import type { City, ExpeditionPlan, ExpeditionPlanOptions, FormationTroopPreference, GameState, RiskLevel, SortiePreset, Troops } from "../types";

const zeroTroops: Troops = { infantry: 0, cavalry: 0, archer: 0, navy: 0 };

export const sortiePresetRatios: Record<SortiePreset, number> = {
  probe: 0.3,
  standard: 0.5,
  main: 0.7,
  allIn: 0.85,
  custom: 0.5,
};

export const garrisonPresetRatios = {
  "20": 0.2,
  "30": 0.3,
  "50": 0.5,
  custom: 0.3,
} as const;

export const sortiePresetLabels: Record<SortiePreset, string> = {
  probe: "轻装试探",
  standard: "标准出征",
  main: "主力出征",
  allIn: "全力进攻",
  custom: "自定义",
};

export const garrisonPresetLabels: Record<keyof typeof garrisonPresetRatios, string> = {
  "20": "留守 20%",
  "30": "留守 30%",
  "50": "留守 50%",
  custom: "自定义",
};

const preferenceWeights = (preference: FormationTroopPreference, defender?: City): Record<keyof Troops, number> => ({
  infantry: preference === "infantry" || preference === "siege" ? 1.45 : preference === "cavalry" ? 0.85 : 1,
  cavalry: preference === "cavalry" ? 1.55 : preference === "siege" || preference === "navy" ? 0.72 : 1,
  archer: preference === "archer" ? 1.55 : preference === "siege" ? 1.22 : 1,
  navy: preference === "navy" ? (defender?.terrain === "river" ? 1.75 : 1.1) : defender?.terrain === "river" ? 1.12 : 0.85,
});

const subtractTroops = (a: Troops, b: Troops): Troops => ({
  infantry: Math.max(0, a.infantry - b.infantry),
  cavalry: Math.max(0, a.cavalry - b.cavalry),
  archer: Math.max(0, a.archer - b.archer),
  navy: Math.max(0, a.navy - b.navy),
});

const clampRatio = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0.05, Math.min(0.95, value));
};

export const calculateMinimumGarrison = (city: City) => Math.max(300, Math.ceil(totalTroops(city.troops) * 0.15));

export const isFrontlineCity = (state: GameState, cityId: string) => {
  const city = state.cities.find((item) => item.id === cityId);
  if (!city) return false;
  return getNeighbors(cityId).some((id) => state.cities.find((item) => item.id === id)?.factionId !== city.factionId);
};

export const calculateRecommendedGarrison = (state: GameState, city: City) => {
  const total = totalTroops(city.troops);
  const frontRatio = isFrontlineCity(state, city.id) ? 0.35 : 0.25;
  const fatigueRatio = (city.cityFatigue ?? 0) >= 40 ? 0.08 : 0;
  return Math.max(calculateMinimumGarrison(city), Math.ceil(total * (frontRatio + fatigueRatio)));
};

const allocateByPreference = (cityTroops: Troops, requestedTotal: number, preference: FormationTroopPreference, defender?: City): Troops => {
  const available = totalTroops(cityTroops);
  const target = Math.max(0, Math.min(requestedTotal, available));
  if (target <= 0) return { ...zeroTroops };
  const weights = preferenceWeights(preference, defender);
  const weightedTotal = troopTypes.reduce((sum, type) => sum + cityTroops[type] * weights[type], 0);
  const assigned: Troops = { ...zeroTroops };
  for (const type of troopTypes) {
    const share = weightedTotal > 0 ? (cityTroops[type] * weights[type]) / weightedTotal : cityTroops[type] / Math.max(1, available);
    assigned[type] = Math.min(cityTroops[type], Math.floor(target * share));
  }
  let remaining = target - totalTroops(assigned);
  for (const type of [...troopTypes].sort((a, b) => cityTroops[b] - assigned[b] - (cityTroops[a] - assigned[a]))) {
    if (remaining <= 0) break;
    const add = Math.min(remaining, cityTroops[type] - assigned[type]);
    assigned[type] += add;
    remaining -= add;
  }
  return assigned;
};

const describeGarrisonRisk = (level: RiskLevel, garrison: number, recommended: number) => {
  if (level === "high") return `留守兵力 ${garrison.toLocaleString()} 低于建议 ${recommended.toLocaleString()}，若战败可能引发前线风险。`;
  if (level === "medium") return `留守兵力略低于建议，适合速战速决，战后需尽快训练或征兵。`;
  return "留守兵力充足，后方风险可控。";
};

export const createExpeditionPlan = (
  state: GameState,
  attackerCityId: string,
  defenderCityId: string,
  troopPreference: FormationTroopPreference = "balanced",
  options: ExpeditionPlanOptions = {},
): ExpeditionPlan => {
  const city = state.cities.find((item) => item.id === attackerCityId);
  const defender = state.cities.find((item) => item.id === defenderCityId);
  if (!city) {
    return {
      sortiePreset: "standard",
      garrisonPreset: "30",
      sortieRatio: 0.5,
      garrisonRatio: 0.3,
      minimumGarrison: 300,
      recommendedGarrison: 500,
      sortieTroops: { ...zeroTroops },
      garrisonTroops: { ...zeroTroops },
      sortieTotal: 0,
      garrisonTotal: 0,
      supplyCost: 0,
      marchRisk: "出发城市不存在。",
      garrisonRisk: "无法计算留守风险。",
      garrisonRiskLevel: "high",
      expectedLossRisk: 90,
      advice: "请选择有效城市。",
    };
  }
  const sortiePreset = options.sortiePreset ?? "standard";
  const garrisonPreset = options.garrisonPreset ?? "30";
  const sortieRatio = clampRatio(options.sortieRatio ?? sortiePresetRatios[sortiePreset], sortiePresetRatios.standard);
  const garrisonRatio = clampRatio(options.garrisonRatio ?? garrisonPresetRatios[garrisonPreset], garrisonPresetRatios["30"]);
  const total = totalTroops(city.troops);
  const minimumGarrison = calculateMinimumGarrison(city);
  const recommendedGarrison = calculateRecommendedGarrison(state, city);
  const requestedSortie = Math.floor(total * sortieRatio);
  const requestedGarrison = Math.floor(total * garrisonRatio);
  const maxByMinimum = Math.max(0, total - minimumGarrison);
  const maxByGarrisonChoice = Math.max(0, total - requestedGarrison);
  const sortieTotal = Math.max(0, Math.min(requestedSortie, maxByMinimum, maxByGarrisonChoice));
  const sortieTroops = allocateByPreference(city.troops, sortieTotal, troopPreference, defender);
  const garrisonTroops = subtractTroops(city.troops, sortieTroops);
  const garrisonTotal = totalTroops(garrisonTroops);
  const garrisonRiskLevel: RiskLevel =
    garrisonTotal < minimumGarrison ? "high" : garrisonTotal < recommendedGarrison ? "medium" : "low";
  const fatigue = city.cityFatigue ?? 0;
  const supplyCost = Math.ceil(sortieTotal * (defender?.terrain === "mountain" ? 0.18 : defender?.terrain === "river" ? 0.16 : 0.14));
  const expectedLossRisk = Math.max(
    12,
    Math.min(92, Math.round(34 + sortieRatio * 24 + (garrisonRiskLevel === "high" ? 16 : garrisonRiskLevel === "medium" ? 7 : 0) + fatigue * 0.25)),
  );
  const marchRisk =
    fatigue >= 55
      ? "城市疲劳较高，连续出征会提高战损。"
      : sortieRatio >= 0.8
        ? "全力进攻压迫力强，但战后疲劳和补给压力较高。"
        : "行军风险可控。";
  const advice =
    garrisonRiskLevel === "high"
      ? "建议提高留守比例，或先征兵/训练后再开战。"
      : sortieRatio >= 0.7
        ? "主力出征适合攻击弱城，战后注意休整。"
        : "当前出征规模稳健，适合标准作战。";
  return {
    sortiePreset,
    garrisonPreset,
    sortieRatio,
    garrisonRatio,
    minimumGarrison,
    recommendedGarrison,
    sortieTroops,
    garrisonTroops,
    sortieTotal,
    garrisonTotal,
    supplyCost,
    marchRisk,
    garrisonRisk: describeGarrisonRisk(garrisonRiskLevel, garrisonTotal, recommendedGarrison),
    garrisonRiskLevel,
    expectedLossRisk,
    advice,
  };
};
