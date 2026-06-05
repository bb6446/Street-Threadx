import React from 'react';
import { SocialSettings } from '../types';
import { useStoreSettings } from '../hooks/useStoreSettings';

interface Props {
  socialSettings?: SocialSettings;
  setSocialSettings?: React.Dispatch<React.SetStateAction<SocialSettings>>;
  onClose?: () => void;
  onSave?: () => void;
  selectedLiveElement?: 'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null;
  setSelectedLiveElement?: React.Dispatch<React.SetStateAction<'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null>>;
}

export const LiveEditorPanel: React.FC<Props> = ({ 
  onClose: customOnClose, 
  onSave: customOnSave,
}) => {
  const {
    socialSettings,
    setSocialSettings,
    selectedLiveElement,
    setSelectedLiveElement,
    setIsLiveEditMode,
    saveSettings
  } = useStoreSettings();

  const onClose = () => {
    if (customOnClose) {
      customOnClose();
    } else {
      setIsLiveEditMode(false);
      setSelectedLiveElement(null);
    }
  };

  const onSave = async () => {
    if (customOnSave) {
      customOnSave();
    } else {
      try {
        await saveSettings(socialSettings);
        setIsLiveEditMode(false);
        setSelectedLiveElement(null);
        alert("Site changes published successfully!");
      } catch (e: any) {
        alert("Error saving: " + (e.message || String(e)));
      }
    }
  };
  // Helpers to update settings state in real-time
  const updateSiteContent = (key: string, value: any) => {
    setSocialSettings(prev => ({
      ...prev,
      siteContent: {
        ...(prev.siteContent || {}),
        [key]: value
      }
    }));
  };

  const updateBanner = (key: string, value: any) => {
    setSocialSettings(prev => ({
      ...prev,
      announcementBanner: {
        ...(prev.announcementBanner || { enabled: false, text: '' }),
        [key]: value
      }
    }));
  };

  return (
    <div className="fixed top-24 right-6 w-96 bg-zinc-950 border-2 border-zinc-800 text-white z-[200] shadow-[24px_24px_0px_0px_rgba(0,0,0,0.95)] p-6 flex flex-col max-h-[80vh] overflow-y-auto font-mono text-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0055ff]">Elementor Core v2</span>
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mt-0.5">
            <span className="inline-block w-2.5 h-2.5 bg-[#0055ff] animate-ping rounded-none"></span>
            Live Site Editor
          </h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-zinc-500 hover:text-white hover:scale-125 transition-all text-lg font-bold"
          title="Exit Live Edit Mode"
        >
          &times;
        </button>
      </div>

      {/* Selector Grid of Blocks */}
      <div className="mb-6">
        <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
          Select Page Block
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'banner', label: 'Announcement' },
            { id: 'heroTitle', label: 'Hero Title' },
            { id: 'heroSubtitle', label: 'Hero Subtitle' },
            { id: 'heroImage', label: 'Hero Backdrop' },
            { id: 'aboutText', label: 'About Block' }
          ] as const).map(block => (
            <button
              key={block.id}
              onClick={() => setSelectedLiveElement(block.id)}
              className={`p-3 text-left border uppercase font-black text-[9px] tracking-wider transition-all duration-200 ${
                selectedLiveElement === block.id 
                  ? 'border-[#0055ff] bg-[#0055ff]/10 text-white shadow-[0_0_10px_rgba(0,85,255,0.4)]' 
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-white'
              }`}
            >
              {block.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 bg-[#050505] border border-zinc-900 p-4 space-y-6">
        {selectedLiveElement === null ? (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto border border-zinc-800 flex items-center justify-center text-[#0055ff]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#0055ff]">Interactive State Ready</p>
            <p className="text-[10px] leading-relaxed text-zinc-500">
              Click any element directly on the storefront page, or select a block from the list above to tweak details in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header showing currently edited element */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#0055ff]">
                Editing: {selectedLiveElement}
              </span>
              <button 
                onClick={() => setSelectedLiveElement(null)} 
                className="text-[9px] uppercase tracking-wider text-zinc-500 hover:text-white bg-zinc-900/40 px-2 py-1"
              >
                Clear Selector
              </button>
            </div>

            {/* ELEMENT 1: ANNOUNCEMENT BANNER */}
            {selectedLiveElement === 'banner' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Enable Banner</label>
                  <input 
                    type="checkbox" 
                    checked={socialSettings.announcementBanner?.enabled || false}
                    onChange={e => updateBanner('enabled', e.target.checked)}
                    className="w-4 h-4 accent-[#0055ff] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Banner Text</label>
                  <input 
                    type="text" 
                    value={socialSettings.announcementBanner?.text || ''} 
                    onChange={e => updateBanner('text', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs focus:border-[#0055ff] outline-none text-white lowercase tracking-tight"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Background Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={socialSettings.siteContent?.announcementBgColor || '#0055ff'} 
                      onChange={e => updateSiteContent('announcementBgColor', e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-none outline-none"
                    />
                    <input 
                      type="text" 
                      value={socialSettings.siteContent?.announcementBgColor || '#0055ff'} 
                      onChange={e => updateSiteContent('announcementBgColor', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white code-font focus:border-[#0055ff]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Text Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={socialSettings.siteContent?.announcementColor || '#ffffff'} 
                      onChange={e => updateSiteContent('announcementColor', e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-none outline-none"
                    />
                    <input 
                      type="text" 
                      value={socialSettings.siteContent?.announcementColor || '#ffffff'} 
                      onChange={e => updateSiteContent('announcementColor', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white code-font focus:border-[#0055ff]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ELEMENT 2: HERO TITLE */}
            {selectedLiveElement === 'heroTitle' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Title Text</label>
                  <textarea 
                    value={socialSettings.siteContent?.heroTitle !== undefined ? socialSettings.siteContent.heroTitle : "Urban \nElysium"} 
                    onChange={e => updateSiteContent('heroTitle', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs h-24 focus:border-[#0055ff] outline-none text-white font-mono"
                    placeholder="Urban \nElysium"
                  />
                  <p className="text-[8px] text-zinc-500 mt-1 uppercase">Tip: Use Shift+Enter to introduce breaks.</p>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Size Option</label>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      { id: 'default', label: 'Heavy' },
                      { id: 'mega', label: '8xl' },
                      { id: 'large', label: '6xl' },
                      { id: 'medium', label: '4xl' }
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSiteContent('heroTitleSize', opt.id)}
                        className={`py-2 px-1 text-center font-black text-[9px] tracking-tight uppercase border transition-all ${
                          (socialSettings.siteContent?.heroTitleSize || 'default') === opt.id 
                            ? 'border-[#0055ff] bg-[#0055ff]/10 text-white' 
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Title Text Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={socialSettings.siteContent?.heroTitleColor || '#ffffff'} 
                      onChange={e => updateSiteContent('heroTitleColor', e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-none outline-none"
                    />
                    <input 
                      type="text" 
                      value={socialSettings.siteContent?.heroTitleColor || '#ffffff'} 
                      onChange={e => updateSiteContent('heroTitleColor', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white code-font focus:border-[#0055ff]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ELEMENT 3: HERO SUBTITLE */}
            {selectedLiveElement === 'heroSubtitle' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Subtitle Text</label>
                  <textarea 
                    value={socialSettings.siteContent?.heroSubtitle || ''} 
                    onChange={e => updateSiteContent('heroSubtitle', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs focus:border-[#0055ff] outline-none text-white h-28"
                    placeholder="Engineered for the modern urban environment."
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Text Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={socialSettings.siteContent?.heroSubtitleColor || '#a1a1aa'} 
                      onChange={e => updateSiteContent('heroSubtitleColor', e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-none"
                    />
                    <input 
                      type="text" 
                      value={socialSettings.siteContent?.heroSubtitleColor || '#a1a1aa'} 
                      onChange={e => updateSiteContent('heroSubtitleColor', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white code-font focus:border-[#0055ff]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ELEMENT 4: HERO BACKDROP IMAGE */}
            {selectedLiveElement === 'heroImage' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Backdrop Image URL</label>
                  <input 
                    type="text" 
                    value={(socialSettings.heroImages && socialSettings.heroImages.length > 0) ? socialSettings.heroImages[0] : ''} 
                    onChange={e => {
                      const url = e.target.value;
                      setSocialSettings(prev => ({
                        ...prev,
                        heroImages: url ? [url] : []
                      }));
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs focus:border-[#0055ff] outline-none text-white h-11 text-[10px]"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                {socialSettings.heroImages && socialSettings.heroImages.length > 0 && (
                  <div className="border border-zinc-800 bg-[#0a0a0a] p-2 flex items-center justify-center">
                    <img src={socialSettings.heroImages[0]} alt="Hero Live Preview" className="max-h-24 max-w-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* ELEMENT 5: ABOUT CONTENT BLOCK */}
            {selectedLiveElement === 'aboutText' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">About Text</label>
                  <textarea 
                    value={socialSettings.siteContent?.aboutText || ''} 
                    onChange={e => updateSiteContent('aboutText', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs focus:border-[#0055ff] outline-none text-white h-32"
                    placeholder="About the brand..."
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">About Text Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={socialSettings.siteContent?.aboutTextColor || '#71717a'} 
                      onChange={e => updateSiteContent('aboutTextColor', e.target.value)}
                      className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-none"
                    />
                    <input 
                      type="text" 
                      value={socialSettings.siteContent?.aboutTextColor || '#71717a'} 
                      onChange={e => updateSiteContent('aboutTextColor', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white code-font focus:border-[#0055ff]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="mt-6 pt-4 border-t border-zinc-900 space-y-3 shrink-0">
        <button 
          onClick={onSave} 
          className="bg-[#0055ff] text-white py-4 text-[10px] uppercase font-black tracking-widest hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_#0055ff] transition-all border-2 border-transparent hover:border-[#0055ff] w-full block text-center"
        >
          Publish Changes
        </button>
        <button 
          onClick={onClose} 
          className="bg-transparent border-2 border-zinc-800 hover:border-white text-zinc-400 hover:text-white py-3 text-[10px] uppercase font-black tracking-widest transition-all w-full block text-center"
        >
          Close Live Editor
        </button>
      </div>
    </div>
  );
};
