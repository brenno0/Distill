# Design — Persistência de Provider/Modelo LLM e Secrets

## Objetivo

Permitir que o usuário altere provider e modelo LLM pela interface e que essa configuração permaneça entre sessões.  
Transcrição STT continua com WhisperX local.  
Resumo e interpretação (agent chat) usam o provider/modelo padrão configurado pelo usuário.

## Decisões aprovadas

1. Persistir configurações **não sensíveis** (`default_llm_provider`, `default_llm_model`) em Supabase.
2. Persistir **secrets** apenas no keyring do sistema (criptografado), nunca em Supabase.
3. Manter WhisperX como motor de STT.

## Arquitetura

### Backend

- Adicionar `AppSettingsRepository` na camada `Repository` para tabela `app_settings`.
- No startup, carregar settings persistidos do banco e aplicar em `app_settings` (estado de runtime).
- Em `PUT /api/v1/settings`:
  - salvar `llm.provider` e `llm.model` no banco;
  - salvar secrets no keyring (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, etc.).
- Em `GET /api/v1/settings`:
  - retornar provider/modelo atuais;
  - retornar apenas flags de presença para secrets (`has_*`).

### Frontend

- Corrigir payload de save para enviar `secrets.google_api_key` (e equivalentes), em vez de `api_key` genérico.
- Após salvar settings, sincronizar store local com provider/modelo retornados pelo backend.
- Garantir que chat/interpretação usem sempre o estado sincronizado.

## Fluxo de dados

1. Usuário altera provider/modelo/key na tela de settings.
2. Frontend envia `PUT /api/v1/settings` com:
   - `llm` (provider/model),
   - `secrets` (chaves por provider).
3. Backend grava:
   - `llm` em `app_settings` (Supabase),
   - `secrets` em keyring.
4. Backend responde com estado atualizado.
5. Frontend sincroniza store e próximos resumos/chats passam a usar a nova config.

## Erros e segurança

- Sem fallback silencioso em falhas de persistência no Supabase: erro HTTP explícito.
- Sem exposição de segredo em respostas: apenas flags booleanas.
- Se provider cloud for usado sem key, retornar erro claro na operação.

## Testes

- Unit tests para `AppSettingsRepository` (save/load).
- Testes de endpoint `settings` cobrindo:
  - persistência de `llm`,
  - leitura correta após restart lógico,
  - persistência de secrets no keyring.
- Ajustes de teste de frontend para payload `secrets.*` e sincronização de store.
