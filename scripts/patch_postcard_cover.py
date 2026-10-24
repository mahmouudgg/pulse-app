with open('src/components/PostCard.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old_img = '<img src={post.music.coverUrl} alt="" className="w-full h-full object-cover" />'
new_img = '<img src={post.music.coverUrl || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }} />'

if old_img in c:
    c = c.replace(old_img, new_img)
    with open('src/components/PostCard.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("PostCard.jsx music cover onError patched successfully")
else:
    print("old_img not found in PostCard.jsx")
