"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, clearSession } from "@/lib/auth";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import type { Message, Conversation } from "@/lib/types";

const DEMO_MESSAGES: Message[] = [
  { role: "user", content: "什麼是菲利普斯曲線？" },
  { role: "assistant", content: "菲利普斯曲線（Phillips Curve）描述**通貨膨脹率**與**失業率**之間的反向關係。[來源 1]\n\n根據知識庫內容，其核心概念如下：\n\n1. **短期關係**：當失業率下降時，通膨率傾向上升；反之亦然。[來源 1]\n2. **長期爭議**：Friedman 與 Phelps 提出自然失業率假說，認為長期菲利普斯曲線為垂直線。[來源 2]\n3. **近期發展**：2008 年金融危機後，菲利普斯曲線出現「平坦化」現象，各國央行難以用通膨目標錨定預期。[來源 3]" },
];

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

    if (isDemo.current) {
      const initId = crypto.randomUUID();
      setConversations([{ id: initId, title: "菲利普斯曲線範例", messages: DEMO_MESSAGES, loaded: true }]);
      setActiveId(initId);
      return;
    }

    // Server 模式：載入對話清單，訊息在切換時懶載入
    if (kb) {
      api.conversations.list(kb).then(list => {
        const convs: Conversation[] = list.map(c => ({ id: c.id, title: c.title, messages: [], loaded: false }));
        setConversations(convs);
        if (convs[0]) selectConversation(convs[0].id, convs);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  async function selectConversation(id: string, source?: Conversation[]) {
    setActiveId(id);
    const conv = (source || conversations).find(c => c.id === id);
    if (!conv || conv.loaded || isDemo.current) return;
    try {
      const msgs = await api.conversations.messages(id);
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, messages: msgs.map(m => ({ role: m.role, content: m.content })), loaded: true } : c
      ));
    } catch {}
  }

  async function newConversation() {
    if (isDemo.current) {
      const id = crypto.randomUUID();
      setConversations(prev => [{ id, title: "新對話", messages: [], loaded: true }, ...prev]);
      setActiveId(id);
      return;
    }
    try {
      const created = await api.conversations.create(kbId);
      setConversations(prev => [{ id: created.id, title: created.title, messages: [], loaded: true }, ...prev]);
      setActiveId(created.id);
    } catch {}
  }

  async function deleteConversation(id: string) {
    if (!isDemo.current) {
      api.conversations.delete(id).catch(() => {});
    }
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || null);
      return next;
    });
  }

  function appendToLastMessage(convId: string, content: string) {
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, content } : m) }
        : c
    ));
  }

  async function sendMessage() {
    if (!input.trim() || thinking) return;
    const question = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // 沒有 active 對話時先建立（server 模式）
    let convId = activeId;
    if (!convId) {
      if (isDemo.current) {
        convId = crypto.randomUUID();
        setConversations(prev => [{ id: convId!, title: "新對話", messages: [], loaded: true }, ...prev]);
      } else {
        try {
          const created = await api.conversations.create(kbId);
          convId = created.id;
          setConversations(prev => [{ id: created.id, title: created.title, messages: [], loaded: true }, ...prev]);
        } catch { return; }
      }
      setActiveId(convId);
    }

    const isFirstMessage = (conversations.find(c => c.id === convId)?.messages.length ?? 0) === 0;
    const title = question.slice(0, 28);

    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, title: isFirstMessage ? title : c.title, messages: [...c.messages, { role: "user", content: question }] }
        : c
    ));

    if (isFirstMessage && !isDemo.current) {
      api.conversations.rename(convId, title).catch(() => {});
    }

    setThinking(true);

    if (isDemo.current) {
      await new Promise(r => setTimeout(r, 600));
      const reply = "這是 Demo 模式，後端尚未連接。實際部署後 AI 將根據你上傳的文件回答，並標記 [來源 N] 引用段落。";
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, { role: "assistant", content: reply }] } : c
      ));
      setThinking(false);
      return;
    }

    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, messages: [...c.messages, { role: "assistant", content: "" }] } : c
    ));

    let answer = "";
    try {
      await api.chat.ask(kbId, question, (chunk) => {
        answer += chunk;
        appendToLastMessage(convId!, answer);
      }, convId);
    } catch {
      appendToLastMessage(convId!, "發生錯誤，請重試。");
    } finally {
      setThinking(false);
    }
  }

  function logout() { clearSession(); router.push("/"); }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        email={session?.email || ""}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        onLogout={logout}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>模型</span>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, padding: "2px 8px", background: "var(--accent-soft)", borderRadius: 6, border: "1px solid var(--accent-border)" }}>gemini-2.0-flash</span>
            {isDemo.current && <span style={{ fontSize: 11, color: "var(--info)", padding: "2px 8px", background: "transparent", borderRadius: 6, border: "1px solid var(--info)", fontWeight: 600 }}>DEMO</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => router.push("/graph")} className="btn-ghost" style={{ fontSize: 12 }}>
              知識圖譜
            </button>
            <button onClick={() => router.push("/admin")} className="btn-ghost" style={{ fontSize: 12 }}>
              管理後台
            </button>
            <ThemeToggle />
          </div>
        </div>

        <MessageList
          conversation={activeConv}
          thinking={thinking}
          onSuggestion={q => { setInput(q); textareaRef.current?.focus(); }}
          endRef={messagesEndRef}
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          thinking={thinking}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
}
