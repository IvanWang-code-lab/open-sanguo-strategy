import { ART_ASSETS } from "../data/artAssets";
import { cityRoutes } from "../data/routes";
import { getAttackTargets } from "../systems/citySystem";
import { totalTroops } from "../systems/unitSystem";
import type { City, GameState } from "../types";

interface MapViewProps {
  state: GameState;
  selectedCityId: string;
  onSelectCity: (id: string) => void;
}

export function MapView({ state, selectedCityId, onSelectCity }: MapViewProps) {
  const cityMap = new Map(state.cities.map((city) => [city.id, city]));
  const factionColor = (city: City) => state.factions.find((faction) => faction.id === city.factionId)?.color ?? "#888";
  const selectedCity = state.cities.find((city) => city.id === selectedCityId);
  const attackableIds = new Set(
    selectedCity?.factionId === state.playerFactionId
      ? getAttackTargets(state, selectedCity.id).map((city) => city.id)
      : [],
  );
  return (
    <section className="map-panel">
      <svg className="map-svg" viewBox="80 45 830 735" role="img" aria-label="三国战略地图">
        <defs>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f8d477" floodOpacity="0.8" />
          </filter>
          <filter id="targetGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff7b4d" floodOpacity="0.9" />
          </filter>
        </defs>
        <image href={ART_ASSETS.backgrounds.mapClean} x="80" y="45" width="830" height="735" preserveAspectRatio="xMidYMid slice" />
        <rect x="80" y="45" width="830" height="735" className="map-darken" />
        {cityRoutes.map(([from, to]) => {
          const a = cityMap.get(from);
          const b = cityMap.get(to);
          if (!a || !b) return null;
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="route-line" />;
        })}
        {state.cities.map((city) => {
          const own = city.factionId === state.playerFactionId;
          const independent = city.factionId === "independent";
          const selected = city.id === selectedCityId;
          const attackable = attackableIds.has(city.id);
          const troops = totalTroops(city.troops);
          return (
            <g key={city.id} className="city-node" onClick={() => onSelectCity(city.id)} tabIndex={0}>
              <circle
                cx={city.x}
                cy={city.y}
                r={selected ? 15 : 12}
                fill={factionColor(city)}
                className={`${own ? "own" : independent ? "empty" : "enemy"} ${selected ? "selected" : ""} ${attackable ? "attackable" : ""}`}
                filter={selected ? "url(#glow)" : attackable ? "url(#targetGlow)" : undefined}
              />
              <text x={city.x + 16} y={city.y - 5} className="city-label">{city.name}</text>
              <text x={city.x + 16} y={city.y + 11} className="city-troops">{Math.floor(troops / 100)}百</text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <span><i className="legend own" />己方</span>
        <span><i className="legend enemy" />敌方</span>
        <span><i className="legend empty" />空城/在野</span>
      </div>
    </section>
  );
}
