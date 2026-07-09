import { getSkillUnavailableReason, getUnitActiveSkills } from "../../systems/activeSkillSystem";
import { commandLabels } from "../../systems/battlefieldSystem";
import type { BattleCommandType, BattleUnit, BattlefieldState, GameState } from "../../types";

interface UnitCommandBarProps {
  state: GameState;
  battlefield: BattlefieldState;
  selectedUnit?: BattleUnit;
  targetUnit?: BattleUnit;
  onIssueCommand: (commandType: BattleCommandType, skillId?: string) => void;
  onExecuteRound: () => void;
  onAutoRound: () => void;
}

const commandOrder: BattleCommandType[] = ["advance", "attack", "defend", "retreat", "focus", "wait"];

export function UnitCommandBar({
  state,
  battlefield,
  selectedUnit,
  targetUnit,
  onIssueCommand,
  onExecuteRound,
  onAutoRound,
}: UnitCommandBarProps) {
  const skills = selectedUnit ? getUnitActiveSkills(state, selectedUnit) : [];
  const isSiege = battlefield.battleType === "siege";

  return (
    <section className="unit-command-bar">
      <div className="selected-unit-strip">
        {selectedUnit ? (
          <>
            <strong>{selectedUnit.generalName}</strong>
            <span>兵力 {selectedUnit.troops}/{selectedUnit.maxTroops}</span>
            <span>士气 {selectedUnit.morale}</span>
            <span>技能能量 {selectedUnit.skillEnergy}</span>
            <span>目标 {targetUnit?.generalName ?? "自动寻敌"}</span>
          </>
        ) : (
          <strong>请选择我方部队</strong>
        )}
      </div>

      <div className="classic-command-grid">
        {commandOrder.map((command) => (
          <button
            key={command}
            disabled={!selectedUnit}
            className={selectedUnit?.currentOrder === command ? "selected" : ""}
            onClick={() => onIssueCommand(command)}
            title={command === "focus" && !targetUnit ? "未选目标时会自动集火最近敌军" : ""}
          >
            {commandLabels[command]}
            <small>{command === "advance" ? "拉近战线" : command === "defend" ? "减损稳军" : command === "retreat" ? "后撤避锋" : command === "focus" ? "指定目标" : command === "attack" ? "主动交锋" : "回气待机"}</small>
          </button>
        ))}
        <button className="danger" disabled={!selectedUnit} onClick={() => onIssueCommand("withdraw")}>全军撤退<small>结束战斗</small></button>
      </div>

      <div className="classic-skill-grid">
        {skills.map((skill) => {
          const reason = selectedUnit ? getSkillUnavailableReason(selectedUnit, skill, battlefield.weather, Boolean(targetUnit), isSiege) : "未选部队";
          const blocking = Boolean(reason) && !reason.includes("可用");
          return (
            <button
              key={skill.id}
              disabled={!selectedUnit || blocking}
              onClick={() => onIssueCommand("skill", skill.id)}
              title={reason || skill.description}
            >
              【{skill.name}】
              <small>能量 -{skill.cost} · {blocking ? reason : skill.visualText}</small>
            </button>
          );
        })}
      </div>

      <div className="battle-round-actions">
        <button onClick={onAutoRound}>本轮自动推荐</button>
        <button className="primary" onClick={onExecuteRound}>执行本轮命令</button>
      </div>
    </section>
  );
}
