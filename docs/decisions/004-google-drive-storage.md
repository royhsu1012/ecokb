---
status: 待評估
date: 2024-12
---

# ADR-004 原始檔案儲存採用 Google Drive

## 背景

使用者上傳的文件（PDF、Word、Excel）需要持久化儲存。解析後的向量存在 Supabase，但原始檔案需另存。

## 決策

使用 Google Drive API + Service Account 儲存原始檔案，並記錄 `drive_file_id` 和 `drive_url` 於 documents 資料表。

## 後果

**優點**
- 免費儲存空間大（15GB）
- 可透過 Drive URL 直接預覽文件

**風險（待驗證）**
- Google Service Account 設定較複雜（需 JSON 憑證）
- `GOOGLE_SERVICE_ACCOUNT_JSON` 環境變數尚未在生產環境設定
- 若 Drive API 呼叫失敗，整個上傳流程會失敗

**替代方案**
- Supabase Storage：同一平台、設定更簡單，免費方案含 1GB
- 若 Google Drive 整合驗證困難，考慮切換至 Supabase Storage
