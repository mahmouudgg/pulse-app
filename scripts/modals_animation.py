import os

files_to_check = [
    ('src/components/NewChatModal.jsx', 'rounded-t-3xl sm:rounded-3xl p-5', 'animate-sheet-up'),
    ('src/components/LinkedDevicesModal.jsx', 'rounded-t-[32px] sm:rounded-3xl p-4 sm:p-6', 'animate-sheet-up'),
    ('src/components/CreateSpaceModal.jsx', 'rounded-t-3xl sm:rounded-3xl p-6', 'animate-sheet-up'),
    ('src/components/SafeLinkModal.jsx', 'animate-in fade-in zoom-in-95 duration-200', 'animate-sheet-up'),
    ('src/components/UpdateModal.jsx', 'animate-scale-up', 'animate-sheet-up')
]

for file_rel, target, replacement in files_to_check:
    if os.path.exists(file_rel):
        with open(file_rel, 'r', encoding='utf-8') as f:
            c = f.read()
        if target in c:
            if replacement in ['animate-sheet-up'] and target != replacement:
                if target in ['animate-in fade-in zoom-in-95 duration-200', 'animate-scale-up']:
                    c = c.replace(target, replacement)
                else:
                    if replacement not in c:
                        c = c.replace(target, f'{target} {replacement}')
            with open(file_rel, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'Updated {file_rel}')
        else:
            print(f'Target not found in {file_rel}')
