import gc
from datetime import datetime, UTC
from typing import Callable, Optional, Awaitable, Any
from app.core.config import settings


class WhisperProcessor:
    """
    Encapsula o WhisperX rodando na GPU via CUDA (doc §3.2).
    WhisperX oferece: batching (~3-5x mais rápido), timestamps word-level
    e diarização de speakers opcional (quem falou o quê).

    Carregamento lazy: modelo (~6GB VRAM) só carrega na primeira transcrição.
    Align e diarize models também são cacheados após o primeiro uso.
    Import lazy de whisperx evita falha de importação quando não instalado
    (requer torch+CUDA — instalação manual separada do Poetry).
    """

    def __init__(self):
        self._model: Any | None = None
        self._align_model: Any | None = None
        self._align_metadata: Any | None = None
        self._align_language: str | None = None
        self._diarize_model: Any | None = None

    def _load_model(self) -> Any:
        if self._model is None:
            gc.collect()
            if settings.whisper_device == "cuda":
                import torch
                torch.cuda.empty_cache()
            import whisperx
            self._model = whisperx.load_model(
                settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
        return self._model

    def _load_align_model(self, language: str) -> tuple[Any, Any]:
        """Cacheia o align model por idioma — recarrega se o idioma mudar."""
        if self._align_model is None or self._align_language != language:
            import whisperx
            self._align_model, self._align_metadata = whisperx.load_align_model(
                language_code=language,
                device=settings.whisper_device,
            )
            self._align_language = language
        return self._align_model, self._align_metadata

    def _load_diarize_model(self) -> Any:
        if self._diarize_model is None:
            import whisperx
            self._diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=settings.hf_token,
                device=settings.whisper_device,
            )
        return self._diarize_model

    async def transcribe(
        self,
        audio_path: str,
        transcription_id: str,
        progress_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None,
    ) -> dict:
        """
        Pipeline WhisperX completo:
        1. Transcrição com batching (batch_size=16 por padrão)
        2. Alignment para timestamps word-level (se whisper_align=True)
        3. Diarização de speakers (se whisper_diarize=True + hf_token configurado)

        Retorna segmentos enriquecidos com timestamps e speakers quando disponível.
        """
        import whisperx

        model = self._load_model()

        if progress_callback:
            await progress_callback(
                "transcription_start",
                {"id": transcription_id, "progress": 0},
            )

        audio = whisperx.load_audio(audio_path)
        result = model.transcribe(audio, batch_size=settings.whisper_batch_size)
        del model  # release CUDA ref before align/diarize/unload
        language = result.get("language", "pt")

        if progress_callback:
            await progress_callback(
                "transcription_progress",
                {"id": transcription_id, "progress": 0.5, "language": language},
            )

        # Alignment: timestamps precisos no nível de palavra
        if settings.whisper_align:
            align_model, align_metadata = self._load_align_model(language)
            result = whisperx.align(
                result["segments"],
                align_model,
                align_metadata,
                audio,
                settings.whisper_device,
                return_char_alignments=False,
            )
            del align_model, align_metadata

        # Diarização: identifica quem falou cada segmento
        if settings.whisper_diarize and settings.hf_token:
            diarize_model = self._load_diarize_model()
            diarize_segments = diarize_model(audio)
            result = whisperx.assign_word_speakers(diarize_segments, result)
            del diarize_model

        segments = result.get("segments", [])
        full_text = " ".join(s.get("text", "").strip() for s in segments)

        if progress_callback:
            await progress_callback(
                "transcription_complete",
                {
                    "id": transcription_id,
                    "progress": 100,
                    "preview": full_text[:200],
                },
            )

        result_data = {
            "id": transcription_id,
            "text": full_text,
            "segments": segments,
            "language": language,
            "transcribed_at": datetime.now(UTC).isoformat(),
        }

        self.unload()

        return result_data

    def unload(self) -> None:
        del self._model, self._align_model, self._align_metadata, self._diarize_model
        self._model = None
        self._align_model = None
        self._align_metadata = None
        self._align_language = None
        self._diarize_model = None
        gc.collect()
        if settings.whisper_device == "cuda":
            import torch
            torch.cuda.empty_cache()


whisper_processor = WhisperProcessor()
