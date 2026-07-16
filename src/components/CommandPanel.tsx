import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRightLeft, Eye, Flag, Hammer, HeartHandshake, RefreshCw, Search, Shield, Sprout, Store, Sword, UserPlus } from "lucide-react";
import { AdvisorLine } from "./immersive/AdvisorLine";
import { CommandSeal } from "./immersive/CommandSeal";
import { ScrollPanel } from "./immersive/ScrollPanel";
import { WarBanner } from "./immersive/WarBanner";
import { getAttackTargets } from "../systems/citySystem";
import { actionLabels, formatCommandCost, getCommandBlockedReason, getCommandCost } from "../systems/commandSystem";
import { isFrontlineCity } from "../systems/expeditionSystem";
import { getBestGeneral } from "../systems/generalSystem";
import { summarizeObjectives } from "../systems/strategyObjectiveSystem";
import { totalTroops } from "../systems/unitSystem";
import type { City, CityActionType, CommandPreferences, GameState } from "../types";
import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";

interface CommandPanelProps {
  state: GameState;
  city?: City;
  onAction: (action: CityActionType) => void;
  onAttack: (targetCityId: string) => void;
  onTransfer: (sourceCityId: string, targetCityId?: string) => void;
  onPreferencesChange?: (preferences: CommandPreferences) => void;
}

type OfficeKey = "civil" | "military" | "talent" | "intel" | "strategy";

const officeLabels: Record<OfficeKey, string> = {
  civil: "民政署",
  military: "军务署",
  talent: "人才署",
  intel: "情报署",
  strategy: "战略卷轴",
};

const civilActions: Array<{ action: CityActionType; icon: ReactNode; gain: string; risk: string }> = [
  { action: "agriculture", icon: <Sprout size={17} />, gain: "粮产 +8", risk: "短期耗金" },
  { action: "commerce", icon: <Store size={17} />, gain: "收入 +8", risk: "短期耗金" },
  { action: "pacify", icon: <HeartHandshake size={17} />, gain: "民心 +8", risk: "消耗指令" },
  { action: "rest", icon: <RefreshCw size={17} />, gain: "疲劳下降", risk: "放缓扩张" },
  { action: "market", icon: <Store size={17} />, gain: "粮草补给", risk: "耗金" },
];

const militaryActions: Array<{ action: CityActionType; icon: ReactNode; gain: string; risk: string }> = [
  { action: "recruit", icon: <UserPlus size={17} />, gain: "兵力增加", risk: "耗金耗粮" },
  { action: "train", icon: <Hammer size={17} />, gain: "士气 +8", risk: "耗粮" },
  { action: "defense", icon: <Shield size={17} />, gain: "城防 +8", risk: "耗金" },
  { action: "suppressBandits", icon: <Flag size={17} />, gain: "治安下降", risk: "小战损" },
];

const talentActions: Array<{ action: CityActionType; icon: ReactNode; gain: string; risk: string }> = [
  { action: "search", icon: <Search size={17} />, gain: "发现人才", risk: "概率事件" },
];

const intelActions: Array<{ action: CityActionType; icon: ReactNode; gain: string; risk: string }> = [
  { action: "scout", icon: <Eye size={17} />, gain: "查看敌情", risk: "消耗指令" },
  { action: "spy", icon: <Search size={17} />, gain: "密探暗线", risk: "可能暴露" },
];

const strategyActions: Array<{ action: CityActionType; icon: ReactNode; gain: string; risk: string }> = [
  { action: "autoGovern", icon: <RefreshCw size={17} />, gain: "自动推荐", risk: "仍耗指令" },
];

export function CommandPanel({ state, city, onAction, onAttack, onTransfer, onPreferencesChange }: CommandPanelProps) {
  const [office, setOffice] = useState<OfficeKey>("civil");
  const objectives = summarizeObjectives(state);

  if (!city) {
    return (
      <ScrollPanel className="magistrate-scroll empty" title="府衙待命" subtitle="请选择城池">
        <p>点击天下沙盘中的己方城池，即可进入府衙下达统一指令。</p>
        <AdvisorLine lines={state.commandState.commandAdvice ?? state.commandState.recommendations} />
      </ScrollPanel>
    );
  }

  const own = city.factionId === state.playerFactionId;
  const faction = state.factions.find((item) => item.id === city.factionId);
  const activeGenerals = getActiveGeneralsAtCity(state, city.id);
  const bestBattle = getBestGeneral(state, city.id, "battle");
  const bestPolitics = getBestGeneral(state, city.id, "politics");
  const targets = getAttackTargets(state, city.id);
  const troops = totalTroops(city.troops);
  const fatigue = city.cityFatigue ?? 0;
  const frontTag = isFrontlineCity(state, city.id) ? "前线" : "后方";

  const recommendAction = (action: CityActionType) => {
    if (fatigue >= 45 && action === "rest") return true;
    if (city.publicOrder < 55 && action === "pacify") return true;
    if (city.food < troops * 0.35 && action === "agriculture") return true;
    if (city.gold < 260 && action === "commerce") return true;
    if (city.morale < 62 && action === "train") return true;
    if (troops < 1200 && action === "recruit") return true;
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
    if (action === "rest" && city.gold < 40) return "金钱不足";
    if (action === "market" && city.gold < 120) return "金钱不足";
    if (action === "spy" && city.gold < 80) return "金钱不足";
    if (action === "suppressBandits" && (city.banditPressure ?? 0) + (city.localUnrest ?? 0) <= 0) return "治安尚稳";
    return "";
  };

  const actionReason = (action: CityActionType) =>
    getCommandBlockedReason(state, action, city.factionId, city.actedThisTurn, resourceReason(action));

  const renderSeal = ({ action, icon, gain, risk }: { action: CityActionType; icon: ReactNode; gain: string; risk: string }) => {
    const reason = actionReason(action);
    const cost = formatCommandCost(getCommandCost(action));
    const recommended = recommendAction(action);
    return (
      <CommandSeal
        key={action}
        disabled={Boolean(reason)}
        recommended={recommended}
        title={reason || `${actionLabels[action]}：${cost}；${gain}；风险：${risk}`}
        onClick={() => onAction(action)}
      >
        {icon}
        <strong>{actionLabels[action]}</strong>
        <span>{cost}</span>
        <small>{reason || `${gain} · ${risk}`}</small>
        {recommended && <em>军师荐</em>}
      </CommandSeal>
    );
  };

  const renderOffice = () => {
    if (office === "civil") return <div className="seal-grid">{civilActions.map(renderSeal)}</div>;
    if (office === "military") {
      return (
        <>
          <div className="seal-grid">{militaryActions.map(renderSeal)}</div>
          {own && (
            <div className="expedition-edict">
              <h4>调遣令</h4>
              <CommandSeal
                disabled={(state.commandState.commands ?? 0) < 1}
                title={(state.commandState.commands ?? 0) < 1 ? "指令不足" : activeGenerals.length === 0 ? "本城无将，可从相邻己方城市请求调入" : "向相邻己方城市调遣武将与兵力"}
                onClick={() => onTransfer(city.id)}
              >
                <ArrowRightLeft size={17} />
                <strong>{activeGenerals.length === 0 ? "请求调入" : "城市调遣"}</strong>
                <span>指令 -1</span>
                <small>{activeGenerals.length === 0 ? "从相邻己方城市选将" : "不受已盖令状态阻断"}</small>
              </CommandSeal>
            </div>
          )}
          <div className="expedition-edict">
            <h4>出征令</h4>
            {!own && <p>非己方城池不可出征。</p>}
            {own && targets.length === 0 && <p>周边暂无可攻击目标。</p>}
            {own && targets.map((target) => {
              const reason = getCommandBlockedReason(
                state,
                "attack",
                city.factionId,
                city.actedThisTurn,
                activeGenerals.length === 0 ? "无可用武将" : troops < 500 ? "兵力不足，至少需要 500 兵力" : "",
              );
              const advantage = troops > totalTroops(target.troops) * 1.25;
              return (
                <CommandSeal
                  key={target.id}
                  danger
                  recommended={advantage}
                  disabled={Boolean(reason)}
                  title={reason || `进入军议：${city.name} → ${target.name}`}
                  onClick={() => onAttack(target.id)}
                >
                  <Sword size={17} />
                  <strong>发兵 {target.name}</strong>
                  <span>{formatCommandCost(getCommandCost("attack"))}</span>
                  <small>{reason || `敌兵 ${totalTroops(target.troops).toLocaleString()} · 城防 ${target.defense}`}</small>
                  {advantage && <em>可图</em>}
                </CommandSeal>
              );
            })}
          </div>
        </>
      );
    }
    if (office === "talent") {
      return (
        <>
          <div className="seal-grid">{talentActions.map(renderSeal)}</div>
          <div className="bamboo-list">
            <p>主将候选：{bestBattle?.name ?? "暂无"}；内政主官：{bestPolitics?.name ?? "暂无"}。</p>
            {activeGenerals.slice(0, 8).map((general) => (
              <span key={general.id}>{general.name} · 统{general.command} 武{general.force} 智{general.intelligence}</span>
            ))}
          </div>
        </>
      );
    }
    if (office === "intel") {
      return (
        <>
          <div className="seal-grid">{intelActions.map(renderSeal)}</div>
          <div className="bamboo-list">
            {(state.eventHistory ?? []).slice(0, 5).map((event) => (
              <span key={event.id}>【{event.title}】{event.message}</span>
            ))}
          </div>
        </>
      );
    }
    return (
      <div className="strategy-scroll">
        <div className="seal-grid">{strategyActions.map(renderSeal)}</div>
        <WarBanner color={faction?.color} label={state.factionRoute?.title ?? "势力路线"} sublabel={state.factionRoute?.currentStep} />
        <div className="bamboo-list">
          <span>势力特性：{state.factionUniqueMechanics?.[state.playerFactionId]?.name ?? "乱世求生"}</span>
          <span>名望/正统：{state.rulerReputation ?? 50}/{state.factionLegitimacy ?? 50}</span>
          <span>季节影响：{state.seasonState?.advice ?? "节律稳定"}</span>
          <span>商队：{state.caravanMarketState?.active ? "可采购" : "暂无商队"}</span>
        </div>
        <div className="objective-progress">
          <b>{objectives.active.name}</b>
          <span>{objectives.active.progress}/{objectives.active.target}</span>
          <progress value={objectives.active.progress} max={objectives.active.target} />
          <p>{objectives.active.advice}</p>
        </div>
        <div className="bamboo-list">
          {(state.regionObjectives ?? []).map((objective) => (
            <span key={objective.id}>{objective.completed ? "已成" : "进行"} · {objective.name} {objective.progress}/{objective.target}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ScrollPanel className="magistrate-scroll" title={`${city.name} 府衙`} subtitle={`${frontTag} · ${faction?.name ?? "未知势力"}`}>
      <div className="city-plaque" style={{ "--faction-color": faction?.color ?? "#d6b46a" } as CSSProperties}>
        <div>
          <p>太守/主将：{bestPolitics?.name ?? bestBattle?.name ?? "待任"}</p>
          <h2>{city.name}</h2>
          <span>{city.actedThisTurn ? "本回合已盖令" : "候令"} · 地形 {city.terrain}</span>
        </div>
        <div className="city-ledger">
          <span>兵 {troops.toLocaleString()}</span>
          <span>防 {city.defense}</span>
          <span>民 {city.publicOrder}</span>
          <span>士 {city.morale}</span>
          <span className={fatigue >= 60 ? "danger-text" : fatigue >= 35 ? "warning-text-inline" : ""}>疲 {fatigue}</span>
        </div>
      </div>

      <AdvisorLine lines={state.commandState.commandAdvice ?? state.commandState.recommendations} fallback={state.commandState.advisory} />

      <nav className="office-tabs">
        {(Object.keys(officeLabels) as OfficeKey[]).map((key) => (
          <button key={key} className={office === key ? "selected" : ""} onClick={() => setOffice(key)}>
            {officeLabels[key]}
          </button>
        ))}
      </nav>

      {renderOffice()}

      <div className="turn-command-history">
        <b>本回合命令</b>
        {(state.currentTurnCommandsUsed ?? []).length === 0
          ? <span>尚未下令。</span>
          : state.currentTurnCommandsUsed.slice(-5).map((item) => <span key={item}>{item}</span>)}
      </div>
    </ScrollPanel>
  );
}
