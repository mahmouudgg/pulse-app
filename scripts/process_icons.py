import os
from PIL import Image

BRAIN_DIR = r"C:\Users\DELL\.gemini\antigravity\brain\39f6d3b5-cbb8-4d08-8f55-fcc5aee1f664"
PUBLIC_ICONS_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\public\icons"
RES_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\android\app\src\main\res"

os.makedirs(PUBLIC_ICONS_DIR, exist_ok=True)

ICONS = {
    'default': os.path.join(BRAIN_DIR, '.user_uploaded', 'media_1792100226833.png'),
    'titanium': os.path.join(BRAIN_DIR, 'pulse_icon_titanium_1792098441118.jpg'),
    'cyber': os.path.join(BRAIN_DIR, 'pulse_icon_cyber_1792098460110.jpg'),
    'gold': os.path.join(BRAIN_DIR, 'pulse_icon_gold_1792098480509.jpg'),
    'crimson': os.path.join(BRAIN_DIR, 'pulse_icon_crimson_1792098501273.jpg'),
    'midnight': os.path.join(BRAIN_DIR, 'pulse_icon_midnight_1792098522162.jpg'),
}

# 1. Save 512x512 high-res web preview PNGs in public/icons
for key, src_path in ICONS.items():
    if not os.path.exists(src_path):
        continue
    img = Image.open(src_path).convert('RGBA')
    web_img = img.resize((512, 512), Image.Resampling.LANCZOS)
    dest_path = os.path.join(PUBLIC_ICONS_DIR, f"{key}.png")
    web_img.save(dest_path, "PNG", optimize=True)

# Replace public/pulse_logo_clean.png with default icon
default_img = Image.open(ICONS['default']).convert('RGBA')
default_img.resize((512, 512), Image.Resampling.LANCZOS).save(
    r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\public\pulse_logo_clean.png", "PNG"
)

# 2. Android Mipmap densities for full icon and adaptive foreground
# Standard icon sizes: mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192
# Adaptive foreground sizes (108dp): mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432
DENSITIES = {
    'mipmap-mdpi': (48, 108),
    'mipmap-hdpi': (72, 162),
    'mipmap-xhdpi': (96, 216),
    'mipmap-xxhdpi': (144, 324),
    'mipmap-xxxhdpi': (192, 432),
}

for folder, (size, fg_size) in DENSITIES.items():
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    for key, src_path in ICONS.items():
        base_img = Image.open(src_path).convert('RGBA')
        
        # Regular icon
        icon_img = base_img.resize((size, size), Image.Resampling.LANCZOS)
        if key == 'default':
            icon_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
            icon_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        else:
            icon_img.save(os.path.join(folder_path, f"ic_launcher_{key}.png"), "PNG")
            icon_img.save(os.path.join(folder_path, f"ic_launcher_{key}_round.png"), "PNG")

        # Adaptive foreground: 108dp canvas with safe inner content (66% scale)
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        inner_size = int(fg_size * 0.72)
        scaled_img = base_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_canvas.paste(scaled_img, (offset, offset))
        
        if key == 'default':
            fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
        else:
            fg_canvas.save(os.path.join(folder_path, f"ic_launcher_{key}_fg.png"), "PNG")

# 3. Update anydpi-v26 XMLs to point to the foreground PNGs and pure black background
ANYDPI_DIR = os.path.join(RES_DIR, "mipmap-anydpi-v26")
os.makedirs(ANYDPI_DIR, exist_ok=True)

for key in ICONS.keys():
    xml_name = "ic_launcher.xml" if key == 'default' else f"ic_launcher_{key}.xml"
    fg_drawable = "@mipmap/ic_launcher_foreground" if key == 'default' else f"@mipmap/ic_launcher_{key}_fg"
    xml_content = f'''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="{fg_drawable}"/>
</adaptive-icon>
'''
    with open(os.path.join(ANYDPI_DIR, xml_name), 'w', encoding='utf-8') as f:
        f.write(xml_content)

print("Icons and adaptive XMLs fully configured.")
