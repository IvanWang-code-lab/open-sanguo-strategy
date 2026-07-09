import { useMemo, useState } from "react";
import { ART_ASSETS } from "../data/artAssets";
import { cityRoutes } from "../data/routes";
import { getAttackTargets } from "../systems/citySystem";
import { isFrontlineCity } from "../systems/expeditionSystem";
import { totalTroops } from "../systems/unitSystem";
import type { City, GameState, MapMode } from "../types";

interface MapViewProps {
  state: GameState;
  selectedCityId: string;
  onSelectCity: (id: string) => void;
  onAttackCity?: (id: string) => void;
}

const modeLabels: Record<MapMode, string> = {
  normal: "沙盘",
  faction: "势力",
  frontline: "前线",
  publicOrder: "民心",
  military: "军势",
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function MapView({ state, selectedCityId, onSelectCity, onAttackCity }: MapViewProps) {
  const [mode, setMode] = useState<MapMode>("normal");
  const [hoverCityId, setHoverCityId] = useState("");
  const cityMap = new Map(state.cities.map((city) => [city.id, city]));
  const selectedCity = state.cities.find((city) => city.id === selectedCityId);
  const hoverCity = state.cities.find((city) => city.id === hoverCityId);
  const attackableIds = new Set(
    selectedCity?.factionId === state.playerFactionId
      ? getAttackTargets(state, selectedCity.id).map((city) => city.id)
      : [],
  );
  const adjacentIds = new Set(cityRoutes.flatMap(([from, to]) => (from === selectedCityId ? [to] : to === selectedCityId ? [from] : [])));

  const factionColor = (city: City) => state.factions.find((faction) => faction.id === city.factionId)?.color ?? "#888";
  const cityVisual = (city: City) => {
    if (mode === "frontline") return isFrontlineCity(state, city.id) ? "#d95b3d" : "#6b7a6a";
    if (mode === "publicOrder") return city.publicOrder < 50 ? "#c44737" : city.publicOrder < 70 ? "#d6b46a" : "#6ea86e";
    if (mode === "military") {
      const power = totalTroops(city.troops);
      return power > 3000 ? "#f3c866" : power > 1600 ? "#8fb4d8" : "#8a8d92";
    }
    return factionColor(city);
  };

  const worldSummary = useMemo(() => {
    const playerCities = state.cities.filter((city) => city.factionId === state.playerFactionId);
    const frontlines = playerCities.filter((city) => isFrontlineCity(state, city.id)).length;
    const lowOrder = playerCities.filter((city) => city.publicOrder < 55).length;
    const tired = playerCities.filter((city) => (city.cityFatigue ?? 0) >= 45).length;
    return { frontlines, lowOrder, tired };
  }, [state]);

  const handleCityClick = (city: City) => {
    if (attackableIds.has(city.id) && onAttackCity) {
      onAttackCity(city.id);
      return;
    }
    onSelectCity(city.id);
  };

  return (
    <section className="map-panel immersive-map-panel">
      <div className="map-command-strip">
        <div>
          <p className="eyebrow">天下沙盘</p>
          <h2>{state.scenarioName ?? "群雄讨董"} · {state.year}年{state.month}月</h2>
        </div>
        <div className="map-mode-switch">
          {(Object.keys(modeLabels) as MapMode[]).map((item) => (
            <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>
              {modeLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <svg className="map-svg immersive-map" viewBox="80 45 830 735" role="img" aria-label="三国战略沙盘">
        <defs>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f8d477" floodOpacity="0.85" />
          </filter>
          <filter id="targetGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ff7b4d" floodOpacity="0.95" />
          </filter>
          <linearGradient id="routeFlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7b5530" />
            <stop offset="50%" stopColor="#e5c16a" />
            <stop offset="100%" stopColor="#7b5530" />
          </linearGradient>
        </defs>
        <image href={ART_ASSETS.backgrounds.mapClean} x="80" y="45" width="830" height="735" preserveAspectRatio="xMidYMid slice" />
        <rect x="80" y="45" width="830" height="735" className="map-darken" />
        {cityRoutes.map(([from, to]) => {
          const a = cityMap.get(from);
          const b = cityMap.get(to);
          if (!a || !b) return null;
          const adjacent = from === selectedCityId || to === selectedCityId;
          const attackRoute = attackableIds.has(from) || attackableIds.has(to);
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`route-line ${adjacent ? "adjacent" : ""} ${attackRoute ? "attack-route" : ""}`}
            />
          );
        })}
        {state.cities.map((city) => {
          const own = city.factionId === state.playerFactionId;
          const independent = city.factionId === "independent";
          const selected = city.id === selectedCityId;
          const attackable = attackableIds.has(city.id);
          const adjacent = adjacentIds.has(city.id);
          const frontline = isFrontlineCity(state, city.id);
          const troops = totalTroops(city.troops);
          const size = city.defense >= 60 ? 16 : troops > 2600 ? 14 : 11;
          const warning = city.publicOrder < 55 || (city.cityFatigue ?? 0) >= 50;
          return (
            <g
              key={city.id}
              className={`city-node city-stamp ${own ? "own" : independent ? "empty" : "enemy"} ${selected ? "selected" : ""} ${attackable ? "attackable" : ""} ${frontline ? "frontline" : ""}`}
              onClick={() => handleCityClick(city)}
              onMouseEnter={() => setHoverCityId(city.id)}
              onMouseLeave={() => setHoverCityId("")}
              tabIndex={0}
            >
              {frontline && <path d={`M ${city.x - 13} ${city.y - 25} L ${city.x - 13} ${city.y - 45} L ${city.x + 5} ${city.y - 39} L ${city.x - 13} ${city.y - 33}`} className="frontline-flag" />}
              <circle
                cx={city.x}
                cy={city.y}
                r={size + (selected ? 4 : 0)}
                fill={cityVisual(city)}
                className={`${selected ? "selected" : ""} ${attackable ? "attackable" : ""}`}
                filter={selected ? "url(#glow)" : attackable ? "url(#targetGlow)" : undefined}
              />
              <circle cx={city.x} cy={city.y} r={clamp(city.defense / 5, 7, 18)} className="defense-ring" />
              {city.actedThisTurn && <text x={city.x - 9} y={city.y + 5} className="acted-stamp">令</text>}
              {warning && <text x={city.x - 6} y={city.y - 19} className="warning-stamp">!</text>}
              {attackable && <text x={city.x - 14} y={city.y + 31} className="attack-stamp">可攻</text>}
              {!attackable && adjacent && !own && <text x={city.x - 14} y={city.y + 31} className="intel-stamp">邻敌</text>}
              <text x={city.x + 16} y={city.y - 5} className="city-label">{city.name}</text>
              <text x={city.x + 16} y={city.y + 12} className="city-troops">{Math.floor(troops / 100)}百 · 防{city.defense}</text>
            </g>
          );
        })}
      </svg>

      <div className="sand-table-footer">
        <span>前线 {worldSummary.frontlines}</span>
        <span>低民心 {worldSummary.lowOrder}</span>
        <span>疲劳城 {worldSummary.tired}</span>
        <span>选中己方城后点击相邻敌城可直接进入军议</span>
      </div>

      {hoverCity && (
        <div className="map-hover-brief">
          <b>{hoverCity.name}</b>
          <span>{state.factions.find((faction) => faction.id === hoverCity.factionId)?.name ?? "未知势力"}</span>
          <span>兵力 {totalTroops(hoverCity.troops).toLocaleString()} · 城防 {hoverCity.defense}</span>
          <span>民心 {hoverCity.publicOrder} · 士气 {hoverCity.morale} · 疲劳 {hoverCity.cityFatigue ?? 0}</span>
        </div>
      )}
    </section>
  );
}
