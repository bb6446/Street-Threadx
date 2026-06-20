import React, { useRef, useState } from 'react';
import { Order, Product } from '../types';
import { OrderTimeline } from './OrderTimeline';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Printer, 
  Download, 
  Copy, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle, 
  ChevronRight,
  ShieldAlert,
  Truck,
  Package,
  Clock,
  Activity,
  Globe,
  RefreshCw,
  Database,
  Check
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  order: Order;
  products: Product[];
  onNavigateBack: () => void;
  isDarkMode: boolean;
  onCopySuccess?: () => void;
}

export const SmartOrderPreview: React.FC<Props> = ({ 
  order, 
  products, 
  onNavigateBack, 
  isDarkMode,
  onCopySuccess
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Interactive Tracker tabs: progress (Visual State), checkpoints (History logs), telemetry (Network Relay Ping)
  const [trackerTab, setTrackerTab] = useState<'progress' | 'checkpoints' | 'telemetry'>('progress');
  const [pingSequence, setPingSequence] = useState<string[]>([]);
  const [pingActive, setPingActive] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    if (onCopySuccess) {
      onCopySuccess();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#000000' : '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`StreetThreadX-Invoice-${order.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getEstimatedDeliveryDate = (orderDateStr: string, status: string) => {
    try {
      const orderDate = new Date(orderDateStr);
      if (isNaN(orderDate.getTime())) {
        return "3-5 Business Days";
      }
      
      if (status.toUpperCase() === 'DELIVERED') {
        return "Delivered On Time";
      }
      
      if (status.toUpperCase() === 'CANCELLED') {
        return "Voided";
      }
      
      const minEta = new Date(orderDate);
      minEta.setDate(orderDate.getDate() + 2);
      const maxEta = new Date(orderDate);
      maxEta.setDate(orderDate.getDate() + 4);
      
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return `${minEta.toLocaleDateString('en-US', options)} - ${maxEta.toLocaleDateString('en-US', options)}`;
    } catch {
      return "3-5 Business Days";
    }
  };

  const getCheckpointTime = (baseDateStr: string, baseTimeStr: string, hoursToAdd: number) => {
    try {
      // Handle formatting cleanly
      let parsedDateText = baseDateStr;
      if (baseDateStr.includes('-') && baseDateStr.length === 10) {
        // Already YYYY-MM-DD
      } else {
        // Try parsing directly
      }
      
      let cleanTime = baseTimeStr || '12:00';
      if (cleanTime.includes(' ')) {
        const parts = cleanTime.split(' ');
        cleanTime = parts[0]; // Take HH:MM part
      }
      
      const date = new Date(`${parsedDateText}T${cleanTime}`);
      if (isNaN(date.getTime())) {
        const fallback = new Date(baseDateStr);
        if (isNaN(fallback.getTime())) return baseDateStr;
        fallback.setHours(fallback.getHours() + hoursToAdd);
        return fallback.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      date.setHours(date.getHours() + hoursToAdd);
      return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return baseDateStr;
    }
  };

  const handlePingTelemetry = () => {
    if (pingActive) return;
    setPingActive(true);
    setPingSequence([]);
    
    const steps = [
      "Establishing link with Dhaka Central Gateway...",
      `Status: SECURE. Resolving tracking code ${order.id}...`,
      "Pinging StreetThreadX distribution satellite...",
      "Signal strength: 98.4dB. Fetching real-time terminal coordinates...",
      `Routing path: Dhaka Depot Terminal ➔ ${order.shippingAddress.split(',').pop()?.trim() || 'Client Address'}`,
      "Connection complete. Current Node Health: 100%. Status check: " + order.status.toUpperCase()
    ];
    
    steps.forEach((msg, index) => {
      setTimeout(() => {
        setPingSequence(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        if (index === steps.length - 1) {
          setPingActive(false);
        }
      }, (index + 1) * 600);
    });
  };

  const shareUrl = `${window.location.origin}/#track=${order.id}`;

  return (
    <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-[#030303] text-white' : 'bg-zinc-50 text-black'} animate-in fade-in duration-500`}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-24">
        
        {/* Navigation back and header controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button 
            type="button"
            onClick={onNavigateBack}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#0055ff] hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
            Back_To_Dashboard
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className={`p-2.5 border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-[#0055ff]' 
                  : 'border-black bg-white text-zinc-850 hover:bg-zinc-100 hover:border-[#0055ff]'
              }`}
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-[#0055ff] text-white p-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all cursor-pointer"
              title="Download official PDF copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Printable/Saveable area starts here */}
        <div 
          ref={previewRef}
          className={`border p-6 md:p-12 shadow-2xl rounded-none ${
            isDarkMode 
              ? 'bg-zinc-950/60 border-zinc-900 shadow-black' 
              : 'bg-white border-zinc-200'
          }`}
        >
          {/* Brand Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-dashed border-zinc-800 pb-10 mb-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-[#0055ff] text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em]">STREET THREADX</span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">SYS_RELAY_ACTIVE</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black heading-font italic uppercase tracking-tighter">
                SMART_ORDER_PROT
              </h1>
              <p className="text-[10px] font-mono text-zinc-400 capitalize max-w-sm">
                Engineered streetwear garments tailored individually, tracked globally.
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3 text-right">
              <div className="text-[10px] font-black uppercase text-zinc-500">Invoice Tracing QR</div>
              <div className="p-2.5 bg-white border border-zinc-200 w-fit">
                <QRCodeSVG value={shareUrl} size={64} level="H" />
              </div>
              <p className="text-[8px] font-mono text-zinc-400 tracking-wider">SCAN_TO_TRACK_ON_MOBILE</p>
            </div>
          </div>

          {/* Core metadata blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-zinc-900 pb-10 mb-10 text-sm">
            
            {/* General Order Information */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest border-l border-[#0055ff] pl-2.5">
                01_TRANSACTION_RECORDS
              </h3>
              <div className="space-y-3">
                <div 
                  onClick={handleCopyId}
                  className="group flex items-center gap-2 cursor-pointer"
                  title="Copy Tracing Order ID"
                >
                  <div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Order ID</div>
                    <div className="font-mono font-black text-sm tracking-widest text-[#0055ff] transition-colors group-hover:text-blue-400">
                      {order.id}
                    </div>
                  </div>
                  <Copy className="w-3.5 h-3.5 text-zinc-650 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase">Timestamp</div>
                  <div className="font-semibold flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{order.date} // {order.time}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase">Dispatch Status</div>
                  <div className={`mt-1 inline-block text-[10px] font-black uppercase px-2.5 py-0.5 ${
                    order.status === 'DELIVERED' ? 'bg-emerald-500/15 text-emerald-500' :
                    order.status === 'SHIPPED' ? 'bg-blue-500/15 text-blue-500' :
                    order.status === 'CANCELLED' ? 'bg-rose-500/15 text-rose-500' :
                    'bg-amber-500/15 text-amber-500'
                  }`}>
                    {order.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Credentials */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest border-l border-[#0055ff] pl-2.5">
                02_IDENTITY_AND_SECURE
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase">Customer Name</div>
                  <div className="font-bold uppercase mt-0.5">{order.customerName}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-medium text-xs break-all truncate">{order.customerEmail}</span>
                </div>
                {order.senderNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium text-xs">{order.senderNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Logistics */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest border-l border-[#0055ff] pl-2.5">
                03_COURIER_SHIPPING
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2 items-start">
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Destination address</div>
                    <p className="text-xs font-semibold leading-relaxed uppercase mt-0.5">{order.shippingAddress}</p>
                  </div>
                </div>
                
                {order.trackingNumber && (
                  <div className="pt-2 border-t border-dashed border-zinc-900 mt-2">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Tracking Details ({order.trackingProvider || 'HQ Routing'})</div>
                    {order.trackingUrl ? (
                      <a 
                        href={order.trackingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-black text-[#0055ff] hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {order.trackingNumber}
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs font-mono font-bold">{order.trackingNumber}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Interactive Order Status Timeline tracker */}
          <div className="mb-10">
            <OrderTimeline status={order.status} isDarkMode={isDarkMode} />
          </div>

          {/* ADVANCED SHIPMENT TRACKER & ESTIMATED DELIVERY CENTER */}
          <div className={`mb-10 border ${
            isDarkMode ? 'border-zinc-900 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/50'
          } p-5 md:p-8 rounded-none`}>
            
            {/* Header controls for Logistics Hub */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5 mb-6">
              <div>
                <span className="text-[10px] text-[#0055ff] font-mono tracking-[0.22em] block mb-1">LOGISTICS_&_ETA_REPORT</span>
                <h3 className="text-lg font-black uppercase tracking-tight heading-font italic">
                  SHIPMENT_TRACKER_CENTRAL
                </h3>
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex border border-zinc-800 p-0.5 max-w-sm">
                <button
                  type="button"
                  onClick={() => setTrackerTab('progress')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    trackerTab === 'progress' 
                      ? 'bg-[#0055ff] text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🚚 ROUTE & ETA
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerTab('checkpoints')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    trackerTab === 'checkpoints' 
                      ? 'bg-[#0055ff] text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📋 CHECKPOINTS
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerTab('telemetry')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    trackerTab === 'telemetry' 
                      ? 'bg-[#0055ff] text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ TELEMETRY
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 1. progress (Visual route & calculated ETA) */}
            {trackerTab === 'progress' && (
              <div className="space-y-6">
                {/* Highlight banner with Estimated Delivery Date */}
                <div className={`p-4 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDarkMode 
                    ? 'border-[#0055ff]/20 bg-[#0055ff]/5' 
                    : 'border-[#0055ff]/35 bg-blue-50/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0055ff] flex items-center justify-center text-white shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-[#0055ff] uppercase">
                        Estimated Delivery ETA
                      </div>
                      <div className="text-xl font-black font-mono tracking-tight uppercase text-emerald-500">
                        {getEstimatedDeliveryDate(order.date, order.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left md:text-right text-[10px] font-mono text-zinc-400 uppercase">
                    Status: <span className="font-bold text-[#0055ff]">{order.status}</span>
                    <span className="block mt-0.5">Route Code: DHAKA_SYS_2026</span>
                  </div>
                </div>

                {/* Routing Simulation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Visual Route Vector */}
                  <div className={`p-4 border ${isDarkMode ? 'border-zinc-900 bg-black/40' : 'border-zinc-200 bg-white'} space-y-4`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Active Courier Flightpath
                    </div>
                    
                    <div className="relative py-6 flex items-center justify-between border-y border-zinc-900 border-dashed">
                      <div className="text-center shrink-0">
                        <div className="w-2.5 h-2.5 bg-[#0055ff] rounded-full mx-auto ring-4 ring-blue-500/20"></div>
                        <div className="text-[8px] font-black uppercase mt-2 text-zinc-400">Hub Start</div>
                        <div className="text-[7px] font-mono text-zinc-500">Dhaka Depot</div>
                      </div>
                      
                      {/* Flightpath animation trail */}
                      <div className="flex-1 relative h-[2px] bg-zinc-800 mx-3">
                        <div className={`absolute top-0 left-0 h-full bg-[#0055ff] tracking-widest ${
                          order.status === 'DELIVERED' ? 'w-full' :
                          order.status === 'SHIPPED' ? 'w-2/3' :
                          (order.status as string) === 'PROCESSING' || order.status === 'PENDING' ? 'w-1/3' : 'w-1/12'
                        }`}></div>
                        
                        <div className={`absolute -top-2.5 transition-all duration-1000 ${
                          order.status === 'DELIVERED' ? 'right-0' :
                          order.status === 'SHIPPED' ? 'left-2/3' :
                          (order.status as string) === 'PROCESSING' || order.status === 'PENDING' ? 'left-1/3' : 'left-0'
                        }`}>
                          <Truck className="w-5 h-5 text-[#0055ff] animate-bounce shrink-0" />
                        </div>
                      </div>

                      <div className="text-center shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
                          order.status === 'DELIVERED' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-zinc-800'
                        }`}></div>
                        <div className="text-[8px] font-black uppercase mt-2 text-zinc-400">Destination</div>
                        <div className="text-[7px] font-mono text-zinc-500 truncate max-w-[80px]">
                          {order.shippingAddress.split(',').pop()?.trim() || 'Client'}
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-relaxed font-mono">
                      Parcel registered with weight 1.45kg. Handheld sensors logged container isolation validation.
                    </p>
                  </div>

                  {/* Courier stats indicators */}
                  <div className={`p-4 border ${isDarkMode ? 'border-zinc-900 bg-black/40' : 'border-zinc-200 bg-white'} space-y-3`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Courier Logistics Registry</div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase text-[9px] font-mono">Logistics Carrier:</span>
                        <span className="font-bold uppercase tracking-wider">{order.trackingProvider || 'REDX Express Cargo'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase text-[9px] font-mono">Tracking Code:</span>
                        <span className="font-mono font-bold text-[#0055ff]">{order.trackingNumber || 'STX-TRK-PENDING'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-500 uppercase text-[9px] font-mono">Dispatch Mode:</span>
                        <span className="font-bold uppercase tracking-wider">Garment Sealed Relay</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 uppercase text-[9px] font-mono">Freight Weight:</span>
                        <span className="font-mono font-bold">1.45 kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. checkpoints (Historical relative logs) */}
            {trackerTab === 'checkpoints' && (
              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2 pr-2">
                  Chronological Transit History Scans:
                </div>
                
                <div className="relative border-l border-zinc-800 pl-6 ml-3 space-y-6">
                  
                  {/* Step 6: Delivered step */}
                  {order.status === 'DELIVERED' && (
                    <div className="relative">
                      {/* Checkpoint Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5 text-black" strokeWidth={5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-emerald-500">CONSIGNMENT_DELIVERED</span>
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {getCheckpointTime(order.date, order.time, 72)}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                          Parcel handed over to recipient. Sign-off recorded securely at {order.shippingAddress}.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Out for delivery */}
                  {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-white">
                        <Truck className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-blue-500">OUTFOR_DELIVERY_RELAY</span>
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {getCheckpointTime(order.date, order.time, 48)}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                          Package loaded into regional delivery courier van for local drop-off doorstep relay.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Shipped from warehouse */}
                  {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-white">
                        <Package className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wide text-zinc-200">FREIGHT_DISPATCH_DEPOT</span>
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {getCheckpointTime(order.date, order.time, 24)}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                          Garment consolidated into line haul freight containers. Exited Dhaka central exit terminal hub.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Manufacturing/Processing */}
                  {((order.status as string) === 'PROCESSING' || order.status === 'PENDING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center text-white">
                        <Activity className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-amber-500">TAILOR_&_PRODUCTION_QA</span>
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {getCheckpointTime(order.date, order.time, 4)}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                          Custom pattern print checked, alignment tailored and passed strict premium design fabric inspection.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Payment Audited */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-zinc-700 border-2 border-black flex items-center justify-center text-white">
                      <Database className="w-2.5 h-2.5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-zinc-350">MFS_DEPOSIT_BALANCE_VERIFIED</span>
                        <span className="text-[9px] font-mono text-zinc-500 font-bold">
                          {getCheckpointTime(order.date, order.time, 1)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                        Payment audit verified. System allocated security token for design routing assembly.
                      </p>
                    </div>
                  </div>

                  {/* Step 1: Order received */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-zinc-700 border-2 border-black flex items-center justify-center text-white">
                      <Clock className="w-2.5 h-2.5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-zinc-350">TRANSACTION_SEED_CREATED</span>
                        <span className="text-[9px] font-mono text-zinc-500 font-bold">
                          {getCheckpointTime(order.date, order.time, 0)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 font-mono uppercase">
                        StreetThreadX client recorded order payload. Core tracing ID assigned successfully.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. telemetry (GPS Ping console simulation) */}
            {trackerTab === 'telemetry' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                    Interactive SatLink Uplink Router:
                  </div>
                  <button
                    type="button"
                    onClick={handlePingTelemetry}
                    disabled={pingActive}
                    className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 text-white text-[9px] font-black uppercase tracking-widest hover:border-[#0055ff] hover:text-[#0055ff] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${pingActive ? 'animate-spin text-[#0055ff]' : ''}`} />
                    {pingActive ? "PINGING..." : "PING SATELLITE SIGNAL"}
                  </button>
                </div>
                
                {/* Console Output Screen */}
                <div className="p-4 bg-black border border-zinc-900 font-mono text-[9px] text-[#00ff55] space-y-1.5 rounded-none max-h-56 overflow-y-auto">
                  <div className="text-zinc-650 flex items-center justify-between border-b border-zinc-900 pb-1 mb-2">
                    <span>SYS_TERMINAL_OUT // KEY: {order.id.substring(0, 10)}</span>
                    <span className="animate-pulse">● SECURE</span>
                  </div>
                  
                  {pingSequence.length === 0 ? (
                    <div className="text-zinc-500 italic uppercase">
                      Ready. Trigger satellite ping key sequence to fetch active live logistics diagnostics telemetry.
                    </div>
                  ) : (
                    pingSequence.map((log, index) => (
                      <div key={index} className="leading-relaxed whitespace-pre-wrap">
                        {log}
                      </div>
                    ))
                  )}

                  {pingActive && (
                    <div className="text-zinc-400 animate-pulse uppercase tracking-widest text-[8px] pl-2">
                      ⚡ LINK STAGE RESOLVING...
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Ordered Line Items list */}
          <div className="space-y-4 mb-10">
            <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-900 pb-2">
              GARMENTS_PAYLOAD // ITEMS
            </h3>
            
            <div className="divide-y divide-zinc-900">
              {order.orderItems?.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={idx} className="py-4 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-3">
                      {product?.images?.[0] && (
                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden">
                          <img src={product.images[0]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold uppercase">{item.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          SIZE: {item.variant?.size || 'DEFAULT'} // COLOR: {item.variant?.color || 'DEFAULT'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-10">
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase">Units</div>
                        <div className="font-bold">{item.quantity}x</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase">Unit price</div>
                        <div className="font-mono">৳{item.price.toLocaleString()}</div>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase">Total Row</div>
                        <div className="font-mono font-bold text-white">৳{(item.price * item.quantity).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional details: order notes, screenshot & payment method, grand billing breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-dashed border-zinc-800">
            
            {/* Payment Verification status */}
            <div className="space-y-6">
              
              {/* Payment details block */}
              <div className={`p-5 rounded-none border ${isDarkMode ? 'bg-zinc-900/10 border-zinc-900' : 'bg-zinc-50 border-zinc-200'} space-y-3`}>
                <h4 className="text-[10px] font-black uppercase text-[#0055ff] tracking-widest flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment_Audit
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Method:</span>
                    <span className="font-semibold uppercase">{order.paymentMethod || 'bKash'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className={`font-black uppercase text-[10px] ${
                      order.paymentStatus === 'FULLY_PAID' || order.paymentStatus === 'ADVANCE_VERIFIED'
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}>
                      {order.paymentStatus?.replace(/_/g, ' ') || 'PENDING VERIFICATION'}
                    </span>
                  </div>
                  {order.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">TrxID:</span>
                      <span className="font-mono font-bold">{order.transactionId}</span>
                    </div>
                  )}
                  {order.senderNumber && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Sender:</span>
                      <span className="font-mono">{order.senderNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery instructions / notes */}
              {(order.notes || order.deliveryInstructions) && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Instructions & Notes</div>
                  {order.notes && (
                    <p className={`p-4 border text-xs italic ${isDarkMode ? 'border-zinc-900 bg-black text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700'}`}>
                      "{order.notes}"
                    </p>
                  )}
                  {order.deliveryInstructions && (
                    <p className="p-3 bg-[#0055ff]/5 border border-[#0055ff]/15 text-[11px] text-zinc-300">
                      <span className="font-black text-[#0055ff] uppercase tracking-wider text-[9px] block mb-1">Courier Guide</span>
                      {order.deliveryInstructions}
                    </p>
                  )}
                </div>
              )}
              
              {/* Payment Screenshot (MFS) */}
              {order.transactionScreenshot && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Submitted Deposit Screenshot</div>
                  <div className="w-full max-h-56 overflow-hidden border border-zinc-900 bg-black flex items-center justify-center p-2">
                    <img 
                      src={order.transactionScreenshot} 
                      alt="Deposit Slip" 
                      className="max-h-52 object-contain hover:scale-105 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Financial Ledger card */}
            <div className={`p-6 rounded-none ${isDarkMode ? 'bg-zinc-950 border border-zinc-900' : 'bg-zinc-50 border border-zinc-200'} space-y-4`}>
              <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b border-zinc-900 pb-2">
                FINANCIAL_LEDGER_BALANCE
              </h4>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold text-[9px]">Goods Subtotal</span>
                  <span className="font-mono">৳{order.subtotal?.toLocaleString() || (order.total - 60).toLocaleString()}</span>
                </div>
                
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-bold uppercase text-[9px]">Promo Discount</span>
                    <span className="font-mono">-৳{order.discount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold text-[9px]">VAT / Taxes</span>
                  <span className="font-mono">৳0</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold text-[9px]">Shipping Charges</span>
                  <span className="font-mono">৳60</span>
                </div>
                
                <div className="pt-2 border-t border-zinc-900 flex justify-between font-bold text-sm">
                  <span className="uppercase text-[10px] font-black">Grand Total (Net)</span>
                  <span className="text-[#0055ff] font-mono">৳{order.total.toLocaleString()}</span>
                </div>
                
                <div className="pt-3 border-t border-dashed border-zinc-800 flex justify-between text-emerald-500 bg-emerald-500/5 p-2 font-black uppercase text-[10px] tracking-wide">
                  <span>Advance Deposited</span>
                  <span className="font-mono">৳{order.advancePaid?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex justify-between text-rose-500 bg-rose-500/5 p-2 font-black uppercase text-[10px] tracking-wide">
                  <span>Due Balance on Delivery</span>
                  <span className="font-mono">৳{order.dueAmount?.toLocaleString() || '0'}</span>
                </div>
              </div>

              {/* Security Shield Disclaimer */}
              <div className="mt-6 flex gap-2 items-start p-3 bg-zinc-900/30 text-[9px] text-zinc-500 leading-relaxed border border-zinc-900">
                <ShieldAlert className="w-4 h-4 text-[#0055ff] shrink-0" />
                <p>
                  This billing receipt marks secure cryptographic confirmation of deposit. For any issues referencing logistics tracking or refund relays, quote the Trace ID directly to system operators.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
