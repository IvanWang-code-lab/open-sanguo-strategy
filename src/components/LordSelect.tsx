import { Crown, Swords } from "lucide-react";
import type { CSSProperties } from "react";
import { ART_ASSETS, getFactionPortrait } from "../data/artAssets";
import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { getGeneralVisualProfile } from "../data/generalVisualProfiles";
import { initialCities } from "../data/cities";
import { initialGenerals } from "../data/generals";
import type { Faction } from "../types";

interface LordSelectProps {
  factions: Faction[];
  selectedFactionId: string;
  onSelect: (id: string) => void;
  onStart: () => void;
}

export function LordSelect({ factions, selectedFactionId, onSelect, onStart }: LordSelectProps) {
  const getCounts = (factionId: string) => ({
    cities: initialCities.filter((city) => city.factionId === factionId).length,
    generals: initialGenerals.filter((general) => general.status === "active" && general.factionId === factionId).length,
  });

  return (
    <main
      className="lord-screen"
      style={{ "--lord-bg": `url(${ART_ASSETS.backgrounds.lordSelect})` } as CSSProperties}
    >
      <section className="lord-head">
        <div>
          <p className="eyebrow">190 年 · 群雄并起</p>
          <h1>Open Sanguo Strategy</h1>
          <p>选择你的主公，经营城池、招募群英、编成军团，在回合指令与战术决策中扩张天下。</p>
        </div>
        <button className="primary start-button" onClick={onStart} disabled={!selectedFactionId}>
          <Swords size={18} /> 开始游戏
        </button>
      </section>
      <section className="lord-grid">
        {factions.map((faction) => {
          const counts = getCounts(faction.id);
          const active = selectedFactionId === faction.id;
          const canon = getCharacterCanonProfile(faction.id);
          const visual = getGeneralVisualProfile(faction.id);
          return (
            <button
              className={`lord-card ${active ? "selected" : ""}`}
              key={faction.id}
              onClick={() => onSelect(faction.id)}
              style={{ borderColor: active ? faction.color : undefined }}
            >
              <span className="faction-dot" style={{ background: faction.color }} />
              <div className="lord-portrait" style={{ borderColor: faction.color }}>
                <img src={getFactionPortrait(faction.id)} alt={`${faction.ruler}头像`} />
              </div>
              <div className="lord-card-title">
                <h2>{faction.name}</h2>
                <Crown size={18} />
              </div>
              {visual && <p className="lord-flavor">{visual.flavorTitle} · {canon?.gameArchetype}</p>}
              <p>主公：{faction.ruler}</p>
              <div className="lord-stats">
                <span>城池 {counts.cities}</span>
                <span>武将 {counts.generals}</span>
                <span>{faction.difficulty}</span>
              </div>
              {canon && (
                <div className="canon-tags">
                  {canon.roleTags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              <p className="lord-desc">{faction.description}</p>
              {canon && <p className="lord-eval">{canon.notes}</p>}
            </button>
          );
        })}
      </section>
    </main>
  );
}
