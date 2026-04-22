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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCreateFolder} disabled={isMutating}>
        <FolderPlus className="h-4 w-4" />
        New Folder
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRenameFolder}
        disabled={!selectedFolder || isMutating}
      >
        <Edit3 className="h-4 w-4" />
        Rename Folder
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onMoveFolder}
        disabled={!selectedFolder || isMutating}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Move Folder
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDeleteFolder}
        disabled={!selectedFolder || selectedFolder?.is_inbox || isMutating}
      >
        <Trash2 className="h-4 w-4" />
        Delete Folder
      </Button>
    </div>
  )
}
