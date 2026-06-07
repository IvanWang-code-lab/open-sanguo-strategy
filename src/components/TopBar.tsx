import { RotateCcw, Save, TimerReset } from "lucide-react";
import { GAME_VERSION_SHORT } from "../constants/version";
import { getFactionStats } from "../systems/turnSystem";
import { weatherLabels } from "../types";
import type { GameState } from "../types";

interface TopBarProps {
  state: GameState;
  onEndTurn: () => void;
  onReset: () => void;
}

export function TopBar({ state, onEndTurn, onReset }: TopBarProps) {
  const faction = state.factions.find((item) => item.id === state.playerFactionId);
  const stats = getFactionStats(state, state.playerFactionId);
  const politicalTip = state.commandState.politicalBreakdown?.detail.join("；") ?? "政令来源待刷新";
  const militaryTip = state.commandState.militaryBreakdown?.detail.join("；") ?? "军令来源待刷新";
  const used = state.commandState.usedOrders ?? state.currentTurnCommandsUsed.length;
  const actionable =
    state.commandState.remainingActionableCities ??
    state.cities.filter((city) => city.factionId === state.playerFactionId && !city.actedThisTurn).length;

  return (
    <header className="topbar">
      <div className="title-block">
        <h1>Open Sanguo Strategy</h1>
        <span>
          {state.year}年{state.month}月 · {GAME_VERSION_SHORT}
        </span>
      </div>
      <div className="top-stats">
        <span>回合：{(state.year - 190) * 12 + state.month}</span>
        <span>天气：{weatherLabels[state.currentWeather]}</span>
        <span>势力：{faction?.name}</span>
        <span className={`order-pill ${state.commandState.politicalOrders <= 0 ? "empty" : ""}`} title={politicalTip}>
          政令 <b>{state.commandState.politicalOrders}</b> / {state.commandState.maxPoliticalOrders}
        </span>
        <span className={`order-pill military ${state.commandState.militaryOrders <= 0 ? "empty" : ""}`} title={militaryTip}>
          军令 <b>{state.commandState.militaryOrders}</b> / {state.commandState.maxMilitaryOrders}
        </span>
        <span title="本回合已经消耗的指令次数">已用：{used}</span>
        <span title="己方仍未行动的城市">可操作城：{actionable}</span>
        <span>
          城池：{stats.cities}/{state.cities.length}
        </span>
        <span>兵力：{stats.troops.toLocaleString()}</span>
        <span>金：{stats.gold.toLocaleString()}</span>
        <span>粮：{stats.food.toLocaleString()}</span>
        <span>效率：{state.commandState.commandEfficiency}%</span>
      </div>
      <div className="top-actions">
        <button onClick={onEndTurn} title="结束本月">
          <Save size={16} /> 结束回合
        </button>
        <button onClick={onReset} title="清空存档并重新选择主公">
          <RotateCcw size={16} /> 重新选择主公
        </button>
        <span className="progress-pill">
          <TimerReset size={14} /> 统一进度 {stats.cities}/{state.cities.length}
        </span>
      </div>
    </header>
  );
}
