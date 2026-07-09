import { useMemo, useState, type CSSProperties } from "react";
import { Crown, ScrollText, Swords } from "lucide-react";
import { ART_ASSETS, getFactionPortrait } from "../data/artAssets";
import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { getGeneralVisualProfile } from "../data/generalVisualProfiles";
import { initialCities } from "../data/cities";
import { initialGenerals } from "../data/generals";
import { GAME_VERSION_SHORT } from "../constants/version";
import type { Faction } from "../types";

interface LordSelectProps {
  factions: Faction[];
  selectedFactionId: string;
  onSelect: (id: string) => void;
  onStart: (scenarioId?: string) => void;
}

const scenarios = [
  {
    id: "190",
    year: 190,
    title: "群雄讨董",
    status: "标准",
    desc: "诸侯并起，城池分散，适合完整体验从弱到强的沙盘扩张。",
    advice: "推荐新局；势力差异最明显，适合体验完整回合节奏。",
  },
  {
    id: "208",
    year: 208,
    title: "赤壁前夜",
    status: "实验沙盘",
    desc: "三分雏形已现，江河、火攻与军师价值更高。",
    advice: "本版使用同一地图数据开局，但年份、目标与沉浸文案会切换。",
  },
  {
    id: "219",
    year: 219,
    title: "汉中荆州",
    status: "实验沙盘",
    desc: "名将云集，战线压力更高，适合测试军团编成与阶段战术。",
    advice: "本版作为可选实验剧本入口，后续会补专属势力分布。",
  },
];

export function LordSelect({ factions, selectedFactionId, onSelect, onStart }: LordSelectProps) {
  const [screen, setScreen] = useState<"menu" | "scenario" | "lord">("menu");
  const [scenarioId, setScenarioId] = useState("190");
  const selectedScenario = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0];
  const selectedFaction = factions.find((faction) => faction.id === selectedFactionId);

  const counts = useMemo(() => {
    const map = new Map<string, { cities: number; generals: number }>();
    for (const faction of factions) {
      map.set(faction.id, {
        cities: initialCities.filter((city) => city.factionId === faction.id).length,
        generals: initialGenerals.filter((general) => general.status === "active" && general.factionId === faction.id).length,
      });
    }
    return map;
  }, [factions]);

  return (
    <main
      className={`lord-screen immersive-title screen-${screen}`}
      style={{ "--lord-bg": `url(${ART_ASSETS.backgrounds.lordSelect})` } as CSSProperties}
    >
      <section className="title-court">
        <p className="eyebrow">沉浸式单机三国沙盘 · {GAME_VERSION_SHORT}</p>
        <h1>三国：新霸王大陆</h1>
        <p>在天下沙盘中下达统一指令，于府衙经营城池，在军议桌决定出兵与留守，在经典战场直接指挥部队。</p>
        {screen === "menu" && (
          <div className="title-actions">
            <button className="bronze-command primary" type="button" onClick={() => setScreen("scenario")}>
              <Swords size={18} /> 开始新局
            </button>
            <button className="bronze-command" type="button" onClick={() => setScreen("lord")}>
              <Crown size={18} /> 直接选诸侯
            </button>
            <button className="bronze-command" type="button" onClick={() => setScreen("scenario")}>
              <ScrollText size={18} /> 剧本长卷
            </button>
          </div>
        )}
      </section>

      {screen === "scenario" && (
        <section className="scenario-scroll">
          <header>
            <span>历史长卷</span>
            <h2>选择开局时代</h2>
          </header>
          <div className="scenario-ribbon">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={`scenario-seal ${scenarioId === scenario.id ? "selected" : ""}`}
                onClick={() => setScenarioId(scenario.id)}
              >
                <b>{scenario.year}</b>
                <strong>{scenario.title}</strong>
                <span>{scenario.status}</span>
                <small>{scenario.desc}</small>
              </button>
            ))}
          </div>
          <p className="scenario-advice">{selectedScenario.advice}</p>
          <div className="title-actions">
            <button className="bronze-command" type="button" onClick={() => setScreen("menu")}>返回主菜单</button>
            <button className="bronze-command primary" type="button" onClick={() => setScreen("lord")}>进入诸侯席位</button>
          </div>
        </section>
      )}

      {screen === "lord" && (
        <section className="lord-seat-stage">
          <div className="lord-seat-list">
            {factions.map((faction) => {
              const active = selectedFactionId === faction.id;
              const canon = getCharacterCanonProfile(faction.id);
              const visual = getGeneralVisualProfile(faction.id);
              return (
                <button
                  className={`lord-seat ${active ? "selected" : ""}`}
                  key={faction.id}
                  type="button"
                  onClick={() => onSelect(faction.id)}
                  style={{ "--faction-color": faction.color } as CSSProperties}
                >
                  <img src={getFactionPortrait(faction.id)} alt={`${faction.ruler}头像`} />
                  <i />
                  <strong>{faction.name}</strong>
                  <span>{faction.ruler}</span>
                  <small>{visual?.flavorTitle ?? canon?.gameArchetype ?? faction.difficulty}</small>
                </button>
              );
            })}
          </div>

          <aside className="faction-scroll-detail">
            <span>{selectedScenario.year} · {selectedScenario.title}</span>
            <h2>{selectedFaction ? selectedFaction.name : "请选择诸侯"}</h2>
            {selectedFaction ? (
              <>
                <div className="ruler-line">
                  <img src={getFactionPortrait(selectedFaction.id)} alt={`${selectedFaction.ruler}头像`} />
                  <div>
                    <b>{selectedFaction.ruler}</b>
                    <p>{getCharacterCanonProfile(selectedFaction.id)?.notes ?? selectedFaction.description}</p>
                  </div>
                </div>
                <div className="seal-stats">
                  <span>初始城市 {counts.get(selectedFaction.id)?.cities ?? 0}</span>
                  <span>初始武将 {counts.get(selectedFaction.id)?.generals ?? 0}</span>
                  <span>{selectedFaction.difficulty}</span>
                </div>
                <p>{selectedFaction.description}</p>
                <p className="route-hint">破局建议：先稳住核心城市，再根据地形选择扩张方向。所有实际行动统一消耗 1 个指令，出征也是指令 -1。</p>
              </>
            ) : (
              <p>诸侯席位待定。请选择一面势力旗帜，再下达开局诏令。</p>
            )}
            <div className="title-actions">
              <button className="bronze-command" type="button" onClick={() => setScreen("scenario")}>返回剧本</button>
              <button className="bronze-command primary" type="button" onClick={() => onStart(scenarioId)} disabled={!selectedFactionId}>
                <Swords size={18} /> 开始游戏
              </button>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
