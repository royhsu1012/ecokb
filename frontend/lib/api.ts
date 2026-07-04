import type { Document, Message, GraphNode, GraphLink, Source } from "./types";
import { clearSession } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface KnowledgeBase { id: string; name: string; user_id: string; created_at: string; }

function handleUnauthorized(): never {
  clearSession();
  window.location.href = "/";
  throw new Error("Session expired");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user_id: string; email: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, admin_key?: string) =>
      request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, admin_key: admin_key || "" }),
      }),
  },
  kb: {
    list: (user_id: string) => request<KnowledgeBase[]>(`/chat/kb/${user_id}`),
    create: (name: string) =>
      request("/chat/kb", { method: "POST", body: JSON.stringify({ name }) }),
  },
  documents: {
    list: (kb_id: string) => request<Document[]>(`/documents/kb/${kb_id}`),
    delete: (doc_id: string) => request(`/documents/${doc_id}`, { method: "DELETE" }),
    status: (doc_id: string) => request<{ status: string; chunk_count: number }>(`/documents/${doc_id}/status`),
    upload: async (kb_id: string, file: File) => {
      const token = localStorage.getItem("access_token");
      const form = new FormData();
      form.append("kb_id", kb_id);
      form.append("file", file);
      const res = await fetch(`${BASE}/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json();
    },
  },
  conversations: {
    list: (kb_id: string) =>
      request<{ id: string; title: string; created_at: string }[]>(`/chat/conversations?kb_id=${encodeURIComponent(kb_id)}`),
    create: (kb_id: string, title?: string) =>
      request<{ id: string; title: string }>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ kb_id, title: title || "新對話" }),
      }),
    messages: (id: string) => request<Message[]>(`/chat/conversations/${id}/messages`),
    rename: (id: string, title: string) =>
      request(`/chat/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
    delete: (id: string) => request(`/chat/conversations/${id}`, { method: "DELETE" }),
  },
  chat: {
    ask: async (
      kb_id: string,
      question: string,
      onChunk: (text: string) => void,
      conversation_id?: string,
      onSources?: (sources: Source[]) => void,
    ) => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE}/chat/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kb_id, question, stream: true, conversation_id: conversation_id || null }),
      });
      if (res.status === 401) handleUnauthorized();
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Request failed");
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              if (typeof parsed.text === "string") onChunk(parsed.text);
              else if (parsed.sources) onSources?.(parsed.sources);
            } catch {}
          }
        }
      }
    },
  },
  graph: {
    get: (kb_id: string) => request<{ nodes: GraphNode[]; links: GraphLink[] }>(`/graph/${kb_id}`),
  },
};
