/**
 * Vitest 4 在 Node 侧运行 jsdom：Node 的 localStorage 需 --localstorage-file
 * 才可用，缺省时 window.localStorage 为 undefined。浏览器里它始终存在，
 * 这里只在缺失时补一个内存实现，保证测试与浏览器行为一致。
 */

import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();

  const polyfill = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(String(key), String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: polyfill,
    configurable: true,
    writable: true,
  });
}

/**
 * jsdom 未实现 IntersectionObserver。这里补一个“observe 即命中”的最小桩，
 * 让依赖视口触发的组件（如 AnimatedNumber 的 useInViewOnce）在测试中走
 * “进入视口”分支；浏览器里原生实现存在，桩不会生效。
 */
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    private readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element) {
      this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this);
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    value: IntersectionObserverStub,
    configurable: true,
    writable: true,
  });
}
