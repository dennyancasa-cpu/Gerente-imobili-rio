const fs = require('fs');

function checkImage(file) {
  try {
    const buffer = fs.readFileSync(file);
    console.log(`${file}: length ${buffer.length}`);
  } catch (e) {
    console.error(e.message);
  }
}
checkImage('public/icon-192.png');
checkImage('public/icon-512.png');
