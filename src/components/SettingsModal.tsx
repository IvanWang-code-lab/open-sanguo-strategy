import { X } from "lucide-react";
import type { CommandPreferences } from "../types";

interface SettingsModalProps {
  preferences: CommandPreferences;
  onChange: (preferences: CommandPreferences) => void;
  onClose: () => void;
}

export function SettingsModal({ preferences, onChange, onClose }: SettingsModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="settings-modal game-panel immersive-settings">
        <header className="war-council-head">
          <div>
            <p className="eyebrow">游戏设置</p>
            <h2>战斗、事件、难度与沙盘规则</h2>
            <span>设置会写入 localStorage；旧存档缺字段时自动补默认值。</span>
          </div>
          <button onClick={onClose}><X size={18} /> 关闭</button>
        </header>
        <div className="settings-grid">
          <section>
            <h3>战斗操控模式</h3>
            <div className="settings-row">
              {(["classic", "autoWatch", "quick"] as const).map((mode) => (
                <button key={mode} className={preferences.battleControlMode === mode ? "selected" : ""} onClick={() => onChange({ ...preferences, battleControlMode: mode })}>
                  {mode === "classic" ? "经典指挥" : mode === "autoWatch" ? "自动观战" : "快速结算"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>战斗速度</h3>
            <div className="settings-row">
              {(["normal", "fast"] as const).map((speed) => (
                <button key={speed} className={preferences.battleSpeed === speed ? "selected" : ""} onClick={() => onChange({ ...preferences, battleSpeed: speed })}>
                  {speed === "normal" ? "普通" : "快速"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>AI 战报</h3>
            <div className="settings-row">
              {(["important", "brief"] as const).map((level) => (
                <button key={level} className={preferences.aiBattleLogLevel === level ? "selected" : ""} onClick={() => onChange({ ...preferences, aiBattleLogLevel: level })}>
                  {level === "important" ? "重要日志" : "简报"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>AI 强度</h3>
            <div className="settings-row">
              {(["casual", "normal", "hard"] as const).map((level) => (
                <button key={level} className={(preferences.aiLevel ?? "normal") === level ? "selected" : ""} onClick={() => onChange({ ...preferences, aiLevel: level })}>
                  {level === "casual" ? "休闲" : level === "hard" ? "困难" : "普通"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>事件频率</h3>
            <div className="settings-row">
              {(["low", "normal", "high"] as const).map((frequency) => (
                <button key={frequency} className={(preferences.eventFrequency ?? "normal") === frequency ? "selected" : ""} onClick={() => onChange({ ...preferences, eventFrequency: frequency })}>
                  {frequency === "low" ? "低" : frequency === "high" ? "高" : "标准"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>战斗复杂度</h3>
            <div className="settings-row">
              {(["simple", "standard", "deep"] as const).map((mode) => (
                <button key={mode} className={(preferences.battleComplexity ?? "standard") === mode ? "selected" : ""} onClick={() => onChange({ ...preferences, battleComplexity: mode })}>
                  {mode === "simple" ? "简化" : mode === "deep" ? "深度" : "标准"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>刘备保护</h3>
            <div className="settings-row">
              {(["off", "standard", "extended"] as const).map((mode) => (
                <button key={mode} className={(preferences.liubeiProtectionMode ?? "standard") === mode ? "selected" : ""} onClick={() => onChange({ ...preferences, liubeiProtectionMode: mode })}>
                  {mode === "off" ? "关闭" : mode === "extended" ? "延长" : "标准"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>自动治理</h3>
            <div className="settings-row">
              {(["off", "advice", "safeAuto"] as const).map((mode) => (
                <button key={mode} className={(preferences.autoGovernanceMode ?? "off") === mode ? "selected" : ""} onClick={() => onChange({ ...preferences, autoGovernanceMode: mode })}>
                  {mode === "off" ? "关闭" : mode === "safeAuto" ? "低风险自动" : "只给建议"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>战术提示</h3>
            <div className="settings-row">
              {([true, false] as const).map((enabled) => (
                <button key={String(enabled)} className={(preferences.tacticHints ?? true) === enabled ? "selected" : ""} onClick={() => onChange({ ...preferences, tacticHints: enabled })}>
                  {enabled ? "开启" : "关闭"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>UI 密度</h3>
            <div className="settings-row">
              {(["standard", "compact"] as const).map((density) => (
                <button key={density} className={(preferences.uiDensity ?? "standard") === density ? "selected" : ""} onClick={() => onChange({ ...preferences, uiDensity: density })}>
                  {density === "standard" ? "标准" : "紧凑"}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>动效 / 音效</h3>
            <div className="settings-row">
              <button className={(preferences.animationsEnabled ?? true) ? "selected" : ""} onClick={() => onChange({ ...preferences, animationsEnabled: !(preferences.animationsEnabled ?? true) })}>
                动效{(preferences.animationsEnabled ?? true) ? "开" : "关"}
              </button>
              <button className={(preferences.soundEnabled ?? false) ? "selected" : ""} onClick={() => onChange({ ...preferences, soundEnabled: !(preferences.soundEnabled ?? false) })}>
                音效{(preferences.soundEnabled ?? false) ? "开" : "关"}
              </button>
            </div>
            <p className="muted">当前音效为本地接口预留，不会联网加载资源。</p>
          </section>
          <section>
            <h3>自动保存</h3>
            <div className="settings-row">
              {([true, false] as const).map((enabled) => (
                <button key={String(enabled)} className={(preferences.autoSave ?? true) === enabled ? "selected" : ""} onClick={() => onChange({ ...preferences, autoSave: enabled })}>
                  {enabled ? "开启" : "关闭"}
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
