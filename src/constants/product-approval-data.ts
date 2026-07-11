export type ProductStatus = 'pending' | 'review' | 'approved' | 'rejected';

export type ApprovalProduct = {
  id: string;
  name: string;
  description: string;
  image: string;
  seller: string;
  email: string;
  category: string;
  status: ProductStatus;
  submittedOn: string;
  price?: string;
  isNew?: boolean;
};

export type ProductDetail = ApprovalProduct & {
  sku: string;
  lastUpdated: string;
  categoryLabel: string;
  subcategory: string;
  fullTitle: string;
  price: number;
  mrp: number;
  gst: number;
  material: string;
  weight: string;
  hsnCode: string;
  warranty: string;
  returnPolicy: string;
  size: string;
  delivery: string;
  stock: number;
  stockStatus: string;
  discount: number;
  color: string;
  dbStatus: string;
  createdAt: string;
  approvedAt: string;
  adminNote: string;
  fullDescription: string;
  gallery: string[];
};

export const APPROVAL_PRODUCTS: ApprovalProduct[] = [
  {
    id: '1',
    name: 'AMT kistopia',
    description: 'Dragon character backpack with premium stitching and durable zippers.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',
    seller: 'Lakshmi Sumana',
    email: 'lakshmi@example.com',
    category: 'Bags > Backpacks',
    status: 'pending',
    submittedOn: 'May 10, 2026 12:45 PM',
    isNew: true,
  },
  {
    id: '2',
    name: 'Nike Air Max 270',
    description: 'Breathable mesh upper with responsive Air cushioning for all-day comfort.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
    seller: 'Lakshmi Sumana',
    email: 'lakshmi@example.com',
    category: 'Bags > Backpacks',
    status: 'review',
    submittedOn: 'May 09, 2026 09:30 AM',
    isNew: true,
  },
  {
    id: '3',
    name: 'product 12',
    description: 'Handcrafted wooden shelf unit with matte finish and hidden brackets.',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop',
    seller: 'Parveen',
    email: 'parveen@example.com',
    category: 'Home > Furniture',
    status: 'approved',
    submittedOn: 'May 08, 2026 04:15 PM',
    isNew: true,
  },
  {
    id: '4',
    name: 'autounkey',
    description: 'Compact smart key organizer with RFID protection and leather wrap.',
    image: 'https://images.unsplash.com/photo-1606760227091-3dd870d9f0c6?w=600&h=600&fit=crop',
    seller: 'pavani',
    email: 'pavani@example.com',
    category: 'Home > Furniture',
    status: 'rejected',
    submittedOn: 'May 07, 2026 11:20 AM',
    isNew: true,
  },
  {
    id: '5',
    name: 'Eco Bottle Pro',
    description: 'Insulated stainless steel bottle with leak-proof lid and carry loop.',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
    seller: 'GreenCore',
    email: 'greencore@example.com',
    category: 'Accessories > Bottles',
    status: 'pending',
    submittedOn: 'May 06, 2026 08:00 AM',
    isNew: true,
  },
  {
    id: '6',
    name: 'Minimalist Desk Lamp',
    description: 'Adjustable LED desk lamp with warm and cool light modes.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop',
    seller: 'Parveen',
    email: 'parveen@example.com',
    category: 'Home > Furniture',
    status: 'review',
    submittedOn: 'May 05, 2026 03:45 PM',
    isNew: true,
  },
  {
    id: '7',
    name: 'Pro Runner Sneakers',
    description: 'Lightweight performance sneakers with cushioned sole and mesh upper.',
    image: 'https://images.unsplash.com/photo-1606107557195-0a29cbf1f780?w=600&h=600&fit=crop',
    seller: 'Lakshmi Sumana',
    email: 'lakshmi@example.com',
    category: 'Footwear > Sneakers',
    status: 'approved',
    submittedOn: 'May 04, 2026 10:10 AM',
    isNew: true,
  },
];

const CASHEW_GALLERY = [
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1558961363-fa8a64e0510a?w=200&h=200&fit=crop',
];

function buildDetail(product: ApprovalProduct): ProductDetail {
  const [categoryLabel, subcategory = 'General'] = product.category.split('>').map((s) => s.trim());

  return {
    ...product,
    sku: '--',
    lastUpdated: '04 Jun 2026',
    categoryLabel,
    subcategory,
    fullTitle: product.name,
    price: 0,
    mrp: 0,
    gst: 18,
    material: 'other',
    weight: '0.7 kg',
    hsnCode: '17049090',
    warranty: 'No Warranty',
    returnPolicy: 'Products marked as clearance or final sale are not eligible for returns.',
    size: '--',
    delivery: '3-7 Business Days',
    stock: 0,
    stockStatus: 'Out of Stock',
    discount: 0,
    color: '--',
    dbStatus: 'active',
    createdAt: '18 Jan 2026',
    approvedAt: '18 Feb 2026',
    adminNote:
      'Product approved. Minor adjustments suggested for future listings (image clarity, description format, pricing alignment).',
    fullDescription:
      product.id === '1'
        ? 'Premium Cashew Laddu (Kaju Laddu) made with high-quality cashew nuts, offering a rich, creamy texture and authentic aroma. Perfect for festivals, gifting, and celebrations. Free from artificial colors and preservatives.'
        : product.description,
    gallery:
      product.id === '1'
        ? CASHEW_GALLERY
        : [product.image, product.image, product.image, product.image],
  };
}

export function getProductDetail(id: string): ProductDetail | undefined {
  const product = APPROVAL_PRODUCTS.find((p) => p.id === id);
  return product ? buildDetail(product) : undefined;
}

export type ProductVariant = {
  id: string;
  colorName: string;
  colorHex: string;
  image: string;
  size: string;
  sku: string;
  stock: number;
  mrp: number;
  discountPercent: number;
  sellingPriceExclGst: number;
  gstPercent: number;
  gstAmount: number;
  sellingPriceWithGst: number;
  commissionPercent: number;
  commissionAmount: number;
  intraCityDelivery: number;
  metroDelivery: number;
  priceWithCommission: number;
  highestDeliveryCharge: number;
  displayPrice: number;
  totalPriceIntraCity: number;
  totalPriceMetroMetro: number;
};

const VARIANT_IMAGE =
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=120&h=120&fit=crop';

export const PRODUCT_VARIANTS: ProductVariant[] = Array.from({ length: 15 }, (_, i) => {
  const size = String(6 + i);
  const sellingExcl = 395;
  const gstAmount = 19.75;
  const sellingWith = 414.75;
  return {
    id: `v-${i + 1}`,
    colorName: 'Coffee Brown',
    colorHex: '#6F4E37',
    image: VARIANT_IMAGE,
    size,
    sku: `PRE-CO${size}-1449`,
    stock: 50,
    mrp: 1399,
    discountPercent: 72,
    sellingPriceExclGst: sellingExcl,
    gstPercent: 5,
    gstAmount,
    sellingPriceWithGst: sellingWith,
    commissionPercent: 15,
    commissionAmount: 62.21,
    intraCityDelivery: 20,
    metroDelivery: 25,
    priceWithCommission: sellingWith + 62.21,
    highestDeliveryCharge: 25,
    displayPrice: sellingWith + 62.21 + 25,
    totalPriceIntraCity: sellingWith + 62.21 + 20,
    totalPriceMetroMetro: sellingWith + 62.21 + 25,
  };
});

export type ProductSpecifications = {
  items: { label: string; value: string }[];
  keyFeatures: string;
  package: {
    boxDimensions: string;
    grossWeight: string;
    packagingType: string;
    fragileItem: string;
    productWeight: string;
    productDimensions: string;
  };
};

export const PRODUCT_SPECS: ProductSpecifications = {
  items: [
    { label: 'Upper Material', value: 'High-Quality Genuine Leather' },
    { label: 'Closure Type', value: 'Slip-On with Elasticated & Chain Side Panels' },
    { label: 'Sole Material', value: 'TPR (Thermo Plastic Rubber)' },
    { label: 'Toe Shape', value: 'Round Toe' },
    { label: 'Insole', value: 'Soft Cushioned Footbed' },
    { label: 'Inner Material', value: 'Skin-Friendly Fabric Lining' },
    { label: 'Fit Type', value: 'Regular Fit' },
    { label: 'Shoe Length', value: 'Ankle Length' },
  ],
  keyFeatures: 'Occasion : Casual, Party, Office, Formal, Daily Wear',
  package: {
    boxDimensions: '29 x 14 x 6 cm',
    grossWeight: '0.6 kg',
    packagingType: 'leather',
    fragileItem: 'No',
    productWeight: '0.6 kg',
    productDimensions: '29 x 14 x 6 cm',
  },
};

export type ProductDelivery = {
  estimatedDays: string;
  coverageNote: string;
  standardDelivery: string;
  expressDelivery: string;
  cashOnDelivery: string;
  coverage: string;
  charges: { zone: string; standard: string; express: string }[];
};

export const PRODUCT_DELIVERY: ProductDelivery = {
  estimatedDays: '3-7 Business Days',
  coverageNote: 'Available across Pan India',
  standardDelivery: 'Free above —',
  expressDelivery: 'Not available',
  cashOnDelivery: 'Not available',
  coverage: 'Pan India',
  charges: [
    { zone: 'Intra City', standard: '₹20', express: '—' },
    { zone: 'Metro to Metro', standard: '₹25', express: '—' },
  ],
};

export type ProductReturns = {
  policyHighlight: string;
  policySubtext: string;
  returnWindow: string;
  refundMode: string;
  warranty: string;
  conditions: string[];
  processSteps: string[];
};

export const PRODUCT_RETURNS: ProductReturns = {
  policyHighlight:
    'Customers can return products within 7 days of delivery for a full refund or exchange. Return Window',
  policySubtext: 'Hassle-free returns accepted',
  returnWindow:
    'Customers can return products within 7 days of delivery for a full refund or exchange.',
  refundMode: 'Original Payment Method / Wallet Credit',
  warranty: 'No Warranty',
  conditions: [
    'Customers can return products within 7 days of delivery for a full refund or exchange.',
  ],
  processSteps: ['Raise return request', 'Schedule pickup', 'Refund after approval'],
};

export type SizeChartRow = {
  size: string;
  chest: string;
  waist: string;
  hip: string;
  length: string;
};

export type ProductSizeChart = {
  unit: string;
  rows: SizeChartRow[];
  footerNote: string;
};

export const PRODUCT_SIZE_CHART: ProductSizeChart = {
  unit: 'All measurements are in inches',
  rows: [
    { size: 'S', chest: '36', waist: '30', hip: '38', length: '28' },
    { size: 'M', chest: '38', waist: '32', hip: '40', length: '29' },
    { size: 'L', chest: '40', waist: '34', hip: '42', length: '30' },
    { size: 'XL', chest: '42', waist: '36', hip: '44', length: '31' },
    { size: 'XXL', chest: '44', waist: '38', hip: '46', length: '32' },
  ],
  footerNote: 'Measure yourself and compare with the chart above for the best fit.',
};

export function getVariantStats(variants: ProductVariant[]) {
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const avgPrice =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + v.displayPrice, 0) / variants.length
      : 0;
  return {
    totalVariants: variants.length,
    totalStock,
    avgSellingPrice: avgPrice,
  };
}
