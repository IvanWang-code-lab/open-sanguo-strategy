import type { ReactNode } from "react";

interface CommandSealProps {
  children: ReactNode;
  disabled?: boolean;
  recommended?: boolean;
  danger?: boolean;
  title?: string;
  onClick?: () => void;
}

export function CommandSeal({ children, disabled, recommended, danger, title, onClick }: CommandSealProps) {
  return (
    <button
      className={`command-seal ${recommended ? "recommended" : ""} ${danger ? "danger" : ""}`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
