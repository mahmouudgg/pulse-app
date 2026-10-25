import os
import re

BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src"

def audit():
    print("=== ARCHITECTURAL AUDIT ===")
    
    # 1. Check all pages vs App.jsx
    with open(os.path.join(BASE_DIR, "App.jsx"), "r", encoding="utf-8") as f:
        app_text = f.read()

    pages = os.listdir(os.path.join(BASE_DIR, "pages"))
    print(f"\nTotal pages in src/pages ({len(pages)}):")
    for p in sorted(pages):
        name = p.replace(".jsx", "")
        in_app = name in app_text
        # find where else it's used
        other_usages = []
        for root, dirs, files in os.walk(BASE_DIR):
            for f in files:
                if f != p and f != "App.jsx" and f.endswith((".js", ".jsx")):
                    with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as fp:
                        if name in fp.read():
                            other_usages.append(f)
        print(f"  {p:30} in App: {str(in_app):5} | other uses: {len(other_usages)} {other_usages[:2]}")

    # 2. Check all services
    services = os.listdir(os.path.join(BASE_DIR, "services"))
    print(f"\nTotal services in src/services ({len(services)}):")
    for s in sorted(services):
        name = s.replace(".js", "")
        usages = []
        for root, dirs, files in os.walk(BASE_DIR):
            for f in files:
                if f != s and f.endswith((".js", ".jsx")):
                    with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as fp:
                        if name in fp.read():
                            usages.append(f)
        print(f"  {s:35} usages: {len(usages):2} {usages[:3]}")

if __name__ == "__main__":
    audit()
