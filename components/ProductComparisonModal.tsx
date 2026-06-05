import React from 'react';
import { Product } from '../types';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRemove: (product: Product) => void;
}

export const ProductComparisonModal: React.FC<Props> = ({ isOpen, onClose, products, onRemove }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
          className="relative w-full max-w-5xl bg-[#010816] border border-[#0044cc]/40 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-[#0044cc]/20 bg-gradient-to-r from-[#001433] to-[#010816]">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="text-[#0055ff] w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Compare_Products</h2>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 md:p-8 overflow-x-auto">
            <div className="min-w-[600px] grid grid-cols-4 gap-4 md:gap-8">
              {/* Feature Labels Column */}
              <div className="space-y-12 py-12 border-r border-[#0044cc]/10">
                <div className="h-64 invisible">Spacer</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Price</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Category</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Sizes</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Colors</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Stock_Status</div>
              </div>

              {/* Product Columns */}
              {products.map(product => (
                <div key={product.id} className="space-y-12 text-center relative group">
                  <button 
                    onClick={() => onRemove(product)}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X size={12} />
                  </button>

                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#001433] border border-[#0044cc]/30">
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-tight text-white line-clamp-2 min-h-[32px]">{product.name}</h3>
                  </div>

                  <div className="text-xl font-black text-[#3399ff]">৳{product.price.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">{product.category}</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {product.sizes.map(size => (
                      <span key={size} className="text-[8px] font-black px-1.5 py-0.5 border border-zinc-700 text-zinc-400 uppercase">{size}</span>
                    ))}
                  </div>
                  <div className="flex justify-center gap-2">
                    {product.colors.map(color => (
                        <div key={color} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                  <div className="flex justify-center">
                    {product.stock > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <Check size={12} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase tracking-widest">In_Stock</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <X size={12} strokeWidth={3} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Sold_Out</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: 3 - products.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-zinc-900/20">
                  <ArrowRightLeft className="w-8 h-8 text-zinc-700 mb-4" />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">Select_Product_to_Compare</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 border-t border-[#0044cc]/20 bg-[#001433]/30">
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest text-center">
              Comparing {products.length} of 3 maximum items
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
