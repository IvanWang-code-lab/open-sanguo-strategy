import type { CSSProperties } from "react";
import { ART_ASSETS } from "../data/artAssets";
import { getCharacterCanonProfile, getCharacterEvaluation } from "../data/characterCanonProfiles";
import { getGeneralVisualProfile } from "../data/generalVisualProfiles";
import { skillName } from "../data/skills";
import { totalTroops } from "../systems/unitSystem";
import { terrainLabels, troopLabels } from "../types";
import type { City, GameState } from "../types";

interface CityPanelProps {
  state: GameState;
  city?: City;
}

export function CityPanel({ state, city }: CityPanelProps) {
  const panelStyle = { "--war-room-bg": `url(${ART_ASSETS.backgrounds.warRoom})` } as CSSProperties;
  if (!city) return <aside className="side-panel war-room-panel" style={panelStyle}>请选择一座城市。</aside>;
  const faction = state.factions.find((item) => item.id === city.factionId);
  const generals = state.generals.filter((general) => city.generals.includes(general.id));
  return (
    <aside className="side-panel war-room-panel" style={panelStyle}>
      <div className="city-title">
        <div>
          <p className="eyebrow">城市详情</p>
          <h2>{city.name}</h2>
        </div>
        <span className="faction-badge" style={{ borderColor: faction?.color, color: faction?.color }}>{faction?.name}</span>
      </div>
      <div className="stat-grid">
        <span>地形：{terrainLabels[city.terrain]}</span>
        <span>总兵：{totalTroops(city.troops).toLocaleString()}</span>
        <span>金钱：{city.gold}</span>
        <span>粮草：{city.food}</span>
        <span>农业：{city.agriculture}</span>
        <span>商业：{city.commerce}</span>
        <span>城防：{city.defense}</span>
        <span>士气：{city.morale}</span>
        <span>民心：{city.publicOrder}</span>
        <span>{city.actedThisTurn ? "已行动" : "未行动"}</span>
      </div>
      <h3>兵种</h3>
      <div className="troop-list">
        {Object.entries(city.troops).map(([type, count]) => (
          <span key={type}>{troopLabels[type as keyof typeof troopLabels]} {count}</span>
        ))}
      </div>
      <h3>武将</h3>
      <div className="general-list">
        {generals.length === 0 ? <p className="muted">暂无武将驻守</p> : generals.map((general) => {
          const canon = getCharacterCanonProfile(general.id);
          const visual = getGeneralVisualProfile(general.id);
          return (
            <article className={`general-card ${canon?.rarity ?? "standard"}`} key={general.id}>
              <div className="general-card-head">
                <div>
                  <strong>{general.name} Lv.{general.level}</strong>
                  <span>{visual?.flavorTitle ?? canon?.gameArchetype ?? "地方武将"}</span>
                </div>
                <i>{canon?.rarity ?? "standard"}</i>
              </div>
              <div className="canon-tags">
                {(canon?.roleTags ?? [visual?.roleStyle ?? "武将"]).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <span>经验 {general.exp}/100 · 忠诚 {general.loyalty}</span>
              <span>武{general.force} 智{general.intelligence} 统{general.command} 政{general.politics} 魅{general.charm}</span>
              <span>技能：{general.skills.length ? general.skills.map(skillName).join("、") : "无"}</span>
              <p className="general-evaluation">{getCharacterEvaluation(general.id)}</p>
              {visual && <p className="visual-note">形象：{visual.visualKeywords.slice(0, 5).join("、")}</p>}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
