import React from 'react';
import { X, Clipboard, Shield, Box, Truck, PackageCheck, Check } from 'lucide-react';

interface Props {
  status: string;
  isDarkMode: boolean;
}

export const OrderTimeline: React.FC<Props> = ({ status, isDarkMode }) => {
  const normalizedStatus = status.toUpperCase();
  const isCancelled = normalizedStatus === 'CANCELLED';
  
  const timelineSteps = [
    { 
      id: 'ORDERED', 
      label: 'Ordered', 
      description: 'Order received', 
      icon: Clipboard 
    },
    { 
      id: 'VERIFIED', 
      label: 'Verified', 
      description: 'Payment confirmed', 
      icon: Shield 
    },
    { 
      id: 'PACKAGED', 
      label: 'Packaged', 
      description: 'Preparing your items', 
      icon: Box 
    },
    { 
      id: 'SHIPPED', 
      label: 'Shipped', 
      description: 'In transit to you', 
      icon: Truck 
    },
    { 
      id: 'DELIVERED', 
      label: 'Delivered', 
      description: 'Handed over', 
      icon: PackageCheck 
    }
  ];

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    switch (normalizedStatus) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 1;
      case 'PROCESSING': return 2;
      case 'SHIPPED': return 3;
      case 'DELIVERED': return 4;
      default: return 0;
    }
  };

  const currentIndex = getCurrentStepIndex();

  if (isCancelled) {
    return (
      <div className={`mt-8 p-6 border order-status-card ${isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'} rounded-none space-y-4 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <X size={20} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-500">Order_Terminated</h3>
            <p className="text-[10px] text-rose-500/60 font-mono uppercase">This transaction has been voided.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 py-6 px-3 sm:py-8 sm:px-6 border order-status-card ${isDarkMode ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 bg-white'} w-full relative overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl shadow-sm`}>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0055ff]">
          Order_Tracking_Timeline
        </h3>
        <div className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#0055ff]/10 text-[#0055ff] border border-[#0055ff]/20 inline-block text-center self-start sm:self-auto">
          Live Status: {normalizedStatus === 'PENDING' ? 'ORDERED' : normalizedStatus === 'CONFIRMED' ? 'VERIFIED' : normalizedStatus === 'PROCESSING' ? 'PACKAGED' : normalizedStatus}
        </div>
      </div>

      <div className="relative pl-4 sm:pl-6">
        {/* Vertical Background Line */}
        <div className={`absolute top-4 bottom-4 left-[32px] sm:left-[44px] w-[2px] ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} z-0 -translate-x-1/2`}></div>
        
        {/* Vertical Progress Line */}
        <div 
          className="absolute top-4 left-[32px] sm:left-[44px] w-[2px] bg-[#0055ff] z-0 transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(0,85,255,0.4)] -translate-x-1/2"
          style={{ height: `${(currentIndex / (timelineSteps.length - 1)) * 100}%` }}
        ></div>
        
        <div className="flex flex-col relative z-10 space-y-5 sm:space-y-8">
          {timelineSteps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const isInactive = !isActive && !isCompleted;
            const StepIcon = step.icon;

            return (
              <div 
                key={step.id} 
                className={`flex flex-row items-center group transition-opacity duration-300 ${
                  isActive ? 'stage-active opacity-100' : 'stage-inactive opacity-60 hover:opacity-80'
                }`}
              >
                {/* Step Circle */}
                <div 
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-500 ${
                    isActive 
                      ? 'bg-[#0055ff] border-[#0055ff] text-white shadow-[0_0_15px_rgba(0,85,255,0.6)] scale-110 z-10 active-step' 
                      : isCompleted 
                        ? 'bg-[#0055ff] border-[#0055ff] text-white z-10 completed-step' 
                        : isDarkMode ? 'bg-[#18181b] border-zinc-700 text-zinc-600 inactive-step' : 'bg-white border-zinc-200 text-zinc-300 inactive-step'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={4} />
                  ) : (
                    <StepIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </div>

                {/* Labels */}
                <div className="ml-4 sm:ml-6 flex flex-col text-left">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`block text-[10px] sm:text-[12px] font-black uppercase tracking-widest transition-colors ${
                      isActive ? (isDarkMode ? 'text-white' : 'text-black') : isCompleted ? 'text-[#0055ff]' : 'text-zinc-500'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="text-[7px] sm:text-[8px] font-black bg-[#0055ff] text-white px-1.5 py-0.5 sm:px-2 uppercase tracking-wider animate-pulse active-badge">
                        Active
                      </span>
                    )}
                  </div>
                  <span className={`block text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 font-mono uppercase tracking-tight transition-opacity ${
                    isActive ? (isDarkMode ? 'text-zinc-400' : 'text-zinc-600') : 'text-zinc-500'
                  }`}>
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


