# LLM Settings Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persistir provider/modelo LLM escolhidos pelo usuário entre sessões, com secrets editáveis via UI e armazenados somente em keyring criptografado.

**Architecture:** Configuração não sensível (`default_llm_provider`, `default_llm_model`) será persistida em Supabase (`app_settings`) via Repository dedicado. O backend carregará esse estado no startup e o endpoint de settings gravará em DB + keyring. O frontend enviará payload no formato correto (`secrets.*`) e sincronizará store local após salvar.

**Tech Stack:** FastAPI, Supabase/PostgreSQL, keyring, React, Zustand, TanStack Query, pytest.

---

### Task 1: Criar persistência de app settings no backend

**Files:**
- Create: `backend/migrations/002_create_app_settings.sql`
- Create: `backend/app/db/app_settings_repository.py`
- Test: `backend/tests/unit/test_app_settings_repository.py`

**Step 1: Write the failing test**

```python
import pytest
from app.db.app_settings_repository import AppSettingsRepository

@pytest.mark.asyncio
async def test_get_defaults_without_db_returns_none():
    repo = AppSettingsRepository()
    repo._db = None
    assert await repo.get() is None
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_app_settings_repository.py::test_get_defaults_without_db_returns_none -v`  
Expected: FAIL com `ModuleNotFoundError`/`ImportError` para `app_settings_repository`.

**Step 3: Write minimal implementation**

```python
class AppSettingsRepository:
    TABLE = "app_settings"
    async def get(self) -> dict | None: ...
    async def upsert(self, provider: str, model: str) -> dict: ...
```

Criar migration com tabela singleton:

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  default_llm_provider TEXT NOT NULL,
  default_llm_model TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_app_settings_repository.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/migrations/002_create_app_settings.sql backend/app/db/app_settings_repository.py backend/tests/unit/test_app_settings_repository.py
git commit -m "feat(backend): add persisted app settings repository"
```

### Task 2: Carregar e salvar settings persistidos no ciclo de vida da API

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/v1/endpoints/settings.py`
- Test: `backend/tests/unit/test_settings_endpoint.py`

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_update_settings_persists_llm_config(mocker):
    # mocka repo.upsert e valida chamada com provider/model
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_settings_endpoint.py::test_update_settings_persists_llm_config -v`  
Expected: FAIL porque endpoint ainda não usa repositório.

**Step 3: Write minimal implementation**

Implementar:
1. Startup: após `run_migrations`, carregar `app_settings` do repo e aplicar em `app_settings.default_llm_provider/model` quando existir.
2. `PUT /api/v1/settings`: persistir `body.llm` no repo e atualizar memória.
3. `PUT /api/v1/settings`: retornar payload com `llm` atual para sincronização do frontend.
4. Manter secrets exclusivamente no keyring (`set_secret`), nunca no banco.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_settings_endpoint.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/main.py backend/app/api/v1/endpoints/settings.py backend/tests/unit/test_settings_endpoint.py
git commit -m "feat(backend): persist and load llm settings from supabase"
```

### Task 3: Corrigir payload de settings no frontend (secrets + sync de store)

**Files:**
- Modify: `distill/src/renderer/src/features/settings/components/LLMSettings.tsx`
- Modify: `distill/src/renderer/src/features/settings/hooks/useSettings.ts`
- Modify: `distill/src/renderer/src/stores/useSettingsStore.ts` (se necessário para helper de sync)
- Test: `distill/src/renderer/src/features/settings/components/LLMSettings.test.tsx` (criar se não existir)

**Step 1: Write the failing test**

```tsx
it('sends google key under secrets.google_api_key', async () => {
  // renderiza, escolhe gemini, preenche key, clica save e verifica payload
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npm test -- LLMSettings`  
Expected: FAIL porque payload atual envia `api_key`.

**Step 3: Write minimal implementation**

Trocar envio para:

```ts
onSave({
  llm: { provider, model },
  secrets: { google_api_key: apiKey } // mapear dinamicamente por provider
})
```

No hook `useSettings`, após mutation success:
1. invalidar query `settings`;
2. aplicar `setProvider`/`setModel` a partir da resposta de `llm` (ou fallback de GET subsequente).

**Step 4: Run test to verify it passes**

Run: `cd distill && npm test -- LLMSettings`  
Expected: PASS.

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/settings/components/LLMSettings.tsx distill/src/renderer/src/features/settings/hooks/useSettings.ts distill/src/renderer/src/features/settings/components/LLMSettings.test.tsx
git commit -m "fix(frontend): send provider secrets and sync llm store"
```

### Task 4: Garantir uso consistente do provider/modelo salvo em resumo e chat

**Files:**
- Modify: `backend/app/services/summary_service.py`
- Modify: `backend/app/api/v1/endpoints/agent.py` (se necessário para validações)
- Test: `backend/tests/unit/test_summary_service.py`
- Test: `backend/tests/unit/test_agent_endpoint.py` (criar se necessário)

**Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_summary_uses_persisted_default_provider_model(mocker):
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_summary_service.py::test_summary_uses_persisted_default_provider_model -v`  
Expected: FAIL com chamada divergente.

**Step 3: Write minimal implementation**

Garantir que:
1. `SummaryService` sempre consome `settings.default_llm_provider/model` (já atualizado do DB no startup);
2. falha de provider cloud sem key gere erro explícito (não silencioso) até o chamador.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_summary_service.py -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/app/services/summary_service.py backend/tests/unit/test_summary_service.py backend/tests/unit/test_agent_endpoint.py
git commit -m "test(backend): enforce persisted llm config usage"
```

### Task 5: Executar suíte de regressão e documentar operação

**Files:**
- Modify: `running.md`

**Step 1: Write the failing test**

Não aplicável (tarefa de integração/documentação).

**Step 2: Run baseline checks**

Run:
- `cd backend && poetry run pytest tests/unit/ -v`
- `cd distill && npm test`

Expected: baseline conhecida.

**Step 3: Apply docs update**

Adicionar em `running.md`:
1. que provider/modelo de LLM persistem no Supabase (`app_settings`);
2. que API keys ficam no keyring criptografado;
3. que STT continua em WhisperX.

**Step 4: Re-run full checks**

Run:
- `cd backend && poetry run pytest tests/unit/ -v`
- `cd distill && npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add running.md
git commit -m "docs: describe persisted llm settings and keyring secrets"
```

## Notes for execution

- Preferir `@distill-backend` para convenções de arquitetura (Controller → Service → Repository).
- Não introduzir fallback silencioso em falha de persistência.
- Não armazenar secrets fora do keyring.
