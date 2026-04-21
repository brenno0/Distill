import pytest
from unittest.mock import patch, MagicMock
from app.services.youtube_processor import YouTubeProcessor


def test_validate_url_accepts_youtube_formats():
    p = YouTubeProcessor()
    assert p.validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert p.validate_url("https://youtu.be/dQw4w9WgXcQ") is True


def test_validate_url_rejects_non_youtube():
    p = YouTubeProcessor()
    assert p.validate_url("https://vimeo.com/123") is False
    assert p.validate_url("not-a-url") is False


@pytest.mark.asyncio
async def test_extract_audio_raises_on_invalid_url():
    p = YouTubeProcessor()
    with pytest.raises(ValueError, match="Invalid YouTube URL"):
        await p.extract_audio("https://vimeo.com/123")


@pytest.mark.asyncio
async def test_extract_audio_raises_on_ytdlp_failure():
    p = YouTubeProcessor()
    mock_result = MagicMock(returncode=1, stderr="Video unavailable")
    with patch("subprocess.run", return_value=mock_result):
        with pytest.raises(RuntimeError, match="yt-dlp failed"):
            await p.extract_audio("https://www.youtube.com/watch?v=test")
