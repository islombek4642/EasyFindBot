import uz from './uz.js';
import ru from './ru.js';
import en from './en.js';

const dictionaries = { uz, ru, en };

export function t(lang = 'uz', key = '', params = {}) {
  const selectedLang = dictionaries[lang] ? lang : 'uz';
  const dict = dictionaries[selectedLang];

  const parts = key.split('.');
  let val = dict;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = val[part];
    } else {
      // Fallback to Uzbek if missing in selected language
      let fallbackVal = dictionaries.uz;
      for (const fbPart of parts) {
        if (fallbackVal && typeof fallbackVal === 'object' && fbPart in fallbackVal) {
          fallbackVal = fallbackVal[fbPart];
        } else {
          return key;
        }
      }
      val = fallbackVal;
      break;
    }
  }

  if (typeof val !== 'string') {
    return key;
  }

  // Replace {placeholder} parameters
  return val.replace(/\{(\w+)\}/g, (_, placeholder) => {
    return params[placeholder] !== undefined ? String(params[placeholder]) : `{${placeholder}}`;
  });
}

export function getDictionary(lang = 'uz') {
  return dictionaries[lang] || dictionaries.uz;
}
