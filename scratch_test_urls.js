const https = require('https');

const urls = [
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/fonts/bootstrap-icons.ttf',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/fonts/bootstrap-icons.ttf',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/fonts/bootstrap-icons.ttf',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/fonts/bootstrap-icons.ttf',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.3/font/fonts/bootstrap-icons.ttf',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/fonts/bootstrap-icons.ttf',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/fonts/bootstrap-icons.ttf'
];

function check(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`${url} -> ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function run() {
  for (const url of urls) {
    await check(url);
  }
}

run();
