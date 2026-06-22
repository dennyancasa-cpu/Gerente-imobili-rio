const https = require('https');

https.get({
  hostname: 'api.github.com',
  path: '/search/code?q=filename:meu_robo.png',
  headers: { 'User-Agent': 'NodeJS', 'Accept': 'application/vnd.github.v3+json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
