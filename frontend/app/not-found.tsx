"use client";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

// 404 頁：找不到路由時的落地頁（沿用設計系統）
export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)", padding: "0 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "inline-flex", marginBottom: 16 }}><Logo size={32} showText={false} /></div>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>404</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>找不到這個頁面。</p>
        <button onClick={() => router.push("/")} className="btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>返回登入</button>
      </div>
    </div>
  );
}
