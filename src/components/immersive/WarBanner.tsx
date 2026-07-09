import type { CSSProperties } from "react";

interface WarBannerProps {
  color?: string;
  label: string;
  sublabel?: string;
}

export function WarBanner({ color = "#d6b46a", label, sublabel }: WarBannerProps) {
  return (
    <div className="war-banner" style={{ "--banner-color": color } as CSSProperties}>
      <i />
      <strong>{label}</strong>
      {sublabel && <span>{sublabel}</span>}
    </div>
  );
}
