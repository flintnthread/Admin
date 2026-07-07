import type { ApprovedSellerRow } from "@/lib/mappers";
import { formatDate, formatRupee } from "@/lib/format";

function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  return `"${str.replace(/"/g, '""')}"`;
}

const EXPORT_HEADERS = [
  "ID",
  "Name",
  "Business Name",
  "Email",
  "State",
  "City",
  "Status",
  "Products",
  "Wallet Balance",
  "Revenue",
  "Join Date",
  "Unique Seller ID",
  "Referral Code",
  "First Name",
  "Last Name",
  "Mobile",
  "Business Type",
  "Seller Category",
  "Address",
  "Area",
  "Pincode",
  "Country",
  "GST",
  "GST Number",
  "PAN Number",
  "Bank Name",
  "Branch Name",
  "Account Holder",
  "Account Number",
  "IFSC Code",
  "Bank Verified",
  "Warehouse Address",
  "Warehouse Area",
  "Warehouse City",
  "Warehouse State",
  "Warehouse Country",
  "KYC Status",
  "KYC Verification Status",
  "KYC Submitted On",
  "KYC Verified On",
  "KYC Images Captured",
  "KYC Remarks",
  "Admin Remarks",
  "Total Orders",
  "Email Verified",
  "Mobile Verified",
] as const;

function rowToValues(seller: ApprovedSellerRow): unknown[] {
  return [
    seller.id,
    seller.name,
    seller.businessName,
    seller.email,
    seller.state,
    seller.city,
    seller.status,
    seller.products,
    formatRupee(seller.walletBalance),
    formatRupee(seller.revenue),
    seller.joinDate,
    seller.sellerUniqueId,
    seller.referralCode,
    seller.firstName,
    seller.lastName,
    seller.mobile,
    seller.businessType,
    seller.sellerCategory,
    seller.address,
    seller.area,
    seller.pincode,
    seller.country,
    seller.gstNumber,
    seller.gstNumberRaw,
    seller.panNumber,
    seller.bankName,
    seller.branchName,
    seller.accountHolder,
    seller.accountNumber,
    seller.ifscCode,
    seller.bankVerified ? "Yes" : "No",
    seller.warehouseAddress,
    seller.warehouseArea,
    seller.warehouseCity,
    seller.warehouseState,
    seller.warehouseCountry,
    seller.kycStatusLabel,
    seller.kycVerificationStatus,
    seller.kycSubmittedOn,
    seller.kycVerifiedOn,
    seller.kycImageCount,
    seller.kycRemarks,
    seller.adminRemarks,
    seller.totalOrders,
    seller.emailVerified ? "Yes" : "No",
    seller.mobileVerified ? "Yes" : "No",
  ];
}

export function buildApprovedSellersCsv(sellers: ApprovedSellerRow[]): string {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...sellers.map((seller) => rowToValues(seller).map(formatCsvCell).join(",")),
  ];
  return lines.join("\n");
}

export function formatApprovedSellerExportDate(value?: string | null): string {
  return formatDate(value);
}
