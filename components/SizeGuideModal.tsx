import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler, Table, Image as ImageIcon } from 'lucide-react';
import { Product, SocialSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  socialSettings?: SocialSettings;
}

export const SizeGuideModal: React.FC<Props> = ({ isOpen, onClose, product, socialSettings }) => {
  // Determine if a custom size chart image (either product-specific or store fallback) is active
  const customChartImage = product?.sizeChartImage || socialSettings?.sizeChartImage;

  // Default to visual blueprint if available, otherwise fallback to the numerical matrix table
  const [activeTab, setActiveTab] = useState<'matrix' | 'visual'>('matrix');

  useEffect(() => {
    if (customChartImage) {
      setActiveTab('visual');
    } else {
      setActiveTab('matrix');
    }
  }, [customChartImage, isOpen]);

  // Dynamic measurement metrics based on Category
  const getMeasurementData = () => {
    const category = product?.category || 'Hoodies';
    switch (category) {
      case 'T-Shirts':
        return [
          { size: 'SMALL', chest: '54', length: '70' },
          { size: 'MEDIUM', chest: '58', length: '74' },
          { size: 'LARGE', chest: '62', length: '77' },
        ];
      case 'Sweaters':
        return [
          { size: 'SMALL', chest: '56', length: '67' },
          { size: 'MEDIUM', chest: '60', length: '71' },
          { size: 'LARGE', chest: '64', length: '74' },
        ];
      case 'Accessories':
        return [
          { size: 'O/S', chest: 'N/A', length: 'N/A' },
        ];
      case 'Hoodies':
      default:
        return [
          { size: 'SMALL', chest: '57', length: '68' },
          { size: 'MEDIUM', chest: '61', length: '72' },
          { size: 'LARGE', chest: '65', length: '75' },
        ];
    }
  };

  const rows = getMeasurementData();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            className="relative w-full max-w-lg bg-[#010816] border border-[#0044cc]/40 shadow-2xl overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#0044cc]/20 bg-gradient-to-r from-[#001433] to-[#010816]">
              <div className="flex items-center gap-3">
                <Ruler className="text-[#0055ff] w-4 h-4 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
                  {product ? `${product.name.replace(/\s+/g, '_')}_Matrix` : 'Sizing_Matrix'}
                </h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-900 duration-150">
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs (Only rendered if custom size chart image is available) */}
            {customChartImage && (
              <div className="flex border-b border-zinc-800 bg-[#000a1a]">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase tracking-wider transition-all border-r border-zinc-800/40 ${
                    activeTab === 'visual'
                      ? 'bg-[#001c44]/40 text-[#4da6ff] border-b-2 border-[#0055ff]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                  }`}
                >
                  <ImageIcon size={12} className={activeTab === 'visual' ? 'text-[#0055ff]' : ''} />
                  Visual_Blueprint
                </button>
                <button
                  onClick={() => setActiveTab('matrix')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'matrix'
                      ? 'bg-[#001c44]/40 text-[#4da6ff] border-b-2 border-[#0055ff]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                  }`}
                >
                  <Table size={12} className={activeTab === 'matrix' ? 'text-[#0055ff]' : ''} />
                  Numerical_Matrix
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {activeTab === 'visual' && customChartImage ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">
                      {product?.sizeChartImage ? 'SOURCE: PRODUCT_SPEC' : 'SOURCE: GLOBAL_IDENTITY'}
                    </h3>
                    <span className="text-[8px] font-black uppercase text-zinc-500">FORMAT: STX_VECTOR_DIAG</span>
                  </div>
                  <div className="border border-[#0044cc]/30 bg-zinc-950/40 p-2 overflow-hidden flex items-center justify-center aspect-[4/3] relative group">
                    <img
                      src={customChartImage}
                      alt="Product Size Chart"
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 border border-zinc-800 text-[8px] text-zinc-400 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      Hover to inspect specs
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Unit_Type: CENTIMETERS</h3>
                  <div className="overflow-hidden border border-zinc-800 bg-[#000612]/50">
                    <table className="w-full text-left text-[11px] font-black uppercase border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/80 text-zinc-500 border-b border-zinc-800 font-bold">
                          <th className="py-4 px-6">Size_Tag</th>
                          <th className="py-4 px-6">Chest (CM)</th>
                          <th className="py-4 px-6">Length (CM)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#0055ff]/8 border-b border-zinc-900 transition-colors">
                            <td className="py-4 px-6 text-[#0055ff]">{row.size}</td>
                            <td className="py-4 px-6 text-white">{row.chest}</td>
                            <td className="py-4 px-6 text-white">{row.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Protocol Section */}
              <div className="p-5 bg-zinc-900/20 border border-zinc-805 border-zinc-800/80 space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0055ff]">Fitting_Guide_Protocol</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-tighter">
                  Measurement tolerances are within +/- 1.5 cm. Items are designed with an oversized 'Streetwear-Core' silhouette. If you prefer a tighter fit, consider one size down from your standard selection.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#0044cc]/15 bg-[#001433]/30 text-center">
              <p className="text-[8px] font-mono text-zinc-650 text-zinc-600 uppercase tracking-widest">
                Sizing_Core_Release_v2.5.0-BLUEPRINT
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
