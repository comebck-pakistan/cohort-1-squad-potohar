def test_proposal_placeholder(client):
    payload = {
        "jobData": {
            "sourcePlatform": "upwork",
            "rawDescription": "Need a dev",
            "paymentVerified": "yes",
            "budgetType": "hourly",
            "offPlatformFlag": False,
            "unpaidTestFlag": False,
            "extractionMethod": "auto_scrape"
        },
        "freelancerProfile": {
            "name": "Alice",
            "skills": ["React"],
            "yearsExp": 3,
            "portfolioUrls": [],
            "bio": "I code"
        },
        "decision": {
            "score": 80,
            "decision": "Apply",
            "reason": "Good match"
        }
    }
    response = client.post("/proposal", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "draft_text" in data
    assert "Placeholder" in data["draft_text"]
