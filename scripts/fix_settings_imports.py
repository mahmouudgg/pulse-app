import os

file_path = os.path.join('src', 'pages', 'SettingsPage.jsx')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add Film, Languages, Compass to lucide-react imports if missing
old_import = "import {\n  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Shield, ShieldCheck, Key,"
if old_import not in c:
    old_import = "import {\r\n  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Shield, ShieldCheck, Key,"

new_import = "import {\n  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Shield, ShieldCheck, Key, Film, Languages, Compass,"
if '\r\n' in old_import:
    new_import = "import {\r\n  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Shield, ShieldCheck, Key, Film, Languages, Compass,"

assert old_import in c, 'old_import not found in SettingsPage.jsx'
c = c.replace(old_import, new_import, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully added Film, Languages, Compass to SettingsPage.jsx imports')
