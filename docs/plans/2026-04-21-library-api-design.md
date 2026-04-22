# Library API (backend) — Design

Data: 2026-04-21

## Objetivo
Entregar a Library API do backend para gerenciar pastas/itens da biblioteca e
integrar o pipeline de transcrição (YouTube) ao catálogo, mantendo fallback em
memória quando o Supabase não estiver configurado.

## Escopo
1. Rotas REST para pastas e itens em `/api/v1/library`.
2. Repositório com persistência no Supabase e fallback em memória.
3. Migrações SQL para `library_folders` e `library_items`.
4. Upsert de item da biblioteca ao concluir transcrição de YouTube.

## Fora do escopo
- UI do frontend (telas da biblioteca).
- Migração de itens antigos para a biblioteca automaticamente.

## Arquitetura
- **Router**: endpoints específicos para folders e items.
- **Models**: contratos Pydantic para requests/responses.
- **Service**: orquestração simples das operações.
- **Repository**: acesso ao banco e fallback em memória.
- **Migrations**: tabelas, índices e triggers de `updated_at`.

## Fluxo de dados
- UI chama `/api/v1/library/folders` para listar/criar/renomear/mover/deletar.
- UI chama `/api/v1/library/items` para listar por `folder_id`, renomear e mover.
- `delete_folder` move itens para o Inbox antes de remover a pasta.
- Pipeline de YouTube chama `upsert_item_for_transcription` com título/thumbnail.

## Regras de negócio
- Inbox é imutável (não renomear/mover/deletar).
- Não permitir mover pastas para dentro de seus descendentes.
- Validações de nome e existência de recursos.

## Tratamento de erros
- `ValueError` no repo/service mapeado para **400** (validação) ou **404** (não encontrado).
- Erros inesperados seguem 500 padrão do FastAPI.

## Testes
- Unit tests do repository em modo memória: Inbox, ciclos, delete com move, upsert.
- Smoke tests dos endpoints de settings (já existentes) e ajustes no YouTube processor.
