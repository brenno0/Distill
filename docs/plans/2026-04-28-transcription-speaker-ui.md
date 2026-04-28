# Transcription Speaker UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show chat-style, speaker-separated transcript bubbles for non-YouTube recordings while keeping YouTube transcripts unchanged.

**Architecture:** The frontend will decide the transcript layout based on `transcription_type` and the presence of speaker labels in `segments`. Non-YouTube transcripts with complete speaker labels render chat bubbles; all other cases fall back to the current continuous transcript view.

**Tech Stack:** React 19, TanStack Router, Vitest + Testing Library, Tailwind CSS.

---

### Task 1: Add speaker-aware bubble rendering to TranscriptPanel

**Files:**
- Create: `distill/src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`
- Modify: `distill/src/renderer/src/features/transcription/components/TranscriptPanel.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from './TranscriptPanel'

describe('TranscriptPanel (speaker layout)', () => {
  it('renders chat bubbles for non-youtube when all segments have speaker', () => {
    render(
      <TranscriptPanel
        segments={[
          { text: 'Oi', start: 0, end: 1, speaker: 'SPEAKER_00' },
          { text: 'Tudo bem?', start: 2, end: 3, speaker: 'SPEAKER_01' },
        ]}
        fullText="Oi Tudo bem?"
        status="completed"
        transcriptionType="meeting"
      />
    )
    expect(screen.getByText('SPEAKER_00')).toBeInTheDocument()
    expect(screen.getByText('SPEAKER_01')).toBeInTheDocument()
  })

  it('falls back to continuous text when speakers are missing', () => {
    render(
      <TranscriptPanel
        segments={[{ text: 'Sem speaker', start: 0, end: 1 }]}
        fullText="Sem speaker"
        status="completed"
        transcriptionType="meeting"
      />
    )
    expect(screen.getByText('Sem speaker')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`
Expected: FAIL because `transcriptionType` prop and bubble layout do not exist.

**Step 3: Write minimal implementation**

```tsx
type TranscriptPanelProps = {
  segments: Segment[]
  fullText?: string
  status?: string
  progress?: number | null
  transcriptionType?: string
}

const hasCompleteSpeakers =
  segments.length > 0 && segments.every((s) => Boolean(s.speaker?.trim()))

const shouldRenderBubbles =
  transcriptionType !== 'youtube' && hasCompleteSpeakers
```

Implement a bubble layout:
- Group segments by speaker/time like today.
- Assign left/right alignment per unique speaker order (stable map).
- Display speaker label and timestamps in the bubble header.
- Keep existing continuous transcript fallback unchanged.

**Step 4: Run test to verify it passes**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/transcription/components/TranscriptPanel.tsx \
  distill/src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx
git commit -m "feat: render speaker bubbles for meeting transcripts"
```

---

### Task 2: Wire transcription_type into TranscriptPanel

**Files:**
- Modify: `distill/src/renderer/src/features/transcription/TranscriptionPage.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from './components/TranscriptPanel'

describe('TranscriptionPage wiring', () => {
  it('accepts transcriptionType prop without TS errors', () => {
    render(
      <TranscriptPanel
        segments={[{ text: 'Oi', start: 0, end: 1, speaker: 'SPEAKER_00' }]}
        fullText="Oi"
        status="completed"
        transcriptionType="meeting"
      />
    )
    expect(screen.getByText('SPEAKER_00')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`
Expected: FAIL if prop wiring/types are missing.

**Step 3: Write minimal implementation**

```tsx
const transcriptionType = t.transcription_type

<TranscriptPanel
  segments={segments}
  fullText={t.text}
  status={status}
  progress={progress}
  transcriptionType={transcriptionType}
/>
```

**Step 4: Run test to verify it passes**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/transcription/TranscriptionPage.tsx
git commit -m "feat: pass transcription type to transcript panel"
```

---

### Task 3: Typecheck and smoke verification

**Files:**
- None

**Step 1: Run typecheck**

Run: `cd distill && npm run typecheck`
Expected: PASS

**Step 2: Manual smoke check**

- Open a non-YouTube transcription with speaker segments → bubbles render.
- Open a YouTube transcription → layout unchanged.
- Open a non-YouTube transcription without speakers → continuous text view.

**Step 3: Commit (if needed)**

```bash
git status --porcelain
```
