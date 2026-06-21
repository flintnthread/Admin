const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// The multi_replace_file_content tool incorrectly inserted a new block right after `return StyleSheet.create({`.
// We need to remove the first occurrence of `quickActionsGrid` up to `sectionHeaderCard:` and then replace the actual original occurrence.

// Step 1: Remove the mistakenly added block
content = content.replace(/quickActionsGrid: \{\s*flex: 1,\s*flexDirection: "row",\s*alignItems: "stretch",\s*gap: 12,\s*\},\s*quickActionItem: \{\s*flex: 1,\s*minWidth: 100,\s*alignItems: "center",\s*justifyContent: "center",\s*gap: 8,\s*padding: 20,\s*borderWidth: 1,\s*borderColor: C\.border,\s*borderRadius: 12,\s*cursor: "pointer",\s*\},/g, '');

// Step 2: Replace the actual original blocks
content = content.replace(/quickActionsGrid: \{\s*flexDirection: "row",\s*flexWrap: "wrap",\s*gap: 12,\s*\}/g, `quickActionsGrid: {
      flex: 1,
      flexDirection: "row",
      alignItems: "stretch",
      gap: 12,
    }`);

content = content.replace(/quickActionItem: \{\s*flex: 1,\s*minWidth: 100,\s*alignItems: "center",\s*gap: 6,\s*padding: 10,\s*borderWidth: 1,\s*borderColor: C\.border,\s*borderRadius: 12,\s*cursor: "pointer",\s*\}/g, `quickActionItem: {
      flex: 1,
      minWidth: 100,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      cursor: "pointer",
    }`);

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed styling.");
