<div align="center">

# 📚 EconKB

### RAG 知識庫問答平台

上傳 PDF / Word / Excel / 圖片，以自然語言提問，AI 根據你的文件內容回答並引用來源。<br/>
知識庫有資料時嚴格引用、無資料時改用 AI 通用知識並標註——類 NotebookLM 的零成本實作。

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-前端-black?logo=vercel)
![Render](https://img.shields.io/badge/Render-後端-46E3B7?logo=render&logoColor=white)

![Cost](https://img.shields.io/badge/成本-%240%2F月-brightgreen)
![Embedding](https://img.shields.io/badge/向量-768維-blue)
![RAG](https://img.shields.io/badge/RAG-混合模式-orange)
![Theme](https://img.shields.io/badge/主題-日夜雙模式-informational)

🌐 [線上展示](https://ecokb.vercel.app) · 📖 [API 端點](#-api-端點) · 🏗 [架構決策](docs/decisions/) · 🎨 [設計系統](CLAUDE.md)

</div>

---

## 目錄

- [功能概覽](#-功能概覽)
- [系統架構](#-系統架構)
- [部署架構](#-部署架構零成本)
- [技術棧](#-技術棧)
- [快速啟動](#-快速啟動本機開發)
- [文件處理 Pipeline](#-文件處理-pipeline)
- [RAG 檢索邏輯](#-rag-檢索邏輯混合模式)
- [API 端點](#-api-端點)
- [資料庫設計](#-資料庫設計)
- [部署步驟](#-部署步驟)
- [架構決策](#-架構決策)

---

## ✨ 功能概覽

### 🔍 RAG 問答（核心）
- 向量檢索 + Gemini 生成，回答標註 `[來源 N]` 引用段落
- **混合模式**：知識庫有相關資料 → 嚴格引用；無相關資料 → AI 通用知識回答並標註「此回答來自 AI 通用知識」
- 相似度門檻 `0.6` 自動判斷是否切換模式（切題 0.7+、不切題 0.5）
- SSE 串流即時輸出，逐字顯示

### 📄 文件處理
- 支援 PDF · Word · Excel · CSV · TXT · JPG · PNG（最大 50MB）
- 掃描檔 / 圖片自動 Gemini Vision OCR
- 自動分段（chunk）+ 向量化（768 維），非同步背景處理
- 即時狀態：等待 → 解析 → 向量化 → 完成

### 💬 對話管理
- 對話持久化，重新整理不遺失
- 多對話側欄、自動命名、歷史訊息懶載入
- Demo 模式免帳號試用

### 🎨 介面
- Claude 風格日夜雙主題，一鍵切換（localStorage 持久化、防閃爍）
- 🕸 知識圖譜（D3.js force graph）視覺化文件與關鍵詞關係

---

## 🏗 系統架構

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   前端 (Vercel)  │        │   後端 (Render)       │        │    Supabase     │
│  Next.js 靜態匯出 │  HTTPS │   FastAPI            │        │                 │
│                 │───────▶│                      │───────▶│  pgvector (768) │
│  · 登入 / 對話   │  JWT   │  · SSE 串流問答       │        │  Storage bucket │
│  · 管理後台      │◀───────│  · 文件向量化         │◀───────│  Auth (JWT)     │
│  · 知識圖譜      │  SSE   │  · KB 擁有權驗證      │        │                 │
└─────────────────┘        └──────────┬───────────┘        └─────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Google Gemini API   │
                            │  · 2.5 Flash（LLM）   │
                            │  · embedding-001（向量）│
                            │  · Vision（OCR）      │
                            └──────────────────────┘
```

---

## 🚀 部署架構（零成本）

| 服務 | 平台 | 方案 | 說明 |
|------|------|------|------|
| 前端 | Vercel | 免費 | `push main` 自動原生建置 Next.js |
| 後端 | Render | 免費 | 閒置 15 分鐘 sleep，冷啟動約 30 秒 |
| 資料庫 / 向量 | Supabase | 免費 | pgvector + HNSW index |
| 檔案儲存 | Supabase Storage | 免費 | 1GB bucket `documents` |
| 認證 | Supabase Auth | 免費 | JWT |
| AI | Google Gemini | 免費 | 15 RPM |

> 單一 `GOOGLE_API_KEY` + Supabase 憑證即可運作，全棧 **$0 / 月**。

---

## 🧰 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 App Router · TypeScript · 靜態匯出（`output: 'export'`）|
| 後端 | FastAPI · Python 3.11 · uvicorn · asyncio |
| LLM | Google Gemini 2.5 Flash |
| Embedding | Google gemini-embedding-001（768 維，`output_dimensionality`）|
| 向量 DB | Supabase pgvector · HNSW（cosine）· `match_chunks` RPC |
| 檔案解析 | PyMuPDF（PDF）· mammoth（Word）· pandas（Excel/CSV）· Gemini Vision（OCR）|
| 認證 | Supabase Auth · Bearer JWT |
| 視覺化 | D3.js force graph |
| 測試 | pytest（TestClient + dependency override）|

---

## ⚡ 快速啟動（本機開發）

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
cp .env.example .env   # 填入環境變數
uvicorn main:app --reload --port 8000
pytest tests/ -q       # 執行測試
```

`.env`：
```
GOOGLE_API_KEY=        # aistudio.google.com/apikey
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ADMIN_SECRET_KEY=      # 管理員註冊金鑰（自訂）
CORS_ORIGINS=http://localhost:3000
```

---

## 🔄 文件處理 Pipeline

```
上傳 → 大小/重複檢查 → Supabase Storage → 建立 document 紀錄
                                              │ (背景非同步)
                                              ▼
         解析（PyMuPDF/mammoth/pandas/OCR）→ 分段 chunk → 向量化（768d）
                                              │
                                              ▼
                              寫入 chunks 表 → 狀態更新為「完成」
```

- 大檔用 `Semaphore(8)` 限制並發 embedding，避免撞 Gemini 免費版 rate limit
- PDF 每頁文字少於 100 字自動轉 Gemini Vision OCR

---

## 🎯 RAG 檢索邏輯（混合模式）

```
問題 → 向量化 → match_chunks（pgvector cosine top-5）
                        │
              相似度 ≥ 0.6 ?
              ┌─────┴─────┐
             是            否
              │            │
     嚴格引用模式      通用知識模式
   （只依段落回答，   （AI 通用知識回答，
     標 [來源 N]）     前綴「此回答來自 AI 通用知識」）
```

門檻定義於 `backend/services/rag.py` 的 `SIMILARITY_THRESHOLD`。

---

## 📡 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/auth/register` | 註冊（`admin_key` 判定管理員），自動建預設知識庫 |
| `POST` | `/auth/login` | 登入，回傳 JWT |
| `POST` | `/auth/logout` | 登出（JWT 無狀態，前端清除）|
| `POST` | `/chat/ask` | SSE 串流問答（混合模式）|
| `GET` | `/chat/kb/{user_id}` | 使用者知識庫清單 |
| `POST` | `/chat/kb` | 建立知識庫 |
| `GET` `POST` | `/chat/conversations` | 對話清單 / 建立對話 |
| `GET` | `/chat/conversations/{id}/messages` | 對話歷史訊息 |
| `PATCH` `DELETE` | `/chat/conversations/{id}` | 重新命名 / 刪除對話 |
| `POST` | `/documents/upload` | 上傳文件（觸發背景向量化）|
| `GET` | `/documents/kb/{kb_id}` | 文件清單 |
| `GET` | `/documents/{id}/status` | 向量化狀態 |
| `DELETE` | `/documents/{id}` | 刪除文件（含 chunks + Storage）|
| `GET` | `/graph/{kb_id}` | 知識圖譜節點 / 連結 |
| `GET` | `/health` | 健康檢查 |

> 所有受保護路由注入 `Depends(get_current_user)`，`user_id` 一律取自 JWT；KB 存取經 `require_kb_ownership` 驗證。

---

## 🗄 資料庫設計

| 資料表 | 用途 | 關鍵欄位 |
|--------|------|----------|
| `knowledge_bases` | 知識庫 | `user_id`, `name` |
| `documents` | 文件元資料 | `kb_id`, `status`, `storage_path`, `public_url`, `chunk_count` |
| `chunks` | 向量段落 | `doc_id`, `kb_id`, `content`, `embedding vector(768)` |
| `conversations` | 對話 | `kb_id`, `user_id`, `title` |
| `messages` | 對話訊息 | `conversation_id`, `role`, `content` |

- 全表啟用 RLS（Row Level Security）
- `chunks` 建 HNSW index（cosine）；`match_chunks` RPC 做相似度搜尋
- Schema 定義於 [`supabase/schema.sql`](supabase/schema.sql)

---

## 📦 部署步驟

<details>
<summary>展開完整部署流程</summary>

### 1. Google API Key
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Get API Key

### 2. Supabase
1. 建立專案 → SQL Editor 執行 `supabase/schema.sql`
2. Storage → New Bucket → `documents`（Public）
3. Storage RLS 政策（SQL Editor）：
   ```sql
   create policy "documents read"   on storage.objects for select using (bucket_id = 'documents');
   create policy "documents insert" on storage.objects for insert with check (bucket_id = 'documents');
   create policy "documents delete" on storage.objects for delete using (bucket_id = 'documents');
   ```
4. Authentication → 關閉 "Confirm email"（MVP 免確認信）
5. Settings → API → 複製 URL / anon / service_role key

### 3. Render（後端）
New Web Service → 連接 repo → Branch `main` → Root `backend` → 填入環境變數

### 4. Vercel（前端）
連接 repo → Production Branch `main` → `NEXT_PUBLIC_API_URL` = Render URL

</details>

---

## 📐 架構決策

重要設計決策記錄於 [`docs/decisions/`](docs/decisions/)：

| 編號 | 主題 | 狀態 |
|------|------|------|
| [ADR-001](docs/decisions/001-static-export-vercel.md) | 前端靜態匯出部署至 Vercel | ✅ 採用 |
| [ADR-002](docs/decisions/002-pgvector-supabase.md) | 向量儲存採用 Supabase pgvector | ✅ 採用 |
| [ADR-003](docs/decisions/003-sse-streaming.md) | LLM 回答採用 SSE 串流 | ✅ 採用 |
| [ADR-004](docs/decisions/004-google-drive-storage.md) | 檔案儲存（Google Drive）| ⚠️ 棄用 |
| [ADR-005](docs/decisions/005-zero-cost-stack.md) | 零成本技術棧重構 | ✅ 採用 |
| [ADR-006](docs/decisions/006-hybrid-rag-mode.md) | RAG 混合模式（嚴格引用 / 通用知識）| ✅ 採用 |

---

<div align="center">

以 ❤️ 打造 · 全棧零成本 · [線上體驗](https://ecokb.vercel.app)

</div>
