import logging
import math
import os
import re
from pathlib import Path
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_DIR = Path(__file__).parent.parent / "knowledge_base"


class SimpleVectorStore:
    def __init__(self):
        self.chunks: List[Dict[str, str]] = []

    def add_document(self, text: str, source: str):
        # Chunk text every 400 characters with 50 overlap
        stride = 350
        for i in range(0, max(1, len(text)), stride):
            chunk = text[i : i + 450].strip()
            if chunk:
                self.chunks.append({"text": chunk, "source": source})

    def _tokenize(self, text: str) -> set:
        return set(re.findall(r"\w+", text.lower()))

    def similarity_search(self, query: str, k: int = 3) -> List[Dict[str, str]]:
        if not self.chunks:
            return []

        q_tokens = self._tokenize(query)
        if not q_tokens:
            return self.chunks[:k]

        scored = []
        for item in self.chunks:
            doc_tokens = self._tokenize(item["text"])
            intersection = q_tokens.intersection(doc_tokens)
            score = len(intersection) / (math.sqrt(len(q_tokens) * len(doc_tokens)) + 1e-5)
            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        # Return only items with positive score, or fallback to top items
        top = [item for score, item in scored[:k] if score > 0.05]
        return top if top else [scored[0][1]] if scored and scored[0][0] > 0 else []


_vector_store: SimpleVectorStore = None
_initialized = False


def _get_vector_store():
    global _vector_store, _initialized
    if not _initialized:
        _initialized = True
        try:
            store = SimpleVectorStore()
            md_files = list(KNOWLEDGE_BASE_DIR.glob("*.md"))
            if not md_files:
                logger.warning("No markdown files found in knowledge base directory")
                return None

            for md_file in md_files:
                try:
                    content = md_file.read_text(encoding="utf-8")
                    store.add_document(content, md_file.name)
                except Exception as e:
                    logger.error(f"Error loading {md_file}: {e}")

            _vector_store = store
            logger.info(f"RAG knowledge base loaded: {len(store.chunks)} chunks from {len(md_files)} files")
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            _vector_store = None
    return _vector_store


async def generate_draft_reply(ticket_title: str, ticket_description: str) -> Tuple[str, List[str]]:
    """Generate an AI draft reply using RAG over the knowledge base."""
    try:
        from groq import AsyncGroq
        from app.config import get_settings

        settings = get_settings()
        vector_store = _get_vector_store()

        if vector_store is None:
            return (
                "I don't have specific information about this in our knowledge base. "
                "Please consult with the IT team directly.",
                [],
            )

        query = f"{ticket_title}\n{ticket_description}"
        docs = vector_store.similarity_search(query, k=3)

        if not docs:
            return (
                "I don't have specific information about this in our knowledge base. "
                "Please consult with the IT team directly.",
                [],
            )

        context_parts = []
        citations = []
        for doc in docs:
            source = doc.get("source", "unknown")
            context_parts.append(f"[From {source}]:\n{doc['text']}")
            if source not in citations:
                citations.append(source)

        context = "\n\n".join(context_parts)

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        prompt = f"""You are a helpful IT helpdesk agent. Use the following knowledge base articles to draft a professional reply to the support ticket below.

Knowledge Base Context:
{context}

Support Ticket:
Title: {ticket_title}
Description: {ticket_description}

Write a clear, professional, and helpful reply to this ticket. Address the user's specific issue. 
If the context doesn't fully address the issue, mention that you'll escalate if needed.
Keep the response concise (2-4 paragraphs max)."""

        response = await client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        draft = response.choices[0].message.content.strip()
        return draft, citations

    except Exception as e:
        logger.error(f"RAG service error: {e}")
        return (
            "I don't have specific information about this in our knowledge base. "
            "Please consult with the IT team directly.",
            [],
        )


def initialize_rag():
    """Pre-initialize the RAG index (call at startup)."""
    _get_vector_store()
