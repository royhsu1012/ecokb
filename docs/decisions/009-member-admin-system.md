---
status: 採用
date: 2026-07
---

# ADR-009 會員與管理系統

## 背景

原 `is_admin` 僅在註冊時由 `admin_key` 算出後回傳，未持久化、未 gate 任何功能（無作用旗標）。
需要一個管理系統，讓管理員能檢視與刪除會員及其資料。

## 決策

### 管理員身份（選項 B：保留 admin_key）

- 註冊時 `admin_key` 與 `ADMIN_SECRET_KEY` 常數時間比對相符 → 將 `is_admin: true` 寫入
  Supabase **app_metadata**（伺服器控制、使用者無法竄改；有別於可被使用者改的 user_metadata）
- 登入回傳 `is_admin`；`get_current_user` 由 token 的 app_metadata 讀取
- `require_admin` 依賴：非管理員存取 `/admin/*` 一律 403

> 註：目前 `admin_key` 仍寫在公開 README（互動展示用）。正式上線前應改為 email 白名單或更換金鑰。

### 管理端點（`routers/admin.py`）

| 端點 | 說明 |
|------|------|
| `GET /admin/members` | 列出所有會員（`auth.admin.list_users`）|
| `DELETE /admin/members/{id}` | 刪除會員及其資料（防自刪）|

刪除流程：先清 Supabase Storage 原始檔（**不在 DB cascade 內**），再 `auth.admin.delete_user`
——DB 靠 `on delete cascade`（`references auth.users on delete cascade`）連動清除
knowledge_bases → documents → chunks、conversations → messages。

### 前端

- `/members` 會員管理頁，沿用管理後台的 topbar/卡片/`del-btn`/confirm 設計系統
- 入口僅管理員可見（chat topbar 條件顯示）；非管理員進入即導回 `/chat`
- `is_admin` 存入 session（`auth.ts`），登入時由 API 帶回

## 後果

**優點**
- `is_admin` 成為真實權限，管理端點有 `require_admin` 守衛
- 刪除會員完整清理（DB cascade + Storage）
- 前端權限 UI 與現有設計系統一致

**安全**
- 前端隱藏入口僅為 UX，真正的守衛在後端 `require_admin`（前端可繞過、後端不可）
- app_metadata 由伺服器控制，使用者無法自行提權

**限制 / 待辦**
- admin_key 仍公開（展示用）；正式化應改 email 白名單
- 目前為硬刪；如需可加軟刪 / 稽核記錄
