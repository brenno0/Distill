from typing import Optional

from app.db import library_repository
from app.db.supabase_client import transcription_repo


class LibraryService:
    async def list_folders(self) -> list[dict]:
        return await library_repository.library_repo.list_folders()

    async def create_folder(self, name: str, parent_id: Optional[str]) -> dict:
        return await library_repository.library_repo.create_folder(name=name, parent_id=parent_id)

    async def rename_folder(self, folder_id: str, name: str) -> dict:
        return await library_repository.library_repo.rename_folder(folder_id=folder_id, name=name)

    async def move_folder(self, folder_id: str, new_parent_id: Optional[str]) -> dict:
        return await library_repository.library_repo.move_folder(folder_id=folder_id, new_parent_id=new_parent_id)

    async def delete_folder(self, folder_id: str) -> dict:
        return await library_repository.library_repo.delete_folder(folder_id=folder_id)

    async def list_items(self, folder_id: str) -> list[dict]:
        return await library_repository.library_repo.list_items(folder_id=folder_id)

    async def list_folder_tree(self) -> list[dict]:
        return await library_repository.library_repo.list_folder_tree()

    async def rename_item(self, item_id: str, display_name: str) -> dict:
        return await library_repository.library_repo.rename_item(item_id=item_id, display_name=display_name)

    async def move_item(self, item_id: str, folder_id: str) -> dict:
        return await library_repository.library_repo.move_item(item_id=item_id, folder_id=folder_id)

    async def delete_item(self, item_id: str) -> dict:
        item = await library_repository.library_repo.get_item(item_id)
        if not item:
            raise ValueError("Library item not found")
        deleted = await transcription_repo.delete(item["transcription_id"])
        return {"deleted": deleted, "transcription_id": item["transcription_id"]}


library_service = LibraryService()
