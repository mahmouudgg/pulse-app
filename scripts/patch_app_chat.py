import os

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = "onBlockUser={handleBlockUser}\n\n          />"
replacement = "onBlockUser={handleBlockUser}\n\n            onOpenVerification={() => setCurrentScreen('verification')}\n\n          />"

if target in text:
    text = text.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: App.jsx patched with onOpenVerification")
else:
    print("ERROR: target not found in App.jsx")
