import requests
import json

apiKey = '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'
url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {apiKey}'
}
payload = {
    'model': 'meta/llama-3.2-90b-vision-instruct',
    'messages': [
        {'role': 'system', 'content': 'You are Sovythos.'},
        {'role': 'user', 'content': 'ازيك يا سوفيثوس'}
    ],
    'max_tokens': 100
}

try:
    r = requests.post(url, headers=headers, json=payload, timeout=15)
    print("Status:", r.status_code)
    print("Response:", r.text[:300])
except Exception as e:
    print("Error:", e)
