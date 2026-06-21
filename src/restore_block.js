const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const handleUpdateSellerStatus = \(\) => \{\s*<\/View>\s*<View style=\{styles.detailsMeta\}>/;

const fix = `const handleUpdateSellerStatus = () => {
              setData((prev) => prev.map((s) => s.id === seller.id ? { ...s, status: adminStatus } : s));
              showToast(\`Seller status updated to \${adminStatus}!\`, "success");
            };

            return (
              <View style={styles.detailsContainer}>
                {/* --- HEADER BANNER --- */}
                <View style={styles.detailsHeaderBanner}>
                  <View style={styles.detailsHeaderLeft}>
                    <TouchableOpacity
                      style={styles.headerBackBtn}
                      onPress={() => setSelectedSellerId(null)}
                    >
                      <Feather name="arrow-left" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.headerBackBtnText}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.avatarWrapper}>
                      {(seller.avatar && typeof seller.avatar === 'string' && seller.avatar.trim() !== '' && seller.avatar !== 'null' && seller.avatar !== 'N/A' && seller.avatar !== 'undefined') ? (<Image source={{ uri: seller.avatar }} style={styles.detailsAvatar} />) : (<View style={[styles.detailsAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}><Feather name="user" size={32} color="#9CA3AF" /></View>)}
                      <View style={styles.statusDotActive} />
                    </View>
                    <View style={styles.detailsMeta}>`;

if (regex.test(content)) {
  content = content.replace(regex, fix);
  
  // Now we need to also fix the ACTUAL router.back() issue in the Pending Sellers banner, which I failed to do!
  const bannerRegex = /<TouchableOpacity\s*style=\{styles\.bannerBackBtn\}\s*onPress=\{\(\) => router\.back\(\)\}\s*>/;
  const bannerFix = `<TouchableOpacity
                    style={styles.bannerBackBtn}
                    onPress={() => router.push("/approveseller")}
                  >`;
                  
  if (bannerRegex.test(content)) {
    content = content.replace(bannerRegex, bannerFix);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed block and banner button!');
  } else {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed block but could not find banner button.');
  }
} else {
  console.log('Could not find regex match for block fix.');
}
