import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatMessage, ChatSession } from '../types';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (text: string) => void;
  session?: ChatSession;
  customerName: string;
  isTyping?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onToggle, onSendMessage, session, customerName, isTyping }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, isOpen, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] font-mono">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[400px] h-[600px] bg-black border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0055ff]/10 border border-[#0055ff]/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#0055ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0055ff]">Live_Relay_System</h3>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1 flex items-center gap-2">
                    <span className="w-1 h-1 bg-emerald-500 animate-pulse"></span>
                    CORE_AI Operational
                  </p>
                </div>
              </div>
              <button 
                onClick={onToggle}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {session?.messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}
                >
                  <div className={`max-w-[90%] p-3 text-[11px] leading-relaxed ${
                    msg.isAdmin 
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' 
                      : 'bg-[#0055ff] border border-[#0055ff] text-white font-bold'
                  }`}>
                    <div className="markdown-body prose prose-invert prose-xs max-w-none">
                      <Markdown
                        components={{
                          img: ({ node, ...props }) => (
                            <img 
                              {...props} 
                              className="w-full h-auto mt-2 border border-zinc-800 bg-black/50" 
                              referrerPolicy="no-referrer"
                            />
                          ),
                          p: ({ children }) => <span className="block mb-1 last:mb-0">{children}</span>
                        }}
                      >
                        {msg.text}
                      </Markdown>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 opacity-30 text-[8px] font-bold uppercase">
                    <span>{msg.isAdmin ? 'CORE_SEC' : customerName.toUpperCase() || 'USER'}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-col items-start translate-x-0">
                  <div className="bg-zinc-900 border border-zinc-800 p-3 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#0055ff] animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#0055ff] animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#0055ff] animate-bounce"></span>
                  </div>
                  <div className="mt-1 text-[8px] font-black uppercase opacity-30">CORE_AI IS PROCESSING...</div>
                </div>
              )}
              {!session?.messages.length && !isTyping && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                  <div className="w-12 h-12 border border-zinc-800 flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6 text-[#0055ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Direct Link...</p>
                  <p className="text-[8px] opacity-60 max-w-[200px] mt-1">UPLINK_STATUS: Standby. Send a signal to initialize neural support.</p>
                </div>
              )}
            </div>

            {/* Input */}
            <form 
              onSubmit={handleSubmit}
              className="p-4 border-t border-zinc-800 bg-zinc-900/30"
            >
              <div className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="SEND_SIGNAL..."
                  className="w-full bg-black border border-zinc-800 px-4 py-3 text-[10px] font-bold uppercase text-white placeholder:text-zinc-700 outline-none focus:border-[#0055ff] transition-all"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#0055ff] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`w-14 h-14 rounded-none flex items-center justify-center transition-all ${
          isOpen 
            ? 'bg-rose-500 text-black' 
            : 'bg-[#0055ff] text-black shadow-[0_0_30px_rgba(0,85,255,0.4)]'
        }`}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-[#0055ff] animate-pulse"></div>
          </div>
        )}
      </motion.button>
    </div>
  );
};
