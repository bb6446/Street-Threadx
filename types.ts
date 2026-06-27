
export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  sku?: string;
  brand?: string;
  description: string;
  materials?: string;
  materialComposition?: string;
  careInstructions?: string;
  category: 'Hoodies' | 'T-Shirts' | 'Accessories' | 'Sweaters';
  images: string[];
  stock: number;
  minStockLevel?: number;
  sizes: string[];
  variants?: ProductVariant[];
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  colors: string[];
  status: 'Draft' | 'Published';
  taxCategory: 'Standard' | 'Reduced' | 'Exempt';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
  tags?: string[];
  sales?: number;
  sizeChartImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  receiptUrl?: string;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
  status: 'PENDING' | 'APPROVED';
  reply?: string;
  images?: string[];
}

export interface CartItem extends Product {
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  role: AdminRole;
  details?: {
    field?: string;
    previousValue?: string | number;
    newValue?: string | number;
    entityId?: string;
  };
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  EDITOR = 'EDITOR',
  SUPPORT = 'SUPPORT',
  CUSTOMER = 'CUSTOMER'
}

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  lastLogin: string;
  password?: string;
  canManageChat?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: {
    size: string;
    color: string;
  };
  customDesign?: {
    color: string;
    sleeveColor: string;
    logoUrl?: string;
    type: string;
  };
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  date: string;
  time: string;
  total: number;
  subtotal: number;
  discount: number;
  status: 'PENDING' | 'SHIPPED' | 'CANCELLED' | 'DELIVERED';
  items: number;
  orderItems: OrderItem[];
  shippingAddress: string;
  billingAddress?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  trackingProvider?: string;
  isPaid?: boolean;
  paymentStatus?: 'PENDING_ADVANCE' | 'ADVANCE_VERIFIED' | 'FULLY_PAID' | 'UNPAID';
  paymentMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'COD' | 'Credit Card' | 'Debit Card' | 'CASH';
  transactionId?: string;
  senderNumber?: string;
  transactionScreenshot?: string;
  advancePaid?: number;
  dueAmount?: number;
  notes?: string;
  deliveryInstructions?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface CategorySEO {
  category: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  orders: number;
  lastSeen: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  notes?: string;
  profileImage?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export enum ViewState {
  STORE = 'STORE',
  SUPPORT = 'SUPPORT',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  CUSTOMER_LOGIN = 'CUSTOMER_LOGIN',
  CUSTOMER_PROFILE = 'CUSTOMER_PROFILE',
  WISHLIST = 'WISHLIST',
  TRACK_ORDER = 'TRACK_ORDER',
  ORDER_PREVIEW = 'ORDER_PREVIEW'
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  behance?: string;
  visibility: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
    x: boolean;
    behance?: boolean;
  };
  announcementBanner?: {
    enabled: boolean;
    text: string;
  };
  heroImages?: string[];
  merchantNumbers?: {
    bKash: string;
    Nagad: string;
    Rocket: string;
    creditCard?: string;
    debitCard?: string;
  };
  appearance?: {
    headerColor: string;
    footerColor: string;
    middleColor: string;
    siteLogoUrl: string;
    siteLogoHeight?: number;
    siteLogoWidth?: number;
    siteLogoFileSize?: number;
  };
  siteContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    aboutText?: string;
    heroTitleColor?: string;
    heroTitleSize?: string;
    heroSubtitleColor?: string;
    aboutTextColor?: string;
    announcementBgColor?: string;
    announcementColor?: string;
  };
  categorySEO?: CategorySEO[];
  sale?: {
    enabled: boolean;
    endTime: string; // ISO string
    title: string;
  };
  plugins?: {
    id: string;
    name: string;
    enabled: boolean;
  }[];
  agentApiKey?: string;
  sizeChartImage?: string;
}

export interface SecretValues {
  stripeSecretKey: string;
  stripePublishableKey: string;
  geminiApiKey: string;
  adminTwoFactorSecret: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
  [key: string]: string | undefined;
}

export interface SocialReferral {
  platform: string;
  visits: number;
  conversions: number;
  revenue: number;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number;
  expiryDate?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  image?: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface ChatSession {
  id: string;
  customerName: string;
  customerEmail: string;
  userId?: string;
  lastMessage: string;
  lastTimestamp: string;
  messages: ChatMessage[];
  status: 'ACTIVE' | 'CLOSED';
  isPresenceActive?: boolean;
  lastPresenceUpdate?: string;
  rating?: number;
  feedbackText?: string;
  ratedAt?: string;
}

export interface NewsletterSubscription {
  id: string;
  email: string;
  subscribedAt: string;
  status: 'active' | 'unsubscribed';
}

