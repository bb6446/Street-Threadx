

import ReactGA from 'react-ga4';
import { Facebook, Instagram, Linkedin, Twitter, ArrowRightLeft, X, Share2, Link, Ruler, ArrowUp, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState, Product, CartItem, Review, AdminRole, AdminUser, LogEntry, SocialSettings, SocialReferral, Order, DiscountCode, Customer, ChatSession, ChatMessage, Expense } from './types';
import { MOCK_PRODUCTS, ACCENT_COLOR } from './constants';
import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
import { LiveEditorPanel } from './components/LiveEditorPanel';
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const CustomerProfile = lazy(() => import('./components/CustomerProfile'));
import { OrderTracking } from './components/OrderTracking';
import { ChatWidget } from './components/ChatWidget';
import { ProductComparisonModal } from './components/ProductComparisonModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { generateChatAgentResponse } from './services/geminiService';
import { chatService } from './services/chatService';
import { expenseService } from './services/expenseService';
import { auth, db, storage, signInWithGoogle, logOut, setupRecaptcha, signInWithPhone } from './firebase';
import { onAuthStateChanged, ConfirmationResult } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { deductStockFirebase } from './services/inventoryService';
import { subscribeToProducts, seedProductsIfEmpty } from './services/productService';
import { subscribeToOrders, saveOrderToFirestore, updateOrderStatus } from './services/orderService';
import { subscribeToCustomers, saveCustomerToFirestore, updateCustomer } from './services/customerService';
import { settingsService } from './services/settingsService';
import { adminService } from './services/adminService';
import { StoreSettingsProvider, useStoreSettings } from './hooks/useStoreSettings';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { useDocumentMetadata } from './hooks/useDocumentMetadata';
import { NewsletterSubscription } from './components/NewsletterSubscription';
import firebaseAppletConfig from './firebase-applet-config.json';

// --- Color Mapping Helper ---
const COLOR_MAP: Record<string, string> = {
  'Jet Black': '#0a0a0a',
  'Electric Blue': '#0055ff',
  'Vintage White': '#f5f5f5',
  'Onyx': '#353839',
  'Stealth Grey': '#555555',
  'Black': '#000000',
};

// --- Custom Behance Logo ---
const BehanceIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    className={className}
  >
    <path d="M8.2 5h-4.2v14h4.5c2.3 0 4.1-1.3 4.1-3.6 0-1.8-1-2.9-2.6-3.3 1.2-.5 2-1.6 2-3 0-2.3-1.6-4.1-3.8-4.1zm-2.2 2.3h1.8c1.1 0 1.8.6 1.8 1.6s-.7 1.6-1.8 1.6h-1.8v-3.2zm2 9.5h-2v-3.5h1.9c1.2 0 1.9.7 1.9 1.7 0 1.1-.7 1.8-1.8 1.8zm11-.3c-1.3 0-2.3-.9-2.4-2.2h5c0-2.4-1.5-4.4-4-4.4s-4.2 2-4.2 4.6c0 2.8 1.8 4.7 4.5 4.7 2 0 3.6-.9 4.1-2.4l-1.8-.7c-.3.7-.8 1-1.2 1zm-1.5-4.2h-2.4c.1-1 .7-1.5 1.2-1.5s1.1.5 1.2 1.5zm-2.8-4.6h3.4V10h-3.4V7.7z"/>
  </svg>
);

const CountdownTimer: React.FC<{ endTime: string; title: string }> = ({ endTime, title }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endTime) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return null;

  return (
    <div className="flex flex-col gap-2 mt-4 animate-in fade-in slide-in-from-left-4 duration-1000">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">{title} ENDS IN</span>
      </div>
      <div className="flex gap-4">
        {[
          { label: 'D', value: timeLeft.days },
          { label: 'H', value: timeLeft.hours },
          { label: 'M', value: timeLeft.minutes },
          { label: 'S', value: timeLeft.seconds }
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="bg-black/80 backdrop-blur-md border border-zinc-800 w-12 h-12 flex items-center justify-center">
              <span className="text-xl font-black heading-font text-white">{String(item.value).padStart(2, '0')}</span>
            </div>
            <span className="text-[8px] font-black text-zinc-500 mt-1 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  socialSettings?: SocialSettings;
  isBannerEnabled?: boolean;
  cartBounce?: boolean;
  customerInfo?: { name: string, email: string };
  onLogoutCustomer?: () => void;
}> = ({ cartCount, setView, toggleCart, toggleSearch, currentView, onNavigate, activeFilter, socialSettings: propSocialSettings, isBannerEnabled: propIsBannerEnabled, cartBounce, customerInfo, onLogoutCustomer }) => {
  const hookSettings = useStoreSettings();
  const socialSettings = propSocialSettings || hookSettings.socialSettings;
  const isBannerEnabled = propIsBannerEnabled !== undefined ? propIsBannerEnabled : (socialSettings.announcementBanner?.enabled ?? false);
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
    <nav 
        className={`fixed w-full z-50 backdrop-blur-md border-b border-zinc-800 transition-all ${isBannerEnabled && currentView === ViewState.STORE ? 'top-7' : 'top-0'} ${!socialSettings.appearance?.headerColor ? 'bg-black/80' : ''}`}
        style={{ ...(socialSettings.appearance?.headerColor ? { backgroundColor: socialSettings.appearance.headerColor + 'CC' } : {}) } as React.CSSProperties}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onNavigate('ALL', false)}
            className="text-2xl font-black heading-font tracking-tighter hover:opacity-80 transition-opacity uppercase flex flex-row items-center gap-2"
          >
            {socialSettings.appearance?.siteLogoUrl ? (
                <img 
                  loading="lazy"
                  src={socialSettings.appearance.siteLogoUrl} 
                  alt="Logo" 
                  style={{ 
                    height: socialSettings.appearance.siteLogoHeight ? `${socialSettings.appearance.siteLogoHeight}px` : '32px',
                    width: socialSettings.appearance.siteLogoWidth ? `${socialSettings.appearance.siteLogoWidth}px` : 'auto'
                  }}
                  className="object-contain" 
                />
            ) : null}
            {!socialSettings.appearance?.siteLogoUrl && <>STREET<span className="text-[#0055ff]">THREADX</span></>}
          </button>
          <span onClick={handleSecretClick} className="text-[#0055ff] text-2xl font-black heading-font cursor-default select-none">.</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest relative group">
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
              <div className="space-y-4">
                <h4 className="text-[#0055ff] font-black text-[10px] tracking-widest border-b border-zinc-800 pb-2">EXPERIENCE</h4>
                <ul className="space-y-3">
                  <li><button onClick={() => onNavigate('LOOKBOOK', true)} className="text-zinc-400 hover:text-white transition-colors">Digital Lookbook</button></li>
                </ul>
              </div>
              <div className="col-span-1 relative aspect-video bg-zinc-900 border border-zinc-800 flex flex-col justify-end p-6 cursor-pointer group/promo overflow-hidden" onClick={() => onNavigate('NEW_ARRIVALS', true)}>
                <img loading="lazy" src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fm=webp&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/promo:scale-105 transition-transform duration-700" alt="Promo" />
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
            {socialSettings.visibility?.facebook && (
              <a href={socialSettings.facebook} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Facebook size={16} />
              </a>
            )}
            {socialSettings.visibility?.instagram && (
              <a href={socialSettings.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {socialSettings.visibility?.linkedin && (
              <a href={socialSettings.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Linkedin size={16} />
              </a>
            )}
            {socialSettings.visibility?.x && (
              <a href={socialSettings.x} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Twitter size={16} />
              </a>
            )}
            {socialSettings.visibility?.behance && socialSettings.behance && (
              <a href={socialSettings.behance} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <BehanceIcon size={16} />
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

          <button onClick={() => setView(ViewState.TRACK_ORDER)} className={`p-2 transition-colors hidden md:block ${currentView === ViewState.TRACK_ORDER ? 'text-[#0055ff]' : 'text-zinc-400 hover:text-white'}`} title="Track Order">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
  showToast: (message: string) => void;
  socialSettings?: SocialSettings;
  isLiveEditMode?: boolean;
  selectedLiveElement?: 'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null;
  setSelectedLiveElement?: React.Dispatch<React.SetStateAction<'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null>>;
}> = ({ onSupportNavigate, onAdminNavigate, showToast, socialSettings: propSocialSettings, isLiveEditMode: propIsLiveEditMode, selectedLiveElement: propSelectedLiveElement, setSelectedLiveElement: propSetSelectedLiveElement }) => {
  const hookSettings = useStoreSettings();
  const socialSettings = propSocialSettings || hookSettings.socialSettings;
  const isLiveEditMode = propIsLiveEditMode !== undefined ? propIsLiveEditMode : hookSettings.isLiveEditMode;
  const selectedLiveElement = propSelectedLiveElement !== undefined ? propSelectedLiveElement : hookSettings.selectedLiveElement;
  const setSelectedLiveElement = propSetSelectedLiveElement || hookSettings.setSelectedLiveElement;
  return (
    <footer 
        id="app-footer"
        className={`border-t border-zinc-800 py-16 px-6 mt-20 ${!socialSettings.appearance?.footerColor ? 'bg-zinc-950' : ''}`}
        style={{ ...(socialSettings.appearance?.footerColor ? { backgroundColor: socialSettings.appearance.footerColor } : {}) } as React.CSSProperties}
    >
      <div className="max-w-7xl mx-auto">
        <NewsletterSubscription />
        
        <div id="footer-links-grid" className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-4">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <h3 className="text-3xl font-black heading-font italic uppercase">STREET THREADX.</h3>
          <div 
            onClick={() => {
              if (isLiveEditMode && setSelectedLiveElement) {
                setSelectedLiveElement('aboutText');
              }
            }}
            className={`relative group/live transition-all ${
              isLiveEditMode 
                ? `cursor-pointer ring-2 ${selectedLiveElement === 'aboutText' ? 'ring-[#0055ff] bg-zinc-900/60' : 'ring-transparent hover:ring-[#0055ff]/50 bg-black/10 hover:bg-black/30'} p-4 -ml-4 rounded-sm` 
                : ''
            }`}
          >
            {isLiveEditMode && (
              <span className="absolute top-1 left-2 text-[8px] uppercase tracking-wider bg-[#0055ff] text-white px-1 font-mono font-bold z-20">Edit About Text</span>
            )}
            <p className="text-zinc-500 max-w-sm" style={{ color: socialSettings.siteContent?.aboutTextColor || undefined }}>
              {socialSettings.siteContent?.aboutText || "Premium streetwear engineered for the modern nomad. Quality materials, minimalist design, maximum impact."}
            </p>
          </div>
          <div className="flex gap-4">
            {socialSettings.visibility?.facebook && (
              <a href={socialSettings.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Facebook size={18} />
              </a>
            )}
            {socialSettings.visibility?.instagram && (
              <a href={socialSettings.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Instagram size={18} />
              </a>
            )}
            {socialSettings.visibility?.linkedin && (
              <a href={socialSettings.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Linkedin size={18} />
              </a>
            )}
            {socialSettings.visibility?.x && (
              <a href={socialSettings.x} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <Twitter size={18} />
              </a>
            )}
            {socialSettings.visibility?.behance && socialSettings.behance && (
              <a href={socialSettings.behance} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-none border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-[#0055ff] hover:border-[#0055ff] transition-all">
                <BehanceIcon size={18} />
              </a>
            )}
          </div>
          
          <div className="pt-6 mt-8 border-t border-zinc-900/50">
            <div className="flex items-center gap-3 mb-4">
              <Share2 size={14} className="text-[#0055ff]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Share_the_Brand</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')} 
                className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-all"
                title="Share on Facebook"
              >
                <Facebook size={16} />
              </button>
              <button 
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out this awesome streetwear!')}`, '_blank')} 
                className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-black hover:border-black transition-all"
                title="Share on X"
              >
                <Twitter size={16} />
              </button>
              <button 
                onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')} 
                className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#0A66C2] hover:border-[#0A66C2] transition-all"
                title="Share on LinkedIn"
              >
                <Linkedin size={16} />
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Store link copied to clipboard!');
                }} 
                className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all focus:ring-1 focus:ring-[#0055ff] outline-none"
                title="Copy Store Link"
              >
                <Link size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-bold tracking-widest text-[#0055ff]">Support</h4>
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
          <h4 className="text-xs font-bold tracking-widest text-[#0055ff]">Staff</h4>
          <p className="text-xs text-zinc-500 uppercase tracking-tighter">Authorized access only.</p>
          <button 
            onClick={onAdminNavigate}
            className="bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase px-6 py-3 tracking-[0.3em] hover:bg-white hover:text-black transition-all"
          >
            System Admin
          </button>
        </div>
      </div>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  return (
    <StoreSettingsProvider>
      <AppContent />
    </StoreSettingsProvider>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.STORE);
  const {
    socialSettings,
    setSocialSettings,
    isLiveEditMode,
    setIsLiveEditMode,
    selectedLiveElement,
    setSelectedLiveElement,
    saveSettings
  } = useStoreSettings();

  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
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
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  // Auto-hide rotate cue
  useEffect(() => {
    if (showRotateCue) {
      const timer = setTimeout(() => setShowRotateCue(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showRotateCue]);

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toasts, setToasts] = useState<{id: string, message: React.ReactNode | ((dismiss: () => void) => React.ReactNode), type?: 'default' | 'quickBuy'}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [supportTopic, setSupportTopic] = useState<string>('Shipping');
  const [customizerProduct, setCustomizerProduct] = useState<string>('');
  const [customizerColor, setCustomizerColor] = useState<string>('#121214');
  const [customizerGraphic, setCustomizerGraphic] = useState<string>('ThreatX Shield');
  const [customizerText, setCustomizerText] = useState<string>('TERM_X');
  const [customizerTextColor, setCustomizerTextColor] = useState<string>('#0055ff');
  const [customizerPrintPosition, setCustomizerPrintPosition] = useState<'Chest' | 'Back'>('Chest');
  const [customizerActiveScale, setCustomizerActiveScale] = useState<number>(1);
  const [shopFilter, setShopFilter] = useState<string>('ALL');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number>(50000); // Max price allowed
  const [sortType, setSortType] = useState<string>('Newest');
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const isAlreadyAdded = prev.find(p => p.id === product.id);
      if (isAlreadyAdded) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) {
        showToast('Comparison limit reached (Max 3 items)');
        return prev;
      }
      showToast(`${product.name} added to comparison`);
      return [...prev, product];
    });
  };
  
  // Dynamically update document <title> and meta tags based on current view, product, or category
  useDocumentMetadata(selectedProduct || quickViewProduct, shopFilter, currentView, socialSettings);
  
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
    paymentMethod: 'bKash' as 'COD' | 'bKash' | 'Nagad' | 'Rocket' | 'Credit Card' | 'Debit Card',
    trxId: '',
    senderNumber: '',
    transactionScreenshot: '',
    isBillingSame: true,
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    notes: '',
  });
  
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotUploadProgress, setScreenshotUploadProgress] = useState(0);
  const [screenshotSize, setScreenshotSize] = useState('');
  const [screenshotName, setScreenshotName] = useState('');

  // Customer Verification States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifyingPhoneStr, setVerifyingPhoneStr] = useState<string>('');

  // Google Auth Diagnostics States
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<{
    status: 'IDLE' | 'SUCCESS' | 'ERROR';
    code?: string;
    message?: string;
    stack?: string;
    authDomain?: string;
    currentOrigin?: string;
    checks: {
      authDomainPresent: boolean;
      domainMatch: boolean;
      isInIframe: boolean;
    };
  } | null>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  // Chat State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeChatEmail, setActiveChatEmail] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAiRequestTimeRef = useRef<number>(0);

  // Admin & Security States
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [adminLogs, setAdminLogs] = useState<LogEntry[]>([]);
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([]);
  const [isSeedingAdmins, setIsSeedingAdmins] = useState(false);

  // Subscribe to persistent admins
  useEffect(() => {
    const unsubscribe = adminService.subscribeToAdmins((admins) => {
      setAdminUsersList(admins);
      
      // Seed essential super admins if they don't exist
      if (!isSeedingAdmins) {
        const essentialAdmins: AdminUser[] = [
          { id: 'admin-main', username: 'admin', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'admin7788' },
          { id: 'root-main', username: 'root', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'root123' },
          { id: 'bb-main', username: 'bb6446', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'bb6446' }
        ];
        
        const missingAdmins = essentialAdmins.filter(ea => !admins.some(a => a.username === ea.username));
        
        if (missingAdmins.length > 0) {
          setIsSeedingAdmins(true);
          Promise.all(missingAdmins.map(adminService.saveAdmin))
            .then(() => setAdminLogs(p => [{ 
              id: Math.random().toString(36).substr(2, 9), 
              timestamp: new Date().toLocaleTimeString(), 
              user: 'SYSTEM', 
              action: `PROVISIONED_${missingAdmins.length}_ESSENTIAL_OPERATORS`, 
              role: AdminRole.SUPER_ADMIN 
            }, ...p]))
            .catch(console.error)
            .finally(() => setIsSeedingAdmins(false));
        }
      }
    });
    return () => unsubscribe();
  }, []);
  const [loginError, setLoginError] = useState('');

  // --- Chat Identity Helper ---
  const getChatIdentity = () => {
    // 1. Logged in customer email
    if (customerInfo.email) return customerInfo.email;
    // 2. Firebase Auth User (Email or UID)
    if (auth.currentUser) {
      return auth.currentUser.email || `guest_${auth.currentUser.uid}`;
    }
    // 3. Persistent Local Guest ID
    return localStorage.getItem('street_threadx_guest_id') || 'guest_fallback';
  };

  const chatIdentity = useMemo(() => getChatIdentity(), [customerInfo.email, auth.currentUser?.uid, auth.currentUser?.email]);
  const chatSessionId = useMemo(() => chatIdentity.replace(/[.@]/g, '_'), [chatIdentity]);

  // Sync Chat Sessions from Firestore (Admin)
  useEffect(() => {
    // ONLY admins should subscribe to the full list of sessions
    if (!adminUser) return;
    
    const unsubscribe = chatService.subscribeToSessions((sessions) => {
      setChatSessions(prev => {
        // We MUST merge the new session metadata with any existing messages we've loaded
        // This prevents the admin UI from "losing" the message history when a session updates
        return sessions.map(newSession => {
          const existing = prev.find(s => s.id === newSession.id);
          return {
            ...newSession,
            messages: (existing?.messages && existing.messages.length > 0) 
              ? existing.messages 
              : (newSession.messages || [])
          };
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [adminUser]);

  // --- GOOGLE SIGN-IN & OAUTH DIAGNOSTIC INTROSPECTION ---
  useEffect(() => {
    const authDomain = firebaseAppletConfig.authDomain;
    const currentOrigin = window.location.origin;

    console.group("%c🔒 Google Auth & Identity Verification Setup Check", "color: #0055ff; font-weight: bold; font-size: 13px;");
    console.log("%cThis automated diagnostic checks your Google Identity/Firebase alignment.", "color: #888;");
    
    if (!authDomain) {
      console.error("❌ DIAGNOSTIC FAILURE: 'authDomain' is missing or undeclared in firebase-applet-config.json!");
    } else {
      console.info(`%c1. Active Firebase authDomain: %c${authDomain}`, "color: #333; font-weight: bold;", "color: #0077ff; font-family: monospace;");
      console.info(`%c2. Host Client Origin: %c${currentOrigin}`, "color: #333; font-weight: bold;", "color: #0077ff; font-family: monospace;");

      const expectedJSOrigin = `https://${authDomain}`;
      const expectedRedirectURI = `https://${authDomain}/__/auth/handler`;

      console.log(
        `%c\n--- REQUIREMENTS FOR GOOGLE CLOUD CONSOLE ---` +
        `\nTo resolve 'Google Verification Failed' issues, your OAuth Web Client Credentials` +
        `\nin Google Cloud Console (https://console.cloud.google.com/) MUST exactly align:` +
        `\n\n📌 1. [Authorized JavaScript Origins] MUST contain:` +
        `\n   👉   ${expectedJSOrigin}` +
        `\n   👉   ${currentOrigin}` +
        `\n\n📌 2. [Authorized Redirect URIs] MUST contain:` +
        `\n   👉   ${expectedRedirectURI}` +
        `\n` +
        `\n💡 Note: Google utilizes internal referrer checks on Authorized Origins.` +
        `\nIf you initiate verification inside an iframe or local workspace environment,` +
        `\nmake sure both the parent container host and the iframe target domain are whitelist additions.`,
        "color: #111; line-height: 1.5; font-family: sans-serif;"
      );
    }
    console.groupEnd();
  }, []);

  // Initialize Firebase Auth
  useEffect(() => {
    // Generate a persistent guest ID for chat if auth fails or is disabled
    if (!localStorage.getItem('street_threadx_guest_id')) {
      localStorage.setItem('street_threadx_guest_id', `guest_${Math.random().toString(36).substring(2, 11)}`);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If we're not signed in, we try anonymous sign-in here to ensure
      // guest interactions (like chat) have a valid UID for security rules.
      // However, we catch the error if the developer hasn't enabled Anonymous Auth in the console.
      if (!user) {
        // We rely on chatService's ensureAuth instead of calling it here repeatedly
        console.log("No authenticated user yet.");
      } else {
        console.log("Firebase Auth established:", user.isAnonymous ? "Guest" : user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync messages and presence for the active session (Customer Side)
  const [sessionInitialized, setSessionInitialized] = useState<string | null>(null);

  useEffect(() => {
    // If not an admin, we only care about our own session
    if (adminUser) return;
    
    if (isChatOpen && chatSessionId) {
      let isMounted = true;

      const initSession = async () => {
        try {
          const finalName = customerInfo.name || 'GUEST_CONTACT';
          await chatService.getOrCreateSession(chatIdentity, finalName);
          if (isMounted) setSessionInitialized(chatSessionId);
        } catch (err) {
          console.error("Failed to initialize chat session", err);
        }
      };
      
      initSession();

      return () => {
        isMounted = false;
        setSessionInitialized(null);
      };
    }
  }, [isChatOpen, chatIdentity, chatSessionId, adminUser]);

  useEffect(() => {
    if (!sessionInitialized || adminUser) return;

    const sessionId = sessionInitialized;
    
    // Update presence
    chatService.updatePresence(sessionId, true);
    
    const unsubscribeSession = chatService.subscribeToSession(sessionId, (session) => {
      if (session) {
        setChatSessions(prev => {
          const index = prev.findIndex(s => s.id === sessionId);
          if (index > -1) {
            const next = [...prev];
            // Merge session data while preserving messages
            const existingMessages = next[index].messages || [];
            next[index] = { 
              ...next[index], 
              ...session, 
              messages: (session.messages?.length ? session.messages : existingMessages) 
            };
            return next;
          }
          return [...prev, { ...session, messages: [] }];
        });
      }
    });

    const unsubscribeMessages = chatService.subscribeToMessages(sessionId, (messages) => {
      setChatSessions(prev => {
        const index = prev.findIndex(s => s.id === sessionId);
        if (index === -1) {
          // If session doesn't exist in local state yet, we can't add messages to it
          // But it SHOULD exist because subscribeToSession would have added it
          return prev;
        }
        const next = [...prev];
        next[index] = { ...next[index], messages };
        return next;
      });
    });

    const presenceInterval = setInterval(() => {
      chatService.updatePresence(sessionId, true);
    }, 30000);

    return () => {
      unsubscribeSession();
      unsubscribeMessages();
      clearInterval(presenceInterval);
      chatService.updatePresence(sessionId, false);
    };
  }, [sessionInitialized, adminUser]);

  useEffect(() => {
    const unsubscribe = adminService.subscribeToAdmins(async (admins) => {
      // NOTE: Only SUPER_ADMIN can write to admins, so we only seed if we are a SUPER_ADMIN.
      if (admins.length === 0 && adminUser?.role === AdminRole.SUPER_ADMIN) {
        // Seed default admins if collection is empty
        const defaults = [
          { id: '1', username: 'root', role: AdminRole.SUPER_ADMIN, lastLogin: '', password: 'root123' },
          { id: '2', username: 'editor', role: AdminRole.EDITOR, lastLogin: '', password: 'edit123' },
          { id: '3', username: 'support', role: AdminRole.SUPPORT, lastLogin: '', password: 'sup123' },
          { id: '4', username: 'bb6446', role: AdminRole.SUPER_ADMIN, lastLogin: '', password: 'bb6446' }
        ];
        for (const admin of defaults) {
          await adminService.saveAdmin(admin as AdminUser);
        }
      } else {
        setAdminUsersList(admins);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (text: string, image?: string, isAdmin: boolean = false, targetEmail?: string, targetSessionId?: string) => {
    let sessionId = targetSessionId;
    let emailToUse = isAdmin ? targetEmail : chatIdentity;
    
    // Fallback for missing identity
    if (!emailToUse && !isAdmin && !sessionId) {
      console.warn("SEND_SIGNAL_ABORTED: No valid identity found. Using emergency fallback.");
      emailToUse = `guest_emergency_${Date.now()}`;
    }

    // Determine sessionId
    if (!sessionId) {
      if (emailToUse) {
        sessionId = emailToUse.replace(/[.@]/g, '_');
      } else {
        // Ultimate fallback if still no sessionId and it's an admin message without targetEmail
        console.error("SEND_SIGNAL_ABORTED: Cannot determine sessionId for admin message.");
        return;
      }
    }
    
    // Ensure session exists. If it's admin, we just update the admin part if valid
    if (!isAdmin || emailToUse) {
      await chatService.getOrCreateSession(emailToUse || sessionId, isAdmin ? 'ADMIN' : (customerInfo.name || 'GUEST'));
    }

    const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      senderId: isAdmin ? 'admin-1' : (auth.currentUser?.uid || 'customer-1'),
      senderName: isAdmin ? 'ADMIN' : (customerInfo.name || auth.currentUser?.displayName || 'GUEST'),
      text,
      image,
      isAdmin
    };

    await chatService.sendMessage(sessionId, newMessage);

    if (!isAdmin) {
      if (aiResponseTimeoutRef.current) {
        clearTimeout(aiResponseTimeoutRef.current);
      }

      setIsAiTyping(true);
      const currentIdentity = chatIdentity;
      const currentSessionId = sessionId;
      const currentText = text;
      const currentImage = image;
      
      aiResponseTimeoutRef.current = setTimeout(async () => {
        // Rate limiting logic: Check last request time
        const now = Date.now();
        if (now - lastAiRequestTimeRef.current < 2000) {
          console.warn("AI_RATE_LIMIT_HIT: Throttling request to preserve quota.");
          setIsAiTyping(false);
          return;
        }
        lastAiRequestTimeRef.current = now;

        try {
          // Merge customerInfo with firebase auth to ensure correct login status is passed
          const activeUserContext = {
            ...customerInfo,
            email: customerInfo.email || auth.currentUser?.email || '',
            name: customerInfo.name || auth.currentUser?.displayName || '',
          };
          const aiResponse = await generateChatAgentResponse(currentText, products, activeUserContext, cart, currentImage);
          await handleSendMessage(aiResponse, undefined, true, currentIdentity, currentSessionId);
        } catch (error: any) {
          console.error("CORE_AI_ERROR:", error);
          if (error?.message?.includes('429') || error?.status === 429) {
             await handleSendMessage("I am currently experiencing higher than normal link traffic. Support is still operational, please standby.", undefined, true, currentIdentity, currentSessionId);
          }
        } finally {
          setIsAiTyping(false);
          aiResponseTimeoutRef.current = null;
        }
      }, 1500); // 1.5s delay to group rapid messages and provide human-like rhythm
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
  const [reviewSortType, setReviewSortType] = useState<'Recent' | 'Highest'>('Recent');
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
  // currentView is defined at top

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
    const unsubscribeProducts = subscribeToProducts((updatedProducts) => {
      setProducts(updatedProducts);
    }, !!adminUser);
    
    const unsubscribeOrders = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders);
    }, !!adminUser, customerInfo?.email);

    const unsubscribeCustomers = subscribeToCustomers((updatedCustomers) => {
      setCustomers(updatedCustomers);
    }, !!adminUser);

    const unsubscribeExpenses = expenseService.subscribeToExpenses((updatedExpenses) => {
      setExpenses(updatedExpenses);
    }, !!adminUser);

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeExpenses();
    };
  }, [adminUser, customerInfo?.email]);

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

  const cartTax = (cartSubtotal - discountAmount) * 0.05;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingCost + cartTax);

  const showToast = (message: React.ReactNode | ((dismiss: () => void) => React.ReactNode), type: 'default' | 'quickBuy' = 'default') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const addToCart = (product: Product, size: string, color?: string, quantity: number = 1, shouldOpenCart: boolean = false, isSilentQuickBuy: boolean = false) => {
    if (!size) {
      showToast('Please select a size first.');
      return;
    }

    const variant = product.variants?.find(v => v.size === size && (color ? v.color === color : true));
    const maxStock = variant ? variant.stock : product.stock;

    const existingInCart = cart.find(item => item.id === product.id && item.selectedSize === size && item.selectedColor === color);
    const requestedQty = (existingInCart ? existingInCart.quantity : 0) + quantity;

    if (requestedQty > maxStock) {
      showToast(`Cannot add to cart. Only ${maxStock} items available in stock.`);
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
        if (isSilentQuickBuy) {
          showToast(
            (dismiss) => (
              <div className="flex flex-col gap-3 relative z-50">
                {/* Header with status & close trigger */}
                <div className="flex items-center justify-between">
                  <div className="font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Asset Secured to Vault
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss();
                    }}
                    className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800/60 rounded"
                    title="Dismiss Notification"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Product spec block */}
                <div className="text-xs text-zinc-300 font-normal flex items-center gap-3 bg-black/60 p-2.5 border border-emerald-500/10 rounded-lg">
                  <img loading="lazy" src={product.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=150'} className="w-12 h-12 object-cover rounded bg-zinc-900 border border-zinc-800 shrink-0" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-black uppercase text-[10px] tracking-wider truncate block">{product.name}</div>
                    <div className="text-[9px] text-zinc-400 font-mono mt-1 flex flex-wrap items-center gap-1.5 uppercase tracking-wide">
                      <span>QTY: <strong className="text-zinc-200">{quantity}</strong></span>
                      <span className="text-zinc-600">&middot;</span>
                      <span>SIZE: <strong className="text-zinc-200">{size}</strong></span>
                      {color && (
                        <>
                          <span className="text-zinc-600">&middot;</span>
                          <span>COLOR: <strong className="text-zinc-200">{color}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive slide drawer toggle */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCartOpen(true);
                    dismiss();
                  }}
                  className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase tracking-[0.2em] text-[9px] rounded-lg transition-all flex justify-center items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] transform active:scale-[0.98]"
                >
                  View Cart / Your Vault
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ),
            'quickBuy'
          );
        } else if (shouldOpenCart) {
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
      case 'cardNumber':
        if (!value.trim()) error = 'Card Number is required.';
        else if (value.replace(/\s/g, '').length !== 16) error = 'Must be 16 digits.';
        break;
      case 'cardExpiry':
        if (!value.trim()) error = 'Expiry is required.';
        else if (!/^\d{2}\/\d{2}$/.test(value)) error = 'MM/YY format.';
        break;
      case 'cardCvc':
        if (!value.trim()) error = 'CVC is required.';
        else if (value.replace(/\D/g, '').length < 3) error = 'Min 3 digits.';
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
    } else if (field === 'cardNumber' && typeof value === 'string') {
      const cleaned = value.replace(/\D/g, '');
      const match = cleaned.match(/.{1,4}/g);
      formattedValue = match ? match.join(' ').substring(0, 19) : cleaned;
    } else if (field === 'cardExpiry' && typeof value === 'string') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 2) {
        formattedValue = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
      } else {
        formattedValue = cleaned;
      }
    } else if (field === 'cardCvc' && typeof value === 'string') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
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

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select an image under 10MB.");
      return;
    }

    const formattedSize = file.size >= 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' 
      : (file.size / 1024).toFixed(0) + ' KB';
    setScreenshotSize(formattedSize);
    setScreenshotName(file.name);
    setScreenshotUploadProgress(0);
    setIsUploadingScreenshot(true);

    try {
      const storageRef = ref(storage, `transactions/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setScreenshotUploadProgress(progress);
          }, 
          (error) => {
            reject(error);
          }, 
          () => {
            resolve();
          }
        );
      });

      const url = await getDownloadURL(uploadTask.snapshot.ref);
      
      setCustomerInfo(prev => ({ ...prev, transactionScreenshot: url }));
      setCheckoutErrors(prev => {
        const next = { ...prev };
        delete next.transactionScreenshot;
        return next;
      });
      setIsUploadingScreenshot(false);
      
      // Clear file input value to allow selecting same file again
      if (e.target) e.target.value = '';
    } catch (error) {
      console.warn("Storage upload error - falling back to client-side optimized FileReader loading:", error);
      
      // Simulate real-time progress update for client fallback experience
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 12) + 8;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setCustomerInfo(prev => ({ ...prev, transactionScreenshot: dataUrl }));
            setCheckoutErrors(prev => {
              const next = { ...prev };
              delete next.transactionScreenshot;
              return next;
            });
            setIsUploadingScreenshot(false);
            
            // Clear file input value to allow selecting same file again
            if (e.target) e.target.value = '';
          };
          reader.readAsDataURL(file);
        } else {
          setScreenshotUploadProgress(currentProgress);
        }
      }, 80);
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
    }

    if (checkoutStep === 2) {
      if (['bKash', 'Nagad', 'Rocket', 'COD'].includes(customerInfo.paymentMethod)) {
        if (!customerInfo.senderNumber.trim()) errors.senderNumber = 'Sender number is required for verification.';
        if (!customerInfo.trxId.trim()) errors.trxId = 'Transaction ID is required for verification.';
      }

      if (['Credit Card', 'Debit Card'].includes(customerInfo.paymentMethod)) {
        const cnError = validateField('cardNumber', customerInfo.cardNumber);
        if (cnError) errors.cardNumber = cnError;
        const ceError = validateField('cardExpiry', customerInfo.cardExpiry);
        if (ceError) errors.cardExpiry = ceError;
        const cvcError = validateField('cardCvc', customerInfo.cardCvc);
        if (cvcError) errors.cardCvc = cvcError;
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          customerEmail: customerInfo.email,
          shippingCost,
        }),
      });

      const data = await response.json();
      if (data.url) {
        if (data.url.includes('checkout=success')) {
          // Simulate processing time for a premium gateway feel
          showToast("Initiating Secure Payment Gateway...");
          setTimeout(() => {
            showToast("Verifying Transaction Integrity...");
            setTimeout(() => {
              showToast("Payment Authorized Successfully.");
              executeOrderLogic(true); // true means advance already paid via gateway
              setIsProcessingPayment(false);
            }, 1200);
          }, 800);
        } else {
          window.location.href = data.url;
        }
      } else {
        showToast(data.message || "Gateway connection failed. Please retry.");
        setIsProcessingPayment(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      showToast("An error occurred during gateway communication.");
      setIsProcessingPayment(false);
    }
  };

  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (customerInfo.paymentMethod === 'Credit Card' || customerInfo.paymentMethod === 'Debit Card') {
      handleStripeCheckout();
      return;
    }

    executeOrderLogic(false);
  };

  const executeOrderLogic = (isAdvanceAlreadyPaid: boolean = false) => {
    // Decision logic for advance payment
    const isCOD = customerInfo.paymentMethod === 'COD';
    
    // bKash/Nagad/Rocket/Cards: 50% Advance
    // COD: 150 BDT Advance (Delivery Charge)
    const advancePaid = isCOD ? 150 : Math.ceil(cartTotal * 0.5);
    const dueAmount = Math.max(0, cartTotal - advancePaid);
    
    // If paid via Card Gateway, it's already verified.
    // If MFS or COD, it needs manual verification.
    const finalPaymentStatus = isAdvanceAlreadyPaid ? 'ADVANCE_VERIFIED' : 'PENDING_ADVANCE';
    
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
      paymentStatus: finalPaymentStatus,
      paymentMethod: customerInfo.paymentMethod,
      ...(['bKash', 'Nagad', 'Rocket', 'COD'].includes(customerInfo.paymentMethod) && {
        transactionId: customerInfo.trxId,
        senderNumber: customerInfo.senderNumber,
        transactionScreenshot: customerInfo.transactionScreenshot
      }),
      ...(['Credit Card', 'Debit Card'].includes(customerInfo.paymentMethod) && {
        transactionId: `TXN-STR-${Math.floor(100000 + Math.random() * 900000)}`
      }),
      advancePaid: advancePaid,
      dueAmount: dueAmount,
      notes: customerInfo.notes,
      isEmailVerified: isEmailVerified,
      isPhoneVerified: isPhoneVerified,
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

    // Order Processing Unit
    const processOrder = async () => {
      try {
        setLoginError('UPLINK_STABLE: SUBMITTING ORDER...'); // Reusing login error as a status indicator briefly
        
        // Atomic stock deduction (Wait for it! MUST be done before creating order to prevent overselling on failed db commits)
        const itemsToDeduct = cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }));
        await deductStockFirebase(itemsToDeduct);

        // Save order to Firestore (Wait for it!)
        await saveOrderToFirestore(newOrder);

        // Send order confirmation email asynchronously
        fetch('/api/send-order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: newOrder })
        }).catch(err => console.error('Failed to trigger confirmation email', err));

        // Update customer records
        const existing = customers.find(c => c.email.toLowerCase() === customerInfo.email.toLowerCase());
        if (existing) {
          await updateCustomer(existing.id, {
            totalSpent: existing.totalSpent + cartTotal,
            orders: existing.orders + 1,
            lastSeen: new Date().toISOString(),
            isEmailVerified: isEmailVerified || existing.isEmailVerified,
            isPhoneVerified: isPhoneVerified || existing.isPhoneVerified,
            phone: customerInfo.phone || existing.phone
          });
        } else {
          const newCustomer: Customer = {
            id: Math.random().toString(36).substr(2, 9),
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address,
            city: customerInfo.city,
            zip: customerInfo.zip,
            totalSpent: cartTotal,
            orders: 1,
            lastSeen: new Date().toISOString(),
            isEmailVerified: isEmailVerified,
            isPhoneVerified: isPhoneVerified
          };
          await saveCustomerToFirestore(newCustomer);
        }

        if (appliedDiscount) {
          setDiscountCodes(prev => prev.map(c => c.id === appliedDiscount.id ? { ...c, usageCount: c.usageCount + 1 } : c));
        }

        setOrderComplete(true);
        setAppliedDiscount(null);
        setLoginError('');
        
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
            paymentMethod: 'bKash',
            trxId: '',
            senderNumber: '',
            transactionScreenshot: '',
            isBillingSame: true,
            cardNumber: '',
            cardExpiry: '',
            cardCvc: '',
            notes: '',
          });
        }, 3000);
      } catch (err: any) {
        console.error("CRITICAL_ORDER_FAILURE:", err);
        setLoginError(`ORDER_ERROR: ${err.message || 'DATABASE_SYNC_FAILED'}`);
        // Keep checkout open so they can try again or see error
      }
    };

    processOrder();
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('INITIATING GOOGLE SECURE HANDSHAKE...');
    try {
      const user = await signInWithGoogle();
      if (!user) {
        setLoginError('AUTH_FAILURE: CANCELLED');
        return;
      }
      
      // Look up logged in Google user's email against the Admins list in Firestore
      const mappedAdmin = adminUsersList.find(u => u.username.toLowerCase() === user.email?.toLowerCase());
      
      // Keep hardcoded fallback if they lock themselves out of Firestore
      const fallbackEmails = ["biplobnbc04@gmail.com", "parvesvai00@gmail.com"];
      const isFallback = user.email && fallbackEmails.includes(user.email.toLowerCase());

      if (mappedAdmin || isFallback) {
        const finalUser: AdminUser = {
          id: user.uid,
          username: mappedAdmin ? mappedAdmin.username : (user.email || 'Admin'),
          role: mappedAdmin ? mappedAdmin.role : AdminRole.SUPER_ADMIN,
          lastLogin: new Date().toISOString()
        };
        setAdminUser(finalUser);
        setCurrentView(ViewState.ADMIN_DASHBOARD);
        setLoginError('');
        setAdminLogs(p => [{ 
          id: Math.random().toString(36).substr(2, 9), 
          timestamp: new Date().toLocaleTimeString(), 
          user: finalUser.username, 
          action: 'SESSION_INIT', 
          role: finalUser.role 
        }, ...p]);
      } else {
        setLoginError('AUTH_FAILURE: UNAUTHORIZED ACCOUNT (GOOGLE)');
        await logOut();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('AUTH_FAILURE: GOOGLE POPUP CLOSED. PLEASE ALLOW POPUPS OR OPEN IN A NEW TAB.');
      } else if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setLoginError('GOOGLE_LOGIN_NOT_ENABLED: Please go to Firebase Console > Authentication > Sign-in method, click "Add new provider", select Google, and enable it.');
      } else {
        setLoginError(`AUTH_FAILURE: ${err.message || 'ACCESS DENIED'}. TIP: If using an iframe preview, try clicking "Open in New Tab" at the top right.`);
      }
    }
  };

  // Customer Verifications
  const handleVerifyEmailWithGoogle = async () => {
    console.log("handleVerifyEmailWithGoogle transaction triggered by customer checkout verification flow.");
    try {
      const user = await signInWithGoogle();
      console.log("Customer-side Firebase signInWithGoogle completed in checkout. Returned User Object:", user);
      
      if (user) {
        console.log("User verification values parsed:", {
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          uid: user.uid
        });
      } else {
        console.warn("User object was falsy or undefined after signInWithGoogle");
      }

      if (user && user.email) {
        setCustomerInfo(prev => ({ ...prev, email: user.email!, name: user.displayName || prev.name }));
        setIsEmailVerified(true);
        const toasts = [{id: Math.random().toString(), message: 'Email Verified via Google'}];
        setToasts(toasts);
        console.log("Verification state set successfully! IsEmailVerified: true");
      } else {
        console.error("Verification error: Signed in user has no active or associated email address.");
        const toasts = [{id: Math.random().toString(), message: 'Google verification failed: Missing Email'}];
        setToasts(toasts);
      }
    } catch (error: any) {
      console.error("handleVerifyEmailWithGoogle catch block triggered. Raw error details:", error);
      console.error("Error Code: ", error?.code);
      console.error("Error Message: ", error?.message);
      console.error("Error Stack: ", error?.stack);

      let msg = `Verification Failed: ${error?.code || 'AUTH_ERR'}`;
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized domain')) {
        msg = "Domain not authorized. Please add this URL to Firebase Console > Authentication > Settings > Authorized domains.";
      }
      
      const toasts = [{id: Math.random().toString(), message: msg}];
      setToasts(toasts);
    }
  };

  const handleGoogleAuthDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setShowDiagnosticModal(true);
    
    const authDomain = firebaseAppletConfig.authDomain;
    const currentOrigin = window.location.origin;
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch (e) {
      isInIframe = true;
    }

    const initialReport = {
      status: 'IDLE' as const,
      authDomain,
      currentOrigin,
      checks: {
        authDomainPresent: !!authDomain,
        domainMatch: authDomain ? currentOrigin.includes(authDomain) : false,
        isInIframe
      }
    };
    setDiagnosticReport(initialReport);

    console.group("%c⚡ Interactive Google Auth Diagnostic Sequence Started", "color: #ff9900; font-weight: bold; font-size: 13px;");
    console.info("Target Auth Domain: ", authDomain);
    console.info("Host Client Origin: ", currentOrigin);
    console.info("Iframe Sandbox Context: ", isInIframe ? "YES (Sandbox Restricted)" : "NO (Direct Root Context)");

    try {
      const user = await signInWithGoogle();
      console.log("Diagnostic Google Sign-In SUCCESS:", user);
      setDiagnosticReport({
        ...initialReport,
        status: 'SUCCESS',
        message: 'Google Sign-In completed flawlessly. The current origin is properly authorized and secure!'
      });
      console.groupEnd();
    } catch (err: any) {
      console.error("DIAGNOSTIC EXCEPTION CAUGHT:", err);
      console.error("Error Code: ", err?.code);
      console.error("Error Message: ", err?.message);
      console.error("Error Full Stack Trace: ", err?.stack);

      setDiagnosticReport({
        ...initialReport,
        status: 'ERROR',
        code: err?.code || 'UNKNOWN_CODE',
        message: err?.message || 'Verification flow crashed or was blocked.',
        stack: err?.stack || 'No stack trace captured.'
      });
      console.groupEnd();
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!customerInfo.phone) {
      const toasts = [{id: Math.random().toString(), message: 'Please enter phone number'}];
      setToasts(toasts);
      return;
    }
    
    // Auto-detect if Bangladesh number is missing +88
    let formattedPhone = customerInfo.phone;
    if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
      formattedPhone = '+88' + formattedPhone;
    }

    try {
      setVerifyingPhoneStr('Sending OTP...');
      setPhoneVerifying(true);
      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await signInWithPhone(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      const toasts = [{id: Math.random().toString(), message: 'OTP code sent!'}];
      setToasts(toasts);
    } catch (error) {
      console.error(error);
      const toasts = [{id: Math.random().toString(), message: 'Failed to send OTP. Ensure number is correct.'}];
      setToasts(toasts);
    } finally {
      setVerifyingPhoneStr('');
      setPhoneVerifying(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!confirmationResult || !verificationCode) return;
    try {
      setVerifyingPhoneStr('Verifying Code...');
      setPhoneVerifying(true);
      await confirmationResult.confirm(verificationCode);
      setIsPhoneVerified(true);
      setVerificationCode('');
      setConfirmationResult(null);
      const toasts = [{id: Math.random().toString(), message: 'Phone Number Verified'}];
      setToasts(toasts);
    } catch (error) {
      console.error(error);
      const toasts = [{id: Math.random().toString(), message: 'Invalid OTP Code'}];
      setToasts(toasts);
    } finally {
      setVerifyingPhoneStr('');
      setPhoneVerifying(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('VALIDATING CREDENTIALS...');
    setTimeout(() => {
      let foundUser = adminUsersList.find(u => u.username === adminUsername && u.password === adminPassword);
      
      // Fallback static check if Firestore sync failed
      if (!foundUser) {
        const fallbacks = [
          { id: 'admin-main', username: 'admin', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'admin7788' },
          { id: 'root-main', username: 'root', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'root123' },
          { id: 'bb-main', username: 'bb6446', role: AdminRole.SUPER_ADMIN, lastLogin: 'System', password: 'bb6446' }
        ];
        const staticMatch = fallbacks.find(u => u.username === adminUsername && u.password === adminPassword);
        if (staticMatch) foundUser = staticMatch;
      }

      if (foundUser) {
        const userToSet = { ...foundUser, lastLogin: new Date().toISOString() };
        setAdminUser(userToSet);
        setCurrentView(ViewState.ADMIN_DASHBOARD);
        setLoginError('');
        setAdminUsername('');
        setAdminPassword('');
        setAdminLogs(p => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), user: userToSet.username, action: 'SESSION_INIT', role: userToSet.role }, ...p]);
      } else {
        setLoginError('ACCESS DENIED: INVALID CREDENTIALS');
      }
    }, 500);
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
    return reviews
      .filter(r => r.productId === selectedProduct.id && r.status === 'APPROVED')
      .sort((a, b) => {
        if (reviewSortType === 'Recent') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else {
          return b.rating - a.rating;
        }
      });
  }, [reviews, selectedProduct, reviewSortType]);

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
      case 'Popularity':
        result.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        break;
      case 'Newest':
      default:
        // Sort by date if available, otherwise by new arrival status
        result.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        });
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
                  <p className="text-[10px] text-zinc-500 font-bold mb-2">Zone_01 (Dhaka)</p>
                  <p className="text-lg font-black uppercase">1 - 2 Business Days</p>
                  <p className="text-xs text-zinc-400 mt-4 leading-relaxed">Local delivery network active across Dhaka metropolis. ৳80 delivery charge.</p>
                </div>
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <p className="text-[10px] text-zinc-500 font-bold mb-2">Zone_02 (Nationwide)</p>
                  <p className="text-lg font-black uppercase">3 - 5 Business Days</p>
                  <p className="text-xs text-zinc-400 mt-4 leading-relaxed">Secured courier relay to all major districts in Bangladesh. ৳150 delivery charge.</p>
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Shipping Policy</h4>
              <div className="p-6 border border-zinc-800 bg-zinc-900/30 font-mono text-sm text-zinc-300 space-y-4">
                <p>• Orders are processed within <strong className="text-white">24 hours</strong> of placement during business days.</p>
                <p>• <strong className="text-white">Free Shipping</strong> is automatically applied to all cart subtotals exceeding ৳5,000.</p>
                <p>• All shipments are tracked and require a signature upon delivery to ensure maximum security.</p>
                <p>• In the event of an unavoidable delay, customers will be notified immediately via their registered terminal email or phone.</p>
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
      case 'Track Order':
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <section className="space-y-6">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Order_Tracker</h4>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Enter your ORDER_ID to track mission status.</p>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="ORD-XXXX" 
                  className="bg-black border border-zinc-800 px-6 py-4 text-xs font-bold tracking-widest text-[#0055ff] outline-none focus:border-[#0055ff] flex-1 placeholder:text-zinc-800"
                />
                <button 
                  onClick={() => {
                    if (customerInfo?.email) {
                      setCurrentView(ViewState.CUSTOMER_PROFILE);
                      window.scrollTo(0, 0);
                    } else {
                      setCurrentView(ViewState.CUSTOMER_LOGIN);
                      window.scrollTo(0, 0);
                    }
                  }}
                  className="px-10 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-[#0055ff] hover:text-white transition-all"
                >
                  Sync Status
                </button>
              </div>
            </section>
          </div>
        );
      case 'Preview':
        const selectedCustomProductObj = products.find(p => p.id === customizerProduct) || products[0];
        const isHoodiePreset = selectedCustomProductObj ? (selectedCustomProductObj.name?.toLowerCase().includes('hoodie') || selectedCustomProductObj.category === 'Hoodies') : true;
        return (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono text-zinc-300">
            <section className="space-y-4">
              <h4 className="text-xl font-black uppercase text-[#0055ff] tracking-widest">Streetwear Lab</h4>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Design and preview custom street assets locally. Select from official bases, dye settings, custom graphics and active prints below to simulate physical streetwear specs.
              </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Visual Mockup Simulator */}
              <div className="lg:col-span-5 bg-[#030712] border border-zinc-800 p-8 rounded-2xl flex flex-col items-center justify-center relative min-h-[440px] shadow-2xl overflow-hidden group">
                <div className="absolute top-4 left-4 text-[9px] uppercase font-bold text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800/50">
                  Mockup: {isHoodiePreset ? 'OVERSIZED HOODIE' : 'CLASSIC BOXLAYER TEE'}
                </div>
                <div className="absolute top-4 right-4 text-[9px] uppercase font-bold text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800/50">
                  Side: {customizerPrintPosition}
                </div>

                {/* Simulated Apparel Outer Silhouette */}
                <div className="relative w-72 h-72 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.03]">
                  {/* Outer shade backdrop behind the SVG wrapper */}
                  <div 
                    className="absolute inset-0 transition-all duration-500 flex items-center justify-center"
                    style={{
                      color: customizerColor
                    }}
                  >
                    {isHoodiePreset ? (
                      <svg viewBox="0 0 120 120" className="w-full h-full fill-current text-current stroke-zinc-900/30 stroke-1 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                        {/* Hood path */}
                        <path d="M42,12 C42,12 60,3 78,12 C88,16 88,25 88,25 L75,26 C75,26 60,19 45,26 Z" />
                        {/* Body, shoulders & sleeves */}
                        <path d="M25,27 L38,24 L45,30 L75,30 L82,24 L95,27 L112,53 L100,61 L92,48 L92,97 L28,97 L28,48 L20,61 L8,53 Z" />
                        {/* Kangaroo pocket */}
                        {customizerPrintPosition === 'Chest' && (
                          <path d="M42,72 L78,72 L82,90 L38,90 Z" fill="#000000" fillOpacity="0.25" />
                        )}
                        {/* Hood drawstring details */}
                        {customizerPrintPosition === 'Chest' && (
                          <>
                            <line x1="54" y1="28" x2="54" y2="42" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                            <line x1="66" y1="28" x2="66" y2="45" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                          </>
                        )}
                      </svg>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-current stroke-zinc-900/30 stroke-1 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                        {/* Crew neck classic T-shirt path */}
                        <path d="M20,15 L35,15 C37,18 42,18 45,15 L60,15 L78,25 L68,34 L60,30 L60,88 L20,88 L20,30 L12,34 L4,25 Z" />
                      </svg>
                    )}
                  </div>

                  {/* Dynamic Print Overlay Block */}
                  <div 
                    className="absolute z-10 flex flex-col items-center justify-center text-center pointer-events-none transition-transform duration-300"
                    style={{
                      transform: `scale(${customizerActiveScale}) translateY(${isHoodiePreset ? '-5px' : '5px'})`,
                      maxWidth: '120px'
                    }}
                  >
                    {/* SVG Graphic presets overlay */}
                    {customizerGraphic === 'ThreatX Shield' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    {customizerGraphic === 'Cyber Skull' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a5 5 0 00-5 5v3a3 3 0 000 6h1a1 1 0 011 1v2a2 2 0 002 2h2a2 2 0 002-2v-2a1 1 0 011-1h1a3 3 0 000-6V7a5 5 0 00-5-5z" />
                        <circle cx="9.5" cy="8.5" r="1.5" fill="currentColor" />
                        <circle cx="14.5" cy="8.5" r="1.5" fill="currentColor" />
                      </svg>
                    )}
                    {customizerGraphic === 'Matrix Cipher' && (
                      <div className="font-mono text-[7px] leading-tight text-[#10b981] font-black drop-shadow-[0_0_5px_rgba(16,185,129,0.7)] text-center tracking-widest my-1 uppercase">
                        <div>1010110</div>
                        <div>0011010</div>
                        <div>1110001</div>
                      </div>
                    )}
                    {customizerGraphic === 'Street Tribal' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16L12 20Zm4 4h8L12 14Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2v20" />
                      </svg>
                    )}

                    {/* custom text print with glow overlay */}
                    {customizerText && (
                      <div 
                        className="text-[9px] font-black tracking-[0.25em] uppercase mt-2.5 break-all max-w-[110px] drop-shadow-[0_2px_8px_var(--tw-shadow-color)]"
                        style={{ 
                          color: customizerTextColor,
                          textShadow: `0 0 8px ${customizerTextColor}`
                        }}
                      >
                        {customizerText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle spec tags */}
                <div className="w-full mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                  <span>SCALE: {Math.round(customizerActiveScale * 100)}%</span>
                  <span>BASE: {customizerColor === '#121214' ? 'OBSIDIAN' : customizerColor === '#374151' ? 'ASPHALT' : customizerColor === '#991b1b' ? 'CRIMSON' : customizerColor === '#064e3b' ? 'FOREST' : 'SLATE'}</span>
                </div>
              </div>

              {/* Right Column: Customizer Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Base model selection */}
                <div className="bg-[#050b14] border border-zinc-800/80 p-5 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">01 / Choose Base Apparel</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setCustomizerProduct('');
                        setCustomizerColor('#121214');
                      }}
                      className={`py-3 px-4 border text-[10px] font-black uppercase tracking-wider text-center transition-all ${customizerProduct === '' ? 'bg-[#0055ff] text-white border-[#0055ff]' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      Default Oversized Hoodie
                    </button>
                    <button 
                      onClick={() => {
                        const tShirtObj = products.find(p => p.name.toLowerCase().includes('shirt') || p.category === 'T-Shirts');
                        if (tShirtObj) {
                          setCustomizerProduct(tShirtObj.id);
                        } else {
                          setCustomizerProduct('t-shirt-fallback');
                        }
                      }}
                      className={`py-3 px-4 border text-[10px] font-black uppercase tracking-wider text-center transition-all ${customizerProduct !== '' ? 'bg-[#0055ff] text-white border-[#0055ff]' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      Classic Street T-Shirt
                    </button>
                  </div>
                </div>

                {/* 2. Dye settings / apparel shades */}
                <div className="bg-[#050b14] border border-zinc-800/80 p-5 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">02 / Dye Shader Color</span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {[
                      { code: '#121214', name: 'Obsidian' },
                      { code: '#374151', name: 'Asphalt' },
                      { code: '#991b1b', name: 'Crimson' },
                      { code: '#064e3b', name: 'Forest' },
                      { code: '#2e1065', name: 'Dusk' }
                    ].map(color => (
                      <button 
                        key={color.code}
                        onClick={() => setCustomizerColor(color.code)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-[10px] font-black uppercase transition-all ${customizerColor === color.code ? 'border-white text-white' : 'border-zinc-800 text-zinc-400'}`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/30 block shrink-0" style={{ backgroundColor: color.code }}></span>
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Graphic decal presets */}
                <div className="bg-[#050b14] border border-zinc-800/80 p-5 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">03 / Central Vector Decal</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {['ThreatX Shield', 'Cyber Skull', 'Matrix Cipher', 'Street Tribal', 'None'].map(graphic => (
                      <button 
                        key={graphic}
                        onClick={() => setCustomizerGraphic(graphic)}
                        className={`py-2 px-1.5 border text-[10px] font-black uppercase tracking-wider text-center transition-all ${customizerGraphic === graphic ? 'bg-zinc-800 border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'border-zinc-900 text-zinc-400 hover:text-white'}`}
                      >
                        {graphic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Placement side  */}
                <div className="bg-[#050b14] border border-zinc-800/80 p-5 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">04 / Print Position</span>
                  <div className="flex gap-2">
                    {['Chest', 'Back'].map(pos => (
                      <button 
                        key={pos}
                        onClick={() => setCustomizerPrintPosition(pos as 'Chest' | 'Back')}
                        className={`flex-1 py-2.5 border text-[10px] font-black uppercase tracking-wider text-center transition-all ${customizerPrintPosition === pos ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-zinc-900 text-zinc-500 hover:text-white'}`}
                      >
                        {pos} Print View
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Custom typography print & color settings */}
                <div className="bg-[#050b14] border border-zinc-800/80 p-5 rounded-xl space-y-4">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block">05 / Embroidery & Overlay Prints</span>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500">Custom Text Prompt</label>
                    <input 
                      type="text"
                      maxLength={15}
                      value={customizerText}
                      onChange={(e) => setCustomizerText(e.target.value)}
                      placeholder="ENTER TEXT"
                      className="w-full bg-black border border-zinc-800 focus:border-zinc-700 outline-none px-4 py-3 text-xs uppercase tracking-[0.25em] font-black text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Glow Text Ink</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { code: '#0055ff', name: 'Blue Glow' },
                        { code: '#10b981', name: 'Acid Green' },
                        { code: '#ef4444', name: 'Heat Red' },
                        { code: '#ffffff', name: 'Hyper White' },
                        { code: '#eab308', name: 'Laser Yellow' }
                      ].map(color => (
                        <button 
                          key={color.code}
                          onClick={() => setCustomizerTextColor(color.code)}
                          className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all ${customizerTextColor === color.code ? 'border-white text-white' : 'border-zinc-900 text-zinc-500'}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: color.code, boxShadow: `0 0 6px ${color.code}` }}></span>
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[9px] uppercase tracking-wider text-zinc-500">
                      <span>Decal Print Scale</span>
                      <span className="font-mono text-zinc-300">{Math.round(customizerActiveScale * 100)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.6"
                      max="1.5"
                      step="0.05"
                      value={customizerActiveScale}
                      onChange={(e) => setCustomizerActiveScale(parseFloat(e.target.value))}
                      className="w-full accent-[#0055ff] cursor-ew-resize bg-zinc-900 border border-zinc-800 h-2 rounded-lg"
                    />
                  </div>
                </div>

                {/* Submit button details */}
                <button 
                  onClick={() => {
                    showToast(
                      <div className="flex flex-col gap-2 relative z-50">
                        <div className="font-bold text-sm tracking-normal capitalize flex items-center gap-1.5 text-emerald-400">
                          <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Proposal Locked
                        </div>
                        <div className="text-xs text-zinc-300 font-normal normal-case leading-relaxed bg-black/40 p-2 rounded border border-emerald-500/10">
                          Your bespoke spec layout is registered!
                          <div className="text-[10px] text-zinc-400 font-mono mt-1 uppercase tracking-wider">
                            BASE: {isHoodiePreset ? 'HOODIE' : 'TEE'} &middot; TEXT: {customizerText || 'NONE'} &middot; INK: {customizerTextColor}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  className="w-full py-4 bg-[#0055ff] hover:bg-[#0044cc] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full transition-all duration-300 shadow-[0_4px_20px_rgba(0,85,255,0.4)]"
                >
                  Acquire Bespoke Design Spec Sheet
                </button>
              </div>
            </div>
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
    <div 
      className="min-h-screen flex flex-col selection:bg-[#0055ff] selection:text-white bg-black font-mono transition-colors duration-500"
      style={{
        backgroundColor: socialSettings.appearance?.middleColor || '#000000',
        '--tw-bg-opacity': 1,
      } as React.CSSProperties}
    >
      {isLiveEditMode && currentView === ViewState.STORE && (
        <LiveEditorPanel />
      )}
      {socialSettings.announcementBanner?.enabled && currentView === ViewState.STORE && (
        <div 
          onClick={() => {
            if (isLiveEditMode) {
              setSelectedLiveElement('banner');
            }
          }}
          className={`fixed top-0 w-full z-[60] text-center py-2 text-[10px] font-black uppercase tracking-widest pointer-events-auto transition-all ${
            isLiveEditMode 
              ? `cursor-pointer ring-2 ${selectedLiveElement === 'banner' ? 'ring-yellow-400' : 'ring-transparent hover:ring-[#0055ff]'}` 
              : ''
          }`}
          style={{
            backgroundColor: socialSettings.siteContent?.announcementBgColor || '#0055ff',
            color: socialSettings.siteContent?.announcementColor || '#ffffff'
          }}
        >
          {socialSettings.announcementBanner.text}
        </div>
      )}
      {currentView !== ViewState.ADMIN_DASHBOARD && (
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
              transactionScreenshot: '',
              isBillingSame: true,
              cardNumber: '',
              cardExpiry: '',
              cardCvc: '',
              notes: '',
            });
          }}
        />
      )}

      <main className={`flex-1 ${currentView === ViewState.ADMIN_DASHBOARD ? "" : "pb-20 md:pb-0"}`}>
        {currentView === ViewState.STORE && (
          <div className={`animate-in fade-in duration-700 ${socialSettings.announcementBanner?.enabled ? 'pt-28' : 'pt-20'} px-4 md:px-8`}>
            <section className="relative h-[40vh] md:h-[50vh] w-full max-w-7xl mx-auto overflow-hidden flex items-center px-6 md:px-12 group rounded-3xl my-6 shadow-2xl">
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
              
              {/* Dynamic Hero Image */}
              {(() => {
                const defaultImages = [
                  "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fm=webp&fit=crop&q=80&w=1920",
                  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1920",
                  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1920"
                ];
                const images = socialSettings.heroImages && socialSettings.heroImages.length > 0 
                  ? socialSettings.heroImages 
                  : defaultImages;
                
                return (
                  <>
                    <img 
                      loading="lazy"
                      key={heroImageIndex} /* Force re-render for animation */
                      fetchPriority="high" 
                      src={images[heroImageIndex] || images[0] || defaultImages[0]} 
                      onClick={() => {
                        if (isLiveEditMode) {
                          setSelectedLiveElement('heroImage');
                        }
                      }}
                      className={`absolute inset-0 w-full h-full object-cover brightness-50 contrast-125 transition-transform duration-[10s] drag-none animate-in fade-in zoom-in-95 duration-1000 ${
                        isLiveEditMode 
                          ? `hover:outline hover:outline-4 hover:outline-[#0055ff] outline-offset-[-4px] cursor-pointer ring-4 ${selectedLiveElement === 'heroImage' ? 'ring-[#0055ff] border-4 border-[#0055ff]' : 'ring-transparent'}` 
                          : 'hover:scale-105'
                      }`} 
                      alt={`Streetwear Hero ${heroImageIndex}`} 
                      referrerPolicy="no-referrer" 
                    />
                    
                    {/* Navigation Buttons */}
                    {images.length > 1 && (
                      <>
                        <div className="absolute inset-x-0 bottom-6 md:bottom-10 flex justify-center z-30 pointer-events-none">
                          <div className="flex items-center gap-2 bg-black/70 px-4 py-3 md:px-6 md:py-4 backdrop-blur-md border border-white/10 pointer-events-auto">
                            {images.map((_, i) => (
                              <button 
                                key={i}
                                onClick={() => setHeroImageIndex(i)}
                                className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${i === heroImageIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {/* Large Side Arrows */}
                        <button 
                          onClick={() => setHeroImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-transparent text-white hover:bg-black/30 hover:backdrop-blur-sm transition-all rounded-full z-30 opacity-0 group-hover:opacity-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => setHeroImageIndex(prev => (prev + 1) % images.length)}
                          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-transparent text-white hover:bg-black/30 hover:backdrop-blur-sm transition-all rounded-full z-30 opacity-0 group-hover:opacity-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </>
                );
              })()}

              <div className="relative z-10 max-w-2xl space-y-8">
                <div className="space-y-4">
                  <span className="text-[#0055ff] font-bold text-xs uppercase tracking-[0.3em]">Drop 02 // 2024</span>
                  <div 
                    onClick={() => {
                      if (isLiveEditMode) {
                        setSelectedLiveElement('heroTitle');
                      }
                    }}
                    className={`relative transition-all group/title ${
                      isLiveEditMode 
                        ? `ring-2 ${selectedLiveElement === 'heroTitle' ? 'ring-[#0055ff] bg-black/40' : 'ring-transparent hover:ring-[#0055ff]/50 bg-black/20 hover:bg-black/30'} cursor-pointer p-4 -ml-4 rounded-sm` 
                        : ''
                    }`}
                  >
                    {isLiveEditMode && (
                      <span className="absolute top-1 left-2 text-[8px] uppercase tracking-wider bg-[#0055ff] text-white px-1 font-mono font-bold z-20">Edit Title</span>
                    )}
                    <h1 
                      className={`font-black heading-font italic uppercase leading-tight tracking-tighter whitespace-pre-wrap ${
                        socialSettings.siteContent?.heroTitleSize === 'mega' ? 'text-6xl md:text-8xl' :
                        socialSettings.siteContent?.heroTitleSize === 'large' ? 'text-5xl md:text-6xl' :
                        socialSettings.siteContent?.heroTitleSize === 'medium' ? 'text-4xl md:text-5xl' :
                        'text-5xl md:text-7xl'
                      }`}
                      style={{ color: socialSettings.siteContent?.heroTitleColor || undefined }}
                    >
                      {socialSettings.siteContent?.heroTitle !== undefined ? socialSettings.siteContent.heroTitle : (
                        <>Urban <br/><span className="text-stroke-white text-transparent border-white">Elysium</span></>
                      )}
                    </h1>
                  </div>
                  <div 
                    onClick={() => {
                      if (isLiveEditMode) {
                        setSelectedLiveElement('heroSubtitle');
                      }
                    }}
                    className={`relative transition-all group/subtitle ${
                      isLiveEditMode 
                        ? `ring-2 ${selectedLiveElement === 'heroSubtitle' ? 'ring-[#0055ff] bg-black/40' : 'ring-transparent hover:ring-[#0055ff]/50 bg-black/20 hover:bg-black/30'} cursor-pointer p-4 -ml-4 rounded-sm` 
                        : ''
                    }`}
                  >
                    {isLiveEditMode && (
                      <span className="absolute top-1 left-2 text-[8px] uppercase tracking-wider bg-[#0055ff] text-white px-1 font-mono font-bold z-20">Edit Subtitle</span>
                    )}
                    <p className="text-sm md:text-base max-w-lg" style={{ color: socialSettings.siteContent?.heroSubtitleColor || '#a1a1aa' }}>
                      {socialSettings.siteContent?.heroSubtitle || "Engineered for the modern urban environment. Uncompromising quality meets minimalist industrial design."}
                    </p>
                  </div>
                  {socialSettings.sale?.enabled && (
                    <CountdownTimer endTime={socialSettings.sale.endTime} title={socialSettings.sale.title} />
                  )}
                </div>
                <button 
                  onClick={() => handleStoreNavigate('ALL', true)} 
                  className="bg-white text-black px-10 py-4 font-bold text-sm hover:bg-[#0055ff] hover:text-white transition-all"
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
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
                     {products.filter(p => p.isNewArrival).slice(0, 4).map(product => (
                       <div key={`latest-${product.id}`} className="group relative flex flex-col cursor-pointer p-4 md:p-5 bg-[#010816] md:bg-gradient-to-b md:from-[#030b1c] md:to-[#01050e] border border-[#0033aa]/50 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,50,200,0.2)] hover:shadow-[0_20px_40px_-10px_rgba(0,100,255,0.4)] transform hover:-translate-y-2 transition-all duration-500" onClick={() => { setSelectedSize(''); setQuickViewProduct(product); }}>
                         <div className="relative w-full aspect-[1/1] sm:aspect-[4/5] object-contain overflow-hidden rounded-xl bg-[#001433] border border-[#0044cc]/40 shadow-[inset_0_0_25px_rgba(0,60,255,0.1)] transition-all duration-300 group-hover:border-[#0066ff]">
                           <img loading="lazy" src={product.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" alt={product.name} referrerPolicy="no-referrer" />
                           <div className="absolute top-4 left-4 bg-gradient-to-r from-[#0044cc] to-[#0099ff] border border-[#66bcff] shadow-[0_5px_15px_rgba(0,150,255,0.5)] rounded-md text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-widest z-10">New</div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                             className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${compareList.find(p => p.id === product.id) ? 'bg-[#0055ff] text-white shadow-[0_0_15px_rgba(0,85,255,0.6)]' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-white border border-white/10'}`}
                             title="Compare Product"
                           >
                             <ArrowRightLeft size={14} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                             className={`absolute top-14 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${wishlist.some(p => p.id === product.id) ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] border border-rose-400/30' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-rose-400 border border-white/10'}`}
                             title={wishlist.some(p => p.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                           >
                             <Heart size={14} className={wishlist.some(p => p.id === product.id) ? "fill-current" : ""} />
                           </button>
                           {product.stock <= 0 && (
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-[2px]">
                               <div className="border-2 border-white/20 px-6 py-2 bg-black/40 rotate-[-12deg]">
                                 <span className="text-white text-xs font-black uppercase tracking-[0.3em]">Sold_Out</span>
                               </div>
                             </div>
                           )}
                           <div 
                             className="absolute inset-0 bg-[#001133]/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               if (product.stock <= 0) return;
                               const defaultSize = product.sizes?.[0] || 'M';
                               const defaultColor = product.colors?.[0];
                               addToCart(product, defaultSize, defaultColor, 1, true);
                             }}
                           >
                             <div className="flex flex-col gap-3 w-full px-6">
                               <button 
                                 className={`bg-gradient-to-r from-[#0055ff] to-[#0088ff] text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_8px_25px_rgba(0,150,255,0.8)] border border-[#80c0ff] hover:scale-105 active:scale-95 transition-all w-full ${product.stock <= 0 ? 'opacity-20 grayscale cursor-not-allowed' : ''}`}
                                 onClick={(e) => {
                                   if (product.stock <= 0) return;
                                   e.stopPropagation();
                                   const defaultSize = product.sizes?.[0] || 'M';
                                   const defaultColor = product.colors?.[0];
                                   addToCart(product, defaultSize, defaultColor, 1, false, true);
                                 }}
                                 title="Adds one item with default options to your cart"
                               >
                                 {product.stock <= 0 ? 'Out of Stock' : 'Quick Buy'}
                               </button>
                               <button 
                                 className="bg-white/10 backdrop-blur-md text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all w-full"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedSize('');
                                   setQuickViewProduct(product);
                                 }}
                               >
                                 Quick View
                               </button>
                             </div>
                           </div>
                         </div>
                         <div className="mt-4 px-2 space-y-1">
                           <h4 className="font-black uppercase tracking-tighter text-sm text-white group-hover:text-[#4da6ff] drop-shadow-[0_0_10px_rgba(0,100,255,0.3)] transition-colors">{product.name}</h4>
                           <div className="flex items-center gap-2">
                             <p className="text-[10px] text-[#3399ff] font-black drop-shadow-[0_2px_15px_rgba(0,150,255,0.5)]">৳{product.price.toLocaleString()}</p>
                             {product.originalPrice && product.originalPrice > product.price && (
                               <p className="text-[9px] text-zinc-500 line-through font-bold">৳{product.originalPrice.toLocaleString()}</p>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div id="lookbook" className="py-20 mb-12">
                 <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-zinc-800 pb-8">
                    <div className="space-y-1">
                      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#0055ff]">Visual_Narrative</h2>
                      <h3 className="text-4xl font-black heading-font uppercase">Lookbook SS/24</h3>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[800px]">
                    <div className="md:col-span-8 relative overflow-hidden group">
                      <img loading="lazy" src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fm=webp&fit=crop&q=80&w=1200" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" alt="Lookbook 1" />
                      <div className="absolute bottom-10 left-10 text-white z-10 transition-transform group-hover:-translate-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-[#0055ff] px-4 py-2">Shadows & Structure</span>
                      </div>
                    </div>
                    <div className="md:col-span-4 grid grid-rows-2 gap-4">
                      <div className="relative overflow-hidden group">
                        <img loading="lazy" src="https://images.unsplash.com/photo-1483393458019-411bc3f77c94?auto=format&fm=webp&fit=crop&q=80&w=600" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" alt="Lookbook 2" />
                      </div>
                      <div className="relative overflow-hidden group bg-[#0055ff] flex items-center justify-center p-12 text-center text-white">
                         <div className="space-y-4">
                            <h4 className="text-2xl font-black heading-font uppercase italic tracking-tighter">Explore the <br/>Craft</h4>
                            <p className="text-[10px] uppercase tracking-widest opacity-80 leading-relaxed font-bold">Every stitch tells a story of urban resilience and technical precision.</p>
                         </div>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-800 pb-8">
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#0055ff]">Collection_Matrix</h2>
                    <h3 className="text-4xl font-black heading-font uppercase">{shopFilter.replace('_', ' ')}</h3>
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{filteredProducts.length} Assets_Identified</p>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center text-xs font-bold tracking-widest">
                    <select 
                      value={sortType} 
                      onChange={(e) => setSortType(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 outline-none focus:border-[#0055ff] transition-colors"
                    >
                      <option value="Newest">Sort: Newest</option>
                      <option value="Popularity">Sort: Popularity</option>
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
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 lg:gap-10 min-h-[400px]">
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                  <div key={product.id} className="group relative flex flex-col cursor-pointer p-4 md:p-5 bg-[#010816] md:bg-gradient-to-b md:from-[#030b1c] md:to-[#01050e] border border-[#0033aa]/50 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,50,200,0.2)] hover:shadow-[0_20px_40px_-10px_rgba(0,100,255,0.4)] transform hover:-translate-y-2 transition-all duration-500">
                    <div className="relative w-full aspect-[1/1] sm:aspect-[4/5] md:aspect-[3/4] object-contain overflow-hidden rounded-xl bg-[#001433] border border-[#0044cc]/40 shadow-[inset_0_0_25px_rgba(0,60,255,0.1)] transition-all duration-500 group-hover:border-[#0066ff]" onClick={() => {
                      setSelectedSize('');
                      setQuickViewProduct(product);
                      ReactGA.event({
                        category: "Ecommerce",
                        action: "view_item",
                        label: product.name,
                        value: product.price
                      });
                    }}>
                      <img loading="lazy" src={product.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={product.name} referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {product.isNewArrival && (
                          <div className="bg-gradient-to-r from-[#0044cc] to-[#0099ff] border border-[#66bcff] shadow-[0_5px_15px_rgba(0,150,255,0.5)] rounded-md text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-[0.2em] w-fit">New</div>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="bg-gradient-to-r from-rose-600 to-rose-400 border border-rose-300 shadow-[0_5px_15px_rgba(225,29,72,0.5)] rounded-md text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-[0.2em] w-fit">Sale</div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                        className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${compareList.find(p => p.id === product.id) ? 'bg-[#0055ff] text-white shadow-[0_0_15px_rgba(0,85,255,0.6)]' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-white border border-white/10'}`}
                        title="Compare Product"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                        className={`absolute top-14 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${wishlist.some(p => p.id === product.id) ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] border border-rose-400/30' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-rose-400 border border-white/10'}`}
                        title={wishlist.some(p => p.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                      >
                        <Heart size={14} className={wishlist.some(p => p.id === product.id) ? "fill-current" : ""} />
                      </button>
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-[2px]">
                          <div className="border-2 border-white/20 px-6 py-2 bg-black/40 rotate-[-12deg]">
                            <span className="text-white text-xs font-black uppercase tracking-[0.3em]">Sold_Out</span>
                          </div>
                        </div>
                      )}
                      <div 
                        className="absolute inset-0 bg-[#001133]/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product.stock <= 0) return;
                          const defaultSize = product.sizes?.[0] || 'M';
                          const defaultColor = product.colors?.[0];
                          addToCart(product, defaultSize, defaultColor, 1, true);
                        }}
                      >
                        <div className="flex flex-col gap-3 w-full px-6">
                          <button 
                            className={`bg-gradient-to-r from-[#0055ff] to-[#0088ff] text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_8px_25px_rgba(0,150,255,0.8)] border border-[#80c0ff] hover:scale-105 active:scale-95 transition-all w-full ${product.stock <= 0 ? 'opacity-20 grayscale cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              if (product.stock <= 0) return;
                              e.stopPropagation();
                              const defaultSize = product.sizes?.[0] || 'M';
                              const defaultColor = product.colors?.[0];
                              addToCart(product, defaultSize, defaultColor, 1, false, true);
                            }}
                            title="Adds one item with default options to your cart"
                          >
                            {product.stock <= 0 ? 'Out of Stock' : 'Quick Buy'}
                          </button>
                          <button 
                            className="bg-white/10 backdrop-blur-md text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSize('');
                              setQuickViewProduct(product);
                            }}
                          >
                            Quick View
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 px-2 space-y-4">
                      <div className="flex justify-between items-start" onClick={() => {
                        setSelectedSize('');
                        setQuickViewProduct(product);
                        ReactGA.event({
                          category: "Ecommerce",
                          action: "view_item",
                          label: product.name,
                          value: product.price
                        });
                      }}>
                        <div className="space-y-1"><h3 className="font-black uppercase tracking-tighter text-xl leading-tight text-white group-hover:text-[#4da6ff] drop-shadow-[0_0_10px_rgba(0,100,255,0.3)] transition-colors">{product.name}</h3><p className="text-[10px] text-[#0066ff] uppercase font-bold tracking-widest">{product.category}</p></div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-xl heading-font tabular-nums text-[#3399ff] drop-shadow-[0_2px_15px_rgba(0,150,255,0.5)]">৳{product.price.toLocaleString()}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-zinc-500 line-through font-bold">৳{product.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
                {wishlist.map(product => (
                  <div key={`wishlist-${product.id}`} className="group relative flex flex-col p-4 md:p-5 bg-[#010816] md:bg-gradient-to-b md:from-[#030b1c] md:to-[#01050e] border border-[#0033aa]/50 rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,50,200,0.2)] hover:shadow-[0_20px_40px_-10px_rgba(0,100,255,0.4)] transform hover:-translate-y-2 transition-all duration-500">
                    <div className="relative w-full aspect-[1/1] sm:aspect-[4/5] object-contain overflow-hidden rounded-xl bg-[#001433] border border-[#0044cc]/40 shadow-[inset_0_0_25px_rgba(0,60,255,0.1)] transition-all duration-300 group-hover:border-[#0066ff] mb-4 cursor-pointer" onClick={() => { setSelectedSize(''); setQuickViewProduct(product); }}>
                      <img loading="lazy" src={product.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} alt={product.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        {product.isNewArrival && (
                          <div className="bg-gradient-to-r from-[#0044cc] to-[#0099ff] border border-[#66bcff] shadow-[0_5px_15px_rgba(0,150,255,0.5)] rounded-md text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-[0.2em] w-fit">New</div>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="bg-gradient-to-r from-rose-600 to-rose-400 border border-rose-300 shadow-[0_5px_15px_rgba(225,29,72,0.5)] rounded-md text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-[0.2em] w-fit">Sale</div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                        className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${compareList.find(p => p.id === product.id) ? 'bg-[#0055ff] text-white shadow-[0_0_15px_rgba(0,85,255,0.6)]' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-white border border-white/10'}`}
                        title="Compare Product"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                        className={`absolute top-14 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${wishlist.some(p => p.id === product.id) ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] border border-rose-400/30' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-rose-400 border border-white/10'}`}
                        title={wishlist.some(p => p.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                      >
                        <Heart size={14} className={wishlist.some(p => p.id === product.id) ? "fill-current" : ""} />
                      </button>
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-[2px]">
                          <div className="border-2 border-white/20 px-6 py-2 bg-black/40 rotate-[-12deg]">
                            <span className="text-white text-xs font-black uppercase tracking-[0.3em]">Sold_Out</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-1 px-2">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] uppercase font-black text-[#0066ff] tracking-widest mt-1">{product.category}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-lg heading-font tabular-nums text-[#3399ff] drop-shadow-[0_2px_15px_rgba(0,150,255,0.5)]">৳{product.price.toLocaleString()}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[10px] text-zinc-500 line-through font-bold">৳{product.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-black uppercase text-xs tracking-widest text-white leading-snug cursor-pointer group-hover:text-[#4da6ff] drop-shadow-[0_0_10px_rgba(0,100,255,0.3)] transition-colors" onClick={() => { setSelectedSize(''); setQuickViewProduct(product); }}>{product.name}</h3>
                    </div>
                    <button onClick={() => toggleWishlist(product)} className="w-full mt-4 py-3 bg-gradient-to-r from-rose-900/40 to-rose-900/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white font-black uppercase text-[9px] tracking-widest transition-all rounded-full shadow-[0_5px_15px_rgba(225,29,72,0.2)]">
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
                  {['Shipping', 'Returns', 'Sizing', 'Track Order', 'Contact', 'Preview'].map(topic => (
                    <button key={topic} id={`support-aside-${topic.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setSupportTopic(topic)} className={`text-left text-[10px] font-black uppercase tracking-[0.2em] px-5 py-4 border transition-all duration-300 ${supportTopic === topic ? 'bg-[#0055ff] border-[#0055ff] text-white' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}>{topic}</button>
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
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">Initialising Terminal...</div>}>
              <CustomerPortal onLoginSuccess={(user) => {
                const existing = customers.find(c => c.email.toLowerCase() === user.email.toLowerCase());
                const resolvedName = existing ? existing.name : user.name;
                
                setCustomerInfo(prev => ({ 
                  ...prev, 
                  name: resolvedName, 
                  email: user.email,
                  ...(existing ? {
                    phone: existing.phone || '',
                    address: existing.address || '',
                    city: existing.city || '',
                    zip: existing.zip || '',
                    notes: existing.notes || '',
                    profileImage: existing.profileImage || '',
                  } : {})
                }));
                
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

                setCurrentView(ViewState.CUSTOMER_PROFILE);
                window.scrollTo(0, 0);
              }} />
            </Suspense>
          </div>
        )}

        {currentView === ViewState.CUSTOMER_PROFILE && customerInfo?.email && (
          <div className="pt-20">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">Accessing Profile...</div>}>
              <CustomerProfile 
                customerInfo={customerInfo}
                orders={orders}
                products={products}
                onNavigateBack={() => { setCurrentView(ViewState.STORE); window.scrollTo(0, 0); }}
                isDarkMode={true}
                onUpdateCustomerInfo={(updatedData: any) => {
                  setCustomerInfo(prev => ({ ...prev, ...updatedData }));
                }}
                onCancelOrder={async (orderId: string) => {
                  await updateOrderStatus(orderId, 'CANCELLED');
                  setAdminLogs(p => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), user: customerInfo.name, action: `Customer Cancelled Order: #${orderId}`, role: AdminRole.CUSTOMER }, ...p]);
                }}
              />
            </Suspense>
          </div>
        )}

        {currentView === ViewState.TRACK_ORDER && (
          <div className="pt-20">
            <OrderTracking onNavigateBack={() => { setCurrentView(ViewState.STORE); window.scrollTo(0, 0); }} />
          </div>
        )}

        {currentView === ViewState.ADMIN_LOGIN && (
          <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] pt-20">
             <div className="w-full max-w-md space-y-12 text-center">
                <div className="space-y-4">
                  <h2 className="text-5xl font-black heading-font italic uppercase tracking-tighter text-white">STREET<span className="text-[#0055ff]">THREADX</span></h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Authorized Personnel Management</p>
                </div>
                
                <div className="space-y-10">
                  {/* Google Auth for Super Admin */}
                  <div className="space-y-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#0055ff]">Super_Admin_Relay</p>
                    <form onSubmit={handleGoogleLogin}>
                      <button type="submit" className="w-full bg-white text-black py-5 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[#0055ff] hover:text-white transition-all flex items-center justify-center gap-3">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Authenticate via Google
                      </button>
                    </form>
                  </div>

                  {/* Standard Auth for Staff */}
                  <div className="space-y-4 pt-6 border-t border-zinc-800">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Standard_Relay</p>
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <input 
                        type="text" 
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="USERNAME" 
                        className="w-full bg-black border border-zinc-800 p-4 text-[10px] font-black tracking-widest text-white placeholder-zinc-700 outline-none focus:border-zinc-500 transition-colors"
                      />
                      <input 
                        type="password" 
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="ACCESS_CODE" 
                        className="w-full bg-black border border-zinc-800 p-4 text-[10px] font-black tracking-widest text-white placeholder-zinc-700 outline-none focus:border-zinc-500 transition-colors"
                      />
                      <button type="submit" className="w-full bg-zinc-900 border border-zinc-800 text-white py-4 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:text-black transition-all">
                        Initialize Uplink
                      </button>
                    </form>
                  </div>

                  {loginError && <p className="text-[#0055ff] font-bold text-[10px] uppercase tracking-widest animate-pulse">{loginError}</p>}
                </div>
             </div>
          </div>
        )}

        {currentView === ViewState.ADMIN_DASHBOARD && (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-[#0055ff] font-black uppercase text-xs tracking-[0.5em] animate-pulse">Synchronizing Terminal Matrix...</div>}>
            <AdminProtectedRoute adminUser={adminUser}>
              <AdminDashboard 
                user={adminUser!} 
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
                addLog={(a) => setAdminLogs(p => [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), user: adminUser!.username, action: a, role: adminUser!.role }, ...p])} 
                discountCodes={discountCodes}
                setDiscountCodes={setDiscountCodes}
                reviews={reviews}
                setReviews={setReviews}
                chatSessions={chatSessions}
                setChatSessions={setChatSessions}
                expenses={expenses}
                setExpenses={setExpenses}
                onEnableLiveEditMode={() => {
                  setCurrentView(ViewState.STORE);
                  setIsLiveEditMode(true);
                  window.scrollTo(0, 0);
                }}
                onSendMessage={handleSendMessage}
                adminUsersList={adminUsersList}
                setAdminUsersList={setAdminUsersList}
              />
            </AdminProtectedRoute>
          </Suspense>
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
                className="w-full bg-zinc-900/50 border border-zinc-800 px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#0055ff] transition-all placeholder:opacity-40"
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
                      <div className="relative w-16 h-16 shrink-0">
                        <img loading="lazy" src={product.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} alt={product.name} className={`w-full h-full object-cover bg-zinc-900 ${product.stock <= 0 ? 'opacity-30' : ''}`} />
                        {product.stock <= 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/40 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"><span className="text-[7px] font-black text-white uppercase tracking-tighter bg-black/60 px-1">Sold Out</span></div>}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${product.stock <= 0 ? 'text-zinc-500' : 'text-white'}`}>{product.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs text-[#0055ff] font-black">৳{product.price.toLocaleString()}</p>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <p className="text-[10px] text-zinc-500 line-through font-bold">৳{product.originalPrice.toLocaleString()}</p>
                          )}
                          {product.stock <= 0 && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/30 px-1">Out of Stock</span>}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                        className={`ml-auto w-8 h-8 rounded-full transition-all flex items-center justify-center border ${compareList.find(p => p.id === product.id) ? 'bg-[#0055ff] border-[#0055ff] text-white shadow-[0_0_10px_rgba(0,85,255,0.4)]' : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
                        title="Compare Product"
                      >
                        <ArrowRightLeft size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                        className={`absolute relative mr-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${wishlist.some(p => p.id === product.id) ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] border border-rose-400/30' : 'bg-black/40 backdrop-blur-md text-zinc-400 hover:text-rose-400 border border-white/10'}`}
                        title={wishlist.some(p => p.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                      >
                        <Heart size={14} className={wishlist.some(p => p.id === product.id) ? "fill-current" : ""} />
                      </button>
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
                  <div className="w-20 h-24 bg-black border border-zinc-800"><img loading="lazy" src={item.images[0]} className="w-full h-full object-cover grayscale" alt="" referrerPolicy="no-referrer" /></div>
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
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center h-screen space-y-6">
                  <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#0055ff] rounded-none animate-ping"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#0055ff]">Your vault is empty</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter max-w-[200px] mx-auto leading-relaxed">It looks like you haven't added anything to your collection yet.</p>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="bg-white text-black text-[10px] font-black uppercase px-8 py-4 tracking-[0.3em] hover:bg-[#0055ff] hover:text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Start Exploring
                  </button>
                </div>
              )}
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
              <div className="text-center py-20 space-y-6 animate-in fade-in zoom-in duration-700">
                <div className="w-20 h-20 bg-[#0055ff] rounded-none flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,85,255,0.4)]">
                  <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase italic animate-pulse">Order_Synchronized</h2>
                  <p className="text-zinc-500 uppercase text-[9px] tracking-[0.2em] font-black">A verification relay has been sent to {customerInfo.email}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between w-full max-w-sm mx-auto group cursor-pointer" onClick={() => { navigator.clipboard.writeText(orders[0]?.id || ''); showToast('Order ID Copied'); }}>
                  <div className="text-left">
                    <div className="text-[8px] text-zinc-500 font-black uppercase mb-1">Trace_ID</div>
                    <div className="text-xs font-mono font-bold tracking-widest">{orders[0]?.id || 'ORD-X34B9'}</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-zinc-600 group-hover:text-[#0055ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </div>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="bg-white text-black text-[10px] font-black uppercase px-12 py-4 tracking-[0.4em] hover:bg-[#0055ff] hover:text-white transition-all transform hover:scale-105 active:scale-95"
                >
                  Confirm_Exit
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                <header className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-black heading-font uppercase">STREET THREADX CHECKOUT</h2>
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
                          <input id="checkout-name" type="text" value={customerInfo.name} onChange={e => handleCustomerInfoChange('name', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.name ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="Full Name" />
                          {checkoutErrors.name && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.name}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-zinc-500">Contact_Number</label>
                          <input 
                            id="checkout-phone"
                            type="tel" 
                            value={customerInfo.phone} 
                            onChange={e => handleCustomerInfoChange('phone', e.target.value)} 
                            className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.phone ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} 
                            placeholder="+8801XXXXXXXXX" 
                          />
                          {checkoutErrors.phone && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.phone}</p>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black uppercase text-zinc-500">Email_Address</label>
                        </div>
                        <div className="flex items-center gap-2 relative">
                          <input 
                            id="checkout-email" 
                            type="email" 
                            value={customerInfo.email} 
                            onChange={e => handleCustomerInfoChange('email', e.target.value)}
                            className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all ${
                                checkoutErrors.email 
                                  ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                                  : 'border-zinc-800 focus:border-[#0055ff]'
                            }`} 
                            placeholder="ENTITY@REACH.COM" 
                          />
                        </div>
                        {checkoutErrors.email && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.email}</p>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Shipping_Address</label>
                            <textarea id="checkout-address" value={customerInfo.address} onChange={e => handleCustomerInfoChange('address', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all min-h-[80px] ${checkoutErrors.address ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="Town/ Village, Thana, District" />
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
                                <textarea id="checkout-billing" value={customerInfo.billingAddress} onChange={e => handleCustomerInfoChange('billingAddress', e.target.value)} className={`w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all min-h-[80px]`} placeholder="BILLING ADDRESS..." />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">City</label>
                            <input id="checkout-city" type="text" value={customerInfo.city} onChange={e => handleCustomerInfoChange('city', e.target.value)} className={`w-full bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.city ? 'border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-zinc-800 focus:border-[#0055ff]'}`} placeholder="CITY" />
                            {checkoutErrors.city && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.city}</p>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-zinc-500">Customer_Note / Special_Instructions</label>
                            <textarea 
                              id="checkout-notes" 
                              value={customerInfo.notes} 
                              onChange={e => handleCustomerInfoChange('notes', e.target.value)} 
                              className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all min-h-[80px]" 
                              placeholder="GIFT MESSAGES, DELIVERY PROTOCOLS, ACCESS CODES..." 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-500">Select Payment Method</h3>
                        
                        <div className="space-y-8">
                          {/* Section 1: Mobile Banking */}
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-[#0055ff] tracking-widest border-l-2 border-[#0055ff] pl-2">01_Mobile_Banking</h3>
                            <div className="grid grid-cols-1 gap-2">
                              {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                                <div 
                                  key={method}
                                  onClick={() => handleCustomerInfoChange('paymentMethod', method as any)}
                                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${customerInfo.paymentMethod === method ? 'border-[#0055ff] bg-[#0055ff]/10' : 'border-zinc-800 bg-zinc-900/50 opacity-60 hover:opacity-100'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-none border-2 flex items-center justify-center ${customerInfo.paymentMethod === method ? 'border-[#0055ff]' : 'border-zinc-700'}`}>
                                      {customerInfo.paymentMethod === method && <div className="w-2 h-2 rounded-none bg-[#0055ff]"></div>}
                                    </div>
                                    <span className="text-sm font-bold">{method}</span>
                                  </div>

                                  {customerInfo.paymentMethod === method && (
                                    <div className="mt-4 pt-4 border-t border-[#0055ff]/30 text-xs text-zinc-300 leading-relaxed space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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

                                      <div className="space-y-3 pt-2">
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
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase text-zinc-500 flex justify-between">
                                            <span>Transaction Screenshot</span>
                                            {screenshotSize && (
                                              <span className="text-zinc-400 font-mono font-normal tracking-wide lowercase">{screenshotSize}</span>
                                            )}
                                          </label>
                                          <div className="relative">
                                            {!customerInfo.transactionScreenshot && !isUploadingScreenshot && (
                                              <>
                                                <input 
                                                  type="file" 
                                                  id="checkout-screenshot-file-1"
                                                  accept=".png,.jpg,.jpeg"
                                                  onChange={handleScreenshotUpload}
                                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-400 outline-none flex items-center justify-between hover:border-[#0055ff] hover:bg-[#0055ff]/5 hover:text-white transition-all duration-300">
                                                  <span className="truncate">Upload Screenshot (PNG, JPG)</span>
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                                </div>
                                              </>
                                            )}

                                            {isUploadingScreenshot && (
                                              <div className="w-full bg-zinc-950 border border-[#0055ff]/30 p-3 text-xs font-mono relative overflow-hidden flex items-center justify-between">
                                                {/* Background Progress bar */}
                                                <div 
                                                  className="absolute left-0 top-0 bottom-0 bg-[#0055ff]/10 border-r border-[#0055ff]/30 transition-all duration-300"
                                                  style={{ width: `${screenshotUploadProgress}%` }}
                                                />
                                                <div className="relative z-10 flex flex-col gap-1 min-w-0 flex-1">
                                                  <div className="flex justify-between items-center pr-2 font-black uppercase text-[10px] tracking-wider">
                                                    <span className="text-[#0055ff] truncate max-w-[150px]">{screenshotName || 'Uploading...'}</span>
                                                    <span className="text-white font-mono">{screenshotUploadProgress}%</span>
                                                  </div>
                                                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                    Uploading Payload: {screenshotSize || '...'}
                                                  </div>
                                                </div>
                                                <div className="relative z-10 text-[#0055ff]">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                  </svg>
                                                </div>
                                              </div>
                                            )}

                                            {customerInfo.transactionScreenshot && !isUploadingScreenshot && (
                                              <div className="w-full bg-zinc-950 border border-emerald-500/30 p-2.5 text-xs font-mono flex items-center justify-between gap-3 relative group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                  <div className="w-10 h-10 border border-emerald-500/20 bg-zinc-900 flex-shrink-0 relative overflow-hidden">
                                                    <img 
                                                      src={customerInfo.transactionScreenshot} 
                                                      alt="Screenshot Preview" 
                                                      className="w-full h-full object-cover"
                                                      referrerPolicy="no-referrer"
                                                    />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="text-[#10b981] font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                      <span>UPLOADED_OK</span>
                                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    </p>
                                                    <p className="text-[9px] text-zinc-400 truncate max-w-[150px] font-bold" title={screenshotName}>
                                                      {screenshotName || 'screenshot.jpg'}
                                                    </p>
                                                    {screenshotSize && (
                                                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{screenshotSize}</span>
                                                    )}
                                                  </div>
                                                </div>
                                                <button 
                                                  type="button"
                                                  onClick={() => {
                                                    setCustomerInfo(prev => ({ ...prev, transactionScreenshot: '' }));
                                                    setScreenshotSize('');
                                                    setScreenshotName('');
                                                    setScreenshotUploadProgress(0);
                                                  }}
                                                  className="text-[9px] font-black bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 px-2 py-1.5 uppercase transition-all duration-200"
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Section 2: Card Payment */}
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-widest border-l-2 border-emerald-500 pl-2">02_Secure_Card_Payment</h3>
                            <div className="grid grid-cols-1 gap-2">
                              {(['Credit Card', 'Debit Card'] as const).map((method) => (
                                <div 
                                  key={method}
                                  onClick={() => handleCustomerInfoChange('paymentMethod', method as any)}
                                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${customerInfo.paymentMethod === method ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50 opacity-60 hover:opacity-100'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-none border-2 flex items-center justify-center ${customerInfo.paymentMethod === method ? 'border-emerald-500' : 'border-zinc-700'}`}>
                                      {customerInfo.paymentMethod === method && <div className="w-2 h-2 rounded-none bg-emerald-500"></div>}
                                    </div>
                                    <span className="text-sm font-bold">{method}</span>
                                  </div>

                                  {customerInfo.paymentMethod === method && (
                                    <div className="mt-4 pt-4 border-t border-emerald-500/30 text-xs text-zinc-300 leading-relaxed space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                      <div className="space-y-1">
                                        <p className="font-black text-emerald-500 uppercase tracking-wider mb-2 text-xs">Secure Card Checkout (50% Advance)</p>
                                        <p>Since these are custom pieces, we only charge <span className="text-white font-bold">50% upfront (৳{Math.ceil(cartTotal * 0.5)})</span> via our secure gateway. The remaining 50% is due right before shipping.</p>
                                        
                                        {/* Real Card Input Fields */}
                                        <div className="pt-4 space-y-3 animate-in fade-in duration-500">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-zinc-500">Card Number</label>
                                            <div className="relative">
                                              <input 
                                                id="checkout-cardNumber"
                                                type="text" 
                                                placeholder="XXXX XXXX XXXX XXXX" 
                                                value={customerInfo.cardNumber}
                                                onChange={e => handleCustomerInfoChange('cardNumber', e.target.value)}
                                                className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.cardNumber ? 'border-rose-500' : 'border-zinc-800 focus:border-emerald-500'}`}
                                              />
                                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-50">
                                                <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-2 grayscale invert" />
                                                <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-2 grayscale invert" />
                                              </div>
                                            </div>
                                            {checkoutErrors.cardNumber && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.cardNumber}</p>}
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <label className="text-[9px] font-black uppercase text-zinc-500">Expiry</label>
                                              <input 
                                                id="checkout-cardExpiry"
                                                type="text" 
                                                placeholder="MM/YY" 
                                                value={customerInfo.cardExpiry}
                                                onChange={e => handleCustomerInfoChange('cardExpiry', e.target.value)}
                                                className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.cardExpiry ? 'border-rose-500' : 'border-zinc-800 focus:border-emerald-500'}`}
                                              />
                                              {checkoutErrors.cardExpiry && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.cardExpiry}</p>}
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[9px] font-black uppercase text-zinc-500">CVC</label>
                                              <input 
                                                id="checkout-cardCvc"
                                                type="text" 
                                                placeholder="***" 
                                                value={customerInfo.cardCvc}
                                                onChange={e => handleCustomerInfoChange('cardCvc', e.target.value)}
                                                className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none transition-all ${checkoutErrors.cardCvc ? 'border-rose-500' : 'border-zinc-800 focus:border-emerald-500'}`}
                                              />
                                              {checkoutErrors.cardCvc && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.cardCvc}</p>}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex gap-2 pt-2 opacity-50">
                                          <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 grayscale invert" />
                                          <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 grayscale invert" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Section 3: Cash on Delivery */}
                          <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-rose-500 tracking-widest border-l-2 border-rose-500 pl-2">03_Offline_Payment</h3>
                            <div 
                              onClick={() => handleCustomerInfoChange('paymentMethod', 'COD')}
                              className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${customerInfo.paymentMethod === 'COD' ? 'border-rose-500 bg-rose-500/10' : 'border-zinc-800 bg-zinc-900/50 opacity-60 hover:opacity-100'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-none border-2 flex items-center justify-center ${customerInfo.paymentMethod === 'COD' ? 'border-rose-500' : 'border-zinc-700'}`}>
                                  {customerInfo.paymentMethod === 'COD' && <div className="w-2 h-2 rounded-none bg-rose-500"></div>}
                                </div>
                                <span className="text-sm font-bold">Cash on Delivery</span>
                              </div>

                              {customerInfo.paymentMethod === 'COD' && (
                                <div className="mt-4 pt-4 border-t border-rose-500/30 text-xs text-zinc-300 leading-relaxed space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="space-y-1">
                                    <p className="font-black text-rose-500 uppercase tracking-wider mb-2">Partial Delivery Advance Required</p>
                                    <p>For custom streetwear pieces, we require a <span className="text-white font-bold">৳150 Delivery Advance</span> to confirm your order.</p>
                                    <p className="pt-2">1. Send <strong className="text-white">৳150</strong> to any Merchant number above.</p>
                                    <p>2. Enter the TrxID below to verify.</p>
                                  </div>

                                  <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-zinc-500">Sender Number <span className="text-rose-500">*</span></label>
                                      <input 
                                        type="tel" 
                                        value={customerInfo.senderNumber}
                                        onChange={e => handleCustomerInfoChange('senderNumber', e.target.value)}
                                        placeholder="e.g. 017XXXXXXXX"
                                        className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500 ${checkoutErrors.senderNumber ? 'border-rose-500' : 'border-zinc-800'}`}
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
                                        className={`w-full bg-zinc-900/50 border px-4 py-2 text-xs font-bold text-white outline-none focus:border-rose-500 ${checkoutErrors.trxId ? 'border-rose-500' : 'border-zinc-800'}`}
                                      />
                                      {checkoutErrors.trxId && <p className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">{checkoutErrors.trxId}</p>}
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-zinc-500 flex justify-between">
                                        <span>Transaction Screenshot</span>
                                        {screenshotSize && (
                                          <span className="text-zinc-400 font-mono font-normal tracking-wide lowercase">{screenshotSize}</span>
                                        )}
                                      </label>
                                      <div className="relative">
                                        {!customerInfo.transactionScreenshot && !isUploadingScreenshot && (
                                          <>
                                            <input 
                                              type="file" 
                                              id="checkout-screenshot-file-2"
                                              accept=".png,.jpg,.jpeg"
                                              onChange={handleScreenshotUpload}
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full bg-zinc-900/50 border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-400 outline-none flex items-center justify-between hover:border-rose-500 hover:bg-rose-500/5 hover:text-white transition-all duration-300">
                                              <span className="truncate">Upload Screenshot (PNG, JPG)</span>
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                            </div>
                                          </>
                                        )}

                                        {isUploadingScreenshot && (
                                          <div className="w-full bg-zinc-950 border border-rose-500/30 p-3 text-xs font-mono relative overflow-hidden flex items-center justify-between">
                                            {/* Background Progress bar */}
                                            <div 
                                              className="absolute left-0 top-0 bottom-0 bg-rose-500/10 border-r border-rose-500/30 transition-all duration-300"
                                              style={{ width: `${screenshotUploadProgress}%` }}
                                            />
                                            <div className="relative z-10 flex flex-col gap-1 min-w-0 flex-1">
                                              <div className="flex justify-between items-center pr-2 font-black uppercase text-[10px] tracking-wider">
                                                <span className="text-rose-500 truncate max-w-[150px]">{screenshotName || 'Uploading...'}</span>
                                                <span className="text-white font-mono">{screenshotUploadProgress}%</span>
                                              </div>
                                              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                Uploading Payload: {screenshotSize || '...'}
                                              </div>
                                            </div>
                                            <div className="relative z-10 text-rose-500">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}

                                        {customerInfo.transactionScreenshot && !isUploadingScreenshot && (
                                          <div className="w-full bg-zinc-950 border border-emerald-500/30 p-2.5 text-xs font-mono flex items-center justify-between gap-3 relative group">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-10 h-10 border border-emerald-500/20 bg-zinc-900 flex-shrink-0 relative overflow-hidden">
                                                <img 
                                                  src={customerInfo.transactionScreenshot} 
                                                  alt="Screenshot Preview" 
                                                  className="w-full h-full object-cover"
                                                  referrerPolicy="no-referrer"
                                                />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-[#10b981] font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                                  <span>UPLOADED_OK</span>
                                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                </p>
                                                <p className="text-[9px] text-zinc-400 truncate max-w-[150px] font-bold" title={screenshotName}>
                                                  {screenshotName || 'screenshot.jpg'}
                                                </p>
                                                {screenshotSize && (
                                                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{screenshotSize}</span>
                                                )}
                                              </div>
                                            </div>
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                setCustomerInfo(prev => ({ ...prev, transactionScreenshot: '' }));
                                                setScreenshotSize('');
                                                setScreenshotName('');
                                                setScreenshotUploadProgress(0);
                                              }}
                                              className="text-[9px] font-black bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 px-2 py-1.5 uppercase transition-all duration-200"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
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

                            <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-black">
                                <span>Tax/VAT (5%)</span>
                                <span>৳{Math.round(cartTax).toLocaleString()}</span>
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

                            <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 flex items-center gap-3">
                              <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse"></div>
                              <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Est. Logistics Completion: 2-3 Solar Days</span>
                            </div>

                            {['bKash', 'Nagad', 'Rocket', 'Credit Card', 'Debit Card', 'COD'].includes(customerInfo.paymentMethod) && (
                              <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-800">
                                <span className="text-[10px] text-zinc-500 uppercase font-black">
                                  {customerInfo.paymentMethod === 'COD' ? 'Delivery Advance (COD)' : 'Advance to pay now (50%)'}
                                </span>
                                <span className={`text-sm font-black ${customerInfo.paymentMethod === 'COD' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  ৳{(customerInfo.paymentMethod === 'COD' ? 150 : Math.ceil(cartTotal * 0.5)).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {['bKash', 'Nagad', 'Rocket', 'Credit Card', 'Debit Card', 'COD'].includes(customerInfo.paymentMethod) && (
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] text-zinc-500 uppercase font-black">
                                  {customerInfo.paymentMethod === 'COD' ? 'Due on Delivery' : 'Due Before Shipping'}
                                </span>
                                <span className="text-sm font-black text-rose-500">
                                  ৳{(cartTotal - (customerInfo.paymentMethod === 'COD' ? 150 : Math.ceil(cartTotal * 0.5))).toLocaleString()}
                                </span>
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
                                className={`flex-1 bg-zinc-900/50 border px-4 py-3 text-xs font-bold text-white outline-none transition-all ${discountError ? 'border-rose-500' : 'border-zinc-800 focus:border-[#0055ff]'}`}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-10">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedProduct(null); setSelectedImageIndex(0); setZoomStyle({}); }}></div>
          <div className="relative w-full max-w-[1500px] h-full max-h-[100vh] md:max-h-[95vh] bg-[#0A192F] text-gray-100 overflow-hidden flex flex-col md:rounded-xl shadow-2xl font-sans border border-[#1C3A6E]/30">
            
            {/* Header with close button */}
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-[#1C3A6E] bg-[#071324] shrink-0">
              <div className="font-bold text-xl tracking-tighter uppercase text-white">STREET<span className="text-[#4da6ff]">THREADX</span></div>
              <button onClick={() => { setSelectedProduct(null); setSelectedImageIndex(0); setZoomStyle({}); }} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-[#152B4E]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col overflow-y-auto no-scrollbar bg-[#0A192F] flex-1">
              
              {/* TOP LAYOUT container for Amazon style columns */}
              <div className="flex flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 md:gap-10 w-full max-w-[1400px] mx-auto">
                
                {/* Left Column: Images */}
                <div className="w-full lg:w-[45%] flex flex-col-reverse md:flex-row gap-4 lg:sticky lg:top-0 h-fit">
                {/* Thumbnails */}
                <div className="flex flex-row md:flex-col gap-3 w-full md:w-16 shrink-0 md:pt-2 overflow-x-auto overflow-y-hidden md:overflow-visible no-scrollbar">
                  {(selectedProduct.images || []).map((img, idx) => (
                    <button 
                      key={idx} 
                      onMouseEnter={() => setSelectedImageIndex(idx)}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-14 h-14 md:w-full md:h-auto flex-shrink-0 rounded-lg overflow-hidden transition-all bg-[#0d0d0d] box-border ${selectedImageIndex === idx ? 'ring-2 ring-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'ring-1 ring-zinc-800 hover:ring-white/50'}`}
                    >
                      <img loading="lazy" src={img} className="w-full aspect-[3/4] object-contain bg-[#0d0d0d]" alt="" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                {/* Main Image */}
                <div 
                  className="flex-1 flex items-center justify-center overflow-hidden cursor-zoom-in group/zoom bg-[#0d0d0d] rounded relative min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeaveZoom}
                >
                  <img loading="lazy" 
                    src={selectedProduct.images?.[selectedImageIndex] || selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} 
                    className="w-full max-w-[80vw] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[650px] max-h-[50vh] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[650px] object-contain flex-shrink transition-transform duration-300 ease-out p-2 sm:p-4" 
                    style={zoomStyle}
                    alt="" 
                    referrerPolicy="no-referrer" 
                  />
                  {selectedProduct.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[2px] pointer-events-none">
                      <div className="border-4 border-white/10 px-10 py-4 bg-black/60 rotate-[-12deg] shadow-2xl">
                        <span className="text-white text-2xl font-black uppercase tracking-[0.5em]">Sold_Out</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column: Details */}
              <div className="w-full lg:w-[35%] flex flex-col space-y-4">
                <div>
                  <a href="#" className="text-[#4da6ff] hover:text-[#99ccff] hover:underline text-sm tracking-wide">Visit the STREET THREADX Store</a>
                  <h1 className="text-2xl sm:text-[28px] font-normal text-white leading-tight mt-1">{selectedProduct.name}</h1>
                  
                  {/* Ratings */}
                  <div className="flex items-center gap-4 mt-2 border-b border-[#1C3A6E] pb-2">
                    <div className="flex items-center text-[#FFA41C]">
                      {[1,2,3,4,5].map(star => (
                        <svg key={star} className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-[#2D4A80] fill-current'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-[#4da6ff] hover:text-[#99ccff] hover:underline text-sm ml-2 cursor-pointer">{filteredReviews.length} ratings</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 py-1">
                  <div className="flex items-start gap-1">
                    <span className="text-sm mt-1.5 text-gray-300 font-medium">৳</span>
                    <span className="text-3xl font-medium text-white">{selectedProduct.price.toLocaleString()}</span>
                  </div>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span className="text-lg text-zinc-500 line-through font-bold">৳{selectedProduct.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Variations */}
                <div className="space-y-4 pt-2">
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Color: <span className="font-bold text-white">{selectedColor || selectedProduct.colors[0]}</span></p>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.colors.map(color => (
                          <button 
                            key={color} 
                            onClick={() => setSelectedColor(color)}
                            className={`w-12 h-12 rounded border transition-all overflow-hidden ${selectedColor === color ? 'ring-2 ring-offset-1 ring-offset-[#0A192F] ring-[#e77600] border-transparent' : 'border-[#1C3A6E] hover:border-[#4da6ff]'}`} 
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
                      <p className="text-sm text-gray-400 font-bold">Size:</p>
                      <button 
                        onClick={() => setIsSizeGuideOpen(true)}
                        className="text-sm text-[#4da6ff] hover:text-[#99ccff] hover:underline flex items-center gap-1.5"
                      >
                        <Ruler size={14} /> Guide
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map(size => (
                        <button 
                          key={size} 
                          onClick={() => setSelectedSize(size)} 
                          className={`min-w-[3rem] px-3 py-1.5 text-sm border bg-[#08172D] rounded text-gray-100 transition-all ${selectedSize === size ? 'border-[#e77600] bg-[#1a110a] ring-1 ring-[#e77600]' : 'border-[#1C3A6E] hover:bg-[#112A4A]'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1C3A6E] mt-4">
                  <h3 className="font-bold text-base mb-3 text-white">Product Details</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedProduct.description}</p>
                    
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                      {selectedProduct.materialComposition && (
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-white min-w-[90px]">Material:</span> 
                          <span className="flex-1">{selectedProduct.materialComposition}</span>
                        </li>
                      )}
                      {selectedProduct.careInstructions && (
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-white min-w-[90px]">Care:</span> 
                          <span className="flex-1">{selectedProduct.careInstructions}</span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-white min-w-[90px]">Category:</span> 
                        <span className="flex-1">{selectedProduct.category}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-white min-w-[90px]">Brand:</span> 
                        <span className="flex-1">{selectedProduct.brand || 'STREET THREADX'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-white min-w-[90px]">Quality:</span> 
                        <span className="flex-1">100% Authentic Premium Grade</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-white min-w-[90px]">Origin:</span> 
                        <span className="flex-1">Exclusive Original Design</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-[#1C3A6E] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#0B1A2F] rounded-lg text-[#4da6ff]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-bold">Secure Delivery</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Nationwide shipping with tracking</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#0B1A2F] rounded-lg text-[#4da6ff]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-bold">Quality Guarantee</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Premium materials & craftsmanship</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Buy Box */}
              <div className="w-full lg:w-[20%] mt-6 lg:mt-0">
                <div className="border border-[#1C3A6E] rounded-lg p-4 space-y-4 shadow-sm bg-[#061122]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-1">
                      <span className="text-sm mt-1 text-gray-300">৳</span>
                      <span className="text-3xl font-medium text-white">{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                      <span className="text-sm text-zinc-500 line-through font-bold px-1">৳{selectedProduct.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-300">
                    <span className="text-[#4da6ff] hover:text-[#99ccff] hover:underline cursor-pointer">FREE delivery</span> <strong>Tomorrow</strong>.<br/>Order within <span className="text-emerald-400 font-bold">2 hrs 30 mins</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[#4da6ff] hover:text-[#99ccff] hover:underline cursor-pointer text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Deliver to Dhaka
                  </div>

                  <div className="text-lg text-emerald-400 font-medium">
                    {(() => {
                      const maxStock = selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock;
                      return maxStock > 0 ? (maxStock < 5 ? `Only ${maxStock} left in stock - order soon.` : 'In Stock') : <span className="text-rose-500">Out of Stock</span>;
                    })()}
                  </div>

                  <div className="flex items-center gap-2 mb-4 mt-2">
                    <label className={`text-sm font-bold text-gray-100 border border-[#1C3A6E] rounded-md overflow-hidden hover:border-[#4da6ff] hover:bg-[#112A4A] transition-colors flex items-center bg-[#0B1A2F] relative w-full shadow-sm hover:shadow ${((selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <span className="px-3 text-gray-400 bg-[#071324] py-2 border-r border-[#1C3A6E] text-xs">Qty:</span>
                      <select 
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                        className="w-full pl-3 pr-8 py-2 bg-transparent outline-none text-sm cursor-pointer appearance-none text-white focus:ring-2 focus:ring-[#4da6ff]"
                        disabled={(selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0}
                      >
                        {Array.from({ length: Math.min(10, Math.max(1, (selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock))) }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n} className="bg-[#0A192F] text-white">{n}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 flex items-center px-1 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <button 
                      disabled={addToCartState !== 'idle' || ((selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0)}
                      onClick={() => {
                        if (!selectedSize) {
                          showToast('Please select a size first.');
                          return;
                        }
                        addToCart(selectedProduct, selectedSize, selectedColor || selectedProduct.colors?.[0], selectedQuantity, false);
                      }} 
                      className={`w-full py-2.5 rounded-full text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2
                        ${addToCartState === 'success' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' 
                        : addToCartState === 'adding' ? 'bg-gray-300 text-gray-600 cursor-wait'
                        : ((selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0) ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-[#ffd814] hover:bg-[#f7ca00] text-gray-900 border border-[#FCD200]'
                      }`}
                    >
                      {addToCartState === 'adding' && (
                        <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      )}
                      {addToCartState === 'success' && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      )}
                      {addToCartState === 'idle' && 'Add to Cart'}
                      {addToCartState === 'adding' && 'Adding...'}
                      {addToCartState === 'success' && 'Added to Cart'}
                    </button>
                    <button 
                      disabled={((selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0)}
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
                      className={`w-full py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${((selectedProduct.variants && selectedSize ? (selectedProduct.variants.find(v => v.size === selectedSize && (selectedColor ? v.color === selectedColor : true))?.stock ?? selectedProduct.stock) : selectedProduct.stock) === 0) ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50' : 'bg-[#ffa41c] hover:bg-[#fa8900] text-gray-900 border border-[#FF8F00] shadow-sm'}`}
                    >
                      Buy Now
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1.5 pt-4 text-left">
                    <div className="flex justify-between">
                      <span className="w-24 text-gray-500">Ships from</span>
                      <span className="text-white flex-1 ml-2 truncate">streetthreadx.store</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="w-24 text-gray-500">Sold by</span>
                      <span className="text-[#4da6ff] hover:text-[#99ccff] hover:underline cursor-pointer flex-1 ml-2 truncate">streetthreadx.store</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="w-24 text-gray-500">Returns</span>
                      <span className="text-[#4da6ff] hover:text-[#99ccff] hover:underline cursor-pointer flex-1 ml-2">30-day refund/replacement</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="w-24 text-gray-500">Payment</span>
                      <span className="text-[#4da6ff] hover:text-[#99ccff] hover:underline cursor-pointer flex-1 ml-2">Secure transaction</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-[#1C3A6E] mt-2">
                    <button 
                      onClick={() => toggleWishlist(selectedProduct)} 
                      className="w-full py-1.5 bg-[#0B1A2F] border border-[#1C3A6E] rounded shadow-sm hover:bg-[#112A4A] text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${wishlist.some(p => p.id === selectedProduct.id) ? 'fill-red-500 text-red-500' : 'fill-transparent text-[#2D4A80]'}`} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {wishlist.some(p => p.id === selectedProduct.id) ? 'Remove from List' : 'Add to List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

              {/* BOTTOM LAYOUT container for Related and Reviews */}
              <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-12">
                {/* Related Products Section */}
                <div className="w-full border-t border-[#1C3A6E] pt-8">
                  <h2 className="text-xl font-bold mb-6 text-[#4da6ff]">Customers also viewed</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products
                      .filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id)
                      .slice(0, 5)
                      .map(relProduct => (
                        <div 
                          key={relProduct.id} 
                          className="group relative flex flex-col cursor-pointer p-3 bg-[#061122] hover:shadow-lg transition-shadow duration-200 border border-transparent hover:border-[#1C3A6E] rounded-lg"
                          onClick={() => {
                            setSelectedProduct(relProduct);
                            setSelectedImageIndex(0);
                            const modalEl = document.querySelector('.overflow-y-auto.no-scrollbar');
                            if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div className="relative w-full aspect-[3/4] object-contain overflow-hidden bg-[#0d0d0d] mb-3 border border-zinc-800 p-2">
                            <img loading="lazy" src={relProduct.images[0]} alt={relProduct.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="space-y-1">
                            <a className="text-sm text-[#4da6ff] group-hover:text-[#99ccff] group-hover:underline line-clamp-2 leading-tight">{relProduct.name}</a>
                            <div className="flex items-center text-[#FFA41C]">
                              {[1,2,3,4,5].map(star => (
                                <svg key={star} className={`w-3 h-3 ${star <= 4 ? 'fill-current' : 'text-[#2D4A80] fill-current'}`} viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="text-[#4da6ff] text-xs ml-1 font-normal">{(Math.random() * 1000).toFixed(0)}</span>
                            </div>
                            <p className="text-base font-medium text-emerald-400 mt-1">৳{relProduct.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Customer Reviews Section */}
                <div className="w-full border-t border-[#1C3A6E] pt-8 pb-12">
                  <div className="flex flex-col lg:flex-row gap-12">
                    {/* Review Summary */}
                    <div className="w-full lg:w-1/3 space-y-6">
                      <h2 className="text-xl font-bold text-white">Customer reviews</h2>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-[#FFA41C]">
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-[#2D4A80] fill-current'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-lg font-bold text-white">{averageRating.toFixed(1)} out of 5</span>
                      </div>
                      <p className="text-sm text-gray-400">{filteredReviews.length} global ratings</p>
                      
                      <div className="space-y-3 pt-4 border-t border-[#1C3A6E] text-sm">
                        {[5, 4, 3, 2, 1].map(stars => {
                          const count = filteredReviews.filter(r => r.rating === stars).length;
                          const percentage = filteredReviews.length > 0 ? (count / filteredReviews.length) * 100 : 0;
                          return (
                            <div key={stars} className="flex items-center gap-3 cursor-pointer hover:opacity-80 group text-[#4da6ff] hover:text-[#99ccff] hover:underline">
                              <span className="w-12 whitespace-nowrap">{stars} star</span>
                              <div className="flex-1 h-5 bg-[#061122] border border-[#1C3A6E] rounded overflow-hidden">
                                <div className="h-full bg-[#FFA41C] border border-[#DE7921] rounded-l" style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span className="w-10 text-right text-gray-300">{Math.round(percentage)}%</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-6 border-t border-[#1C3A6E]">
                        <h3 className="font-bold text-lg mb-2 text-white">Review this product</h3>
                        <p className="text-sm text-gray-400 mb-4">Share your thoughts with other customers</p>
                        
                        {customerInfo?.email ? (
                          <form onSubmit={handleReviewSubmit} className="space-y-4">
                            <div>
                              <div className="flex gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setNewReviewRating(star)}
                                    className={`transition-all ${star <= newReviewRating ? 'text-[#FFA41C]' : 'text-[#2D4A80]'}`}
                                  >
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                              <textarea 
                                value={newReviewComment}
                                onChange={(e) => setNewReviewComment(e.target.value)}
                                maxLength={COMMENT_LIMIT}
                                placeholder="What did you like or dislike?"
                                className="w-full p-3 border border-[#1C3A6E] rounded focus:border-[#4da6ff] focus:ring-1 focus:ring-[#4da6ff] outline-none text-sm min-h-[100px] bg-[#061122] text-white transition-all"
                                required
                              />
                            </div>
                            <button 
                              type="submit"
                              disabled={isSubmittingReview || !newReviewComment}
                              className="w-full py-2 bg-[#0B1A2F] hover:bg-[#112A4A] border border-[#1C3A6E] rounded shadow-sm text-sm font-medium transition-colors disabled:opacity-50 text-white"
                            >
                              {isSubmittingReview ? 'Submitting...' : 'Write a customer review'}
                            </button>
                          </form>
                        ) : (
                          <button 
                            onClick={() => {
                              setSelectedProduct(null);
                              setCurrentView(ViewState.CUSTOMER_LOGIN);
                            }}
                            className="w-full py-2 bg-[#0B1A2F] hover:bg-[#112A4A] border border-[#1C3A6E] rounded shadow-sm text-sm font-medium transition-colors text-white"
                          >
                            Write a customer review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Review List */}
                    <div className="w-full lg:w-2/3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-zinc-900 pb-4">
                        <h3 className="font-black text-white text-lg uppercase tracking-tight">Top reviews from Bangladesh</h3>
                        <select 
                          value={reviewSortType}
                          onChange={(e) => setReviewSortType(e.target.value as 'Recent' | 'Highest')}
                          className="bg-zinc-900 border border-zinc-800 text-white text-[10px] uppercase font-black tracking-widest px-4 py-2 outline-none focus:border-[#0055ff] transition-colors"
                        >
                          <option value="Recent">Sort: Most Recent</option>
                          <option value="Highest">Sort: Highest Rated</option>
                        </select>
                      </div>
                      <div className="space-y-6">
                        {filteredReviews.length > 0 ? (
                          filteredReviews.map(review => (
                          <div key={review.id} className="border-b border-[#1C3A6E] pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-full bg-[#112A4A] text-[#4da6ff] flex items-center justify-center font-medium">
                                {review.author[0]}
                              </div>
                              <span className="font-medium text-white">{review.author}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex text-[#FFA41C]">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-current' : 'text-[#2D4A80] fill-current'}`} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="font-bold text-white text-sm">Verified Purchase</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">Reviewed on {review.date}</p>
                            <p className="text-gray-300 text-sm whitespace-pre-line">{review.comment}</p>
                            <div className="mt-3 flex gap-4 text-xs text-gray-400 items-center">
                              <button className="border border-[#1C3A6E] bg-[#061122] px-3 py-1.5 rounded-full hover:bg-[#112A4A] transition-colors shadow-sm">Helpful</button>
                              <span className="cursor-pointer hover:underline text-[#4da6ff]">Report abuse</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm">No reviews yet for this product.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI-Powered Recommendations Section */}
                <div className="w-full border-t border-[#1C3A6E] pt-8 pb-12">
                  <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#4da6ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI-Powered Recommendations
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products
                      .filter(p => p.id !== selectedProduct.id && p.category === selectedProduct.category)
                      .sort((a, b) => Math.abs(a.price - selectedProduct.price) - Math.abs(b.price - selectedProduct.price))
                      .slice(0, 5)
                      .map(aiProduct => (
                        <div 
                          key={`ai-${aiProduct.id}`} 
                          className="group relative flex flex-col cursor-pointer p-3 bg-[#061122] hover:shadow-lg hover:shadow-[#0055ff]/10 transition-shadow duration-200 border border-[#1C3A6E]/50 hover:border-[#4da6ff] rounded-lg"
                          onClick={() => {
                            setSelectedProduct(aiProduct);
                            setSelectedImageIndex(0);
                            const modalEl = document.querySelector('.overflow-y-auto.no-scrollbar');
                            if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div className="relative w-full aspect-[3/4] object-contain overflow-hidden bg-[#0d0d0d] mb-3 border border-zinc-800 p-2">
                            <img loading="lazy" src={aiProduct.images?.[0] || 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800'} alt={aiProduct.name} className="w-full h-full object-contain" />
                            <div className="absolute top-2 right-2 bg-black/80 p-1 rounded-full border border-[#4da6ff]/30 text-[#4da6ff]">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <a className="text-sm text-[#4da6ff] group-hover:text-[#99ccff] group-hover:underline line-clamp-2 leading-tight">{aiProduct.name}</a>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-base font-medium text-emerald-400">৳{aiProduct.price.toLocaleString()}</p>
                              {aiProduct.originalPrice && aiProduct.originalPrice > aiProduct.price && (
                                <p className="text-[10px] text-zinc-500 line-through font-bold">৳{aiProduct.originalPrice.toLocaleString()}</p>
                              )}
                            </div>
                            <p className="text-[9px] text-[#4da6ff]/70 font-mono flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Matched by {aiProduct.category.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {quickViewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setQuickViewProduct(null)}></div>
          <div className="relative w-full max-w-4xl bg-[#030b1c] border border-[#1C3A6E] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 rounded-[2rem]">
            {/* Close button */}
            <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-full md:w-1/2 bg-[#020611] flex items-center justify-center p-8 border-r border-[#1C3A6E]/50">
               <img loading="lazy" src={quickViewProduct.images?.[0]} className="w-full h-auto max-h-[400px] object-contain drop-shadow-[0_0_20px_rgba(0,100,255,0.2)]" alt={quickViewProduct.name} />
            </div>
            <div className="w-full md:w-1/2 p-8 flex flex-col justify-center space-y-6">
               <div className="space-y-2">
                 <h2 className="text-[10px] font-black text-[#0066ff] uppercase tracking-[0.3em]">{quickViewProduct.category}</h2>
                 <h1 className="text-3xl text-white font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(0,100,255,0.3)]">{quickViewProduct.name}</h1>
                 <div className="flex items-center gap-3">
                   <p className="text-2xl text-[#3399ff] font-medium font-mono drop-shadow-[0_2px_15px_rgba(0,150,255,0.5)]">৳{quickViewProduct.price.toLocaleString()}</p>
                   {quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price && (
                     <p className="text-lg text-zinc-500 line-through font-bold font-mono">৳{quickViewProduct.originalPrice.toLocaleString()}</p>
                   )}
                 </div>
               </div>
               
               <p className="text-zinc-400 text-sm line-clamp-3 leading-relaxed">{quickViewProduct.description}</p>
               
               <div className="space-y-4 pt-6 border-t border-[#1C3A6E]/50 mt-auto">
                 <div className="flex gap-4">
                   <div className="flex-1">
                     <label className="text-[9px] text-[#0066ff] font-black uppercase mb-2 block tracking-widest">Select Size</label>
                     <select 
                       value={selectedSize}
                       onChange={(e) => setSelectedSize(e.target.value)}
                       className="w-full bg-[#0a1930] border border-[#1C3A6E] text-white p-3 text-xs outline-none focus:border-[#4da6ff] rounded shadow-inner"
                     >
                       <option value="">Choose Size</option>
                       {quickViewProduct.sizes?.map(size => <option key={size} value={size}>{size}</option>)}
                     </select>
                   </div>
                 </div>

                 {/* Deep Share Links */}
                 <div className="flex items-center gap-3 pt-4">
                   <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Share:</span>
                   <button 
                     onClick={() => window.open(`https://wa.me/?text=Check out ${quickViewProduct.name} at ${window.location.origin}/%23product=${quickViewProduct.id}`, '_blank')}
                     className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-full hover:bg-[#25D366] hover:text-white transition-colors"
                     title="Share on WhatsApp"
                   >
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                   </button>
                   <button 
                     onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/#product=${quickViewProduct.id}`)}`, '_blank')}
                     className="p-2 bg-[#1877F2]/10 text-[#1877F2] rounded-full hover:bg-[#1877F2] hover:text-white transition-colors"
                     title="Share on Facebook"
                   >
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                   </button>
                   <button 
                     onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/#product=${quickViewProduct.id}`)}&text=${encodeURIComponent(`Check out ${quickViewProduct.name}!`)}`, '_blank')}
                     className="p-2 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-full hover:bg-[#1DA1F2] hover:text-white transition-colors"
                     title="Share on Twitter"
                   >
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                   </button>
                 </div>
                 
                 <div className="flex gap-3 pt-2">
                   <button 
                      onClick={() => {
                        if (!selectedSize && quickViewProduct.sizes?.length) {
                          showToast('Please select a size');
                          return;
                        }
                        addToCart(quickViewProduct, selectedSize || 'M', quickViewProduct.colors?.[0], 1, true);
                        setQuickViewProduct(null);
                      }}
                      className="flex-1 py-4 bg-gradient-to-r from-[#0055ff] to-[#0088ff] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full shadow-[0_8px_25px_rgba(0,150,255,0.6)] hover:scale-105 active:scale-95 transition-all"
                   >
                      Add to Cart
                   </button>
                   <button 
                      onClick={() => {
                        setQuickViewProduct(null);
                        setSelectedProduct(quickViewProduct);
                      }}
                      className="py-4 px-6 bg-[#0a1930] border border-[#1C3A6E] text-white font-black uppercase tracking-[0.1em] text-[10px] rounded-full hover:bg-[#112A4A] hover:text-[#4da6ff] transition-all"
                   >
                      Full Details
                   </button>
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
          showToast={showToast} 
          socialSettings={socialSettings}
          isLiveEditMode={isLiveEditMode}
          selectedLiveElement={selectedLiveElement}
          setSelectedLiveElement={setSelectedLiveElement}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {currentView !== ViewState.ADMIN_DASHBOARD && (
        <div className="md:hidden fixed bottom-0 w-full z-50 bg-black/95 backdrop-blur-md border-t border-zinc-800 pb-safe">
          <div className="flex justify-around items-center h-16 px-2 relative">
            <button 
              onClick={() => { 
                setIsSearchOpen(false);
                setIsCartOpen(false);
                setCurrentView(ViewState.STORE); 
                setShopFilter('ALL'); 
                window.scrollTo(0,0); 
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors duration-300 ${
                currentView === ViewState.STORE && !isSearchOpen && !isCartOpen 
                  ? 'text-[#0055ff]' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {currentView === ViewState.STORE && !isSearchOpen && !isCartOpen && (
                <>
                  <motion.div 
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-[#0055ff]/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="mobile-nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-[#0055ff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-wider">Home</span>
            </button>

            <button 
              onClick={() => {
                setIsCartOpen(false);
                setIsSearchOpen(!isSearchOpen);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors duration-300 ${
                isSearchOpen 
                  ? 'text-[#0055ff]' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {isSearchOpen && (
                <>
                  <motion.div 
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-[#0055ff]/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="mobile-nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-[#0055ff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-wider">Search</span>
            </button>

            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setIsCartOpen(!isCartOpen);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 transition-all duration-300 ${
                isCartOpen 
                  ? 'text-[#0055ff]' 
                  : cartBounce ? 'scale-110 text-[#0055ff]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {isCartOpen && (
                <>
                  <motion.div 
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-[#0055ff]/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="mobile-nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-[#0055ff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#0055ff] text-white text-[7px] font-black rounded-full h-3.5 w-3.5 flex items-center justify-center">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider">Cart</span>
            </button>

            <button 
              onClick={() => { 
                setIsSearchOpen(false);
                setIsCartOpen(false);
                setCurrentView(ViewState.TRACK_ORDER); 
                window.scrollTo(0, 0); 
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors duration-300 ${
                currentView === ViewState.TRACK_ORDER && !isSearchOpen && !isCartOpen 
                  ? 'text-[#0055ff]' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {currentView === ViewState.TRACK_ORDER && !isSearchOpen && !isCartOpen && (
                <>
                  <motion.div 
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-[#0055ff]/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="mobile-nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-[#0055ff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-wider">Track</span>
            </button>

            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setIsCartOpen(false);
                if (customerInfo?.email) {
                  setCurrentView(ViewState.CUSTOMER_PROFILE);
                } else {
                  setCurrentView(ViewState.CUSTOMER_LOGIN);
                }
                window.scrollTo(0, 0);
              }}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors duration-300 ${
                (currentView === ViewState.CUSTOMER_LOGIN || currentView === ViewState.CUSTOMER_PROFILE) && !isSearchOpen && !isCartOpen 
                  ? 'text-[#0055ff]' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {(currentView === ViewState.CUSTOMER_LOGIN || currentView === ViewState.CUSTOMER_PROFILE) && !isSearchOpen && !isCartOpen && (
                <>
                  <motion.div 
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-[#0055ff]/10 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="mobile-nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-1 bg-[#0055ff]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-wider">Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget 
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onSendMessage={(text, image) => handleSendMessage(text, image)}
        session={chatSessions.find(s => s.id === chatSessionId)}
        customerName={customerInfo.name || 'Guest'}
        isTyping={isAiTyping}
      />

      {/* Product Comparison Floating Bar */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] w-full max-w-xl px-4 pointer-events-none"
          >
            <div className="bg-[#010816]/90 backdrop-blur-xl border border-[#0044cc]/40 p-4 shadow-2xl flex items-center justify-between pointer-events-auto rounded-2xl md:rounded-full">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-4 overflow-hidden">
                  {compareList.map(product => (
                    <div key={`compare-thumb-${product.id}`} className="inline-block h-10 w-10 rounded-full ring-2 ring-[#010816] object-cover bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                      <img loading="lazy" src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-black uppercase tracking-tight text-white">{compareList.length} Items Selected</p>
                  <p className="text-[8px] text-[#0055ff] font-mono uppercase tracking-[0.2em]">{3 - compareList.length} Space Left</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsCompareOpen(true)}
                  disabled={compareList.length < 2}
                  className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${compareList.length >= 2 ? 'bg-[#0055ff] text-white shadow-[0_5px_15px_rgba(0,85,255,0.4)] hover:scale-105' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'}`}
                >
                  {compareList.length < 2 ? 'Select 2+ to Compare' : 'Show Comparison'}
                </button>
                <button 
                  onClick={() => setCompareList([])}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-rose-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBackToTop && currentView === ViewState.STORE && (
          <motion.button
            key="back-to-top"
            id="btn-back-to-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 z-[99] w-12 h-12 bg-black border border-zinc-800 text-[#0055ff] hover:text-white hover:border-[#0055ff] hover:bg-[#0055ff]/10 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
            title="Back to Top"
            aria-label="Back to Top"
          >
            <ArrowUp size={18} className="transition-transform group-hover:-translate-y-1" />
          </motion.button>
        )}
      </AnimatePresence>

      <ProductComparisonModal 
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        products={compareList}
        onRemove={(p) => toggleCompare(p)}
      />

      <SizeGuideModal 
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        product={selectedProduct || undefined}
        socialSettings={socialSettings}
      />

      {showDiagnosticModal && diagnosticReport && (
        <div id="google-diag-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300 font-sans">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl p-6 md:p-8 space-y-6 relative rounded-none shadow-[0_0_50px_rgba(0,85,255,0.15)] text-white">
            <button 
              onClick={() => setShowDiagnosticModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 cursor-pointer"
              title="Close System diagnostics"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <header className="border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0055ff]/10 border border-[#0055ff]/30 text-[#0055ff]">
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#0055ff]">Google_OAuth_Security_Diagnostics</h3>
                  <p className="text-[10px] text-zinc-500 uppercase mt-0.5 tracking-wider">Automated Identity Integration Audit Tool</p>
                </div>
              </div>
            </header>

            <div className="space-y-4">
              {/* Configuration Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-900/40 border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Iframe Sandbox?</span>
                  <span className={`text-[10px] font-bold mt-1 ${diagnosticReport.checks.isInIframe ? "text-amber-500" : "text-emerald-500"}`}>
                    {diagnosticReport.checks.isInIframe ? "⚠️ Sandbox (Nested)" : "✅ Direct Origin"}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Auth Domain Set?</span>
                  <span className={`text-[10px] font-bold mt-1 ${diagnosticReport.checks.authDomainPresent ? "text-emerald-500" : "text-rose-500"}`}>
                    {diagnosticReport.checks.authDomainPresent ? "✅ Configured" : "❌ Missing Configuration"}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-zinc-900 flex flex-col justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Domain Match?</span>
                  <span className={`text-[10px] font-bold mt-1 ${diagnosticReport.checks.domainMatch ? "text-emerald-500" : "text-amber-500"}`}>
                    {diagnosticReport.checks.domainMatch ? "✅ Direct Alignment" : "⚠️ Cross-Origin Proxy"}
                  </span>
                </div>
              </div>

              {/* Host and Target Information */}
              <div className="bg-zinc-900/50 p-4 border border-zinc-900 space-y-2 text-[10px] font-mono">
                <div className="flex justify-between border-b border-zinc-800/50 pb-1.5 text-zinc-400">
                  <span>Firebase Auth Domain:</span>
                  <span className="text-white font-bold">{diagnosticReport.authDomain || "NULL"}</span>
                </div>
                <div className="flex justify-between pt-1.5 text-zinc-400">
                  <span>Client Host Origin:</span>
                  <span className="text-white font-bold">{diagnosticReport.currentOrigin || "NULL"}</span>
                </div>
              </div>

              {/* Action/Result details */}
              <div className="border border-zinc-900 rounded-none overflow-hidden">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span>Diagnostic Output Log</span>
                  <span className={`px-2 py-0.5 text-[8px] ${
                    isDiagnosticRunning ? 'bg-amber-500 text-black animate-pulse' :
                    diagnosticReport.status === 'SUCCESS' ? 'bg-emerald-600 text-white' :
                    diagnosticReport.status === 'ERROR' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {isDiagnosticRunning ? "RUNNING_SEQUENCE" : `${diagnosticReport.status}_STATE`}
                  </span>
                </div>
                
                <div className="p-4 bg-zinc-950 min-h-[100px] flex flex-col justify-center">
                  {isDiagnosticRunning ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
                      <div className="w-8 h-8 border-2 border-[#0055ff]/30 border-t-[#0055ff] rounded-full animate-spin"></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white animate-pulse">Awaiting Google Identity Popup...</p>
                        <p className="text-[8px] text-zinc-500 uppercase mt-1 tracking-wider">Please authorize connection when prompted.</p>
                      </div>
                    </div>
                  ) : diagnosticReport.status === 'SUCCESS' ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-emerald-400 font-mono">Status: SUCCESS_CONNECTION_GRANTED</p>
                      <p className="text-[10px] text-zinc-300 leading-relaxed">{diagnosticReport.message}</p>
                    </div>
                  ) : diagnosticReport.status === 'ERROR' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-rose-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                          <span>❌ Connection Exception:</span>
                          <span className="bg-rose-500/10 px-2 py-0.5 text-[9px] text-rose-400 border border-rose-500/20 font-bold">{diagnosticReport.code || 'UNKNOWN'}</span>
                        </p>
                        <p className="text-[10px] text-zinc-300 font-bold mt-1.5">{diagnosticReport.message}</p>
                      </div>

                      {/* Technical Troubleshooting Advice */}
                      <div className="bg-zinc-900/80 p-4 border border-zinc-850 space-y-3">
                        <h4 className="text-[9px] font-black uppercase tracking-wider text-[#0055ff]">🔧 Actionable Troubleshooting Steps</h4>
                        
                        {diagnosticReport.code === 'auth/popup-closed-by-user' && (
                          <div className="text-[9px] text-zinc-400 leading-relaxed space-y-1">
                            <p>• <span className="text-white font-bold">Closed Window:</span> Ensure you do not close the signing popup before authorisation processes completely.</p>
                            <p>• <span className="text-white font-bold">Pop-up Blockers active:</span> Check your address bar for pop-up blocker shield warnings and configure "Always Allow" for this domain.</p>
                            <p>• <span className="text-white font-bold">Iframe Preview Restrictions:</span> This preview is sandboxed inside an iframe. Click the <span className="text-white font-bold">"Open in New Tab"</span> arrow icon at the top-right of your main viewport to open a direct root context session.</p>
                          </div>
                        )}

                        {diagnosticReport.code === 'auth/operation-not-allowed' && (
                          <div className="text-[9px] text-zinc-400 leading-relaxed space-y-1">
                            <p>• <span className="text-white font-bold">Provider Disabled:</span> Go to the Firebase Console &rarr; Authentication &rarr; Sign-in method.</p>
                            <p>• <span className="text-white font-bold">Google Sign-In:</span> Add or edit the <span className="text-white font-bold">Google</span> provider and click the "Enable" switch.</p>
                            <p>• <span className="text-white font-bold">Save:</span> Save settings and verify your authorization configuration is aligned.</p>
                          </div>
                        )}

                        {diagnosticReport.code !== 'auth/popup-closed-by-user' && diagnosticReport.code !== 'auth/operation-not-allowed' && (
                          <div className="text-[9px] text-zinc-400 leading-relaxed space-y-1 font-sans">
                            <p>• <span className="text-white font-bold">Authorized JavaScript Origin:</span> Ensure your current address (<code className="text-white bg-zinc-950 px-1 py-0.5 font-mono">{diagnosticReport.currentOrigin}</code>) is exactly registered in Google Cloud Project OAuth Client Credentials.</p>
                            <p>• <span className="text-white font-bold">Authorized Redirect URIs:</span> Ensure <code className="text-white bg-zinc-950 px-1 py-0.5 font-mono">{`https://${diagnosticReport.authDomain}/__/auth/handler`}</code> is registered inside Cloud Console credentials.</p>
                            <p>• <span className="text-white font-bold">Network Blocks:</span> Verify third-party cookies are allowed in browser settings, or retry using Google Chrome in Incognito mode with plugins disabled.</p>
                          </div>
                        )}
                      </div>

                      {/* Stack Trace Container */}
                      {diagnosticReport.stack && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Stack Audit Log</label>
                          <pre className="p-3 bg-zinc-900 border border-zinc-850 text-[8px] text-zinc-400 overflow-x-auto select-all max-h-36 font-mono leading-normal whitespace-pre">
                            {diagnosticReport.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-zinc-500 font-black uppercase tracking-wider font-sans">
                      Diagnostics Idle. Click "Run Connection Test" below.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="flex items-center gap-3 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleGoogleAuthDiagnostics}
                disabled={isDiagnosticRunning}
                className="flex-1 py-3 bg-[#0055ff] hover:bg-[#0044cc] text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDiagnosticRunning ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M9.17 14.83l-4.24 4.24"/></svg>
                )}
                {isDiagnosticRunning ? "Testing Connection..." : "Run Connection Test"}
              </button>
              <button
                type="button"
                onClick={() => setShowDiagnosticModal(false)}
                className="px-6 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notifications - Moved to Top Right to avoid ChatWidget overlap */}
      <div className="fixed top-24 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const dismiss = () => setToasts(prev => prev.filter(t => t.id !== toast.id));
          const content = typeof toast.message === 'function' ? toast.message(dismiss) : toast.message;
          return toast.type === 'quickBuy' ? (
            <div key={toast.id} className="bg-[#020611] text-white p-4 border border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-in slide-in-from-right slide-out-to-right fade-in pointer-events-auto min-w-[300px] rounded-xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
              {content}
            </div>
          ) : (
            <div key={toast.id} className="bg-black text-white px-6 py-4 border border-[#0055ff] shadow-[0_0_20px_rgba(0,85,255,0.2)] animate-in slide-in-from-right fade-in pointer-events-auto min-w-[200px]">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-[#0055ff] animate-pulse"></span>
                <div className="text-[10px] font-black uppercase tracking-widest">{content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
