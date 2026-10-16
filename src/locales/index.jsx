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

export function TranslationProvider({ children, initialLanguage = 'uz' }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('easyfind_lang');
      if (stored && ['uz', 'ru', 'en'].includes(stored)) {
        return stored;
      }
    } catch (e) {
      // localStorage unavailable
    }
    return initialLanguage;
  });

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
