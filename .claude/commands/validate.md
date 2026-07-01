---
description: 驗證前端型別與 build，確保改動沒有破壞任何東西
---

執行以下驗證步驟，並在每步完成後報告結果：

## 步驟 1 — TypeScript 型別檢查
在 `frontend/` 目錄執行：
```bash
npx tsc --noEmit
```
- 若無輸出：型別正確 ✅
- 若有錯誤：列出每個錯誤的檔案與行號，並說明修正方式

## 步驟 2 — 編碼規範檢查
搜尋以下反模式，若找到請指出位置並說明問題：

1. **模組層級 DEMO 判斷**：在元件函式外使用 `localStorage.getItem("access_token")` 判斷 demo 狀態
   - 正確做法：在 `useEffect` 內設定 `isDemo.current = s.token === "demo-token"`

2. **Hover 直接操作 DOM**：`onMouseEnter` 裡用 `e.target.style.xxx = ...`
   - 正確做法：使用 `.btn-ghost`、`.del-btn`、`.suggestion-chip` CSS 類別

3. **元件內嵌 `<style>` 標籤**：如 `<style>{\`@keyframes ...\`}</style>`
   - 正確做法：動畫定義在 `globals.css`

4. **文件陣列型別**：`useState<any[]>` 用於文件列表
   - 正確做法：`useState<Document[]>`（從 `lib/types.ts` 引入）

5. **重複 Logo 標記**：手動寫 Logo div 而非使用 `<Logo />` 元件

## 步驟 3 — 摘要
列出：
- 通過的項目 ✅
- 發現的問題 ⚠️（含檔案:行號）
- 建議的修正（若有問題）
