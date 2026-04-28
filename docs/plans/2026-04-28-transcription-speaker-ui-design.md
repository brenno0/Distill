# Transcription Speaker UI (Non-YouTube)

## Problem
Recorded meeting transcriptions already include speaker-separated segments (or at least speaker labels when available), but the transcription page still renders a flat, monolithic view. We want the page to present a conversation-style transcript for manual recordings, while keeping YouTube transcriptions unchanged.

## Goals
- Show a chat-style transcript for non-YouTube recordings when speaker labels are available.
- Preserve the current YouTube transcription layout exactly as-is.
- Fall back to the existing continuous-text view when speaker labels are missing.

## Non-Goals
- Do not change the transcription pipeline or introduce new diarization.
- Do not alter YouTube processing or its UI.
- Do not introduce new backend persistence for live segments.

## Proposed Approach (Frontend-Only)
1. Detect `transcription_type` in the transcription page.
2. For `transcription_type !== "youtube"`, render the transcript as chat bubbles **only if** segments contain `speaker` data.
3. If segments are missing speaker labels (or empty), fall back to the current paragraph-based transcript UI.
4. Keep the summary and AI chat panels unchanged.

## UI Behavior
- Chat bubbles align left/right based on speaker grouping (same as live preview).
- Speaker labels are displayed; if Whisper emits `SPEAKER_00/01`, keep them as-is.
- Segment merging rules remain in the transcript panel to avoid overly fragmented bubbles.
- Scrolling and copy-all behavior remain available in the transcript header.

## Data Flow
- Existing API response already includes `segments` with `speaker` where available.
- No backend schema changes required.
- The UI decides render mode based on `transcription_type` and presence of `speaker`.

## Edge Cases
- If only some segments have `speaker`, treat it as missing and render the continuous view.
- If `segments` are empty but `text` exists, render the current continuous view.

## Testing
- Unit/UI check for: non-YouTube with speakers renders bubbles.
- Non-YouTube without speakers falls back to continuous view.
- YouTube transcription remains unchanged.
