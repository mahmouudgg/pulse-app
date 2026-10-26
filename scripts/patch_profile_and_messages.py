import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"

# 1. Patch MessagesPage.jsx
msg_path = os.path.join(BASE_DIR, "src", "pages", "MessagesPage.jsx")
with open(msg_path, 'r', encoding='utf-8') as f:
    msg_content = f.read()

msg_is_crlf = '\r\n' in msg_content
msg_norm = msg_content.replace('\r\n', '\n')

old_get_other = """  function getOtherParticipant(conversation) {
    if (!conversation || !conversation.participantDetails) return null;
    const details = conversation.participantDetails;
    const otherUid = Object.keys(details).find((uid) => uid !== currentUser?.uid);
    return otherUid ? details[otherUid] : null;
  }"""

new_get_other = """  function getOtherParticipant(conversation) {
    if (!conversation || !conversation.participantDetails) return null;
    const details = conversation.participantDetails;
    const otherUid = Object.keys(details).find((uid) => uid !== currentUser?.uid);
    if (!otherUid) return null;
    const base = details[otherUid] || {};
    const cached = storageService.getUser(otherUid) || (base.username ? storageService.getUserByUsername(base.username) : null);
    const isSovy = otherUid === 'user_1789917894698' || base.username?.toLowerCase() === 'sovythos';
    const isFounder = otherUid === 'dev_mahmoud_yasser' || base.username === 'my' || base.isFounder || cached?.isFounder;

    return {
      ...base,
      ...(cached || {}),
      avatar: cached?.avatar || base.avatar || DEFAULT_AVATAR,
      displayName: cached?.displayName || base.displayName || base.username,
      username: cached?.username || base.username,
      isVerified: Boolean(cached?.isVerified || base.isVerified || base.isPro || isSovy || isFounder)
    };
  }"""

if old_get_other in msg_norm:
    msg_norm = msg_norm.replace(old_get_other, new_get_other)
    if msg_is_crlf:
        msg_norm = msg_norm.replace('\n', '\r\n')
    with open(msg_path, 'w', encoding='utf-8') as f:
        f.write(msg_norm)
    print("MessagesPage.jsx patched successfully!", flush=True)
else:
    print("Could not find old_get_other in MessagesPage.jsx", flush=True)

# 2. Patch chatService.js
chat_path = os.path.join(BASE_DIR, "src", "services", "chatService.js")
with open(chat_path, 'r', encoding='utf-8') as f:
    chat_content = f.read()

chat_is_crlf = '\r\n' in chat_content
chat_norm = chat_content.replace('\r\n', '\n')

old_part_details = """        participantDetails: {
          [sender.uid]: {
            uid: sender.uid,
            displayName: sender.displayName,
            username: sender.username,
            avatar: sender.avatar || null,
            isFounder: senderFounder,
            pioneerNumber: sender.pioneerNumber || (senderFounder ? 1 : null)
          },
          [recipient.uid]: {
            uid: recipient.uid,
            displayName: recipient.displayName,
            username: recipient.username,
            avatar: recipient.avatar || null,
            isFounder: recipientFounder,
            pioneerNumber: recipient.pioneerNumber || (recipientFounder ? 1 : null)
          }
        },"""

new_part_details = """        participantDetails: {
          [sender.uid]: {
            uid: sender.uid,
            displayName: sender.displayName,
            username: sender.username,
            avatar: sender.avatar || null,
            isFounder: senderFounder,
            isVerified: Boolean(sender.isVerified || sender.isPro || sender.verificationStatus === 'verified' || senderFounder || sender.uid === 'user_1789917894698' || sender.username?.toLowerCase() === 'sovythos'),
            pioneerNumber: sender.pioneerNumber || (senderFounder ? 1 : null)
          },
          [recipient.uid]: {
            uid: recipient.uid,
            displayName: recipient.displayName,
            username: recipient.username,
            avatar: recipient.avatar || null,
            isFounder: recipientFounder,
            isVerified: Boolean(recipient.isVerified || recipient.isPro || recipient.verificationStatus === 'verified' || recipientFounder || recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos'),
            pioneerNumber: recipient.pioneerNumber || (recipientFounder ? 1 : null)
          }
        },"""

if old_part_details in chat_norm:
    chat_norm = chat_norm.replace(old_part_details, new_part_details)
    if chat_is_crlf:
        chat_norm = chat_norm.replace('\n', '\r\n')
    with open(chat_path, 'w', encoding='utf-8') as f:
        f.write(chat_norm)
    print("chatService.js patched successfully!", flush=True)
else:
    print("Could not find old_part_details in chatService.js", flush=True)

# 3. Patch ProfilePage.jsx
prof_path = os.path.join(BASE_DIR, "src", "pages", "ProfilePage.jsx")
with open(prof_path, 'r', encoding='utf-8') as f:
    prof_content = f.read()

prof_is_crlf = '\r\n' in prof_content
prof_norm = prof_content.replace('\r\n', '\n')

# 3A: Add activeTab effect for replies
old_tab_sync = """  // Realtime subscription to authentic user replies across the platform
  const [userReplies, setUserReplies] = useState([]);
  useEffect(() => {
    if (!profileUser?.uid && !profileUser?.username) return;
    const unsub = storageService.subscribeToUserReplies(
      profileUser.uid,
      profileUser.username,
      (list) => {
        setUserReplies(list || []);
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [profileUser?.uid, profileUser?.username]);"""

new_tab_sync = """  // Realtime subscription to authentic user replies across the platform
  const [userReplies, setUserReplies] = useState([]);
  useEffect(() => {
    if (!profileUser?.uid && !profileUser?.username) return;
    const unsub = storageService.subscribeToUserReplies(
      profileUser.uid,
      profileUser.username,
      (list) => {
        setUserReplies(list || []);
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [profileUser?.uid, profileUser?.username]);

  // Immediate sync when navigating into the replies tab
  useEffect(() => {
    if (activeTab === 'replies' && (profileUser?.uid || profileUser?.username)) {
      const currentList = storageService.getUserReplies(profileUser?.uid, profileUser?.username);
      if (Array.isArray(currentList) && currentList.length > 0) {
        setUserReplies(currentList);
      }
    }
  }, [activeTab, profileUser?.uid, profileUser?.username]);"""

if old_tab_sync in prof_norm:
    prof_norm = prof_norm.replace(old_tab_sync, new_tab_sync)
    print("ProfilePage.jsx tab sync added!", flush=True)
else:
    print("Could not find old_tab_sync in ProfilePage.jsx", flush=True)

# 3B: Enhance parentAuthor and replyAuthor in replies rendering
old_replies_render = """          {userReplies.length > 0 ? (
            userReplies.map((item) => {
              const parent = item.parentPost || {};
              const reply = item.comment || {};
              const parentAuthor = parent.author || {};
              const replyAuthor = reply.author || profileUser || {};
              const isReplyLiked = Array.isArray(reply.likes) && currentUser?.uid && reply.likes.includes(currentUser.uid);
              const replyLikesCount = Array.isArray(reply.likes) ? reply.likes.length : 0;"""

new_replies_render = """          {userReplies.length > 0 ? (
            userReplies.map((item) => {
              const parent = item.parentPost || {};
              const reply = item.comment || {};
              const rawParentAuthor = parent.author;
              const parentAuthor = (typeof rawParentAuthor === 'object' && rawParentAuthor !== null)
                ? rawParentAuthor
                : (storageService.getUser(parent.authorId || rawParentAuthor) || storageService.getUserByUsername(parent.authorUsername || rawParentAuthor) || {});

              const isParentVerified = Boolean(
                parentAuthor.isVerified ||
                parentAuthor.isPro ||
                parentAuthor.isFounder ||
                parentAuthor.username === 'my' ||
                parentAuthor.uid === 'dev_mahmoud_yasser' ||
                parentAuthor.username?.toLowerCase() === 'sovythos' ||
                parentAuthor.uid === 'user_1789917894698'
              );

              const rawReplyAuthor = reply.author;
              const replyAuthor = (typeof rawReplyAuthor === 'object' && rawReplyAuthor !== null)
                ? rawReplyAuthor
                : (storageService.getUser(reply.authorId || rawReplyAuthor) || profileUser || {});

              const isReplyAuthorVerified = Boolean(
                replyAuthor.isVerified ||
                replyAuthor.isPro ||
                replyAuthor.isFounder ||
                replyAuthor.username === 'my' ||
                replyAuthor.uid === 'dev_mahmoud_yasser' ||
                replyAuthor.username?.toLowerCase() === 'sovythos' ||
                replyAuthor.uid === 'user_1789917894698'
              );

              const isReplyLiked = Array.isArray(reply.likes) && currentUser?.uid && reply.likes.includes(currentUser.uid);
              const replyLikesCount = Array.isArray(reply.likes) ? reply.likes.length : 0;"""

if old_replies_render in prof_norm:
    prof_norm = prof_norm.replace(old_replies_render, new_replies_render)
    print("ProfilePage.jsx replies mapping enhanced!", flush=True)
else:
    print("Could not find old_replies_render in ProfilePage.jsx", flush=True)

# 3C: Replace parentAuthor.isVerified and profileUser?.isVerified in the badges
prof_norm = prof_norm.replace(
    "{parentAuthor.isVerified && <VerifiedBadge size={14} />}",
    "{isParentVerified && <VerifiedBadge size={14} />}"
)
prof_norm = prof_norm.replace(
    "{profileUser?.isVerified && <VerifiedBadge size={14} />}",
    "{isReplyAuthorVerified && <VerifiedBadge size={14} />}"
)

if prof_is_crlf:
    prof_norm = prof_norm.replace('\n', '\r\n')

with open(prof_path, 'w', encoding='utf-8') as f:
    f.write(prof_norm)

print("Finished all patches successfully!", flush=True)
