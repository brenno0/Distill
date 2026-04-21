import chromadb
from typing import Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from app.core.config import settings


class KnowledgeBaseManager:
    """
    Armazenamento e recuperação semântica de transcrições via ChromaDB (doc §3.7).
    OllamaEmbeddings usa nomic-embed-text local — sem dependência de API externa.
    A filtragem por transcription_id é o mecanismo do RAG contextualizado (doc §3.5):
    permite responder sobre uma gravação específica sem misturar contexto de outras.
    chunk_size=1000 / overlap=200: balanceia contexto preservado vs. tamanho de embedding.
    """

    def __init__(self):
        self._client: chromadb.PersistentClient | None = None
        self._collection: chromadb.Collection | None = None
        self._embeddings: OllamaEmbeddings | None = None
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _get_collection(self) -> chromadb.Collection:
        if self._client is None:
            self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
            self._collection = self._client.get_or_create_collection(
                name="transcriptions",
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def _get_embeddings(self) -> OllamaEmbeddings:
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                model="nomic-embed-text",
                base_url=settings.ollama_base_url,
            )
        return self._embeddings

    async def ingest_transcription(
        self, transcription_id: str, text: str, metadata: dict
    ) -> int:
        """
        Divide transcrição em chunks, gera embeddings e persiste no ChromaDB.
        O transcription_id nos metadados de cada chunk é o que permite filtragem posterior.
        """
        collection = self._get_collection()
        embedder = self._get_embeddings()
        chunks = self._splitter.split_text(text)

        ids = [f"{transcription_id}_c{i}" for i in range(len(chunks))]
        metas = [
            {**metadata, "transcription_id": transcription_id, "chunk_index": i}
            for i in range(len(chunks))
        ]
        embeddings = await embedder.aembed_documents(chunks)
        collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metas)
        return len(chunks)

    async def query(
        self,
        query_text: str,
        transcription_id: Optional[str] = None,
        n_results: int = 5,
    ) -> list[dict]:
        """
        Busca por similaridade de cosseno.
        where=None retorna resultado global; where={"transcription_id": id} filtra por sessão.
        """
        collection = self._get_collection()
        embedder = self._get_embeddings()
        query_embedding = await embedder.aembed_query(query_text)

        where = {"transcription_id": transcription_id} if transcription_id else None
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        return [
            {
                "text": doc,
                "metadata": meta,
                "score": round(1 - dist, 4),
            }
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]

    def delete_transcription(self, transcription_id: str) -> int:
        """Remove todos os chunks de uma transcrição do ChromaDB."""
        collection = self._get_collection()
        existing = collection.get(where={"transcription_id": transcription_id})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
        return len(existing["ids"])


kb_manager = KnowledgeBaseManager()
