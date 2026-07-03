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
    <div style={{ width: 256, background: "#0a1628", borderRight: "1px solid #1a2f50", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #1a2f50" }}>
        <Logo size={30} fontSize={15} />
      </div>

      <div style={{ padding: "12px 12px 8px" }}>
        <button onClick={onNew}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> 新對話
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        {conversations.length === 0 && (
          <p style={{ color: "#374151", fontSize: 12, textAlign: "center", padding: "20px 8px" }}>尚無對話記錄</p>
        )}
        {conversations.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)}
            style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, background: activeId === c.id ? "rgba(124,58,237,0.18)" : "transparent", color: activeId === c.id ? "#c4b5fd" : "#64748b", transition: "background 0.15s" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1.4 }}>{c.title}</span>
            <button onClick={e => { e.stopPropagation(); onDelete(c.id); }}
              style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 0 0 6px", flexShrink: 0, opacity: 0.6 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #1a2f50" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
              {email?.[0]?.toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: 12, color: "#475569", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
          </div>
          <button onClick={onLogout} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>登出</button>
        </div>
      </div>
    </div>
  );
}
