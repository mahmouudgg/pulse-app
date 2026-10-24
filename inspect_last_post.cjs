const https = require('https');

https.get('https://sahra-f4ec6-default-rtdb.firebaseio.com/posts.json?orderBy="$key"&limitToLast=2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Sample posts:', JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.error('Error parsing:', e.message);
    }
  });
}).on('error', err => console.error(err.message));
