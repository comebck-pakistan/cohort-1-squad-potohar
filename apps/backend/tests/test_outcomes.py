def test_outcomes_endpoint(client):
    response = client.post("/outcomes", json={"job_id": "test_id", "outcome": "Hired"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recorded"
    assert data["outcome"] == "Hired"
