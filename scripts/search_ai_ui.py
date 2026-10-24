import os

SRC_DIR = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src'

matches = []
for root, dirs, files in os.walk(SRC_DIR):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            rel = os.path.relpath(path, SRC_DIR)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp):
                    l_lower = line.lower()
                    if 'sovythos' in l_lower or 'ai' in l_lower or 'kicker' in l_lower:
                        # Only UI strings or JSX elements
                        if any(tag in line for tag in ['<', 'title', 'label', 'placeholder', 'Badge', 'Sovythos', 'Kicker']):
                            matches.append((rel, idx+1, line.strip()))

with open(r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts\ai_ui_matches.txt', 'w', encoding='utf-8') as out:
    for m in matches:
        out.write(f"{m[0]}:{m[1]} -> {m[2]}\n")

print(f"Written {len(matches)} matches to scripts/ai_ui_matches.txt")
