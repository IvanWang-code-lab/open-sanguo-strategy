import type { ReactNode } from "react";

interface ImmersiveShellProps {
  top: ReactNode;
  map: ReactNode;
  side: ReactNode;
  bottom: ReactNode;
  outcome?: ReactNode;
  density?: "standard" | "compact";
  children?: ReactNode;
}

export function ImmersiveShell({ top, map, side, bottom, outcome, density = "standard", children }: ImmersiveShellProps) {
  return (
    <div className={`immersive-shell density-${density}`}>
      <div className="dynasty-backdrop" />
      {top}
      {outcome}
      <main className="immersive-layout">
        <section className="sand-table-stage">{map}</section>
        <aside className="magistrate-desk">{side}</aside>
      </main>
      {bottom}
      {children}
    </div>
  );
}
