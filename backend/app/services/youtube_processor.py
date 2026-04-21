import subprocess
import uuid
import os
import re
from pathlib import Path
from typing import Callable, Optional, Awaitable
from app.core.config import settings


class YouTubeProcessor:
    """
    Extrai áudio de vídeos YouTube via yt-dlp subprocess (doc §3.6).
    yt-dlp é chamado como processo externo pois a API Python não é estável.
    O postprocessor converte para WAV 16kHz mono na mesma chamada,
    formato direto para o Whisper sem processamento adicional.
    """

    _YT_PATTERN = re.compile(
        r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w\-]+"
    )

    def validate_url(self, url: str) -> bool:
        return bool(self._YT_PATTERN.match(url))

    async def extract_audio(
        self,
        url: str,
        progress_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None,
    ) -> dict:
        """
        Extrai áudio e retorna dict com audio_path, title e transcription_id.
        transcription_id é gerado aqui para rastrear toda a cadeia de processamento.
        """
        if not self.validate_url(url):
            raise ValueError(f"Invalid YouTube URL: {url}")

        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
        uid = uuid.uuid4().hex[:8]
        template = os.path.join(settings.temp_dir, f"youtube_{uid}.%(ext)s")
        output_wav = os.path.join(settings.temp_dir, f"youtube_{uid}.wav")

        if progress_callback:
            await progress_callback("youtube_download_start", {"url": url, "progress": 0})

        result = subprocess.run(
            [
                "yt-dlp",
                "--extract-audio",
                "--audio-format", "wav",
                "--audio-quality", "0",
                "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
                "--output", template,
                "--no-playlist",
                url,
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {result.stderr}")

        if progress_callback:
            await progress_callback(
                "youtube_download_complete", {"progress": 100, "path": output_wav}
            )

        title_result = subprocess.run(
            ["yt-dlp", "--get-title", "--no-playlist", url],
            capture_output=True,
            text=True,
        )
        title = title_result.stdout.strip() or f"YouTube Video {uid}"

        return {
            "audio_path": output_wav,
            "title": title,
            "url": url,
            "transcription_id": uid,
        }


youtube_processor = YouTubeProcessor()
