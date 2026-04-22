# Running do projeto (Distill + Backend)

Este projeto tem 2 partes principais:

- `backend/` (FastAPI + WhisperX + integrações)
- `distill/` (Electron + React)

## 1) Pré-requisitos

Você precisa ter instalado:

- Node.js + npm
- Python 3.13
- Poetry
- ffmpeg
- Ollama

## 2) Configurar backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` e preencha no mínimo:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`

Configuração de LLM via UI:

- Provider/modelo padrão ficam persistidos no banco (tabela `app_settings`) e sobrevivem reinício.
- API keys (OpenAI/Google/Anthropic etc.) são salvas no keyring do sistema (criptografado), não em texto no banco.
- A transcrição de áudio (STT) continua sendo feita pelo WhisperX local.

Instale dependências:

```bash
cd backend
poetry install
```

## 3) Garantir Ollama com modelo

Suba o Ollama (se não estiver em background):

```bash
ollama serve
```

Em outro terminal, baixe o modelo padrão do projeto:

```bash
ollama pull llama3.1:8b
```

## 4) WhisperX

O backend usa WhisperX via ambiente do Poetry.

Validação rápida:

```bash
cd backend
poetry run python -c "import whisperx; print('whisperx ok')"
```

Se faltar suporte de GPU/CUDA, instale os pacotes do PyTorch compatíveis com sua máquina.

## 5) Rodar tudo (modo recomendado)

### Terminal 1 — Backend

```bash
cd backend
poetry run uvicorn app.main:app --reload --port 8000
```

### Terminal 2 — App Desktop (Electron)

```bash
cd distill
npm install
npm run dev
```

## 6) Checks rápidos de saúde

Backend:

```bash
curl http://localhost:8000/health
```

Ollama:

```bash
curl http://localhost:11434/api/tags
```

Se ambos responderem, o projeto está funcional para uso local.
