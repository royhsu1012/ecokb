"""集中可調參數（magic numbers），讓調校有單一入口。

模型名稱等 Gemini 設定仍在 services/gemini.py（分層規範）；此處只收攏行為性參數。
"""

# --- RAG 檢索 ---
SIMILARITY_THRESHOLD = 0.6      # 低於此值視為知識庫無相關資料 → 切通用模式（ADR-006）

# --- 知識圖譜 ---
KEYWORDS_PER_DOC = 8            # 每份文件抽取的關鍵字上限
KEYWORD_RPM_RESERVE = 3.0      # 關鍵字抽取保留給問答/OCR 的 Gemini RPM 額度（ADR-007）

# --- Gemini 免費層韌性 ---
GEMINI_RPM = 14                # 每模型每分鐘請求上限（免費層 ~15，留 1 緩衝）
EMBED_CONCURRENCY = 8          # embedding 並發上限

# --- 文件處理 ---
MAX_UPLOAD_BYTES = 50 * 1024 * 1024   # 上傳大小上限（50MB）
CHUNK_SIZE = 400               # 切塊字元數
CHUNK_OVERLAP = 80             # 切塊重疊字元數
