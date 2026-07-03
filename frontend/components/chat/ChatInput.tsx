"use client";
import { RefObject } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  thinking: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export function ChatInput({ value, onChange, onSend, thinking, textareaRef }: Props) {
  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  const canSend = value.trim() && !thinking;

  return (
    <div style={{ padding: "16px 24px", borderTop: "1px solid #1a2f50", background: "#0d1117", flexShrink: 0 }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#111827", border: "1px solid #1e3a5f", borderRadius: 14, padding: "10px 14px", boxShadow: "0 0 0 1px transparent", transition: "border-color 0.2s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#7c3aed33")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "#1e3a5f")}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { onChange(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)"
            rows={1}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", resize: "none", fontSize: 14, lineHeight: 1.6, maxHeight: 160, overflow: "auto" }} />
          <button onClick={onSend} disabled={!canSend}
            style={{ padding: "8px 18px", borderRadius: 10, background: canSend ? "linear-gradient(135deg,#7c3aed,#2d7dd2)" : "#1e3a5f", color: canSend ? "white" : "#374151", border: "none", cursor: canSend ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, flexShrink: 0, transition: "all 0.2s", boxShadow: canSend ? "0 2px 8px rgba(124,58,237,0.3)" : "none" }}>
            送出
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#374151", textAlign: "center", marginTop: 8 }}>EconKB 僅根據知識庫內容回答，可能存在資訊缺漏。</p>
      </div>
    </div>
  );
}
