from __future__ import annotations
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LibraryFolder(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[str] = None


class RenameFolderRequest(BaseModel):
    name: str


class MoveFolderRequest(BaseModel):
    new_parent_id: Optional[str] = None


class DeleteFolderResponse(BaseModel):
    deleted_folder_id: str
    moved_items: int
    inbox_folder_id: str


class LibraryItem(BaseModel):
    id: str
    transcription_id: str
    folder_id: str
    display_name: str
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Enriched fields from transcriptions
    title: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None


class LibraryTreeResponse(BaseModel):
    folders: list["LibraryFolderTree"]


class LibraryItemsResponse(BaseModel):
    items: list["LibraryItem"]


class LibraryFolderTree(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    children: list["LibraryFolderTree"] = []
    is_inbox: bool = False
    created_at: datetime
    updated_at: datetime


class RenameLibraryItemRequest(BaseModel):
    display_name: str


class MoveLibraryItemRequest(BaseModel):
    folder_id: str
