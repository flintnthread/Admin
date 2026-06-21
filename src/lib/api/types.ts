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
  gstStatus?: string;
  createdAt?: string;
  products?: OrderProductPreview[];
  sellers?: OrderSellerPreview[];
};

export type OrderProductPreview = {
  id?: number;
  name?: string;
  imageUrl?: string;
  sellerName?: string;
};

export type OrderSellerPreview = {
  id?: number;
  name?: string;
  email?: string;
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
  status?: string;
  walletBalance?: number;
  sellerNote?: string;
  adminNote?: string;
  transactionRef?: string;
  requestedAt?: string;
  deliveryDate?: string;
  paidAt?: string;
};

export type SupportTicketSummary = {
  id: number;
  ticketNumber?: string;
  sellerId?: number;
  sellerName?: string;
  subject?: string;
  category?: string;
  priority?: string;
  status?: string;
  lastResponseBy?: string;
  lastResponseAt?: string;
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
