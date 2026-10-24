import urllib.request
import json

url = 'https://sahra-f4ec6-default-rtdb.firebaseio.com/users.json?orderBy="username"&equalTo="sovythos"'
with urllib.request.urlopen(url, timeout=10) as resp:
    data = json.loads(resp.read().decode("utf-8"))
    print("Direct indexed query result for 'sovythos':", list(data.keys()))

url_empty = 'https://sahra-f4ec6-default-rtdb.firebaseio.com/users.json?orderBy="username"&equalTo="non_existent_user_999"'
with urllib.request.urlopen(url_empty, timeout=10) as resp:
    data2 = json.loads(resp.read().decode("utf-8"))
    print("Direct indexed query result for non-existent:", data2)
