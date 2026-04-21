---
tags: [arquitetura, estrutura-pastas, brennos-second-brain, ia, llm, obsidian, electron, python, r.a.g]
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---

# 2. Documentação de Arquitetura e Estrutura de Pastas - "Brenno's Second Brain"

## 1. Introdução

**Propósito:** Este documento descreve a arquitetura de software do aplicativo "Brenno's Second Brain", detalhando suas camadas, componentes, tecnologias e interações, incorporando as capacidades de seleção dinâmica de LLMs, detecção de modelos Ollama locais e a persistência de transcrições para um agente de consulta contextual. Também define a estrutura de pastas do projeto para organização e padronização.

**Visão Geral da Arquitetura:** O Brenno's Second Brain adota uma arquitetura em camadas para garantir modularidade, escalabilidade e manutenibilidade, separando a interface do usuário da lógica de negócio e da infraestrutura.

**Princípios de Design:** Modularidade, Extensibilidade, Separação de Preocupações, Reusabilidade, Desempenho (com foco em GPU para IA), Privacidade por Design.

---

## 2. Visão Geral da Arquitetura em Camadas

**(Diagrama de Camadas - Visualizar 3 camadas empilhadas: Apresentação, Lógica de Negócio, Infraestrutura)**

### 2.1. Camada de Apresentação (Frontend - Electron)

*   **Tecnologias:** Electron (framework) com React como framework front-end.
*   **Bibliotecas de UI:** React-query + Kube + Axios para requisições, React Testing Library + Cypress para testes, React Hook Form + Zod para formulários caso seja necessário, Tailwind CSS + plugins para estilização, Biome para lintagem, TypeScript, Husky, Commitizen e Standard Version para testes unitários obrigatórios e versionamento, WebSocket.
*   **Responsabilidades:**
    *   Renderização da interface do usuário.
    *   Captura de entradas do usuário (links, configurações, comandos, seleção de provedor/modelo LLM).
    *   Exibição de status, progresso e resultados das operações.
    *   Gerenciamento de configurações do aplicativo.
    *   **Interface de chat para interação com o agente de IA, contextualizada por item (reunião/vídeo).**
*   **Comunicação com Backend:** Utiliza uma combinação de API REST (para requisições síncronas e operações de controle) e WebSockets (para feedback em tempo real e atualizações de progresso) para interagir com a Camada de Lógica de Negócio.

### 2.2. Camada de Lógica de Negócio (Backend - Python)

*   **Tecnologias:** Python 3.9+, FastAPI (para API REST e WebSockets), `sounddevice`, `ollama` (SDK), `google-generativeai` (SDK), `openai` (SDK), `anthropic` (SDK), `langchain`, `langgraph`, `smtplib`, `notion-client`, `slack_sdk`, `chromadb` (ou similar para Vector DB).
*   **Responsabilidades:**
    *   Orquestração de todos os fluxos de trabalho (gravação, transcrição, resumo, integração, consulta a transcrições persistidas).
    *   Gerenciamento e interação com LLMs (Ollama, Gemini, OpenAI, Anthropic), permitindo seleção dinâmica de provedores e modelos.
    *   Processamento de áudio e vídeo.
    *   Execução do agente de IA e suas ferramentas.
    *   Gerenciamento de configurações e credenciais.
    *   Persistência e recuperação de transcrições para consulta (RAG).
*   **Componentes Principais:**
    *   **`llm_manager.py`:** Abstração para alternar entre `OllamaProvider`, `GeminiProvider`, `OpenAIProvider` e `AnthropicProvider`. Permite a seleção dinâmica do modelo e provedor.
    *   **`ollama_service_manager.py`:** Gerencia o ciclo de vida do serviço Ollama local (iniciar/parar) e a listagem de modelos baixados.
    *   **`whisper_processor.py`:** Encapsula a lógica de transcrição com WhisperAI local (modelo `large-v3`).
    *   **`youtube_processor.py`:** Gerencia a extração de áudio de URLs do YouTube usando `yt-dlp`.
    *   **`agent_orchestrator.py`:** Utiliza LangChain/LangGraph para coordenar o LLM e as ferramentas, incluindo ferramentas para consulta de transcrições.
    *   **`integration_manager.py`:** Contém as implementações das "Tools" para Obsidian, Notion, Slack e E-mail.
    *   **`knowledge_base_manager.py`:** Gerencia a ingestão de transcrições para o Vector DB e a recuperação de informações relevantes para o agente.

### 2.3. Camada de Infraestrutura/Dados

*   **Tecnologias:** Supabase com PostgreSQL (para configurações persistentes, histórico de operações e metadados de transcrições), ChromaDB (ou similar, para armazenamento de embeddings de transcrições), Sistema de Arquivos (para armazenamento de áudios temporários, transcrições em texto puro, e arquivos Markdown do Obsidian).
*   **Responsabilidades:**
    *   Persistência de configurações do usuário e credenciais (de forma segura).
    *   Armazenamento temporário de arquivos de áudio e vídeo (ex: `/tmp/`).
    *   Gerenciamento de arquivos Markdown na pasta do Obsidian.
    *   Armazenamento de embeddings de transcrições para busca semântica.
    *   Persistência de transcrições completas para consulta pelo agente.

## 3. Componentes Chave e Suas Interações

### 3.1. Módulo de Gravação de Áudio (`audio_recorder.py`)

*   **Tecnologia:** `sounddevice`.
*   **Interação:** Captura áudio do microfone, salva em um arquivo WAV temporário (ex: `/tmp/meeting_X.wav`). Notifica o frontend via WebSocket sobre o status da gravação.

### 3.2. Módulo de Transcrição (`whisper_processor.py`)

*   **Tecnologia:** `whisper` (OpenAI) ou `whisper.cpp` (via bindings Python) com modelo `large-v3`.
*   **Interação:** Recebe o caminho de um arquivo de áudio, executa a transcrição na GPU (CUDA), retorna o texto transcrito. Envia atualizações de progresso para o frontend via WebSocket. Após a transcrição, envia o texto para `knowledge_base_manager.py` para persistência.

### 3.3. Módulo de Gerenciamento de LLMs (`llm_manager.py`)

*   **Tecnologia:** `ollama` (SDK), `google-generativeai` (SDK), `openai` (SDK), `anthropic` (SDK).
*   **Interação:**
    *   Fornece uma interface unificada para interagir com diferentes provedores de LLM.
    *   Recebe a seleção do provedor e modelo do frontend.
    *   Encaminha prompts e configurações (como contexto de tokens) para o provedor de LLM apropriado.
    *   Para Ollama, interage com `ollama_service_manager.py` para garantir que o modelo selecionado esteja carregado.

### 3.4. Módulo de Gerenciamento de Serviço Ollama (`ollama_service_manager.py`)

*   **Tecnologia:** `ollama` (SDK), `subprocess`.
*   **Interação:**
    *   Inicia e para o serviço Ollama (`ollama serve`) conforme solicitado pelo frontend ou automaticamente.
    *   Lista os modelos Ollama baixados localmente (`ollama list`) para que o frontend possa exibi-los.
    *   Carrega modelos específicos Ollama (`ollama run <model>`) conforme a seleção do usuário.

### 3.5. Módulo de Agente (`agent_orchestrator.py`)

*   **Tecnologia:** `langchain`, `langgraph`.
*   **Interação:** Recebe a intenção do usuário (ex: "resumir reunião e enviar para Obsidian e Slack", "qual foi a decisão sobre o projeto X na reunião de terça-feira?"), decide quais "Tools" usar, orquestra a execução sequencial ou paralela das ferramentas. Utiliza o `llm_manager.py` para interagir com o LLM selecionado.
*   **Tools (implementadas em `integration_manager.py`):**
    *   `ObsidianTool`: Salva conteúdo Markdown na pasta configurada (ex: `/run/media/brennor/.../Kyros/Obsidian_Vault`).
    *   `NotionTool`: Interage com a API do Notion para criar/atualizar páginas.
    *   `SlackTool`: Envia mensagens para canais/usuários do Slack.
    *   `EmailTool`: Envia e-mails via SMTP (Mail Lite), suportando múltiplos endereços (2 ou 3) para a mesma caixa de entrada.
    *   `WhisperTool`: Chama o `whisper_processor` para transcrição.
    *   `YTDLPTool`: Chama o `youtube_processor` para extração de áudio.
    *   `KnowledgeBaseQueryTool`: Interage com `knowledge_base_manager.py` para buscar informações relevantes em transcrições armazenadas com base em uma consulta do usuário e um ID de transcrição específico.

### 3.6. Módulo de Download de YouTube (`youtube_processor.py`)

*   **Tecnologia:** `yt-dlp` (chamado via `subprocess`).
*   **Interação:** Recebe URL do YouTube, extrai a faixa de áudio, salva em arquivo temporário (ex: `/tmp/youtube_X.wav`).

### 3.7. Módulo de Base de Conhecimento (`knowledge_base_manager.py`)

*   **Tecnologia:** `chromadb` (ou outro Vector DB como `pgvector` no Supabase), `langchain` para chunking e embedding.
*   **Interação:**
    *   **Ingestão:** Recebe texto transcrito (de `whisper_processor.py`) e metadados (ex: data, tipo - reunião/vídeo, título, **ID único da transcrição**). Gera embeddings (representações vetoriais) do texto usando um modelo de embedding (pode ser um modelo Ollama ou outro). Armazena o texto original, metadados e os embeddings no banco de dados vetorial.
    *   **Recuperação Contextual:** Recebe uma query do `agent_orchestrator` **juntamente com o ID da transcrição específica**. Gera embeddings da query e realiza uma busca por similaridade no banco de dados vetorial, **filtrando os resultados para apenas a transcrição solicitada**. Retorna os trechos relevantes para o agente.

## 4. Fluxos de Dados Principais

### (Diagrama de Sequência 1: Gravação de Reunião)

1.  Frontend solicita `audio_recorder.start_recording()`.
2.  `audio_recorder` grava áudio para `/tmp/meeting_X.wav`.
3.  Frontend solicita `whisper_processor.transcribe('/tmp/meeting_X.wav')`.
4.  `whisper_processor` usa GPU para transcrever, envia progresso via WebSocket.
5.  `whisper_processor` retorna texto transcrito **e um ID único para a transcrição**.
6.  `whisper_processor` envia texto transcrito, metadados e o ID para `knowledge_base_manager.ingest_transcription()`.
7.  Frontend envia texto e intenção ("resumir e integrar") para `agent_orchestrator`, especificando o provedor e modelo LLM a ser usado.
8.  `agent_orchestrator` usa o LLM selecionado (via `llm_manager.py`) e Tools (`ObsidianTool`, `EmailTool`) para processar e integrar.
9.  `agent_orchestrator` retorna status/resultados para Frontend.

### (Diagrama de Sequência 2: Resumo de Vídeo do YouTube)

1.  Frontend envia URL do YouTube para `youtube_processor.extract_audio(url)`.
2.  `youtube_processor` usa `yt-dlp` para extrair áudio para `/tmp/youtube_X.wav`.
3.  Frontend solicita `whisper_processor.transcribe('/tmp/youtube_X.wav')`.
4.  `whisper_processor` transcreve, envia progresso via WebSocket.
5.  `whisper_processor` retorna texto transcrito **e um ID único para a transcrição**.
6.  `whisper_processor` envia texto transcrito, metadados e o ID para `knowledge_base_manager.ingest_transcription()`.
7.  Frontend envia texto e intenção ("resumir e integrar") para `agent_orchestrator`, especificando o provedor e modelo LLM a ser usado.
8.  `agent_orchestrator` usa o LLM selecionado (via `llm_manager.py`) e Tools para processar e integrar.
9.  `agent_orchestrator` retorna status/resultados para Frontend.

### (Diagrama de Sequência 3: Conversa com Agente sobre Transcrições Persistidas)

1.  Frontend (a partir da tela de detalhes de uma reunião/vídeo) envia uma pergunta do usuário (ex: "Qual foi a decisão sobre o projeto X?") para `agent_orchestrator`, **juntamente com o ID da transcrição selecionada** e o provedor/modelo LLM a ser usado.
2.  `agent_orchestrator` (usando LangChain/LangGraph) identifica que a pergunta requer busca em transcrições e ativa a `KnowledgeBaseQueryTool`.
3.  `KnowledgeBaseQueryTool` envia a pergunta e o **ID da transcrição** para `knowledge_base_manager.py`.
4.  `knowledge_base_manager.py` gera embeddings da pergunta e realiza uma busca por similaridade no banco de dados vetorial, **filtrando os resultados para o ID da transcrição fornecido**.
5.  `knowledge_base_manager.py` retorna trechos de transcrições relevantes para `KnowledgeBaseQueryTool`.
6.  `KnowledgeBaseQueryTool` passa esses trechos como contexto para o LLM selecionado (via `llm_manager.py`).
7.  O LLM gera uma resposta baseada na pergunta e no contexto fornecido.
8.  `agent_orchestrator` retorna a resposta para o Frontend.

## 5. Estrutura de Pastas do Projeto

A estrutura de pastas segue uma abordagem modular, separando o frontend, backend e recursos, e incorporando a filosofia PARA (Projects, Areas, Resources, Archives) para organização de documentos internos.

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   ├── core/
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── db/
│   │   │   └── __init__.py
│   │   ├── main.py
│   │   └── __init__.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── __init__.py
│   ├── venv/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── biome.json
│   ├── .eslintrc.js
│   ├── .prettierrc
│   └── electron-main.js
├── docs/
│   ├── architecture/
│   ├── requirements/
│   ├── installation/
│   ├── user_journeys/
│   ├── glossary.md
│   └── README.md
├── .github/
├── .vscode/
├── .gitignore
├── README.md
└── LICENSE
```
