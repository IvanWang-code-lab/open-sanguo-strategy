import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ArmyFormationPanel } from "./ArmyFormationPanel";
import { createAutoFormation, formationStyleLabels, getFormationWarnings } from "../systems/armyFormationSystem";
import { getTacticalOptions, recommendTacticalOption } from "../systems/battleTacticsSystem";
import { totalTroops } from "../systems/unitSystem";
import { terrainLabels, weatherLabels } from "../types";
import type { ArmyFormation, BattleControlMode, FormationRoleOverrides, FormationStyle, FormationTroopPreference, GameState } from "../types";

interface WarCouncilModalProps {
  state: GameState;
  attackerCityId: string;
  defenderCityId: string;
  onCancel: () => void;
  onStart: (formation: ArmyFormation, controlMode: BattleControlMode) => void;
}

const planStyles: Array<{ style: FormationStyle; title: string; desc: string }> = [
  { style: "steady", title: "稳妥", desc: "降低损失，适合兵力接近或需要保留实力时。" },
  { style: "cavalry", title: "激进", desc: "提高冲击和战机，适合强将与骑兵优势。" },
  { style: "siege", title: "奇策", desc: "步弓压阵，攻城和硬碰硬更稳。" },
];

export function WarCouncilModal({ state, attackerCityId, defenderCityId, onCancel, onStart }: WarCouncilModalProps) {
  const [style, setStyle] = useState<FormationStyle>("auto");
  const [controlMode, setControlMode] = useState<BattleControlMode>(state.commandPreferences?.battleControlMode ?? state.battleControlMode ?? "standard");
  const [troopPreference, setTroopPreference] = useState<FormationTroopPreference>("balanced");
  const [roleOverrides, setRoleOverrides] = useState<FormationRoleOverrides>({});
  const attacker = state.cities.find((city) => city.id === attackerCityId);
  const defender = state.cities.find((city) => city.id === defenderCityId);
  const formation = useMemo(
    () => createAutoFormation(state, attackerCityId, defenderCityId, style, troopPreference, roleOverrides),
    [attackerCityId, defenderCityId, roleOverrides, state, style, troopPreference],
  );

  if (!attacker || !defender) return null;
  const warnings = getFormationWarnings(formation);
  const recommended = recommendTacticalOption(getTacticalOptions(state, attackerCityId, defenderCityId, formation, "clash"));
  const canStart = formation.totalTroops >= 200 && Boolean(formation.commanderId);
  const changeRole = (role: keyof FormationRoleOverrides, generalId: string) => {
    setRoleOverrides((current) => ({ ...current, [role]: generalId || undefined }));
  };

  return (
    <div className="modal-backdrop">
      <section className="war-council-modal">
        <header className="war-council-head">
          <div>
            <p className="eyebrow">战前军议</p>
            <h2>{attacker.name} 攻 {defender.name}</h2>
            <span>地形：{terrainLabels[defender.terrain]} · 天气：{weatherLabels[state.currentWeather]} · 城防：{defender.defense}</span>
          </div>
          <button onClick={onCancel} title="取消出征"><X size={18} /> 取消</button>
        </header>

        <div className="war-council-grid">
          <section>
            <h3>我方军团</h3>
            <ArmyFormationPanel
              state={state}
              formation={formation}
              attackerCityId={attackerCityId}
              roleOverrides={roleOverrides}
              onStyleChange={setStyle}
              onRoleChange={changeRole}
              onTroopPreferenceChange={setTroopPreference}
            />
          </section>
          <section className="enemy-intel">
            <h3>敌方情报</h3>
            <div className="after-grid">
              <span>守城：{defender.name}</span>
              <span>兵力：{totalTroops(defender.troops).toLocaleString()}</span>
              <span>城防：{defender.defense}</span>
              <span>士气：{defender.morale}</span>
              <span>民心：{defender.publicOrder}</span>
              <span>守将：{defender.generals.length} 人</span>
            </div>
            <p className="council-hint">推荐战术：{recommended?.label ?? "稳住阵脚"}。军议会根据主将、军师、地形与天气生成战术成功率。</p>
            <p className="council-hint">编成评分：{formation.scores?.rating ?? "B"}，军势{formation.scores?.militaryPower ?? 0} / 战机{formation.scores?.opportunity ?? 0} / 破阵{formation.scores?.breakthrough ?? 0} / 稳定{formation.scores?.stability ?? 0}。</p>
            <h3>作战方案</h3>
            <div className="plan-cards">
              {planStyles.map((plan) => (
                <button key={plan.style} className={style === plan.style ? "selected" : ""} onClick={() => setStyle(plan.style)}>
                  <strong>{plan.title}</strong>
                  <span>{formationStyleLabels[plan.style]}</span>
                  <small>{plan.desc}</small>
                </button>
              ))}
            </div>
            <h3>战斗操控</h3>
            <div className="mode-switch">
              <button className={controlMode === "auto" ? "selected" : ""} onClick={() => setControlMode("auto")}>自动</button>
              <button className={controlMode === "standard" ? "selected" : ""} onClick={() => setControlMode("standard")}>标准</button>
              <button className={controlMode === "deep" ? "selected" : ""} onClick={() => setControlMode("deep")}>深度实验</button>
            </div>
            {warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}
          </section>
        </div>

        <footer className="modal-footer">
          <button onClick={onCancel}>取消</button>
          <button className="primary" disabled={!canStart} title={canStart ? "消耗 2 军令开战" : "需要至少 200 兵和主将"} onClick={() => onStart(formation, controlMode)}>
            开战 · 军令 -2
          </button>
        </footer>
      </section>
    </div>
  );
}
