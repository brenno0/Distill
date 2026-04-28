# Mic/Monitor Speaker Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Attribute meeting speakers by mic vs monitor audio (Brenno/Outros), persist those segments, and render avatar initials on the transcript bubbles while keeping YouTube unchanged.

**Architecture:** On recording stop, write separate mic/monitor WAVs and store their paths plus speaker names in transcription metadata. For meeting transcriptions, transcribe both WAVs, merge segments by timestamp, and inject `speaker` + `speaker_type`. The UI uses those fields to align bubbles and show avatar initials.

**Tech Stack:** FastAPI (Python), WhisperX, Supabase, React 19, Radix UI Avatar, Vitest.

---

### Task 1: Persist mic/monitor WAVs in AudioRecorder

**Files:**
- Modify: `backend/app/services/audio_recorder.py:65-175`
- Test: `backend/tests/unit/test_audio_recorder.py`

**Step 1: Write the failing test**

```python
import os
import numpy as np
from unittest.mock import MagicMock
from app.services.audio_recorder import AudioRecorder

def test_stop_writes_mic_and_monitor_files(tmp_path, monkeypatch):
    recorder = AudioRecorder()
    recorder.is_recording = True
    recorder._samplerate = 48000
    recorder._output_path = str(tmp_path / "mixed.wav")
    recorder._mic_output_path = str(tmp_path / "mixed_mic.wav")
    recorder._monitor_output_path = str(tmp_path / "mixed_monitor.wav")
    recorder._mic_stream = MagicMock()
    recorder._monitor_stream = MagicMock()

    recorder._mic_frames = [np.ones((48000, 1), dtype=np.float32)]
    recorder._monitor_frames = [np.ones((48000, 2), dtype=np.float32)]

    recorder.stop_recording()

    assert os.path.exists(recorder.get_mic_output_path())
    assert os.path.exists(recorder.get_monitor_output_path())
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_audio_recorder.py::test_stop_writes_mic_and_monitor_files -v`  
Expected: FAIL (attributes/methods missing).

**Step 3: Write minimal implementation**

```python
# audio_recorder.py
def start_recording(self) -> str:
    ...
    self._mic_output_path = self._output_path.replace(".wav", "_mic.wav")
    self._monitor_output_path = self._output_path.replace(".wav", "_monitor.wav")

def stop_recording(self) -> str:
    ...
    if self._mic_frames:
        mic = np.concatenate(self._mic_frames, axis=0)
        mic_mono = mic.mean(axis=1, keepdims=True)
        sf.write(self._mic_output_path, mic_mono, self._samplerate)
        ...
    if self._monitor_frames:
        mon = np.concatenate(self._monitor_frames, axis=0)
        mon_mono = mon.mean(axis=1, keepdims=True)
        sf.write(self._monitor_output_path, mon_mono, self._samplerate)
```

Add getters:

```python
def get_mic_output_path(self) -> str | None:
    return self._mic_output_path if self._mic_frames else None

def get_monitor_output_path(self) -> str | None:
    return self._monitor_output_path if self._monitor_frames else None
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_audio_recorder.py::test_stop_writes_mic_and_monitor_files -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/audio_recorder.py backend/tests/unit/test_audio_recorder.py
git commit -m "feat: persist mic and monitor wav files"
```

---

### Task 2: Store audio paths + speaker names on recording stop

**Files:**
- Modify: `backend/app/services/recording_service.py:20-80`
- Test: `backend/tests/unit/test_recording_service.py`

**Step 1: Write the failing test**

```python
import pytest
from unittest.mock import AsyncMock
from app.services.recording_service import RecordingService

@pytest.mark.asyncio
async def test_stop_persists_mic_monitor_metadata(monkeypatch):
    service = RecordingService()
    service._transcription_id = "t-1"

    class FakeRecorder:
        def stop_recording(self):
            return "/tmp/mixed.wav"
        def get_mic_output_path(self):
            return "/tmp/mic.wav"
        def get_monitor_output_path(self):
            return "/tmp/monitor.wav"

    service._recorder = FakeRecorder()

    updates = []
    async def fake_update(tid, data):
        updates.append((tid, data))
        return data

    monkeypatch.setattr("app.services.recording_service.transcription_repo.update", fake_update)
    monkeypatch.setattr("app.services.recording_service.transcription_service.process", AsyncMock())

    await service.stop()

    assert updates
    metadata = updates[0][1]["metadata"]
    assert metadata["mic_audio_path"] == "/tmp/mic.wav"
    assert metadata["monitor_audio_path"] == "/tmp/monitor.wav"
    assert metadata["mic_speaker_name"] == "Brenno"
    assert metadata["monitor_speaker_name"] == "Outros"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_recording_service.py::test_stop_persists_mic_monitor_metadata -v`  
Expected: FAIL (metadata not written).

**Step 3: Write minimal implementation**

```python
# recording_service.py
mic_path = self._recorder.get_mic_output_path()
monitor_path = self._recorder.get_monitor_output_path()
metadata = {
    "mic_audio_path": mic_path,
    "monitor_audio_path": monitor_path,
    "mic_speaker_name": mic_speaker_name,
    "monitor_speaker_name": "Outros",
}
await transcription_repo.update(transcription_id, {"metadata": metadata})
```

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_recording_service.py::test_stop_persists_mic_monitor_metadata -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/recording_service.py backend/tests/unit/test_recording_service.py
git commit -m "feat: save mic/monitor metadata on recording stop"
```

---

### Task 3: Transcribe mic/monitor separately and merge segments

**Files:**
- Modify: `backend/app/services/transcription_service.py:19-80`
- Test: `backend/tests/unit/test_transcription_service.py`

**Step 1: Write the failing test**

```python
import pytest
from unittest.mock import AsyncMock
from app.services.transcription_service import transcription_service

@pytest.mark.asyncio
async def test_process_merges_mic_monitor_segments(monkeypatch):
    async def fake_get(_id):
        return {
            "id": "t-1",
            "transcription_type": "meeting",
            "metadata": {
                "mic_audio_path": "/tmp/mic.wav",
                "monitor_audio_path": "/tmp/monitor.wav",
                "mic_speaker_name": "Brenno",
                "monitor_speaker_name": "Outros",
            },
        }

    updates = []
    async def fake_update(_id, data):
        updates.append(data)
        return data

    async def fake_transcribe(audio_path, transcription_id, progress_callback=None):
        if "mic" in audio_path:
            return {"text": "oi", "segments": [{"text": "Oi", "start": 0.0, "end": 1.0}]}
        return {"text": "ola", "segments": [{"text": "Olá", "start": 0.5, "end": 1.5}]}

    monkeypatch.setattr("app.services.transcription_service.transcription_repo.get", fake_get)
    monkeypatch.setattr("app.services.transcription_service.transcription_repo.update", fake_update)
    monkeypatch.setattr("app.services.transcription_service.whisper_processor.transcribe", fake_transcribe)
    monkeypatch.setattr("app.services.transcription_service.kb_manager.ingest_transcription", AsyncMock())
    monkeypatch.setattr("app.services.transcription_service.summary_service.generate", AsyncMock(return_value=""))
    monkeypatch.setattr("app.services.transcription_service.library_repository.library_repo.upsert_item_for_transcription", AsyncMock())

    await transcription_service.process("t-1", "/tmp/mixed.wav")

    metadata = updates[-1]["metadata"]
    segments = metadata["segments"]
    assert segments[0]["speaker"] == "Brenno"
    assert segments[0]["speaker_type"] == "local"
    assert segments[1]["speaker"] == "Outros"
    assert segments[1]["speaker_type"] == "remote"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && poetry run pytest tests/unit/test_transcription_service.py::test_process_merges_mic_monitor_segments -v`  
Expected: FAIL (merge logic missing).

**Step 3: Write minimal implementation**

```python
# transcription_service.py
record = await transcription_repo.get(transcription_id)
meta = (record or {}).get("metadata") or {}
mic_path = meta.get("mic_audio_path")
monitor_path = meta.get("monitor_audio_path")

if record and record.get("transcription_type") == "meeting" and mic_path and monitor_path:
    mic_result = await whisper_processor.transcribe(mic_path, transcription_id, None)
    monitor_result = await whisper_processor.transcribe(monitor_path, transcription_id, None)
    mic_segments = [
        {**s, "speaker": meta.get("mic_speaker_name", "Brenno"), "speaker_type": "local"}
        for s in mic_result.get("segments", [])
    ]
    monitor_segments = [
        {**s, "speaker": meta.get("monitor_speaker_name", "Outros"), "speaker_type": "remote"}
        for s in monitor_result.get("segments", [])
    ]
    merged = sorted(mic_segments + monitor_segments, key=lambda s: s.get("start", 0))
    meta["segments"] = merged
```

If either path is missing, keep the current mixed-audio transcription flow and store its segments.

**Step 4: Run test to verify it passes**

Run: `cd backend && poetry run pytest tests/unit/test_transcription_service.py::test_process_merges_mic_monitor_segments -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/transcription_service.py backend/tests/unit/test_transcription_service.py
git commit -m "feat: merge mic/monitor segments with speaker labels"
```

---

### Task 4: Render avatar initials in transcript bubbles

**Files:**
- Modify: `distill/src/renderer/src/features/transcription/components/TranscriptPanel.tsx`
- Modify: `distill/src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from './TranscriptPanel'

it('renders avatar initials from speaker names', () => {
  render(
    <TranscriptPanel
      segments={[
        { text: 'Oi', start: 0, end: 1, speaker: 'Brenno', speaker_type: 'local' },
        { text: 'Olá', start: 1, end: 2, speaker: 'Outros', speaker_type: 'remote' },
      ]}
      fullText="Oi Olá"
      status="completed"
      transcriptionType="meeting"
    />
  )
  expect(screen.getByText('B')).toBeInTheDocument()
  expect(screen.getByText('O')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`  
Expected: FAIL (avatar initials not rendered).

**Step 3: Write minimal implementation**

```tsx
import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

const isRight = block.speaker_type === 'local' || speakerSides.get(speaker) === 'right'
```

Place `Avatar` beside each bubble, using initials from `block.speaker`.

**Step 4: Run test to verify it passes**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add distill/src/renderer/src/features/transcription/components/TranscriptPanel.tsx \
  distill/src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx
git commit -m "feat: add avatar initials to transcript bubbles"
```

---

### Task 5: Full typecheck + targeted test runs

**Files:**
- None

**Step 1: Backend unit tests (targeted)**

Run: `cd backend && poetry run pytest tests/unit/test_audio_recorder.py::test_stop_writes_mic_and_monitor_files -v`  
Expected: PASS

Run: `cd backend && poetry run pytest tests/unit/test_recording_service.py::test_stop_persists_mic_monitor_metadata -v`  
Expected: PASS

Run: `cd backend && poetry run pytest tests/unit/test_transcription_service.py::test_process_merges_mic_monitor_segments -v`  
Expected: PASS

**Step 2: Frontend tests**

Run: `cd distill && npx vitest run src/renderer/src/features/transcription/components/TranscriptPanel.test.tsx`  
Expected: PASS

**Step 3: Typecheck**

Run: `cd distill && npm run typecheck`  
Expected: PASS

**Step 4: Commit (if needed)**

```bash
git status --porcelain
```
