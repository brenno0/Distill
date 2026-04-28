# Transcription Mic/Monitor Speaker Separation

## Problem
The transcription screen now renders speakers, but the final transcript still labels speakers using generic diarization instead of the known mic/monitor sources. We also need avatar initials (Gmail-style) to match the live experience.

## Goals
- Attribute speakers by source: mic = "Brenno", monitor = "Outros".
- Render avatar initials next to each speaker bubble.
- Keep YouTube transcriptions unchanged.

## Non-Goals
- Do not use ML diarization for meetings.
- Do not change YouTube processing.
- Do not depend on live segments for final transcripts.

## Proposed Approach
1. **Persist separate audio files**: on `stop_recording`, write two WAVs (mic + monitor) in addition to the mixed WAV.
2. **Store paths in metadata**: save `mic_audio_path` and `monitor_audio_path` to transcription metadata.
3. **Dual transcription**: for `meeting` transcriptions, transcribe mic and monitor separately.
4. **Merge segments**: combine the two segment lists by `start` time and inject `speaker` labels using configured names (mic_speaker_name + "Outros").
5. **UI avatars**: in the transcript bubbles, show avatar initials derived from speaker names (e.g., B / O).

## Data Flow
- `AudioRecorder.stop_recording` → generates three WAVs: mixed, mic-only, monitor-only.
- `RecordingService` keeps the mixed path for Whisper, and metadata paths for speaker separation.
- `TranscriptionService.process` reads metadata, transcribes mic/monitor separately, merges segments, and returns segments with speaker labels.

## Edge Cases
- If monitor audio is disabled or empty, produce speaker labels only for mic.
- If metadata paths are missing (old recordings), fall back to current behavior.
- If either transcription fails, fall back to mixed audio transcript.

## UI Details
- Use `Avatar` + `AvatarFallback` with initials from speaker label.
- Maintain existing bubble layout; avatars appear on the side of each bubble.

## Testing
- Unit test: merged segments have speaker labels for mic/monitor.
- UI test: initials render for speaker bubbles.
- Regression: YouTube transcripts unchanged.
