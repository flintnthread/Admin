const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /seller\.avatar && seller\.avatar\.trim\(\) !== ''/g;
const replacement = "(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined')";

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Replaced correctly.');
} else {
  console.log('No matches found.');
}
