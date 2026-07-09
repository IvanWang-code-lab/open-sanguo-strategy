interface BattleRoundTimelineProps {
  logs: string[];
}

export function BattleRoundTimeline({ logs }: BattleRoundTimelineProps) {
  return (
    <aside className="battle-round-timeline">
      <h3>战场军报</h3>
      <div>
        {logs.slice(-12).reverse().map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </aside>
  );
}
