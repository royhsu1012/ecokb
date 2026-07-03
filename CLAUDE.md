# EconKB — Claude 工作指南

## 專案概述
RAG 知識庫問答平台（類 NotebookLM），分為前後端兩部分。

- **前端**：Next.js 14 App Router，靜態匯出（`output: 'export'`），部署在 Vercel（ecokb.vercel.app）
- **後端**：FastAPI + Supabase pgvector，部署至 Render（免費方案）
- **AI**：Google Gemini 2.0 Flash（LLM）、Google text-embedding-004（向量，768 維）
- **儲存**：Supabase Storage（文件檔案）+ Supabase DB（向量、元資料）

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
│   ├── config.py          # 環境變數（GOOGLE_API_KEY, SUPABASE_*）
│   ├── schemas.py         # 所有 Pydantic 請求模型（router 不自帶 schema）
│   ├── dependencies.py    # get_current_user JWT 驗證、require_kb_ownership
│   ├── routers/
│   │   ├── auth.py
│   │   ├── chat.py        # SSE 串流回答（Gemini）
│   │   ├── documents.py   # 文件上傳、向量化
│   │   └── graph.py
│   └── services/
│       ├── gemini.py      # Gemini 統一設定層（模型常數、configure、get_model）
│       ├── llm.py         # 串流問答（asyncio queue 橋接）
│       ├── embedding.py   # text-embedding-004（768 維，Semaphore(8) 限流）
│       ├── ocr.py         # Gemini Vision OCR
│       └── storage.py     # Supabase Storage bucket "documents"
├── supabase/schema.sql    # vector(768)，HNSW index
└── docs/decisions/        # ADR 架構決策文件
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
- `.auth-input` — 登入頁輸入框，`:focus` 變紫色邊框

## 編碼規範

### Demo 模式
- 統一使用 `isDemo()` 函式（來自 `lib/auth.ts`），**不要** 在模組層級用 `localStorage.getItem()` 判斷
- 在元件內用 `isDemo.current = s.token === "demo-token"` ref 模式

### Hover / Focus 狀態
- **不要** 用 `onMouseEnter/Leave` 或 `onFocus/onBlur` 直接操作 `e.target.style`
- 改用 `globals.css` 裡的 CSS 類別（`.btn-ghost`、`.auth-input` 等）

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
- KB 擁有權檢查一律用 `await require_kb_ownership(sb, kb_id, user_id)`（`dependencies.py`），**不要** 在 router 內重寫查詢

## 後端分層規範
- Pydantic 請求模型放 `backend/schemas.py`，**不要** 定義在 router 檔案內
- Gemini 相關設定（API key configure、模型名稱）只在 `services/gemini.py`，其他服務透過 `get_model()` / `ensure_configured()` 取用
- 前端 401 處理統一走 `api.ts` 的 `handleUnauthorized()`（內部呼叫 `clearSession()`）

## 後端 LLM 串流架構
- `services/llm.py` 使用 `asyncio.Queue` 橋接同步 Gemini SDK 與 FastAPI 非同步
- `chat.py` 使用 `async for text in stream_answer(...)` 驅動 SSE
- **不要** 用 `async with` 包 `stream_answer`（它是 AsyncGenerator，非 context manager）

## 關鍵注意事項
- Supabase Storage bucket 名稱：`documents`（需在 Dashboard 手動建立，Public）
- HNSW index（非 IVFFlat），不需要最低資料量
- Embedding 維度：768（Google text-embedding-004），schema 已對應
- Render 免費方案閒置 15 分鐘後 sleep，冷啟動約 30 秒
