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
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 384, height: 384, borderRadius: "50%", background: "rgba(124,58,237,0.08)", boxShadow: "0 0 60px 20px rgba(124,58,237,0.15)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "0 1rem" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>E</div>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>EconKB</span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>經濟學知識庫平台</p>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1e3a5f", borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", marginBottom: 24 }}>
            {isRegister ? "建立帳號" : "歡迎回來"}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>電子郵件</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none" }}
                placeholder="you@example.com" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>密碼</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none" }}
                placeholder="••••••••" />
            </div>
            {isRegister && (
              <div>
                <label style={{ display: "block", fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>管理員金鑰 <span style={{ fontSize: 12 }}>(選填)</span></label>
                <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                  style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "1px solid #1e3a5f", background: "#0d1117", color: "#e2e8f0", outline: "none" }}
                  placeholder="管理員專用金鑰" />
              </div>
            )}
            {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#2d7dd2)", color: "white", fontWeight: 500, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "處理中…" : isRegister ? "註冊" : "登入"}
            </button>
          </form>
          <p style={{ marginTop: 16, textAlign: "center", fontSize: 14, color: "#94a3b8" }}>
            {isRegister ? "已有帳號？" : "還沒有帳號？"}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{ marginLeft: 4, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {isRegister ? "登入" : "註冊"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
