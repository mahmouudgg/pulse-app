import sys
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

with open(r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\components\PostCard.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(350, min(650, len(lines))):
    line = lines[i]
    if any(k in line.lower() for k in ['badge', 'sovythos', 'sparkle', 'ai', 'kicker', 'pulse', 'dot', 'ping', 'tag']):
        print(f"{i+1}: {line.strip()}", flush=True)
