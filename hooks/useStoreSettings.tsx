import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SocialSettings } from '../types';
import { settingsService } from '../services/settingsService';

const deepMerge = (target: any, source: any): any => {
  if (!source) return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
};

const normalizeSettings = (settings: any): any => {
  if (!settings) return settings;
  const result = { ...settings };
  if (result.appearance) {
    result.appearance = { ...result.appearance };
    if (result.appearance.middleColor === '#ffffff') {
      result.appearance.middleColor = '#000000';
    }
  }
  return result;
};

interface StoreSettingsContextType {
  socialSettings: SocialSettings;
  setSocialSettings: React.Dispatch<React.SetStateAction<SocialSettings>>;
  saveSettings: (settings: SocialSettings) => Promise<void>;
  isLoading: boolean;
  isLiveEditMode: boolean;
  setIsLiveEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLiveElement: 'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null;
  setSelectedLiveElement: React.Dispatch<React.SetStateAction<'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null>>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socialSettings, setSocialSettings] = useState<SocialSettings>({
    facebook: 'https://facebook.com/streetthreadx',
    instagram: 'https://instagram.com/streetthreadx',
    linkedin: 'https://linkedin.com/company/streetthreadx',
    x: 'https://x.com/streetthreadx',
    behance: 'https://behance.net/streetthreadx',
    visibility: {
      facebook: true,
      instagram: true,
      linkedin: true,
      x: true,
      behance: true
    },
    announcementBanner: {
      enabled: true,
      text: 'FREE SHIPPING ON ORDERS OVER ৳5000 | USE CODE "STREET50"'
    },
    merchantNumbers: {
      bKash: '01929667716',
      Nagad: '01929667716',
      Rocket: '01929667716',
      creditCard: '',
      debitCard: ''
    },
    sale: {
      enabled: false,
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'FLASH SALE'
    },
    appearance: {
      headerColor: '#000000',
      footerColor: '#000000',
      middleColor: '#000000',
      siteLogoUrl: '/logo.jpg',
      siteLogoHeight: 40,
      siteLogoWidth: 160,
      siteLogoFileSize: 1024
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLiveEditMode, setIsLiveEditMode] = useState(false);
  const [selectedLiveElement, setSelectedLiveElement] = useState<'banner' | 'heroTitle' | 'heroSubtitle' | 'heroImage' | 'aboutText' | null>(null);

  const isLiveEditModeRef = useRef(isLiveEditMode);
  useEffect(() => {
    isLiveEditModeRef.current = isLiveEditMode;
  }, [isLiveEditMode]);

  // Initial load
  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        const configRef = doc(db, 'config', 'app_settings');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && active) {
          setSocialSettings(prev => normalizeSettings(deepMerge(prev, configSnap.data())));
          setIsLoading(false);
          return;
        }

        const docRef = doc(db, 'settings', 'social');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && active) {
          setSocialSettings(prev => normalizeSettings(deepMerge(prev, docSnap.data())));
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  // Firebase subscription to auto-sync, matching the non-interference requirement during live editor sessions
  useEffect(() => {
    const unsubscribe = settingsService.subscribeToSettings((updatedSettings) => {
      if (!isLiveEditModeRef.current) {
        setSocialSettings(prev => normalizeSettings(deepMerge(prev, updatedSettings)));
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Save Settings atomically to Firebase and update local state
  const saveSettings = async (updatedSettings: SocialSettings) => {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    const cleanSettings = JSON.parse(JSON.stringify(updatedSettings));
    
    // Save to both collections to guarantee full syncing & safety fallback
    await setDoc(doc(db, 'config', 'app_settings'), cleanSettings, { merge: true });
    await setDoc(doc(db, 'settings', 'social'), cleanSettings, { merge: true });
    
    // Atomically trigger state updates
    setSocialSettings(cleanSettings);
  };

  return (
    <StoreSettingsContext.Provider value={{
      socialSettings,
      setSocialSettings,
      saveSettings,
      isLoading,
      isLiveEditMode,
      setIsLiveEditMode,
      selectedLiveElement,
      setSelectedLiveElement
    }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
