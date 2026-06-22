const https = require('https');

https.get({
  hostname: 'api.github.com',
  path: '/search/repositories?q=Gerente-imobili-rio+user:dennyancasa',
  headers: { 'User-Agent': 'NodeJS' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
