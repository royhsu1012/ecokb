# EconKB — 前端

Next.js 14 App Router，靜態匯出，部署至 Vercel。

## 開發

```bash
npm install
npm run dev       # http://localhost:3000
```

## 驗證

```bash
npx tsc --noEmit  # 型別檢查
npm run build     # 完整 build
```

## 環境變數

```
NEXT_PUBLIC_API_URL=http://localhost:8000   # 後端 API URL
```

## 頁面

| 路徑 | 功能 |
|------|------|
| `/` | 登入 / 註冊（含 Demo 模式）|
| `/chat` | 問答對話介面 |
| `/admin` | 文件上傳與管理 |
| `/graph` | 知識圖譜（D3.js force graph）|

## 設計系統

CSS 變數定義於 `app/globals.css`，共用元件：

- `components/Logo.tsx` — Logo 元件
- `lib/api.ts` — API 呼叫層
- `lib/auth.ts` — Session 管理（`isDemo()`、`saveSession()`）
- `lib/types.ts` — 共用型別（`Document`、`Message`、`Conversation`）

詳細規範見專案根目錄的 [CLAUDE.md](../CLAUDE.md)。
