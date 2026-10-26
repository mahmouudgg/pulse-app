import os
import re

src_dir = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src"
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.js') or f.endswith('.jsx'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                t = fp.read()
                matches = re.findall(r'(?:api[_-]?key|apiKey|baseUrl|integrate\.api|groq|openrouter|gemini|openai)[\'\"\s:=]+([^\s\'\"]+)', t, re.IGNORECASE)
                if matches:
                    print(f"{f}: {matches}")
