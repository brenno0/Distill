# Loading Skeletons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar feedback visual consistente com skeletons para carregamento inicial e ações assíncronas nas telas de dados do app.

**Architecture:** Vamos criar skeletons reutilizáveis por feature e trocar fallbacks textuais de `Suspense` por layouts equivalentes ao conteúdo final. Para ações assíncronas, o feedback será local (componente/botão/bloco) para evitar bloqueio global da tela. A implementação fica restrita à camada de UI e estado de loading já existente.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Tailwind, Vitest, Testing Library.

---

### Task 1: Skeleton compartilhado para páginas de loading

**Files:**
- Modify: `distill/src/renderer/src/components/ui/skeleton.tsx`
- Create: `distill/src/renderer/src/components/ui/page-loading-skeleton.tsx`
- Test: `distill/src/renderer/src/components/ui/page-loading-skeleton.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { PageLoadingSkeleton } from './page-loading-skeleton'

it('renders the requested amount of skeleton rows', () => {
  render(<PageLoadingSkeleton rows={4} />)
  expect(screen.getAllByTestId('page-skeleton-row')).toHaveLength(4)
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/components/ui/page-loading-skeleton.test.tsx`  
Expected: FAIL com erro de módulo/componente inexistente.

**Step 3: Write minimal implementation**

```tsx
import { Skeleton } from './skeleton'

export function PageLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} data-testid="page-skeleton-row" className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `cd distill && npx vitest run src/renderer/src/components/ui/page-loading-skeleton.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add distill/src/renderer/src/components/ui/skeleton.tsx distill/src/renderer/src/components/ui/page-loading-skeleton.tsx distill/src/renderer/src/components/ui/page-loading-skeleton.test.tsx
git commit -m "feat(ui): add reusable page loading skeleton"
```

### Task 2: Aplicar skeleton no carregamento inicial das páginas

**Files:**
- Modify: `distill/src/renderer/src/features/settings/SettingsPage.tsx`
- Modify: `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx`
- Modify: `distill/src/renderer/src/features/library/LibraryPage.tsx`
- Modify: `distill/src/renderer/src/features/import/ImportPage.tsx`
- Create: `distill/src/renderer/src/features/settings/components/SettingsSkeleton.tsx`
- Create: `distill/src/renderer/src/features/transcription/components/TranscriptionSkeleton.tsx`
- Create: `distill/src/renderer/src/features/library/components/LibrarySkeleton.tsx`
- Create: `distill/src/renderer/src/features/import/components/ImportSkeleton.tsx`
- Test: `distill/src/renderer/src/features/settings/SettingsPage.test.tsx`
- Test: `distill/src/renderer/src/features/transcription/TranscriptionPage.test.tsx`

**Step 1: Write the failing test**

```tsx
it('shows SettingsSkeleton while suspense fallback is active', () => {
  render(<SettingsPage />)
  expect(screen.getByTestId('settings-skeleton')).toBeInTheDocument()
})
```

```tsx
it('shows TranscriptionSkeleton while suspense fallback is active', () => {
  render(<TranscriptionPage />)
  expect(screen.getByTestId('transcription-skeleton')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run:
- `cd distill && npx vitest run src/renderer/src/features/settings/SettingsPage.test.tsx`
- `cd distill && npx vitest run src/renderer/src/features/transcription/TranscriptionPage.test.tsx`  
Expected: FAIL porque os fallbacks atuais renderizam texto simples.

**Step 3: Write minimal implementation**

- Criar skeletons específicos por feature com `Skeleton`.
- Trocar blocos textuais `Loading ...` por componentes skeleton.
- Em `LibraryPage`, substituir fallback atual `animate-pulse` inline por `LibrarySkeleton` para padronizar.

**Step 4: Run test to verify it passes**

Run:
- `cd distill && npx vitest run src/renderer/src/features/settings/SettingsPage.test.tsx`
- `cd distill && npx vitest run src/renderer/src/features/transcription/TranscriptionPage.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/settings/SettingsPage.tsx distill/src/renderer/src/features/transcription/TranscriptionPage.tsx distill/src/renderer/src/features/library/LibraryPage.tsx distill/src/renderer/src/features/import/ImportPage.tsx distill/src/renderer/src/features/settings/components/SettingsSkeleton.tsx distill/src/renderer/src/features/transcription/components/TranscriptionSkeleton.tsx distill/src/renderer/src/features/library/components/LibrarySkeleton.tsx distill/src/renderer/src/features/import/components/ImportSkeleton.tsx distill/src/renderer/src/features/settings/SettingsPage.test.tsx distill/src/renderer/src/features/transcription/TranscriptionPage.test.tsx
git commit -m "feat(ui): replace page loading text with feature skeletons"
```

### Task 3: Skeleton para ações assíncronas da tela de Settings

**Files:**
- Modify: `distill/src/renderer/src/features/settings/components/LLMSettings.tsx`
- Create: `distill/src/renderer/src/features/settings/components/LLMSettingsSavingSkeleton.tsx`
- Test: `distill/src/renderer/src/features/settings/components/LLMSettings.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders saving skeleton when isSaving is true', () => {
  render(<LLMSettings {...props} isSaving />)
  expect(screen.getByTestId('llm-saving-skeleton')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/features/settings/components/LLMSettings.test.tsx`  
Expected: FAIL porque não existe skeleton de saving.

**Step 3: Write minimal implementation**

- Renderizar `LLMSettingsSavingSkeleton` quando `isSaving` for `true`.
- Manter botão `Save` com disabled e label de loading já existente.
- Não esconder completamente campos, apenas sinalizar saving no bloco ativo.

**Step 4: Run test to verify it passes**

Run: `cd distill && npx vitest run src/renderer/src/features/settings/components/LLMSettings.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/settings/components/LLMSettings.tsx distill/src/renderer/src/features/settings/components/LLMSettingsSavingSkeleton.tsx distill/src/renderer/src/features/settings/components/LLMSettings.test.tsx
git commit -m "feat(settings): add saving skeleton feedback"
```

### Task 4: Skeleton para ações assíncronas de Chat e Import

**Files:**
- Modify: `distill/src/renderer/src/features/transcription/components/ChatPanel.tsx`
- Modify: `distill/src/renderer/src/features/import/ImportPage.tsx`
- Create: `distill/src/renderer/src/features/transcription/components/ChatPendingSkeleton.tsx`
- Create: `distill/src/renderer/src/features/import/components/ImportProgressSkeleton.tsx`
- Test: `distill/src/renderer/src/features/transcription/components/ChatPanel.test.tsx`
- Test: `distill/src/renderer/src/features/import/ImportPage.test.tsx`

**Step 1: Write the failing test**

```tsx
it('shows assistant pending skeleton when chat request is pending', () => {
  render(<ChatPanel transcriptionId="t1" />)
  expect(screen.getByTestId('chat-pending-skeleton')).toBeInTheDocument()
})
```

```tsx
it('shows import progress skeleton while request is pending and before ws updates', () => {
  render(<ImportPage />)
  expect(screen.getByTestId('import-progress-skeleton')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run:
- `cd distill && npx vitest run src/renderer/src/features/transcription/components/ChatPanel.test.tsx`
- `cd distill && npx vitest run src/renderer/src/features/import/ImportPage.test.tsx`  
Expected: FAIL por ausência dos skeletons.

**Step 3: Write minimal implementation**

- Em `ChatPanel`, trocar placeholder de texto pendente por `ChatPendingSkeleton`.
- Em `ImportPage`, adicionar `ImportProgressSkeleton` quando `isPending === true` e ainda não há progresso concreto.

**Step 4: Run test to verify it passes**

Run:
- `cd distill && npx vitest run src/renderer/src/features/transcription/components/ChatPanel.test.tsx`
- `cd distill && npx vitest run src/renderer/src/features/import/ImportPage.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/transcription/components/ChatPanel.tsx distill/src/renderer/src/features/import/ImportPage.tsx distill/src/renderer/src/features/transcription/components/ChatPendingSkeleton.tsx distill/src/renderer/src/features/import/components/ImportProgressSkeleton.tsx distill/src/renderer/src/features/transcription/components/ChatPanel.test.tsx distill/src/renderer/src/features/import/ImportPage.test.tsx
git commit -m "feat(ui): add async action skeletons for chat and import"
```

### Task 5: Verificação final e documentação rápida

**Files:**
- Modify: `running.md`

**Step 1: Write the failing test**

Não aplicável.

**Step 2: Run baseline checks**

Run:
- `cd distill && npm run typecheck`

Expected: baseline de tipagem válida.

**Step 3: Write minimal documentation update**

Adicionar nota curta em `running.md` dizendo que telas de dados mostram skeletons em carregamento inicial e ações assíncronas.

**Step 4: Run checks**

Run:
- `cd distill && npm run typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add running.md
git commit -m "docs: document loading skeleton feedback"
```

## Notes

- @brainstorming: seguir escopo aprovado (todas telas com dados + ações assíncronas).
- YAGNI: não criar infraestrutura global complexa de loading; priorizar componentes de feature.
- Não alterar serviços/API; apenas UX de loading.
