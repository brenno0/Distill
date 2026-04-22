# Design — Loading Feedback com Skeletons

## Objetivo

Melhorar feedback visual de carregamento em todas as telas com dados assíncronos, incluindo carregamento inicial e ações em progresso, sem alterar a lógica de negócio.

## Escopo aprovado

- Aplicar skeletons em todas as telas que carregam dados.
- Cobrir carregamento inicial e ações assíncronas.
- Usar abordagem com componentes reutilizáveis por feature.

## Arquitetura

- Criar componentes de skeleton específicos por feature:
  - Settings
  - Transcription
  - Library
  - Import
- Reutilizar `components/ui/skeleton.tsx` como bloco base.
- Substituir fallbacks textuais de `Suspense` por layouts de skeleton equivalentes ao conteúdo real.

## Fluxo de UX

1. Tela abre e query/fetch inicia.
2. Fallback mostra skeleton estrutural da própria feature.
3. Quando dados chegam, skeleton sai sem salto de layout.
4. Em ações assíncronas (save/send/import/delete/start/stop), elementos relevantes exibem feedback local com skeleton/placeholder e estado disabled.

## Regras de implementação

- Mudanças cirúrgicas de apresentação: sem alterar contratos de API.
- Evitar bloqueio global da tela para ações pontuais.
- Garantir consistência visual entre páginas.

## Qualidade

- Validar com `npm run typecheck`.
- Incluir testes leves para render de skeleton em estados críticos.
- Garantir desaparecimento do skeleton após conclusão do carregamento.
