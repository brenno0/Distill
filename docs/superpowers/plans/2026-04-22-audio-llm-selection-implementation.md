# Audio Device + LLM Selection — Implementation Plan

> REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use `- [ ]` for tracking.

**Goal:** User selects audio input/output devices and LLM provider+model from Settings page.

---

## File Map

**Backend:**
- `backend/app/models/settings.py` — add `AudioConfig`, update DTOs
- `backend/app/services/audio_recorder.py` — device param in `__init__` + `start_recording`
- `backend/app/services/recording_service.py` — pass device from settings to recorder
- `backend/app/api/v1/endpoints/audio.py` — new `GET /audio/devices`
- `backend/app/api/v1/endpoints/llm.py` — new `GET /providers/{provider}/models`
- `backend/app/main.py` — register new routers
- `backend/app/core/config.py` — add `ollama_base_url` if missing

**Frontend:**
- `distill/src/renderer/src/features/settings/components/AudioDeviceSelect.tsx` — new
- `distill/src/renderer/src/features/settings/components/LLMSettings.tsx` — extend with model dropdown
- `distill/src/renderer/src/features/settings/SettingsPage.tsx` — add AudioDeviceSelect tab
- `distill/src/renderer/src/features/settings/hooks/useSettings.ts` — add audio devices fetch
- `distill/src/renderer/src/lib/api/generated/audio/` — regenerate after backend
- `distill/src/renderer/src/lib/api/generated/llm/` — regenerate after backend

---

## Task 1: Backend — Add AudioConfig to settings model

**File:** `backend/app/models/settings.py`

- [ ] **Step 1: Add `AudioConfig` class**

```python
class AudioConfig(BaseModel):
    input_device: int | None = None
    output_device: int | None = None
    input_device_name: str | None = None
    output_device_name: str | None = None
```

- [ ] **Step 2: Update `AppSettingsUpdate`**

Add `audio: Optional[AudioConfig] = None` to `AppSettingsUpdate`.

- [ ] **Step 3: Update `AppSettingsResponse`**

Add `audio: AudioConfig = AudioConfig()` to `AppSettingsResponse`.

---

## Task 2: Backend — Make AudioRecorder device-configurable

**File:** `backend/app/services/audio_recorder.py`

- [ ] **Step 1: Update `__init__` to accept device**

```python
def __init__(self, input_device: int | None = None):
    self.is_recording = False
    self._frames: list[np.ndarray] = []
    self._stream: sd.InputStream | None = None
    self._output_path: str = ""
    self._input_device: int | None = input_device
```

- [ ] **Step 2: Update `start_recording` to use device**

```python
self._stream = sd.InputStream(
    device=self._input_device,  # None = system default
    samplerate=self.SAMPLE_RATE,
    channels=self.CHANNELS,
    callback=_callback,
    dtype=np.float32,
)
```

---

## Task 3: Backend — Create audio devices endpoint

**File:** `backend/app/api/v1/endpoints/audio.py` (new)

- [ ] **Step 1: Create endpoint**

```python
import sounddevice as sd
from fastapi import APIRouter

router = APIRouter(prefix="/audio", tags=["audio"])

@router.get("/devices")
async def list_audio_devices():
    all_devs = sd.query_devices()
    input_devs = [d for i, d in enumerate(all_devs) if d.get("max_input_channels", 0) > 0]
    output_devs = [d for i, d in enumerate(all_devs) if d.get("max_output_channels", 0) > 0]
    return {
        "input": [{"id": idx, "name": d["name"]} for idx, d in enumerate(input_devs)],
        "output": [{"id": idx, "name": d["name"]} for idx, d in enumerate(output_devs)],
    }
```

---

## Task 4: Backend — Create LLM providers endpoint

**File:** `backend/app/api/v1/endpoints/llm.py` (new)

- [ ] **Step 1: Create endpoint**

```python
import httpx
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/llm", tags=["llm"])

PROVIDER_MODELS = {
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
    "gemini": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
}

@router.get("/providers")
async def list_providers():
    return ["ollama", "openai", "anthropic", "gemini"]

@router.get("/providers/{provider}/models")
async def list_models(provider: str):
    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                models = resp.json().get("models", [])
                return [{"id": m["name"], "name": m["name"]} for m in models]
        except Exception:
            return []
    return [{"id": m, "name": m} for m in PROVIDER_MODELS.get(provider, [])]
```

- [ ] **Step 2: Check `settings.ollama_base_url` exists**

In `backend/app/core/config.py`, ensure:
```python
ollama_base_url: str = "http://localhost:11434"
```
If missing, add it.

---

## Task 5: Backend — Register new routers in main.py

**File:** `backend/app/main.py`

- [ ] **Step 1: Add imports and router registrations**

```python
from app.api.v1.endpoints import audio, llm
# ...
app.include_router(audio.router, prefix="/api/v1/audio", tags=["audio"])
app.include_router(llm.router, prefix="/api/v1/llm", tags=["llm"])
```

---

## Task 6: Backend — Update RecordingService to use device from settings

**File:** `backend/app/services/recording_service.py`

- [ ] **Step 1: Read current file first**

- [ ] **Step 2: Import `app_settings_repo` and fetch audio device on start**

In `RecordingService.start()`, before starting recorder:
```python
# Get input device from settings
settings_resp = await app_settings_repo.get()
audio_config = settings_resp.get("audio", {}) or {}
input_device = audio_config.get("input_device")
```

- [ ] **Step 3: Pass device to AudioRecorder**

Currently uses singleton `audio_recorder`. Options:
- Option A: Recreate recorder per session: `recorder = AudioRecorder(input_device=input_device)`
- Option B: Add `configure(device)` method to singleton

Option A is cleaner — recorders are short-lived per session anyway.

---

## Task 7: Frontend — Regenerate API client

**File:** `distill/`

- [ ] **Step 1: Run openapi generator**

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor/distill
npm run api:generate
```

- [ ] **Step 2: Verify generated files** include `AudioDevicesResponse`, `LLMProvidersResponse`, `LLMModelsResponse`

---

## Task 8: Frontend — AudioDeviceSelect component

**File:** `distill/src/renderer/src/features/settings/components/AudioDeviceSelect.tsx` (new)

- [ ] **Step 1: Create component**

```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@renderer/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { useState, useEffect } from 'react'

interface AudioDevice {
  id: number
  name: string
}

export function AudioDeviceSelect() {
  const { data, isLoading } = useQuery({
    queryKey: ['audio-devices'],
    queryFn: api.audio.getAudioDevicesApiV1AudioDevicesGet,
  })

  const [input, setInput] = useState<number | null>(null)
  const [output, setOutput] = useState<number | null>(null)

  // Initialize from current settings
  useEffect(() => {
    if (data) {
      setInput(Number(data.default_input ?? data.input?.[0]?.id ?? ''))
      setOutput(Number(data.default_output ?? data.output?.[0]?.id ?? ''))
    }
  }, [data])

  const handleInputChange = async (deviceId: string) => {
    setInput(Number(deviceId))
    const device = data?.input.find(d => d.id === Number(deviceId))
    await api.settings.updateSettingsApiV1SettingsPut({
      audio: {
        input_device: Number(deviceId),
        input_device_name: device?.name ?? null,
        output_device: output ?? null,
        output_device_name: data?.output.find(d => d.id === output)?.name ?? null,
      },
    })
  }

  const handleOutputChange = async (deviceId: string) => {
    setOutput(Number(deviceId))
    const device = data?.output.find(d => d.id === Number(deviceId))
    await api.settings.updateSettingsApiV1SettingsPut({
      audio: {
        input_device: input ?? null,
        input_device_name: data?.input.find(d => d.id === input)?.name ?? null,
        output_device: Number(deviceId),
        output_device_name: device?.name ?? null,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispositivos de Áudio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Microfone</label>
          <Select value={input != null ? String(input) : ''} onValueChange={handleInputChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o microfone" />
            </SelectTrigger>
            <SelectContent>
              {data?.input.map((d: AudioDevice) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Auto-falantes</label>
          <Select value={output != null ? String(output) : ''} onValueChange={handleOutputChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione os auto-falantes" />
            </SelectTrigger>
            <SelectContent>
              {data?.output.map((d: AudioDevice) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Task 9: Frontend — Update LLMSettings with model dropdown per provider

**File:** `distill/src/renderer/src/features/settings/components/LLMSettings.tsx`

Read current file first (it exists with provider toggle buttons).

- [ ] **Step 1: Add model dropdown below provider selection**

Key changes:
- Add `useQuery` for `GET /llm/providers/{provider}/models` on provider change
- Add `Select` for model with options from API
- Replace native `<select>` with Radix `Select` component
- Show loading state while fetching models
- Show "No models found" if ollama server unreachable

---

## Task 10: Frontend — Add AudioDeviceSelect to SettingsPage

**File:** `distill/src/renderer/src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: Import `AudioDeviceSelect`**

```tsx
import { AudioDeviceSelect } from './components/AudioDeviceSelect'
```

- [ ] **Step 2: Add tab/section for audio devices**

Add a nav button "Dispositivos de Áudio" that shows `AudioDeviceSelect` instead of `LLMSettings`.

---

## Task 11: Run typecheck + backend test

**Files:** `backend/`, `distill/`

- [ ] **Step 1: Backend syntax check**

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor/backend
python -c "from app.main import app; print('OK')"
```

- [ ] **Step 2: Frontend typecheck**

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor/distill
npm run typecheck
```

- [ ] **Step 3: Manual test checklist**
1. `GET /api/v1/audio/devices` — returns input/output device list
2. `GET /api/v1/llm/providers` — returns `["ollama","openai","anthropic","gemini"]`
3. `GET /api/v1/llm/providers/ollama/models` — returns ollama models (or empty if server down)
4. `GET /api/v1/llm/providers/openai/models` — returns hardcoded openai models
5. Settings page shows AudioDeviceSelect with correct device list
6. Settings page shows LLM provider + model dropdowns
7. Select model → `PUT /api/v1/settings` called with updated config
8. Select audio device → `PUT /api/v1/settings` called with device config

---

## Task 12: Commit

```bash
cd /home/brenno/Documentos/Trabalho/Pessoais/Whisper\ transcriptor
git add backend/app/models/settings.py
git add backend/app/services/audio_recorder.py
git add backend/app/services/recording_service.py
git add backend/app/api/v1/endpoints/audio.py
git add backend/app/api/v1/endpoints/llm.py
git add backend/app/main.py
git add distill/src/renderer/src/features/settings/
git commit -m "feat(settings): audio device and LLM provider/model selection

Backend: GET /audio/devices, GET /llm/providers/{p}/models.
AudioRecorder accepts input_device param. Settings persist audio config.
Frontend: AudioDeviceSelect and LLMSettings with Radix Select components.
Uses sounddevice, httpx, @dnd-kit/core.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
