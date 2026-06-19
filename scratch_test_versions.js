const https = require('https');

const versions = [
  '1.7.2', '1.6.1', '1.5.0', '1.4.1', '1.3.0', '1.2.0', '1.10.3', '1.10.2', '1.9.0'
];

function check(version) {
  const url = `https://cdn.jsdelivr.net/npm/bootstrap-icons@${version}/font/fonts/bootstrap-icons.ttf`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`${version} -> ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function run() {
  for (const v of versions) {
    await check(v);
  }
}

run();
