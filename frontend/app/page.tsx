"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function enterDemo() {
    saveSession("demo-token", "demo-user-id", "demo@ecokb.app");
    localStorage.setItem("kb_id", "demo-kb-id");
    router.push("/chat");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await api.auth.register(email, password, adminKey);
        setIsRegister(false);
        return;
      }
      const res = await api.auth.login(email, password);
      saveSession(res.access_token, res.user_id, res.email);
      const kbs = await api.kb.list(res.user_id);
      if (kbs.length > 0) localStorage.setItem("kb_id", kbs[0].id);
      router.push("/chat");
    } catch (e: any) {
      setError(e.message || "發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", position: "relative", overflow: "hidden" }}>
      {/* Glow */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "0 1rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16, boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>E</div>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.5px" }}>EconKB</span>
          </div>
          <p style={{ color: "#64748b", fontSize: 13 }}>經濟學知識庫 · RAG 問答平台</p>
        </div>

        {/* Card */}
        <div style={{ background: "#0d1f3c", border: "1px solid #1e3a5f", borderRadius: 16, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>
            {isRegister ? "建立帳號" : "歡迎回來"}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>電子郵件</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none", fontSize: 14, transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                placeholder="you@example.com" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>密碼</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none", fontSize: 14 }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                placeholder="••••••••" />
            </div>
            {isRegister && (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>管理員金鑰 <span style={{ fontWeight: 400, textTransform: "none" }}>(選填)</span></label>
                <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none", fontSize: 14 }}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e => e.target.style.borderColor = "#1e3a5f"}
                  placeholder="管理員專用金鑰" />
              </div>
            )}
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ padding: "11px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", color: "white", fontWeight: 600, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontSize: 14, marginTop: 4, boxShadow: "0 4px 14px rgba(124,58,237,0.3)", transition: "opacity 0.2s" }}>
              {loading ? "處理中…" : isRegister ? "建立帳號" : "登入"}
            </button>
          </form>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e3a5f" }}>
            <button onClick={enterDemo}
              style={{ width: "100%", padding: "10px", borderRadius: 8, background: "rgba(15,198,194,0.08)", color: "#0fc6c2", border: "1px solid rgba(15,198,194,0.25)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Demo 模式（無需帳號）
            </button>
          </div>

          <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#64748b" }}>
            {isRegister ? "已有帳號？" : "還沒有帳號？"}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{ marginLeft: 4, color: "#a78bfa", background: "none", border: "none", cursor: "pointer" }}>
              {isRegister ? "登入" : "免費註冊"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
