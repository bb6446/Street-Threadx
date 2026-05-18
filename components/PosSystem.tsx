import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { deductStockFirebase } from '../services/inventoryService';
import { Product, Order } from '../types';
import { Search, ScanBarcode, User, CreditCard, Banknote, Smartphone, Plus, Minus, Trash2 } from 'lucide-react';

interface PosSystemProps {
  products: Product[];
  onTransactionSuccess: (logMsg: string) => void;
  onOrderComplete: (order: Order) => void;
  isDarkMode: boolean;
}

const PosSystem: React.FC<PosSystemProps> = ({ products, onTransactionSuccess, onOrderComplete, isDarkMode }) => {
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Customer Details
  const [customerInfo, setCustomerInfo] = useState({ name: 'Walk-in Customer', email: 'guest@pos.local', phone: '' });
  
  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BKASH'>('CASH');
  const [amountReceived, setAmountReceived] = useState<string>('');

  const activeProducts = useMemo(() => products.filter(p => p.status === 'Published'), [products]);
  
  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map(p => p.category));
    return Array.from(cats);
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = activeProducts;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q)));
    }
    return filtered;
  }, [activeProducts, selectedCategory, searchQuery]);

  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [barcodeMode]);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    // Simulate finding a product by barcode (using ID or Name as barcode mock)
    const q = searchQuery.toLowerCase();
    const product = activeProducts.find(p => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q));
    
    if (product) {
       if (product.stock > 0) {
         addToCart(product);
         setSearchQuery('');
       } else {
         setError(`Out of stock: ${product.name}`);
         setTimeout(() => setError(null), 3000);
       }
    } else {
      setError(`Product not found for barcode: ${searchQuery}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
            setError(`Cannot add more. Only ${product.stock} in stock.`);
            setTimeout(() => setError(null), 3000);
            return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
       const mapped = prev.map(item => {
           if (item.product.id === productId) {
               const newQ = item.quantity + delta;
               if (newQ > item.product.stock) {
                   setError(`Only ${item.product.stock} in stock.`);
                   setTimeout(() => setError(null), 3000);
                   return item;
               }
               return { ...item, quantity: newQ };
           }
           return item;
       });
       return mapped.filter(item => item.quantity > 0);
    });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    const transactionItems = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    try {
      // Execute atomic transaction
      await deductStockFirebase(transactionItems);
      
      const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const tax = subtotal * 0.05;
      const totalWithTax = subtotal + tax;

      // Create Order for the system
      const newOrder: Order = {
        id: `POS-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
        customerName: customerInfo.name || 'Walk-in Customer',
        customerEmail: customerInfo.email || 'guest@pos.local',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: Math.round(totalWithTax),
        subtotal: subtotal,
        discount: 0,
        status: 'DELIVERED', // auto delivered for POS
        paymentStatus: 'FULLY_PAID',
        paymentMethod: paymentMethod === 'CARD' ? 'Credit Card' : paymentMethod === 'BKASH' ? 'bKash' : 'CASH',
        items: cart.reduce((acc, item) => acc + item.quantity, 0),
        orderItems: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          variant: { size: 'OS', color: 'Default' }
        })),
        shippingAddress: 'POS_TERMINAL',
        billingAddress: 'POS_TERMINAL'
      };

      await onOrderComplete(newOrder);
      
      const summary = cart.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
      onTransactionSuccess(`POS SALE: ${summary} | ৳${Math.round(totalWithTax).toLocaleString()} | ${paymentMethod}`);
      
      // Reset
      setCart([]);
      setAmountReceived('');
      setCustomerInfo({ name: 'Walk-in Customer', email: 'guest@pos.local', phone: '' });
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const totalPrice = subtotal + tax;
  
  const change = amountReceived ? Math.max(0, parseInt(amountReceived || '0') - totalPrice) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-120px)] mt-4">
      
      {/* Product Selection Area (Left) */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Top Bar: Search & Scanner */}
        <div className={`p-4 border flex flex-col sm:flex-row gap-3 items-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <button 
               onClick={() => setBarcodeMode(!barcodeMode)}
               className={`p-3 rounded-lg flex items-center justify-center transition-colors ${barcodeMode ? 'bg-[#0055ff] text-white' : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600')}`}
               title="Toggle Barcode Scanner Mode"
            >
               <ScanBarcode className="w-5 h-5" />
            </button>
            
            {barcodeMode ? (
                <form onSubmit={handleBarcodeSubmit} className="flex-1 w-full">
                   <input
                     ref={barcodeInputRef}
                     type="text"
                     placeholder="Ready to Scan Barcode... (Press Enter)"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className={`w-full p-3 font-mono text-sm border-2 rounded-lg outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-[#0055ff] text-white' : 'bg-blue-50 border-[#0055ff] text-black'} focus:ring-4 focus:ring-[#0055ff]/20`}
                     autoFocus
                   />
                </form>
            ) : (
                <div className="relative flex-1 w-full">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                    <input
                        type="text"
                        placeholder="Search products by name, tag, or ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-3 text-sm rounded-lg border outline-none transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' : 'bg-white border-zinc-300 text-black focus:border-[#0055ff]'}`}
                    />
                </div>
            )}
        </div>

        {/* Categories */}
        {!barcodeMode && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap rounded-full border transition-all ${!selectedCategory ? 'bg-[#0055ff] text-white border-[#0055ff]' : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600')}`}
            >
                All Products
            </button>
            {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap rounded-full border transition-all ${selectedCategory === cat ? 'bg-[#0055ff] text-white border-[#0055ff]' : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600')}`}
              >
                  {cat}
              </button>
            ))}
        </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => (
                <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={`p-3 relative border text-left transition-all overflow-hidden flex flex-col ${
                    isDarkMode 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-[#0055ff]' 
                    : 'bg-white border-zinc-200 hover:border-[#0055ff] shadow-sm'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                {/* Visual Indicator of quantity in cart */}
                {cart.find(item => item.product.id === p.id) && (
                    <div className="absolute top-0 right-0 bg-[#0055ff] text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                        IN CART ({cart.find(item => item.product.id === p.id)?.quantity})
                    </div>
                )}
                
                <div className={`w-full aspect-square mb-3 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-2`}>
                   {p.images && p.images[0] ? (
                       <img src={p.images[0]} alt={p.name} className="object-cover w-full h-full mix-blend-multiply dark:mix-blend-normal" />
                   ) : (
                       <div className="text-[8px] font-black uppercase opacity-30 text-center">NO IMAGE</div>
                   )}
                </div>

                <div className="text-[10px] font-black uppercase mb-1 line-clamp-2 mt-auto" title={p.name}>{p.name}</div>
                <div className="text-xs font-bold text-[#0055ff] mb-2">৳{p.price.toLocaleString()}</div>
                
                <div className="flex justify-between items-center w-full mt-auto">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${p.stock <= 5 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    STOCK: {p.stock}
                    </span>
                </div>
                </button>
            ))}
            {filteredProducts.length === 0 && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-50">
                    <Search className="w-8 h-8 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">No products found</p>
                </div>
            )}
            </div>
        </div>
      </div>

      {/* Cart & Checkout Area (Right sidebar) */}
      <div className={`w-full lg:w-[400px] xl:w-[450px] flex flex-col border ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        
        {/* Customer Info */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-[#0055ff]">
                <User className="w-3.5 h-3.5" />
                <span>Customer</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Name" value={customerInfo.name} onChange={e => setCustomerInfo(prev => ({...prev, name: e.target.value}))} className={`w-full p-2 text-xs border rounded outline-none ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 focus:border-[#0055ff]'}`} />
                <input type="text" placeholder="Phone" value={customerInfo.phone} onChange={e => setCustomerInfo(prev => ({...prev, phone: e.target.value}))} className={`w-full p-2 text-xs border rounded outline-none ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 focus:border-[#0055ff]'}`} />
            </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
               <div className="text-[10px] uppercase font-black tracking-widest mb-2">Cart is Empty</div>
               <div className="text-[10px] uppercase font-medium">Scan or click products to add</div>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className={`p-3 border rounded-lg flex flex-col gap-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                      <div className="text-[11px] font-black uppercase leading-tight">{item.product.name}</div>
                      <div className="text-[10px] text-[#0055ff] font-bold mt-1">৳{item.product.price.toLocaleString()}</div>
                  </div>
                  <button onClick={() => updateCartQuantity(item.product.id, -item.quantity)} className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors">
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 rounded p-1">
                        <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className="text-[10px] font-black w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors" disabled={item.quantity >= item.product.stock}><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="font-black text-xs">
                        ৳{(item.product.price * item.quantity).toLocaleString()}
                    </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Errors */}
        {error && (
          <div className="mx-4 mb-2 bg-rose-500/10 border border-rose-500/30 p-2 text-[9px] font-black uppercase text-rose-500 animate-in shake duration-300">
            {error}
          </div>
        )}

        {/* Totals & Payment */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500">
              <span>Subtotal</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500">
              <span>VAT (5%)</span>
              <span>৳{Math.round(tax).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-black uppercase tracking-tighter text-[#0055ff]">Total Payable</span>
              <span className="text-xl font-black text-[#0055ff]">৳{Math.round(totalPrice).toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => setPaymentMethod('CASH')} className={`flex flex-col items-center justify-center p-2 rounded border gap-1 transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200')} `}>
                  <Banknote className="w-4 h-4" />
                  <span className="text-[8px] font-black uppercase">Cash</span>
              </button>
              <button onClick={() => setPaymentMethod('CARD')} className={`flex flex-col items-center justify-center p-2 rounded border gap-1 transition-all ${paymentMethod === 'CARD' ? 'bg-[#0055ff]/10 border-[#0055ff] text-[#0055ff]' : (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200')} `}>
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[8px] font-black uppercase">Card</span>
              </button>
              <button onClick={() => setPaymentMethod('BKASH')} className={`flex flex-col items-center justify-center p-2 rounded border gap-1 transition-all ${paymentMethod === 'BKASH' ? 'bg-pink-500/10 border-pink-500 text-pink-600 dark:text-pink-400' : (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200')} `}>
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[8px] font-black uppercase">Mobile</span>
              </button>
          </div>

          {/* Cash Amount & Change */}
          {paymentMethod === 'CASH' && cart.length > 0 && (
             <div className="mb-4 flex items-center gap-2">
                 <div className="flex-1">
                     <span className="text-[8px] font-black uppercase text-zinc-500 mb-1 block">Amount Received</span>
                     <input 
                        type="number" 
                        value={amountReceived}
                        onChange={e => setAmountReceived(e.target.value)}
                        placeholder={(totalPrice).toString()}
                        className={`w-full p-2 text-sm font-bold border rounded outline-none ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-white border-zinc-200 focus:border-emerald-500 text-emerald-600'}`}
                     />
                 </div>
                 <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 p-2 rounded border border-transparent">
                     <span className="text-[8px] font-black uppercase text-zinc-500 mb-1 block">Change</span>
                     <div className={`text-sm font-bold ${change > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>৳{change.toLocaleString()}</div>
                 </div>
             </div>
          )}
          
          <button
            onClick={handleCompleteSale}
            disabled={isProcessing || cart.length === 0 || (paymentMethod === 'CASH' && amountReceived && parseInt(amountReceived) < Math.round(totalPrice) ? true : false)}
            className={`w-full py-4 text-xs flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all ${
              isProcessing 
              ? 'bg-zinc-800 text-zinc-500 cursor-wait' 
              : cart.length === 0 ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#0055ff] hover:bg-[#0044cc] text-white shadow-[0_0_20px_rgba(0,85,255,0.2)]'
            }`}
          >
            {isProcessing ? 'PROCESSING...' : 'COMPLETE SALE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosSystem;

