"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, clearSession } from "@/lib/auth";

interface Message { role: "user" | "assistant"; content: string; }
interface Conversation { id: string; title: string; messages: Message[]; }

const DEMO = typeof window !== "undefined" && localStorage.getItem("access_token") === "demo-token";

const DEMO_MESSAGES: Message[] = [
  { role: "user", content: "什麼是菲利普斯曲線？" },
  { role: "assistant", content: "菲利普斯曲線（Phillips Curve）描述**通貨膨脹率**與**失業率**之間的反向關係。[來源 1]\n\n根據知識庫內容，其核心概念如下：\n\n1. **短期關係**：當失業率下降時，通膨率傾向上升；反之亦然。[來源 1]\n2. **長期爭議**：Friedman 與 Phelps 提出自然失業率假說，認為長期菲利普斯曲線為垂直線。[來源 2]\n3. **近期發展**：2008 年金融危機後，菲利普斯曲線出現「平坦化」現象，各國央行難以用通膨目標錨定預期。[來源 3]" },
];

function renderContent(text: string) {
  const parts = text.split(/(\[來源 \d+\])/g);
  return parts.map((part, i) => {
    if (/^\[來源 \d+\]$/.test(part)) {
      const num = part.match(/\d+/)?.[0];
      return (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 4, background: "rgba(45,125,210,0.15)", color: "#60a5fa", fontSize: 11, fontWeight: 600, margin: "0 2px", border: "1px solid rgba(45,125,210,0.3)", verticalAlign: "middle" }}>
          {part}
        </span>
      );
    }
    // Bold **text**
    const boldParts = part.split(/\*\*(.+?)\*\*/g);
    return (
      <span key={i}>
        {boldParts.map((bp, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: "#e2e8f0", fontWeight: 600 }}>{bp}</strong> : bp
        )}
      </span>
    );
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [kbId, setKbId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDemo = useRef(false);

  const activeConv = conversations.find(c => c.id === activeId) || null;

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    isDemo.current = s.token === "demo-token";
    setSession({ userId: s.userId, email: s.email });
    const kb = localStorage.getItem("kb_id") || "";
    setKbId(kb);

    const initId = crypto.randomUUID();
    const initConv: Conversation = isDemo.current
      ? { id: initId, title: "菲利普斯曲線範例", messages: DEMO_MESSAGES }
      : { id: initId, title: "新對話", messages: [] };
    setConversations([initConv]);
    setActiveId(initId);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function newConversation() {
    const id = crypto.randomUUID();
    setConversations(prev => [{ id, title: "新對話", messages: [] }, ...prev]);
    setActiveId(id);
  }

  function deleteConversation(id: string) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || null);
      return next;
    });
  }

  async function sendMessage() {
    if (!input.trim() || thinking || !activeId) return;
    const question = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, title: c.messages.length === 0 ? question.slice(0, 28) : c.title, messages: [...c.messages, { role: "user", content: question }] }
        : c
    ));

    setThinking(true);

    if (isDemo.current) {
      await new Promise(r => setTimeout(r, 600));
      const reply = "這是 Demo 模式，後端尚未連接。實際部署後 AI 將根據你上傳的文件回答，並標記 [來源 N] 引用段落。";
      setConversations(prev => prev.map(c =>
        c.id === activeId ? { ...c, messages: [...c.messages, { role: "assistant", content: reply }] } : c
      ));
      setThinking(false);
      return;
    }

    setConversations(prev => prev.map(c =>
      c.id === activeId ? { ...c, messages: [...c.messages, { role: "assistant", content: "" }] } : c
    ));

    let answer = "";
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

  function copyMsg(text: string) {
    navigator.clipboard.writeText(text);
  }

  function logout() { clearSession(); router.push("/"); }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: 256, background: "#0a1628", borderRight: "1px solid #1a2f50", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #1a2f50" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, boxShadow: "0 2px 8px rgba(124,58,237,0.4)" }}>E</div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>EconKB</span>
          </div>
        </div>

        {/* New chat button */}
        <div style={{ padding: "12px 12px 8px" }}>
          <button onClick={newConversation}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>+</span> 新對話
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {conversations.length === 0 && (
            <p style={{ color: "#374151", fontSize: 12, textAlign: "center", padding: "20px 8px" }}>尚無對話記錄</p>
          )}
          {conversations.map(c => (
            <div key={c.id} onClick={() => setActiveId(c.id)}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, background: activeId === c.id ? "rgba(124,58,237,0.18)" : "transparent", color: activeId === c.id ? "#c4b5fd" : "#64748b", transition: "background 0.15s" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1.4 }}>{c.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteConversation(c.id); }}
                style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 0 0 6px", flexShrink: 0, opacity: 0.6 }}>×</button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a2f50" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                {session?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span style={{ fontSize: 12, color: "#475569", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.email}</span>
            </div>
            <button onClick={logout} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>登出</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #1a2f50", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1117", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>模型</span>
            <span style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600, padding: "2px 8px", background: "rgba(124,58,237,0.1)", borderRadius: 6, border: "1px solid rgba(124,58,237,0.2)" }}>claude-sonnet-4-6</span>
            {isDemo.current && <span style={{ fontSize: 11, color: "#0fc6c2", padding: "2px 8px", background: "rgba(15,198,194,0.08)", borderRadius: 6, border: "1px solid rgba(15,198,194,0.2)", fontWeight: 600 }}>DEMO</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/graph")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(15,198,194,0.08)", color: "#2dd4bf", border: "1px solid rgba(15,198,194,0.2)", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
              知識圖譜
            </button>
            <button onClick={() => router.push("/admin")}
              style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(124,58,237,0.08)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
              管理後台
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {!activeConv || activeConv.messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 80 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed22,#2d7dd222)", border: "1px solid #1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📚</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>EconKB 知識庫助理</h2>
                <p style={{ color: "#475569", fontSize: 14, margin: 0, textAlign: "center", lineHeight: 1.6 }}>上傳文件後開始提問<br />AI 將根據你的知識庫內容回答並標註來源</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                  {["什麼是菲利普斯曲線？", "解釋量化寬鬆政策", "GDP 與 GNP 的差異"].map(q => (
                    <button key={q} onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                      style={{ padding: "8px 14px", borderRadius: 20, background: "transparent", color: "#64748b", border: "1px solid #1e3a5f", cursor: "pointer", fontSize: 13, transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "#7c3aed"; (e.target as HTMLElement).style.color = "#a78bfa"; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "#1e3a5f"; (e.target as HTMLElement).style.color = "#64748b"; }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeConv.messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                  {msg.role === "assistant" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>E</div>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>EconKB</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "84%", padding: "12px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    fontSize: 14, lineHeight: 1.75,
                    background: msg.role === "user" ? "linear-gradient(135deg,#7c3aed,#2d7dd2)" : "#111827",
                    color: "#e2e8f0",
                    border: msg.role === "assistant" ? "1px solid #1e3a5f" : "none",
                    boxShadow: msg.role === "user" ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content === "" && thinking && i === activeConv.messages.length - 1 ? (
                      <span style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
                        {[0, 1, 2].map(d => (
                          <span key={d} className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
                        ))}
                      </span>
                    ) : (
                      msg.role === "assistant" ? renderContent(msg.content) : msg.content
                    )}
                  </div>
                  {msg.role === "assistant" && msg.content && (
                    <button onClick={() => copyMsg(msg.content)}
                      style={{ fontSize: 11, color: "#374151", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", marginTop: 2 }}
                      title="複製">
                      複製
                    </button>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1a2f50", background: "#0d1117", flexShrink: 0 }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#111827", border: "1px solid #1e3a5f", borderRadius: 14, padding: "10px 14px", boxShadow: "0 0 0 1px transparent", transition: "border-color 0.2s" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "#7c3aed33")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "#1e3a5f")}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)"
                rows={1}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", resize: "none", fontSize: 14, lineHeight: 1.6, maxHeight: 160, overflow: "auto" }} />
              <button onClick={sendMessage} disabled={thinking || !input.trim()}
                style={{ padding: "8px 18px", borderRadius: 10, background: input.trim() && !thinking ? "linear-gradient(135deg,#7c3aed,#2d7dd2)" : "#1e3a5f", color: input.trim() && !thinking ? "white" : "#374151", border: "none", cursor: input.trim() && !thinking ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, flexShrink: 0, transition: "all 0.2s", boxShadow: input.trim() && !thinking ? "0 2px 8px rgba(124,58,237,0.3)" : "none" }}>
                送出
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#374151", textAlign: "center", marginTop: 8 }}>EconKB 僅根據知識庫內容回答，可能存在資訊缺漏。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
