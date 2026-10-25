import os
import re

index_queries = {}
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            p = os.path.join(root, file)
            with open(p, encoding='utf-8', errors='ignore') as f:
                c = f.read()
                matches = re.findall(r"orderByChild\(['\"]([^'\"]+)['\"]\)", c)
                for m in matches:
                    index_queries.setdefault(m, set()).add(file)

for field, files in sorted(index_queries.items()):
    print(f'{field}: {len(files)} files -> {list(files)[:3]}')
