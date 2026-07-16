import { getNeighbors } from "../data/routes";
import { applyExpToGeneral, getBestGeneral, isGeneralSearchableNear } from "./generalSystem";
import { totalTroops } from "./unitSystem";
import type { City, CityActionType, GameState, Troops } from "../types";

const updateCity = (state: GameState, cityId: string, updater: (city: City) => City): GameState => ({
  ...state,
  cities: state.cities.map((city) => (city.id === cityId ? updater(city) : city)),
});

export const canAct = (city: City, playerFactionId: string) => city.factionId === playerFactionId;

interface CityActionResult {
  state: GameState;
  logs: string[];
}

// 执行城市命令，返回新状态和事件日志。
export const performCityAction = (state: GameState, cityId: string, action: CityActionType): CityActionResult => {
  const city = state.cities.find((item) => item.id === cityId);
  if (!city || !canAct(city, state.playerFactionId)) return { state, logs: ["该城市本回合无法行动"] };
  const general = getBestGeneral(
    state,
    cityId,
    action === "search" || action === "scout" || action === "spy"
      ? "search"
      : action === "recruit" || action === "train" || action === "suppressBandits"
        ? "battle"
        : "politics",
  );
  const citySkillMap: Record<CityActionType, string[]> = {
    recruit: ["recruit", "gentry", "tyranny"],
    agriculture: ["farm", "pacify", "benevolence"],
    commerce: ["finance", "hegemony", "pacify"],
    defense: ["hold", "counter", "guard"],
    train: ["command", "inspire", "pressure"],
    search: ["recruitTalent", "benevolence", "gentry"],
    pacify: ["pacify", "benevolence", "recruitTalent"],
    scout: ["strategy", "assist", "lure", "ambush"],
    rest: ["pacify", "benevolence", "guard", "hold"],
    market: ["finance", "gentry", "hegemony"],
    spy: ["strategy", "assist", "lure", "ambush"],
    suppressBandits: ["command", "hold", "guard", "benevolence"],
    autoGovern: ["farm", "finance", "pacify", "command"],
  };
  const skillBoost = general?.skills.some((skill) => citySkillMap[action].includes(skill)) ? 1.25 : 1;
  const politics = general ? Math.max(general.politics, general.command) : 55;

  if (action === "recruit") {
    if (city.gold < 120 || city.food < 120) return { state, logs: ["金钱或粮草不足，无法征兵"] };
    const fatiguePenalty = Math.max(0, Math.floor((city.cityFatigue ?? 0) / 18));
    const base = Math.max(80, Math.floor((120 + city.publicOrder + politics * 0.8) * skillBoost - fatiguePenalty * 12));
    const added: Troops = {
      infantry: Math.floor(base * 0.42),
      cavalry: Math.floor(base * 0.18),
      archer: Math.floor(base * 0.25),
      navy: city.terrain === "river" ? Math.floor(base * 0.15) : Math.floor(base * 0.05),
    };
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 120,
      food: item.food - 120,
      troops: {
        infantry: item.troops.infantry + added.infantry,
        cavalry: item.troops.cavalry + added.cavalry,
        archer: item.troops.archer + added.archer,
        navy: item.troops.navy + added.navy,
      },
      cityFatigue: Math.min(100, (item.cityFatigue ?? 0) + 4),
      recoveryHint: "征兵增加城市压力，可通过休整或安抚恢复。",
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}征兵完成，新增士兵 ${added.infantry + added.cavalry + added.archer + added.navy} 人。`, ...exp.logs] };
  }

  if (action === "agriculture" || action === "commerce" || action === "defense") {
    const cost = action === "defense" ? 110 : 100;
    if (city.gold < cost) return { state, logs: ["金钱不足，无法执行建设"] };
    const gain = Math.floor((8 + politics / 18) * skillBoost);
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - cost,
      agriculture: action === "agriculture" ? Math.min(100, item.agriculture + gain) : item.agriculture,
      commerce: action === "commerce" ? Math.min(100, item.commerce + gain) : item.commerce,
      defense: action === "defense" ? Math.min(100, item.defense + gain) : item.defense,
      recoveryHint: action === "defense" ? "城防提升，守备更稳。" : "城市发展提升，长期收入增加。",
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    const label = action === "agriculture" ? "农业" : action === "commerce" ? "商业" : "城防";
    return { state: next, logs: [`${city.name}开发${label}，提升 ${gain} 点。`, ...exp.logs] };
  }

  if (action === "train") {
    if (city.food < 100) return { state, logs: ["粮草不足，无法训练"] };
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      food: item.food - 100,
      morale: Math.min(100, item.morale + 12),
      cityFatigue: Math.max(0, (item.cityFatigue ?? 0) - 4),
      recoveryHint: "训练提升士气，并小幅降低战后疲劳。",
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}完成训练，士气提升。`, ...exp.logs] };
  }

  if (action === "pacify") {
    if (city.gold < 60) return { state, logs: ["金钱不足，无法安抚民心"] };
    const gain = Math.floor((8 + (general?.charm ?? 55) / 16) * skillBoost);
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 60,
      publicOrder: Math.min(100, item.publicOrder + gain),
      morale: Math.min(100, item.morale + 4),
      cityFatigue: Math.max(0, (item.cityFatigue ?? 0) - 6),
      recoveryHint: "安抚后民心回升，城市压力下降。",
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}安抚民心，民心提升 ${gain} 点。`, ...exp.logs] };
  }

  if (action === "rest") {
    if (city.gold < 40) return { state, logs: ["金钱不足，无法安排休整"] };
    const fatigueDrop = Math.floor((12 + politics / 18) * skillBoost);
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 40,
      morale: Math.min(100, item.morale + 6),
      publicOrder: Math.min(100, item.publicOrder + 3),
      cityFatigue: Math.max(0, (item.cityFatigue ?? 0) - fatigueDrop),
      recoveryHint: "休整降低疲劳，并恢复少量士气与民心。",
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}休整完成，疲劳降低 ${fatigueDrop} 点。`, ...exp.logs] };
  }

  if (action === "market") {
    if (city.gold < 120) return { state, logs: ["金钱不足，无法在市集采购。"] };
    const caravanBoost = state.caravanMarketState?.active && state.caravanMarketState.cityId === cityId ? 1.35 : 1;
    const foodGain = Math.floor((210 + city.commerce * 3) * caravanBoost);
    const reputationDelta = state.caravanMarketState?.blackMarket ? -1 : 1;
    const next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 120,
      food: item.food + foodGain,
      commerce: Math.min(100, item.commerce + 2),
      actedThisTurn: true,
    }));
    return {
      state: {
        ...next,
        rulerReputation: Math.max(0, Math.min(100, (next.rulerReputation ?? 50) + reputationDelta)),
        caravanMarketState: next.caravanMarketState ? { ...next.caravanMarketState, active: false, goods: [] } : next.caravanMarketState,
      },
      logs: [`${city.name}开放市集，购得粮草 ${foodGain}。`],
    };
  }

  if (action === "suppressBandits") {
    const pressure = (city.banditPressure ?? 0) + (city.localUnrest ?? 0);
    if (pressure <= 0) return { state, logs: [`${city.name}地方治安尚稳，无需剿匪。`] };
    const success = Math.random() < Math.min(0.92, 0.45 + (general?.command ?? 55) / 180 + (general?.force ?? 55) / 240);
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      banditPressure: Math.max(0, (item.banditPressure ?? 0) - (success ? 24 : 10)),
      localUnrest: Math.max(0, (item.localUnrest ?? 0) - (success ? 16 : 6)),
      publicOrder: Math.min(100, item.publicOrder + (success ? 5 : 1)),
      gold: item.gold + (success ? 70 : 0),
      morale: Math.min(100, item.morale + (success ? 4 : 0)),
      actedThisTurn: true,
    }));
    if (general) {
      const exp = applyExpToGeneral(next, general.id, success ? 12 : 5);
      next = exp.state;
      return { state: next, logs: [`${city.name}${success ? "剿匪成功，缴获辎重并稳定地方。" : "剿匪未尽全功，但地方压力略降。"}`, ...exp.logs] };
    }
    return { state: next, logs: [`${city.name}${success ? "剿匪成功，缴获辎重并稳定地方。" : "剿匪未尽全功，但地方压力略降。"}`] };
  }

  if (action === "spy") {
    const target = getNeighbors(cityId)
      .map((id) => state.cities.find((item) => item.id === id))
      .find((item): item is City => item !== undefined && item.factionId !== city.factionId);
    if (!target) return { state, logs: ["周边没有可建立密探的敌城。"] };
    if (city.gold < 80) return { state, logs: ["金钱不足，无法布置密探。"] };
    const key = `${state.playerFactionId}:${target.id}`;
    const old = state.spyNetworks?.[key];
    const progressGain = Math.floor(18 + (general?.intelligence ?? 55) / 3);
    const progress = Math.min(100, (old?.progress ?? 0) + progressGain);
    const nextLevel = progress >= 90 ? "inside" : progress >= 55 ? "spy" : "contact";
    const next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 80,
      actedThisTurn: true,
    }));
    return {
      state: {
        ...next,
        spyNetworks: {
          ...(next.spyNetworks ?? {}),
          [key]: {
            cityId: target.id,
            ownerFactionId: state.playerFactionId,
            level: nextLevel,
            progress,
            risk: Math.max(8, 35 - Math.floor((general?.intelligence ?? 55) / 5)),
          },
        },
      },
      logs: [`${city.name}向${target.name}布置密探，暗线等级提升为 ${nextLevel}。`],
    };
  }

  if (action === "autoGovern") {
    const recommended: CityActionType =
      city.publicOrder < 58 ? "pacify" :
      (city.banditPressure ?? 0) >= 35 ? "suppressBandits" :
      city.food < totalTroops(city.troops) * 0.35 ? "agriculture" :
      city.gold < 260 ? "commerce" :
      city.morale < 62 ? "train" : "rest";
    const result = performCityAction(state, cityId, recommended);
    return {
      state: result.state,
      logs: [`${city.name}自动治理执行：${recommended}。`, ...result.logs],
    };
  }

  if (action === "scout") {
    const targets = getNeighbors(cityId)
      .map((id) => state.cities.find((item) => item.id === id))
      .filter((item): item is City => item !== undefined && item.factionId !== city.factionId);
    let next = updateCity(state, cityId, (item) => ({ ...item, actedThisTurn: true }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    const info = targets.length
      ? targets.map((target) => `${target.name} ${totalTroops(target.troops).toLocaleString()}兵 / 城防${target.defense}`).join("；")
      : "周边暂未发现敌对城市";
    return { state: next, logs: [`${city.name}侦察完成：${info}`, ...exp.logs] };
  }

  const searchable = state.generals.filter((item) => isGeneralSearchableNear(item, cityId));
  const searchBoost = general?.skills.some((skill) => ["recruitTalent", "benevolence", "gentry"].includes(skill)) ? 0.12 : 0;
  const chance = Math.min(0.9, 0.25 + ((general?.intelligence ?? 55) + (general?.charm ?? 55)) / 260 + searchBoost);
  const found = searchable.length > 0 && Math.random() < chance ? searchable[Math.floor(Math.random() * searchable.length)] : undefined;
  let next = updateCity(state, cityId, (item) => ({ ...item, actedThisTurn: true }));
  const logs: string[] = [];
  if (found) {
    next = {
      ...next,
      generals: next.generals.map((item) =>
        item.id === found.id ? { ...item, factionId: state.playerFactionId, locationCityId: cityId, status: "active" as const, loyalty: 70 + Math.floor(Math.random() * 20) } : item,
      ),
    };
    logs.push(`${city.name}搜索成功，${found.name}加入我方。`);
    if (general) {
      const exp = applyExpToGeneral(next, general.id, 15);
      next = exp.state;
      logs.push(...exp.logs);
    }
  } else {
    logs.push(`${city.name}搜索未有收获。`);
  }
  return { state: next, logs };
};

export const getAttackTargets = (state: GameState, cityId: string) => {
  const city = state.cities.find((item) => item.id === cityId);
  if (!city) return [];
  return getNeighbors(cityId)
    .map((id) => state.cities.find((item) => item.id === id))
    .filter((item): item is City => item !== undefined && item.factionId !== city.factionId);
};
