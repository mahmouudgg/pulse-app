import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"
target_file = os.path.join(BASE_DIR, "src", "pages", "ChatConversationPage.jsx")

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

is_crlf = '\r\n' in content
c_norm = content.replace('\r\n', '\n')

# 1. Replace the state and declarations
old_block = """  const conversationId = chatService.getConversationId(currentUser?.uid, recipient?.uid);
  const isFounder = recipient?.isFounder || recipient?.username === 'my';
  const isRecipientVerified = Boolean(
    recipient?.isVerified || 
    recipient?.isPro || 
    recipient?.isFounder || 
    recipient?.verificationStatus === 'verified'
  );

  const isRecipientSovythos = recipient?.uid === 'user_1789917894698' || recipient?.username?.toLowerCase() === 'sovythos';"""

new_block = """  const conversationId = chatService.getConversationId(currentUser?.uid, recipient?.uid);

  const isRecipientSovythos = recipient?.uid === 'user_1789917894698' || recipient?.username?.toLowerCase() === 'sovythos';

  // Live real-time synchronized recipient user state
  const [liveRecipient, setLiveRecipient] = useState(() => {
    const cached = recipient?.uid 
      ? storageService.getUser(recipient.uid) 
      : (recipient?.username ? storageService.getUserByUsername(recipient.username) : null);
    return {
      ...(cached || {}),
      ...(recipient || {})
    };
  });

  // Real-time live user subscription for recipient (followers count, verification, bio, avatar)
  useEffect(() => {
    const targetUid = recipient?.uid || (recipient?.username ? storageService.getUserByUsername(recipient.username)?.uid : null);
    if (!targetUid) return;

    // 1. Immediate sync from local cache
    const cached = storageService.getUser(targetUid);
    if (cached) {
      setLiveRecipient((prev) => ({ ...prev, ...cached }));
    }

    // 2. Realtime listener using storageService
    const unsub = storageService.subscribeToUser(targetUid, (freshUser) => {
      if (freshUser) {
        setLiveRecipient((prev) => ({ ...prev, ...freshUser }));
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [recipient?.uid, recipient?.username]);

  const isFounder = Boolean(liveRecipient?.isFounder || liveRecipient?.username === 'my' || liveRecipient?.uid === 'dev_mahmoud_yasser');
  const isRecipientVerified = Boolean(
    liveRecipient?.isVerified || 
    liveRecipient?.isPro || 
    liveRecipient?.isFounder || 
    liveRecipient?.verificationStatus === 'verified' ||
    isRecipientSovythos ||
    isFounder
  );"""

if old_block in c_norm:
    c_norm = c_norm.replace(old_block, new_block)
    print("Replaced recipient state block successfully!", flush=True)
else:
    print("Could not find old_block in ChatConversationPage.jsx", flush=True)

# 2. Replace rawFollowersCount
old_followers = """  const rawFollowersCount = recipient?.followersCount ?? (
    Array.isArray(recipient?.followers) 
      ? recipient.followers.length 
      : (recipient?.followers ? Object.keys(recipient.followers).length : 0)
  );"""

new_followers = """  const rawFollowersCount = Number(liveRecipient?.followersCount) > 0
    ? Number(liveRecipient.followersCount)
    : (Array.isArray(liveRecipient?.followers) 
        ? liveRecipient.followers.length 
        : (liveRecipient?.followers && typeof liveRecipient.followers === 'object' 
            ? Object.keys(liveRecipient.followers).length 
            : (isRecipientSovythos ? 10 : 0)));"""

if old_followers in c_norm:
    c_norm = c_norm.replace(old_followers, new_followers)
    print("Replaced rawFollowersCount successfully!", flush=True)
else:
    print("Could not find old_followers in ChatConversationPage.jsx", flush=True)

# 3. Replace recipient with liveRecipient in Header (around lines 270-310)
old_header_info = """            {/* User Info Header: Avatar + Username + Verified Badge + Subtitle */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
              className="flex items-center gap-2.5 cursor-pointer tap-press min-w-0 group"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={recipient?.avatar || DEFAULT_AVATAR}
                  alt={recipient?.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-[#26262B] aspect-square bg-[#121214]"
                />
                {isFounder && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <Terminal size={8} className="text-black stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <span className="text-sm font-bold text-white tracking-tight truncate" dir="ltr">
                    {recipient?.username || recipient?.displayName}
                  </span>
                  {isRecipientVerified && (
                    <VerifiedBadge size={14} />
                  )}
                  {recipient?.pioneerNumber && (
                    <PioneerBadge number={recipient.pioneerNumber} size="xs" />
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-normal truncate">
                  {isOtherTyping ? (
                    <span className="text-neutral-300 font-medium">
                      {isAr ? 'يكتب الآن...' : 'typing...'}
                    </span>
                  ) : (
                    <span>{recipient?.displayName || recipient?.username}</span>
                  )}
                </div>
              </div>
            </div>"""

new_header_info = """            {/* User Info Header: Avatar + Username + Verified Badge + Subtitle */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(liveRecipient)}
              className="flex items-center gap-2.5 cursor-pointer tap-press min-w-0 group"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={liveRecipient?.avatar || DEFAULT_AVATAR}
                  alt={liveRecipient?.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-[#26262B] aspect-square bg-[#121214]"
                />
                {isFounder && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <Terminal size={8} className="text-black stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <span className="text-sm font-bold text-white tracking-tight truncate" dir="ltr">
                    {liveRecipient?.username || liveRecipient?.displayName}
                  </span>
                  {isRecipientVerified && (
                    <VerifiedBadge size={14} />
                  )}
                  {liveRecipient?.pioneerNumber && (
                    <PioneerBadge number={liveRecipient.pioneerNumber} size="xs" />
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-normal truncate">
                  {isOtherTyping ? (
                    <span className="text-neutral-300 font-medium">
                      {isAr ? 'يكتب الآن...' : 'typing...'}
                    </span>
                  ) : (
                    <span>{liveRecipient?.displayName || liveRecipient?.username}</span>
                  )}
                </div>
              </div>
            </div>"""

if old_header_info in c_norm:
    c_norm = c_norm.replace(old_header_info, new_header_info)
    print("Replaced header user info successfully!", flush=True)
else:
    print("Could not find old_header_info in ChatConversationPage.jsx", flush=True)

# 4. Replace recipient with liveRecipient in Hero card (around lines 355-415)
old_hero_info = """          {/* Centered Large Profile Hero Card (1:1 with media_1792328088248_572ba54c.png) */}
          <div className="pt-6 pb-4 px-4 text-center select-none flex flex-col items-center">
            {/* 88px Avatar */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
              className="w-[88px] h-[88px] rounded-full overflow-hidden mx-auto border border-[#2E2E33] bg-[#101012] cursor-pointer tap-press shadow-xl"
            >
              <img
                src={recipient?.avatar || DEFAULT_AVATAR}
                alt={recipient?.displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username + Official Blue Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight" dir="ltr">
                {recipient?.username || recipient?.displayName}
              </h2>
              {isRecipientVerified && (
                <VerifiedBadge size={18} />
              )}
              {recipient?.pioneerNumber && (
                <PioneerBadge number={recipient.pioneerNumber} size="xs" />
              )}
            </div>

            {/* Display Name Subtitle in Gray */}
            <p className="text-sm text-neutral-400 mt-0.5 font-normal">
              {recipient?.displayName || recipient?.username}
            </p>

            {/* Social Proof Lines */}
            <div className="mt-2.5 space-y-1 text-center text-xs sm:text-[13px] text-neutral-400 leading-relaxed font-normal">
              <p>
                {formatFollowers(rawFollowersCount)} {isAr ? 'متابع' : 'followers'}
              </p>
              <p>
                {isAr ? 'متابع على PULSE منذ 2026' : 'Following on PULSE since 2026'}
              </p>
              {recipient?.bio ? (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto line-clamp-2 mt-1 font-normal">
                  {recipient.bio}
                </p>
              ) : (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto mt-0.5">
                  {isAr ? 'حساب معتمد وموثق في مجتمع PULSE' : 'Verified account on PULSE'}
                </p>
              )}
            </div>

            {/* Pill "View profile" Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
                className="px-6 py-1.5 rounded-full border border-[#333336] hover:border-neutral-500 bg-transparent text-white font-medium text-xs sm:text-sm tap-press transition-all active:scale-95"
              >
                {isAr ? 'عرض الملف الشخصي' : 'View profile'}
              </button>
            </div>
          </div>"""

new_hero_info = """          {/* Centered Large Profile Hero Card (1:1 with media_1792328088248_572ba54c.png) */}
          <div className="pt-6 pb-4 px-4 text-center select-none flex flex-col items-center">
            {/* 88px Avatar */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(liveRecipient)}
              className="w-[88px] h-[88px] rounded-full overflow-hidden mx-auto border border-[#2E2E33] bg-[#101012] cursor-pointer tap-press shadow-xl"
            >
              <img
                src={liveRecipient?.avatar || DEFAULT_AVATAR}
                alt={liveRecipient?.displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username + Official Blue Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight" dir="ltr">
                {liveRecipient?.username || liveRecipient?.displayName}
              </h2>
              {isRecipientVerified && (
                <VerifiedBadge size={18} />
              )}
              {liveRecipient?.pioneerNumber && (
                <PioneerBadge number={liveRecipient.pioneerNumber} size="xs" />
              )}
            </div>

            {/* Display Name Subtitle in Gray */}
            <p className="text-sm text-neutral-400 mt-0.5 font-normal">
              {liveRecipient?.displayName || liveRecipient?.username}
            </p>

            {/* Social Proof Lines */}
            <div className="mt-2.5 space-y-1 text-center text-xs sm:text-[13px] text-neutral-400 leading-relaxed font-normal">
              <p>
                {formatFollowers(rawFollowersCount)} {isAr ? 'متابع' : 'followers'}
              </p>
              <p>
                {isAr ? 'متابع على PULSE منذ 2026' : 'Following on PULSE since 2026'}
              </p>
              {liveRecipient?.bio ? (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto line-clamp-2 mt-1 font-normal">
                  {liveRecipient.bio}
                </p>
              ) : (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto mt-0.5">
                  {isAr ? 'حساب معتمد وموثق في مجتمع PULSE' : 'Verified account on PULSE'}
                </p>
              )}
            </div>

            {/* Pill "View profile" Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenUserProfile && onOpenUserProfile(liveRecipient)}
                className="px-6 py-1.5 rounded-full border border-[#333336] hover:border-neutral-500 bg-transparent text-white font-medium text-xs sm:text-sm tap-press transition-all active:scale-95"
              >
                {isAr ? 'عرض الملف الشخصي' : 'View profile'}
              </button>
            </div>
          </div>"""

if old_hero_info in c_norm:
    c_norm = c_norm.replace(old_hero_info, new_hero_info)
    print("Replaced hero card user info successfully!", flush=True)
else:
    print("Could not find old_hero_info in ChatConversationPage.jsx", flush=True)

if is_crlf:
    c_norm = c_norm.replace('\n', '\r\n')

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(c_norm)

print("Finished patch_chat_page.py successfully!", flush=True)
