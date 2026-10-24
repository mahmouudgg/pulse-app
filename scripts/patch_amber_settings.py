FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\SettingsPage.jsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

count = content.count('border-amber-400 text-amber-400')
print(f"Occurrences found: {count}")

if count > 0:
    content = content.replace('border-amber-400 text-amber-400', 'border-neutral-400 text-neutral-400')
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced all occurrences with border-neutral-400 text-neutral-400")
