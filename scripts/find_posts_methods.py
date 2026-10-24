with open('src/services/storageService.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'savePost' in l or 'addPost' in l or 'publishPost' in l or 'set(ref(database, `posts/' in l:
        print(f'{i+1}: {l.strip()[:100]}')
