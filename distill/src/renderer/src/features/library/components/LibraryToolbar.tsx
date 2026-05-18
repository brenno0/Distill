import { ArrowRightLeft, Edit3, FolderPlus, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { LibraryFolder } from '../types'

interface Props {
  selectedFolder: LibraryFolder | null
  onCreateFolder: () => void
  onRenameFolder: () => void
  onMoveFolder: () => void
  onDeleteFolder: () => void
  isMutating?: boolean
}

export function LibraryToolbar({
  selectedFolder,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  isMutating,
}: Props) {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateFolder}
        disabled={isMutating}
        className="gap-1.5"
      >
        <FolderPlus className="h-3.5 w-3.5" />
        New Folder
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRenameFolder}
        disabled={!selectedFolder || isMutating}
        title="Rename selected folder"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onMoveFolder}
        disabled={!selectedFolder || isMutating}
        title="Move selected folder"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDeleteFolder}
        disabled={!selectedFolder || selectedFolder?.is_inbox || isMutating}
        title="Delete selected folder"
        className="hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
