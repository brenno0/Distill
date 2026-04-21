# Distill — Electron Frontend Design

**Data:** 2026-04-18
**Status:** Aprovado

---

## Objetivo

Reescrever o frontend do Distill em Electron + electron-vite com React, mantendo o design visual do protótipo (`b_XkU5YzLGK4e/`) mas com código modular, organizado por feature, focado em performance, e integrado ao backend FastAPI.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Desktop shell | Electron 33+ |
| Build tool | electron-vite |
| UI | React 19 + TypeScript strict |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| Roteamento | TanStack Router (type-safe, file-based, lazy) |
| Estado servidor | TanStack Query (React Query) |
| Estado UI/processo | Zustand |
| HTTP client | Axios (instância centralizada) |
| Geração de API | Orval (gera hooks React Query + tipos do OpenAPI) |
| Virtualização | TanStack Virtual (Library screen) |
| Animações | GSAP + Anime.js (idêntico ao protótipo) |
| Painéis | react-resizable-panels (Transcription view) |
| Fontes | Inter (UI) + JetBrains Mono (transcript) |

---

## Estrutura do Projeto

```
distill/
├── src/
│   ├── main/
│   │   ├── index.ts              # Janela Electron, ciclo de vida
│   │   └── backend.ts            # Spawn/kill uvicorn, health polling, IPC
│   ├── preload/
│   │   └── index.ts              # contextBridge — surface mínima ao renderer
│   └── renderer/
│       └── src/
│           ├── routes/           # TanStack Router file-based
│           │   ├── __root.tsx    # Layout raiz (sidebar + backend overlay)
│           │   ├── index.tsx     # Dashboard
│           │   ├── recording.tsx
│           │   ├── library.tsx
│           │   ├── import.tsx
│           │   ├── transcription/
│           │   │   └── $id.tsx   # Transcription + AI Chat
│           │   └── settings.tsx
│           ├── features/
│           │   ├── dashboard/
│           │   │   ├── DashboardPage.tsx
│           │   │   ├── components/
│           │   │   │   ├── StatsCards.tsx
│           │   │   │   ├── RecentRecordings.tsx
│           │   │   │   └── OllamaStatusBadge.tsx
│           │   │   └── hooks/
│           │   │       └── useDashboard.ts
│           │   ├── recording/
│           │   │   ├── RecordingPage.tsx
│           │   │   ├── components/
│           │   │   │   ├── Waveform.tsx          # React.memo
│           │   │   │   ├── RecordingControls.tsx
│           │   │   │   ├── VUMeter.tsx           # React.memo
│           │   │   │   └── LiveTranscriptPreview.tsx
│           │   │   └── hooks/
│           │   │       └── useRecording.ts
│           │   ├── library/
│           │   │   ├── LibraryPage.tsx
│           │   │   ├── components/
│           │   │   │   ├── RecordingCard.tsx      # React.memo
│           │   │   │   ├── RecordingList.tsx      # TanStack Virtual
│           │   │   │   └── LibraryFilters.tsx
│           │   │   └── hooks/
│           │   │       └── useLibrary.ts
│           │   ├── import/
│           │   │   ├── ImportPage.tsx
│           │   │   ├── components/
│           │   │   │   ├── YouTubeInput.tsx
│           │   │   │   └── ImportProgress.tsx
│           │   │   └── hooks/
│           │   │       └── useImport.ts
│           │   ├── transcription/
│           │   │   ├── TranscriptionPage.tsx
│           │   │   ├── components/
│           │   │   │   ├── TranscriptPanel.tsx    # React.memo
│           │   │   │   ├── SummaryPanel.tsx       # React.memo
│           │   │   │   ├── ChatPanel.tsx
│           │   │   │   ├── ChatMessage.tsx        # React.memo
│           │   │   │   └── TranscriptLine.tsx     # React.memo
│           │   │   └── hooks/
│           │   │       ├── useTranscription.ts
│           │   │       └── useAgentChat.ts
│           │   └── settings/
│           │       ├── SettingsPage.tsx
│           │       ├── components/
│           │       │   ├── LLMSettings.tsx
│           │       │   ├── AudioSettings.tsx
│           │       │   ├── IntegrationsSettings.tsx
│           │       │   ├── AppearanceSettings.tsx
│           │       │   └── SystemStatus.tsx       # Status Ollama/Whisper
│           │       └── hooks/
│           │           └── useSettings.ts
│           ├── ui/               # shadcn/ui + componentes design system
│           │   ├── button.tsx
│           │   ├── card.tsx
│           │   ├── sidebar.tsx
│           │   └── ...
│           ├── lib/
│           │   ├── axios.ts      # Instância Axios centralizada (baseURL, timeout)
│           │   ├── ws.ts         # WebSocket singleton por transcription_id
│           │   ├── api/
│           │   │   └── generated/  # Gerado pelo Orval (nunca editar manualmente)
│           │   │       ├── types.ts
│           │   │       ├── recordings.ts
│           │   │       ├── transcriptions.ts
│           │   │       ├── youtube.ts
│           │   │       ├── ollama.ts
│           │   │       ├── agent.ts
│           │   │       └── settings.ts
│           │   └── utils.ts      # cn(), helpers
│           └── stores/
│               ├── useBackendStore.ts
│               ├── useRecordingStore.ts
│               ├── useTranscriptionStore.ts
│               └── useSettingsStore.ts
├── orval.config.ts
├── electron.vite.config.ts
└── package.json
```

---

## Electron Main Process

### Backend lifecycle (`main/backend.ts`)

```
App ready
  → spawn: poetry run uvicorn app.main:app --port 8000
  → polling GET /health a cada 500ms (timeout 30s)
  → IPC → renderer: "backend:status" = starting | ready | error

App quit
  → SIGTERM no processo uvicorn
  → aguarda 3s, SIGKILL se necessário

Crash detection
  → processo filho fecha inesperadamente
  → tenta reiniciar até 3x automaticamente
  → após 3 falhas: IPC "backend:fatal" → renderer mostra tela de erro com botão Restart
```

### Preload (`preload/index.ts`)

Surface mínima exposta ao renderer via contextBridge:

```typescript
contextBridge.exposeInMainWorld("electron", {
  onBackendStatus: (cb) => ipcRenderer.on("backend:status", cb),
  onBackendFatal:  (cb) => ipcRenderer.on("backend:fatal", cb),
  getBackendPort:  ()   => ipcRenderer.invoke("backend:port"),
})
```

---

## Roteamento (TanStack Router)

File-based, type-safe, lazy-loaded por rota. Settings com search params para deep link:

| Rota | Tela |
|------|------|
| `/` | Dashboard |
| `/recording` | Active Recording |
| `/library` | Recordings Library |
| `/import` | YouTube Import |
| `/transcription/$id` | Transcription + AI Chat |
| `/settings?section=llm` | Settings (deep link por seção) |

Cada rota é um chunk separado — o bundle só carrega o código da tela acessada.

---

## Estado (Zustand)

Um store por domínio. Seletores sempre granulares:

```typescript
// ✅ correto
const audioLevel = useRecordingStore(s => s.audioLevel)

// ❌ nunca
const { audioLevel } = useRecordingStore()
```

| Store | Responsabilidade |
|-------|-----------------|
| `useBackendStore` | `status: starting\|ready\|error\|fatal` — atualizado por IPC |
| `useRecordingStore` | `isRecording`, `transcription_id`, `audioLevel`, `elapsedSeconds` |
| `useTranscriptionStore` | `progress`, `status`, `currentId` — atualizado por WebSocket |
| `useSettingsStore` | Cache local de provider/model/integrations |

**React Query** gerencia todo estado de servidor (transcrições, modelos Ollama, settings do backend). Zustand só guarda estado de UI e processo local.

---

## Camada de Comunicação

### Axios (`lib/axios.ts`)

```typescript
export const axiosInstance = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000,
})
```

### Orval (`orval.config.ts`)

Gera funções axios tipadas + tipos TypeScript a partir do `/openapi.json` do FastAPI:

```typescript
export default defineConfig({
  distill: {
    input: "http://localhost:8000/openapi.json",
    output: {
      mode: "tags-split",
      target: "src/lib/api/generated",
      client: "axios",
      override: {
        mutator: { path: "src/lib/axios.ts", name: "axiosInstance" },
      },
    },
  },
})
```

**Padrão de uso nas features:**

```typescript
// ✅ useSuspenseQuery + função axios gerada pelo Orval
// Loading tratado pelo Suspense boundary da rota — sem isLoading no componente
const { data } = useSuspenseQuery({
  queryKey: ["transcriptions"],
  queryFn: getTranscriptions,   // função gerada pelo Orval
})

// ✅ mutations: useMutation + função axios gerada pelo Orval
const { mutate } = useMutation({
  mutationFn: postRecordingsStart,  // função gerada pelo Orval
})

// ❌ nunca usar useQuery direto ou isLoading checks nos componentes
```

Cada rota define seu próprio `<Suspense fallback={<SkeletonScreen />}>` — loading states centralizados, componentes sempre recebem dados prontos.

Rodar após qualquer mudança no backend:
```bash
npm run generate:api
```

### WebSocket (`lib/ws.ts`)

Singleton por `transcription_id`. Abre ao iniciar operação, fecha ao receber `pipeline_complete` ou `pipeline_error`. Eventos tipados:

- `transcription_start` / `transcription_progress` / `transcription_complete`
- `youtube_download_start` / `youtube_download_complete`
- `pipeline_complete` / `pipeline_error`

---

## Telas

### Dashboard
- Stats cards (Total, Horas, Insights) com animação Anime.js stagger
- Lista de gravações recentes (GSAP entrance)
- Badge status Ollama (running/stopped) + botão start/stop
- CTA "New Recording" proeminente

### Recording
- Focus mode fullscreen (sem sidebar)
- Waveform animado (`React.memo`)
- VU meter via polling `GET /recordings/level` a 100ms
- Timer, mic selector, controles pause/stop
- Live transcript preview via WebSocket
- Ao parar: redireciona para `/transcription/:id`

### Library
- Lista virtualizada com TanStack Virtual
- `useQuery` com cache — invalida após nova transcrição
- Filtro por status (pending/processing/completed/failed)
- Busca client-side com `useMemo`
- Card com preview do summary, data, duração

### Import YouTube
- Input com validação de URL client-side antes de enviar
- Progress bar WebSocket (download + transcrição)
- Mesma UX de progresso do Recording
- Ao completar: redireciona para `/transcription/:id`

### Transcription + AI Chat
- Layout 3 painéis com `react-resizable-panels`:
  ```
  [ Transcript (JetBrains Mono) ] | [ Summary ] | [ AI Chat ]
  ```
- `TranscriptLine` e `ChatMessage` com `React.memo`
- Chat: `useMutation` em `POST /agent/chat` com `transcription_id` — RAG contextualizado
- Histórico de chat em Zustand (não persiste no backend)
- Toolbar: export, copy, regenerate summary

### Settings
- 6 seções: LLM, Áudio, Integrações, Aparência, Sistema, Database
- Deep link via search params: `/settings?section=llm`
- LLM: seletor de provider (ollama/openai/gemini/anthropic) + modelo
  - Ollama: dropdown populado por `GET /ollama/models`
  - Cloud: campo de API key (salvo no keyring via backend)
- Sistema: status de Ollama e Whisper, botões start/stop Ollama
- `useQuery` para carregar, `useMutation` para salvar

---

## Padrões de Performance

| Padrão | Aplicação |
|--------|-----------|
| `React.memo` | Waveform, VUMeter, RecordingCard, TranscriptLine, ChatMessage, SummaryPanel |
| `useCallback` | Todos os handlers passados como props |
| `useMemo` | Listas filtradas, dados derivados de store |
| TanStack Virtual | RecordingList na Library |
| Lazy routes | TanStack Router divide bundle por rota automaticamente |
| Seletores granulares | `useStore(s => s.campo)` em todos os componentes |
| WebSocket singleton | Uma conexão por operação, fechada ao completar |
| React Query cache | Evita refetch desnecessário — invalidação cirúrgica |

---

## Design Visual

Fiel ao protótipo `b_XkU5YzLGK4e/`:

| Token | Light | Dark |
|-------|-------|------|
| Background | `#FAFAFA` | `#0C0A14` |
| Surface | `#FFFFFF` | `#13101F` |
| Accent | `#5E3BEE` | `#7C5CFC` |
| Text primary | `#18181B` | `#F4F4F5` |

- Animações: GSAP (transitions, hover) + Anime.js (stagger entrances)
- Durations: micro-interactions 250ms, screen transitions 400ms
- Icons: Lucide, stroke 1.5px, nunca filled
- Border radius: 8px buttons, 12px cards

---

## Referência de design

Protótipo base: `b_XkU5YzLGK4e/` — mesmo layout, cores, animações e componentes shadcn/ui.
