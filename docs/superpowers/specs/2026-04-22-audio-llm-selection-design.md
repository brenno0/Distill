# Audio Device + LLM Selection — Design Spec

## Objetivo

Permitir que o usuário selecione:
1. **Dispositivo de entrada de áudio** (microfone)
2. **Dispositivo de saída de áudio** (auto-falantes)
3. **Provider LLM + modelo** — dinâmico, detecta modelos disponíveis por provider

## Arquitetura

```
Frontend (distill)
  ├── Settings Page
  │     ├── AudioDeviceSelect (input + output)
  │     └── LLMSelect (provider dropdown + model dropdown)
  │
  └── GET /audio/devices        → lista devices
  └── GET /llm/providers/{p}/models → lista modelos do provider
  └── PUT /settings             → salva config

Backend (FastAPI)
  ├── GET  /audio/devices        → sounddevice.query_devices()
  ├── GET  /llm/providers/{provider}/models
  │     ├── ollama  → GET /api/tags (ollama server)
  │     ├── openai  → list hardcoded (API key necessária)
  │     ├── anthropic → list hardcoded
  │     └── gemini   → list hardcoded
  └── PUT  /settings            → atualiza provider/model
```

## Backend

### `GET /audio/devices`

Retorna listas de devices de entrada e saída.

```python
# Implementado em: app/api/v1/endpoints/audio.py (novo)
import sounddevice as sd

def _query_devices():
    all_devs = sd.query_devices()
    input_devs = [d for d in all_devs if d.get("max_input_channels", 0) > 0]
    output_devs = [d for d in all_devs if d.get("max_output_channels", 0) > 0]
    return {
        "input": [{"id": i, "name": d["name"]} for i, d in enumerate(input_devs)],
        "output": [{"id": i, "name": d["name"]} for i, d in enumerate(output_devs)],
    }
```

### `GET /llm/providers/{provider}/models`

Lista modelos disponíveis por provider.

| Provider | Fonte |
|----------|-------|
| `ollama` | `GET {ollama_base_url}/api/tags` — modelos instalados |
| `openai` | hardcoded list (precisa key) |
| `anthropic` | hardcoded list (precisa key) |
| `gemini` | hardcoded list (precisa key) |

```python
# Implementado em: app/api/v1/endpoints/llm.py (novo)
@router.get("/providers/{provider}/models")
async def list_models(provider: str):
    if provider == "ollama":
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            models = resp.json().get("models", [])
            return [{"id": m["name"], "name": m["name"]} for m in models]
    return [{"id": m, "name": m} for m in PROVIDER_MODELS.get(provider, [])]
```

### AudioRecorder com device configurável

```python
# Modificado em: app/services/audio_recorder.py
def __init__(self, input_device: int | None = None):
    self._input_device = input_device  # None = default

def start_recording(self):
    self._stream = sd.InputStream(
        device=self._input_device,  # Usa configurado ou default
        samplerate=self.SAMPLE_RATE,
        channels=self.CHANNELS,
        callback=_callback,
        dtype=np.float32,
    )
```

### Salvar config

Adicionar campos no `AppSettingsUpdate` / `AppSettingsResponse`:

```python
# Modificado em: app/models/settings.py
class AudioConfig(BaseModel):
    input_device: int | None = None
    output_device: int | None = None
    input_device_name: str | None = None
    output_device_name: str | None = None

class AppSettingsUpdate(BaseModel):
    audio: Optional[AudioConfig] = None
    # ...existing fields...

class AppSettingsResponse(BaseModel):
    audio: AudioConfig
    # ...existing fields...
```

## Frontend (distill)

### `AudioDeviceSelect.tsx`

```tsx
// src/components/settings/AudioDeviceSelect.tsx
export function AudioDeviceSelect() {
  const { data } = useQuery({ queryKey: ["audio-devices"], queryFn: api.getAudioDevices });
  const [input, setInput] = useState<number | null>(null);
  const [output, setOutput] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setInput(data.default_input);
      setOutput(data.default_output);
    }
  }, [data]);

  return (
    <Card>
      <CardHeader>Dispositivos de Áudio</CardHeader>
      <CardContent className="space-y-4">
        <Select label="Microfone" value={input} onValueChange={setInput}>
          {data?.input.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
        </Select>
        <Select label="Auto-falantes" value={output} onValueChange={setOutput}>
          {data?.output.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
        </Select>
      </CardContent>
    </Card>
  );
}
```

### `LLMSelect.tsx`

```tsx
// src/components/settings/LLMSelect.tsx
export function LLMSelect() {
  const { data: providers } = useQuery({ queryKey: ["llm-providers"], queryFn: api.getLLMProviders });
  const [provider, setProvider] = useState(settings.llm.provider);
  const { data: models } = useQuery({
    queryKey: ["llm-models", provider],
    queryFn: () => api.getLLMModels(provider),
    enabled: !!provider,
  });

  return (
    <Card>
      <CardHeader>Modelo LLM</CardHeader>
      <CardContent className="space-y-4">
        <Select label="Provider" value={provider} onValueChange={setProvider}>
          {providers?.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </Select>
        <Select label="Modelo" value={settings.llm.model} onValueChange={v => saveModel(v)}>
          {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
        </Select>
      </CardContent>
    </Card>
  );
}
```

## Data Flow — Gravação

```
Usuário clica "Gravar"
  → GET /settings → AudioConfig.input_device = 2
  → AudioRecorder(input_device=2).start_recording()
  → Grava do device correto
```

## Testes

- `GET /audio/devices` → retorna devices do sistema
- `GET /llm/providers/ollama/models` → retorna modelos instalados
- AudioRecorder com `input_device=X` → graxa do device correto
- PUT /settings com audio config → salva device IDs
- Frontend: dropdown atualiza quando provider muda

---

# Real-Time Transcription — Design Spec

## Objetivo

Transcrição em tempo real durante gravação:
- **Streaming chunks** — a cada 30s de áudio, transcreve chunk e envia via WebSocket
- **Full transcription** — ao parar de gravar, transcreve arquivo completo
- Feedback visual contínuo pro usuário saber se está funcionando

## Arquitetura

```
Frontend
  ├── "Gravar" clicado
  │     ├── POST /recordings/start  → transcription_id
  │     └── POST /recordings/stream-start → inicia thread de transcrição em chunks
  ├── Recebe via WebSocket (client_id = transcription_id):
  │     ├── transcription_chunk: { text, timestamp }
  │     └── transcription_complete: { text, segments }
  └── "Parar" clicado → POST /recordings/stop
        └── Backend: full transcription + WebSocket final

Backend
  ├── POST /recordings/start → inicia AudioRecorder
  ├── POST /recordings/stream-start → inicia StreamTranscriber (thread)
  │     └── A cada CHUNK_DURATION=30s:
  │           ├── Salva chunk WAV temporário
  │           ├── WhisperX transcreve chunk
  │           └── ws_manager.send(client_id, event)
  ├── POST /recordings/stop → para AudioRecorder + StreamTranscriber
  │     └── Transcreve arquivo completo (pipeline existente)
  └── GET /recordings/level → VU meter (já existe)
```

## Implementação

### StreamTranscriber (nova classe)

```python
# Novo arquivo: app/services/stream_transcriber.py
import threading
import whisperx
import soundfile as sf
import numpy as np

CHUNK_DURATION = 30  # segundos por chunk

class StreamTranscriber:
    """
    Thread que roda em paralelo à gravação.
    A cada CHUNK_DURATION segundos:
    1. Salva os frames acumulados como WAV temporário
    2. Transcreve com WhisperX
    3. Envia resultado via WebSocket
    """
    def __init__(self, frames: list, transcription_id: str, ws_manager, language="pt"):
        self._frames = frames  # Shared list com AudioRecorder
        self._transcription_id = transcription_id
        self._ws_manager = ws_manager
        self._language = language
        self._running = True
        self._thread: threading.Thread | None = None

    def start(self):
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self):
        import whisperx
        model = whisperx.load_model("large-v3", device="cuda")
        idx = 0
        while self._running:
            time.sleep(CHUNK_DURATION)
            if not self._running:
                break
            # Copia frames até agora
            recent = self._frames.copy()
            if len(recent) < 10:
                continue
            audio = np.concatenate(recent, axis=0)
            tmp = f"/tmp/stream_chunk_{self._transcription_id}_{idx}.wav"
            sf.write(tmp, audio, 16000)
            result = model.transcribe(tmp, language=self._language)
            text = " ".join(s.get("text","").strip() for s in result.get("segments",[]))
            asyncio.run(self._ws_manager.send(
                self._transcription_id,
                {"type": "transcription_chunk", "text": text, "chunk": idx}
            ))
            idx += 1
```

### RecordingService atualizado

```python
# Modificado em: app/services/recording_service.py
class RecordingService:
    def __init__(self):
        self._stream_transcriber: StreamTranscriber | None = None

    async def stream_start(self, transcription_id: str):
        audio_recorder.start_recording()
        self._stream_transcriber = StreamTranscriber(
            frames=audio_recorder._frames,
            transcription_id=transcription_id,
            ws_manager=ws_manager,
        )
        self._stream_transcriber.start()
        return {"message": "Streaming started"}

    async def stop(self):
        if self._stream_transcriber:
            self._stream_transcriber.stop()
            self._stream_transcriber = None
        audio_path = audio_recorder.stop_recording()
        # Full transcription em background...
        return {"audio_path": audio_path}
```

### WebSocket atualizado

```python
# Modificado em: app/api/v1/endpoints/ws.py
# Adicionar método send no ws_manager se não existir
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            #heartbeat: cliente pode enviar "ping"
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
```

### Eventos WebSocket

| Evento | Payload | Quando |
|--------|---------|--------|
| `transcription_chunk` | `{type, text, chunk}` | A cada 30s de gravação |
| `transcription_progress` | `{type, progress, language}` | Durante transcrição final |
| `transcription_complete` | `{type, text, id}` | Após parar de gravar |

## Frontend

```tsx
// Stream de transcrição no componente de gravação
const ws = useRef<WebSocket | null>(null);

function startRecording() {
  const { transcription_id } = await api.startRecording();
  await api.streamStart(transcription_id);
  const wsUrl = `ws://localhost:8000/api/v1/ws/${transcription_id}`;
  ws.current = new WebSocket(wsUrl);
  ws.current.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type === "transcription_chunk") {
      appendToTranscript(event.text);
    } else if (event.type === "transcription_complete") {
      setFinalTranscript(event.text);
    }
  };
}

function stopRecording() {
  ws.current?.close();
  api.stopRecording();
}
```

## Flags de Config

Adicionar em `settings.py`:

```python
whisper_stream_enabled: bool = True  # habilita chunks em tempo real
whisper_stream_chunk_duration: int = 30  # segundos por chunk
```

## Testes

1. Gravar 60s → recebe 2 eventos `transcription_chunk` via WebSocket
2. Params `whisper_stream_chunk_duration=10` → chunks a cada 10s
3. Parar gravação → recebe `transcription_complete` com texto final
4. WS desconecta quando gravação para

