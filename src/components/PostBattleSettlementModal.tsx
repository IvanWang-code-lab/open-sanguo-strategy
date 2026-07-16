import { useMemo, useState } from "react";
import { ArrowLeft, Castle, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createSettlementDecision, validateSettlementDecision } from "../systems/postBattleSettlementSystem";
import { totalTroops } from "../systems/unitSystem";
import type { GameState, PendingPostBattleSettlement, PostBattleSettlementDecision, PostBattleSettlementMode } from "../types";

interface PostBattleSettlementModalProps {
  state: GameState;
  pending: PendingPostBattleSettlement;
  onConfirm: (decision: PostBattleSettlementDecision) => void;
}

const modeLabels: Record<PostBattleSettlementMode, { label: string; description: string }> = {
  splitGarrison: { label: "分兵驻守", description: "精选守将留新城，其余主力回师。" },
  returnMain: { label: "主力回师", description: "仅留一名守将，最大限度保全根基城人才。" },
  allStation: { label: "全军驻守", description: "全体进入新城，来源城可能暂时无将。" },
  auto: { label: "自动分配", description: "按统率、主公身份和城市根基自动安排。" },
};

export function PostBattleSettlementModal({ state, pending, onConfirm }: PostBattleSettlementModalProps) {
  const initial = useMemo(() => createSettlementDecision(state, pending, pending.recommendedMode), [state, pending]);
  const [decision, setDecision] = useState<PostBattleSettlementDecision>(initial);
  const source = state.cities.find((city) => city.id === pending.sourceCityId);
  const target = state.cities.find((city) => city.id === pending.targetCityId);
  const participants = state.generals.filter((general) => pending.participantGeneralIds.includes(general.id));
  const validation = validateSettlementDecision(state, decision);

  const chooseMode = (mode: PostBattleSettlementMode) => setDecision(createSettlementDecision(state, pending, mode));
  const toggleDestination = (generalId: string, destination: "garrison" | "return") => {
    const garrison = decision.garrisonGeneralIds.filter((id) => id !== generalId);
    const returning = decision.returnGeneralIds.filter((id) => id !== generalId);
    if (destination === "garrison") garrison.push(generalId);
    else returning.push(generalId);
    setDecision({ ...decision, mode: "splitGarrison", garrisonGeneralIds: garrison, returnGeneralIds: returning });
  };

  return (
    <div className="modal-backdrop settlement-backdrop" data-testid="post-battle-settlement">
      <section className="post-battle-settlement-modal" role="dialog" aria-modal="true" aria-label="战后占城处置">
        <header className="settlement-header">
          <div>
            <span>战后军势处置</span>
            <h2>{target?.name ?? "新城"}已下，如何安置军势？</h2>
            <p>{source?.name ?? "来源城"}与{target?.name ?? "目标城"}的武将、兵力将在确认后一次性落位。</p>
          </div>
          <button className="icon-button" title="按推荐方案处置并关闭" onClick={() => onConfirm(createSettlementDecision(state, pending, "auto"))}>×</button>
        </header>

        <div className="settlement-route-summary">
          <span><ArrowLeft size={18} /> 回师 {source?.name} · 现有 {source ? totalTroops(source.troops).toLocaleString() : 0}</span>
          <strong>军势去向</strong>
          <span><Castle size={18} /> 驻守 {target?.name} · 城防 {pending.targetCityRemainingDefense}</span>
        </div>

        <nav className="settlement-mode-row" aria-label="处置模式">
          {pending.availableSettlementModes.map((mode) => (
            <button key={mode} className={decision.mode === mode ? "selected" : ""} onClick={() => chooseMode(mode)} data-testid={`settlement-mode-${mode}`}>
              {mode === "splitGarrison" ? <Users size={18} /> : mode === "returnMain" ? <ArrowLeft size={18} /> : mode === "allStation" ? <Castle size={18} /> : <Sparkles size={18} />}
              <b>{modeLabels[mode].label}</b>
              <small>{modeLabels[mode].description}</small>
            </button>
          ))}
        </nav>

        <div className="settlement-general-list">
          {participants.map((general) => {
            const stationing = decision.garrisonGeneralIds.includes(general.id);
            const troops = totalTroops(pending.survivingTroopsByGeneral[general.id] ?? { infantry: 0, cavalry: 0, archer: 0, navy: 0 });
            return (
              <article key={general.id} data-testid={`settlement-general-${general.id}`}>
                <div>
                  <b>{general.name}</b>
                  <span>统 {general.command} · 武 {general.force} · 余部 {troops.toLocaleString()}</span>
                </div>
                <div className="destination-toggle">
                  <button className={stationing ? "selected" : ""} onClick={() => toggleDestination(general.id, "garrison")} data-testid={`station-${general.id}`}><ShieldCheck size={16} />驻守{target?.name}</button>
                  <button className={!stationing ? "selected" : ""} onClick={() => toggleDestination(general.id, "return")} data-testid={`return-${general.id}`}><ArrowLeft size={16} />回师{source?.name}</button>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="settlement-footer">
          <span className={validation.ok ? "" : "danger-text"}>{validation.ok ? "去向校验通过，确认后自动保存。" : validation.reason}</span>
          <button className="primary imperial-edict" disabled={!validation.ok} onClick={() => onConfirm(decision)} data-testid="confirm-settlement">确认军势处置</button>
        </footer>
      </section>
    </div>
  );
}

