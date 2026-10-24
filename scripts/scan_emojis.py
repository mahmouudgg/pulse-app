# -*- coding: utf-8 -*-
import re

files_to_check = [
    r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\CommunityStandardsPage.jsx',
    r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\AccountAppealPage.jsx',
    r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\ProfilePage.jsx',
    r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js'
]

# Emoji regex matching standard unicode emoji ranges
emoji_pattern = re.compile(
    r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]|[\u203c-\u2049]'
)

total_emojis = 0
for fpath in files_to_check:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()
    matches = emoji_pattern.findall(text)
    if matches:
        print(f"Found {len(matches)} emojis in {fpath}: {matches[:10]}")
        total_emojis += len(matches)
    else:
        print(f"Clean (0 emojis): {fpath}")

print(f"Total emojis detected: {total_emojis}")
