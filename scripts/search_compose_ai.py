with open(r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\components\ComposeModal.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'.{0,40}(?:sovythos|sparkles|ai\b|kicker|ذكاء).{0,40}', text, re.IGNORECASE)
for m in matches[:30]:
    print(m.strip())
print(f"Total: {len(matches)}")
