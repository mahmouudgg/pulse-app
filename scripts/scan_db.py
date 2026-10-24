import os, re

for root, dirs, files in os.walk('src/services'):
    for f in files:
        if f.endswith('.js'):
            fp = os.path.join(root, f)
            with open(fp, 'r', encoding='utf-8', errors='ignore') as src_file:
                content = src_file.read()
                matches = re.findall(r"(orderBy\w+|equalTo|limitTo\w+)\s*\([^)]*\)", content)
                if matches:
                    print(f, matches)
