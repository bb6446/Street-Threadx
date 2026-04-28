
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactGA from 'react-ga4';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { ViewState, Product, CartItem, Review, AdminRole, AdminUser, LogEntry, SocialSettings, SocialReferral, Order, DiscountCode, Customer, ChatSession, ChatMessage } from './types';
import { MOCK_PRODUCTS, ACCENT_COLOR } from './constants';
import AdminDashboard from './components/AdminDashboard';
import CustomerPortal from './components/CustomerPortal';
import CustomerProfile from './components/CustomerProfile';
import { ChatWidget } from './components/ChatWidget';
import { generateChatAgentResponse } from './services/geminiService';
import { deductStockFirebase } from './services/inventoryService';
import { subscribeToProducts, seedProductsIfEmpty } from './services/productService';

// --- Color Mapping Helper ---
const COLOR_MAP: Record<string, string> = {
  'Jet Black': '#0a0a0a',
  'Electric Blue': '#0055ff',
  'Vintage White': '#f5f5f5',
  'Onyx': '#353839',
  'Stealth Grey': '#555555',
  'Black': '#000000',
};

// --- Subcomponents ---

const Navbar: React.FC<{ 
  cartCount: number; 
  setView: (v: ViewState) => void;
  toggleCart: () => void;
  toggleSearch: () => void;
  currentView: ViewState;
  onNavigate: (filter: string, scroll?: boolean) => void;
  activeFilter: string;
  socialSettings: SocialSettings;
  isBannerEnabled?: boolean;
  cartBounce?: boolean;
  customerInfo?: { name: string, email: string };
  onLogoutCustomer?: () => void;
}> = ({ cartCount, setView, toggleCart, toggleSearch, currentView, onNavigate, activeFilter, socialSettings, isBannerEnabled, cartBounce, customerInfo, onLogoutCustomer }) => {
  const [clickCount, setClickCount] = useState(0);
  
  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 5) {
      setView(ViewState.ADMIN_LOGIN);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setClickCount(0);
    }
    setTimeout(() => setClickCount(0), 2000);
  };

  return (
    <nav className={`fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 transition-all ${isBannerEnabled && currentView === ViewState.STORE ? 'top-7' : 'top-0'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onNavigate('ALL', false)}
            className="text-2xl font-black heading-font tracking-tighter hover:opacity-80 transition-opacity uppercase"
          >
            STREET<span className="text-[#0055ff]">THREADX</span>
          </button>
          <span onClick={handleSecretClick} className="text-[#0055ff] text-2xl font-black heading-font cursor-default select-none">.</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest relative group">
          <div className="relative group/shop py-6">
            <button 
              onClick={() => onNavigate('ALL', false)} 
              className={`hover:text-[#0055ff] transition-colors flex items-center gap-2 ${currentView === ViewState.STORE && activeFilter === 'ALL' ? 'text-[#0055ff]' : 'text-zinc-400'}`}
            >
              Shop
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/shop:rotate-180"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            
            {/* Mega Menu Dropdown */}
            <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-screen max-w-4xl bg-black/95 backdrop-blur-xl border border-zinc-800 shadow-2xl opacity-0 invisible group-hover/shop:opacity-100 group-hover/shop:visible transition-all duration-300 transform origin-top-center scale-95 group-hover/shop:scale-100 z-50 p-8 grid grid-cols-4 gap-8">
              <div className="space-y-4">
                <h4 className="text-[#0055ff] font-black text-[10px] tracking-widest border-b border-zinc-800 pb-2">CATEGORIES</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => onNavigate('T-Shirts', true)} className="text-zinc-400 hover:text-white transition-colors">T-Shirts</button></li>
                  <li><button onClick={() => onNavigate('Hoodies', true)} className="text-zinc-400 hover:text-white transition-colors">Hoodies</button></li>
                  <li><button onClick={() => onNavigate('Sweaters', true)} className="text-zinc-400 hover:text-white transition-colors">Sweaters</button></li>
                  <li><button onClick={() => onNavigate('Accessories', true)} className="text-zinc-400 hover:text-white transition-colors">Accessories</button></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[#0055ff] font-black text-[10px] tracking-widest border-b border-zinc-800 pb-2">COLLECTIONS</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => onNavigate('NEW_ARRIVALS', true)} className="text-zinc-400 hover:text-white transition-colors">New Arrivals</button></li>
                  <li><button onClick={() => onNavigate('BEST_SELLERS', true)} className="text-zinc-400 hover:text-white transition-colors">Best Sellers</button></li>
                  <li><button onClick={() => onNavigate('LIMITED_EDITION', true)} className="text-zinc-400 hover:text-white transition-colors">Limited Edition</button></li>
                  <li><button onClick={() => onNavigate('ESSENTIALS', true)} className="text-zinc-400 hover:text-white transition-colors">Essentials</button></li>
                </ul>
              </div>
              <div className="col-span-2 relative aspect-video bg-zinc-900 border border-zinc-800 flex flex-col justify-end p-6 cursor-pointer group/promo overflow-hidden" onClick={() => onNavigate('NEW_ARRIVALS', true)}>
                <img src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/promo:scale-105 transition-transform duration-700" alt="Promo" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <div className="relative z-10">
                  <span className="text-[10px] bg-[#0055ff] text-white px-2 py-1 font-black mb-2 inline-block">SS/26 DROPS</span>
                  <h3 className="text-3xl font-black heading-font italic text-white uppercase leading-none">Cyberpunk<br/>Core</h3>
                  <p className="text-zinc-400 text-xs mt-2 normal-case">Explore the new collection.</p>
                </div>
              </div>
            </div>
          </div>

          {customerInfo?.email ? (
            <div className="relative group/dash">
              <button 
                className="hover:text-[#0055ff] transition-colors text-zinc-400"
              >
                {customerInfo.name.split(' ')[0]}
              </button>
              <div className="absolute top-[100%] left-0 w-32 bg-black border border-zinc-800 opacity-0 invisible group-hover/dash:opacity-100 group-hover/dash:visible transition-all z-50 mt-4">
                <button onClick={() => setView?.(ViewState.CUSTOMER_PROFILE)} className="w-full text-left p-3 text-[10px] font-black uppercase text-white hover:bg-zinc-900 transition-colors">
                  Profile
                </button>
                <button onClick={onLogoutCustomer} className="w-full text-left p-3 text-[10px] font-black uppercase text-rose-500 hover:bg-zinc-900 transition-colors">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setView(ViewState.CUSTOMER_LOGIN)} 
              className="hover:text-[#0055ff] transition-colors text-zinc-400"
            >
              Dashboard
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-3 border-r border-zinc-800 pr-6 mr-2">
            {socialSettings.visibility.facebook && (
              <a href={socialSettings.facebook} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Facebook size={16} />
              </a>
            )}
            {socialSettings.visibility.instagram && (
              <a href={socialSettings.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {socialSettings.visibility.linkedin && (
              <a href={socialSettings.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Linkedin size={16} />
              </a>
            )}
            {socialSettings.visibility.x && (
              <a href={socialSettings.x} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Twitter size={16} />
              </a>
            )}
          </div>
          
          <button onClick={toggleSearch} className="text-zinc-400 hover:text-white transition-colors p-2 hidden md:block" title="Search">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {customerInfo?.email ? (
            <div className="relative group/account hidden md:block">
              <button className="flex items-center gap-2 p-2 transition-colors text-zinc-400 hover:text-white" title="Account">
                <span className="text-[10px] uppercase font-black tracking-widest">{customerInfo.name.split(' ')[0]}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-[100%] right-0 w-48 bg-black border border-zinc-800 opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all z-50">
                <div className="p-4 border-b border-zinc-800">
                  <div className="text-[10px] font-black">{customerInfo.name}</div>
                  <div className="text-[9px] text-zinc-500 truncate">{customerInfo.email}</div>
                </div>
                <button onClick={() => setView?.(ViewState.CUSTOMER_PROFILE)} className="w-full text-left p-4 text-[10px] font-black uppercase text-white hover:bg-zinc-900 transition-colors border-b border-zinc-800">
                  My Orders & Profile
                </button>
                <button onClick={onLogoutCustomer} className="w-full text-left p-4 text-[10px] font-black uppercase text-rose-500 hover:bg-zinc-900 transition-colors">
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setView(ViewState.CUSTOMER_LOGIN)} 
              className={`p-2 transition-colors hidden md:block ${currentView === ViewState.CUSTOMER_LOGIN ? 'text-[#0055ff]' : 'text-zinc-400 hover:text-white'}`}
              title="Account"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}

          <button onClick={() => setView(ViewState.WISHLIST)} className={`p-2 transition-colors hidden md:block ${currentView === ViewState.WISHLIST ? 'text-[#0055ff]' : 'text-zinc-400 hover:text-white'}`} title="Wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <button onClick={toggleCart} className={`relative group p-2 transition-transform duration-300 ${cartBounce ? 'scale-125' : 'scale-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 group-hover:text-[#0055ff] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#0055ff] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-none font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

const Footer: React.FC<{ 
  onSupportNavigate: (topic: string) => void;
  onAdminNavigate: () => void;
  socialSettings: SocialSettings;
}> = ({ onSupportNavigate, onAdminNavigate, socialSettings }) => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-16 px-6 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <h3 className="text-3xl font-black heading-font italic uppercase">STREET THREADX.</h3>
          <p className="text-zinc-500 max-w-sm">Premium streetwear engineered for the modern nomad. Quality materials, minimalist design, maximum impact.</p>
          <div className="flex gap-4">
            {socialSettings.visibility.facebook && (
              <a href={socialSettings.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Facebook size={18} />
              </a>
            )}
            {socialSettings.visibility.instagram && (
              <a href={socialSettings.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Instagram size={18} />
              </a>
            )}
            {socialSettings.visibility.linkedin && (
              <a href={socialSettings.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Linkedin size={18} />
              </a>
            )}
            {socialSettings.visibility.x && (
              <a href={socialSettings.x} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Twitter size={18} />
              </a>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#0055ff]">Support</h4>
          <ul className="text-sm text-zinc-500 space-y-2 uppercase">
            {['Shipping', 'Returns', 'Sizing', 'Contact'].map(topic => (
              <li 
                key={topic} 
                onClick={() => onSupportNavigate(topic)} 
                className="hover:text-white cursor-pointer transition-colors"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#0055ff]">Staff</h4>
          <p className="text-xs text-zinc-500 uppercase tracking-tighter">Authorized access only.</p>
          <button 
            onClick={onAdminNavigate}
            className="bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase px-6 py-3 tracking-[0.3em] hover:bg-white hover:text-black transition-all"
          >
            System Admin
          </button>
        </div>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.STORE);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'Jordan D.', email: 'jordan@example.com', totalSpent: 45000, orders: 4, lastSeen: new Date().toISOString() },
    { id: '2', name: 'Sarah K.', email: 'sarah@example.com', totalSpent: 12000, orders: 2, lastSeen: new Date().toISOString() },
    { id: '3', name: 'Mike R.', email: 'mike@example.com', totalSpent: 8500, orders: 1, lastSeen: new Date().toISOString() },
  ]);
  const [orders, setOrders] = useState<Order[]>([
    { 
      id: 'ORD-7721', 
      customerName: 'Jordan D.', 
      customerEmail: 'jordan@example.com',
      date: '2024-03-20', 
      time: '14:30',
      total: 12500, 
      subtotal: 12500,
      discount: 0,
      status: 'SHIPPED', 
      items: 2,
      orderItems: [
        { productId: '1', name: 'CORE_FLEECE_HOODIE', quantity: 1, price: 8500, variant: { size: 'L', color: 'Black' } },
        { productId: '2', name: 'SIGNATURE_TEE', quantity: 1, price: 4000, variant: { size: 'M', color: 'White' } }
      ],
      shippingAddress: '123 Street, Dhaka, Bangladesh'
    },
    { 
      id: 'ORD-7722', 
      customerName: 'Sarah K.', 
      customerEmail: 'sarah@example.com',
      date: '2024-03-20', 
      time: '11:15',
      total: 4500, 
      subtotal: 4500,
      discount: 0,
      status: 'PENDING', 
      items: 1,
      orderItems: [
        { productId: '2', name: 'SIGNATURE_TEE', quantity: 1, price: 4500, variant: { size: 'S', color: 'Black' } }
      ],
      shippingAddress: '456 Avenue, Chittagong, Bangladesh'
    },
  ]);
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    facebook: 'https://facebook.com/streetthreadx',
    instagram: 'https://instagram.com/streetthreadx',
    linkedin: 'https://linkedin.com/company/streetthreadx',
    x: 'https://x.com/streetthreadx',
    visibility: {
      facebook: true,
      instagram: true,
      linkedin: true,
      x: true
    },
    announcementBanner: {
      enabled: true,
      text: 'FREE SHIPPING ON ORDERS OVER ৳5000 | USE CODE "STREET50"'
    },
    merchantNumbers: {
      bKash: '01929667716',
      Nagad: '01929667716',
      Rocket: '01929667716'
    }
  });
  const [socialReferrals, setSocialReferrals] = useState<SocialReferral[]>([
    { platform: 'Instagram', visits: 1240, conversions: 45, revenue: 125000 },
    { platform: 'Facebook', visits: 850, conversions: 22, revenue: 48000 },
    { platform: 'X', visits: 420, conversions: 12, revenue: 15000 },
    { platform: 'LinkedIn', visits: 150, conversions: 5, revenue: 8500 },
  ]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addToCartState, setAddToCartState] = useState<'idle' | 'adding' | 'success'>('idle');
  const [cartBounce, setCartBounce] = useState(false);
  const [showRotateCue, setShowRotateCue] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Auto-hide rotate cue
  useEffect(() => {
    if (showRotateCue) {
      const timer = setTimeout(() => setShowRotateCue(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showRotateCue]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toasts, setToasts] = useState<{id: string, message: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [supportTopic, setSupportTopic] = useState<string>('Shipping');
  const [shopFilter, setShopFilter] = useState<string>('ALL');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number>(50000); // Max price allowed
  const [sortType, setSortType] = useState<string>('Newest');
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);
  
  const getColorHex = (colorName: string) => {
    const name = colorName.toLowerCase();
    if (name.includes('black') || name.includes('onyx')) return '#111111';
    if (name.includes('white')) return '#f8f9fa';
    if (name.includes('grey') || name.includes('gray')) return '#6c757d';
    if (name.includes('red')) return '#dc3545';
    if (name.includes('blue')) return '#0d6efd';
    if (name.includes('green')) return '#198754';
    if (name.includes('yellow')) return '#ffc107';
    return name; // Fallback to the name itself
  };

  // Checkout Form State
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    billingAddress: '',
    city: 'Dhaka',
    zip: '',
    paymentMethod: 'bKash' as 'COD' | 'bKash' | 'Nagad' | 'Rocket' | 'Credit Card',
    trxId: '',
    senderNumber: '',
    isBillingSame: true
  });

  // Chat State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'chat-1',
      customerName: 'ID_ENTITY_01',
      customerEmail: 'biplobnbc04@gmail.com',
      lastMessage: 'Vulnerability_Report: Payment Gate unverified.',
      lastTimestamp: new Date().toISOString(),
      status: 'ACTIVE',
      messages: [
        {
          id: 'm1',
          senderId: 'user-1',
          senderName: 'ID_ENTITY_01',
          text: 'Vulnerability_Report: Payment Gate unverified.',
          timestamp: new Date().toISOString(),
          isAdmin: false
        }
      ]
    }
  ]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatEmail, setActiveChatEmail] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const handleSendMessage = (text: string, isAdmin: boolean = false, targetEmail?: string) => {
    const emailToUse = isAdmin ? targetEmail : (customerInfo.email || 'guest_session');
    if (!emailToUse && !isAdmin) return;

    const newMessage: ChatMessage = {
      id: `m-${Math.random().toString(36).substr(2, 9)}`,
      senderId: isAdmin ? 'admin-1' : 'customer-1',
      senderName: isAdmin ? 'ADMIN' : (customerInfo.name || 'GUEST'),
      text,
      timestamp: new Date().toISOString(),
      isAdmin
    };

    setChatSessions(prev => {
      const existingSessionIndex = prev.findIndex(s => s.customerEmail === emailToUse);
      if (existingSessionIndex >= 0) {
        const updatedSessions = [...prev];
        updatedSessions[existingSessionIndex] = {
          ...updatedSessions[existingSessionIndex],
          messages: [...updatedSessions[existingSessionIndex].messages, newMessage],
          lastMessage: text,
          lastTimestamp: newMessage.timestamp
        };
        return updatedSessions;
      } else {
        return [
          ...prev,
          {
            id: `chat-${Math.random().toString(36).substr(2, 9)}`,
            customerName: customerInfo.name || 'Anonymous',
            customerEmail: emailToUse || '',
            lastMessage: text,
            lastTimestamp: newMessage.timestamp,
            messages: [newMessage],
            status: 'ACTIVE'
          }
        ];
      }
    });

    if (!isAdmin) {
      setActiveChatEmail(emailToUse || '');
      setIsAiTyping(true);
      // Trigger AI Agent (StreetThreadX CORE_AI)
      setTimeout(async () => {
        try {
          const aiResponse = await generateChatAgentResponse(text, products, customerInfo, cart);
          handleSendMessage(aiResponse, true, emailToUse);
        } catch (error) {
          console.error("AI Agent failed:", error);
        } finally {
          setIsAiTyping(false);
        }
      }, 800);
    }
  };

  const [orderComplete, setOrderComplete] = useState(false);
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

  // Discount Code States
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([
    { id: '1', code: 'STREET20', type: 'PERCENTAGE', value: 20, usageCount: 0, isActive: true },
    { id: '2', code: 'WELCOME100', type: 'FIXED', value: 100, usageCount: 0, isActive: true },
  ]);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');

  // Review States
  const [reviews, setReviews] = useState<Review[]>([
    { id: '101', productId: '1', rating: 5, comment: "The quality of the fleece is insane. Best hoodie I own.", author: "ALEX_K", date: "2024-03-10", status: 'APPROVED' },
    { id: '102', productId: '1', rating: 4, comment: "Fit is perfect, definitely oversized.", author: "MARCUS_J", date: "2024-03-12", status: 'APPROVED' },
    { id: '103', productId: '2', rating: 5, comment: "Graphic is super sharp and the tee feels premium.", author: "ELENA_V", date: "2024-03-14", status: 'PENDING' },
  ]);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const COMMENT_LIMIT = 500;

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return { text: 'Poor', color: 'text-red-500' };
      case 2: return { text: 'Fair', color: 'text-orange-500' };
      case 3: return { text: 'Good', color: 'text-yellow-600' };
      case 4: return { text: 'Very Good', color: 'text-blue-600' };
      case 5: return { text: 'Excellent', color: 'text-green-600' };
      default: return { text: '', color: '' };
    }
  };

  // Admin & Security States
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [adminLogs, setAdminLogs] = useState<LogEntry[]>([]);
  const [loginError, setLoginError] = useState('');

  // Deep linking logic for shared products
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#product=')) {
      const productId = hash.split('=')[1];
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [products]);

  // Google Analytics Initialization & Pageview Tracking
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
      ReactGA.initialize(measurementId);
    }
  }, []);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: `/${currentView.toLowerCase()}`, title: currentView });
  }, [currentView]);

  // Real-time Inventory Sync
  useEffect(() => {
    seedProductsIfEmpty();
    const unsubscribe = subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });
    return () => unsubscribe();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.5)',
    });
  };

  const handleMouseLeaveZoom = () => {
    setZoomStyle({
      transformOrigin: 'center',
      transform: 'scale(1)',
    });
  };

  // Consolidated Navigation Logic
  const handleStoreNavigate = (filter: string, scroll: boolean = true) => {
    setShopFilter(filter);
    setColorFilter('');
    setCurrentView(ViewState.STORE);
    if (scroll) {
      setPendingScroll(true);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSupportNavigate = (topic: string) => {
    setSupportTopic(topic);
    setCurrentView(ViewState.SUPPORT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminNavigate = () => {
    setCurrentView(ViewState.ADMIN_LOGIN);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll Sync Effect
  useEffect(() => {
    if (pendingScroll && currentView === ViewState.STORE) {
      const el = document.getElementById('product-matrix');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingScroll(false);
      }
    }
  }, [pendingScroll, currentView]);

  // Cart total calc
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'PERCENTAGE') {
      return (cartSubtotal * appliedDiscount.value) / 100;
    }
    return appliedDiscount.value;
  }, [appliedDiscount, cartSubtotal]);
  const [shippingCost, setShippingCost] = useState(0);

  // Auto-calculate shipping
  useEffect(() => {
    if (cartSubtotal === 0) {
      setShippingCost(0);
      return;
    }
    
    // Logic: Free shipping over 5000
    if (cartSubtotal >= 5000) {
      setShippingCost(0);
    } else {
      // Basic rule: Dhaka = 80, Outside Dhaka = 150
      const city = (customerInfo.city || '').toLowerCase().trim();
      if (city === 'dhaka') {
        setShippingCost(80);
      } else if (city) {
        setShippingCost(150);
      } else {
        setShippingCost(0);
      }
    }
  }, [customerInfo.city, cartSubtotal]);

  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingCost);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const addToCart = (product: Product, size: string, color?: string, quantity: number = 1, shouldOpenCart: boolean = false) => {
    if (!size) {
      showToast('Please select a size first.');
      return;
    }
    
    ReactGA.event({
      category: "Ecommerce",
      action: "add_to_cart",
      label: product.name,
      value: product.price
    });

    setAddToCartState('adding');
    
    setTimeout(() => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id && item.selectedSize === size && item.selectedColor === color);
        if (existing) {
          return prev.map(item => item.id === product.id && item.selectedSize === size && item.selectedColor === color ? { ...item, quantity: item.quantity + quantity } : item);
        }
        return [...prev, { ...product, selectedSize: size, selectedColor: color, quantity }];
      });
      
      setAddToCartState('success');
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 500);

      setTimeout(() => {
        setAddToCartState('idle');
        if (shouldOpenCart) {
          setIsCartOpen(true);
          setSelectedProduct(null);
          setSelectedSize('');
          setSelectedColor('');
          setSelectedQuantity(1);
        }
      }, 1000);
    }, 600); // Simulate processing time for micro-interaction
  };

  const removeFromCart = (id: string, size: string, color?: string) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.selectedSize === size && item.selectedColor === color)));
  };

  const updateCartQuantity = (id: string, size: string, color: string | undefined, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.selectedSize === size && item.selectedColor === color) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Full name is required for delivery.';
        else if (value.trim().length < 2) error = 'Name must be at least 2 characters.';
        break;
      case 'email':
        if (!value.trim()) error = 'Email address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email format (e.g., user@example.com).';
        break;
      case 'phone':
        if (!value.trim()) error = 'Contact number is required.';
        else if (!/^\+?[\d\s-]{10,}$/.test(value)) error = 'Please enter a valid phone number (min 10 digits).';
        break;
      case 'address':
        if (!value.trim()) error = 'Shipping address is required.';
        else if (value.trim().length < 10) error = 'Please provide a more detailed address.';
        break;
      case 'city':
        if (!value.trim()) error = 'City is required.';
        break;
      case 'zip':
        if (!value.trim()) error = 'Zip Code is required.';
        else if (!/^\d{4,5}$/.test(value)) error = 'Invalid Zip Code.';
        break;
    }
    return error;
  };

  const handleCustomerInfoChange = (field: string, value: string | boolean) => {
    let formattedValue = value;
    if (field === 'phone' && typeof value === 'string') {
      const cleaned = ('' + value).replace(/\D/g, '');
      if (cleaned.length > 5) {
        formattedValue = cleaned.substring(0, 5) + '-' + cleaned.substring(5, 11);
      } else {
        formattedValue = cleaned;
      }
    }
    setCustomerInfo(prev => ({ ...prev, [field]: formattedValue }));
    if (typeof formattedValue === 'string') {
      const error = validateField(field, formattedValue);
      setCheckoutErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const handleNextCheckoutStep = () => {
    const errors: Record<string, string> = {};
    
    if (checkoutStep === 1) {
      const nameError = validateField('name', customerInfo.name);
      if (nameError) errors.name = nameError;
      
      const emailError = validateField('email', customerInfo.email);
      if (emailError) errors.email = emailError;
      
      const phoneError = validateField('phone', customerInfo.phone);
      if (phoneError) errors.phone = phoneError;
      
      const addressError = validateField('address', customerInfo.address);
      if (addressError) errors.address = addressError;
      
      const cityError = validateField('city', customerInfo.city);
      if (cityError) errors.city = cityError;

      const zipError = validateField('zip', customerInfo.zip || '');
      if (zipError) errors.zip = zipError;
    }

    if (checkoutStep === 2) {
      if (['bKash', 'Nagad', 'Rocket'].includes(customerInfo.paymentMethod)) {
        if (!customerInfo.senderNumber.trim()) errors.senderNumber = 'Sender number is required for verification.';
        if (!customerInfo.trxId.trim()) errors.trxId = 'Transaction ID is required for verification.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setCheckoutErrors(errors);
      // Focus first error
      const firstError = Object.keys(errors)[0];
      const el = document.getElementById(`checkout-${firstError}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setCheckoutErrors({});
    setCheckoutStep(prev => prev + 1);
  };

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setDiscountError('');
    const code = discountCodes.find(c => c.code.toUpperCase() === discountInput.toUpperCase() && c.isActive);
    
    if (!code) {
      setDiscountError('INVALID_CODE');
      return;
    }

    if (code.minPurchase && cartSubtotal < code.minPurchase) {
      setDiscountError(`MIN_PURCHASE: ৳${code.minPurchase}`);
      return;
    }

    if (code.usageLimit && code.usageCount >= code.usageLimit) {
      setDiscountError('USAGE_LIMIT_REACHED');
      return;
    }

    if (code.expiryDate && new Date(code.expiryDate) < new Date()) {
      setDiscountError('CODE_EXPIRED');
      return;
    }

    setAppliedDiscount(code);
    setDiscountInput('');
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleStripeCheckout = async () => {
    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerEmail: customerInfo.email,
          shippingCost: shippingCost
        })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.message) {
        // Fallback for demo if no key provided
        showToast(data.message);
        // Complete order mock-ly if stripe isn't configured for real but we want to show the flow
        executeOrderLogic();
      }
    } catch (err) {
      console.error("Payment Error:", err);
      showToast("Payment initialization failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customerInfo.paymentMethod === 'Credit Card') {
      handleStripeCheckout();
      return;
    }

    executeOrderLogic();
  };

  const executeOrderLogic = () => {
    const isAdvance = ['bKash', 'Nagad', 'Rocket'].includes(customerInfo.paymentMethod);
    const advancePaid = isAdvance ? Math.ceil(cartTotal * 0.5) : 0;
    
    // Create new order
    const newOrder: Order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: cartTotal,
      subtotal: cartSubtotal,
      discount: discountAmount,
      status: 'PENDING',
      paymentStatus: isAdvance ? 'PENDING_ADVANCE' : 'UNPAID',
      paymentMethod: customerInfo.paymentMethod,
      transactionId: isAdvance ? customerInfo.trxId : undefined,
      senderNumber: isAdvance ? customerInfo.senderNumber : undefined,
      advancePaid: advancePaid,
      dueAmount: Math.max(0, cartTotal - advancePaid),
      items: cart.reduce((acc, item) => acc + item.quantity, 0),
      orderItems: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: { size: item.selectedSize, color: 'Default' }
      })),
      shippingAddress: `${customerInfo.address}, ${customerInfo.city}`,
      billingAddress: customerInfo.isBillingSame ? `${customerInfo.address}, ${customerInfo.city}` : `${customerInfo.billingAddress}, ${customerInfo.city}`
    };

    setOrders(prev => [newOrder, ...prev]);
    
    // Atomic stock deduction in Firestore
    const itemsToDeduct = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity
    }));
    deductStockFirebase(itemsToDeduct).catch(err => {
      console.error("Stock deduction failed:", err);
    });

    // Track customer data internally for Admin Dashboard tracking
    setCustomers(prev => {
      const existing = prev.find(c => c.email.toLowerCase() === customerInfo.email.toLowerCase());
      if (existing) {
        return prev.map(c => c.id === existing.id ? { 
          ...c, 
          totalSpent: c.totalSpent + cartTotal,
          orders: c.orders + 1,
          lastSeen: new Date().toISOString()
        } : c);
      } else {
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: customerInfo.name,
          email: customerInfo.email,
          totalSpent: cartTotal,
          orders: 1,
          lastSeen: new Date().toISOString()
        }];
      }
    });

    if (appliedDiscount) {
      setDiscountCodes(prev => prev.map(c => c.id === appliedDiscount.id ? { ...c, usageCount: c.usageCount + 1 } : c));
    }
    setOrderComplete(true);
    setAppliedDiscount(null);
    
    ReactGA.event({
      category: "Ecommerce",
      action: "purchase",
      value: cartTotal,
      label: newOrder.id
    });
    
    setTimeout(() => {
      setCart([]);
      setIsCheckoutOpen(false);
      setOrderComplete(false);
      setIsCartOpen(false);
      setCheckoutStep(1);
      setCustomerInfo({
        name: '',
        email: '',
        phone: '',
        address: '',
        billingAddress: '',
        city: 'Dhaka',
        zip: '',
        paymentMethod: 'COD',
        trxId: '',
        senderNumber: '',
        isBillingSame: true
      });
    }, 3000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const users = {
      'root': { role: AdminRole.SUPER_ADMIN, pass: 'root123' },
      'editor': { role: AdminRole.EDITOR, pass: 'edit123' },
      'support': { role: AdminRole.SUPPORT, pass: 'sup123' },
      'bb6446': { role: AdminRole.SUPER_ADMIN, pass: 'bb6446' }
    };
    const userEntry = users[adminUsername as keyof typeof users];
    if (userEntry && userEntry.pass === adminPassword) {
      setIsTwoFactorStep(true);
      setLoginError('');
    } else {
      setLoginError('AUTH_FAILURE: ACCESS DENIED');
    }
  };

  const handleTwoFactorVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode === '123456') { 
       const users = {
          'root': { id: '1', role: AdminRole.SUPER_ADMIN },
          'editor': { id: '2', role: AdminRole.EDITOR },
          'support': { id: '3', role: AdminRole.SUPPORT },
          'bb6446': { id: '4', role: AdminRole.SUPER_ADMIN }
       };
       const u = users[adminUsername as keyof typeof users];
       const finalUser: AdminUser = { id: u.id, username: adminUsername, role: u.role, lastLogin: new Date().toISOString() };
       setAdminUser(finalUser);
       setCurrentView(ViewState.ADMIN_DASHBOARD);
       setIsTwoFactorStep(false);
       setAdminPassword('');
       setAdminUsername('');
       setTwoFactorCode('');
       setLoginError('');
       setAdminLogs(p => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), user: finalUser.username, action: 'SESSION_INIT', role: finalUser.role }, ...p]);
    } else {
      setLoginError('INVALID_RSA_KEY');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !customerInfo?.name || !newReviewComment) return;
    
    setIsSubmittingReview(true);
    setTimeout(() => {
      const newReview: Review = {
        id: Math.random().toString(36).substr(2, 9),
        productId: selectedProduct.id,
        rating: newReviewRating,
        comment: newReviewComment,
        author: customerInfo.name.toUpperCase().replace(/\s/g, '_'),
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      };
      setReviews(prev => [newReview, ...prev]);
      setNewReviewComment('');
      setNewReviewRating(5);
      setIsSubmittingReview(false);
    }, 600);
  };

  const filteredReviews = useMemo(() => {
    if (!selectedProduct) return [];
    return reviews.filter(r => r.productId === selectedProduct.id && r.status === 'APPROVED');
  }, [reviews, selectedProduct]);

  const averageRating = useMemo(() => {
    if (filteredReviews.length === 0) return 0;
    return filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length;
  }, [filteredReviews]);

  const filteredProducts = useMemo(() => {
    let result = products;
    
    // 1. Navigation / Category Filter
    if (shopFilter === 'NEW_ARRIVALS') {
      result = result.filter(p => p.isNewArrival);
    } else if (shopFilter === 'BEST_SELLERS') {
      // Basic mock logic for best sellers (e.g. mock sales)
      result = result.filter(p => (p.sales || 0) > 10 || p.isNewArrival); 
    } else if (shopFilter === 'LIMITED_EDITION') {
      result = result.filter(p => p.stock < 20);
    } else if (shopFilter === 'ESSENTIALS') {
      result = result.filter(p => p.tags?.includes('essential'));
    } else if (['Hoodies', 'T-Shirts', 'Accessories', 'Sweaters'].includes(shopFilter)) {
      result = result.filter(p => p.category === shopFilter);
    }
    
    // 2. Attribute Filters
    if (colorFilter) result = result.filter(p => p.colors.includes(colorFilter));
    if (sizeFilter) result = result.filter(p => p.sizes.includes(sizeFilter));
    
    // 3. Price Filter
    result = result.filter(p => p.price <= priceRange);
    
    // 4. Status Filter
    result = result.filter(p => p.status === 'Published');
    
    // 5. Sorting
    switch (sortType) {
      case 'Price (Low to High)':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'Price (High to Low)':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'Best Selling':
        result.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        break;
      case 'Newest':
      default:
        // Basic sort placing new arrivals first
        result.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
        break;
    }
    
    return result;
  }, [products, shopFilter, colorFilter, sizeFilter, priceRange, sortType]);

  const renderSupportContent = () => {
    switch (supportTopic) {
      case 'Shipping':
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="space-y-4">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Zone_Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Zone_01 (Dhaka)</p>
                  <p className="text-lg font-black uppercase">1 - 2 Business Days</p>
                  <p className="text-xs text-zinc-400 mt-4 leading-relaxed">Local delivery network active across Dhaka metropolis.</p>
                </div>
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Zone_02 (Nationwide)</p>
                  <p className="text-lg font-black uppercase">3 - 5 Business Days</p>
                  <p className="text-xs text-zinc-400 mt-4 leading-relaxed">Secured courier relay to all major districts in Bangladesh.</p>
                </div>
              </div>
            </section>
          </div>
        );
      case 'Returns':
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
             <section className="space-y-4">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Return_Window</h4>
              <p className="text-5xl font-black uppercase tracking-tighter">7 Days</p>
              <p className="text-sm text-zinc-400 leading-relaxed uppercase">Assets must remain in 'Factory-New' status with tags intact.</p>
            </section>
          </div>
        );
      case 'Sizing':
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <section className="space-y-6">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Measurement_Matrix</h4>
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left text-[11px] font-black uppercase border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-500 border-b border-zinc-800">
                      <th className="py-4 px-6">Size_Tag</th>
                      <th className="py-4 px-6">Chest (CM)</th>
                      <th className="py-4 px-6">Length (CM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    <tr><td className="py-4 px-6 text-[#0055ff]">SMALL</td><td className="py-4 px-6">57</td><td className="py-4 px-6">68</td></tr>
                    <tr><td className="py-4 px-6 text-[#0055ff]">MEDIUM</td><td className="py-4 px-6">61</td><td className="py-4 px-6">72</td></tr>
                    <tr><td className="py-4 px-6 text-[#0055ff]">LARGE</td><td className="py-4 px-6">65</td><td className="py-4 px-6">75</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );
      case 'Contact':
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <section className="space-y-8">
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Direct_Relay</h4>
                <p className="text-2xl md:text-3xl font-black text-white">REACH@STREETTHREADX.COM.BD</p>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Live_Encryption</h4>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="px-8 py-4 bg-[#0055ff] text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Initialize_Chat
                </button>
              </div>
            </section>
          </div>
        );
      default: return null;
    }
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        showToast('Removed from Wishlist');
        return prev.filter(p => p.id !== product.id);
      } else {
        showToast('Added to Wishlist');
        return [...prev, product];
      }
    });
  };

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'pinterest') => {
    if (!selectedProduct) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const deepLinkUrl = `${baseUrl}#product=${selectedProduct.id}`;
    const text = `Check out the ${selectedProduct.name} from STREET THREADX.`;
    const image = selectedProduct.images[0];
    let shareUrl = '';
    switch (platform) {
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(deepLinkUrl)}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(deepLinkUrl)}&text=${encodeURIComponent(text)}`; break;
      case 'pinterest': shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(deepLinkUrl)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(text)}`; break;
    }
    window.open(shareUrl, 'share-dialog', 'width=600,height=450');
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#0055ff] selection:text-white bg-black font-mono">
      {socialSettings.announcementBanner?.enabled && currentView === ViewState.STORE && (
        <div className="fixed top-0 w-full z-[60] bg-[#0055ff] text-white text-center py-2 text-[10px] font-black uppercase tracking-widest pointer-events-auto">
          {socialSettings.announcementBanner.text}
        </div>
      )}
      <Navbar 
        cartCount={cart.reduce((a, b) => a + b.quantity, 0)} 
        setView={setCurrentView} 
        toggleCart={() => setIsCartOpen(!isCartOpen)} 
        toggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        currentView={currentView} 
        onNavigate={handleStoreNavigate}
        activeFilter={shopFilter} 
        socialSettings={socialSettings}
        isBannerEnabled={socialSettings.announcementBanner?.enabled}
        cartBounce={cartBounce}
        customerInfo={customerInfo}
        onLogoutCustomer={async () => {
          try {
            const { logOut } = await import('./firebase');
            await logOut();
          } catch(e) {}
          setCustomerInfo({ 
            name: '', 
            email: '', 
            phone: '', 
            address: '',
            billingAddress: '',
            city: 'Dhaka',
            zip: '',
            paymentMethod: 'COD',
            trxId: '',
            senderNumber: '',
            isBillingSame: true
          });
        }}
      />

      <main className="flex-1 pb-20 md:pb-0">
        {currentView === ViewState.STORE && (
          <div className={`animate-in fade-in duration-700 ${socialSettings.announcementBanner?.enabled ? 'pt-28' : 'pt-20'}`}>
            <section className="relative h-[65vh] md:h-[85vh] w-full overflow-hidden flex items-center px-6 md:px-20">
              {showRotateCue && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-in fade-in fade-out duration-1000 zoom-in">
                  <div className="flex flex-col items-center gap-4 bg-black/60 backdrop-blur-sm p-8 rounded-none border border-zinc-700/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Drag to Rotate</span>
                  </div>
                </div>
              )}
              <img src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=1920" className="absolute inset-0 w-full h-full object-cover brightness-50 contrast-125 hover:scale-105 transition-transform duration-[10s] drag-none" alt="Streetwear Hero" referrerPolicy="no-referrer" />
              <div className="relative z-10 max-w-2xl space-y-8">
                <div className="space-y-2">
                  <span className="text-[#0055ff] font-bold text-xs uppercase tracking-[0.3em]">Drop 02 // 2024</span>
                  <h1 className="text-5xl md:text-8xl font-black heading-font italic uppercase leading-none tracking-tighter">Urban <br/><span className="text-stroke-white text-transparent border-white">Elysium</span></h1>
                </div>
                <button 
                  onClick={() => handleStoreNavigate('ALL', true)} 
                  className="bg-white text-black px-10 py-4 font-bold uppercase text-sm hover:bg-[#0055ff] hover:text-white transition-all"
                >
                  Shop Now
                </button>
              </div>
            </section>
            
            <section id="product-matrix" className="max-w-7xl mx-auto px-6 py-20 flex flex-col gap-12 scroll-mt-20">
               {shopFilter === 'ALL' && (
                 <div className="space-y-12 mb-12">
                   <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
                      <div className="space-y-1">
                        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#0055ff]">New_Arrivals</h2>
                        <h3 className="text-4xl font-black heading-font uppercase">Latest Drops</h3>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                     {products.filter(p => p.isNewArrival).slice(0, 4).map(product => (
                       <div key={`latest-${product.id}`} className="group relative flex flex-col cursor-pointer" onClick={() => setSelectedProduct(product)}>
                         <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-500 group-hover:border-[#0055ff]/50">
                           <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} referrerPolicy="no-referrer" />
                           <div className="absolute top-4 left-4 bg-[#0055ff] text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest">New</div>
                         </div>
                         <div className="mt-4 space-y-1">
                           <h4 className="font-black uppercase tracking-tighter text-sm group-hover:text-[#0055ff] transition-colors">{product.name}</h4>
                           <p className="text-[10px] text-zinc-500 font-black">৳{product.price.toLocaleString()}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#0055ff]">Collection_Matrix</h2>
                    <h3 className="text-4xl font-black heading-font uppercase">{shopFilter.replace('_', ' ')}</h3>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center text-xs font-bold uppercase tracking-widest">
                    <select 
                      value={sortType} 
                      onChange={(e) => setSortType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 outline-none focus:border-[#0055ff] transition-colors"
                    >
                      <option value="Newest">Sort: Newest</option>
                      <option value="Price (Low to High)">Price: Low to High</option>
                      <option value="Price (High to Low)">Price: High to Low</option>
                      <option value="Best Selling">Best Selling</option>
                    </select>
                    
                    <select 
                      value={sizeFilter} 
                      onChange={(e) => setSizeFilter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 outline-none focus:border-[#0055ff] transition-colors"
                    >
                      <option value="">Size: All</option>
                      <option value="S">Small</option>
                      <option value="M">Medium</option>
                      <option value="L">Large</option>
                      <option value="XL">X-Large</option>
                    </select>

                    <select 
                      value={colorFilter} 
                      onChange={(e) => setColorFilter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 outline-none focus:border-[#0055ff] transition-colors"
                    >
                      <option value="">Color: All</option>
                      <option value="Black">Black</option>
                      <option value="White">White</option>
                      <option value="Grey">Grey</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                    </select>

                    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2">
                       <span>Limit: ৳{priceRange}</span>
                       <input 
                         type="range" 
                         min="0" 
                         max="50000" 
                         step="1000"
                         value={priceRange}
                         onChange={(e) => setPriceRange(Number(e.target.value))}
                         className="w-24 accent-[#0055ff]"
                       />
                    </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 min-h-[400px]">
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                  <div key={product.id} className="group relative flex flex-col cursor-pointer">
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-500 group-hover:border-[#0055ff]/50" onClick={() => {
                      setSelectedProduct(product);
                      ReactGA.event({
                        category: "Ecommerce",
                        action: "view_item",
                        label: product.name,
                        value: product.price
                      });
                    }}>
                      <img src={product.images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} referrerPolicy="no-referrer" />
                      {product.isNewArrival && (
                        <div className="absolute top-4 left-4 bg-[#0055ff] text-white text-[8px] font-black px-2 py-1 uppercase tracking-widest z-10">New</div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]"><button className="bg-white text-black px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em]">Quick View</button></div>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-between items-start" onClick={() => {
                        setSelectedProduct(product);
                        ReactGA.event({
                          category: "Ecommerce",
                          action: "view_item",
                          label: product.name,
                          value: product.price
                        });
                      }}>
                        <div className="space-y-1"><h3 className="font-black uppercase tracking-tighter text-xl leading-tight group-hover:text-[#0055ff] transition-colors">{product.name}</h3><p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{product.category}</p></div>
                        <span className="font-black text-xl heading-font tabular-nums">৳{product.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <p className="text-zinc-500 uppercase text-xs tracking-[0.3em]">No products found in this sector.</p>
                    <button onClick={() => handleStoreNavigate('ALL', false)} className="text-[#0055ff] text-[10px] font-black uppercase border-b border-[#0055ff]">Reset Filters</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {currentView === ViewState.WISHLIST && (
          <div className="pt-40 max-w-7xl mx-auto px-6 pb-32 min-h-[85vh]">
            <h1 className="text-4xl md:text-6xl font-black heading-font uppercase mb-12 italic tracking-tighter">My Wishlist</h1>
            {wishlist.length === 0 ? (
              <div className="text-center py-20 border border-zinc-800/50 bg-black/20">
                <p className="text-zinc-500 uppercase text-sm tracking-widest font-black mb-6">Your wishlist is empty</p>
                <button onClick={() => setCurrentView(ViewState.STORE)} className="px-8 py-4 bg-[#0055ff] text-white font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">
                  Explore Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {wishlist.map(product => (
                  <div key={`wishlist-${product.id}`} className="group relative flex flex-col bg-zinc-900/50 border border-zinc-800 p-4">
                    <div className="relative aspect-[4/5] overflow-hidden mb-4 bg-black cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{product.category}</span>
                        <span className="font-black text-lg heading-font tabular-nums text-white">৳{product.price.toLocaleString()}</span>
                      </div>
                      <h3 className="font-black uppercase text-xs tracking-widest text-white leading-snug cursor-pointer hover:text-[#0055ff] transition-colors" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                    </div>
                    <button onClick={() => toggleWishlist(product)} className="w-full mt-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500 hover:text-white font-black uppercase text-[9px] tracking-widest transition-all">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === ViewState.SUPPORT && (
          <div className="pt-40 max-w-5xl mx-auto px-6 pb-20 min-h-[85vh]">
            <div className="flex flex-col md:flex-row gap-16">
              <aside className="w-full md:w-64 space-y-12">
                <nav className="flex flex-col gap-4">
                  {['Shipping', 'Returns', 'Sizing', 'Contact'].map(topic => (
                    <button key={topic} onClick={() => setSupportTopic(topic)} className={`text-left text-[10px] font-black uppercase tracking-[0.2em] px-5 py-4 border transition-all duration-300 ${supportTopic === topic ? 'bg-[#0055ff] border-[#0055ff] text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}>{topic}</button>
                  ))}
                </nav>
              </aside>
              <div className="flex-1 space-y-12 animate-in slide-in-from-right-4 duration-700">
                <h2 className="text-6xl md:text-8xl font-black uppercase heading-font italic tracking-tighter leading-none">{supportTopic}</h2>
                <div className="min-h-[400px] border-l border-zinc-900 pl-8 md:pl-16">
                  {renderSupportContent()}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === ViewState.CUSTOMER_LOGIN && (
          <div className="pt-20">
            <CustomerPortal onLoginSuccess={(user) => {
              const existing = customers.find(c => c.email.toLowerCase() === user.email.toLowerCase());
              const resolvedName = existing ? existing.name : user.name;
              
              setCustomerInfo(prev => ({ ...prev, name: resolvedName, email: user.email }));
              
              // Ensure user is added to customers state if new
              setCustomers(prev => {
                if (existing) {
                  return prev.map(c => c.id === existing.id ? { ...c, lastSeen: new Date().toISOString() } : c);
                } else {
                  return [...prev, {
                    id: Math.random().toString(36).substr(2, 9),
                    name: resolvedName,
                    email: user.email,
                    totalSpent: 0,
                    orders: 0,
                    lastSeen: new Date().toISOString()
                  }];
                }
              });

              setCurrentView(ViewState.STORE);
              window.scrollTo(0, 0);
            }} />
          </div>
        )}

        {currentView === ViewState.CUSTOMER_PROFILE && customerInfo?.email && (
          <div className="pt-20">
            <CustomerProfile 
              customerInfo={customerInfo}
              orders={orders}
              onNavigateBack={() => { setCurrentView(ViewState.STORE); window.scrollTo(0, 0); }}
              isDarkMode={true}
            />
          </div>
        )}

        {currentView === ViewState.ADMIN_LOGIN && (
          <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] pt-20">
             <div className="w-full max-w-md space-y-12 text-center">
                <h2 className="text-5xl font-black heading-font italic uppercase tracking-tighter text-white">STREET<span className="text-[#0055ff]">THREADX</span></h2>
                {!isTwoFactorStep ? (
                  <form onSubmit={handleAdminLogin} className="space-y-8">
                    <input type="text" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} className="w-full bg-black border border-zinc-800 px-6 py-5 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-[#0055ff]" placeholder="TERMINAL_ID" required />
                    <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-black border border-zinc-800 px-6 py-5 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-[#0055ff]" placeholder="CYPHER_KEY" required />
                    <button type="submit" className="w-full bg-white text-black py-5 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[#0055ff] hover:text-white transition-all">Establish Link</button>
                  </form>
                ) : (
                  <form onSubmit={handleTwoFactorVerify} className="space-y-8">
                    <input type="text" maxLength={6} value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} className="w-full bg-black border border-zinc-800 px-4 py-8 text-4xl font-black text-center tracking-[0.8em] text-[#0055ff] outline-none" placeholder="000000" required />
                    <button type="submit" className="w-full bg-[#0055ff] text-white py-5 font-black uppercase text-[10px] tracking-[0.3em]">Verify Session</button>
                  </form>
                )}
             </div>
          </div>
        )}

        {currentView === ViewState.ADMIN_DASHBOARD && adminUser && (
          <AdminDashboard 
            user={adminUser} 
            products={products}
            setProducts={setProducts}
            orders={orders}
            setOrders={setOrders}
            customers={customers}
            setCustomers={setCustomers}
            socialSettings={socialSettings}
            setSocialSettings={setSocialSettings}
            socialReferrals={socialReferrals}
            onLogout={() => { setAdminUser(null); setCurrentView(ViewState.STORE); }} 
            logs={adminLogs} 
            addLog={(a) => setAdminLogs(p => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), user: adminUser.username, action: a, role: adminUser.role }, ...p])} 
            discountCodes={discountCodes}
            setDiscountCodes={setDiscountCodes}
            reviews={reviews}
            setReviews={setReviews}
            chatSessions={chatSessions}
            onSendMessage={handleSendMessage}
          />
        )}
      </main>

      {/* Search Drawer */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-20">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSearchOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-zinc-800 flex flex-col p-6 animate-in slide-in-from-top-4 duration-300">
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="SEARCH_CATALOG" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 px-6 py-4 text-sm font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all placeholder:opacity-40"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {searchQuery.length > 0 && (
              <div className="mt-4 max-h-[60vh] overflow-y-auto no-scrollbar space-y-4 pt-4 border-t border-zinc-800">
                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))).length > 0 ? (
                  products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))).map(product => (
                    <div 
                      key={product.id} 
                      className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 transition-colors border border-transparent hover:border-zinc-800"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsSearchOpen(false);
                      }}
                    >
                      <img src={product.images[0]} alt={product.name} className="w-16 h-16 object-cover bg-zinc-900" />
                      <div>
                        <h4 className="text-sm font-bold uppercase">{product.name}</h4>
                        <p className="text-xs text-[#0055ff] font-black mt-1">৳{product.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 uppercase font-black text-center py-10">No matches found.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0a0a0a] h-full shadow-2xl border-l border-zinc-800 flex flex-col p-8 space-y-8 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center z-10">
              <h2 className="text-2xl font-black heading-font uppercase">Your_Vault</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6">
              {cart.map(item => (
                <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-4 p-4 border border-zinc-800 bg-zinc-900/50">
                  <div className="w-20 h-24 bg-black border border-zinc-800"><img src={item.images[0]} className="w-full h-full object-cover grayscale" alt="" referrerPolicy="no-referrer" /></div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase">{item.name}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase">Size: {item.selectedSize}{item.selectedColor ? ` | Color: ${item.selectedColor}` : ''}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black">৳{(item.price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)} className="text-[10px] text-rose-500 font-black">REMOVE</button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-zinc-600 uppercase text-xs text-center py-20">Vault is empty.</p>}
            </div>
            <div className="border-t border-zinc-800 pt-8 space-y-6">
              <div className="flex justify-between items-end"><span className="text-[10px] text-zinc-500 uppercase">Subtotal</span><span className="text-3xl font-black">৳{cartTotal.toLocaleString()}</span></div>
              <button 
                onClick={() => { 
                  if(cart.length > 0) {
                    setCheckoutErrors({});
                    setIsCheckoutOpen(true);
                  }
                }} 
                className="w-full py-5 bg-[#0055ff] text-white text-[10px] font-black uppercase tracking-[0.4em] disabled:opacity-50"
                disabled={cart.length === 0}
              >
                Proceed_To_Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => {
            if (!orderComplete) {
              setIsCheckoutOpen(false);
              setCheckoutErrors({});
            }
          }}></div>
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-zinc-800 p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {orderComplete ? (
              <div className="text-center py-20 space-y-6">
                <div className="w-20 h-20 bg-green-500 rounded-none flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 className="text-3xl font-black uppercase italic">Order_Synchronized</h2>
                <p className="text-zinc-500 uppercase text-xs tracking-widest">A verification relay has been sent to {customerInfo.email}</p>
              </div>
            ) : (
              <div className="space-y-10">
                <header className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-black heading-font uppercase">Execution_Relay</h2>
                    <p className="text-[9px] text-[#0055ff] font-black uppercase tracking-widest">Complete Logistics Calibration</p>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between relative pt-4">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-zinc-800 z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-[#0055ff] z-0 transition-all duration-500" style={{ width: `${((checkoutStep - 1) / 2) * 100}%` }}></div>
                    
                    {[
                      { step: 1, label: 'Shipping' },
                      { step: 2, label: 'Payment' },
                      { step: 3, label: 'Review' }
                    ].map((s) => (
                      <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-6 h-6 rounded-none flex items-center justify-center text-[10px] font-black transition-colors duration-300 ${
                          checkoutStep >= s.step ? 'bg-[#0055ff] text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {checkoutStep > s.step ? '✓' : s.step}
                        </div>
                        <span className={`text-[8px] uppercase tracking-widest font-black absolute -bottom-5 ${
                          checkoutStep >= s.step ? 'text-white' : 'text-zinc-500'
                        }`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </header>
                
                <form onSubmit={checkoutStep === 3 ? handleFinalCheckout : (e) => { e.preventDefault(); handleNextCheckoutStep(); }} noValidate className="space-y-6 pt-4">
                  {checkoutStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-500">Full_Name</label>
                          <input id="checkout-name" type="text" value={customerInfo.name} onChange={e => handleCustomerInfoChange('name', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${checkoutErrors.name ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="ID_ENTITY" />
                          {checkoutErrors.name && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.name}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-500">Contact_Number</label>
                          <input 
                            id="checkout-phone"
                            type="tel" 
                            value={customerInfo.phone} 
                            onChange={e => handleCustomerInfoChange('phone', e.target.value)} 
                            className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${checkoutErrors.phone ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} 
                            placeholder="+88 01X XXXX" 
                          />
                          {checkoutErrors.phone && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.phone}</p>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-zinc-500">Email_Address</label>
                        <input id="checkout-email" type="email" value={customerInfo.email} onChange={e => handleCustomerInfoChange('email', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${checkoutErrors.email ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="ENTITY@REACH.COM" />
                        {checkoutErrors.email && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.email}</p>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Shipping_Address</label>
                            <textarea id="checkout-address" value={customerInfo.address} onChange={e => handleCustomerInfoChange('address', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all min-h-[80px] ${checkoutErrors.address ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="BLOCK/STREET/HOUSE..." />
                            {checkoutErrors.address && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.address}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={customerInfo.isBillingSame}
                                onChange={e => handleCustomerInfoChange('isBillingSame', e.target.checked)}
                                className="hidden"
                              />
                              <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${customerInfo.isBillingSame ? 'bg-[#0055ff] border-[#0055ff]' : 'border-zinc-700'}`}>
                                {customerInfo.isBillingSame && <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>}
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors">Same as Shipping</span>
                            </label>
                            {!customerInfo.isBillingSame && (
                              <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                                <label className="text-[9px] font-black uppercase text-zinc-500">Billing_Address</label>
                                <textarea id="checkout-billing" value={customerInfo.billingAddress} onChange={e => handleCustomerInfoChange('billingAddress', e.target.value)} className={`w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold uppercase text-white outline-none focus:border-[#0055ff] transition-all min-h-[80px]`} placeholder="BILLING ADDRESS..." />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">City</label>
                            <input id="checkout-city" type="text" value={customerInfo.city} onChange={e => handleCustomerInfoChange('city', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${checkoutErrors.city ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="CITY" />
                            {checkoutErrors.city && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.city}</p>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Zip / Postal Code</label>
                            <input 
                              id="checkout-zip"
                              type="text" 
                              value={customerInfo.zip || ''} 
                              onChange={e => handleCustomerInfoChange('zip', e.target.value)} 
                              className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${checkoutErrors.zip ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} 
                              placeholder="12345" 
                            />
                            {checkoutErrors.zip && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.zip}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-500">Select Payment Method</h3>
                        
                        {(['bKash', 'Nagad', 'Rocket', 'Cash On Delivery', 'Credit Card'] as const).map((method) => (
                          <div 
                            key={method}
                            onClick={() => handleCustomerInfoChange('paymentMethod', method)}
                            className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${customerInfo.paymentMethod === method ? 'border-[#0055ff] bg-[#0055ff]/10' : 'border-zinc-800 bg-zinc-900/50 opacity-60 hover:opacity-100'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-none border-2 flex items-center justify-center ${customerInfo.paymentMethod === method ? 'border-[#0055ff]' : 'border-zinc-700'}`}>
                                {customerInfo.paymentMethod === method && <div className="w-2 h-2 rounded-none bg-[#0055ff]"></div>}
                              </div>
                              <span className="text-sm font-bold uppercase">{method}</span>
                            </div>

                            {customerInfo.paymentMethod === method && ['bKash', 'Nagad', 'Rocket'].includes(method) && (
                              <div className="mt-4 pt-4 border-t border-[#0055ff]/30 text-xs text-zinc-300 leading-relaxed space-y-4">
                                <div className="space-y-1">
                                  <p className="font-black text-[#0055ff] uppercase tracking-wider mb-2">50% Advance Required</p>
                                  <p>1. Go to your {method} app.</p>
                                  <p>2. Select "Make Payment".</p>
                                  <p>3. Enter our Merchant Number: <strong className="text-white">
                                    {method === 'bKash' ? (socialSettings.merchantNumbers?.bKash || '01929667716') : 
                                     method === 'Nagad' ? (socialSettings.merchantNumbers?.Nagad || '01929667716') : 
                                     (socialSettings.merchantNumbers?.Rocket || '01929667716')}
                                  </strong></p>
                                  <p>4. Enter the Advance Amount: <strong className="text-white">৳{Math.ceil(cartTotal * 0.5)}</strong></p>
                                </div>
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-zinc-500">Sender Number <span className="text-rose-500">*</span></label>
                                    <input 
                                      type="tel" 
                                      value={customerInfo.senderNumber}
                                      onChange={e => handleCustomerInfoChange('senderNumber', e.target.value)}
                                      placeholder="e.g. 017XXXXXXXX"
                                      className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] ${checkoutErrors.senderNumber ? 'border-rose-500' : 'border-[#0055ff]/50'}`}
                                    />
                                    {checkoutErrors.senderNumber && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.senderNumber}</p>}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-zinc-500">Transaction ID (TrxID) <span className="text-rose-500">*</span></label>
                                    <input 
                                      type="text" 
                                      value={customerInfo.trxId}
                                      onChange={e => handleCustomerInfoChange('trxId', e.target.value)}
                                      placeholder="e.g. 9B6A2..."
                                      className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] ${checkoutErrors.trxId ? 'border-rose-500' : 'border-[#0055ff]/50'}`}
                                    />
                                    {checkoutErrors.trxId && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.trxId}</p>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Credit Card Form */}
                        {customerInfo.paymentMethod === 'Credit Card' && (
                          <div className="pt-4 space-y-4 border-t border-zinc-800 animate-in fade-in duration-300">
                             <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-zinc-500">Card Number</label>
                              <input 
                                type="text" 
                                placeholder="0000 0000 0000 0000" 
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                                  e.target.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                                }}
                                className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff]"
                              />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-500">Expiry</label>
                                <input 
                                  type="text" 
                                  placeholder="MM/YY" 
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                    e.target.value = val.length >= 2 ? `${val.substring(0, 2)}/${val.substring(2, 4)}` : val;
                                  }}
                                  className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-500">CVC</label>
                                <input 
                                  type="text" 
                                  placeholder="123" 
                                  maxLength={4}
                                  onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, ''); }}
                                  className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff]"
                                />
                              </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-500">Order Summary</h3>
                        <div className="bg-zinc-900/30 border border-zinc-800 p-4 space-y-4">
                          {cart.map(item => (
                            <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex justify-between items-center text-sm">
                              <span className="text-zinc-400">{item.quantity}x {item.name} ({item.selectedSize}{item.selectedColor ? `, ${item.selectedColor}` : ''})</span>
                              <span className="font-bold">৳{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                          
                          <div className="border-t border-zinc-800 pt-4 space-y-2">
                            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-black">
                              <span>Subtotal</span>
                              <span>৳{cartSubtotal.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-black">
                              <div className="flex items-center gap-2">
                                <span>Shipping</span>
                                <span className="text-[8px] opacity-60">({customerInfo.city || 'Calculated at checkout'})</span>
                              </div>
                              <span>{shippingCost === 0 ? 'FREE' : `৳${shippingCost.toLocaleString()}`}</span>
                            </div>
                            
                            {appliedDiscount && (
                              <div className="flex justify-between items-center text-xs text-green-500 uppercase font-black">
                                <div className="flex items-center gap-2">
                                  <span>Discount ({appliedDiscount.code})</span>
                                  <button onClick={() => setAppliedDiscount(null)} className="text-[8px] hover:underline">Remove</button>
                                </div>
                                <span>-৳{discountAmount.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-[10px] text-zinc-500 uppercase font-black">Total_Payable</span>
                              <span className="text-xl font-black text-[#0055ff]">৳{cartTotal.toLocaleString()}</span>
                            </div>

                            {['bKash', 'Nagad', 'Rocket'].includes(customerInfo.paymentMethod) && (
                              <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase font-black">Advance Required (50%)</span>
                                <span className="text-sm font-black text-white">৳{Math.ceil(cartTotal * 0.5).toLocaleString()}</span>
                              </div>
                            )}
                            {['bKash', 'Nagad', 'Rocket'].includes(customerInfo.paymentMethod) && (
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] text-zinc-500 uppercase font-black">Cash on Delivery Due</span>
                                <span className="text-sm font-black text-rose-500">৳{(cartTotal - Math.ceil(cartTotal * 0.5)).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {!appliedDiscount && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Discount_Code</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={discountInput}
                                onChange={e => setDiscountInput(e.target.value)}
                                className={`flex-1 bg-zinc-900/50 border px-4 py-3 text-xs font-bold uppercase text-white outline-none transition-all ${discountError ? 'border-rose-500' : 'border-zinc-800 focus:border-[#0055ff]'}`}
                                placeholder="ENTER_CODE"
                              />
                              <button 
                                type="button"
                                onClick={handleApplyDiscount}
                                className="px-6 py-3 bg-zinc-800 text-white text-[10px] font-black uppercase hover:bg-zinc-700 transition-all border border-zinc-700"
                              >
                                Apply
                              </button>
                            </div>
                            {discountError && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{discountError}</p>}
                          </div>
                        )}
                        
                        <div className="bg-zinc-900/30 border border-zinc-800 p-4 space-y-2">
                          <h4 className="text-[10px] text-zinc-500 uppercase font-black">Shipping Details</h4>
                          <p className="text-xs text-zinc-300">{customerInfo.name}</p>
                          <p className="text-xs text-zinc-300">{customerInfo.phone}</p>
                          <p className="text-xs text-zinc-300">{customerInfo.address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    {checkoutStep > 1 && (
                      <button type="button" onClick={() => setCheckoutStep(prev => prev - 1)} className="w-1/3 py-5 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all border border-zinc-800">Back</button>
                    )}
                    <button type="submit" disabled={isProcessingPayment} className="flex-1 py-5 bg-white text-black text-[11px] font-black uppercase tracking-[0.4em] hover:bg-[#0055ff] hover:text-white transition-all disabled:opacity-50">
                      {isProcessingPayment ? 'Processing_Secure_Link...' : (checkoutStep === 3 ? 'Submit_Order_Archive' : 'Continue_Relay')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Modal (Amazon-style Layout) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 lg:p-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setSelectedProduct(null); setSelectedImageIndex(0); setZoomStyle({}); }}></div>
          <div className="relative w-full max-w-[1400px] h-full max-h-[95vh] bg-white text-black overflow-hidden flex flex-col shadow-2xl rounded-none font-sans">
            
            {/* Header with close button */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white shrink-0">
              <div className="font-bold text-xl tracking-tighter uppercase">STREET<span className="text-[#0055ff]">THREADX</span></div>
              <button onClick={() => { setSelectedProduct(null); setSelectedImageIndex(0); setZoomStyle({}); }} className="text-gray-500 hover:text-black transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row overflow-y-auto no-scrollbar p-6 gap-8 bg-white flex-1">
              
              {/* Left Column: Images */}
              <div className="w-full lg:w-[40%] flex gap-4">
                {/* Thumbnails */}
                <div className="flex flex-col gap-2 w-16 shrink-0">
                  {selectedProduct.images.map((img, idx) => (
                    <button 
                      key={idx} 
                      onMouseEnter={() => setSelectedImageIndex(idx)}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`border-2 rounded-none overflow-hidden transition-all ${selectedImageIndex === idx ? 'border-[#0055ff] shadow-[0_0_5px_rgba(0,113,133,0.5)]' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <img src={img} className="w-full aspect-[3/4] object-cover" alt="" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                {/* Main Image */}
                <div 
                  className="flex-1 flex items-start justify-center overflow-hidden cursor-zoom-in group/zoom"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeaveZoom}
                >
                  <img 
                    src={selectedProduct.images[selectedImageIndex] || selectedProduct.images[0]} 
                    className="w-full max-w-[500px] object-contain transition-transform duration-200 ease-out" 
                    style={zoomStyle}
                    alt="" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              </div>

              {/* Middle Column: Details */}
              <div className="w-full lg:w-[40%] flex flex-col space-y-4">
                <div>
                  <a href="#" className="text-[#0055ff] hover:text-[#C7511F] hover:underline text-sm">Visit the STREET THREADX Store</a>
                  <h1 className="text-2xl font-medium text-gray-900 leading-tight mt-1">{selectedProduct.name}</h1>
                  
                  {/* Ratings */}
                  <div className="flex items-center gap-4 mt-2 border-b border-gray-200 pb-2">
                    <div className="flex items-center text-[#ffffff]">
                      {[1,2,3,4,5].map(star => (
                        <svg key={star} className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-[#0055ff] hover:text-[#C7511F] hover:underline text-sm ml-2 cursor-pointer">{filteredReviews.length} ratings</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-start gap-1">
                  <span className="text-sm mt-1">৳</span>
                  <span className="text-3xl font-medium">{selectedProduct.price.toLocaleString()}</span>
                </div>

                {/* Variations */}
                <div className="space-y-4 pt-2">
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Color: <span className="font-bold text-gray-900">{selectedColor || selectedProduct.colors[0]}</span></p>
                      <div className="flex gap-2">
                        {selectedProduct.colors.map(color => (
                          <button 
                            key={color} 
                            onClick={() => setSelectedColor(color)}
                            className={`w-10 h-10 rounded-none border transition-all overflow-hidden ${selectedColor === color ? 'border-[#0055ff] shadow-[0_0_3px_#0055ff] scale-110' : 'border-gray-300 hover:border-gray-400'}`} 
                            title={color}
                          >
                            <div className="w-full h-full" style={{ backgroundColor: getColorHex(color) }}></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-900 font-bold">Size:</p>
                      <a href="#" className="text-sm text-[#0055ff] hover:text-[#C7511F] hover:underline">Size Chart</a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map(size => (
                        <button 
                          key={size} 
                          onClick={() => setSelectedSize(size)} 
                          className={`min-w-[3rem] px-3 py-1.5 text-sm border rounded-none transition-all ${selectedSize === size ? 'border-[#0055ff] bg-[#F0F8FF] shadow-[0_0_5px_rgba(0,113,133,0.5)]' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description / About this item */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-bold text-base mb-2">About this item</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-900">
                    <li>{selectedProduct.description}</li>
                    <li>Premium quality materials for maximum comfort and durability.</li>
                    <li>Signature STREET THREADX brutalist aesthetic.</li>
                    <li>Category: {selectedProduct.category}</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Buy Box */}
              <div className="w-full lg:w-[20%]">
                <div className="border border-gray-300 rounded-none p-4 space-y-4">
                  <div className="flex items-start gap-1">
                    <span className="text-sm mt-1">৳</span>
                    <span className="text-3xl font-medium">{selectedProduct.price.toLocaleString()}</span>
                  </div>
                  
                  <div className="text-sm text-gray-900">
                    <span className="text-[#0055ff] hover:text-[#C7511F] hover:underline cursor-pointer">FREE delivery</span> <strong>Tomorrow</strong>. Order within <span className="text-green-700">2 hrs 30 mins</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[#0055ff] hover:text-[#C7511F] hover:underline cursor-pointer text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Deliver to Dhaka
                  </div>

                  <div className="text-lg text-green-700 font-medium">
                    In Stock
                  </div>

                  <div className="flex items-center gap-2 mb-4 mt-2">
                    <label className="text-sm font-medium text-gray-900 border border-gray-300 rounded-none overflow-hidden shadow-sm flex items-center bg-gray-100/50 relative">
                      <span className="px-3 text-gray-700 bg-gray-100 border-r border-gray-300 py-1.5 text-xs">Qty:</span>
                      <select 
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                        className="pl-2 pr-6 py-1.5 bg-transparent outline-none text-sm cursor-pointer appearance-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-2 flex items-center px-1 text-gray-500">
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <button 
                      disabled={addToCartState !== 'idle'}
                      onClick={() => {
                        if (!selectedSize) {
                          showToast('Please select a size first.');
                          return;
                        }
                        addToCart(selectedProduct, selectedSize, selectedColor || selectedProduct.colors?.[0], selectedQuantity, false);
                      }} 
                      className={`w-full py-4 font-black uppercase tracking-widest text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                        addToCartState === 'success' ? 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 text-white' 
                        : addToCartState === 'adding' ? 'bg-zinc-800 border border-zinc-700 text-white opacity-80 cursor-wait'
                        : 'bg-[#0055ff] hover:bg-[#0044cc] border border-[#003399] text-white'
                      }`}
                    >
                      {addToCartState === 'adding' && (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      )}
                      {addToCartState === 'success' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      )}
                      {addToCartState === 'idle' && 'Add to Vault'}
                      {addToCartState === 'adding' && 'Processing...'}
                      {addToCartState === 'success' && 'Added'}
                    </button>
                    <button 
                      onClick={() => {
                        if (!selectedSize) {
                          showToast('Please select a size first.');
                          return;
                        }
                        addToCart(selectedProduct, selectedSize, selectedColor || selectedProduct.colors?.[0], selectedQuantity, true);
                        setSelectedProduct(null);
                        setSelectedImageIndex(0);
                        setIsCartOpen(true);
                        setIsCheckoutOpen(true);
                      }} 
                      className="w-full py-4 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-black uppercase tracking-widest text-sm transition-colors"
                    >
                      Instant Checkout
                    </button>
                    <button 
                      onClick={() => toggleWishlist(selectedProduct)} 
                      className="w-full py-4 bg-transparent border border-gray-300 hover:border-black text-black font-black uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${wishlist.some(p => p.id === selectedProduct.id) ? 'fill-black text-black' : 'fill-transparent text-black'}`} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {wishlist.some(p => p.id === selectedProduct.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 pt-2">
                    <div className="flex justify-between">
                      <span>Ships from</span>
                      <span className="text-gray-900">STREET THREADX</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sold by</span>
                      <span className="text-[#0055ff] hover:text-[#C7511F] hover:underline cursor-pointer">STREET THREADX</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Returns</span>
                      <span className="text-[#0055ff] hover:text-[#C7511F] hover:underline cursor-pointer">30-day refund/replacement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Reviews Section */}
              <div className="w-full border-t border-gray-200 pt-10 mt-10">
                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Review Summary */}
                  <div className="w-full lg:w-1/3 space-y-6">
                    <h2 className="text-2xl font-bold">Customer Reviews</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-[#ffffff]">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-lg font-medium">{averageRating.toFixed(1)} out of 5</span>
                    </div>
                    <p className="text-sm text-gray-500">{filteredReviews.length} global ratings</p>
                    
                    {/* Review Form */}
                    <div className="bg-gray-50 p-6 rounded-none border border-gray-200 space-y-4">
                      <h3 className="font-bold text-lg">Write a Review</h3>
                      
                      {customerInfo?.email ? (
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold mb-1">Overall Rating</label>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewReviewRating(star)}
                                    className={`transition-all transform hover:scale-110 ${star <= newReviewRating ? 'text-[#ffffff]' : 'text-gray-300'}`}
                                  >
                                    <svg className="w-8 h-8 fill-current" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                              <span className={`text-sm font-black uppercase italic tracking-tighter animate-in fade-in slide-in-from-left-2 duration-300 ${getRatingLabel(newReviewRating).color}`}>
                                {getRatingLabel(newReviewRating).text}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold mb-1">Display Name</label>
                            <input 
                              type="text"
                              value={customerInfo.name}
                              disabled
                              className="w-full p-2 border border-gray-300 bg-gray-100 rounded-none text-gray-500 text-sm cursor-not-allowed"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Posting publicly as this name.</p>
                          </div>

                          <div>
                            <div className="flex justify-between items-end mb-1">
                              <label className="block text-sm font-bold">Add a written review</label>
                              <span className={`text-[10px] font-mono ${newReviewComment.length > COMMENT_LIMIT ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                {newReviewComment.length}/{COMMENT_LIMIT}
                              </span>
                            </div>
                            <textarea 
                              value={newReviewComment}
                              onChange={(e) => setNewReviewComment(e.target.value)}
                              maxLength={COMMENT_LIMIT}
                              placeholder="What did you like or dislike?"
                              className={`w-full p-3 border rounded-none focus:ring-1 outline-none text-sm min-h-[120px] transition-all ${newReviewComment.length >= COMMENT_LIMIT ? 'border-orange-500 focus:ring-orange-500' : 'border-gray-300 focus:border-[#0055ff] focus:ring-[#0055ff]'}`}
                              required
                            />
                            {newReviewComment.length > COMMENT_LIMIT && (
                              <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-tighter">Character limit exceeded</p>
                            )}
                          </div>

                          <button 
                            type="submit"
                            disabled={isSubmittingReview || newReviewComment.length > COMMENT_LIMIT || !newReviewComment}
                            className="w-full py-2 bg-[#0055ff] hover:bg-[#0044cc] border border-[#003399] rounded-none shadow-sm text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                          >
                            {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">Please log in to share your thoughts with the community.</p>
                          <button 
                            onClick={() => {
                              setSelectedProduct(null);
                              setCurrentView(ViewState.CUSTOMER_LOGIN);
                            }}
                            className="w-full py-2 bg-[#0055ff] hover:bg-[#0044cc] border border-[#003399] rounded-none shadow-sm text-sm font-medium transition-colors text-white uppercase tracking-widest font-black"
                          >
                            Log in to Review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="flex-1 space-y-8">
                    <h3 className="text-xl font-bold border-b border-gray-200 pb-4">Top reviews from Bangladesh</h3>
                    {filteredReviews.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 italic">No reviews yet. Be the first to review this item!</div>
                    ) : (
                      <div className="space-y-8">
                        {filteredReviews.map(review => (
                          <div key={review.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-none bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                {review.author[0]}
                              </div>
                              <span className="text-sm font-medium">{review.author}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center text-[#ffffff]">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs font-bold text-gray-900">Verified Purchase</span>
                            </div>
                            <p className="text-xs text-gray-500">Reviewed on {review.date}</p>
                            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView !== ViewState.ADMIN_DASHBOARD && (
        <Footer 
          onSupportNavigate={handleSupportNavigate} 
          onAdminNavigate={handleAdminNavigate} 
          socialSettings={socialSettings}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {currentView !== ViewState.ADMIN_DASHBOARD && (
        <div className="md:hidden fixed bottom-0 w-full z-50 bg-black/90 backdrop-blur-md border-t border-zinc-800 pb-safe">
          <div className="flex justify-around items-center h-16 px-4">
            <button 
              onClick={() => { setCurrentView(ViewState.STORE); setShopFilter('ALL'); window.scrollTo(0,0); }}
              className={`flex flex-col items-center gap-1 p-2 ${currentView === ViewState.STORE && shopFilter === 'ALL' ? 'text-[#0055ff]' : 'text-zinc-500 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[8px] font-black uppercase">Home</span>
            </button>
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[8px] font-black uppercase">Search</span>
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative flex flex-col items-center gap-1 p-2 transition-all duration-300 ${cartBounce ? 'scale-125 text-[#0055ff]' : 'text-zinc-500 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cart.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-[#0055ff] rounded-none"></span>
              )}
              <span className="text-[8px] font-black uppercase">Cart</span>
            </button>
            <button 
              onClick={() => setCurrentView(ViewState.CUSTOMER_LOGIN)}
              className={`flex flex-col items-center gap-1 p-2 ${currentView === ViewState.CUSTOMER_LOGIN ? 'text-[#0055ff]' : 'text-zinc-500 hover:text-white'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[8px] font-black uppercase">Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget 
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onSendMessage={(text) => handleSendMessage(text)}
        session={chatSessions.find(s => s.customerEmail === (customerInfo.email || 'guest_session'))}
        customerName={customerInfo.name || 'Guest'}
        isTyping={isAiTyping}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-black text-white px-6 py-4 border border-zinc-500 shadow-2xl animate-in slide-in-from-right fade-in pointer-events-auto">
            <p className="text-xs font-black uppercase">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
