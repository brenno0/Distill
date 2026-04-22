import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getSettings } from '@renderer/lib/api/generated/settings/settings'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'

const settingsApi = getSettings()

export function useSettings() {
  const queryClient = useQueryClient()
  const setProvider = useSettingsStore((s) => s.setProvider)
  const setModel = useSettingsStore((s) => s.setModel)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettingsApiV1SettingsGet(),
    retry: false,
  })

  useEffect(() => {
    if (settings?.llm?.provider) setProvider(settings.llm.provider)
    if (settings?.llm?.model) setModel(settings.llm.model)
  }, [settings, setProvider, setModel])

  const saveMutation = useMutation({
    mutationFn: settingsApi.updateSettingsApiV1SettingsPut,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (data?.llm?.provider) setProvider(data.llm.provider)
      if (data?.llm?.model) setModel(data.llm.model)
    },
  })

  return {
    settings,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    isLoading,
  }
}
