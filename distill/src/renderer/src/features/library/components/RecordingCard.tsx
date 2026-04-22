import { memo, useEffect, useState, type MouseEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Link } from '@tanstack/react-router'
import { Calendar, Pencil, Play, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import type { LibraryItem, LibraryFolder, DragData } from '../types'

interface Props {
  recording: LibraryItem
  folders: LibraryFolder[]
  viewMode: 'grid' | 'list'
  onDelete: (id: string) => void
  onRenameDialog: (itemId: string, displayName: string) => void
  isDeleting?: boolean
  cardRef?: (el: HTMLDivElement | null) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  dndId?: string
}

export const RecordingCard = memo(function RecordingCard({
  recording,
  folders: _folders,
  viewMode,
  onDelete,
  onRenameDialog,
  isDeleting,
  cardRef,
  onMouseEnter,
  onMouseLeave,
  dndId,
}: Props) {
  const id = dndId ?? recording.id
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${id}`,
    data: { type: 'item', id, folderId: recording.folder_id ?? null } satisfies DragData,
  })
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const date = new Date(recording.created_at).toLocaleDateString()
  const transcriptionId = recording.transcription_id ?? recording.id
  const displayName = recording.display_name ?? recording.title ?? 'Untitled Recording'

  useEffect(() => {
    setThumbnailFailed(false)
  }, [recording.thumbnail_url])

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(recording.id)
  }

  const handleRename = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onRenameDialog(recording.id, displayName)
  }

  const thumbnail = recording.thumbnail_url && !thumbnailFailed ? (
    <img
      src={recording.thumbnail_url}
      alt={displayName}
      className="h-full w-full object-cover"
      onError={() => setThumbnailFailed(true)}
    />
  ) : (
    <div className="h-full w-full bg-muted flex items-center justify-center">
      <Play className="h-5 w-5 text-muted-foreground" />
    </div>
  )

  const actionButtons = (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="bg-black/40 hover:bg-black/60"
        onClick={handleRename}
        title="Rename item"
      >
        <Pencil className="h-3.5 w-3.5 text-white" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="bg-black/40 hover:bg-destructive/80"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Delete recording"
      >
        <Trash2 className="h-3.5 w-3.5 text-white" />
      </Button>
    </div>
  )

  if (viewMode === 'list') {
    return (
      <Card
        ref={(el) => { setNodeRef(el); cardRef?.(el) }}
        className="bg-card border-border overflow-hidden cursor-grab active:cursor-grabbing transition-colors relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ opacity: isDragging ? 0.4 : undefined, transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined }}
        {...listeners}
        {...attributes}
      >
        {actionButtons}
        <Link to="/transcription/$id" params={{ id: transcriptionId }}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-32 aspect-video rounded overflow-hidden shrink-0">{thumbnail}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate mb-1">{displayName}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {date}
                </span>
              </div>
            </div>
            <Badge variant="secondary">{recording.status}</Badge>
          </CardContent>
        </Link>
      </Card>
    )
  }

  return (
    <Card
      ref={(el) => { setNodeRef(el); cardRef?.(el) }}
      className="bg-card border-border overflow-hidden cursor-grab active:cursor-grabbing group hover:border-primary/50 transition-colors relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ opacity: isDragging ? 0.4 : undefined, transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined }}
      {...listeners}
      {...attributes}
    >
      {actionButtons}
      <Link to="/transcription/$id" params={{ id: transcriptionId }}>
        <div className="relative aspect-video bg-muted">{thumbnail}</div>
        <CardContent className="p-4">
          <h3 className="font-medium text-foreground truncate mb-1">{displayName}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">
              {recording.status}
            </Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
})
