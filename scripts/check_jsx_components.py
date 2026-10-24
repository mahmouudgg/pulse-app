import os
import re

src_dir = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src'

html_tags = {
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'input', 
    'form', 'textarea', 'img', 'audio', 'video', 'source', 'a', 'ul', 'li', 'ol',
    'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'main', 'header',
    'footer', 'section', 'article', 'aside', 'nav', 'label', 'select', 'option',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code', 'pre', 'strong', 'b', 'i',
    'em', 'small', 'hr', 'br', 'canvas', 'iframe'
}

issues = []

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.jsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()

            # Find imported identifiers
            imports = set()
            import_matches = re.findall(r'import\s+(?:\{([^}]+)\}|(\w+)|[\*\w\s,]+)\s+from', content)
            for m in import_matches:
                if m[0]: # destructured
                    for item in m[0].split(','):
                        name = item.strip().split(' as ')[-1].strip()
                        if name:
                            imports.add(name)
                if m[1]: # default
                    imports.add(m[1].strip())

            # Find locally declared variables/functions/components
            locals_declared = set(re.findall(r'(?:const|let|var|function)\s+(\w+)', content))

            # Find JSX component usages: <UpperCase...
            jsx_components = set(re.findall(r'<([A-Z]\w+)', content))

            for comp in jsx_components:
                if comp not in imports and comp not in locals_declared and comp not in {'React', 'Fragment'}:
                    issues.append(f"{f}: Component <{comp}> might be undefined (not in imports or locals)")

if issues:
    print(f"Found {len(issues)} possible undefined components:")
    for iss in issues[:20]:
        print("  -", iss)
else:
    print("ALL JSX components are properly defined and imported!")
