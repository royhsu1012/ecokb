"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, clearSession } from "@/lib/auth";

interface Message { role: "user" | "assistant"; content: string; }
interface Conversation { id: string; title: string; messages: Message[]; }

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [kbId, setKbId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSession({ userId: s.userId, email: s.email });
    const kb = localStorage.getItem("kb_id") || "";
    setKbId(kb);
    newConversation();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversations, activeId]);

  function newConversation() {
    const id = crypto.randomUUID();
    const conv: Conversation = { id, title: "新對話", messages: [] };
    setConversations(prev => [conv, ...prev]);
    setActiveId(id);
  }

  function deleteConversation(id: string) {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveId(remaining[0]?.id || null);
    }
  }

  async function sendMessage() {
    if (!input.trim() || thinking || !activeId || !kbId) return;
    const question = input.trim();
    setInput("");

    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, title: c.messages.length === 0 ? question.slice(0, 30) : c.title, messages: [...c.messages, { role: "user", content: question }] }
        : c
    ));

    setThinking(true);
    let answer = "";

    setConversations(prev => prev.map(c =>
      c.id === activeId ? { ...c, messages: [...c.messages, { role: "assistant", content: "" }] } : c
    ));

    try {
      await api.chat.ask(kbId, question, (chunk) => {
        answer += chunk;
        setConversations(prev => prev.map(c =>
          c.id === activeId
            ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, content: answer } : m) }
            : c
        ));
      });
    } catch {
      setConversations(prev => prev.map(c =>
        c.id === activeId
          ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, content: "發生錯誤，請重試。" } : m) }
          : c
      ));
    } finally {
      setThinking(false);
    }
  }

  function logout() { clearSession(); router.push("/"); }

  const S = {
    sidebar: { width: 260, background: "#0d1f3c", borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column" as const, padding: "16px 12px", gap: 8 },
    main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
    topbar: { padding: "12px 20px", borderBottom: "1px solid #1e3a5f", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1117" },
    messages: { flex: 1, overflowY: "auto" as const, padding: "24px 20px", display: "flex", flexDirection: "column" as const, gap: 16 },
    inputArea: { padding: "16px 20px", borderTop: "1px solid #1e3a5f", background: "#0d1117" },
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e2e8f0" }}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12 }}>E</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>EconKB</span>
        </div>
        <button onClick={newConversation}
          style={{ padding: "8px 12px", borderRadius: 8, background: "#7c3aed", color: "white", border: "none", cursor: "pointer", fontSize: 14, textAlign: "left", marginBottom: 8 }}>
          + 新對話
        </button>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {conversations.map(c => (
            <div key={c.id} onClick={() => setActiveId(c.id)}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", background: activeId === c.id ? "rgba(124,58,237,0.2)" : "transparent", color: activeId === c.id ? "#a78bfa" : "#94a3b8" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteConversation(c.id); }}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 0 0 4px" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.email}</span>
          <button onClick={logout} style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>登出</button>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Topbar */}
        <div style={S.topbar}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>claude-sonnet-4-6</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/graph")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(15,198,194,0.1)", color: "#0fc6c2", border: "1px solid rgba(15,198,194,0.3)", cursor: "pointer", fontSize: 13 }}>
              知識圖譜
            </button>
            <button onClick={() => router.push("/admin")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer", fontSize: 13 }}>
              管理後台
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={S.messages}>
          {!activeConv || activeConv.messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📚</div>
              <h2 style={{ fontSize: 22, fontWeight: 600 }}>EconKB 知識庫助理</h2>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>請上傳文件後開始提問，AI 將根據知識庫內容回答。</p>
            </div>
          ) : (
            activeConv.messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "70%", padding: "12px 16px", borderRadius: 12, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  background: msg.role === "user" ? "linear-gradient(135deg,#7c3aed,#2d7dd2)" : "#111827",
                  color: "#e2e8f0", border: msg.role === "assistant" ? "1px solid #1e3a5f" : "none",
                }}>
                  {msg.content || (thinking && i === activeConv.messages.length - 1 ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} className="typing-dot" />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} className="typing-dot" />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} className="typing-dot" />
                    </span>
                  ) : "")}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={S.inputArea}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#111827", border: "1px solid #1e3a5f", borderRadius: 12, padding: "8px 12px" }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)" rows={1}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", resize: "none", fontSize: 14, lineHeight: 1.5 }} />
            <button onClick={sendMessage} disabled={thinking || !input.trim()}
              style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", color: "white", border: "none", cursor: "pointer", fontSize: 14, opacity: thinking || !input.trim() ? 0.5 : 1 }}>
              送出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
