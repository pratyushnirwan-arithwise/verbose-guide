import os
import json
from app import app

client = app.test_client()

def test_routing():
    # 1. Test root route serves index.html
    res = client.get("/")
    assert res.status_code == 200, f"Root route expected 200, got {res.status_code}"
    assert b"<!DOCTYPE html>" in res.data or b"html" in res.data.lower(), "Should return index.html content"

    # 2. Test SPA subpath routing fallback to index.html
    res = client.get("/dashboard")
    assert res.status_code == 200, f"Subpath route expected 200, got {res.status_code}"
    assert b"<!DOCTYPE html>" in res.data or b"html" in res.data.lower(), "Should fallback to index.html content"

    # 3. Test static file serving
    res = client.get("/Logo_PNG_1.png")
    assert res.status_code == 200, f"Static file route expected 200, got {res.status_code}"

    # 4. Test non-existent API route returns 404 JSON instead of HTML
    res = client.get("/api/nonexistent")
    assert res.status_code == 404, f"Expected API 404, got {res.status_code}"
    data = json.loads(res.data)
    assert data.get("success") is False, "Expected JSON response with success: False"

    print("All routing checks passed successfully!")

if __name__ == "__main__":
    test_routing()
