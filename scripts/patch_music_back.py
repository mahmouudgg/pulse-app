with open('src/App.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_target = """        ) : currentScreen === 'music' ? (
          <MusicPage
            currentUser={currentUser}
            onBack={() => setCurrentScreen(previousScreen || null)}
            onSelectMusicForCompose={(track) => {
              setComposeInitialMusic(track);
              setCurrentScreen(null);
              setIsComposeOpen(true);
            }}
          />"""

new_target = """        ) : currentScreen === 'music' ? (
          <MusicPage
            currentUser={currentUser}
            onBack={() => {
              soundService.stopPreview();
              setCurrentScreen(previousScreen || null);
            }}
            onSelectMusicForCompose={(track) => {
              soundService.stopPreview();
              setComposeInitialMusic(track);
              setCurrentScreen(null);
              setIsComposeOpen(true);
            }}
          />"""

if old_target in c:
    c = c.replace(old_target, new_target)
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Successfully patched App.jsx music onBack")
else:
    print("Music target pattern not found in App.jsx")
