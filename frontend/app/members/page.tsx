"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Member } from "@/lib/types";

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selfId = useRef("");

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/"); return; }
    if (!s.isAdmin) { router.push("/chat"); return; }  // 非管理員擋在門外
    selfId.current = s.userId;
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      setMembers(await api.admin.members());
    } catch (e: any) {
      setError(e.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMember(m: Member) {
    if (!confirm(`確定刪除會員「${m.email}」及其所有資料？此操作無法復原。`)) return;
    try {
      await api.admin.deleteMember(m.id);
      setMembers(prev => prev.filter(x => x.id !== m.id));
    } catch (e: any) {
      alert(e.message || "刪除失敗");
    }
  }

  const adminCount = members.filter(m => m.is_admin).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Topbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.push("/chat")} className="btn-ghost">← 返回對話</button>
        <div style={{ width: 1, height: 20, background: "var(--border)" }} />
        <Logo size={26} showText={false} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>會員管理</span>
        <span style={{ fontSize: 11, color: "var(--accent)", padding: "2px 8px", background: "var(--accent-soft)", borderRadius: 6, border: "1px solid var(--accent-border)", fontWeight: 600 }}>ADMIN</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", alignItems: "center" }}>
          <span>{members.length} 位會員</span>
          {adminCount > 0 && <span style={{ color: "var(--accent)" }}>{adminCount} 位管理員</span>}
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>所有會員</h3>
            <button onClick={loadMembers} className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>重新整理</button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>載入中…</div>
          ) : error ? (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--danger-soft)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 13 }}>{error}</div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--faint)" }}>尚無會員</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map(m => {
                const isSelf = m.id === selfId.current;
                return (
                  <div key={m.id} className="doc-row"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--on-accent)", flexShrink: 0 }}>
                      {m.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.email}
                        {isSelf && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>（你）</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    {m.is_admin && (
                      <span style={{ fontSize: 11, color: "var(--accent)", padding: "3px 10px", borderRadius: 6, fontWeight: 600, background: "var(--accent-soft)", border: "1px solid var(--accent-border)", flexShrink: 0 }}>管理員</span>
                    )}
                    {!isSelf && (
                      <button className="del-btn" onClick={() => deleteMember(m)} style={{ flexShrink: 0 }} title="刪除會員">×</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
