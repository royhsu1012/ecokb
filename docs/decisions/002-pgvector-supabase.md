---
status: 採用
date: 2024-12
---

# ADR-002 向量儲存採用 Supabase pgvector

## 背景

RAG 系統需要向量相似度搜尋。主要選項：Pinecone（專用向量 DB）、Weaviate、Qdrant、pgvector（PostgreSQL 擴充）。

## 決策

使用 Supabase 內建的 pgvector 擴充。向量維度 1536（OpenAI text-embedding-3-small）。索引類型選擇 HNSW（非 IVFFlat）。

## 後果

**優點**
- 合併關聯資料（users、documents）與向量於同一 DB，單一連線、單一帳單
- HNSW 索引不需要最低資料量（IVFFlat 需要 > lists * 39 筆才能被使用）
- Supabase 免費方案含 500MB 儲存

**限制**
- 向量搜尋效能不如專用向量 DB（百萬筆以上才明顯）
- 目前資料量規模（< 10 萬筆 chunks）HNSW 已足夠

**替代方案棄用原因**
- Pinecone：額外帳單、無法 JOIN 關聯資料
- IVFFlat：需要 vacuum 且資料量少時 index 不被使用
