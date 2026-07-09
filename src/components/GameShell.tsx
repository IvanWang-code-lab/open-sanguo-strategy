import type { ReactNode } from "react";

interface GameShellProps {
  top: ReactNode;
  map: ReactNode;
  side: ReactNode;
  bottom: ReactNode;
  outcome?: ReactNode;
  density?: "standard" | "compact";
  children?: ReactNode;
}

export function GameShell({ top, map, side, bottom, outcome, density = "standard", children }: GameShellProps) {
  return (
    <div className={`app-shell game-shell-v2 density-${density}`}>
      {top}
      {outcome}
      <main className="game-layout game-main-grid">
        <section className="strategy-map-zone">{map}</section>
        <aside className="right-stack game-side-panel">{side}</aside>
      </main>
      {bottom}
      {children}
    </div>
  );
}
