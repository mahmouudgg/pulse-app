const https = require('https');

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dgskw7nki/image/upload';
const FIREBASE_BASE_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com';

const BRANDS = [
  {
    uid: 'user_brand_tiktok',
    username: 'tiktok',
    displayName: 'TikTok',
    bio: 'Make Your Day. Real people. Real videos. The leading destination for short-form mobile video.',
    location: 'Culver City, CA',
    website: 'https://www.tiktok.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#010101"/>
  <path fill="#25F4EE" d="M374.3 172.8c-28.7-2.9-53-17.7-67.6-40.7-3.9-6.2-6.9-13-8.8-20.2h-57.5v221.7c0 40.5-32.9 73.4-73.4 73.4-23.7 0-44.8-11.3-58.3-28.8-13.5-17.5-17.6-40.4-11.2-61.9 8.2-27.4 33.2-46.7 61.8-46.7 7.7 0 15.1 1.4 22 4.1v-60.6c-7.3-1-14.7-1.5-22-1.5-72.3 0-131 58.7-131 131s58.7 131 131 131c71.6 0 129.9-57.6 131-128.9l.4-142.1c25.4 18.2 56.4 29.1 89.8 29.8v-66.6h-6.2z"/>
  <path fill="#FE2C55" d="M380.5 178.8c-28.7-2.9-53-17.7-67.6-40.7-3.9-6.2-6.9-13-8.8-20.2h-57.5v221.7c0 40.5-32.9 73.4-73.4 73.4-23.7 0-44.8-11.3-58.3-28.8-13.5-17.5-17.6-40.4-11.2-61.9 8.2-27.4 33.2-46.7 61.8-46.7 7.7 0 15.1 1.4 22 4.1v-60.6c-7.3-1-14.7-1.5-22-1.5-72.3 0-131 58.7-131 131s58.7 131 131 131c71.6 0 129.9-57.6 131-128.9l.4-142.1c25.4 18.2 56.4 29.1 89.8 29.8v-66.6h-6.2z" transform="translate(6, 6)"/>
  <path fill="#FFFFFF" d="M374.3 172.8c-28.7-2.9-53-17.7-67.6-40.7-3.9-6.2-6.9-13-8.8-20.2h-57.5v221.7c0 40.5-32.9 73.4-73.4 73.4-23.7 0-44.8-11.3-58.3-28.8-13.5-17.5-17.6-40.4-11.2-61.9 8.2-27.4 33.2-46.7 61.8-46.7 7.7 0 15.1 1.4 22 4.1v-60.6c-7.3-1-14.7-1.5-22-1.5-72.3 0-131 58.7-131 131s58.7 131 131 131c71.6 0 129.9-57.6 131-128.9l.4-142.1c25.4 18.2 56.4 29.1 89.8 29.8v-66.6h-6.2z"/>
</svg>`
  },
  {
    uid: 'user_brand_instagram',
    username: 'instagram',
    displayName: 'Instagram',
    bio: 'Bringing you closer to the people and things you love.',
    location: 'Menlo Park, CA',
    website: 'https://www.instagram.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="igGrad" cx="30%" cy="105%" r="130%">
      <stop offset="0%" stop-color="#FFDD55"/>
      <stop offset="10%" stop-color="#FF543E"/>
      <stop offset="50%" stop-color="#C837AB"/>
      <stop offset="100%" stop-color="#4B5BEA"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#igGrad)"/>
  <rect x="96" y="96" width="320" height="320" rx="76" fill="none" stroke="#FFFFFF" stroke-width="34"/>
  <circle cx="256" cy="256" r="76" fill="none" stroke="#FFFFFF" stroke-width="34"/>
  <circle cx="344" cy="168" r="22" fill="#FFFFFF"/>
</svg>`
  },
  {
    uid: 'user_brand_x',
    username: 'x',
    displayName: 'X',
    bio: "What's happening in the world and what people are talking about right now.",
    location: 'San Francisco, CA',
    website: 'https://x.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <path d="M389.2 88h70.6L305.6 264.2 487 504H345L233.7 358.6 106.5 504H35.8L200.7 315.5 26.8 88H172.4L272.9 220.9 389.2 88zM364.4 461.8h39.1L151.1 128.3h-42L364.4 461.8z" fill="#FFFFFF"/>
</svg>`
  },
  {
    uid: 'user_brand_youtube',
    username: 'youtube',
    displayName: 'YouTube',
    bio: 'Our mission is to give everyone a voice and show them the world.',
    location: 'San Bruno, CA',
    website: 'https://www.youtube.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#0F0F0F"/>
  <rect x="64" y="128" width="384" height="256" rx="72" fill="#FF0000"/>
  <polygon points="216,192 336,256 216,320" fill="#FFFFFF"/>
</svg>`
  },
  {
    uid: 'user_brand_apple',
    username: 'apple',
    displayName: 'Apple',
    bio: 'Think different. Discover the innovative world of Apple and shop iPhone, iPad, Apple Watch, Mac, and Apple TV.',
    location: 'Cupertino, CA',
    website: 'https://www.apple.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <path d="M336.5 241.7c-.5-51 41.6-75.6 43.5-76.8-23.7-34.6-60.5-39.4-73.6-39.9-31.4-3.2-61.2 18.5-77.2 18.5-15.9 0-40.7-18-66.8-17.6-34.4.5-66.1 20-83.8 50.8-35.8 62.1-9.2 154 25.5 204.1 17 24.5 37.2 52.1 63.8 51.1 25.5-1 35.2-16.5 66.1-16.5 30.9 0 39.7 16.5 66.4 16 27.3-.5 44.6-25 61.2-49.5 19.3-28.2 27.2-55.5 27.7-56.9-1.2-.5-53.1-20.4-52.8-83.3zM294.6 98.7c14.2-17.2 23.7-41.1 21.1-65-20.4.8-45.2 13.6-59.8 30.7-12.8 14.9-24 39.2-21 62.6 22.8 1.8 46.1-11.4 59.7-28.3z" fill="#FFFFFF"/>
</svg>`
  },
  {
    uid: 'user_brand_google',
    username: 'google',
    displayName: 'Google',
    bio: "Our mission is to organize the world's information and make it universally accessible and useful.",
    location: 'Mountain View, CA',
    website: 'https://www.google.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#FFFFFF"/>
  <path d="M424 256c0-14.7-1.3-28.9-3.7-42.7H256v81.1h94.3c-4.1 22.1-16.5 40.8-35.2 53.4v44.4h57c33.3-30.7 51.9-75.9 51.9-136.2z" fill="#4285F4"/>
  <path d="M256 427.3c46.2 0 85-15.3 113.3-41.5l-57-44.4c-15.3 10.3-34.9 16.4-56.3 16.4-43.3 0-80-29.2-93.1-68.6H104v45.7c28.3 56.2 86.6 92.4 152 92.4z" fill="#34A853"/>
  <path d="M162.9 289.2c-3.4-10.2-5.3-21.1-5.3-33.2s1.9-23 5.3-33.2V177.1H104C92.6 199.8 86.1 226.7 86.1 256s6.5 56.2 17.9 78.9l58.9-45.7z" fill="#FBBC05"/>
  <path d="M256 142.1c25.1 0 47.7 8.6 65.4 25.5l49-49C340.8 90.4 302.1 74.7 256 74.7c-65.4 0-123.7 36.2-152 92.4l58.9 45.7c13.1-39.4 49.8-68.7 93.1-68.7z" fill="#EA4335"/>
</svg>`
  },
  {
    uid: 'user_brand_telegram',
    username: 'telegram',
    displayName: 'Telegram',
    bio: 'A new era of messaging. Fast, cloud-based and private.',
    location: 'Dubai, UAE',
    website: 'https://telegram.org',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="240" fill="#24A1DE"/>
  <path d="M115 251l246-101c11-5 21 3 17 19l-42 198c-3 14-11 18-23 11l-64-47-31 30c-3 3-6 6-13 6l4-64 117-106c5-5-1-7-8-3L167 290l-62-19c-14-4-14-14 10-20z" fill="#FFFFFF"/>
</svg>`
  },
  {
    uid: 'user_brand_spotify',
    username: 'spotify',
    displayName: 'Spotify',
    bio: 'Listening is everything. Millions of songs and podcasts on any device.',
    location: 'Stockholm, Sweden',
    website: 'https://www.spotify.com',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="240" fill="#1DB954"/>
  <path d="M351.6 345.9c-4.2 6.9-13.2 9.1-20.1 4.9-55.2-33.7-124.6-41.3-206.5-22.6-7.9 1.8-15.8-3.1-17.6-11-1.8-7.9 3.1-15.8 11-17.6 89.6-20.5 166.2-11.8 228.3 26.2 6.9 4.2 9.1 13.2 4.9 20.1zm28.3-62.9c-5.3 8.6-16.6 11.3-25.2 6-63.1-38.8-159.3-50-234-27.3-9.8 3-20.3-2.6-23.3-12.4-3-9.8 2.6-20.3 12.4-23.3 85.5-25.9 191.4-13.2 264.1 31.6 8.6 5.4 11.3 16.7 6 25.4zm2.4-65.7c-75.7-44.9-200.7-49.1-272.7-27.2-11.6 3.5-23.9-3.1-27.4-14.7-3.5-11.6 3.1-23.9 14.7-27.4 82.8-25.1 220.8-20.2 307.7 31.4 10.4 6.2 13.9 19.6 7.7 30-6.2 10.5-19.6 13.9-30 7.9z" fill="#000000"/>
</svg>`
  }
];

function uploadToCloudinary(svgContent, publicId) {
  return new Promise((resolve, reject) => {
    const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
    const postData = JSON.stringify({
      file: dataUri,
      upload_preset: 'dgskw7nki',
      folder: 'pulse_official_brands',
      public_id: publicId
    });

    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: '/v1_1/dgskw7nki/image/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.secure_url);
          } catch (e) {
            reject(new Error('Invalid Cloudinary JSON: ' + body));
          }
        } else {
          reject(new Error(`Cloudinary upload failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function putToFirebase(path, data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const options = {
      hostname: 'sahra-f4ec6-default-rtdb.firebaseio.com',
      port: 443,
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error(`Firebase PUT ${path} failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log(`[Brand Deployment] Deploying ${BRANDS.length} official brand accounts to Cloudinary & Firebase...`);
  const nowIso = new Date().toISOString();

  for (const b of BRANDS) {
    try {
      console.log(`[Cloudinary] Uploading official logo for @${b.username}...`);
      const cloudinaryUrl = await uploadToCloudinary(b.svg, `brand_logo_${b.username}`);
      console.log(`[Cloudinary] Uploaded @${b.username}: ${cloudinaryUrl}`);

      const userRecord = {
        uid: b.uid,
        username: b.username,
        displayName: b.displayName,
        avatar: cloudinaryUrl,
        bio: b.bio,
        location: b.location,
        website: b.website,
        email: `official_${b.username}@pulse.app`,
        
        // Strict verification & NO pioneer badge
        isVerified: true,
        verificationStatus: 'verified',
        isFounder: false,
        isPioneer: false,
        pioneerNumber: null,
        badgeTitle: null,
        isOfficial: true,
        isBanned: false,
        
        // Social graph baseline
        followers: [],
        followersCount: 0,
        following: [],
        followingCount: 0,
        bookmarks: [],
        profileViews: 0,
        
        createdAt: nowIso,
        usernameLastChangedAt: nowIso
      };

      console.log(`[Firebase] Writing user record for @${b.username} (UID: ${b.uid})...`);
      await putToFirebase(`/users/${b.uid}.json`, userRecord);
      console.log(`[Firebase] @${b.username} successfully registered and verified in RTDB!`);
    } catch (err) {
      console.error(`[Error] Failed processing brand @${b.username}:`, err.message);
    }
  }

  console.log('[Brand Deployment] All official brand accounts successfully provisioned in Cloudinary & Firebase.');
}

main().catch(console.error);
