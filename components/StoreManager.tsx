
import React, { useState, useEffect } from 'react';
import { generateSEOContent, generateSupportReply, generateAnalyticsReport } from '../services/geminiService';
import { MOCK_PRODUCTS } from '../constants';

const StoreManager: React.FC = () => {
  const [seoResult, setSeoResult] = useState<any>(null);
  const [supportReply, setSupportReply] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);

  const lowStockItems = MOCK_PRODUCTS.filter(p => p.stock < 15);

  const handleSEO = async () => {
    setLoading('seo');
    const res = await generateSEOContent(MOCK_PRODUCTS[0].name, MOCK_PRODUCTS[0].description, MOCK_PRODUCTS[0].category);
    setSeoResult(res);
    setLoading(null);
  };

  const handleSupport = async () => {
    setLoading('support');
    const reply = await generateSupportReply("My order #4022 hasn't arrived yet, can I get an update?");
    setSupportReply(reply);
    setLoading(null);
  };

  const handleReport = async () => {
    setLoading('report');
    const r = await generateAnalyticsReport({ conversionRate: 3.2, aov: 8500, abandonedCarts: 12 });
    setReport(r);
    setLoading(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold heading-font uppercase">Store HQ</h1>
          <p className="text-zinc-400">AI-Powered Management Dashboard (BDT Context)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Live Sync</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 rounded-lg">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Inventory Alert</h3>
          <p className="text-2xl font-bold">{lowStockItems.length} <span className="text-sm font-normal text-zinc-400">Items Low</span></p>
          <div className="mt-4 space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="text-xs flex justify-between">
                <span className="text-zinc-300">{item.name}</span>
                <span className="text-red-500 font-bold">{item.stock} left</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 rounded-lg">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Conversion</h3>
          <p className="text-2xl font-bold">3.2%</p>
          <p className="text-xs text-green-500 mt-2">+0.4% from last week</p>
        </div>
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 rounded-lg">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">AOV</h3>
          <p className="text-2xl font-bold">৳8,540</p>
          <p className="text-xs text-zinc-500 mt-2">Average order value</p>
        </div>
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 rounded-lg">
          <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Abandoned</h3>
          <p className="text-2xl font-bold">12</p>
          <p className="text-xs text-red-500 mt-2">Recovery rate 22%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* AI Actions */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold heading-font uppercase">AI Intelligence</h2>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">SEO Optimizer</h3>
              <button 
                onClick={handleSEO}
                disabled={loading === 'seo'}
                className="bg-[#0055ff] text-xs font-bold px-3 py-1 uppercase tracking-tighter hover:brightness-110 disabled:opacity-50"
              >
                {loading === 'seo' ? 'Optimizing...' : 'Generate Meta'}
              </button>
            </div>
            {seoResult && (
              <div className="bg-black p-4 rounded text-xs space-y-2 border border-zinc-700">
                <p><span className="text-[#0055ff] font-bold">TITLE:</span> {seoResult.seoTitle}</p>
                <p><span className="text-[#0055ff] font-bold">DESC:</span> {seoResult.seoDescription}</p>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Customer Support</h3>
                <button 
                  onClick={handleSupport}
                  disabled={loading === 'support'}
                  className="bg-[#0055ff] text-xs font-bold px-3 py-1 uppercase tracking-tighter hover:brightness-110 disabled:opacity-50"
                >
                  {loading === 'support' ? 'Drafting...' : 'Draft Support Reply'}
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black opacity-40 italic">Sample Inquiry: "My order #4022 hasn't arrived yet, can I get an update?"</p>
                {supportReply && (
                  <textarea 
                    readOnly
                    value={supportReply}
                    className="w-full bg-black p-4 rounded text-xs border border-zinc-700 h-32 resize-none focus:outline-none text-zinc-300 leading-relaxed"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Analytics Insights */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold heading-font uppercase">Performance Report</h2>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold">Weekly Insight</h3>
              <button 
                onClick={handleReport}
                disabled={loading === 'report'}
                className="text-xs font-bold border border-zinc-700 px-3 py-1 uppercase hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading === 'report' ? 'Analyzing...' : 'Refresh Report'}
              </button>
            </div>
            {report ? (
              <div className="flex-1 text-sm leading-relaxed text-zinc-300">
                {report}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-sm">
                Click refresh to generate AI analysis of current store performance.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StoreManager;
