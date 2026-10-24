auth_path = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src/pages/AuthPage.jsx'

with open(auth_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the form states block to move
form_states_block = """  // Form states
  const [identifier, setIdentifier] = useState(''); // email, username, or phone
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  // 2FA Challenge State
  const [pending2FAUser, setPending2FAUser] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  // Password Recovery State
  const [resetStep, setResetStep] = useState(1); // 1: Request OTP | 2: Verify & Set New Password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetUid, setResetUid] = useState(null);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPreviewNotice, setResetPreviewNotice] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
"""

# Remove the original blocks from below
original_below = """  // 2FA Challenge State
  const [pending2FAUser, setPending2FAUser] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  // Password Recovery State
  const [resetStep, setResetStep] = useState(1); // 1: Request OTP | 2: Verify & Set New Password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetUid, setResetUid] = useState(null);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPreviewNotice, setResetPreviewNotice] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Form states
  const [identifier, setIdentifier] = useState(''); // email, username, or phone
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');"""

if original_below in content:
    content = content.replace(original_below, "")
    print("Removed original below block.")
else:
    print("Could not match original below block directly, trying normalized CRLF/LF...")
    # Normalize CRLF
    content_norm = content.replace('\r\n', '\n')
    original_norm = original_below.replace('\r\n', '\n')
    if original_norm in content_norm:
        content_norm = content_norm.replace(original_norm, "")
        content = content_norm
        print("Removed original below block with normalized line endings.")
    else:
        print("Error: still could not find original below block!")

# Insert form_states_block before the useEffect hooks
insert_marker = "  // Real-time debounced username uniqueness check"
if insert_marker in content:
    content = content.replace(insert_marker, form_states_block + "\n" + insert_marker)
    print("Inserted form_states_block before useEffect hooks.")
else:
    print("Error: insert_marker not found!")

with open(auth_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AuthPage.jsx updated successfully!")
