# EconKB

RAG 知識庫問答平台（類 NotebookLM）。上傳 PDF / Word / Excel 文件，以自然語言提問，AI 根據知識庫內容回答並引用來源。

**線上展示**：[ecokb.vercel.app](https://ecokb.vercel.app)（Demo 模式無需帳號）

---

## 技術棧（零成本）

| 層級 | 技術 | 費用 |
|------|------|------|
| 前端 | Next.js 14 App Router（靜態匯出） | Vercel 免費 |
| 後端 | FastAPI + Python 3.11 | Render 免費 |
| LLM | Google Gemini 2.0 Flash | 免費（15 RPM）|
| Embedding | Google text-embedding-004（768 維）| 免費 |
| 向量 DB | Supabase pgvector（HNSW index）| 免費 |
| 檔案儲存 | Supabase Storage | 免費（1GB）|
| 認證 | Supabase Auth（JWT）| 免費 |

---

## 目錄結構

```
ecokb/
├── frontend/               # Next.js 14 前端
│   ├── app/
│   │   ├── page.tsx        # 登入頁（含 Demo 模式）
│   │   ├── chat/page.tsx   # 問答對話介面
│   │   ├── admin/page.tsx  # 文件管理後台
│   │   └── graph/page.tsx  # 知識圖譜（D3.js）
│   ├── components/
│   │   └── Logo.tsx        # 共用 Logo 元件
│   └── lib/
│       ├── api.ts          # API 呼叫層
│       ├── auth.ts         # Session 管理（含 isDemo()）
│       └── types.ts        # 共用型別定義
├── backend/                # FastAPI 後端
│   ├── main.py
│   ├── config.py           # 環境變數設定
│   ├── dependencies.py     # JWT 驗證（get_current_user）
│   ├── routers/
│   │   ├── auth.py         # 登入 / 註冊
│   │   ├── chat.py         # SSE 串流問答
│   │   ├── documents.py    # 文件上傳、向量化
│   │   └── graph.py        # 知識圖譜資料
│   └── services/
│       ├── llm.py          # Gemini 2.0 Flash 串流
│       ├── embedding.py    # Google text-embedding-004
│       ├── storage.py      # Supabase Storage
│       ├── rag.py          # 向量搜尋 + 上下文建構
│       ├── parser.py       # PDF / Word / Excel 解析
│       └── supabase_client.py
├── supabase/
│   └── schema.sql          # 資料表 + HNSW index + RPC 函式
└── docs/
    └── decisions/          # ADR 架構決策文件
```

---

## 本地開發

### 前端

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # 型別檢查
npm run build        # 完整 build 驗證
```

### 後端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入環境變數後執行
uvicorn main:app --reload --port 8000
```

`.env` 需填入：

```
GOOGLE_API_KEY=        # 從 aistudio.google.com/apikey 取得
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ADMIN_SECRET_KEY=      # 管理員註冊金鑰（自訂字串）
CORS_ORIGINS=http://localhost:3000
```

---

## 部署步驟

### 1. 取得 Google API Key（免費）

[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Get API Key

### 2. 建立 Supabase 專案（免費）

1. [supabase.com](https://supabase.com) 建立新專案
2. SQL Editor → 貼上並執行 `supabase/schema.sql`
3. Storage → New Bucket → 名稱 `documents` → Public ✅
4. Settings → API → 複製 URL、anon key、service_role key

### 3. 部署後端到 Render（免費）

1. [render.com](https://render.com) → New Web Service → 連接 GitHub → `ecokb`
2. Root Directory → `backend`
3. 填入 Environment Variables（參考 `backend/.env.example`）

### 4. 部署前端到 Vercel（免費）

1. 連接 GitHub repo
2. Settings → Production Branch → `master`
3. Settings → Ignored Build Step → `[ "$VERCEL_GIT_COMMIT_REF" != "gh-pages" ]`
4. Environment Variables → `NEXT_PUBLIC_API_URL` = Render URL

---

## 架構決策

重要設計決策記錄在 [`docs/decisions/`](docs/decisions/)：

| 編號 | 主題 | 狀態 |
|------|------|------|
| [ADR-001](docs/decisions/001-static-export-vercel.md) | 前端靜態匯出部署至 Vercel | 採用 |
| [ADR-002](docs/decisions/002-pgvector-supabase.md) | 向量儲存採用 Supabase pgvector | 採用 |
| [ADR-003](docs/decisions/003-sse-streaming.md) | LLM 回答採用 SSE 串流 | 採用 |
| [ADR-004](docs/decisions/004-google-drive-storage.md) | 檔案儲存（已棄用 Google Drive）| 棄用 |
| [ADR-005](docs/decisions/005-zero-cost-stack.md) | 零成本技術棧重構 | 採用 |
