const { Jimp } = require('jimp');

async function createIcon(size, filename) {
  const image = new Jimp({ width: size, height: size, color: 0x0f172aff }); // dark slate color
  await image.write(filename);
  console.log('Created', filename);
}

createIcon(192, 'public/icon-192-v6.png');
createIcon(512, 'public/icon-512-v6.png');
