import { useMemo, useState } from "react";
import { initialFactions } from "./data/factions";
import { BattleModal } from "./components/BattleModal";
import { CityPanel } from "./components/CityPanel";
import { CommandPanel } from "./components/CommandPanel";
import { LogPanel } from "./components/LogPanel";
import { LordSelect } from "./components/LordSelect";
import { MapView } from "./components/MapView";
import { TopBar } from "./components/TopBar";
import { WarCouncilModal } from "./components/WarCouncilModal";
import { GAME_VERSION } from "./constants/version";
import { resolveBattle } from "./systems/battleSystem";
import { performCityAction } from "./systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "./systems/commandSystem";
import { addLogs } from "./systems/eventSystem";
import { clearSave, loadGame, saveGame } from "./systems/saveSystem";
import { createInitialGame } from "./systems/scenarioSystem";
import { endTurn, getFactionStats } from "./systems/turnSystem";
import { createAutoTacticalChoices } from "./systems/battleTacticsSystem";
import type { ArmyFormation, BattleControlMode, BattleReport, BattleTacticalChoice, CityActionType, CommandPreferences, GameState, PendingBattle } from "./types";

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

  const selectedCity = game?.cities.find((city) => city.id === selectedCityId);

  const persist = (next: GameState) => {
    const versionedState = { ...next, version: GAME_VERSION };
    setGame(versionedState);
    saveGame(versionedState);
  };

  const startGame = () => {
    if (!initialFactions.some((faction) => faction.id === selectedFactionId)) return;
    const next = createInitialGame(selectedFactionId);
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
      setBattleReport(result.report);
      if (result.report.occupied) setSelectedCityId(battle.defenderCityId);
    }
    setPendingBattle(undefined);
  };

  const handleStartBattle = (formation: ArmyFormation, controlMode: BattleControlMode) => {
    if (!game || !warCouncil) return;
    const battle: PendingBattle = { ...warCouncil, formation, controlMode };
    setWarCouncil(undefined);
    if (controlMode !== "auto") {
      setPendingBattle(battle);
      return;
    }
    const choices = createAutoTacticalChoices(game, battle.attackerCityId, battle.defenderCityId, formation, "auto", controlMode);
    resolvePlannedBattle({ ...game, battleControlMode: controlMode, commandPreferences: { ...game.commandPreferences, battleControlMode: controlMode } }, battle, choices);
  };

  const handleResolvePendingBattle = (choices: BattleTacticalChoice[]) => {
    if (!game || !pendingBattle) return;
    resolvePlannedBattle(game, pendingBattle, choices);
  };

  const handleEndTurn = () => {
    if (!game) return;
    persist(endTurn(game));
  };

  const handlePreferencesChange = (preferences: CommandPreferences) => {
    if (!game) return;
    persist({ ...game, battleControlMode: preferences.battleControlMode, commandPreferences: preferences });
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

  return (
    <div className="app-shell">
      <TopBar state={game} onEndTurn={handleEndTurn} onReset={resetGame} />
      {outcome && (
        <section className={`outcome ${outcome}`}>
          <h2>{outcome === "victory" ? "统一天下" : "势力灭亡"}</h2>
          <p>{outcome === "victory" ? "四海归一，新霸王大陆已成一统。" : "主公失去全部城池，霸业至此终结。"}</p>
        </section>
      )}
      <main className="game-layout">
        <MapView state={game} selectedCityId={selectedCityId} onSelectCity={setSelectedCityId} />
        <div className="right-stack">
          <CityPanel state={game} city={selectedCity} />
          <CommandPanel state={game} city={selectedCity} onAction={handleCityAction} onAttack={handleAttack} onPreferencesChange={handlePreferencesChange} />
        </div>
      </main>
      <LogPanel logs={game.logs} />
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
        onClose={() => {
          setBattleReport(undefined);
          setPendingBattle(undefined);
        }}
      />
    </div>
  );
}

export default App;
