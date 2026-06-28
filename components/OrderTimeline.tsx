import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Settings, Package, Truck, CheckCircle, Check, Info, HelpCircle, PhoneCall, FileText, Compass, RotateCcw } from 'lucide-react';
import { updateOrderStatus } from '../services/orderService';
import { motion, Variants, AnimatePresence } from 'motion/react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    }
  }
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

const mobileContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    }
  }
};

const mobileStepVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 110,
      damping: 14
    }
  }
};

interface Props {
  status: string;
  isDarkMode: boolean;
  orderId?: string;
}

interface TimelineStep {
  id: string;
  statusKey: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  checklist: string[];
  narrative: string;
  estDuration: string;
  location: string;
}

export const OrderTimeline: React.FC<Props> = ({ status, isDarkMode, orderId }) => {
  const normalizedStatus = status ? status.toUpperCase() : 'PENDING';
  const isCancelled = normalizedStatus === 'CANCELLED';

  const timelineSteps: TimelineStep[] = [
    {
      id: 'CONFIRMED',
      statusKey: 'PENDING',
      label: 'Confirmed',
      description: 'Order received & verified',
      icon: ClipboardList,
      checklist: [
        'Payment authorization verified',
        'Streetwear fit and sizing reviewed',
        'Inventory reservation locked',
        'Digital receipt generated'
      ],
      narrative: 'Your order is confirmed and secured. Our style coordinators have verified your sizing parameters, and inventory reservation is officially locked in our central repository.',
      estDuration: 'Immediate',
      location: 'Central Dhaka Hub'
    },
    {
      id: 'PROCESSING',
      statusKey: 'PROCESSING',
      label: 'Processing',
      description: 'Fabric & print production',
      icon: Settings,
      checklist: [
        'Premium heavyweight fabric batch matched',
        'Streetwear ink-transfer precision printing',
        'Ribbing & stitch reinforcement',
        'Quality assurance inspection'
      ],
      narrative: 'Your streetwear essentials are on the workbenches. We are precision-printing the designs and reinforcing the seams using our signature premium heavy-duty stitching.',
      estDuration: '1 - 2 Business Days',
      location: 'StreetThreadX Production Lab'
    },
    {
      id: 'PACKED',
      statusKey: 'PACKED',
      label: 'Packed',
      description: 'Premium dustbag sealing',
      icon: Package,
      checklist: [
        'Garment professionally steam-pressed',
        'Premium collection tags attached',
        'Sealed in protective custom dustbags',
        'Boxed in signature matte-black parcel packaging'
      ],
      narrative: 'Your garment has been hand-inspected and steam-pressed. It is carefully wrapped in our custom collection dustbag and sealed inside our high-contrast, premium matte parcel boxes.',
      estDuration: '12 - 24 Hours',
      location: 'Packaging & Sourcing Facility'
    },
    {
      id: 'DISPATCHED',
      statusKey: 'SHIPPED',
      label: 'Dispatched',
      description: 'Handed to courier',
      icon: Truck,
      checklist: [
        'Package hand-over to courier logistics',
        'Tracking reference registered',
        'Dhaka South Logistics sorting completed',
        'Delivery dispatch agent assigned'
      ],
      narrative: 'Your package is officially in transit. The shipping logs are active, and our premium delivery courier is moving the parcel directly toward your registered drop coordinates.',
      estDuration: '1 - 3 Days',
      location: 'Logistics Sorting Center'
    },
    {
      id: 'DELIVERED',
      statusKey: 'DELIVERED',
      label: 'Delivered',
      description: 'Handed over to customer',
      icon: CheckCircle,
      checklist: [
        'Geofenced route complete',
        'Sign-off digital authorization collected',
        'Unpack verification completed',
        'Welcome to the elite collective'
      ],
      narrative: 'Your elite streetwear drop has arrived. Please unpack, inspect the premium materials, and welcome to the StreetThreadX global collective. Tag your fit online to unlock VIP tiers.',
      estDuration: 'Delivered',
      location: 'Recipient Drop Destination'
    }
  ];

  // Map the backend status to step index (0 to 4)
  const getActiveStepIndex = (currStatus: string) => {
    const s = currStatus.toUpperCase();
    if (s === 'CANCELLED') return -1;
    if (s === 'PENDING' || s === 'CONFIRMED') return 0;
    if (s === 'PROCESSING') return 1;
    if (s === 'PACKED' || s === 'PACKAGED') return 2;
    if (s === 'SHIPPED' || s === 'DISPATCHED') return 3;
    if (s === 'DELIVERED') return 4;
    return 0; // fallback
  };

  const activeIndex = getActiveStepIndex(normalizedStatus);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(activeIndex === -1 ? 0 : activeIndex);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState('');
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Auto-sync selected step with active step when the order status changes in Firestore
  useEffect(() => {
    if (activeIndex !== -1) {
      setSelectedStepIndex(activeIndex);
    }
  }, [activeIndex]);

  const handleSimulateStatus = async (targetStatus: string) => {
    if (!orderId) {
      setSimError('No active Order ID was supplied to update.');
      return;
    }
    setIsSimulating(true);
    setSimError('');
    try {
      await updateOrderStatus(orderId, targetStatus);
    } catch (err: any) {
      console.error("Simulation error details:", err);
      setSimError('Failed to synchronize status with Firestore database.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isCancelled) {
    return (
      <div className={`mt-8 p-6 border ${isDarkMode ? 'bg-rose-500/5 border-rose-500/20 text-white' : 'bg-rose-50 border-rose-200 text-black'} space-y-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
            <X size={20} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-600">Order_Cancelled</h3>
            <p className="text-[10px] text-rose-600/60 font-mono uppercase">This streetwear drop has been voided / returned.</p>
          </div>
        </div>
        
        {orderId && (
          <div className="pt-4 border-t border-rose-200/40">
            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">⚡ Reset / Simulate order from Cancelled status:</p>
            <button
              onClick={() => handleSimulateStatus('PENDING')}
              disabled={isSimulating}
              className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              {isSimulating ? 'Resetting...' : 'Re-Activate Order (Set to Confirmed)'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const selectedStep = timelineSteps[selectedStepIndex];

  return (
    <div id="order-status-timeline" className={`mt-8 py-8 px-4 sm:px-6 border ${isDarkMode ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-black'} w-full transition-all duration-300 relative`}>
      
      {/* Header and Live Status Indicators */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0055ff]">
            ORDER_LIFECYCLE_TIMELINE
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-tighter mt-1 font-mono">
            Interactive: Click any stage circle to inspect details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orderId && (
            <button
              type="button"
              onClick={() => setShowSimPanel(!showSimPanel)}
              className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              ⚙️ Simulator Panel
            </button>
          )}
          {activeIndex === 3 && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => setShowTrackingModal(true)}
                className="dispatched-badge-pulsate"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0055ff] inline-block animate-ping"></span>
                Order Dispatched
              </button>
              {/* Tooltip with estimated delivery timestamp */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                <div className="bg-zinc-950 border-2 border-zinc-800 text-white text-[9px] font-mono p-2.5 shadow-2xl flex flex-col gap-1 text-center">
                  <div className="font-black text-[#0055ff] uppercase tracking-wider">EST. DELIVERY</div>
                  <div className="text-zinc-300 font-bold">45 Mins (In Transit)</div>
                  <div className="text-[7px] text-zinc-500 uppercase">Click for Live GPS Map</div>
                </div>
                {/* Tooltip Arrow */}
                <div className="w-2 h-2 bg-zinc-950 border-r-2 border-b-2 border-zinc-800 rotate-45 mx-auto -mt-1"></div>
              </div>
            </div>
          )}
          <div className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#0055ff]/10 text-[#0055ff] border border-[#0055ff]/20">
            Active: {timelineSteps[activeIndex]?.label || 'Pending'}
          </div>
        </div>
      </div>

      {/* TIMELINE VISUAL TRACKER */}
      <div className="mb-10 relative">
        {/* Desktop/Tablet Horizontal Layout */}
        <div className="hidden md:block relative px-10 py-4">
          {/* Progress Connecting Line Backing */}
          <div className={`absolute top-1/2 left-[50px] right-[50px] h-[3px] -translate-y-1/2 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} z-0`}></div>
          
          {/* Active Glowing Line */}
          <div 
            className="absolute top-1/2 left-[50px] h-[3px] -translate-y-1/2 bg-[#0055ff] z-0 transition-all duration-1000 ease-in-out shadow-[0_0_12px_#0055ff]"
            style={{ width: `calc(${(activeIndex / (timelineSteps.length - 1)) * 100}% - ${activeIndex === 0 ? 0 : activeIndex === 4 ? 0 : 0}px)` }}
          ></div>

          <motion.div 
            className="flex justify-between items-center relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              const isSelected = idx === selectedStepIndex;
              const StepIcon = step.icon;

              return (
                <motion.div 
                  key={step.id} 
                  variants={stepVariants}
                  className="flex flex-col items-center group relative"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedStepIndex(idx)}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative ${
                      isSelected 
                        ? 'bg-black border-[#0055ff] text-[#0055ff] ring-4 ring-[#0055ff]/25 scale-115 shadow-[0_0_15px_rgba(0,85,255,0.4)]'
                        : isCompleted
                          ? 'bg-[#0055ff] border-[#0055ff] text-white hover:scale-105 shadow-[0_2px_8px_rgba(0,85,255,0.2)]'
                          : isActive
                            ? 'bg-[#0055ff]/10 border-[#0055ff] text-[#0055ff] ring-4 ring-[#0055ff]/15 hover:scale-105 animate-pulse'
                            : isDarkMode 
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300' 
                              : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={3.5} />
                    ) : (
                      <StepIcon className="w-5 h-5" strokeWidth={isActive || isSelected ? 2.5 : 2} />
                    )}
                    
                    {/* Glowing ring for actual active step */}
                    {isActive && !isSelected && (
                      <div className="absolute inset-0 rounded-full border border-[#0055ff] animate-ping opacity-60"></div>
                    )}
                  </button>

                  <div className="absolute top-14 text-center w-28 flex flex-col items-center">
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                      isSelected ? 'text-[#0055ff]' : isActive ? (isDarkMode ? 'text-white' : 'text-black') : 'text-zinc-400'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="mt-0.5 text-[7px] font-black bg-[#0055ff] text-white px-1.5 py-0.2 uppercase tracking-wide">
                        LIVE
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Mobile Vertical Layout */}
        <div className="block md:hidden relative pl-6 pr-2">
          {/* Line Tracker Vertical */}
          <div className={`absolute top-4 bottom-4 left-[15px] w-[2px] ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} z-0`}></div>
          <div 
            className="absolute top-4 left-[15px] w-[2px] bg-[#0055ff] z-0 transition-all duration-1000 ease-in-out shadow-[0_0_8px_#0055ff]"
            style={{ height: `${(activeIndex / (timelineSteps.length - 1)) * 100}%` }}
          ></div>

          <motion.div 
            className="space-y-6 relative z-10"
            variants={mobileContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              const isSelected = idx === selectedStepIndex;
              const StepIcon = step.icon;

              return (
                <motion.button
                  key={step.id}
                  variants={mobileStepVariants}
                  type="button"
                  onClick={() => setSelectedStepIndex(idx)}
                  className="w-full flex items-center text-left focus:outline-none group active:scale-[0.98] transition-transform"
                  style={{ minHeight: '44px' }}
                >
                  <div className={`w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                    isSelected 
                      ? 'bg-black border-[#0055ff] text-[#0055ff] ring-4 ring-[#0055ff]/20 scale-105'
                      : isCompleted
                        ? 'bg-[#0055ff] border-[#0055ff] text-white'
                        : isActive
                          ? 'bg-[#0055ff]/10 border-[#0055ff] text-[#0055ff] ring-2 ring-[#0055ff]/15'
                          : isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-4 h-4" strokeWidth={4} />
                    ) : (
                      <StepIcon className="w-4 h-4" strokeWidth={isActive || isSelected ? 2.5 : 2} />
                    )}
                  </div>

                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${
                        isSelected ? 'text-[#0055ff]' : isActive ? (isDarkMode ? 'text-white' : 'text-black') : 'text-zinc-500'
                      }`}>
                        {step.label}
                      </span>
                      {isActive && (
                        <span className="text-[7px] font-black bg-[#0055ff] text-white px-1.5 py-0.5 tracking-wider uppercase">
                          ACTIVE
                        </span>
                      )}
                      {isSelected && !isActive && (
                        <span className="text-[7px] font-black bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 tracking-wider uppercase">
                          Viewing
                        </span>
                      )}
                    </div>
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-tight mt-0.5">
                      {step.description}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* SIMULATOR CONTROL PANEL */}
      {showSimPanel && orderId && (
        <div className={`mb-8 p-5 border border-dashed transition-all duration-300 animate-in slide-in-from-top-4 ${
          isDarkMode ? 'border-zinc-800 bg-zinc-900/40 text-white' : 'border-zinc-300 bg-zinc-50 text-black'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                ⚡ DEMO INTERACTIVE SIMULATOR (FIRESTORE)
              </h4>
              <p className="text-[9px] text-zinc-400 uppercase tracking-tighter mt-1 font-mono">
                Click any status trigger button to write directly to Firestore. The real-time snapshot listener will instantly capture the updates and animate the timeline below!
              </p>
            </div>
            <button 
              onClick={() => setShowSimPanel(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {timelineSteps.map((step) => {
              const isActive = status.toUpperCase() === step.statusKey.toUpperCase();
              return (
                <button
                  key={step.id}
                  disabled={isSimulating}
                  onClick={() => handleSimulateStatus(step.statusKey)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider border transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' 
                      : isDarkMode
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black'
                  }`}
                >
                  {step.label}
                </button>
              );
            })}
            <button
              disabled={isSimulating}
              onClick={() => handleSimulateStatus('CANCELLED')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider border transition-all duration-200 ${
                status.toUpperCase() === 'CANCELLED'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white'
              }`}
            >
              Cancel Order
            </button>
          </div>

          {isSimulating && (
            <div className="text-[9px] text-emerald-500 font-mono uppercase mt-3 animate-pulse">
              Syncing live payload with Firestore database...
            </div>
          )}
          {simError && (
            <div className="text-[9px] text-rose-500 font-mono uppercase mt-3">
              Error: {simError}
            </div>
          )}
        </div>
      )}

      {/* SELECTED STEP DETAIL CARD (INTERACTIVE OVERLAY) */}
      <div className={`p-6 border transition-all duration-300 ${
        isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      } animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex flex-col lg:flex-row gap-6 justify-between">
          
          {/* Narrative & Status Description */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black bg-[#0055ff] text-white px-2 py-0.5 uppercase tracking-wider">
                STAGE {selectedStepIndex + 1}
              </span>
              <h4 className="text-sm font-black uppercase tracking-wider">
                {selectedStep.label} Progress Details
              </h4>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed uppercase tracking-tight">
              {selectedStep.narrative}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="block text-[8px] font-black uppercase text-zinc-400">ESTIMATED CYCLE</span>
                <span className="block text-xs font-bold font-mono tracking-tight text-[#0055ff] mt-0.5">
                  {selectedStep.estDuration}
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-zinc-400">LOGISTICS HUB</span>
                <span className="block text-xs font-bold font-mono tracking-tight mt-0.5">
                  {selectedStep.location}
                </span>
              </div>
            </div>

            {/* Dynamic Context-Aware Action Buttons */}
            <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex flex-wrap gap-2">
              {selectedStepIndex === 0 && (
                <>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider transition-colors">
                    <FileText size={12} /> Download Invoice
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider transition-colors">
                    <HelpCircle size={12} /> Change Address
                  </button>
                </>
              )}
              {selectedStepIndex === 1 && (
                <button className="flex items-center gap-1.5 px-3 py-2 bg-[#0055ff] text-white hover:bg-blue-600 text-[9px] font-black uppercase tracking-wider transition-colors">
                  <PhoneCall size={12} /> Contact styling desk
                </button>
              )}
              {selectedStepIndex === 2 && (
                <button className="flex items-center gap-1.5 px-3 py-2 border border-[#0055ff]/30 text-[#0055ff] bg-[#0055ff]/5 hover:bg-[#0055ff]/10 text-[9px] font-black uppercase tracking-wider transition-colors">
                  🌱 Eco-Packaging Preferences
                </button>
              )}
              {selectedStepIndex === 3 && (
                <>
                  <button 
                    onClick={() => setShowMapModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0055ff] text-white hover:bg-blue-600 text-[9px] font-black uppercase tracking-wider transition-colors"
                  >
                    <Compass size={12} /> View Live Shipping Map
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider transition-colors">
                    Contact Courier
                  </button>
                </>
              )}
              {selectedStepIndex === 4 && (
                <>
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-[#0055ff] text-white hover:bg-blue-600 text-[9px] font-black uppercase tracking-wider transition-colors">
                    Rate Sizing & Style
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[9px] font-black uppercase tracking-wider transition-colors">
                    <RotateCcw size={12} /> File returns
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sourcing / Garment Checklist Log */}
          <div className="lg:w-72 space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2">
              Garment Logistics Log
            </h5>
            <div className="space-y-2">
              {selectedStep.checklist.map((item, idx) => {
                // If the selected step is in the past, all checklist items are ticked.
                // If it's in the future, none are.
                // If it's the current active step, let's pretend some are ticked or let them tick!
                const isStepCompleted = selectedStepIndex < activeIndex;
                const isStepFuture = selectedStepIndex > activeIndex;
                const isTicked = isStepCompleted || (selectedStepIndex === activeIndex && idx < 3); // mock partial progress

                return (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                      isTicked 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-700' : 'bg-white border-zinc-200 text-zinc-300'
                    }`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className={`text-[10px] uppercase tracking-tight leading-tight ${
                      isTicked 
                        ? 'text-zinc-500 dark:text-zinc-400 font-medium' 
                        : 'text-zinc-400 dark:text-zinc-600 line-through decoration-zinc-800/30'
                    }`}>
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showMapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-4xl bg-zinc-950 border-2 border-zinc-800 text-white shadow-2xl flex flex-col md:flex-row overflow-hidden"
              style={{ minHeight: '480px' }}
            >
              {/* Tactical Sidebar */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 p-6 flex flex-col justify-between bg-zinc-950/50">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0055ff]">
                        LOGISTICS_CORE_HUD
                      </span>
                      <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-none animate-pulse">
                        LIVE_GPS_FEED
                      </span>
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest mt-1 text-white">
                      Tactical Delivery Router
                    </h4>
                  </div>

                  {/* Telemetry Panel */}
                  <div className="space-y-3 bg-black/40 border border-zinc-900 p-4">
                    <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-900 pb-1.5">
                      System Telemetry
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                      <div>
                        <div className="text-zinc-600 font-bold uppercase text-[8px]">ACTIVE_COORDS</div>
                        <div className="text-zinc-300">
                          {activeIndex === 0 && '23.8103° N, 90.4125° E'}
                          {activeIndex === 1 && '23.8223° N, 90.4215° E'}
                          {activeIndex === 2 && '23.7943° N, 90.4043° E'}
                          {activeIndex === 3 && '23.7561° N, 90.3762° E'}
                          {activeIndex === 4 && '23.7461° N, 90.3742° E'}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-600 font-bold uppercase text-[8px]">COURIER_SPEED</div>
                        <div className="text-zinc-300">
                          {activeIndex === 3 ? '42 km/h' : '0 km/h (Parked)'}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-600 font-bold uppercase text-[8px]">EST_ARRIVAL</div>
                        <div className="text-zinc-300">
                          {activeIndex === 0 && 'Awaiting Dispatch'}
                          {activeIndex === 1 && 'Fabrication Stage'}
                          {activeIndex === 2 && 'In Packaging Room'}
                          {activeIndex === 3 && '45 Mins (In Transit)'}
                          {activeIndex === 4 && 'Delivered'}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-600 font-bold uppercase text-[8px]">ALTITUDE</div>
                        <div className="text-zinc-300">34m ASL</div>
                      </div>
                    </div>
                  </div>

                  {/* Location Context Card */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      Current Target Node
                    </span>
                    <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-none">
                      <div className="text-[10px] font-black uppercase tracking-wider text-white">
                        {timelineSteps[activeIndex === -1 ? 0 : activeIndex]?.location || 'StreetThreadX Central'}
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-1 uppercase font-mono tracking-tight leading-relaxed">
                        {activeIndex === 0 && 'Order approved. Items are locked into dispatch pipeline at Dhaka Headquarters.'}
                        {activeIndex === 1 && 'Material selection & digital fit precision print verification on the manufacture floor.'}
                        {activeIndex === 2 && 'Draped in brand dustbags, premium tags loaded, sealed into specialized moisture-barrier shipping containers.'}
                        {activeIndex === 3 && 'Carrier dispatch transit link activated. Package is actively navigating public grid nodes.'}
                        {activeIndex === 4 && 'Geofenced sign-off achieved. Streetwear parcel logged as secured by the buyer.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-900 flex flex-col gap-2">
                  <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-tight">
                    Order ID: {orderId || 'ST-TEST-9988'}
                  </div>
                  <button
                    onClick={() => setShowMapModal(false)}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-wider text-[10px] border border-zinc-800 transition-colors"
                  >
                    Close GPS Terminal
                  </button>
                </div>
              </div>

              {/* Map Interactive Visualization Area */}
              <div className="flex-1 bg-black p-6 relative flex flex-col justify-between overflow-hidden">
                {/* SVG Map Canvas */}
                <div className="absolute inset-0 opacity-25 pointer-events-none">
                  {/* Grid Lines Pattern */}
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="gridMap" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222" strokeWidth="1" />
                        <circle cx="0" cy="0" r="1.5" fill="#333" />
                      </pattern>
                      <pattern id="subgridMap" width="8" height="8" patternUnits="userSpaceOnUse">
                        <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#111" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#subgridMap)" />
                    <rect width="100%" height="100%" fill="url(#gridMap)" />
                  </svg>
                </div>

                {/* Header Hud */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-none animate-ping"></div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 font-black">
                      SAT_VIEW: Dhaka_Core_Sector
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-500">
                    SENSORS_OK // PING: 18MS
                  </div>
                </div>

                {/* Interactive Map Visual Elements */}
                <div className="flex-1 relative flex items-center justify-center my-6">
                  {/* Dhaka map layout (vector lines) */}
                  <svg className="absolute inset-0 w-full h-full text-zinc-800" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
                    {/* Road Network Lines */}
                    <path d="M 50 100 Q 200 80 400 120 T 750 150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="opacity-40" />
                    <path d="M 100 450 Q 300 380 500 420 T 700 380" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
                    <path d="M 120 50 L 150 450" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                    <path d="M 400 50 L 450 450" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                    <path d="M 680 50 L 620 450" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
                    
                    {/* Connecting express bypass */}
                    <path d="M 150 150 C 300 250, 500 150, 680 350" fill="none" stroke="#0055ff" strokeWidth="1.5" className="opacity-40" />

                    {/* Nodes of Distribution */}
                    {/* Node 1: Origin Hub */}
                    <circle cx="150" cy="150" r="6" fill="#111" stroke="#0055ff" strokeWidth="2" />
                    <text x="162" y="154" fill="#666" className="text-[9px] font-mono font-bold uppercase">Node_HQ</text>

                    {/* Node 2: Transit Center */}
                    <circle cx="350" cy="210" r="6" fill="#111" stroke="#0055ff" strokeWidth="2" />
                    <text x="362" y="214" fill="#666" className="text-[9px] font-mono font-bold uppercase">Transit_Gate_Alpha</text>

                    {/* Node 3: Sorting Terminal */}
                    <circle cx="500" cy="170" r="6" fill="#111" stroke="#0055ff" strokeWidth="2" />
                    <text x="512" y="174" fill="#666" className="text-[9px] font-mono font-bold uppercase">Sort_Facility</text>

                    {/* Node 4: Customer Destination Drop */}
                    <circle cx="680" cy="350" r="8" fill="#111" stroke="#22c55e" strokeWidth="2" />
                    <text x="694" y="354" fill="#22c55e" className="text-[9px] font-mono font-black uppercase">Drop_Coord_04</text>

                    {/* Active Shipment Path Highlighted in Blue */}
                    {activeIndex >= 1 && (
                      <path 
                        d={
                          activeIndex === 1 ? "M 150 150 L 250 180" :
                          activeIndex === 2 ? "M 150 150 L 350 210" :
                          activeIndex === 3 ? "M 150 150 L 350 210 L 500 170" :
                          "M 150 150 L 350 210 L 500 170 L 680 350"
                        }
                        fill="none" 
                        stroke="#0055ff" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                        className="opacity-90 shadow-lg"
                      />
                    )}

                    {/* Pulsating target point on active spot */}
                    <g transform={
                      activeIndex === 0 ? "translate(150, 150)" :
                      activeIndex === 1 ? "translate(250, 180)" :
                      activeIndex === 2 ? "translate(350, 210)" :
                      activeIndex === 3 ? "translate(500, 170)" :
                      "translate(680, 350)"
                    }>
                      <circle cx="0" cy="0" r="16" fill="rgba(0, 85, 255, 0.15)" className="animate-ping" style={{ animationDuration: '1.8s' }} />
                      <circle cx="0" cy="0" r="8" fill="rgba(0, 85, 255, 0.3)" />
                      <circle cx="0" cy="0" r="4.5" fill="#0055ff" />
                    </g>
                  </svg>

                  {/* UI HUD overlay absolute elements */}
                  <div className="absolute top-2 left-2 p-2 bg-black/80 border border-zinc-900/80 font-mono text-[8px] text-zinc-400 space-y-1">
                    <div>VECTOR_SCALE: 1:25,000</div>
                    <div>MAP_ID: DH_UT_9901</div>
                    <div>STATUS: ONLINE_SYNC</div>
                  </div>

                  <div className="absolute bottom-2 right-2 p-2 bg-black/80 border border-zinc-900/80 font-mono text-[8px] text-zinc-400">
                    <span className="text-zinc-600">SATELLITE_LINK:</span> <span className="text-emerald-400">100% ENCRYPTED_SSL</span>
                  </div>
                </div>

                {/* Footer instructions */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between border-t border-zinc-900 pt-3 gap-2">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-tight flex items-center gap-1.5">
                    <Info size={11} className="text-[#0055ff]" /> 
                    <span>Live GPS dispatch logs are locked & monitored for tamper-proof transit security.</span>
                  </div>
                  <div className="text-[9px] font-black uppercase text-[#0055ff] tracking-widest">
                    STREETTHREADX LOGISTICS CORP
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrackingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-white"
            >
              <button 
                onClick={() => setShowTrackingModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="flex items-center gap-2 mb-6">
                <Truck size={18} className="text-[#0055ff]" />
                <h3 className="text-sm font-black uppercase tracking-widest">Active Dispatch Log</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">Carrier Link</div>
                  <a href="#" className="text-[10px] font-bold text-[#0055ff] hover:underline flex items-center gap-1 uppercase tracking-wider">
                    Track via PATHFINDER <span className="text-[8px] bg-[#0055ff]/20 px-1 py-0.5 rounded-sm">↗</span>
                  </a>
                </div>

                <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">Precise ETA</div>
                  <div className="text-[11px] font-black text-emerald-400 font-mono tracking-widest bg-emerald-500/10 px-2 py-1 border border-emerald-500/20">
                    23:45:00 UTC
                  </div>
                </div>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[9px] before:-translate-x-px before:h-full before:w-0.5 before:bg-zinc-800">
                <div className="relative">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-[#0055ff] ring-4 ring-[#0055ff]/20"></div>
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">Package Scanned at Facility</div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Today, 14:32 PM - Sort_Facility</div>
                </div>
                <div className="relative">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-zinc-600 ring-4 ring-zinc-900"></div>
                  <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Departed Local Hub</div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Today, 10:15 AM - Transit_Gate_Alpha</div>
                </div>
                <div className="relative">
                  <div className="absolute left-[-24px] top-1 w-2 h-2 rounded-full bg-zinc-600 ring-4 ring-zinc-900"></div>
                  <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Origin Scan</div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Today, 08:00 AM - Node_HQ</div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowTrackingModal(false);
                  setShowMapModal(true);
                }}
                className="w-full mt-8 py-3 bg-[#0055ff]/10 text-[#0055ff] hover:bg-[#0055ff] hover:text-white border border-[#0055ff]/30 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Compass size={14} />
                Open Live Tracker
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
