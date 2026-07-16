import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Users, X } from "lucide-react";
import { getNeighbors } from "../data/routes";
import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";
import { getRequestTransferSources, getTransferCandidates, validateTransfer, type TransferRequest } from "../systems/transferSystem";
import { totalTroops } from "../systems/unitSystem";
import type { GameState, Troops } from "../types";

interface ArmyTransferModalProps {
  state: GameState;
  cityId: string;
  preferredTargetCityId?: string;
  onCancel: () => void;
  onConfirm: (request: TransferRequest) => void;
}

const zeroTroops = (): Troops => ({ infantry: 0, cavalry: 0, archer: 0, navy: 0 });

export function ArmyTransferModal({ state, cityId, preferredTargetCityId, onCancel, onConfirm }: ArmyTransferModalProps) {
  const selectedCityGenerals = getActiveGeneralsAtCity(state, cityId);
  const requestMode = selectedCityGenerals.length === 0;
  const requestSources = getRequestTransferSources(state, cityId);
  const normalTargets = getNeighbors(cityId)
    .map((id) => state.cities.find((city) => city.id === id))
    .filter((city): city is NonNullable<typeof city> => Boolean(city && city.factionId === state.playerFactionId));
  const initialSourceId = requestMode ? requestSources[0]?.id ?? "" : cityId;
  const initialTargetId = requestMode ? cityId : preferredTargetCityId ?? normalTargets[0]?.id ?? "";
  const [sourceCityId, setSourceCityId] = useState(initialSourceId);
  const [targetCityId, setTargetCityId] = useState(initialTargetId);
  const candidates = getTransferCandidates(state, sourceCityId);
  const [generalIds, setGeneralIds] = useState<string[]>(() => candidates[0] ? [candidates[0].id] : []);
  const [carried, setCarried] = useState<Troops>(zeroTroops());
  const source = state.cities.find((city) => city.id === sourceCityId);
  const target = state.cities.find((city) => city.id === targetCityId);

  const troopsByGeneral = useMemo(() => {
    if (generalIds.length === 0) return {};
    const result: Record<string, Troops> = {};
    generalIds.forEach((id, index) => {
      const divisor = generalIds.length;
      result[id] = {
        infantry: Math.floor(carried.infantry / divisor) + (index === 0 ? carried.infantry % divisor : 0),
        cavalry: Math.floor(carried.cavalry / divisor) + (index === 0 ? carried.cavalry % divisor : 0),
        archer: Math.floor(carried.archer / divisor) + (index === 0 ? carried.archer % divisor : 0),
        navy: Math.floor(carried.navy / divisor) + (index === 0 ? carried.navy % divisor : 0),
      };
    });
    return result;
  }, [carried, generalIds]);
  const request: TransferRequest = { sourceCityId, targetCityId, generalIds, troopsByGeneral };
  const validation = validateTransfer(state, request);
  const remainingGenerals = candidates.filter((general) => !generalIds.includes(general.id));

  const selectSource = (id: string) => {
    setSourceCityId(id);
    const first = getTransferCandidates(state, id)[0];
    setGeneralIds(first ? [first.id] : []);
    setCarried(zeroTroops());
  };
  const toggleGeneral = (id: string) => setGeneralIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateTroop = (type: keyof Troops, value: number) => setCarried((current) => ({ ...current, [type]: Math.max(0, Math.floor(value || 0)) }));

  return (
    <div className="modal-backdrop" data-testid="army-transfer-modal">
      <section className="army-transfer-modal" role="dialog" aria-modal="true" aria-label="城市调遣">
        <header>
          <div><span>统一指令 · 调遣</span><h2>{requestMode ? "空城请求调入" : "城市间调遣"}</h2></div>
          <button className="icon-button" onClick={onCancel} title="关闭"><X size={18} /></button>
        </header>

        {requestMode && (
          <div className="transfer-city-picker">
            <b>选择调出城市</b>
            {requestSources.map((city) => <button key={city.id} className={sourceCityId === city.id ? "selected" : ""} onClick={() => selectSource(city.id)}>{city.name}</button>)}
            {requestSources.length === 0 && <span>相邻己方城市暂无可调武将。</span>}
          </div>
        )}
        {!requestMode && (
          <div className="transfer-city-picker">
            <b>选择目标城市</b>
            {normalTargets.map((city) => <button key={city.id} className={targetCityId === city.id ? "selected" : ""} onClick={() => setTargetCityId(city.id)}>{city.name}</button>)}
          </div>
        )}

        <div className="transfer-route">
          <span><MapPin size={17} />{source?.name ?? "未选来源"}</span><ArrowRight size={22} /><span><MapPin size={17} />{target?.name ?? "未选目标"}</span>
        </div>

        <section className="transfer-generals">
          <h3>选择武将</h3>
          {candidates.map((general) => (
            <label key={general.id} className={generalIds.includes(general.id) ? "selected" : ""}>
              <input type="checkbox" checked={generalIds.includes(general.id)} onChange={() => toggleGeneral(general.id)} data-testid={`transfer-general-${general.id}`} />
              <Users size={17} /><b>{general.name}</b><span>统 {general.command} · 武 {general.force}</span>
            </label>
          ))}
        </section>

        <section className="transfer-troops">
          <h3>携带兵力 <small>可为 0；按所选武将平均分配</small></h3>
          {(["infantry", "cavalry", "archer", "navy"] as const).map((type) => (
            <label key={type}>{type === "infantry" ? "步兵" : type === "cavalry" ? "骑兵" : type === "archer" ? "弓兵" : "水军"}
              <input type="number" min="0" max={source?.troops[type] ?? 0} value={carried[type]} onChange={(event) => updateTroop(type, Number(event.target.value))} />
              <span>/ {source?.troops[type] ?? 0}</span>
            </label>
          ))}
          <p>共携带 {totalTroops(carried).toLocaleString()} 兵；调遣后来源城仍有 {remainingGenerals.length} 名武将。</p>
        </section>

        <footer>
          <span className={validation.ok ? remainingGenerals.length === 0 ? "warning-text-inline" : "" : "danger-text"}>
            {!validation.ok ? validation.reason : remainingGenerals.length === 0 ? "警告：此次调遣会使来源城暂时无将。" : "校验通过，执行后自动保存。"}
          </span>
          <button onClick={onCancel}>取消</button>
          <button className="primary imperial-edict" disabled={!validation.ok} onClick={() => onConfirm(request)} data-testid="confirm-transfer">执行调遣 · 指令 -1</button>
        </footer>
      </section>
    </div>
  );
}

