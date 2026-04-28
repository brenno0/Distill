import os
import re
import uuid
import subprocess
import numpy as np
import sounddevice as sd
import soundfile as sf
from pathlib import Path
from app.core.config import settings


class AudioRecorder:
    """
    Records mic + optional monitor source simultaneously.
    Both streams are mixed to mono at stop — Whisper receives merged audio.
    16kHz mono is Whisper's native format; whisperx resamples via ffmpeg.
    """

    CHANNELS = 1
    SAMPLERATE = 48000  # native rate for both G733 mic and monitor

    def __init__(
        self,
        input_device: int | None = None,
        monitor_source_name: str | None = None,
    ):
        self.is_recording = False
        self._input_device = input_device
        self._monitor_source = monitor_source_name
        self._mic_frames: list[np.ndarray] = []
        self._monitor_frames: list[np.ndarray] = []
        self._mic_stream: sd.InputStream | None = None
        self._monitor_stream: sd.InputStream | None = None
        self._output_path: str = ""
        self._mic_output_path: str | None = None
        self._monitor_output_path: str | None = None
        self._samplerate: int = self.SAMPLERATE

    def _mic_device_info(self) -> tuple[int, int]:
        try:
            info = sd.query_devices(self._input_device)
            max_ch = int(info.get("max_input_channels", 1))
            if max_ch < 1:
                raise RuntimeError(f"Device {self._input_device!r} has no input channels")
            return int(info["default_samplerate"]), min(self.CHANNELS, max_ch)
        except RuntimeError:
            raise
        except Exception:
            return self.SAMPLERATE, self.CHANNELS

    def _monitor_channels(self) -> int:
        """Parse channel count from pactl for the monitor source."""
        try:
            result = subprocess.run(
                ["pactl", "list", "sources", "short"],
                capture_output=True, text=True, timeout=2,
            )
            for line in result.stdout.splitlines():
                parts = line.split("\t")
                if len(parts) >= 3 and parts[1] == self._monitor_source:
                    m = re.search(r"(\d+)ch", parts[2])
                    return int(m.group(1)) if m else 2
        except Exception:
            pass
        return 2

    def start_recording(self) -> str:
        if self.is_recording:
            raise RuntimeError("Already recording")

        self.is_recording = True
        self._mic_frames = []
        self._monitor_frames = []
        self._samplerate, mic_channels = self._mic_device_info()

        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
        self._output_path = os.path.join(
            settings.temp_dir, f"meeting_{uuid.uuid4().hex[:8]}.wav"
        )
        base, ext = os.path.splitext(self._output_path)
        self._mic_output_path = f"{base}_mic{ext}"
        self._monitor_output_path = f"{base}_monitor{ext}"

        def _mic_callback(indata: np.ndarray, frames: int, time, status) -> None:
            if self.is_recording:
                self._mic_frames.append(indata.copy())

        def _monitor_callback(indata: np.ndarray, frames: int, time, status) -> None:
            if self.is_recording:
                self._monitor_frames.append(indata.copy())

        self._mic_stream = sd.InputStream(
            device=self._input_device,
            samplerate=self._samplerate,
            channels=mic_channels,
            callback=_mic_callback,
            dtype=np.float32,
        )

        if self._monitor_source:
            monitor_ch = self._monitor_channels()
            old_pulse = os.environ.get("PULSE_SOURCE")
            os.environ["PULSE_SOURCE"] = self._monitor_source
            try:
                self._monitor_stream = sd.InputStream(
                    device="pulse",
                    samplerate=self._samplerate,
                    channels=monitor_ch,
                    callback=_monitor_callback,
                    dtype=np.float32,
                )
            finally:
                if old_pulse is None:
                    os.environ.pop("PULSE_SOURCE", None)
                else:
                    os.environ["PULSE_SOURCE"] = old_pulse

        self._mic_stream.start()
        if self._monitor_stream:
            self._monitor_stream.start()

        return self._output_path

    def stop_recording(self) -> str:
        if not self.is_recording:
            raise RuntimeError("Not recording")

        self.is_recording = False

        if self._mic_stream:
            self._mic_stream.stop()
            self._mic_stream.close()
            self._mic_stream = None

        if self._monitor_stream:
            self._monitor_stream.stop()
            self._monitor_stream.close()
            self._monitor_stream = None

        if self._mic_frames:
            mic = np.concatenate(self._mic_frames, axis=0)
            mic_mono = mic.mean(axis=1, keepdims=True)
            if self._mic_output_path:
                sf.write(self._mic_output_path, mic_mono, self._samplerate)

            if self._monitor_frames:
                mon = np.concatenate(self._monitor_frames, axis=0)
                mon_mono = mon.mean(axis=1, keepdims=True)
                if self._monitor_output_path:
                    sf.write(self._monitor_output_path, mon_mono, self._samplerate)
                n = min(len(mic_mono), len(mon_mono))
                mixed = (mic_mono[:n] + mon_mono[:n]) / 2.0
            else:
                mixed = mic_mono

            sf.write(self._output_path, mixed, self._samplerate)

        return self._output_path

    def get_mic_output_path(self) -> str | None:
        if not self._mic_frames:
            return None
        return self._mic_output_path

    def get_monitor_output_path(self) -> str | None:
        if not self._monitor_frames:
            return None
        return self._monitor_output_path

    def get_mic_chunk_since(self, last_idx: int) -> tuple[np.ndarray | None, int]:
        """Returns mic frames accumulated since last_idx and the new index."""
        frames = self._mic_frames[last_idx:]
        if not frames:
            return None, last_idx
        return np.concatenate(frames, axis=0), last_idx + len(frames)

    def get_monitor_chunk_since(self, last_idx: int) -> tuple[np.ndarray | None, int]:
        """Returns monitor frames accumulated since last_idx and the new index."""
        frames = self._monitor_frames[last_idx:]
        if not frames:
            return None, last_idx
        return np.concatenate(frames, axis=0), last_idx + len(frames)

    def get_audio_level(self) -> float:
        if not self._mic_frames:
            return 0.0
        return float(np.sqrt(np.mean(self._mic_frames[-1] ** 2)))

    def get_monitor_level(self) -> float:
        if not self._monitor_frames:
            return 0.0
        return float(np.sqrt(np.mean(self._monitor_frames[-1] ** 2)))


audio_recorder = AudioRecorder()
