const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Restore the mangled block in detailsContainer
const brokenRegex = /const handleUpdateSellerStatus = \(\) => \{\n\s*\}\n\s*<\/\w+>/;
// Wait, the diff showed the deletion, so I should just re-insert the missing text manually where it broke.
// Let's first read the file to see the exact state.
