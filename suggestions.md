# Distill — Feature Roadmap

## Core Gaps (Tier 1)

### 1. Export [x] 
**Scope:** Frontend only  
**Formats:** TXT, SRT, VTT  
**Where:** Button in TranscriptPanel header → dropdown  
**Notes:** Generate from `segments` + `text`. SRT/VTT need timestamps. Trigger via `<a download>` or Electron `dialog.showSaveDialog`.

### 2. Audio Playback + Transcript Sync [x]
**Scope:** Backend new endpoint + new frontend component  
**Backend:** `GET /api/v1/transcriptions/{id}/audio` — serve `audio_path` with Range header support (needed for seeking)  
**Frontend:** `AudioPlayer` component below TranscriptPanel header — play/pause, scrub, speed control. Active segment highlights as audio plays. Click timestamp in transcript → seek audio.  
**Notes:** `audio_path` already in model. Only applies to recordings (not YouTube imports where no local file exists).

### 3. Global Search [x]
**Scope:** Backend new endpoint + frontend search UI  
**Backend:** `GET /api/v1/transcriptions/?q=term` — filter by title + full-text in `text` field  
**Frontend:** Activate existing Search button in sidebar → modal/overlay with results list  
**Notes:** The Search button in `app-sidebar.tsx` is already wired to nothing.

### 4. Transcript Editing [x]
**Scope:** Backend PATCH extension + frontend inline editing  
**Backend:** Extend `PATCH /{id}` to accept `{ segments: [...] }` or `{ text: string }`  
**Frontend:** Click segment text → `<textarea>` inline, Enter/blur saves via PATCH, optimistic update  
**Notes:** `transcription_service.update()` already accepts arbitrary dict — minimal backend work.

---

## High Quality-of-Life (Tier 2)

### 5. Speaker Renaming [x]
**Scope:** Frontend + PATCH endpoint extension  
**Backend:** PATCH accepts `{ speaker_map: { "SPEAKER_00": "João", "SPEAKER_01": "Maria" } }`, stored in metadata  
**Frontend:** Click speaker label in TranscriptPanel → inline edit input, saved globally for that transcription  
**Notes:** Apply renames at render time using `speakerColors` map already in TranscriptPanel.

### 6. Bookmarks / Highlights [ ]
**Scope:** Backend new field + frontend UI  
**Backend:** Store `bookmarks: [{segment_index, color, note}]` in transcription metadata via PATCH  
**Frontend:** Hover segment → bookmark icon. Bookmarks panel (4th tab in Reading view or sidebar section). Color-coded markers on segment dots in timeline view.

### 7. Command Palette (Cmd+K) [ ]
**Scope:** Frontend only  
**Library:** `cmdk` (already popular in shadcn ecosystem)  
**Commands:** Navigate to transcription, go to Library/Home/Settings, start recording, search  
**Notes:** Global keyboard listener, floating modal overlay.

---

## Execution Order

1. Export ← start here (30min, zero backend, immediate value)
2. Speaker Renaming ← minimal backend, reuses existing PATCH
3. Global Search ← sidebar button already exists as placeholder
4. Transcript Editing ← inline edit UX + PATCH extension
5. Audio Playback + Sync ← most complex, needs new backend endpoint
6. Bookmarks / Highlights ← needs data model design
7. Command Palette ← frontend only, additive

---

## Status Legend
`[ ]` todo · `[~]` in progress · `[x]` done
