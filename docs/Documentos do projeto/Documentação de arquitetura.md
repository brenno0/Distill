---
tags: [arquitetura, software, brennos-second-brain, ia, llm, obsidian, electron, python, duckdb, kafka, redis]
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---
---
# Documentação de Arquitetura - "Brenno's Second Brain"

## Introdução

**Propósito:** Este documento descreve a arquitetura de software do aplicativo "Brenno's Second Brain", detalhando suas camadas, componentes, tecnologias e interações, incorporando as capacidades de seleção dinâmica de LLMs e a persistência de transcrições para um agente de consulta.

**Visão Geral da Arquitetura:** O Brenno's Second Brain adota uma arquitetura em camadas para garantir modularidade, escalabilidade e manutenibilidade, separando a interface do usuário da lógica de negócio e da infraestrutura.

**Princípios de Design:** Modularidade, Extensibilidade, Separação de Preocupações, Reusabilidade, Desempenho (com foco em GPU para IA), Privacidade por Design.

---

## 2. Visão Geral da Arquitetura em Camadas

**(Diagrama de Camadas - Visualizar 3 camadas empilhadas: Apresentação, Lógica de Negócio, Infraestrutura)**

### 2.1. Camada de Apresentação (Frontend - Electron)

*   **Tecnologias:** Electron (framework) com React como framework front-end.
*   **Bibliotecas de UI:** React-query + Kube + Axios para requisições, React Testing Library + Cypress para testes, React Hook Form + Zod para formulários caso seja necessário, Tailwind CSS + plugins para estilização, Biome para lintagem, TypeScript, Husky, Commitizen e Standard Version para testes unitários obrigatórios e versionamento, WebSocket.
*   **Bibliotecas de Animação:** Anime.js (micro-interações de UI — transições de componentes, feedback visual, waveform) e GSAP (animações complexas e de alta performance — transições de página, timeline de gravação, efeitos de scroll). Duração máxima: 250ms para micro-interações, 400ms para transições de tela.
*   **Responsabilidades:**
    *   Renderização da interface do usuário.
    *   Captura de entradas do usuário (links, configurações, comandos, seleção de provedor/modelo LLM).
    *   Exibição de status, progresso e resultados das operações.
    *   Gerenciamento de configurações do aplicativo.
    *   Gerenciamento de tema (dark/light): detecta `prefers-color-scheme` na inicialização, persiste preferência do usuário, aplica tokens CSS do Design System via classe no `<html>` (ex: `class="dark"` para Tailwind dark mode) de forma instantânea, sem recarregamento.
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
    *   Armazenamento temporário de arquivos de áudio e vídeo.
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
    *   `KnowledgeBaseQueryTool`: Interage com `knowledge_base_manager.py` para buscar informações relevantes em transcrições armazenadas com base em uma consulta do usuário.

### 3.6. Módulo de Download de YouTube (`youtube_processor.py`)

*   **Tecnologia:** `yt-dlp` (chamado via `subprocess`).
*   **Interação:** Recebe URL do YouTube, extrai a faixa de áudio, salva em arquivo temporário (ex: `/tmp/youtube_X.wav`).

### 3.7. Módulo de Base de Conhecimento (`knowledge_base_manager.py`)

*   **Tecnologia:** `chromadb` (ou outro Vector DB como `pgvector` no Supabase), `langchain` para chunking e embedding.
*   **Interação:**
    *   Recebe texto transcrito (de `whisper_processor.py`) e metadados (ex: data, tipo - reunião/vídeo, título).
    *   Gera embeddings (representações vetoriais) do texto usando um modelo de embedding (pode ser um modelo Ollama ou outro).
    *   Armazena o texto original, metadados e os embeddings no banco de dados vetorial.
    *   Recebe consultas do `agent_orchestrator.py` (via `KnowledgeBaseQueryTool`).
    *   Gera embeddings da consulta e realiza uma busca por similaridade no banco de dados vetorial para encontrar trechos de transcrições relevantes.
    *   Retorna os trechos relevantes para o agente.

## 4. Fluxos de Dados Principais

### (Diagrama de Sequência 1: Gravação de Reunião)

1.  Frontend solicita `audio_recorder.start_recording()`.
2.  `audio_recorder` grava áudio para `/tmp/meeting_X.wav`.
3.  Frontend solicita `whisper_processor.transcribe('/tmp/meeting_X.wav')`.
4.  `whisper_processor` usa GPU para transcrever, envia progresso via WebSocket.
5.  `whisper_processor` retorna texto transcrito.
6.  `whisper_processor` envia texto transcrito e metadados para `knowledge_base_manager.ingest_transcription()`.
7.  Frontend envia texto e intenção ("resumir e integrar") para `agent_orchestrator`, especificando o provedor e modelo LLM a ser usado.
8.  `agent_orchestrator` usa o LLM selecionado (via `llm_manager.py`) e Tools (`ObsidianTool`, `EmailTool`) para processar e integrar.
9.  `agent_orchestrator` retorna status/resultados para Frontend.

### (Diagrama de Sequência 2: Resumo de Vídeo do YouTube)

1.  Frontend envia URL do YouTube para `youtube_processor.extract_audio(url)`.
2.  `youtube_processor` usa `yt-dlp` para extrair áudio para `/tmp/youtube_X.wav`.
3.  Frontend solicita `whisper_processor.transcribe('/tmp/youtube_X.wav')`.
4.  `whisper_processor` transcreve, envia progresso via WebSocket.
5.  `whisper_processor` retorna texto transcrito.
6.  `whisper_processor` envia texto transcrito e metadados para `knowledge_base_manager.ingest_transcription()`.
7.  Frontend envia texto e intenção ("resumir e integrar") para `agent_orchestrator`, especificando o provedor e modelo LLM a ser usado.
8.  `agent_orchestrator` usa o LLM selecionado (via `llm_manager.py`) e Tools para processar e integrar.
9.  `agent_orchestrator` retorna status/resultados para Frontend.

### (Diagrama de Sequência 3: Conversa com Agente sobre Transcrições Persistidas)

1.  Frontend envia uma pergunta do usuário (ex: "Qual foi a decisão sobre o projeto X na reunião de terça-feira?") para `agent_orchestrator`, especificando o provedor e modelo LLM a ser usado.
2.  `agent_orchestrator` (usando LangChain/LangGraph) identifica que a pergunta requer busca em transcrições e ativa a `KnowledgeBaseQueryTool`.
3.  `KnowledgeBaseQueryTool` envia a pergunta para `knowledge_base_manager.py`.
4.  `knowledge_base_manager.py` gera embeddings da pergunta e realiza uma busca por similaridade no banco de dados vetorial.
5.  `knowledge_base_manager.py` retorna trechos de transcrições relevantes para `KnowledgeBaseQueryTool`.
6.  `KnowledgeBaseQueryTool` passa esses trechos como contexto para o LLM selecionado (via `llm_manager.py`).
7.  O LLM gera uma resposta baseada na pergunta e no contexto fornecido.
8.  `agent_orchestrator` retorna a resposta para o Frontend.

## 5. Considerações de Hardware e Software

### 5.1. Requisitos Mínimos:

*   CPU: Intel i5 10ª Geração ou equivalente.
*   RAM: 16GB (32GB recomendado).
*   GPU: NVIDIA RTX 3060 (12GB VRAM) ou equivalente (essencial para desempenho de IA, incluindo geração de embeddings).

### 5.2. Dependências do Sistema Operacional (Arch Linux com Hyprland):

*   **CUDA:** Drivers NVIDIA e toolkit CUDA instalados e configurados para a GPU.
*   **`ffmpeg`:** Pacote `ffmpeg` instalado (via `pacman`).
*   **`yt-dlp`:** Pacote `yt-dlp` instalado (via `pacman` ou `yay`).
*   **Ollama:** Serviço Ollama instalado e rodando, com modelos como `llama3.1:8b` (configurado para 16384 tokens), `qwen-coder-32k`, `deepseek-coder-v2:16b`, `qwen2.5-coder:7b-instruct` (e outros modelos de 100k tokens) baixados. Também será necessário um modelo de embedding local no Ollama ou outro provedor.
*   **`~/.local/bin` no PATH:** Essencial para ferramentas instaladas localmente serem acessíveis pelo aplicativo.
*   **Ambiente de Desktop:** Compatível com Hyprland, KDE Plasma e GNOME.

### 5.3. Ambiente de Desenvolvimento:

*   Python 3.9+ (com `venv`).
*   Node.js/npm (versão LTS).

## 6. Riscos e Mitigações

### 6.1. Desempenho do LLM Local:

*   **Risco:** Modelos LLM de grande contexto podem consumir muitos recursos e serem lentos, mesmo com GPU.
*   **Mitigação:** Otimização do uso da GPU, uso de `whisper.cpp` para transcrição, feedback de progresso na UI, opção de usar LLM remoto (Gemini Flash, OpenAI GPT, Anthropic Claude) para tarefas menos sensíveis à privacidade ou que exijam maior velocidade. A seleção dinâmica de modelos permite ao usuário escolher o equilíbrio entre velocidade/custo e qualidade/privacidade.

### 6.2. Complexidade das Integrações:

*   **Risco:** Manter as integrações com Obsidian, Notion, Slack e e-mail atualizadas e funcionando pode ser complexo devido a mudanças nas APIs.
*   **Mitigação:** Uso de bibliotecas oficiais (SDKs), encapsulamento das integrações em "Tools" do agente para isolamento, testes automatizados para cada integração.

### 6.3. Consumo de Recursos do Electron:

*   **Risco:** Aplicativos Electron podem ser pesados em termos de RAM e CPU.
*   **Mitigação:** Otimização do frontend (uso de frameworks leves, lazy loading), comunicação eficiente entre processos (API REST/WebSockets), desativação de funcionalidades não essenciais quando não em uso.

### 6.4. Gerenciamento de Dependências do Sistema:

*   **Risco:** Dependências como `ffmpeg`, `yt-dlp`, CUDA e Ollama precisam estar corretamente instaladas e configuradas no sistema do usuário.
*   **Mitigação:** Fornecer um guia de instalação detalhado para Arch Linux (usando `pacman` e `yay`), scripts de verificação de dependências no aplicativo, mensagens de erro claras se uma dependência não for encontrada.

### 6.5. Privacidade e Segurança de Credenciais:

*   **Risco:** Chaves de API e credenciais de e-mail podem ser expostas se não forem armazenadas de forma segura.
*   **Mitigação:** Utilizar o keyring do sistema operacional (se disponível e compatível com Electron/Python), criptografia de arquivos de configuração, nunca armazenar credenciais em texto puro.

### 6.6. Recuperação de Informação (RAG) e Contexto:

*   **Risco:** A busca por similaridade pode não retornar os trechos mais relevantes ou o LLM pode ter dificuldade em sintetizar a resposta a partir do contexto fornecido.
*   **Mitigação:**
    *   **Escolha de Modelo de Embedding:** Utilizar um modelo de embedding de alta qualidade e adequado ao domínio do texto (ex: modelos de embedding do Ollama, ou modelos da Hugging Face).
    *   **Chunking Estratégico:** Dividir as transcrições em "chunks" (pedaços) de tamanho adequado para o banco de dados vetorial, garantindo que o contexto seja mantido.
    *   **Reranking:** Implementar uma etapa de reranking dos resultados da busca vetorial para melhorar a relevância.
    *   **Prompt Engineering:** Otimizar os prompts enviados ao LLM para que ele utilize o contexto fornecido de forma eficaz e responda de maneira concisa e precisa.
    *   **Feedback do Usuário:** Permitir que o usuário avalie a qualidade das respostas do agente para refinar o processo de busca e geração.