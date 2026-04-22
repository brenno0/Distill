import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import type { LibraryFolder } from '../types'

interface Props {
  open: boolean
  mode: 'create' | 'rename' | 'move' | 'item-move' | 'item-rename'
  folder?: LibraryFolder
  folders: LibraryFolder[]
  itemId?: string
  itemDisplayName?: string
  onConfirm: (name: string, parentId?: string | null) => void
  onCancel: () => void
}

export function FolderDialog({ open, mode, folder, folders, itemDisplayName, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(itemDisplayName ?? folder?.name ?? '')
  const [parentId, setParentId] = useState<string | null>(folder?.parent_id ?? null)

  const isCreate = mode === 'create'
  const isRename = mode === 'rename' || mode === 'item-rename'
  const isMove = mode === 'move' || mode === 'item-move'
  const isItem = mode === 'item-move' || mode === 'item-rename'

  const flatFolders = folders.flatMap((f) => [f, ...(f.children ?? []).flatMap((c) => [c, ...(c.children ?? [])])])
  const isSelf = (id: string) => id === folder?.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((isCreate || isRename) && !name.trim()) return
    onConfirm(name.trim(), parentId)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isCreate ? 'Create folder' : isRename ? 'Rename item' : isMove && isItem ? 'Move item' : isMove ? 'Move folder' : 'Folder'}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Choose a name for the new folder.'
                : isRename
                ? `Renaming "${isItem ? itemDisplayName : folder?.name}".`
                : isMove && isItem
                ? 'Move to a folder.'
                : `Moving "${folder?.name}". Select destination.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-3">
            {(isCreate || isRename) && (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRename ? 'New name' : 'Folder name'}
              />
            )}

            {isMove && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">Destination folder</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border rounded-md p-2">
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded px-2 py-1 text-sm text-left hover:bg-accent ${parentId === null ? 'bg-accent' : ''}`}
                    onClick={() => setParentId(null)}
                  >
                    <span className="text-muted-foreground">/</span> Root (no folder)
                  </button>
                  {flatFolders
                    .filter((f) => !isSelf(f.id))
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`flex items-center gap-2 rounded px-2 py-1 text-sm text-left hover:bg-accent ${parentId === f.id ? 'bg-accent' : ''}`}
                        onClick={() => setParentId(f.id)}
                      >
                        <span className="text-muted-foreground">{'  '}</span>
                        {f.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreate && !name.trim()}>
              {isCreate ? 'Create' : isRename ? 'Save' : 'Move'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
