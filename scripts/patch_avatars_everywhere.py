import os
import re

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for old, new in replacements:
        if old in new_content:
            new_content = new_content.replace(old, new)
        else:
            print(f"Warning: pattern not found in {filepath}: {old[:60]}...")

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully patched {filepath}")
    else:
        print(f"No changes made to {filepath}")

# 1. PostCard.jsx
patch_file('src/components/PostCard.jsx', [
    (
        "src={displayAuthor.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(displayAuthor.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={post.quotePost.author?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(post.quotePost.author?.avatar)}\n                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    )
])

# 2. NotificationsPage.jsx
patch_file('src/pages/NotificationsPage.jsx', [
    (
        "import VerifiedBadge from '../components/VerifiedBadge';",
        "import VerifiedBadge from '../components/VerifiedBadge';\nimport { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';"
    ),
    (
        "src={item.user.avatar}",
        "src={resolveAvatar(item.user?.avatar)}"
    ),
    (
        "onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}",
        "onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    )
])

# 3. ProfilePage.jsx
patch_file('src/pages/ProfilePage.jsx', [
    (
        "import { DEFAULT_AVATAR } from '../utils/defaultAvatar';",
        "import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';"
    ),
    (
        "src={profileUser?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(profileUser?.avatar)}\n                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={viewerAvatar}",
        "src={resolveAvatar(viewerAvatar)}\n                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    )
])

# 4. PostDetailPage.jsx
patch_file('src/pages/PostDetailPage.jsx', [
    (
        "import { DEFAULT_AVATAR } from '../utils/defaultAvatar';",
        "import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';"
    ),
    (
        "src={post.author?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(post.author?.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={rootComm.author?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(rootComm.author?.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={r.author?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(r.author?.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={nested.author?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(nested.author?.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    ),
    (
        "src={currentUser?.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(currentUser?.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    )
])

# 5. PioneersPage.jsx
patch_file('src/pages/PioneersPage.jsx', [
    (
        "import { DEFAULT_AVATAR } from '../utils/defaultAvatar';",
        "import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';"
    ),
    (
        "src={user.avatar || DEFAULT_AVATAR}",
        "src={resolveAvatar(user.avatar)}\n            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}"
    )
])
