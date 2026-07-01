# EconKB — 經濟學知識庫平台

類似 NotebookLM 的 RAG 知識庫平台，支援 PDF/DOCX/圖片 OCR、向量問答、知識圖譜。

## 技術棧

| 層級 | 技術 |
|------|------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Vector DB | Supabase + pgvector |
| Embeddings | OpenAI text-embedding-3-small |
| AI / OCR | Claude claude-sonnet-4-6 (Anthropic) |
| 文件存儲 | Google Drive Service Account |
| 部署 | Vercel (frontend) + Railway (backend) |

---

## 快速開始

### 1. Supabase 設定

1. 建立 Supabase 專案
2. 在 SQL Editor 執行 `supabase/schema.sql`
3. 到 Project Settings → API 複製 `URL`、`anon key`、`service_role key`

### 2. Google Drive Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立 Service Account → 下載 JSON 金鑰
3. 在 Google Drive 建立一個根資料夾，將 Service Account email 加入為編輯者
4. 複製該資料夾的 ID（URL 中 `folders/` 後的部分）

### 3. 後端本地啟動

```bash
cd backend
cp .env.example .env
# 填入所有環境變數

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`.env` 範例：
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
GOOGLE_DRIVE_ROOT_FOLDER_ID=1ABC...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
ADMIN_SECRET_KEY=your-admin-secret
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

> `GOOGLE_SERVICE_ACCOUNT_JSON` 填整個 JSON 字串（單行，無換行）

### 4. 前端本地啟動

```bash
cd frontend
cp .env.local.example .env.local
# 修改 NEXT_PUBLIC_API_URL

npm install
npm run dev
```

開啟 http://localhost:3000

---

## 部署

### Backend → Railway

1. 新增 Railway 專案，連結 `backend/` 目錄
2. Railway 自動偵測 `Procfile`：`uvicorn main:app --host 0.0.0.0 --port $PORT`
3. 在 Railway Variables 填入所有環境變數
4. Deploy → 取得 backend URL（例如 `https://ecokb-backend.up.railway.app`）

### Frontend → Vercel

1. 連結 `frontend/` 目錄至 Vercel
2. 在 Vercel → Settings → Environment Variables 設定：
   ```
   NEXT_PUBLIC_API_URL=https://ecokb-backend.up.railway.app
   ```
3. Deploy

---

## 專案結構

```
econkb/
├── frontend/                 # Next.js 14
│   ├── app/
│   │   ├── page.tsx          # 登入 / 註冊頁
│   │   ├── chat/page.tsx     # 主對話頁（RAG 問答）
│   │   ├── admin/page.tsx    # 管理後台（上傳文件）
│   │   └── graph/page.tsx    # D3.js 知識圖譜
│   └── lib/
│       ├── api.ts            # 所有 API 呼叫
│       └── auth.ts           # Session 管理
│
├── backend/                  # FastAPI
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── auth.py           # 登入 / 註冊
│   │   ├── documents.py      # 上傳 / 刪除 / 狀態查詢
│   │   ├── chat.py           # RAG 問答 (SSE streaming)
│   │   └── graph.py          # 知識圖譜資料
│   └── services/
│       ├── embedding.py      # OpenAI embeddings（可換）
│       ├── llm.py            # Claude 問答（可換）
│       ├── ocr.py            # Claude Vision OCR
│       ├── storage.py        # Google Drive（可換）
│       ├── parser.py         # PDF/DOCX/CSV/圖片解析
│       ├── rag.py            # 向量搜尋 + context 組裝
│       └── supabase_client.py
│
└── supabase/
    └── schema.sql            # 資料庫 DDL + pgvector + RPC
```

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/auth/register` | 註冊 |
| POST | `/auth/login` | 登入，回傳 JWT |
| GET  | `/chat/kb/{user_id}` | 列出知識庫 |
| POST | `/chat/kb` | 建立知識庫 |
| POST | `/documents/upload` | 上傳文件（背景處理） |
| GET  | `/documents/kb/{kb_id}` | 列出文件 |
| DELETE | `/documents/{doc_id}` | 刪除文件 |
| GET  | `/documents/{doc_id}/status` | 查詢處理狀態 |
| POST | `/chat/ask` | RAG 問答（SSE streaming） |
| GET  | `/graph/{kb_id}` | 知識圖譜節點 & 邊 |

---

## 文件處理流程

```
上傳 → SHA-256 去重 → Google Drive 存檔
                        ↓
                   類型偵測（Magic Bytes → 副檔名 → MIME）
                        ↓
          PDF 文字版 → PyMuPDF 直接解析
          PDF 掃描版 → Claude Vision OCR（< 100 字觸發）
          DOCX       → mammoth
          CSV/XLSX   → pandas
          圖片       → Claude Vision OCR
                        ↓
                   切段（400字 / 80字重疊）
                        ↓
                   OpenAI Embedding（1536維）
                        ↓
                   存入 Supabase pgvector
                        ↓
                   狀態更新為 ready
```

---

## 環境變數說明

| 變數 | 說明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 金鑰 |
| `OPENAI_API_KEY` | OpenAI Embedding 金鑰 |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_ANON_KEY` | Supabase 匿名金鑰（前端用） |
| `SUPABASE_SERVICE_KEY` | Supabase 服務金鑰（後端用，繞過 RLS） |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Drive 根資料夾 ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service Account JSON（整個字串） |
| `ADMIN_SECRET_KEY` | 管理員註冊密鑰 |
| `CORS_ORIGINS` | 允許的前端來源（逗號分隔） |
