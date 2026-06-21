const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  {
    regex: /<Image source=\{\{ uri: seller\.avatar \}\} style=\{styles\.detailsAvatar\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image source={{ uri: seller.avatar }} style={styles.detailsAvatar} />) : (<View style={[styles.detailsAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"user\" size={32} color=\"#9CA3AF\" /></View>)}"
  },
  {
    regex: /<Image source=\{\{ uri: seller\.avatar \}\} style=\{styles\.sidebarProfileImg\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image source={{ uri: seller.avatar }} style={styles.sidebarProfileImg} />) : (<View style={[styles.sidebarProfileImg, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"user\" size={80} color=\"#9CA3AF\" /></View>)}"
  },
  {
    regex: /<Image source=\{\{ uri: seller\.avatar \}\} style=\{styles\.docThumbnail\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image source={{ uri: seller.avatar }} style={styles.docThumbnail} />) : (<View style={[styles.docThumbnail, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"image\" size={40} color=\"#9CA3AF\" /></View>)}"
  },
  {
    regex: /<Image key=\{idx\} source=\{\{ uri: seller\.avatar \}\} style=\{styles\.selfieThumbnail\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image key={idx} source={{ uri: seller.avatar }} style={styles.selfieThumbnail} />) : (<View key={idx} style={[styles.selfieThumbnail, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"camera\" size={20} color=\"#9CA3AF\" /></View>)}"
  },
  {
    regex: /<Image source=\{\{ uri: seller\.avatar \}\} style=\{styles\.sellerAvatar\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />) : (<View style={[styles.sellerAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"user\" size={16} color=\"#9CA3AF\" /></View>)}"
  },
  {
    regex: /<Image source=\{\{ uri: seller\.avatar \}\} style=\{styles\.cardAvatar\} \/>/g,
    replace: "{seller.avatar && seller.avatar.trim() !== '' ? (<Image source={{ uri: seller.avatar }} style={styles.cardAvatar} />) : (<View style={[styles.cardAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name=\"user\" size={20} color=\"#9CA3AF\" /></View>)}"
  }
];

let changed = false;
for (const { regex, replace } of replacements) {
  if (regex.test(content)) {
    content = content.replace(regex, replace);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, content, 'utf8');
  console.log("Replacements applied.");
} else {
  console.log("No matches found.");
}
