import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { Language, Translation, translations as fallbackTranslations } from '../utils/translations';
import socketService from '../utils/socketService';
import { toast } from 'react-toastify';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translation, englishValue?: string) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('dineInGoLanguage');
    console.log('[LanguageContext] Initializing with saved language:', saved);
    return (saved as Language) || 'english';
  });
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const pendingRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchTranslations = async () => {
      if (language === 'english') {
        setDynamicTranslations({});
        return;
      }

      setLoading(true);
      setDynamicTranslations({}); // Clear old translations immediately
      pendingRequests.current.clear();

      try {
        console.log(`[LanguageContext] Fetching translations for ${language}...`);
        const response = await axios.get<Record<string, string>>(`${API_CONFIG.BASE_URL}/api/v1/translations/${language}`);
        console.log(`[LanguageContext] Received ${Object.keys(response.data || {}).length} translations for ${language}`);
        setDynamicTranslations(response.data || {});
      } catch (error) {
        console.error('[LanguageContext] Failed to fetch translations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
    localStorage.setItem('dineInGoLanguage', language);
  }, [language]);

  // Listen for real-time translation updates via Socket.IO
  useEffect(() => {
    const socket = socketService.connect();
    
    const handleTranslationUpdate = (data: { key: string; language: string; value: string }) => {
      if (data.language === language) {
        setDynamicTranslations(prev => ({
          ...prev,
          [data.key]: data.value
        }));
        pendingRequests.current.delete(data.key);
      }
    };

    socket?.on('translation_updated', handleTranslationUpdate);

    return () => {
      socket?.off('translation_updated', handleTranslationUpdate);
    };
  }, [language]);

  const setLanguage = (lang: Language) => {
    console.log('[LanguageContext] Changing language to:', lang);
    setLanguageState(lang);
    toast.info(`Changing language to ${lang.charAt(0).toUpperCase() + lang.slice(1)}...`, {
      toastId: 'lang-switch'
    });
  };



  const translateOnTheFly = async (key: string, targetLang: string, englishValue: string) => {
    if (pendingRequests.current.has(key)) return;
    pendingRequests.current.add(key);

    try {
      const response = await axios.post<{ value: string }>(`${API_CONFIG.BASE_URL}/api/v1/translations/translate`, {
        key,
        language: targetLang,
        englishValue
      });

      if (response.data?.value) {
        setDynamicTranslations(prev => ({
          ...prev,
          [key]: response.data.value
        }));
      }
    } catch (error) {
      console.error(`[LanguageContext] On-the-fly translation failed for "${key}":`, error);
      pendingRequests.current.delete(key);
    }
  };

  const t = (key: keyof Translation, englishValue?: string): string => {
    if (dynamicTranslations[key]) {
      return dynamicTranslations[key];
    }

    const localLangSet = fallbackTranslations[language] as any;
    if (localLangSet && localLangSet[key]) {
      return localLangSet[key];
    }

    const englishSet = fallbackTranslations['english'] as any;
    const fallbackValue = englishSet[key] || englishValue || key;

    if (language !== 'english' && !loading) {
      translateOnTheFly(key, language, fallbackValue);
    }

    return fallbackValue;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
