import sys
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


def _make_whisperx_mock():
    """Cria um mock completo do módulo whisperx para testes sem GPU/instalação."""
    wx = MagicMock()
    wx.load_audio.return_value = MagicMock()
    wx.load_model.return_value = MagicMock()
    wx.load_align_model.return_value = (MagicMock(), MagicMock())
    wx.align.return_value = {"segments": [{"text": "Olá mundo", "start": 0.0, "end": 2.5}]}
    wx.DiarizationPipeline.return_value = MagicMock()
    wx.assign_word_speakers.return_value = {"segments": [{"text": "Olá mundo"}]}
    return wx


@pytest.fixture(autouse=True)
def mock_whisperx():
    wx = _make_whisperx_mock()
    with patch.dict(sys.modules, {"whisperx": wx}):
        yield wx


@pytest.mark.asyncio
async def test_transcribe_returns_expected_keys(mock_whisperx):
    from app.services.whisper_processor import WhisperProcessor
    processor = WhisperProcessor()
    result = await processor.transcribe("/tmp/test.wav", "id123")

    assert result["id"] == "id123"
    assert "text" in result
    assert "language" in result
    assert "transcribed_at" in result
    assert "segments" in result


@pytest.mark.asyncio
async def test_transcribe_fires_progress_callbacks(mock_whisperx):
    from app.services.whisper_processor import WhisperProcessor
    processor = WhisperProcessor()
    events: list[str] = []

    async def cb(event: str, data: dict):
        events.append(event)

    await processor.transcribe("/tmp/test.wav", "id1", progress_callback=cb)

    assert "transcription_start" in events
    assert "transcription_complete" in events


def test_models_not_loaded_at_init():
    from app.services.whisper_processor import WhisperProcessor
    processor = WhisperProcessor()
    assert processor._model is None
    assert processor._align_model is None
    assert processor._diarize_model is None


@pytest.mark.asyncio
async def test_diarize_skipped_without_hf_token(mock_whisperx):
    from app.services.whisper_processor import WhisperProcessor
    processor = WhisperProcessor()

    with patch("app.services.whisper_processor.settings") as mock_s:
        mock_s.whisper_model = "large-v3"
        mock_s.whisper_device = "cuda"
        mock_s.whisper_compute_type = "float16"
        mock_s.whisper_batch_size = 16
        mock_s.whisper_align = False
        mock_s.whisper_diarize = True
        mock_s.hf_token = ""  # sem token → não deve diarizar

        await processor.transcribe("/tmp/test.wav", "id2")

    mock_whisperx.DiarizationPipeline.assert_not_called()
