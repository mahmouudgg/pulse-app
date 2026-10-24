import sys

with open('src/services/storageService.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'subscribeToUserReplies' in line:
        print(f"Match at line {i+1}: {line.strip()}")
        for j in range(i, min(i+45, len(lines))):
            print(f"{j+1}: {lines[j]}", end="")
        break
