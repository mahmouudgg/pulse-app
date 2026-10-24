import os
import re

found = set()
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fp:
                for line in fp:
                    m = re.findall(r'https?://[^\s\'\"\`]+', line, re.I)
                    for u in m:
                        if 'avatar' in u.lower() or 'cloudinary' in u.lower():
                            found.add(u)

for u in sorted(found):
    print(u)
