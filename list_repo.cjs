const https = require('https');

https.get({
  hostname: 'api.github.com',
  path: '/repos/JulianaGrizotti/Gerente-Imobili-rio-/git/trees/main?recursive=1',
  headers: { 'User-Agent': 'NodeJS' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
