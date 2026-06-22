const https = require('https');

https.get('https://raw.githubusercontent.com/JulianaGrizotti/Gerente-Imobili-rio-/main/public/meu_robo.png', (res) => {
  console.log('Status:', res.statusCode);
  process.exit(0);
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
