import requests

urls = [
    "http://localhost:8080/Pulse-v1.0.apk",
    "http://localhost:8080/Pulse-v1.0.ipa"
]

for u in urls:
    try:
        r = requests.head(u, timeout=5)
        print(f"{u} -> HTTP {r.status_code}, Length: {r.headers.get('Content-Length')}")
    except Exception as e:
        print(f"{u} -> Error: {e}")
