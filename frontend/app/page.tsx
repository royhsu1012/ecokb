"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* 右上角主題切換 */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 20 }}>
        <ThemeToggle />
      </div>

      {/* 柔光背景 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, padding: "0 1rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Logo size={36} fontSize={26} />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>經濟學知識庫 · RAG 問答平台</p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, boxShadow: "var(--shadow)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 24 }}>
            {isRegister ? "建立帳號" : "歡迎回來"}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>電子郵件</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="auth-input"
                placeholder="you@example.com" />
            </div>
            <div>
              <label style={labelStyle}>密碼</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••" />
            </div>
            {isRegister && (
              <div>
                <label style={labelStyle}>管理員金鑰 <span style={{ fontWeight: 400, textTransform: "none" }}>(選填)</span></label>
                <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                  className="auth-input"
                  placeholder="管理員專用金鑰" />
              </div>
            )}
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ padding: "11px", fontSize: 14, marginTop: 4 }}>
              {loading ? "處理中…" : isRegister ? "建立帳號" : "登入"}
            </button>
          </form>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button onClick={enterDemo}
              style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-border)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Demo 模式（無需帳號）
            </button>
          </div>

          <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            {isRegister ? "已有帳號？" : "還沒有帳號？"}
            <button onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{ marginLeft: 4, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
              {isRegister ? "登入" : "免費註冊"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
