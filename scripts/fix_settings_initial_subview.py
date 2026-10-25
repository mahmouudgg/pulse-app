import os

file_path = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\SettingsPage.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Fix props destructuring: add initialSubView = null
# Look for onUpdateFound and the following closing paren
target_props = "onUpdateFound"
idx = text.find(target_props)
if idx != -1:
    close_brace_idx = text.find("}) {", idx)
    if close_brace_idx != -1:
        # Check if initialSubView is already in between
        if "initialSubView" not in text[idx:close_brace_idx]:
            text = text[:close_brace_idx] + ",\n  initialSubView = null\n" + text[close_brace_idx:]
            print("Added initialSubView = null to SettingsPage props.")

# 2. Fix activeSubView initialization
if "const [activeSubView, setActiveSubView] = useState(null);" in text:
    text = text.replace(
        "const [activeSubView, setActiveSubView] = useState(null);",
        "const [activeSubView, setActiveSubView] = useState(() => initialSubView || null);"
    )
    print("Updated activeSubView initialization.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("SettingsPage.jsx fixed!")
