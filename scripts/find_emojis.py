import re

with open('src/pages/SettingsPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]')

with open('scripts/emojis_found.txt', 'w', encoding='utf-8') as out:
    for idx, line in enumerate(lines):
        matches = emoji_pattern.findall(line)
        if matches:
            out.write(f"Line {idx+1}: {matches} in: {line.strip()[:80]}\n")

print("Done scanning, results in scripts/emojis_found.txt")
