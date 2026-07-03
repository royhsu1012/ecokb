"use client";

interface LogoProps {
  size?: number;
  showText?: boolean;
  fontSize?: number;
}

export function Logo({ size = 30, showText = true, fontSize = 15 }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.27),
        background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--on-accent)", fontWeight: 800, fontSize: Math.round(size * 0.43),
        boxShadow: "var(--shadow-sm)", flexShrink: 0,
      }}>E</div>
      {showText && (
        <span style={{ fontWeight: 700, fontSize, letterSpacing: "-0.3px", color: "var(--text)" }}>EconKB</span>
      )}
    </div>
  );
}
