import uuid
import os
import numpy as np
import sounddevice as sd
import soundfile as sf
from pathlib import Path
from app.core.config import settings


class AudioRecorder:
    """
    Grava áudio do microfone a 16kHz mono via sounddevice (doc §3.1).
    16kHz mono é o formato nativo do Whisper large-v3 — evita resampling
    e reduz uso de VRAM durante a inferência.
    """

    SAMPLE_RATE = 16000
    CHANNELS = 1

    def __init__(self):
        self.is_recording = False
        self._frames: list[np.ndarray] = []
        self._stream: sd.InputStream | None = None
        self._output_path: str = ""

    def start_recording(self) -> str:
        """
        Inicia stream contínuo via callback.
        Retorna o caminho onde o WAV será salvo ao chamar stop_recording().
        """
        if self.is_recording:
            raise RuntimeError("Already recording")

        self.is_recording = True
        self._frames = []
        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
        self._output_path = os.path.join(
            settings.temp_dir, f"meeting_{uuid.uuid4().hex[:8]}.wav"
        )

        def _callback(indata: np.ndarray, frames: int, time, status) -> None:
            if self.is_recording:
                self._frames.append(indata.copy())

        self._stream = sd.InputStream(
            samplerate=self.SAMPLE_RATE,
            channels=self.CHANNELS,
            callback=_callback,
            dtype=np.float32,
        )
        self._stream.start()
        return self._output_path

    def stop_recording(self) -> str:
        """
        Para o stream, concatena todos os frames gravados e salva WAV.
        Retorna o caminho do arquivo final.
        """
        if not self.is_recording:
            raise RuntimeError("Not recording")

        self.is_recording = False
        self._stream.stop()
        self._stream.close()
        self._stream = None

        if self._frames:
            audio_data = np.concatenate(self._frames, axis=0)
            sf.write(self._output_path, audio_data, self.SAMPLE_RATE)

        return self._output_path

    def get_audio_level(self) -> float:
        """Nível RMS do frame mais recente — usado pelo VU meter do frontend."""
        if not self._frames:
            return 0.0
        return float(np.sqrt(np.mean(self._frames[-1] ** 2)))


audio_recorder = AudioRecorder()
