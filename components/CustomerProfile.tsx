import React, { useMemo, useState, useEffect } from 'react';
import { Customer, Order, Product, ViewState } from '../types';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';
import { OrderTimeline } from './OrderTimeline';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, CreditCard, DollarSign, Camera, RefreshCw, Check, X } from 'lucide-react';

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
  onCancelOrder?: (orderId: string) => Promise<void>;
  onOpenSmartPreview?: (order: Order) => void;
}

const CustomerProfile: React.FC<Props> = ({ 
  customerInfo, 
  orders, 
  products, 
  onNavigateBack, 
  isDarkMode, 
  onUpdateCustomerInfo, 
  onCancelOrder,
  onOpenSmartPreview
}) => {
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

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [editingNotesOrderId, setEditingNotesOrderId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [savingNotesOrderId, setSavingNotesOrderId] = useState<string | null>(null);

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!onCancelOrder) return;
    try {
      setCancellingOrderId(orderId);
      await onCancelOrder(orderId);
      setSuccessMsg('Order cancelled successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleShareOrder = async (order: Order) => {
    try {
      const shareData = {
        title: `Order Request: ${order.id}`,
        text: `My order ${order.id} is currently ${order.status}. Total: ৳${order.total.toLocaleString()}.`,
        url: `${window.location.origin}/?view=TRACK_ORDER&orderId=${order.id}`
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setSuccessMsg('Order info shared');
      } else {
        await navigator.clipboard.writeText(`${shareData.text} \nTrack at: ${shareData.url}`);
        setSuccessMsg('Order info copied to clipboard');
      }
    } catch (err) {
      console.error('Error sharing order:', err);
    } finally {
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveNotes = async (orderId: string) => {
    try {
      setSavingNotesOrderId(orderId);
      await updateDoc(doc(db, 'orders', orderId), { notes: editingNotesText });
      setSuccessMsg('Order notes updated successfully.');
      setEditingNotesOrderId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update order notes.');
    } finally {
      setSavingNotesOrderId(null);
    }
  };

  const handleDownloadReceipt = async (order: Order) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Margins & Dimensions
      const marginX = 20;
      const pageWidth = 210;
      
      // Outer layout border
      doc.setDrawColor(24, 24, 27); // Dark gray
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);

      // Inner elegant layout accents
      doc.setDrawColor(228, 228, 231); // light gray
      doc.setLineWidth(0.15);
      doc.line(10, 50, 200, 50);
      doc.line(10, 115, 200, 115);
      
      // Brand Header Title: STREETTHREADX with letter spacing simulated
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(0, 0, 0);
      doc.text('STREETTHREADX', marginX, 28);
      
      // Brand Subtitle
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 85, 255); // Brand Blue #0055ff
      doc.text('OFFICIAL TRANSACTION RECEIPT // DIGITAL RECORD', marginX, 34);
      
      // Company Details (Mono text, aligned right)
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text([
        'STREETTHREADX APPAREL LTD.',
        'DHAKA, BANGLADESH',
        'SYSTEM: TERMINAL-X1',
        'IN STREETWEAR WE TRUST'
      ], 190, 22, { align: 'right' });

      // Left metadata block: Order specifications
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('I. TRANSACTION IDENTIFIERS', marginX, 58);

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('ORDER ID:', marginX, 66);
      doc.text('TIMESTAMP:', marginX, 72);
      doc.text('ORDER STATUS:', marginX, 78);
      doc.text('PAYMENT METHD:', marginX, 84);
      doc.text('TXN REFERNCE:', marginX, 90);
      doc.text('PAYMENT STATS:', marginX, 96);
      
      doc.setFont('courier', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(order.id, marginX + 32, 66);
      doc.text(`${order.date} @ ${order.time || 'N/A'}`, marginX + 32, 72);
      
      // Status Color Indicators
      const statusColorMap = {
        DELIVERED: [16, 185, 129], // green
        PENDING: [245, 158, 11], // amber
        SHIPPED: [59, 130, 246], // blue
        CANCELLED: [239, 68, 68] // red
      };
      const [sr, sg, sb] = (statusColorMap[order.status] || [113, 113, 122]);
      doc.setTextColor(sr, sg, sb);
      doc.text(order.status, marginX + 32, 78);
      
      doc.setTextColor(0, 0, 0);
      doc.text(order.paymentMethod || 'CASH ON DELIVERY (COD)', marginX + 32, 84);
      doc.text(order.transactionId || 'SYS-STREET-DB-CONFIRMED', marginX + 32, 90);
      
      const paymentStatus = order.paymentStatus || (order.isPaid ? 'FULLY_PAID' : 'UNPAID');
      const paidColorMap = {
        FULLY_PAID: [16, 185, 129],
        ADVANCE_VERIFIED: [59, 130, 246],
        PENDING_ADVANCE: [245, 158, 11],
        UNPAID: [239, 68, 68]
      };
      const [pr, pg, pb] = (paidColorMap[paymentStatus] || [113, 113, 122]);
      doc.setTextColor(pr, pg, pb);
      doc.text(paymentStatus.replace('_', ' '), marginX + 32, 96);

      // Right metadata block: Client records
      const clientX = 110;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('II. RECIPIENT RECORDS', clientX, 58);

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('CLIENT NAME:', clientX, 66);
      doc.text('EMAIL ADDR:', clientX, 72);
      doc.text('SHIPPING TO:', clientX, 78);
      
      doc.setFont('courier', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(order.customerName || 'N/A', clientX + 26, 66);
      doc.text(order.customerEmail || 'N/A', clientX + 26, 72);
      
      const lines = doc.splitTextToSize(order.shippingAddress || 'NOT ESTABLISHED', 52);
      doc.text(lines, clientX + 26, 78);

      // Items Section Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('III. SPECIFIED MERCHANDISE ITEMS', marginX, 123);

      // Table Header Bounding Box
      doc.setFillColor(24, 24, 27); // Zinc 900
      doc.rect(marginX, 128, 170, 7.5, 'F');
      
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('QTY', marginX + 2, 133);
      doc.text('ITEM NAME & SPECIFICATION', marginX + 12, 133);
      doc.text('OPTIONS (SIZE/COLOR)', marginX + 90, 133);
      doc.text('UNIT PRICE', marginX + 135, 133, { align: 'right' });
      doc.text('AMOUNT', marginX + 168, 133, { align: 'right' });

      // Draw horizontal separating line below headers
      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.3);
      doc.line(marginX, 128, marginX + 170, 128);

      // Render order items iteratively
      let currentY = 141;
      order.orderItems.forEach((item, idx) => {
        // Soft zebra stripes background
        if (idx % 2 === 1) {
          doc.setFillColor(244, 244, 245); // Zinc 100 soft gray
          doc.rect(marginX, currentY - 5.5, 170, 8, 'F');
        }

        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        
        // Qty
        doc.text(`${item.quantity}x`, marginX + 2, currentY);
        
        // Item Name
        const nameText = item.name.length > 36 ? item.name.substring(0, 34) + '..' : item.name;
        doc.text(nameText.toUpperCase(), marginX + 12, currentY);
        
        // Size / Color options
        const optText = item.variant 
          ? `S: ${item.variant.size.toUpperCase()} | C: ${item.variant.color.toUpperCase()}`
          : 'N/A';
        doc.text(optText, marginX + 90, currentY);
        
        // Prices
        doc.text(`৳${item.price.toLocaleString()}`, marginX + 135, currentY, { align: 'right' });
        doc.text(`৳${(item.price * item.quantity).toLocaleString()}`, marginX + 168, currentY, { align: 'right' });
        
        currentY += 8;
      });

      // Bottom separator boundary
      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.3);
      doc.line(marginX, currentY - 3, marginX + 170, currentY - 3);

      // Totals Panel positioned directly underneath currentY
      const totalPanelY = currentY + 3;
      
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      
      doc.text('MERCHANDISE SUB-TOTAL:', marginX + 110, totalPanelY, { align: 'right' });
      doc.text('SHIPPING FEE:', marginX + 110, totalPanelY + 6, { align: 'right' });
      
      const discount = order.discount || 0;
      let hasDiscount = discount > 0;
      if (hasDiscount) {
        doc.text('CAMPAIGN DISCOUNT:', marginX + 110, totalPanelY + 12, { align: 'right' });
      }

      const offsetDiscountY = hasDiscount ? 6 : 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL INVOICED:', marginX + 110, totalPanelY + 12 + offsetDiscountY, { align: 'right' });

      // Values output panel right-aligned
      doc.setFont('courier', 'bold');
      doc.setTextColor(0, 0, 0);
      const computedSubtotal = order.orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      doc.text(`৳${computedSubtotal.toLocaleString()}`, marginX + 168, totalPanelY, { align: 'right' });
      doc.text('৳60', marginX + 168, totalPanelY + 6, { align: 'right' });
      
      if (hasDiscount) {
        doc.setTextColor(239, 68, 68);
        doc.text(`-৳${discount.toLocaleString()}`, marginX + 168, totalPanelY + 12, { align: 'right' });
      }

      doc.setFont('helvetica', 'bold');
      // Highlight total with a beautiful blue accent color #0055ff
      doc.setTextColor(0, 85, 255);
      doc.text(`৳${order.total.toLocaleString()}`, marginX + 168, totalPanelY + 12 + offsetDiscountY, { align: 'right' });

      // Advance paid handling (if any of bKash partial was processed)
      let advancePaid = order.advancePaid || 0;
      let showDueAmount = order.dueAmount !== undefined && order.dueAmount > 0;
      let offsetDueY = totalPanelY + 12 + offsetDiscountY;

      if (advancePaid > 0) {
        offsetDueY += 6;
        doc.setFont('courier', 'bold');
        doc.setTextColor(113, 113, 122);
        doc.text('ADVANCE PRE-PAID AMOUNT:', marginX + 110, offsetDueY, { align: 'right' });
        doc.setTextColor(16, 185, 129);
        doc.text(`৳${advancePaid.toLocaleString()}`, marginX + 168, offsetDueY, { align: 'right' });

        if (showDueAmount) {
          offsetDueY += 6;
          doc.setTextColor(113, 113, 122);
          doc.text('OUTSTANDING DUE BALANCE:', marginX + 110, offsetDueY, { align: 'right' });
          doc.setTextColor(239, 68, 68);
          doc.text(`৳${order.dueAmount!.toLocaleString()}`, marginX + 168, offsetDueY, { align: 'right' });
        }
      }

      // Security verification footer layout
      const footerY = 248;
      
      // Divider above footer
      doc.setDrawColor(228, 228, 231);
      doc.line(marginX, footerY - 5, marginX + 170, footerY - 5);
      
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 85, 255); // Blue color tag
      doc.text('SYSTEM CLOUD DATA STAMP', marginX, footerY);

      doc.setFont('courier', 'normal');
      doc.setTextColor(113, 113, 122);
      doc.text([
        'VERIFIED TRANSACTION BY STREETTHREADX CORE ENGINE',
        'THIS CONSTITUTES A LEGALLY BINDING RECORD AND DIGITAL TRANSACTION COMPLETED.',
        'TERMS: SALES OF SPECIAL EDITION LABELS ARE INDIVIDUALLY IDENTIFIED AND AUTHENTICATED.'
      ], marginX, footerY + 5);

      // Barcode simulation lines
      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(1.5);
      doc.line(marginX, footerY + 17, marginX + 25, footerY + 17);
      doc.setLineWidth(0.4);
      doc.line(marginX + 27, footerY + 17, marginX + 35, footerY + 17);
      doc.setLineWidth(1.2);
      doc.line(marginX + 37, footerY + 17, marginX + 50, footerY + 17);
      doc.setLineWidth(0.5);
      doc.line(marginX + 52, footerY + 17, marginX + 68, footerY + 17);
      doc.setLineWidth(1.8);
      doc.line(marginX + 70, footerY + 17, marginX + 90, footerY + 17);
      doc.setLineWidth(0.8);
      doc.line(marginX + 92, footerY + 17, marginX + 110, footerY + 17);
      doc.setLineWidth(1.4);
      doc.line(marginX + 112, footerY + 17, marginX + 130, footerY + 17);
      
      // Save order receipt filename cleanly
      const cleanId = order.id.replace(/[^a-zA-Z0-9-]/g, '_');
      doc.save(`receipt-${cleanId}.pdf`);
      setSuccessMsg('RECEIPT PDF GENERATED SUCCESSFULLY.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Error in PDF generation:', err);
      setErrorMsg('Failed to generate PDF invoice receipt.');
    }
  };

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

  const compressImage = (fileOrBlob: Blob | File, maxWidth = 600, maxHeight = 600, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileOrBlob);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Image compression failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadFileWithProgress = (storageRef: any, fileOrBlob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, fileOrBlob);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          setUploadProgress(null);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(null);
            resolve(url);
          } catch (err) {
            setUploadProgress(null);
            reject(err);
          }
        }
      );
    });
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file');
      return;
    }

    setIsUploadingImage(true);
    setErrorMsg('');
    setUploadProgress(0);
    try {
      // Compress image locally before uploading
      const compressedBlob = await compressImage(file, 600, 600, 0.75);
      const storageRef = ref(storage, `profiles/${customerInfo.email}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
      const url = await uploadFileWithProgress(storageRef, compressedBlob);
      setEditProfileImage(url);
    } catch (err: any) {
      console.error('Error uploading profile image:', err);
      setErrorMsg('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(null);
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

  const { chartData, totalSpent, activeOrderCount, averageOrderValue } = useMemo(() => {
    const months: { month: string; yearMonth: string; spending: number; count: number }[] = [];
    const now = new Date();
    
    // Create list of last 6 months backwards
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: label,
        yearMonth,
        spending: 0,
        count: 0
      });
    }

    let spent = 0;
    let count = 0;

    customerOrders.forEach(order => {
      if (order.status === 'CANCELLED') return;
      
      spent += order.total;
      count += 1;

      try {
        const d = new Date(order.date);
        if (!isNaN(d.getTime())) {
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const slot = months.find(m => m.yearMonth === yearMonth);
          if (slot) {
            slot.spending += order.total;
            slot.count += 1;
          }
        }
      } catch (err) {
        console.error("Failed to parse order date for stats:", err);
      }
    });

    const aov = count > 0 ? Math.round(spent / count) : 0;

    return {
      chartData: months,
      totalSpent: spent,
      activeOrderCount: count,
      averageOrderValue: aov
    };
  }, [customerOrders]);

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
                        loading="lazy"
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

                  <div className="flex flex-col items-center justify-center space-y-4 mb-4 pb-4 border-b border-zinc-800/60">
                    <div className="relative group">
                      {editProfileImage ? (
                        <img 
                          loading="lazy"
                          src={editProfileImage} 
                          alt="Profile Preview" 
                          className="w-24 h-24 rounded-full object-cover border-2 border-zinc-800 transition-all duration-300 group-hover:border-[#0055ff]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-zinc-500 text-2xl font-bold uppercase transition-all duration-300 group-hover:border-[#0055ff]">
                          {editName ? editName.charAt(0) : 'U'}
                        </div>
                      )}
                    </div>

                    {uploadProgress !== null && (
                      <div className="w-full max-w-[200px] my-3 space-y-1.5 align-middle text-center mx-auto">
                        <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-[#0055ff]">
                          <span>UPLOADING TO STORAGE</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0055ff] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,85,255,0.5)]"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Interaction Actions */}
                    <div className="flex flex-col gap-2 w-full text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <label className="cursor-pointer text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/20 px-3 py-2">
                          <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleProfileImageUpload}
                            disabled={isUploadingImage}
                          />
                        </label>
                      </div>
                    </div>
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
            {/* Visual Analytics Dashboard Section */}
            <div className={`p-6 border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} space-y-6`}>
              <h2 className="text-xs font-black uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center justify-between">
                <span>6-Month_Metrics_Dashboard</span>
                <span className="text-[10px] font-mono text-[#0055ff] lowercase">real-time sync</span>
              </h2>

              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 border ${isDarkMode ? 'bg-black/40 border-zinc-800' : 'bg-white border-zinc-150'} flex items-center gap-3`}>
                  <div className="p-2 bg-[#0055ff]/10 text-[#0055ff] rounded">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Total Spent</div>
                    <div className="text-base font-black mt-0.5">৳{totalSpent.toLocaleString()}</div>
                  </div>
                </div>

                <div className={`p-4 border ${isDarkMode ? 'bg-black/40 border-zinc-800' : 'bg-white border-zinc-150'} flex items-center gap-3`}>
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Active Orders</div>
                    <div className="text-base font-black mt-0.5">{activeOrderCount}</div>
                  </div>
                </div>

                <div className={`p-4 border ${isDarkMode ? 'bg-black/40 border-zinc-800' : 'bg-white border-zinc-150'} flex items-center gap-3`}>
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Avg Order Value</div>
                    <div className="text-base font-black mt-0.5">৳{averageOrderValue.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Spending Area Chart */}
                <div className={`p-4 border ${isDarkMode ? 'bg-black/30 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Spending Trends</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0055ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0055ff" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f1f23' : '#e4e4e7'} vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke={isDarkMode ? '#71717a' : '#71717a'} 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke={isDarkMode ? '#71717a' : '#71717a'} 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `৳${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#09090b' : '#ffffff', 
                            borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
                            color: isDarkMode ? '#ffffff' : '#000000',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }} 
                          formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, 'Spending']}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="spending" stroke="#0055ff" strokeWidth={2} fillOpacity={1} fill="url(#colorSpending)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Order Frequency Bar Chart */}
                <div className={`p-4 border ${isDarkMode ? 'bg-black/30 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Order Frequency</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f1f23' : '#e4e4e7'} vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke={isDarkMode ? '#71717a' : '#71717a'} 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke={isDarkMode ? '#71717a' : '#71717a'} 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#09090b' : '#ffffff', 
                            borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
                            color: isDarkMode ? '#ffffff' : '#000000',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                          formatter={(value: any) => [value, 'Orders']}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" fill="#10b981" radius={[1, 1, 0, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

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
                  <div key={order.id} id="customer-order-card" className={`border ${isDarkMode ? 'bg-zinc-900/10 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div 
                      onClick={() => toggleOrderExpand(order.id)}
                      className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'}`}
                    >
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
                      <div className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800/50 text-zinc-400">
                        <svg className={`w-4 h-4 transform transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {expandedOrderId === order.id && (
                      <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <OrderTimeline status={order.status} isDarkMode={isDarkMode} />
                        
                        <div className="py-2">
                          {order.orderItems.map((item, idx) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <div key={idx} className="flex flex-col gap-2 mb-4 last:mb-0">
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
                        </div>
                        
                        {/* Order Notes */}
                        <div className={`mt-2 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Order Notes</span>
                            {editingNotesOrderId !== order.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNotesOrderId(order.id);
                                  setEditingNotesText(order.notes || '');
                                }}
                                className="text-[9px] uppercase tracking-widest text-[#0055ff] hover:text-white transition-colors"
                              >
                                {order.notes ? 'Edit Notes' : '+ Add Notes'}
                              </button>
                            )}
                          </div>
                          
                          {editingNotesOrderId === order.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingNotesText}
                                onChange={(e) => setEditingNotesText(e.target.value)}
                                placeholder="Special delivery instructions..."
                                className={`w-full p-3 text-xs border bg-transparent resize-none h-20 outline-none transition-colors ${
                                  isDarkMode 
                                    ? 'border-zinc-800 focus:border-[#0055ff]' 
                                    : 'border-zinc-200 focus:border-[#0055ff]'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingNotesOrderId(null);
                                  }}
                                  className="text-[9px] uppercase tracking-widest font-black px-3 py-1.5 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveNotes(order.id);
                                  }}
                                  disabled={savingNotesOrderId === order.id}
                                  className="text-[9px] uppercase tracking-widest font-black px-3 py-1.5 bg-[#0055ff] text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                  {savingNotesOrderId === order.id ? 'Saving...' : 'Save Notes'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            order.notes && (
                              <p className="text-xs text-zinc-400 italic">"{order.notes}"</p>
                            )
                          )}
                        </div>

                        {/* Subtotal Breakdown */}
                        <div className={`mt-2 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} space-y-2 text-xs`}>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">Subtotal</span>
                            <span className="font-bold text-zinc-400">৳{order.orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest">Shipping</span>
                            <span className="font-bold text-zinc-400">৳60</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-800/50">
                            <span className="text-zinc-300 uppercase font-black text-[10px] tracking-widest">Total</span>
                            <span className="font-bold text-sm text-[#0055ff]">৳{order.total.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Addresses */}
                        {order.shippingAddress && (
                          <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                            <div>
                              <div className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Shipping_Address</div>
                              <div className="text-xs text-zinc-300">{order.shippingAddress}</div>
                            </div>
                            {order.billingAddress && (
                              <div>
                                <div className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Billing_Address</div>
                                <div className="text-xs text-zinc-300">{order.billingAddress}</div>
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

                        {/* QR Code and Actions */}
                        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-zinc-200/50 flex-shrink-0">
                              <QRCodeSVG 
                                value={`${window.location.origin}/?view=TRACK_ORDER&orderId=${order.id}`}
                                size={80}
                                level="M"
                                includeMargin={false}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Scan_To_Track</span>
                              <span className="text-xs text-zinc-400 max-w-[200px] leading-tight">Scan this QR code from any device to quickly check the real-time status of this order.</span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 w-full sm:w-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareOrder(order);
                              }}
                              className="text-[10px] flex items-center gap-2 font-black uppercase tracking-widest px-4 py-2 border border-blue-500/30 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.662 3.775m-5.662-3.775L13.34 8.66m5.662 3.775a3 3 0 11-5.662-3.775m5.662 3.775a3 3 0 11-5.662 3.775" />
                              </svg>
                              Share
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenSmartPreview) {
                                  onOpenSmartPreview(order);
                                }
                              }}
                              className="text-[10px] flex items-center gap-2 font-black uppercase tracking-widest px-4 py-2 bg-[#0055ff] border border-[#0055ff] text-white hover:bg-blue-600 transition-colors"
                            >
                              👁️ Smart Preview
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadReceipt(order);
                              }}
                              className="text-[10px] flex items-center gap-2 font-black uppercase tracking-widest px-4 py-2 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Receipt PDF
                            </button>
                            {order.status === 'PENDING' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelOrder(order.id);
                                }}
                                disabled={cancellingOrderId === order.id}
                                className={`text-[10px] items-center flex font-black uppercase tracking-widest px-4 py-2 border transition-colors ${
                                  cancellingOrderId === order.id
                                    ? 'border-zinc-800 text-zinc-600 bg-zinc-900 cursor-not-allowed'
                                    : 'border-rose-500/30 text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white'
                                }`}
                              >
                                {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
