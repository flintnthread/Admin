const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = '<View style={[styles.rowLayout, { gap: 16, flexWrap: "wrap", marginBottom: 16 }]}>';
const replace1 = '<View style={[styles.rowLayout, { gap: 16, flexWrap: "wrap", marginBottom: 16, zIndex: 100, position: "relative" }]}>';

const target2 = `{/* Update Status Dropdown */}
                          <View style={{ flex: 1, minWidth: 200, position: "relative" }}>`;
const replace2 = `{/* Update Status Dropdown */}
                          <View style={{ flex: 1, minWidth: 200, position: "relative", zIndex: showStatusDropdown ? 50 : 1 }}>`;

const target3 = `{/* KYC Status Dropdown */}
                          <View style={{ flex: 1, minWidth: 200, position: "relative" }}>`;
const replace3 = `{/* KYC Status Dropdown */}
                          <View style={{ flex: 1, minWidth: 200, position: "relative", zIndex: showKycDropdown ? 50 : 1 }}>`;

if (content.includes(target1)) content = content.replace(target1, replace1);
if (content.includes(target2)) content = content.replace(target2, replace2);
if (content.includes(target3)) content = content.replace(target3, replace3);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed dropdown zIndex!');
