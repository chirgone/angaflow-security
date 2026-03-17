import es from './es.json';
import en from './en.json';

const translations = { es, en } as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof es;

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang as Locale;
  return 'es';
}

export function useTranslations(lang: Locale) {
  return translations[lang];
}

export function getLocalePath(lang: Locale, path: string = '') {
  return `/${lang}${path}`;
}

export const languages = {
  es: 'Espa\u00f1ol',
  en: 'English',
};

export const defaultLang: Locale = 'es';
