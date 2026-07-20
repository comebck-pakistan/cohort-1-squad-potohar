def test_pricing_placeholder(client):
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
    response = client.post("/pricing", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "suggested_rate_min" in data
    assert "suggested_rate_max" in data
    assert "Placeholder" in data["rationale"]
