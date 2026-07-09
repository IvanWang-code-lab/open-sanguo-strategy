import type { City, EventType, GameState, WorldEvent } from "../types";

const turnNumber = (state: GameState) => (state.year - 190) * 12 + state.month;

const eventTitle: Record<EventType, string> = {
  trend: "天下大势",
  regional: "地区动荡",
  talent: "人才传闻",
  publicOrder: "民心变化",
  warPressure: "战争压力",
  commerce: "商旅往来",
  disaster: "灾害疫病",
  anecdote: "名将轶闻",
  scenario: "剧本事件",
};

const pickCity = (state: GameState, offset: number) => {
  const cities = state.cities;
  return cities.length > 0 ? cities[(turnNumber(state) + offset) % cities.length] : undefined;
};

const makeEvent = (
  state: GameState,
  type: EventType,
  message: string,
  effects: string[],
  city?: City,
  importance: WorldEvent["importance"] = "normal",
): WorldEvent => ({
  id: `${state.year}-${state.month}-${type}-${city?.id ?? "world"}-${effects.length}`,
  turn: turnNumber(state),
  year: state.year,
  month: state.month,
  type,
  title: eventTitle[type],
  message,
  importance,
  affectedCityId: city?.id,
  affectedFactionId: city?.factionId,
  effects,
});

const updateCity = (state: GameState, cityId: string, updater: (city: City) => City): GameState => ({
  ...state,
  cities: state.cities.map((city) => (city.id === cityId ? updater(city) : city)),
});

export const ensureWorldEvents = (state: GameState): GameState => ({
  ...state,
  eventHistory: state.eventHistory ?? [],
  commandHistory: state.commandHistory ?? [],
});

export const generateWorldEvents = (state: GameState) => {
  let next = ensureWorldEvents(state);
  const events: WorldEvent[] = [];
  const turn = turnNumber(next);
  const first = pickCity(next, 3);
  const second = pickCity(next, 11);

  if (first && turn % 2 === 0) {
    const event = makeEvent(next, "commerce", `${first.name}商旅聚集，市井回暖。`, ["金钱 +120", "民心 +1"], first);
    next = updateCity(next, first.id, (city) => ({ ...city, gold: city.gold + 120, publicOrder: Math.min(100, city.publicOrder + 1) }));
    events.push(event);
  }

  if (second && turn % 3 === 0) {
    const event = makeEvent(next, "regional", `${second.name}附近流民与兵役压力上升，地方官吏请求安抚。`, ["民心 -2", "疲劳 +3"], second);
    next = updateCity(next, second.id, (city) => ({
      ...city,
      publicOrder: Math.max(20, city.publicOrder - 2),
      cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + 3),
      recoveryHint: "地方压力上升，建议安抚或休整。",
    }));
    events.push(event);
  }

  if (turn % 5 === 0) {
    const city = pickCity(next, 19);
    if (city) {
      const event = makeEvent(next, "talent", `有士人传言：${city.name}一带近日出现奇才踪迹。`, ["搜索成功率提示", "人才线索"], city, "major");
      events.push(event);
    }
  }

  if (turn % 6 === 0) {
    const playerCities = next.cities.filter((city) => city.factionId === next.playerFactionId);
    const front = playerCities.sort((a, b) => (b.cityFatigue ?? 0) - (a.cityFatigue ?? 0))[0] ?? playerCities[0];
    if (front) {
      const event = makeEvent(next, "trend", `诸侯互相试探，${front.name}被视为当前战略焦点。`, ["前线压力上升", "建议侦察或修城"], front, "major");
      events.push(event);
    }
  }

  const logs = events.map((event) => `${event.importance === "major" ? "【天下大事】" : "【情报】"}${event.message}`);
  return {
    state: {
      ...next,
      eventHistory: [...events, ...(next.eventHistory ?? [])].slice(0, 40),
    },
    events,
    logs,
  };
};
