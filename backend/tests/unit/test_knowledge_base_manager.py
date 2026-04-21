import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.knowledge_base_manager import KnowledgeBaseManager


@pytest.mark.asyncio
async def test_ingest_returns_positive_chunk_count():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.add = MagicMock()
    mock_emb = MagicMock()
    mock_emb.aembed_documents = AsyncMock(return_value=[[0.1] * 768] * 3)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            count = await mgr.ingest_transcription(
                "t1", "texto longo. " * 200, {"type": "meeting"}
            )

    assert count > 0
    assert mock_col.add.called


@pytest.mark.asyncio
async def test_query_filters_by_transcription_id():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.query.return_value = {
        "documents": [["trecho relevante"]],
        "metadatas": [[{"transcription_id": "t1"}]],
        "distances": [[0.15]],
    }
    mock_emb = MagicMock()
    mock_emb.aembed_query = AsyncMock(return_value=[0.1] * 768)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            results = await mgr.query("pergunta", transcription_id="t1")

    where_arg = mock_col.query.call_args[1]["where"]
    assert where_arg == {"transcription_id": "t1"}
    assert results[0]["text"] == "trecho relevante"
    assert results[0]["score"] == pytest.approx(0.85, abs=0.01)


@pytest.mark.asyncio
async def test_query_without_filter_passes_none():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.query.return_value = {
        "documents": [[]], "metadatas": [[]], "distances": [[]]
    }
    mock_emb = MagicMock()
    mock_emb.aembed_query = AsyncMock(return_value=[0.1] * 768)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            await mgr.query("busca global")

    where_arg = mock_col.query.call_args[1]["where"]
    assert where_arg is None
