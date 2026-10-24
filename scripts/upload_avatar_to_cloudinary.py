import os
import requests

image_path = r"C:\Users\DELL\.gemini\antigravity\brain\39f6d3b5-cbb8-4d08-8f55-fcc5aee1f664\.user_uploaded\media_1792613623600_b9096130.png"
cloud_name = "dgskw7nki"
upload_preset = "dgskw7nki"
url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

with open(image_path, "rb") as f:
    files = {"file": f}
    data = {
        "upload_preset": upload_preset,
        "folder": "pulse_avatars",
        "public_id": "pulse_default_avatar_dark"
    }
    resp = requests.post(url, files=files, data=data)

print(f"Status: {resp.status_code}")
res_json = resp.json()
print("Response:", res_json)
if "secure_url" in res_json:
    print(f"SECURE_URL: {res_json['secure_url']}")
    # Write to a file for easy reading
    with open("scripts/cloudinary_avatar_url.txt", "w") as out:
        out.write(res_json["secure_url"])
else:
    print("Error:", res_json)
