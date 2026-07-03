---
status: 採用
date: 2026-07
---

# ADR-005 零成本技術棧重構

## 背景

初始架構依賴 Anthropic Claude API（LLM）、OpenAI API（embedding）、Google Drive（檔案儲存），
三個付費服務增加了部署複雜度與成本。目標是在不犧牲核心功能的前提下降到 $0。

## 決策

| 元件 | 原方案 | 新方案 | 費用 |
|------|--------|--------|------|
| LLM | Anthropic Claude | Google Gemini 2.5 Flash | $0（15 RPM 免費） |
| Embedding | OpenAI text-embedding-3-small (1536d) | Google gemini-embedding-001 (768d) | $0（同一 API key） |
| 檔案儲存 | Google Drive API | Supabase Storage | $0（1GB 免費） |
| 後端部署 | Railway ($5/月) | Render (免費方案) | $0 |

所有服務統一使用單一 `GOOGLE_API_KEY`，大幅簡化環境變數設定。

## 後果

**優點**
- 完全 $0 成本，適合 MVP 驗證階段
- API Key 從 3 個減少到 1 個（Google）+ Supabase 憑證
- Supabase Storage 與現有 DB 同平台，維運更簡單

**限制**
- Gemini 2.5 Flash 免費方案限制 15 RPM（每分鐘 15 次請求）
- Render 免費方案閒置 15 分鐘後 sleep，第一次請求冷啟動約 30 秒
- Embedding 維度從 1536 → 768（查詢精度略降，但實測差異小）

**升級路徑**
- 流量增大後：Gemini 付費方案 or 切回 Anthropic Claude
- Render 冷啟動影響體驗：升級 Render 付費方案（$7/月）或遷移至 Fly.io

## 實作補充（2026-07 上線實測）

線上部署時發現免費層模型有變動，最終採用的實際模型：

| 用途 | 原計畫 | 實際採用 | 原因 |
|------|--------|----------|------|
| LLM | `gemini-2.0-flash` | `gemini-2.5-flash` | 2.0-flash 免費額度已降為 0（`limit: 0`）|
| Embedding | `text-embedding-004` | `gemini-embedding-001` | text-embedding-004 已從 API 下線（404）|

- Embedding 用 `output_dimensionality=768` 對齊既有 `vector(768)` schema，免資料庫遷移
- Supabase 新版 API key（`sb_secret_` / `sb_publishable_`）非 JWT 格式，需 `supabase>=2.16`（本專案用 2.31.0）
- 統一 Gemini 設定層 `services/gemini.py`，換模型只需改一處常數

### 免費層韌性

Gemini 免費層各模型約 15 RPM，是零成本方案的主要限制。大文件切成數十 chunk 時，
單靠並發 Semaphore 擋不住速率會撞 429 導致整份失敗。因此新增 `services/rate_limit.py`：

- **token bucket 限流**：把 embedding / LLM / OCR 呼叫壓在 14 RPM（留緩衝）
- **429 指數退避重試**：短暫超限時自動退避重試，而非直接失敗

Supabase Storage 的 object key 不接受非 ASCII 字元，中文檔名改用 UUID key（原檔名存 DB）。
