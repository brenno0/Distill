---
tags:
  - jornadas-usuario
  - brennos-second-brain
  - ia
  - llm
  - obsidian
  - electron
  - python
  - r.a.g
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---
# 3. Jornadas do Usuário - "Brenno's Second Brain"

## 1. Introdução

Este documento detalha as principais jornadas do usuário no aplicativo "Brenno's Second Brain", descrevendo as interações esperadas, as telas envolvidas, as histórias de usuário e os fluxos de trabalho. O objetivo é ilustrar como o usuário irá interagir com o sistema para alcançar seus objetivos.

## 2. Personas

Para contextualizar as jornadas, consideramos uma persona principal:

*   **Nome:** Ana (Analista de Dados/Pesquisadora)
*   **Idade:** 32 anos
*   **Ocupação:** Analista de Dados em uma empresa de tecnologia, também faz pesquisa acadêmica.
*   **Objetivos:** Otimizar a captura e organização de informações de reuniões, palestras e vídeos técnicos. Reduzir o tempo gasto em anotações manuais e na busca por informações específicas. Manter a privacidade dos dados sempre que possível.
*   **Frustrações:** Perde detalhes importantes em reuniões, dificuldade em revisitar conteúdo de vídeos longos, sobrecarga de informações, ferramentas de anotação desconectadas.
*   **Ambiente:** Usuária avançada de Arch Linux com Hyprland, utiliza Obsidian para gerenciamento de conhecimento, Slack para comunicação e Notion para organização de projetos. Possui uma GPU NVIDIA RTX 3060.

## 3. Jornadas do Usuário

### Jornada 1: Gravar, Resumir e Integrar uma Reunião

**Objetivo:** Ana quer gravar uma reunião, obter um resumo rápido e ter as informações essenciais salvas no Obsidian e enviadas por e-mail para referência futura.

#### 3.1.1. Histórias de Usuário:
*   Como Ana, eu quero iniciar a gravação de áudio de uma reunião facilmente para não perder nenhum detalhe.
*   Como Ana, eu quero ver o progresso da gravação e o nível do áudio para garantir que está funcionando corretamente.
*   Como Ana, eu quero que a gravação seja transcrita automaticamente para texto após a reunião.
*   Como Ana, eu quero que a transcrição seja resumida por um LLM de minha escolha para obter os pontos chave rapidamente.
*   Como Ana, eu quero que o resumo seja salvo automaticamente no meu Obsidian para fácil acesso e organização.
*   Como Ana, eu quero que o resumo seja enviado por e-mail para mim e para outros participantes para que todos tenham acesso.

#### 3.1.2. Fluxo de Telas e Interações:

**Tela 1: Dashboard Principal / Gravação**
*   **Elementos:**
    *   Botão "Iniciar Gravação" / "Parar Gravação".
    *   Indicador de nível de áudio (VU meter).
    *   Cronômetro de gravação.
    *   Dropdown de seleção de Provedor LLM (ex: "Ollama", "OpenAI", "Google Gemini", "Anthropic").
    *   Dropdown de seleção de Modelo LLM (lista de modelos disponíveis para o provedor selecionado).
    *   Área de notificações/progresso.
*   **Interação:**
    1.  Ana seleciona o provedor e modelo LLM desejado.
    2.  Ana clica em "Iniciar Gravação".
    3.  O indicador de áudio e o cronômetro são ativados.
    4.  Ao final da reunião, Ana clica em "Parar Gravação".

**Tela 2: Processamento / Progresso**
*   **Elementos:**
    *   Mensagem de "Processando gravação...".
    *   Barra de progresso para Transcrição (ex: "Transcrevendo (50%)").
    *   Barra de progresso para Resumo (ex: "Gerando resumo (25%)").
    *   Barra de progresso para Integrações (ex: "Salvando no Obsidian...", "Enviando e-mail...").
    *   Visualização prévia do texto transcrito (opcional, em tempo real ou após conclusão).
*   **Interação:**
    1.  O aplicativo exibe o progresso das etapas de transcrição, resumo e integração.
    2.  Ana pode acompanhar o status de cada etapa.

**Tela 3: Resumo da Reunião / Notificação de Conclusão**
*   **Elementos:**
    *   Título da reunião (gerado automaticamente ou editável).
    *   Texto do resumo gerado pelo LLM.
    *   Botões de ação (ex: "Abrir no Obsidian", "Editar Resumo", "Compartilhar").
    *   Confirmação de envio de e-mail.
    *   Mensagem de "Processamento concluído!".
    *   **Botão "Conversar sobre esta Reunião" (ou ícone de chat).**
*   **Interação:**
    1.  Ana visualiza o resumo final.
    2.  Pode clicar para abrir o arquivo no Obsidian ou realizar outras ações.
    3.  **Se Ana tiver dúvidas, ela clica em "Conversar sobre esta Reunião" para iniciar um chat contextualizado.**

---

### Jornada 2: Resumir e Consultar um Vídeo do YouTube

**Objetivo:** Ana quer extrair o conhecimento de um vídeo técnico do YouTube sem assisti-lo por completo, e depois poder fazer perguntas específicas sobre seu conteúdo.

#### 3.2.1. Histórias de Usuário:
*   Como Ana, eu quero colar um link de vídeo do YouTube para que o aplicativo possa processá-lo.
*   Como Ana, eu quero que o áudio do vídeo seja extraído e transcrito automaticamente.
*   Como Ana, eu quero que a transcrição seja resumida por um LLM de minha escolha para entender o conteúdo rapidamente.
*   Como Ana, eu quero poder fazer perguntas ao agente de IA sobre o conteúdo do vídeo para obter respostas específicas.
*   Como Ana, eu quero que o resumo e a transcrição sejam persistidos para consultas futuras.

#### 3.2.2. Fluxo de Telas e Interações:

**Tela 1: Dashboard Principal / Entrada de YouTube**
*   **Elementos:**
    *   Campo de texto para "Link do YouTube".
    *   Botão "Processar Vídeo".
    *   Dropdown de seleção de Provedor LLM.
    *   Dropdown de seleção de Modelo LLM.
    *   Área de notificações/progresso.
*   **Interação:**
    1.  Ana cola o link do YouTube no campo.
    2.  Ana seleciona o provedor e modelo LLM desejado.
    3.  Ana clica em "Processar Vídeo".

**Tela 2: Processamento / Progresso**
*   **Elementos:**
    *   Mensagem de "Processando vídeo...".
    *   Barra de progresso para Extração de Áudio.
    *   Barra de progresso para Transcrição.
    *   Barra de progresso para Resumo.
*   **Interação:**
    1.  O aplicativo exibe o progresso das etapas.

**Tela 3: Resumo do Vídeo / Notificação de Conclusão**
*   **Elementos:**
    *   Título do vídeo.
    *   Texto do resumo gerado pelo LLM.
    *   Botões de ação (ex: "Salvar no Obsidian", "Compartilhar Resumo").
    *   Mensagem de "Processamento concluído!".
    *   **Botão "Conversar sobre este Vídeo" (ou ícone de chat).**
*   **Interação:**
    1.  Ana visualiza o resumo do vídeo.
    2.  Pode clicar para salvar no Obsidian ou realizar outras ações.
    3.  **Se Ana tiver dúvidas, ela clica em "Conversar sobre este Vídeo" para iniciar um chat contextualizado.**

---

### Jornada 3: Conversar com o Agente sobre Transcrições Persistidas

**Objetivo:** Ana quer fazer perguntas específicas sobre o conteúdo de reuniões ou vídeos que já foram processados e transcritos.

#### 3.3.1. Histórias de Usuário:
*   Como Ana, eu quero ver uma lista das minhas transcrições processadas (reuniões e vídeos).
*   Como Ana, eu quero selecionar uma transcrição específica para conversar com o agente sobre ela.
*   Como Ana, eu quero fazer perguntas ao agente e receber respostas baseadas no conteúdo daquela transcrição.
*   Como Ana, eu quero que o agente use o LLM que eu selecionei para gerar as respostas.
*   Como Ana, eu quero que o histórico da minha conversa com o agente seja mantido para referência.

#### 3.3.2. Fluxo de Telas e Interações:

**Tela 1: Dashboard Principal / Lista de Transcrições**
*   **Elementos:**
    *   Lista de "Reuniões Processadas" (ex: "Reunião de Planejamento - 10/Abr", "Daily Scrum - 11/Abr").
    *   Lista de "Vídeos Processados" (ex: "Tutorial LangChain", "Palestra sobre RAG").
    *   Cada item da lista pode ter um ícone de chat.
*   **Interação:**
    1.  Ana navega pela lista de suas transcrições.
    2.  Ana clica no título de uma transcrição ou no ícone de chat associado a ela.

**Tela 2: Chat Contextualizado com Agente**
*   **Elementos:**
    *   Título da transcrição atual (ex: "Chat sobre: Reunião de Planejamento - 10/Abr").
    *   Dropdown de seleção de Provedor LLM.
    *   Dropdown de seleção de Modelo LLM.
    *   Área de chat com o agente de IA.
    *   Campo de entrada de texto para perguntas.
    *   Histórico da conversa com o agente (exibindo perguntas do usuário e respostas do agente).
    *   Botão "Voltar para a Lista de Transcrições".
*   **Interação:**
    1.  Ana seleciona o provedor e modelo LLM desejado para a conversa.
    2.  Ana digita uma pergunta no campo de chat (ex: "Qual foi a decisão sobre o orçamento do projeto X?").
    3.  O agente de IA processa a pergunta, utiliza o sistema RAG para recuperar trechos relevantes *daquela transcrição específica*, e gera uma resposta usando o LLM selecionado.
    4.  A resposta do agente aparece no histórico da conversa.
    5.  Ana pode continuar a conversa, fazendo perguntas de acompanhamento ou mudando o tópico dentro do contexto da transcrição.
    6.  Ana clica em "Voltar para a Lista de Transcrições" para sair do chat.

---

### Jornada 4: Gerenciar Configurações de LLM e Integrações

**Objetivo:** Ana quer personalizar quais LLMs usar e como as informações são integradas com suas ferramentas de produtividade.

#### 3.4.1. Histórias de Usuário:
*   Como Ana, eu quero ver uma lista de todos os modelos Ollama que baixei para poder selecioná-los.
*   Como Ana, eu quero iniciar ou parar o serviço Ollama diretamente do aplicativo.
*   Como Ana, eu quero configurar chaves de API para serviços de LLM remotos (OpenAI, Gemini, Anthropic).
*   Como Ana, eu quero configurar o caminho da minha pasta do Obsidian para que os resumos sejam salvos corretamente.
*   Como Ana, eu quero configurar minhas credenciais para Notion, Slack e e-mail para que as integrações funcionem.
*   Como Ana, eu quero configurar o contexto de tokens para os LLMs locais.

#### 3.4.2. Fluxo de Telas e Interações:

**Tela 1: Dashboard Principal / Menu de Configurações**
*   **Elementos:**
    *   Botão "Configurações" (ícone de engrenagem).
*   **Interação:**
    1.  Ana clica no botão "Configurações".

**Tela 2: Configurações**
*   **Elementos:**
    *   Abas/Seções: "LLMs", "Integrações", "Geral".
    *   **Seção LLMs:**
        *   Dropdown "Provedor de LLM Padrão" (ex: "Ollama", "OpenAI", "Google Gemini", "Anthropic").
        *   Para Ollama:
            *   Botão "Iniciar Ollama" / "Parar Ollama".
            *   Status do serviço Ollama.
            *   Lista de modelos Ollama detectados (ex: "llama3.1:8b", "qwen-coder-32k", "deepseek-coder-v2:16b").
            *   Dropdown de seleção de modelo Ollama padrão.
            *   Campo "Contexto de Tokens" para o modelo Ollama selecionado.
        *   Para OpenAI/Gemini/Anthropic:
            *   Campo "Chave de API".
            *   Dropdown de seleção de modelo padrão (ex: "gpt-4o", "gemini-1.5-flash", "claude-3-opus-20240229").
    *   **Seção Integrações:**
        *   Campo "Caminho da Pasta Obsidian".
        *   Campos de configuração para Notion (chave de API), Slack (token de bot/webhook), E-mail (servidor SMTP, porta, usuário, senha, endereços de destino).
    *   **Seção Geral:**
        *   Toggle "Tema": opções "Escuro" / "Claro" / "Automático (seguir sistema)".
        *   A seleção "Automático" usa a preferência do sistema operacional via `prefers-color-scheme`.
    *   Botão "Salvar Configurações".
*   **Interação:**
    1.  Ana navega entre as abas.
    2.  Em "LLMs", ela pode iniciar/parar o Ollama, ver a lista de modelos baixados e selecionar um modelo padrão. Ela também pode configurar chaves de API e modelos padrão para serviços remotos.
    3.  Em "Integrações", ela insere o caminho do Obsidian e as credenciais para Notion, Slack e e-mail.
    4.  Em "Geral", ela alterna o tema entre Escuro, Claro ou Automático — a mudança é aplicada instantaneamente.
    5.  Ana clica em "Salvar Configurações".
    5.  O aplicativo confirma que as configurações foram salvas e persistidas.

---

### Jornada 5: Gerenciar Dependências do Sistema

**Objetivo:** Ana quer garantir que todas as dependências externas do sistema (CUDA, ffmpeg, yt-dlp, Ollama) estejam corretamente instaladas e configuradas.

#### 3.5.1. Histórias de Usuário:
*   Como Ana, eu quero que o aplicativo me informe se alguma dependência essencial do sistema está faltando ou mal configurada.
*   Como Ana, eu quero um guia claro sobre como instalar e configurar as dependências no Arch Linux.
*   Como Ana, eu quero que o aplicativo me ajude a verificar se o CUDA está funcionando corretamente com minha GPU.

#### 3.5.2. Fluxo de Telas e Interações:

**Tela 1: Dashboard Principal / Notificações**
*   **Elementos:**
    *   Área de notificações (ex: "Dependência 'ffmpeg' não encontrada. Clique aqui para mais detalhes.").
*   **Interação:**
    1.  Ao iniciar o aplicativo, se houver dependências faltando, uma notificação aparece.
    2.  Ana clica na notificação.

**Tela 2: Verificação de Dependências / Guia de Instalação**
*   **Elementos:**
    *   Lista de dependências (ex: "ffmpeg", "yt-dlp", "CUDA", "Ollama").
    *   Status de cada dependência (ex: "OK", "Faltando", "Erro de Configuração").
    *   Botão "Verificar Novamente".
    *   Link para "Guia de Instalação para Arch Linux".
    *   Área de texto com instruções detalhadas para cada dependência (comandos `pacman`, `yay`, configuração de PATH, etc.).
*   **Interação:**
    1.  Ana visualiza o status de suas dependências.
    2.  Se algo estiver faltando, ela segue as instruções no guia.
    3.  Após instalar/configurar, ela clica em "Verificar Novamente".

---