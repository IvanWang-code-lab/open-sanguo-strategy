import type { ReactNode } from "react";

interface ScrollPanelProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

export function ScrollPanel({ title, subtitle, className = "", children }: ScrollPanelProps) {
  return (
    <section className={`scroll-panel ${className}`}>
      {(title || subtitle) && (
        <header className="scroll-panel-head">
          {subtitle && <span>{subtitle}</span>}
          {title && <h3>{title}</h3>}
        </header>
      )}
      <div className="scroll-panel-body">{children}</div>
    </section>
  );
}
