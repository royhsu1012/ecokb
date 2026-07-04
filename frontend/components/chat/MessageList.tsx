"use client";
import { RefObject } from "react";
import type { Conversation } from "@/lib/types";

const SUGGESTIONS = ["什麼是菲利普斯曲線？", "解釋量化寬鬆政策", "GDP 與 GNP 的差異"];

function renderContent(text: string) {
  const parts = text.split(/(\[來源 \d+\])/g);
  return parts.map((part, i) => {
    if (/^\[來源 \d+\]$/.test(part)) {
      return (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11, fontWeight: 600, margin: "0 2px", border: "1px solid var(--accent-border)", verticalAlign: "middle" }}>
          {part}
        </span>
      );
    }
    const boldParts = part.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {boldParts.map((bp, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: "var(--text)", fontWeight: 600 }}>{bp}</strong> : bp
        )}
      </span>
    );
  });
}

interface Props {
  conversation: Conversation | null;
  thinking: boolean;
  onSuggestion: (q: string) => void;
  endRef: RefObject<HTMLDivElement>;
}

export function MessageList({ conversation, thinking, onSuggestion, endRef }: Props) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        {!conversation || conversation.messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 80 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--accent-soft)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📚</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>EconKB 知識庫助理</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0, textAlign: "center", lineHeight: 1.6 }}>上傳文件後開始提問<br />AI 將根據你的知識庫內容回答並標註來源</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {SUGGESTIONS.map(q => (
                <button key={q} className="suggestion-chip" onClick={() => onSuggestion(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
              {msg.role === "assistant" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--on-accent)" }}>E</div>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>EconKB</span>
                </div>
              )}
              <div style={{
                maxWidth: "84%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                fontSize: 14, lineHeight: 1.75,
                background: msg.role === "user" ? "var(--accent)" : "var(--card)",
                color: msg.role === "user" ? "var(--on-accent)" : "var(--text)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                boxShadow: "var(--shadow-sm)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content === "" && thinking && i === conversation.messages.length - 1 ? (
                  <span style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
                    {[0, 1, 2].map(d => (
                      <span key={d} className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                    ))}
                  </span>
                ) : (
                  msg.role === "assistant" ? renderContent(msg.content) : msg.content
                )}
              </div>
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div style={{ maxWidth: "84%", marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>引用來源（相關度）</span>
                  {msg.sources.map(src => (
                    <div key={src.index} title={src.content}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-2)" }}>
                      <span style={{ color: "var(--accent)", fontWeight: 600, flexShrink: 0 }}>來源 {src.index}</span>
                      <span style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${src.score}%`, background: "var(--accent)" }} />
                      </span>
                      <span style={{ flexShrink: 0, color: "var(--muted)" }}>{src.score}%</span>
                    </div>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && msg.content && (
                <button onClick={() => navigator.clipboard.writeText(msg.content)}
                  style={{ fontSize: 11, color: "var(--faint)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", marginTop: 2 }}
                  title="複製">
                  複製
                </button>
              )}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
