---
tags: [requisitos, funcionais, nao-funcionais, brennos-second-brain, ia, llm, obsidian, electron, python, r.a.g]
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---
---
tags: [requisitos, funcionais, nao-funcionais, brennos-second-brain, ia, llm, obsidian, electron, python, r.a.g]
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---

# 1. Documentação de Requisitos - "Brenno's Second Brain"

## 1. Introdução

### 1.1. Propósito do Documento:
Este documento detalha os requisitos funcionais e não funcionais para o desenvolvimento do "Brenno's Second Brain", um aplicativo de desktop para Arch Linux (com foco em Hyprland) que integra gravação de áudio, transcrição por IA, resumo de conteúdo (reuniões e vídeos do YouTube) e automação de tarefas com LLMs locais e remotos.

### 1.2. Escopo do Projeto:
O Brenno's Second Brain visa ser uma ferramenta pessoal de produtividade, automatizando a captura e processamento de informações faladas e visuais em texto, e sua posterior organização em sistemas de gerenciamento de conhecimento e comunicação.

### 1.3. Visão Geral do Aplicativo:
O aplicativo oferecerá uma interface gráfica moderna (Electron) para gerenciar o fluxo de trabalho de áudio/vídeo para texto, permitindo ao usuário escolher o modelo de IA, configurar integrações e visualizar resultados.

### 1.4. Público-Alvo:
Usuários de Arch Linux (especialmente com Hyprland) que buscam otimizar a gestão de informações de reuniões e conteúdo de vídeo, com foco em privacidade e controle local sobre os modelos de IA.

## 2. Requisitos Funcionais

### 2.1. Gerenciamento de LLMs

#### 2.1.1. Seleção de LLM (Local vs. Remoto)
*   **Cenário:** O usuário deve poder alternar via interface entre diferentes provedores de LLM (ex: OpenAI/GPT, Google/Gemini, Anthropic/Claude, Ollama/Modelos Locais) e selecionar o modelo específico a ser utilizado dentro de cada provedor.
*   **Validação:** A seleção deve ser persistente entre as sessões do aplicativo. A interface deve indicar claramente qual provedor e modelo de LLM está ativo.
*   **Impacto:** Afeta a privacidade dos dados, o custo de operação (para LLMs remotos), a dependência de conexão com a internet e o consumo de recursos locais.

#### 2.1.2. Controle do LLM Local (Ollama)
*   **Cenário:** O aplicativo deve permitir iniciar e parar o serviço Ollama localmente através de um botão na interface. O serviço pode ser iniciado automaticamente ao abrir o app, se configurado.
*   **Validação:** O status do Ollama (rodando/parado, modelo carregado) deve ser exibido na interface. O aplicativo deve ser capaz de chamar os comandos `ollama serve` e `ollama run <model>`.
*   **Impacto:** Gerenciamento de recursos do sistema (CPU/GPU/RAM).

#### 2.1.3. Detecção e Seleção de Modelos Ollama Locais
*   **Cenário:** O aplicativo deve ser capaz de detectar e listar automaticamente todos os modelos Ollama que o usuário baixou localmente em seu sistema. O usuário deve poder selecionar qualquer um desses modelos detectados para uso.
*   **Validação:** A lista de modelos disponíveis deve ser atualizada dinamicamente. A seleção de um modelo deve carregar e ativar o modelo Ollama correspondente.
*   **Impacto:** Aumenta a flexibilidade e o controle do usuário sobre os recursos de IA locais.

#### 2.1.4. Configuração de Modelos LLM
*   **Cenário:** O usuário deve poder configurar parâmetros específicos para os modelos. Para modelos Ollama (ex: `llama3.1:8b`), deve ser possível configurar o tamanho do contexto (ex: 16384 tokens). O aplicativo deve suportar modelos com suporte nativo a tooling e grande contexto (ex: cerca de 100.000 tokens).
*   **Validação:** As configurações devem ser aplicadas corretamente ao LLM selecionado antes do processamento.
*   **Impacto:** Qualidade e abrangência dos resumos e análises.

### 2.2. Gravador de Reuniões com IA

#### 2.2.1. Gravação de Áudio
*   **Cenário:** O aplicativo deve ser capaz de gravar áudio do microfone do sistema usando `sounddevice`.
*   **Validação:** O áudio gravado deve ser de qualidade aceitável para transcrição. A interface deve exibir indicadores de nível de áudio durante a gravação.
*   **Impacto:** Requer permissão de acesso ao microfone no ambiente Linux (Hyprland, KDE Plasma, GNOME).

#### 2.2.2. Transcrição de Áudio (WhisperAI Local)
*   **Cenário:** O áudio gravado deve ser transcrito para texto usando o WhisperAI (modelo `large-v3`) rodando localmente na GPU.
*   **Validação:** A transcrição deve ser precisa e rápida (RTF < 1 com RTX 3060). A interface deve exibir o progresso da transcrição.
*   **Impacto:** Requer GPU com VRAM suficiente (RTX 3060 com 12GB VRAM é suficiente) e drivers NVIDIA/CUDA configurados no Arch Linux.

#### 2.2.3. Resumo e Análise de Reuniões
*   **Cenário:** O texto transcrito deve ser processado pelo LLM selecionado (via agente de IA) para gerar um resumo, pontos chave e anotações importantes.
*   **Validação:** O resumo deve ser conciso, relevante e capturar os pontos essenciais da reunião.
*   **Impacto:** A qualidade do prompt para o LLM e a capacidade do agente de IA de usar as ferramentas corretas.

#### 2.2.4. Fluxo Automatizado Pós-Reunião
*   **Cenário:** Após a análise pelo LLM, o resumo deve ser automaticamente salvo na pasta do Obsidian do usuário e enviado por e-mail.
*   **Validação:** Os arquivos Markdown devem aparecer na pasta do Obsidian e os e-mails devem ser recebidos nos endereços configurados.
*   **Impacto:** Requer configurações de integração válidas.

#### 2.2.5. Conversa com Agente sobre Reuniões
*   **Cenário:** O usuário deve poder interagir com um agente de IA para fazer perguntas sobre o conteúdo de reuniões transcritas e persistidas.
*   **Validação:** O agente deve ser capaz de recuperar informações relevantes das transcrições e fornecer respostas precisas e contextuais.
*   **Impacto:** Depende da eficácia do sistema RAG (Retrieval-Augmented Generation) e da qualidade dos embeddings.

### 2.3. Resumo de Vídeos do YouTube

#### 2.3.1. Entrada de Link do YouTube
*   **Cenário:** O usuário deve poder colar um link de vídeo do YouTube na interface do aplicativo.
*   **Validação:** O aplicativo deve validar o formato do link e confirmar que é um link de vídeo do YouTube.
*   **Impacto:** Dependência da API do YouTube ou `yt-dlp`.

#### 2.3.2. Extração e Transcrição de Áudio
*   **Cenário:** O áudio do vídeo do YouTube deve ser extraído usando `yt-dlp` e transcrito usando WhisperAI localmente.
*   **Validação:** A transcrição deve ser precisa e o áudio extraído corretamente. A interface deve exibir o progresso.
*   **Impacto:** Requer `yt-dlp` instalado no sistema Arch Linux e acesso à internet.

#### 2.3.3. Resumo de Conteúdo de Vídeo
*   **Cenário:** O texto transcrito deve ser processado pelo LLM selecionado (via agente de IA) para gerar um resumo, pontos principais e insights, permitindo ao usuário aprender o conteúdo sem assistir ao vídeo.
*   **Validação:** O resumo deve ser informativo e cobrir os tópicos principais do vídeo.
*   **Impacto:** A qualidade do prompt para o LLM e a capacidade do agente de IA.

#### 2.3.4. Conversa com Agente sobre Vídeos
*   **Cenário:** O usuário deve poder interagir com um agente de IA para fazer perguntas sobre o conteúdo de vídeos transcritos e persistidos.
*   **Validação:** O agente deve ser capaz de recuperar informações relevantes das transcrições e fornecer respostas precisas e contextuais.
*   **Impacto:** Depende da eficácia do sistema RAG e da qualidade dos embeddings.

### 2.4. Integrações (Via Agente de IA com Tools)

#### 2.4.1. Integração com Obsidian
*   **Cenário:** O agente de IA deve ser capaz de salvar os resumos como arquivos Markdown em uma pasta configurável do Obsidian do usuário (ex: `/run/media/brennor/.../Kyros/Obsidian_Vault`).
*   **Validação:** Os arquivos devem ser criados com o formato correto e no local especificado.
*   **Impacto:** Requer permissão de escrita no sistema de arquivos do Arch Linux.

#### 2.4.2. Integração com Notion
*   **Cenário:** O agente de IA deve ser capaz de criar novas páginas ou blocos no Notion com os resumos.
*   **Validação:** As páginas/blocos devem ser criados na base de dados/página configurada pelo usuário.
*   **Impacto:** Requer chave de API do Notion e permissões adequadas.

#### 2.4.3. Integração com Slack
*   **Cenário:** O agente de IA deve ser capaz de enviar os resumos para canais ou usuários específicos do Slack.
*   **Validação:** As mensagens devem ser entregues no Slack.
*   **Impacto:** Requer token de bot/webhook do Slack e permissões.

#### 2.4.4. Envio de E-mail
*   **Cenário:** O agente de IA deve ser capaz de enviar os resumos por e-mail para endereços configurados, utilizando o Mail Lite e suportando múltiplos endereços de e-mail (2 ou 3) apontando para a mesma caixa de entrada.
*   **Validação:** Os e-mails devem ser enviados com sucesso via SMTP para os destinatários especificados.
*   **Impacto:** Requer configurações de servidor SMTP e credenciais.

### 2.5. Tema da Interface (Dark / Light Mode)

#### 2.5.1. Alternância de Tema
*   **Cenário:** O usuário deve poder alternar entre o tema escuro (dark) e o tema claro (light) da interface através de um toggle acessível na barra superior ou na tela de configurações.
*   **Validação:** A troca de tema deve ser aplicada instantaneamente, sem recarregamento da janela. A preferência deve ser persistida entre sessões.
*   **Impacto:** Todos os tokens de cor do Design System devem ter paridade completa entre os dois temas (ver Design System — Distill).

#### 2.5.2. Tema Padrão
*   **Cenário:** Na primeira execução, o aplicativo deve detectar a preferência do sistema operacional (`prefers-color-scheme`) e aplicar o tema correspondente automaticamente.
*   **Validação:** Em ambientes com tema escuro (ex: Hyprland com tema dark), o aplicativo deve iniciar em dark mode. Em ambientes claros, em light mode.
*   **Impacto:** Requer leitura da preferência via API do sistema no processo Electron.

#### 2.5.3. Persistência da Preferência
*   **Cenário:** A preferência de tema escolhida manualmente pelo usuário deve sobrescrever a detecção automática do sistema e ser salva nas configurações persistentes do aplicativo.
*   **Validação:** Ao reabrir o aplicativo, o tema selecionado pelo usuário deve ser restaurado corretamente.
*   **Impacto:** Armazenado junto às configurações gerais do usuário no Supabase/PostgreSQL ou em arquivo local de configuração.

## 3. Requisitos Não Funcionais

### 3.1. Desempenho
*   **Cenário:** Transcrição de áudio de 10 minutos (Whisper Large v3) deve levar no máximo 5 minutos com a RTX 3060.
*   **Validação:** Medição de tempo de execução para operações chave.
*   **Impacto:** Otimização do uso da GPU para Whisper e Ollama no Arch Linux.

### 3.2. Usabilidade
*   **Cenário:** Interface intuitiva e moderna (Electron) que funcione bem em ambientes de desktop Linux como Hyprland, KDE Plasma e GNOME.
*   **Validação:** Testes de usabilidade em diferentes ambientes.
*   **Impacto:** Design da UI/UX adaptável a diferentes gerenciadores de janela e ambientes.

### 3.3. Compatibilidade
*   **Cenário:** O aplicativo deve ser funcional em distribuições Linux baseadas em Arch (Hyprland, KDE Plasma, GNOME).
*   **Validação:** Testes em máquinas com Hyprland, KDE Plasma e GNOME.
*   **Impacto:** Escolha de frameworks e dependências agnósticas ao ambiente de desktop.

### 3.4. Segurança
*   **Cenário:** Chaves de API e credenciais devem ser armazenadas de forma segura (ex: keyring do sistema ou arquivo de configuração criptografado).
*   **Validação:** Auditoria de segurança das práticas de armazenamento de credenciais.
*   **Impacto:** Uso de gerenciadores de segredos compatíveis com Arch Linux.

### 3.5. Manutenibilidade
*   **Cenário:** Código modular, bem documentado e seguindo a arquitetura em camadas proposta.
*   **Validação:** Revisão de código e conformidade com padrões de projeto.
*   **Impacto:** Facilita futuras expansões e correções.

### 3.6. Recursos
*   **Cenário:** O aplicativo deve gerenciar eficientemente o consumo de RAM e CPU, especialmente considerando o Electron e os LLMs locais.
*   **Validação:** Monitoramento de recursos durante o uso no Arch Linux.
*   **Impacto:** Otimização do Electron e do backend Python.

## 4. Glossário

*   **LLM:** Large Language Model.
*   **Ollama:** Plataforma para rodar LLMs localmente.
*   **WhisperAI:** Modelo de IA da OpenAI para Speech-to-Text.
*   **RTF:** Real-Time Factor (fator de tempo real, <1 significa mais rápido que o tempo real).
*   **VRAM:** Video Random Access Memory (memória da GPU).
*   **Hyprland:** Gerenciador de janelas em mosaico para Wayland.
*   **KDE Plasma/GNOME:** Ambientes de desktop Linux.
*   **Agente de IA:** Sistema que usa LLMs para raciocinar e executar tarefas usando "tools".
*   **Tools:** Funções ou APIs que um agente de IA pode chamar para interagir com o mundo externo.
*   **Mail Lite:** Serviço de e-mail específico do usuário.
*   **RAG:** Retrieval-Augmented Generation (Geração Aumentada por Recuperação).