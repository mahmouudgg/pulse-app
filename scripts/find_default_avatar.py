import os

found = []
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                for i, line in enumerate(fp, 1):
                    if 'default-avatar' in line or 'default_avatar' in line:
                        found.append(f"{p}:{i}: {line.strip()[:100].encode('ascii', 'replace').decode()}")

print(f"Total remaining default-avatar strings: {len(found)}")
for line in found:
    print(line)
