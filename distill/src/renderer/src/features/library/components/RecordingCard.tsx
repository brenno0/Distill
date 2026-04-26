import { memo, useEffect, useState, type MouseEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Link } from '@tanstack/react-router'
import { Calendar, GripVertical, Mic, Pencil, Play, PlayCircle, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
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
  const transcriptionId = recording.transcription_id ?? recording.id
  const displayName = recording.display_name ?? recording.title ?? 'Untitled Recording'
  const isYoutube = recording.transcription_type === 'youtube' || Boolean(recording.thumbnail_url)

  const date = (() => {
    const d = new Date(recording.created_at)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return d.toLocaleDateString()
  })()

  useEffect(() => {
    setThumbnailFailed(false)
  }, [recording.thumbnail_url])

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isDragging) e.preventDefault()
  }

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

  const statusClass = {
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  }[recording.status ?? ''] ?? 'bg-muted text-muted-foreground'

  const dragHandle = (
    <div className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0 p-1">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
  )

  const actionButtons = (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
        onClick={handleRename}
        title="Rename"
      >
        <Pencil className="h-3.5 w-3.5 text-white/60" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/30"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5 text-white/60" />
      </Button>
    </div>
  )

  const cardStyle = {
    opacity: isDragging ? 0.3 : undefined,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
  }

  if (viewMode === 'list') {
    return (
      <Card
        ref={(el) => { setNodeRef(el); cardRef?.(el) }}
        {...listeners}
        {...attributes}
        className="group bg-card border-border overflow-hidden hover:border-primary/40 transition-colors relative cursor-grab active:cursor-grabbing"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ ...cardStyle, touchAction: 'none' }}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {dragHandle}
          <Link
            to="/transcription/$id"
            params={{ id: transcriptionId }}
            className="flex items-center gap-3 flex-1 min-w-0"
            onClick={handleLinkClick}
          >
            <div className="w-24 aspect-video rounded overflow-hidden shrink-0">{thumbnail}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {isYoutube
                  ? <PlayCircle className="h-3 w-3 shrink-0 text-red-400" />
                  : <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <h3 className="text-sm font-medium text-foreground truncate">{displayName}</h3>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', statusClass)}>
              {recording.status}
            </span>
          </Link>
          {actionButtons}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      ref={(el) => { setNodeRef(el); cardRef?.(el) }}
      {...listeners}
      {...attributes}
      className="group bg-card border-border overflow-hidden hover:border-primary/50 transition-colors relative cursor-grab active:cursor-grabbing"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ ...cardStyle, touchAction: 'none' }}
    >
      <Link to="/transcription/$id" params={{ id: transcriptionId }} onClick={handleLinkClick}>
        <div className="relative aspect-video bg-muted">{thumbnail}</div>
      </Link>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {dragHandle}
          <Link to="/transcription/$id" params={{ id: transcriptionId }} className="flex-1 min-w-0" onClick={handleLinkClick}>
            <div className="flex items-center gap-1.5 mb-0.5">
              {isYoutube
                ? <PlayCircle className="h-3 w-3 shrink-0 text-red-400" />
                : <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />}
              <h3 className="text-sm font-medium text-foreground truncate">{displayName}</h3>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {date}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusClass)}>
                {recording.status}
              </span>
            </div>
          </Link>
          {actionButtons}
        </div>
      </CardContent>
    </Card>
  )
})
