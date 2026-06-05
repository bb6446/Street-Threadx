import React from 'react';
import { Check, Truck, Package, Clock, X, AlertCircle } from 'lucide-react';

interface Props {
  status: string;
  isDarkMode: boolean;
}

export const OrderTimeline: React.FC<Props> = ({ status, isDarkMode }) => {
  const normalizedStatus = status.toUpperCase();
  const isCancelled = normalizedStatus === 'CANCELLED';
  
  const timelineSteps = [
    { 
      id: 'PENDING', 
      label: 'Pending', 
      description: 'Order received', 
      icon: Clock 
    },
    { 
      id: 'PROCESSING', 
      label: 'Processing', 
      description: 'Preparing your items', 
      icon: Package 
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
      icon: Check 
    }
  ];

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    switch (normalizedStatus) {
      case 'PENDING': return 0;
      case 'CONFIRMED':
      case 'PROCESSING': return 1;
      case 'SHIPPED': return 2;
      case 'DELIVERED': return 3;
      default: return 0;
    }
  };

  const currentIndex = getCurrentStepIndex();

  if (isCancelled) {
    return (
      <div className={`mt-8 p-6 border ${isDarkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'} rounded-none space-y-4`}>
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
    <div className={`mt-8 py-8 px-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'} w-full`}>
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0055ff]">
          Order_Tracking_Timeline
        </h3>
        <div className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-[#0055ff]/10 text-[#0055ff] border border-[#0055ff]/20">
          Live Status: {normalizedStatus}
        </div>
      </div>

      <div className="relative">
        {/* Background Line */}
        <div className={`absolute top-[18px] left-0 w-full h-[2px] ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'} z-0`}></div>
        
        {/* Progress Line */}
        <div 
          className="absolute top-[18px] left-0 h-[2px] bg-[#0055ff] z-0 transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(0,85,255,0.4)]"
          style={{ width: `${(currentIndex / (timelineSteps.length - 1)) * 100}%` }}
        ></div>
        
        <div className="flex justify-between items-start relative z-10">
          {timelineSteps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center group w-24">
                {/* Step Circle */}
                <div 
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 scale-90 ${
                    isActive 
                      ? 'bg-[#0055ff] border-[#0055ff] text-white shadow-[0_0_15px_rgba(0,85,255,0.6)] scale-110' 
                      : isCompleted 
                        ? 'bg-[#0055ff] border-[#0055ff] text-white' 
                        : isDarkMode ? 'bg-black border-zinc-700 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={18} strokeWidth={4} />
                  ) : (
                    <StepIcon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </div>

                {/* Labels */}
                <div className="mt-4 text-center space-y-1">
                  <span className={`block text-[10px] font-black uppercase tracking-widest transition-colors ${
                    isActive ? 'text-white' : isCompleted ? 'text-[#0055ff]' : 'text-zinc-500'
                  }`}>
                    {step.label}
                  </span>
                  <span className={`block text-[8px] font-mono uppercase tracking-tight transition-opacity ${
                    isActive ? 'opacity-100 text-zinc-400' : 'opacity-40'
                  }`}>
                    {step.description}
                  </span>
                </div>

                {/* Tooltip on hover for more details */}
                {isActive && (
                  <div className="absolute -top-12 px-3 py-1.5 bg-black border border-zinc-800 text-white text-[9px] font-black uppercase tracking-tighter whitespace-nowrap animate-bounce shadow-xl">
                    Active Station
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

