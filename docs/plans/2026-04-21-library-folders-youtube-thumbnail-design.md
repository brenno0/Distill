# Design — Library com Pastas Recursivas + Thumbnail de YouTube

## Objetivo

Permitir organizar a Library em pastas manuais recursivas e exibir thumbnail para itens importados do YouTube.  
Também permitir renomear cada arquivo transcrito na Library.

## Decisão de arquitetura

Foi escolhida a abordagem **B**: camada dedicada de Library.

- `transcriptions`: continua como fonte de conteúdo/transcrição.
- `library_folders`: árvore recursiva de pastas.
- `library_items`: representação dos itens exibidos na Library, ligada a `transcriptions`.

## Modelo de dados

### Tabela `library_folders`

- `id` (PK)
- `name` (TEXT NOT NULL)
- `parent_id` (FK nullable para `library_folders.id`) — permite recursão
- `created_at`, `updated_at`

### Tabela `library_items`

- `id` (PK)
- `transcription_id` (FK para `transcriptions.id`)
- `folder_id` (FK para `library_folders.id`)
- `display_name` (nome editável do item)
- `thumbnail_url` (nullable)
- `created_at`, `updated_at`

### Bootstrap

- Criar pasta padrão `Inbox` na inicialização/migrations.
- Todo item novo entra em `Inbox` por padrão.

## Regras de negócio

1. Pastas:
   - criar
   - renomear
   - mover na árvore (alterar `parent_id`)
   - excluir
2. Exclusão de pasta com conteúdo:
   - mover itens da pasta excluída para `Inbox`
   - excluir a pasta
3. Itens:
   - renomear via `display_name`
   - mover entre pastas
4. YouTube:
   - extrair `thumbnail_url` no pipeline
   - salvar no `library_items`
   - renderizar thumbnail no card, com fallback visual se ausente/erro
5. Segurança de árvore:
   - impedir ciclo (pasta não pode virar filha de descendente)
   - impedir mover para si mesma

## Fluxo funcional

1. Import YouTube cria transcrição.
2. Pipeline extrai áudio + metadados (incluindo thumbnail).
3. Backend cria/atualiza `library_items` com `display_name` e `thumbnail_url`.
4. Frontend da Library carrega árvore de pastas + itens da pasta ativa.
5. Usuário organiza por criar/mover/renomear pastas e itens.

## Erros e consistência

- Operações de mover/excluir pasta em transação.
- Validação de nome vazio/duplicado (escopo da pasta pai).
- Quando thumbnail falhar no frontend, usar placeholder padrão.

## Testes

- Backend:
  - CRUD de pastas recursivas
  - anti-ciclo em movimentação
  - exclusão com move para Inbox
  - persistência de thumbnail no item YouTube
  - rename de item (`display_name`)
- Frontend:
  - render da árvore recursiva
  - rename de item
  - mover item/pasta
  - render de thumbnail/fallback
