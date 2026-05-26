import React, { useMemo, useState, useEffect } from 'react';
import { Customer, Order, Product, ViewState } from '../types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface Props {
  customerInfo: { 
    name: string; 
    email: string; 
    phone?: string; 
    address?: string;
    city?: string;
    zip?: string;
    notes?: string;
    profileImage?: string;
  };
  orders: Order[];
  products: Product[];
  onNavigateBack: () => void;
  isDarkMode: boolean;
  onUpdateCustomerInfo?: (updatedData: any) => void;
}

const CustomerProfile: React.FC<Props> = ({ customerInfo, orders, products, onNavigateBack, isDarkMode, onUpdateCustomerInfo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(customerInfo.name || '');
  const [editEmail, setEditEmail] = useState(customerInfo.email || '');
  const [editPhone, setEditPhone] = useState(customerInfo.phone || '');
  const [editAddress, setEditAddress] = useState(customerInfo.address || '');
  const [editCity, setEditCity] = useState(customerInfo.city || 'Dhaka');
  const [editZip, setEditZip] = useState(customerInfo.zip || '');
  const [editNotes, setEditNotes] = useState(customerInfo.notes || '');
  const [editProfileImage, setEditProfileImage] = useState(customerInfo.profileImage || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (customerInfo) {
      setEditName(customerInfo.name || '');
      setEditEmail(customerInfo.email || '');
      setEditPhone(customerInfo.phone || '');
      setEditAddress(customerInfo.address || '');
      setEditCity(customerInfo.city || 'Dhaka');
      setEditZip(customerInfo.zip || '');
      setEditNotes(customerInfo.notes || '');
      setEditProfileImage(customerInfo.profileImage || '');
    }
  }, [customerInfo, isEditing]);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file');
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg('');
    try {
      const storageRef = ref(storage, `profiles/${customerInfo.email}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditProfileImage(url);
    } catch (err: any) {
      console.error('Error uploading profile image:', err);
      setErrorMsg('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setErrorMsg('Entity Name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedFields = {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        zip: editZip.trim(),
        notes: editNotes.trim(),
        profileImage: editProfileImage,
      };

      // 1. Locate/Update customer doc in Firestore by email identifier
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('email', '==', customerInfo.email));
      const querySnapshot = await getDocs(q);

      let customerId = '';
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        customerId = firstDoc.id;
        await setDoc(doc(db, 'customers', customerId), updatedFields, { merge: true });
      } else {
        customerId = Math.random().toString(36).substr(2, 9);
        const newCustomerData = {
          id: customerId,
          totalSpent: 0,
          orders: 0,
          lastSeen: new Date().toISOString(),
          ...updatedFields
        };
        await setDoc(doc(db, 'customers', customerId), newCustomerData);
      }

      // 2. Propagate state back to the root component
      if (onUpdateCustomerInfo) {
        onUpdateCustomerInfo(updatedFields);
      }

      setSuccessMsg('IDENTITY RECORDS SAVED SUCCESSFULLY.');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error saving customer changes:', err);
      setErrorMsg(err.message || 'FAILED TO ESTABLISH SECURITY RECORD UPDATE.');
    } finally {
      setIsSaving(false);
    }
  };

  const customerOrders = useMemo(() => {
    return [...orders]
      .filter(o => o.customerEmail.toLowerCase() === customerInfo.email.toLowerCase())
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date} ${b.time || '00:00'}`).getTime();
        return dateB - dateA;
      });
  }, [orders, customerInfo.email]);

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
          Welcome back, {customerInfo.name ? customerInfo.name.split(' ')[0] : 'User'}
        </p>

        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest border-b border-zinc-800 pb-4 mb-4">
                Profile_Data
              </h2>
              
              {!isEditing ? (
                <>
                  <div className="flex justify-center mb-6">
                    {customerInfo.profileImage ? (
                      <img 
                        src={customerInfo.profileImage} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-zinc-500 text-2xl font-bold uppercase">
                        {customerInfo.name ? customerInfo.name.charAt(0) : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">Name</div>
                      <div className="text-xs font-bold mt-1 uppercase">{customerInfo.name || 'UNESTABLISHED'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">Email Address</div>
                      <div className="text-xs font-bold mt-1 max-w-full break-all uppercase">{customerInfo.email}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">Phone Contact</div>
                      <div className="text-xs font-bold mt-1 uppercase">{customerInfo.phone || 'NOT SET'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">Shipping Address</div>
                      <div className="text-xs font-bold mt-1 leading-relaxed uppercase">{customerInfo.address || 'NOT SET'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">City / District</div>
                      <div className="text-xs font-bold mt-1 uppercase">{customerInfo.city || 'Dhaka'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase text-zinc-500">ZIP / Postal Code</div>
                      <div className="text-xs font-bold mt-1 uppercase">{customerInfo.zip || 'NOT SET'}</div>
                    </div>
                    {customerInfo.notes && (
                      <div>
                        <div className="text-[9px] font-black uppercase text-zinc-500">Other Details / Prefs</div>
                        <div className="text-xs font-bold mt-1 leading-relaxed uppercase">{customerInfo.notes}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-zinc-800">
                    <button 
                      onClick={() => {
                        setErrorMsg('');
                        setIsEditing(true);
                      }}
                      className="w-full bg-[#0055ff] hover:bg-white hover:text-black text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 transition-all"
                    >
                      Edit_Identity_Details
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {errorMsg && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-3 text-rose-500 text-[9px] font-black uppercase tracking-widest text-center">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-col items-center justify-center space-y-4 mb-4">
                    {editProfileImage ? (
                      <img 
                        src={editProfileImage} 
                        alt="Profile Preview" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-zinc-500 text-2xl font-bold uppercase">
                        {editName ? editName.charAt(0) : 'U'}
                      </div>
                    )}
                    <label className="cursor-pointer text-[#0055ff] hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                      {isUploadingImage ? 'Uploading...' : 'Update Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleProfileImageUpload}
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Legal Entity Name</label>
                    <input 
                      type="text"
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="FULL NAME"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Network Email (Gmail)</label>
                    <input 
                      type="email"
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase opacity-60"
                      value={editEmail}
                      disabled
                      placeholder="EMAIL@DOMAIN.COM"
                    />
                    <span className="text-[8px] text-zinc-600 block lowercase">authenticated email is readonly</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Phone Contact</label>
                    <input 
                      type="tel"
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Shipping Address</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase resize-none"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="STREET, SECTOR, AREA DETAILS"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-zinc-500">City / District</label>
                      <input 
                        type="text"
                        className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="DHAKA"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-zinc-500">ZIP / Postal</label>
                      <input 
                        type="text"
                        className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase"
                        value={editZip}
                        onChange={(e) => setEditZip(e.target.value)}
                        placeholder="1200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-500">Other Details / Notes</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#0055ff] transition-all uppercase resize-none"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="STYLE PREFERENCES, SIZING OR INSTR."
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-full border border-zinc-850 hover:bg-zinc-900 text-zinc-500 hover:text-white py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
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
                      {order.orderItems.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{item.quantity}x</span>
                                <span className="font-black uppercase tracking-tight">{item.name} {item.variant && <span className="text-[10px] opacity-60 font-medium">({item.variant.size} / {item.variant.color})</span>}</span>
                              </div>
                              <div className="font-bold opacity-70">
                                ৳{(item.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                            {product?.description && (
                              <p className="text-[10px] text-zinc-500 italic leading-relaxed border-l border-zinc-800 pl-3 ml-1">
                                {product.description.length > 120 ? product.description.substring(0, 120) + '...' : product.description}
                              </p>
                            )}
                          </div>
                        );
                      })}

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
