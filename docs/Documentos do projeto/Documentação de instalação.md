---
tags: [instalacao, brennos-second-brain, arch-linux, hyprland, ia, llm, ollama, whisper, cuda, yt-dlp]
project: lumium-ai
status: draft
date: 2026-04-15
author: Brenno
---

# 3. Documentação de Instalação - "Brenno's Second Brain"

## 1. Introdução

Este documento detalha os passos necessários para instalar e configurar o "Brenno's Second Brain" em um sistema Arch Linux, com foco em ambientes de desktop como Hyprland, KDE Plasma e GNOME. Ele cobre as dependências do sistema, a configuração do ambiente de desenvolvimento e as etapas para garantir o funcionamento adequado dos componentes de IA e integração.

## 2. Requisitos de Hardware

*   **CPU:** Intel i5 10ª Geração ou equivalente.
*   **RAM:** 16GB (32GB recomendado).
*   **GPU:** NVIDIA RTX 3060 (12GB VRAM) ou equivalente (essencial para desempenho de IA, especialmente para WhisperAI e Ollama).

## 3. Dependências do Sistema Operacional (Arch Linux)

### 3.1. Drivers NVIDIA e CUDA

Para o funcionamento da GPU com WhisperAI e Ollama, é crucial ter os drivers NVIDIA e o toolkit CUDA instalados e configurados corretamente.

1.  **Instalar drivers NVIDIA:**
    ```bash
    sudo pacman -S nvidia nvidia-utils
    ```
    Se você estiver usando um kernel customizado ou `linux-zen`, pode precisar instalar `nvidia-dkms`.
    ```bash
    sudo pacman -S nvidia-dkms
    ```
2.  **Instalar CUDA Toolkit:**
    ```bash
    sudo pacman -S cuda
    ```
3.  **Configurar o ambiente:** Adicione as seguintes linhas ao seu `~/.bashrc` ou `~/.zshrc` e recarregue o shell (`source ~/.bashrc` ou `source ~/.zshrc`):
    ```bash
    export PATH="/opt/cuda/bin:$PATH"
    export LD_LIBRARY_PATH="/opt/cuda/lib64:$LD_LIBRARY_PATH"
    ```
4.  **Verificar a instalação:**
    ```bash
    nvidia-smi
    nvcc --version
    ```
    Ambos os comandos devem retornar informações sobre sua GPU e a versão do CUDA.

### 3.2. Ferramentas Essenciais

Instale os pacotes necessários via `pacman` e `yay` (se ainda não tiver o `yay`, instale-o primeiro):

1.  **Instalar `yay` (se necessário):**
    ```bash
    sudo pacman -S --needed git base-devel
    git clone https://aur.archlinux.org/yay.git
    cd yay
    makepkg -si
    cd ..
    rm -rf yay
    ```
2.  **Instalar `ffmpeg`:**
    ```bash
    sudo pacman -S ffmpeg
    ```
3.  **Instalar `yt-dlp`:**
    ```bash
    sudo pacman -S yt-dlp
    ```
    Alternativamente, você pode usar `yay`:
    ```bash
    yay -S yt-dlp
    ```
4.  **Garantir `~/.local/bin` no PATH:**
    Verifique se a seguinte linha está presente no seu `~/.bashrc` ou `~/.zshrc` (e recarregue o shell):
    ```bash
    export PATH="$HOME/.local/bin:$PATH"
    ```

### 3.3. Ollama

O Ollama é fundamental para rodar os LLMs localmente.

1.  **Instalar Ollama:** Siga as instruções oficiais do Ollama para Linux. Geralmente, é um comando simples:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```
2.  **Verificar a instalação:**
    ```bash
    ollama --version
    ```
3.  **Baixar modelos Ollama recomendados:**
    ```bash
    ollama pull llama3.1:8b
    ollama pull qwen-coder-32k
    ollama pull deepseek-coder-v2:16b
    ollama pull qwen2.5-coder:7b-instruct
    ```
    O aplicativo será capaz de detectar e listar esses modelos automaticamente.

### 3.4. Ambiente de Desktop

O aplicativo é projetado para funcionar em Hyprland, KDE Plasma e GNOME. Nenhuma configuração específica de ambiente de desktop é necessária além da instalação padrão e dos drivers gráficos.

## 4. Configuração do Ambiente de Desenvolvimento

### 4.1. Python

1.  **Instalar Python 3.9+:**
    ```bash
    sudo pacman -S python python-pip
    ```
2.  **Criar e ativar um ambiente virtual (`venv`):**
    Navegue até o diretório raiz do projeto "Brenno's Second Brain" e execute:
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
3.  **Instalar dependências Python:**
    ```bash
    pip install -r requirements.txt
    ```
    (Certifique-se de que o arquivo `requirements.txt` contenha todas as dependências do backend, como `fastapi`, `sounddevice`, `ollama`, `google-generativeai`, `openai`, `anthropic`, `langchain`, `langgraph`, `chromadb`, etc.)

### 4.2. Node.js/npm

1.  **Instalar Node.js (versão LTS) e npm:**
    ```bash
    sudo pacman -S nodejs npm
    ```
2.  **Instalar dependências do Frontend:**
    Navegue até o diretório do frontend (geralmente `frontend/` ou `app/`) e execute:
    ```bash
    npm install
    ```
    Isso instalará as dependências do Electron, React, Tailwind CSS, etc.

## 5. Configurações Específicas do Aplicativo

### 5.1. Credenciais e Chaves de API

As chaves de API para serviços remotos (Gemini, OpenAI, Anthropic) e credenciais de integração (Notion, Slack, E-mail) devem ser configuradas de forma segura.

1.  **Armazenamento Seguro:** O aplicativo utilizará o keyring do sistema operacional (se disponível e compatível com Electron/Python) ou um arquivo de configuração criptografado.
2.  **Configuração Inicial:** Na primeira execução, o aplicativo guiará o usuário para inserir essas credenciais através da interface. Elas serão armazenadas de forma segura.
3.  **Arquivo `claude.json` (para OpenClaude, se aplicável):** Se você estiver usando uma configuração específica para o OpenClaude via um arquivo `claude.json`, certifique-se de que este arquivo esteja acessível ao backend Python. O local exato pode ser configurado dentro do aplicativo.

### 5.2. Configuração do Obsidian Vault

O usuário precisará especificar o caminho para sua pasta do Obsidian Vault na interface do aplicativo (ex: `/run/media/brennor/.../Kyros/Obsidian_Vault`). O aplicativo precisará de permissões de escrita para este diretório.

### 5.3. Configuração de E-mail (Mail Lite)

As configurações do servidor SMTP e as credenciais para o Mail Lite, incluindo os múltiplos endereços de e-mail, serão configuradas através da interface do aplicativo.

## 6. Verificação da Instalação

Após seguir todos os passos, execute o aplicativo e verifique as seguintes funcionalidades:

1.  **Status do Ollama:** Verifique se o aplicativo detecta o serviço Ollama e os modelos baixados. Tente iniciar/parar o serviço via interface.
2.  **Gravação de Áudio:** Teste a gravação de áudio e a transcrição.
3.  **Resumo de YouTube:** Teste a extração de áudio e o resumo de um vídeo do YouTube.
4.  **Integrações:** Teste o salvamento no Obsidian, Notion, Slack e o envio de e-mails.
5.  **Conversa com Agente:** Faça perguntas sobre uma reunião ou vídeo recém-processado para verificar a funcionalidade RAG.

## 7. Solução de Problemas Comuns

*   **Problemas com GPU/CUDA:** Verifique os drivers NVIDIA, a instalação do CUDA e as variáveis de ambiente (`PATH`, `LD_LIBRARY_PATH`).
*   **Ollama não inicia/modelos não detectados:** Verifique se o serviço Ollama está rodando e se os modelos foram baixados corretamente (`ollama list`).
*   **`yt-dlp` falha:** Verifique a instalação de `yt-dlp` e `ffmpeg`.
*   **Permissões:** Certifique-se de que o aplicativo tem permissão de acesso ao microfone e aos diretórios de arquivos (Obsidian Vault, temporários).
*   **Credenciais:** Verifique se as chaves de API e credenciais estão corretas e armazenadas de forma segura.