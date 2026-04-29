# Action Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract action items (text + responsible + deadline) automatically after transcription and display them as an interactive checklist in the transcription page.

**Architecture:** New `ActionItemsService` mirrors `SummaryService` pattern — calls LLM with structured JSON prompt, saves result to new `action_items JSONB` column in Supabase. Frontend renders inside `SummaryPanel` via `ActionItemsPanel` component + `useActionItems` hook with debounced PUT for edits.

**Tech Stack:** Python/FastAPI (backend), LLM via `llm_manager`, React/TypeScript + TanStack Query (frontend), Zustand (not needed — component-local state via hook).

---

## File Map

**Create:**
- `backend/app/services/action_items_service.py` — LLM extraction logic
- `backend/tests/unit/test_action_items_service.py` — unit tests
- `distill/src/renderer/src/features/transcription/hooks/useActionItems.ts` — local state + debounced PUT
- `distill/src/renderer/src/features/transcription/components/ActionItemsPanel.tsx` — UI component

**Modify:**
- `backend/app/services/transcription_service.py` �� call action_items_service after summary
- `backend/app/api/v1/endpoints/transcriptions.py` — add `PUT /{id}/action-items`
- `distill/src/renderer/src/features/transcription/components/SummaryPanel.tsx` — add ActionItemsPanel section
- `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx` — pass `action_items` + `id` to SummaryPanel

---

## Task 1: Supabase Migration

**Files:**
- Run SQL in Supabase dashboard (or migrations file if you have one)

- [ ] **Step 1: Run migration**

In Supabase SQL editor (or `psql`), run:

```sql
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT NULL;
```

`NULL` = not yet extracted. `[]` = extracted, no items found. `[{...}]` = items found.

- [ ] **Step 2: Verify column exists**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transcriptions' AND column_name = 'action_items';
```

Expected: one row with `data_type = jsonb`, `column_default = NULL`.

- [ ] **Step 3: Commit**

```bash
git add -p
git commit -m "chore: add action_items column to transcriptions table"
```

---

## Task 2: `action_items_service.py`

**Files:**
- Create: `backend/app/services/action_items_service.py`
- Create: `backend/tests/unit/test_action_items_service.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/unit/test_action_items_service.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from app.services.action_items_service import ActionItemsService


@pytest.mark.asyncio
async def test_extract_returns_structured_items():
    service = ActionItemsService()
    mock_json = '[{"text": "Send report", "responsible": "Maria", "deadline": "Friday"}]'

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value=mock_json)
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Maria will send the report by Friday.")

    assert len(result) == 1
    assert result[0]["text"] == "Send report"
    assert result[0]["responsible"] == "Maria"
    assert result[0]["deadline"] == "Friday"
    assert result[0]["completed"] is False
    assert "id" in result[0]


@pytest.mark.asyncio
async def test_extract_empty_text_returns_empty_list():
    service = ActionItemsService()
    result = await service.extract("")
    assert result == []


@pytest.mark.asyncio
async def test_extract_invalid_json_returns_empty_list():
    service = ActionItemsService()

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value="not valid json")
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript text.")

    assert result == []


@pytest.mark.asyncio
async def test_extract_filters_items_with_empty_text():
    service = ActionItemsService()
    mock_json = '[{"text": "", "responsible": null, "deadline": null}, {"text": "Valid action", "responsible": null, "deadline": null}]'

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value=mock_json)
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript.")

    assert len(result) == 1
    assert result[0]["text"] == "Valid action"


@pytest.mark.asyncio
async def test_extract_llm_exception_returns_empty_list():
    service = ActionItemsService()

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(side_effect=RuntimeError("LLM down"))
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript.")

    assert result == []
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
cd backend && poetry run pytest tests/unit/test_action_items_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.action_items_service'`

- [ ] **Step 3: Create `action_items_service.py`**

Create `backend/app/services/action_items_service.py`:

```python
import json
import logging
import uuid
from app.core.config import settings
from app.services.llm_manager import llm_manager

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are an assistant that extracts action items from meeting transcripts. "
    "Return ONLY valid JSON. No markdown, no explanation, no code fences."
)

_PROMPT_TEMPLATE = (
    "Extract all concrete action items from the transcript below.\n"
    "Return a JSON array. Each element must have:\n"
    '  "text": string (the action description)\n'
    '  "responsible": string or null (person responsible, if mentioned)\n'
    '  "deadline": string or null (deadline or timeframe, if mentioned)\n'
    "Extract only explicit commitments, not general discussion topics.\n"
    "If there are no action items, return an empty array [].\n\n"
    "Transcript:\n{text}"
)


class ActionItemsService:
    async def extract(self, text: str) -> list[dict]:
        transcript = (text or "").strip()
        if not transcript:
            return []
        if len(transcript) > 36000:
            transcript = f"{transcript[:20000]}\n...\n{transcript[-16000:]}"
        try:
            provider = llm_manager.get_provider(
                provider=settings.default_llm_provider,
                model=settings.default_llm_model,
            )
            prompt = _PROMPT_TEMPLATE.format(text=transcript)
            raw = await provider.generate(prompt=prompt, system=_SYSTEM_PROMPT)
            items = json.loads(raw.strip())
            if not isinstance(items, list):
                return []
            return [
                {
                    "id": str(uuid.uuid4()),
                    "text": str(item.get("text", "")).strip(),
                    "responsible": item.get("responsible") or None,
                    "deadline": item.get("deadline") or None,
                    "completed": False,
                }
                for item in items
                if isinstance(item, dict) and item.get("text", "").strip()
            ]
        except Exception:
            logger.warning("Action items extraction failed, returning []", exc_info=True)
            return []


action_items_service = ActionItemsService()
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && poetry run pytest tests/unit/test_action_items_service.py -v
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/action_items_service.py backend/tests/unit/test_action_items_service.py
git commit -m "feat: add ActionItemsService for LLM-based action item extraction"
```

---

## Task 3: Wire extraction into pipeline

**Files:**
- Modify: `backend/app/services/transcription_service.py`

- [ ] **Step 1: Add import at top of `transcription_service.py`**

After the existing imports, add:

```python
from app.services.action_items_service import action_items_service
```

- [ ] **Step 2: Add extraction step after summary save**

In `transcription_service.py`, locate the block that saves summary:

```python
            if summary:
                await transcription_repo.update(transcription_id, {"summary": summary})
```

Add immediately after it:

```python
            try:
                action_items = await action_items_service.extract(result["text"])
                await transcription_repo.update(transcription_id, {"action_items": action_items})
            except Exception:
                logger.exception("Action items extraction failed for %s", transcription_id)
                await transcription_repo.update(transcription_id, {"action_items": []})
```

- [ ] **Step 3: Run full unit test suite to verify nothing broke**

```bash
cd backend && poetry run pytest tests/unit/ -v
```

Expected: all existing tests still PASS, plus the 5 new action items tests.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/transcription_service.py
git commit -m "feat: extract action items automatically after transcription pipeline completes"
```

---

## Task 4: `PUT /action-items` endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/transcriptions.py`

- [ ] **Step 1: Add the PUT endpoint**

In `transcriptions.py`, add before the `@router.delete` line:

```python
@router.put("/{transcription_id}/action-items")
async def update_action_items(transcription_id: str, items: list[dict]):
    record = await transcription_service.update(transcription_id, {"action_items": items})
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"action_items": record.get("action_items", [])}
```

- [ ] **Step 2: Verify endpoint appears in OpenAPI**

Start the server (`poetry run uvicorn app.main:app --port 8000 --reload`) then check:

```bash
curl -s http://localhost:8000/openapi.json | python3 -c "import sys,json; paths=json.load(sys.stdin)['paths']; print([p for p in paths if 'action-items' in p])"
```

Expected: `['/api/v1/transcriptions/{transcription_id}/action-items']`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/transcriptions.py
git commit -m "feat: add PUT /transcriptions/{id}/action-items endpoint"
```

---

## Task 5: `useActionItems` hook

**Files:**
- Create: `distill/src/renderer/src/features/transcription/hooks/useActionItems.ts`

- [ ] **Step 1: Create the hook**

Create `distill/src/renderer/src/features/transcription/hooks/useActionItems.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { axiosInstance } from '@renderer/lib/axios'

export interface ActionItem {
  id: string
  text: string
  responsible: string | null
  deadline: string | null
  completed: boolean
}

export function useActionItems(transcriptionId: string, initialItems: ActionItem[] | null) {
  const [items, setItems] = useState<ActionItem[] | null>(initialItems)
  const [isSaving, setIsSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestItemsRef = useRef<ActionItem[] | null>(initialItems)

  useEffect(() => {
    setItems(initialItems)
    latestItemsRef.current = initialItems
  }, [initialItems])

  const persist = useCallback((updated: ActionItem[]) => {
    latestItemsRef.current = updated
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await axiosInstance({
          url: `/api/v1/transcriptions/${transcriptionId}/action-items`,
          method: 'PUT',
          data: latestItemsRef.current,
        })
      } catch {
        // state preserved locally; retries on next edit
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }, [transcriptionId])

  const toggle = useCallback((id: string) => {
    setItems((prev) => {
      if (!prev) return prev
      const updated = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      persist(updated)
      return updated
    })
  }, [persist])

  const update = useCallback((id: string, fields: Partial<Omit<ActionItem, 'id'>>) => {
    setItems((prev) => {
      if (!prev) return prev
      const updated = prev.map((item) =>
        item.id === id ? { ...item, ...fields } : item
      )
      persist(updated)
      return updated
    })
  }, [persist])

  return { items, toggle, update, isSaving }
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd distill && npm run typecheck 2>&1 | grep -i "useActionItems\|error" | head -20
```

Expected: no errors referencing `useActionItems`.

- [ ] **Step 3: Commit**

```bash
git add distill/src/renderer/src/features/transcription/hooks/useActionItems.ts
git commit -m "feat: add useActionItems hook with optimistic updates and debounced PUT"
```

---

## Task 6: `ActionItemsPanel` component

**Files:**
- Create: `distill/src/renderer/src/features/transcription/components/ActionItemsPanel.tsx`

- [ ] **Step 1: Create the component**

Create `distill/src/renderer/src/features/transcription/components/ActionItemsPanel.tsx`:

```tsx
import { memo, useState } from 'react'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { ActionItem, useActionItems } from '../hooks/useActionItems'

interface Props {
  transcriptionId: string
  initialItems: ActionItem[] | null
}

export const ActionItemsPanel = memo(function ActionItemsPanel({ transcriptionId, initialItems }: Props) {
  const { items, toggle, update, isSaving } = useActionItems(transcriptionId, initialItems)

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Action Items</h3>
        {isSaving && <Loader2 className="size-3 animate-spin text-white/30" />}
      </div>

      {items === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/30">No action items identified</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ActionItemRow key={item.id} item={item} onToggle={toggle} onUpdate={update} />
          ))}
        </ul>
      )}
    </div>
  )
})

function ActionItemRow({
  item,
  onToggle,
  onUpdate,
}: {
  item: ActionItem
  onToggle: (id: string) => void
  onUpdate: (id: string, fields: Partial<Omit<ActionItem, 'id'>>) => void
}) {
  const [editingField, setEditingField] = useState<'text' | 'responsible' | 'deadline' | null>(null)

  const commit = (field: 'text' | 'responsible' | 'deadline', value: string) => {
    onUpdate(item.id, { [field]: value.trim() || null })
    setEditingField(null)
  }

  return (
    <li className="flex items-start gap-2 group">
      <button
        onClick={() => onToggle(item.id)}
        className="mt-0.5 shrink-0 text-white/40 hover:text-white/70 transition-colors"
      >
        {item.completed
          ? <CheckSquare className="size-4 text-[var(--color-accent)]" />
          : <Square className="size-4" />
        }
      </button>

      <div className="flex-1 min-w-0">
        {editingField === 'text' ? (
          <input
            autoFocus
            defaultValue={item.text}
            className="w-full bg-white/10 rounded px-1 text-sm text-white outline-none"
            onBlur={(e) => commit('text', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit('text', e.currentTarget.value)
              if (e.key === 'Escape') setEditingField(null)
            }}
          />
        ) : (
          <span
            onClick={() => setEditingField('text')}
            className={cn(
              'text-sm cursor-pointer hover:text-white/90 transition-colors',
              item.completed ? 'line-through text-white/30' : 'text-white/80'
            )}
          >
            {item.text}
          </span>
        )}

        <div className="flex gap-2 mt-1">
          {editingField === 'responsible' ? (
            <input
              autoFocus
              defaultValue={item.responsible ?? ''}
              placeholder="Responsible..."
              className="bg-white/10 rounded px-1 text-xs text-white/60 outline-none w-28"
              onBlur={(e) => commit('responsible', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit('responsible', e.currentTarget.value)
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          ) : (
            <button
              onClick={() => setEditingField('responsible')}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {item.responsible ? `@${item.responsible}` : '+ responsible'}
            </button>
          )}

          {editingField === 'deadline' ? (
            <input
              autoFocus
              defaultValue={item.deadline ?? ''}
              placeholder="Deadline..."
              className="bg-white/10 rounded px-1 text-xs text-white/60 outline-none w-24"
              onBlur={(e) => commit('deadline', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit('deadline', e.currentTarget.value)
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          ) : item.deadline ? (
            <button
              onClick={() => setEditingField('deadline')}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {item.deadline}
            </button>
          ) : (
            <button
              onClick={() => setEditingField('deadline')}
              className="text-xs text-white/40 hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100"
            >
              + deadline
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd distill && npm run typecheck 2>&1 | grep -i "ActionItemsPanel\|error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add distill/src/renderer/src/features/transcription/components/ActionItemsPanel.tsx
git commit -m "feat: add ActionItemsPanel component with inline editing and checkbox"
```

---

## Task 7: Wire into `SummaryPanel` and `TranscriptionPage`

**Files:**
- Modify: `distill/src/renderer/src/features/transcription/components/SummaryPanel.tsx`
- Modify: `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx`

- [ ] **Step 1: Update `SummaryPanel.tsx`**

Replace the full file content:

```tsx
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { ActionItemsPanel } from './ActionItemsPanel'
import type { ActionItem } from '../hooks/useActionItems'

export const SummaryPanel = memo(function SummaryPanel({
  summary,
  isCompleted,
  actionItems,
  transcriptionId,
}: {
  summary?: string
  isCompleted: boolean
  actionItems: ActionItem[] | null
  transcriptionId: string
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-medium">Summary</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {summary ? (
          <div className="text-sm text-white/80 leading-relaxed overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                pre: ({ children }) => (
                  <pre className="mb-3 rounded-md bg-black/40 p-3 overflow-x-auto">{children}</pre>
                ),
                code: ({ className, children }) => (
                  <code className={`font-[var(--font-mono)] text-xs ${className ?? ''}`}>{children}</code>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] underline">
                    {children}
                  </a>
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        ) : isCompleted ? (
          <p className="text-sm text-white/30">No summary generated</p>
        ) : (
          <p className="text-sm text-white/30">Processing…</p>
        )}

        {isCompleted && (
          <ActionItemsPanel
            transcriptionId={transcriptionId}
            initialItems={actionItems}
          />
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 2: Update `TranscriptionPage.tsx`**

In `TranscriptionContent`, find the `SummaryPanel` usage and replace it:

```tsx
      <Panel defaultSize={25} minSize={15} className="min-h-0">
        <SummaryPanel
          summary={t.summary ?? undefined}
          isCompleted={t.status === 'completed'}
          actionItems={t.action_items ?? null}
          transcriptionId={id}
        />
      </Panel>
```

- [ ] **Step 3: Check TypeScript compiles cleanly**

```bash
cd distill && npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.`

- [ ] **Step 4: Commit**

```bash
git add distill/src/renderer/src/features/transcription/components/SummaryPanel.tsx \
        distill/src/renderer/src/features/transcription/TranscriptionPage.tsx
git commit -m "feat: wire ActionItemsPanel into SummaryPanel and TranscriptionPage"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Start backend**

```bash
cd backend && poetry run uvicorn app.main:app --port 8000 --reload
```

- [ ] **Step 2: Start frontend**

```bash
cd distill && npm run dev
```

- [ ] **Step 3: Record a short test session (~30 seconds)**

Navigate to `/recording`, type a name, start recording. Say something like: *"João vai enviar o relatório até sexta. Maria vai agendar a reunião de follow-up para a próxima semana."* Stop recording.

- [ ] **Step 4: Wait for pipeline to complete**

On the transcription page, watch status change from `processing` → `completed`.

- [ ] **Step 5: Verify action items appear**

In the Summary panel, below the summary text, the Action Items section should show:
- "João vai enviar o relatório" → `@João` → `sexta`
- "Maria vai agendar a reunião de follow-up" → `@Maria` → `próxima semana`

- [ ] **Step 6: Test interactions**
  - Click checkbox → item gets strikethrough
  - Click item text → inline input appears, edit, press Enter → text updates
  - Click `@João` → input appears, change name, blur → updates
  - Click `+ deadline` → input appears, type deadline, Enter → deadline badge appears

- [ ] **Step 7: Verify persistence**

Refresh the page. Action items (including any edits) should still be there.
