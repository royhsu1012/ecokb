"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

// App Router 全域錯誤邊界：任何頁面 render 例外落到此，避免整頁白畫面
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text)", padding: "0 1rem" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "inline-flex", marginBottom: 16 }}><Logo size={32} showText={false} /></div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>發生非預期錯誤</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          頁面遇到問題。你可以重試，或返回登入頁。
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => reset()} className="btn-primary" style={{ padding: "10px 22px", fontSize: 14 }}>重試</button>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ padding: "10px 22px", fontSize: 14 }}>返回登入</button>
        </div>
      </div>
    </div>
  );
}
