import pytest

from app.db.library_repository import LibraryRepository


@pytest.mark.asyncio
async def test_get_inbox_folder_available_in_memory_mode():
    repo = LibraryRepository()
    repo._db = None

    inbox = await repo.get_inbox_folder()

    assert inbox["id"] == "inbox"
    assert inbox["name"] == "Inbox"


@pytest.mark.asyncio
async def test_move_folder_rejects_cycles():
    repo = LibraryRepository()
    repo._db = None

    parent = await repo.create_folder("Parent", None)
    child = await repo.create_folder("Child", parent["id"])
    grandchild = await repo.create_folder("Grandchild", child["id"])

    with pytest.raises(ValueError, match="descendants"):
        await repo.move_folder(parent["id"], grandchild["id"])


@pytest.mark.asyncio
async def test_delete_folder_moves_items_to_inbox():
    repo = LibraryRepository()
    repo._db = None

    folder = await repo.create_folder("Videos", None)
    item = await repo.upsert_item_for_transcription("tx-1", "Video 1", None)
    await repo.move_item(item["id"], folder["id"])

    result = await repo.delete_folder(folder["id"])
    inbox_items = await repo.list_items("inbox")

    assert result["moved_items"] == 1
    assert inbox_items[0]["id"] == item["id"]


@pytest.mark.asyncio
async def test_upsert_item_for_transcription_updates_existing_item():
    repo = LibraryRepository()
    repo._db = None

    created = await repo.upsert_item_for_transcription("tx-2", "Original", None)
    updated = await repo.upsert_item_for_transcription(
        "tx-2",
        "Updated",
        "https://img.youtube.com/new.jpg",
    )

    assert updated["id"] == created["id"]
    assert updated["display_name"] == "Updated"
    assert updated["thumbnail_url"] == "https://img.youtube.com/new.jpg"


@pytest.mark.asyncio
async def test_delete_inbox_folder_is_forbidden():
    repo = LibraryRepository()
    repo._db = None

    with pytest.raises(ValueError, match="cannot be deleted"):
        await repo.delete_folder("inbox")


@pytest.mark.asyncio
async def test_list_items_enriches_with_transcription_data():
    from app.db.supabase_client import transcription_repo

    repo = LibraryRepository()
    repo._db = None
    transcription_repo._db = None

    await transcription_repo.create({
        "id": "t-1",
        "title": "Meeting A",
        "transcription_type": "meeting",
        "status": "completed",
        "summary": "discussed Q3 targets",
        "audio_path": "/tmp/a.wav",
    })

    item = await repo.upsert_item_for_transcription("t-1", "Meeting A", None)
    items = await repo.list_items(folder_id=item["folder_id"])

    assert len(items) == 1
    assert items[0]["display_name"] == "Meeting A"
    assert items[0]["title"] == "Meeting A"
    assert items[0]["summary"] == "discussed Q3 targets"
    assert items[0]["status"] == "completed"


@pytest.mark.asyncio
async def test_list_folder_tree_returns_inbox_first():
    repo = LibraryRepository()
    repo._db = None

    root = await repo.create_folder("Root", None)
    tree = await repo.list_folder_tree()

    assert tree[0]["id"] == "inbox"
    assert tree[0]["is_inbox"] is True
    assert any(f["id"] == root["id"] for f in tree)


@pytest.mark.asyncio
async def test_list_folder_tree_builds_children_and_inbox_flag():
    repo = LibraryRepository()
    repo._db = None

    root = await repo.create_folder("Root", None)
    child = await repo.create_folder("Child", root["id"])
    tree = await repo.list_folder_tree()

    assert tree[0]["id"] == "inbox"
    assert tree[0]["is_inbox"] is True
    assert any(folder["id"] == root["id"] for folder in tree)
    root_node = next(folder for folder in tree if folder["id"] == root["id"])
    assert root_node["children"][0]["id"] == child["id"]

