import { Suspense, useState } from 'react'
import { useSettings } from './hooks/useSettings'
import { LLMSettings } from './components/LLMSettings'
import { AudioDeviceSelect } from './components/AudioDeviceSelect'
import { SystemStatus } from './components/SystemStatus'
import { SettingsPageSkeleton, SettingsStatusSkeleton } from './components/SettingsPageSkeleton'

type Section = 'llm' | 'audio' | 'status'

const NAV: { id: Section; label: string }[] = [
  { id: 'llm', label: 'LLM Provider' },
  { id: 'audio', label: 'Dispositivos' },
  { id: 'status', label: 'System Status' },
]

function SettingsContent() {
  const [section, setSection] = useState<Section>('llm')
  const { settings, save, isSaving, isLoading } = useSettings()

  if (isLoading) {
    return <SettingsPageSkeleton />
  }

  return (
    <div className="flex h-full">
      <nav className="w-44 shrink-0 border-r border-border p-4 space-y-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              section === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-lg font-semibold tracking-tight mb-6">{NAV.find((n) => n.id === section)?.label}</h1>

        {section === 'llm' && (
          <LLMSettings
            currentProvider={(settings as any)?.llm?.provider ?? 'ollama'}
            currentModel={(settings as any)?.llm?.model ?? ''}
            hasOpenAIKey={!!(settings as any)?.has_openai_key}
            hasGoogleKey={!!(settings as any)?.has_google_key}
            hasAnthropicKey={!!(settings as any)?.has_anthropic_key}
            onSave={save}
            isSaving={isSaving}
          />
        )}

        {section === 'audio' && (
          <AudioDeviceSelect
            currentInputDevice={(settings as any)?.audio?.input_device}
            currentOutputDevice={(settings as any)?.audio?.output_device}
            currentMonitorSourceName={(settings as any)?.audio?.monitor_source_name}
            currentMicSpeakerName={(settings as any)?.audio?.mic_speaker_name}
          />
        )}

        {section === 'status' && (
          <Suspense
            fallback={
              <SettingsStatusSkeleton />
            }
          >
            <SystemStatus />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <Suspense
      fallback={
        <SettingsPageSkeleton />
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
