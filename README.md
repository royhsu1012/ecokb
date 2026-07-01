# EconKB

類似 NotebookLM 的經濟學知識庫平台，支援多格式文件上傳、OCR、RAG 向量問答與 D3.js 知識圖譜。

**Frontend**: https://ecokb.vercel.app  
**GitHub Pages**: https://royhsu1012.github.io/ecokb/  
**Repo**: https://github.com/royhsu1012/ecokb

---

## 技術棧

| 層級 | 技術 |
|------|------|
| Frontend | Next.js 14 · Tailwind CSS · D3.js |
| Backend | FastAPI (Python 3.11) |
| 向量資料庫 | Supabase + pgvector |
| Embeddings | OpenAI text-embedding-3-small |
| 問答 / OCR | Claude claude-sonnet-4-6 (Anthropic) |
| 文件存儲 | Google Drive Service Account |
| 部署 | Vercel (frontend) · Railway (backend) |

---

## 功能

- **多格式上傳**：PDF、DOCX、TXT、CSV、JPG、PNG
- **自動 OCR**：掃描版 PDF 與圖片透過 Claude Vision 辨識
- **SHA-256 去重**：相同檔案只存一份
- **RAG 問答**：Top-5 向量搜尋 + Claude 生成含來源引用的答案，SSE 串流輸出
- **知識圖譜**：D3.js 力向圖，節點含文件、主題、關鍵詞三種類型
- **文件狀態機**：`pending → parsing → embedding → ready / error`

---

## 專案結構

```
ecokb/
├── frontend/                 # Next.js 14 (Vercel)
│   ├── app/
│   │   ├── page.tsx          # 登入 / 註冊
│   │   ├── chat/page.tsx     # RAG 問答（SSE streaming）
│   │   ├── admin/page.tsx    # 管理後台（文件上傳 / 刪除）
│   │   └── graph/page.tsx    # D3.js 知識圖譜
│   └── lib/
│       ├── api.ts            # API 呼叫統一入口
│       └── auth.ts           # localStorage session
│
├── backend/                  # FastAPI (Railway)
│   ├── main.py
│   ├── config.py             # pydantic-settings 環境變數
│   ├── routers/
│   │   ├── auth.py           # 登入 / 註冊 / 登出
│   │   ├── documents.py      # 上傳 / 刪除 / 狀態查詢
│   │   ├── chat.py           # RAG 問答 + 知識庫 CRUD
│   │   └── graph.py          # 知識圖譜節點與邊
│   └── services/
│       ├── embedding.py      # OpenAI embeddings（可換）
│       ├── llm.py            # Claude 問答（可換）
│       ├── ocr.py            # Claude Vision OCR
│       ├── storage.py        # Google Drive（可換）
│       ├── parser.py         # 解析 PDF / DOCX / CSV / 圖片
│       ├── rag.py            # 向量搜尋 + context 組裝
│       └── supabase_client.py
│
└── supabase/
    └── schema.sql            # DDL · pgvector · RLS · match_chunks RPC
```

---

## 本地開發

### 1. 建立 Supabase 專案

1. 到 [supabase.com](https://supabase.com) 新增專案
2. SQL Editor 執行 `supabase/schema.sql`
3. 複製 Project Settings → API 的 `URL`、`anon key`、`service_role key`

### 2. Google Drive Service Account

1. [Google Cloud Console](https://console.cloud.google.com) → 建立 Service Account → 下載 JSON 金鑰
2. Google Drive 建立根資料夾，把 Service Account email 加為編輯者
3. 複製資料夾 ID（URL `folders/` 後的部分）

### 3. 啟動 Backend

```bash
cd backend
cp .env.example .env
# 填入所有環境變數（見下表）

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. 啟動 Frontend

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm install
npm run dev
# 開啟 http://localhost:3000
```

---

## 部署

### Backend → Railway

1. 登入 [railway.app](https://railway.app)，新增專案並連結此 repo
2. Root Directory 設為 `backend`（Railway 會自動讀取 `Procfile`）
3. Variables 填入所有環境變數
4. Deploy，取得 URL（如 `https://ecokb-backend.up.railway.app`）

### Frontend → Vercel

已自動透過 GitHub 連結部署。更新環境變數：

Vercel → Project → Settings → Environment Variables：
```
NEXT_PUBLIC_API_URL=https://ecokb-backend.up.railway.app
```

---

## 環境變數

### Backend (`backend/.env`)

| 變數 | 說明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 金鑰（`sk-ant-...`） |
| `OPENAI_API_KEY` | OpenAI Embedding 金鑰（`sk-...`） |
| `SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_ANON_KEY` | Supabase 匿名金鑰 |
| `SUPABASE_SERVICE_KEY` | Supabase 服務金鑰（繞過 RLS） |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Drive 根資料夾 ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service Account 整個 JSON 字串（單行） |
| `ADMIN_SECRET_KEY` | 管理員註冊用密鑰，自訂字串即可 |
| `CORS_ORIGINS` | 允許的前端來源，逗號分隔（如 `http://localhost:3000,https://ecokb.vercel.app`） |

### Frontend (`frontend/.env.local`)

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | Backend URL |

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/auth/register` | 註冊（含管理員 key 欄位） |
| POST | `/auth/login` | 登入，回傳 JWT |
| POST | `/auth/logout` | 登出 |
| GET  | `/chat/kb/{user_id}` | 列出知識庫 |
| POST | `/chat/kb` | 建立知識庫 |
| POST | `/chat/ask` | RAG 問答（SSE streaming） |
| POST | `/documents/upload` | 上傳文件（背景非同步處理） |
| GET  | `/documents/kb/{kb_id}` | 列出知識庫下的文件 |
| GET  | `/documents/{doc_id}/status` | 查詢文件處理狀態 |
| DELETE | `/documents/{doc_id}` | 刪除文件 |
| GET  | `/graph/{kb_id}` | 知識圖譜節點與邊 |

---

## 文件處理流程

```
上傳檔案
  │
  ├─ SHA-256 去重（相同檔案跳過）
  │
  ├─ Magic Bytes 偵測真實類型
  │
  ├─ Google Drive 存檔（per-user 子資料夾）
  │
  ├─ 解析
  │    ├─ PDF 文字版  → PyMuPDF
  │    ├─ PDF 掃描版  → Claude Vision OCR（< 100 字觸發）
  │    ├─ DOCX        → mammoth
  │    ├─ CSV / XLSX  → pandas
  │    └─ JPG / PNG   → Claude Vision OCR
  │
  ├─ 切段（400 字 / 80 字重疊）
  │
  ├─ OpenAI Embedding（text-embedding-3-small，1536 維）
  │
  └─ 存入 Supabase pgvector → 狀態更新為 ready
```
