const https = require('https');

https.get('https://sahra-f4ec6-default-rtdb.firebaseio.com/users.json?shallow=true', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Total user keys in RTDB:', Object.keys(parsed || {}).length);
      console.log('User UIDs:', Object.keys(parsed || {}));
    } catch(e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', err => console.error(err.message));
