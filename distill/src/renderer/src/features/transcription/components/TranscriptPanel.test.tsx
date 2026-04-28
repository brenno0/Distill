// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
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
