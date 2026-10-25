import requests
import re

r = requests.get('https://mahmouudgg.github.io/pulse-app/')
html = r.text

canonical = re.search(r'<link rel="canonical" href="([^"]+)"', html)
og_image = re.search(r'<meta property="og:image" content="([^"]+)"', html)
tw_card = re.search(r'<meta name="twitter:card" content="([^"]+)"', html)
schema = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)

print('Canonical:', canonical.group(1) if canonical else 'NOT FOUND')
print('OG Image:', og_image.group(1) if og_image else 'NOT FOUND')
print('Twitter Card:', tw_card.group(1) if tw_card else 'NOT FOUND')
print('Schema JSON-LD Valid:', bool(schema and 'WebSite' in schema.group(1) and 'Organization' in schema.group(1)))
