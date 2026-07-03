"use client";
import { Logo } from "@/components/Logo";
import type { Conversation } from "@/lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  email: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

export function ChatSidebar({ conversations, activeId, email, onSelect, onNew, onDelete, onLogout }: Props) {
  return (
    <div style={{ width: 256, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <Logo size={30} fontSize={15} />
      </div>

      <div style={{ padding: "12px 12px 8px" }}>
        <button onClick={onNew}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> 新對話
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {conversations.length === 0 && (
          <p style={{ color: "var(--faint)", fontSize: 12, textAlign: "center", padding: "20px 8px" }}>尚無對話記錄</p>
        )}
        {conversations.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)}
            className={`conv-item${activeId === c.id ? " active" : ""}`}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1.4 }}>{c.title}</span>
            <button onClick={e => { e.stopPropagation(); onDelete(c.id); }}
              style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 0 0 6px", flexShrink: 0, opacity: 0.7 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--on-accent)" }}>
              {email?.[0]?.toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
          </div>
          <button onClick={onLogout} style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>登出</button>
        </div>
      </div>
    </div>
  );
}
