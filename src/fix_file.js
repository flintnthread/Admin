const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const openPendingDetail = async \([\s\S]*?const \[sortBy, setSortBy\] = useState\("Name"\);/;

const fix = `const openPendingDetail = async (pending: PendingSeller) => {
    try {
      const detail = await fetchPendingProfileDetail(pending.id);
      setSelectedPendingSeller({
        ...pending,
        businessType: String(detail.businessType ?? pending.businessType ?? "—"),
        state: String(detail.state ?? pending.state ?? "—"),
        city: String(detail.city ?? pending.city ?? "—"),
        bankName: String(detail.bankName ?? pending.bankName ?? "—"),
        accountNumber: String(detail.accountNumber ?? pending.accountNumber ?? "—"),
        ifscCode: String(detail.ifscCode ?? pending.ifscCode ?? "—"),
        holderName: String(detail.accountHolder ?? pending.holderName ?? "—"),
      });
      setShowPendingModal(true);
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    }
  };

  const handleApprovePending = async (pending: PendingSeller) => {
    try {
      await approveSellerProfile(pending.id);
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      void loadApprovedSellers();
      showToast("Seller approved successfully!", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to approve seller."), "error");
    }
  };

  const handleRejectPending = async (pending: PendingSeller) => {
    try {
      await rejectSellerProfile(pending.id, "Rejected by admin");
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      showToast("Seller request has been rejected.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to reject seller."), "error");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState("Name");`;

if (regex.test(content)) {
  content = content.replace(regex, fix);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed file.');
} else {
  console.log('Could not find regex match.');
}
