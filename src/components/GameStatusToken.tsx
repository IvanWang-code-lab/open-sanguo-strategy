interface GameStatusTokenProps {
  label: string;
  value: string | number;
  max?: string | number;
  tone?: "political" | "military" | "neutral" | "danger";
  title?: string;
}

export function GameStatusToken({ label, value, max, tone = "neutral", title }: GameStatusTokenProps) {
  return (
    <span className={`game-status-token ${tone}`} title={title}>
      <small>{label}</small>
      <b>{value}{max !== undefined ? `/${max}` : ""}</b>
    </span>
  );
}
