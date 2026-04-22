import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getLibraryApi } from '../lib/libraryApi'
import type { LibraryFolder } from '../types'

const libraryApi = getLibraryApi()

const flattenFolders = (folders: LibraryFolder[]): LibraryFolder[] => {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])])
}

const findInboxFolderId = (folders: LibraryFolder[]): string | null => {
  const allFolders = flattenFolders(folders)
  const inbox = allFolders.find(
    (folder) => folder.is_inbox || folder.name.toLowerCase() === 'inbox',
  )
  return inbox?.id ?? allFolders[0]?.id ?? null
}

export function useLibrary() {
  const queryClient = useQueryClient()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const { data: folderTreeData, isLoading: isTreeLoading } = useQuery({
    queryKey: ['library', 'folders', 'tree'],
    queryFn: () => libraryApi.getFolderTree(),
    retry: false,
  })

  const folders = folderTreeData?.folders ?? []

  const effectiveSelectedFolderId = useMemo(() => {
    return selectedFolderId ?? findInboxFolderId(folders)
  }, [selectedFolderId, folders])

  const { data: itemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['library', 'items', effectiveSelectedFolderId],
    queryFn: () => libraryApi.listItemsByFolder(effectiveSelectedFolderId as string),
    enabled: Boolean(effectiveSelectedFolderId),
    retry: false,
  })

  const createFolderMutation = useMutation({
    mutationFn: (payload: { name: string; parent_id?: string | null }) => libraryApi.createFolder(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'folders'] })
    },
  })

  const renameFolderMutation = useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      libraryApi.renameFolder(folderId, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'folders'] })
    },
  })

  const moveFolderMutation = useMutation({
    mutationFn: ({ folderId, parentId }: { folderId: string; parentId: string | null }) =>
      libraryApi.moveFolder(folderId, parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'folders'] })
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => libraryApi.deleteFolder(folderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'folders'] })
      await queryClient.invalidateQueries({ queryKey: ['library', 'items'] })
      setSelectedFolderId(null)
    },
  })

  const renameItemMutation = useMutation({
    mutationFn: ({ itemId, displayName }: { itemId: string; displayName: string }) =>
      libraryApi.renameItem(itemId, displayName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'items'] })
    },
  })

  const moveItemMutation = useMutation({
    mutationFn: ({ itemId, folderId }: { itemId: string; folderId: string }) =>
      libraryApi.moveItem(itemId, folderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'items'] })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => libraryApi.deleteItem(itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library', 'items'] })
    },
  })

  return {
    folders,
    items: itemsData?.items ?? [],
    selectedFolderId: effectiveSelectedFolderId,
    setSelectedFolderId,
    createFolder: createFolderMutation.mutate,
    renameFolder: renameFolderMutation.mutate,
    moveFolder: moveFolderMutation.mutate,
    deleteFolder: deleteFolderMutation.mutate,
    renameItem: renameItemMutation.mutate,
    moveItem: moveItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    deletingId: deleteItemMutation.isPending ? (deleteItemMutation.variables as string) : null,
    isMutating:
      createFolderMutation.isPending ||
      renameFolderMutation.isPending ||
      moveFolderMutation.isPending ||
      deleteFolderMutation.isPending ||
      renameItemMutation.isPending ||
      moveItemMutation.isPending ||
      deleteItemMutation.isPending,
    isLoading: isTreeLoading || isItemsLoading,
  }
}
