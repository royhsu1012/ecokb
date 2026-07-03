# 📚 EconKB — 前端

Next.js 14 App Router，靜態匯出（`output: 'export'`），部署至 Vercel。

完整專案說明見根目錄 [README.md](../README.md)；設計系統與編碼規範見 [CLAUDE.md](../CLAUDE.md)。

## 開發

```bash
npm install
npm run dev       # http://localhost:3000
npx tsc --noEmit  # 型別檢查
npm run build     # 完整 build 驗證
```

## 環境變數

```
NEXT_PUBLIC_API_URL=http://localhost:8000   # 後端 API URL（build-time 烘入）
```

> `NEXT_PUBLIC_*` 於建置時烘入靜態檔，改值需重新部署。

## 頁面

| 路徑 | 功能 |
|------|------|
| `/` | 登入 / 註冊（含 Demo 模式）|
| `/chat` | 問答對話介面（SSE 串流、對話持久化）|
| `/admin` | 文件上傳與管理 |
| `/graph` | 知識圖譜（D3.js force graph）|

## 目錄結構

```
frontend/
├── app/
│   ├── layout.tsx          # 內嵌主題 init script（防 FOUC）
│   ├── globals.css         # 日夜雙主題語意變數 + 共用 CSS 類別
│   ├── page.tsx            # 登入頁
│   ├── chat/page.tsx       # 對話頁（狀態管理）
│   ├── admin/page.tsx      # 管理後台
│   └── graph/page.tsx      # 知識圖譜
├── components/
│   ├── Logo.tsx            # 共用 Logo
│   ├── ThemeToggle.tsx     # 日夜切換
│   └── chat/               # ChatSidebar / MessageList / ChatInput
└── lib/
    ├── api.ts              # API 呼叫層（含 handleUnauthorized）
    ├── auth.ts             # Session 管理（isDemo / clearSession）
    └── types.ts            # 共用型別（Document / Message / Conversation）
```

## 設計系統（日夜雙主題）

- 語意色彩變數定義於 `app/globals.css`，夜間為預設、日間由 `html[data-theme="light"]` 覆蓋
- **元件內一律用 `var(--*)` 語意變數，禁止 hardcode 色碼**
- 切換元件 `ThemeToggle.tsx` 寫入 `localStorage.theme`；`layout.tsx` 內嵌 script 在 hydration 前套用主題防閃爍

詳細規範見 [CLAUDE.md](../CLAUDE.md)。
