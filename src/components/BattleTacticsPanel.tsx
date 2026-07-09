import { battlePhaseLabels, type TacticalOption } from "../systems/battleTacticsSystem";
import type { BattlePhase } from "../types";

interface BattleTacticsPanelProps {
  phase: BattlePhase;
  options: TacticalOption[];
  onChoose: (option: TacticalOption) => void;
  onAuto: () => void;
}

export function BattleTacticsPanel({ phase, options, onChoose, onAuto }: BattleTacticsPanelProps) {
  return (
    <section className="tactics-panel battlefield-orders">
      <div className="tactics-head">
        <div>
          <p className="eyebrow">战场军令</p>
          <h3>【{battlePhaseLabels[phase]}】阶段</h3>
        </div>
        <button onClick={onAuto}>自动推荐</button>
      </div>
      <div className="tactic-options">
        {options.map((option) => (
          <button
            key={option.id}
            className={option.recommended ? "recommended" : ""}
            disabled={Boolean(option.disabledReason)}
            title={option.disabledReason || option.description}
            onClick={() => onChoose(option)}
          >
            <strong>{option.label}{option.recommended && <em>推荐</em>}</strong>
            <span>成功率 {Math.round(option.successRate * 100)}% · 风险 {option.risk}</span>
            <small>军势 {option.effects.momentum >= 0 ? "+" : ""}{option.effects.momentum} / 战机 {option.effects.opportunity >= 0 ? "+" : ""}{option.effects.opportunity} / 破阵 {option.effects.breakthrough >= 0 ? "+" : ""}{option.effects.breakthrough}</small>
            <small>损失风险 {option.effects.lossRisk >= 0 ? "+" : ""}{option.effects.lossRisk} · {option.predictedEffects}</small>
            <small>要求：{option.requirements.join("、")}</small>
            {option.disabledReason && <em>{option.disabledReason}</em>}
          </button>
        ))}
      </div>
    </section>
  );
}
