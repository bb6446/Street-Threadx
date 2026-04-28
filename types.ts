
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
  sku?: string;
  description: string;
  materials?: string;
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
  tags?: string[];
  sales?: number;
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
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  EDITOR = 'EDITOR',
  SUPPORT = 'SUPPORT'
}

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  lastLogin: string;
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
  paymentMethod?: 'bKash' | 'Nagad' | 'Rocket' | 'COD' | 'Credit Card';
  transactionId?: string;
  senderNumber?: string;
  advancePaid?: number;
  dueAmount?: number;
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
  notes?: string;
}

export enum ViewState {
  STORE = 'STORE',
  SUPPORT = 'SUPPORT',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  CUSTOMER_LOGIN = 'CUSTOMER_LOGIN',
  CUSTOMER_PROFILE = 'CUSTOMER_PROFILE',
  WISHLIST = 'WISHLIST'
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  visibility: {
    facebook: boolean;
    instagram: boolean;
    linkedin: boolean;
    x: boolean;
  };
  announcementBanner?: {
    enabled: boolean;
    text: string;
  };
  merchantNumbers?: {
    bKash: string;
    Nagad: string;
    Rocket: string;
  };
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
  timestamp: string;
  isAdmin: boolean;
}

export interface ChatSession {
  id: string;
  customerName: string;
  customerEmail: string;
  lastMessage: string;
  lastTimestamp: string;
  messages: ChatMessage[];
  status: 'ACTIVE' | 'CLOSED';
}
