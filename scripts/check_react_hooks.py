import os
import re

react_hooks = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext']

issues = []
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            
            # Find React import block
            react_imports = re.findall(r'import\s+React\s*,\s*\{([^}]+)\}\s+from\s+[\'"]react[\'"]', content, re.DOTALL)
            react_destructured = []
            for r in react_imports:
                react_destructured.extend([x.strip() for x in r.split(',') if x.strip()])
            
            # Also check direct imports like import { useEffect } from 'react'
            direct_react = re.findall(r'import\s+\{([^}]+)\}\s+from\s+[\'"]react[\'"]', content, re.DOTALL)
            for d in direct_react:
                react_destructured.extend([x.strip() for x in d.split(',') if x.strip()])
            
            for hook in react_hooks:
                # If hook is used as a standalone call: hook(...)
                if re.search(r'\b' + hook + r'\s*\(', content):
                    # Check if imported or React.hook
                    if hook not in react_destructured and not re.search(r'React\.' + hook, content):
                        issues.append(f"{path}: uses {hook} without importing it!")

print(f"Total React hook issues found: {len(issues)}")
for iss in issues:
    print(iss)
