export type PageResponse<T> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type ApiRecord = Record<string, unknown>;

export type SellerSummary = {
  id: number;
  fullName?: string;
  email?: string;
  mobile?: string;
  businessName?: string;
  status?: string;
  sellerCategory?: string;
  kycVerified?: boolean;
  kycCompleted?: boolean;
  profileCompleted?: boolean;
  bankVerified?: boolean;
  walletBalance?: number;
  createdAt?: string;
  updatedAt?: string;
  profilePicUrl?: string;
  profilePicPath?: string;
  liveSelfiePath?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  sellerUniqueId?: string;
  referralCode?: string;
  productCount?: number;
  city?: string;
  state?: string;
  businessType?: string;
  totalRevenue?: number;
  totalOrders?: number;
  country?: string;
  area?: string;
  pincode?: string;
  address?: string;
  panNumber?: string;
  gstNumber?: string;
  hasGst?: boolean;
  firstName?: string;
  lastName?: string;
  warehouseAddress?: string;
  warehouseArea?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseCountry?: string;
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycRemarks?: string;
  adminRemarks?: string;
  kycStatusLabel?: string;
  kycVerificationStatus?: string;
  kycImageCount?: number;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  resendVerificationEligible?: boolean;
};

export type ProductSummary = {
  id: number;
  name?: string;
  sku?: string;
  status?: string;
  sellerId?: number;
  createdAt?: string;
};

export type OrderSummary = {
  id: number;
  orderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  shippingName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingPincode?: string;
  gstStatus?: string;
  createdAt?: string;
  shiprocketAwbCode?: string;
  shiprocketCourierName?: string;
  shiprocketTrackingUrl?: string;
  trackingId?: string;
  weightKg?: number;
  dimensionsCm?: { l?: number; w?: number; h?: number };
  hasInvoice?: boolean;
  hasShippingLabel?: boolean;
  products?: OrderProductPreview[];
  sellers?: OrderSellerPreview[];
  sellerGroups?: OrderSellerGroupPreview[];
};

export type OrderProductPreview = {
  id?: number;
  productId?: number;
  name?: string;
  productName?: string;
  imageUrl?: string;
  sellerName?: string;
  sellerId?: number;
  price?: number;
  quantity?: number;
  qty?: number;
  hsnCode?: string;
  color?: string;
  size?: string;
  sku?: string;
  taxPercent?: number;
};

export type OrderSellerPreview = {
  id?: number;
  name?: string;
  email?: string;
};

export type OrderSellerGroupPreview = {
  seller?: {
    name?: string;
    email?: string;
    phone?: string;
    gstin?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
      email?: string;
      gstin?: string;
    };
  };
  products?: OrderProductPreview[];
  hasInvoice?: boolean;
  hasShippingLabel?: boolean;
};

export type CustomerSummary = {
  id: number;
  email?: string;
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  orderCount?: number;
  totalSpent?: number;
  lastOrderAt?: string;
};

export type PayoutItem = {
  productName?: string;
  sku?: string;
  hsnCode?: string;
  quantity?: number;
  price?: number;
  total?: number;
};

export type PayoutSummary = {
  id: number;
  sellerId?: number;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  orderId?: number;
  orderNumber?: string;
  orderStatus?: string;
  requestedAmount?: number;
  customerPaidAmount?: number;
  customerName?: string;
  customerEmail?: string;
  status?: string;
  walletBalance?: number;
  sellerNote?: string;
  adminNote?: string;
  transactionRef?: string;
  requestedAt?: string;
  deliveryDate?: string;
  paidAt?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  shippingPhone?: string;
  sellerGstin?: string;
  sellerAddress?: string;
  sellerCity?: string;
  sellerState?: string;
  sellerPincode?: string;
  items?: PayoutItem[];
  invoiceNumber?: string;
  invoiceDate?: string;
  amountBreakdown?: {
    orderAmount?: number;
    gstAmount?: number;
    deliveryCharge?: number;
    deliveryType?: string;
    commissionRate?: number;
    commissionAmount?: number;
    finalPayableAmount?: number;
  };
};

export type SupportTicketSummary = {
  id: number;
  ticketNumber?: string;
  sellerId?: number;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  subject?: string;
  category?: string;
  priority?: string;
  status?: string;
  statusLabel?: string;
  statusClosed?: boolean;
  canResolve?: boolean;
  canClose?: boolean;
  canReopen?: boolean;
  lastResponseBy?: string;
  lastResponseAt?: string;
  closedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: SupportMessage[];
};

export type SupportMessage = {
  id: number;
  senderType?: string;
  senderId?: number;
  message?: string;
  attachment?: string;
  createdAt?: string;
};

export type ContactMessage = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  status?: boolean;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FaqCategory = {
  id: number;
  categoryName?: string;
  categoryIcon?: string;
  sortOrder?: number;
  status?: boolean;
  faqCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FaqItem = {
  id: number;
  categoryId?: number;
  question?: string;
  answer?: string;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
  status?: boolean;
  isSeller?: boolean;
};

export type AdminUserRow = {
  id: number;
  email?: string;
  fullName?: string;
  role?: string;
  active?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
};

export type DeliverySlab = {
  id: number;
  label?: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  intraCityCharge?: number;
  metroMetroCharge?: number;
  active?: boolean;
  custom?: boolean;
  sortOrder?: number;
};

export type Department = {
  id: number;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  jobCount?: number;
  createdAt?: string;
};

export type JobOpening = {
  id: number;
  departmentId?: number;
  title?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  experienceRequired?: string;
  salaryRange?: string;
  vacancies?: number;
  location?: string;
  employmentType?: string;
  status?: string;
  createdAt?: string;
  applicationCount?: number;
};

export type JobApplication = {
  id: number;
  jobId?: number;
  jobTitle?: string;
  departmentName?: string;
  name?: string;
  email?: string;
  phone?: string;
  resumePath?: string;
  coverLetter?: string;
  status?: string;
  appliedAt?: string;
};
