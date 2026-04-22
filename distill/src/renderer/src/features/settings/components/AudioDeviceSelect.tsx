import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAudio } from '@renderer/lib/api/generated/audio/audio'
import { getSettings } from '@renderer/lib/api/generated/settings/settings'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { useState, useEffect } from 'react'

const audioApi = getAudio()
const settingsApi = getSettings()

interface AudioDevice {
  id: number
  name: string
}

interface AudioDeviceSelectProps {
  currentInputDevice: number | null | undefined
  currentOutputDevice: number | null | undefined
}

export function AudioDeviceSelect({ currentInputDevice, currentOutputDevice }: AudioDeviceSelectProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState<number | null>(null)
  const [output, setOutput] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['audio-devices'],
    queryFn: () => audioApi.listAudioDevicesApiV1AudioDevicesGet(),
    retry: false,
  })

  useEffect(() => {
    if (currentInputDevice !== undefined) setInput(currentInputDevice ?? null)
    if (currentOutputDevice !== undefined) setOutput(currentOutputDevice ?? null)
  }, [currentInputDevice, currentOutputDevice])

  const saveMutation = useMutation({
    mutationFn: (payload: object) => settingsApi.updateSettingsApiV1SettingsPut(payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleInputChange = (deviceId: string) => {
    const id = deviceId === '__default__' ? null : Number(deviceId)
    setInput(id)
    const dev = (data as any)?.input?.find((d: AudioDevice) => d.id === id)
    saveMutation.mutate({
      audio: {
        input_device: id,
        input_device_name: dev?.name ?? null,
        output_device: output,
        output_device_name: (data as any)?.output?.find((d: AudioDevice) => d.id === output)?.name ?? null,
      },
    })
  }

  const handleOutputChange = (deviceId: string) => {
    const id = deviceId === '__default__' ? null : Number(deviceId)
    setOutput(id)
    const dev = (data as any)?.output?.find((d: AudioDevice) => d.id === id)
    saveMutation.mutate({
      audio: {
        input_device: input,
        input_device_name: (data as any)?.input?.find((d: AudioDevice) => d.id === input)?.name ?? null,
        output_device: id,
        output_device_name: dev?.name ?? null,
      },
    })
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load audio devices.</p>
        </CardContent>
      </Card>
    )
  }

  const inputDevices: AudioDevice[] = (data as any)?.input ?? []
  const outputDevices: AudioDevice[] = (data as any)?.output ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispositivos de Áudio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Microfone</label>
          <Select
            value={input != null ? String(input) : '__default__'}
            onValueChange={handleInputChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Carregando…' : 'Selecione o microfone'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Padrão do sistema</SelectItem>
              {inputDevices.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Auto-falantes</label>
          <Select
            value={output != null ? String(output) : '__default__'}
            onValueChange={handleOutputChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Carregando…' : 'Selecione os auto-falantes'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Padrão do sistema</SelectItem>
              {outputDevices.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
