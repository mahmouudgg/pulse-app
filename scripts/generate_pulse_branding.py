import os
import math
from PIL import Image, ImageDraw

def draw_soundwave(draw, cx, cy, total_width, max_height, bar_width, color=(255, 255, 255, 255)):
    # 5 bars symmetrically placed around cx
    # relative heights
    height_ratios = [0.32, 0.64, 1.0, 0.64, 0.32]
    # bar spacing
    num_bars = 5
    spacing = (total_width - (num_bars * bar_width)) / (num_bars - 1)
    
    start_x = cx - total_width / 2.0 + bar_width / 2.0
    
    for i, ratio in enumerate(height_ratios):
        bx = start_x + i * (bar_width + spacing)
        h = max_height * ratio
        top_y = cy - h / 2.0
        bottom_y = cy + h / 2.0
        
        # Draw rounded bar (pill)
        radius = bar_width / 2.0
        # draw line with pill ends
        draw.line([(bx, top_y + radius), (bx, bottom_y - radius)], fill=color, width=int(round(bar_width)))
        draw.ellipse([bx - radius, top_y, bx + radius, top_y + bar_width], fill=color)
        draw.ellipse([bx - radius, bottom_y - bar_width, bx + radius, bottom_y], fill=color)

def generate_supersampled_icon(size, is_circle=False, is_squircle=True, transparent_bg=False):
    # Render at 4x for smooth anti-aliasing
    scale = 4
    canvas_size = size * scale
    
    if transparent_bg:
        img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 255))
        
    draw = ImageDraw.Draw(img)
    
    cx = canvas_size / 2.0
    cy = canvas_size / 2.0
    
    if not transparent_bg:
        if is_circle:
            draw.ellipse([0, 0, canvas_size, canvas_size], fill=(0, 0, 0, 255))
        elif is_squircle:
            # draw dark squircle with subtle border
            radius = int(canvas_size * 0.28)
            draw.rounded_rectangle([2, 2, canvas_size - 2, canvas_size - 2], radius=radius, fill=(5, 5, 6, 255), outline=(38, 38, 43, 255), width=max(1, int(round(1.5 * scale))))
        else:
            draw.rectangle([0, 0, canvas_size, canvas_size], fill=(0, 0, 0, 255))
            
    # Soundwave dimensions
    wave_width = canvas_size * 0.54
    wave_max_height = canvas_size * 0.54
    bar_width = wave_width * 0.115
    
    draw_soundwave(draw, cx, cy, wave_width, wave_max_height, bar_width, color=(255, 255, 255, 255))
    
    # Downscale with high-quality Lanczos
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_notification_icon(size):
    # Pure white silhouette on transparent background
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx = canvas_size / 2.0
    cy = canvas_size / 2.0
    
    # Status bar icons have slightly more padding (fit inside 70% viewport)
    wave_width = canvas_size * 0.70
    wave_max_height = canvas_size * 0.70
    bar_width = wave_width * 0.125
    
    draw_soundwave(draw, cx, cy, wave_width, wave_max_height, bar_width, color=(255, 255, 255, 255))
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_splash_screen(width, height):
    # Centered soundwave on pitch black #000000
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    
    # To keep it anti-aliased, render the logo on a high-res patch then paste it
    logo_size = min(width, height)
    # The logo should occupy approx 22% of the screen dimension
    target_wave_size = int(round(logo_size * 0.22))
    if target_wave_size < 40:
        target_wave_size = 40
        
    scale = 4
    patch_size = target_wave_size * scale
    patch = Image.new("RGBA", (patch_size, patch_size), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(patch)
    
    cx = patch_size / 2.0
    cy = patch_size / 2.0
    wave_width = patch_size * 0.85
    wave_max_height = patch_size * 0.85
    bar_width = wave_width * 0.115
    
    draw_soundwave(pdraw, cx, cy, wave_width, wave_max_height, bar_width, color=(255, 255, 255, 255))
    patch = patch.resize((target_wave_size, target_wave_size), Image.Resampling.LANCZOS)
    
    # Center on canvas
    px = (width - target_wave_size) // 2
    py = (height - target_wave_size) // 2
    img.paste(patch, (px, py), patch)
    return img

def main():
    print("Generating official PULSE brand assets...")
    
    # 1. Main Clean Logo (512x512) for web, share cards, and public assets
    logo_512 = generate_supersampled_icon(512, is_squircle=True)
    logo_512.save("public/pulse_logo_clean.png", "PNG")
    logo_512.convert("RGB").save("public/logo.jpg", "JPEG", quality=98)
    logo_512.convert("RGB").save("logo.jpg", "JPEG", quality=98)
    if os.path.exists("assets"):
        logo_512.save("assets/pulse_logo_clean.png", "PNG")
    print("[OK] Generated public/pulse_logo_clean.png, public/logo.jpg")

    # 2. Android notification silhouette icons
    stat_sizes = {
        "android/app/src/main/res/drawable-mdpi": 24,
        "android/app/src/main/res/drawable-hdpi": 36,
        "android/app/src/main/res/drawable-xhdpi": 48,
        "android/app/src/main/res/drawable-xxhdpi": 72,
        "android/app/src/main/res/drawable-xxxhdpi": 96,
        "android/app/src/main/res/drawable": 48,
    }
    for folder, sz in stat_sizes.items():
        os.makedirs(folder, exist_ok=True)
        stat_img = generate_notification_icon(sz)
        stat_img.save(os.path.join(folder, "ic_stat_pulse.png"), "PNG")
    print("[OK] Generated ic_stat_pulse.png notification silhouette drawables")

    # 3. Android launcher icons
    mipmap_configs = [
        ("android/app/src/main/res/mipmap-mdpi", 48, 108),
        ("android/app/src/main/res/mipmap-hdpi", 72, 162),
        ("android/app/src/main/res/mipmap-xhdpi", 96, 216),
        ("android/app/src/main/res/mipmap-xxhdpi", 144, 324),
        ("android/app/src/main/res/mipmap-xxxhdpi", 192, 432),
    ]
    for folder, icon_sz, fg_sz in mipmap_configs:
        os.makedirs(folder, exist_ok=True)
        # Standard launcher
        icon = generate_supersampled_icon(icon_sz, is_squircle=True)
        icon.save(os.path.join(folder, "ic_launcher.png"), "PNG")
        # Round launcher
        icon_round = generate_supersampled_icon(icon_sz, is_circle=True)
        icon_round.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
        # Foreground (transparent background, centered wave)
        fg = generate_supersampled_icon(fg_sz, transparent_bg=True)
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
    print("[OK] Generated Android launcher icons across all densities")

    # 4. Android splash screens
    splash_targets = [
        ("android/app/src/main/res/drawable/splash.png", 480, 320),
        ("android/app/src/main/res/drawable-port-mdpi/splash.png", 320, 480),
        ("android/app/src/main/res/drawable-port-hdpi/splash.png", 480, 800),
        ("android/app/src/main/res/drawable-port-xhdpi/splash.png", 720, 1280),
        ("android/app/src/main/res/drawable-port-xxhdpi/splash.png", 960, 1600),
        ("android/app/src/main/res/drawable-port-xxxhdpi/splash.png", 1280, 1920),
        ("android/app/src/main/res/drawable-land-mdpi/splash.png", 480, 320),
        ("android/app/src/main/res/drawable-land-hdpi/splash.png", 800, 480),
        ("android/app/src/main/res/drawable-land-xhdpi/splash.png", 1280, 720),
        ("android/app/src/main/res/drawable-land-xxhdpi/splash.png", 1600, 960),
        ("android/app/src/main/res/drawable-land-xxxhdpi/splash.png", 1920, 1280),
    ]
    for rel_path, w, h in splash_targets:
        os.makedirs(os.path.dirname(rel_path), exist_ok=True)
        splash_img = generate_splash_screen(w, h)
        splash_img.save(rel_path, "PNG")
    print("[OK] Generated Android splash screens across all dimensions")

if __name__ == "__main__":
    main()
