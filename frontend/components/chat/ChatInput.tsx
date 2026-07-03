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
    <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "10px 14px", transition: "border-color 0.2s", boxShadow: "var(--shadow-sm)" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--border)")}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => { onChange(e.target.value); autoResize(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)"
            rows={1}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", resize: "none", fontSize: 14, lineHeight: 1.6, maxHeight: 160, overflow: "auto" }} />
          <button onClick={onSend} disabled={!canSend} className="btn-primary"
            style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, flexShrink: 0 }}>
            送出
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", marginTop: 8 }}>EconKB 僅根據知識庫內容回答，可能存在資訊缺漏。</p>
      </div>
    </div>
  );
}
