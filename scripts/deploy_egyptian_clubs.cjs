const https = require('https');

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dgskw7nki/image/upload';
const FIREBASE_BASE_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com';

const CLUBS = [
  {
    uid: 'user_club_alahly',
    username: 'alahly',
    displayName: 'النادي الأهلي',
    bio: 'الحساب الرسمي للنادي الأهلي المصري. نادي القرن الأفريقي والأكثر تتويجا بالبطولات في الشرق الأوسط.',
    location: 'القاهرة، مصر',
    website: 'https://alahlyegypt.com',
    email: 'official_alahly@pulse.app',
    pulseContent: 'جماهير الأهلي الوفية هي السند الدائم والدافع الحقيقي في كل خطوة. يواصل الفريق الأول لكرة القدم تدريباته وتركيزه العالي استعدادا للمواجهات القادمة لمواصلة مسيرة الانتصارات وإسعاد أعظم جمهور في الشرق الأوسط وإفريقيا.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="ahlyRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E30613"/>
      <stop offset="100%" stop-color="#A50009"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD116"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="#0A0A0C"/>
  <path d="M120 70 L392 70 C392 70 412 250 256 442 C100 250 120 70 120 70 Z" fill="url(#ahlyRed)" stroke="url(#goldGrad)" stroke-width="12"/>
  <path d="M144 94 L368 94 C368 94 384 240 256 408 C128 240 144 94 144 94 Z" fill="#FFFFFF"/>
  <rect x="144" y="94" width="224" height="60" fill="#0A0A0C"/>
  <text x="256" y="136" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="2">AL AHLY</text>
  <path d="M256 180 L290 230 L350 238 L306 280 L318 340 L256 308 L194 340 L206 280 L162 238 L222 230 Z" fill="#E30613"/>
  <path d="M256 200 C270 230 300 240 330 240 C300 260 280 290 256 330 C232 290 212 260 182 240 C212 240 242 230 256 200 Z" fill="#0A0A0C"/>
  <circle cx="216" cy="74" r="8" fill="url(#goldGrad)"/>
  <circle cx="242" cy="68" r="8" fill="url(#goldGrad)"/>
  <circle cx="270" cy="68" r="8" fill="url(#goldGrad)"/>
  <circle cx="296" cy="74" r="8" fill="url(#goldGrad)"/>
</svg>`
  },
  {
    uid: 'user_club_zamalek',
    username: 'zamalek',
    displayName: 'نادي الزمالك',
    bio: 'الحساب الرسمي لنادي الزمالك للألعاب الرياضية. الفارس الأبيض ومدرسة الفن والهندسة.',
    location: 'الجيزة، مصر',
    website: 'https://zamaleksc.com',
    email: 'official_zamalek@pulse.app',
    pulseContent: 'جماهير الزمالك العظيمة، أصحاب الوفاء والانتماء الخالص. يواصل الفارس الأبيض تدريباته بروح العزيمة والإصرار والعمل الجماعي لمواصلة تحقيق الانتصارات في كافة الألعاب الرياضية ورفع راية النادي دائما.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="zamRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E31B23"/>
      <stop offset="100%" stop-color="#B20F15"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="#0A0A0C"/>
  <path d="M120 70 L392 70 C392 70 412 250 256 442 C100 250 120 70 120 70 Z" fill="#FFFFFF" stroke="#E31B23" stroke-width="12"/>
  <rect x="140" y="160" width="232" height="26" fill="url(#zamRed)"/>
  <rect x="140" y="210" width="232" height="26" fill="url(#zamRed)"/>
  <circle cx="256" cy="116" r="18" fill="#E31B23"/>
  <path d="M256 260 L240 330 L272 330 Z" fill="#E31B23"/>
  <path d="M236 270 Q210 300 256 360" stroke="#E31B23" stroke-width="12" fill="none" stroke-linecap="round"/>
  <line x1="210" y1="310" x2="310" y2="280" stroke="#E31B23" stroke-width="8" stroke-linecap="round"/>
  <polygon points="314,278 300,270 304,288" fill="#E31B23"/>
</svg>`
  }
];

function uploadToCloudinary(svgContent, publicId) {
  return new Promise((resolve, reject) => {
    const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
    const postData = JSON.stringify({
      file: dataUri,
      upload_preset: 'dgskw7nki',
      folder: 'pulse_sports_clubs',
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
  console.log(`[Egyptian Clubs] Deploying Al Ahly and Zamalek official accounts & pulses...`);
  const now = Date.now();
  const nowIso = new Date().toISOString();

  for (let i = 0; i < CLUBS.length; i++) {
    const club = CLUBS[i];
    try {
      console.log(`[Cloudinary] Uploading official logo for @${club.username}...`);
      const logoUrl = await uploadToCloudinary(club.svg, `club_logo_${club.username}`);
      console.log(`[Cloudinary] Logo uploaded for @${club.username}: ${logoUrl}`);

      const userRecord = {
        uid: club.uid,
        username: club.username,
        displayName: club.displayName,
        avatar: logoUrl,
        bio: club.bio,
        location: club.location,
        website: club.website,
        email: club.email,
        
        // Strict verification & NO pioneer badge
        isVerified: true,
        verificationStatus: 'verified',
        isFounder: false,
        isPioneer: false,
        pioneerNumber: null,
        badgeTitle: null,
        isOfficial: true,
        isBanned: false,
        
        followers: [],
        followersCount: 0,
        following: [],
        followingCount: 0,
        bookmarks: [],
        profileViews: 0,
        
        createdAt: nowIso,
        usernameLastChangedAt: nowIso
      };

      console.log(`[Firebase] Writing user record for @${club.username} (${club.uid})...`);
      await putToFirebase(`/users/${club.uid}.json`, userRecord);
      console.log(`[Firebase] User @${club.username} saved successfully!`);

      // Publish an authentic official pulse
      const postTimestampMs = now - (i * 20 * 60 * 1000);
      const postDateIso = new Date(postTimestampMs).toISOString();
      const postId = `post_official_${club.username}_${postTimestampMs}`;

      const pulsePayload = {
        id: postId,
        authorId: club.uid,
        authorUsername: club.username,
        author: {
          uid: club.uid,
          username: club.username,
          displayName: club.displayName,
          avatar: logoUrl,
          isVerified: true,
          verificationStatus: 'verified',
          isFounder: false,
          isPioneer: false,
          pioneerNumber: null,
          badgeTitle: null,
          isOfficial: true,
          isPrivate: false
        },
        content: club.pulseContent,
        imageUrl: null,
        videoUrl: null,
        audioUrl: null,
        hasVoice: false,
        likes: [],
        likesCount: 0,
        reposts: [],
        repostsCount: 0,
        repliesCount: 0,
        bookmarksCount: 0,
        isOfficial: true,
        isOfficialClubPost: true,
        origin: 'club_official_announcement',
        createdAt: postDateIso
      };

      console.log(`[Firebase] Publishing official pulse for @${club.username} (${postId})...`);
      await putToFirebase(`/posts/${postId}.json`, pulsePayload);
      console.log(`[Firebase] Official pulse for @${club.username} published successfully!`);
    } catch (err) {
      console.error(`[Error] Failed processing @${club.username}:`, err.message);
    }
  }

  console.log('[Egyptian Clubs] All official clubs and pulses successfully deployed!');
}

main().catch(console.error);
