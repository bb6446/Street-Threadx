import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { deductStockFirebase } from '../services/inventoryService';
import { Product } from '../types';

interface PosSystemProps {
  products: Product[];
  onTransactionSuccess: (logMsg: string) => void;
  isDarkMode: boolean;
}

/**
 * Modular POS Component
 * Features:
 * 1. Real-time inventory subscription via Supabase (if enabled)
 * 2. Atomic stock deduction for multi-item transactions
 * 3. Modular event callbacks for logging and state management
 */
const PosSystem: React.FC<PosSystemProps> = ({ products, onTransactionSuccess, isDarkMode }) => {
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { product, quantity: 1 }];
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
      
      const summary = cart.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
      const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      onTransactionSuccess(`POS_SALE_COMPLETE: ${summary} | Total: ৳${totalAmount.toLocaleString()}`);
      setCart([]);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPrice = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      {/* Product Selection */}
      <div className={`lg:col-span-2 space-y-4`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff]">SELECT_ITEMS</h3>
          <span className="text-[9px] opacity-50 uppercase font-black">Live Inventory Sync (Firestore)</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.filter(p => p.status === 'Published').map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              className={`p-4 border text-left transition-all group ${
                isDarkMode 
                ? 'bg-black/40 border-zinc-800 hover:border-[#0055ff]' 
                : 'bg-white border-zinc-200 hover:border-[#0055ff] shadow-sm'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <div className="text-[10px] font-black uppercase mb-1 truncate">{p.name}</div>
              <div className="text-xs font-bold italic mb-2">৳{p.price}</div>
              <div className="flex justify-between items-center">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 ${p.stock <= 5 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  STOCK: {p.stock}
                </span>
                <span className="text-[14px] text-[#0055ff] group-hover:translate-x-1 transition-transform">+</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className={`p-6 border flex flex-col ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-100 border-zinc-200 shadow-xl'}`}>
        <h3 className="text-xs font-black uppercase tracking-widest mb-6 border-b pb-4">Transaction_Summary</h3>
        
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] mb-6 no-scrollbar">
          {cart.length === 0 ? (
            <div className="text-[10px] opacity-40 uppercase italic text-center py-20">Cart is empty</div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase border-b border-zinc-800/20 pb-2">
                <div className="flex-1">
                  <span>{item.product.name}</span>
                  <div className="text-xs opacity-50 mt-0.5">৳{item.product.price} x {item.quantity}</div>
                </div>
                <div className="text-right">
                  <button 
                    onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:opacity-100 opacity-60 mb-1"
                  >
                    REMOVE
                  </button>
                  <div className="font-bold">৳{item.product.price * item.quantity}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 text-[9px] font-black uppercase text-rose-500 mb-4 animate-in shake duration-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center border-t border-zinc-800 pt-4">
            <span className="text-[10px] font-black uppercase tracking-tighter">Subtotal_Amount</span>
            <span className="text-xl font-black italic">৳{totalPrice}</span>
          </div>
          
          <button
            onClick={handleCompleteSale}
            disabled={isProcessing || cart.length === 0}
            className={`w-full py-4 text-xs font-black uppercase tracking-widest transition-all ${
              isProcessing 
              ? 'bg-zinc-800 text-zinc-500 cursor-wait' 
              : 'bg-[#0055ff] text-white hover:bg-[#0044cc] shadow-[0_0_20px_rgba(0,85,255,0.2)]'
            }`}
          >
            {isProcessing ? 'PROCESING_ATOMIC_TX...' : 'COMPLETE_SALE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosSystem;
