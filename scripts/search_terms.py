import os

SRC_DIR = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src'

results = []
for root, dirs, files in os.walk(SRC_DIR):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            rel = os.path.relpath(path, SRC_DIR)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                for idx, line in enumerate(fp):
                    ll = line.lower()
                    for term in ['sticker', 'ticker', 'kicker', 'sovythos', 'sparkle']:
                        if term in ll:
                            results.append(f"{rel}:{idx+1} [{term}] -> {line.strip()[:100]}\n")

with open(r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts\terms_found.txt', 'w', encoding='utf-8') as out:
    out.writelines(results)

print(f"Total results: {len(results)}")
