import os, shutil

src = r'android/app/build/outputs/apk/debug/app-debug.apk'
dst1 = r'Pulse-v1.0.apk'
dst2 = r'landing/Pulse-v1.0.apk'

if os.path.exists(src):
    shutil.copy2(src, dst1)
    print("Copied to", dst1, f"({os.path.getsize(dst1)/(1024*1024):.2f} MB)")
    if os.path.exists(r'landing'):
        shutil.copy2(src, dst2)
        print("Copied to", dst2)
else:
    print("Source APK not found:", src)
