import { RotateCcw, Save, Settings, TimerReset } from "lucide-react";
import { GAME_VERSION_SHORT } from "../constants/version";
import { getFactionStats } from "../systems/turnSystem";
import { weatherLabels, type SeasonType } from "../types";
import type { GameState } from "../types";

interface TopBarProps {
  state: GameState;
  onEndTurn: () => void;
  onReset: () => void;
  onOpenSettings?: () => void;
}

const seasonLabels: Record<SeasonType, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

const courtLabels = {
  supportive: "支持",
  neutral: "中立",
  watching: "观望",
  hostile: "敌视",
} as const;

export function TopBar({ state, onEndTurn, onReset, onOpenSettings }: TopBarProps) {
  const faction = state.factions.find((item) => item.id === state.playerFactionId);
  const stats = getFactionStats(state, state.playerFactionId);
  const commandTip = state.commandState.politicalBreakdown?.detail.join("；") ?? "指令来源待刷新";
  const used = state.commandState.usedCommands ?? state.commandState.usedOrders ?? state.currentTurnCommandsUsed.length;
  const commands = state.commandState.commands ?? 0;
  const maxCommands = state.commandState.maxCommands ?? commands;
  const autoSave = state.commandPreferences.autoSave ?? true;
  const season = state.seasonState?.season ?? "spring";
  const court = state.courtStance ?? "neutral";

  return (
    <header className="topbar dynasty-topbar">
      <div className="court-title">
        <span>朝堂牌匾</span>
        <h1>三国：新霸王大陆</h1>
        <small>{state.scenarioName ?? "群雄讨董"} · {state.year}年{state.month}月 · {GAME_VERSION_SHORT}</small>
      </div>
      <div className="imperial-ledger">
        <span>回合 {(state.year - 190) * 12 + state.month}</span>
        <span>{seasonLabels[season]}季</span>
        <span>天气 {weatherLabels[state.currentWeather]}</span>
        <span>势力 {faction?.name}</span>
        <span className={`order-token unified ${commands <= 0 ? "empty" : ""}`} title={commandTip}>
          指令 <b>{commands}</b><em>/{maxCommands}</em>
        </span>
        <span title="本回合已执行命令">已用 {used}</span>
        <span title="朝廷对本势力的态度">朝廷 {courtLabels[court]}</span>
        <span>名望 {state.rulerReputation ?? 50}</span>
        <span>正统 {state.factionLegitimacy ?? 50}</span>
        <span>城 {stats.cities}/{state.cities.length}</span>
        <span>兵 {stats.troops.toLocaleString()}</span>
        <span>金 {stats.gold.toLocaleString()}</span>
        <span>粮 {stats.food.toLocaleString()}</span>
        <span>效率 {state.commandState.commandEfficiency}%</span>
        <span className={autoSave ? "save-ok" : "warning-text-inline"}>{autoSave ? "自动存档" : "手动存档"}</span>
      </div>
      <div className="top-actions imperial-actions">
        <button onClick={onOpenSettings} title="设置战斗、事件、刘备保护、自动治理和界面密度">
          <Settings size={16} /> 设置
        </button>
        <button className="primary end-turn-button imperial-edict" onClick={onEndTurn} title="结束本月并推进天下演化">
          <Save size={16} /> 颁令结束
        </button>
        <button onClick={onReset} title="清空存档并重新选择主公">
          <RotateCcw size={16} /> 重选主公
        </button>
        <span className="progress-pill"><TimerReset size={14} /> 统一 {stats.cities}/{state.cities.length}</span>
      </div>
    </header>
  );
}
