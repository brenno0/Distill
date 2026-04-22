# Library Folders + YouTube Thumbnails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar pastas manuais recursivas na Library, renomear itens transcritos e exibir thumbnail de imports do YouTube.

**Architecture:** Criar uma camada dedicada de Library no backend com duas tabelas (`library_folders`, `library_items`) e endpoints próprios para CRUD/movimentação. `transcriptions` continua sendo a fonte do conteúdo transcrito, enquanto `library_items` controla organização, nome de exibição e thumbnail. No frontend, substituir listagem direta de `transcriptions` por árvore de pastas + itens da pasta ativa.

**Tech Stack:** FastAPI, Supabase/PostgreSQL, React, TanStack Query, Zustand, Orval, pytest, TypeScript.

---

### Task 1: Criar schema de Library (pastas recursivas + itens)

**Files:**
- Create: `backend/migrations/003_create_library_tables.sql`
- Modify: `backend/app/db/migrations.py` (apenas se necessário para ordem/bootstrap)
- Test: `backend/tests/unit/test_library_schema_rules.py`

**Step 1: Write the failing test**

```python
def test_library_folder_delete_moves_items_to_inbox_rule_documented():
    # smoke test de regra esperada no schema/migration
    assert True is False
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_schema_rules.py -v`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Criar migration com:

```sql
CREATE TABLE library_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT NULL REFERENCES library_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE library_items (
  id TEXT PRIMARY KEY,
  transcription_id TEXT NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL REFERENCES library_folders(id),
  display_name TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Criar pasta `Inbox` no bootstrap da migration.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_schema_rules.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/migrations/003_create_library_tables.sql backend/tests/unit/test_library_schema_rules.py
git commit -m "feat(db): add recursive library folders and items tables"
```

### Task 2: Implementar repositories da Library no backend

**Files:**
- Create: `backend/app/db/library_repository.py`
- Test: `backend/tests/unit/test_library_repository.py`

**Step 1: Write the failing test**

```python
async def test_create_folder_under_parent_returns_folder_dict():
    repo = LibraryRepository()
    folder = await repo.create_folder(name="Projetos", parent_id="root")
    assert folder["name"] == "Projetos"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py::test_create_folder_under_parent_returns_folder_dict -v`  
Expected: FAIL por classe/métodos inexistentes.

**Step 3: Write minimal implementation**

Implementar no repositório:
- `get_inbox_folder()`
- `list_folders_tree()`
- `create_folder(name, parent_id)`
- `rename_folder(folder_id, name)`
- `move_folder(folder_id, new_parent_id)` com anti-ciclo
- `delete_folder(folder_id)` movendo itens para Inbox
- `list_items(folder_id)`
- `rename_item(item_id, display_name)`
- `move_item(item_id, folder_id)`
- `upsert_item_for_transcription(transcription_id, display_name, thumbnail_url, folder_id=inbox)`

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_repository.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/db/library_repository.py backend/tests/unit/test_library_repository.py
git commit -m "feat(backend): add library repository with folder tree and item ops"
```

### Task 3: Expor API de Library e integrar no app startup

**Files:**
- Create: `backend/app/api/v1/endpoints/library.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/models/transcription.py` (novos schemas de request/response, se necessário)
- Test: `backend/tests/unit/test_library_endpoints.py`

**Step 1: Write the failing test**

```python
async def test_list_library_tree_returns_folders_and_items():
    # chama endpoint e valida shape
    assert False
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_library_endpoints.py -v`  
Expected: FAIL.

**Step 3: Write minimal implementation**

Adicionar endpoints:
- `GET /api/v1/library/folders`
- `POST /api/v1/library/folders`
- `PATCH /api/v1/library/folders/{id}`
- `POST /api/v1/library/folders/{id}/move`
- `DELETE /api/v1/library/folders/{id}`
- `GET /api/v1/library/items?folder_id=...`
- `PATCH /api/v1/library/items/{id}` (rename)
- `POST /api/v1/library/items/{id}/move`

Incluir router em `main.py`.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_library_endpoints.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/library.py backend/app/main.py backend/app/models/transcription.py backend/tests/unit/test_library_endpoints.py
git commit -m "feat(api): add library folders and items endpoints"
```

### Task 4: Persistir thumbnail do YouTube e criar item na Library

**Files:**
- Modify: `backend/app/services/youtube_processor.py`
- Modify: `backend/app/services/youtube_service.py`
- Test: `backend/tests/unit/test_youtube_processor.py`
- Test: `backend/tests/unit/test_youtube_service.py` (create)

**Step 1: Write the failing test**

```python
async def test_extract_audio_returns_thumbnail_url():
    result = await youtube_processor.extract_audio("https://youtu.be/abc")
    assert "thumbnail_url" in result
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_youtube_service.py::test_extract_audio_returns_thumbnail_url -v`  
Expected: FAIL.

**Step 3: Write minimal implementation**

- Em `youtube_processor`, extrair thumbnail via `yt-dlp --dump-json` (ou campo equivalente) e retornar `thumbnail_url`.
- Em `youtube_service.process`, ao concluir pipeline:
  - manter update de `transcriptions`;
  - chamar repository para `upsert_item_for_transcription(...)` com `display_name=title` e `thumbnail_url`.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_youtube_processor.py tests/unit/test_youtube_service.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/services/youtube_processor.py backend/app/services/youtube_service.py backend/tests/unit/test_youtube_processor.py backend/tests/unit/test_youtube_service.py
git commit -m "feat(youtube): persist thumbnail and library item metadata"
```

### Task 5: Frontend — árvore de pastas, itens e rename/move

**Files:**
- Modify: `distill/src/renderer/src/features/library/hooks/useLibrary.ts`
- Modify: `distill/src/renderer/src/features/library/LibraryPage.tsx`
- Modify: `distill/src/renderer/src/features/library/components/RecordingList.tsx`
- Modify: `distill/src/renderer/src/features/library/components/RecordingCard.tsx`
- Create: `distill/src/renderer/src/features/library/components/FolderTree.tsx`
- Create: `distill/src/renderer/src/features/library/components/LibraryToolbar.tsx`
- Modify: `distill/src/renderer/src/lib/api/generated/*` (via orval regenerate)
- Test: `distill/src/renderer/src/features/library/components/RecordingCard.test.tsx` (se setup pronto)

**Step 1: Write the failing test**

```tsx
it('renders youtube thumbnail when thumbnail_url exists', () => {
  // render card com thumbnail_url e assert de <img>
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/features/library/components/RecordingCard.test.tsx`  
Expected: FAIL (sem suporte a thumbnail no card).

**Step 3: Write minimal implementation**

- Atualizar hooks para consumir endpoints de library (folders/items) em vez de lista direta de transcriptions.
- Renderizar árvore recursiva (`FolderTree`) + lista de itens da pasta selecionada.
- Adicionar ações:
  - criar/renomear/excluir/mover pasta
  - renomear/mover item
- Em `RecordingCard`, renderizar:
  - `<img src={thumbnail_url}>` quando existir
  - fallback com ícone quando ausente/erro.

**Step 4: Run test to verify it passes**

Run:
- `cd distill && npm run generate:api`
- `cd distill && npm run typecheck`
- `cd distill && npx vitest run src/renderer/src/features/library/components/RecordingCard.test.tsx`

Expected: typecheck PASS; teste PASS (se infraestrutura disponível).

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/library/hooks/useLibrary.ts distill/src/renderer/src/features/library/LibraryPage.tsx distill/src/renderer/src/features/library/components/RecordingList.tsx distill/src/renderer/src/features/library/components/RecordingCard.tsx distill/src/renderer/src/features/library/components/FolderTree.tsx distill/src/renderer/src/features/library/components/LibraryToolbar.tsx distill/src/renderer/src/lib/api/generated
git commit -m "feat(library-ui): folder tree, item rename/move, and youtube thumbnails"
```

### Task 6: Regressão final e documentação operacional

**Files:**
- Modify: `running.md`

**Step 1: Write the failing test**

Não aplicável.

**Step 2: Run baseline checks**

Run:
- `cd backend && poetry run pytest tests/unit/ -v`
- `cd distill && npm run typecheck`

Expected: baseline conhecida.

**Step 3: Write minimal documentation update**

Atualizar `running.md` com:
- novo módulo de Library (pastas recursivas),
- regra de deleção de pasta (move para Inbox),
- thumbnails YouTube na Library,
- rename de item transcrito.

**Step 4: Run final checks**

Run:
- `cd backend && poetry run pytest tests/unit/ -v`
- `cd distill && npm run typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add running.md
git commit -m "docs: describe recursive library folders and youtube thumbnails"
```

## Notes

- @distill-backend: manter padrão Controller → Service → Repository.
- Evitar fallback silencioso em validações de árvore (retornar erro explícito 4xx).
- YAGNI: v1 sem permissões/multi-usuário; foco em fluxo local consistente.
