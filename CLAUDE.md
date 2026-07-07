# EconKB — Claude 工作指南

## 專案概述
RAG 知識庫問答平台（類 NotebookLM），分為前後端兩部分。

- **前端**：Next.js 14 App Router，靜態匯出（`output: 'export'`），部署在 Vercel（ecokb.vercel.app）
- **後端**：FastAPI + Supabase pgvector，部署至 Render（免費方案）
- **AI**：Google Gemini 2.5 Flash（LLM）、Google gemini-embedding-001（向量，768 維）
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
│   ├── constants.py       # 可調參數集中處（門檻/上限/RPM，調校單一入口）
│   ├── schemas.py         # 所有 Pydantic 請求模型（router 不自帶 schema）
│   ├── dependencies.py    # get_current_user JWT 驗證、require_kb_ownership、require_admin
│   ├── routers/
│   │   ├── auth.py
│   │   ├── chat.py        # SSE 串流回答（Gemini）
│   │   ├── documents.py   # 文件上傳、向量化
│   │   ├── graph.py
│   │   └── admin.py       # 會員管理（require_admin，列/刪會員）
│   └── services/
│       ├── supabase_client.py # get_supabase（一般）+ get_admin_client（auth.admin.* 專用，避 session 污染）
│       ├── gemini.py      # Gemini 統一設定層（模型常數、get_client）
│       ├── rate_limit.py  # token bucket 限流 + 429 retry（15 RPM 韌性）
│       ├── llm.py         # 串流問答（asyncio queue 橋接、LLMError 錯誤哨兵）
│       ├── embedding.py   # gemini-embedding-001（768 維，限流 + retry）
│       ├── ocr.py         # Gemini Vision OCR（限流 + retry）
│       ├── keywords.py    # 知識圖譜關鍵字混合抽取（Gemini 預設 + jieba 降級）
│       └── storage.py     # Supabase Storage（key 用 UUID ASCII-safe）
├── supabase/schema.sql    # vector(768)，HNSW index
└── docs/decisions/        # ADR 架構決策文件
```

## 設計系統（Claude 風格日夜雙主題）

### 主題機制
- 夜間為預設（`:root`），日間由 `html[data-theme="light"]` 覆蓋，變數定義於 `globals.css`
- 切換元件：`components/ThemeToggle.tsx`，寫入 `localStorage.theme` 並設定 `data-theme`
- `layout.tsx` 內嵌 init script 在 hydration 前套用主題（防 FOUC）
- **規則：元件內一律使用 `var(--*)` 語意變數，禁止 hardcode 色碼**（分類色如檔案類型/狀態色除外）

### 語意色彩變數（globals.css）
| 變數 | 夜間 | 日間 | 用途 |
|------|------|------|------|
| `--bg` | `#262624` | `#faf9f5` | 頁面底色 |
| `--surface` | `#1f1e1d` | `#f0eee6` | 側邊欄 / topbar |
| `--card` | `#30302e` | `#ffffff` | 卡片 / 泡泡 / 輸入框 |
| `--text` | `#f5f4ee` | `#3d3929` | 主文字 |
| `--text-2` / `--muted` / `--faint` | 漸弱 | 漸弱 | 次要／弱化／最弱文字 |
| `--border` / `--border-strong` | `#3a3937` | `#e3e0d5` | 邊框 |
| `--accent` | `#d97757` | `#c96442` | 主色（赤陶橘）|
| `--accent-soft` / `--accent-border` | 透明橘 | 透明橘 | 主色底 / 主色框 |
| `--danger` / `--success` / `--info` | — | — | 狀態色 |
| `--shadow` / `--shadow-sm` | — | — | 陰影 |

### 共用 CSS 類別（globals.css）
- `.btn-ghost` — 邊框按鈕，hover 變主色
- `.btn-primary` — 主色實心按鈕（含 disabled 樣式）
- `.del-btn` — 刪除按鈕，hover 變紅
- `.suggestion-chip` — 空狀態建議晶片
- `.conv-item` / `.conv-item.active` — 側欄對話項目
- `.theme-toggle` — 日夜切換按鈕
- `.pulse` — 1.5s 透明度閃爍動畫
- `.auth-input` — 輸入框，`:focus` 變主色邊框
- `.chat-sidebar` / `.sidebar-backdrop` / `.sidebar-toggle` — 對話頁側欄 RWD：桌機固定欄，≤768px 收成 off-canvas 抽屜（漢堡鍵 `.sidebar-toggle` 手機才顯示）

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

### 對話框 / 提示
- 確認與錯誤**不要** 用瀏覽器原生 `confirm()`／`alert()`，一律用 `<ConfirmDialog>`（`components/ConfirmDialog.tsx`，含 danger/loading/error 狀態）或內嵌訊息帶
- 破壞性操作（刪除）用 `danger` 樣式確認；失敗訊息塞回 dialog 的 `error` 或頁面內嵌 banner

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
- 管理員身份存 Supabase `app_metadata.is_admin`（伺服器控制、使用者改不了）；`is_admin` 由 `get_current_user` 讀取
- 管理端點（`routers/admin.py`）一律注入 `Depends(require_admin)`（非 admin → 403）；前端隱藏入口僅 UX，真守衛在後端（ADR-009）
- **`auth.admin.*`（建立/列出/刪除/改 metadata）一律用 `get_admin_client()`（`services/supabase_client.py`），不要用 `get_supabase()`**：`sign_up`/`sign_in` 會把共用 client 的 session 設成該使用者，之後 `auth.admin.*` 改用使用者 token → `403 User not allowed`。`get_admin_client()` 從不登入、session 永遠空，一律以 service key 執行（ADR-009）

## 後端分層規範
- Pydantic 請求模型放 `backend/schemas.py`，**不要** 定義在 router 檔案內
- Gemini 相關設定（API key configure、模型名稱）只在 `services/gemini.py`，其他服務透過 `get_model()` / `ensure_configured()` 取用
- 前端 401 處理統一走 `api.ts` 的 `handleUnauthorized()`（內部呼叫 `clearSession()`）

## 後端 LLM 串流架構
- `services/llm.py` 使用 `asyncio.Queue` 橋接同步 Gemini SDK 與 FastAPI 非同步
- `chat.py` 使用 `async for text in stream_answer(...)` 驅動 SSE
- **不要** 用 `async with` 包 `stream_answer`（它是 AsyncGenerator，非 context manager）

## RAG 混合模式（ADR-006）
- 有相關資料 → 嚴格引用標 `[來源 N]`；無相關資料 → AI 通用知識回答並加前綴 `GENERAL_DISCLAIMER`
- 切換依據是相似度門檻 `SIMILARITY_THRESHOLD = 0.6`（`constants.py`），**不是** 檢索筆數（`match_chunks` 永遠回傳 top-k）
- sources 帶 `score`（cosine 相似度轉 %），前端 `MessageList` 以條狀圖顯示引用相關度
- `services/llm.py` 拆 `GROUNDED_SYSTEM_PROMPT` / `GENERAL_SYSTEM_PROMPT` 兩種提示，共用底層 `_stream` / `_complete`
- 調整引用鬆緊只需改 `SIMILARITY_THRESHOLD`

## 知識圖譜關鍵字（ADR-007）
- 混合抽取（`services/keywords.py`）：RPM 充裕走 Gemini（`try_acquire(min_reserve=3)` 保留額度給問答/OCR），吃緊或失敗降級 jieba
- 上傳時抽一次存 `documents.keywords`（jsonb），與 ready 狀態解耦 best-effort；圖譜端讀取、舊文件 jieba 即時補
- 關鍵字一律正規化為**繁體中文**（Gemini prompt 要求全繁中+標準術語；jieba 靠 `_EN_ZH` 對照表翻常見英文詞）→ 跨語言文件透過同概念節點橋接
- 圖譜 link 帶 `kind`：`doc`（文件→關鍵字，實線）/ `cooccur`（同文件關鍵字共現，前端淡虛線）→ 星狀變概念網絡
- 共現邊帶 `weight`（跨文件共現次數=關聯強度），前端粗細/深淺隨權重遞增
- Gemini `gemini-2.5-flash` 免費層為**每日 20 次**，問答/OCR/關鍵字共用

## 安全與韌性規範
- 帶 `conversation_id` 的請求一律經 `require_conversation_ownership`（驗證屬於該使用者且屬該 KB），防跨對話寫入
- Gemini 呼叫（LLM/embedding/OCR）一律經 `services/rate_limit.py` 的 limiter + `with_retry`，避免撞 15 RPM
- 串流錯誤用 `LLMError` 哨兵區分，**不存入對話、不洩漏 exception**；對外一律泛化錯誤訊息
- Storage object key 一律 ASCII-safe（`storage.py` 用 UUID + 副檔名），中文原檔名存 DB `filename` 欄位
- `config.py` 設 `extra="ignore"` 容忍多餘環境變數，避免部署時舊變數殘留導致啟動崩潰
- 上傳採有界讀取（1MB/塊）防 OOM；空檔回 400、解析無內容標 `empty` 狀態

## 關鍵注意事項
- Supabase Storage bucket 名稱：`documents`（需在 Dashboard 手動建立，Public，並加 storage.objects RLS 政策）
- Supabase Auth 需關閉 "Confirm email" 否則新用戶註冊後無法登入
- HNSW index（非 IVFFlat），不需要最低資料量
- Embedding 維度：768（Google gemini-embedding-001，`output_dimensionality=768`），schema 已對應
- LLM 用 `gemini-2.5-flash`（`gemini-2.0-flash` 免費額度為 0）
- Supabase Python client 需 >=2.16 才支援新版 key（`sb_secret_`）；`get_public_url` 為 async 需 await
- Render 免費方案閒置 15 分鐘後 sleep，冷啟動約 30 秒
- 部署管線：push `main` → Vercel（前端原生建置）+ Render（後端）自動部署
