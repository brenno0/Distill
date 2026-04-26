import { Suspense, useRef, useEffect, useState, useMemo } from 'react'
import { gsap } from 'gsap'
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, pointerWithin, rectIntersection, type DragEndEvent, type CollisionDetection } from '@dnd-kit/core'
import { Folder } from 'lucide-react'
import { useLibrary } from './hooks/useLibrary'
import { LibraryFilters } from './components/LibraryFilters'
import { RecordingList } from './components/RecordingList'
import { LibraryPageSkeleton } from './components/LibraryPageSkeleton'
import { FolderTreeSidebar } from './components/FolderTreeSidebar'
import { LibraryToolbar } from './components/LibraryToolbar'
import { FolderDialog } from './components/FolderDialog'
import type { LibraryFolder, DragData } from './types'

const flattenFolders = (folders: LibraryFolder[]): LibraryFolder[] => {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])])
}

function LibraryContent() {
  const {
    folders,
    items,
    selectedFolderId,
    setSelectedFolderId,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    renameItem,
    moveItem,
    deleteItem,
    deletingId,
    isMutating,
    isLoading,
  } = useLibrary()

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeData, setActiveData] = useState<DragData | null>(null)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    mode: 'create' | 'rename' | 'move' | 'item-move' | 'item-rename'
    folder?: LibraryFolder
    parentId?: string | null
    itemId?: string
    itemDisplayName?: string
  }>({ open: false, mode: 'create' })
  const headerRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerWithin(args)
    if (pointer.length > 0) return pointer
    return rectIntersection(args)
  }

  const allFolders = useMemo(() => flattenFolders(folders), [folders])
  const selectedFolder = useMemo(
    () => allFolders.find((folder) => folder.id === selectedFolderId) ?? null,
    [allFolders, selectedFolderId],
  )

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    )
  }, [])

  const displayRecordings = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) => {
      const title = (item.display_name ?? item.title ?? '').toLowerCase()
      const summary = (item.summary ?? '').toLowerCase()
      return title.includes(q) || summary.includes(q) || item.id.toLowerCase().includes(q)
    })
  }, [items, search])

  const draggingCount = activeData?.type === 'item' ? 1 : 0
  const draggingFolderId = activeData?.type === 'folder' ? activeData.id : null

  const handleDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as DragData | undefined
    if (!data || !event.over) {
      setActiveData(null)
      return
    }
    const overId = String(event.over?.id ?? '')
    if (!overId.startsWith('folder-drop-')) {
      setActiveData(null)
      return
    }
    const targetFolderId = overId.replace('folder-drop-', '')
    if (data.type === 'item') {
      moveItem({ itemId: data.id, folderId: targetFolderId })
    } else if (data.type === 'folder') {
      moveFolder({ folderId: data.id, parentId: targetFolderId })
    }
    setActiveData(null)
  }

  const handleCreateFolder = (parentId?: string | null) => {
    setDialogState({ open: true, mode: 'create', parentId: parentId ?? null })
  }

  const handleRenameFolder = (folder: LibraryFolder) => {
    setDialogState({ open: true, mode: 'rename', folder })
  }

  const handleMoveFolder = (folder: LibraryFolder) => {
    setDialogState({ open: true, mode: 'move', folder })
  }

  const handleDialogConfirm = (name: string, parentId?: string | null) => {
    const { mode, folder: targetFolder, itemId } = dialogState
    const m = mode as string
    if (m === 'create') {
      createFolder({ name, parent_id: dialogState.parentId ?? null })
    } else if (m === 'rename' && targetFolder) {
      renameFolder({ folderId: targetFolder.id, name })
    } else if (m === 'move' && targetFolder) {
      moveFolder({ folderId: targetFolder.id, parentId: parentId ?? null })
    } else if (m === 'item-rename' && itemId) {
      renameItem({ itemId, displayName: name })
    }
    setDialogState({ open: false, mode: 'create' })
  }

  const openItemRename = (itemId: string, displayName: string) => {
    setDialogState({ open: true, mode: 'item-rename' as const, itemId, itemDisplayName: displayName })
  }

  const handleDeleteFolder = (folder: LibraryFolder) => {
    if (folder.is_inbox) return
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return
    deleteFolder(folder.id)
  }

  if (isLoading) {
    return <LibraryPageSkeleton />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={({ active }) => setActiveData(active.data.current as DragData)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveData(null)}>
      <div className="flex h-full min-h-0 overflow-hidden">
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
          draggingFolderId={draggingFolderId}
        />

        <div className="flex flex-1 flex-col min-h-0 p-6 overflow-hidden">
        <div ref={headerRef} className="mb-6 shrink-0">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Recordings</h1>
          <p className="text-muted-foreground">Browse and manage all your recorded sessions</p>
        </div>

        <LibraryToolbar
          selectedFolder={selectedFolder}
          onCreateFolder={() => handleCreateFolder(selectedFolderId ?? null)}
          onRenameFolder={() => (selectedFolder ? handleRenameFolder(selectedFolder) : undefined)}
          onMoveFolder={() => (selectedFolder ? handleMoveFolder(selectedFolder) : undefined)}
          onDeleteFolder={() => (selectedFolder ? handleDeleteFolder(selectedFolder) : undefined)}
          isMutating={isMutating}
        />

        <div className="shrink-0">
          <LibraryFilters
            search={search}
            onSearch={setSearch}
            viewMode={viewMode}
            onViewMode={setViewMode}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <RecordingList
            recordings={displayRecordings}
            folders={allFolders}
            viewMode={viewMode}
            onDelete={deleteItem}
            onRenameDialog={openItemRename}
            deletingId={deletingId}
          />
        </div>
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeData?.type === 'item' && (() => {
          const item = items.find(i => i.id === activeData.id)
          return (
            <div className="bg-card border border-primary/60 rounded-lg shadow-2xl px-3 py-2 text-sm text-foreground flex items-center gap-2 rotate-1 scale-105">
              <div className="w-10 h-7 rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {item?.thumbnail_url
                  ? <img src={item.thumbnail_url} className="w-full h-full object-cover" />
                  : <Folder className="h-3 w-3 text-muted-foreground" />}
              </div>
              <span className="truncate max-w-[180px]">{item?.display_name ?? item?.title ?? 'Recording'}</span>
            </div>
          )
        })()}
        {activeData?.type === 'folder' && (
          <div className="bg-card border border-primary/60 rounded-lg shadow-2xl px-3 py-2 text-sm text-foreground flex items-center gap-2 rotate-1 scale-105">
            <Folder className="h-4 w-4 text-primary" />
            {allFolders.find(f => f.id === activeData.id)?.name ?? 'Folder'}
          </div>
        )}
      </DragOverlay>
      <FolderDialog
        open={dialogState.open}
        mode={dialogState.mode}
        folder={dialogState.folder}
        folders={folders}
        itemId={dialogState.itemId}
        itemDisplayName={dialogState.itemDisplayName}
        onConfirm={handleDialogConfirm}
        onCancel={() => setDialogState({ open: false, mode: 'create' })}
      />
    </DndContext>
  )
}

export function LibraryPage() {
  return (
    <Suspense fallback={<LibraryPageSkeleton />}>
      <LibraryContent />
    </Suspense>
  )
}
