import pytest

from api.deps import require_user
from main import app
from services.auth import User


@pytest.fixture(autouse=True)
def signed_in_user():
    """Existing API tests exercise computation, not auth: act as a signed-in user.
    tests/api/test_auth.py removes this override to test the real gate."""
    app.dependency_overrides[require_user] = lambda: User(email="tester@cmkl.ac.th")
    yield
    app.dependency_overrides.pop(require_user, None)
