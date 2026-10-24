with open('src/App.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_target = """        if (s.currentScreen) {
          setCurrentScreen(null);
          return;
        }"""

new_target = """        if (s.currentScreen) {
          if (s.currentScreen === 'music') {
            soundService.stopPreview();
          }
          setCurrentScreen(null);
          return;
        }"""

if old_target in c:
    c = c.replace(old_target, new_target)
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Successfully patched App.jsx")
else:
    print("Pattern not found in App.jsx")
