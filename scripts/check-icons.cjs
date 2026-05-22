const fs = require('fs');

function readDimensions(file) {
  try {
    const buffer = fs.readFileSync(file);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    console.log(file, width, 'x', height);
  } catch (e) {
    console.log(file, 'error', e.message);
  }
}

readDimensions('public/icon-192.png');
readDimensions('public/icon-512.png');
