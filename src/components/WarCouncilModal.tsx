import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ArmyFormationPanel } from "./ArmyFormationPanel";
import { createAutoFormation, formationStyleLabels, getFormationCandidates, getFormationWarnings, troopPreferenceLabels } from "../systems/armyFormationSystem";
import { garrisonPresetLabels, garrisonPresetRatios, sortiePresetLabels, sortiePresetRatios } from "../systems/expeditionSystem";
import { getTacticalOptions, recommendTacticalOption } from "../systems/battleTacticsSystem";
import { totalTroops } from "../systems/unitSystem";
import { terrainLabels, weatherLabels } from "../types";
import type {
  ArmyFormation,
  BattleControlMode,
  ExpeditionPlanOptions,
  FormationRoleOverrides,
  FormationStyle,
  FormationTroopPreference,
  GameState,
  GarrisonPreset,
  SortiePreset,
} from "../types";

type RoleOverrideKey = "commanderId" | "advisorId" | "vanguardGeneralId" | "leftGeneralId" | "rightGeneralId" | "reserveGeneralId";

interface WarCouncilModalProps {
  state: GameState;
  attackerCityId: string;
  defenderCityId: string;
  onCancel: () => void;
  onStart: (formation: ArmyFormation, controlMode: BattleControlMode) => void;
}

const sortiePresets: SortiePreset[] = ["probe", "standard", "main", "allIn"];
const garrisonPresets: GarrisonPreset[] = ["20", "30", "50"];
const troopPreferences: FormationTroopPreference[] = ["balanced", "infantry", "cavalry", "archer", "navy", "siege"];
const formationStyles: FormationStyle[] = ["auto", "steady", "cavalry", "archer", "siege"];

export function WarCouncilModal({ state, attackerCityId, defenderCityId, onCancel, onStart }: WarCouncilModalProps) {
  const [style, setStyle] = useState<FormationStyle>("auto");
  const [controlMode, setControlMode] = useState<BattleControlMode>(state.commandPreferences?.battleControlMode ?? state.battleControlMode ?? "classic");
  const [troopPreference, setTroopPreference] = useState<FormationTroopPreference>("balanced");
  const [sortiePreset, setSortiePreset] = useState<SortiePreset>("standard");
  const [garrisonPreset, setGarrisonPreset] = useState<GarrisonPreset>("30");
  const [customSortieRatio, setCustomSortieRatio] = useState(0.5);
  const [customGarrisonRatio, setCustomGarrisonRatio] = useState(0.3);
  const [roleOverrides, setRoleOverrides] = useState<FormationRoleOverrides>({});
  const [selectedGeneralIds, setSelectedGeneralIds] = useState<string[] | undefined>();
  const attacker = state.cities.find((city) => city.id === attackerCityId);
  const defender = state.cities.find((city) => city.id === defenderCityId);
  const candidates = useMemo(() => getFormationCandidates(state, attackerCityId), [attackerCityId, state]);
  const participantIds = selectedGeneralIds ?? candidates.slice(0, 6).map((general) => general.id);
  const formationOverrides: FormationRoleOverrides = {
    ...roleOverrides,
    includedGeneralIds: participantIds,
  };
  const expeditionOptions: ExpeditionPlanOptions = {
    sortiePreset,
    garrisonPreset,
    sortieRatio: sortiePreset === "custom" ? customSortieRatio : sortiePresetRatios[sortiePreset],
    garrisonRatio: garrisonPreset === "custom" ? customGarrisonRatio : garrisonPresetRatios[garrisonPreset],
  };
  const formation = useMemo(
    () => createAutoFormation(state, attackerCityId, defenderCityId, style, troopPreference, formationOverrides, expeditionOptions),
    [attackerCityId, defenderCityId, expeditionOptions.garrisonPreset, expeditionOptions.garrisonRatio, expeditionOptions.sortiePreset, expeditionOptions.sortieRatio, formationOverrides, state, style, troopPreference],
  );

  if (!attacker || !defender) return null;
  const warnings = getFormationWarnings(formation);
  const recommended = recommendTacticalOption(getTacticalOptions(state, attackerCityId, defenderCityId, formation, "clash"));
  const canStart = formation.totalTroops >= 200 && Boolean(formation.commanderId) && attacker.food >= (formation.supplyCost ?? 0);
  const attackerTotal = totalTroops(attacker.troops);
  const defenderTotal = totalTroops(defender.troops);
  const changeRole = (role: RoleOverrideKey, generalId: string) => {
    setRoleOverrides((current) => ({ ...current, [role]: generalId || undefined }));
  };
  const toggleParticipant = (generalId: string) => {
    setSelectedGeneralIds((current) => {
      const next = current ?? participantIds;
      if (next.includes(generalId)) return next.length <= 1 ? next : next.filter((id) => id !== generalId);
      return [...next, generalId].slice(0, 6);
    });
  };
  const changeTroopWeight = (role: ArmyFormation["troopAssignments"][number]["role"], delta: number) => {
    setRoleOverrides((current) => {
      const currentWeight = current.troopWeightOverrides?.[role] ?? 1;
      return {
        ...current,
        troopWeightOverrides: {
          ...(current.troopWeightOverrides ?? {}),
          [role]: Math.max(0.35, Math.min(2.2, currentWeight + delta)),
        },
      };
    });
  };

  return (
    <div className="modal-backdrop">
      <section className="war-council-modal council-room-scene">
        <header className="war-council-head council-room-head">
          <div>
            <p className="eyebrow">军议桌 · 发兵前检查</p>
            <h2>{attacker.name} → {defender.name}</h2>
            <span>{defender.defense >= 55 || defender.terrain === "city" ? "攻城战" : "野战"} · 地形 {terrainLabels[defender.terrain]} · 天气 {weatherLabels[state.currentWeather]} · 指令 -1</span>
          </div>
          <button onClick={onCancel} title="取消出征"><X size={18} /> 取消</button>
        </header>

        <div className="council-table">
          <section className="council-route">
            <h3>战役摘要</h3>
            <div className="route-board">
              <b>{attacker.name}</b>
              <i />
              <b>{defender.name}</b>
            </div>
            <div className="battle-overview">
              <article><strong>我军总兵</strong><b>{attackerTotal.toLocaleString()}</b><span>出征 {formation.totalTroops.toLocaleString()}</span></article>
              <article><strong>留守兵力</strong><b>{(formation.garrisonTroops ? totalTroops(formation.garrisonTroops) : 0).toLocaleString()}</b><span>最低守备 {formation.minimumGarrison ?? 0}</span></article>
              <article><strong>敌军情报</strong><b>{defenderTotal.toLocaleString()}</b><span>城防 {defender.defense} · 士气 {defender.morale}</span></article>
              <article><strong>补给风险</strong><b>粮 -{formation.supplyCost ?? 0}</b><span>{formation.garrisonRisk}</span></article>
            </div>
          </section>

          <section className="council-controls">
            <h3>出兵与留守</h3>
            <div className="edict-row">
              {sortiePresets.map((preset) => (
                <button key={preset} className={sortiePreset === preset ? "selected" : ""} onClick={() => setSortiePreset(preset)}>
                  {sortiePresetLabels[preset]} <small>{Math.round(sortiePresetRatios[preset] * 100)}%</small>
                </button>
              ))}
              <button className={sortiePreset === "custom" ? "selected" : ""} onClick={() => setSortiePreset("custom")}>自定</button>
            </div>
            {sortiePreset === "custom" && <label className="slider-row">出征 {Math.round(customSortieRatio * 100)}%<input type="range" min="20" max="90" value={Math.round(customSortieRatio * 100)} onChange={(event) => setCustomSortieRatio(Number(event.target.value) / 100)} /></label>}
            <div className="edict-row">
              {garrisonPresets.map((preset) => (
                <button key={preset} className={garrisonPreset === preset ? "selected" : ""} onClick={() => setGarrisonPreset(preset)}>
                  {garrisonPresetLabels[preset]}
                </button>
              ))}
              <button className={garrisonPreset === "custom" ? "selected" : ""} onClick={() => setGarrisonPreset("custom")}>自定</button>
            </div>
            {garrisonPreset === "custom" && <label className="slider-row">留守 {Math.round(customGarrisonRatio * 100)}%<input type="range" min="15" max="70" value={Math.round(customGarrisonRatio * 100)} onChange={(event) => setCustomGarrisonRatio(Number(event.target.value) / 100)} /></label>}

            <h3>兵种倾向</h3>
            <div className="edict-row">
              {troopPreferences.map((preference) => (
                <button key={preference} className={troopPreference === preference ? "selected" : ""} onClick={() => setTroopPreference(preference)}>
                  {troopPreferenceLabels[preference]}
                </button>
              ))}
            </div>

            <h3>预案</h3>
            <div className="edict-row">
              {formationStyles.map((item) => (
                <button key={item} className={style === item ? "selected" : ""} onClick={() => setStyle(item)}>
                  {formationStyleLabels[item]}
                </button>
              ))}
            </div>
          </section>

          <section className="council-army">
            <h3>我方军团席位</h3>
            <ArmyFormationPanel
              state={state}
              formation={formation}
              attackerCityId={attackerCityId}
              roleOverrides={roleOverrides}
              participantIds={participantIds}
              onStyleChange={setStyle}
              onRoleChange={changeRole}
              onParticipantToggle={toggleParticipant}
              onTroopWeightChange={changeTroopWeight}
              onTroopPreferenceChange={setTroopPreference}
            />
          </section>

          <section className="enemy-intel council-enemy">
            <h3>敌方情报与风险</h3>
            <div className="after-grid">
              <span>守城：{defender.name}</span>
              <span>兵力：{defenderTotal.toLocaleString()}</span>
              <span>城防：{defender.defense}</span>
              <span>士气：{defender.morale}</span>
              <span>民心：{defender.publicOrder}</span>
              <span>守将：{defender.generals.length} 人</span>
            </div>
            <p className="council-hint">推荐关键战术：{recommended?.label ?? "稳住阵脚"}。成功率会受武将、技能、地形、天气、连携和反制影响。</p>
            <p className="council-hint">编成评分：{formation.scores?.rating ?? "B"}；军势 {formation.scores?.militaryPower ?? 0} / 战机 {formation.scores?.opportunity ?? 0} / 破阵 {formation.scores?.breakthrough ?? 0} / 稳定 {formation.scores?.stability ?? 0}。</p>
            {warnings.map((warning) => <p className="warning-text-inline" key={warning}>{warning}</p>)}
          </section>
        </div>

        <footer className="council-footer">
          <div className="mode-switch">
            {(["classic", "autoWatch", "quick"] as const).map((mode) => (
              <button key={mode} className={controlMode === mode ? "selected" : ""} onClick={() => setControlMode(mode)}>
                {mode === "classic" ? "经典指挥" : mode === "autoWatch" ? "自动观战" : "快速结算"}
              </button>
            ))}
          </div>
          <span className={!canStart ? "danger-text" : formation.garrisonRiskLevel === "high" ? "warning-text-inline" : ""}>
            {!canStart ? "指令、粮草、主将或兵力不足，暂不可发兵。" : formation.garrisonRiskLevel === "high" ? "留守风险较高，仍可强行发兵。" : "发兵检查通过。"}
          </span>
          <button onClick={onCancel}>取消</button>
          <button className="primary imperial-edict" disabled={!canStart} onClick={() => onStart(formation, controlMode)}>发兵令</button>
        </footer>
      </section>
    </div>
  );
}
