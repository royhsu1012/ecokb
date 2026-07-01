"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", parsing: "#3b82f6", ocr: "#8b5cf6",
  embedding: "#06b6d4", ready: "#10b981", error: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "等待中", parsing: "解析中", ocr: "OCR", embedding: "向量化", ready: "完成", error: "錯誤",
};
const TYPE_COLORS: Record<string, string> = {
  pdf: "#7c3aed", docx: "#2d7dd2", txt: "#10b981",
  csv: "#f59e0b", xlsx: "#f97316", jpg: "#ec4899", png: "#ec4899",
};

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [kbId, setKbId] = useState("");
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState("claude-sonnet-4-6");

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    setSession({ userId: s.userId, email: s.email });
    const kb = localStorage.getItem("kb_id") || "";
    setKbId(kb);
    if (kb) loadDocs(kb);
  }, []);

  async function loadDocs(kb: string) {
    try {
      const data = await api.documents.list(kb);
      setDocs(data);
    } catch {}
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!kbId || !session) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await api.documents.upload(kbId, session.userId, file);
      } catch (e: any) {
        alert(`上傳失敗：${file.name} — ${e.message}`);
      }
    }
    await loadDocs(kbId);
    setUploading(false);
  }

  async function deleteDoc(id: string) {
    if (!confirm("確定刪除？")) return;
    await api.documents.delete(id);
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  async function submitManual() {
    if (!manualText.trim() || !kbId || !session) return;
    const blob = new Blob([manualText], { type: "text/plain" });
    const file = new File([blob], `${manualTitle || "手動輸入"}.txt`, { type: "text/plain" });
    setUploading(true);
    try {
      await api.documents.upload(kbId, session.userId, file);
      setManualText(""); setManualTitle("");
      await loadDocs(kbId);
    } catch (e: any) { alert(e.message); }
    setUploading(false);
  }

  const S = {
    page: { minHeight: "100vh", background: "#0d1117", color: "#e2e8f0" },
    topbar: { padding: "14px 24px", borderBottom: "1px solid #1e3a5f", display: "flex", alignItems: "center", gap: 16, background: "#0d1f3c" },
    content: { maxWidth: 900, margin: "0 auto", padding: "32px 24px" },
    card: { background: "#111827", border: "1px solid #1e3a5f", borderRadius: 12, padding: 24, marginBottom: 24 },
    tab: (active: boolean) => ({
      padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, border: "none",
      background: active ? "#7c3aed" : "transparent",
      color: active ? "white" : "#94a3b8",
    }),
    input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", width: "100%", outline: "none", fontSize: 14 },
  };

  return (
    <div style={S.page}>
      {/* Topbar */}
      <div style={S.topbar}>
        <button onClick={() => router.push("/chat")} style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>←</button>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12 }}>E</div>
        <span style={{ fontWeight: 700 }}>EconKB 管理後台</span>
      </div>

      <div style={S.content}>
        {/* Model setting */}
        <div style={S.card}>
          <h3 style={{ marginBottom: 16, fontWeight: 600 }}>RAG 模型設定</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ color: "#94a3b8", fontSize: 14 }}>問答模型</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{ ...S.input, width: "auto", minWidth: 220 }}>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (快速)</option>
              <option value="claude-opus-4-8">claude-opus-4-8 (最強)</option>
            </select>
          </div>
        </div>

        {/* Upload */}
        <div style={S.card}>
          <h3 style={{ marginBottom: 16, fontWeight: 600 }}>新增資料</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button style={S.tab(tab === "upload")} onClick={() => setTab("upload")}>批量上傳</button>
            <button style={S.tab(tab === "manual")} onClick={() => setTab("manual")}>手動輸入</button>
          </div>

          {tab === "upload" ? (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#7c3aed" : "#1e3a5f"}`, borderRadius: 12,
                  padding: "48px 24px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "rgba(124,58,237,0.05)" : "transparent", transition: "all 0.2s",
                }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>拖曳檔案至此，或點擊選擇</p>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>支援 PDF · DOCX · TXT · CSV · XLSX · JPG · PNG</p>
              </div>
              <input ref={fileInputRef} type="file" multiple hidden
                accept=".pdf,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png"
                onChange={e => { if (e.target.files) uploadFiles(e.target.files); }} />
              {uploading && <p style={{ color: "#0fc6c2", fontSize: 14, marginTop: 12 }}>上傳中…</p>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="標題（選填）" value={manualTitle} onChange={e => setManualTitle(e.target.value)} style={S.input} />
              <textarea placeholder="貼上或輸入文字內容…" value={manualText} onChange={e => setManualText(e.target.value)} rows={8}
                style={{ ...S.input, resize: "vertical" }} />
              <button onClick={submitManual} disabled={uploading || !manualText.trim()}
                style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 8, background: "#7c3aed", color: "white", border: "none", cursor: "pointer", opacity: uploading || !manualText.trim() ? 0.5 : 1 }}>
                {uploading ? "處理中…" : "新增"}
              </button>
            </div>
          )}
        </div>

        {/* Document list */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600 }}>已上傳資料（{docs.length}）</h3>
            <button onClick={() => kbId && loadDocs(kbId)} style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>重新整理</button>
          </div>
          {docs.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", padding: "32px 0" }}>尚未上傳任何文件</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0d1117", borderRadius: 8, border: "1px solid #1e3a5f" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${TYPE_COLORS[doc.file_type] || "#64748b"}22`, color: TYPE_COLORS[doc.file_type] || "#94a3b8" }}>
                    {(doc.file_type || "txt").toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.filename}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{doc.chunk_count} 段</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: `${STATUS_COLORS[doc.status] || "#64748b"}22`, color: STATUS_COLORS[doc.status] || "#94a3b8" }}>
                    {STATUS_LABELS[doc.status] || doc.status}
                  </span>
                  <button onClick={() => deleteDoc(doc.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
