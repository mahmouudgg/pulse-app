import requests
import time

apiKey = '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'
url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {apiKey}'
}

models_to_test = [
    'meta/llama-3.1-8b-instruct',
    'meta/llama-3.2-3b-instruct',
    'mistralai/mistral-7b-instruct-v0.3',
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-3.2-90b-vision-instruct'
]

for m in models_to_test:
    t0 = time.time()
    payload = {
        'model': m,
        'messages': [{'role': 'user', 'content': 'ازيك يا سوفيثوس'}],
        'max_tokens': 30
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=8)
        dur = time.time() - t0
        print(f"Model {m}: Status {r.status_code} in {dur:.2f}s -> {r.text[:120]}")
    except Exception as e:
        dur = time.time() - t0
        print(f"Model {m}: Failed in {dur:.2f}s -> {e}")
