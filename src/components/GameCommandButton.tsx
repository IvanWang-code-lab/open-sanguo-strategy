import type { ReactNode } from "react";

interface GameCommandButtonProps {
  icon?: ReactNode;
  title: string;
  cost: string;
  detail: string;
  recommended?: boolean;
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

export function GameCommandButton({ icon, title, cost, detail, recommended, danger, disabled, disabledReason, onClick }: GameCommandButtonProps) {
  return (
    <button
      className={`command-button ${recommended ? "recommended" : ""} ${danger ? "danger" : ""}`}
      disabled={disabled}
      title={disabledReason || `${title}｜${cost}｜${detail}`}
      onClick={onClick}
    >
      {icon}
      <strong>{title}{recommended && <em>推荐</em>}</strong>
      <span>{cost}</span>
      <small>{disabledReason || detail}</small>
    </button>
  );
}
