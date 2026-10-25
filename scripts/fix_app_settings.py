import os

file_path = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

target = "onBack={() => setCurrentScreen(null)}"
idx = text.find("currentScreen === 'settings'")
if idx != -1:
    target_idx = text.find(target, idx)
    if target_idx != -1 and target_idx - idx < 200:
        replacement = """onBack={() => {
              setCurrentScreen(null);
              setSettingsInitialSubView(null);
            }}
            initialSubView={settingsInitialSubView}"""
        text = text[:target_idx] + replacement + text[target_idx + len(target):]
        print("Updated SettingsPage in App.jsx!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("App.jsx fixed!")
