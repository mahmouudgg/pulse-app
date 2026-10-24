import requests

url = "https://sahra-f4ec6-default-rtdb.firebaseio.com/posts.json"
params = {
    "orderBy": '"authorId"',
    "equalTo": '"dev_mahmoud_yasser"'
}
res = requests.get(url, params=params, timeout=7)
print("Status:", res.status_code)
if res.status_code == 200:
    data = res.json() or {}
    print("Matching posts count:", len(data))
    print("Payload size in bytes:", len(res.content))
else:
    print("Response:", res.text[:200])
