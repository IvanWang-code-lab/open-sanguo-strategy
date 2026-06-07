import { useEffect, useState, type CSSProperties } from "react";
import { BattleReportPanel } from "./BattleReportPanel";
import { BattleTacticsPanel } from "./BattleTacticsPanel";
import { getBattleBackground } from "../data/artAssets";
import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { getGeneralVisualProfile } from "../data/generalVisualProfiles";
import { battlePhaseLabels, createTacticalChoice, getBattlePhaseSequence, getTacticalOptions, phaseDescriptions, recommendTacticalOption } from "../systems/battleTacticsSystem";
import { totalTroops } from "../systems/unitSystem";
import type { BattlePhase, BattleReport, BattleTacticalChoice, Faction, GameState, PendingBattle } from "../types";

interface BattleModalProps {
  report?: BattleReport;
  pendingBattle?: PendingBattle;
  state?: GameState;
  factions: Faction[];
  onResolveBattle?: (choices: BattleTacticalChoice[]) => void;
  onClose: () => void;
}

export function BattleModal({ report, pendingBattle, state, factions, onResolveBattle, onClose }: BattleModalProps) {
  const [finished, setFinished] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [collectedChoices, setCollectedChoices] = useState<BattleTacticalChoice[]>([]);

  const resolvePendingPhase = (chosenBy: BattleTacticalChoice["chosenBy"] = "auto", phaseOverride?: BattlePhase) => {
    if (!pendingBattle || !state || !onResolveBattle) return;
    const phases = getBattlePhaseSequence(pendingBattle.controlMode);
    const phase = phaseOverride ?? phases[phaseIndex];
    const options = getTacticalOptions(state, pendingBattle.attackerCityId, pendingBattle.defenderCityId, pendingBattle.formation, phase);
    const recommended = recommendTacticalOption(options);
    const choice = recommended ? createTacticalChoice(state, pendingBattle.formation, recommended, chosenBy) : undefined;
    const nextChoices = choice ? [...collectedChoices, choice] : collectedChoices;
    if (phaseIndex >= phases.length - 1) {
      onResolveBattle(nextChoices);
    } else {
      setCollectedChoices(nextChoices);
      setPhaseIndex((current) => current + 1);
    }
  };

  useEffect(() => {
    setFinished(false);
    if (!report) return;
    const timer = window.setTimeout(() => setFinished(true), state?.commandPreferences.battleSpeed === "fast" ? 3200 : 5200);
    return () => window.clearTimeout(timer);
  }, [report, state?.commandPreferences.battleSpeed]);

  useEffect(() => {
    setPhaseIndex(0);
    setCollectedChoices([]);
  }, [pendingBattle?.attackerCityId, pendingBattle?.defenderCityId]);

  useEffect(() => {
    if (!pendingBattle || report) return undefined;
    const timer = window.setTimeout(() => resolvePendingPhase("auto"), state?.commandPreferences.battleSpeed === "fast" ? 6500 : 9500);
    return () => window.clearTimeout(timer);
  }, [phaseIndex, pendingBattle, report, state]);

  useEffect(() => {
    if (!report && !pendingBattle) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingBattle && !report) resolvePendingPhase("auto");
      else if (finished) onClose();
      else setFinished(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, onClose, pendingBattle, report]);

  if (!report && pendingBattle && state) {
    const attackerCity = state.cities.find((city) => city.id === pendingBattle.attackerCityId);
    const defenderCity = state.cities.find((city) => city.id === pendingBattle.defenderCityId);
    if (!attackerCity || !defenderCity) return null;
    const phases = getBattlePhaseSequence(pendingBattle.controlMode);
    const currentPhase = phases[phaseIndex] ?? "clash";
    const options = getTacticalOptions(state, pendingBattle.attackerCityId, pendingBattle.defenderCityId, pendingBattle.formation, currentPhase);
    const recommended = recommendTacticalOption(options);
    const attackerColor = factions.find((item) => item.id === attackerCity.factionId)?.color ?? "#ddd";
    const defenderColor = factions.find((item) => item.id === defenderCity.factionId)?.color ?? "#ddd";
    const battleBackground = getBattleBackground({
      isSiege: defenderCity.defense >= 55,
      isDefendingCity: defenderCity.terrain === "city",
      terrain: defenderCity.terrain,
    });
    const resolve = (choice?: BattleTacticalChoice) => {
      if (!onResolveBattle) return;
      const nextChoices = choice ? [...collectedChoices, choice] : collectedChoices;
      if (phaseIndex >= phases.length - 1) {
        onResolveBattle(nextChoices);
      } else {
        setCollectedChoices(nextChoices);
        setPhaseIndex((current) => current + 1);
      }
    };
    return (
      <div className="modal-backdrop">
        <section className="battle-modal pending" style={{ "--battle-bg": `url(${battleBackground})` } as CSSProperties}>
          <div className="battle-head">
            <div style={{ color: attackerColor }}>
              <strong>{attackerCity.name}</strong>
              <span>进攻军团 · {pendingBattle.formation.summary}</span>
              <em>出兵 {pendingBattle.formation.totalTroops.toLocaleString()}</em>
            </div>
            <div className="battle-vs">令</div>
            <div style={{ color: defenderColor }}>
              <strong>{defenderCity.name}</strong>
              <span>守军兵力 {totalTroops(defenderCity.troops).toLocaleString()}</span>
              <em>城防 {defenderCity.defense}</em>
            </div>
          </div>
          <div className="battle-command-console">
            <span>阶段 {phaseIndex + 1}/{phases.length} · {battlePhaseLabels[currentPhase]}</span>
            <span>模式：{pendingBattle.controlMode === "deep" ? "深度" : "标准"}</span>
            <span>已下达战术：{collectedChoices.length}</span>
            <strong>{phaseDescriptions[currentPhase]}</strong>
          </div>
          <div className="battlefield tactical">
            <div className="army army-left">{Array.from({ length: 28 }, (_, index) => <span key={index} style={{ background: attackerColor }} />)}</div>
            <div className="clash-zone">
              <b style={{ opacity: 1, animation: "none" }}>{battlePhaseLabels[currentPhase]}阶段</b>
            </div>
            <div className="army army-right">{Array.from({ length: 28 }, (_, index) => <span key={index} style={{ background: defenderColor }} />)}</div>
          </div>
          <BattleTacticsPanel
            phase={currentPhase}
            options={options}
            onChoose={(option) => resolve(createTacticalChoice(state, pendingBattle.formation, option, "player"))}
            onAuto={() => resolve(recommended ? createTacticalChoice(state, pendingBattle.formation, recommended, "auto") : undefined)}
          />
          <div className="battle-actions">
            <button onClick={onClose}>返回地图</button>
            <button className="primary" onClick={() => resolvePendingPhase("auto")}>跳过本阶段</button>
          </div>
        </section>
      </div>
    );
  }

  if (!report) return null;
  const attackerColor = factions.find((item) => item.id === report.attackerFactionId)?.color ?? "#ddd";
  const defenderColor = factions.find((item) => item.id === report.defenderFactionId)?.color ?? "#ddd";
  const attackerProfile = getCharacterCanonProfile(report.attackerGeneralId);
  const defenderProfile = getCharacterCanonProfile(report.defenderGeneralId);
  const attackerVisual = getGeneralVisualProfile(report.attackerGeneralId);
  const defenderVisual = getGeneralVisualProfile(report.defenderGeneralId);
  const battleBackground = getBattleBackground({
    isSiege: report.defenderDefense >= 55,
    isDefendingCity: report.defenderTerrain === "city",
    terrain: report.defenderTerrain,
  });
  const attackerPercent = Math.max(3, (report.attackerRemaining / Math.max(1, report.attackerStart)) * 100);
  const defenderPercent = Math.max(3, (report.defenderRemaining / Math.max(1, report.defenderStart)) * 100);
  const soldierBlocks = Array.from({ length: 28 }, (_, index) => index);

  return (
    <div className="modal-backdrop">
      <section
        className={`battle-modal ${finished ? "finished" : "running"}`}
        style={{ "--battle-bg": `url(${battleBackground})` } as CSSProperties}
      >
        <div className="battle-head">
          <div style={{ color: attackerColor }}>
            <strong>{report.attackerGeneral}</strong>
            <span>进攻 {report.attackerCityName}</span>
            <em>{attackerVisual?.flavorTitle ?? attackerProfile?.gameArchetype ?? "主将"}</em>
          </div>
          <div className="battle-vs">战</div>
          <div style={{ color: defenderColor }}>
            <strong>{report.defenderGeneral}</strong>
            <span>防守 {report.defenderCityName}</span>
            <em>{defenderVisual?.flavorTitle ?? defenderProfile?.gameArchetype ?? "守将"}</em>
          </div>
        </div>
        <div className="battle-bars">
          <div><span>兵力 {report.attackerStart - report.attackerLoss}/{report.attackerStart}</span><i style={{ width: `${attackerPercent}%`, background: attackerColor }} /></div>
          <div><span>兵力 {report.defenderStart - report.defenderLoss}/{report.defenderStart}</span><i style={{ width: `${defenderPercent}%`, background: defenderColor }} /></div>
        </div>
        <div className="battlefield">
          <div className="army army-left">
            {soldierBlocks.map((item) => <span key={item} style={{ background: attackerColor }} />)}
          </div>
          <div className="clash-zone">
            {!finished && report.skillMessages.slice(0, 3).map((message, index) => <b key={message} style={{ animationDelay: `${index * 1.1}s` }}>{message}</b>)}
            {report.skillMessages.some((message) => message.includes("火")) && <div className="fire-wave" />}
          </div>
          <div className="army army-right">
            {soldierBlocks.map((item) => <span key={item} style={{ background: defenderColor }} />)}
          </div>
        </div>
        {!finished ? (
          <div className="battle-actions">
            <button className="skip" onClick={() => setFinished(true)}>跳过战斗</button>
          </div>
        ) : (
          <>
            <BattleReportPanel report={report} />
            <div className="battle-actions">
              <button className="primary" onClick={onClose}>关闭战报</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
