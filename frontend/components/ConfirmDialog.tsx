"use client";
import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// 設計系統一致的確認對話框，取代瀏覽器原生 confirm()/alert()
export function ConfirmDialog({ open, title, message, confirmText = "確定", cancelText = "取消", danger, loading, error, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div onClick={() => !loading && onCancel()}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1rem" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "100%", maxWidth: 400, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, boxShadow: "var(--shadow)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: message ? 8 : 18 }}>{title}</h3>
        {message && <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 18 }}>{message}</p>}
        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 12, marginBottom: 16 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} className="btn-ghost" style={{ fontSize: 13, padding: "8px 18px" }}>{cancelText}</button>
          <button onClick={onConfirm} disabled={loading}
            className={danger ? undefined : "btn-primary"}
            style={danger
              ? { fontSize: 13, padding: "8px 18px", borderRadius: 8, background: "var(--danger)", color: "#fff", border: "1px solid var(--danger)", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, fontWeight: 600 }
              : { fontSize: 13, padding: "8px 18px" }}>
            {loading ? "處理中…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
