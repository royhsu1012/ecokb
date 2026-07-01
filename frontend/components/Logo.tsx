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
        background: "linear-gradient(135deg,#7c3aed,#2d7dd2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 800, fontSize: Math.round(size * 0.43),
        boxShadow: "0 2px 8px rgba(124,58,237,0.4)", flexShrink: 0,
      }}>E</div>
      {showText && (
        <span style={{ fontWeight: 700, fontSize, letterSpacing: "-0.3px" }}>EconKB</span>
      )}
    </div>
  );
}
