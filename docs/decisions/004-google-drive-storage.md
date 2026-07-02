---
status: 棄用
date: 2024-12
superseded-by: ADR-005
---

# ADR-004 原始檔案儲存採用 Google Drive（已棄用）

## 背景

使用者上傳的文件（PDF、Word、Excel）需要持久化儲存。解析後的向量存在 Supabase，但原始檔案需另存。

## 決策（初版）

使用 Google Drive API + Service Account 儲存原始檔案，並記錄 `drive_file_id` 和 `drive_url` 於 documents 資料表。

## 棄用原因

- Google Service Account 設定複雜（需 JSON 憑證、Drive API 授權）
- 額外依賴三個 google-* 套件（api-python-client、auth、auth-httplib2）
- Supabase Storage 已包含在免費方案（1GB），同平台、設定更簡單

## 替代方案（現採用）

改用 **Supabase Storage**，詳見 [ADR-005](005-zero-cost-stack.md)。

- bucket 名稱：`documents`（Public）
- 儲存路徑：`{user_id}/{filename}`
- DB 欄位 `drive_file_id` 改存 storage path，`drive_url` 改存公開 URL
