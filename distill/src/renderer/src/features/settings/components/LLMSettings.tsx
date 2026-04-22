import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLlm } from '@renderer/lib/api/generated/llm/llm'
import { LLMSettingsSavingSkeleton } from './LLMSettingsSavingSkeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

const PROVIDERS = ['ollama', 'openai', 'anthropic', 'gemini'] as const
type Provider = typeof PROVIDERS[number]

const PLACEHOLDERS: Record<string, { key: string; model: string }> = {
  openai: { key: 'sk-…', model: 'gpt-4o' },
  gemini: { key: 'AIza…', model: 'gemini-2.0-flash' },
  anthropic: { key: 'sk-ant-…', model: 'claude-opus-4-7' },
}

const llmApi = getLlm()

interface LLMSettingsProps {
  currentProvider: string
  currentModel: string
  hasOpenAIKey: boolean
  hasGoogleKey: boolean
  hasAnthropicKey: boolean
  onSave: (data: any) => void
  isSaving: boolean
}

export function LLMSettings({
  currentProvider,
  currentModel,
  hasOpenAIKey,
  hasGoogleKey,
  hasAnthropicKey,
  onSave,
  isSaving,
}: LLMSettingsProps) {
  const [provider, setProvider] = useState<Provider>(
    PROVIDERS.includes(currentProvider as Provider) ? (currentProvider as Provider) : 'ollama',
  )
  const [model, setModel] = useState(currentModel)
  const [apiKey, setApiKey] = useState('')

  const secretFieldByProvider: Record<string, string> = {
    openai: 'openai_api_key',
    gemini: 'google_api_key',
    anthropic: 'anthropic_api_key',
  }

  const hasKey: Record<string, boolean> = {
    openai: hasOpenAIKey,
    gemini: hasGoogleKey,
    anthropic: hasAnthropicKey,
  }

  const { data: providerModels, isLoading: isLoadingModels } = useQuery({
    queryKey: ['llm-models', provider],
    queryFn: () => llmApi.listModelsApiV1LlmProvidersProviderModelsGet(provider),
    enabled: provider === 'ollama',
    retry: false,
  })

  useEffect(() => {
    if (currentProvider && PROVIDERS.includes(currentProvider as Provider)) {
      setProvider(currentProvider as Provider)
    }
  }, [currentProvider])

  useEffect(() => {
    setModel(currentModel)
  }, [currentModel])

  const models: Array<{ id: string; name: string }> = (providerModels as any) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelo LLM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <div className="flex gap-2 flex-wrap">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                  provider === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          {provider === 'ollama' && models.length > 0 ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PLACEHOLDERS[provider]?.model ?? 'model-name'}
            />
          )}
          {provider === 'ollama' && isLoadingModels && (
            <p className="text-xs text-muted-foreground">Carregando modelos do Ollama…</p>
          )}
          {provider === 'ollama' && !isLoadingModels && models.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum modelo encontrado. Verifique se o servidor Ollama está rodando.
            </p>
          )}
        </div>

        {provider !== 'ollama' && (
          <div className="space-y-2">
            <Label>API Key {hasKey[provider] && <span className="text-green-500 normal-case ml-1">✓ salva</span>}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={PLACEHOLDERS[provider]?.key}
              className="font-mono"
            />
          </div>
        )}

        <button
          onClick={() => {
            const secretField = secretFieldByProvider[provider]
            const secrets = secretField && apiKey.trim() ? { [secretField]: apiKey.trim() } : undefined
            onSave({ llm: { provider, model }, secrets })
            setApiKey('')
          }}
          disabled={isSaving}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {isSaving ? 'Salvando…' : 'Salvar'}
        </button>
        {isSaving && <LLMSettingsSavingSkeleton />}
      </CardContent>
    </Card>
  )
}
