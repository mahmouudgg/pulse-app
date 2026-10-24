import os
import re

src_dir = r"src"
results = []
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith((".jsx", ".js")):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8", errors="ignore") as fp:
                for idx, line in enumerate(fp, 1):
                    line_lower = line.lower()
                    if "avatar" in line_lower and ("src=" in line or "default_avatar" in line or "onerror" in line_lower):
                        results.append(f"{path}:{idx}: {line.strip()[:120]}")

print(f"Total matches: {len(results)}")
for r in results:
    print(r)
