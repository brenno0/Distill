---
tags: [design, ui, stitch, dark-theme, light-theme, distill]
project: distill
status: approved
date: 2026-04-16
author: Brenno
---

# Design System — Distill

## Stitch Prompt

```
Design a desktop application called **Distill** — a personal AI productivity tool for capturing, transcribing, and distilling knowledge from meetings and videos.

Design philosophy:
- Reading-first: the primary use case is reading long transcriptions, summaries, and documents. Typography, line-height, and content width must be optimized for extended reading sessions.
- Minimalist and information-first, inspired by Notion, Nivo (Rocketseat), and a clean medical SaaS called Splenavia
- Generous whitespace, subtle 1px borders, zero decorative noise
- Icons: line-only, 1.5px stroke, never filled — Lucide or Phosphor style, 16–20px
- Every element should feel intentional and calm. Nothing fights for attention.

---

Support both light and dark themes with full token parity.

Light theme:
- Background: #FAFAFA
- Surface: #FFFFFF
- Surface elevated: #F5F3FF
- Border: #E4E4E7
- Text primary: #18181B
- Text secondary: #71717A
- Text muted: #A1A1AA
- Accent: #5E3BEE | Accent hover: #4C2ECA | Accent subtle: #EDE9FE

Dark theme:
- Background: #0C0A14 (deep dark with a subtle purple undertone)
- Surface: #13101F
- Surface elevated: #1A1630
- Border: #27243A
- Text primary: #F4F4F5
- Text secondary: #A1A1AA
- Text muted: #52525B
- Accent: #7C5CFC | Accent hover: #9575FF | Accent subtle: #2D1F6E

---

Typography:
- UI font: Inter (weights 400, 500, 600)
- Reading/content font: Inter at larger scale — base 15px, line-height 1.7, max content width 680px for comfortable reading columns
- Monospace: JetBrains Mono for transcriptions, timestamps, and AI output
- Headings: Inter 600, tight letter-spacing (-0.02em)
- Never go below 13px. Prefer breathing room over density.

---

Layout: sidebar (240px, collapsible) + main content area. Top bar minimal — page title + contextual actions only. Notion-like navigation tree in sidebar.

Design these 3 screens:

1. Home / Dashboard — Recent sessions as cards (title, date, duration, one-line summary preview). Prominent "New Recording" CTA. Sidebar with: Recordings, YouTube, Library, Settings.

2. Active Recording — Focus mode. Large waveform visualizer in accent purple, timer, mic selector. Single primary action: "Stop & Transcribe". Minimal chrome.

3. Transcription View — This is the most important screen. Split layout: left panel is the full transcript in JetBrains Mono with timestamps, right panel is the AI-generated summary in Inter with clear heading hierarchy. Generous line-height, soft background behind content columns, toolbar for export/copy/regenerate. Optimized for long reading sessions.

---

Component style:
- Buttons: rounded-lg (8px radius), primary = solid purple, secondary = ghost/outline
- Inputs: subtle border, no drop shadow, purple focus ring
- Cards: surface background, 1px border, 12px radius, no shadow on light / very subtle shadow on dark
- Sidebar items: no background on hover — only text color shift + 2px left border in accent on active
- Scrollbars: minimal, 4px, muted color
```

---

## Tokens de referência rápida

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAFA` | `#0C0A14` |
| Surface | `#FFFFFF` | `#13101F` |
| Surface elevated | `#F5F3FF` | `#1A1630` |
| Border | `#E4E4E7` | `#27243A` |
| Text primary | `#18181B` | `#F4F4F5` |
| Text secondary | `#71717A` | `#A1A1AA` |
| Text muted | `#A1A1AA` | `#52525B` |
| Accent | `#5E3BEE` | `#7C5CFC` |
| Accent hover | `#4C2ECA` | `#9575FF` |
| Accent subtle | `#EDE9FE` | `#2D1F6E` |

## Tipografia

| Uso | Fonte | Tamanho | Peso |
|---|---|---|---|
| UI geral | Inter | 14px | 400–600 |
| Leitura/conteúdo | Inter | 15px / lh 1.7 | 400 |
| Transcrições | JetBrains Mono | 14px | 400 |
| Headings | Inter | variável | 600 |

**Largura máxima de coluna de leitura:** 680px

## Animações

| Biblioteca | Uso |
|---|---|
| **Anime.js** | Micro-interações de UI — transições de entrada/saída de componentes, animação de ícones, feedback visual de ações (ex: waveform, progresso) |
| **GSAP** | Animações mais complexas e de alta performance — transições de página, timeline de estado de gravação, efeitos de scroll em listas longas |

**Princípio:** animações devem ser sutis e funcionais, nunca decorativas. Duração máxima recomendada: 250ms para micro-interações, 400ms para transições de tela.

---

## Referências de design

- **Notion** — estrutura de layout, hierarquia tipográfica, espaçamento
- **Nivo (Diego Fernandes / Rocketseat)** — dark mode clean, tipografia, minimal chrome
- **Splenavia** — filosofia de paleta, acento roxo, estrutura de cards
