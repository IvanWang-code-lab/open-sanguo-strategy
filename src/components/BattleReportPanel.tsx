import { getCharacterCanonProfile } from "../data/characterCanonProfiles";
import type { BattleReport } from "../types";

interface BattleReportPanelProps {
  report: BattleReport;
}

export function BattleReportPanel({ report }: BattleReportPanelProps) {
  const mvpProfile = getCharacterCanonProfile(report.winner === "attacker" ? report.attackerGeneralId : report.defenderGeneralId);
  return (
    <div className="battle-report">
      <h3>{report.resultText}</h3>
      <div className="after-grid">
        <span>指挥评分：{report.commandGrade ?? "B"} / {report.commandScore ?? 60}</span>
        <span>MVP：{report.winner === "attacker" ? report.attackerGeneral : report.defenderGeneral}</span>
        <span>进攻损失：{report.attackerLoss.toLocaleString()}</span>
        <span>防守损失：{report.defenderLoss.toLocaleString()}</span>
      </div>
      <p>{report.occupied ? `已占领 ${report.defenderCityName}` : `${report.defenderCityName}守军坚守成功`}。</p>
      <p>{report.commanderContribution}</p>
      <p>{report.advisorContribution}</p>
      {report.playerControlSummary && <p>{report.playerControlSummary}</p>}
      {report.keyFactors && (
        <div className="review-block">
          <strong>关键因素</strong>
          {report.keyFactors.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      {report.battleTimeline && (
        <div className="review-block">
          <strong>五阶段时间线</strong>
          {report.battleTimeline.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
      {report.tacticalChoices?.map((choice) => (
        <span key={`${choice.phase}-${choice.choiceId}`}>战术：{choice.description}；{choice.actualEffects}</span>
      ))}
      {report.wingContributions?.map((item) => <span key={item}>{item}</span>)}
      <p>战后评语：{mvpProfile?.notes ?? report.mvpText}</p>
      {report.nextAdvice && <p>下一步建议：{report.nextAdvice}</p>}
      {[...report.skillMessages, ...report.expMessages].slice(0, 8).map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}
