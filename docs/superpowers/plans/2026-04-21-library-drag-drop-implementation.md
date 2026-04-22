# Library Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop to Library page — drag recording cards and folder rows onto folder targets.

**Architecture:** `@dnd-kit/core` + `@dnd-kit/utilities` wraps LibraryPage. `useDraggable` on cards/rows, `useDroppable` on folder nodes. `DndContext` + `DragOverlay` in `LibraryPage.tsx`. Mutations already exist in `useLibrary`.

**Tech Stack:** `@dnd-kit/core`, `@dnd-kit/utilities`, TypeScript, TanStack Query.

---

## File Map

- `distill/package.json` — add `@dnd-kit/core`, `@dnd-kit/utilities`
- `distill/src/renderer/src/features/library/LibraryPage.tsx` — DndContext + DragOverlay + onDragEnd handler
- `distill/src/renderer/src/features/library/components/RecordingCard.tsx` — `useDraggable`, drag data
- `distill/src/renderer/src/features/library/components/FolderTreeSidebar.tsx` — `useDraggable` on FolderNode, `useDroppable` on each node
- `distill/src/renderer/src/features/library/types.ts` — add `DragData` type union

---

## Task 1: Install dnd-kit packages

**Files:**
- Modify: `distill/package.json`

- [ ] **Step 1: Install packages**

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor/distill && npm install @dnd-kit/core @dnd-kit/utilities
```

Run: `npm list @dnd-kit/core @dnd-kit/utilities`
Expected: both listed under `distill`

---

## Task 2: Add DragData type union

**Files:**
- Modify: `distill/src/renderer/src/features/library/types.ts`

- [ ] **Step 1: Add DragData type**

Add at end of `types.ts`:

```typescript
export type DragData =
  | { type: 'item'; id: string; folderId: string | null }
  | { type: 'folder'; id: string; parentId: string | null }
```

---

## Task 3: Make RecordingCard draggable

**Files:**
- Modify: `distill/src/renderer/src/features/library/components/RecordingCard.tsx`

**Changes:**
- Import `{ useDraggable } from '@dnd-kit/core'` and `{ CSS } from '@dnd-kit/utilities'`
- Import `type { DragData } from '../types'`
- Add `dndId?: string` prop (optional — only needed when wrapped in DndContext)
- Inside component: `const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dndId ?? recording.id, data: { type: 'item', id: recording.id, folderId: recording.folder_id } satisfies DragData })`
- Apply `setNodeRef` to outer `Card` element
- Apply `{...listeners}` to card `onMouseEnter`/`onMouseLeave` or add a `cursor: grab` drag handle div wrapping content
- Apply `transform` as inline style: `style={{ opacity: isDragging ? 0.3 : 1, transform: CSS.Translate.toString(transform) }}`
- Card should NOT show move buttons during drag (`isDragging`)

**Key:** The card is draggable when `dndId` prop is provided. When absent (outside DndContext) it behaves normally.

---

## Task 4: Make FolderNode draggable + droppable

**Files:**
- Modify: `distill/src/renderer/src/features/library/components/FolderTreeSidebar.tsx`

**Changes:**
- Import `{ useDraggable, useDroppable } from '@dnd-kit/core'` and `{ CSS } from '@dnd-kit/utilities'`
- Import `type { DragData } from '../types'`
- Add `dragCount?: number` prop to FolderNode — shows badge when > 0
- Inside FolderNode: `const { attributes, listeners, setNodeRef: setDragRef, transform: dragTransform, isDragging } = useDraggable({ id: \`folder-\${folder.id}\`, data: { type: 'folder', id: folder.id, parentId: folder.parent_id } satisfies DragData })`
- Add `useDroppable`: `const { setNodeRef: setDropRef, isOver } = useDroppable({ id: \`folder-drop-\${folder.id}\`, disabled: folder.id === folder.id /* always enabled except when dragging self */ })`
- Combine refs: `const setRef = (el: HTMLLIElement | null) => { setDragRef(el); setDropRef(el) }` — attach to outer `<li>`
- Apply drag transform style to outer div: `style={{ transform: CSS.Translate.toString(dragTransform) }}`
- Add `isOver` visual: `bg-primary/20 border-primary` when `isOver`
- Add badge: `{dragCount > 0 && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{dragCount}</span>}`

**Droppable disabled:** When dragging a folder, it cannot drop onto itself. Pass `disabled={isDragging && folder.id === draggingFolderId}` — need to track which folder is being dragged. Approach: lift `draggingId` state up (see Task 5).

---

## Task 5: DndContext + DragOverlay in LibraryPage

**Files:**
- Modify: `distill/src/renderer/src/features/library/LibraryPage.tsx`

**Changes:**
- Import `{ DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'`
- Import `{ CSS } from '@dnd-kit/utilities'`
- Add state: `const [activeId, setActiveId] = useState<string | null>(null)` and `const [activeData, setActiveData] = useState<DragData | null>(null)` and `const [draggingCount, setDraggingCount] = useState(0)`
- Add sensors: `const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))`
- Add `onDragStart`: sets `activeId` and `activeData` from event
- Add `onDragEnd`:
  ```typescript
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveData(null)
    setDraggingCount(0)
    if (!over || !activeData) return
    const dropId = String(over.id)
    if (!dropId.startsWith('folder-drop-')) return
    const targetFolderId = dropId.replace('folder-drop-', '')
    if (activeData.type === 'item') {
      moveItem({ itemId: activeData.id, folderId: targetFolderId })
    } else if (activeData.type === 'folder') {
      moveFolder({ folderId: activeData.id, parentId: targetFolderId })
    }
  }
  ```
- Wrap return JSX in `<DndContext sensors={sensors} onDragStart={...} onDragEnd={onDragEnd}><LibraryContent /><DragOverlay>...</DragOverlay></DndContext>`
- **DragOverlay content:** render based on `activeData?.type`
  - Item: `<Card className="w-64 p-3"><div className="flex items-center gap-2"><Play className="h-4 w-4"/>{activeData?.type === 'item' ? items.find(i => i.id === activeData?.id)?.display_name : ''}</div></Card>`
  - Folder: `<div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-border shadow-md"><Folder className="h-4 w-4"/>{activeData?.type === 'folder' ? folders.find(f => f.id === activeData?.id)?.name : ''}</div>`

**Prop drilling:** Pass `setDraggingCount` down to FolderTreeSidebar. Also pass `draggingCount` and `activeData` for badge + disabled state on folder nodes.

---

## Task 6: Pass drag state to FolderTreeSidebar and RecordingList

**Files:**
- Modify: `distill/src/renderer/src/features/library/LibraryPage.tsx`
- Modify: `distill/src/renderer/src/features/library/components/FolderTreeSidebar.tsx` (add props)
- Modify: `distill/src/renderer/src/features/library/components/RecordingList.tsx` (add props)
- Modify: `distill/src/renderer/src/features/library/components/RecordingCard.tsx` (always draggable when in DndContext)

**In LibraryPage** — update FolderTreeSidebar call:
```tsx
<FolderTreeSidebar
  folders={folders}
  selectedFolderId={selectedFolderId}
  onSelectFolder={setSelectedFolderId}
  onCreateFolder={handleCreateFolder}
  onRenameFolder={handleRenameFolder}
  onMoveFolder={handleMoveFolder}
  onDeleteFolder={handleDeleteFolder}
  isMutating={isMutating}
  draggingCount={draggingCount}
  draggingFolderId={activeData?.type === 'folder' ? activeData.id : null}
/>
```

**In FolderTreeSidebar** — add to FolderNode:
```typescript
interface FolderNodeProps {
  // ... existing
  draggingCount?: number
  draggingFolderId?: string | null
}
```

**In RecordingList** — cards are always draggable when in DndContext. Pass nothing extra — `RecordingCard` uses `dndId` if provided but defaults to `recording.id`.

---

## Task 7: Remove window.prompt move buttons

**Files:**
- Modify: `distill/src/renderer/src/features/library/components/RecordingCard.tsx`

The move button (`handleMove`) calls `window.prompt`. Since drag-drop now handles moves, remove the button entirely OR disable it when `isDragging` is active (card being dragged).

Simplest: remove `<Button onClick={handleMove}>` from `actionButtons`. Drag-drop is now the only move path.

---

## Task 8: Run typecheck + test

**Files:**
- Run: `cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor/distill && npm run typecheck`

Expected: PASS (no errors)

**Manual test checklist:**
1. Open Library page
2. Drag a recording card onto a folder — item moves, badge count shows
3. Drag a folder onto another folder — tree re-renders with new parent
4. Drag outside valid targets — snap back
5. Press ESC during drag — cancels
6. Move buttons removed from cards

---

## Task 9: Commit

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor
git add distill/package.json
git add distill/src/renderer/src/features/library/
git commit -m "feat(library): drag-and-drop items and folders

Draggable recording cards and folder rows. Drop onto folders in sidebar.
Badge count during drag. DragOverlay shows floating clone.
Uses @dnd-kit/core + @dnd-kit/utilities.
Remove window.prompt move buttons — drag-drop is move path.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
