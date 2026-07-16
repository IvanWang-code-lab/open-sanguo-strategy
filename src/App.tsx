import { useMemo, useState } from "react";
import { initialFactions } from "./data/factions";
import { BattleModal } from "./components/BattleModal";
import { CityPanel } from "./components/CityPanel";
import { CommandPanel } from "./components/CommandPanel";
import { GameBottomLog } from "./components/GameBottomLog";
import { ImmersiveShell } from "./components/immersive/ImmersiveShell";
import { LordSelect } from "./components/LordSelect";
import { MapView } from "./components/MapView";
import { SettingsModal } from "./components/SettingsModal";
import { TopBar } from "./components/TopBar";
import { WarCouncilModal } from "./components/WarCouncilModal";
import { PostBattleSettlementModal } from "./components/PostBattleSettlementModal";
import { ArmyTransferModal } from "./components/ArmyTransferModal";
import { GAME_VERSION } from "./constants/version";
import { resolveBattle } from "./systems/battleSystem";
import { performCityAction } from "./systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "./systems/commandSystem";
import { addLogs } from "./systems/eventSystem";
import { clearSave, loadGame, normalizeGameState, saveGame } from "./systems/saveSystem";
import { createInitialGame } from "./systems/scenarioSystem";
import { endTurn, getFactionStats } from "./systems/turnSystem";
import { createAutoTacticalChoices } from "./systems/battleTacticsSystem";
import { applyBattlefieldResult } from "./systems/battleResolutionSystem";
import { applyPostBattleSettlement } from "./systems/postBattleSettlementSystem";
import { transferGenerals, type TransferRequest } from "./systems/transferSystem";
import type { ArmyFormation, BattleControlMode, BattleReport, BattleTacticalChoice, BattlefieldState, CityActionType, CommandPreferences, GameState, PendingBattle, PostBattleSettlementDecision } from "./types";

const LORD_CHOICE_KEY = "three-kingdoms-new-overlord-last-lord";

function App() {
  const restored = useMemo(() => loadGame(), []);
  const [game, setGame] = useState<GameState | null>(restored);
  const [selectedFactionId, setSelectedFactionId] = useState(() => {
    const storedFactionId = localStorage.getItem(LORD_CHOICE_KEY) ?? "";
    return initialFactions.some((faction) => faction.id === storedFactionId) ? storedFactionId : "";
  });
  const [selectedCityId, setSelectedCityId] = useState(restored?.cities.find((city) => city.factionId === restored.playerFactionId)?.id ?? "");
  const [battleReport, setBattleReport] = useState<BattleReport | undefined>();
  const [warCouncil, setWarCouncil] = useState<{ attackerCityId: string; defenderCityId: string } | undefined>();
  const [pendingBattle, setPendingBattle] = useState<PendingBattle | undefined>();
  const [transferCity, setTransferCity] = useState<{ cityId: string; targetCityId?: string } | undefined>();
  const [showSettings, setShowSettings] = useState(false);

  const selectedCity = game?.cities.find((city) => city.id === selectedCityId);

  const persist = (next: GameState) => {
    const versionedState = normalizeGameState({ ...next, version: GAME_VERSION });
    setGame(versionedState);
    saveGame(versionedState);
  };

  const startGame = (scenarioId = "190") => {
    if (!initialFactions.some((faction) => faction.id === selectedFactionId)) return;
    const next = createInitialGame(selectedFactionId, scenarioId);
    persist(next);
    localStorage.setItem(LORD_CHOICE_KEY, selectedFactionId);
    setSelectedCityId(next.cities.find((city) => city.factionId === selectedFactionId)?.id ?? next.cities[0].id);
  };

  const chooseFaction = (id: string) => {
    setSelectedFactionId(id);
    localStorage.setItem(LORD_CHOICE_KEY, id);
  };

  const resetGame = () => {
    if (!window.confirm("确定要清空当前存档并重新选择主公吗？")) return;
    clearSave();
    localStorage.removeItem(LORD_CHOICE_KEY);
    setGame(null);
    setSelectedFactionId("");
    setSelectedCityId("");
    setBattleReport(undefined);
    setWarCouncil(undefined);
    setPendingBattle(undefined);
    setTransferCity(undefined);
  };

  const handleCityAction = (action: CityActionType) => {
    if (!game || !selectedCity) return;
    const cost = getCommandCost(action);
    const spent = spendPlayerCommand(game, cost, actionLabels[action], selectedCity.name);
    if (!spent.ok) {
      persist(addLogs(game, spent.logs));
      return;
    }
    const result = performCityAction(spent.state, selectedCity.id, action);
    persist(addLogs(result.state, [...spent.logs, ...result.logs]));
  };

  const handleAttack = (targetCityId: string) => {
    if (!game || !selectedCity) return;
    setWarCouncil({ attackerCityId: selectedCity.id, defenderCityId: targetCityId });
  };

  const resolvePlannedBattle = (
    baseState: GameState,
    battle: PendingBattle,
    tacticalChoices: BattleTacticalChoice[],
  ) => {
    const attacker = baseState.cities.find((city) => city.id === battle.attackerCityId);
    const spent = spendPlayerCommand(baseState, getCommandCost("attack"), "出征", attacker?.name);
    if (!spent.ok) {
      persist(addLogs(baseState, spent.logs));
      setPendingBattle(undefined);
      return;
    }
    const stateWithMode = {
      ...spent.state,
      battleControlMode: battle.controlMode,
      commandPreferences: { ...spent.state.commandPreferences, battleControlMode: battle.controlMode },
    };
    const result = resolveBattle(stateWithMode, battle.attackerCityId, battle.defenderCityId, {
      formation: battle.formation,
      tacticalChoices,
      controlMode: battle.controlMode,
    });
    const next = addLogs(result.state, [...spent.logs, ...result.logs]);
    persist(next);
    if (result.report) {
      setBattleReport(next.pendingPostBattleSettlement ? undefined : result.report);
      if (result.report.occupied) setSelectedCityId(battle.defenderCityId);
    }
    setPendingBattle(undefined);
  };

  const handleStartBattle = (formation: ArmyFormation, controlMode: BattleControlMode) => {
    if (!game || !warCouncil) return;
    const normalizedMode: BattleControlMode =
      controlMode === "auto" ? "quick" : controlMode === "standard" || controlMode === "deep" ? "classic" : controlMode;
    const battle: PendingBattle = { ...warCouncil, formation, controlMode: normalizedMode };
    setWarCouncil(undefined);
    if (normalizedMode !== "quick") {
      setPendingBattle(battle);
      return;
    }
    const autoBattle: PendingBattle = { ...battle, controlMode: "auto" };
    const choices = createAutoTacticalChoices(game, autoBattle.attackerCityId, autoBattle.defenderCityId, formation, "auto", "auto");
    resolvePlannedBattle({ ...game, battleControlMode: normalizedMode, commandPreferences: { ...game.commandPreferences, battleControlMode: normalizedMode } }, autoBattle, choices);
  };

  const handleResolvePendingBattle = (choices: BattleTacticalChoice[]) => {
    if (!game || !pendingBattle) return;
    resolvePlannedBattle(game, pendingBattle, choices);
  };

  const handleResolveBattlefield = (battlefield: BattlefieldState) => {
    if (!game || !pendingBattle) return;
    const attacker = game.cities.find((city) => city.id === pendingBattle.attackerCityId);
    const spent = spendPlayerCommand(game, getCommandCost("attack"), "出征", attacker?.name);
    if (!spent.ok) {
      persist(addLogs(game, spent.logs));
      setPendingBattle(undefined);
      return;
    }
    const stateWithMode = {
      ...spent.state,
      battleControlMode: pendingBattle.controlMode,
      commandPreferences: { ...spent.state.commandPreferences, battleControlMode: pendingBattle.controlMode },
    };
    const result = applyBattlefieldResult(stateWithMode, pendingBattle, battlefield);
    const next = addLogs(result.state, [...spent.logs, ...result.logs]);
    persist(next);
    if (result.report) {
      setBattleReport(next.pendingPostBattleSettlement ? undefined : result.report);
      if (result.report.occupied) setSelectedCityId(pendingBattle.defenderCityId);
    }
    setPendingBattle(undefined);
  };

  const handlePostBattleSettlement = (decision: PostBattleSettlementDecision) => {
    if (!game) return;
    const result = applyPostBattleSettlement(game, decision);
    if (!result.ok) {
      persist(addLogs(game, result.logs));
      return;
    }
    persist(result.state);
    setSelectedCityId(game.pendingPostBattleSettlement?.targetCityId ?? selectedCityId);
    setBattleReport(result.state.lastBattle);
  };

  const handleTransfer = (request: TransferRequest) => {
    if (!game) return;
    const result = transferGenerals(game, request);
    if (!result.ok) {
      persist(addLogs(game, result.logs));
      return;
    }
    persist(addLogs(result.state, result.logs));
    setSelectedCityId(request.targetCityId);
    setTransferCity(undefined);
  };

  const handleEndTurn = () => {
    if (!game) return;
    persist(endTurn(game));
  };

  const handlePreferencesChange = (preferences: CommandPreferences) => {
    if (!game) return;
    persist({
      ...game,
      battleControlMode: preferences.battleControlMode,
      commandPreferences: preferences,
      difficultyRuleSet: {
        ...(game.difficultyRuleSet ?? {
          aiLevel: "normal",
          liubeiProtection: "standard",
          eventFrequency: "normal",
          battleComplexity: "standard",
          stratagemPower: "normal",
          captureRule: "normal",
          supplyPressure: "normal",
          randomness: "historical",
          autoGovernance: "off",
        }),
        aiLevel: preferences.aiLevel ?? "normal",
        liubeiProtection: preferences.liubeiProtectionMode ?? "standard",
        eventFrequency: preferences.eventFrequency ?? "normal",
        battleComplexity: preferences.battleComplexity ?? "standard",
        autoGovernance: preferences.autoGovernanceMode ?? "off",
      },
      autoGovernanceSettings: { mode: preferences.autoGovernanceMode ?? "off" },
    });
  };

  if (!game) {
    return (
      <LordSelect
        factions={initialFactions}
        selectedFactionId={selectedFactionId}
        onSelect={chooseFaction}
        onStart={startGame}
      />
    );
  }

  const playerStats = getFactionStats(game, game.playerFactionId);
  const outcome = playerStats.cities === game.cities.length ? "victory" : playerStats.cities === 0 ? "defeat" : "";
  const outcomePanel = outcome ? (
    <section className={`outcome ${outcome}`}>
      <h2>{outcome === "victory" ? "统一天下" : "势力灭亡"}</h2>
      <p>{outcome === "victory" ? "四海归一，新霸王大陆已成一统。" : "主公失去全部城池，霸业至此终结。"}</p>
    </section>
  ) : undefined;

  return (
    <ImmersiveShell
      density={game.commandPreferences.uiDensity ?? "standard"}
      top={<TopBar state={game} onEndTurn={handleEndTurn} onReset={resetGame} onOpenSettings={() => setShowSettings(true)} />}
      outcome={outcomePanel}
      map={<MapView state={game} selectedCityId={selectedCityId} onSelectCity={setSelectedCityId} onAttackCity={handleAttack} />}
      side={(
        <>
          <CityPanel state={game} city={selectedCity} onRequestTransfer={(cityId) => setTransferCity({ cityId })} />
          <CommandPanel state={game} city={selectedCity} onAction={handleCityAction} onAttack={handleAttack} onTransfer={(cityId, targetCityId) => setTransferCity({ cityId, targetCityId })} onPreferencesChange={handlePreferencesChange} />
        </>
      )}
      bottom={<GameBottomLog logs={game.logs} advice={game.commandState.commandAdvice ?? game.commandState.recommendations} events={game.eventHistory} commandHistory={game.currentTurnCommandsUsed} />}
    >
      {warCouncil && (
        <WarCouncilModal
          state={game}
          attackerCityId={warCouncil.attackerCityId}
          defenderCityId={warCouncil.defenderCityId}
          onCancel={() => setWarCouncil(undefined)}
          onStart={handleStartBattle}
        />
      )}
      <BattleModal
        report={battleReport}
        pendingBattle={pendingBattle}
        state={game}
        factions={game.factions}
        onResolveBattle={handleResolvePendingBattle}
        onResolveBattlefield={handleResolveBattlefield}
        onClose={() => {
          setBattleReport(undefined);
          setPendingBattle(undefined);
        }}
      />
      {game.pendingPostBattleSettlement && !battleReport && (
        <PostBattleSettlementModal
          state={game}
          pending={game.pendingPostBattleSettlement}
          onConfirm={handlePostBattleSettlement}
        />
      )}
      {transferCity && !game.pendingPostBattleSettlement && (
        <ArmyTransferModal
          state={game}
          cityId={transferCity.cityId}
          preferredTargetCityId={transferCity.targetCityId}
          onCancel={() => setTransferCity(undefined)}
          onConfirm={handleTransfer}
        />
      )}
      {showSettings && (
        <SettingsModal
          preferences={game.commandPreferences}
          onChange={handlePreferencesChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </ImmersiveShell>
  );
}

export default App;
