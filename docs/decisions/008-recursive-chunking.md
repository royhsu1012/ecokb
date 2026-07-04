---
status: 採用
date: 2026-07
---

# ADR-008 遞迴語意邊界切塊

## 背景

初版 `chunk_text` 用固定 400 字滑動窗 + 80 字重疊。問題（經多來源研究驗證）：
- **切在句中/詞中**：實測「The Committee will | continue…」被切兩半，傷害檢索
- 無視文件結構，中文因無空格更易切在詞中間
- 80 字重疊的滑動窗在長文件產生大量重複塊

## 決策

改為**遞迴語意邊界切塊**（純 Python，零新依賴）：

1. 依 separator 由粗到細遞迴切：`段落 → 換行 → 句末(。！？.!?) → 分號逗號 → 空白 → 字元`
2. **加中文標點 separator**（。！？；，）避免切在句/詞中間
3. 句末標點保留在句尾（不脫離句子）
4. 沿邊界切出的語意單元，貪婪合併至 `CHUNK_SIZE`，塊間留 `CHUNK_OVERLAP` 字元續接上下文

參數維持 `CHUNK_SIZE=400 / CHUNK_OVERLAP=80`（`constants.py`）——研究指出**單文件事實問答用小 chunk（128–256 tokens）更佳**，本專案正是此場景。

## 研究依據（多來源 3-0 驗證）

| 結論 | 來源 |
|------|------|
| 遞迴邊界切優於固定窗，且免 embedding 呼叫，為推薦基準 | LangChain / Redis / Unstructured |
| 中日泰無空格須加標點 separator 避免切在詞中 | LangChain 官方 |
| 單文件問答小 chunk 更好（內容過多反難抽取）| CRUD-RAG (arXiv 2401.17043) |
| 遞迴 + 10–20% overlap ≈ 88–89% recall | 綜述 |
| 語意/LLM 切塊增益混合、成本不划算，先 benchmark | Redis |

## 後果

**優點**
- 不再切在句中，中英文檢索品質提升
- 零新依賴、無 embedding 呼叫、免費方案友善
- 長文件塊數更合理（沿邊界合併 vs 滑動窗重複）

**未採**
- 語意/embedding 切塊：增益不穩、成本不划算（研究建議先 benchmark，非預設）

**測試**
- `tests/test_chunking.py`：句末邊界、大小上限、內容不遺失、英文不切半字
