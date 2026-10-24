path = r'src/services/storageService.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

old_find = '''    // 2. Check live Firebase Realtime Database
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val && typeof val === 'object') {
        for (const [uid, u] of Object.entries(val)) {
          if (u && typeof u === 'object' && u.email && u.email.trim().toLowerCase() === clean) {
            const normalized = {
              ...u,
              uid: u.uid || uid,
              displayName: u.displayName || u.name || u.username,
              avatar: u.avatar || DEFAULT_AVATAR
            };
            this.saveUser(normalized);
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn('findUserByEmailAsync error:', e);
    }'''

new_find = '''    // 2. Fast O(1) indexed query in Firebase RTDB
    try {
      const q = query(ref(database, 'users'), orderByChild('email'), equalTo(clean));
      const snap = await get(q);
      if (snap.exists()) {
        const val = snap.val();
        for (const [uid, u] of Object.entries(val)) {
          if (u && typeof u === 'object') {
            const normalized = {
              ...u,
              uid: u.uid || uid,
              displayName: u.displayName || u.name || u.username,
              avatar: u.avatar || DEFAULT_AVATAR
            };
            this.saveUser(normalized);
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn('Indexed findUserByEmailAsync error:', e);
    }

    // 3. Deep scan fallback across all users
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val && typeof val === 'object') {
        for (const [uid, u] of Object.entries(val)) {
          if (u && typeof u === 'object' && u.email && u.email.trim().toLowerCase() === clean) {
            const normalized = {
              ...u,
              uid: u.uid || uid,
              displayName: u.displayName || u.name || u.username,
              avatar: u.avatar || DEFAULT_AVATAR
            };
            this.saveUser(normalized);
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn('findUserByEmailAsync error:', e);
    }'''

if old_find in text:
    text = text.replace(old_find, new_find)
    print("Replaced findUserByEmailAsync (LF)")
elif old_find.replace('\n', '\r\n') in text:
    text = text.replace(old_find.replace('\n', '\r\n'), new_find)
    print("Replaced findUserByEmailAsync (CRLF)")
else:
    print("findUserByEmailAsync pattern not matched")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
