import os

BASE_DIR = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app'
IGNORE_DIRS = {
    'node_modules', 'dist', 'android', '.git', 
    'pulse-server', 'push-server', 'scratch', 
    '.system_generated'
}

count = 0
ios_count = 0
for root, dirs, files in os.walk(BASE_DIR):
    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
    for f in files:
        count += 1
        if "ios" in root:
            ios_count += 1

print(f"Total files: {count}, in ios: {ios_count}")
