with open(r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js', 'rb') as f:
    content = f.read(5000)
    print("Has CRLF:", b'\r\n' in content)
