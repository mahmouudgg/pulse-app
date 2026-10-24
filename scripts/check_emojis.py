import os, re

src_dir = r'src'
emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]|[\u200d]|[\uFE0F]')

matches = []
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.jsx', '.js', '.css', '.html')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                for idx, line in enumerate(file, 1):
                    em = emoji_pattern.findall(line)
                    if em:
                        matches.append((os.path.relpath(path, src_dir), idx, em, line.strip()))

print(f'Total emoji lines found: {len(matches)}')
for rel, idx, em, line in matches:
    print(f'{rel}:{idx} {em} -> {line[:80]}')
