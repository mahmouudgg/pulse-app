import os
import re
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

print("=== 1. Checking Raw SVGs in src/ ===")
raw_svg_files = []
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                txt = fp.read()
                svg_matches = re.findall(r'<svg[^>]*>.*?</svg>', txt, re.DOTALL)
                if svg_matches:
                    raw_svg_files.append((path, len(svg_matches)))

for p, count in sorted(raw_svg_files, key=lambda x: -x[1])[:15]:
    print(f"  {p}: {count} inline SVGs")

print("\n=== 2. Checking Profile Links in src/ ===")
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                txt = fp.read()
                for line_no, line in enumerate(txt.splitlines(), 1):
                    if any(term in line for term in ['wuaze.com', 'pulseeg', 'copyLink', 'profileUrl']):
                        print(f"  {path}:{line_no} -> {line.strip()[:100]}")

print("\n=== 3. Checking Mention and Verified Badge Colors in src/ ===")
for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                txt = fp.read()
                for line_no, line in enumerate(txt.splitlines(), 1):
                    if 'BadgeCheck' in line or 'badge' in line.lower():
                        if any(c in line for c in ['text-', 'fill-', 'color']):
                            if any(c in line for c in ['purple', 'violet', 'amber', 'yellow', 'emerald', 'sky']):
                                print(f"  Non-standard badge color: {path}:{line_no} -> {line.strip()[:100]}")
                    if '@' in line and any(c in line for c in ['text-purple', 'text-violet', 'text-indigo', 'text-emerald']):
                        print(f"  Non-standard mention color: {path}:{line_no} -> {line.strip()[:100]}")
