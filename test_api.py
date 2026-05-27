import requests

login_res = requests.post("http://localhost:8000/api/login", json={"email": "test@test.com", "password": "password"})
if login_res.status_code != 200:
    requests.post("http://localhost:8000/api/signup", json={"email": "test@test.com", "password": "password", "nickname": "TestUser"})
    login_res = requests.post("http://localhost:8000/api/login", json={"email": "test@test.com", "password": "password"})

if "access_token" not in login_res.json():
    print("Login failed:", login_res.json())
else:
    token = login_res.json()["access_token"]
    res = requests.post("http://localhost:8000/api/boards", headers={"Authorization": f"Bearer {token}"}, json={"title": "Test", "content": "Test"})
    print("Status:", res.status_code)
    print("Response:", res.json())
