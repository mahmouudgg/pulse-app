with open('src/pages/NotificationsPage.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("avatar: '/default-avatar.png'", "avatar: DEFAULT_AVATAR")

with open('src/pages/NotificationsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Patched NotificationsPage.jsx line 78")
