import type { ReactNode } from "react";

interface GamePanelProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function GamePanel({ title, eyebrow, children, className = "" }: GamePanelProps) {
  return (
    <section className={`game-panel ${className}`}>
      {(title || eyebrow) && (
        <header className="game-panel-head">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h3>{title}</h3>}
        </header>
      )}
      {children}
    </section>
  );
}
