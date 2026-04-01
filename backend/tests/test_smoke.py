"""Smoke test — verifies backend imports resolve correctly."""

def test_imports():
    from services.descriptive import calculate_descriptive
    from api.schemas.descriptive import DescriptiveRequest, DescriptiveResponse
    from sessions.store import get_session, clean_expired_sessions
    assert callable(calculate_descriptive)
    assert callable(get_session)
    assert callable(clean_expired_sessions)
