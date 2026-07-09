import type { WorldEvent } from "../types";

interface GameBottomLogProps {
  logs: string[];
  advice?: string[];
  events?: WorldEvent[];
  commandHistory?: string[];
}

export function GameBottomLog({ logs, advice = [], events = [], commandHistory = [] }: GameBottomLogProps) {
  return (
    <section className="game-bottom-log bamboo-intel-log">
      <div className="bottom-advisor">
        <strong>战略顾问</strong>
        {(advice.length ? advice : ["请选择城池并消耗有限指令，决定本回合最重要的行动。"]).map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="bottom-log-feed major-events">
        <strong>天下大事</strong>
        {(events.length ? events : []).slice(0, 5).map((event) => <span key={event.id}>【{event.title}】{event.message}</span>)}
        {events.length === 0 && logs.slice(0, 5).map((log) => <span key={log}>{log}</span>)}
      </div>
      <div className="bottom-log-feed">
        <strong>本回合军报</strong>
        {(commandHistory.length ? commandHistory : logs).slice(0, 8).map((log) => <span key={log}>{log}</span>)}
      </div>
    </section>
  );
}
