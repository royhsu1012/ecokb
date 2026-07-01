---
description: 檢查 UI 改動是否符合 EconKB 設計系統
---

針對最近修改的前端檔案，逐一檢查以下設計一致性：

## 色彩使用
確認使用的顏色符合設計系統，或引用 CSS 變數：
- 背景：`#0d1117`（`var(--bg)`）
- 側邊欄/topbar：`#0a1628` 或 `#0d1f3c`
- 卡片：`#111827`（`var(--card)`）
- 邊框：`#1e3a5f`（`var(--border)`）或 `#1a2f50`
- 主色：`#7c3aed`（紫）
- 次色：`#2d7dd2`（藍）
- 強調：`#0fc6c2`（青）

若有新引入的顏色，請標示出來並詢問是否符合設計意圖。

## 元件一致性
- Topbar Logo：使用 `<Logo showText={false} />` + `<span>頁面名稱</span>`
- 側邊欄 Logo：使用 `<Logo />` 完整顯示
- 返回按鈕：使用 `.btn-ghost` 樣式
- 刪除按鈕：使用 `.del-btn` 類別
- 狀態 pulse 點：使用 `.pulse` 類別

## 互動行為
- Hover 效果：確認使用 CSS 類別而非 JS 操作
- 按鈕 disabled 狀態：`cursor: not-allowed`、降低 opacity
- 輸入框 focus：`borderColor` 變為 `#7c3aed`

## 文字
- 標籤文字（UPPERCASE）：`fontSize: 11-12px`、`fontWeight: 600`、`letterSpacing: 0.05em`
- 標題：`fontSize: 15-18px`、`fontWeight: 700`、`color: #e2e8f0`
- 說明文字：`fontSize: 12-13px`、`color: #64748b` 或 `#475569`

## 輸出格式
對每個檢查項目回報：
- ✅ 符合
- ⚠️ 輕微偏差（可接受但需注意）
- ❌ 不符合（需修正 + 建議）
