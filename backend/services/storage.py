import json
import io
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2 import service_account
from config import get_settings

SCOPES = ["https://www.googleapis.com/auth/drive"]


def _get_drive_service():
    settings = get_settings()
    sa_info = json.loads(settings.google_service_account_json)
    credentials = service_account.Credentials.from_service_account_info(
        sa_info, scopes=SCOPES
    )
    return build("drive", "v3", credentials=credentials)


def _get_or_create_user_folder(service, user_id: str) -> str:
    root_folder_id = get_settings().google_drive_root_folder_id
    query = (
        f"name='{user_id}' and mimeType='application/vnd.google-apps.folder' "
        f"and '{root_folder_id}' in parents and trashed=false"
    )
    results = service.files().list(q=query, fields="files(id)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    folder_metadata = {
        "name": user_id,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [root_folder_id],
    }
    folder = service.files().create(body=folder_metadata, fields="id").execute()
    return folder["id"]


async def store_file(file_bytes: bytes, user_id: str, filename: str, mime_type: str = "application/octet-stream") -> dict:
    service = _get_drive_service()
    folder_id = _get_or_create_user_folder(service, user_id)

    file_metadata = {"name": filename, "parents": [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type)
    file = service.files().create(
        body=file_metadata, media_body=media, fields="id,webViewLink"
    ).execute()

    # Make readable by anyone with link
    service.permissions().create(
        fileId=file["id"],
        body={"role": "reader", "type": "anyone"},
    ).execute()

    return {"drive_file_id": file["id"], "drive_url": file.get("webViewLink", "")}


async def delete_file(drive_file_id: str) -> None:
    service = _get_drive_service()
    service.files().delete(fileId=drive_file_id).execute()
