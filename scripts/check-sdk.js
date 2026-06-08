const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const parentRoot = path.join(projectRoot, '..');

function getExpoVersion(dir) {
  try {
    const pkg = require(path.join(dir, 'node_modules', 'expo', 'package.json'));
    return pkg.version;
  } catch {
    return null;
  }
}

const adminExpo = getExpoVersion(projectRoot);
const parentExpo = getExpoVersion(parentRoot);

console.log('');
console.log('=== Expo SDK Check ===');
console.log(`App folder (Admin):  SDK ${adminExpo ? adminExpo.split('.')[0] : 'NOT INSTALLED'} (expo@${adminExpo || 'missing'})`);
console.log(`Parent folder:         ${parentExpo ? `WRONG - expo@${parentExpo} found!` : 'OK - no expo'}`);
console.log('');

if (parentExpo) {
  console.error('ERROR: Parent folder has Expo installed. This causes SDK mismatch.');
  console.error('Fix: delete admin/node_modules and run npm install in admin/ (without expo).');
  process.exit(1);
}

if (!adminExpo || !adminExpo.startsWith('54.')) {
  console.error('ERROR: Admin folder must use Expo SDK 54 for Play Store Expo Go.');
  console.error('Fix: cd Admin && npm install');
  process.exit(1);
}

try {
  const sdk = execSync('npx expo config --type public', { cwd: projectRoot, encoding: 'utf8' });
  const match = sdk.match(/sdkVersion:\s*'([^']+)'/);
  if (match) console.log(`Confirmed sdkVersion: ${match[1]}`);
} catch {
  // ignore
}

console.log('Ready! Run: npx expo start --clear');
console.log('');
