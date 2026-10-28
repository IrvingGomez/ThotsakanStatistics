import pytest
from fastapi.testclient import TestClient

from api.routes.data import MB
from config import Settings, get_settings
from main import app
from sessions.store import get_session

client = TestClient(app)


def upload(csv: str):
    response = client.post("/api/data/upload", files={"file": ("data.csv", csv.encode(), "text/csv")})
    assert response.status_code == 200, response.text
    return response.json()


def test_a_mostly_numeric_column_is_numeric_and_its_other_cells_are_missing():
    # The Data tab lists a column as numeric when at least 80 % of its cells are numbers; the server
    # must agree, or every analysis of that column fails on the text cells.
    body = upload("x,g\n" + "".join(f"{i},a\n" for i in range(1, 10)) + "?,b\n")
    assert body["numeric_columns"] == ["x"]
    assert get_session(body["session_id"])["x"].isna().sum() == 1


def test_a_mostly_text_column_stays_categorical():
    body = upload("x,g\n1,a\n2,b\nlow,c\nhigh,d\n")
    assert body["categorical_columns"] == ["x", "g"]
    assert get_session(body["session_id"])["x"].tolist() == ["1", "2", "low", "high"]


@pytest.fixture
def limits():
    """Run uploads with demo-style limits: 1 MB per file, datasets capped at `memory_mb` in total."""
    def apply(memory_mb: int = 0):
        settings = Settings(auth_disabled=True, google_client_id="", allowed_domain="cmkl.ac.th",
                            secret_key="", session_hours=12, cookie_secure=False,
                            demo_mode=True, max_upload_mb=1, session_memory_mb=memory_mb)
        app.dependency_overrides[get_settings] = lambda: settings
    yield apply
    app.dependency_overrides.pop(get_settings, None)


def test_a_file_over_the_upload_limit_is_refused(limits):
    limits()
    big = "x\n" + "1234567\n" * (MB // 8 + 1)
    response = client.post("/api/data/upload", files={"file": ("big.csv", big.encode(), "text/csv")})
    assert response.status_code == 413
    assert "1 MB" in response.json()["detail"]


def test_the_oldest_datasets_make_room_when_memory_is_full(limits):
    limits(memory_mb=1)
    rows = "x\n" + "".join(f"{i}\n" for i in range(50_000))  # about 0.4 MB in memory
    first, second, third = (upload(rows)["session_id"] for _ in range(3))
    assert get_session(first) is None
    assert get_session(second) is not None and get_session(third) is not None
