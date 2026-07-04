<div align="center">

# 📚 EconKB

### RAG 知識庫問答平台 — 架構展示

上傳 PDF / Word / Excel / 圖片，以自然語言提問，AI 根據文件內容回答並引用來源；<br/>
知識庫有資料時嚴格引用、無資料時改用 AI 通用知識並標註。類 NotebookLM 的**零成本全棧**實作。

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?logo=google&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Vercel%20%2B%20Render-部署-black?logo=vercel)

![Cost](https://img.shields.io/badge/成本-%240%2F月-brightgreen)
![Vector](https://img.shields.io/badge/向量-768維%20HNSW-blue)
![RAG](https://img.shields.io/badge/RAG-混合模式-orange)
![ADR](https://img.shields.io/badge/ADR-6%20篇-informational)
![Tests](https://img.shields.io/badge/pytest-passing-success)

🌐 [線上系統](https://ecokb.vercel.app) · 🏗 [設計系統](CLAUDE.md) · 📐 [架構決策記錄](docs/decisions/)

</div>

---

## 目錄

- [系統概覽](#系統概覽)
- [技術棧](#技術棧)
- [架構總覽](#架構總覽)
- [核心工程決策](#核心工程決策)
- [資料庫設計](#資料庫設計)
- [文件處理管道](#文件處理管道)
- [RAG 檢索邏輯](#rag-檢索邏輯)
- [前端設計系統](#前端設計系統)
- [部署架構](#部署架構)
- [可觀測性](#可觀測性)
- [架構決策記錄](#架構決策記錄adr)
- [治理框架](#治理框架)
- [線上展示](#線上展示)

---

## 系統概覽

| 面向 | 內容 |
|------|------|
| 定位 | RAG 知識庫問答平台（類 NotebookLM），單一使用者多知識庫 |
| 輸入 | PDF · Word · Excel · CSV · TXT · JPG · PNG（最大 50MB）|
| 檢索 | Supabase pgvector（HNSW cosine）+ 相似度門檻混合模式 |
| 生成 | Google Gemini 2.5 Flash，SSE 串流、引用 `[來源 N]` |
| 儲存 | Supabase Storage（原檔）+ pgvector（向量）+ Auth（JWT）|
| 成本 | 全棧 **$0 / 月**，單一 `GOOGLE_API_KEY` + Supabase 憑證 |

---

## 技術棧

| 層次 | 技術 |
|------|------|
| 前端 | Next.js 14 App Router · TypeScript · 靜態匯出（`output: 'export'`）· D3.js |
| 後端 | Python 3.11 · FastAPI · uvicorn · asyncio |
| 資料庫 | Supabase PostgreSQL · pgvector · HNSW index · `match_chunks` RPC |
| LLM / 向量 | Gemini 2.5 Flash · gemini-embedding-001（768 維）· Gemini Vision（OCR）|
| 檔案解析 | PyMuPDF（PDF）· mammoth（Word）· pandas（Excel/CSV）|
| 認證 | Supabase Auth · Bearer JWT · RLS |
| 部署 | Vercel（前端原生建置）· Render（後端）· push `main` 自動部署 |
| 測試 | pytest · TestClient · dependency override |

---

## 架構總覽

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   前端 (Vercel)  │        │   後端 (Render)       │        │    Supabase     │
│  Next.js 靜態匯出 │  HTTPS │   FastAPI            │        │                 │
│                 │───────▶│                      │───────▶│  pgvector (768) │
│  · 登入 / 對話   │  JWT   │  · SSE 串流問答       │        │  Storage bucket │
│  · 管理後台      │◀───────│  · 文件向量化         │◀───────│  Auth (JWT)     │
│  · 知識圖譜      │  SSE   │  · KB 擁有權驗證      │        │  RLS            │
└─────────────────┘        └──────────┬───────────┘        └─────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Google Gemini API   │
                            │  2.5 Flash · embed-001 │
                            │  · Vision（OCR）      │
                            └──────────────────────┘
```

前後端**完全分離**：前端純靜態檔、後端純 API，中間僅靠 HTTP + JWT，可獨立部署與演進。

---

## 核心工程決策

### 1. 前後端完全分離 — 靜態匯出
前端以 `output: 'export'` 產生純靜態檔部署 Vercel，無 SSR、無共用程式碼包。唯一接觸點是 `lib/api.ts`；後端 API 改動只需改這一個檔案。前端可 CDN 快取，後端可獨立擴充。

### 2. asyncio.Queue 橋接同步 SDK 串流
Gemini Python SDK 的串流是同步產生器，FastAPI SSE 需要 async。`services/llm.py` 用 `asyncio.Queue` + `run_in_executor` 把同步串流橋接成 `AsyncGenerator`，`chat.py` 以 `async for` 驅動 SSE，不阻塞事件迴圈。

### 3. 統一 Gemini 設定層 — 換模型只改一處
所有 Gemini 呼叫（LLM / embedding / OCR）都經 `services/gemini.py` 取用 client 與模型常數。上線時遇到 `gemini-2.0-flash` 免費額度歸零、`text-embedding-004` 下線，靠這層**只改兩個常數**即完成模型遷移。

### 4. RAG 混合模式 — 用相似度門檻而非筆數
`match_chunks` 永遠回傳最接近的 top-k（即使不相關），故「檢索 0 筆」無法判斷有無資料。改用**相似度門檻 0.6**（實測切題 0.7+、不切題 0.5）：高於門檻走嚴格引用，低於則改用 AI 通用知識並前綴標註來源。

### 5. Embedding 降維對齊 schema — 免資料庫遷移
`gemini-embedding-001` 預設 3072 維，但既有 schema 為 `vector(768)`。以 `output_dimensionality=768` 於 API 端降維，cosine 相似度不受影響，避免重建索引與資料遷移。

### 6. HNSW 而非 IVFFlat
pgvector 的 IVFFlat 需要足夠資料量才建立有效分群，資料少時查詢退化。改用 **HNSW（cosine）**，任何資料量都有穩定近鄰搜尋、無最低筆數限制、免 vacuum 重訓。

### 7. 雙層授權 — RLS + 應用層擁有權
Supabase 全表啟用 Row Level Security 作為資料層防線；後端另以 `require_kb_ownership(sb, kb_id, user_id)` 在應用層驗證知識庫擁有權。`user_id` 一律取自 JWT，**不接受** 從 body/form 傳入。

### 8. 串流訊息在 [DONE] 前保存
串流回答的持久化若放在送出 `[DONE]` 之後，客戶端收到 DONE 即斷線、generator 被取消，訊息遺失。將 `_save_messages` 移到 `[DONE]` **之前**執行，確保連線仍在時完成寫入。

### 9. 免費層 15 RPM 韌性 — token bucket + 429 退避
Gemini 免費層各模型約 15 RPM，大文件切成數十 chunk 時單靠並發 Semaphore 擋不住速率。`services/rate_limit.py` 以 token bucket 把 embedding / LLM / OCR 呼叫壓在門檻內，並對 429 指數退避重試，避免大文件整份失敗。

### 10. Storage key 一律 ASCII-safe
Supabase Storage 的 object key 不接受非 ASCII 字元（中文檔名 `央行資料.pdf` 會上傳失敗）。storage key 改用 `UUID + 副檔名`，中文原始檔名另存於 DB `filename` 欄位。

---

## 資料庫設計

| 資料表 | 用途 | 關鍵欄位 |
|--------|------|----------|
| `knowledge_bases` | 知識庫 | `user_id`, `name` |
| `documents` | 文件元資料 | `kb_id`, `status`, `storage_path`, `public_url`, `chunk_count` |
| `chunks` | 向量段落 | `doc_id`, `kb_id`, `content`, `embedding vector(768)` |
| `conversations` | 對話 | `kb_id`, `user_id`, `title` |
| `messages` | 對話訊息 | `conversation_id`, `role`, `content` |

- 全表啟用 RLS；`chunks` 建 HNSW index（cosine）
- `match_chunks` RPC 依 `kb_id` 過濾後做相似度搜尋
- Schema：[`supabase/schema.sql`](supabase/schema.sql)

---

## 文件處理管道

```
上傳 → 大小/重複檢查 → Supabase Storage → 建立 document 紀錄
                                              │ (背景非同步)
                                              ▼
         解析（PyMuPDF/mammoth/pandas/OCR）→ 分段 chunk → 向量化（768d）
                                              │
                                              ▼
                              寫入 chunks 表 → 狀態更新為「完成」
```

- 切塊採**遞迴語意邊界**（段落→句子→詞，含中文標點），不切在句/詞中間（[ADR-008](docs/decisions/008-recursive-chunking.md)）
- embedding / OCR 經 `rate_limit.py`（token bucket + 429 退避）壓在 15 RPM 內，大檔不整份失敗
- PDF 每頁文字少於 100 字自動轉 Gemini Vision OCR
- Storage key 用 UUID（ASCII-safe），支援中文檔名；原檔名存 DB
- 狀態機：等待 → 解析 → 向量化 → 完成 / 無內容 / 錯誤，前端自動輪詢顯示

---

## RAG 檢索邏輯

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

門檻 `SIMILARITY_THRESHOLD` 定義於 `backend/services/rag.py`，可調整引用鬆緊。詳見 [ADR-006](docs/decisions/006-hybrid-rag-mode.md)。

每個引用來源帶 **cosine 相關度**（`score` %），前端於答案下方以條狀圖顯示「引用來源（相關度）」，可信度透明。

---

## 前端設計系統

- **日夜雙主題**：語意色彩變數定義於 `app/globals.css`，夜間為預設、日間由 `html[data-theme="light"]` 覆蓋
- 元件內一律用 `var(--*)` 語意變數，禁止 hardcode 色碼
- `ThemeToggle` 寫入 `localStorage.theme`；`layout.tsx` 內嵌 script 在 hydration 前套用主題防閃爍（FOUC）
- 對話頁拆分為 `ChatSidebar` / `MessageList` / `ChatInput`，狀態集中於 page
- 頁面：`/` 登入 · `/chat` 對話 · `/admin` 管理後台 · `/graph` 知識圖譜（D3.js）
- 知識圖譜（見 [ADR-007](docs/decisions/007-knowledge-graph-keywords.md)）：
  - 關鍵字混合抽取（Gemini 語意優先、額度盡降級 jieba），一律正規化為**繁體中文**（英文概念翻譯）→ 跨語言文件透過同概念節點橋接
  - 關鍵字**共現邊**形成概念網絡，邊權重 = 跨文件共現次數（關聯強度），前端粗細/深淺呈現

---

## 部署架構

| 服務 | 平台 | 方案 | 觸發 |
|------|------|------|------|
| 前端 | Vercel | 免費 | push `main` → 原生建置 Next.js |
| 後端 | Render | 免費 | push `main` → 重新部署（root `backend`）|
| 資料庫 / 儲存 / 認證 | Supabase | 免費 | — |
| AI | Google Gemini | 免費（15 RPM）| — |

> Render 免費方案閒置 15 分鐘後 sleep，冷啟動約 30 秒。

---

## 可觀測性

- `GET /health` 健康檢查端點（不依賴 DB，供部署平台探活）
- `GET/DELETE /admin/members[/{id}]` 會員管理（`require_admin` 守衛，非管理員 403）
- 文件處理狀態機落地於 `documents.status`，前端可即時輪詢
- 後端例外統一由 FastAPI 例外處理轉為結構化錯誤回應
- 前端 401 統一走 `handleUnauthorized()` 自動清除 session 並跳轉

---

## 架構決策記錄（ADR）

| 編號 | 主題 | 狀態 |
|------|------|------|
| [ADR-001](docs/decisions/001-static-export-vercel.md) | 前端靜態匯出部署至 Vercel | ✅ 採用 |
| [ADR-002](docs/decisions/002-pgvector-supabase.md) | 向量儲存採用 Supabase pgvector | ✅ 採用 |
| [ADR-003](docs/decisions/003-sse-streaming.md) | LLM 回答採用 SSE 串流 | ✅ 採用 |
| [ADR-004](docs/decisions/004-google-drive-storage.md) | 檔案儲存（Google Drive）| ⚠️ 棄用 |
| [ADR-005](docs/decisions/005-zero-cost-stack.md) | 零成本技術棧重構 | ✅ 採用 |
| [ADR-006](docs/decisions/006-hybrid-rag-mode.md) | RAG 混合模式（嚴格引用 / 通用知識）| ✅ 採用 |
| [ADR-007](docs/decisions/007-knowledge-graph-keywords.md) | 知識圖譜混合關鍵字 + 共現網絡 | ✅ 採用 |
| [ADR-008](docs/decisions/008-recursive-chunking.md) | 遞迴語意邊界切塊（中英標點）| ✅ 採用 |
| [ADR-009](docs/decisions/009-member-admin-system.md) | 會員與管理系統（admin 刪會員）| ✅ 採用 |

---

## 治理框架

專案以四道機制維持長期可維護性——分層規範、品質閘、依賴治理、決策留痕。

### 分層與編碼規範

後端嚴格分層，每層單一職責，規則明文寫入 [CLAUDE.md](CLAUDE.md) 供人與 AI 共同遵循：

| 層 | 職責 | 硬性規則 |
|----|------|----------|
| `routers/` | HTTP 流程（驗證、參數、回應）| 不自帶 Pydantic schema |
| `services/` | 業務邏輯（LLM、embedding、儲存、解析、RAG）| Gemini 設定只在 `gemini.py` |
| `schemas.py` | 請求模型集中管理 | — |
| `dependencies.py` | 認證與授權 | `user_id` 一律取自 JWT，KB 存取走 `require_kb_ownership` |

前端對應規範：元件一律用 `var(--*)` 語意變數（禁 hardcode 色碼）、401 統一走 `handleUnauthorized()`、型別用 `lib/types.ts`（禁 `any[]`）。

### 品質閘（每次變更前）

| 閘 | 指令 | 把關 |
|----|------|------|
| 型別 | `cd frontend && npx tsc --noEmit` | 前端型別錯誤 |
| Build | `npm run build` | 靜態匯出可建置 |
| 測試 | `cd backend && pytest tests/ -q` | 認證 / 授權 / 輸入驗證 |

測試以 `TestClient` + FastAPI `dependency_overrides` 抽換 Supabase 與認證，**免真實 DB / 網路**即可跑，涵蓋：未帶 token 一律 401/403、跨使用者 KB 拒絕、50MB 上限、email 格式驗證等安全不變式。

### 依賴治理

[Dependabot](.github/dependabot.yml) 自動掃描與開 PR：

| 生態 | 目錄 | 頻率 | PR 上限 |
|------|------|------|---------|
| npm | `/frontend` | 每週一 | 5 |
| pip | `/backend` | 每週一 | 5 |
| github-actions | `/` | 每月 | — |

上線期間實際靠此機制的思路解過多起相依衝突（如 `supabase 2.31.0` ↔ `pydantic` 版本、`realtime` 相依）。

### 架構決策留痕

所有重大設計與取捨以 ADR 記錄於 [`docs/decisions/`](docs/decisions/)（目前 6 篇），含背景、決策、後果、升級路徑；棄用決策保留並標註被取代者（如 ADR-004 → ADR-005），確保 AI 接手時不會走回頭路。

---

## 線上展示

🌐 **[ecokb.vercel.app](https://ecokb.vercel.app)**

### 訪客試用 · 兩種入口

**① Demo 模式（最快，免帳號）**
登入頁點 **「Demo 模式（無需帳號）」** → 直接進入，體驗對話介面與範例。

**② 註冊帳號（可上傳自己的文件、真正跑 RAG）**
1. 登入頁點「免費註冊」，填入 email + 密碼
2. **管理員金鑰**（選填）：`EconKB-Admin-2026`
3. 註冊後直接登入 → 管理後台上傳文件 → 對話頁提問

> 🔑 上方金鑰僅供公開試用，之後會更換。

<div align="center">

以 ❤️ 打造 · 全棧零成本 · 前後端完全分離

</div>
