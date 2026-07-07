"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Document } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", parsing: "#3b82f6", ocr: "#8b5cf6",
  embedding: "#06b6d4", ready: "#10b981", empty: "#94a3b8", error: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "等待", parsing: "解析中", ocr: "OCR", embedding: "向量化", ready: "完成", empty: "無內容", error: "錯誤",
};
const TYPE_COLORS: Record<string, string> = {
  pdf: "#7c3aed", docx: "#2d7dd2", txt: "#10b981",
  csv: "#f59e0b", xlsx: "#f97316", jpg: "#ec4899", png: "#ec4899",
};
const TYPE_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", txt: "📃", csv: "📊", xlsx: "📊", jpg: "🖼️", png: "🖼️",
};

const DEMO_DOCS: Document[] = [
  { id: "1", filename: "Macroeconomics_Ch5.pdf", file_type: "pdf", status: "ready", chunk_count: 42, created_at: new Date().toISOString() },
  { id: "2", filename: "Phillips_Curve_Notes.docx", file_type: "docx", status: "ready", chunk_count: 18, created_at: new Date().toISOString() },
  { id: "3", filename: "GDP_Data_2024.csv", file_type: "csv", status: "embedding", chunk_count: 0, created_at: new Date().toISOString() },
  { id: "4", filename: "Central_Bank_Report.pdf", file_type: "pdf", status: "parsing", chunk_count: 0, created_at: new Date().toISOString() },
];

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [kbId, setKbId] = useState("");
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualError, setManualError] = useState("");
  const [pendingDoc, setPendingDoc] = useState<Document | null>(null);  // 待確認刪除的文件
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [docDelError, setDocDelError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemo = useRef(false);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    isDemo.current = s.token === "demo-token";
    setSession({ userId: s.userId, email: s.email });
    const kb = localStorage.getItem("kb_id") || "";
    setKbId(kb);
    if (kb && !isDemo.current) loadDocs(kb);
    else if (isDemo.current) setDocs(DEMO_DOCS);
  }, []);

  async function loadDocs(kb: string) {
    try { setDocs(await api.documents.list(kb)); } catch {}
  }

  // 處理中的文件自動輪詢，直到全部到達終態（完成/無內容/錯誤）
  useEffect(() => {
    if (isDemo.current || !kbId) return;
    const hasProcessing = docs.some(d => !["ready", "empty", "error"].includes(d.status));
    if (!hasProcessing) return;
    const timer = setInterval(() => loadDocs(kbId), 3000);
    return () => clearInterval(timer);
  }, [docs, kbId]);

  async function uploadFiles(files: FileList | File[]) {
    if (!kbId || !session || isDemo.current) {
      if (isDemo.current) { setUploadProgress(["失敗：Demo 模式下無法真實上傳，後端連接後即可使用。"]); }
      return;
    }
    setUploading(true);
    setUploadProgress([]);
    for (const file of Array.from(files)) {
      setUploadProgress(prev => [...prev, `上傳中：${file.name}`]);
      try {
        await api.documents.upload(kbId, file);
        setUploadProgress(prev => prev.map(p => p === `上傳中：${file.name}` ? `完成：${file.name}` : p));
      } catch (e: any) {
        setUploadProgress(prev => prev.map(p => p === `上傳中：${file.name}` ? `失敗：${file.name} — ${e.message}` : p));
      }
    }
    await loadDocs(kbId);
    setUploading(false);
    setTimeout(() => setUploadProgress([]), 3000);
  }

  function requestDelete(doc: Document) {
    if (isDemo.current) { setDocs(prev => prev.filter(d => d.id !== doc.id)); return; }
    setDocDelError(""); setPendingDoc(doc);
  }

  async function confirmDeleteDoc() {
    if (!pendingDoc) return;
    setDeletingDoc(true); setDocDelError("");
    try {
      await api.documents.delete(pendingDoc.id);
      setDocs(prev => prev.filter(d => d.id !== pendingDoc.id));
      setPendingDoc(null);
    } catch (e: any) {
      setDocDelError(e.message || "刪除失敗");
    } finally {
      setDeletingDoc(false);
    }
  }

  async function submitManual() {
    if (!manualText.trim() || !kbId || !session) return;
    setManualError("");
    if (isDemo.current) { setManualError("Demo 模式下無法真實上傳，後端連接後即可使用。"); return; }
    const blob = new Blob([manualText], { type: "text/plain" });
    const file = new File([blob], `${manualTitle || "手動輸入"}.txt`, { type: "text/plain" });
    setUploading(true);
    try {
      await api.documents.upload(kbId, file);
      setManualText(""); setManualTitle("");
      await loadDocs(kbId);
    } catch (e: any) { setManualError(e.message || "上傳失敗"); }
    setUploading(false);
  }

  const readyDocs = docs.filter(d => d.status === "ready");
  const processingDocs = docs.filter(d => !["ready", "empty", "error"].includes(d.status));
  const errorDocs = docs.filter(d => d.status === "error");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Topbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.push("/chat")}
          className="btn-ghost">← 返回對話</button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <Logo size={26} showText={false} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>管理後台</span>
        {isDemo.current && <span style={{ fontSize: 11, color: "var(--info)", padding: "2px 8px", background: "transparent", borderRadius: 6, border: "1px solid var(--info)", fontWeight: 600 }}>DEMO</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", alignItems: "center" }}>
          <span>{docs.length} 份文件</span>
          <span style={{ color: "var(--success)" }}>{readyDocs.length} 完成</span>
          {processingDocs.length > 0 && <span style={{ color: "var(--info)" }}>{processingDocs.length} 處理中</span>}
          {errorDocs.length > 0 && <span style={{ color: "var(--danger)" }}>{errorDocs.length} 錯誤</span>}
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px" }}>

        {/* Upload card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: "var(--text)" }}>新增知識來源</h3>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--bg)", borderRadius: 10, padding: 4, width: "fit-content" }}>
            {(["upload", "manual"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "7px 18px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500, border: "none", background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--text)" : "var(--muted)", transition: "all 0.15s" }}>
                {t === "upload" ? "檔案上傳" : "手動輸入"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`, borderRadius: 12,
                  padding: "52px 24px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "var(--accent-soft)" : "var(--bg)", transition: "all 0.2s",
                }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
                <p style={{ color: "var(--text-2)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>拖曳檔案至此，或點擊選擇</p>
                <p style={{ color: "var(--faint)", fontSize: 12 }}>支援 PDF · DOCX · TXT · CSV · XLSX · JPG · PNG（最大 50MB）</p>
              </div>
              <input ref={fileInputRef} type="file" multiple hidden
                accept=".pdf,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png"
                onChange={e => { if (e.target.files) uploadFiles(e.target.files); }} />
              {uploadProgress.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {uploadProgress.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, color: p.startsWith("失敗") ? "var(--danger)" : p.startsWith("完成") ? "var(--success)" : "var(--info)", padding: "6px 12px", background: "var(--bg)", borderRadius: 6 }}>
                      {p.startsWith("上傳中") ? "⏳" : p.startsWith("完成") ? "✓" : "✗"} {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="文件標題（選填）" value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                className="auth-input" />
              <textarea placeholder="貼上或輸入文字內容…" value={manualText} onChange={e => setManualText(e.target.value)} rows={8}
                className="auth-input" style={{ resize: "vertical", lineHeight: 1.6 }} />
              {manualError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>{manualError}</div>
              )}
              <button onClick={submitManual} disabled={uploading || !manualText.trim()}
                className="btn-primary" style={{ alignSelf: "flex-start", padding: "10px 24px", fontSize: 14 }}>
                {uploading ? "處理中…" : "新增到知識庫"}
              </button>
            </div>
          )}
        </div>

        {/* Document list */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>知識庫文件</h3>
            <button onClick={() => kbId && !isDemo.current && loadDocs(kbId)}
              className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>
              重新整理
            </button>
          </div>

          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--faint)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <p style={{ fontSize: 14 }}>尚未上傳任何文件</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>上傳後即可在對話頁提問</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map(doc => (
                <div key={doc.id} className="doc-row"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}
                  >
                  {/* File type icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${TYPE_COLORS[doc.file_type] || "#64748b"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, border: `1px solid ${TYPE_COLORS[doc.file_type] || "#64748b"}33` }}>
                    {TYPE_ICONS[doc.file_type] || "📄"}
                  </div>
                  {/* File info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{doc.filename}</div>
                    <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                      <span style={{ color: TYPE_COLORS[doc.file_type] || "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{doc.file_type}</span>
                      {doc.chunk_count > 0 && <span> · {doc.chunk_count} 個段落</span>}
                    </div>
                  </div>
                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {doc.status !== "ready" && doc.status !== "error" && (
                      <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[doc.status] }} />
                    )}
                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[doc.status] || "#64748b"}18`, color: STATUS_COLORS[doc.status] || "#94a3b8", border: `1px solid ${STATUS_COLORS[doc.status] || "#64748b"}33` }}>
                      {STATUS_LABELS[doc.status] || doc.status}
                    </span>
                  </div>
                  {/* Delete */}
                  <button className="del-btn" onClick={() => requestDelete(doc)} style={{ flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDoc}
        danger
        title="刪除文件"
        message={pendingDoc ? `確定刪除「${pendingDoc.filename}」？相關向量段落將一併移除。` : ""}
        confirmText="刪除"
        loading={deletingDoc}
        error={docDelError}
        onConfirm={confirmDeleteDoc}
        onCancel={() => { if (!deletingDoc) { setPendingDoc(null); setDocDelError(""); } }}
      />
    </div>
  );
}
