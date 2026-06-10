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
  bankVerified?: boolean;
  walletBalance?: number;
  createdAt?: string;
  profilePicUrl?: string;
  bankName?: string;
  accountHolder?: string;
  updatedAt?: string;
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
  orderId?: number;
  requestedAmount?: number;
  status?: string;
  sellerNote?: string;
  adminNote?: string;
  transactionRef?: string;
  requestedAt?: string;
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
};

export type FaqItem = {
  id: number;
  categoryId?: number;
  question?: string;
  answer?: string;
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
  sortOrder?: number;
};

export type Department = {
  id: number;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  active?: boolean;
};

export type JobOpening = {
  id: number;
  departmentId?: number;
  title?: string;
  description?: string;
  location?: string;
  employmentType?: string;
  status?: string;
  createdAt?: string;
};

export type JobApplication = {
  id: number;
  jobId?: number;
  name?: string;
  email?: string;
  phone?: string;
  resumePath?: string;
  coverLetter?: string;
  status?: string;
  appliedAt?: string;
};
