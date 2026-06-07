import type { CSSProperties } from "react";
import { Hammer, Search, Shield, Sprout, Store, Sword, UserPlus } from "lucide-react";
import { ART_ASSETS } from "../data/artAssets";
import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { getAttackTargets } from "../systems/citySystem";
import { getBestGeneral } from "../systems/generalSystem";
import type { City, GameState } from "../types";

interface ActionPanelProps {
  state: GameState;
  city?: City;
  onAction: (action: "recruit" | "agriculture" | "commerce" | "defense" | "train" | "search") => void;
  onAttack: (targetCityId: string) => void;
}

export function ActionPanel({ state, city, onAction, onAttack }: ActionPanelProps) {
  if (!city) return null;
  const own = city.factionId === state.playerFactionId;
  const disabled = !own || city.actedThisTurn;
  const targets = getAttackTargets(state, city.id);
  const adviser = getBestGeneral(state, city.id, "battle");
  const adviserProfile = getCharacterCanonProfile(adviser?.id);
  return (
    <section className="action-panel war-room-panel" style={{ "--war-room-bg": `url(${ART_ASSETS.backgrounds.warRoom})` } as CSSProperties}>
      <h3>城市操作</h3>
      <div className="action-grid">
        <button disabled={disabled} onClick={() => onAction("recruit")}><UserPlus size={16} /> 征兵</button>
        <button disabled={disabled} onClick={() => onAction("agriculture")}><Sprout size={16} /> 开发农业</button>
        <button disabled={disabled} onClick={() => onAction("commerce")}><Store size={16} /> 开发商业</button>
        <button disabled={disabled} onClick={() => onAction("defense")}><Shield size={16} /> 修筑城防</button>
        <button disabled={disabled} onClick={() => onAction("train")}><Hammer size={16} /> 训练士兵</button>
        <button disabled={disabled} onClick={() => onAction("search")}><Search size={16} /> 搜索武将</button>
      </div>
      <h3>可攻击目标</h3>
      {own && adviser && (
        <p className="council-hint">
          军议：{adviser.name}可作主将。{adviserProfile?.notes ?? "此将适合按当前兵力与地形稳健行动。"}
        </p>
      )}
      <div className="target-list">
        {!own && <p className="muted">只有己方城市可以出征。</p>}
        {own && targets.length === 0 && <p className="muted">周边暂无敌对城市。</p>}
        {own && targets.map((target) => (
          <button key={target.id} disabled={city.actedThisTurn} onClick={() => onAttack(target.id)}>
            <Sword size={16} /> 出征 {target.name}
          </button>
        ))}
      </div>
    </section>
  );
}
