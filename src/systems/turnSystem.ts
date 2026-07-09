import { runAiTurn } from "./aiSystem";
import { refreshPlayerCommands } from "./commandSystem";
import { addLogs } from "./eventSystem";
import { checkGeneralAppearances } from "./generalSystem";
import { ensureStrategyObjectives } from "./strategyObjectiveSystem";
import { generateWorldEvents } from "./worldEventSystem";
import { applyLiuBeiEarlySupport, ensureLiuBeiProtection } from "./liubeiBalanceSystem";
import { advanceLivingWorld, ensureLivingWorldState } from "./livingWorldSystem";
import type { GameState, WeatherType } from "../types";

const weatherPool: WeatherType[] = ["sunny", "rain", "fog", "snow"];
const weatherText: Record<WeatherType, string> = { sunny: "晴", rain: "雨", fog: "雾", snow: "雪" };

// 结算城市资源产出，内政技能会提高对应收益。
const produceResources = (state: GameState) => {
  const generalsByCity = new Map(state.cities.map((city) => [city.id, state.generals.filter((general) => city.generals.includes(general.id))]));
  const cities = state.cities.map((city) => {
    const generals = generalsByCity.get(city.id) ?? [];
    const farmBoost = generals.some((general) => general.skills.some((skill) => ["farm", "pacify", "benevolence"].includes(skill))) ? 1.2 : 1;
    const financeBoost = generals.some((general) => general.skills.some((skill) => ["finance", "hegemony", "gentry"].includes(skill))) ? 1.2 : 1;
    const goldGain = Math.floor((city.commerce * 7 + city.publicOrder * 1.5) * financeBoost);
    const foodGain = Math.floor((city.agriculture * 9 + city.publicOrder * 1.2) * farmBoost);
    return {
      ...city,
      gold: city.gold + goldGain,
      food: city.food + foodGain,
      cityFatigue: Math.max(0, (city.cityFatigue ?? 0) - 2),
      morale: Math.min(100, city.morale + ((city.cityFatigue ?? 0) <= 25 ? 1 : 0)),
      recoveryHint: (city.cityFatigue ?? 0) > 60 ? "城市疲劳仍高，建议安排休整。" : city.recoveryHint ?? "状态稳定。",
    };
  });
  return { ...state, cities };
};

// 执行完整回合推进：时间、产出、天气、登场、AI、重置行动。
export const endTurn = (state: GameState): GameState => {
  let next: GameState = {
    ...state,
    month: state.month === 12 ? 1 : state.month + 1,
    year: state.month === 12 ? state.year + 1 : state.year,
  };
  const logs: string[] = ["各地完成本月资源产出"];
  next = produceResources(next);
  const liuBeiSupport = applyLiuBeiEarlySupport(next);
  next = liuBeiSupport.state;
  logs.push(...liuBeiSupport.logs);
  const worldEvents = generateWorldEvents(next);
  next = worldEvents.state;
  logs.push(...worldEvents.logs);
  const livingWorld = advanceLivingWorld(next);
  next = livingWorld.state;
  logs.push(...livingWorld.logs);
  const newWeather = weatherPool[Math.floor(Math.random() * weatherPool.length)];
  logs.push(newWeather !== next.currentWeather ? `天气转为${weatherText[newWeather]}` : `天气维持${weatherText[newWeather]}`);
  next = { ...next, currentWeather: newWeather };
  const appearance = checkGeneralAppearances(next);
  next = appearance.state;
  logs.push(...appearance.logs);
  const ai = runAiTurn(next);
  next = ai.state;
  logs.push(...ai.logs);
  next = {
    ...next,
    cities: next.cities.map((city) => ({ ...city, actedThisTurn: false })),
  };
  next = refreshPlayerCommands(ensureLivingWorldState(ensureLiuBeiProtection(next)));
  next = ensureStrategyObjectives(next);
  logs.push(`新回合指令刷新：指令${next.commandState.commands ?? 0}/${next.commandState.maxCommands ?? 0}`);
  return addLogs(next, logs);
};

export const getFactionStats = (state: GameState, factionId: string) => {
  const cities = state.cities.filter((city) => city.factionId === factionId);
  return {
    cities: cities.length,
    gold: cities.reduce((sum, city) => sum + city.gold, 0),
    food: cities.reduce((sum, city) => sum + city.food, 0),
    troops: cities.reduce((sum, city) => sum + city.troops.infantry + city.troops.cavalry + city.troops.archer + city.troops.navy, 0),
  };
};
