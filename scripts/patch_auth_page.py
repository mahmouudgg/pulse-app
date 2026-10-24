path = r'src/pages/AuthPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add storageService import if not present
if "import { storageService } from '../services/storageService';" not in text:
    text = text.replace("import PulseLogo from '../components/PulseLogo';", "import PulseLogo from '../components/PulseLogo';\nimport { storageService } from '../services/storageService';")
    print("Added storageService import")

# 2. Add Loader2 to lucide imports
if "Loader2," not in text and "Loader2 " not in text:
    text = text.replace("EyeOff,\n", "EyeOff,\n  Loader2,\n")
    print("Added Loader2 to lucide-react imports")

# 3. Add availability states right after googleOnboarding state
state_anchor = "const [googleOnboarding, setGoogleOnboarding] = useState(null);"
new_states = """const [googleOnboarding, setGoogleOnboarding] = useState(null);
  const [usernameAvailability, setUsernameAvailability] = useState({ checking: false, available: null, message: '' });
  const [emailAvailability, setEmailAvailability] = useState({ checking: false, available: null, message: '' });
  const [phoneAvailability, setPhoneAvailability] = useState({ checking: false, available: null, message: '' });

  // Real-time debounced username uniqueness check
  useEffect(() => {
    if (mode !== 'register' || !username || username.trim().length < 2) {
      setUsernameAvailability({ checking: false, available: null, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameAvailability({ checking: true, available: null, message: '' });
      const free = await storageService.checkUsernameAvailable(username.trim());
      if (free) {
        setUsernameAvailability({
          checking: false,
          available: true,
          message: isAr ? 'اسم المستخدم متاح' : 'Username is available'
        });
      } else {
        setUsernameAvailability({
          checking: false,
          available: false,
          message: isAr ? 'اسم المستخدم محجوز بالفعل' : 'Username is already taken'
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [username, mode, isAr]);

  // Real-time debounced email uniqueness check
  useEffect(() => {
    if (mode !== 'register' || !email || !email.includes('@') || email.trim().length < 5) {
      setEmailAvailability({ checking: false, available: null, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      setEmailAvailability({ checking: true, available: null, message: '' });
      const free = await storageService.checkEmailAvailable(email.trim());
      if (free) {
        setEmailAvailability({ checking: false, available: true, message: '' });
      } else {
        setEmailAvailability({
          checking: false,
          available: false,
          message: isAr ? 'هذا البريد مسجل بالفعل، يمكنك تسجيل الدخول به مباشرة' : 'This email is already registered'
        });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [email, mode, isAr]);

  // Real-time debounced phone uniqueness check
  useEffect(() => {
    if (mode !== 'register' || !phone || phone.trim().length < 7) {
      setPhoneAvailability({ checking: false, available: null, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
      const fullPhone = cleanPhone.startsWith('+') ? cleanPhone : `${countryCode}${cleanPhone.replace(/^0+/, '')}`;
      const free = await storageService.checkPhoneAvailable(fullPhone);
      if (free) {
        setPhoneAvailability({ checking: false, available: true, message: '' });
      } else {
        setPhoneAvailability({
          checking: false,
          available: false,
          message: isAr ? 'رقم الهاتف مسجل بحساب آخر' : 'Phone number is already registered'
        });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [phone, countryCode, mode, isAr]);"""

if state_anchor in text:
    text = text.replace(state_anchor, new_states)
    print("Added availability states and debouncers")

# 4. Add UI status indicators to registration inputs
# Username input block
old_un_input = '''                  <div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      required
                      dir="ltr"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={isAr ? 'اسم المستخدم (username)' : 'Username (username)'}
                      className="w-full bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border border-[#222226] focus:border-white focus:outline-none transition-colors placeholder:text-neutral-500 font-mono"
                    />
                  </div>'''

new_un_input = '''                  <div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      required
                      dir="ltr"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={isAr ? 'اسم المستخدم (username)' : 'Username (username)'}
                      className={`w-full bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border transition-colors placeholder:text-neutral-500 font-mono focus:outline-none ${
                        usernameAvailability.available === false
                          ? 'border-rose-500/50'
                          : usernameAvailability.available === true
                          ? 'border-white/60'
                          : 'border-[#222226] focus:border-white'
                      }`}
                    />
                    {usernameAvailability.checking && (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1.5 ps-1 animate-fade-in font-sans">
                        <Loader2 size={11} className="animate-spin" />
                        <span>{isAr ? 'جاري التحقق من التوفر...' : 'Checking availability...'}</span>
                      </div>
                    )}
                    {!usernameAvailability.checking && usernameAvailability.available === true && (
                      <div className="flex items-center gap-1.5 text-[11px] text-white mt-1.5 ps-1 animate-fade-in font-sans font-medium">
                        <Check size={11} className="stroke-[3]" />
                        <span>{usernameAvailability.message}</span>
                      </div>
                    )}
                    {!usernameAvailability.checking && usernameAvailability.available === false && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-1.5 ps-1 animate-fade-in font-sans font-medium">
                        <AlertCircle size={11} />
                        <span>{usernameAvailability.message}</span>
                      </div>
                    )}
                  </div>'''

if old_un_input in text:
    text = text.replace(old_un_input, new_un_input)
    print("Replaced username input block (LF)")
elif old_un_input.replace('\n', '\r\n') in text:
    text = text.replace(old_un_input.replace('\n', '\r\n'), new_un_input)
    print("Replaced username input block (CRLF)")

# Email input block
old_em_input = '''                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      dir="ltr"
                      placeholder={isAr ? 'البريد الإلكتروني' : 'Email address'}
                      className="w-full bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border border-[#222226] focus:border-white focus:outline-none transition-colors placeholder:text-neutral-500 font-sans"
                    />
                  </div>'''

new_em_input = '''                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      dir="ltr"
                      placeholder={isAr ? 'البريد الإلكتروني' : 'Email address'}
                      className={`w-full bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border transition-colors placeholder:text-neutral-500 font-sans focus:outline-none ${
                        emailAvailability.available === false
                          ? 'border-rose-500/50'
                          : 'border-[#222226] focus:border-white'
                      }`}
                    />
                    {emailAvailability.available === false && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setIdentifier(email);
                          setError('');
                        }}
                        className="flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-white mt-1.5 ps-1 underline text-start tap-press font-sans font-medium"
                      >
                        <AlertCircle size={11} />
                        <span>{emailAvailability.message}</span>
                      </button>
                    )}
                  </div>'''

if old_em_input in text:
    text = text.replace(old_em_input, new_em_input)
    print("Replaced email input block (LF)")
elif old_em_input.replace('\n', '\r\n') in text:
    text = text.replace(old_em_input.replace('\n', '\r\n'), new_em_input)
    print("Replaced email input block (CRLF)")

# Phone input block
old_ph_input = '''                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isAr ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
                      className="flex-1 bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border border-[#222226] focus:border-white focus:outline-none transition-colors placeholder:text-neutral-500 font-mono"
                    />
                  </div>'''

new_ph_input = '''                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isAr ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
                      className={`flex-1 bg-[#121214] text-white text-sm rounded-2xl px-4 py-3.5 border transition-colors placeholder:text-neutral-500 font-mono focus:outline-none ${
                        phoneAvailability.available === false ? 'border-rose-500/50' : 'border-[#222226] focus:border-white'
                      }`}
                    />
                  </div>
                  {phoneAvailability.available === false && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-400 ps-1 font-sans font-medium">
                      <AlertCircle size={11} />
                      <span>{phoneAvailability.message}</span>
                    </div>
                  )}'''

if old_ph_input in text:
    text = text.replace(old_ph_input, new_ph_input)
    print("Replaced phone input block (LF)")
elif old_ph_input.replace('\n', '\r\n') in text:
    text = text.replace(old_ph_input.replace('\n', '\r\n'), new_ph_input)
    print("Replaced phone input block (CRLF)")

# 5. Upgrade Google Onboarding Modal with top drag handle and animate-sheet-up
old_google_modal = '''      {/* Google Onboarding Modal (Required for birthdate & username confirmation) */}
      {googleOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-[#121214] border border-[#26262B] rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-2xl relative">'''

new_google_modal = '''      {/* Google Onboarding Modal (High-End In-App Bottom Sheet) */}
      {googleOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-[#101012] border border-[#222226] rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-5 shadow-2xl relative animate-sheet-up max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Top Drag Handle for mobile gestures */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />'''

if old_google_modal in text:
    text = text.replace(old_google_modal, new_google_modal)
    print("Replaced google onboarding modal header (LF)")
elif old_google_modal.replace('\n', '\r\n') in text:
    text = text.replace(old_google_modal.replace('\n', '\r\n'), new_google_modal)
    print("Replaced google onboarding modal header (CRLF)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("AuthPage.jsx updated successfully.")
