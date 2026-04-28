import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import soundfile as sf

from app.core.ws_manager import ws_manager

CHUNK_INTERVAL = 8  # seconds between transcription passes
MIN_AUDIO_SECONDS = 1.0  # skip chunks shorter than this


class StreamingTranscriber:
    """
    Background task that transcribes mic and monitor in chunks during recording.
    Uses the two physical streams as speaker attribution — no ML diarization needed.
    Pushes `live_segment` events via WebSocket so the frontend can show a live chat.
    """

    def __init__(self):
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._task: asyncio.Task | None = None

    def start(
        self,
        recorder,
        transcription_id: str,
        mic_speaker: str = "Você",
        monitor_speaker: str = "Remoto",
    ) -> None:
        self._task = asyncio.create_task(
            self._run(recorder, transcription_id, mic_speaker, monitor_speaker)
        )

    def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    async def _run(
        self,
        recorder,
        transcription_id: str,
        mic_speaker: str,
        monitor_speaker: str,
    ) -> None:
        mic_idx = 0
        monitor_idx = 0
        elapsed = 0

        while recorder.is_recording:
            await asyncio.sleep(CHUNK_INTERVAL)
            if not recorder.is_recording:
                break

            elapsed += CHUNK_INTERVAL

            mic_chunk, mic_idx = recorder.get_mic_chunk_since(mic_idx)
            if mic_chunk is not None and len(mic_chunk) / recorder._samplerate >= MIN_AUDIO_SECONDS:
                text = await self._transcribe(mic_chunk, recorder._samplerate)
                if text:
                    await ws_manager.send(transcription_id, "live_segment", {
                        "speaker": mic_speaker,
                        "speaker_type": "local",
                        "text": text,
                        "elapsed": elapsed - CHUNK_INTERVAL,
                    })

            # Only transcribe monitor if it was configured
            if recorder._monitor_source:
                monitor_chunk, monitor_idx = recorder.get_monitor_chunk_since(monitor_idx)
                if monitor_chunk is not None and len(monitor_chunk) / recorder._samplerate >= MIN_AUDIO_SECONDS:
                    text = await self._transcribe(monitor_chunk, recorder._samplerate)
                    if text:
                        await ws_manager.send(transcription_id, "live_segment", {
                            "speaker": monitor_speaker,
                            "speaker_type": "remote",
                            "text": text,
                            "elapsed": elapsed - CHUNK_INTERVAL,
                        })

    async def _transcribe(self, audio: np.ndarray, samplerate: int) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, self._sync_transcribe, audio, samplerate)

    def _sync_transcribe(self, audio: np.ndarray, samplerate: int) -> str:
        path = None
        from app.services.whisper_processor import whisper_processor
        import whisperx

        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                path = f.name
            # Convert to mono float32 if needed
            mono = audio.mean(axis=1) if audio.ndim > 1 else audio.squeeze()
            sf.write(path, mono.astype(np.float32), samplerate)

            model = whisper_processor._load_model()
            audio_data = whisperx.load_audio(path)
            result = model.transcribe(audio_data, batch_size=8)
            return " ".join(s.get("text", "").strip() for s in result.get("segments", []))
        finally:
            if path and os.path.exists(path):
                os.unlink(path)


streaming_transcriber = StreamingTranscriber()
