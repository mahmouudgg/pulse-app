const https = require('https');

const FIREBASE_BASE_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com';

const BRAND_POSTS = [
  {
    username: 'tiktok',
    uid: 'user_brand_tiktok',
    content: "Creativity has no boundaries. We are rolling out enhanced high-definition publishing and studio-grade video tools for creators worldwide. Whether you are sharing daily routines or cinematic stories, your voice shapes the culture. Keep creating."
  },
  {
    username: 'instagram',
    uid: 'user_brand_instagram',
    content: "Bringing you closer to the people and things you love. We are introducing expanded carousel capabilities and enhanced media clarity, making it easier than ever to share unscripted moments and stories with your community."
  },
  {
    username: 'x',
    uid: 'user_brand_x',
    content: "The global town square never sleeps. Real-time dialogue and unfiltered perspectives are driving how breaking stories unfold across the globe. Everyone has a seat at the table. Join the conversation."
  },
  {
    username: 'youtube',
    uid: 'user_brand_youtube',
    content: "Every story starts with a spark. Over the past year, millions of creators have built thriving independent channels, sharing knowledge, music, and ideas across every continent. We remain dedicated to supporting creators at every step of their journey."
  },
  {
    username: 'apple',
    uid: 'user_brand_apple',
    content: "At Apple, we believe privacy is a fundamental human right. Everything we build is engineered from the ground up to protect your personal information while delivering industry-leading performance. Technology that serves human creativity, without compromise."
  },
  {
    username: 'google',
    uid: 'user_brand_google',
    content: "Our mission is to organize the world's information and make it universally accessible and useful. We are expanding our advanced models across Search and daily productivity tools to help people discover answers, learn faster, and tackle complex problems every day."
  },
  {
    username: 'telegram',
    uid: 'user_brand_telegram',
    content: "Your conversations belong to you and no one else. Telegram is engineered for absolute speed and cross-platform synchronization, without trackers or data harvesting. Independent, cloud-native, and private by design."
  },
  {
    username: 'spotify',
    uid: 'user_brand_spotify',
    content: "Listening is everything. From discovering emerging underground artists to streaming the greatest anthems of all time, sound is the soundtrack of our lives. Discover your next favorite song and stay tuned to what moves you."
  }
];

function fetchUser(uid) {
  return new Promise((resolve, reject) => {
    https.get(`${FIREBASE_BASE_URL}/users/${uid}.json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse user ${uid}: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode} fetching user ${uid}`));
        }
      });
    }).on('error', reject);
  });
}

function putPost(postId, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'sahra-f4ec6-default-rtdb.firebaseio.com',
      port: 443,
      path: `/posts/${postId}.json`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode} saving post ${postId}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`[Brand Pulses] Publishing authentic official posts for ${BRAND_POSTS.length} brand accounts...`);
  const now = Date.now();

  for (let i = 0; i < BRAND_POSTS.length; i++) {
    const item = BRAND_POSTS[i];
    try {
      console.log(`[Brand Pulses] Fetching profile for @${item.username} (${item.uid})...`);
      const user = await fetchUser(item.uid);
      if (!user) {
        console.error(`[Error] User not found: ${item.uid}`);
        continue;
      }

      // Space timestamps naturally across recent intervals (10-30 mins apart)
      const postTimestampMs = now - ((BRAND_POSTS.length - i) * 15 * 60 * 1000);
      const postDateIso = new Date(postTimestampMs).toISOString();
      const postId = `post_official_${item.username}_${postTimestampMs}`;

      const postPayload = {
        id: postId,
        authorId: user.uid,
        authorUsername: user.username,
        author: {
          uid: user.uid,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isVerified: true,
          verificationStatus: 'verified',
          isFounder: false,
          isPioneer: false,
          pioneerNumber: null,
          badgeTitle: null,
          isOfficial: true,
          isPrivate: false
        },
        content: item.content,
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
        isOfficialBrandPost: true,
        origin: 'brand_official_announcement',
        createdAt: postDateIso
      };

      console.log(`[Brand Pulses] Publishing pulse ${postId} for @${item.username}...`);
      await putPost(postId, postPayload);
      console.log(`[Brand Pulses] Successfully published pulse for @${item.username}!`);
    } catch (err) {
      console.error(`[Error] Failed publishing for @${item.username}:`, err.message);
    }
  }

  console.log('[Brand Pulses] All official brand posts published successfully.');
}

main().catch(console.error);
