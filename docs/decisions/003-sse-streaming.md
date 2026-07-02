---
status: 採用
date: 2024-12
---

# ADR-003 LLM 回答採用 SSE 串流

## 背景

Claude API 支援串流輸出，可讓使用者即時看到回答逐字出現，提升感知速度。傳輸方式有 WebSocket 與 SSE（Server-Sent Events）兩種。

## 決策

後端使用 FastAPI `StreamingResponse` 輸出 SSE 格式，前端用 `fetch` + `ReadableStream` 讀取。

## 後果

**優點**
- SSE 是單向串流，實作比 WebSocket 簡單（無需握手、斷線重連由瀏覽器處理）
- FastAPI 原生支援，無需額外套件
- HTTP/1.1 相容，不需要 HTTP/2

**關鍵實作注意**
- 後端：`async with generate_answer(...) as s` — 不加 `await`（`stream()` 回傳 context manager 非 coroutine）
- 前端：逐行解析 `data: {...}` 格式，遇到 `[DONE]` 結束

**限制**
- SSE 為單向（server → client），若未來需要雙向互動（例如中途取消生成）需改用 WebSocket
