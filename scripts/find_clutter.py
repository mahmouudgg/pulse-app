# -*- coding: utf-8 -*-
import os
import re

SRC_DIR = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src'

results = {
    'kicker': [],
    'animate_pulse': [],
    'animate_ping': [],
    'ai_badges': []
}

for root, dirs, files in os.walk(SRC_DIR):
    for f in files:
        if f.endswith(('.jsx', '.js', '.css')):
            path = os.path.join(root, f)
            rel = os.path.relpath(path, SRC_DIR)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
            for idx, line in enumerate(lines):
                if 'kicker' in line.lower():
                    results['kicker'].append((rel, idx + 1, line.strip()))
                if 'animate-pulse' in line:
                    results['animate_pulse'].append((rel, idx + 1, line.strip()))
                if 'animate-ping' in line:
                    results['animate_ping'].append((rel, idx + 1, line.strip()))
                if re.search(r'\b(ai-badge|isAI|badgeTitle.*SOVYTHOS|aiKicker)\b', line):
                    results['ai_badges'].append((rel, idx + 1, line.strip()))

print(f"=== KICKER MATCHES ({len(results['kicker'])}) ===")
for r in results['kicker'][:25]:
    print(f"{r[0]}:{r[1]} -> {r[2][:100]}")

print(f"\n=== ANIMATE-PULSE MATCHES ({len(results['animate_pulse'])}) ===")
for r in results['animate_pulse'][:25]:
    print(f"{r[0]}:{r[1]} -> {r[2][:100]}")

print(f"\n=== ANIMATE-PING MATCHES ({len(results['animate_ping'])}) ===")
for r in results['animate_ping'][:25]:
    print(f"{r[0]}:{r[1]} -> {r[2][:100]}")

print(f"\n=== AI BADGE MATCHES ({len(results['ai_badges'])}) ===")
for r in results['ai_badges'][:25]:
    print(f"{r[0]}:{r[1]} -> {r[2][:100]}")
