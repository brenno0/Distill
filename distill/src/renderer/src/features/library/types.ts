export interface LibraryFolder {
  id: string
  name: string
  parent_id?: string | null
  is_inbox?: boolean
  children?: LibraryFolder[]
}

export interface LibraryItem {
  id: string
  transcription_id?: string | null
  folder_id?: string | null
  display_name?: string | null
  title?: string | null
  summary?: string | null
  status: string
  transcription_type?: 'meeting' | 'youtube' | null
  created_at: string
  thumbnail_url?: string | null
}

export interface LibraryTreeResponse {
  folders: LibraryFolder[]
}

export interface LibraryItemsResponse {
  items: LibraryItem[]
}

export type DragData =
  | { type: 'item'; id: string; folderId: string | null }
  | { type: 'folder'; id: string; parentId: string | null | undefined }
