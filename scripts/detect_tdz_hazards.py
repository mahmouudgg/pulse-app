import os
import re

src_dir = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src'

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.jsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                lines = file.readlines()

            declared = {}
            for idx, line in enumerate(lines):
                for m in re.finditer(r'(?:const|let)\s+(?:\[([^\]]+)\]|\{([^}]+)\}|([A-Za-z0-9_$]+))\s*=', line):
                    if m.group(1):
                        for item in m.group(1).split(','):
                            v = item.strip().split(':')[0].strip()
                            if v and v not in declared: declared[v] = idx + 1
                    elif m.group(2):
                        for item in m.group(2).split(','):
                            v = item.strip().split(':')[-1].strip()
                            if v and v not in declared: declared[v] = idx + 1
                    elif m.group(3):
                        v = m.group(3).strip()
                        if v and v not in declared: declared[v] = idx + 1

            for idx, line in enumerate(lines):
                # Look for dependency array at end of useEffect: }, [a, b, c]);
                m = re.search(r'\},\s*\[([^\]]+)\]\);?', line)
                if m:
                    deps = [d.strip() for d in m.group(1).split(',') if d.strip()]
                    for dep in deps:
                        if dep in declared and declared[dep] > (idx + 1):
                            print(f"TDZ Hazard in {f}: '{dep}' used at line {idx+1} but declared at line {declared[dep]}!")
