from fastapi.testclient import TestClient

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
