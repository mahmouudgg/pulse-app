const https = require('https');

const updatePayload = {
  versionName: "1.0.2",
  versionCode: 3,
  apkUrl: "https://pulseeg.wuaze.com/Pulse-v1.0.apk",
  apkSize: "10.3 MB",
  releaseDate: "2026-10-23",
  releaseNotes: "تحديث PULSE 1.0.2 الرسمي:\n- ترويق كامل للواجهة وإزالة أي بؤر تشتيت أو وميض متعب للعين.\n- سلاسة وحركات موحدة 120 فريم في جميع القوائم والموديلز.\n- مزامنة فورية وشاملة لنبضات البروفايلات في الكاش في أجزاء من الثانية.\n- دعم رفع الفيديوهات مع ضغط ذكي عالي الدقة HD يحافظ على باقتك.",
  isMandatory: false
};

const payloadStr = JSON.stringify(updatePayload);

function putToFirebase(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sahra-f4ec6-default-rtdb.firebaseio.com',
      port: 443,
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Firebase] PUT ${path} -> Status ${res.statusCode}: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.error(`[Firebase] Error on ${path}:`, err.message);
      reject(err);
    });

    req.write(payloadStr);
    req.end();
  });
}

async function main() {
  console.log('[Firebase Update] Activating v1.0.2 release config in Firebase RTDB...');
  await putToFirebase('/app_release.json');
  await putToFirebase('/users/app_release.json');
  console.log('[Firebase Update] Activation completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
