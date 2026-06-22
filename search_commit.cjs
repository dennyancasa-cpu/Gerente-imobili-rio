const https = require('https');

https.get({
  hostname: 'api.github.com',
  path: '/search/commits?q=hash:71ce1c8346843e76e682d57626b4823f60aaf298',
  headers: { 'User-Agent': 'NodeJS' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
