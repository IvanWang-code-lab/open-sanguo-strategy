import { initialCities } from "../data/cities";
import { initialFactions } from "../data/factions";
import { initialGenerals } from "../data/generals";
import { GAME_VERSION } from "../constants/version";
import { calculateCommandState } from "./commandSystem";
import type { City, Faction, GameState, General } from "../types";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// 创建 190 年 1 月初始剧本，并根据玩家选择设置势力。
export const createInitialGame = (playerFactionId: string): GameState => {
  const factions = clone<Faction[]>(initialFactions).map((faction) => ({
    ...faction,
    isPlayer: faction.id === playerFactionId,
  }));
  const generals = clone<General[]>(initialGenerals);
  const cities = clone<City[]>(initialCities).map((city) => ({
    ...city,
    generals: generals
      .filter((general) => general.status === "active" && general.locationCityId === city.id)
      .map((general) => general.id),
  }));

  if (playerFactionId === "independent") {
    const yunnan = cities.find((city) => city.id === "yunnan");
    if (yunnan) {
      yunnan.factionId = "independent";
      yunnan.gold += 300;
      yunnan.food += 300;
    }
  }

  const game: GameState = {
    version: GAME_VERSION,
    playerFactionId,
    year: 190,
    month: 1,
    currentWeather: "sunny",
    factions,
    cities,
    generals,
    commandState: {
      politicalOrders: 0,
      maxPoliticalOrders: 0,
      militaryOrders: 0,
      maxMilitaryOrders: 0,
      commandEfficiency: 100,
      governanceLoad: 0,
      averagePublicOrder: 0,
      advisory: "",
    },
    currentTurnCommandsUsed: [],
    battleControlMode: "standard",
    commandPreferences: {
      battleControlMode: "standard",
      battleSpeed: "normal",
      aiBattleLogLevel: "important",
    },
    logs: ["190年1月：天下大乱，群雄并起。请选择方略，开创新霸王大陆。"],
  };
  return { ...game, commandState: calculateCommandState(game, playerFactionId) };
};
