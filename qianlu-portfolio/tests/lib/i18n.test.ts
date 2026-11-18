import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n, { SUPPORTED_LANGS, detectLang, isLang } from '@/lib/i18n';

const STORAGE_KEY = 'qianlu.lang';

function setNavigatorLanguages(tags: string[]): () => void {
  const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
  Object.defineProperty(window.navigator, 'languages', {
    value: tags,
    configurable: true,
  });
  return () => {
    delete (window.navigator as { languages?: string[] }).languages;
    if (original) Object.defineProperty(Navigator.prototype, 'languages', original);
  };
}

describe('isLang 白名单', () => {
  it('接受六种正式语文', () => {
    for (const lang of SUPPORTED_LANGS) expect(isLang(lang)).toBe(true);
  });

  it('拒绝非法值', () => {
    for (const bad of ['xx', 'zh-CN', '', null, undefined, 42]) expect(isLang(bad)).toBe(false);
  });
});

describe('detectLang 检测顺序', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.setItem(STORAGE_KEY, 'zh'));

  it('优先读取合法的本地存储值', () => {
    localStorage.setItem(STORAGE_KEY, 'fr');
    expect(detectLang()).toBe('fr');
  });

  it('非法存储值被拒绝并回退浏览器语言', () => {
    localStorage.setItem(STORAGE_KEY, 'klingon');
    const restore = setNavigatorLanguages(['es-MX', 'en']);
    expect(detectLang()).toBe('es');
    restore();
  });

  it('浏览器语言按前缀匹配（ru-RU → ru）', () => {
    const restore = setNavigatorLanguages(['de-DE', 'ru-RU']);
    expect(detectLang()).toBe('ru');
    restore();
  });

  it('无匹配时默认中文', () => {
    const restore = setNavigatorLanguages(['de-DE', 'ja-JP']);
    expect(detectLang()).toBe('zh');
    restore();
  });
});

describe('切换语言：持久化与文档方向', () => {
  afterEach(async () => {
    await i18n.changeLanguage('zh');
  });

  it('切换阿拉伯语写入存储并设置 RTL', async () => {
    await i18n.changeLanguage('ar');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('切回中文映射 zh-CN 且恢复 LTR', async () => {
    await i18n.changeLanguage('ar');
    await i18n.changeLanguage('zh');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('英文文案可用且缺失键回退不抛错', () => {
    expect(i18n.t('nav.home', { lng: 'en' })).toBe('Home');
    expect(i18n.t('nav.home', { lng: 'zh' })).toBe('首页');
    expect(i18n.t('no.such.key.exists')).toBe('no.such.key.exists');
  });
});
