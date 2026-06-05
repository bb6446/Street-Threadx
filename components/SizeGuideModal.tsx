import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SizeGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#010816] border border-[#0044cc]/40 shadow-2xl overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#0044cc]/20 bg-gradient-to-r from-[#001433] to-[#010816]">
              <div className="flex items-center gap-3">
                <Ruler className="text-[#0055ff] w-5 h-5" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Measurement_Matrix</h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Unit_Type: CENTIMETERS</h3>
                <div className="overflow-hidden border border-zinc-800">
                  <table className="w-full text-left text-[11px] font-black uppercase border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-500 border-b border-zinc-800">
                        <th className="py-4 px-6">Size_Tag</th>
                        <th className="py-4 px-6">Chest (CM)</th>
                        <th className="py-4 px-6">Length (CM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      <tr className="hover:bg-[#0055ff]/5 transition-colors">
                        <td className="py-4 px-6 text-[#0055ff]">SMALL</td>
                        <td className="py-4 px-6 text-white">57</td>
                        <td className="py-4 px-6 text-white">68</td>
                      </tr>
                      <tr className="hover:bg-[#0055ff]/5 transition-colors">
                        <td className="py-4 px-6 text-[#0055ff]">MEDIUM</td>
                        <td className="py-4 px-6 text-white">61</td>
                        <td className="py-4 px-6 text-white">72</td>
                      </tr>
                      <tr className="hover:bg-[#0055ff]/5 transition-colors">
                        <td className="py-4 px-6 text-[#0055ff]">LARGE</td>
                        <td className="py-4 px-6 text-white">65</td>
                        <td className="py-4 px-6 text-white">75</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-zinc-900/30 border border-zinc-800 space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#0055ff]">Fitting_Guide_Protocol</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-tighter">
                  Measurement tolerances are within +/- 1.5 cm. Items are designed with an oversized 'Streetwear-Core' silhouette. If you prefer a tighter fit, consider one size down from your standard selection.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#0044cc]/20 bg-[#001433]/30 text-center">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                System_Revision_v2.1.0-STABLE
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
