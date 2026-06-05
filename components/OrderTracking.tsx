import React, { useState } from 'react';
import { ViewState, Order } from '../types';
import { fetchOrderById } from '../services/orderService';
import { OrderTimeline } from './OrderTimeline';

export const OrderTracking: React.FC<{ onNavigateBack: () => void }> = ({ onNavigateBack }) => {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorParam, setErrorParam] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setLoading(true);
    setErrorParam('');
    setOrder(null);
    
    try {
      const fetchedOrder = await fetchOrderById(orderId.trim());
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        setErrorParam('Order not found. Please check your order ID.');
      }
    } catch (err) {
      setErrorParam('Failed to track order. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <button 
          onClick={onNavigateBack}
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0055ff] mb-8 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back_To_Store
        </button>

        <div className="mb-12">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Track Order</h1>
          <p className="text-zinc-500 text-sm">Enter your Order ID to see real-time updates and delivery status.</p>
        </div>

        <form onSubmit={handleTrackSubmit} className="space-y-4 mb-12">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Order ID</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ORD-X34B9"
                className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#0055ff] transition-colors"
              />
              <button 
                type="submit" 
                disabled={loading || !orderId.trim()}
                className="px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0055ff] transition-colors disabled:opacity-50"
              >
                {loading ? 'Tracking...' : 'Track'}
              </button>
            </div>
            {errorParam && <p className="text-rose-500 text-xs mt-2">{errorParam}</p>}
          </div>
        </form>

        {order && (
          <div className="border border-zinc-200 bg-zinc-50 p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-zinc-200 pb-6">
              <div>
                <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Order_ID</div>
                <div className="text-xl font-black tracking-tighter">{order.id}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Status</div>
                <div className={`text-[10px] font-black uppercase px-3 py-1 inline-block ${
                  order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-600' :
                  order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-600' :
                  order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-600' :
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {order.status}
                </div>
              </div>
            </div>

            <OrderTimeline status={order.status} isDarkMode={false} />

            <div className="mt-8 pt-6 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-[10px] font-black uppercase text-zinc-500 mb-2">Order Date</div>
                <div className="font-medium">{order.date}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-zinc-500 mb-2">Total Amount</div>
                <div className="font-bold text-[#0055ff]">৳{order.total.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
