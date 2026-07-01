# EconKB — Claude 工作指南

## 專案概述
RAG 知識庫問答平台（類 NotebookLM），分為前後端兩部分。

- **前端**：Next.js 14 App Router，靜態匯出（`output: 'export'`），部署在 Vercel（ecokb.vercel.app）
- **後端**：FastAPI + Supabase pgvector，待部署至 Railway
- **AI**：Anthropic Claude（SSE 串流）、OpenEmbeddings 向量化

## 目錄結構
```
ecokb/
├── frontend/
│   ├── app/           # Next.js 頁面
│   │   ├── page.tsx       # 登入頁
│   │   ├── chat/page.tsx  # 對話介面
│   │   ├── admin/page.tsx # 管理後台（文件上傳）
│   │   └── graph/page.tsx # 知識圖譜（D3.js force graph）
│   ├── components/
│   │   └── Logo.tsx   # 共用 Logo 元件
│   └── lib/
│       ├── api.ts     # API 呼叫層
│       ├── auth.ts    # 工作階段管理（含 isDemo()）
│       └── types.ts   # 共用型別（Document, Message, Conversation）
├── backend/
│   ├── main.py
│   ├── dependencies.py    # get_current_user JWT 驗證
│   ├── routers/
│   │   ├── auth.py
│   │   ├── chat.py        # SSE 串流回答
│   │   ├── documents.py   # 文件上傳、向量化
│   │   └── graph.py
│   └── services/
└── supabase/schema.sql
```

## 設計系統

### 色彩（CSS 變數定義於 globals.css）
| 變數 | 值 | 用途 |
|------|----|------|
| `--bg` | `#0d1117` | 頁面底色 |
| `--sidebar` | `#0d1f3c` | 側邊欄 / topbar |
| `--card` | `#111827` | 訊息泡泡底色 |
| `--primary` | `#7c3aed` | 主色（紫）|
| `--secondary` | `#2d7dd2` | 次色（藍）|
| `--accent` | `#0fc6c2` | 強調色（青）|
| `--border` | `#1e3a5f` | 邊框 |
| `--text` | `#e2e8f0` | 主文字 |
| `--muted` | `#94a3b8` | 次要文字 |

### 共用 CSS 類別（globals.css）
- `.btn-ghost` — 灰色邊框按鈕，hover 變紫
- `.del-btn` — 刪除按鈕，hover 變紅
- `.suggestion-chip` — 空狀態建議晶片
- `.pulse` — 1.5s 透明度閃爍動畫

## 編碼規範

### Demo 模式
- 統一使用 `isDemo()` 函式（來自 `lib/auth.ts`），**不要** 在模組層級用 `localStorage.getItem()` 判斷
- 在元件內用 `isDemo.current = s.token === "demo-token"` ref 模式

### Hover 狀態
- **不要** 用 `onMouseEnter/Leave` 直接操作 `e.target.style`
- 改用 `globals.css` 裡的 CSS 類別

### 型別
- 文件陣列：`Document[]`（來自 `lib/types.ts`），不要用 `any[]`
- 訊息：`Message`、對話：`Conversation`

### Logo 元件
- 使用 `<Logo size={N} showText={boolean} fontSize={N} />`（來自 `components/Logo.tsx`）
- Topbar 中只顯示圖示：`<Logo showText={false} />`
- 側邊欄顯示完整：`<Logo />`

### 動畫
- Pulse 動畫使用 `.pulse` CSS 類別，**不要** 在元件內嵌 `<style>` 標籤

## 驗證指令
每次修改前端後執行：
```bash
cd frontend && npx tsc --noEmit
```

完整 build 驗證：
```bash
cd frontend && npm run build
```

## 後端認證架構
- 所有受保護路由注入 `current_user: dict = Depends(get_current_user)`
- `get_current_user` 在 `backend/dependencies.py`，透過 Supabase `auth.get_user(token)` 驗證 Bearer JWT
- `user_id` 一律從 JWT 取得，**不接受** 從 form/body 傳入

## 關鍵注意事項
- SSE 串流：`async with generate_answer(...)` — **不要** 加 `await`
- Supabase client 是 singleton，可安全傳給 BackgroundTasks
- HNSW index（非 IVFFlat），不需要最低資料量
