import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BattleReportPanel } from "./BattleReportPanel";
import { BattlefieldView } from "./battlefield/BattlefieldView";
import { BattleRoundTimeline } from "./battlefield/BattleRoundTimeline";
import { UnitCommandBar } from "./battlefield/UnitCommandBar";
import { getBattleBackground } from "../data/artAssets";
import { commandLabels, createBattlefieldState, getBattlefieldTotal, getNearestEnemy } from "../systems/battlefieldSystem";
import { chooseAutoPlayerCommands } from "../systems/battleAiController";
import { executeBattleRound, issueBattleCommand } from "../systems/unitCommandSystem";
import { terrainLabels, weatherLabels } from "../types";
import type { BattleCommandType, BattleReport, BattleTacticalChoice, BattlefieldMode, BattlefieldState, BattleUnit, Faction, GameState, PendingBattle } from "../types";

interface BattleModalProps {
  report?: BattleReport;
  pendingBattle?: PendingBattle;
  state?: GameState;
  factions: Faction[];
  onResolveBattle?: (choices: BattleTacticalChoice[]) => void;
  onResolveBattlefield?: (battlefield: BattlefieldState) => void;
  onClose: () => void;
}

const toBattlefieldMode = (mode: PendingBattle["controlMode"]): BattlefieldMode => {
  if (mode === "autoWatch") return "autoWatch";
  if (mode === "quick" || mode === "auto") return "quick";
  return "classic";
};

const unitStatusText = (unit: BattleUnit) => {
  if (unit.isRouted) return "溃退";
  if (unit.troops <= unit.maxTroops * 0.35) return "苦战";
  if (unit.morale <= 35) return "动摇";
  return "可战";
};

export function BattleModal({ report, pendingBattle, state, factions, onResolveBattlefield, onClose }: BattleModalProps) {
  const [finished, setFinished] = useState(false);
  const [battlefield, setBattlefield] = useState<BattlefieldState | undefined>();
  const [targetUnitId, setTargetUnitId] = useState<string | undefined>();

  useEffect(() => {
    setFinished(false);
    if (!report) return;
    const timer = window.setTimeout(() => setFinished(true), state?.commandPreferences.battleSpeed === "fast" ? 1800 : 3200);
    return () => window.clearTimeout(timer);
  }, [report, state?.commandPreferences.battleSpeed]);

  useEffect(() => {
    if (!pendingBattle || !state) {
      setBattlefield(undefined);
      setTargetUnitId(undefined);
      return;
    }
    if (pendingBattle.controlMode === "quick") return;
    const next = createBattlefieldState(state, pendingBattle, toBattlefieldMode(pendingBattle.controlMode));
    setBattlefield(next);
    setTargetUnitId(next.enemyUnits[0]?.id);
  }, [pendingBattle?.attackerCityId, pendingBattle?.defenderCityId, pendingBattle?.controlMode, state]);

  const currentTarget = useMemo(() => {
    if (!battlefield) return undefined;
    return battlefield.enemyUnits.find((unit) => unit.id === targetUnitId && !unit.isRouted) ?? battlefield.enemyUnits.find((unit) => !unit.isRouted);
  }, [battlefield, targetUnitId]);

  const selectedUnit = useMemo(() => {
    if (!battlefield) return undefined;
    return battlefield.playerUnits.find((unit) => unit.id === battlefield.selectedUnitId) ?? battlefield.playerUnits.find((unit) => !unit.isRouted);
  }, [battlefield]);

  const resolveIfFinished = (next: BattlefieldState) => {
    if (next.result && onResolveBattlefield) {
      onResolveBattlefield(next);
      return true;
    }
    return false;
  };

  const issueCommand = (commandType: BattleCommandType, skillId?: string) => {
    if (!battlefield || !selectedUnit) return;
    const target = currentTarget ?? getNearestEnemy(selectedUnit, battlefield.enemyUnits, commandType !== "focus");
    const command = {
      unitId: selectedUnit.id,
      commandType,
      targetUnitId: target?.id,
      skillId,
      issuedBy: "player" as const,
    };
    const next = issueBattleCommand(battlefield, command);
    setBattlefield({
      ...next,
      battleLog: [...next.battleLog, `已令${selectedUnit.generalName}部执行【${skillId ? "释放技能" : commandLabels[commandType]}】。`].slice(-60),
    });
  };

  const executeRound = () => {
    if (!state || !battlefield) return;
    const next = executeBattleRound(state, battlefield);
    if (!resolveIfFinished(next)) setBattlefield(next);
  };

  const issueAutoRound = () => {
    if (!state || !battlefield) return;
    let next = battlefield;
    for (const command of Object.values(chooseAutoPlayerCommands(state, battlefield))) next = issueBattleCommand(next, command);
    setBattlefield({
      ...next,
      battleLog: [...next.battleLog, `第${next.round}回合：军师自动为各部下达推荐命令。`].slice(-60),
    });
  };

  useEffect(() => {
    if (!state || !battlefield || battlefield.mode !== "autoWatch" || battlefield.result) return undefined;
    const timer = window.setTimeout(() => {
      const next = executeBattleRound(state, battlefield);
      if (!resolveIfFinished(next)) setBattlefield(next);
    }, state.commandPreferences.battleSpeed === "fast" ? 900 : 1500);
    return () => window.clearTimeout(timer);
  }, [battlefield, state]);

  useEffect(() => {
    if (!report && !pendingBattle) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (battlefield && !battlefield.result) {
        issueAutoRound();
        return;
      }
      if (report && !finished) setFinished(true);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [battlefield, finished, onClose, report]);

  if (!report && pendingBattle && state && battlefield) {
    const attackerCity = state.cities.find((city) => city.id === pendingBattle.attackerCityId);
    const defenderCity = state.cities.find((city) => city.id === pendingBattle.defenderCityId);
    if (!attackerCity || !defenderCity) return null;
    const attackerColor = factions.find((item) => item.id === attackerCity.factionId)?.color ?? "#d6b46a";
    const defenderColor = factions.find((item) => item.id === defenderCity.factionId)?.color ?? "#d6b46a";
    const battleBackground = getBattleBackground({
      isSiege: battlefield.battleType === "siege",
      isDefendingCity: defenderCity.terrain === "city",
      terrain: defenderCity.terrain,
    });
    const playerTotal = getBattlefieldTotal(battlefield.playerUnits);
    const enemyTotal = getBattlefieldTotal(battlefield.enemyUnits);
    const pendingCount = Object.keys(battlefield.pendingCommands).length;

    return (
      <div className="modal-backdrop">
        <section className="battle-modal classic-control-modal" style={{ "--battle-bg": `url(${battleBackground})` } as CSSProperties}>
          <header className="classic-battle-header">
            <div>
              <p className="eyebrow">经典可控战场 · 第 {battlefield.round} 回合</p>
              <h2>{attackerCity.name} 攻 {defenderCity.name}</h2>
              <span>{battlefield.battleType === "siege" ? "攻城战" : "野战"} · {terrainLabels[battlefield.terrain]} · {weatherLabels[battlefield.weather]} · {battlefield.mode === "autoWatch" ? "自动观战" : "手动指挥"}</span>
            </div>
            <div className="battle-header-actions">
              <button onClick={issueAutoRound}>全军推荐</button>
              <button onClick={executeRound}>执行回合</button>
              <button onClick={onClose}>返回地图</button>
            </div>
          </header>

          <div className="classic-battle-summary">
            <span style={{ borderColor: attackerColor }}>我军 <b>{playerTotal.toLocaleString()}</b></span>
            <span>已下令 <b>{pendingCount}/{battlefield.playerUnits.length}</b></span>
            <span style={{ borderColor: defenderColor }}>敌军 <b>{enemyTotal.toLocaleString()}</b></span>
            <span>城防 <b>{battlefield.cityDefense}</b></span>
          </div>

          <div className="classic-battle-layout">
            <aside className="classic-army-roster player">
              <h3>我军部队</h3>
              {battlefield.playerUnits.map((unit) => (
                <button key={unit.id} className={battlefield.selectedUnitId === unit.id ? "selected" : ""} onClick={() => setBattlefield({ ...battlefield, selectedUnitId: unit.id })}>
                  <strong>{unit.generalName}</strong>
                  <span>{unitStatusText(unit)} · {unit.troops}/{unit.maxTroops}</span>
                </button>
              ))}
            </aside>

            <BattlefieldView
              battlefield={battlefield}
              selectedUnitId={battlefield.selectedUnitId}
              targetUnitId={currentTarget?.id}
              attackerColor={attackerColor}
              defenderColor={defenderColor}
              onSelectPlayerUnit={(unitId) => setBattlefield({ ...battlefield, selectedUnitId: unitId })}
              onSelectEnemyUnit={setTargetUnitId}
            />

            <BattleRoundTimeline logs={battlefield.battleLog} />
          </div>

          <UnitCommandBar
            state={state}
            battlefield={battlefield}
            selectedUnit={selectedUnit}
            targetUnit={currentTarget}
            onIssueCommand={issueCommand}
            onExecuteRound={executeRound}
            onAutoRound={issueAutoRound}
          />
        </section>
      </div>
    );
  }

  if (!report) return null;
  const attackerColor = factions.find((item) => item.id === report.attackerFactionId)?.color ?? "#d6b46a";
  const defenderColor = factions.find((item) => item.id === report.defenderFactionId)?.color ?? "#d6b46a";
  const battleBackground = getBattleBackground({
    isSiege: report.defenderDefense >= 55,
    isDefendingCity: report.defenderTerrain === "city",
    terrain: report.defenderTerrain,
  });
  const attackerPercent = Math.max(3, (report.attackerRemaining / Math.max(1, report.attackerStart)) * 100);
  const defenderPercent = Math.max(3, (report.defenderRemaining / Math.max(1, report.defenderStart)) * 100);

  return (
    <div className="modal-backdrop">
      <section className={`battle-modal ${finished ? "finished" : "running"} battlefield-command-stage`} style={{ "--battle-bg": `url(${battleBackground})` } as CSSProperties}>
        <header className="battlefield-top">
          <div style={{ color: attackerColor }}><strong>{report.attackerGeneral}</strong><span>进攻 {report.attackerCityName}</span><em>{report.attackerLoss.toLocaleString()} 损失</em></div>
          <div className="battle-vs">战报</div>
          <div style={{ color: defenderColor }}><strong>{report.defenderGeneral}</strong><span>防守 {report.defenderCityName}</span><em>{report.defenderLoss.toLocaleString()} 损失</em></div>
        </header>
        <div className="battle-bars">
          <div><span>我军兵力 {report.attackerRemaining}/{report.attackerStart}</span><i style={{ width: `${attackerPercent}%`, background: attackerColor }} /></div>
          <div><span>敌军兵力 {report.defenderRemaining}/{report.defenderStart}</span><i style={{ width: `${defenderPercent}%`, background: defenderColor }} /></div>
        </div>
        {!finished && (
          <div className="battlefield running-stage">
            <div className="army army-left">{Array.from({ length: 28 }, (_, index) => <span key={index} style={{ background: attackerColor }} />)}</div>
            <div className="skill-banner">{report.decisiveEvents?.[0] ?? (report.skillMessages[0] || report.resultText)}</div>
            <div className="army army-right">{Array.from({ length: 28 }, (_, index) => <span key={index} style={{ background: defenderColor }} />)}</div>
          </div>
        )}
        {finished && <BattleReportPanel report={report} />}
        <div className="battle-actions">
          {!finished && <button onClick={() => setFinished(true)}>跳过战斗</button>}
          {finished && <button className="primary" onClick={onClose}>返回地图</button>}
        </div>
      </section>
    </div>
  );
}
