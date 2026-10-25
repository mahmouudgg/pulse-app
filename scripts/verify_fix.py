import os

with open(r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\SettingsPage.jsx", "r", encoding="utf-8") as f:
    text_settings = f.read()

print("SettingsPage checks:")
print("  'initialSubView = null' in props:", "initialSubView = null" in text_settings)
print("  'useState(() => initialSubView || null)' in text:", "useState(() => initialSubView || null)" in text_settings)
print("  'initialSubView' count:", text_settings.count("initialSubView"))

with open(r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\App.jsx", "r", encoding="utf-8") as f:
    text_app = f.read()

print("\nApp.jsx checks:")
print("  'settingsInitialSubView' count:", text_app.count("settingsInitialSubView"))
print("  'initialSubView={settingsInitialSubView}' in text:", "initialSubView={settingsInitialSubView}" in text_app)
