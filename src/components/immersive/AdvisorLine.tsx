interface AdvisorLineProps {
  lines?: string[];
  fallback?: string;
}

export function AdvisorLine({ lines, fallback = "军师暂无新议，可审视地图后再下令。" }: AdvisorLineProps) {
  const visible = lines && lines.length > 0 ? lines.slice(0, 3) : [fallback];
  return (
    <div className="advisor-line">
      <b>军师进言</b>
      {visible.map((line) => <span key={line}>{line}</span>)}
    </div>
  );
}
