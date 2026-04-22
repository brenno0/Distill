# Library API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar a Library API no backend (árvore de pastas, itens enriquecidos e delete com remoção da transcrição) e garantir integração do frontend.

**Architecture:** FastAPI expõe rotas REST; o service orquestra e o repository lida com Supabase + fallback em memória. A listagem de itens é enriquecida com dados de transcrições. A UI consome `/folders/tree` e `/items`.

**Tech Stack:** FastAPI, Pydantic, Supabase Python client, React, TanStack Query.

---

### Task 1: Teste para árvore de pastas (repo em memória)

**Files:**
- Modify: `backend/tests/unit/test_library_repository.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_list_folder_tree_builds_children_and_inbox_flag():
    repo = LibraryRepository()
    repo._db = None

    root = await repo.create_folder("Root", None)
    child = await repo.create_folder("Child", root["id"])
    tree = await repo.list_folder_tree()

    assert tree[0]["id"] == "inbox"
    assert tree[0]["is_inbox"] is True
    assert any(f["id"] == root["id"] for f in tree)
    root_node = next(f for f in tree if f["id"] == root["id"])
    assert root_node["children"][0]["id"] == child["id"]
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_folder_tree_builds_children_and_inbox_flag -v`  
Expected: FAIL with "attribute list_folder_tree not found"

**Step 3: Write minimal implementation**

```python
def _build_tree(self, folders: list[dict]) -> list[dict]:
    by_id = {f["id"]: {**f, "children": [], "is_inbox": f["id"] == self.INBOX_ID} for f in folders}
    roots: list[dict] = []
    for folder in by_id.values():
        parent_id = folder.get("parent_id")
        if parent_id and parent_id in by_id:
            by_id[parent_id]["children"].append(folder)
        else:
            roots.append(folder)
    return roots

async def list_folder_tree(self) -> list[dict]:
    folders = await self.list_folders()
    return self._build_tree(folders)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_folder_tree_builds_children_and_inbox_flag -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/tests/unit/test_library_repository.py backend/app/db/library_repository.py
git commit -m "test: cover library folder tree"
```

---

### Task 2: Itens enriquecidos (repo em memória)

**Files:**
- Modify: `backend/tests/unit/test_library_repository.py`
- Modify: `backend/app/db/library_repository.py`
- Modify: `backend/app/db/library_repository.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_list_items_enriches_with_transcription_data():
    repo = LibraryRepository()
    repo._db = None
    await transcription_repo.create({
        "id": "t-1",
        "title": "Meeting A",
        "transcription_type": "meeting",
        "status": "completed",
        "summary": "done",
        "audio_path": "/tmp/a.wav",
    })
    item = await repo.upsert_item_for_transcription("t-1", "Meeting A", None)

    items = await repo.list_items(folder_id=item["folder_id"])
    assert items[0]["title"] == "Meeting A"
    assert items[0]["status"] == "completed"
    assert items[0]["summary"] == "done"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_items_enriches_with_transcription_data -v`  
Expected: FAIL with missing keys

**Step 3: Write minimal implementation**

```python
from app.db.supabase_client import transcription_repo

async def _enrich_item(self, item: dict) -> dict:
    transcription = await transcription_repo.get(item["transcription_id"])
    return {
        **item,
        "title": transcription.get("title") if transcription else None,
        "summary": transcription.get("summary") if transcription else None,
        "status": transcription.get("status") if transcription else "unknown",
    }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_items_enriches_with_transcription_data -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/tests/unit/test_library_repository.py backend/app/db/library_repository.py
git commit -m "feat: enrich library items in memory mode"
```

---

### Task 3: Supabase queries para árvore e itens enriquecidos

**Files:**
- Modify: `backend/app/db/library_repository.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_list_folder_tree_returns_inbox_first_in_memory_mode():
    repo = LibraryRepository()
    repo._db = None
    tree = await repo.list_folder_tree()
    assert tree[0]["id"] == "inbox"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_folder_tree_returns_inbox_first_in_memory_mode -v`  
Expected: FAIL if ordering not stable

**Step 3: Write minimal implementation**

```python
def _build_tree(self, folders: list[dict]) -> list[dict]:
    # depois de montar, garantir inbox primeiro
    roots = ...
    roots.sort(key=lambda f: 0 if f["id"] == self.INBOX_ID else 1)
    return roots

async def list_items(self, folder_id: str) -> list[dict]:
    result = (
        self._db.table(self.ITEMS_TABLE)
        .select("id,transcription_id,folder_id,display_name,thumbnail_url,created_at,transcriptions(title,summary,status)")
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
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_list_folder_tree_returns_inbox_first_in_memory_mode -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/tests/unit/test_library_repository.py backend/app/db/library_repository.py
git commit -m "feat: stable inbox ordering in folder tree"
```

---

### Task 4: Delete item remove transcrição

**Files:**
- Create: `backend/tests/unit/test_library_service.py`
- Modify: `backend/app/services/library_service.py`
- Modify: `backend/app/db/library_repository.py`
- Modify: `backend/app/api/v1/endpoints/library.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_delete_item_removes_transcription(monkeypatch):
    called = []
    async def fake_get_item(item_id):
        return {"id": item_id, "transcription_id": "tx-1"}
    async def fake_delete(tid):
        called.append(tid)
        return True
    monkeypatch.setattr(library_repo, "get_item", fake_get_item)
    monkeypatch.setattr(transcription_repo, "delete", fake_delete)

    result = await library_service.delete_item("item-1")
    assert called == ["tx-1"]
    assert result["deleted"] is True
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_delete_item_removes_transcription -v`  
Expected: FAIL with attribute delete_item not found

**Step 3: Write minimal implementation**

```python
async def delete_item(self, item_id: str) -> dict:
    item = await library_repo.get_item(item_id)
    if not item:
        raise ValueError("Library item not found")
    deleted = await transcription_repo.delete(item["transcription_id"])
    return {"deleted": deleted, "transcription_id": item["transcription_id"]}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_service.py::test_delete_item_removes_transcription -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/tests/unit/test_library_service.py backend/app/services/library_service.py backend/app/db/library_repository.py backend/app/api/v1/endpoints/library.py
git commit -m "feat: delete library item removes transcription"
```

---

### Task 5: Ajustar models/DTOs e endpoints da Library API

**Files:**
- Create: `backend/tests/unit/test_library_endpoint.py`
- Modify: `backend/app/models/library.py`
- Modify: `backend/app/api/v1/endpoints/library.py`
- Modify: `backend/app/services/library_service.py`

**Step 1: Write the failing test**

```python
async def test_list_folders_returns_tree_response(monkeypatch):
    async def fake_tree():
        return [{"id": "inbox", "name": "Inbox", "children": [], "is_inbox": True}]
    monkeypatch.setattr(library_service, "list_folder_tree", fake_tree)

    result = await list_folders()
    assert result["folders"][0]["is_inbox"] is True
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_endpoint.py::test_list_folders_returns_tree_response -v`  
Expected: FAIL (no wrapper response)

**Step 3: Write minimal implementation**

```python
class LibraryTreeResponse(BaseModel):
    folders: list[LibraryFolder]

class LibraryItemsResponse(BaseModel):
    items: list[LibraryItem]

class MoveFolderRequest(BaseModel):
    parent_id: Optional[str] = None
```

```python
@router.get("/folders/tree", response_model=LibraryTreeResponse)
async def list_folders():
    return {"folders": await library_service.list_folder_tree()}

@router.get("/items", response_model=LibraryItemsResponse)
async def list_items(folder_id: str = Query(...)):
    return {"items": await library_service.list_items(folder_id=folder_id)}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_settings_endpoint.py::test_list_folders_returns_tree_response -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/tests/unit/test_library_endpoint.py backend/app/models/library.py backend/app/api/v1/endpoints/library.py backend/app/services/library_service.py
git commit -m "feat: align library DTOs and responses"
```

---

### Task 6: Incluir transcrições de meetings na Library

**Files:**
- Create: `backend/tests/unit/test_transcription_service.py`
- Modify: `backend/app/services/transcription_service.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_transcription_completion_upserts_library_item(monkeypatch):
    calls = []
    async def fake_upsert(**kwargs):
        calls.append(kwargs)
    monkeypatch.setattr(library_repo, "upsert_item_for_transcription", fake_upsert)
    # simule o payload final e verifique chamada
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_transcription_service.py::test_transcription_completion_upserts_library_item -v`  
Expected: FAIL (sem chamada)

**Step 3: Write minimal implementation**

```python
record = await transcription_repo.get(transcription_id)
await library_repo.upsert_item_for_transcription(
    transcription_id=transcription_id,
    display_name=record.get("title", transcription_id),
    thumbnail_url=None,
)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_transcription_service.py::test_transcription_completion_upserts_library_item -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/transcription_service.py backend/tests/unit/test_transcription_service.py
git commit -m "feat: add meetings to library catalog"
```

---

### Task 7: Frontend alinhamento e validação

**Files:**
- Modify (se necessário): `distill/src/renderer/src/features/library/lib/libraryApi.ts`
- Modify (se necessário): `distill/src/renderer/src/features/library/types.ts`

**Step 1: Write the failing test**

```ts
// opcional: teste de tipos via TS para garantir LibraryTreeResponse/ItemsResponse
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npm run typecheck`  
Expected: FAIL se os tipos não alinharem

**Step 3: Write minimal implementation**

```ts
// Ajustar tipos se backend mudar nomes/campos
```

**Step 4: Run test to verify it passes**

Run: `cd distill && npm run typecheck`  
Expected: PASS

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/library/lib/libraryApi.ts distill/src/renderer/src/features/library/types.ts
git commit -m "feat: align library frontend types with API"
```
