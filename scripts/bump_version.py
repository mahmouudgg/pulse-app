import os

# 1. package.json
with open('package.json', 'r', encoding='utf-8') as f:
    pkg = f.read()
pkg = pkg.replace('"version": "1.0.1"', '"version": "1.0.2"')
with open('package.json', 'w', encoding='utf-8') as f:
    f.write(pkg)
print('Updated package.json')

# 2. android/app/build.gradle
gradle_path = os.path.join('android', 'app', 'build.gradle')
with open(gradle_path, 'r', encoding='utf-8') as f:
    gradle = f.read()
gradle = gradle.replace('versionCode 2', 'versionCode 3')
gradle = gradle.replace('versionName "1.0.1"', 'versionName "1.0.2"')
with open(gradle_path, 'w', encoding='utf-8') as f:
    f.write(gradle)
print('Updated build.gradle')

# 3. src/services/updateService.js
update_path = os.path.join('src', 'services', 'updateService.js')
with open(update_path, 'r', encoding='utf-8') as f:
    upd = f.read()
upd = upd.replace("versionName: '1.0.1'", "versionName: '1.0.2'")
upd = upd.replace("versionCode: 2", "versionCode: 3")
with open(update_path, 'w', encoding='utf-8') as f:
    f.write(upd)
print('Updated updateService.js')
