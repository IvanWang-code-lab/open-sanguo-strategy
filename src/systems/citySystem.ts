import { getNeighbors } from "../data/routes";
import { applyExpToGeneral, getBestGeneral, isGeneralSearchableNear } from "./generalSystem";
import { totalTroops } from "./unitSystem";
import type { City, CityActionType, GameState, Troops } from "../types";

const updateCity = (state: GameState, cityId: string, updater: (city: City) => City): GameState => ({
  ...state,
  cities: state.cities.map((city) => (city.id === cityId ? updater(city) : city)),
});

export const canAct = (city: City, playerFactionId: string) => city.factionId === playerFactionId && !city.actedThisTurn;

// 执行城市内政行动，返回新状态和日志。
export const performCityAction = (state: GameState, cityId: string, action: CityActionType) => {
  const city = state.cities.find((item) => item.id === cityId);
  if (!city || !canAct(city, state.playerFactionId)) return { state, logs: ["该城市本回合无法行动"] };
  const general = getBestGeneral(state, cityId, action === "search" || action === "scout" ? "search" : action === "recruit" || action === "train" ? "battle" : "politics");
  const citySkillMap: Record<CityActionType, string[]> = {
    recruit: ["recruit", "gentry", "tyranny"],
    agriculture: ["farm", "pacify", "benevolence"],
    commerce: ["finance", "hegemony", "pacify"],
    defense: ["hold", "counter", "guard"],
    train: ["command", "inspire", "pressure"],
    search: ["recruitTalent", "benevolence", "gentry"],
    pacify: ["pacify", "benevolence", "recruitTalent"],
    scout: ["strategy", "assist", "lure", "ambush"],
  };
  const skillBoost = general?.skills.some((skill) => citySkillMap[action].includes(skill)) ? 1.25 : 1;
  const politics = general ? Math.max(general.politics, general.command) : 55;

  if (action === "recruit") {
    if (city.gold < 120 || city.food < 120) return { state, logs: ["金钱或粮草不足，无法征兵"] };
    const base = Math.floor((120 + city.publicOrder + politics * 0.8) * skillBoost);
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
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}征兵完成，新增士兵${added.infantry + added.cavalry + added.archer + added.navy}人`, ...exp.logs] };
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
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    const label = action === "agriculture" ? "农业" : action === "commerce" ? "商业" : "城防";
    return { state: next, logs: [`${city.name}开发${label}，提升${gain}点`, ...exp.logs] };
  }

  if (action === "train") {
    if (city.food < 100) return { state, logs: ["粮草不足，无法训练"] };
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      food: item.food - 100,
      morale: Math.min(100, item.morale + 12),
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}完成训练，士气提升`, ...exp.logs] };
  }

  if (action === "pacify") {
    if (city.gold < 60) return { state, logs: ["金钱不足，无法安抚民心"] };
    const gain = Math.floor((8 + (general?.charm ?? 55) / 16) * skillBoost);
    let next = updateCity(state, cityId, (item) => ({
      ...item,
      gold: item.gold - 60,
      publicOrder: Math.min(100, item.publicOrder + gain),
      morale: Math.min(100, item.morale + 4),
      actedThisTurn: true,
    }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    return { state: next, logs: [`${city.name}安抚民心，民心提升${gain}点`, ...exp.logs] };
  }

  if (action === "scout") {
    const targets = getNeighbors(cityId)
      .map((id) => state.cities.find((item) => item.id === id))
      .filter((item): item is City => item !== undefined && item.factionId !== city.factionId);
    let next = updateCity(state, cityId, (item) => ({ ...item, actedThisTurn: true }));
    const exp = general ? applyExpToGeneral(next, general.id, 5) : { state: next, logs: [] };
    next = exp.state;
    const info = targets.length
      ? targets.map((target) => `${target.name}${totalTroops(target.troops).toLocaleString()}兵/城防${target.defense}`).join("；")
      : "周边暂未发现敌对城池";
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
      cities: next.cities.map((item) => (item.id === cityId ? { ...item, generals: [...item.generals, found.id] } : item)),
    };
    logs.push(`${city.name}搜索成功，${found.name}加入我方`);
    if (general) {
      const exp = applyExpToGeneral(next, general.id, 15);
      next = exp.state;
      logs.push(...exp.logs);
    }
  } else {
    logs.push(`${city.name}搜索未有收获`);
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
