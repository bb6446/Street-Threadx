
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';
import { generateSEOContent, generateSupportReply, generateAnalyticsReport, generateProductDescription } from '../services/geminiService';
import { updateProductStock, updateProductPrice, saveProductToFirestore, updateProductsBulk } from '../services/productService';
import PosSystem from './PosSystem';
import Markdown from 'react-markdown';
import { MOCK_PRODUCTS } from '../constants';
import { AdminRole, AdminUser, LogEntry, Order, Customer, Product, ProductVariant, SocialSettings, SocialReferral, DiscountCode, Review, ChatSession } from '../types';

interface SupportRelay {
  id: string;
  customer: string;
  subject: string;
  message?: string;
  draftReply?: string;
  isDrafting?: boolean;
  status: 'OPEN' | 'RESOLVED' | 'PENDING';
  timestamp: string;
}

interface Props {
  user: AdminUser;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  socialSettings: SocialSettings;
  setSocialSettings: React.Dispatch<React.SetStateAction<SocialSettings>>;
  socialReferrals: SocialReferral[];
  onLogout: () => void;
  logs: LogEntry[];
  addLog: (action: string) => void;
  discountCodes: DiscountCode[];
  setDiscountCodes: React.Dispatch<React.SetStateAction<DiscountCode[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  chatSessions: ChatSession[];
  onSendMessage: (text: string, isAdmin: boolean, targetEmail: string) => void;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800';

const AdminDashboard: React.FC<Props> = ({ user, products, setProducts, orders, setOrders, customers, setCustomers, socialSettings, setSocialSettings, socialReferrals, onLogout, logs, addLog, discountCodes, setDiscountCodes, reviews, setReviews, chatSessions, onSendMessage }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'pending_verification' | 'customers' | 'activity_logs' | 'settings' | 'discounts' | 'reviews' | 'insights' | 'support' | 'pos' | 'chat'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // CRM State
  const [crmQuery, setCrmQuery] = useState('');
  const [crmProcessing, setCrmProcessing] = useState(false);
  const [simPriceChange, setSimPriceChange] = useState(0);

  // Support State
  const [supportRelays, setSupportRelays] = useState<SupportRelay[]>([
    {
      id: 'SR-1001',
      customer: 'ALEX_C',
      subject: 'Where is my order? #ORD-8802',
      message: "Hey, I ordered the Oversized Hoodie 5 days ago and it still shows pending. What's up with that? I need it for a party this weekend.",
      status: 'OPEN',
      timestamp: new Date().toISOString()
    },
    {
      id: 'SR-1002',
      customer: 'JAY_ZETA',
      subject: 'Defective zipper on jacket',
      message: "Yo, the tactical jacket I just got has a broken zipper out of the box. Need a replacement ASAP.",
      status: 'OPEN',
      timestamp: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  // Filtering State
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productTagFilter, setProductTagFilter] = useState('ALL');
  const [productStockFilter, setProductStockFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewProductFilter, setReviewProductFilter] = useState('ALL');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('ALL');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('ALL');
  const [reviewSort, setReviewSort] = useState('NEWEST');
  const [managedReply, setManagedReply] = useState<{ id: string, text: string } | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Management State
  const [managedOrder, setManagedOrder] = useState<Partial<Order> | null>(null);
  const [orderEditStep, setOrderEditStep] = useState(1);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState<string | null>(null);
  const [productDeleteConfirm, setProductDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<boolean>(false);
  const [ordersViewMode, setOrdersViewMode] = useState<'list' | 'kanban'>('list');
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [managedProduct, setManagedProduct] = useState<Partial<Product> | null>(null);
  const [variantStockProduct, setVariantStockProduct] = useState<Product | null>(null);
  const [productEditStep, setProductEditStep] = useState<number>(1);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isEditingMerchants, setIsEditingMerchants] = useState(false);
  const [tempMerchants, setTempMerchants] = useState({ bKash: '', Nagad: '', Rocket: '' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newProductVariant, setNewProductVariant] = useState({ size: '', color: '', stock: 0, sku: '' });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Discount Management State
  const [managedDiscount, setManagedDiscount] = useState<Partial<DiscountCode> | null>(null);

  // Chat Management State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [adminChatInput, setAdminChatInput] = useState('');

  // Variation Wizard State
  const [variationWizardProduct, setVariationWizardProduct] = useState<Product | null>(null);
  const [variationColorsInput, setVariationColorsInput] = useState('');
  const [variationSizesInput, setVariationSizesInput] = useState('');

  const lowStockItems = useMemo(() => products.filter(p => p.stock <= (p.minStockLevel || 10)), [products]);

  const variantExists = useMemo(() => {
    if (!newProductVariant.size || !newProductVariant.color || !managedProduct?.variants) return false;
    return managedProduct.variants.some(
      v => v.size.toLowerCase() === newProductVariant.size.toLowerCase() && 
           v.color.toLowerCase() === newProductVariant.color.toLowerCase()
    );
  }, [managedProduct?.variants, newProductVariant.size, newProductVariant.color]);

  useEffect(() => {
    if (managedProduct?.name && newProductVariant.size && newProductVariant.color && !newProductVariant.sku) {
      const namePart = managedProduct.name.substring(0, 3).toUpperCase();
      const sizePart = newProductVariant.size.toUpperCase();
      const colorPart = newProductVariant.color.substring(0, 3).toUpperCase();
      setNewProductVariant(prev => ({ ...prev, sku: `${namePart}-${sizePart}-${colorPart}` }));
    }
  }, [managedProduct?.name, newProductVariant.size, newProductVariant.color]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.id.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.tags && p.tags.some(tag => tag.toLowerCase().includes(productSearch.toLowerCase())));
      const matchCategory = productCategoryFilter === 'ALL' || p.category === productCategoryFilter;
      const matchTag = productTagFilter === 'ALL' || (p.tags && p.tags.includes(productTagFilter));
      let matchStock = true;
      if (productStockFilter === 'LOW') matchStock = p.stock > 0 && p.stock <= (p.minStockLevel || 10);
      if (productStockFilter === 'OUT') matchStock = p.stock === 0;
      if (productStockFilter === 'IN') matchStock = p.stock > (p.minStockLevel || 10);
      
      return matchSearch && matchCategory && matchTag && matchStock;
    });
  }, [products, productSearch, productCategoryFilter, productTagFilter, productStockFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      let matchPrice = true;
      if (priceFilter === 'LOW') matchPrice = o.total < 10000;
      if (priceFilter === 'MID') matchPrice = o.total >= 10000 && o.total <= 20000;
      if (priceFilter === 'HIGH') matchPrice = o.total > 20000;
      
      let matchDate = true;
      if (dateRange.start) matchDate = matchDate && o.date >= dateRange.start;
      if (dateRange.end) matchDate = matchDate && o.date <= dateRange.end;

      return matchSearch && matchStatus && matchPrice && matchDate;
    });
  }, [orders, orderSearch, statusFilter, priceFilter, dateRange]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
      l.user.toLowerCase().includes(logSearch.toLowerCase())
    );
  }, [logs, logSearch]);

  const filteredReviews = useMemo(() => {
    let result = reviews.filter(r => {
      const product = products.find(p => p.id === r.productId);
      const matchSearch = r.author.toLowerCase().includes(reviewSearch.toLowerCase()) || 
                          r.comment.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                          (product && product.name.toLowerCase().includes(reviewSearch.toLowerCase()));
      const matchProduct = reviewProductFilter === 'ALL' || r.productId === reviewProductFilter;
      const matchRating = reviewRatingFilter === 'ALL' || r.rating.toString() === reviewRatingFilter;
      const matchStatus = reviewStatusFilter === 'ALL' || r.status === reviewStatusFilter;
      return matchSearch && matchProduct && matchRating && matchStatus;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return reviewSort === 'NEWEST' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [reviews, reviewSearch, reviewProductFilter, reviewRatingFilter, reviewStatusFilter, reviewSort, products]);

  const handleRestock = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
      await updateProductStock(productId, product.stock + 50);
      addLog(`STOCK_BOOST: ID_${productId} +50_UNITS (FIRE_SYNC)`);
    } catch (err) {
      console.error(err);
      // Fallback local update if firestore fails
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + 50 } : p));
      addLog(`STOCK_BOOST_LOCAL_ONLY: ID_${productId}`);
    }
  };

  const handleDraftSupportReply = async (relayId: string, subject: string, message: string) => {
    setSupportRelays(prev => prev.map(r => r.id === relayId ? { ...r, isDrafting: true } : r));
    try {
      const relay = supportRelays.find(r => r.id === relayId);
      const customer = customers.find(c => c.name === relay?.customer || c.email === relay?.customer);
      const customerOrders = orders.filter(o => o.customerEmail === customer?.email || o.customerName === relay?.customer);
      
      const orderContext = customerOrders.length > 0 
        ? `Customer recent orders:\n${customerOrders.slice(0, 3).map(o => `- Order ${o.id}: Status ${o.status}, Total ৳${o.total}, Items: ${o.orderItems?.map(i => i.name).join(', ') || 'N/A'}`).join('\n')}`
        : 'Customer has no known previous orders.';
      
      const customerInfoText = customer 
        ? `Customer Info: Name: ${customer.name}, Email: ${customer.email}, Total Spent: ৳${customer.totalSpent}`
        : `Customer Name: ${relay?.customer || 'Unknown'}`;
        
      const fullCustomerContext = `${customerInfoText}\n${orderContext}`;
      const fullContext = `SUBJECT: ${subject}\nMESSAGE: ${message}`;

      const draft = await generateSupportReply(fullContext, fullCustomerContext);
      setSupportRelays(prev => prev.map(r => r.id === relayId ? { ...r, draftReply: draft, isDrafting: false } : r));
      addLog(`AI_DRAFT_READY: Support ${relayId} - Response synthesized by CORE_AI`);
    } catch (err) {
      console.error('Draft generation failed:', err);
      setSupportRelays(prev => prev.map(r => r.id === relayId ? { ...r, isDrafting: false } : r));
    }
  };

  const handleCommitOrder = () => {
    if (!managedOrder) return;
    
    const finalOrder = {
      ...managedOrder,
      id: managedOrder.id || `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
      date: managedOrder.date || new Date().toISOString().split('T')[0],
      time: managedOrder.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: managedOrder.status || 'PENDING',
      items: managedOrder.orderItems?.reduce((acc, item) => acc + item.quantity, 0) || 0,
      subtotal: managedOrder.orderItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0,
      total: (managedOrder.orderItems?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0) - (managedOrder.discount || 0)
    } as Order;

    if (managedOrder.id && orders.some(o => o.id === managedOrder.id)) {
      setOrders(prev => prev.map(o => o.id === managedOrder.id ? finalOrder : o));
      addLog(`ORDER_UPDATE: ${finalOrder.id}`);
    } else {
      setOrders(prev => [finalOrder, ...prev]);
      addLog(`ORDER_CREATE: ${finalOrder.id}`);
    }
    
    setManagedOrder(null);
    setOrderEditStep(1);
  };

  const handleUpdateOrderStatus = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as Order['status'] } : o));
    addLog(`ORDER_STATUS_UPDATE: ${id} -> ${newStatus}`);
  };

  const handleTogglePaid = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, isPaid: !o.isPaid } : o));
    addLog(`ORDER_PAYMENT_UPDATE: ${id}`);
  };

  const handleVerifyAdvance = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentStatus: 'ADVANCE_VERIFIED' } : o));
    // Simulate automated SMS/Email trigger
    addLog(`ADVANCE_VERIFIED: ${id} - SMS Triggered`);
  };

  const handleRejectAdvance = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, paymentStatus: 'UNPAID', status: 'CANCELLED' } : o));
    addLog(`ADVANCE_REJECTED: ${id}`);
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    addLog(`ORDER_DELETE: ${id}`);
    setOrderDeleteConfirm(null);
  };

  const handleSaveProduct = async () => {
    if (!managedProduct) return;
    
    const finalImages = managedProduct.images && managedProduct.images.length > 0 
      ? managedProduct.images 
      : [DEFAULT_IMAGE];

    const totalStock = managedProduct.variants && managedProduct.variants.length > 0
      ? managedProduct.variants.reduce((acc, v) => acc + v.stock, 0)
      : managedProduct.stock || 0;

    const productPayload = { 
      ...managedProduct, 
      id: managedProduct.id || (Math.max(...products.map(p => parseInt(p.id)), 0) + 1).toString(),
      images: finalImages,
      stock: totalStock,
      status: managedProduct.status || 'Draft',
      taxCategory: managedProduct.taxCategory || 'Standard',
      minStockLevel: managedProduct.minStockLevel || 10
    } as Product;

    try {
      await saveProductToFirestore(productPayload);
      addLog(`${managedProduct.id ? 'PRODUCT_UPDATE' : 'PRODUCT_INIT'}: ${productPayload.name} (FIRE_SYNC)`);
      setManagedProduct(null);
      setProductEditStep(1);
      setNewImageUrl('');
    } catch (err) {
      console.error(err);
      // Fallback
      if (managedProduct.id) {
        setProducts(prev => prev.map(p => p.id === managedProduct.id ? productPayload : p));
      } else {
        setProducts(prev => [productPayload, ...prev]);
      }
      setManagedProduct(null);
      setProductEditStep(1);
      setNewImageUrl('');
    }
  };

  const handleSaveVariantStock = async () => {
    if (!variantStockProduct) return;
    const totalStock = variantStockProduct.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
    const updatedProduct = { ...variantStockProduct, stock: totalStock } as Product;
    
    try {
      await saveProductToFirestore(updatedProduct);
      addLog(`VARIANT_STOCK_UPDATE: ${updatedProduct.name} (FIRE_SYNC)`);
      setVariantStockProduct(null);
    } catch (err) {
      console.error(err);
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      setVariantStockProduct(null);
    }
  };

  const handleDuplicateProduct = (product: Product) => {
    const newId = (Math.max(...products.map(p => parseInt(p.id)), 0) + 1).toString();
    const duplicatedProduct: Product = {
      ...product,
      id: newId,
      name: `${product.name} (COPY)`,
      status: 'Draft',
      stock: 0
    };
    setProducts(prev => [duplicatedProduct, ...prev]);
    addLog(`PRODUCT_DUPLICATE: ${product.name} -> ${duplicatedProduct.name}`);
  };

  const handleDeleteProduct = (productId: string) => {
    setProductDeleteConfirm(productId);
  };

  const confirmDeleteProduct = () => {
    if (!productDeleteConfirm) return;
    const product = products.find(p => p.id === productDeleteConfirm);
    if (product) {
      setProducts(prev => prev.filter(p => p.id !== productDeleteConfirm));
      addLog(`PRODUCT_DELETE: ${product.name} (ID_${productDeleteConfirm})`);
    }
    setProductDeleteConfirm(null);
  };

  const confirmBulkDelete = () => {
    setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
    addLog(`BULK_DELETE: ${selectedProducts.length} ASSETS`);
    setSelectedProducts([]);
    setBulkDeleteConfirm(false);
  };

  const handleEditMerchants = () => {
    setTempMerchants({
      bKash: socialSettings.merchantNumbers?.bKash || '01929667716',
      Nagad: socialSettings.merchantNumbers?.Nagad || '01929667716',
      Rocket: socialSettings.merchantNumbers?.Rocket || '01929667716'
    });
    setIsEditingMerchants(true);
  };

  const handleSaveMerchants = () => {
    setSocialSettings(prev => ({
      ...prev,
      merchantNumbers: tempMerchants
    }));
    setIsEditingMerchants(false);
    addLog('MERCHANT_NUMBERS_UPDATED');
  };

  const handleBulkAction = (action: string) => {
    if (selectedProducts.length === 0) return;

    if (action === 'DELETE') {
      setBulkDeleteConfirm(true);
      return;
    }

    let categoryToSet = '';
    if (action === 'UPDATE_CATEGORY') {
      const input = window.prompt('Enter new category (Hoodies, T-Shirts, Accessories, Sweaters):');
      if (!input || !['Hoodies', 'T-Shirts', 'Accessories', 'Sweaters'].includes(input)) {
        alert('Invalid category');
        return;
      }
      categoryToSet = input;
    }

    let pricePercentage = 0;
    if (action === 'UPDATE_PRICE_PERCENT') {
      const input = window.prompt('Enter percentage change (e.g. 10 for +10%, -5 for -5%):');
      if (input === null || isNaN(parseFloat(input))) {
        alert('Invalid percentage');
        return;
      }
      pricePercentage = parseFloat(input);
    }

    let stockUpdateType = 'FIXED';
    let stockUpdateValue = 0;
    if (action === 'UPDATE_STOCK') {
      const input = window.prompt('Enter stock change. Use % for percentage (e.g., %10, %-20) or a number for fixed amount (e.g., 50, -10):');
      if (input === null || input.trim() === '') return;

      const trimmedInput = input.trim();
      if (trimmedInput.startsWith('%')) {
        stockUpdateType = 'PERCENT';
        stockUpdateValue = parseFloat(trimmedInput.substring(1));
      } else {
        stockUpdateType = 'FIXED';
        stockUpdateValue = parseInt(trimmedInput);
      }

      if (isNaN(stockUpdateValue)) {
        alert('Invalid stock change value');
        return;
      }
    }

    const updatedProducts = products.map(p => {
      if (selectedProducts.includes(p.id)) {
        if (action === 'OUT_OF_STOCK') {
          return { ...p, stock: 0, variants: p.variants?.map(v => ({ ...v, stock: 0 })) };
        }
        if (action === 'PRICE_UP_10') return { ...p, price: Math.round(p.price * 1.1) };
        if (action === 'PUBLISH') return { ...p, status: 'Published' as const };
        if (action === 'UPDATE_CATEGORY') return { ...p, category: categoryToSet as any };
        if (action === 'UPDATE_PRICE_PERCENT') return { ...p, price: Math.round(p.price * (1 + pricePercentage / 100)) };
        if (action === 'UPDATE_STOCK') {
          let newStock = p.stock;
          let newVariants = p.variants;

          if (stockUpdateType === 'PERCENT') {
            newStock = Math.round(p.stock * (1 + stockUpdateValue / 100));
            if (p.variants) {
              newVariants = p.variants.map(v => ({ ...v, stock: Math.max(0, Math.round(v.stock * (1 + stockUpdateValue / 100))) }));
            }
          } else {
            newStock = p.stock + stockUpdateValue;
            if (p.variants) {
              newVariants = p.variants.map(v => ({ ...v, stock: Math.max(0, v.stock + stockUpdateValue) }));
            }
          }

          const totalVariantStock = newVariants?.reduce((acc, v) => acc + v.stock, 0);
          
          return { 
            ...p, 
            stock: newVariants ? (totalVariantStock ?? Math.max(0, newStock)) : Math.max(0, newStock), 
            variants: newVariants 
          };
        }
      }
      return p;
    });

    // Pushing updates to Firestore
    const productsToUpdate = updatedProducts.filter(p => selectedProducts.includes(p.id));
    
    // We'll use a series of save calls or a bulk update if possible. 
    // Since each product might have different values (stock/price), simple bulk update with same values won't work for percentages.
    const syncBulk = async () => {
      try {
        for (const p of productsToUpdate) {
          await saveProductToFirestore(p);
        }
        addLog(`BULK_ACTION_SYNC: ${action} ON ${selectedProducts.length} ASSETS (FIRE_SYNC)`);
      } catch (err) {
        console.error("Bulk Firestore Sync Failed:", err);
        addLog(`BULK_ACTION_LOCAL_ONLY: ${action} ON ${selectedProducts.length} ASSETS`);
        // Fallback happened in App state anyway if user is lucky
      }
    };
    
    syncBulk();

    // Still update local state for immediate feedback
    setProducts(updatedProducts);
    setSelectedProducts([]);
  };

  const handleSaveDiscount = () => {
    if (!managedDiscount) return;
    
    const finalDiscount = {
      ...managedDiscount,
      id: managedDiscount.id || Math.random().toString(36).substr(2, 9),
      usageCount: managedDiscount.usageCount || 0,
      isActive: managedDiscount.isActive !== undefined ? managedDiscount.isActive : true,
      minPurchase: managedDiscount.minPurchase || 0,
      usageLimit: managedDiscount.usageLimit || 0
    } as DiscountCode;

    if (managedDiscount.id) {
      setDiscountCodes(prev => prev.map(d => d.id === managedDiscount.id ? finalDiscount : d));
      addLog(`DISCOUNT_UPDATE: ${finalDiscount.code}`);
    } else {
      setDiscountCodes(prev => [finalDiscount, ...prev]);
      addLog(`DISCOUNT_INIT: ${finalDiscount.code}`);
    }
    setManagedDiscount(null);
  };

  const handleGenerateAiImages = () => {
    if (!managedProduct) return;
    const category = managedProduct.category || 'Streetwear';
    const placeholders = [
      `https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}`,
      `https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}`,
      `https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}`
    ];
    setManagedProduct(prev => ({
      ...prev,
      images: [...(prev?.images || []), ...placeholders]
    }));
    addLog(`AI_MEDIA_GENERATE: ${placeholders.length}_PLACEHOLDERS_INJECTED`);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (!managedProduct || !managedProduct.images) return;
    const images = [...managedProduct.images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    
    [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
    setManagedProduct({ ...managedProduct, images });
  };

  const handleDeleteDiscount = (id: string) => {
    if (window.confirm('Are you sure you want to delete this discount code?')) {
      setDiscountCodes(prev => prev.filter(d => d.id !== id));
      addLog(`DISCOUNT_DELETE: ${id}`);
    }
  };
  const handleApproveReview = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    addLog(`REVIEW_APPROVE: ID_${id}`);
  };

  const handleReplyReview = (id: string, text: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, reply: text, status: 'APPROVED' } : r));
    addLog(`REVIEW_REPLY: ID_${id}`);
    setManagedReply(null);
  };

  const handleDeleteReview = (id: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      setReviews(prev => prev.filter(r => r.id !== id));
      addLog(`REVIEW_DELETE: ID_${id}`);
    }
  };

  const handleQuickStockUpdate = async (productId: string, newStock: number) => {
    try {
      await updateProductStock(productId, newStock);
      addLog(`QUICK_STOCK_UPDATE: ID_${productId} -> ${newStock} (FIRE_SYNC)`);
    } catch (err) {
      console.error(err);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
    }
  };

  const handleQuickPriceUpdate = async (productId: string, newPrice: number) => {
    try {
      await updateProductPrice(productId, newPrice);
      addLog(`QUICK_PRICE_UPDATE: ID_${productId} -> ৳${newPrice} (FIRE_SYNC)`);
    } catch (err) {
      console.error(err);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'amber';
      case 'SHIPPED': return 'blue';
      case 'DELIVERED': return 'emerald';
      case 'CANCELLED': return 'rose';
      default: return 'zinc';
    }
  };

  const statusColors: Record<string, string> = {
    amber: '#FFA41C',
    blue: '#0055ff',
    emerald: '#10b981',
    rose: '#f43f5e',
    zinc: '#71717a'
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a ghost image or style if needed
    const target = e.target as HTMLElement;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) {
      handleUpdateOrderStatus(orderId, newStatus);
    }
  };

  const addVariant = () => {
    if (!newProductVariant.size || !newProductVariant.color || newProductVariant.stock < 0 || variantExists) return;
    const variants = managedProduct?.variants || [];
    setManagedProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: [...variants, newProductVariant],
        sizes: prev.sizes?.includes(newProductVariant.size) ? prev.sizes : [...(prev.sizes || []), newProductVariant.size],
        colors: prev.colors?.includes(newProductVariant.color) ? prev.colors : [...(prev.colors || []), newProductVariant.color]
      };
    });
    setNewProductVariant({ size: '', color: '', stock: 0, sku: '' });
  };

  const handleGenerateAutoSKUs = () => {
    if (!managedProduct || !managedProduct.variants) return;
    const baseName = (managedProduct.name || 'PRD').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newVariants = managedProduct.variants.map((v, i) => {
      const sizeStr = v.size.substring(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const colorStr = v.color.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const uniqueId = Math.random().toString(36).substr(2, 4).toUpperCase();
      const sku = `${baseName}-${colorStr}-${sizeStr}-${uniqueId}`;
      return { ...v, sku }; // replace all SKUs to make sure they match
    });
    setManagedProduct({ ...managedProduct, variants: newVariants });
    addLog(`AUTO_SKU_GENERATE: ${newVariants.length}_VARIANTS`);
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === dropIndex || !managedProduct || !managedProduct.images) return;
    
    const newImages = [...managedProduct.images];
    const [draggedImg] = newImages.splice(draggedImageIndex, 1);
    newImages.splice(dropIndex, 0, draggedImg);
    
    setManagedProduct({ ...managedProduct, images: newImages });
    setDraggedImageIndex(null);
  };


  const removeVariant = (size: string, color: string) => {
    setManagedProduct(prev => ({
      ...prev,
      variants: prev?.variants?.filter(v => !(v.size === size && v.color === color))
    }));
  };

  const updateVariantStock = (size: string, color: string, newStock: number) => {
    setManagedProduct(prev => ({
      ...prev,
      variants: prev?.variants?.map(v => 
        (v.size === size && v.color === color) ? { ...v, stock: newStock } : v
      )
    }));
  };

  const generateAllVariants = () => {
    if (!managedProduct?.sizes?.length || !managedProduct?.colors?.length) {
      alert('Please define sizes and colors first');
      return;
    }
    const newVariants: ProductVariant[] = [];
    managedProduct.sizes.forEach(size => {
      managedProduct.colors?.forEach(color => {
        newVariants.push({
          size,
          color,
          stock: 0,
          sku: `${managedProduct.name?.substring(0, 3).toUpperCase()}-${size}-${color.substring(0, 3).toUpperCase()}`
        });
      });
    });
    setManagedProduct(prev => ({ ...prev, variants: newVariants }));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Simulate parsing
    addLog(`CSV_UPLOAD_START: ${file.name}`);
    setTimeout(() => {
      addLog(`CSV_UPLOAD_COMPLETE: 12_ASSETS_IMPORTED`);
      alert('Simulated: 12 products imported from CSV');
    }, 1500);
  };

  const salesData = [
    { name: 'Mon', sales: 4000, revenue: 24000 },
    { name: 'Tue', sales: 3000, revenue: 13980 },
    { name: 'Wed', sales: 2000, revenue: 98000 },
    { name: 'Thu', sales: 2780, revenue: 39080 },
    { name: 'Fri', sales: 1890, revenue: 48000 },
    { name: 'Sat', sales: 2390, revenue: 38000 },
    { name: 'Sun', sales: 3490, revenue: 43000 },
  ];

  const categoryData = [
    { name: 'Hoodies', value: 400 },
    { name: 'T-Shirts', value: 300 },
    { name: 'Accessories', value: 300 },
    { name: 'Sweaters', value: 200 },
  ];

  const COLORS = ['#0055ff', '#00c49f', '#ffbb28', '#ff8042'];

  const handleAiGenerateDescription = async () => {
    if (!managedProduct?.name || !managedProduct?.category) return;
    setIsGeneratingDescription(true);
    try {
      const desc = await generateProductDescription(
        managedProduct.name, 
        managedProduct.category,
        managedProduct.description
      );
      setManagedProduct(prev => ({ ...prev, description: desc }));
      addLog(`AI_DESC_GENERATE: ASSET_${managedProduct.name}`);
    } catch (err) {
      console.error('Failed to generate description:', err);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAiGenerateSeo = async (target: 'title' | 'description' | 'both' = 'both') => {
    if (!managedProduct?.name || !managedProduct?.description || !managedProduct?.category) {
      alert('Please provide a name, description, and category first.');
      return;
    }
    setIsGeneratingSeo(true);
    try {
      const seo = await generateSEOContent(
        managedProduct.name, 
        managedProduct.description, 
        managedProduct.category,
        managedProduct.tags || []
      );
      
      setManagedProduct(prev => {
        const update: any = { ...prev };
        if (target === 'title' || target === 'both') update.seoTitle = seo.seoTitle;
        if (target === 'description' || target === 'both') update.seoDescription = seo.seoDescription;
        return update;
      });
      
      addLog(`AI_SEO_GENERATE: ${target.toUpperCase()}_FOR_${managedProduct.name}`);
    } catch (err) {
      console.error('Failed to generate SEO content:', err);
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleCommitVariations = () => {
    if (!variationWizardProduct) return;
    const newColors = variationColorsInput.split(',').map(c => c.trim()).filter(c => c && !variationWizardProduct.colors.includes(c));
    const newSizes = variationSizesInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s && !variationWizardProduct.sizes.includes(s));
    if (newColors.length === 0 && newSizes.length === 0) {
      setVariationWizardProduct(null);
      return;
    }
    setProducts(prev => prev.map(p => {
      if (p.id === variationWizardProduct.id) {
        return {
          ...p,
          colors: [...p.colors, ...newColors],
          sizes: [...p.sizes, ...newSizes]
        };
      }
      return p;
    }));
    addLog(`VARIATION_INJECT: ID_${variationWizardProduct.id} (+${newColors.length}C, +${newSizes.length}S)`);
    setVariationWizardProduct(null);
    setVariationColorsInput('');
    setVariationSizesInput('');
  };

  const addImageToManagedProduct = () => {
    if (!newImageUrl.trim() || !managedProduct) return;
    const urls = newImageUrl.split(',').map(url => url.trim()).filter(url => url);
    const currentImages = managedProduct.images || [];
    setManagedProduct({ ...managedProduct, images: [...currentImages, ...urls] });
    setNewImageUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !managedProduct) return;

    Array.from(files).forEach((file: File) => {
      if (file.type === 'image/png' || file.type === 'image/jpeg') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setManagedProduct(prev => ({
            ...prev,
            images: [...(prev?.images || []), result]
          }));
        };
        reader.readAsDataURL(file);
      } else {
        alert('Only PNG and JPG files are supported.');
      }
    });
  };

  const removeImageFromManagedProduct = (index: number) => {
    if (!managedProduct || !managedProduct.images) return;
    const nextImages = managedProduct.images.filter((_, i) => i !== index);
    setManagedProduct({ ...managedProduct, images: nextImages });
  };

  const setPrimaryImage = (index: number) => {
    if (!managedProduct || !managedProduct.images) return;
    const images = [...managedProduct.images];
    const [selected] = images.splice(index, 1);
    images.unshift(selected);
    setManagedProduct({ ...managedProduct, images });
  };

  const StatusBadge = ({ status }: { status: Order['status'] | SupportRelay['status'] }) => {
    const colors = {
      SHIPPED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
      OPEN: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      RESOLVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    };
    return (
      <span className={`text-[8px] font-black px-2 py-0.5 rounded-none border uppercase tracking-widest ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  const themeClasses = isDarkMode ? "bg-[#020202] text-white border-zinc-800" : "bg-zinc-50 text-zinc-900 border-zinc-200";
  const cardClasses = isDarkMode ? "bg-black/40 border-zinc-800" : "bg-white border-zinc-200 shadow-sm";

  const canManageProducts = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.EDITOR;
  const canManageOrders = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.SUPPORT;
  const canManageCustomers = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.SUPPORT;
  const canViewLogs = user.role === AdminRole.SUPER_ADMIN;

  const availableTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', hidden: !canManageProducts },
    { id: 'orders', label: 'Orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', hidden: !canManageOrders },
    { id: 'pending_verification', label: 'Payment Verification', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', hidden: !canManageOrders },
    { id: 'customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', hidden: !canManageCustomers },
    { id: 'pos', label: 'POS Terminal', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', hidden: !canManageOrders },
    { id: 'support', label: 'Support Inquiries', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', hidden: !canManageCustomers },
    { id: 'insights', label: 'Insights', icon: 'M13 10V3L4 14h7v7l9-11h-7z', hidden: !canManageCustomers },
    { id: 'chat', label: 'Live Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', hidden: !canManageCustomers },
    { id: 'discounts', label: 'Discounts', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', hidden: !canManageProducts },
    { id: 'reviews', label: 'Reviews', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', hidden: !canManageProducts },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', hidden: !canManageProducts },
    { id: 'activity_logs', label: 'Activity Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', hidden: !canViewLogs },
  ].filter(t => !t.hidden);

  return (
    <div className={`min-h-screen flex flex-col font-mono selection:bg-[#0055ff] selection:text-white transition-colors duration-300 ${themeClasses}`}>
      <div className="flex flex-1">
        <aside className={`w-72 border-r flex flex-col p-8 space-y-10 relative z-20 transition-colors duration-300 ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#0055ff]"></div>
              <h2 className="text-2xl font-black heading-font tracking-tighter uppercase">STREET<span className="text-[#0055ff]">THREADX</span></h2>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {availableTabs.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full text-left px-5 py-3 rounded-none transition-all flex items-center gap-4 ${activeTab === tab.id ? 'bg-[#0055ff] text-white' : 'opacity-70 hover:bg-zinc-500/5'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{tab.label}</span>
                {tab.id === 'pending_verification' && orders.filter(o => o.paymentStatus === 'PENDING_ADVANCE').length > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-none bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                )}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="w-full py-4 border text-[9px] font-black uppercase tracking-[0.4em]">DISCONNECT</button>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-y-auto no-scrollbar">
          <header className={`h-20 border-b flex items-center justify-between px-10 transition-colors duration-300 ${isDarkMode ? 'bg-black/50 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
            <h1 className="text-lg font-black uppercase tracking-[0.4em]">{activeTab.replace('_', ' ')}</h1>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-[9px] font-black uppercase border border-zinc-500/30 px-3 py-1">{isDarkMode ? 'LIGHT_MODE' : 'DARK_MODE'}</button>
          </header>

          <div className="p-10 space-y-10 animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className={`border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-4">Total Revenue</h3>
                    <p className="text-4xl font-black italic uppercase">৳4,290,400</p>
                    <div className="mt-2 text-[10px] text-emerald-500 font-bold">+12.5% vs last month</div>
                  </div>
                  <div className={`border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-4">Total Orders</h3>
                    <p className="text-4xl font-black italic uppercase">{orders.length}</p>
                    <div className="mt-2 text-[10px] text-emerald-500 font-bold">+4.2% vs last month</div>
                  </div>
                  <div className={`border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-4">Active Customers</h3>
                    <p className="text-4xl font-black italic uppercase">1,204</p>
                  </div>
                  <div className={`border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-4">Conversion Rate</h3>
                    <p className="text-4xl font-black italic uppercase">3.2%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className={`border p-8 rounded-none ${cardClasses} h-[400px]`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-8">Revenue Trends</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={salesData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0055ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0055ff" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#222' : '#eee'} vertical={false} />
                        <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value/1000}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', border: '1px solid #333', fontSize: '10px' }}
                          itemStyle={{ color: '#0055ff' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#0055ff" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={`border p-8 rounded-none ${cardClasses} h-[400px]`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-8">Category Distribution</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className={`col-span-2 border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-6">Top Selling Products</h3>
                    <div className="space-y-4">
                      {products.slice(0, 4).map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <span className="text-zinc-500 text-[10px] font-black">0{i+1}</span>
                            <img src={p.images[0]} className="w-10 h-10 object-cover border border-zinc-800" alt="" />
                            <span className="text-xs font-black uppercase group-hover:text-[#0055ff] transition-colors">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black">৳{(p.price * (10 + i)).toLocaleString()}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">{10 + i} Sales</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`border p-8 rounded-none ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-6">Low Stock Alerts</h3>
                    <div className="space-y-4">
                      {lowStockItems.length > 0 ? lowStockItems.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase truncate max-w-[150px]">{p.name}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-none ${p.stock === 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                            {p.stock} LEFT
                          </span>
                        </div>
                      )) : (
                        <div className="text-[10px] text-zinc-500 uppercase italic">All stock levels healthy.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setManagedProduct({ name: '', price: 0, stock: 0, category: 'Hoodies', description: '', sizes: ['M'], colors: ['Black'], images: [], status: 'Draft', taxCategory: 'Standard', minStockLevel: 10 })} className="bg-[#0055ff] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0055ff]/20 hover:scale-105 transition-transform">Initialize_New_Asset</button>
                    <label className="bg-zinc-800 text-white px-6 py-4 text-[10px] font-black uppercase cursor-pointer hover:bg-zinc-700 transition-colors">
                      Bulk_CSV_Upload
                      <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                    </label>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="SEARCH_ASSETS..." 
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className={`pl-10 pr-4 py-3 text-[10px] font-black uppercase border focus:border-[#0055ff] outline-none transition-all w-64 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    <select 
                      value={productCategoryFilter} 
                      onChange={e => setProductCategoryFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_CATEGORIES</option>
                      <option value="Hoodies">HOODIES</option>
                      <option value="T-Shirts">T-SHIRTS</option>
                      <option value="Accessories">ACCESSORIES</option>
                      <option value="Sweaters">SWEATERS</option>
                    </select>

                    <select 
                      value={productTagFilter} 
                      onChange={e => setProductTagFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_TAGS</option>
                      {allTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>

                    <select 
                      value={productStockFilter} 
                      onChange={e => setProductStockFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_STOCK_STATUS</option>
                      <option value="IN">IN_STOCK</option>
                      <option value="LOW">LOW_STOCK</option>
                      <option value="OUT">OUT_OF_STOCK</option>
                    </select>
                  </div>
                </div>

                {selectedProducts.length > 0 && (
                  <div className="bg-[#0055ff]/10 border border-[#0055ff]/30 p-4 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase text-[#0055ff]">{selectedProducts.length} ASSETS_SELECTED</span>
                      <button onClick={() => setSelectedProducts([])} className="text-[9px] font-black uppercase opacity-60 hover:opacity-100">Clear</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleBulkAction('PUBLISH')} className="px-4 py-2 bg-[#0055ff] text-white text-[9px] font-black uppercase">Publish</button>
                      <button onClick={() => handleBulkAction('UPDATE_CATEGORY')} className="px-4 py-2 border border-[#0055ff] text-[#0055ff] text-[9px] font-black uppercase">Category</button>
                      <button onClick={() => handleBulkAction('UPDATE_PRICE_PERCENT')} className="px-4 py-2 border border-[#0055ff] text-[#0055ff] text-[9px] font-black uppercase">Price %</button>
                      <button onClick={() => handleBulkAction('UPDATE_STOCK')} className="px-4 py-2 border border-[#0055ff] text-[#0055ff] text-[9px] font-black uppercase">Stock +/-</button>
                      <button onClick={() => handleBulkAction('OUT_OF_STOCK')} className="px-4 py-2 bg-rose-500 text-white text-[9px] font-black uppercase">Mark Out</button>
                      <button onClick={() => handleBulkAction('DELETE')} className="px-4 py-2 bg-rose-600 text-white text-[9px] font-black uppercase">Delete</button>
                    </div>
                  </div>
                )}

                <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                  <table className="w-full text-left text-[11px] font-black uppercase">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <tr>
                        <th className="px-6 py-4 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedProducts(filteredProducts.map(p => p.id));
                              else setSelectedProducts([]);
                            }}
                          />
                        </th>
                        <th className="px-6 py-4">Asset</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Price (৳)</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p, idx) => {
                        const isLow = p.stock > 0 && p.stock <= (p.minStockLevel || 10);
                        const isOut = p.stock === 0;
                        
                        return (
                          <tr key={p.id} className={`border-b transition-colors ${
                            isDarkMode 
                              ? (idx % 2 === 0 ? 'bg-black/20' : 'bg-white/5') + ' border-zinc-900/50 hover:bg-[#0055ff]/10' 
                              : (idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50') + ' border-zinc-100 hover:bg-zinc-100'
                          }`}>
                            <td className="px-6 py-3">
                              <input 
                                type="checkbox" 
                                checked={selectedProducts.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                                  else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                                }}
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-4">
                                <img src={p.images[0] || DEFAULT_IMAGE} className="w-10 h-12 object-cover border border-zinc-800" alt="" />
                                <div>
                                  <div className="font-black truncate max-w-[200px]">{p.name}</div>
                                  <div className="text-[9px] opacity-40">{p.category}</div>
                                  {p.tags && p.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap max-w-[200px]">
                                      {p.tags.map(tag => (
                                        <span key={tag} className={`text-[7px] px-1.5 py-0.5 rounded-none border uppercase tracking-widest ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-700'}`}>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`text-[8px] px-2 py-0.5 rounded-none border uppercase tracking-widest ${p.status === 'Published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <input 
                                type="number" 
                                value={p.price} 
                                onChange={(e) => handleQuickPriceUpdate(p.id, parseInt(e.target.value))}
                                className={`bg-transparent border-b border-transparent hover:border-[#0055ff] focus:border-[#0055ff] outline-none w-20 transition-all ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={p.stock} 
                                  onChange={(e) => handleQuickStockUpdate(p.id, parseInt(e.target.value))}
                                  className={`bg-transparent border-b border-transparent hover:border-[#0055ff] focus:border-[#0055ff] outline-none w-12 transition-all ${isOut ? 'text-rose-500 font-black' : isLow ? 'text-amber-500 font-black' : ''}`}
                                />
                                {isOut && <span className="w-2 h-2 rounded-none bg-rose-500 animate-pulse"></span>}
                                {isLow && <span className="w-2 h-2 rounded-none bg-amber-500"></span>}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {canManageProducts && (
                                  <>
                                    {p.variants && p.variants.length > 0 && (
                                      <button onClick={() => setVariantStockProduct(p)} className="px-3 py-2 border border-[#0055ff] text-[#0055ff] uppercase text-[9px] font-black hover:bg-[#0055ff] hover:text-white transition-all">Stock</button>
                                    )}
                                    <button onClick={() => handleDuplicateProduct(p)} className="p-2 border border-zinc-500/30 hover:border-[#0055ff] group transition-all" title="Duplicate">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:text-[#0055ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                      </svg>
                                    </button>
                                    <button onClick={() => setManagedProduct(p)} className="px-4 py-2 border border-zinc-500/30 hover:border-white uppercase text-[9px] font-black transition-all">Edit</button>
                                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 border border-zinc-500/30 hover:border-rose-500 group transition-all" title="Delete">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setManagedOrder({ 
                      customerName: '', 
                      customerEmail: '', 
                      shippingAddress: '',
                      billingAddress: '',
                      trackingNumber: '',
                      trackingProvider: '',
                      trackingUrl: '',
                      status: 'PENDING', 
                      orderItems: [], 
                      discount: 0,
                      subtotal: 0,
                      total: 0
                    })} 
                    className="bg-[#0055ff] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0055ff]/20 hover:scale-105 transition-transform"
                  >
                    Create_New_Order
                  </button>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="SEARCH ID, NAME, EMAIL..." 
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                        className={`pl-10 pr-10 py-3 text-[10px] font-black uppercase border focus:border-[#0055ff] outline-none transition-all w-64 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {orderSearch && (
                        <button 
                          onClick={() => setOrderSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-none transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-40 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_STATUS</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                    <select 
                      value={priceFilter} 
                      onChange={e => setPriceFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_PRICES</option>
                      <option value="LOW">&lt; ৳10,000</option>
                      <option value="MID">৳10,000 - ৳20,000</option>
                      <option value="HIGH">&gt; ৳20,000</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
                      />
                      <span className="text-zinc-500 font-black">-</span>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
                      />
                    </div>
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden">
                      <button 
                        onClick={() => setOrdersViewMode('list')}
                        className={`px-4 py-3 text-[10px] font-black uppercase transition-colors ${ordersViewMode === 'list' ? 'bg-[#0055ff] text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                        List
                      </button>
                      <button 
                        onClick={() => setOrdersViewMode('kanban')}
                        className={`px-4 py-3 text-[10px] font-black uppercase transition-colors ${ordersViewMode === 'kanban' ? 'bg-[#0055ff] text-white' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Kanban
                      </button>
                    </div>
                  </div>
                </div>

                {ordersViewMode === 'list' ? (
                  <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                    <table className="w-full text-left text-[11px] font-black uppercase">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Items / Total</th>
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((o, idx) => (
                          <React.Fragment key={o.id}>
                            <tr className={`${isDarkMode ? 'bg-zinc-900/20' : 'bg-zinc-50/50'} border-t border-zinc-800/30`}>
                              <td colSpan={6} className="px-6 py-1.5">
                                <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest">
                                  <span className="text-zinc-500">Order_Timestamp:</span>
                                  <span className="text-[#0055ff] font-bold">{o.date} | {o.time}</span>
                                </div>
                              </td>
                            </tr>
                            <tr className={`border-b transition-colors ${
                              isDarkMode 
                                ? (idx % 2 === 0 ? 'bg-black/20' : 'bg-white/5') + ' border-zinc-900/50 hover:bg-[#0055ff]/10' 
                                : (idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50') + ' border-zinc-100 hover:bg-zinc-100'
                            }`}>
                              <td className="px-6 py-3 text-[#0055ff] font-bold">{o.id}</td>
                              <td className="px-6 py-3">
                                <div className="font-bold">{o.customerName}</div>
                                <div className="text-[9px] opacity-40">{o.customerEmail}</div>
                              </td>
                              <td className="px-6 py-3">
                                <div>{o.items} items</div>
                                <div className="font-bold">৳{o.total.toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-3">
                                <span className={`px-2 py-1 text-[8px] font-black uppercase border tracking-widest ${
                                  o.paymentStatus === 'FULLY_PAID' || o.paymentStatus === 'ADVANCE_VERIFIED' || o.isPaid ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 
                                  o.paymentStatus === 'PENDING_ADVANCE' ? 'bg-[#0055ff]/10 text-[#0055ff] border-[#0055ff]/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }`}>
                                  {o.paymentMethod || 'COD'}
                                </span>
                                {o.paymentStatus && <div className="text-[8px] text-zinc-500 font-bold mt-1 uppercase">{o.paymentStatus.replace('_', ' ')}</div>}
                              </td>
                              <td className="px-6 py-3">
                                <select
                                  value={o.status}
                                  onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                  className={`px-2 py-1 text-[9px] font-black uppercase border cursor-pointer outline-none tracking-widest ${
                                    o.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 
                                    o.status === 'SHIPPED' ? 'bg-[#0055ff]/10 text-[#0055ff] border-[#0055ff]/30' : 
                                    o.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  }`}
                                >
                                  <option value="PENDING" className={`text-amber-500 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>PENDING</option>
                                  <option value="SHIPPED" className={`text-[#0055ff] ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>SHIPPED</option>
                                  <option value="DELIVERED" className={`text-emerald-500 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>DELIVERED</option>
                                  <option value="CANCELLED" className={`text-rose-500 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>CANCELLED</option>
                                </select>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleTogglePaid(o.id)} 
                                    className={`px-3 py-2 border ${o.isPaid || o.paymentStatus === 'FULLY_PAID' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white' : 'border-amber-500/50 text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white'} uppercase text-[9px] font-black transition-all`}
                                    title={o.isPaid || o.paymentStatus === 'FULLY_PAID' ? 'Mark Unpaid' : 'Customer Money Received'}
                                  >
                                    {o.isPaid || o.paymentStatus === 'FULLY_PAID' ? 'Paid' : 'Receive $$'}
                                  </button>
                                  <button 
                                    onClick={() => setPreviewOrderId(previewOrderId === o.id ? null : o.id)} 
                                    className="px-3 py-2 border border-[#0055ff]/50 hover:border-[#0055ff] text-[#0055ff] uppercase text-[9px] font-black transition-all"
                                  >
                                    Preview
                                  </button>
                                  <button 
                                    onClick={() => setManagedOrder(o)} 
                                    className="px-4 py-2 border border-zinc-500/30 hover:border-white uppercase text-[9px] font-black transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => setOrderDeleteConfirm(o.id)} 
                                    className="p-2 border border-zinc-500/30 hover:border-rose-500 group transition-all"
                                    title="Delete Order"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {previewOrderId === o.id && (
                                <tr className={`${isDarkMode ? 'bg-zinc-900/40' : 'bg-zinc-50'} border-b border-zinc-800/30`}>
                                  <td colSpan={6} className="px-6 py-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Customer Details */}
                                      <div className={`p-4 border ${isDarkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-200 bg-white'}`}>
                                        <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Customer Details</h4>
                                        <div className="space-y-2 text-xs">
                                          <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                            <span className="opacity-50">Name</span>
                                            <span className="font-bold">{o.customerName}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                            <span className="opacity-50">Email</span>
                                            <span className="font-bold">{o.customerEmail}</span>
                                          </div>
                                          {customers.find(c => c.email === o.customerEmail)?.phone && (
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50">Phone</span>
                                              <span className="font-bold">{customers.find(c => c.email === o.customerEmail)?.phone}</span>
                                            </div>
                                          )}
                                          <div className="mt-4 pt-4 border-t border-zinc-800/50">
                                            <label className="text-[8px] font-black uppercase text-zinc-500 tracking-widest block mb-2">Private Customer Notes</label>
                                            <textarea 
                                              className={`w-full h-20 p-2 text-[10px] font-bold resize-none outline-none border focus:border-[#0055ff] transition-all bg-transparent ${isDarkMode ? 'border-zinc-800' : 'border-zinc-300'}`}
                                              placeholder="Add private notes..."
                                              value={customers.find(c => c.email === o.customerEmail)?.notes || ''}
                                              onChange={(e) => {
                                                const customer = customers.find(c => c.email === o.customerEmail);
                                                if (customer) {
                                                  const updatedCustomer = { ...customer, notes: e.target.value };
                                                  setCustomers(prev => prev.map(c => c.email === o.customerEmail ? updatedCustomer : c));
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Shipping & Payment Details */}
                                      <div className={`p-4 border ${isDarkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-200 bg-white'}`}>
                                        <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Shipping & Payment</h4>
                                        <div className="space-y-2 text-xs">
                                          <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                            <span className="opacity-50">Address</span>
                                            <span className="font-bold max-w-[150px] text-right truncate" title={o.shippingAddress}>{o.shippingAddress}</span>
                                          </div>
                                          {o.trackingNumber && (
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50">Tracking</span>
                                              <span className="font-bold text-[#0055ff]">{o.trackingNumber}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between border-b border-zinc-800/50 pb-1 mt-2 tracking-widest">
                                            <span className="opacity-50">Payment</span>
                                            <span className="font-bold text-amber-500">{o.paymentMethod || 'COD'}</span>
                                          </div>
                                          {['bKash', 'Nagad', 'Rocket'].includes(o.paymentMethod || '') && (
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50">TrxID / Phone</span>
                                              <span className="font-bold truncate" title={`${o.transactionId} / ${o.senderNumber}`}>
                                                {o.transactionId} <br/> {o.senderNumber}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Product Breakdown */}
                                      <div className={`p-4 border ${isDarkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-200 bg-white'}`}>
                                        <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Product Breakdown</h4>
                                        <div className="space-y-2 text-xs">
                                          {o.orderItems && o.orderItems.map((item, i) => (
                                            <div key={i} className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50 truncate max-w-[120px]" title={item.name}>{item.quantity}x {item.name}</span>
                                              <span className="font-bold">৳{(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                          ))}
                                          <div className="flex justify-between pt-2">
                                            <span className="opacity-80">Subtotal</span>
                                            <span className="font-bold">৳{o.subtotal?.toLocaleString() || 0}</span>
                                          </div>
                                          {o.discount > 0 && (
                                            <div className="flex justify-between text-emerald-500">
                                              <span>Discount</span>
                                              <span className="font-bold">-৳{o.discount.toLocaleString()}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between pt-2 font-black text-sm border-t border-zinc-800 mt-2">
                                            <span>Total</span>
                                            <span className="text-[#0055ff]">৳{o.total?.toLocaleString() || 0}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-40">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <div className="text-xs font-black uppercase tracking-widest">No_Orders_Found</div>
                              <button 
                                onClick={() => {
                                  setOrderSearch('');
                                  setStatusFilter('ALL');
                                  setPriceFilter('ALL');
                                  setDateRange({ start: '', end: '' });
                                }}
                                className="text-[#0055ff] text-[10px] font-black uppercase hover:underline"
                              >
                                Reset_All_Filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                ) : (
                  <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar items-start min-h-[600px] perspective-1000">
                    {['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => {
                      const colOrders = filteredOrders.filter(o => o.status === status);
                      const isOver = dragOverStatus === status;
                      const colorKey = getStatusColor(status);
                      const colorHex = statusColors[colorKey];
                      
                      return (
                        <div 
                          key={status} 
                          onDragOver={(e) => handleDragOver(e, status)}
                          onDragLeave={() => setDragOverStatus(null)}
                          onDrop={(e) => handleDrop(e, status)}
                          className={`min-w-[320px] w-80 rounded-none border flex flex-col max-h-[75vh] transition-all duration-300 relative ${
                            isOver 
                              ? `bg-${colorKey}-500/10 border-${colorKey}-500 scale-[1.02] shadow-[0_0_30px_rgba(${colorHex === '#FFA41C' ? '255,164,28' : colorHex === '#0055ff' ? '0,85,255' : colorHex === '#10b981' ? '16,185,129' : '244,63,94'},0.15)]` 
                              : isDarkMode 
                                ? 'bg-zinc-900/50 border-zinc-800' 
                                : 'bg-gray-100/50 border-gray-200'
                          }`}
                          style={isOver ? { borderColor: colorHex } : {}}
                        >
                          <div 
                            className={`p-4 border-b font-black uppercase text-xs sticky top-0 flex justify-between items-center z-10 transition-colors duration-300 ${
                              isOver 
                              ? 'text-white' 
                              : isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'
                            }`}
                            style={isOver ? { backgroundColor: colorHex, borderColor: 'transparent' } : {}}
                          >
                            <div className="flex items-center gap-2">
                              <span 
                                className={`w-2.5 h-2.5 rounded-none transition-colors ${isOver ? 'bg-white' : ''}`}
                                style={!isOver ? { backgroundColor: colorHex } : {}}
                              ></span>
                              {status}
                            </div>
                            <span className={`px-2 py-0.5 rounded-none text-[9px] font-black ${isOver ? 'bg-white/20 text-white' : isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-200 text-black'}`}>{colOrders.length}</span>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar min-h-[200px]">
                            {colOrders.length === 0 && (
                              <div 
                                className={`py-10 text-center text-[9px] font-black uppercase border border-dashed transition-all duration-300 ${
                                  isOver ? 'opacity-100' : 'opacity-20 border-zinc-700'
                                }`}
                                style={isOver ? { borderColor: colorHex, color: colorHex, backgroundColor: `${colorHex}10` } : {}}
                              >
                                Drop Here
                              </div>
                            )}
                            <AnimatePresence mode="popLayout">
                              {colOrders.map(o => (
                                <motion.div 
                                  layout
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  key={o.id} 
                                  draggable
                                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, o.id)}
                                  onDragEnd={(e) => handleDragEnd(e as unknown as React.DragEvent)}
                                  className={`p-5 rounded-none border border-l-4 group cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl ${
                                    isDarkMode 
                                    ? 'bg-black border-zinc-800 hover:border-zinc-700' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                                  style={{ borderLeftColor: colorHex }}
                                >
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                      <span className="font-black text-[11px] tracking-tighter uppercase" style={{ color: colorHex }}>{o.id}</span>
                                      <div className="text-[8px] opacity-40 font-black uppercase tracking-widest">{o.date} // {o.time}</div>
                                    </div>
                                    <div className="h-2 w-2 rounded-none bg-zinc-800 group-hover:opacity-100 opacity-30 transition-all" style={{ backgroundColor: colorHex }}></div>
                                  </div>
                                  
                                  <div className="space-y-1 mb-5">
                                    <div className="font-black text-xs uppercase truncate group-hover:text-[#0055ff] transition-colors">{o.customerName}</div>
                                    <div className="text-[9px] opacity-50 font-black truncate uppercase tracking-tighter">{o.customerEmail}</div>
                                  </div>
  
                                  <div className="space-y-3 mb-5">
                                    {o.orderItems.slice(0, 2).map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight opacity-70">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                                      </div>
                                    ))}
                                    {o.orderItems.length > 2 && (
                                      <div className="text-[8px] font-black uppercase opacity-60 tracking-widest">+{o.orderItems.length - 2} More Items...</div>
                                    )}
                                  </div>
                                  
                                  <div className="flex justify-between items-center border-t pt-4 border-zinc-800/30">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] opacity-40 font-black uppercase mb-0.5">Grand_Total</span>
                                      <div className="text-sm font-black italic tracking-tighter">৳{o.total.toLocaleString()}</div>
                                    </div>
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => setManagedOrder(o)} 
                                        className="p-2 border border-zinc-800 hover:bg-[#0055ff] hover:text-white transition-colors" 
                                        title="Edit Order"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="mb-4">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">NEXUS_INSIGHTS</h2>
                  <p className="text-[10px] font-black uppercase opacity-40 mt-1 tracking-widest text-[#0055ff]">Market Intelligence & Customer Dynamics</p>
                </div>
                {/* AI Command Center */}
                <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/50 border-[#0055ff]/50' : 'bg-white border-[#0055ff]/50'} shadow-[0_0_20px_rgba(0,85,255,0.1)] relative overflow-hidden`}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0055ff] to-transparent opacity-50"></div>
                  <div className="flex items-start md:items-center flex-col md:flex-row gap-4">
                    <div className="p-3 bg-[#0055ff]/10 text-[#0055ff] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 w-full relative">
                      <input 
                        type="text" 
                        placeholder="NEXUS_QUERY: e.g. Show me all high-value clients with dropped sentiment..." 
                        value={crmQuery}
                        onChange={e => setCrmQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && crmQuery) {
                            setCrmProcessing(true);
                            setTimeout(() => setCrmProcessing(false), 1500);
                          }
                        }}
                        className={`w-full bg-transparent text-sm font-bold uppercase tracking-widest outline-none border-b border-zinc-800 focus:border-[#0055ff] pb-2 transition-colors ${crmProcessing ? 'animate-pulse text-[#0055ff]' : isDarkMode ? 'text-white' : 'text-black'}`}
                      />
                      {crmProcessing && <span className="absolute right-0 top-0 text-[10px] font-black uppercase text-[#0055ff] animate-pulse">Processing...</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Col: Insights & Admin Hub */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className={`p-6 border ${cardClasses}`}>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Proactive_Insights_Feed</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 space-y-2">
                          <div className="flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-none animate-pulse"></span>
                            Alert
                          </div>
                          <p className={`text-[11px] font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Revenue dropped 4% relative to expectations in the EU sector due to 3 delayed VIP orders from logistics.</p>
                          <button className="text-[9px] font-black uppercase tracking-widest text-[#0055ff] hover:underline">Draft Follow-up &rarr;</button>
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none"></span>
                            Opportunity
                          </div>
                          <p className={`text-[11px] font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>"Oversized Hoodie" sentiment is peaking (+24%). Suggesting a targeted restock notification to 1,200 leads.</p>
                          <button className="text-[9px] font-black uppercase tracking-widest text-[#0055ff] hover:underline">Execute Campaign &rarr;</button>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 border ${cardClasses}`}>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Zero-Trust_Security_Hub</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-1.5 h-1.5 bg-emerald-500 shrink-0"></div>
                          <div>
                            <div className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-black'}`}>Self-Healing Permission</div>
                            <div className={`text-[9px] opacity-60 mt-0.5 ${isDarkMode ? 'text-white' : 'text-black'}`}>Revoked editor access for dormant token id_EDITOR74 (90d inactive).</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-1.5 h-1.5 bg-amber-500 shrink-0 animate-pulse"></div>
                          <div>
                            <div className="text-[10px] font-black uppercase text-amber-500">Anomaly Blocked</div>
                            <div className={`text-[9px] opacity-60 mt-0.5 ${isDarkMode ? 'text-white' : 'text-black'}`}>Blocked unexpected mass-export attempt of customer.PII from internal segment B.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Col: Digital Twin & Sentiment */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Digital Twin */}
                    <div className={`p-6 border ${cardClasses}`}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Digital_Twin_Simulation // Revenue Modeler</h3>
                        <div className="px-2 py-1 text-[8px] font-black uppercase border border-zinc-500/30 text-zinc-500">Sandbox Mode Active</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className={`text-[10px] font-black uppercase opacity-60 block mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>Adjust Base Price Margin</label>
                          <input 
                            type="range" 
                            min="-20" max="50" 
                            value={simPriceChange}
                            onChange={(e) => setSimPriceChange(parseInt(e.target.value))}
                            className="w-full accent-[#0055ff] bg-zinc-800 h-1 appearance-none outline-none cursor-pointer"
                          />
                          <div className="flex justify-between mt-2 text-[9px] font-black uppercase opacity-40">
                            <span className={isDarkMode ? 'text-white' : 'text-black'}>-20%</span>
                            <span className="text-[#0055ff]">{simPriceChange > 0 ? '+' : ''}{simPriceChange}%</span>
                            <span className={isDarkMode ? 'text-white' : 'text-black'}>+50%</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                            <span className={`text-[9px] font-black uppercase opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>Projected Unit Sales</span>
                            <span className={`text-xl font-black ${simPriceChange > 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {simPriceChange > 0 ? '-' : '+'}{Math.abs(simPriceChange * 1.5).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                            <span className={`text-[9px] font-black uppercase opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>Projected MRR Impact</span>
                            <span className={`text-xl font-black ${simPriceChange > 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {simPriceChange > 0 ? '+' : '-'}{Math.abs(Math.max(-100, simPriceChange * 0.8)).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Map */}
                    <div className={`p-6 border ${cardClasses}`}>
                      <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6">Omnichannel_Sentiment_Topography</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { region: 'North America', score: 92, status: 'hot' },
                          { region: 'EU Central', score: 84, status: 'warm' },
                          { region: 'APAC', score: 45, status: 'cold' },
                          { region: 'South America', score: 71, status: 'warm' }
                        ].map((node, i) => (
                          <div key={i} className={`p-4 border ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200'} relative overflow-hidden group`}>
                            <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20 ${
                              node.status === 'hot' ? 'bg-emerald-500' : 
                              node.status === 'warm' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}></div>
                            <div className="relative z-10 space-y-4">
                              <div className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>{node.region}</div>
                              <div className="flex items-end gap-2">
                                <div className={`text-2xl font-black ${
                                  node.status === 'hot' ? 'text-emerald-500' : 
                                  node.status === 'warm' ? 'text-amber-500' : 'text-rose-500'
                                }`}>{node.score}</div>
                                <div className={`text-[8px] opacity-40 mb-1 uppercase font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>Score</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className={`mt-6 flex flex-col sm:flex-row gap-4 border-t ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200'} pt-6`}>
                        <div className="flex-1 space-y-2">
                          <div className={`text-[9px] font-black uppercase opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>Live Pulse Signals</div>
                          <div className="flex gap-2 text-[9px] font-black uppercase">
                            <span className="bg-[#0055ff]/10 text-[#0055ff] border border-[#0055ff]/30 px-2 py-1">X/Twitter: Peak</span>
                            <span className={`bg-transparent ${isDarkMode ? 'text-zinc-400 border-zinc-700' : 'text-zinc-600 border-zinc-300'} border px-2 py-1`}>Tickets: Normal</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className={`text-[9px] font-black uppercase opacity-40 ${isDarkMode ? 'text-white' : 'text-black'}`}>Temporal Context</div>
                          <div className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>End of Month (Quota push prioritized)</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pending_verification' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black uppercase tracking-widest text-[#0055ff]">Payment Verification</h3>
                    <div className="px-2 py-1 bg-[#0055ff]/10 text-[#0055ff] text-[10px] font-black">{orders.filter(o => o.paymentStatus === 'PENDING_ADVANCE').length} ACTIONS REQUIRED</div>
                  </div>
                  {!isEditingMerchants ? (
                    <button 
                      onClick={handleEditMerchants}
                      className="text-[10px] font-black uppercase text-[#0055ff] hover:underline"
                    >
                      Edit_Numbers
                    </button>
                  ) : (
                    <div className="flex gap-4">
                      <button 
                        onClick={handleSaveMerchants}
                        className="text-[10px] font-black uppercase text-emerald-500 hover:underline"
                      >
                        Save_Changes
                      </button>
                      <button 
                        onClick={() => setIsEditingMerchants(false)}
                        className="text-[10px] font-black uppercase text-rose-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Merchant Reference Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className={`p-4 border ${cardClasses} border-l-4 border-l-[#D12053]`}>
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">bKash Merchant</p>
                    {isEditingMerchants ? (
                      <input 
                        type="text" 
                        value={tempMerchants.bKash} 
                        onChange={(e) => setTempMerchants({...tempMerchants, bKash: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-800 text-xs p-1 outline-none focus:border-[#0055ff]"
                      />
                    ) : (
                      <p className="text-sm font-black tracking-[0.2em] text-[#0055ff]">{socialSettings.merchantNumbers?.bKash || '01929667716'}</p>
                    )}
                  </div>
                  <div className={`p-4 border ${cardClasses} border-l-4 border-l-[#F7941D]`}>
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Nagad Merchant</p>
                    {isEditingMerchants ? (
                      <input 
                        type="text" 
                        value={tempMerchants.Nagad} 
                        onChange={(e) => setTempMerchants({...tempMerchants, Nagad: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-800 text-xs p-1 outline-none focus:border-[#0055ff]"
                      />
                    ) : (
                      <p className="text-sm font-black tracking-[0.2em] text-[#F7941D]">{socialSettings.merchantNumbers?.Nagad || '01929667716'}</p>
                    )}
                  </div>
                  <div className={`p-4 border ${cardClasses} border-l-4 border-l-[#8C3494]`}>
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Rocket Merchant</p>
                    {isEditingMerchants ? (
                      <input 
                        type="text" 
                        value={tempMerchants.Rocket} 
                        onChange={(e) => setTempMerchants({...tempMerchants, Rocket: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-800 text-xs p-1 outline-none focus:border-[#0055ff]"
                      />
                    ) : (
                      <p className="text-sm font-black tracking-[0.2em] text-[#8C3494]">{socialSettings.merchantNumbers?.Rocket || '01929667716'}</p>
                    )}
                  </div>
                </div>

                <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                  <table className="w-full text-left text-[11px] font-black uppercase">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">TrxID</th>
                        <th className="px-6 py-4">Sender Number</th>
                        <th className="px-6 py-4">Advance Paid</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {orders.filter(o => o.paymentStatus === 'PENDING_ADVANCE').map((order) => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-[#0055ff]">{order.id}</td>
                          <td className="px-6 py-4">
                            <div>{order.customerName}</div>
                            <div className="text-[9px] text-zinc-500 opacity-80">{order.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4">{order.paymentMethod}</td>
                          <td className="px-6 py-4 font-mono text-[#0055ff]">{order.transactionId || 'N/A'}</td>
                          <td className="px-6 py-4 font-mono">{order.senderNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-emerald-500">৳{order.advancePaid?.toLocaleString() || '0'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleVerifyAdvance(order.id)} className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase hover:bg-emerald-400 transition-colors">Verify & Approve</button>
                              <button onClick={() => handleRejectAdvance(order.id)} className="px-4 py-2 border border-rose-500/50 text-rose-500 text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-colors">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {orders.filter(o => o.paymentStatus === 'PENDING_ADVANCE').length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">NO PENDING PAYMENTS</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-[calc(100vh-12rem)] flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Chat List */}
                <div className={`w-80 border flex flex-col ${cardClasses}`}>
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Active_Channels</h3>
                    <span className="text-[9px] px-2 py-0.5 bg-[#0055ff]/10 text-[#0055ff]">{chatSessions.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {chatSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedChatId(session.id)}
                        className={`w-full text-left p-4 border-b border-zinc-800/50 flex flex-col gap-1 transition-all ${selectedChatId === session.id ? 'bg-[#0055ff]/5 border-l-4 border-l-[#0055ff]' : 'hover:bg-white/5'}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-[10px] font-black uppercase truncate ${selectedChatId === session.id ? 'text-[#0055ff]' : 'text-white'}`}>{session.customerName}</span>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase">{new Date(session.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 truncate">{session.lastMessage}</p>
                      </button>
                    ))}
                    {chatSessions.length === 0 && (
                      <div className="p-8 text-center text-[10px] text-zinc-600 font-black uppercase tracking-widest">No active channels</div>
                    )}
                  </div>
                </div>

                {/* Chat Detail */}
                <div className={`flex-1 border flex flex-col overflow-hidden ${cardClasses}`}>
                  {selectedChatId ? (
                    <>
                      <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#0055ff]/10 border border-[#0055ff]/30 flex items-center justify-center text-[#0055ff] font-black text-xs uppercase">
                            {chatSessions.find(s => s.id === selectedChatId)?.customerName.charAt(0) || '?'}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest">
                              {chatSessions.find(s => s.id === selectedChatId)?.customerName}
                            </h4>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase">{chatSessions.find(s => s.id === selectedChatId)?.customerEmail}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {chatSessions.find(s => s.id === selectedChatId)?.messages.map((msg) => (
                          <div key={msg.id} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[70%] p-4 text-xs leading-relaxed ${msg.isAdmin ? 'bg-[#0055ff] text-white font-bold' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                              <div className="markdown-body prose prose-invert prose-xs max-w-none">
                                <Markdown
                                  components={{
                                    img: ({ node, ...props }) => (
                                      <img 
                                        {...props} 
                                        className="w-full h-auto mt-2 border border-zinc-800 bg-black/50" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ),
                                    p: ({ children }) => <span className="block mb-1 last:mb-0">{children}</span>
                                  }}
                                >
                                  {msg.text}
                                </Markdown>
                              </div>
                            </div>
                            <div className="mt-2 text-[8px] font-black uppercase opacity-40">
                              {msg.isAdmin ? 'SEC_OP_STREETX' : 'REMOTE_CLIENT'} • {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!adminChatInput.trim()) return;
                          const currentSession = chatSessions.find(s => s.id === selectedChatId);
                          if (currentSession) {
                            onSendMessage(adminChatInput, true, currentSession.customerEmail);
                            setAdminChatInput('');
                          }
                        }}
                        className="p-6 border-t border-zinc-800 bg-zinc-900/30"
                      >
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            value={adminChatInput}
                            onChange={(e) => setAdminChatInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-black border border-zinc-800 px-6 py-4 text-xs font-bold uppercase outline-none focus:border-[#0055ff] transition-all"
                          />
                          <button type="submit" className="px-8 py-4 bg-[#0055ff] text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">Send_Signal</button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40 space-y-4">
                      <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#0055ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select a channel to establish link</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                <table className="w-full text-left text-[11px] font-black uppercase">
                  <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Total Spent</th><th className="px-6 py-4">Orders</th><th className="px-6 py-4">Last Seen</th><th className="px-6 py-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id} className={`border-b transition-colors ${isDarkMode ? 'border-zinc-900/50 hover:bg-white/5' : 'border-zinc-100 hover:bg-black/5'}`}>
                        <td className="px-6 py-4">{c.name}</td>
                        <td className="px-6 py-4 opacity-60">{c.email}</td>
                        <td className="px-6 py-4">৳{c.totalSpent.toLocaleString()}</td>
                        <td className="px-6 py-4">{c.orders}</td>
                        <td className="px-6 py-4">{new Date(c.lastSeen).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setPreviewCustomer(c)} className="px-4 py-2 border border-[#0055ff]/50 hover:border-[#0055ff] text-[#0055ff] uppercase text-[9px] font-black transition-all">Details</button>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center opacity-40">No customers registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'pos' && (
              <div className="animate-in fade-in duration-500">
                <PosSystem 
                  products={products} 
                  onTransactionSuccess={addLog} 
                  isDarkMode={isDarkMode} 
                />
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest">Support Inquiries</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {supportRelays.map(relay => (
                    <div key={relay.id} className={`p-6 border ${cardClasses} flex flex-col md:flex-row gap-6 relative`}>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[10px] font-black uppercase opacity-50">{relay.id}</span>
                              <StatusBadge status={relay.status} />
                              <span className="text-[10px] opacity-40">{new Date(relay.timestamp).toLocaleString()}</span>
                            </div>
                            <h4 className="text-sm font-bold">{relay.subject}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-black uppercase tracking-widest text-[#0055ff]">{relay.customer}</p>
                              {customers.some(c => c.name === relay.customer || c.email === relay.customer) && (
                                <span className="text-[8px] bg-[#0055ff]/10 text-[#0055ff] px-1.5 py-0.5 border border-[#0055ff]/20 font-black uppercase">Verified_Customer</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`p-4 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} text-xs leading-relaxed`}>
                          {relay.message}
                        </div>

                        {relay.draftReply && (
                          <div className={`p-4 border-l-4 border-[#0055ff] ${isDarkMode ? 'bg-[#0055ff]/10' : 'bg-[#0055ff]/5'} space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              AI Generated Draft
                            </div>
                            <textarea 
                              className={`w-full p-3 text-xs bg-transparent border ${isDarkMode ? 'border-zinc-700/50' : 'border-zinc-300'} outline-none focus:border-[#0055ff] min-h-[100px] resize-y`}
                              defaultValue={relay.draftReply}
                              onChange={(e) => {
                                setSupportRelays(prev => prev.map(r => r.id === relay.id ? { ...r, draftReply: e.target.value } : r));
                              }}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                onClick={() => handleDraftSupportReply(relay.id, relay.subject, relay.message || '')}
                                disabled={relay.isDrafting}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-[#0055ff]/30 text-[#0055ff] hover:bg-[#0055ff]/10 transition-colors flex items-center gap-2"
                              >
                                {relay.isDrafting ? (
                                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                Regenerate
                              </button>
                              <button 
                                onClick={() => setSupportRelays(prev => prev.map(r => r.id === relay.id ? { ...r, draftReply: undefined } : r))}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-500/50 hover:bg-zinc-500/10 transition-colors"
                              >
                                Discard
                              </button>
                              <button 
                                onClick={() => {
                                  setSupportRelays(prev => prev.map(r => r.id === relay.id ? { ...r, status: 'RESOLVED' } : r));
                                  addLog(`SUPPORT_RESOLVED: ${relay.id}`);
                                }}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[#0055ff] text-white hover:bg-[#0044cc] border border-[#003399] transition-colors"
                              >
                                Send Reply & Resolve
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full md:w-48 shrink-0 flex flex-col justify-start">
                        {!relay.draftReply && (
                          <button 
                            onClick={() => handleDraftSupportReply(relay.id, relay.subject, relay.message || '')}
                            disabled={relay.isDrafting}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                              relay.isDrafting 
                              ? 'bg-zinc-800 text-zinc-500 cursor-wait border border-zinc-700' 
                              : 'bg-transparent text-[#0055ff] border border-[#0055ff] hover:bg-[#0055ff] hover:text-white'
                            }`}
                          >
                            {relay.isDrafting ? (
                              <span className="animate-pulse flex items-center gap-2">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Drafting...
                              </span>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Draft Reply
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter">SITE_SETTINGS</h2>
                    <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest">Global Configuration & Identity Management</p>
                  </div>
                </div>
                <div className="space-y-10">
                <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                  <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
                    <div>
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">Announcement_Banner</h4>
                      <p className="text-[9px] uppercase opacity-40 font-black mt-1">Control top-of-page global notices</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Banner_Status</label>
                      <button 
                        onClick={() => setSocialSettings({
                          ...socialSettings,
                          announcementBanner: {
                            ...socialSettings.announcementBanner,
                            enabled: !socialSettings.announcementBanner?.enabled,
                            text: socialSettings.announcementBanner?.text || ''
                          }
                        })}
                        className={`text-[8px] font-black uppercase px-2 py-1 rounded-none border transition-all ${socialSettings.announcementBanner?.enabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'}`}
                      >
                        {socialSettings.announcementBanner?.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase opacity-40">Banner_Text</label>
                      <input 
                        type="text" 
                        value={socialSettings.announcementBanner?.text || ''} 
                        onChange={(e) => setSocialSettings({ 
                          ...socialSettings, 
                          announcementBanner: {
                            ...socialSettings.announcementBanner,
                            enabled: socialSettings.announcementBanner?.enabled ?? false,
                            text: e.target.value
                          }
                        })}
                        className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Platform_Connections</h3>
                    
                    <div className="space-y-6">
                      {['facebook', 'instagram', 'linkedin', 'x'].map((platform) => (
                        <div key={platform} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase opacity-40">{platform}_URL</label>
                            <button 
                              onClick={() => setSocialSettings({
                                ...socialSettings,
                                visibility: {
                                  ...socialSettings.visibility,
                                  [platform]: !socialSettings.visibility[platform as keyof typeof socialSettings.visibility]
                                }
                              })}
                              className={`text-[8px] font-black uppercase px-2 py-1 rounded-none border transition-all ${socialSettings.visibility[platform as keyof typeof socialSettings.visibility] ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'}`}
                            >
                              {socialSettings.visibility[platform as keyof typeof socialSettings.visibility] ? 'VISIBLE' : 'HIDDEN'}
                            </button>
                          </div>
                          <input 
                            type="text" 
                            value={socialSettings[platform as keyof Omit<SocialSettings, 'visibility' | 'announcementBanner' | 'merchantNumbers'>] as string} 
                            onChange={(e) => setSocialSettings({ ...socialSettings, [platform]: e.target.value })}
                            className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => {
                        addLog('SOCIAL_SETTINGS_UPDATE: PLATFORM_URLS_SYNCED');
                        alert('Social settings updated successfully.');
                      }}
                      className="w-full py-4 bg-[#0055ff] text-white text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-transform"
                    >
                      Sync_Global_Settings
                    </button>
                  </div>

                  <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Business_Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase opacity-40">Store_Name</label>
                        <input className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} defaultValue="STREET_THREADX" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase opacity-40">Support_Email</label>
                        <input className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} defaultValue="support@streetthreadx.cx" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase opacity-40">Currency_Symbol</label>
                        <input className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} defaultValue="৳ (BDT)" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase opacity-40">Default_Tax_Rate_%</label>
                        <input className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} defaultValue="5" />
                      </div>
                    </div>
                  </div>

                  <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Merchant_Wallets</h3>
                    <div className="space-y-6">
                      {['bKash', 'Nagad', 'Rocket'].map((wallet) => (
                        <div key={wallet} className="space-y-3">
                          <label className="text-[10px] font-black uppercase opacity-40">{wallet}_Number</label>
                          <input 
                            type="text" 
                            value={socialSettings.merchantNumbers?.[wallet as keyof NonNullable<SocialSettings['merchantNumbers']>] || ''} 
                            onChange={(e) => setSocialSettings({ 
                              ...socialSettings, 
                              merchantNumbers: {
                                ...(socialSettings.merchantNumbers || { bKash: '', Nagad: '', Rocket: '' }),
                                [wallet]: e.target.value
                              }
                            })}
                            className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className={`border p-8 rounded-none ${cardClasses}`}>
                      <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-8">Social_Referral_Metrics</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={socialReferrals}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#222' : '#eee'} vertical={false} />
                            <XAxis dataKey="platform" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', border: '1px solid #333', fontSize: '10px' }}
                              itemStyle={{ color: '#0055ff' }}
                            />
                            <Bar dataKey="visits" fill="#0055ff" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={`border p-8 rounded-none overflow-hidden ${cardClasses}`}>
                      <table className="w-full text-left text-[10px] font-black uppercase">
                        <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                          <tr>
                            <th className="px-4 py-3">Platform</th>
                            <th className="px-4 py-3">Visits</th>
                            <th className="px-4 py-3">Conv.</th>
                            <th className="px-4 py-3">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {socialReferrals.map((ref) => (
                            <tr key={ref.platform} className={`border-b transition-colors ${isDarkMode ? 'border-zinc-900/50 hover:bg-white/5' : 'border-zinc-100 hover:bg-black/5'}`}>
                              <td className="px-4 py-4">{ref.platform}</td>
                              <td className="px-4 py-4">{ref.visits.toLocaleString()}</td>
                              <td className="px-4 py-4">{ref.conversions}</td>
                              <td className="px-4 py-4 text-[#0055ff]">৳{ref.revenue.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

            {activeTab === 'discounts' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setManagedDiscount({ code: '', type: 'PERCENTAGE', value: 0, isActive: true })}
                    className="bg-[#0055ff] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0055ff]/20 hover:scale-105 transition-transform"
                  >
                    Create_Discount_Code
                  </button>
                </div>

                <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                  <table className="w-full text-left text-[11px] font-black uppercase">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <tr>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Value</th>
                        <th className="px-6 py-4">Usage / Limit</th>
                        <th className="px-6 py-4">Expiry</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountCodes.map((d, idx) => (
                        <tr key={d.id} className={`border-b transition-colors ${
                          isDarkMode 
                            ? (idx % 2 === 0 ? 'bg-black/20' : 'bg-white/5') + ' border-zinc-900/50 hover:bg-[#0055ff]/10' 
                            : (idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50') + ' border-zinc-100 hover:bg-zinc-100'
                        }`}>
                          <td className="px-6 py-4 font-black">
                            <span className="text-[#0055ff]">{d.code}</span>
                          </td>
                          <td className="px-6 py-4 opacity-60">{d.type}</td>
                          <td className="px-6 py-4 font-bold">
                            {d.type === 'PERCENTAGE' ? `${d.value}%` : `৳${d.value.toLocaleString()}`}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold">{d.usageCount} / {d.usageLimit || '∞'}</span>
                              {d.minPurchase ? <span className="text-[8px] opacity-40">Min: ৳{d.minPurchase}</span> : null}
                            </div>
                          </td>
                          <td className="px-6 py-4 opacity-60">
                            {d.expiryDate || 'NO_EXPIRY'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] px-2 py-0.5 rounded-none border uppercase tracking-widest ${d.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'}`}>
                              {d.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setManagedDiscount(d)}
                                className="px-4 py-2 border border-zinc-500/30 hover:border-[#0055ff] hover:text-[#0055ff] uppercase text-[9px] font-black transition-all"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteDiscount(d.id)}
                                className="p-2 border border-zinc-500/30 hover:border-rose-500 group transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="SEARCH_REVIEWS..." 
                        value={reviewSearch}
                        onChange={e => setReviewSearch(e.target.value)}
                        className={`pl-10 pr-4 py-3 text-[10px] font-black uppercase border focus:border-[#0055ff] outline-none transition-all w-64 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select 
                      value={reviewProductFilter}
                      onChange={e => setReviewProductFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none cursor-pointer tracking-widest ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_PRODUCTS</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    
                    <select 
                      value={reviewRatingFilter}
                      onChange={e => setReviewRatingFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none cursor-pointer tracking-widest ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_RATINGS</option>
                      <option value="5">5_STARS</option>
                      <option value="4">4_STARS</option>
                      <option value="3">3_STARS</option>
                      <option value="2">2_STARS</option>
                      <option value="1">1_STAR</option>
                    </select>

                    <select 
                      value={reviewStatusFilter}
                      onChange={e => setReviewStatusFilter(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none cursor-pointer tracking-widest ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="ALL">ALL_STATUS</option>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                    </select>

                    <select 
                      value={reviewSort}
                      onChange={e => setReviewSort(e.target.value)}
                      className={`px-4 py-3 text-[10px] font-black uppercase border outline-none cursor-pointer tracking-widest ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                    >
                      <option value="NEWEST">NEWEST_FIRST</option>
                      <option value="OLDEST">OLDEST_FIRST</option>
                    </select>
                  </div>
                </div>

                <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                  <table className="w-full text-left text-[11px] font-black uppercase">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <tr>
                        <th className="px-6 py-4">Author</th>
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4">Rating</th>
                        <th className="px-6 py-4">Comment</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.length > 0 ? filteredReviews.map((r, idx) => {
                        const product = products.find(p => p.id === r.productId);
                        return (
                          <tr key={r.id} className={`border-b transition-colors ${
                            isDarkMode 
                              ? (idx % 2 === 0 ? 'bg-black/20' : 'bg-white/5') + ' border-zinc-900/50 hover:bg-[#0055ff]/10' 
                              : (idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50') + ' border-zinc-100 hover:bg-zinc-100'
                          }`}>
                            <td className="px-6 py-4">
                              <div className="font-bold">{r.author}</div>
                              <div className="text-[9px] opacity-40">{r.date}</div>
                            </td>
                            <td className="px-6 py-4 opacity-60">
                              {product ? product.name : 'Unknown Product'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-500 fill-current' : 'text-zinc-700'}`} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <p className="line-clamp-2 text-[10px] leading-relaxed opacity-70 normal-case">{r.comment}</p>
                              {r.reply && (
                                <div className="mt-2 p-2 bg-[#0055ff]/5 border-l-2 border-[#0055ff]">
                                  <div className="text-[8px] font-black text-[#0055ff] mb-1">REPLY:</div>
                                  <p className="text-[9px] italic opacity-60 normal-case">{r.reply}</p>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] px-2 py-0.5 rounded-none border uppercase tracking-widest ${r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {r.status === 'PENDING' && (
                                  <>
                                    <button 
                                      onClick={() => setManagedReply({ id: r.id, text: '' })}
                                      className="px-4 py-2 border border-[#0055ff] text-[#0055ff] hover:bg-[#0055ff] hover:text-white uppercase text-[9px] font-black transition-all"
                                    >
                                      Reply
                                    </button>
                                    <button 
                                      onClick={() => handleApproveReview(r.id)}
                                      className="px-4 py-2 bg-emerald-500 text-white uppercase text-[9px] font-black transition-all hover:bg-emerald-600"
                                    >
                                      Approve
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleDeleteReview(r.id)}
                                  className="p-2 border border-zinc-500/30 hover:border-rose-500 group transition-all"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center opacity-40 italic">No reviews found matching your criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {managedReply && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setManagedReply(null)}></div>
                <div className={`relative w-full max-w-md border transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white border-zinc-200 shadow-2xl'}`}>
                  <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <div className="text-xs font-black uppercase tracking-widest">Reply_to_Review</div>
                    <button onClick={() => setManagedReply(null)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40 tracking-widest block">ADMIN_REPLY</label>
                      <textarea 
                        value={managedReply.text}
                        onChange={e => setManagedReply({ ...managedReply, text: e.target.value })}
                        className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-32 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="Write your reply here..."
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setManagedReply(null)}
                        className={`flex-1 py-4 text-[10px] font-black uppercase transition-all border ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900' : 'border-zinc-200 hover:bg-zinc-50'}`}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleReplyReview(managedReply.id, managedReply.text)}
                        disabled={!managedReply.text.trim()}
                        className="flex-1 py-4 text-[10px] font-black uppercase transition-all bg-[#0055ff] text-white hover:shadow-[0_0_20px_rgba(0,85,255,0.4)] disabled:opacity-50"
                      >
                        Send_Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity_logs' && (
              <div className="space-y-6">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="SEARCH_LOGS..." 
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className={`pl-10 pr-4 py-3 text-[10px] font-black uppercase border focus:border-[#0055ff] outline-none transition-all w-full ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className={`border rounded-none overflow-hidden ${cardClasses}`}>
                  <div className={`divide-y ${isDarkMode ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                      <div key={log.id} className={`p-6 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                        <div className="flex items-center gap-6">
                          <div className="w-2 h-2 rounded-none bg-[#0055ff]"></div>
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-wider">{log.action}</div>
                            <div className="text-[9px] opacity-40 uppercase mt-1">{log.timestamp}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-500/10 rounded-none border border-zinc-500/20">{log.role}</span>
                          <span className="text-[10px] font-black uppercase opacity-60">{log.user}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="p-20 text-center opacity-40 text-[10px] font-black uppercase">No_Logs_Found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {managedOrder && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setManagedOrder(null); setOrderEditStep(1); }}></div>
          <div className={`relative w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ${isDarkMode ? 'bg-black border-l border-zinc-800' : 'bg-white border-l border-zinc-200'}`}>
            
            <div className={`p-8 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'}`}>
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  {managedOrder.id ? `Edit_Order: ${managedOrder.id}` : 'Create_New_Order'}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  {[1, 2, 3].map(step => (
                    <div key={step} className={`flex items-center gap-2 ${orderEditStep >= step ? 'opacity-100' : 'opacity-20'}`}>
                      <span className={`w-4 h-4 rounded-none flex items-center justify-center text-[8px] font-black ${orderEditStep === step ? 'bg-[#0055ff] text-white' : 'bg-zinc-800 text-zinc-400'}`}>{step}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        {step === 1 ? 'Customer' : step === 2 ? 'Items' : 'Summary'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => { setManagedOrder(null); setOrderEditStep(1); }} className="p-2 hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
              {orderEditStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Customer_Name</label>
                      <input 
                        type="text" 
                        value={managedOrder.customerName}
                        onChange={e => setManagedOrder({...managedOrder, customerName: e.target.value})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Customer_Email</label>
                      <input 
                        type="email" 
                        value={managedOrder.customerEmail}
                        onChange={e => setManagedOrder({...managedOrder, customerEmail: e.target.value})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Shipping_Address</label>
                      <textarea 
                        value={managedOrder.shippingAddress}
                        onChange={e => setManagedOrder({...managedOrder, shippingAddress: e.target.value})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-24 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="STREET, CITY, ZIP CODE..."
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase opacity-40">Billing_Address</label>
                        <button 
                          onClick={() => setManagedOrder({...managedOrder, billingAddress: managedOrder.shippingAddress})}
                          className="text-[9px] font-black uppercase text-[#0055ff] hover:underline"
                        >
                          Same_As_Shipping
                        </button>
                      </div>
                      <textarea 
                        value={managedOrder.billingAddress || ''}
                        onChange={e => setManagedOrder({...managedOrder, billingAddress: e.target.value})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-24 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="STREET, CITY, ZIP CODE (LEAVE BLANK IF SAME AS SHIPPING)..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-40">Tracking_Number</label>
                        <input 
                          type="text" 
                          value={managedOrder.trackingNumber || ''}
                          onChange={e => setManagedOrder({...managedOrder, trackingNumber: e.target.value})}
                          className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                          placeholder="e.g. TRK123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-40">Tracking_Provider</label>
                        <input 
                          type="text" 
                          value={managedOrder.trackingProvider || ''}
                          onChange={e => setManagedOrder({...managedOrder, trackingProvider: e.target.value})}
                          className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                          placeholder="e.g. FedEx, Pathao"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Tracking_URL</label>
                      <input 
                        type="url" 
                        value={managedOrder.trackingUrl || ''}
                        onChange={e => setManagedOrder({...managedOrder, trackingUrl: e.target.value})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="https://track.provider.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Order_Status</label>
                      <select 
                        value={managedOrder.status}
                        onChange={e => setManagedOrder({...managedOrder, status: e.target.value as any})}
                        className={`w-full px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div className="pt-6 border-t border-zinc-800/50">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black uppercase opacity-40">Private_Customer_Notes</label>
                        {customers.find(c => c.email === managedOrder.customerEmail) ? (
                          <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5">Linked_Account</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5">New_Customer_Shadow</span>
                        )}
                      </div>
                      <textarea 
                        className={`w-full h-32 px-6 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="Add private notes about this customer..."
                        value={customers.find(c => c.email === managedOrder.customerEmail)?.notes || ''}
                        onChange={(e) => {
                          const customer = customers.find(c => c.email === managedOrder.customerEmail);
                          if (customer) {
                            const updatedCustomer = { ...customer, notes: e.target.value };
                            setCustomers(prev => prev.map(c => c.email === managedOrder.customerEmail ? updatedCustomer : c));
                          } else {
                            // If it's a new customer (not in customers list), we might want to create a shadow customer
                            // but for now let's just ignore if not found or suggest creating one.
                            // In this app, customers are often created on first order.
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {orderEditStep === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Select_Products</label>
                      <span className="text-[9px] font-black uppercase opacity-40">{managedOrder.orderItems?.length || 0} Items Selected</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {products.filter(p => p.status === 'Published').map(p => {
                        const existing = managedOrder.orderItems?.find(item => item.productId === p.id);
                        return (
                          <div key={p.id} className={`p-4 border flex items-center justify-between ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                            <div className="flex items-center gap-4">
                              <img src={p.images[0]} className="w-12 h-12 object-cover border border-zinc-800" alt="" />
                              <div>
                                <div className="text-xs font-black uppercase">{p.name}</div>
                                <div className="text-[10px] opacity-40">৳{p.price.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {existing ? (
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => {
                                      const newItems = managedOrder.orderItems?.map(item => 
                                        item.productId === p.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
                                      ).filter(item => item.quantity > 0);
                                      setManagedOrder({...managedOrder, orderItems: newItems});
                                    }}
                                    className="w-8 h-8 flex items-center justify-center border border-zinc-700 hover:bg-zinc-800"
                                  >-</button>
                                  <span className="text-xs font-black">{existing.quantity}</span>
                                  <button 
                                    onClick={() => {
                                      const newItems = managedOrder.orderItems?.map(item => 
                                        item.productId === p.id ? { ...item, quantity: item.quantity + 1 } : item
                                      );
                                      setManagedOrder({...managedOrder, orderItems: newItems});
                                    }}
                                    className="w-8 h-8 flex items-center justify-center border border-zinc-700 hover:bg-zinc-800"
                                  >+</button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    const defaultVariant = p.variants && p.variants.length > 0 ? { size: p.variants[0].size, color: p.variants[0].color } : undefined;
                                    const newItem = { productId: p.id, name: p.name, quantity: 1, price: p.price, variant: defaultVariant };
                                    setManagedOrder({...managedOrder, orderItems: [...(managedOrder.orderItems || []), newItem]});
                                  }}
                                  className="px-4 py-2 bg-zinc-800 text-white text-[9px] font-black uppercase hover:bg-[#0055ff]"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {orderEditStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-6">
                    <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <h4 className="text-[10px] font-black uppercase opacity-40 mb-4">Order_Summary</h4>
                      
                      <div className="mb-6 space-y-2 pb-4 border-b border-zinc-800/50">
                        <div className="flex justify-between text-[10px] uppercase opacity-60">
                          <span>Customer</span>
                          <span className="font-black text-white">{managedOrder.customerName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] uppercase opacity-60">
                          <span>Email</span>
                          <span className="font-black text-white">{managedOrder.customerEmail || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                          <span>Shipping Address</span>
                          <span className="font-black text-white normal-case">{managedOrder.shippingAddress || 'N/A'}</span>
                        </div>
                        {managedOrder.billingAddress && (
                          <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                            <span>Billing Address</span>
                            <span className="font-black text-white normal-case">{managedOrder.billingAddress}</span>
                          </div>
                        )}
                        {managedOrder.trackingNumber && (
                          <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                            <span>Tracking Info</span>
                            <span className="font-black text-white">{managedOrder.trackingProvider || 'PROVIDER'}: {managedOrder.trackingNumber}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {managedOrder.orderItems?.map(item => (
                          <div key={item.productId} className="flex justify-between text-xs font-black uppercase">
                            <div className="flex flex-col">
                              <span>{item.name} x {item.quantity}</span>
                              {item.variant && <span className="text-[9px] opacity-40">Size: {item.variant.size} | Color: {item.variant.color}</span>}
                            </div>
                            <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="pt-4 border-t border-zinc-800 space-y-2">
                          <div className="flex justify-between text-xs opacity-60 uppercase">
                            <span>Subtotal</span>
                            <span>৳{(managedOrder.orderItems?.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs opacity-60 uppercase">Discount</span>
                            <input 
                              type="number" 
                              value={managedOrder.discount}
                              onChange={e => setManagedOrder({...managedOrder, discount: parseInt(e.target.value) || 0})}
                              className="w-24 px-2 py-1 bg-transparent border border-zinc-700 text-right text-xs font-black outline-none"
                            />
                          </div>
                          <div className="flex justify-between text-lg font-black uppercase text-[#0055ff] pt-2">
                            <span>Total</span>
                            <span>৳{((managedOrder.orderItems?.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 0) - (managedOrder.discount || 0)).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-8 border-t flex items-center justify-between sticky bottom-0 z-10 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'}`}>
              <button 
                onClick={() => setOrderEditStep(prev => Math.max(1, prev - 1))}
                disabled={orderEditStep === 1}
                className="px-6 py-3 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white disabled:opacity-30 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => {
                  if (orderEditStep === 3) {
                    handleCommitOrder();
                  } else {
                    setOrderEditStep(prev => Math.min(3, prev + 1));
                  }
                }}
                className="px-6 py-3 text-[10px] font-black uppercase bg-white text-black hover:bg-[#0055ff] hover:text-white transition-all"
              >
                {orderEditStep === 3 ? 'Finalize_Order' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {orderDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOrderDeleteConfirm(null)}></div>
          <div className={`relative w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <h3 className="text-xl font-black uppercase italic mb-4">Confirm_Deletion</h3>
            <p className="text-xs text-zinc-500 uppercase leading-relaxed mb-8">
              Are you sure you want to permanently remove order <span className="text-white font-black">{orderDeleteConfirm}</span>? This action cannot be reversed.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setOrderDeleteConfirm(null)}
                className="flex-1 py-4 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteOrder(orderDeleteConfirm)}
                className="flex-1 py-4 text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-500 transition-all"
              >
                Delete_Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {productDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setProductDeleteConfirm(null)}></div>
          <div className={`relative w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <h3 className="text-xl font-black uppercase italic mb-4 text-rose-500">Confirm Asset Deletion</h3>
            <p className="text-xs text-zinc-500 uppercase leading-relaxed mb-8">
              Are you sure you want to permanently remove asset <span className="text-white font-black">{products.find(p => p.id === productDeleteConfirm)?.name}</span>? This action will destroy all data related to this asset and cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setProductDeleteConfirm(null)}
                className="flex-1 py-4 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white text-zinc-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="flex-1 py-4 text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setBulkDeleteConfirm(false)}></div>
          <div className={`relative w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <h3 className="text-xl font-black uppercase italic mb-4 text-rose-500">Bulk Asset Destruction</h3>
            <p className="text-xs text-zinc-500 uppercase leading-relaxed mb-8">
              You are about to permanently eradicate <span className="text-white font-black">{selectedProducts.length} assets</span>. This action is irreversible. Proceed?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white text-zinc-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmBulkDelete}
                className="flex-1 py-4 text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              >
                Destroy All
              </button>
            </div>
          </div>
        </div>
      )}

      {managedProduct && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setManagedProduct(null); setProductEditStep(1); }}></div>
          <div className={`relative w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ${isDarkMode ? 'bg-black border-l border-zinc-800' : 'bg-white border-l border-zinc-200'}`}>
            
            {/* Sticky Header */}
            <div className={`p-8 border-b flex items-center justify-between sticky top-0 z-10 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'}`}>
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  {managedProduct.id ? 'Edit_Asset' : 'Initialize_Asset'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4].map(step => (
                    <div key={step} className={`h-1 w-8 rounded-none transition-all ${productEditStep >= step ? 'bg-[#0055ff]' : 'bg-zinc-800'}`}></div>
                  ))}
                  <span className="text-[9px] font-black uppercase ml-2 opacity-60">Step {productEditStep} of 4</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveProduct} className="bg-[#0055ff] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Commit_Changes</button>
                <button onClick={() => { setManagedProduct(null); setProductEditStep(1); }} className="p-3 border border-zinc-500/30 hover:border-rose-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
              {productEditStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">Asset_Identity</label>
                    <input type="text" value={managedProduct.name || ''} onChange={e => setManagedProduct({...managedProduct, name: e.target.value})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder="PRODUCT_NAME" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Price_Point (৳)</label>
                      <input type="number" value={managedProduct.price || 0} onChange={e => setManagedProduct({...managedProduct, price: parseInt(e.target.value)})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Category</label>
                      <select value={managedProduct.category || 'Hoodies'} onChange={e => setManagedProduct({...managedProduct, category: e.target.value as any})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <option value="Hoodies">Hoodies</option>
                        <option value="T-Shirts">T-Shirts</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Sweaters">Sweaters</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Status</label>
                      <select value={managedProduct.status || 'Draft'} onChange={e => setManagedProduct({...managedProduct, status: e.target.value as any})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Tax_Category</label>
                      <select value={managedProduct.taxCategory || 'Standard'} onChange={e => setManagedProduct({...managedProduct, taxCategory: e.target.value as any})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <option value="Standard">Standard (15%)</option>
                        <option value="Reduced">Reduced (5%)</option>
                        <option value="Exempt">Exempt (0%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">Tags</label>
                    <div className={`w-full p-2 border focus-within:border-[#0055ff] transition-all flex flex-wrap gap-2 ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      {managedProduct.tags?.map((tag, i) => (
                        <div key={i} className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-none ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                          <span>{tag}</span>
                          <button 
                            type="button"
                            onClick={() => setManagedProduct({...managedProduct, tags: managedProduct.tags?.filter((_, index) => index !== i)})}
                            className="hover:text-rose-500 font-black opacity-60 hover:opacity-100"
                          >×</button>
                        </div>
                      ))}
                      <input 
                        type="text" 
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !managedProduct.tags?.includes(val)) {
                              setManagedProduct({...managedProduct, tags: [...(managedProduct.tags || []), val]});
                            }
                            e.currentTarget.value = '';
                          }
                        }}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm font-bold" 
                        placeholder="Add tag and press Enter..." 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Description</label>
                      <button onClick={handleAiGenerateDescription} disabled={isGeneratingDescription} className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50">
                        {isGeneratingDescription ? 'Generating...' : 'AI_Generate'}
                      </button>
                    </div>
                    <textarea value={managedProduct.description || ''} onChange={e => setManagedProduct({...managedProduct, description: e.target.value})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-32 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder="PRODUCT_DESCRIPTION" />
                  </div>
                </div>
              )}

              {productEditStep === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase opacity-40">Base_SKU</label>
                       <input type="text" value={managedProduct.sku || ''} onChange={e => setManagedProduct({...managedProduct, sku: e.target.value.toUpperCase()})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder="E.G. HOOD-BLK-001" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Inventory_Stock</label>
                      <input type="number" value={managedProduct.stock || 0} onChange={e => setManagedProduct({...managedProduct, stock: parseInt(e.target.value) || 0})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} />
                    </div>
                    <div className="space-y-2 lg:col-span-1 col-span-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Min_Stock_Threshold</label>
                      <input type="number" value={managedProduct.minStockLevel || 10} onChange={e => setManagedProduct({...managedProduct, minStockLevel: parseInt(e.target.value) || 0})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">Available_Sizes (Comma Separated)</label>
                    <input type="text" value={managedProduct.sizes?.join(', ') || ''} onChange={e => setManagedProduct({...managedProduct, sizes: e.target.value.split(',').map(s => s.trim())})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder="S, M, L, XL" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Product_Variants_Management</label>
                      <button 
                        onClick={generateAllVariants}
                        className="text-[9px] font-black uppercase text-[#0055ff] hover:underline"
                      >
                        Auto_Generate_All_Combinations
                      </button>
                    </div>
                    
                    <div className={`border p-6 rounded-none space-y-6 ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase opacity-40">Size</label>
                          <input 
                            type="text" 
                            placeholder="XL" 
                            value={newProductVariant.size}
                            onChange={e => setNewProductVariant({...newProductVariant, size: e.target.value})}
                            className={`w-full px-4 py-2 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase opacity-40">Color</label>
                          <input 
                            type="text" 
                            placeholder="Black" 
                            value={newProductVariant.color}
                            onChange={e => setNewProductVariant({...newProductVariant, color: e.target.value})}
                            className={`w-full px-4 py-2 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase opacity-40">Stock</label>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={newProductVariant.stock}
                            onChange={e => setNewProductVariant({...newProductVariant, stock: parseInt(e.target.value) || 0})}
                            className={`w-full px-4 py-2 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase opacity-40">SKU</label>
                          <input 
                            type="text" 
                            placeholder="SKU-001" 
                            value={newProductVariant.sku}
                            onChange={e => setNewProductVariant({...newProductVariant, sku: e.target.value})}
                            className={`w-full px-4 py-2 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}
                          />
                        </div>
                      </div>
                      
                      {variantExists && (
                        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-none flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">
                            Combination_Exists: {newProductVariant.size} / {newProductVariant.color} is already defined.
                          </span>
                        </div>
                      )}

                      <button 
                        onClick={addVariant}
                        disabled={!newProductVariant.size || !newProductVariant.color || variantExists}
                        className="w-full py-3 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#0055ff] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {variantExists ? 'COMBINATION_ALREADY_DEFINED' : 'Add_Variant_Combination'}
                      </button>
                    </div>

                    {managedProduct.variants && managedProduct.variants.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase opacity-60">Variants ({managedProduct.variants.length})</span>
                          <button 
                            onClick={handleGenerateAutoSKUs}
                            className="text-[9px] font-black uppercase text-[#0055ff] hover:underline"
                          >
                            Auto_Generate_SKUs
                          </button>
                        </div>
                        <div className={`border rounded-none overflow-hidden ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <table className="w-full text-left text-[9px] font-black uppercase">
                          <thead className={isDarkMode ? 'bg-zinc-900/50' : 'bg-zinc-100'}>
                            <tr>
                              <th className="px-4 py-2">Size</th>
                              <th className="px-4 py-2">Color</th>
                              <th className="px-4 py-2">Stock</th>
                              <th className="px-4 py-2">SKU</th>
                              <th className="px-4 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            {managedProduct.variants.map((v, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3">{v.size}</td>
                                <td className="px-4 py-3">{v.color}</td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="number" 
                                    value={v.stock}
                                    onChange={e => updateVariantStock(v.size, v.color, parseInt(e.target.value) || 0)}
                                    className={`w-16 px-2 py-1 bg-transparent border border-zinc-700 focus:border-[#0055ff] outline-none`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="text" 
                                    value={v.sku || ''}
                                    onChange={e => {
                                      const newVariants = managedProduct.variants ? [...managedProduct.variants] : [];
                                      newVariants[i].sku = e.target.value;
                                      setManagedProduct({...managedProduct, variants: newVariants});
                                    }}
                                    className={`w-24 px-2 py-1 bg-transparent border border-zinc-700 focus:border-[#0055ff] outline-none text-[9px]`}
                                    placeholder="SKU"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => removeVariant(v.size, v.color)}
                                    className="text-rose-500 hover:text-rose-400"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">Available_Colors (Comma Separated)</label>
                    <input type="text" value={managedProduct.colors?.join(', ') || ''} onChange={e => setManagedProduct({...managedProduct, colors: e.target.value.split(',').map(c => c.trim())})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder="Jet Black, Stealth Grey" />
                  </div>
                </div>
              )}

              {productEditStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Media_Assets</label>
                      <button 
                        onClick={handleGenerateAiImages}
                        className="text-[9px] font-black uppercase text-[#0055ff] hover:underline"
                      >
                        AI_Generate_Placeholders
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {managedProduct.images?.map((img, idx) => (
                        <div 
                          key={idx} 
                          draggable
                          onDragStart={(e) => handleImageDragStart(e, idx)}
                          onDragOver={handleImageDragOver}
                          onDrop={(e) => handleImageDrop(e, idx)}
                          className={`relative group aspect-[3/4] border overflow-hidden transition-all cursor-move ${idx === 0 ? 'border-[#0055ff] ring-2 ring-[#0055ff]/20' : 'border-zinc-800'} ${draggedImageIndex === idx ? 'opacity-50 border-dashed' : ''}`}
                        >
                          <img src={img} className="w-full h-full object-cover pointer-events-none" alt="" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                             <div className="flex gap-1">
                                <button 
                                  onClick={() => moveImage(idx, 'up')} 
                                  disabled={idx === 0}
                                  className="text-[8px] font-black uppercase bg-zinc-800 text-white px-2 py-1 disabled:opacity-30"
                                >
                                  ←
                                </button>
                                <button 
                                  onClick={() => moveImage(idx, 'down')} 
                                  disabled={idx === (managedProduct.images?.length || 0) - 1}
                                  className="text-[8px] font-black uppercase bg-zinc-800 text-white px-2 py-1 disabled:opacity-30"
                                >
                                  →
                                </button>
                             </div>
                             <button onClick={() => setPrimaryImage(idx)} className="w-full text-[8px] font-black uppercase bg-white text-black px-2 py-1 hover:bg-[#0055ff] hover:text-white transition-colors">Set Primary</button>
                             <button onClick={() => removeImageFromManagedProduct(idx)} className="w-full text-[8px] font-black uppercase bg-rose-500 text-white px-2 py-1 hover:bg-rose-600 transition-colors">Remove</button>
                          </div>
                          {idx === 0 && <span className="absolute top-2 left-2 bg-[#0055ff] text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-none z-10">Primary</span>}
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] font-black px-1.5 py-0.5 z-10">#{idx + 1}</span>
                        </div>
                      ))}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".png,.jpg,.jpeg" 
                        multiple 
                        className="hidden" 
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-[3/4] border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-[#0055ff] transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 bg-zinc-50'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[9px] font-black uppercase opacity-60">Drop_Files_Or_Click</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40">Add_Image_Via_URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newImageUrl} 
                        onChange={e => setNewImageUrl(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageToManagedProduct(); } }}
                        className={`flex-1 px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} 
                        placeholder="https://..." 
                      />
                      <button type="button" onClick={addImageToManagedProduct} className="bg-zinc-800 text-white px-6 py-4 text-[10px] font-black uppercase">Add</button>
                    </div>
                  </div>
                </div>
              )}

              {productEditStep === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">SEO_Title</label>
                      <button onClick={() => handleAiGenerateSeo('title')} disabled={isGeneratingSeo} className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {isGeneratingSeo ? 'Generating...' : 'AI_Generate'}
                      </button>
                    </div>
                    <input type="text" value={managedProduct.seoTitle || ''} onChange={e => setManagedProduct({...managedProduct, seoTitle: e.target.value})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder={managedProduct.name} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">SEO_Description</label>
                      <button onClick={() => handleAiGenerateSeo('description')} disabled={isGeneratingSeo} className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {isGeneratingSeo ? 'Generating...' : 'AI_Generate'}
                      </button>
                    </div>
                    <textarea value={managedProduct.seoDescription || ''} onChange={e => setManagedProduct({...managedProduct, seoDescription: e.target.value})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-24 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} placeholder={managedProduct.description?.substring(0, 160)} />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase opacity-40">Search_Engine_Preview</label>
                    <div className="bg-white p-6 rounded-none shadow-sm border border-zinc-200 font-sans">
                      <div className="text-[#1a0dab] text-xl hover:underline cursor-pointer truncate">{managedProduct.seoTitle || managedProduct.name || 'Product Name'} | STREET THREADX.</div>
                      <div className="text-[#006621] text-sm mt-1 truncate">https://streetthreadx.com/products/{managedProduct.name?.toLowerCase().replace(/\s+/g, '-')}</div>
                      <div className="text-[#545454] text-sm mt-1 line-clamp-2">
                        {managedProduct.seoDescription || managedProduct.description || 'Add a description to see how it looks in search results...'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer Navigation */}
            <div className={`p-8 border-t flex items-center justify-between sticky bottom-0 z-10 ${isDarkMode ? 'bg-black/90' : 'bg-white/90'}`}>
              <button 
                onClick={() => setProductEditStep(prev => Math.max(1, prev - 1))}
                disabled={productEditStep === 1}
                className="px-6 py-3 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white disabled:opacity-30 transition-all"
              >
                Previous_Step
              </button>
              <button 
                onClick={() => {
                  if (productEditStep === 4) {
                    handleSaveProduct();
                  } else {
                    setProductEditStep(prev => Math.min(4, prev + 1));
                  }
                }}
                className="px-6 py-3 text-[10px] font-black uppercase bg-white text-black hover:bg-[#0055ff] hover:text-white transition-all"
              >
                {productEditStep === 4 ? 'Finish_and_Save' : 'Next_Step'}
              </button>
            </div>
          </div>
        </div>
      )}

      {variantStockProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setVariantStockProduct(null)}></div>
          <div className={`relative w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase italic">Manage_Variant_Stock</h3>
                <p className="text-[10px] opacity-40 uppercase font-black">{variantStockProduct.name}</p>
              </div>
              <button onClick={() => setVariantStockProduct(null)} className="p-2 hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div className={`border rounded-none overflow-hidden ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <table className="w-full text-left text-[10px] font-black uppercase">
                  <thead className={isDarkMode ? 'bg-black/40' : 'bg-zinc-50'}>
                    <tr>
                      <th className="px-4 py-3">Variant</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">SKU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {variantStockProduct.variants?.map((v, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">
                          <span className="opacity-60">{v.size}</span> / {v.color}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            value={v.stock}
                            onChange={e => {
                              const newStock = parseInt(e.target.value) || 0;
                              setVariantStockProduct({
                                ...variantStockProduct,
                                variants: variantStockProduct.variants?.map((vv, idx) => idx === i ? { ...vv, stock: newStock } : vv)
                              });
                            }}
                            className="w-20 px-2 py-1 bg-transparent border border-zinc-700 focus:border-[#0055ff] outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 opacity-40 text-[8px]">{v.sku || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => setVariantStockProduct(null)} className="px-6 py-3 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all">Cancel</button>
              <button onClick={handleSaveVariantStock} className="px-6 py-3 text-[10px] font-black uppercase bg-[#0055ff] text-white hover:brightness-110 transition-all">Save_Changes</button>
            </div>
          </div>
        </div>
      )}
      {managedDiscount && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setManagedDiscount(null)}></div>
          <div className={`relative w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#0d0d0d] border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className="p-8 border-b flex items-center justify-between">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">
                {managedDiscount.id ? 'Edit_Discount' : 'Create_Discount'}
              </h3>
              <button onClick={() => setManagedDiscount(null)} className="opacity-40 hover:opacity-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Discount_Code</label>
                <input 
                  type="text" 
                  value={managedDiscount.code}
                  onChange={e => setManagedDiscount({...managedDiscount, code: e.target.value.toUpperCase()})}
                  className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  placeholder="E.G. SUMMER20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Type</label>
                  <select 
                    value={managedDiscount.type}
                    onChange={e => setManagedDiscount({...managedDiscount, type: e.target.value as any})}
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED (৳)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Value</label>
                  <input 
                    type="number" 
                    value={managedDiscount.value}
                    onChange={e => setManagedDiscount({...managedDiscount, value: parseInt(e.target.value) || 0})}
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Min_Purchase_Requirement (৳)</label>
                <input 
                  type="number" 
                  value={managedDiscount.minPurchase || 0}
                  onChange={e => setManagedDiscount({...managedDiscount, minPurchase: parseInt(e.target.value) || 0})}
                  className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Expiry_Date</label>
                  <input 
                    type="date" 
                    value={managedDiscount.expiryDate || ''}
                    onChange={e => setManagedDiscount({...managedDiscount, expiryDate: e.target.value})}
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Usage_Limit</label>
                  <input 
                    type="number" 
                    value={managedDiscount.usageLimit || 0}
                    onChange={e => setManagedDiscount({...managedDiscount, usageLimit: parseInt(e.target.value) || 0})}
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                    placeholder="0 = Unlimited"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setManagedDiscount({...managedDiscount, isActive: !managedDiscount.isActive})}
                  className={`w-12 h-6 rounded-none relative transition-colors ${managedDiscount.isActive ? 'bg-[#0055ff]' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-none transition-all ${managedDiscount.isActive ? 'right-1' : 'left-1'}`}></div>
                </button>
                <span className="text-[10px] font-black uppercase opacity-60">Status: {managedDiscount.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
              </div>
            </div>
            <div className="p-8 border-t flex justify-end gap-4">
              <button onClick={() => setManagedDiscount(null)} className="px-6 py-3 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all">Cancel</button>
              <button 
                disabled={!managedDiscount.code || !managedDiscount.value}
                onClick={handleSaveDiscount} 
                className="px-8 py-3 bg-[#0055ff] text-white text-[10px] font-black uppercase hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {managedDiscount.id ? 'Update_Discount' : 'Save_Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {previewCustomer && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewCustomer(null)}></div>
          <div className={`relative w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#0a0a0a] border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-800 bg-black/50' : 'border-zinc-200 bg-zinc-50'}`}>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0055ff]">
                Customer_Profile
              </h3>
              <button onClick={() => setPreviewCustomer(null)} className="opacity-40 hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-inherit">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Data */}
                <div className="lg:col-span-1 space-y-6">
                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h2 className="text-[10px] font-black uppercase tracking-widest border-b border-zinc-800/50 pb-3 mb-4 text-[#0055ff]">
                      Profile_Data
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Name</div>
                        <div className="text-sm font-bold mt-1">{previewCustomer.name}</div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Email</div>
                        <div className="text-sm font-bold mt-1 break-all">{previewCustomer.email}</div>
                      </div>
                      {previewCustomer.phone && (
                        <div>
                          <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Phone</div>
                          <div className="text-sm font-bold mt-1">{previewCustomer.phone}</div>
                        </div>
                      )}
                      {previewCustomer.address && (
                        <div>
                          <div className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Address</div>
                          <div className="text-sm font-bold mt-1 leading-relaxed">{previewCustomer.address}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <h2 className="text-[10px] font-black uppercase tracking-widest border-b border-zinc-800/50 pb-3 mb-4 text-[#0055ff]">
                      Admin_Notes
                    </h2>
                    <textarea 
                      className={`w-full min-h-[120px] p-3 text-sm font-bold resize-none outline-none border focus:border-[#0055ff] transition-all bg-transparent ${isDarkMode ? 'border-zinc-800' : 'border-zinc-300'}`}
                      placeholder="Add notes about this customer..."
                      value={previewCustomer.notes || ''}
                      onChange={(e) => {
                        const updatedCustomer = { ...previewCustomer, notes: e.target.value };
                        setPreviewCustomer(updatedCustomer);
                        setCustomers(prev => prev.map(c => c.id === previewCustomer.id ? updatedCustomer : c));
                      }}
                    />
                  </div>
                </div>

                {/* Orders History */}
                <div className="lg:col-span-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest border-b border-zinc-800/50 pb-3 mb-6 text-[#0055ff]">
                    Order_History
                  </h2>
                  <div className="space-y-4">
                    {orders.filter(o => o.customerEmail.toLowerCase() === previewCustomer.email.toLowerCase()).length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-800/50">
                        <p className="text-[10px] font-black uppercase opacity-40">No_Orders_Found</p>
                      </div>
                    ) : (
                      orders.filter(o => o.customerEmail.toLowerCase() === previewCustomer.email.toLowerCase()).map(order => (
                        <div key={order.id} className={`border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-white border-zinc-200'} text-xs`}>
                          <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'}`}>
                            <div>
                              <div className="text-[8px] font-black uppercase text-zinc-500 mb-0.5 tracking-widest">Order_ID</div>
                              <div className="font-bold">{order.id}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-black uppercase text-zinc-500 mb-0.5 tracking-widest">Date</div>
                              <div className="font-bold">{order.date}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-black uppercase text-zinc-500 mb-0.5 tracking-widest">Total</div>
                              <div className="font-bold text-[#0055ff]">৳{order.total.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className={`text-[8px] font-black uppercase px-2 py-1 tracking-widest ${
                                order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' :
                                order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-500' :
                                order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {order.status}
                              </div>
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            {order.orderItems?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center opacity-80 border-b border-zinc-800/30 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                <div>
                                  <span className="font-bold">{item.quantity}x</span> {item.name}
                                </div>
                                <div className="font-bold">৳{(item.price * item.quantity).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
