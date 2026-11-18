import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from '@/locales';

export const SUPPORTED_LANGS = ['zh', 'en', 'fr', 'ru', 'es', 'ar'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = 'qianlu.lang';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** 检测顺序：本地存储（白名单校验）→ 浏览器语言前缀匹配 → 默认中文 */
export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* localStorage 不可用（隐私模式等）时静默降级 */
  }
  const preferred =
    typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const tag of preferred) {
    const prefix = tag.slice(0, 2).toLowerCase();
    if (isLang(prefix)) return prefix;
  }
  return 'zh';
}

function syncDocument(lng: string): void {
  document.documentElement.lang = lng === 'zh' ? 'zh-CN' : lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLang(),
  fallbackLng: ['en', 'zh'],
  ns: ['common', 'home', 'settings', 'detail'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  saveMissing: false,
  ...(import.meta.env.DEV
    ? {
        missingKeyHandler: (lngs: readonly string[], ns: string, key: string) =>
          console.warn(`[i18n] missing key ${ns}:${key} (${lngs.join(', ')})`),
      }
    : {}),
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* 存储不可用时仅保持会话内语言 */
  }
  syncDocument(lng);
});
syncDocument(i18n.language);

export default i18n;
