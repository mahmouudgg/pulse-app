import base64
import os

p = r'C:\Users\DELL\.gemini\antigravity\brain\39f6d3b5-cbb8-4d08-8f55-fcc5aee1f664\.user_uploaded\media_1792613623600_b9096130.png'
with open(p, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

data_uri = f'data:image/png;base64,{b64}'

content = f'''// Permanent embedded ultra-reliable default avatar Data URI
export const DEFAULT_AVATAR = "{data_uri}";
'''

with open(os.path.join('src', 'utils', 'defaultAvatar.js'), 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Successfully updated src/utils/defaultAvatar.js with embedded Base64 Data URI ({len(data_uri)} chars)')
