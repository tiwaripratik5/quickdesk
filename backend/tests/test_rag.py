import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import _get_vector_store, generate_draft_reply


def test_knowledge_base_loading():
    store = _get_vector_store()
    assert store is not None
    # Must have loaded chunks from 7 markdown files
    assert len(store.chunks) > 5

    # Test retrieval for VPN query
    results = store.similarity_search("GlobalProtect VPN connection failed", k=2)
    assert len(results) > 0
    # Must cite vpn_setup.md
    sources = [r["source"] for r in results]
    assert any("vpn" in s.lower() for s in sources)


@pytest.mark.asyncio
async def test_rag_generation_with_citations():
    draft, citations = await generate_draft_reply(
        ticket_title="VPN connection failed",
        ticket_description="My GlobalProtect VPN is stuck on connecting to server.",
    )

    assert isinstance(draft, str)
    assert len(draft) > 30
    assert isinstance(citations, list)
    # Must contain citations from knowledge base
    assert len(citations) > 0
    assert any("vpn" in c.lower() for c in citations)
