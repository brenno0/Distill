import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.services.audio_recorder import AudioRecorder


def test_start_returns_wav_path():
    recorder = AudioRecorder()
    mock_stream = MagicMock()
    with patch("sounddevice.InputStream", return_value=mock_stream):
        path = recorder.start_recording()
    assert path.endswith(".wav")
    assert "meeting_" in path


def test_cannot_start_while_recording():
    recorder = AudioRecorder()
    with patch("sounddevice.InputStream", return_value=MagicMock()):
        recorder.start_recording()
        with pytest.raises(RuntimeError, match="Already recording"):
            recorder.start_recording()


def test_cannot_stop_if_not_recording():
    recorder = AudioRecorder()
    with pytest.raises(RuntimeError, match="Not recording"):
        recorder.stop_recording()


def test_audio_level_zero_without_frames():
    recorder = AudioRecorder()
    assert recorder.get_audio_level() == 0.0
