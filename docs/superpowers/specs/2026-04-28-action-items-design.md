# Action Items — Design Spec
**Date:** 2026-04-28

## Overview

Extrair automaticamente action items de reuniões transcritas e exibi-los como lista editável com checkbox dentro da tela de transcrição existente.

---

## Data Model

### Supabase Migration
```sql
ALTER TABLE transcriptions ADD COLUMN action_items JSONB DEFAULT NULL;
```

`NULL` = extração ainda não realizada (ou em andamento). `[]` = extraído, sem ações encontradas. `[...]` = itens extraídos.

### ActionItem Schema
```json
{
  "id": "uuid-v4",
  "text": "Enviar proposta para João",
  "responsible": "Maria",
  "deadline": "sexta-feira",
  "completed": false
}
```

Campos `responsible` e `deadline` são opcionais (null quando não mencionados na transcrição).

---

## Backend

### Pipeline de Extração

**Localização:** `transcription_service.py`, após geração do summary (falha silenciosa — não bloqueia pipeline).

**Fluxo:**
1. Transcrição completa → summary gerado
2. Chama LLM com prompt estruturado sobre o texto da transcrição
3. Parseia resposta JSON → array de action items com IDs gerados
4. `transcription_repo.update(id, {"action_items": items})`
5. Em caso de erro: loga warning, salva `action_items: []`

**Prompt LLM:**
```
Analise a transcrição abaixo e extraia todas as ações concretas mencionadas.
Retorne SOMENTE um JSON array com objetos no formato:
{"text": "descrição da ação", "responsible": "nome ou null", "deadline": "prazo ou null"}

Extraia apenas compromissos explícitos, não discussões gerais.
Transcrição:
{text}
```

### Novo Endpoint

```
PUT /api/v1/transcriptions/{id}/action-items
Body: [{ id, text, responsible, deadline, completed }]
```

Substitui o array completo. Usado pelo frontend para persistir edições e toggles do usuário.

**Response:** `{ action_items: [...] }`

---

## Frontend

### Componentes Novos

**`ActionItemsPanel`** — seção exibida na tela de transcrição (`/transcription/$id`).

**`ActionItem`** — item individual com:
- Checkbox: toggle `completed`, risca texto, persiste via PATCH imediato
- Texto: click ativa input inline editável, salva no blur/Enter
- Badge `@Responsável`: click abre popover com input
- Badge de prazo: click abre popover com input
- Botão editar (visível no hover): foca o input de texto

### Hook `useActionItems`

- Lê `action_items` dos dados da transcrição (via `useTranscription` existente)
- Mantém estado local (optimistic updates)
- Debounce de 800ms → `PUT /action-items` em background
- Expõe: `items`, `toggle(id)`, `update(id, fields)`, `isSaving`

### Estados Visuais

| Estado | UI |
|--------|-----|
| `status !== 'completed'` | Seção oculta |
| `action_items === null` | Skeleton de 3 itens (extração em andamento) |
| `action_items === []` | "Nenhuma ação identificada nesta reunião" |
| `action_items.length > 0` | Lista interativa |

### Localização na Página

Abaixo do summary, acima do painel do agente de chat.

---

## Error Handling

- Extração LLM falha → salva `[]`, não bloqueia pipeline, loga warning
- LLM retorna JSON inválido → tenta parse parcial; em falha total, salva `[]`
- PATCH do frontend falha → mantém estado local, exibe toast de erro discreto, retry automático na próxima edição

---

## Fora do Escopo (YAGNI)

- Exportar action items separadamente
- Filtrar action items cross-transcrições
- Notificações de prazo
- Integração com ferramentas de task (Notion/Linear)
