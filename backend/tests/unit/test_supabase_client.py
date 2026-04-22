from app.db.supabase_client import TranscriptionRepository


async def test_memory_fallback_crud_cycle():
    repo = TranscriptionRepository()
    repo._db = None

    created = await repo.create(
        {
            "id": "t-1",
            "title": "Meeting A",
            "transcription_type": "meeting",
            "status": "pending",
            "audio_path": "/tmp/a.wav",
        }
    )

    assert created["id"] == "t-1"
    assert created["created_at"]
    assert created["updated_at"]

    fetched = await repo.get("t-1")
    assert fetched is not None
    assert fetched["title"] == "Meeting A"

    updated = await repo.update("t-1", {"status": "completed", "summary": "Done"})
    assert updated is not None
    assert updated["status"] == "completed"
    assert updated["summary"] == "Done"

    listing = await repo.list(limit=10)
    assert len(listing) == 1
    assert set(listing[0].keys()) == {
        "id",
        "title",
        "transcription_type",
        "status",
        "summary",
        "created_at",
    }

    deleted = await repo.delete("t-1")
    assert deleted is True
    assert await repo.get("t-1") is None


async def test_memory_fallback_list_orders_newest_first():
    repo = TranscriptionRepository()
    repo._db = None

    await repo.create(
        {
            "id": "older",
            "title": "Older",
            "transcription_type": "meeting",
            "status": "pending",
            "created_at": "2024-01-01T00:00:00",
        }
    )
    await repo.create(
        {
            "id": "newer",
            "title": "Newer",
            "transcription_type": "meeting",
            "status": "pending",
            "created_at": "2024-01-02T00:00:00",
        }
    )

    listing = await repo.list(limit=1)
    assert [item["id"] for item in listing] == ["newer"]
