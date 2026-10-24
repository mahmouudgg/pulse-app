import os
import re

issues = []
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            
            # Check for useEffect usage
            if re.search(r'\buseEffect\b', content):
                # Check if imported
                if not re.search(r'import\s+.*?\buseEffect\b.*?\s+from', content) and not re.search(r'React\.useEffect', content):
                    issues.append(f"{path}: uses useEffect but does not import it!")
            
            # Check for Film usage
            if re.search(r'\bFilm\b', content):
                if not re.search(r'import\s+.*?\bFilm\b.*?\s+from', content):
                    issues.append(f"{path}: uses Film but does not import it!")

print(f"Total issues found: {len(issues)}")
for iss in issues:
    print(iss)
