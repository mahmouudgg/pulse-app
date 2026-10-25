import os
import re

paths = set()
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            p = os.path.join(root, file)
            with open(p, encoding='utf-8', errors='ignore') as f:
                c = f.read()
                matches = re.findall(r"ref\(database(?:,\s*[`'\"]([^`'\"]+)[`'\"])?\)", c)
                for m in matches:
                    if m:
                        paths.add(m)

for p in sorted(paths):
    print(p)
