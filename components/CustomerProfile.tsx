import React from 'react';
import { Customer, Order, ViewState } from '../types';

interface Props {
  customerInfo: { name: string; email: string; phone?: string; address?: string };
  orders: Order[];
  onNavigateBack: () => void;
  isDarkMode: boolean;
}

const CustomerProfile: React.FC<Props> = ({ customerInfo, orders, onNavigateBack, isDarkMode }) => {
  const customerOrders = orders.filter(
    o => o.customerEmail.toLowerCase() === customerInfo.email.toLowerCase()
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020202] text-white' : 'bg-white text-black'}`}>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 animate-in fade-in duration-500">
        <button 
          onClick={onNavigateBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-12 hover:text-[#0055ff] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back_To_Store
        </button>

        <h1 className="text-4xl md:text-5xl font-black heading-font italic uppercase tracking-tighter mb-4">
          Identity_Records
        </h1>
        <p className="text-zinc-500 font-mono text-xs mb-12 uppercase">
          Welcome back, {customerInfo.name.split(' ')[0]}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-800 pb-4 mb-4">
                Profile_Data
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-[9px] font-black uppercase text-zinc-500">Name</div>
                  <div className="text-xs font-bold mt-1">{customerInfo.name}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-zinc-500">Email</div>
                  <div className="text-xs font-bold mt-1 max-w-full break-all">{customerInfo.email}</div>
                </div>
                {customerInfo.phone && (
                  <div>
                    <div className="text-[9px] font-black uppercase text-zinc-500">Phone</div>
                    <div className="text-xs font-bold mt-1">{customerInfo.phone}</div>
                  </div>
                )}
                {customerInfo.address && (
                  <div>
                    <div className="text-[9px] font-black uppercase text-zinc-500">Primary_Address</div>
                    <div className="text-xs font-bold mt-1 leading-relaxed">{customerInfo.address}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Orders Hub */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-800 pb-4">
              Order_History
            </h2>
            
            {customerOrders.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-zinc-800">
                <p className="text-[10px] font-black uppercase opacity-40">No_Orders_Found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {customerOrders.map(order => (
                  <div key={order.id} className={`border ${isDarkMode ? 'bg-zinc-900/10 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50'}`}>
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Order_ID</div>
                        <div className="text-sm font-bold tracking-widest">{order.id}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Date</div>
                        <div className="text-sm font-bold">{order.date}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Total</div>
                        <div className="text-sm font-bold">৳{order.total.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-zinc-500 mb-1">Status</div>
                        <div className={`text-[10px] font-black uppercase px-2 py-1 inline-block ${
                          order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' :
                          order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-500' :
                          order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {order.orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.quantity}x</span>
                            <span>{item.name} {item.variant && <span className="opacity-50">({item.variant.size})</span>}</span>
                          </div>
                          <div className="font-bold opacity-70">
                            ৳{(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}

                      {/* Addresses */}
                      {order.shippingAddress && (
                        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                          <div>
                            <div className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Shipping_Address</div>
                            <div className="text-xs">{order.shippingAddress}</div>
                          </div>
                          {order.billingAddress && (
                            <div>
                              <div className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Billing_Address</div>
                              <div className="text-xs">{order.billingAddress}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tracking Information Section */}
                      {(order.trackingNumber || order.trackingProvider) && (
                        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <div className="text-[10px] font-black uppercase text-[#0055ff] mb-2 tracking-widest">
                            Tracking_Information
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {order.trackingProvider && (
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-500">Provider</div>
                                <div className="text-xs font-bold">{order.trackingProvider}</div>
                              </div>
                            )}
                            {order.trackingNumber && (
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-500">Tracking_Number</div>
                                <div className="text-xs font-bold tracking-widest">{order.trackingNumber}</div>
                              </div>
                            )}
                          </div>
                          {order.trackingUrl && (
                            <div className="mt-3">
                              <a 
                                href={order.trackingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0055ff] hover:text-white bg-[#0055ff]/10 hover:bg-[#0055ff] px-4 py-2 transition-colors border border-[#0055ff]/30"
                              >
                                Track_Shipment
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
