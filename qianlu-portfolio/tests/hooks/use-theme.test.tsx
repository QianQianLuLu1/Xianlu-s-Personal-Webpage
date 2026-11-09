import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { syncThemeFromDocument, useTheme } from '@/hooks/use-theme';

const STORAGE_KEY = 'qianlu.theme';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  // 共享 store 以 <html> class 为唯一事实源，测试间复位等同一次全新页面加载
  syncThemeFromDocument();
});

describe('useTheme（两态，用户决定不做三态）', () => {
  it('默认浅色', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('以 documentElement 的 dark class 为初始事实源（防 FOUC 契约）', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    document.documentElement.classList.add('dark');
    // 真实页面里内联脚本先于本模块执行；这里按同一顺序复位共享 store
    syncThemeFromDocument();

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme 切换 class 并持久化', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('localStorage 不可用时仅维持内存态，不抛错', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      },
      configurable: true,
    });

    try {
      const { result } = renderHook(() => useTheme());
      act(() => result.current.toggleTheme());

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    } finally {
      Object.defineProperty(window, 'localStorage', {
        value: original,
        configurable: true,
      });
    }
  });

  it('多个组件实例共享同一状态（页头按钮与设置面板同步）', () => {
    const header = renderHook(() => useTheme());
    const panel = renderHook(() => useTheme());

    expect(header.result.current.theme).toBe(panel.result.current.theme);

    act(() => header.result.current.toggleTheme());
    expect(panel.result.current.theme).toBe('dark');

    act(() => panel.result.current.setTheme('light'));
    expect(header.result.current.theme).toBe('light');
  });
});
