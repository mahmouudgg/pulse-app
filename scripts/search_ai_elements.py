import os
import re

SRC_DIR = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src'

matches = []
for root, dirs, files in os.walk(SRC_DIR):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            rel = os.path.relpath(path, SRC_DIR)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp):
                    if any(w in line.lower() for w in ['sovythos', 'kicker', 'ai assistant', 'ذكاء اصطناعي', 'ai generated', 'aisummary']):
                        matches.append((rel, idx+1, line.strip()))

for m in matches[:60]:
    print(f"{m[0]}:{m[1]} -> {m[2][:120]}")
print(f"Total: {len(matches)}")
