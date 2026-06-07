import type { CSSProperties } from "react";
import { useState } from "react";
import { Eye, Hammer, HeartHandshake, Search, Shield, Sprout, Store, Sword, UserPlus } from "lucide-react";
import { ART_ASSETS } from "../data/artAssets";
import { getAttackTargets } from "../systems/citySystem";
import { actionLabels, formatCommandCost, getCommandBlockedReason, getCommandCost } from "../systems/commandSystem";
import { getBestGeneral } from "../systems/generalSystem";
import { totalTroops } from "../systems/unitSystem";
import type { City, CityActionType, CommandPreferences, GameState } from "../types";

interface CommandPanelProps {
  state: GameState;
  city?: City;
  onAction: (action: CityActionType) => void;
  onAttack: (targetCityId: string) => void;
  onPreferencesChange?: (preferences: CommandPreferences) => void;
}

const politicalActions: Array<{ action: CityActionType; icon: JSX.Element }> = [
  { action: "agriculture", icon: <Sprout size={17} /> },
  { action: "commerce", icon: <Store size={17} /> },
  { action: "defense", icon: <Shield size={17} /> },
  { action: "pacify", icon: <HeartHandshake size={17} /> },
  { action: "search", icon: <Search size={17} /> },
];

const militaryActions: Array<{ action: CityActionType; icon: JSX.Element }> = [
  { action: "recruit", icon: <UserPlus size={17} /> },
  { action: "train", icon: <Hammer size={17} /> },
  { action: "scout", icon: <Eye size={17} /> },
];

const actionResourceText: Record<CityActionType, string> = {
  agriculture: "金 -100",
  commerce: "金 -100",
  defense: "金 -110",
  pacify: "金 -60",
  search: "武将行动",
  recruit: "金粮 -120",
  train: "粮 -100",
  scout: "武将行动",
};

const actionExpectedText: Record<CityActionType, string> = {
  agriculture: "粮草收入提升",
  commerce: "金钱收入提升",
  defense: "城防提升",
  pacify: "民心与士气提升",
  search: "可能发现人才",
  recruit: "补充四类兵种",
  train: "士气提升",
  scout: "显示邻城兵力",
};

export function CommandPanel({ state, city, onAction, onAttack, onPreferencesChange }: CommandPanelProps) {
  const [tab, setTab] = useState<"city" | "military" | "generals" | "faction" | "intel">("city");
  const panelStyle = { "--war-room-bg": `url(${ART_ASSETS.backgrounds.warRoom})` } as CSSProperties;
  if (!city) return <section className="command-panel war-room-panel" style={panelStyle}>请选择城市后下达指令。</section>;

  const own = city.factionId === state.playerFactionId;
  const activeGenerals = state.generals.filter((general) => city.generals.includes(general.id) && general.status === "active");
  const bestBattle = getBestGeneral(state, city.id, "battle");
  const bestPolitics = getBestGeneral(state, city.id, "politics");
  const targets = getAttackTargets(state, city.id);
  const faction = state.factions.find((item) => item.id === city.factionId);
  const recommendAction = (action: CityActionType) => {
    if (city.publicOrder < 55 && action === "pacify") return true;
    if (city.food < totalTroops(city.troops) * 0.35 && action === "agriculture") return true;
    if (city.gold < 260 && action === "commerce") return true;
    if (city.morale < 62 && action === "train") return true;
    if (totalTroops(city.troops) < 1200 && action === "recruit") return true;
    if (targets.length > 0 && action === "scout") return true;
    return false;
  };

  const resourceReason = (action: CityActionType) => {
    if ((action === "search" || action === "scout") && activeGenerals.length === 0) return "无可用武将";
    if (action === "recruit" && (city.gold < 120 || city.food < 120)) return "金钱或粮草不足";
    if ((action === "agriculture" || action === "commerce") && city.gold < 100) return "金钱不足";
    if (action === "defense" && city.gold < 110) return "金钱不足";
    if (action === "train" && city.food < 100) return "粮草不足";
    if (action === "pacify" && city.gold < 60) return "金钱不足";
    return "";
  };

  const actionReason = (action: CityActionType) =>
    getCommandBlockedReason(state, action, city.factionId, city.actedThisTurn, resourceReason(action));

  const renderButton = ({ action, icon }: { action: CityActionType; icon: JSX.Element }) => {
    const reason = actionReason(action);
    const cost = formatCommandCost(getCommandCost(action));
    return (
      <button key={action} className="command-button" disabled={Boolean(reason)} title={reason || `${actionLabels[action]}，${cost}`} onClick={() => onAction(action)}>
        {icon}
        <strong>{actionLabels[action]} {recommendAction(action) && <em>推荐</em>}</strong>
        <span>{cost}</span>
        <small>{reason || `${actionResourceText[action]} · ${actionExpectedText[action]}`}</small>
      </button>
    );
  };

  return (
    <section className="command-panel war-room-panel" style={panelStyle}>
      <div className="selected-city-command-card">
        <div>
          <p className="eyebrow">选中城市</p>
          <h2>{city.name}</h2>
          <span style={{ color: faction?.color }}>{faction?.name ?? "未知势力"}</span>
        </div>
        <div className="city-vitals">
          <span>兵力 {totalTroops(city.troops).toLocaleString()}</span>
          <span>城防 {city.defense}</span>
          <span>士气 {city.morale}</span>
          <span>民心 {city.publicOrder}</span>
          <b className={city.actedThisTurn ? "acted" : ""}>{city.actedThisTurn ? "已行动" : "待命"}</b>
        </div>
      </div>
      <div className="command-head">
        <div>
          <p className="eyebrow">本月指令</p>
          <h3>{city.name}军政厅</h3>
        </div>
        <div className="command-points">
          <span>政令 {state.commandState.politicalOrders}/{state.commandState.maxPoliticalOrders}</span>
          <span>军令 {state.commandState.militaryOrders}/{state.commandState.maxMilitaryOrders}</span>
        </div>
      </div>
      <div className="advisor-strip">
        {(state.commandState.recommendations ?? [state.commandState.advisory]).map((item) => <span key={item}>军师建议：{item}</span>)}
      </div>
      <div className="command-tabs">
        <button className={tab === "city" ? "selected" : ""} onClick={() => setTab("city")}>城市指令</button>
        <button className={tab === "military" ? "selected" : ""} onClick={() => setTab("military")}>军事指令</button>
        <button className={tab === "generals" ? "selected" : ""} onClick={() => setTab("generals")}>武将</button>
        <button className={tab === "faction" ? "selected" : ""} onClick={() => setTab("faction")}>势力</button>
        <button className={tab === "intel" ? "selected" : ""} onClick={() => setTab("intel")}>情报</button>
      </div>
      {tab === "city" && (
        <div className="command-grid">
          {politicalActions.map(renderButton)}
        </div>
      )}
      {tab === "military" && (
        <>
          <div className="command-grid">
            {militaryActions.map(renderButton)}
          </div>
          <h3>出征目标</h3>
          <div className="target-list">
            {!own && <p className="muted">只有己方城市可以出征。</p>}
            {own && targets.length === 0 && <p className="muted">周边暂无敌对城市。</p>}
            {own && targets.map((target) => {
              const reason = getCommandBlockedReason(
                state,
                "attack",
                city.factionId,
                city.actedThisTurn,
                activeGenerals.length === 0 ? "无可用武将" : totalTroops(city.troops) < 200 ? "兵力不足" : "",
              );
              return (
                <button key={target.id} className="command-button attack danger" disabled={Boolean(reason)} title={reason || `出征 ${target.name}`} onClick={() => onAttack(target.id)}>
                  <Sword size={17} />
                  <strong>出征 {target.name} {totalTroops(city.troops) > totalTroops(target.troops) * 1.25 && <em>推荐</em>}</strong>
                  <span>{formatCommandCost(getCommandCost("attack"))}</span>
                  <small>{reason || `敌兵 ${totalTroops(target.troops).toLocaleString()} · 城防${target.defense}`}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
      {tab === "generals" && (
        <div className="council-hint">
          <p>主将候选：{bestBattle?.name ?? "无"}。内政主官：{bestPolitics?.name ?? "无"}。</p>
          <p>本城现有武将 {activeGenerals.length} 人，出征时军议会自动编成主将、军师、先锋和左右翼。</p>
        </div>
      )}
      {tab === "faction" && (
        <div className="council-hint">
          <p>指令效率：{state.commandState.commandEfficiency}% · 统治负担：{state.commandState.governanceLoad}</p>
          <p>平均民心：{state.commandState.averagePublicOrder}。{state.commandState.advisory}</p>
          <h3>战斗设置</h3>
          <div className="settings-row">
            {(["auto", "standard", "deep"] as const).map((mode) => (
              <button key={mode} className={state.commandPreferences.battleControlMode === mode ? "selected" : ""} onClick={() => onPreferencesChange?.({ ...state.commandPreferences, battleControlMode: mode })}>
                {mode === "auto" ? "自动" : mode === "standard" ? "标准" : "深度实验"}
              </button>
            ))}
          </div>
          <div className="settings-row">
            {(["normal", "fast"] as const).map((speed) => (
              <button key={speed} className={state.commandPreferences.battleSpeed === speed ? "selected" : ""} onClick={() => onPreferencesChange?.({ ...state.commandPreferences, battleSpeed: speed })}>
                {speed === "normal" ? "普通速度" : "快速"}
              </button>
            ))}
          </div>
          <div className="settings-row">
            {(["important", "brief"] as const).map((level) => (
              <button key={level} className={state.commandPreferences.aiBattleLogLevel === level ? "selected" : ""} onClick={() => onPreferencesChange?.({ ...state.commandPreferences, aiBattleLogLevel: level })}>
                {level === "important" ? "AI重要日志" : "AI简报"}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === "intel" && (
        <div className="intel-list">
          {targets.length === 0 ? <p className="muted">暂无相邻敌对目标。</p> : targets.map((target) => (
            <article key={target.id}>
              <strong>{target.name}</strong>
              <span>兵力 {totalTroops(target.troops).toLocaleString()} · 城防 {target.defense} · 民心 {target.publicOrder}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
