const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ --- PAGE HEADER BANNER CARD ---[\s\S]*?bannerBackBtnText:/m;

const fix = `// --- PAGE HEADER BANNER CARD ---
  pageHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  bannerTop: {
    height: 100,
    backgroundColor: "#1d324e",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  bannerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  bannerBackBtnText:`;

if (regex.test(content)) {
  content = content.replace(regex, fix);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed banner styling!');
} else {
  console.log('Could not find regex match.');
}
