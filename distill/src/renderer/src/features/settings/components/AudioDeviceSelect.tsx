import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAudio } from '@renderer/lib/api/generated/audio/audio'
import { getSettings } from '@renderer/lib/api/generated/settings/settings'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { useState, useEffect, useRef } from 'react'

const audioApi = getAudio()
const settingsApi = getSettings()

interface AudioDevice {
  id: number
  name: string
}

interface MonitorSource {
  id: string
  name: string
}

interface AudioDeviceSelectProps {
  currentInputDevice: number | null | undefined
  currentOutputDevice: number | null | undefined
  currentMonitorSourceName: string | null | undefined
  currentMicSpeakerName: string | null | undefined
}

export function AudioDeviceSelect({
  currentInputDevice,
  currentOutputDevice,
  currentMonitorSourceName,
  currentMicSpeakerName,
}: AudioDeviceSelectProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState<number | null>(null)
  const [output, setOutput] = useState<number | null>(null)
  const [monitor, setMonitor] = useState<string | null>(null)
  const [micSpeakerName, setMicSpeakerName] = useState<string>('')
  const lastSavedSpeakerRef = useRef<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['audio-devices'],
    queryFn: () => audioApi.listAudioDevicesApiV1AudioDevicesGet(),
    retry: false,
  })

  useEffect(() => {
    if (currentInputDevice !== undefined) setInput(currentInputDevice ?? null)
    if (currentOutputDevice !== undefined) setOutput(currentOutputDevice ?? null)
    if (currentMonitorSourceName !== undefined) setMonitor(currentMonitorSourceName ?? null)
    if (currentMicSpeakerName !== undefined) {
      const value = currentMicSpeakerName ?? ''
      setMicSpeakerName(value)
      lastSavedSpeakerRef.current = value.trim() ? value.trim() : null
    }
  }, [currentInputDevice, currentOutputDevice, currentMonitorSourceName, currentMicSpeakerName])

  const saveMutation = useMutation({
    mutationFn: (payload: object) => settingsApi.updateSettingsApiV1SettingsPut(payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const normalizeSpeakerName = (value: string | null) => {
    const trimmed = (value ?? '').trim()
    return trimmed.length ? trimmed : null
  }

  const buildPayload = (overrides: object) => ({
    audio: {
      input_device: input,
      input_device_name: (data as any)?.input?.find((d: AudioDevice) => d.id === input)?.name ?? null,
      output_device: output,
      output_device_name: (data as any)?.output?.find((d: AudioDevice) => d.id === output)?.name ?? null,
      monitor_source_name: monitor,
      mic_speaker_name: normalizeSpeakerName(micSpeakerName),
      ...overrides,
    },
  })

  const handleInputChange = (deviceId: string) => {
    const id = deviceId === '__default__' ? null : Number(deviceId)
    setInput(id)
    const dev = (data as any)?.input?.find((d: AudioDevice) => d.id === id)
    saveMutation.mutate(buildPayload({ input_device: id, input_device_name: dev?.name ?? null }))
  }

  const handleOutputChange = (deviceId: string) => {
    const id = deviceId === '__default__' ? null : Number(deviceId)
    setOutput(id)
    const dev = (data as any)?.output?.find((d: AudioDevice) => d.id === id)
    saveMutation.mutate(buildPayload({ output_device: id, output_device_name: dev?.name ?? null }))
  }

  const handleMonitorChange = (sourceId: string) => {
    const id = sourceId === '__none__' ? null : sourceId
    setMonitor(id)
    saveMutation.mutate(buildPayload({ monitor_source_name: id }))
  }

  const commitMicSpeakerName = () => {
    const normalized = normalizeSpeakerName(micSpeakerName)
    if (normalized === lastSavedSpeakerRef.current) return
    lastSavedSpeakerRef.current = normalized
    setMicSpeakerName(normalized ?? '')
    saveMutation.mutate(buildPayload({ mic_speaker_name: normalized }))
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
  const monitorSources: MonitorSource[] = (data as any)?.monitors ?? []

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

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Capturar áudio do fone de ouvido
          </label>
          <p className="text-xs text-muted-foreground">
            Captura o que está tocando no fone — necessário para gravar reuniões
          </p>
          <Select
            value={monitor ?? '__none__'}
            onValueChange={handleMonitorChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Carregando…' : 'Desativado'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Desativado</SelectItem>
              {monitorSources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Seu nome na transcrição</label>
          <Input
            value={micSpeakerName}
            onChange={(e) => setMicSpeakerName(e.target.value)}
            onBlur={commitMicSpeakerName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitMicSpeakerName()
              }
            }}
            placeholder="Você"
          />
          <p className="text-xs text-muted-foreground">
            Esse nome identifica o áudio do seu microfone na transcrição ao vivo.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
