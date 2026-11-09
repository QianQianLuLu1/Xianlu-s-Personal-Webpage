import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'qianlu.theme';

const listeners = new Set<() => void>();

let currentTheme: Theme = 'light';

function readDocumentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(next: Theme) {
  currentTheme = next;

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage 不可用（隐私模式等）时仅维持内存态，不阻塞交互
  }

  listeners.forEach((notify) => notify());
}

/** 以 <html> 的 dark class 为准复位共享状态（应用启动与测试复位用） */
export function syncThemeFromDocument() {
  currentTheme = readDocumentTheme();
}

// 模块加载即对齐 index.html 防 FOUC 内联脚本写入的初始 class
syncThemeFromDocument();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 全站共享的主题状态。
 *
 * 主题是全局单例：页头主题按钮与设置面板的单选必须看到同一份状态，
 * 因此用模块级 store + useSyncExternalStore，而不是各组件私有 useState——
 * 私有副本会让面板显示与实际主题不同步。
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => currentTheme
  );

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, setTheme, toggleTheme };
}
