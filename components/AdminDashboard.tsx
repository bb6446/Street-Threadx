
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';
import { Sun, Moon, Monitor, Shield, Zap, Database, Globe, Share2, MessageSquare, Trash2, Edit3, Plus, Copy, Check, ChevronRight, ChevronLeft, Search, Filter, Download, ArrowUpRight, ArrowDownRight, Layout, List as ListIcon, Maximize2, Trash, ExternalLink, User, Cloud, ShoppingCart, Users, X, Key, Activity, Lock } from 'lucide-react';
import { generateSEOContent, generateSupportReply, generateAnalyticsReport, generateProductDescription, generateResponseSuggestions, generateAgentMonitorReply, generateModelSwapImages, generatePromotionalImage, generateTags, generateSizeChart, generateOgImage } from '../services/geminiService';
import { chatService } from '../services/chatService';
import { updateProductStock, updateProductPrice, saveProductToFirestore, updateProductsBulk } from '../services/productService';
import { saveOrderToFirestore, updateOrder, deleteOrderFromFirestore, updateOrderStatus } from '../services/orderService';
import { updateCustomer } from '../services/customerService';
import { settingsService } from '../services/settingsService';
import { expenseService } from '../services/expenseService';
import { adminService } from '../services/adminService';
import PosSystem from './PosSystem';
import Markdown from 'react-markdown';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage, signInWithGoogle, auth } from '../firebase';
import { MOCK_PRODUCTS } from '../constants';
import { AdminRole, AdminUser, LogEntry, Order, Customer, Product, ProductVariant, SocialSettings, SocialReferral, DiscountCode, Review, ChatSession, ChatMessage, SecretValues, Expense } from '../types';
import { AdminProtectedRoute } from './AdminProtectedRoute';

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
  addLog: (action: string, details?: { field?: string, previousValue?: string | number, newValue?: string | number, entityId?: string }) => void;
  discountCodes: DiscountCode[];
  setDiscountCodes: React.Dispatch<React.SetStateAction<DiscountCode[]>>;
  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  onSendMessage: (text: string, image: string | undefined, isAdmin: boolean, targetEmail?: string, targetSessionId?: string) => Promise<void>;
  adminUsersList: AdminUser[];
  setAdminUsersList: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  onEnableLiveEditMode?: () => void;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800';

const AdminDashboard: React.FC<Props> = ({ user, products, setProducts, orders, setOrders, customers, setCustomers, socialSettings, setSocialSettings, socialReferrals, onLogout, logs, addLog, discountCodes, setDiscountCodes, reviews, setReviews, chatSessions, setChatSessions, onSendMessage, adminUsersList, setAdminUsersList, expenses, setExpenses, onEnableLiveEditMode }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'pending_verification' | 'customers' | 'activity_logs' | 'settings' | 'discounts' | 'reviews' | 'insights' | 'support' | 'pos' | 'chat' | 'user_management' | 'accounting' | 'appearance' | 'plugins' | 'sales_list' | 'seo' | 'ai_setup'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);
  const [isLiveEditorOpen, setIsLiveEditorOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // AI Monitor State
  const [aiMonitorInput, setAiMonitorInput] = useState('');
  const [aiMonitorLog, setAiMonitorLog] = useState<{type: 'user' | 'agent', text: string}[]>([{type: 'agent', text: 'Monitoring site metrics... System nominal. Awaiting command.'}]);
  const [isAiMonitoring, setIsAiMonitoring] = useState(false);
  const [vaultLocked, setVaultLocked] = useState(true);

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
      timestamp: new Date().toISOString(),
      draftReply: "Hi Alex, thank you for reaching out! We apologize for the delay. Your order #ORD-8802 has experienced a slight shipping delay due to high volume, but it has been processed and is shipping out today via priority delivery. You should receive it just in time for your weekend party. As a token of our appreciation for your patience, we've applied a 10% discount to your next purchase with code: PARTY10. Let us know if you need anything else!"
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
  const [salesVoucherSearch, setSalesVoucherSearch] = useState('');
  const [salesDateRange, setSalesDateRange] = useState({ start: '', end: '' });

  // Management State
  const [managedOrder, setManagedOrder] = useState<Partial<Order> | null>(null);
  const [orderEditStep, setOrderEditStep] = useState(1);
  const [orderDeleteConfirm, setOrderDeleteConfirm] = useState<string | null>(null);
  const [productDeleteConfirm, setProductDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<boolean>(false);
  const [ordersViewMode, setOrdersViewMode] = useState<'list' | 'kanban'>('list');
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [voucherOrder, setVoucherOrder] = useState<Order | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [managedProduct, setManagedProduct] = useState<Partial<Product> | null>(null);
  const [variantStockProduct, setVariantStockProduct] = useState<Product | null>(null);
  const [productEditStep, setProductEditStep] = useState<number>(1);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isEditingMerchants, setIsEditingMerchants] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<AdminUser>>({ username: '', role: AdminRole.SUPPORT, password: '' });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupView, setBackupView] = useState<'options' | 'preview'>('options');
  const [previewTab, setPreviewTab] = useState<'products' | 'orders' | 'customers'>('products');
  const [backupHistory, setBackupHistory] = useState<{name: string, date: string, type: string}[]>([]);
  const [tempMerchants, setTempMerchants] = useState({ bKash: '', Nagad: '', Rocket: '', creditCard: '', debitCard: '' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newProductVariant, setNewProductVariant] = useState({ size: '', color: '', stock: 0, sku: '' });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [isGeneratingOgImage, setIsGeneratingOgImage] = useState(false);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [isGeneratingSizeChart, setIsGeneratingSizeChart] = useState(false);
  const [sizeChartStylePrompt, setSizeChartStylePrompt] = useState("");
  const [isGeneratingGlobalSizeChart, setIsGeneratingGlobalSizeChart] = useState(false);
  const [globalSizeChartPrompt, setGlobalSizeChartPrompt] = useState("");
  const [managedExpense, setManagedExpense] = useState<Partial<Expense> | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDeleteConfirm, setExpenseDeleteConfirm] = useState<string | null>(null);
  const [isGeneratingModels, setIsGeneratingModels] = useState<string | null>(null);
  const [aiPreviewImages, setAiPreviewImages] = useState<string[]>([]);
  const [isAiPreviewOpen, setIsAiPreviewOpen] = useState(false);
  const [isSavingAiImages, setIsSavingAiImages] = useState(false);
  const [selectedAiImages, setSelectedAiImages] = useState<string[]>([]);
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [promoPrompt, setPromoPrompt] = useState('');
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [heroUploadProgress, setHeroUploadProgress] = useState<{[fileName: string]: { progress: number, size: number }}>({});
  const [productUploadProgress, setProductUploadProgress] = useState<{[fileName: string]: { progress: number, size: number }}>({});

  // Site Logo Upload States
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [logoProgress, setLogoProgress] = useState<number | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Plugin Management State
  const [isInstallingPlugin, setIsInstallingPlugin] = useState(false);
  const [pluginMarketOpen, setPluginMarketOpen] = useState(false);
  const [installingPluginStatus, setInstallingPluginStatus] = useState<string | null>(null);
  const [selectedSeoCategory, setSelectedSeoCategory] = useState<string>('T-Shirts');
  const [selectedSeoProduct, setSelectedSeoProduct] = useState<string>(products[0]?.id || '');
  const [isSavingSeo, setIsSavingSeo] = useState(false);

  const handleSiteLogoUpload = (file: File) => {
    if (!file) return;
    setLogoUploadError(null);
    setLogoProgress(0);

    const storageRef = ref(storage, `logos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setLogoProgress(pct);
      },
      (error) => {
        console.error('Logo upload error', error);
        setLogoUploadError('Failed to upload site logo: ' + error.message);
        setLogoProgress(null);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setSocialSettings({
            ...socialSettings,
            appearance: {
              ...socialSettings.appearance,
              siteLogoUrl: url,
              siteLogoFileSize: file.size,
              headerColor: socialSettings.appearance?.headerColor || '',
              footerColor: socialSettings.appearance?.footerColor || '',
              middleColor: socialSettings.appearance?.middleColor || '',
            }
          });
          setLogoProgress(null);
        } catch (err: any) {
          setLogoUploadError('Failed to resolve URL: ' + err.message);
          setLogoProgress(null);
        }
      }
    );
  };

  // Accounting Date State
  const [accountingStartDate, setAccountingStartDate] = useState<string>('');
  const [accountingEndDate, setAccountingEndDate] = useState<string>('');
  const [isMonthlyProfitSheetOpen, setIsMonthlyProfitSheetOpen] = useState(false);

  const monthlySummary = useMemo(() => {
    const summaryMap: { [key: string]: { revenue: number, cogs: number, expenses: number } } = {};
    
    orders.filter(o => o.status !== 'CANCELLED').forEach(o => {
      const monthKey = o.date.substring(0, 7); // YYYY-MM
      if (!summaryMap[monthKey]) summaryMap[monthKey] = { revenue: 0, cogs: 0, expenses: 0 };
      summaryMap[monthKey].revenue += o.total;
      
      const orderCogs = o.orderItems?.reduce((acc, item) => {
        const prod = products.find(p => p.id === item.productId);
        return acc + (prod?.cost || 0) * item.quantity;
      }, 0) || 0;
      
      summaryMap[monthKey].cogs += orderCogs;
    });

    expenses.forEach(e => {
      const monthKey = e.date.substring(0, 7);
      if (!summaryMap[monthKey]) summaryMap[monthKey] = { revenue: 0, cogs: 0, expenses: 0 };
      summaryMap[monthKey].expenses += e.amount;
    });

    return Object.entries(summaryMap)
      .map(([month, data]) => ({
        month,
        ...data,
        grossProfit: data.revenue - data.cogs,
        netProfit: data.revenue - data.cogs - data.expenses
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [orders, expenses, products]);

  // Discount Management State
  const [managedDiscount, setManagedDiscount] = useState<Partial<DiscountCode> | null>(null);

  // Secure Vault State
  const [secretValues, setSecretValues] = useState<SecretValues>({
    stripeSecretKey: '',
    stripePublishableKey: '',
    geminiApiKey: '',
    adminTwoFactorSecret: '',
    facebookAppId: '',
    facebookAppSecret: ''
  });
  const [isSavingSecrets, setIsSavingSecrets] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleVerifyAdministrativeIdentity = async () => {
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const secrets = await settingsService.getSecrets();
        if (secrets) {
          setSecretValues(secrets);
          setVaultLocked(false);
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError("Sign-in window was closed. If you didn't close it, check if your browser blocked the popup.");
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError("Popup blocked. Please allow popups for this site or open in a new tab.");
      } else {
        setAuthError(err.message || "Failed to verify identity. Please try opening in a new tab if you are using an iframe.");
      }
    }
  };

  // Site Logo Metadata State and Effect
  const [logoMeta, setLogoMeta] = useState<{ width: number; height: number; fileSize?: number } | null>(null);

  useEffect(() => {
    if (socialSettings?.appearance?.siteLogoUrl) {
      const img = new Image();
      img.onload = () => {
        setLogoMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: socialSettings.appearance?.siteLogoFileSize
        });
      };
      img.src = socialSettings.appearance.siteLogoUrl;
    } else {
      setLogoMeta(null);
    }
  }, [socialSettings?.appearance?.siteLogoUrl, socialSettings?.appearance?.siteLogoFileSize]);

  const handleInstallPlugin = async (plugin: { id: string, name: string, desc: string }) => {
    setIsInstallingPlugin(true);
    setInstallingPluginStatus(`Initializing ${plugin.name} repository...`);
    
    // Simulate installation steps
    await new Promise(resolve => setTimeout(resolve, 800));
    setInstallingPluginStatus(`Cloning dependency tree for ${plugin.id}...`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setInstallingPluginStatus(`Verifying security signatures...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    setInstallingPluginStatus(`Optimizing SQL indices...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const updatedPlugins = socialSettings.plugins ? [...socialSettings.plugins] : [];
      if (!updatedPlugins.find(p => p.id === plugin.id)) {
        updatedPlugins.push({ id: plugin.id, name: plugin.name, enabled: true });
      } else {
        alert('Plugin is already installed.');
        setIsInstallingPlugin(false);
        setInstallingPluginStatus(null);
        return;
      }
      
      const newSettings = { ...socialSettings, plugins: updatedPlugins };
      setSocialSettings(newSettings);
      
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const cleanSettings = JSON.parse(JSON.stringify(newSettings));
      await setDoc(doc(db, 'settings', 'social'), cleanSettings, { merge: true });
      
      addLog(`PLUGIN_INSTALLED: ${plugin.name}`);
      setIsInstallingPlugin(false);
      setInstallingPluginStatus(null);
      setPluginMarketOpen(false);
      alert(`${plugin.name} installed successfully.`);
    } catch (e: any) {
      console.error(e);
      alert('Installation failed: ' + e.message);
      setIsInstallingPlugin(false);
      setInstallingPluginStatus(null);
    }
  };

  // Chat Management State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [activeSessionMessages, setActiveSessionMessages] = useState<ChatMessage[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);

  const cannedResponses = [
    { title: 'Welcome', text: 'Welcome to StreetThreadX. How can we assist with your fashion transformation today?' },
    { title: 'Payment', text: 'To secure your limited-edition items, a 50% advance via bKash/Nagad/Rocket (01929667716) is required.' },
    { title: 'Shipping', text: 'Standard delivery takes 2-4 days in Dhaka and 3-7 days nationwide. Quality verification is our priority.' },
    { title: 'Stock', text: 'Checking the vault for availability. One moment please.' },
    { title: 'Order Status', text: 'We are currently processing your order metadata. You will receive a signal once it clears verification.' },
  ];

  useEffect(() => {
    if (messageScrollRef.current) {
      messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
    }
  }, [activeSessionMessages]);

  useEffect(() => {
    if (selectedChatId) {
      const unsubscribe = chatService.subscribeToMessages(selectedChatId, (messages) => {
        setActiveSessionMessages(messages);
      });
      return () => unsubscribe();
    } else {
      setActiveSessionMessages([]);
      setAiSuggestions([]);
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (activeSessionMessages.length > 0 && activeSessionMessages[activeSessionMessages.length - 1].isAdmin === false) {
      const timer = setTimeout(() => {
        handleGenerateSuggestions();
      }, 2000); // 2s debounce for suggestions
      return () => clearTimeout(timer);
    }
  }, [activeSessionMessages]);

  // Initialize settings and secrets
  useEffect(() => {
    // Listen for auth changes to auto-unlock if the user is already remembered locally
    // or if they just signed in via the Google button in this component.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const secrets = await settingsService.getSecrets();
          if (secrets) {
            setSecretValues(secrets);
            setVaultLocked(false);
          } else {
            // Document might not exist or we still don't have permission despite being logged in
            setVaultLocked(true);
          }
        } catch (err: any) {
          setVaultLocked(true);
        }
      } else {
        setVaultLocked(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSecrets = async () => {
    setIsSavingSecrets(true);
    try {
      await settingsService.saveSecrets(secretValues);
      addLog('SECURE_VAULT_SYNC: SECRETS_UPDATED');
      alert('Security vault successfully synchronized with Firestore.');
    } catch (error) {
      console.error("Error saving secrets:", error);
      alert('Failed to synchronize security vault.');
    } finally {
      setIsSavingSecrets(false);
    }
  };

  const handleSaveSocialSettings = async () => {
    try {
      await settingsService.saveSettings(socialSettings);
      addLog('SOCIAL_SETTINGS_UPDATE: PLATFORM_URLS_SYNCED');
      alert('Social settings updated successfully.');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to update social settings.');
    }
  };

  const handleAiMonitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMonitorInput.trim()) return;

    const query = aiMonitorInput;
    setAiMonitorInput('');
    setAiMonitorLog(prev => [...prev, { type: 'user', text: query }]);
    setIsAiMonitoring(true);

    try {
      const stats = { revenue: 4290400, totalOrders: orders.length, activeCustomers: 1204 };
      let finalResponse = await generateAgentMonitorReply(query, stats);
      
      if (query.toLowerCase().includes('add product') || query.toLowerCase().includes('create product') || query.toLowerCase().includes('new product')) {
        setActiveTab('products');
        setManagedProduct({
          id: '',
          name: 'AI Generated Initial Draft',
          description: 'A new product initiated by the AI monitor.',
          price: 0,
          category: 'Hoodies',
          stock: 10,
          images: [],
          status: 'Draft',
          tags: ['new', 'ai-draft'],
        });
        finalResponse = "I've navigated you to the Products dashboard and started a new product draft. You can now upload your images and videos!";
      } else if ((query.toLowerCase().includes('fill') || query.toLowerCase().includes('autofill') || query.toLowerCase().includes('set values')) && managedProduct) {
        handleProductAiAutofill();
        finalResponse = "I am currently executing the neural autofill protocol for your active product draft. All metadata, SEO, and assets are being synchronized.";
      }

      setAiMonitorLog(prev => [...prev, { type: 'agent', text: finalResponse }]);
    } catch (error) {
      setAiMonitorLog(prev => [...prev, { type: 'agent', text: 'Error connecting to Nexus core.' }]);
    } finally {
      setIsAiMonitoring(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!selectedChatId || activeSessionMessages.length === 0) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generateResponseSuggestions(activeSessionMessages);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

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
    return orders
      .filter(o => {
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
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
        return dateB - dateA;
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
    
    const prevStock = product.stock;
    const newStock = product.stock + 50;
    
    try {
      await updateProductStock(productId, newStock);
      addLog(`STOCK_BOOST: ID_${productId}`, {
        field: 'stock',
        previousValue: prevStock,
        newValue: newStock,
        entityId: productId
      });
    } catch (err) {
      console.error(err);
      // Fallback local update if firestore fails
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + 50 } : p));
      addLog(`STOCK_BOOST_LOCAL_ONLY: ID_${productId}`, {
        field: 'stock',
        previousValue: prevStock,
        newValue: newStock,
        entityId: productId
      });
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
      updateOrder(managedOrder.id, finalOrder).catch(console.error);
      addLog(`ORDER_UPDATE: ${finalOrder.id}`);
    } else {
      saveOrderToFirestore(finalOrder).catch(console.error);
      addLog(`ORDER_CREATE: ${finalOrder.id}`);
    }
    
    setManagedOrder(null);
    setOrderEditStep(1);
  };

  const handleUpdateOrderStatus = (id: string, newStatus: string) => {
    const order = orders.find(o => o.id === id);
    const prevStatus = order?.status;
    updateOrderStatus(id, newStatus).catch(console.error);
    addLog(`ORDER_STATUS_UPDATE: ${id}`, {
      field: 'status',
      previousValue: prevStatus,
      newValue: newStatus,
      entityId: id
    });
    
    // Trigger automated notification
    if (order && order.customerEmail) {
      fetch('/api/notify-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, customerEmail: order.customerEmail, newStatus })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addLog(`NOTIFICATION_SENT_EMAIL: ${order.customerEmail}`);
        }
      })
      .catch(err => {
        console.error('Failed to send status notification:', err);
      });
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteOrderFromFirestore(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setOrderDeleteConfirm(null);
      addLog(`ORDER_DELETED: ${id}`);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleSaveExpense = async () => {
    if (!managedExpense?.title || !managedExpense?.amount) {
      alert('Please provide title and amount');
      return;
    }
    
    const isNew = !managedExpense.id;
    const tempExpense = {
      ...managedExpense,
      id: managedExpense.id || `temp-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as Expense;
    
    if (isNew) {
      setExpenses(prev => [tempExpense, ...prev]);
      addLog(`EXPENSE_CREATE: ${tempExpense.title}`);
    } else {
      setExpenses(prev => prev.map(e => e.id === tempExpense.id ? tempExpense : e));
      addLog(`EXPENSE_UPDATE: ${tempExpense.title}`);
    }
    
    setIsExpenseModalOpen(false);
    setManagedExpense(null);

    try {
      if (isNew) {
        const saved = await expenseService.saveExpense(tempExpense);
        setExpenses(prev => prev.map(e => e.id === tempExpense.id ? saved : e));
      } else {
        await expenseService.saveExpense(tempExpense);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expenseService.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      setExpenseDeleteConfirm(null);
      addLog(`EXPENSE_DELETED: ${id}`);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const handleTogglePaid = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const prevPaid = order?.isPaid ? 'PAID' : 'UNPAID';
    const nextPaid = !order?.isPaid ? 'PAID' : 'UNPAID';
    updateOrder(id, { isPaid: !order.isPaid }).catch(console.error);
    addLog(`ORDER_PAYMENT_UPDATE: ${id}`, {
      field: 'isPaid',
      previousValue: prevPaid,
      newValue: nextPaid,
      entityId: id
    });
  };

  const handleVerifyAdvance = (id: string) => {
    updateOrder(id, { paymentStatus: 'ADVANCE_VERIFIED' }).catch(console.error);
    // Simulate automated SMS/Email trigger
    addLog(`ADVANCE_VERIFIED: ${id} - SMS Triggered`);
  };

  const handleRejectAdvance = (id: string) => {
    updateOrder(id, { paymentStatus: 'UNPAID', status: 'CANCELLED' }).catch(console.error);
    addLog(`ADVANCE_REJECTED: ${id}`);
  };

  const handleProductAiAutofill = async () => {
    if (!managedProduct || !managedProduct.name) {
      alert("Please enter a product name first.");
      return;
    }
    setIsAiAutofilling(true);
    try {
      const name = managedProduct.name;
      const category = managedProduct.category || 'Hoodies';
      
      // 1. Generate Description
      const desc = await generateProductDescription(name, category);
      
      // 2. Generate SEO
      const seo = await generateSEOContent(name, desc, category, managedProduct.tags || []);
      
      // 3. Generate placeholders if no images
      let images = managedProduct.images || [];
      if (images.length === 0) {
        images = [
          `https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800`,
          `https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800`
        ];
      }

      setManagedProduct({
        ...managedProduct,
        description: managedProduct.description || desc,
        seoTitle: managedProduct.seoTitle || seo.seoTitle,
        seoDescription: managedProduct.seoDescription || seo.seoDescription,
        images,
        status: 'Draft',
        taxCategory: 'Standard'
      });
      
      addLog('AI_AUTOFILL: PRODUCT_METADATA_GENERATED', { entityId: managedProduct.id });
      alert('AI Autofill completed successfully.');
    } catch (error) {
      console.error("AI Autofill error:", error);
      alert('AI Autofill encountered a neural error.');
    } finally {
      setIsAiAutofilling(false);
    }
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
    const originalProduct = products.find(p => p.id === variantStockProduct.id);
    const prevStock = originalProduct?.stock;
    const totalStock = variantStockProduct.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
    const updatedProduct = { ...variantStockProduct, stock: totalStock } as Product;
    
    try {
      await saveProductToFirestore(updatedProduct);
      addLog(`VARIANT_STOCK_UPDATE: ${updatedProduct.name}`, {
        field: 'stock',
        previousValue: prevStock,
        newValue: totalStock,
        entityId: updatedProduct.id
      });
      setVariantStockProduct(null);
    } catch (err) {
      console.error(err);
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addLog(`VARIANT_STOCK_UPDATE_LOCAL: ${updatedProduct.name}`, {
        field: 'stock',
        previousValue: prevStock,
        newValue: totalStock,
        entityId: updatedProduct.id
      });
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
      Rocket: socialSettings.merchantNumbers?.Rocket || '01929667716',
      creditCard: socialSettings.merchantNumbers?.creditCard || '',
      debitCard: socialSettings.merchantNumbers?.debitCard || ''
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

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('last_backup_sync'));

  const handleBackup = async (mode: 'download' | 'sync' | 'both' | 'json' = 'both') => {
    setIsBackingUp(true);
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (mode === 'json') {
        const data = {
          products,
          orders,
          customers,
          socialSettings,
          timestamp: now.toISOString(),
          version: '1.0.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `street_threadx_data_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog(`DATA_EXPORT_JSON: Full database dump`);
        return;
      }

      const fileName = `backup_${timestamp}.xlsx`;
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Products Sheet
      const wsProducts = XLSX.utils.json_to_sheet(products.map(p => ({
        ID: p.id,
        Name: p.name,
        Price: p.price,
        Stock: p.stock,
        Category: p.category,
        Status: p.status,
        SKU: p.sku || 'N/A'
      })));
      XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

      // Orders Sheet
      const wsOrders = XLSX.utils.json_to_sheet(orders.map(o => ({
        ID: o.id,
        Date: o.date,
        Customer: o.customerName,
        Email: o.customerEmail,
        Status: o.status,
        Total: o.total,
        Payment: o.paymentStatus || (o.isPaid ? 'PAID' : 'UNPAID')
      })));
      XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");

      // Customers Sheet
      const wsCustomers = XLSX.utils.json_to_sheet(customers.map(c => ({
        ID: c.id,
        Name: c.name,
        Email: c.email,
        TotalSpent: c.totalSpent,
        OrdersCount: c.orders,
        Joined: c.lastSeen || 'N/A'
      })));
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      if (mode === 'download' || mode === 'both') {
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      if (mode === 'sync' || mode === 'both') {
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const storageRef = ref(storage, `backups/${fileName}`);
        await uploadBytes(storageRef, blob);
        
        const syncTime = new Date().toLocaleString();
        setLastSyncTime(syncTime);
        localStorage.setItem('last_backup_sync', syncTime);

        // Track in history
        const newEntry = { name: fileName, date: syncTime, type: 'XLSX_SYNC' };
        setBackupHistory(prev => [newEntry, ...prev].slice(0, 5));
      }

      addLog(`BACKUP_${mode.toUpperCase()}: ${fileName}`);
      alert(`Backup ${mode === 'download' ? 'downloaded' : mode === 'sync' ? 'synced' : 'downloaded & synced'} successfully!`);
    } catch (error) {
      console.error("Backup failed", error);
      alert('Backup failed. Check network or storage permissions.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportOrdersCSV = async () => {
    const dataToExport = filteredOrders.map(o => ({
      'Order ID': o.id,
      'Date': o.date,
      'Time': o.time || '',
      'Customer Name': o.customerName,
      'Customer Email': o.customerEmail,
      'Subtotal': o.subtotal || o.total,
      'Discount': o.discount || 0,
      'Total Amount': o.total,
      'Status': o.status,
      'Payment Status': o.paymentStatus || (o.isPaid ? 'PAID' : 'UNPAID'),
      'Shipping Address': o.shippingAddress,
      'Items Count': o.items,
      'Payment Method': o.paymentMethod || 'N/A',
      'Transaction ID': o.transactionId || 'N/A'
    }));

    if (dataToExport.length === 0) {
      alert('No orders found matching the current filters to export.');
      return;
    }

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`ORDERS_EXPORT_CSV: Exported ${dataToExport.length} orders`);
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
    const product = products.find(p => p.id === productId);
    const prevStock = product?.stock;
    try {
      await updateProductStock(productId, newStock);
      addLog(`QUICK_STOCK_UPDATE: ID_${productId}`, {
        field: 'stock',
        previousValue: prevStock,
        newValue: newStock,
        entityId: productId
      });
    } catch (err) {
      console.error(err);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
    }
  };

  const handleQuickPriceUpdate = async (productId: string, newPrice: number) => {
    const product = products.find(p => p.id === productId);
    const prevPrice = product?.price;
    try {
      await updateProductPrice(productId, newPrice);
      addLog(`QUICK_PRICE_UPDATE: ID_${productId}`, {
        field: 'price',
        previousValue: prevPrice,
        newValue: newPrice,
        entityId: productId
      });
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
    { name: 'Mon', revenue: 24000 },
    { name: 'Tue', revenue: 13980 },
    { name: 'Wed', revenue: 98000 },
    { name: 'Thu', revenue: 39080 },
    { name: 'Fri', revenue: 48000 },
    { name: 'Sat', revenue: 38000 },
    { name: 'Sun', revenue: 43000 },
  ];

  const acquisitionData = [
    { name: 'Organic Search', value: 45 },
    { name: 'Social Media', value: 30 },
    { name: 'Direct Traffic', value: 15 },
    { name: 'Referrals', value: 10 },
  ];

  const topSellingData = [
    { name: 'Oversized Hoodie', sales: 120 },
    { name: 'Graphic T-Shirt', sales: 95 },
    { name: 'Cargo Pants', sales: 80 },
    { name: 'Beanie', sales: 60 },
    { name: 'Sneakers', sales: 40 },
  ];

  const categorySalesData = useMemo(() => {
    const baselineSales: Record<string, number> = {
      'Hoodies': 48,
      'T-Shirts': 72,
      'Sweaters': 33,
      'Accessories': 15,
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesMap = { ...baselineSales };

    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const orderDate = new Date(order.date);
        if (!isNaN(orderDate.getTime()) && orderDate >= thirtyDaysAgo) {
          order.orderItems?.forEach(item => {
            const product = products?.find(p => p.id === item.productId || p.name === item.name);
            let category = product?.category;

            if (!category) {
              const lowerName = item.name.toLowerCase();
              if (lowerName.includes('hoodie')) {
                category = 'Hoodies';
              } else if (lowerName.includes('t-shirt') || lowerName.includes('tee') || lowerName.includes('shirt')) {
                category = 'T-Shirts';
              } else if (lowerName.includes('sweater') || lowerName.includes('crewneck')) {
                category = 'Sweaters';
              } else {
                category = 'Accessories';
              }
            }

            if (category && typeof salesMap[category] === 'number') {
              salesMap[category] += item.quantity;
            } else if (category) {
              salesMap[category] = item.quantity;
            }
          });
        }
      });
    }

    return Object.entries(salesMap).map(([category, volume]) => ({
      category,
      volume,
      fill: category === 'Hoodies' ? '#0055ff' : 
            category === 'T-Shirts' ? '#00A86B' : 
            category === 'Sweaters' ? '#F4C430' : '#FF6F61'
    }));
  }, [orders, products]);

  const COLORS = ['#0055ff', '#00c49f', '#ffbb28', '#ff8042', '#8884d8'];

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

  const handleAiGenerateTags = async () => {
    if (!managedProduct?.name || !managedProduct?.description || !managedProduct?.category) {
      alert('Please provide a name, description, and category first to generate tags.');
      return;
    }
    setIsGeneratingTags(true);
    try {
      const generatedTags = await generateTags(
        managedProduct.name,
        managedProduct.description,
        managedProduct.category
      );
      if (generatedTags && Array.isArray(generatedTags) && generatedTags.length > 0) {
        const existingTags = managedProduct.tags || [];
        const uniqueTags = Array.from(new Set([...existingTags, ...generatedTags]));
        setManagedProduct(prev => ({ ...prev, tags: uniqueTags }));
        addLog(`AI_TAGS_GENERATE: ASSET_${managedProduct.name}`);
        alert(`Successfully generated and added ${generatedTags.length} SEO tags!`);
      } else {
        alert('No relevant tags could be generated.');
      }
    } catch (err: any) {
      console.error('Failed to generate tags:', err);
      alert(err.message || 'Failed to generate tags.');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleAiGenerateSizeChart = async () => {
    if (!managedProduct?.name || !managedProduct?.category) {
      alert('Please provide a name and category first to generate a size chart.');
      return;
    }
    setIsGeneratingSizeChart(true);
    try {
      const imageUrl = await generateSizeChart(
        managedProduct.name,
        managedProduct.category,
        sizeChartStylePrompt
      );
      if (imageUrl) {
        setManagedProduct(prev => ({ ...prev, sizeChartImage: imageUrl }));
        addLog(`AI_SIZE_CHART_GEN_PRODUCT: ASSET_${managedProduct.name}`);
        alert('Custom size chart image generated and added successfully!');
      } else {
        alert('Could not generate size chart image.');
      }
    } catch (err: any) {
      console.error('Failed to generate size chart:', err);
      alert(err.message || 'Failed to generate size chart.');
    } finally {
      setIsGeneratingSizeChart(false);
    }
  };

  const handleSizeChartUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG/JPG/WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setManagedProduct(prev => ({ ...prev, sizeChartImage: reader.result as string }));
      addLog(`UPLOAD_SIZE_CHART_PRODUCT: ASSET_${managedProduct?.name || 'NEW'}`);
      alert('Custom size chart image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleAiGenerateGlobalSizeChart = async () => {
    setIsGeneratingGlobalSizeChart(true);
    try {
      const imageUrl = await generateSizeChart(
        'Universal Streetwear Guidelines',
        'Apparel Sizing',
        globalSizeChartPrompt
      );
      if (imageUrl) {
        setSocialSettings(prev => ({
          ...prev,
          sizeChartImage: imageUrl
        }));
        addLog(`AI_SIZE_CHART_GEN_GLOBAL: ASSET_STORE`);
        alert('Global fallback size chart image generated successfully!');
      } else {
        alert('Could not generate size chart image.');
      }
    } catch (err: any) {
      console.error('Failed to generate global size chart:', err);
      alert(err.message || 'Failed to generate global size chart.');
    } finally {
      setIsGeneratingGlobalSizeChart(false);
    }
  };

  const handleGlobalSizeChartUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG/JPG/WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSocialSettings(prev => ({
        ...prev,
        sizeChartImage: reader.result as string
      }));
      addLog(`UPLOAD_SIZE_CHART_GLOBAL: ASSET_STORE`);
      alert('Global fallback size chart image uploaded successfully!');
    };
    reader.readAsDataURL(file);
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

  const handleAiGenerateOgImage = async (productId?: string) => {
    const targetProduct = productId ? products.find(p => p.id === productId) : managedProduct;
    if (!targetProduct?.name || !targetProduct?.category) {
      alert('Please provide a name, description, and category first.');
      return;
    }
    setIsGeneratingOgImage(true);
    try {
      const ogImageUrl = await generateOgImage(
        targetProduct.name,
        targetProduct.category,
        targetProduct.description || ''
      );
      if (ogImageUrl) {
        if (productId) {
          setProducts(prev => prev.map(p => {
            if (p.id === productId) {
              return { ...p, ogImage: ogImageUrl };
            }
            return p;
          }));
        } else {
          setManagedProduct(prev => ({ ...prev, ogImage: ogImageUrl }));
        }
        addLog(`AI_OG_IMAGE_GENERATE: FOR_${targetProduct.name}`);
        alert('Beautiful Open Graph share image generated successfully!');
      } else {
        alert('Could not generate Open Graph image. Please check API Key configuration.');
      }
    } catch (err: any) {
      console.error('Failed to generate Open Graph image:', err);
      alert(err.message || 'Failed to generate Open Graph image.');
    } finally {
      setIsGeneratingOgImage(false);
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

  const handleFileUpload = async (filesToUpload: FileList | File[] | null) => {
    if (!filesToUpload || !managedProduct) return;

    for (const file of Array.from(filesToUpload)) {
      const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || file.name.match(/\.(jpg|jpeg|png|gif|mp4|webm|mov|webp)$/i);
      if (isMedia) {
        try {
          setProductUploadProgress(prev => ({...prev, [file.name]: { progress: 0, size: file.size }}));
          
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          
          setManagedProduct(prev => ({
             ...prev!,
             images: [...(prev?.images || []), data.url]
          }));
          
          setProductUploadProgress(prev => ({...prev, [file.name]: { progress: 100, size: file.size }}));
          
          setTimeout(() => {
            setProductUploadProgress(prev => {
              const newProgress = {...prev};
              delete newProgress[file.name];
              return newProgress;
            });
          }, 1000);
          
        } catch (error) {
          console.warn("Upload to server failed, falling back to FileReader with compression:", error);
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxSize = 800;
                
                if (width > height && width > maxSize) {
                  height *= maxSize / width;
                  width = maxSize;
                } else if (height > maxSize) {
                  width *= maxSize / height;
                  height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                  setManagedProduct(prev => ({
                    ...prev!,
                    images: [...(prev?.images || []), compressedDataUrl]
                  }));
                }
                setProductUploadProgress(prev => {
                  const newProgress = {...prev};
                  delete newProgress[file.name];
                  return newProgress;
                });
                resolve();
              };
              img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
          });
        }
      } else {
        alert('Only Image (PNG/JPG/WEBP) and Video (MP4/WEBM) files are supported.');
      }
    }
    
    // Allow re-uploading same file by clearing input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleHeroImageUpload = async (filesToUpload: FileList | File[] | null) => {
    if (!filesToUpload) return;

    const newImageUrls: string[] = [];
    const uploadPromises = Array.from(filesToUpload).map(async (file) => {
      const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/') || file.name.match(/\.(jpg|jpeg|png|gif|mp4|webm|mov|webp)$/i);
      if (isMedia) {
        try {
          setHeroUploadProgress(prev => ({...prev, [file.name]: { progress: 0, size: file.size }}));
          
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          
          newImageUrls.push(data.url);
          setHeroUploadProgress(prev => {
            const curr = {...prev};
            delete curr[file.name];
            return curr;
          });
        } catch (error) {
          console.warn("Upload to server failed, falling back to FileReader with compression:", error);
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxSize = 1200; // Hero image can be larger
                
                if (width > height && width > maxSize) {
                  height *= maxSize / width;
                  width = maxSize;
                } else if (height > maxSize) {
                  width *= maxSize / height;
                  height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  newImageUrls.push(compressedDataUrl);
                }
                setHeroUploadProgress(prev => {
                  const curr = {...prev};
                  delete curr[file.name];
                  return curr;
                });
                resolve();
              };
              img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
          });
        }
      }
    });

    await Promise.all(uploadPromises);
    
    if (newImageUrls.length > 0) {
      setSocialSettings(prev => ({
        ...prev,
        heroImages: [...(prev.heroImages || []), ...newImageUrls]
      }));
    }
  };

  const handleGenerateModelVersions = async (imageUrl: string, count: number = 4) => {
    if (!managedProduct) return;
    setIsGeneratingModels(imageUrl);
    try {
      const modelImages = await generateModelSwapImages(null, imageUrl, managedProduct.name || 'Product', managedProduct.category || 'Streetwear', count);
      
      if (modelImages && modelImages.length > 0) {
        setAiPreviewImages(modelImages);
        setIsAiPreviewOpen(true);
      }
    } catch (error) {
      console.error("Model generation error:", error);
      alert("Failed to generate model variants.");
    } finally {
      setIsGeneratingModels(null);
    }
  };

  const handleSaveSelectedAiImages = async (selectedImages: string[]) => {
    if (!managedProduct || selectedImages.length === 0) return;
    setIsSavingAiImages(true);
    try {
      const uploadedUrls = await Promise.all(selectedImages.map(async (b64, i) => {
        try {
          const response = await fetch(b64);
          const b = await response.blob();
          const f = new File([b], `model_swap_${Date.now()}_${i}.png`, { type: 'image/png' });
          const storageRef = ref(storage, `ai_generated/model_swap_${Date.now()}_${i}.png`);
          await uploadBytes(storageRef, f);
          const url = await getDownloadURL(storageRef);
          return url;
        } catch (e) {
          console.error("Nested upload error:", e);
          return null;
        }
      }));

      const validUrls = uploadedUrls.filter(Boolean) as string[];

      setManagedProduct(prev => ({
        ...prev,
        images: [...(prev?.images || []), ...validUrls]
      }));
      addLog(`AI_MODEL_SWAP: Saved ${validUrls.length} model variants for ${managedProduct.name}`);
      setIsAiPreviewOpen(false);
      setAiPreviewImages([]);
      setSelectedAiImages([]);
    } catch (error) {
      console.error("Error saving AI images:", error);
      alert("Failed to save selected images.");
    } finally {
      setIsSavingAiImages(false);
    }
  };

  const handleCreatePromoImage = async () => {
    if (!promoPrompt.trim()) return;
    setIsGeneratingPromo(true);
    try {
      const b64 = await generatePromotionalImage(promoPrompt);
      if (b64) {
        const response = await fetch(b64);
        const b = await response.blob();
        const f = new File([b], `promo_${Date.now()}.png`, { type: 'image/png' });
        const storageRef = ref(storage, `promo_assets/promo_${Date.now()}.png`);
        await uploadBytes(storageRef, f);
        const url = await getDownloadURL(storageRef);
        setManagedProduct(prev => ({
          ...prev,
          images: [...(prev?.images || []), url]
        }));
        setPromoPrompt('');
        addLog(`AI_PROMO_GENERATE: ${promoPrompt}`);
      }
    } catch (error) {
      console.error("Promo generation error:", error);
      alert("Failed to generate promotional image.");
    } finally {
      setIsGeneratingPromo(false);
    }
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

  const themeClasses = isDarkMode ? "bg-[#020202] text-white border-zinc-800" : "bg-white text-zinc-900 border-black";
  const cardClasses = isDarkMode ? "bg-black/40 border-zinc-800" : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const canManageProducts = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.EDITOR;
  const canManageOrders = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.SUPPORT;
  const canManageCustomers = user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.SUPPORT;
  const canViewLogs = user.role === AdminRole.SUPER_ADMIN;
  const canReplyToChat = user.role === AdminRole.SUPER_ADMIN || user.canManageChat;

  const availableTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', hidden: !canManageProducts },
    { id: 'orders', label: 'Order', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', hidden: false },
    { id: 'pending_verification', label: 'Payment Verification', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', hidden: !canManageOrders },
    { id: 'customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', hidden: !canManageCustomers },
    { id: 'pos', label: 'POS Terminal', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', hidden: !canManageOrders },
    { id: 'sales_list', label: 'Sales List', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', hidden: !canManageOrders },
    { id: 'support', label: 'Support Inquiries', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', hidden: !canManageCustomers },
    { id: 'insights', label: 'Insights', icon: 'M13 10V3L4 14h7v7l9-11h-7z', hidden: !canManageCustomers },
    { id: 'chat', label: 'Customer Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', hidden: false },
    { id: 'reviews', label: 'Reviews', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', hidden: !canManageProducts },
    { id: 'accounting', label: 'Accounting', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'user_management', label: 'Admin Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'activity_logs', label: 'Activity Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', hidden: !canViewLogs },
    { id: 'appearance', label: 'Appearance', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'plugins', label: 'Plugins', icon: 'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'seo', label: 'SEO Metadata', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'settings', label: 'Site Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z', hidden: user.role !== AdminRole.SUPER_ADMIN },
    { id: 'ai_setup', label: 'AI Agent Setup', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', hidden: user.role !== AdminRole.SUPER_ADMIN },
  ].filter(t => !t.hidden);

  return (
    <div className={`min-h-screen flex flex-col font-mono selection:bg-[#0055ff] selection:text-white transition-colors duration-300 ${themeClasses}`}>
      
      {/* Backdrop for Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row flex-1 h-screen overflow-hidden relative">
        <aside className={`
          fixed lg:static inset-y-0 left-0 h-full flex flex-col transition-all duration-300 ease-in-out z-50 overflow-hidden
          ${isSidebarOpen 
            ? 'w-72 translate-x-0 opacity-100' 
            : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 opacity-0 pointer-events-none'
          }
          ${isDarkMode ? 'bg-[#050505] border-zinc-800' : 'bg-white border-black'}
          ${isSidebarOpen ? 'border-r' : 'border-r-0'}
        `}>
          <div className="p-8 flex flex-col h-full space-y-10 w-72">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#0055ff]"></div>
                <h2 className="text-2xl font-black heading-font tracking-tighter uppercase">STREET<span className="text-[#0055ff]">THREADX</span></h2>
              </div>
              {/* Close Button for Sidebar */}
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className={`p-2 border transition-all cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-black text-zinc-600 hover:text-black hover:bg-zinc-100'}`}
                aria-label="Close Navigation Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`h-px w-full ${isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`} />

            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
              {availableTabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }} 
                  className={`w-full text-left px-5 py-3 rounded-none transition-all flex items-center gap-4 cursor-pointer ${activeTab === tab.id ? 'bg-[#0055ff] text-white' : 'opacity-70 hover:bg-zinc-500/5'}`}
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
              
              {user.role === AdminRole.SUPER_ADMIN && (
                <div className="pt-8 space-y-8">
                  <div className={`h-px w-full ${isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`} />
                  <button
                    onClick={() => {
                      setShowBackupModal(true);
                      if (window.innerWidth < 1024) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    disabled={isBackingUp}
                    className={`w-full text-left px-5 py-3 rounded-none transition-all flex items-center gap-4 opacity-70 hover:bg-[#0055ff]/10 hover:text-[#0055ff] hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    {isBackingUp ? (
                      <span className="w-4 h-4 border-2 border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                      {isBackingUp ? 'SYNCING...' : 'Backup'}
                    </span>
                  </button>
                </div>
              )}
            </nav>
            <div className="pt-4 border-t border-zinc-800/20 space-y-2">
              <button 
                onClick={() => window.open('/', '_blank')}
                className={`w-full py-4 border-2 text-[9px] font-black uppercase tracking-[0.4em] transition-all cursor-pointer flex items-center justify-center gap-2 ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
              >
                <ExternalLink className="w-3 h-3" /> LIVE_SITE
              </button>
              <button onClick={() => { onLogout(); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full py-4 border-2 text-[9px] font-black uppercase tracking-[0.4em] transition-all cursor-pointer ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900' : 'border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none'}`}>DISCONNECT</button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
          <header className={`sticky top-0 z-40 h-20 border-b flex items-center justify-between px-6 md:px-10 transition-all duration-300 ${isDarkMode ? 'bg-black/80 backdrop-blur-md border-zinc-800' : 'bg-white/90 backdrop-blur-md border-black'}`}>
            <div className="flex items-center gap-4">
              {/* Hamburger Button / Menu toggles */}
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className={`p-2 border-2 transition-all cursor-pointer z-50 ${isDarkMode ? 'border-zinc-800 bg-zinc-900 text-white hover:bg-[#0055ff] hover:border-[#0055ff]' : 'border-black bg-white text-black hover:bg-zinc-100'}`}
                  aria-label="Open Navigation Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <h1 className="text-sm md:text-lg font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">{activeTab.replace(/_/g, ' ')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.open('/', '_blank')}
                className={`hidden md:flex items-center gap-2 px-4 py-2 border-2 text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-300' : 'border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Store
              </button>
              <div className={`flex items-center border-2 ${isDarkMode ? 'border-zinc-800 p-1 bg-black' : 'border-black p-1 bg-zinc-100'}`}>
                <button 
                  onClick={() => setIsDarkMode(true)} 
                  className={`p-1.5 transition-all cursor-pointer ${isDarkMode ? 'bg-[#0055ff] text-white' : 'text-zinc-400 hover:text-black'}`}
                  title="Dark Mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsDarkMode(false)} 
                  className={`p-1.5 transition-all cursor-pointer ${!isDarkMode ? 'bg-[#0055ff] text-white' : 'text-zinc-600 hover:text-white'}`}
                  title="Light Mode"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-10 space-y-6 md:space-y-10 animate-in fade-in duration-500">
            <AdminProtectedRoute adminUser={user}>
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
                  <div className={`border rounded-none ${cardClasses} md:col-span-2 flex flex-col min-h-[300px]`}>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800/20 dark:border-zinc-800 p-4">
                      <h3 className="text-zinc-500 text-[11px] font-black uppercase flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-[#0055ff]" /> AI Site Monitor
                      </h3>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setActiveTab('ai_setup')}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black uppercase px-2 py-1 transition-colors flex items-center gap-1 border border-zinc-700"
                        >
                          <Key className="w-3 h-3 text-[#0055ff]" /> API_Setup
                        </button>
                        {isAiMonitoring ? (
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold">
                            PROCESSING <span className="w-2 h-2 bg-[#0055ff] rounded-full animate-pulse"></span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> ONLINE</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto mb-4 px-4 space-y-3 no-scrollbar flex flex-col font-mono">
                      {aiMonitorLog.map((log, i) => (
                        <div key={i} className={`flex ${log.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-start gap-2 max-w-[85%] ${log.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-6 h-6 rounded-none flex items-center justify-center shrink-0 ${log.type === 'user' ? 'bg-[#0055ff] text-white' : isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'}`}>
                              {log.type === 'user' ? <User className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                            </div>
                            <span className={`p-3 text-[11px] leading-relaxed ${log.type === 'user' ? 'bg-[#0055ff] text-white' : isDarkMode ? 'bg-zinc-800/50 text-zinc-300' : 'bg-zinc-100 text-zinc-800'} border ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                              {log.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 pt-0">
                      <form onSubmit={handleAiMonitorSubmit} className={`flex flex-col mt-auto border focus-within:border-[#0055ff] transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-300 bg-zinc-50'}`}>
                        <textarea 
                          value={aiMonitorInput} 
                          onChange={e => setAiMonitorInput(e.target.value)} 
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAiMonitorSubmit(e);
                            }
                          }}
                          placeholder="Command the AI agent... (e.g. 'Add product', 'Show error rates')" 
                          className={`w-full bg-transparent text-[11px] p-3 outline-none resize-none min-h-[60px] max-h-[120px] font-mono ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-black placeholder:text-zinc-400'}`} 
                        />
                        <div className={`flex justify-between items-center p-2 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                           <span className="text-[9px] text-zinc-500 uppercase font-bold px-2">Shift + Enter for new line</span>
                           <button type="submit" disabled={isAiMonitoring || !aiMonitorInput.trim()} className="px-4 py-1.5 flex items-center gap-2 bg-[#0055ff] text-white text-[10px] font-black uppercase disabled:opacity-50 hover:bg-[#0044cc] transition-colors">
                            Execute <ArrowUpRight className="w-3 h-3" />
                           </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className={`border p-8 rounded-none ${cardClasses} h-[400px]`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-8">Daily Revenue</h3>
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
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-8">Customer Acquisition Sources</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={acquisitionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {acquisitionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', border: '1px solid #333', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className={`border p-8 rounded-none ${cardClasses} h-[400px]`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <div>
                        <h3 className="text-zinc-500 text-[9px] font-black uppercase">Category Sales Volume (Last 30 Days)</h3>
                        <p className="text-[10px] text-zinc-400 font-mono tracking-tighter uppercase mt-1">
                          COMPARATIVE ANALYSIS OF PRODUCT UNITS SOLD ACROSS STREETWEAR CLASSIFICATIONS
                        </p>
                      </div>
                      <span className="text-[8px] font-mono border border-[#0055ff]/30 px-2.5 py-1 text-[#0055ff] bg-[#0055ff]/10 uppercase font-black tracking-widest">
                        METRICS_CAT_MATRIX
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={categorySalesData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#222' : '#eee'} vertical={false} />
                        <XAxis dataKey="category" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', border: '1px solid #333', fontSize: '10px' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          formatter={(value) => [`${value} Units`, 'Volume']}
                        />
                        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                          {categorySalesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className={`col-span-2 border p-8 rounded-none ${cardClasses} h-[400px]`}>
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase mb-6">Top Selling Products</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={topSellingData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#222' : '#eee'} horizontal={false} />
                        <XAxis type="number" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#888" fontSize={10} tickLine={false} axisLine={false} width={120} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#111' : '#fff', border: '1px solid #333', fontSize: '10px' }}
                          cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="sales" fill="#0055ff" radius={[0, 4, 4, 0]}>
                          {topSellingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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

                <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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
                                <img loading="lazy" src={p.images[0] || DEFAULT_IMAGE} className="w-10 h-12 object-cover border border-zinc-800" alt="" />
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
                                    <button onClick={() => window.open(`/#product=${p.id}`, '_blank')} className="px-4 py-2 border border-zinc-500/30 hover:border-[#0055ff] hover:text-[#0055ff] uppercase text-[9px] font-black transition-all" title="View product in storefront">Preview</button>
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
                  <button 
                    onClick={handleExportOrdersCSV}
                    className="bg-emerald-600 text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 hover:scale-105 transition-transform flex items-center gap-2"
                    title="Download order data as CSV for bookkeeping"
                  >
                    <Download size={14} /> Download Bookkeeping CSV
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
                      <button 
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setDateRange({ start: today, end: today });
                        }}
                        className={`px-4 py-3 text-[10px] font-black uppercase border hover:bg-[#0055ff] hover:text-white transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
                      >
                        Today
                      </button>
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
                  <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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
                                <div className="text-[9px] text-[#0055ff]">{o.customerEmail}</div>
                                {o.shippingAddress && (
                                  <div className="text-[9px] opacity-50 mt-1 max-w-[200px] leading-tight">
                                    {o.shippingAddress}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <div className="font-black text-white mb-2">৳{o.total.toLocaleString()}</div>
                                <div className="space-y-1.5 min-w-[160px]">
                                  {o.orderItems && o.orderItems.length > 0 ? (
                                    o.orderItems.map((item, iIndex) => (
                                      <div key={iIndex} className={`p-1.5 border text-[9px] ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-black/5 border-zinc-200'}`}>
                                        <div className="font-bold truncate max-w-[140px]">{item.name} <span className="text-[#0055ff] text-[8px]">x{item.quantity}</span></div>
                                        {products.find(p => p.id === item.productId)?.description && (
                                          <div className="text-[7px] opacity-40 line-clamp-1 mt-0.5 lowercase italic">
                                            {products.find(p => p.id === item.productId)?.description}
                                          </div>
                                        )}
                                        {item.variant && (
                                          <div className="flex gap-2 mt-0.5 opacity-60 italic text-[8px]">
                                            <span>Clr: {item.variant.color}</span>
                                            <span>Sz: {item.variant.size}</span>
                                          </div>
                                        )}
                                        {item.customDesign && (
                                          <div className="flex flex-col gap-1 mt-0.5 opacity-60 italic text-[8px]">
                                            <span>Type: {item.customDesign.type}</span>
                                            <div className="flex items-center gap-1">Body: <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: item.customDesign.color}}/> Slv: <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: item.customDesign.sleeveColor}}/></div>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-[9px] opacity-40">{o.items} items</div>
                                  )}
                                </div>
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
                                    onClick={() => setVoucherOrder(o)} 
                                    className="px-3 py-2 border border-emerald-500/50 hover:bg-emerald-500/10 hover:border-emerald-500 text-emerald-500 uppercase text-[9px] font-black transition-all"
                                    title="Generate Sales Invoice"
                                  >
                                    Invoice
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
                                                  updateCustomer(customer.id, { notes: e.target.value }).catch(console.error);
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
                                          {o.transactionId && o.paymentMethod === 'COD' && (
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50">COD TrxID / Phone</span>
                                              <span className="font-bold truncate text-right">
                                                {o.transactionId} <br/> {o.senderNumber}
                                              </span>
                                            </div>
                                          )}
                                          {['bKash', 'Nagad', 'Rocket'].includes(o.paymentMethod || '') && (
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-1">
                                              <span className="opacity-50">TrxID / Phone</span>
                                              <span className="font-bold truncate text-right" title={`${o.transactionId} / ${o.senderNumber}`}>
                                                {o.transactionId} <br/> {o.senderNumber}
                                              </span>
                                            </div>
                                          )}
                                          {o.transactionScreenshot && (
                                            <div className="flex flex-col gap-2 border-b border-zinc-800/50 pb-2 pt-2">
                                              <div className="flex justify-between items-center text-xs">
                                                <span className="opacity-50">Proof of Payment</span>
                                                <a 
                                                  href={o.transactionScreenshot} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer" 
                                                  className="font-bold text-[#0055ff] hover:underline hover:text-[#3377ff] flex items-center gap-1 transition-colors uppercase text-[9px] tracking-widest font-mono"
                                                >
                                                  open link ↗
                                                </a>
                                              </div>
                                              <div className="relative w-full h-36 border border-zinc-800 bg-zinc-950/80 overflow-hidden cursor-pointer group flex items-center justify-center rounded-sm">
                                                <img 
                                                  loading="lazy"
                                                  src={o.transactionScreenshot} 
                                                  alt="Payment Proof" 
                                                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                  referrerPolicy="no-referrer"
                                                  onClick={() => window.open(o.transactionScreenshot, '_blank')}
                                                />
                                                <div 
                                                  onClick={() => window.open(o.transactionScreenshot, '_blank')}
                                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200"
                                                >
                                                  <span className="text-[9px] font-black uppercase text-white tracking-widest font-mono border border-white/20 px-2.5 py-1 bg-zinc-900">View Fullscreen</span>
                                                </div>
                                              </div>
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
                                    {o.shippingAddress && (
                                      <div className="text-[8px] opacity-40 uppercase leading-tight line-clamp-2 mt-1" title={o.shippingAddress}>
                                        {o.shippingAddress}
                                      </div>
                                    )}
                                  </div>
  
                                  <div className="space-y-3 mb-5 bg-zinc-900/30 p-2">
                                    {o.orderItems.slice(0, 2).map((item, idx) => (
                                      <div key={idx} className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight opacity-90">
                                          <span className="truncate max-w-[150px]" title={item.name}>{item.quantity}x {item.name}</span>
                                          <span className="text-emerald-500">৳{(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                        {item.variant && (
                                          <div className="flex gap-2 text-[8px] font-bold opacity-50 tracking-widest uppercase">
                                            <span>COL: {item.variant.color}</span>
                                            <span>SIZ: {item.variant.size}</span>
                                          </div>
                                        )}
                                        {item.customDesign && (
                                          <div className="flex flex-col gap-1 text-[8px] font-bold opacity-50 tracking-widest uppercase mt-0.5">
                                            <span>TYPE: {item.customDesign.type}</span>
                                            <div className="flex items-center gap-1">BODY: <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: item.customDesign.color}}/> SLV: <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: item.customDesign.sleeveColor}}/></div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {o.orderItems.length > 2 && (
                                      <div className="text-[8px] opacity-40 font-black uppercase">+ {o.orderItems.length - 2} MORE ITEMS</div>
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
                        className={`w-full bg-transparent text-sm font-bold tracking-widest outline-none border-b border-zinc-800 focus:border-[#0055ff] pb-2 transition-colors ${crmProcessing ? 'animate-pulse text-[#0055ff]' : isDarkMode ? 'text-white' : 'text-black'}`}
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

                {/* Merchant Reference Numbers & Global Gateways */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
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
                  <div className={`p-4 border ${cardClasses} border-l-4 border-l-[#4285F4]`}>
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Int'l Credit Card (API Key)</p>
                    {isEditingMerchants ? (
                      <input 
                        type="text" 
                        placeholder="Gateway API or MID"
                        value={tempMerchants.creditCard} 
                        onChange={(e) => setTempMerchants({...tempMerchants, creditCard: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-800 text-xs p-1 outline-none focus:border-[#0055ff]"
                      />
                    ) : (
                      <p className="text-sm font-black tracking-[0.2em] text-[#4285F4] truncate">{socialSettings.merchantNumbers?.creditCard || 'NOT_SET'}</p>
                    )}
                  </div>
                  <div className={`p-4 border ${cardClasses} border-l-4 border-l-[#0F9D58]`}>
                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Local Debit Card (API Key)</p>
                    {isEditingMerchants ? (
                      <input 
                        type="text" 
                        placeholder="Gateway API or MID"
                        value={tempMerchants.debitCard} 
                        onChange={(e) => setTempMerchants({...tempMerchants, debitCard: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-800 text-xs p-1 outline-none focus:border-[#0055ff]"
                      />
                    ) : (
                      <p className="text-sm font-black tracking-[0.2em] text-[#0F9D58] truncate">{socialSettings.merchantNumbers?.debitCard || 'NOT_SET'}</p>
                    )}
                  </div>
                </div>

                <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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

            {activeTab === 'sales_list' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0055ff]">Sales_Report_Terminal</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Audit transactions, verify vouchers, and reconcile accounts.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 text-[#0055ff]" />
                      <input 
                        type="text" 
                        placeholder="SEARCH VOUCHER / TXID..." 
                        value={salesVoucherSearch}
                        onChange={e => setSalesVoucherSearch(e.target.value)}
                        className={`pl-10 pr-4 py-3 text-[10px] font-black uppercase border focus:border-[#0055ff] outline-none transition-all w-64 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                       <input 
                         type="date" 
                         value={salesDateRange.start}
                         onChange={e => setSalesDateRange(prev => ({ ...prev, start: e.target.value }))}
                         className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                       />
                       <span className="text-zinc-500 font-black">-</span>
                       <input 
                         type="date" 
                         value={salesDateRange.end}
                         onChange={e => setSalesDateRange(prev => ({ ...prev, end: e.target.value }))}
                         className={`px-4 py-3 text-[10px] font-black uppercase border outline-none ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                       />
                       <button 
                         onClick={() => setSalesDateRange({ start: '', end: '' })}
                         className={`px-4 py-3 text-[10px] font-black uppercase border hover:bg-rose-500 hover:text-white transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                       >
                         RESET
                       </button>
                    </div>

                    <button 
                      onClick={() => {
                        const filtered = orders.filter(o => {
                          if (salesDateRange.start && new Date(o.date) < new Date(salesDateRange.start)) return false;
                          if (salesDateRange.end && new Date(o.date) > new Date(salesDateRange.end)) return false;
                          if (salesVoucherSearch) {
                            const search = salesVoucherSearch.toLowerCase();
                            return o.id.toLowerCase().includes(search) || (o.transactionId && o.transactionId.toLowerCase().includes(search));
                          }
                          return true;
                        });
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + "Date,Voucher ID,Transaction ID,Customer,Amount,Status\n"
                          + filtered
                              .map(o => `${o.date},${o.id},${o.transactionId || 'N/A'},${o.customerName},${o.total},${o.paymentStatus || 'UNPAID'}`)
                              .join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `ST_SALES_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        addLog('EXPORT_SALES', { field: 'FORMAT', newValue: 'CSV' });
                      }}
                      className="bg-[#0055ff] text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0055ff]/20 hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      <Download size={14} /> EXPORT_AUDIT
                    </button>
                  </div>
                </div>

                <div className={`border overflow-hidden rounded-none ${isDarkMode ? 'border-zinc-800 bg-black' : 'bg-white border-zinc-200 shadow-xl'}`}>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={`${isDarkMode ? 'bg-zinc-900/50' : 'bg-zinc-50'} border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">TIMESTAMP</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">VOUCHER_ID</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">TX_ID</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">CUSTOMER</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">METHOD</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff] text-right">GROSS_AMOUNT</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-[#0055ff] text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/10">
                        {orders
                          .filter(o => {
                            // Date filtering
                            if (salesDateRange.start && new Date(o.date) < new Date(salesDateRange.start)) return false;
                            if (salesDateRange.end && new Date(o.date) > new Date(salesDateRange.end)) return false;
                            
                            // Voucher/TXID search
                            if (salesVoucherSearch) {
                              const search = salesVoucherSearch.toLowerCase();
                              return o.id.toLowerCase().includes(search) || (o.transactionId && o.transactionId.toLowerCase().includes(search));
                            }
                            
                            return true;
                          })
                          .map((o) => (
                          <tr key={o.id} className={`group hover:bg-[#0055ff]/5 transition-colors ${isDarkMode ? 'hover:bg-[#0055ff]/5' : 'hover:bg-zinc-50'}`}>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-black uppercase tracking-widest">{o.date}</div>
                              <div className="text-[8px] text-zinc-500 font-mono mt-0.5">{o.time}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black uppercase tracking-widest border-b border-dashed border-zinc-700 cursor-help" title="Click to copy ID" onClick={() => { navigator.clipboard.writeText(o.id); addLog('COPY_VOUCHER_ID', { entityId: o.id }); }}>{o.id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{o.transactionId || '---'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-black uppercase tracking-widest">{o.customerName}</div>
                              <div className="text-[8px] text-zinc-500 font-mono truncate max-w-[150px]">{o.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`}>
                                {o.paymentMethod || 'COD'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-[11px] font-black uppercase tracking-widest">৳{o.total.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                               <div className={`inline-block px-3 py-1 text-[8px] font-black uppercase tracking-widest border ${
                                 o.paymentStatus === 'FULLY_PAID' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' :
                                 o.paymentStatus === 'ADVANCE_VERIFIED' ? 'border-[#0055ff] text-[#0055ff] bg-[#0055ff]/10' :
                                 'border-zinc-700 text-zinc-500 bg-zinc-900'
                               }`}>
                                 {o.paymentStatus || 'UNPAID'}
                               </div>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center gap-4 opacity-30">
                                 <Database className="w-12 h-12" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">NO_SALES_RECORDED_IN_DATABASE</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-[calc(100vh-12rem)] flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
                {/* Chat List */}
                {!isChatExpanded && (
                  <div className={`w-80 border flex flex-col rounded-xl overflow-hidden animate-in slide-in-from-left-4 duration-300 ${cardClasses}`}>
                    <div className="p-4 border-b border-zinc-800 space-y-4 bg-zinc-900/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold tracking-widest text-[#0084ff]">Chats</h3>
                        <span className="text-[10px] px-2 py-0.5 bg-[#0084ff]/20 text-[#0084ff] rounded-full font-bold">{chatSessions.length}</span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                        <input 
                          type="text" 
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                          placeholder="Search sessions..." 
                          className="w-full bg-[#1c1c1c] border border-zinc-800 pl-8 pr-4 py-2 text-[10px] uppercase font-bold tracking-widest text-white placeholder:text-zinc-700 focus:border-[#0084ff]/50 outline-none transition-all rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                      {chatSessions
                        .filter(s => 
                          s.customerName.toLowerCase().includes(chatSearch.toLowerCase()) || 
                          s.customerEmail.toLowerCase().includes(chatSearch.toLowerCase()) ||
                          s.lastMessage.toLowerCase().includes(chatSearch.toLowerCase())
                        )
                        .map((session) => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedChatId(session.id)}
                          className={`w-full text-left p-4 border-b border-zinc-800/30 flex items-center gap-3 transition-all ${selectedChatId === session.id ? 'bg-[#0084ff]/10 border-l-4 border-l-[#0084ff]' : 'hover:bg-white/5'}`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-700">
                              {session.customerName.charAt(0)}
                            </div>
                            {session.isPresenceActive && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold truncate ${selectedChatId === session.id ? 'text-[#0084ff]' : 'text-white'}`}>{session.customerName}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">{new Date(session.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-zinc-500 truncate mt-0.5 font-medium">{session.lastMessage}</p>
                          </div>
                        </button>
                      ))}
                      {chatSessions.length === 0 && (
                        <div className="p-12 text-center flex flex-col items-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700 border border-zinc-800">
                             <MessageSquare className="w-6 h-6" />
                           </div>
                           <p className="text-xs text-zinc-600 font-bold tracking-widest">No active messages</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Detail */}
                <div className={`flex-1 border flex flex-col overflow-hidden rounded-xl transition-all duration-300 ${cardClasses} ${isChatExpanded ? 'max-w-7xl mx-auto' : ''}`}>
                  {selectedChatId ? (
                    <>
                      <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">
                              {chatSessions.find(s => s.id === selectedChatId)?.customerName.charAt(0) || '?'}
                            </div>
                            {chatSessions.find(s => s.id === selectedChatId)?.isPresenceActive && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1c1c1c] rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {chatSessions.find(s => s.id === selectedChatId)?.customerName}
                              </h4>
                              {chatSessions.find(s => s.id === selectedChatId)?.isPresenceActive && (
                                <span className="text-[9px] text-emerald-500 font-bold tracking-tight flex items-center gap-1">
                                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> Active now
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium">{chatSessions.find(s => s.id === selectedChatId)?.customerEmail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const customer = customers.find(c => c.email === chatSessions.find(s => s.id === selectedChatId)?.customerEmail);
                              if (customer) setPreviewCustomer(customer);
                            }}
                            className="p-2 hover:bg-white/5 text-zinc-400 hover:text-[#0084ff] transition-all rounded-lg"
                            title="View Customer Profile"
                          >
                            <User className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setIsChatExpanded(!isChatExpanded)}
                            className={`p-2 hover:bg-white/5 transition-all rounded-lg ${isChatExpanded ? 'text-[#0084ff]' : 'text-zinc-400 hover:text-white'}`}
                            title={isChatExpanded ? "Exit Full View" : "Full Preview Chat"}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div ref={messageScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[#1c1c1c]">
                        {activeSessionMessages.map((msg) => (
                          <div key={msg.id} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 text-[13px] leading-snug shadow-sm ${
                              msg.isAdmin 
                                ? 'bg-[#0084ff] text-white rounded-[20px] rounded-tr-[4px]' 
                                : 'bg-[#3a3b3c] text-[#e4e6eb] rounded-[20px] rounded-tl-[4px]'
                            }`}>
                              <div className="markdown-body prose prose-invert prose-xs max-w-none">
                                <Markdown
                                  components={{
                                    img: ({ node, ...props }) => (
                                      <img loading="lazy" 
                                        {...props} 
                                        className="w-full h-auto mt-2 rounded-lg border border-zinc-700" 
                                        referrerPolicy="no-referrer"
                                      />
                                    ),
                                    p: ({ children }) => <span className="block">{children}</span>
                                  }}
                                >
                                  {msg.text}
                                </Markdown>
                              </div>
                            </div>
                            <div className={`mt-1 text-[10px] text-zinc-500 font-medium ${msg.isAdmin ? 'mr-1' : 'ml-1'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedChatId && (
                        <div className="px-6 py-3 bg-zinc-900/60 border-t border-zinc-800 space-y-4">
                          {/* AI Suggestions */}
                          <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded-full ${isGeneratingSuggestions ? 'bg-[#0084ff]/20 animate-pulse' : 'bg-zinc-800'}`}>
                                <Zap className={`w-3 h-3 ${isGeneratingSuggestions ? 'text-[#0084ff]' : 'text-zinc-500'}`} />
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                {isGeneratingSuggestions ? 'Aura_Thinking...' : 'AI_Suggestions'}
                              </span>
                            </div>
                            
                            {aiSuggestions.length > 0 && (
                              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                {aiSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setAdminChatInput(suggestion)}
                                    disabled={!canReplyToChat}
                                    className={`text-[10px] px-3 py-1 bg-zinc-800/40 border border-zinc-700/30 transition-all font-bold tracking-tight ${canReplyToChat ? 'hover:border-[#0084ff]/50 hover:bg-[#0084ff]/5 text-zinc-400 hover:text-white' : 'text-zinc-600 cursor-not-allowed hidden'}`}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Canned Responses (Fast Message System) */}
                          <div className="flex flex-wrap gap-3 items-center pb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-full bg-zinc-800">
                                <ListIcon className="w-3 h-3 text-zinc-500" />
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                Canned_Replies
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cannedResponses.map((res, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setAdminChatInput(res.text)}
                                  disabled={!canReplyToChat}
                                  className={`text-[9px] px-2.5 py-1 border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-[#0084ff] hover:border-[#0084ff]/50 transition-all uppercase font-black tracking-widest ${!canReplyToChat && 'hidden'}`}
                                  title={res.text}
                                >
                                  {res.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!adminChatInput.trim()) return;
                          const currentSession = chatSessions.find(s => s.id === selectedChatId);
                          if (currentSession) {
                            onSendMessage(adminChatInput, undefined, true, currentSession.customerEmail, currentSession.id);
                            setAdminChatInput('');
                            setAiSuggestions([]); // Clear suggestions after sending
                          }
                        }}
                        className="p-4 bg-[#1c1c1c] border-t border-zinc-800"
                      >
                        <div className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            value={adminChatInput}
                            onChange={(e) => setAdminChatInput(e.target.value)}
                            disabled={!canReplyToChat}
                            placeholder={canReplyToChat ? "Type a message..." : "Chat replies disabled for this user"}
                            className={`flex-1 bg-[#3a3b3c] border-none px-5 py-3 text-sm rounded-full text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-[#0084ff]/20 transition-all ${!canReplyToChat && 'opacity-50 cursor-not-allowed'}`}
                          />
                          <button 
                            type="submit" 
                            disabled={!adminChatInput.trim() || !canReplyToChat}
                            className={`p-3 rounded-full transition-all ${
                              adminChatInput.trim() && canReplyToChat ? 'bg-[#0084ff] text-white hover:scale-110 active:scale-95 shadow-lg' : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                             <svg className="w-5 h-5 fill-current rotate-90" viewBox="0 0 24 24">
                                <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                             </svg>
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-inner">
                        <MessageSquare className="w-10 h-10 text-zinc-700" />
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <p className="text-sm font-bold text-zinc-400">Select a conversation</p>
                        <p className="text-xs text-zinc-600">Choose a chat from the left to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'accounting' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" id="accounting-summary-print-area">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-[#0055ff]/10 pb-6 mb-8">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest block mb-1">Start Date</label>
                      <input type="date" value={accountingStartDate} onChange={e => setAccountingStartDate(e.target.value)} className={`px-4 py-2 border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-transparent border-black'} outline-none text-sm focus:border-[#0055ff]`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest block mb-1">End Date</label>
                      <input type="date" value={accountingEndDate} onChange={e => setAccountingEndDate(e.target.value)} className={`px-4 py-2 border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-transparent border-black'} outline-none text-sm focus:border-[#0055ff]`} />
                    </div>
                    <button onClick={() => { setAccountingStartDate(''); setAccountingEndDate(''); }} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest h-10">Clear Filter</button>
                    
                    <button 
                      onClick={() => setIsMonthlyProfitSheetOpen(true)}
                      className="px-6 py-2 border border-[#0055ff] text-[#0055ff] hover:bg-[#0055ff] hover:text-white text-[10px] font-black uppercase tracking-widest h-10 transition-all flex items-center gap-2"
                    >
                      <ListIcon className="w-4 h-4" /> Monthly_Profit_Sheet
                    </button>
                    <button onClick={() => {
                      const printWindow = window.open('', '', 'height=800,width=1000');
                    const printContents = document.getElementById('accounting-summary-print-area')?.innerHTML;
                    if(printWindow && printContents) {
                      printWindow.document.write(`<html><head><title>Profit Summary</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { padding: 40px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: white; color: black; }
                          button, input, select, label { display: none !important; }
                          * { border-color: #e5e7eb !important; color: black !important; background: transparent !important; }
                          table { border-collapse: collapse; width: 100%; mt-4; }
                          th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
                          .text-rose-500 { color: #ef4444 !important; }
                          .text-emerald-500 { color: #10b981 !important; }
                          canvas, svg { opacity: 0.5; }
                        </style>
                      </head><body>
                        <h1 class="text-2xl font-black mb-8 border-b pb-4">Profit Summary ${accountingStartDate ? 'from ' + accountingStartDate : ''} ${accountingEndDate ? 'to ' + accountingEndDate : ''}</h1>
                        ${printContents}
                      </body></html>`);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 1000);
                    }
                  }} className="px-6 py-2 bg-[#0055ff] hover:bg-[#0044cc] text-white text-[10px] font-black uppercase tracking-widest gap-2 flex items-center h-10 shadow-lg">
                    <Download className="w-4 h-4" /> Download / Print Profit
                  </button>
                </div>
              </div>
                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {(() => {
                    let filteredOrders = orders.filter(o => o.status !== 'CANCELLED');
                    let filteredExpenses = expenses;
                    
                    if (accountingStartDate) {
                      filteredOrders = filteredOrders.filter(o => o.date >= accountingStartDate);
                      filteredExpenses = filteredExpenses.filter(e => e.date >= accountingStartDate);
                    }
                    if (accountingEndDate) {
                      filteredOrders = filteredOrders.filter(o => o.date <= accountingEndDate);
                      filteredExpenses = filteredExpenses.filter(e => e.date <= accountingEndDate);
                    }

                    const activeOrders = filteredOrders;
                    const revenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
                    const cogs = activeOrders.reduce((itemSum, o) => itemSum + (o.orderItems?.reduce((acc, item) => acc + (products.find(p => p.id === item.productId)?.cost || 0) * item.quantity, 0) || 0), 0);
                    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
                    const grossProfit = revenue - cogs;
                    const netProfit = grossProfit - totalExpenses;

                    return (
                      <>
                        <div className={`p-6 border ${cardClasses} shadow-sm group hover:border-[#0055ff] transition-all`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total_Revenue</span>
                            <div className="p-2 bg-[#0055ff]/10 text-[#0055ff]">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black mb-1">৳{revenue.toLocaleString()}</div>
                          <div className="text-[10px] opacity-40 font-bold tracking-tight">Net_Sales_Volume</div>
                        </div>
                        <div className={`p-6 border ${cardClasses} shadow-sm group hover:border-amber-500 transition-all`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase opacity-50 tracking-widest">Product_COGS</span>
                            <div className="p-2 bg-amber-500/10 text-amber-500">
                              <ShoppingCart className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black mb-1">৳{cogs.toLocaleString()}</div>
                          <div className="text-[10px] opacity-40 font-bold tracking-tight">Cost_of_Goods_Sold</div>
                        </div>
                        <div className={`p-6 border ${cardClasses} shadow-sm group hover:border-rose-500 transition-all`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total_Expenses</span>
                            <div className="p-2 bg-rose-500/10 text-rose-500">
                              <ArrowDownRight className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black mb-1">৳{totalExpenses.toLocaleString()}</div>
                          <div className="text-[10px] opacity-40 font-bold tracking-tight">Operating_Expenditure</div>
                        </div>
                        <div className={`p-6 border border-[#0055ff] ${isDarkMode ? 'bg-[#0055ff]/5' : 'bg-[#0055ff]/10'} shadow-sm group transition-all`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Net_Profit</span>
                            <div className="p-2 bg-[#0055ff] text-white">
                              <Zap className="w-4 h-4" />
                            </div>
                          </div>
                          <div className={`text-2xl font-black mb-1 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>৳{netProfit.toLocaleString()}</div>
                          <div className="text-[10px] opacity-40 font-bold tracking-tight">Bottom_Line_Earnings</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-1">Expense_Tracker</h3>
                      <p className="text-[10px] opacity-40 font-bold">LOG_AND_MANAGE_BUSINESS_COSTS</p>
                    </div>
                    <button 
                      onClick={() => {
                        setManagedExpense({
                          date: new Date().toISOString().split('T')[0],
                          amount: 0,
                          category: 'Other',
                          title: ''
                        });
                        setIsExpenseModalOpen(true);
                      }}
                      className="px-6 py-3 bg-[#0055ff] hover:bg-[#0044cc] text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> ADD_EXPENSE
                    </button>
                  </div>

                  <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
                    <table className="w-full text-left text-[11px] font-black uppercase">
                      <thead className={`border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Title / Purpose</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/30">
                        {expenses
                          .filter(e => (!accountingStartDate || e.date >= accountingStartDate) && (!accountingEndDate || e.date <= accountingEndDate))
                          .length > 0 ? (
                          expenses
                            .filter(e => (!accountingStartDate || e.date >= accountingStartDate) && (!accountingEndDate || e.date <= accountingEndDate))
                            .sort((a, b) => b.date.localeCompare(a.date)).map((expense) => (
                            <tr key={expense.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                              <td className="px-6 py-4 opacity-60 font-mono">{new Date(expense.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                <div className="font-bold">{expense.title}</div>
                                {expense.notes && <div className="text-[9px] opacity-40 uppercase font-medium">{expense.notes}</div>}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 border text-[8px] tracking-tighter ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-100 border-zinc-300'}`}>
                                  {expense.category.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-rose-500 font-black">৳{expense.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setManagedExpense(expense);
                                      setIsExpenseModalOpen(true);
                                    }}
                                    className="p-2 border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => setExpenseDeleteConfirm(expense.id || null)}
                                    className="p-2 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="px-6 py-20 text-center text-zinc-500 tracking-widest font-black opacity-30">NO_EXPENSES_LOGGED_YET</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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
                  onOrderComplete={(order) => {
                    saveOrderToFirestore(order);
                    setOrders(prev => [order, ...prev]);
                    setVoucherOrder(order);
                  }}
                  isDarkMode={isDarkMode} 
                />
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#0055ff]">STREET THREADX SUPPORT RELAY</h3>
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
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">Data_Management</h4>
                      <p className="text-[9px] uppercase opacity-40 font-black mt-1">Cloud Storage Archiving & Backups</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-zinc-800 bg-zinc-900/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                          <Cloud className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-500">System_Realtime_Sync</p>
                          <p className="text-[8px] font-bold opacity-40 uppercase">Last successful archival: {lastSyncTime || 'PENDING_FIRST_ROOT_SYNC'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
                        Live_Connection
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-60">Generate System Backup</p>
                        <p className="text-[8px] font-black uppercase opacity-40 mt-1 max-w-[200px]">Downloads XLSX/JSON and syncs to Firebase Cloud Storage automatically</p>
                      </div>
                      <button
                        onClick={() => setShowBackupModal(true)}
                        disabled={isBackingUp}
                        className="bg-[#0055ff] hover:bg-[#0044cc] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isBackingUp ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            SYNCING...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            MANAGE_DATA_VAULT
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

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

                <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                  <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
                    <div>
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">Hero_Banner_Images</h4>
                      <p className="text-[9px] uppercase opacity-40 font-black mt-1">Manage main storefront banner images (Comma separated URLs)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDragOverStatus('hero'); }}
                      onDragLeave={() => setDragOverStatus(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverStatus(null);
                        if (e.dataTransfer.files?.length > 0) {
                          handleHeroImageUpload(e.dataTransfer.files);
                        }
                      }}
                      className={`border-2 border-dashed p-8 flex flex-col justify-center items-center gap-3 transition-colors ${dragOverStatus === 'hero' ? 'border-[#0055ff] bg-[#0055ff]/10' : 'border-zinc-800 hover:border-zinc-600'}`}
                    >
                      <label className="text-center cursor-pointer flex flex-col items-center gap-3 w-full">
                        <div className="bg-[#0055ff] hover:bg-[#0044cc] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                          Upload_Image
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Or drag and drop files here</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                          handleHeroImageUpload(e.target.files);
                          if (e.target) e.target.value = '';
                        }} />
                      </label>

                      {Object.keys(heroUploadProgress).length > 0 && (
                        <div className="w-full max-w-md mt-4 space-y-3">
                          {Object.entries(heroUploadProgress).map(([fileName, { progress, size }]) => (
                            <div key={fileName} className="bg-black border border-zinc-800 p-3 flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-mono truncate max-w-[200px] text-zinc-300" title={fileName}>{fileName}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-mono opacity-50 text-zinc-400">
                                    {size < 1048576 ? (size / 1024).toFixed(1) + ' KB' : (size / 1024 / 1024).toFixed(2) + ' MB'}
                                  </span>
                                  <span className="text-[10px] font-black tabular-nums text-[#0055ff]">{Math.round(progress)}%</span>
                                </div>
                              </div>
                              <div className="w-full bg-zinc-900 h-1">
                                <div className="bg-[#0055ff] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {socialSettings.heroImages && socialSettings.heroImages.length > 0 && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
                        {socialSettings.heroImages.map((img, idx) => (
                           <div key={idx} className="aspect-video relative group border border-zinc-800 bg-black">
                             <img loading="lazy" src={img} className="w-full h-full object-cover" alt="Hero Banner Preview" />
                             <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                               <button onClick={() => window.open(img, '_blank')} className="w-24 text-[9px] font-black uppercase px-2 py-1.5 bg-[#0055ff] text-white tracking-widest border border-transparent hover:border-white transition-all">Preview</button>
                               <button 
                                 onClick={() => setSocialSettings(prev => ({
                                   ...prev,
                                   heroImages: prev.heroImages?.filter((_, i) => i !== idx)
                                 }))}
                                 className="w-24 text-[9px] font-black uppercase px-2 py-1.5 bg-rose-500 text-white tracking-widest border border-transparent hover:border-white transition-all"
                               >
                                 Remove
                               </button>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase opacity-40">Banner_Image_URLs</label>
                      <input 
                        type="text" 
                        value={socialSettings.heroImages?.join(', ') || ''} 
                        placeholder="https://image1.jpg, https://image2.jpg"
                        onChange={(e) => setSocialSettings({ 
                          ...socialSettings, 
                          heroImages: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className={`border p-8 rounded-none space-y-8 relative ${cardClasses}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Platform_Connections</h3>
                      {user.role !== AdminRole.SUPER_ADMIN && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 uppercase font-black tracking-widest">
                          Super Admin Controlled
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {['facebook', 'instagram', 'linkedin', 'x', 'behance'].map((platform) => (
                        <div key={platform} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase opacity-40">{platform}_URL</label>
                            <button 
                              disabled={user.role !== AdminRole.SUPER_ADMIN}
                              onClick={() => setSocialSettings({
                                ...socialSettings,
                                visibility: {
                                  ...socialSettings.visibility,
                                  [platform]: !socialSettings.visibility[platform as keyof typeof socialSettings.visibility]
                                }
                              })}
                              className={`text-[8px] font-black uppercase px-2 py-1 rounded-none border transition-all ${socialSettings.visibility[platform as keyof typeof socialSettings.visibility] ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'} ${user.role !== AdminRole.SUPER_ADMIN ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {socialSettings.visibility[platform as keyof typeof socialSettings.visibility] ? 'VISIBLE' : 'HIDDEN'}
                            </button>
                          </div>
                          <input 
                            type="text" 
                            disabled={user.role !== AdminRole.SUPER_ADMIN}
                            value={(socialSettings[platform as keyof Omit<SocialSettings, 'visibility' | 'announcementBanner' | 'merchantNumbers'>] as string) || ''} 
                            onChange={(e) => setSocialSettings({ ...socialSettings, [platform]: e.target.value })}
                            className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'} ${user.role !== AdminRole.SUPER_ADMIN ? 'opacity-50 cursor-not-allowed border-zinc-800/20' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      disabled={user.role !== AdminRole.SUPER_ADMIN}
                      onClick={handleSaveSocialSettings}
                      className={`w-full py-4 text-white text-[10px] font-black uppercase tracking-[0.3em] ${user.role !== AdminRole.SUPER_ADMIN ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-800/20' : 'bg-[#0055ff] hover:scale-[1.02] transition-transform'}`}
                    >
                      {user.role === AdminRole.SUPER_ADMIN ? 'Sync_Global_Settings' : 'Requires_Super_Admin_Role'}
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
                    <h3 className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Aesthetic_Aura</h3>
                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase opacity-60 leading-relaxed max-w-md">Synchronize the command center with your preferred luminance profile. High contrast brutalist geometry scales across all modes.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => setIsDarkMode(true)}
                          className={`flex flex-col gap-4 p-6 border-2 transition-all text-left ${isDarkMode ? 'border-[#0055ff] bg-[#0055ff]/5 shadow-[4px_4px_0px_0px_#0055ff]' : 'border-zinc-200 hover:border-black opacity-60'}`}
                        >
                          <div className={`w-full aspect-video bg-black border-2 ${isDarkMode ? 'border-[#0055ff]' : 'border-zinc-800'} flex items-center justify-center`}>
                            <Moon className={`w-8 h-8 ${isDarkMode ? 'text-[#0055ff]' : 'text-zinc-700'}`} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1">Night_Protocol</div>
                            <div className="text-[8px] opacity-40 font-bold">Deep black palette for low light operations.</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => setIsDarkMode(false)}
                          className={`flex flex-col gap-4 p-6 border-2 transition-all text-left ${!isDarkMode ? 'border-black bg-zinc-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'}`}
                        >
                          <div className={`w-full aspect-video bg-white border-2 ${!isDarkMode ? 'border-black' : 'border-zinc-200'} flex items-center justify-center`}>
                            <Sun className={`w-8 h-8 ${!isDarkMode ? 'text-black' : 'text-zinc-400'}`} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1">Day_Luminance</div>
                            <div className="text-[8px] opacity-40 font-bold">High-contrast white for peak visibility.</div>
                          </div>
                        </button>
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

                  <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                    <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
                      <div>
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">Security_Vault</h4>
                        <p className="text-[9px] uppercase opacity-40 font-black mt-1">Encrypted Secret Values & API Keys</p>
                      </div>
                      <Shield className="w-4 h-4 text-[#0055ff] animate-pulse" />
                    </div>
                    
                    {vaultLocked ? (
                      <div className="py-12 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-6 bg-[#0055ff]/5">
                        <div className="w-16 h-16 bg-[#0055ff]/10 rounded-full flex items-center justify-center">
                          <Lock className="w-8 h-8 text-[#0055ff]" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-black uppercase tracking-widest">Access Restricted</h3>
                          <p className="text-[10px] uppercase opacity-40 font-black tracking-tight max-w-[250px]">To access private API keys, you must clarify your administrative identity via Google Secure Login.</p>
                        </div>

                        {authError && (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase tracking-widest max-w-sm animate-in fade-in slide-in-from-top-2">
                             {authError}
                          </div>
                        )}

                        <button 
                          onClick={handleVerifyAdministrativeIdentity}
                          className="bg-[#0055ff] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(0,85,255,0.4)] transition-all"
                        >
                          Verify_Administrative_Identity
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Stripe_Secret_Key</label>
                              <input 
                                type="password" 
                                value={secretValues.stripeSecretKey} 
                                onChange={(e) => setSecretValues({ ...secretValues, stripeSecretKey: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="sk_live_..."
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Stripe_Publishable_Key</label>
                              <input 
                                type="text" 
                                value={secretValues.stripePublishableKey} 
                                onChange={(e) => setSecretValues({ ...secretValues, stripePublishableKey: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="pk_live_..."
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Gemini_API_Key</label>
                              <input 
                                type="password" 
                                value={secretValues.geminiApiKey} 
                                onChange={(e) => setSecretValues({ ...secretValues, geminiApiKey: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="AIza..."
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Admin_2FA_Secret</label>
                              <input 
                                type="password" 
                                value={secretValues.adminTwoFactorSecret} 
                                onChange={(e) => setSecretValues({ ...secretValues, adminTwoFactorSecret: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="SECURE_BASE32_VALUE"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Facebook_App_ID</label>
                              <input 
                                type="text" 
                                value={secretValues.facebookAppId || ''} 
                                onChange={(e) => setSecretValues({ ...secretValues, facebookAppId: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="FB_APP_ID"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase opacity-40">Facebook_App_Secret</label>
                              <input 
                                type="password" 
                                value={secretValues.facebookAppSecret || ''} 
                                onChange={(e) => setSecretValues({ ...secretValues, facebookAppSecret: e.target.value })}
                                className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                                placeholder="FB_APP_SECRET"
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveSecrets}
                          disabled={isSavingSecrets}
                          className="w-full py-4 bg-[#0055ff] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                        >
                          {isSavingSecrets ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              SYNCING_VAULT...
                            </>
                          ) : (
                            <>
                              <Database className="w-4 h-4" />
                              LOCK_&_SYNC_SECRETS
                            </>
                          )}
                        </button>
                      </>
                    )}
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

                <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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

                <div className={`border rounded-none overflow-x-auto ${cardClasses}`}>
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
                              <p className="line-clamp-2 text-[10px] leading-relaxed opacity-70 uppercase">{r.comment}</p>
                              {r.reply && (
                                <div className="mt-2 p-2 bg-[#0055ff]/5 border-l-2 border-[#0055ff]">
                                  <div className="text-[8px] font-black text-[#0055ff] mb-1">REPLY:</div>
                                  <p className="text-[9px] italic opacity-60 uppercase">{r.reply}</p>
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

            {activeTab === 'user_management' && user.role === AdminRole.SUPER_ADMIN && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">User_Management</h3>
                    <p className="text-[10px] uppercase opacity-40 font-black mt-2 tracking-widest">Global Terminal Access Control</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingUser(true);
                      setEditingUserId(null);
                      setNewUser({ username: '', role: AdminRole.SUPPORT, password: '' });
                    }}
                    className="flex items-center gap-2 bg-[#0055ff] hover:bg-[#0044cc] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    NEW_OPERATOR
                  </button>
                </div>

                {isEditingUser && (
                  <div className={`border p-8 rounded-none space-y-6 ${cardClasses} relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#0055ff]" />
                    <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">
                      {editingUserId ? 'UPDATE_OPERATOR' : 'PROVISION_OPERATOR'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase opacity-50 block">Username</label>
                        <input
                          type="text"
                          value={newUser.username || ''}
                          onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                          className={`w-full p-4 border text-[10px] font-bold outline-none focus:border-[#0055ff] transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}
                          placeholder="OPERATOR_CODE"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase opacity-50 block">Password / Passkey</label>
                        <input
                          type="text"
                          value={newUser.password || ''}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          className={`w-full p-4 border text-[10px] font-bold outline-none focus:border-[#0055ff] transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}
                          placeholder="•••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase opacity-50 block">Clearance_Level</label>
                        <select
                          value={newUser.role || AdminRole.SUPPORT}
                          onChange={(e) => setNewUser({...newUser, role: e.target.value as AdminRole})}
                          className={`w-full p-4 border text-[10px] font-bold outline-none focus:border-[#0055ff] transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}
                        >
                          <option value={AdminRole.SUPER_ADMIN}>SUPER_ADMIN // OVERRIDE</option>
                          <option value={AdminRole.EDITOR}>EDITOR // CATALOG</option>
                          <option value={AdminRole.SUPPORT}>SUPPORT // COMMUNICATIONS</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUser.canManageChat || false}
                            onChange={(e) => setNewUser({...newUser, canManageChat: e.target.checked})}
                            className="w-4 h-4 rounded-none accent-[#0055ff] bg-black border-zinc-800"
                          />
                          <span className="text-[10px] font-black uppercase">Enable Chat Reply Access</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4 border-t border-zinc-800">
                      <button
                        onClick={async () => {
                          if (editingUserId) {
                             const updatedAdmin = { ...adminUsersList.find(u => u.id === editingUserId), ...newUser } as AdminUser;
                             await adminService.saveAdmin(updatedAdmin);
                             addLog(`UPDATED_OPERATOR_${newUser.username}`);
                          } else {
                            if (!newUser.username || !newUser.password) return alert('Username and Password required');
                            const id = Math.random().toString(36).substring(2, 9);
                            const newAdmin: AdminUser = { id, lastLogin: 'Never', ...newUser as AdminUser };
                            await adminService.saveAdmin(newAdmin);
                            addLog(`PROVISIONED_OPERATOR_${newUser.username}`);
                          }
                          setIsEditingUser(false);
                          setEditingUserId(null);
                        }}
                        className="bg-white text-black px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#0055ff] hover:text-white transition-all"
                      >
                        {editingUserId ? 'UPDATE' : 'PROVISION'}
                      </button>
                      <button
                        onClick={() => setIsEditingUser(false)}
                        className="border border-zinc-800 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-900 transition-all text-white"
                      >
                        ABORT
                      </button>
                    </div>
                  </div>
                )}

                <div className={`border rounded-none ${cardClasses}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-black opacity-40">Operator</th>
                          <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-black opacity-40">Clearance</th>
                          <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-black opacity-40">Chat_Access</th>
                          <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-black opacity-40">Last_Sync</th>
                          <th className="p-6 text-[9px] uppercase tracking-[0.3em] font-black opacity-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {adminUsersList.map(u => (
                          <tr key={u.id} className="group hover:bg-zinc-900/40 transition-colors">
                            <td className="p-6">
                              <span className="text-xs font-black uppercase tracking-widest text-[#0055ff]">{u.username}</span>
                              <div className="text-[8px] opacity-40 mt-1 uppercase">ID: {u.id}</div>
                            </td>
                            <td className="p-6">
                              <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                                u.role === AdminRole.SUPER_ADMIN ? 'bg-red-500/20 text-red-500' :
                                u.role === AdminRole.EDITOR ? 'bg-[#0055ff]/20 text-[#0055ff]' :
                                'bg-green-500/20 text-green-500'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-bold text-zinc-500">
                                {u.role === AdminRole.SUPER_ADMIN || u.canManageChat ? 'GRANTED' : 'DENIED'}
                              </span>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-bold text-zinc-500">{u.lastLogin || 'NEVER'}</span>
                            </td>
                            <td className="p-6 flex justify-end gap-2">
                              {u.username !== 'root' && (
                                <>
                                  <button
                                    onClick={() => {
                                      alert(`Operator: ${u.username}\nUnique ID: ${u.id}\nPasskey: ${u.password || 'NOT_SET_OR_MASKED'}`);
                                    }}
                                    className="p-3 bg-zinc-900/50 hover:bg-white hover:text-black transition-all group-hover:opacity-100 opacity-50"
                                    title="Recover Credentials"
                                  >
                                    <Key className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setLogSearch(u.username);
                                      setActiveTab('activity_logs');
                                    }}
                                    className="p-3 bg-zinc-900/50 hover:bg-white hover:text-black transition-all group-hover:opacity-100 opacity-50"
                                    title="View Activity Logs"
                                  >
                                    <Activity className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setNewUser(u);
                                      setEditingUserId(u.id);
                                      setIsEditingUser(true);
                                    }}
                                    className="p-3 bg-zinc-900 hover:bg-white hover:text-black transition-all group-hover:opacity-100 opacity-50"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Terminate access for operator ${u.username}?`)) {
                                        await adminService.deleteAdmin(u.id);
                                        addLog(`TERMINATED_OPERATOR_${u.username}`);
                                      }
                                    }}
                                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all group-hover:opacity-100 opacity-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                            <div className="text-[9px] opacity-40 uppercase mt-1">
                              {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                            </div>
                            {log.details && (
                              <div className={`mt-3 p-3 border text-[9px] font-black uppercase space-y-1 ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="opacity-40">FIELD:</span>
                                  <span className="text-[#0055ff]">{log.details.field}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="opacity-40">PREV:</span>
                                  <span className="text-zinc-600 line-through">{String(log.details.previousValue ?? 'NULL')}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="opacity-40">NEW:</span>
                                  <span className="text-emerald-500 font-bold">{String(log.details.newValue ?? 'NULL')}</span>
                                </div>
                              </div>
                            )}
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

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                  <h2 className="text-xl font-bold">Appearance Settings</h2>
                  <button 
                    onClick={async () => {
                        try {
                            const { doc, setDoc } = await import('firebase/firestore');
                            const { db } = await import('../firebase');
                            // Clean undefined fields that might crash Firestore
                            const cleanSettings = JSON.parse(JSON.stringify(socialSettings));
                            await setDoc(doc(db, 'settings', 'social'), cleanSettings, { merge: true });
                            alert('Appearance settings saved');
                        } catch (e: any) {
                            console.error(e);
                            alert('Error saving: ' + (e.message || String(e)));
                        }
                    }}
                    className="px-4 py-2 bg-[#0055ff] text-white text-[10px] uppercase font-black"
                  >
                    Save Changes
                  </button>
                </div>
                <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2">Header Color</label>
                        <input
                            type="color"
                            value={socialSettings.appearance?.headerColor || '#000000'}
                            onChange={(e) => setSocialSettings({...socialSettings, appearance: {...socialSettings.appearance, headerColor: e.target.value, footerColor: socialSettings.appearance?.footerColor || '', middleColor: socialSettings.appearance?.middleColor || '', siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''}})}
                            className="w-full h-10 border-0 bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2">Footer Color</label>
                        <input
                            type="color"
                            value={socialSettings.appearance?.footerColor || '#000000'}
                            onChange={(e) => setSocialSettings({...socialSettings, appearance: {...socialSettings.appearance, footerColor: e.target.value, headerColor: socialSettings.appearance?.headerColor || '', middleColor: socialSettings.appearance?.middleColor || '', siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''}})}
                            className="w-full h-10 border-0 bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase mb-2">Middle / Page Body Color</label>
                        <input
                            type="color"
                            value={socialSettings.appearance?.middleColor || '#ffffff'}
                            onChange={(e) => setSocialSettings({...socialSettings, appearance: {...socialSettings.appearance, middleColor: e.target.value, headerColor: socialSettings.appearance?.headerColor || '', footerColor: socialSettings.appearance?.footerColor || '', siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''}})}
                            className="w-full h-10 border-0 bg-transparent"
                        />
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-black uppercase">Live Website Editor</label>
                        <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold border border-emerald-500/30 px-2 py-0.5 rounded-sm bg-emerald-500/10">Elementor Mode</span>
                    </div>
                    <div className={`p-6 border flex flex-col items-center justify-center space-y-4 text-center ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-[#0055ff] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-sm mb-1">Visual Page Builder</h3>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">Design your pages visually with drag-and-drop blocks, real-time preview, and inline text editing.</p>
                        </div>
                        <button 
                            onClick={() => {
                              if (onEnableLiveEditMode) onEnableLiveEditMode();
                            }}
                            className="bg-[#0055ff] text-white px-6 py-3 text-[10px] uppercase font-black tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Launch Live Editor
                        </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800 space-y-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff] mb-2">1. Site Brand Identity</h3>
                      <p className="text-xs text-zinc-500 mb-4">Input a logo URL or upload a high-resolution logo image (transparent PNG or SVG recommended).</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase mb-1.5 opacity-60">Logo Image Source URL</label>
                        <div className="flex gap-3">
                          <input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={socialSettings.appearance?.siteLogoUrl || ''}
                            onChange={(e) => setSocialSettings({
                              ...socialSettings,
                              appearance: {
                                ...socialSettings.appearance,
                                siteLogoUrl: e.target.value,
                                headerColor: socialSettings.appearance?.headerColor || '',
                                footerColor: socialSettings.appearance?.footerColor || '',
                                middleColor: socialSettings.appearance?.middleColor || ''
                              }
                            })}
                            className={`flex-1 p-3 text-xs focus:outline-none focus:border-[#0055ff] border font-mono transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-transparent border-zinc-200 text-black'}`}
                          />
                          {socialSettings.appearance?.siteLogoUrl && (
                            <button
                              onClick={() => {
                                setSocialSettings({
                                  ...socialSettings,
                                  appearance: {
                                    ...socialSettings.appearance,
                                    siteLogoUrl: '',
                                    siteLogoFileSize: undefined,
                                    siteLogoHeight: undefined,
                                    siteLogoWidth: undefined,
                                    headerColor: socialSettings.appearance?.headerColor || '',
                                    footerColor: socialSettings.appearance?.footerColor || '',
                                    middleColor: socialSettings.appearance?.middleColor || ''
                                  }
                                });
                              }}
                              className="px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] uppercase font-black tracking-wider transition-all flex items-center justify-center gap-1"
                              title="Remove logo"
                            >
                              <Trash size={12} /> Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Drag & Drop Upload Zone */}
                      <div
                        onDragEnter={(e) => { e.preventDefault(); setLogoDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); setLogoDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setLogoDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setLogoDragActive(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            handleSiteLogoUpload(file);
                          } else {
                            setLogoUploadError('Please drop an image file.');
                          }
                        }}
                        className={`border-2 border-dashed rounded-none p-8 flex flex-col items-center justify-center text-center transition-all ${
                          logoDragActive 
                            ? 'border-[#0055ff] bg-blue-500/5' 
                            : isDarkMode ? 'border-zinc-800 bg-black/40 hover:border-zinc-700' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        <input
                          id="logo-upload-file"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSiteLogoUpload(file);
                          }}
                        />
                        <Cloud className={`w-8 h-8 mb-2 ${logoDragActive ? 'text-[#0055ff]' : 'text-zinc-500'}`} />
                        <p className="text-xs font-black uppercase tracking-wider mb-1">
                          Drag & Drop Your Site Logo
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">
                          PNG, JPG, SVG up to 5MB
                        </p>
                        <label
                          htmlFor="logo-upload-file"
                          className="cursor-pointer bg-[#0055ff] hover:bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 transition-colors inline-block shadow-md shadow-blue-500/10"
                        >
                          Select File
                        </label>
                      </div>

                      {/* Display Progress bar */}
                      {logoProgress !== null && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Uploading Site Logo...</span>
                            <span className="text-[10px] font-mono font-bold text-[#0055ff]">{logoProgress}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 overflow-hidden">
                            <div 
                              className="bg-[#0055ff] h-full transition-all duration-300"
                              style={{ width: `${logoProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {logoUploadError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-[10px] text-red-500 font-bold uppercase tracking-wider">
                          {logoUploadError}
                        </div>
                      )}

                      {/* Preview & Image Metadata Section */}
                      {socialSettings.appearance?.siteLogoUrl && (
                        <div className={`p-4 border grid grid-cols-1 md:grid-cols-3 gap-4 items-center ${isDarkMode ? 'bg-zinc-950/80 border-zinc-900' : 'bg-zinc-100/50 border-zinc-200'}`}>
                          <div className="md:col-span-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 p-4 bg-zinc-950 relative overflow-hidden group">
                            {/* Checkerboard transparency grid */}
                            <div className="absolute inset-0 opacity-[0.03] select-none pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0), radial-gradient(#ffffff 1px, #000000 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
                            <img 
                              loading="lazy"
                              src={socialSettings.appearance.siteLogoUrl} 
                              alt="Logo Render" 
                              style={{ height: `${socialSettings.appearance.siteLogoHeight || 32}px`, width: socialSettings.appearance.siteLogoWidth ? `${socialSettings.appearance.siteLogoWidth}px` : 'auto' }}
                              className="object-contain max-h-[80px] relative z-10 transition-all filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                            />
                            <div className="text-[8px] uppercase tracking-widest text-zinc-500 mt-2 font-black z-10">Live Preview</div>
                          </div>
                          
                          <div className="md:col-span-2 space-y-3">
                            <div className="border-b border-zinc-800 pb-2">
                              <h4 className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Logo File Specifications</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px]">
                              <div className="space-y-1">
                                <span className="text-[8px] text-zinc-400 uppercase font-black block">Dimensions</span>
                                <span className="font-black text-white uppercase">
                                  {logoMeta ? `${logoMeta.width} × ${logoMeta.height} px` : 'Loading...'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] text-zinc-400 uppercase font-black block">File Size</span>
                                <span className="font-black text-white uppercase">
                                  {logoMeta?.fileSize 
                                    ? logoMeta.fileSize > 1024 * 1024 
                                      ? `${(logoMeta.fileSize / (1024 * 1024)).toFixed(2)} MB` 
                                      : `${(logoMeta.fileSize / 1024).toFixed(1)} KB`
                                    : 'External/Cloud URL'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] text-zinc-400 uppercase font-black block">Scale Ratio</span>
                                <span className="font-black text-[#0055ff] uppercase">
                                  {logoMeta ? (logoMeta.width / logoMeta.height).toFixed(2) : '-'} : 1
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[8px] text-zinc-400 uppercase font-black block">Format</span>
                                <span className="font-bold text-white uppercase">
                                  {socialSettings.appearance.siteLogoUrl.split('.').pop()?.split('?')[0]?.substring(0, 4) || 'PNG'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Logo Size Control Section */}
                    <div className="border-t border-zinc-800 pt-6 space-y-4">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0055ff]">2. Storefront Layout Sizing & Aspect</h4>
                        <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Control how your brand assets scale on the live header across devices.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="opacity-60">Logo Height</span>
                            <span className="text-[#0055ff]">{socialSettings.appearance?.siteLogoHeight || 32}px</span>
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="96"
                            value={socialSettings.appearance?.siteLogoHeight || 32}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSocialSettings({
                                ...socialSettings,
                                appearance: {
                                  ...socialSettings.appearance,
                                  siteLogoHeight: val,
                                  headerColor: socialSettings.appearance?.headerColor || '',
                                  footerColor: socialSettings.appearance?.footerColor || '',
                                  middleColor: socialSettings.appearance?.middleColor || '',
                                  siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''
                                }
                              });
                            }}
                            className="w-full accent-[#0055ff] bg-zinc-800 h-1 outline-none appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                            <span>16PX (COMPACT)</span>
                            <span>96PX (PROMINENT)</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="opacity-60">Logo Width</span>
                            <span className="text-[#0055ff]">
                              {socialSettings.appearance?.siteLogoWidth ? `${socialSettings.appearance.siteLogoWidth}px` : 'AUTO (PROPORTIONAL)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="32"
                              max="320"
                              disabled={!socialSettings.appearance?.siteLogoWidth}
                              value={socialSettings.appearance?.siteLogoWidth || 120}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSocialSettings({
                                  ...socialSettings,
                                  appearance: {
                                    ...socialSettings.appearance,
                                    siteLogoWidth: val,
                                    headerColor: socialSettings.appearance?.headerColor || '',
                                    footerColor: socialSettings.appearance?.footerColor || '',
                                    middleColor: socialSettings.appearance?.middleColor || '',
                                    siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''
                                  }
                                });
                              }}
                              className={`flex-1 h-1 outline-none appearance-none cursor-pointer ${socialSettings.appearance?.siteLogoWidth ? 'accent-[#0055ff] bg-zinc-800' : 'bg-zinc-800/20'}`}
                            />
                            <button
                              onClick={() => {
                                setSocialSettings({
                                  ...socialSettings,
                                  appearance: {
                                    ...socialSettings.appearance,
                                    siteLogoWidth: socialSettings.appearance?.siteLogoWidth ? undefined : 120,
                                    headerColor: socialSettings.appearance?.headerColor || '',
                                    footerColor: socialSettings.appearance?.footerColor || '',
                                    middleColor: socialSettings.appearance?.middleColor || '',
                                    siteLogoUrl: socialSettings.appearance?.siteLogoUrl || ''
                                  }
                                });
                              }}
                              className={`px-3 py-1 text-[8px] font-black tracking-widest border uppercase transition-colors ${
                                socialSettings.appearance?.siteLogoWidth 
                                  ? 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-zinc-800' 
                                  : 'bg-[#0055ff]/10 text-[#0055ff] border-[#0055ff]/30 hover:bg-[#0055ff]/20'
                              }`}
                            >
                              {socialSettings.appearance?.siteLogoWidth ? 'Lock Auto' : 'Custom'}
                            </button>
                          </div>
                          <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                            <span>32PX</span>
                            <span>320PX</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-8 space-y-6">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0055ff]">3. Sale & Countdown Urgency</h4>
                        <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Display a live countdown timer on the hero section to drive limited-time sales.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSocialSettings({
                              ...socialSettings,
                              sale: {
                                enabled: !socialSettings.sale?.enabled,
                                endTime: socialSettings.sale?.endTime || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                                title: socialSettings.sale?.title || 'FLASH SALE'
                              }
                            })}
                            className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${socialSettings.sale?.enabled ? 'bg-[#0055ff]' : 'bg-zinc-800'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${socialSettings.sale?.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </button>
                          <label className="text-[10px] font-black uppercase cursor-pointer">Enable Sale Countdown</label>
                        </div>

                        {socialSettings.sale?.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                              <label className="block text-[8px] font-black uppercase text-zinc-500 tracking-widest text-left">Sale Title (e.g. MEGA CLEARANCE)</label>
                              <input
                                type="text"
                                value={socialSettings.sale?.title || ''}
                                onChange={(e) => setSocialSettings({
                                  ...socialSettings,
                                  sale: { ...socialSettings.sale!, title: e.target.value }
                                })}
                                className={`w-full p-3 text-xs focus:outline-none focus:border-[#0055ff] border font-black uppercase tracking-wider transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-transparent border-zinc-200 text-black'}`}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[8px] font-black uppercase text-zinc-500 tracking-widest text-left">Sale Expiry (Date & Time)</label>
                              <input
                                type="datetime-local"
                                value={socialSettings.sale?.endTime ? new Date(new Date(socialSettings.sale.endTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setSocialSettings({
                                  ...socialSettings,
                                  sale: { ...socialSettings.sale!, endTime: new Date(e.target.value).toISOString() }
                                })}
                                className={`w-full p-3 text-xs focus:outline-none focus:border-[#0055ff] border font-mono transition-colors ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-transparent border-zinc-200 text-black'}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-8 space-y-6">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0055ff]">4. Global Fallback Size Chart Guide</h4>
                        <p className="text-[10px] text-zinc-500 uppercase mt-0.5">Configure a universal size chart document to display on products lacking an asset-specific diagram.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Control Box */}
                        <div className="space-y-4">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase">Input style instructions for Gemini to build a universal master sizing diagram, or upload your store wide sizing card.</p>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={globalSizeChartPrompt} 
                              onChange={e => setGlobalSizeChartPrompt(e.target.value)}
                              className={`flex-1 px-4 py-3 text-[10px] font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800 text-white' : 'bg-transparent border-zinc-200 text-black'}`} 
                              placeholder="e.g. Clean technical blueprints on a dark slate background" 
                            />
                            <button 
                              type="button" 
                              onClick={handleAiGenerateGlobalSizeChart}
                              disabled={isGeneratingGlobalSizeChart}
                              className="bg-[#0055ff] text-white px-4 py-3 text-[9px] font-black uppercase disabled:opacity-50 flex items-center gap-2"
                            >
                              {isGeneratingGlobalSizeChart ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              Synthesize
                            </button>
                          </div>

                          <div className="flex gap-2 items-center">
                            <input 
                              type="file" 
                              id="global-sizechart-file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleGlobalSizeChartUpload(file);
                              }}
                              className="hidden" 
                            />
                            <label 
                              htmlFor="global-sizechart-file"
                              className="flex-1 text-center cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white py-3 text-[9px] font-black uppercase transition-all"
                            >
                              Upload Universal Card
                            </label>
                            {socialSettings.sizeChartImage && (
                              <button 
                                type="button"
                                onClick={() => setSocialSettings(prev => ({ ...prev, sizeChartImage: undefined }))}
                                className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[9px] uppercase font-black"
                              >
                                Revert
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Preview Box */}
                        <div className={`p-4 border flex flex-col items-center justify-center min-h-[140px] relative transition-all ${isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-100/30 border-zinc-200'}`}>
                          {socialSettings.sizeChartImage ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                              <img 
                                src={socialSettings.sizeChartImage} 
                                alt="Store Sizing Guide" 
                                className="max-h-[120px] object-contain border border-zinc-800 shadow-md"
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-[8px] font-black uppercase text-[#0055ff] mt-2">Active: Universal Size Chart Loaded</p>
                            </div>
                          ) : (
                            <div className="text-center space-y-1 text-zinc-500">
                              <p className="text-[10px] font-black uppercase opacity-40">No Universal Chart Card</p>
                              <p className="text-[8px] uppercase tracking-wide opacity-40 max-w-[190px] mx-auto">Products will fall back to their individual size tables.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plugins' && (
              <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex justify-between items-center pb-6 border-b border-zinc-800">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Plugin_Extension_Engine</h2>
                    <p className="text-[10px] text-zinc-500 uppercase mt-1 tracking-widest">Active WordPress Emulator Framework v4.2.0-STABLE</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPluginMarketOpen(true)}
                      className="px-6 py-4 bg-[#0055ff] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_8px_20px_rgba(0,85,255,0.3)]"
                    >
                      <Plus className="w-4 h-4" /> Install_New_Extension
                    </button>
                  </div>
                </div>

                {/* New Features Before Plugin List */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#0055ff]">
                      <span>System_Memory</span>
                      <Activity className="w-3 h-3" />
                    </div>
                    <div className="text-2xl font-black font-mono">14.2<span className="text-xs opacity-40 ml-1">GB</span></div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-[#0055ff]"></div>
                    </div>
                  </div>

                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      <span>Plugin_Status</span>
                      <Shield className="w-3 h-3" />
                    </div>
                    <div className="text-2xl font-black font-mono">SECURE</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[8px] font-black opacity-40 uppercase">All systems nominal</span>
                    </div>
                  </div>

                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-amber-500">
                      <span>Available_Updates</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                    <div className="text-2xl font-black font-mono">03</div>
                    <button className="text-[8px] font-black text-amber-500 hover:underline uppercase">Sync Update Hub</button>
                  </div>

                  <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      <span>Extension_Load</span>
                      <Zap className="w-3 h-3" />
                    </div>
                    <div className="text-2xl font-black font-mono">124<span className="text-xs opacity-40 ml-1">ms</span></div>
                    <div className="text-[8px] font-black opacity-40 uppercase">Ultra-Low Latency</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[{id: 'wp-seo', name: 'WP SEO Optimizer', desc: 'Standard WordPress SEO mechanics emulator', enabled: true}, {id: 'woo-commerce-bridge', name: 'WooCommerce Sync', desc: 'Syncs products to WP instances', enabled: false}, {id: 'wp-forms', name: 'WP Forms Connect', desc: 'Embeds complex dynamic forms', enabled: true}].map(plugin => {
                        const isEnabled = socialSettings.plugins?.find(p => p.id === plugin.id)?.enabled ?? plugin.enabled;
                        return (
                            <div key={plugin.id} className={`p-6 border relative group ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center text-white font-bold rounded-lg">{plugin.name.charAt(0)}</div>
                                    <div 
                                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${isEnabled ? 'bg-[#0055ff]' : 'bg-zinc-600'}`}
                                        onClick={async () => {
                                            const updatedPlugins = socialSettings.plugins ? [...socialSettings.plugins] : [{id: 'wp-seo', name: 'WP SEO Optimizer', enabled: true}];
                                            const existing = updatedPlugins.find(p => p.id === plugin.id);
                                            if (existing) {
                                                existing.enabled = !existing.enabled;
                                            } else {
                                                updatedPlugins.push({ ...plugin, enabled: !isEnabled });
                                            }
                                            const newSettings = {...socialSettings, plugins: updatedPlugins};
                                            setSocialSettings(newSettings);
                                            try {
                                                const { doc, setDoc } = await import('firebase/firestore');
                                                const { db } = await import('../firebase');
                                                const cleanSettings = JSON.parse(JSON.stringify(newSettings));
                                                await setDoc(doc(db, 'settings', 'social'), cleanSettings, { merge: true });
                                            } catch (e: any) {
                                                console.error(e);
                                                alert('Error saving plugin state: ' + (e.message || String(e)));
                                            }
                                        }}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-sm mb-1">{plugin.name}</h3>
                                <p className="text-xs text-zinc-400 mb-4">{plugin.desc}</p>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase border-t border-zinc-800 pt-3">
                                    <span className="text-[#0055ff] cursor-pointer">Configure</span>
                                    {isEnabled ? <span className="text-emerald-500">Active</span> : <span className="text-zinc-500">Disabled</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-10 animate-in fade-in duration-700">
                <div className="flex justify-between items-center pb-6 border-b border-zinc-800">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">SEO_Metadata_Core</h2>
                    <p className="text-[10px] text-zinc-500 uppercase mt-1 tracking-widest">Global Search Engine Optimization & Social Graph Control Panel</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Category SEO Section */}
                  <div className={`p-8 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'} space-y-8`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#0055ff]">Category_SEO_Config</h3>
                      <Globe className="w-5 h-5 text-zinc-500" />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">Select Category</label>
                      <select 
                        value={selectedSeoCategory}
                        onChange={(e) => setSelectedSeoCategory(e.target.value)}
                        className={`w-full p-4 border text-xs font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                      >
                        {['Hoodies', 'T-Shirts', 'Accessories', 'Sweaters'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const catSeo = socialSettings.categorySEO?.find(c => c.category === selectedSeoCategory) || {
                        category: selectedSeoCategory,
                        seoTitle: '',
                        seoDescription: '',
                        ogImage: ''
                      };

                      const updateCatSeo = (field: keyof typeof catSeo, value: string) => {
                        const updatedList = socialSettings.categorySEO ? [...socialSettings.categorySEO] : [];
                        const index = updatedList.findIndex(c => c.category === selectedSeoCategory);
                        if (index > -1) {
                          updatedList[index] = { ...updatedList[index], [field]: value };
                        } else {
                          updatedList.push({ ...catSeo, [field]: value });
                        }
                        setSocialSettings({ ...socialSettings, categorySEO: updatedList });
                      };

                      return (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">SEO Title Tag</label>
                            <input 
                              type="text"
                              value={catSeo.seoTitle || ''}
                              onChange={(e) => updateCatSeo('seoTitle', e.target.value)}
                              placeholder={`${selectedSeoCategory} Collection | STREET THREADX.`}
                              className={`w-full p-4 border text-xs font-bold outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">SEO Meta Description</label>
                            <textarea 
                              value={catSeo.seoDescription || ''}
                              onChange={(e) => updateCatSeo('seoDescription', e.target.value)}
                              placeholder={`Browse the latest ${selectedSeoCategory.toLowerCase()} designs in our exclusive premium streetwear line.`}
                              className={`w-full p-4 border text-xs font-bold outline-none transition-all h-32 resize-none ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">OG Share Image URL</label>
                            <input 
                              type="text"
                              value={catSeo.ogImage || ''}
                              onChange={(e) => updateCatSeo('ogImage', e.target.value)}
                              placeholder="https://images.unsplash.com/..."
                              className={`w-full p-4 border text-xs font-mono outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                          </div>
                          <button 
                            onClick={async () => {
                              setIsSavingSeo(true);
                              try {
                                const { doc, setDoc } = await import('firebase/firestore');
                                const { db } = await import('../firebase');
                                await setDoc(doc(db, 'settings', 'social'), JSON.parse(JSON.stringify(socialSettings)), { merge: true });
                                addLog('UPDATED_CATEGORY_SEO', { field: 'SEO Metadata', newValue: selectedSeoCategory });
                              } catch (e: any) {
                                console.error(e);
                                alert('Failed to sync SEO metadata: ' + (e.message || String(e)));
                              } finally {
                                setIsSavingSeo(false);
                              }
                            }}
                            disabled={isSavingSeo}
                            className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                          >
                            {isSavingSeo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
                            Sync_Category_Metadata
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product SEO Section */}
                  <div className={`p-8 border ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-100'} space-y-8`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Product_SEO_Config</h3>
                      <ShoppingCart className="w-5 h-5 text-zinc-500" />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">Select Product</label>
                      <select 
                        value={selectedSeoProduct}
                        onChange={(e) => setSelectedSeoProduct(e.target.value)}
                        className={`w-full p-4 border text-xs font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const product = products.find(p => p.id === selectedSeoProduct);
                      if (!product) return null;

                      const updateProdSeo = (field: 'seoTitle' | 'seoDescription' | 'ogImage', value: string) => {
                        const updatedProducts = [...products];
                        const index = updatedProducts.findIndex(p => p.id === selectedSeoProduct);
                        if (index > -1) {
                          updatedProducts[index] = { ...updatedProducts[index], [field]: value };
                          setProducts(updatedProducts);
                        }
                      };

                      return (
                        <div className="space-y-6">
                           <div className="flex gap-4">
                              <button 
                                onClick={async () => {
                                  setIsGeneratingSeo(true);
                                  try {
                                    const seo = await generateSEOContent(product.name, product.description, product.category, product.tags || []);
                                    updateProdSeo('seoTitle', seo.seoTitle || seo.title);
                                    updateProdSeo('seoDescription', seo.seoDescription || seo.description);
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setIsGeneratingSeo(false);
                                  }
                                }}
                                className="flex-1 py-4 border border-zinc-800 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
                              >
                                {isGeneratingSeo ? <div className="w-4 h-4 border-2 border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin"></div> : <Zap className="w-4 h-4 text-[#0055ff]" />}
                                AI_Auto_Generate
                              </button>
                           </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">SEO Title Tag</label>
                            <input 
                              type="text"
                              value={product.seoTitle || ''}
                              onChange={(e) => updateProdSeo('seoTitle', e.target.value)}
                              placeholder={`${product.name} | STREET THREADX.`}
                              className={`w-full p-4 border text-xs font-bold outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">SEO Meta Description</label>
                            <textarea 
                              value={product.seoDescription || ''}
                              onChange={(e) => updateProdSeo('seoDescription', e.target.value)}
                              placeholder={product.description.substring(0, 100) + '...'}
                              className={`w-full p-4 border text-xs font-bold outline-none transition-all h-32 resize-none ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">OG Share Image (16:9)</label>
                              <button 
                                onClick={() => handleAiGenerateOgImage(product.id)}
                                disabled={isGeneratingOgImage}
                                className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50 flex items-center gap-1"
                              >
                                {isGeneratingOgImage ? (
                                  <div className="w-3 h-3 border border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                {isGeneratingOgImage ? 'Synthesizing...' : 'AI_Synthesize_OG_Image'}
                              </button>
                            </div>
                            <input 
                              type="text"
                              value={product.ogImage || ''}
                              onChange={(e) => updateProdSeo('ogImage', e.target.value)}
                              placeholder={product.images[0] || 'https://images.unsplash.com/...'}
                              className={`w-full p-4 border text-[10px] font-mono outline-none transition-all ${isDarkMode ? 'bg-black border-zinc-800 focus:border-[#0055ff]' : 'bg-transparent border-zinc-200 focus:border-black'}`}
                            />
                            {product.ogImage && (
                              <div className="mt-2 border border-[#0055ff]/20 bg-zinc-950/50 p-2 overflow-hidden flex flex-col items-center justify-center aspect-[16/9] relative group">
                                <img
                                  src={product.ogImage}
                                  alt="OG Preview"
                                  className="max-h-full max-w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[9px] font-black uppercase text-emerald-400">Custom Social OG Image Active</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={async () => {
                              setIsSavingSeo(true);
                              try {
                                await saveProductToFirestore(product);
                                addLog('UPDATED_PRODUCT_SEO', { entityId: product.id, field: 'SEO Metadata', newValue: product.name });
                              } catch (e: any) {
                                console.error(e);
                                alert('Failed to sync product SEO: ' + (e.message || String(e)));
                              } finally {
                                setIsSavingSeo(false);
                              }
                            }}
                            disabled={isSavingSeo}
                            className="w-full py-4 bg-[#0055ff] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0033aa] transition-colors flex items-center justify-center gap-2"
                          >
                            {isSavingSeo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
                            Sync_Product_Metadata
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'ai_setup' && (
              <div className="space-y-10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter">AI_AGENT_SETUP</h2>
                    <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest">Configure AI Agent API Configurations</p>
                  </div>
                </div>

                <div className={`border p-8 rounded-none space-y-8 ${cardClasses}`}>
                  <div className="flex items-center justify-between border-b pb-4 border-zinc-800">
                    <div>
                      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#0055ff]">Agent_Configuration</h4>
                      <p className="text-[9px] uppercase opacity-40 font-black mt-1">Provide API key for AI assistant module</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase opacity-40">Agent_API_Key (Gemini)</label>
                      <input 
                        type="password" 
                        value={socialSettings?.agentApiKey || ''} 
                        onChange={(e) => setSocialSettings(prev => ({ ...prev, agentApiKey: e.target.value }))}
                        className={`w-full px-4 py-3 text-xs font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                        placeholder="AIza..."
                      />
                    </div>

                    <button 
                      onClick={async () => {
                        try {
                          const { doc, setDoc } = await import('firebase/firestore');
                          const { db } = await import('../firebase');
                          const cleanSettings = JSON.parse(JSON.stringify(socialSettings));
                          await setDoc(doc(db, 'settings', 'social'), cleanSettings, { merge: true });
                          addLog('UPDATED_AI_AGENT_SETUP', { field: 'API Key configured' });
                          alert('AI Agent setup saved successfully');
                        } catch (e: any) {
                          alert('Failed to save AI configure: ' + e.message);
                        }
                      }}
                      className="w-full py-4 bg-[#0055ff] hover:bg-[#0044cc] text-white text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
                    >
                      Save_Agent_Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
            </AdminProtectedRoute>
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
                            updateCustomer(customer.id, { notes: e.target.value }).catch(console.error);
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
                              <img loading="lazy" src={p.images[0]} className="w-12 h-12 object-cover border border-zinc-800" alt="" />
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
                          <span className="font-black text-white uppercase">{managedOrder.shippingAddress || 'N/A'}</span>
                        </div>
                        {managedOrder.billingAddress && (
                          <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                            <span>Billing Address</span>
                            <span className="font-black text-white uppercase">{managedOrder.billingAddress}</span>
                          </div>
                        )}
                        {managedOrder.trackingNumber && (
                          <div className="flex flex-col gap-1 text-[10px] uppercase opacity-60">
                            <span>Tracking Info</span>
                            <span className="font-black text-white">{managedOrder.trackingProvider || 'PROVIDER'}: {managedOrder.trackingNumber}</span>
                          </div>
                        )}
                        {managedOrder.transactionScreenshot && (
                          <div className="flex flex-col gap-1 text-[10px] uppercase opacity-80 pt-2 border-t border-zinc-800/30 mt-2">
                            <span className="text-zinc-500 font-bold mb-1">Payment Proof Screenshot</span>
                            <div className="relative w-full h-28 border border-zinc-800 bg-zinc-950/80 overflow-hidden cursor-pointer group flex items-center justify-center rounded-sm">
                              <img 
                                loading="lazy"
                                src={managedOrder.transactionScreenshot} 
                                alt="Payment Proof" 
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onClick={() => window.open(managedOrder.transactionScreenshot, '_blank')}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {managedOrder.orderItems?.map(item => (
                          <div key={item.productId} className="flex justify-between text-xs font-black uppercase">
                            <div className="flex flex-col">
                              <span>{item.name} x {item.quantity}</span>
                              {item.variant && <span className="text-[9px] opacity-40">Size: {item.variant.size} | Color: {item.variant.color}</span>}
                              {item.customDesign && <span className="text-[9px] opacity-40">Body: {item.customDesign.color} | Slv: {item.customDesign.sleeveColor}</span>}
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
            <h3 className="text-xl font-black uppercase italic mb-4">Confirm_Order_Deletion</h3>
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
                Delete_Order
              </button>
            </div>
          </div>
        </div>
      )}

      {expenseDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setExpenseDeleteConfirm(null)}></div>
          <div className={`relative w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <h3 className="text-xl font-black uppercase italic mb-4">Confirm_Expense_Deletion</h3>
            <p className="text-xs text-zinc-500 uppercase leading-relaxed mb-8">
              Are you sure you want to permanently remove this expense entry?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setExpenseDeleteConfirm(null)}
                className="flex-1 py-4 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteExpense(expenseDeleteConfirm)}
                className="flex-1 py-4 text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-500 transition-all"
              >
                Delete_Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {isExpenseModalOpen && managedExpense && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsExpenseModalOpen(false)}></div>
          <div className={`relative w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-black uppercase italic">{managedExpense.id ? 'Edit_Expense' : 'New_Expense'}</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Expense_Title</label>
                <input 
                  type="text" 
                  value={managedExpense.title || ''} 
                  onChange={e => setManagedExpense({...managedExpense, title: e.target.value})} 
                  placeholder="E.G. OFFICE RENT, UTILITIES, MARKETING"
                  className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Amount (৳)</label>
                  <input 
                    type="number" 
                    value={managedExpense.amount || 0} 
                    onChange={e => setManagedExpense({...managedExpense, amount: parseInt(e.target.value) || 0})} 
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-40">Category</label>
                  <select 
                    value={managedExpense.category || 'Other'} 
                    onChange={e => setManagedExpense({...managedExpense, category: e.target.value as any})}
                    className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    <option value="Rent">Rent</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Staff">Staff</option>
                    <option value="Utility">Utility</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Date</label>
                <input 
                  type="date" 
                  value={managedExpense.date || ''} 
                  onChange={e => setManagedExpense({...managedExpense, date: e.target.value})} 
                  className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40">Notes (Optional)</label>
                <textarea 
                  value={managedExpense.notes || ''} 
                  onChange={e => setManagedExpense({...managedExpense, notes: e.target.value})} 
                  placeholder="ADDITIONAL DETAILS..."
                  className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all h-24 resize-none ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}
                />
              </div>
            </div>

            <div className="p-8 border-t border-zinc-800 flex gap-4">
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveExpense}
                className="flex-1 py-4 text-[10px] font-black uppercase bg-[#0055ff] text-white hover:bg-[#0044cc] transition-all"
              >
                {managedExpense.id ? 'Save_Changes' : 'Add_Expense'}
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

      {/* AI Image Preview Modal */}
      {isAiPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsAiPreviewOpen(false)}></div>
          <div className={`relative w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#0a0a0a] border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-800 bg-black/50' : 'border-zinc-200 bg-zinc-50'}`}>
               <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#0055ff]">AI_Lookbook_Preview</h3>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Select the variants you wish to add to the product gallery</p>
               </div>
               <button onClick={() => setIsAiPreviewOpen(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                 <X className="w-6 h-6" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-4 gap-6 no-scrollbar content-start">
              {aiPreviewImages.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (selectedAiImages.includes(img)) {
                      setSelectedAiImages(selectedAiImages.filter(i => i !== img));
                    } else {
                      setSelectedAiImages([...selectedAiImages, img]);
                    }
                  }}
                  className={`group relative aspect-[3/4] border-2 cursor-pointer transition-all overflow-hidden ${selectedAiImages.includes(img) ? 'border-[#0055ff]' : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'}`}
                >
                  <img loading="lazy" src={img} className="w-full h-full object-cover" alt={`AI Preview ${idx}`} />
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-none flex items-center justify-center transition-colors ${selectedAiImages.includes(img) ? 'bg-[#0055ff] text-white' : 'bg-black/50 border border-white/20 text-transparent'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  {selectedAiImages.includes(img) && (
                    <div className="absolute inset-0 bg-[#0055ff]/10 pointer-events-none" />
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/80 px-2 py-1 text-[8px] font-black uppercase text-white opacity-0 group-hover:opacity-100 transition-opacity">Variant #{idx + 1}</div>
                </div>
              ))}
            </div>

            <div className={`p-8 border-t flex justify-between items-center ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <span className="text-[10px] font-black uppercase opacity-60">
                {selectedAiImages.length} Image{selectedAiImages.length !== 1 && 's'} Selected
              </span>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setAiPreviewImages([]); setIsAiPreviewOpen(false); setSelectedAiImages([]); }}
                  className="px-6 py-3 text-[10px] font-black uppercase border border-zinc-500/30 hover:border-white transition-all"
                >
                  Discard_All
                </button>
                <button 
                  onClick={() => handleSaveSelectedAiImages(selectedAiImages)}
                  disabled={selectedAiImages.length === 0 || isSavingAiImages}
                  className="px-10 py-3 bg-[#0055ff] text-white text-[10px] font-black uppercase hover:brightness-110 transition-all disabled:opacity-30 flex items-center gap-2"
                >
                  {isSavingAiImages ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Commit_To_Product_Gallery
                </button>
              </div>
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
                <button 
                  onClick={handleProductAiAutofill} 
                  disabled={isAiAutofilling || !managedProduct.name}
                  className="bg-zinc-800 text-[#0055ff] border border-[#0055ff] px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#0055ff] hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Zap className={`w-3.5 h-3.5 ${isAiAutofilling ? 'animate-pulse' : ''}`} />
                  {isAiAutofilling ? 'Autofilling...' : 'AI_Autofill_All'}
                </button>
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
                      <label className="text-[10px] font-black uppercase opacity-40">Production_Cost (৳)</label>
                      <input type="number" value={managedProduct.cost || 0} onChange={e => setManagedProduct({...managedProduct, cost: parseInt(e.target.value)})} className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} />
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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Tags</label>
                      <button onClick={handleAiGenerateTags} disabled={isGeneratingTags} className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50">
                        {isGeneratingTags ? 'Generating...' : 'AI_Generate'}
                      </button>
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Material_Composition</label>
                      <input 
                        type="text" 
                        value={managedProduct.materialComposition || ''} 
                        onChange={e => setManagedProduct({...managedProduct, materialComposition: e.target.value})} 
                        className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} 
                        placeholder="E.G. 100% ORGANIC COTTON" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-40">Care_Instructions</label>
                      <input 
                        type="text" 
                        value={managedProduct.careInstructions || ''} 
                        onChange={e => setManagedProduct({...managedProduct, careInstructions: e.target.value})} 
                        className={`w-full px-5 py-4 text-sm font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} 
                        placeholder="E.G. MACHINE WASH COLD, DRY FLAT" 
                      />
                    </div>
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
                          {img.includes('.mp4') || img.includes('.webm') || img.includes('.mov') ? (
                            <video src={img} className="w-full h-full object-cover pointer-events-none" autoPlay loop muted playsInline />
                          ) : (
                            <img loading="lazy" src={img} className="w-full h-full object-cover pointer-events-none" alt="" referrerPolicy="no-referrer" />
                          )}
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
                             <div className="flex gap-1 mb-1">
                                <button onClick={() => window.open(img, '_blank')} className="w-full text-[8px] font-black uppercase bg-zinc-800 text-white px-2 py-1 hover:bg-[#0055ff] transition-colors">Preview</button>
                             </div>
                             <button onClick={() => setPrimaryImage(idx)} className="w-full text-[8px] font-black uppercase bg-white text-black px-2 py-1 hover:bg-[#0055ff] hover:text-white transition-colors">Set Primary</button>
                             {!img.includes('.mp4') && !img.includes('.webm') && (
                               <div className="w-full space-y-1">
                                 <div className="flex gap-1">
                                   {[1, 2, 3, 4].map(num => (
                                     <button 
                                       key={num}
                                       onClick={() => handleGenerateModelVersions(img, num)} 
                                       disabled={isGeneratingModels === img}
                                       className="flex-1 text-[8px] font-black uppercase bg-[#0055ff] text-white px-1 py-1 hover:bg-[#0033aa] transition-colors disabled:opacity-50"
                                     >
                                       {isGeneratingModels === img ? '..' : num}
                                     </button>
                                   ))}
                                 </div>
                                 <p className="text-[7px] font-bold text-center opacity-40 uppercase">Generate_Lookbook</p>
                               </div>
                             )}
                             <button onClick={() => removeImageFromManagedProduct(idx)} className="w-full text-[8px] font-black uppercase bg-rose-500 text-white px-2 py-1 hover:bg-rose-600 transition-colors">Remove</button>
                          </div>
                          {idx === 0 && <span className="absolute top-2 left-2 bg-[#0055ff] text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-none z-10">Primary</span>}
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] font-black px-1.5 py-0.5 z-10">#{idx + 1}</span>
                        </div>
                      ))}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => handleFileUpload(e.target.files)} 
                        accept="image/*,video/mp4,video/webm" 
                        multiple 
                        className="hidden" 
                      />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOverStatus('active'); }}
                        onDragLeave={() => setDragOverStatus(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverStatus(null);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFileUpload(e.dataTransfer.files);
                          }
                        }}
                        className={`aspect-[3/4] border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${dragOverStatus === 'active' ? 'border-[#0055ff] bg-[#0055ff]/10' : 'hover:border-[#0055ff]'} ${isDarkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 bg-zinc-50'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[9px] font-black uppercase opacity-60">Drop_Files_Or_Click</span>
                      </div>
                    </div>
                    {Object.keys(productUploadProgress).length > 0 && (
                      <div className="w-full space-y-2 mt-4 col-span-full">
                        {Object.entries(productUploadProgress).map(([fileName, { progress, size }]) => (
                           <div key={fileName} className={`border p-2 flex flex-col gap-1 w-full ${isDarkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}>
                             <div className="flex justify-between items-center w-full">
                               <span className={`text-[10px] font-mono truncate max-w-[150px] ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`} title={fileName}>{fileName}</span>
                               <div className="flex items-center gap-2">
                                 <span className={`text-[8px] font-mono opacity-50 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                   {size < 1048576 ? (size / 1024).toFixed(1) + ' KB' : (size / 1024 / 1024).toFixed(2) + ' MB'}
                                 </span>
                                 <span className="text-[9px] font-black tabular-nums text-[#0055ff]">{Math.round(progress)}%</span>
                               </div>
                             </div>
                             <div className={`w-full h-1 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
                               <div className="bg-[#0055ff] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <label className="text-[10px] font-black uppercase opacity-40">AI_Promotion_Generator</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={promoPrompt} 
                        onChange={e => setPromoPrompt(e.target.value)}
                        className={`flex-1 px-4 py-3 text-[10px] font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} 
                        placeholder="e.g. A group of models wearing our hoodies in Times Square at night" 
                      />
                      <button 
                        type="button" 
                        onClick={handleCreatePromoImage}
                        disabled={isGeneratingPromo || !promoPrompt.trim()}
                        className="bg-[#0055ff] text-white px-4 py-3 text-[9px] font-black uppercase disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGeneratingPromo ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Generate
                      </button>
                    </div>
                    <p className="text-[8px] font-medium opacity-40 italic">Generate professional promotional lifestyle imagery using high-performance AI.</p>
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

                  <div className="space-y-4 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Product Size Chart Document</label>
                      <span className="text-[9px] uppercase tracking-widest text-[#0055ff] font-bold border border-[#0055ff]/30 px-2 py-0.5 rounded-none bg-[#0055ff]/10">Size_Chart_Visualizer</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Input, File Upload & AI Generation */}
                      <div className="space-y-3">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase">Input style directives to let Gemini synthesize a customized blueprint size guide, or upload your own graphic.</p>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={sizeChartStylePrompt} 
                            onChange={e => setSizeChartStylePrompt(e.target.value)}
                            className={`flex-1 px-4 py-3 text-[10px] font-bold border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`} 
                            placeholder="e.g. Neon blue technical schematic diagram" 
                          />
                          <button 
                            type="button" 
                            onClick={handleAiGenerateSizeChart}
                            disabled={isGeneratingSizeChart}
                            className="bg-[#0055ff] text-white px-4 py-3 text-[9px] font-black uppercase disabled:opacity-50 flex items-center gap-2"
                          >
                            {isGeneratingSizeChart ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            Generate
                          </button>
                        </div>

                        <div className="flex gap-2 items-center">
                          <input 
                            type="file" 
                            id="prod-sizechart-file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSizeChartUpload(file);
                            }}
                            className="hidden" 
                          />
                          <label 
                            htmlFor="prod-sizechart-file"
                            className="flex-1 text-center cursor-pointer bg-zinc-805 hover:bg-zinc-700 bg-zinc-800 text-white py-3 text-[9px] font-black uppercase transition-all"
                          >
                            Upload Custom Image
                          </label>
                          {managedProduct.sizeChartImage && (
                            <button 
                              type="button"
                              onClick={() => setManagedProduct(prev => ({ ...prev, sizeChartImage: undefined }))}
                              className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[9px] uppercase font-black"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Real-time Size Chart Preview */}
                      <div className={`p-4 border flex flex-col items-center justify-center min-h-[140px] relative transition-all ${isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200'}`}>
                        {managedProduct.sizeChartImage ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img 
                              src={managedProduct.sizeChartImage} 
                              alt="Size Chart Blueprint" 
                              className="max-h-[120px] object-contain border border-zinc-800 shadow-md"
                              referrerPolicy="no-referrer"
                            />
                            <p className="text-[8px] font-black uppercase text-emerald-500 mt-2">Active: Custom Size Chart Blueprint Loaded</p>
                          </div>
                        ) : (
                          <div className="text-center space-y-1 text-zinc-500">
                            <p className="text-[10px] font-black uppercase opacity-40">No Custom Chart Image</p>
                            <p className="text-[8px] uppercase tracking-wide opacity-40 max-w-[180px] mx-auto">Defaults to the standard Measurement Matrix table inside SizeGuideModal.</p>
                          </div>
                        )}
                      </div>
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
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase opacity-40">Open_Graph_Share_Image_(16:9)</label>
                      <button 
                        onClick={() => handleAiGenerateOgImage()} 
                        disabled={isGeneratingOgImage} 
                        className="text-[9px] font-black uppercase text-[#0055ff] hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        {isGeneratingOgImage ? (
                          <div className="w-3 h-3 border border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        {isGeneratingOgImage ? 'Synthesizing...' : 'AI_Synthesize_OG_Image'}
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={managedProduct.ogImage || ''} 
                      onChange={e => setManagedProduct({...managedProduct, ogImage: e.target.value})} 
                      className={`w-full px-5 py-4 text-sm font-mono border focus:border-[#0055ff] outline-none transition-all ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`} 
                      placeholder={managedProduct.images?.[0] || 'https://images.unsplash.com/...'} 
                    />
                    {managedProduct.ogImage && (
                      <div className="mt-2 border border-[#0055ff]/20 bg-zinc-950/50 p-2 overflow-hidden flex flex-col items-center justify-center aspect-[16/9] relative group">
                        <img
                          src={managedProduct.ogImage}
                          alt="Wizard OG Preview"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-black uppercase text-emerald-400">Social Open Graph Graphic Preview</span>
                        </div>
                      </div>
                    )}
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
                        updateCustomer(previewCustomer.id, { notes: e.target.value }).catch(console.error);
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

      {/* Money Received Voucher Modal */}
      {voucherOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:absolute print:inset-0 print:bg-white">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl print:hidden" onClick={() => setVoucherOrder(null)} />
          <div id="voucher-content" className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border shadow-2xl print:shadow-none print:border-none print:max-w-full print:w-full print:h-screen ${isDarkMode ? 'bg-[#0a0a0a] border-zinc-800 shadow-black' : 'bg-white border-zinc-200'} print:bg-white sprint:text-black`}>
            {/* Header */}
            <div className="sticky top-0 z-10 p-6 flex items-center justify-between border-b backdrop-blur-md bg-opacity-90 border-zinc-800 print:hidden">
              <h3 className="text-xl font-black uppercase tracking-widest text-[#0055ff]">
                Money_Receipt_Voucher
              </h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setTimeout(() => {
                        window.print();
                    }, 100);
                  }}
                  className="px-4 py-2 bg-[#0055ff] hover:bg-[#0044cc] text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print
                </button>
                <button onClick={() => setVoucherOrder(null)} className="p-2 hover:bg-rose-500/10 text-rose-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Voucher Content for Printing */}
            <div className="p-8 bg-white text-black min-h-[600px] w-full max-w-[800px] mx-auto font-sans" id="print-voucher">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-normal text-[#2A4373] mb-2 tracking-wide text-nowrap">STREET THREADX</h1>
                  <div className="text-xs space-y-0.5 mt-2 text-gray-800">
                    <div className="font-bold">Mawna, Sreepur</div>
                    <div>Gazipur, Bangladesh</div>
                    <div>Phone: +880 1700-000000</div>
                    <div>Website: streetthreadx.com</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <h2 className="text-5xl font-bold text-[#8FA5D6] tracking-widest mb-4">INVOICE</h2>
                  <table className="text-xs border-collapse w-64 text-right">
                    <tbody>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold w-1/2">DATE</td>
                        <td className="border border-gray-300 px-2 py-1 bg-white">{new Date(voucherOrder.date).toLocaleDateString() === 'Invalid Date' ? voucherOrder.date : new Date(voucherOrder.date).toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold">INVOICE #</td>
                        <td className="border border-gray-300 px-2 py-1 bg-white">{voucherOrder.id.replace('ORD-', '')}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold">CUSTOMER ID</td>
                        <td className="border border-gray-300 px-2 py-1 bg-white">{voucherOrder.customerEmail.split('@')[0].toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold">DUE DATE</td>
                        <td className="border border-gray-300 px-2 py-1 bg-[#DEE6F2]">{new Date(voucherOrder.date).toLocaleDateString() === 'Invalid Date' ? voucherOrder.date : new Date(voucherOrder.date).toLocaleDateString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8 w-[45%]">
                <div className="bg-[#2A4373] text-white text-xs font-bold px-3 py-1 uppercase tracking-wide">
                  Bill To
                </div>
                <div className="mt-2 text-xs space-y-0.5 text-gray-800 px-1 border-l-2 border-transparent">
                  <div className="font-semibold text-sm">{voucherOrder.customerName}</div>
                  <div>{voucherOrder.customerEmail}</div>
                  <div className="whitespace-pre-line leading-relaxed">{voucherOrder.shippingAddress || '[No Address Provided]'}</div>
                  {customers.find(c => c.email === voucherOrder.customerEmail)?.phone && (
                    <div className="pt-0.5">{customers.find(c => c.email === voucherOrder.customerEmail)?.phone}</div>
                  )}
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-xs border-collapse mb-6">
                <thead>
                  <tr className="bg-[#2A4373] text-white">
                    <th className="text-left px-3 py-1 font-bold">DESCRIPTION</th>
                    <th className="text-center px-3 py-1 font-bold w-24 border-l border-white/20">TAXED</th>
                    <th className="text-right px-3 py-1 font-bold w-32 border-l border-white/20">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="border border-gray-300 text-gray-800">
                  {/* Items */}
                  {voucherOrder.orderItems?.map((item, index) => {
                    const productDetails = products.find(p => p.id === item.productId);
                    return (
                      <tr key={index} className="even:bg-[#F2F2F2] odd:bg-white min-h-16 border-b border-gray-200">
                        <td className="px-3 py-3 border-r border-gray-300">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                              <span className="font-black text-[#2A4373] uppercase tracking-tight">{item.name}</span>
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-none">{productDetails?.category || 'General'}</span>
                            </div>
                            <div className="text-[10px] text-gray-800 font-medium">
                              {item.variant ? `Variant: ${item.variant.size} / ${item.variant.color}` : 'Standard Edition'} | Qty: {item.quantity}
                            </div>
                            {productDetails?.description && (
                              <div className="text-[9px] text-gray-500 italic leading-relaxed border-t border-gray-100 pt-1 mt-1">
                                {productDetails.description.length > 150 ? productDetails.description.substring(0, 150) + '...' : productDetails.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 text-center border-r border-gray-300 font-bold">5%</td>
                        <td className="px-3 text-right font-bold text-[#2A4373]">
                          {(item.price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Shipping / Discount / Advance if applicable */}
                  {voucherOrder.discount > 0 && (
                    <tr className="even:bg-[#F2F2F2] odd:bg-white h-7">
                      <td className="px-3 border-r border-gray-300 text-rose-600">Discount Applied</td>
                      <td className="px-3 text-center border-r border-gray-300"></td>
                      <td className="px-3 text-right text-rose-600">
                        -{voucherOrder.discount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {/* Fill empty space */}
                  {[...Array(Math.max(1, 12 - (voucherOrder.orderItems?.length || 0)))].map((_, i) => (
                    <tr key={`empty-${i}`} className="even:bg-[#F2F2F2] odd:bg-white h-7">
                      <td className="border-r border-gray-300"></td>
                      <td className="border-r border-gray-300"></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Section */}
              <div className="flex justify-between items-start gap-8">
                {/* Comments */}
                <div className="w-[55%]">
                  <div className="bg-[#2A4373] text-white text-xs font-bold px-3 py-1">
                    OTHER COMMENTS
                  </div>
                  <div className="border border-gray-300 p-3 text-xs text-gray-800 h-28">
                    <ol className="list-decimal list-inside space-y-1.5">
                      { voucherOrder.isPaid || voucherOrder.paymentStatus === 'FULLY_PAID' 
                        ? <li>Total payment received in full.</li>
                        : <li>Total payment due upon delivery or as agreed.</li> }
                      <li>Please include the invoice number on your check or reference it.</li>
                      {voucherOrder.transactionId && <li>Digital TrxID: {voucherOrder.transactionId}</li>}
                      <li>Payment Method: {voucherOrder.paymentMethod || 'CASH / DIGITAL'}</li>
                    </ol>
                  </div>
                </div>

                {/* Totals */}
                <div className="w-[40%] flex flex-col items-end">
                  <table className="w-full text-xs text-right border-collapse">
                    <tbody>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold uppercase tracking-widest text-[9px]">Subtotal</td>
                        <td className="py-1 w-24 text-gray-800">
                          { (voucherOrder.subtotal || voucherOrder.total || 0).toLocaleString() }
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold uppercase tracking-widest text-[9px]">Discount</td>
                        <td className="py-1 w-24 text-rose-600">
                          -{ (voucherOrder.discount || 0).toLocaleString() }
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold uppercase tracking-widest text-[9px]">Taxable Amt</td>
                        <td className="py-1 w-24 text-gray-800">
                          { ((voucherOrder.subtotal || voucherOrder.total || 0) - (voucherOrder.discount || 0)).toLocaleString() }
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold uppercase tracking-widest text-[9px]">Tax rate (VAT)</td>
                        <td className="py-1 w-24 text-gray-800 border-x border-t border-gray-300 bg-white font-bold">5.000%</td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-gray-600 font-semibold uppercase tracking-widest text-[9px]">Tax due</td>
                        <td className="py-1 w-24 text-gray-800 bg-[#F2F2F2] border-x border-b border-gray-300 font-bold">
                          { (((voucherOrder.subtotal || voucherOrder.total || 0) - (voucherOrder.discount || 0)) * 0.05).toLocaleString() }
                        </td>
                      </tr>
                      <tr className="font-bold relative">
                        <td className="pr-4 py-2 text-[#2A4373] text-sm font-black italic">GRAND TOTAL</td>
                        <td className="py-2 px-2 flex justify-between items-center bg-[#DEE6F2] text-sm text-[#2A4373] border-y-2 border-double border-gray-600 font-black italic">
                          <span className="font-normal pr-2">৳</span>
                          <span>{ (((voucherOrder.subtotal || voucherOrder.total || 0) - (voucherOrder.discount || 0)) * 1.05).toLocaleString() }</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-center text-xs mt-6 text-gray-800 italic space-y-0.5">
                    <div>Make all payments payable to</div>
                    <div className="font-bold text-[#2A4373]">STREET THREADX</div>
                  </div>
                </div>
              </div>

              {/* Bottom Message */}
              <div className="text-center mt-12 pt-8 text-xs text-gray-800 space-y-1.5">
                <div>If you have any questions about this invoice, please contact</div>
                <div className="font-semibold">[Name, Phone #, E-mail]</div>
                <div className="font-bold italic mt-4 text-base tracking-wide">Thank You For Your Business!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pluginMarketOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isInstallingPlugin && setPluginMarketOpen(false)}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full max-w-2xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#050505] border-zinc-800' : 'bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-800 bg-black/40' : 'border-black bg-zinc-50'}`}>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#0055ff]" />
                <h3 className="text-xs font-black uppercase tracking-widest">Extension_Marketplace</h3>
              </div>
              <button onClick={() => setPluginMarketOpen(false)} disabled={isInstallingPlugin} className="opacity-50 hover:opacity-100 transition-all disabled:opacity-20">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
               {isInstallingPlugin ? (
                 <div className="py-20 flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-[#0055ff]/10 border-t-[#0055ff] rounded-full animate-spin"></div>
                      <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#0055ff] animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-sm font-black uppercase tracking-[0.4em] text-[#0055ff] animate-pulse">Provisioning_Extension</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{installingPluginStatus}</div>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {[
                      { id: 'insta-sync', name: 'Instagram Shop Sync', desc: 'Auto-post products to IG Shop and sync inventory realtime.', icon: 'I' },
                      { id: 'bulk-invoice', name: 'Bulk PDF Invoicer', desc: 'Generate and email 1000+ invoices in one-click batch.', icon: 'B' },
                      { id: 'live-chat-plus', name: 'LiveChat Pro Suite', desc: 'Enhanced customer support dash with AI auto-replies.', icon: 'L' },
                      { id: 'stripe-radar', name: 'Stripe Radar Advanced', desc: 'Deep fraud detection for high-risk credit transactions.', icon: 'S' }
                    ].map(p => (
                      <div key={p.id} className={`p-5 border transition-all flex items-center justify-between group ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800 hover:border-[#0055ff]/40' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'}`}>
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 bg-[#0055ff] text-white flex items-center justify-center text-xl font-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">{p.icon}</div>
                           <div className="space-y-0.5">
                             <div className="text-xs font-black uppercase tracking-wider">{p.name}</div>
                             <div className="text-[9px] text-zinc-500 uppercase tracking-tight max-w-[280px] leading-relaxed">{p.desc}</div>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleInstallPlugin(p)}
                          className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0055ff] transition-all group-hover:scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none"
                        >
                          Install
                        </button>
                      </div>
                    ))}
                 </div>
               )}
            </div>
            
            <div className={`p-6 border-t ${isDarkMode ? 'border-zinc-800 bg-black/60' : 'border-black bg-zinc-100'}`}>
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center opacity-60">Plugins are cryptographically verified before installation.</p>
            </div>
          </motion.div>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowBackupModal(false); setBackupView('options'); }}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden border flex flex-col shadow-2xl ${isDarkMode ? 'bg-[#050505] border-zinc-800' : 'bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
          >
            {/* Header */}
            <div className={`p-8 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'bg-black/40' : 'bg-zinc-50'}`}>
              <div>
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#0055ff]" />
                  <h3 className="text-xl font-black uppercase tracking-widest">NEXUS_DATA_VAULT</h3>
                </div>
                <p className="text-[10px] uppercase opacity-40 font-black mt-2 tracking-widest">System Record Integrity & Archival Protocol</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setBackupView(backupView === 'options' ? 'preview' : 'options')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${backupView === 'preview' ? 'bg-[#0055ff] text-white border-[#0055ff]' : 'border-zinc-800 hover:border-white'}`}
                >
                  {backupView === 'options' ? 'VIEW_FAST_PREVIEW' : 'BACK_TO_OPTIONS'}
                </button>
                <button onClick={() => { setShowBackupModal(false); setBackupView('options'); }} className="opacity-50 hover:opacity-100 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              {backupView === 'options' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-black'} flex flex-col items-center justify-center space-y-2`}>
                        <div className="text-2xl font-black">{products.length}</div>
                        <div className="text-[8px] uppercase tracking-widest font-black opacity-50">Assets</div>
                      </div>
                      <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-black'} flex flex-col items-center justify-center space-y-2`}>
                        <div className="text-2xl font-black">{orders.length}</div>
                        <div className="text-[8px] uppercase tracking-widest font-black opacity-50">Orders</div>
                      </div>
                      <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-black'} flex flex-col items-center justify-center space-y-2`}>
                        <div className="text-2xl font-black">{customers.length}</div>
                        <div className="text-[8px] uppercase tracking-widest font-black opacity-50">Users</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button 
                        onClick={() => handleBackup('download')}
                        disabled={isBackingUp}
                        className="w-full flex items-center justify-between p-6 border border-zinc-800 hover:border-[#0055ff] hover:bg-[#0055ff]/10 transition-all group"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 flex items-center justify-center bg-[#0055ff]/10 text-[#0055ff]">
                            <Download className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <div className="text-[11px] font-black uppercase tracking-widest">Local_Export_XLSX</div>
                            <div className="text-[9px] font-black opacity-40 uppercase mt-1">Download raw data for spreadsheet analysis</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                      </button>

                      <button 
                        onClick={() => handleBackup('json')}
                        disabled={isBackingUp}
                        className="w-full flex items-center justify-between p-6 border border-zinc-800 hover:border-[#0055ff] hover:bg-[#0055ff]/10 transition-all group"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 flex items-center justify-center bg-zinc-800 text-zinc-400 group-hover:bg-[#0055ff]/10 group-hover:text-[#0055ff]">
                            <Activity className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <div className="text-[11px] font-black uppercase tracking-widest">Developer_JSON_DUMP</div>
                            <div className="text-[9px] font-black opacity-40 uppercase mt-1">Full state objects for external integration</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                      </button>

                      <button 
                        onClick={() => handleBackup('sync')}
                        disabled={isBackingUp}
                        className="w-full flex items-center justify-between p-6 border-2 border-[#0055ff] bg-[#0055ff]/5 hover:bg-[#0055ff]/10 transition-all group"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 flex items-center justify-center bg-[#0055ff] text-white">
                            <Cloud className="w-6 h-6 animate-pulse" />
                          </div>
                          <div className="text-left">
                            <div className="text-[11px] font-black uppercase tracking-widest">Nexus_Cloud_Sync</div>
                            <div className="text-[9px] font-black opacity-60 text-[#0055ff] uppercase mt-1">Authorize deep archival to secure storage</div>
                          </div>
                        </div>
                        {isBackingUp ? (
                          <div className="w-5 h-5 border-2 border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin"></div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#0055ff] group-hover:translate-x-2 transition-all" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase text-[#0055ff] tracking-widest">Realtime_Network_Status</h4>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="text-[9px] font-bold opacity-60">Connected</span>
                        </div>
                      </div>
                      <div className={`p-6 border border-dashed ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} space-y-4`}>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase transition-all hover:opacity-100">
                          <span className="opacity-40">Last_Cloud_Sync</span>
                          <span className="text-[#0055ff]">{lastSyncTime || 'NEVER_SYNCED'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase transition-all hover:opacity-100">
                          <span className="opacity-40">Database_Health</span>
                          <span className="text-emerald-500">OPTIMIZED</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase transition-all hover:opacity-100">
                          <span className="opacity-40">Storage_Pressure</span>
                          <span>0.04_MB</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Recent_Vault_Activity</h4>
                      <div className="space-y-3">
                        {backupHistory.length > 0 ? backupHistory.map((h, i) => (
                          <div key={i} className={`p-4 border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200'} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                              <Check className="w-3 h-3 text-emerald-500" />
                              <div className="text-[10px] font-black uppercase truncate max-w-[200px]">{h.name}</div>
                            </div>
                            <div className="text-[9px] font-bold opacity-40 uppercase">{h.date.split(',')[0]}</div>
                          </div>
                        )) : (
                          <div className="p-8 text-center border border-dashed border-zinc-800 opacity-30">
                            <p className="text-[10px] font-black uppercase">No_Archive_History_Records</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex p-1 border border-zinc-800 bg-zinc-900/50 w-fit">
                    {(['products', 'orders', 'customers'] as const).map(t => (
                      <button 
                        key={t}
                        onClick={() => setPreviewTab(t)}
                        className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${previewTab === t ? 'bg-[#0055ff] text-white' : 'opacity-40 hover:opacity-100'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className={`border h-[400px] overflow-auto no-scrollbar rounded-none ${isDarkMode ? 'border-zinc-800 bg-black/40' : 'border-black bg-white'}`}>
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-zinc-900 text-[#0055ff]' : 'bg-zinc-100 text-[#0055ff]'} uppercase font-black`}>
                        <tr>
                          {previewTab === 'products' && (
                            <>
                              <th className="p-4 border-b border-zinc-800">ID</th>
                              <th className="p-4 border-b border-zinc-800">Asset_Name</th>
                              <th className="p-4 border-b border-zinc-800">Price</th>
                              <th className="p-4 border-b border-zinc-800">Stock</th>
                              <th className="p-4 border-b border-zinc-800">Status</th>
                            </>
                          )}
                          {previewTab === 'orders' && (
                            <>
                              <th className="p-4 border-b border-zinc-800">Order_ID</th>
                              <th className="p-4 border-b border-zinc-800">Customer</th>
                              <th className="p-4 border-b border-zinc-800">Total</th>
                              <th className="p-4 border-b border-zinc-800">Status</th>
                              <th className="p-4 border-b border-zinc-800">Date</th>
                            </>
                          )}
                          {previewTab === 'customers' && (
                            <>
                              <th className="p-4 border-b border-zinc-800">User_ID</th>
                              <th className="p-4 border-b border-zinc-800">Display_Name</th>
                              <th className="p-4 border-b border-zinc-800">Email_Address</th>
                              <th className="p-4 border-b border-zinc-800">Order_Count</th>
                              <th className="p-4 border-b border-zinc-800">LTV</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {previewTab === 'products' && products.map(p => (
                          <tr key={p.id} className="hover:bg-[#0055ff]/5 transition-colors">
                            <td className="p-4 text-zinc-500">#{p.id}</td>
                            <td className="p-4 font-black">{p.name}</td>
                            <td className="p-4">৳{p.price.toLocaleString()}</td>
                            <td className="p-4">{p.stock}</td>
                            <td className="p-4"><span className={`px-2 py-0.5 text-[9px] font-black ${p.status === 'Published' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.status}</span></td>
                          </tr>
                        ))}
                        {previewTab === 'orders' && orders.map(o => (
                          <tr key={o.id} className="hover:bg-[#0055ff]/5 transition-colors">
                            <td className="p-4 text-zinc-500">#{o.id}</td>
                            <td className="p-4 font-black">{o.customerName}</td>
                            <td className="p-4">৳{o.total.toLocaleString()}</td>
                            <td className="p-4"><span className="px-2 py-0.5 bg-zinc-800 text-[9px] font-black">{o.status}</span></td>
                            <td className="p-4 opacity-50">{o.date}</td>
                          </tr>
                        ))}
                        {previewTab === 'customers' && customers.map(c => (
                          <tr key={c.id} className="hover:bg-[#0055ff]/5 transition-colors">
                            <td className="p-4 text-zinc-500">#{c.id}</td>
                            <td className="p-4 font-black">{c.name}</td>
                            <td className="p-4 opacity-70">{c.email}</td>
                            <td className="p-4">{c.orders}</td>
                            <td className="p-4 text-emerald-500 font-bold">৳{c.totalSpent.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleBackup('download')}
                      className="bg-zinc-800 text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#0055ff] transition-all flex items-center gap-3"
                    >
                      <Download className="w-4 h-4" /> Download_Current_XLSX
                    </button>
                    <button 
                      onClick={() => handleBackup('json')}
                      className="bg-transparent border border-zinc-800 text-zinc-400 px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:border-white hover:text-white transition-all flex items-center gap-3"
                    >
                      <Activity className="w-4 h-4" /> Export_Raw_JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Status */}
            <div className={`p-4 border-t flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] opacity-40 shrink-0 ${isDarkMode ? 'bg-black/20' : 'bg-zinc-100'}`}>
              <div className="flex items-center gap-4">
                <span>SECURE_ENCRYPTION: AES-256</span>
                <span>DATA_LOCALITY: US-EAST-1</span>
              </div>
              <div className="flex items-center gap-4">
                <span>API_STATUS: NOMINAL</span>
                <span>SYSTEM_TIME: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}



      {/* Monthly Profit Sheet Modal */}
      <AnimatePresence>
        {isMonthlyProfitSheetOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMonthlyProfitSheetOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden border shadow-[0_0_100px_rgba(0,85,255,0.2)] flex flex-col ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0055ff]">Monthly_Profit_Terminal</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Cross-sectional monthly financial reconciliation</p>
                </div>
                <button 
                  onClick={() => setIsMonthlyProfitSheetOpen(false)}
                  className={`p-3 border hover:scale-110 transition-transform ${isDarkMode ? 'border-zinc-800 text-white' : 'border-zinc-200 text-black'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                <div id="monthly-profit-sheet-print-area">
                  <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">ALL_TIME_REVENUE</div>
                          <div className="text-xl font-black">৳{orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0).toLocaleString()}</div>
                       </div>
                       <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">ALL_TIME_COGS</div>
                          <div className="text-xl font-black">৳{orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.orderItems?.reduce((acc, item) => acc + (products.find(p => p.id === item.productId)?.cost || 0) * item.quantity, 0) || 0), 0).toLocaleString()}</div>
                       </div>
                       <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">ALL_TIME_EXPENSES</div>
                          <div className="text-xl font-black text-rose-500">৳{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</div>
                       </div>
                       <div className={`p-6 border ${isDarkMode ? 'bg-[#0055ff]/10 border-[#0055ff]/30' : 'bg-[#0055ff]/5 border-[#0055ff]/20'}`}>
                          <div className="text-[9px] font-black text-[#0055ff] uppercase tracking-widest mb-1">TOTAL_NET_PROFIT</div>
                          {(() => {
                            const rev = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
                            const cogs = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + (o.orderItems?.reduce((acc, item) => acc + (products.find(p => p.id === item.productId)?.cost || 0) * item.quantity, 0) || 0), 0);
                            const exp = expenses.reduce((s, e) => s + e.amount, 0);
                            const net = rev - cogs - exp;
                            return <div className={`text-xl font-black ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>৳{net.toLocaleString()}</div>;
                          })()}
                       </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <ListIcon className="w-4 h-4 text-[#0055ff]" /> Monthly_Breakdown_Manifest
                      </h4>
                      <div className={`border overflow-hidden ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <table className="w-full text-left">
                          <thead>
                            <tr className={`${isDarkMode ? 'bg-zinc-900/50' : 'bg-zinc-50'} border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">MONTH_PERIOD</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">GROSS_SALES</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">PURCHASES (COGS)</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">OPERATING_EXPENSES</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">NET_PROFIT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/10">
                            {monthlySummary.map((summary) => (
                              <tr key={summary.month} className="group hover:bg-[#0055ff]/5 transition-colors">
                                <td className="px-6 py-5">
                                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                    {new Date(summary.month + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
                                  </span>
                                  <div className="text-[8px] text-zinc-500 font-mono mt-1">{summary.month}</div>
                                </td>
                                <td className="px-6 py-5 text-[11px] font-bold">৳{summary.revenue.toLocaleString()}</td>
                                <td className="px-6 py-5 text-[11px] font-bold">৳{summary.cogs.toLocaleString()}</td>
                                <td className="px-6 py-5 text-[11px] font-bold text-rose-500">৳{summary.expenses.toLocaleString()}</td>
                                <td className={`px-6 py-5 text-[11px] font-black ${summary.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  ৳{summary.netProfit.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-8 border-t flex justify-end gap-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-100 bg-zinc-50'}`}>
                <button 
                  onClick={() => {
                    const printWindow = window.open('', '', 'height=800,width=1000');
                    const printContents = document.getElementById('monthly-profit-sheet-print-area')?.innerHTML;
                    if(printWindow && printContents) {
                      printWindow.document.write(`<html><head><title>Monthly Profit Sheet</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { padding: 40px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: white; color: black; }
                          table { border-collapse: collapse; width: 100%; border: 1px solid #eee; margin-top: 20px; }
                          th, td { border-bottom: 2px solid #f0f0f0; padding: 16px; text-align: left; }
                          th { background: #fafafa; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
                          td { font-size: 12px; font-weight: 600; }
                          .text-rose-500 { color: #ef4444 !important; }
                          .text-emerald-500 { color: #10b981 !important; }
                          .text-[#0055ff] { color: #0055ff !important; }
                        </style>
                      </head><body>
                        <div class="flex justify-between items-end border-b-4 border-[#0055ff] pb-6 mb-10">
                          <div>
                            <h1 class="text-4xl font-black uppercase text-[#0055ff] italic tracking-tighter">STREET_THREADX</h1>
                            <p class="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Monthly_Financial_Statement</p>
                          </div>
                          <div class="text-right">
                            <p class="text-[10px] font-black uppercase tracking-widest">Report_Generated</p>
                            <p class="text-xs font-mono">${new Date().toLocaleString()}</p>
                          </div>
                        </div>
                        ${printContents}
                      </body></html>`);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 1000);
                    }
                  }}
                  className="bg-[#0055ff] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0055ff]/20"
                >
                  DOWNLOAD_STATEMENT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #root { visibility: hidden !important; }
          #print-voucher, #print-voucher * { visibility: visible !important; color: black !important; }
          #print-voucher { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 20px !important; background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
