from fastapi.testclient import TestClient
import pandas as pd
import pytest
from main import app
from sessions.store import set_session

client = TestClient(app)

@pytest.fixture
def mock_session():
    session_id = "test-session-123"
    # Create simple dataset
    df = pd.DataFrame({
        "Age": [22, 25, 30, 35, 40],
        "Salary": [50000, 60000, 75000, 90000, 110000]
    })
    set_session(session_id, df)
    return session_id

def test_compute_descriptive_api(mock_session):
    payload = {
        "session_id": mock_session,
        "column": "Age",
        "quantileProbs": [0.25, 0.5, 0.75]
    }
    
    response = client.post(
        "/api/descriptive/compute",
        json=payload,
        headers={"x-session-id": mock_session}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "rows" in data
    assert "summary" in data
    assert "histogram" in data
    assert "boxData" in data
    
    # Check summary values
    assert data["summary"]["n"] == 5
    assert data["summary"]["mean"] == 30.4
    assert data["summary"]["median"] == 30.0
    
    # Check Extremes in rows
    extremes = [r for r in data["rows"] if r["category"] == "Extremes"]
    assert len(extremes) >= 2
    
def test_compute_descriptive_missing_column(mock_session):
    payload = {
        "session_id": mock_session,
        "column": "NotFound",
    }
    response = client.post(
        "/api/descriptive/compute",
        json=payload,
        headers={"x-session-id": mock_session}
    )
    
    assert response.status_code == 400
    assert "NotFound" in response.json()["detail"]

def test_compute_descriptive_no_session():
    payload = {
        "session_id": "invalid",
        "column": "Age",
    }
    response = client.post(
        "/api/descriptive/compute",
        json=payload,
        headers={"x-session-id": "invalid"}
    )
    
    assert response.status_code == 404
