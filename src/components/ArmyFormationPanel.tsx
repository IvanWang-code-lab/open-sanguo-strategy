import { formationStyleLabels, getFormationCandidates, getFormationGenerals, getFormationWarnings, roleLabels, troopPreferenceLabels } from "../systems/armyFormationSystem";
import { totalTroops } from "../systems/unitSystem";
import type { ArmyFormation, FormationRoleOverrides, FormationStyle, FormationTroopPreference, GameState } from "../types";

interface ArmyFormationPanelProps {
  state: GameState;
  formation: ArmyFormation;
  onStyleChange?: (style: FormationStyle) => void;
  attackerCityId?: string;
  roleOverrides?: FormationRoleOverrides;
  onRoleChange?: (role: keyof FormationRoleOverrides, generalId: string) => void;
  onTroopPreferenceChange?: (preference: FormationTroopPreference) => void;
}

const styles: FormationStyle[] = ["auto", "cavalry", "archer", "steady", "siege"];
const troopPreferences: FormationTroopPreference[] = ["balanced", "infantry", "cavalry", "archer", "navy", "siege"];

export function ArmyFormationPanel({ state, formation, onStyleChange, attackerCityId, roleOverrides, onRoleChange, onTroopPreferenceChange }: ArmyFormationPanelProps) {
  const generals = getFormationGenerals(state, formation);
  const warnings = getFormationWarnings(formation);
  const assignments = formation.troopAssignments;
  const candidates = attackerCityId ? getFormationCandidates(state, attackerCityId) : [];
  const renderRole = (label: string, key: keyof FormationRoleOverrides, value?: string, fallback?: string) => (
    <label>
      <b>{label}</b>
      {onRoleChange ? (
        <select value={roleOverrides?.[key] ?? value ?? ""} onChange={(event) => onRoleChange(key, event.target.value)}>
          <option value="">自动任命</option>
          {candidates.map((general) => <option key={general.id} value={general.id}>{general.name} 统{general.command} 武{general.force} 智{general.intelligence}</option>)}
        </select>
      ) : (
        <span>{fallback ?? "未任命"}</span>
      )}
    </label>
  );
  return (
    <section className="formation-panel">
      {onStyleChange && (
        <div className="formation-styles">
          {styles.map((style) => (
            <button key={style} className={formation.formationStyle === style ? "selected" : ""} onClick={() => onStyleChange(style)}>
              {formationStyleLabels[style]}
            </button>
          ))}
        </div>
      )}
      {onTroopPreferenceChange && (
        <div className="troop-preference-row">
          {troopPreferences.map((preference) => (
            <button key={preference} className={(formation.troopPreference ?? "balanced") === preference ? "selected" : ""} onClick={() => onTroopPreferenceChange(preference)}>
              {troopPreferenceLabels[preference]}
            </button>
          ))}
        </div>
      )}
      <div className="formation-score-card">
        <strong>编成评级 {formation.scores?.rating ?? "B"}</strong>
        <span>军势 {formation.scores?.militaryPower ?? 0}</span>
        <span>战机 {formation.scores?.opportunity ?? 0}</span>
        <span>破阵 {formation.scores?.breakthrough ?? 0}</span>
        <span>稳定 {formation.scores?.stability ?? 0}</span>
        <span>预计损失 {formation.scores?.expectedLossRisk ?? 50}</span>
        <p>{formation.scores?.advice}</p>
      </div>
      <div className="role-grid editable">
        {renderRole("主将", "commanderId", formation.commanderId, generals.commander?.name)}
        {renderRole("军师", "advisorId", formation.advisorId, generals.advisor?.name)}
        {renderRole("先锋", "vanguardGeneralId", formation.vanguardGeneralId, generals.vanguard?.name)}
        {renderRole("左翼", "leftGeneralId", formation.leftGeneralId, generals.left?.name)}
        {renderRole("右翼", "rightGeneralId", formation.rightGeneralId, generals.right?.name)}
        {renderRole("后军", "reserveGeneralId", formation.reserveGeneralId, generals.reserve?.name)}
      </div>
      <div className="assignment-list">
        {assignments.map((item) => {
          const general = state.generals.find((generalItem) => generalItem.id === item.generalId);
          return (
            <article key={`${item.role}-${item.generalId}`}>
              <strong>{roleLabels[item.role]} · {general?.name ?? "未知"}</strong>
              <span>带兵 {item.total.toLocaleString()} / 上限 {item.capacity.toLocaleString()}</span>
              <small>步{item.infantry} 骑{item.cavalry} 弓{item.archer} 水{item.navy}</small>
              <i style={{ width: `${Math.max(12, Math.min(100, item.efficiency * 100))}%` }} />
            </article>
          );
        })}
      </div>
      <div className="formation-summary">
        <span>总出兵：{formation.totalTroops.toLocaleString()}</span>
        <span>编成：{formation.tacticStyle}</span>
        <span>实际分配：{totalTroops(formation.troopAssignments.reduce((sum, item) => ({
          infantry: sum.infantry + item.infantry,
          cavalry: sum.cavalry + item.cavalry,
          archer: sum.archer + item.archer,
          navy: sum.navy + item.navy,
        }), { infantry: 0, cavalry: 0, archer: 0, navy: 0 })).toLocaleString()}</span>
      </div>
      {warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}
    </section>
  );
}
