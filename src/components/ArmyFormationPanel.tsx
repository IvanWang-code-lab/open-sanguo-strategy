import { formationStyleLabels, getFormationCandidates, getFormationGenerals, getFormationWarnings, roleLabels, troopPreferenceLabels } from "../systems/armyFormationSystem";
import { totalTroops } from "../systems/unitSystem";
import type { ArmyFormation, FormationRoleOverrides, FormationStyle, FormationTroopPreference, GameState } from "../types";

type RoleOverrideKey = "commanderId" | "advisorId" | "vanguardGeneralId" | "leftGeneralId" | "rightGeneralId" | "reserveGeneralId";

interface ArmyFormationPanelProps {
  state: GameState;
  formation: ArmyFormation;
  onStyleChange?: (style: FormationStyle) => void;
  attackerCityId?: string;
  roleOverrides?: FormationRoleOverrides;
  onRoleChange?: (role: RoleOverrideKey, generalId: string) => void;
  participantIds?: string[];
  onParticipantToggle?: (generalId: string) => void;
  onTroopWeightChange?: (role: ArmyFormation["troopAssignments"][number]["role"], delta: number) => void;
  onTroopPreferenceChange?: (preference: FormationTroopPreference) => void;
}

const styles: FormationStyle[] = ["auto", "cavalry", "archer", "steady", "siege"];
const troopPreferences: FormationTroopPreference[] = ["balanced", "infantry", "cavalry", "archer", "navy", "siege"];

export function ArmyFormationPanel({
  state,
  formation,
  onStyleChange,
  attackerCityId,
  roleOverrides,
  onRoleChange,
  participantIds,
  onParticipantToggle,
  onTroopWeightChange,
  onTroopPreferenceChange,
}: ArmyFormationPanelProps) {
  const generals = getFormationGenerals(state, formation);
  const warnings = getFormationWarnings(formation);
  const assignments = formation.troopAssignments;
  const candidates = attackerCityId ? getFormationCandidates(state, attackerCityId) : [];
  const assignedTotal = totalTroops(assignments.reduce((sum, item) => ({
    infantry: sum.infantry + item.infantry,
    cavalry: sum.cavalry + item.cavalry,
    archer: sum.archer + item.archer,
    navy: sum.navy + item.navy,
  }), { infantry: 0, cavalry: 0, archer: 0, navy: 0 }));

  const renderRole = (label: string, key: RoleOverrideKey, value?: string, fallback?: string) => (
    <label className="council-seat">
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
    <section className="formation-panel council-formation">
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
        <div className="troop-preference-row compact">
          {troopPreferences.map((preference) => (
            <button key={preference} className={(formation.troopPreference ?? "balanced") === preference ? "selected" : ""} onClick={() => onTroopPreferenceChange(preference)}>
              {troopPreferenceLabels[preference]}
            </button>
          ))}
        </div>
      )}
      {onParticipantToggle && candidates.length > 0 && (
        <div className="participant-roster">
          <strong>参战武将</strong>
          <span>已选 {participantIds?.length ?? 0}/{Math.min(6, candidates.length)}，未选武将留守本城。</span>
          <div>
            {candidates.map((general) => {
              const checked = Boolean(participantIds?.includes(general.id));
              return (
                <button key={general.id} className={checked ? "selected" : ""} onClick={() => onParticipantToggle(general.id)} title={checked ? "点击改为留守" : "点击加入参战"}>
                  <b>{checked ? "参" : "守"}</b>
                  {general.name}
                  <small>统{general.command} 武{general.force} 智{general.intelligence}</small>
                </button>
              );
            })}
          </div>
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
      <div className="role-grid editable council-seats">
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
          const overLimit = item.total > item.capacity;
          return (
            <article key={`${item.role}-${item.generalId}`} className={overLimit ? "over-limit" : ""}>
              <strong>{roleLabels[item.role]} · {general?.name ?? "校尉"}</strong>
              <span>带兵 {item.total.toLocaleString()} / 上限 {item.capacity.toLocaleString()}</span>
              <small>步{item.infantry} 骑{item.cavalry} 弓{item.archer} 水{item.navy}</small>
              <small>{overLimit ? "超限：效率下降、战损上升" : `效率 ${Math.round(item.efficiency * 100)}%`}</small>
              {onTroopWeightChange && (
                <div className="assignment-tune">
                  <button onClick={() => onTroopWeightChange(item.role, -0.15)} title="减少该席位带兵">-</button>
                  <span>权重 {(roleOverrides?.troopWeightOverrides?.[item.role] ?? 1).toFixed(2)}</span>
                  <button onClick={() => onTroopWeightChange(item.role, 0.15)} title="增加该席位带兵">+</button>
                </div>
              )}
              <i style={{ width: `${Math.max(12, Math.min(100, item.efficiency * 100))}%` }} />
            </article>
          );
        })}
      </div>
      <div className="formation-summary">
        <span>出征：{formation.totalTroops.toLocaleString()}</span>
        <span>留守：{formation.garrisonTroops ? totalTroops(formation.garrisonTroops).toLocaleString() : "未计算"}</span>
        <span>补给：粮草 -{formation.supplyCost ?? 0}</span>
        <span>分配：{assignedTotal.toLocaleString()}</span>
        <span>战法：{formation.tacticStyle}</span>
      </div>
      {formation.garrisonRisk && <p className={formation.garrisonRiskLevel === "high" ? "warning-text danger-text" : "warning-text"}>{formation.garrisonRisk}</p>}
      {warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}
    </section>
  );
}
