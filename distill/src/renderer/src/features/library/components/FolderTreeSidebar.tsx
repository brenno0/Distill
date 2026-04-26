import { memo, useState } from 'react'
import { ChevronRight, Folder, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { LibraryFolder, DragData } from '../types'

interface FolderNodeProps {
  folder: LibraryFolder
  level: number
  selectedFolderId: string | null
  onSelect: (folderId: string) => void
  onCreateChild: (parentId: string) => void
  onRename: (folder: LibraryFolder) => void
  onMove: (folder: LibraryFolder) => void
  onDelete: (folder: LibraryFolder) => void
  isMutating?: boolean
  draggingCount?: number
  draggingFolderId?: string | null
}

const FolderNode = memo(function FolderNode({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onCreateChild,
  onRename,
  onMove,
  onDelete,
  isMutating,
  draggingCount,
  draggingFolderId,
}: FolderNodeProps) {
  const isSelected = selectedFolderId === folder.id
  const children = folder.children ?? []
  const [isOpen, setIsOpen] = useState(true)

  const { attributes, listeners, setNodeRef: setDragRef, transform: dragTransform, isDragging } = useDraggable({
    id: `folder-${folder.id}`,
    data: { type: 'folder', id: folder.id, parentId: folder.parent_id } satisfies DragData,
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `folder-drop-${folder.id}`, disabled: isDragging && draggingFolderId != null && draggingFolderId === folder.id })

  const setRef = (el: HTMLLIElement | null) => { setDragRef(el); setDropRef(el) }

  return (
    <li ref={setRef}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 transition-all cursor-grab active:cursor-grabbing',
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
          isOver && 'bg-primary/20 ring-1 ring-primary ring-inset scale-[1.02]',
          isDragging && 'opacity-30',
        )}
        style={{ paddingLeft: `${Math.min(level * 12 + 8, 32)}px`, transform: dragTransform ? CSS.Translate.toString(dragTransform) : undefined }}
        {...listeners}
        {...attributes}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(folder.id) }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          disabled={isMutating}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              children.length === 0 && 'opacity-0 pointer-events-none',
              isOpen && children.length > 0 && 'rotate-90',
            )}
            onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v) }}
          />
          {isSelected ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
          <span className="truncate text-sm">{folder.name}</span>
          {draggingCount !== undefined && draggingCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {draggingCount}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-1 group-hover:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onCreateChild(folder.id)}
            disabled={isMutating}
            title="Create subfolder"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRename(folder)}
            disabled={isMutating}
            title="Rename folder"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(folder)}
            disabled={isMutating}
            title="Move folder"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          {!folder.is_inbox ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(folder)}
              disabled={isMutating}
              title="Delete folder"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {children.length > 0 && isOpen ? (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              isMutating={isMutating}
              draggingCount={draggingCount}
              draggingFolderId={draggingFolderId ?? undefined}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
})

interface FolderTreeSidebarProps {
  folders: LibraryFolder[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string) => void
  onCreateFolder: (parentId?: string | null) => void
  onRenameFolder: (folder: LibraryFolder) => void
  onMoveFolder: (folder: LibraryFolder) => void
  onDeleteFolder: (folder: LibraryFolder) => void
  isMutating?: boolean
  draggingCount?: number
  draggingFolderId?: string | null
}

export function FolderTreeSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  isMutating,
  draggingCount,
  draggingFolderId,
}: FolderTreeSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-72 flex-col border-r border-border/80 px-3 py-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted-foreground">Folders</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onCreateFolder(null)}
          disabled={isMutating}
          title="Create folder"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-0.5 overflow-y-auto pr-1">
        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            level={0}
            selectedFolderId={selectedFolderId}
            onSelect={onSelectFolder}
            onCreateChild={(parentId) => onCreateFolder(parentId)}
            onRename={onRenameFolder}
            onMove={onMoveFolder}
            onDelete={onDeleteFolder}
            isMutating={isMutating}
            draggingCount={draggingCount}
            draggingFolderId={draggingFolderId}
          />
        ))}
      </ul>
    </aside>
  )
}
