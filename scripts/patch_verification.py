import os

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = "requestVerification(userId, notes = '') {"
replacement = "requestVerification(userId, notes = '', plan = 'monthly') {"

if target in text:
    text = text.replace(target, replacement, 1)
    
    # Also save plan
    note_target = "notes,\n\n          requestedAt:"
    note_replace = "notes,\n\n          plan,\n\n          requestedAt:"
    if note_target in text:
        text = text.replace(note_target, note_replace, 1)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: storageService patched for plan")
else:
    print("ERROR: target not found")
