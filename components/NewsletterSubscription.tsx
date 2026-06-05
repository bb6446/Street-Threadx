import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { newsletterService } from '../services/newsletterService';

export const NewsletterSubscription: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    setMessage('');

    try {
      const response = await newsletterService.subscribeEmail(email);
      if (response.success) {
        setStatus('success');
        setMessage(response.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(response.message);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage('Failed to subscribe. Please try again later.');
    }
  };

  return (
    <div id="newsletter-subscription-container" className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 items-center justify-between pb-12 mb-12 border-b border-zinc-900">
        <div id="newsletter-subscription-info" className="w-full lg:w-1/2 space-y-2">
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#0055ff]">
            Insider Access
          </span>
          <h4 className="text-xl sm:text-2xl font-black heading-font italic uppercase text-white leading-tight">
            JOIN THE UNDERGROUND
          </h4>
          <p className="text-sm text-zinc-500 max-w-lg">
            Subscribe to our newsletters to claim early product drops, private keys, archive restocks, and exclusive street reports.
          </p>
        </div>

        <div id="newsletter-subscription-form-container" className="w-full lg:w-1/2">
          <form id="newsletter-subscription-form" onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-4 flex items-center pr-3 pointer-events-none text-zinc-500">
                  <Mail size={16} />
                </span>
                <input
                  id="newsletter-email-input"
                  type="email"
                  value={email}
                  disabled={status === 'submitting' || status === 'success'}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ENTER YOUR EMAIL"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-950 border border-zinc-800 focus:border-[#0055ff] text-white text-xs placeholder-zinc-600 focus:outline-none transition-colors duration-300 font-mono tracking-wider uppercase rounded-none"
                  required
                />
              </div>
              <button
                id="newsletter-subscribe-button"
                type="submit"
                disabled={status === 'submitting' || status === 'success'}
                className="bg-[#0055ff] hover:bg-[#0044dd] text-white border-0 py-4 px-8 font-black uppercase text-xs tracking-widest transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 rounded-none cursor-pointer self-stretch min-w-[140px]"
              >
                {status === 'submitting' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    SUBMIT <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {status === 'success' && (
                <motion.div
                  id="newsletter-status-success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 mt-3 p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs tracking-wide flex items-center gap-2 w-full rounded-none font-mono"
                >
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{message}</span>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  id="newsletter-status-error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 mt-3 p-3 bg-red-950/40 border border-red-800 text-red-400 text-xs tracking-wide flex items-center gap-2 w-full rounded-none font-mono"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  );
};
