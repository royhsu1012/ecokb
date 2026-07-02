---
status: 採用
date: 2024-12
---

# ADR-001 前端採用靜態匯出部署至 Vercel

## 背景

前端需要一個低成本、零維運的部署方案。Next.js 支援 SSR（需要 Node.js server）與靜態匯出（純 HTML/JS/CSS）兩種模式。

## 決策

使用 `output: 'export'` 靜態匯出，部署至 Vercel 免費方案。所有動態資料需求（問答、文件列表）透過 API 呼叫後端處理，前端本身無伺服器邏輯。

## 後果

**優點**
- 部署零成本、CDN 全球加速
- 無冷啟動問題
- GitHub Pages 可作為備援部署目標

**限制**
- 無法使用 Next.js Server Actions、Route Handlers、ISR
- `basePath` 需依部署目標區分（Vercel 為空、GitHub Pages 為 `/ecokb`）
- 透過 `NEXT_PUBLIC_BASE_PATH` 環境變數控制，CI 設定 `/ecokb`，Vercel 留空
