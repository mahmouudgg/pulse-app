const https = require('https');

function check(url) {
  https.get(url, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(url, 'Status:', res.statusCode, 'Data:', d));
  }).on('error', e => console.error(url, e.message));
}

check('https://sahra-f4ec6-default-rtdb.firebaseio.com/app_release.json');
check('https://sahra-f4ec6-default-rtdb.firebaseio.com/users/app_release.json');
