const fs = require('fs');
const { execSync } = require('child_process');

if (fs.existsSync('.git')) {
  console.log('git exists, restoring...');
  try {
    execSync('git checkout public/', { stdio: 'inherit' });
    console.log('restored public');
  } catch (e) {
    console.log('error checking out', e.message);
  }
} else {
  console.log('git does not exist');
}
