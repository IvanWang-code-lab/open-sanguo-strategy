import { roleLabels } from "../../systems/battlefieldSystem";
import type { BattleLane, BattleUnit, BattlefieldState } from "../../types";

interface BattlefieldViewProps {
  battlefield: BattlefieldState;
  selectedUnitId?: string;
  targetUnitId?: string;
  attackerColor: string;
  defenderColor: string;
  onSelectPlayerUnit: (unitId: string) => void;
  onSelectEnemyUnit: (unitId: string) => void;
}

const laneLabels: Record<BattleLane, string> = {
  left: "左路",
  center: "中路",
  right: "右路",
};

const lanes: BattleLane[] = ["left", "center", "right"];

const unitPercent = (unit: BattleUnit) => Math.max(3, Math.min(97, unit.position));

function UnitMarker({
  unit,
  color,
  selected,
  targeted,
  onClick,
}: {
  unit: BattleUnit;
  color: string;
  selected?: boolean;
  targeted?: boolean;
  onClick: () => void;
}) {
  const hp = Math.max(0, Math.round(unit.troops / Math.max(1, unit.maxTroops) * 100));
  const morale = Math.max(0, Math.min(100, unit.morale));
  return (
    <button
      className={`battlefield-unit ${unit.side} ${selected ? "selected" : ""} ${targeted ? "targeted" : ""} ${unit.isRouted ? "routed" : ""}`}
      style={{ left: `${unitPercent(unit)}%`, borderColor: color }}
      onClick={onClick}
      title={`${roleLabels[unit.role]} ${unit.generalName}｜兵力 ${unit.troops}/${unit.maxTroops}｜士气 ${unit.morale}`}
    >
      <strong>{unit.generalName}</strong>
      <span>{roleLabels[unit.role]} · 士气 {unit.morale}</span>
      <i className="hp-bar"><b style={{ width: `${hp}%`, background: color }} /></i>
      <i className="morale-bar"><b style={{ width: `${morale}%` }} /></i>
      <em>{unit.currentOrder}</em>
    </button>
  );
}

export function BattlefieldView({
  battlefield,
  selectedUnitId,
  targetUnitId,
  attackerColor,
  defenderColor,
  onSelectPlayerUnit,
  onSelectEnemyUnit,
}: BattlefieldViewProps) {
  return (
    <section className={`classic-battlefield ${battlefield.battleType}`}>
      <div className="battlefield-stage-frame">
        <div className="battlefield-flash-text">{battlefield.battleLog.slice(-1)[0] ?? "两军列阵"}</div>
        <div className="battlefield-gate">
          <span>城防</span>
          <b>{battlefield.cityDefense}/{battlefield.maxCityDefense}</b>
          <i style={{ height: `${Math.max(0, Math.min(100, battlefield.cityDefense / Math.max(1, battlefield.maxCityDefense) * 100))}%` }} />
        </div>
        {lanes.map((lane) => (
          <div key={lane} className={`battlefield-lane lane-${lane}`}>
            <span className="lane-label">{laneLabels[lane]}</span>
            <div className="lane-line" />
            {battlefield.playerUnits.filter((unit) => unit.lane === lane).map((unit) => (
              <UnitMarker
                key={unit.id}
                unit={unit}
                color={attackerColor}
                selected={selectedUnitId === unit.id}
                onClick={() => onSelectPlayerUnit(unit.id)}
              />
            ))}
            {battlefield.enemyUnits.filter((unit) => unit.lane === lane).map((unit) => (
              <UnitMarker
                key={unit.id}
                unit={unit}
                color={defenderColor}
                targeted={targetUnitId === unit.id}
                onClick={() => onSelectEnemyUnit(unit.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
