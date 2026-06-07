interface LogPanelProps {
  logs: string[];
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <section className="log-panel">
      <h3>事件日志</h3>
      <div className="log-list">
        {logs.map((log, index) => (
          <p key={`${log}-${index}`}>
            <span>{index === 0 ? "最新" : "记录"}</span>
            {log}
          </p>
        ))}
      </div>
    </section>
  );
}
