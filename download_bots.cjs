const https = require('https');
const fs = require('fs');

function download(filename) {
  const url = `https://raw.githubusercontent.com/JulianaGrizotti/Gerente-Imobili-rio-/main/public/${filename}`;
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(`./public/${filename}`);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
      });
    } else {
      console.log(`Failed to download ${filename}: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
}

['meu_robo.png', 'robot_idle.png', 'robot_thinking.png', 'robot_thinking_3d.png', 'robot_working.png', 'robot_working_3d.png'].forEach(download);
