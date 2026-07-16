import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import { battlePhaseLabels } from "../systems/battleTacticsSystem";
import type { BattleReport } from "../types";

interface BattleReportPanelProps {
  report: BattleReport;
}

const successLabel = {
  success: "成功",
  partial: "部分成功",
  failed: "失败",
  countered: "被反制",
} as const;

export function BattleReportPanel({ report }: BattleReportPanelProps) {
  const winnerName = report.winner === "attacker" ? report.attackerGeneral : report.defenderGeneral;
  const mvpProfile = getCharacterCanonProfile(report.winner === "attacker" ? report.attackerGeneralId : report.defenderGeneralId);

  return (
    <div className="battle-report v12-war-report">
      <header className="war-report-title">
        <span>{report.occupied ? "攻城成功" : report.winner === "attacker" ? "战场胜利" : "败退整备"}</span>
        <h3>{report.battleTitle ?? report.resultText}</h3>
        <p>{report.battleSummary ?? report.mvpText}</p>
      </header>

      <section className="war-report-ledger">
        <span>指挥评分 <b>{report.commandGrade ?? "B"} / {report.commandScore ?? 60}</b></span>
        <span>MVP <b>{winnerName}</b></span>
        <span>出征 <b>{(report.sortieTotal ?? report.attackerStart).toLocaleString()}</b></span>
        <span>留守 <b>{(report.garrisonTotal ?? 0).toLocaleString()}</b></span>
        <span>粮草 <b>-{report.supplyCost ?? 0}</b></span>
        <span>疲劳 <b>+{report.cityFatigueDelta ?? 0}</b></span>
        <span>我损 <b>{report.attackerLoss.toLocaleString()}</b></span>
        <span>敌损 <b>{report.defenderLoss.toLocaleString()}</b></span>
      </section>

      <p className="historical-narrative">{report.historicalNarrative ?? report.battleAftermath}</p>

      {report.settlementSummary && (
        <section className="war-report-settlement">
          <h4>战后军势去向</h4>
          <p>{report.settlementSummary}</p>
          <span>驻守：{report.garrisonGeneralNames?.join("、") || "无"}</span>
          <span>回师：{report.returnGeneralNames?.join("、") || "无"}</span>
          <span>来源城兵力：{(report.sourceCityTroopsAfter ?? 0).toLocaleString()}</span>
          <span>目标城兵力：{(report.targetCityTroopsAfter ?? 0).toLocaleString()}</span>
          <small>后续可在军务署使用“城市调遣”，每次消耗 1 指令。</small>
        </section>
      )}

      <section className="war-report-columns">
        <div>
          <h4>武将表现</h4>
          <p>{report.commanderContribution}</p>
          <p>{report.advisorContribution}</p>
          {report.wingContributions?.map((item, index) => <span key={`wing-${index}-${item}`}>{item}</span>)}
          <p>人物评语：{mvpProfile?.notes ?? report.mvpText}</p>
        </div>
        <div>
          <h4>战局关键</h4>
          {report.decisiveEvents?.length
            ? report.decisiveEvents.map((item, index) => <span key={`decisive-${index}-${item}`}>决胜事件：{item}</span>)
            : <span>未出现单一决胜事件，胜负由综合军势决定。</span>}
          {report.comboMessages?.map((item, index) => <span key={`combo-${index}-${item}`}>连携：{item}</span>)}
          {report.counterMessages?.map((item, index) => <span key={`counter-${index}-${item}`}>反制：{item}</span>)}
          {report.keyFactors?.slice(0, 5).map((item, index) => <span key={`factor-${index}-${item}`}>{item}</span>)}
        </div>
      </section>

      {report.tacticalChoices && report.tacticalChoices.length > 0 && (
        <section className="war-scroll-timeline">
          <h4>五阶段战术</h4>
          {report.tacticalChoices.map((choice, index) => (
            <article key={`${choice.phase}-${choice.choiceId}-${index}`}>
              <b>【{battlePhaseLabels[choice.phase]}】{choice.label}</b>
              <span>{successLabel[choice.successLevel ?? (choice.success ? "success" : "failed")]}</span>
              <p>{choice.actualEffects}</p>
            </article>
          ))}
        </section>
      )}

      {report.unitResults && report.unitResults.length > 0 && (
        <section className="war-scroll-timeline">
          <h4>可控部队表现</h4>
          {report.unitResults.filter((unit) => !unit.unitId.startsWith("enemy-")).map((unit) => (
            <article key={unit.unitId}>
              <b>{unit.generalName}部</b>
              <span>{unit.routed ? "溃退" : "存续"} · 剩余 {unit.remainingTroops}/{unit.startTroops}</span>
              <p>杀伤 {unit.kills}，损失 {unit.losses}，主动技能 {unit.skillUses} 次。</p>
            </article>
          ))}
        </section>
      )}

      {report.skillRecords && report.skillRecords.length > 0 && (
        <section className="war-scroll-timeline">
          <h4>主动技能记录</h4>
          {report.skillRecords.slice(0, 8).map((record, index) => (
            <article key={`${record.skillId}-${record.round}-${index}`}>
              <b>第{record.round}回合 · {record.generalName}发动【{record.skillName}】</b>
              <span>目标：{record.target}</span>
              <p>{record.effect}</p>
            </article>
          ))}
        </section>
      )}

      {report.commandRecords && report.commandRecords.length > 0 && (
        <section className="war-scroll-timeline">
          <h4>玩家命令回放</h4>
          {report.commandRecords.slice(0, 8).map((record, index) => (
            <article key={`${record.round}-${record.commandType}-${index}`}>
              <b>第{record.round}回合 · {record.generalName}</b>
              <span>{record.summary}</span>
            </article>
          ))}
        </section>
      )}

      <section className="war-report-advice">
        <h4>战后建议</h4>
        <p>{report.recoveryHint}</p>
        <p>{report.nextAdvice}</p>
        {[...report.skillMessages, ...report.expMessages].slice(0, 8).map((item, index) => <span key={`message-${index}-${item}`}>{item}</span>)}
      </section>
    </div>
  );
}
