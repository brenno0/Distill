from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.models.library import (
    CreateFolderRequest,
    DeleteFolderResponse,
    LibraryFolder,
    LibraryFolderTree,
    LibraryItem,
    LibraryItemsResponse,
    LibraryTreeResponse,
    MoveFolderRequest,
    MoveLibraryItemRequest,
    RenameFolderRequest,
    RenameLibraryItemRequest,
)
from app.services.library_service import library_service

router = APIRouter()


def _raise_http_for_value_error(exc: ValueError) -> None:
    message = str(exc)
    status_code = 404 if "not found" in message.lower() else 400
    raise HTTPException(status_code=status_code, detail=message)


@router.get("/folders", response_model=list[LibraryFolder])
async def list_folders():
    return await library_service.list_folders()


@router.get("/folders/tree", response_model=LibraryTreeResponse)
async def list_folder_tree():
    return {"folders": await library_service.list_folder_tree()}


@router.post("/folders", response_model=LibraryFolder)
async def create_folder(body: CreateFolderRequest):
    try:
        return await library_service.create_folder(name=body.name, parent_id=body.parent_id)
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.patch("/folders/{folder_id}", response_model=LibraryFolder)
async def rename_folder(folder_id: str, body: RenameFolderRequest):
    try:
        return await library_service.rename_folder(folder_id=folder_id, name=body.name)
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.post("/folders/{folder_id}/move", response_model=LibraryFolder)
async def move_folder(folder_id: str, body: MoveFolderRequest):
    try:
        return await library_service.move_folder(
            folder_id=folder_id,
            new_parent_id=body.new_parent_id,
        )
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.delete("/folders/{folder_id}", response_model=DeleteFolderResponse)
async def delete_folder(folder_id: str):
    try:
        return await library_service.delete_folder(folder_id=folder_id)
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.get("/items", response_model=LibraryItemsResponse)
async def list_items(folder_id: str = Query(...)):
    try:
        return {"items": await library_service.list_items(folder_id=folder_id)}
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.patch("/items/{item_id}", response_model=LibraryItem)
async def rename_item(item_id: str, body: RenameLibraryItemRequest):
    try:
        return await library_service.rename_item(item_id=item_id, display_name=body.display_name)
    except ValueError as exc:
        _raise_http_for_value_error(exc)


@router.post("/items/{item_id}/move", response_model=LibraryItem)
async def move_item(item_id: str, body: MoveLibraryItemRequest):
    try:
        return await library_service.move_item(item_id=item_id, folder_id=body.folder_id)
    except ValueError as exc:
        _raise_http_for_value_error(exc)


class DeleteItemResponse(BaseModel):
    deleted: bool
    transcription_id: str


@router.delete("/items/{item_id}", response_model=DeleteItemResponse)
async def delete_item(item_id: str):
    try:
        return await library_service.delete_item(item_id=item_id)
    except ValueError as exc:
        _raise_http_for_value_error(exc)
