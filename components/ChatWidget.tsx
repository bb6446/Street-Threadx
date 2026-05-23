import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Facebook, Instagram, Twitter, HelpCircle, Package, Truck, Paperclip, X, Zap } from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (text: string, image?: string) => void;
  session?: ChatSession;
  customerName: string;
  isTyping?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onToggle, onSendMessage, session, customerName, isTyping }) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickReplies = [
    { id: 'track', text: 'Track Order', icon: <Truck className="w-4 h-4" /> },
    { id: 'stock', text: 'Check Availability', icon: <Package className="w-4 h-4" /> },
    { id: 'return', text: 'Quick Returns', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'promo', text: 'Active Offers', icon: <Zap className="w-4 h-4" /> },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, isOpen, isTyping, attachedImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !attachedImage) return;
    onSendMessage(inputValue, attachedImage || undefined);
    setInputValue('');
    setAttachedImage(null);
  };

  const handleQuickReply = (text: string) => {
    onSendMessage(text);
    // Smoothly scroll to bottom after an interaction
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        if (e.target) e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[360px] md:w-[400px] h-[600px] bg-[#1c1c1c] border border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden rounded-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md flex items-center justify-between relative group shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#0084ff] flex items-center justify-center text-white font-bold text-lg overflow-hidden group-hover:scale-105 transition-transform">
                    <span className="text-white drop-shadow-md font-black tracking-tighter">ST</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1c1c1c] shadow-sm"></div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">STREET THREADX Customer Service</h3>
                  <p className="text-[10px] text-emerald-500 font-medium opacity-90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready To Help
                  </p>
                </div>
              </div>
              <button 
                onClick={onToggle}
                className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-full transition-all active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 px-5 space-y-4 no-scrollbar bg-[#1c1c1c] relative group/messages"
              style={{
                backgroundImage: `radial-gradient(#ffffff08 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1c]/90 via-transparent to-[#111111]/90 pointer-events-none"></div>
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
              {/* Welcome Message */}
              <div className="flex flex-col items-start fade-in animate-in">
                <div className="max-w-[85%] px-4 py-2.5 text-[13px] leading-snug bg-[#3a3b3c] text-[#e4e6eb] rounded-[20px] rounded-tl-sm shadow-sm">
                  <p>Welcome to StreetThreadX Customer Service. I'm here to ensure you have the best experience with our elite streetwear collection. How can I assist you today?</p>
                </div>
                <div className="mt-1 ml-1 text-[10px] text-zinc-500 font-medium">Support Agent</div>
              </div>
              
              {session?.messages.map((msg, idx) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div className={`mt-2 mb-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider ${msg.isAdmin ? 'ml-1' : 'mr-1 text-right'}`}>
                    {msg.isAdmin ? 'Support Agent' : 'You'}
                  </div>
                  <div className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-snug shadow-sm ${
                    msg.isAdmin 
                      ? 'bg-[#3a3b3c] text-[#e4e6eb] rounded-[20px] rounded-tl-sm' 
                      : 'bg-[#0084ff] text-white rounded-[20px] rounded-tr-sm font-medium'
                  }`}>
                    {msg.image && (
                      <div className="mb-2">
                        <img src={msg.image} className="w-full h-auto rounded-lg border border-zinc-700/50" alt="Attached attachment" />
                      </div>
                    )}
                    {msg.text && (
                      <div className="markdown-body prose prose-invert prose-xs max-w-none">
                        <Markdown
                          components={{
                            img: ({ ...props }) => (
                              <img 
                                {...props} 
                                loading="lazy"
                                className="w-full h-auto mt-2 rounded-lg border border-zinc-700 shadow-sm" 
                                referrerPolicy="no-referrer"
                              />
                            ),
                            p: ({ children }) => <span className="block">{children}</span>
                          }}
                        >
                          {msg.text}
                        </Markdown>
                      </div>
                    )}
                  </div>
                  <div className={`mt-1 px-1 text-[9px] text-zinc-600 font-medium ${msg.isAdmin ? 'text-left' : 'text-right'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex flex-col items-start translate-x-0">
                  <div className="bg-[#3a3b3c] px-4 py-3 rounded-[20px] rounded-tl-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-4 bg-[#1c1c1c]">
              {/* Image Preview */}
              {attachedImage && (
                <div className="mb-3 relative inline-block p-1 bg-zinc-800 rounded-lg border border-zinc-700">
                  <img src={attachedImage} className="w-16 h-16 object-cover rounded-md" alt="Attachment" />
                  <button 
                    onClick={() => setAttachedImage(null)}
                    className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-0.5 text-white shadow-lg z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Quick Replies */}
              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar py-1">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply.text)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 text-[11px] font-bold rounded-full hover:bg-[#0084ff]/15 hover:border-[#0084ff]/40 hover:text-[#0084ff] hover:shadow-[0_0_10px_rgba(0,132,255,0.15)] transition-all whitespace-nowrap active:scale-95"
                  >
                    {reply.icon && <span className="opacity-80">{reply.icon}</span>}
                    {reply.text}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form 
                onSubmit={handleSubmit}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative flex items-center bg-[#3a3b3c] rounded-full px-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-zinc-400 hover:text-[#0084ff] transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Aa"
                    className="w-full bg-transparent border-none px-2 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition-all font-medium"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!inputValue.trim() && !attachedImage}
                  className={`p-2 transition-all ${
                    inputValue.trim() || attachedImage ? 'text-[#0084ff] hover:scale-110 active:scale-90' : 'text-zinc-600'
                  }`}
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isOpen 
            ? 'bg-[#3a3b3c] text-white' 
            : 'bg-[#0084ff] text-white'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.04c-5.5 0-10 4.07-10 9.07 0 2.85 1.48 5.39 3.82 7.02l-.24 2.82c-.05.58.5 1.03 1 .83l3.23-1.42c.73.2 1.49.32 2.29.32 5.5 0 10-4.07 10-9.07S17.5 2.04 12 2.04z" />
          </svg>
        )}
      </motion.button>
    </div>
  );
};
