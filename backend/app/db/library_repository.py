import uuid
from datetime import datetime, timezone
from typing import Optional

from app.db.supabase_client import get_supabase, transcription_repo


class LibraryRepository:
    FOLDERS_TABLE = "library_folders"
    ITEMS_TABLE = "library_items"
    TRANSCRIPTIONS_TABLE = "transcriptions"
    INBOX_ID = "inbox"
    INBOX_NAME = "Inbox"

    def __init__(self):
        self._db = get_supabase()
        self._folders_memory_store: dict[str, dict] = {}
        self._items_memory_store: dict[str, dict] = {}

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _ensure_memory_inbox(self) -> dict:
        now = self._now_iso()
        if self.INBOX_ID not in self._folders_memory_store:
            self._folders_memory_store[self.INBOX_ID] = {
                "id": self.INBOX_ID,
                "name": self.INBOX_NAME,
                "parent_id": None,
                "created_at": now,
                "updated_at": now,
            }
        return self._folders_memory_store[self.INBOX_ID]

    async def _get_folder(self, folder_id: str) -> Optional[dict]:
        if not self._db:
            self._ensure_memory_inbox()
            return self._folders_memory_store.get(folder_id)
        result = (
            self._db.table(self.FOLDERS_TABLE)
            .select("*")
            .eq("id", folder_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def _validate_transcription_exists(self, transcription_id: str) -> None:
        if not self._db:
            return
        result = (
            self._db.table(self.TRANSCRIPTIONS_TABLE)
            .select("id")
            .eq("id", transcription_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise ValueError("Transcription not found")

    async def get_inbox_folder(self) -> dict:
        if not self._db:
            return self._ensure_memory_inbox()

        result = (
            self._db.table(self.FOLDERS_TABLE)
            .select("*")
            .eq("id", self.INBOX_ID)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]

        payload = {"id": self.INBOX_ID, "name": self.INBOX_NAME, "parent_id": None}
        created = self._db.table(self.FOLDERS_TABLE).insert(payload).execute()
        return created.data[0] if created.data else payload

    async def get_item(self, item_id: str) -> Optional[dict]:
        if not self._db:
            return self._items_memory_store.get(item_id)
        result = (
            self._db.table(self.ITEMS_TABLE)
            .select("*")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def list_folders(self) -> list[dict]:
        if not self._db:
            self._ensure_memory_inbox()
            return sorted(
                self._folders_memory_store.values(),
                key=lambda item: item.get("created_at", ""),
            )
        result = (
            self._db.table(self.FOLDERS_TABLE)
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return result.data or []

    def _build_tree(self, folders: list[dict]) -> list[dict]:
        by_id = {
            folder["id"]: {
                **folder,
                "children": [],
                "is_inbox": folder["id"] == self.INBOX_ID,
            }
            for folder in folders
        }
        roots: list[dict] = []
        for folder in by_id.values():
            parent_id = folder.get("parent_id")
            if parent_id and parent_id in by_id:
                by_id[parent_id]["children"].append(folder)
            else:
                roots.append(folder)
        roots.sort(
            key=lambda folder: 0 if folder.get("id") == self.INBOX_ID else 1
        )
        return roots

    async def list_folder_tree(self) -> list[dict]:
        folders = await self.list_folders()
        return self._build_tree(folders)

    async def create_folder(self, name: str, parent_id: Optional[str]) -> dict:
        normalized_name = name.strip() if name else ""
        if not normalized_name:
            raise ValueError("Folder name is required")

        if parent_id:
            parent = await self._get_folder(parent_id)
            if not parent:
                raise ValueError("Parent folder not found")

        payload = {
            "id": str(uuid.uuid4()),
            "name": normalized_name,
            "parent_id": parent_id,
        }

        if not self._db:
            self._ensure_memory_inbox()
            now = self._now_iso()
            payload["created_at"] = now
            payload["updated_at"] = now
            self._folders_memory_store[payload["id"]] = payload
            return payload

        result = self._db.table(self.FOLDERS_TABLE).insert(payload).execute()
        return result.data[0] if result.data else payload

    async def rename_folder(self, folder_id: str, name: str) -> dict:
        normalized_name = name.strip() if name else ""
        if not normalized_name:
            raise ValueError("Folder name is required")
        if folder_id == self.INBOX_ID:
            raise ValueError("Inbox folder cannot be renamed")

        folder = await self._get_folder(folder_id)
        if not folder:
            raise ValueError("Folder not found")

        if not self._db:
            updated = dict(folder)
            updated["name"] = normalized_name
            updated["updated_at"] = self._now_iso()
            self._folders_memory_store[folder_id] = updated
            return updated

        result = (
            self._db.table(self.FOLDERS_TABLE)
            .update({"name": normalized_name})
            .eq("id", folder_id)
            .execute()
        )
        if not result.data:
            raise ValueError("Folder not found")
        return result.data[0]

    async def move_folder(self, folder_id: str, new_parent_id: Optional[str]) -> dict:
        if folder_id == self.INBOX_ID:
            raise ValueError("Inbox folder cannot be moved")
        if new_parent_id == folder_id:
            raise ValueError("Folder cannot be moved into itself")

        folder = await self._get_folder(folder_id)
        if not folder:
            raise ValueError("Folder not found")

        if new_parent_id:
            parent = await self._get_folder(new_parent_id)
            if not parent:
                raise ValueError("Target parent folder not found")

        folders = await self.list_folders()
        descendants: set[str] = set()
        stack = [folder_id]
        while stack:
            current = stack.pop()
            for entry in folders:
                if entry.get("parent_id") == current:
                    child_id = entry["id"]
                    if child_id not in descendants:
                        descendants.add(child_id)
                        stack.append(child_id)

        if new_parent_id in descendants:
            raise ValueError("Cannot move folder into one of its descendants")

        if not self._db:
            updated = dict(folder)
            updated["parent_id"] = new_parent_id
            updated["updated_at"] = self._now_iso()
            self._folders_memory_store[folder_id] = updated
            return updated

        result = (
            self._db.table(self.FOLDERS_TABLE)
            .update({"parent_id": new_parent_id})
            .eq("id", folder_id)
            .execute()
        )
        if not result.data:
            raise ValueError("Folder not found")
        return result.data[0]

    async def delete_folder(self, folder_id: str) -> dict:
        if folder_id == self.INBOX_ID:
            raise ValueError("Inbox folder cannot be deleted")

        folder = await self._get_folder(folder_id)
        if not folder:
            raise ValueError("Folder not found")

        inbox = await self.get_inbox_folder()

        if not self._db:
            moved_count = 0
            for item_id, item in list(self._items_memory_store.items()):
                if item.get("folder_id") == folder_id:
                    updated = dict(item)
                    updated["folder_id"] = inbox["id"]
                    updated["updated_at"] = self._now_iso()
                    self._items_memory_store[item_id] = updated
                    moved_count += 1
            self._folders_memory_store.pop(folder_id, None)
            return {
                "deleted_folder_id": folder_id,
                "moved_items": moved_count,
                "inbox_folder_id": inbox["id"],
            }

        moved = (
            self._db.table(self.ITEMS_TABLE)
            .update({"folder_id": inbox["id"]})
            .eq("folder_id", folder_id)
            .execute()
        )

        deleted = (
            self._db.table(self.FOLDERS_TABLE)
            .delete()
            .eq("id", folder_id)
            .execute()
        )
        if not deleted.data:
            raise ValueError("Folder not found")

        return {
            "deleted_folder_id": folder_id,
            "moved_items": len(moved.data or []),
            "inbox_folder_id": inbox["id"],
        }

    async def _enrich_item(self, item: dict) -> dict:
        transcription = await transcription_repo.get(item.get("transcription_id"))
        return {
            **item,
            "title": transcription.get("title") if transcription else None,
            "summary": transcription.get("summary") if transcription else None,
            "status": transcription.get("status") if transcription else "unknown",
        }

    async def list_items(self, folder_id: str) -> list[dict]:
        folder = await self._get_folder(folder_id)
        if not folder:
            raise ValueError("Folder not found")

        if not self._db:
            items = sorted(
                [
                    item
                    for item in self._items_memory_store.values()
                    if item.get("folder_id") == folder_id
                ],
                key=lambda item: item.get("created_at", ""),
                reverse=True,
            )
            return [await self._enrich_item(item) for item in items]

        result = (
            self._db.table(self.ITEMS_TABLE)
            .select(
                "id,transcription_id,folder_id,display_name,thumbnail_url,"
                "created_at,updated_at,"
                "transcriptions(title,summary,status)",
            )
            .eq("folder_id", folder_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [
            {
                **item,
                "title": item.get("transcriptions", {}).get("title"),
                "summary": item.get("transcriptions", {}).get("summary"),
                "status": item.get("transcriptions", {}).get("status"),
            }
            for item in (result.data or [])
        ]

    async def rename_item(self, item_id: str, display_name: str) -> dict:
        normalized_name = display_name.strip() if display_name else ""
        if not normalized_name:
            raise ValueError("Item display_name is required")

        if not self._db:
            item = self._items_memory_store.get(item_id)
            if not item:
                raise ValueError("Library item not found")
            updated = dict(item)
            updated["display_name"] = normalized_name
            updated["updated_at"] = self._now_iso()
            self._items_memory_store[item_id] = updated
            return updated

        result = (
            self._db.table(self.ITEMS_TABLE)
            .update({"display_name": normalized_name})
            .eq("id", item_id)
            .execute()
        )
        if not result.data:
            raise ValueError("Library item not found")
        return result.data[0]

    async def move_item(self, item_id: str, folder_id: str) -> dict:
        target_folder = await self._get_folder(folder_id)
        if not target_folder:
            raise ValueError("Target folder not found")

        if not self._db:
            item = self._items_memory_store.get(item_id)
            if not item:
                raise ValueError("Library item not found")
            updated = dict(item)
            updated["folder_id"] = folder_id
            updated["updated_at"] = self._now_iso()
            self._items_memory_store[item_id] = updated
            return updated

        result = (
            self._db.table(self.ITEMS_TABLE)
            .update({"folder_id": folder_id})
            .eq("id", item_id)
            .execute()
        )
        if not result.data:
            raise ValueError("Library item not found")
        return result.data[0]

    async def upsert_item_for_transcription(
        self,
        transcription_id: str,
        display_name: str,
        thumbnail_url: Optional[str],
    ) -> dict:
        normalized_name = display_name.strip() if display_name else ""
        if not normalized_name:
            raise ValueError("Item display_name is required")

        await self._validate_transcription_exists(transcription_id)
        inbox = await self.get_inbox_folder()

        if not self._db:
            existing = next(
                (
                    item
                    for item in self._items_memory_store.values()
                    if item.get("transcription_id") == transcription_id
                ),
                None,
            )
            if existing:
                updated = dict(existing)
                updated["display_name"] = normalized_name
                updated["thumbnail_url"] = thumbnail_url
                updated["updated_at"] = self._now_iso()
                self._items_memory_store[updated["id"]] = updated
                return updated

            now = self._now_iso()
            payload = {
                "id": str(uuid.uuid4()),
                "transcription_id": transcription_id,
                "folder_id": inbox["id"],
                "display_name": normalized_name,
                "thumbnail_url": thumbnail_url,
                "created_at": now,
                "updated_at": now,
            }
            self._items_memory_store[payload["id"]] = payload
            return payload

        existing_result = (
            self._db.table(self.ITEMS_TABLE)
            .select("*")
            .eq("transcription_id", transcription_id)
            .limit(1)
            .execute()
        )

        if existing_result.data:
            item_id = existing_result.data[0]["id"]
            result = (
                self._db.table(self.ITEMS_TABLE)
                .update({
                    "display_name": normalized_name,
                    "thumbnail_url": thumbnail_url,
                })
                .eq("id", item_id)
                .execute()
            )
            return result.data[0] if result.data else existing_result.data[0]

        payload = {
            "id": str(uuid.uuid4()),
            "transcription_id": transcription_id,
            "folder_id": inbox["id"],
            "display_name": normalized_name,
            "thumbnail_url": thumbnail_url,
        }
        result = self._db.table(self.ITEMS_TABLE).insert(payload).execute()
        return result.data[0] if result.data else payload


library_repo = LibraryRepository()
