import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
src_dir = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src"

def is_emoji(char):
    code = ord(char)
    # Check common emoji ranges
    return (
        0x1F600 <= code <= 0x1F64F or # Emoticons
        0x1F300 <= code <= 0x1F5FF or # Misc Symbols and Pictographs
        0x1F680 <= code <= 0x1F6FF or # Transport and Map
        0x1F1E0 <= code <= 0x1F1FF or # Flags
        0x2702   <= code <= 0x27B0   or # Dingbats
        0x24C2   <= code <= 0x1F251 or # Enclosed characters
        0x1F900 <= code <= 0x1F9FF or # Supplemental Symbols and Pictographs
        0x1FA70 <= code <= 0x1FAFF or # Symbols and Pictographs Extended-A
        0x2600   <= code <= 0x26FF    # Misc symbols (like sun, warning, check, etc.)
    )

emoji_findings = []

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.jsx', '.js', '.css', '.html')):
            file_path = os.path.join(root, f)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as fp:
                for line_num, line in enumerate(fp, 1):
                    for char in line:
                        if is_emoji(char):
                            # Exclude normal punctuation / symbols if any
                            emoji_findings.append((file_path, line_num, char, hex(ord(char))))

print(f"Total emoji findings: {len(emoji_findings)}", flush=True)
for item in emoji_findings[:15]:
    print(f"  {item[0]}:{item[1]} -> {item[2]} ({item[3]})", flush=True)
