import type { CSSProperties } from "react";
import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { getGeneralVisualProfile } from "../data/generalVisualProfiles";
import { skillName } from "../data/skills";
import { totalTroops } from "../systems/unitSystem";
import { terrainLabels, troopLabels } from "../types";
import type { City, GameState } from "../types";
import { getGeneralsAtCity } from "../selectors/generalSelectors";

interface CityPanelProps {
  state: GameState;
  city?: City;
  onRequestTransfer?: (cityId: string) => void;
}

export function CityPanel({ state, city, onRequestTransfer }: CityPanelProps) {
  if (!city) return <aside className="city-seal-panel empty">沙盘未选城</aside>;
  const faction = state.factions.find((item) => item.id === city.factionId);
  const generals = getGeneralsAtCity(state, city.id);
  const fatigue = city.cityFatigue ?? 0;
  return (
    <aside className="city-seal-panel" style={{ "--faction-color": faction?.color ?? "#d6b46a" } as CSSProperties}>
      <header>
        <span>城池印信</span>
        <h2>{city.name}</h2>
        <b>{faction?.name ?? "未知势力"} · {terrainLabels[city.terrain]}</b>
      </header>
      <div className="seal-meter-grid">
        <span>兵力 <b>{totalTroops(city.troops).toLocaleString()}</b></span>
        <span>金 <b>{city.gold}</b></span>
        <span>粮 <b>{city.food}</b></span>
        <span>农 <b>{city.agriculture}</b></span>
        <span>商 <b>{city.commerce}</b></span>
        <span>防 <b>{city.defense}</b></span>
        <span>士 <b>{city.morale}</b></span>
        <span>民 <b>{city.publicOrder}</b></span>
        <span className={fatigue >= 60 ? "danger-text" : fatigue >= 35 ? "warning-text-inline" : ""}>疲 <b>{fatigue}</b></span>
        <span>{city.actedThisTurn ? "已盖令" : "候令"}</span>
      </div>
      <p className="recovery-hint">{city.recoveryHint ?? "城市状态稳定。"}</p>
      <div className="troop-ribbon">
        {Object.entries(city.troops).map(([type, count]) => (
          <span key={type}>{troopLabels[type as keyof typeof troopLabels]} {count}</span>
        ))}
      </div>
      <div className="resident-generals">
        {generals.length === 0 ? <span>本城暂无武将，可从相邻己方城市请求调入</span> : generals.slice(0, 5).map((general) => {
          const canon = getCharacterCanonProfile(general.id);
          const visual = getGeneralVisualProfile(general.id);
          return (
            <span key={general.id} title={`${general.skills.map(skillName).join("、") || "无技能"}`}>
              {general.name} · {visual?.flavorTitle ?? canon?.gameArchetype ?? "武将"} · Lv.{general.level}
            </span>
          );
        })}
      </div>
      {city.factionId === state.playerFactionId && generals.length === 0 && onRequestTransfer && (
        <button className="city-request-transfer" onClick={() => onRequestTransfer(city.id)} data-testid="request-transfer">请求相邻己方城市调入武将</button>
      )}
    </aside>
  );
}
