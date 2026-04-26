import { axiosInstance } from '@renderer/lib/axios'
import type { LibraryItemsResponse, LibraryTreeResponse } from '../types'

export const getLibraryApi = () => {
  const getFolderTree = () => {
    return axiosInstance<LibraryTreeResponse>({
      url: '/api/v1/library/folders/tree',
      method: 'GET',
    })
  }

  const listItemsByFolder = (folderId: string) => {
    return axiosInstance<LibraryItemsResponse>({
      url: '/api/v1/library/items',
      method: 'GET',
      params: { folder_id: folderId },
    })
  }

  const createFolder = (payload: { name: string; parent_id?: string | null }) => {
    return axiosInstance<{ id: string }>({
      url: '/api/v1/library/folders',
      method: 'POST',
      data: payload,
    })
  }

  const renameFolder = (folderId: string, name: string) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/folders/${folderId}`,
      method: 'PATCH',
      data: { name },
    })
  }

  const moveFolder = (folderId: string, parentId: string | null) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/folders/${folderId}/move`,
      method: 'POST',
      data: { new_parent_id: parentId },
    })
  }

  const deleteFolder = (folderId: string) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/folders/${folderId}`,
      method: 'DELETE',
    })
  }

  const renameItem = (itemId: string, displayName: string) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/items/${itemId}`,
      method: 'PATCH',
      data: { display_name: displayName },
    })
  }

  const moveItem = (itemId: string, folderId: string) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/items/${itemId}/move`,
      method: 'POST',
      data: { folder_id: folderId },
    })
  }

  const deleteItem = (itemId: string) => {
    return axiosInstance<unknown>({
      url: `/api/v1/library/items/${itemId}`,
      method: 'DELETE',
    })
  }

  return {
    getFolderTree,
    listItemsByFolder,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    renameItem,
    moveItem,
    deleteItem,
  }
}
