const fs = require('fs');
const file = 'C:/admin fnt/Admin/src/app/approveseller.tsx';
let content = fs.readFileSync(file, 'utf8');

const approveRegex = /const handleApprovePending = \(pending: PendingSeller\) => \{[\s\S]*?\}\s*\]\s*\);\s*\};/m;
const newApprove = `const handleApprovePending = async (pending: PendingSeller) => {
    try {
      await approveSellerProfile(pending.id);
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      void loadApprovedSellers();
      showToast("Seller approved successfully!", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to approve seller."), "error");
    }
  };`;

const rejectRegex = /const handleRejectPending = \(pending: PendingSeller\) => \{[\s\S]*?\}\s*\]\s*\);\s*\};/m;
const newReject = `const handleRejectPending = async (pending: PendingSeller) => {
    try {
      await rejectSellerProfile(pending.id, "Rejected by admin");
      setPendingSellers((prev) => prev.filter((s) => s.id !== pending.id));
      setShowPendingModal(false);
      showToast("Seller request has been rejected.", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e, "Failed to reject seller."), "error");
    }
  };`;

content = content.replace(approveRegex, newApprove);
content = content.replace(rejectRegex, newReject);

fs.writeFileSync(file, content, 'utf8');
console.log('Approve and Reject logic updated!');
