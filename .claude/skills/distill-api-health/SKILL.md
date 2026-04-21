---
name: distill-api-health
description: Use when asked to verify, test, or debug the Distill API. Covers health check, endpoint smoke tests, and pipeline validation via HTTP calls.
---

# Distill API Health Check

## Overview

Skill para verificar se o backend Distill está funcionando corretamente via chamadas HTTP reais. Use `ctx_execute` com JavaScript fetch para evitar flood de contexto.

## Pré-requisito

O servidor deve estar rodando:
```bash
cd backend && poetry run uvicorn app.main:app --port 8000 --reload
```

## Nível 1 — Health básico

```javascript
// ctx_execute: language=javascript
const BASE = "http://localhost:8000";

async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${label}:`, JSON.stringify(result));
  } catch (e) {
    console.log(`❌ ${label}:`, e.message);
  }
}

await check("health", async () => {
  const r = await fetch(`${BASE}/health`);
  return r.json();
});

await check("ollama status", async () => {
  const r = await fetch(`${BASE}/api/v1/ollama/status`);
  return r.json();
});

await check("ollama models", async () => {
  const r = await fetch(`${BASE}/api/v1/ollama/models`);
  return r.json();
});

await check("settings", async () => {
  const r = await fetch(`${BASE}/api/v1/settings/`);
  return r.json();
});

await check("transcriptions list", async () => {
  const r = await fetch(`${BASE}/api/v1/transcriptions/`);
  const data = await r.json();
  return { count: data.length, status: r.status };
});
```

**Expected:**
- `health` → `{"status":"ok","version":"1.0.0"}`
- `ollama status` → `{"running":true|false}`
- `settings` → objeto com `llm`, `integrations`, `has_openai_key`, etc.
- `transcriptions list` → array (pode ser vazio)

## Nível 2 — Settings update

```javascript
// ctx_execute: language=javascript
const BASE = "http://localhost:8000";

// Trocar provider para openai
const r = await fetch(`${BASE}/api/v1/settings/`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    llm: { provider: "openai", model: "gpt-4o" },
  }),
});
console.log("PUT settings:", r.status, await r.json());

// Verificar que mudou
const r2 = await fetch(`${BASE}/api/v1/settings/`);
const s = await r2.json();
console.log("Provider agora:", s.llm.provider, s.llm.model);
```

## Nível 3 — Pipeline YouTube (requer yt-dlp + ffmpeg + Whisper instalados)

```javascript
// ctx_execute: language=javascript
const BASE = "http://localhost:8000";

// 1. Iniciar job YouTube
const r1 = await fetch(`${BASE}/api/v1/youtube/process`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
});
const { transcription_id } = await r1.json();
console.log("Job criado:", transcription_id);

// 2. Aguardar processamento (polling)
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const r2 = await fetch(`${BASE}/api/v1/transcriptions/${transcription_id}`);
  const t = await r2.json();
  console.log(`[${i*5}s] status:`, t.status);
  if (t.status === "completed" || t.status === "failed") {
    console.log("Resultado:", t.status, t.text?.slice(0, 200));
    break;
  }
}
```

## Nível 4 — Agent chat (requer Ollama rodando com modelo local)

```javascript
// ctx_execute: language=javascript
const BASE = "http://localhost:8000";

const r = await fetch(`${BASE}/api/v1/agent/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Olá, o que você consegue fazer?",
    llm_provider: "ollama",
    llm_model: "llama3.1:8b",
  }),
});
const result = await r.json();
console.log("Status:", r.status);
console.log("Resposta:", result.response?.slice(0, 300));
console.log("Steps:", result.steps?.length, "tool calls");
```

## Diagnóstico de problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| `Connection refused` | Servidor não está rodando | `poetry run uvicorn app.main:app --port 8000` |
| `health` OK mas endpoints 500 | Import error em service | Ver logs do uvicorn |
| `ollama status: false` | Ollama não iniciado | `ollama serve` ou `POST /api/v1/ollama/start` |
| `transcription failed` | WhisperX não instalado | `poetry run pip install whisperx` + torch CUDA |
| Settings não persistem | Sem Supabase configurado | Normal — persiste só em memória até reiniciar |

## WebSocket (verificar progresso em tempo real)

```javascript
// Rodar no browser DevTools ou Node.js com ws package
const ws = new WebSocket("ws://localhost:8000/ws/meu-client-id");
ws.onmessage = (e) => console.log("Evento:", JSON.parse(e.data));
ws.onopen = () => console.log("Conectado");
```
