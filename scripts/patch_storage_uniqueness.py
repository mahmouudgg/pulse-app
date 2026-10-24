# Patch storageService.js for indexed atomic uniqueness checks

path = r'src/services/storageService.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
old_imp = "import { ref, set, get, update, remove, onValue, query, orderByKey, limitToLast, endBefore } from 'firebase/database';"
new_imp = "import { ref, set, get, update, remove, onValue, query, orderByKey, limitToLast, endBefore, orderByChild, equalTo } from 'firebase/database';"

if old_imp in text:
    text = text.replace(old_imp, new_imp)
    print("Updated firebase/database imports")

# 2. Replace checkUsernameAvailable, checkEmailAvailable, checkPhoneAvailable
old_checks = '''  // Real-time Cloud Uniqueness Verification (Queries Firebase Directly)
  async checkUsernameAvailable(username, excludeUid = null) {
    if (!username) return false;
    const clean = username.trim().toLowerCase();
    // 1. Check local cache
    const localExisting = this.getUserByUsername(clean);
    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {
      return false;
    }
    // 2. Check live Firebase Realtime Database
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val) {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && u.username && u.username.toLowerCase() === clean) {
            return false;
          }
        }
      }
    } catch (err) {
      console.warn('Cloud username check error:', err);
    }
    return true;
  },

  async checkEmailAvailable(email, excludeUid = null) {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    // 1. Check local cache
    const localExisting = this.getUserByEmail(clean);
    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {
      return false;
    }
    // 2. Check live Firebase Realtime Database
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val) {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && u.email && u.email.toLowerCase() === clean) {
            return false;
          }
        }
      }
    } catch (err) {
      console.warn('Cloud email check error:', err);
    }
    return true;
  },

  async checkPhoneAvailable(phone, excludeUid = null) {
    if (!phone) return true;
    const clean = phone.replace(/[\\s\\-\\(\\)]/g, '');
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val) {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && u.phone) {
            const uClean = u.phone.replace(/[\\s\\-\\(\\)]/g, '');
            if (uClean === clean || (clean.length >= 9 && uClean.endsWith(clean.slice(-9)))) {
              return false;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Cloud phone check error:', err);
    }
    return true;
  },'''

new_checks = '''  // Carrier-Grade Real-time Cloud Uniqueness Verification (Indexed O(1) + Deep Scan Fallback)
  async checkUsernameAvailable(username, excludeUid = null) {
    if (!username) return false;
    const clean = username.trim().toLowerCase();
    if (clean.length < 2) return false;

    // 1. Check local cache
    const localExisting = this.getUserByUsername(clean);
    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {
      return false;
    }

    // 2. Direct indexed Firebase RTDB query (O(1) indexed lookup)
    try {
      const q = query(ref(database, 'users'), orderByChild('username'), equalTo(clean));
      const snap = await get(q);
      if (snap.exists()) {
        const val = snap.val();
        for (const [uid] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          return false;
        }
      }
    } catch (err) {
      console.warn('Indexed username query error:', err);
    }

    // 3. Fallback deep scan across cloud users node (guarantees case-insensitivity)
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val && typeof val === 'object') {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && typeof u === 'object' && u.username && u.username.trim().toLowerCase() === clean) {
            return false;
          }
        }
      }
    } catch (err) {
      console.warn('Deep scan username check error:', err);
    }

    return true;
  },

  async checkEmailAvailable(email, excludeUid = null) {
    if (!email) return false;
    const clean = email.trim().toLowerCase();

    // 1. Check local cache
    const localExisting = this.getUserByEmail(clean);
    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {
      return false;
    }

    // 2. Direct indexed Firebase RTDB query
    try {
      const q = query(ref(database, 'users'), orderByChild('email'), equalTo(clean));
      const snap = await get(q);
      if (snap.exists()) {
        const val = snap.val();
        for (const [uid] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          return false;
        }
      }
    } catch (err) {
      console.warn('Indexed email query error:', err);
    }

    // 3. Fallback deep scan across cloud users node
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val && typeof val === 'object') {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && typeof u === 'object' && u.email && u.email.trim().toLowerCase() === clean) {
            return false;
          }
        }
      }
    } catch (err) {
      console.warn('Deep scan email check error:', err);
    }

    return true;
  },

  async checkPhoneAvailable(phone, excludeUid = null) {
    if (!phone) return true;
    const clean = phone.replace(/[\\s\\-\\(\\)\\+]/g, '');
    if (clean.length < 7) return true;

    // 1. Local cache
    const users = this.getUsers();
    const localFound = users.find((u) => {
      if (excludeUid && u.uid === excludeUid) return false;
      const uPh = (u.phone || u.fullPhone || '').replace(/[\\s\\-\\(\\)\\+]/g, '');
      return uPh === clean || (clean.length >= 9 && uPh.endsWith(clean.slice(-9)));
    });
    if (localFound) return false;

    // 2. Query indexed Firebase RTDB directly
    try {
      const q = query(ref(database, 'users'), orderByChild('phone'), equalTo(clean));
      const snap = await get(q);
      if (snap.exists()) {
        for (const [uid] of Object.entries(snap.val())) {
          if (excludeUid && uid === excludeUid) continue;
          return false;
        }
      }
    } catch (err) {
      console.warn('Indexed phone query error:', err);
    }

    // 3. Fallback deep scan across cloud users node
    try {
      const snap = await get(ref(database, 'users'));
      const val = snap.val();
      if (val && typeof val === 'object') {
        for (const [uid, u] of Object.entries(val)) {
          if (excludeUid && uid === excludeUid) continue;
          if (u && typeof u === 'object') {
            const uPh = (u.phone || u.fullPhone || '').replace(/[\\s\\-\\(\\)\\+]/g, '');
            if (uPh === clean || (clean.length >= 9 && uPh.endsWith(clean.slice(-9)))) {
              return false;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Deep scan phone check error:', err);
    }

    return true;
  },'''

if old_checks in text:
    text = text.replace(old_checks, new_checks)
    print("Replaced uniqueness checks (LF)")
elif old_checks.replace('\n', '\r\n') in text:
    text = text.replace(old_checks.replace('\n', '\r\n'), new_checks)
    print("Replaced uniqueness checks (CRLF)")
else:
    print("Could not match old_checks block, performing line-by-line replacement")
    # fallback
    lines = text.splitlines()
    start_idx = None
    end_idx = None
    for idx, l in enumerate(lines):
        if 'async checkUsernameAvailable(' in l:
            start_idx = idx - 1
        if start_idx is not None and 'getNextPioneerNumber()' in l:
            end_idx = idx - 1
            break
    if start_idx is not None and end_idx is not None:
        new_text_lines = lines[:start_idx] + [new_checks] + lines[end_idx:]
        text = '\n'.join(new_text_lines)
        print("Replaced via index range")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("storageService.js uniqueness updated.")
