import sys
import requests

url = "https://api.cloudinary.com/v1_1/dgskw7nki/image/upload"

# Test with a simple PNG or base64
headers = {"User-Agent": "Mozilla/5.0"}
img_res = requests.get("https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/512px-X_logo_2023.svg.png", headers=headers)
print("Fetch status:", img_res.status_code, "Bytes:", len(img_res.content))

if img_res.status_code == 200:
    upload_res = requests.post(url, data={"upload_preset": "dgskw7nki"}, files={"file": ("x_logo.png", img_res.content, "image/png")})
    print("Cloudinary status:", upload_res.status_code)
    if upload_res.status_code == 200:
        data = upload_res.json()
        print("Secure URL:", data.get("secure_url"))
    else:
        print("Upload error:", upload_res.text)
