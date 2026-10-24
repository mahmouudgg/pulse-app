import os
import re

src_dir = 'src'
count = 0

replacements = [
    (re.compile(r"\{\s*isAr\s*\?\s*['\"]نبضة جديدة['\"]\s*:\s*['\"]New thread['\"]\s*\}"), "{isAr ? 'نبضة جديدة' : 'New pulse'}"),
    (re.compile(r"\{\s*isAr\s*\?\s*['\"]إضافة إلى السلسلة['\"]\s*:\s*['\"]Add to thread['\"]\s*\}"), "{isAr ? 'إضافة إلى النبضة' : 'Add to pulse'}"),
    (re.compile(r"placeholder=\{\s*isAr\s*\?\s*['\"]أضف نبضة أخرى للسلسلة\.\.\.['\"]\s*:\s*['\"]Say more in thread\.\.\.['\"]\s*\}"), "placeholder={isAr ? 'أضف تفاصيل أخرى للنبضة...' : 'Say more in pulse...'}"),
    (re.compile(r"\banimate-threads-shimmer\b"), "animate-pulse-shimmer"),
    (re.compile(r"Threads-Style", re.IGNORECASE), "PULSE-Style"),
    (re.compile(r"Meta Threads", re.IGNORECASE), "PULSE Core"),
    (re.compile(r"Threads 1:1", re.IGNORECASE), "PULSE Official"),
    (re.compile(r"Threads Red Dot Pattern", re.IGNORECASE), "PULSE Dot Pattern"),
    (re.compile(r"Threads Image \d+", re.IGNORECASE), "PULSE Standard"),
    (re.compile(r"Threads Music", re.IGNORECASE), "PULSE Music"),
    (re.compile(r"Threads Signature", re.IGNORECASE), "PULSE Signature"),
    (re.compile(r"Threads Style", re.IGNORECASE), "PULSE Style"),
    (re.compile(r"Threads / Instagram Style", re.IGNORECASE), "PULSE Native Style"),
    (re.compile(r"Threads / Instagram", re.IGNORECASE), "PULSE Social"),
    (re.compile(r"Threads Web", re.IGNORECASE), "PULSE Web"),
    (re.compile(r"Threads \'\+\'", re.IGNORECASE), "PULSE '+'"),
]

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.js', '.jsx', '.css')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fl:
                content = fl.read()

            new_content = content
            for pat, repl in replacements:
                new_content = pat.sub(repl, new_content)

            if new_content != content:
                with open(path, 'w', encoding='utf-8') as fl:
                    fl.write(new_content)
                count += 1
                print(f"Patched: {os.path.relpath(path, src_dir)}")

print(f"Purge complete: {count} files updated.")
