import React, { createContext, useContext, useState, useEffect } from 'react';
import uz from './uz.js';
import ru from './ru.js';
import en from './en.js';

const dictionaries = { uz, ru, en };

const TranslationContext = createContext({
  language: 'uz',
  setLanguage: () => {},
  lang: 'uz',
  setLang: () => {},
  t: () => '',
  dictionary: uz,
});

function resolveInitialLanguage(fallback = 'uz') {
  if (typeof window === 'undefined') return fallback;

  // 1. Highest priority: URL query or hash parameter (?lang=... or #...&lang=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    );
    const urlLang = urlParams.get('lang') || hashParams.get('lang');
    if (urlLang && ['uz', 'ru', 'en'].includes(urlLang)) {
      try {
        localStorage.setItem('easyfind_lang', urlLang);
      } catch (e) {}
      return urlLang;
    }
  } catch (e) {}

  // 2. Telegram WebApp user language
  try {
    const tg = window.Telegram?.WebApp;
    let tgLang = tg?.initDataUnsafe?.user?.language_code;
    if (!tgLang && tg?.initData) {
      const initParams = new URLSearchParams(tg.initData);
      const userRaw = initParams.get('user');
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (parsed?.language_code) tgLang = parsed.language_code;
      }
    }
    if (tgLang && typeof tgLang === 'string') {
      const code = tgLang.toLowerCase();
      if (code.startsWith('ru')) return 'ru';
      if (code.startsWith('en')) return 'en';
      if (code.startsWith('uz')) return 'uz';
    }
  } catch (e) {}

  // 3. Cached preference in localStorage
  try {
    const stored = localStorage.getItem('easyfind_lang');
    if (stored && ['uz', 'ru', 'en'].includes(stored)) {
      return stored;
    }
  } catch (e) {}

  return fallback;
}

export function TranslationProvider({ children, initialLanguage = 'uz' }) {
  const [language, setLanguageState] = useState(() => resolveInitialLanguage(initialLanguage));

  const setLanguage = (lang) => {
    if (!['uz', 'ru', 'en'].includes(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem('easyfind_lang', lang);
    } catch (e) {
      // Ignore storage error
    }
  };

  const t = (key = '', params = {}) => {
    const dict = dictionaries[language] || dictionaries.uz;
    const parts = key.split('.');

    let val = dict;
    for (const part of parts) {
      if (val && typeof val === 'object' && part in val) {
        val = val[part];
      } else {
        // Fallback to Uzbek
        let fbVal = dictionaries.uz;
        for (const fbPart of parts) {
          if (fbVal && typeof fbVal === 'object' && fbPart in fbVal) {
            fbVal = fbVal[fbPart];
          } else {
            return key;
          }
        }
        val = fbVal;
        break;
      }
    }

    if (typeof val !== 'string') {
      return key;
    }

    return val.replace(/\{(\w+)\}/g, (_, placeholder) => {
      return params[placeholder] !== undefined ? String(params[placeholder]) : `{${placeholder}}`;
    });
  };

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        lang: language,
        setLang: setLanguage,
        t,
        dictionary: dictionaries[language] || dictionaries.uz,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
