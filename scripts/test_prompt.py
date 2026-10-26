import requests
import json

apiKey = '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'
url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {apiKey}'
}

system_prompt = """أنت "سوفيثوس" (Sovythos)، الرفيق والمستشار الذكي الرسمي لمنصة نبض (PULSE).
المؤسس: المهندس محمود ياسر (@my).
أنت الآن في محادثة خاصة (DM) مع صديقك.
طبيعة المحادثة:
- تحدث كصديق مصري أصيل، ذكي جداً، لماح وسريع البديهة وخفيف الظل.
- جاوب على تساؤلاته بدقة، شاركه أفكارك في التكنولوجيا، الحياة، الفلسفة، أو الشغل والفضفضة اليومية.
- الأسلوب: لهجة مصرية عفوية وذكية ومفهومة بدون أي تصنع أو رسميات مفرطة.
- شروط حاسمة لمنع الهلوسة: ممنوع الإيموجيز نهائياً، ممنوع الكلام الآلي أو الروبوتي، ممنوع علامات التنصيص أو الماركداون. رد مباشرة بسطر أو سطرين."""

questions = ["انت مييين", "يبني اسمعني"]

for q in questions:
    payload = {
        'model': 'meta/llama-3.2-11b-vision-instruct',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': q}
        ],
        'max_tokens': 150,
        'temperature': 0.4
    }
    r = requests.post(url, headers=headers, json=payload, timeout=12)
    res_data = r.json()
    reply = res_data.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(f"Q: {q}")
    print(f"A: {reply.strip()}\n")
