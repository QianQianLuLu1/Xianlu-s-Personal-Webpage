import { useSyncExternalStore } from 'react';

import {
  CONFIG_CHANGE_EVENT,
  getConfig,
  initConfig,
  updateConfig,
  type AppConfig,
} from '@/lib/settings';

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONFIG_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONFIG_CHANGE_EVENT, onChange);
}

function getSnapshot(): AppConfig {
  return getConfig();
}

/**
 * 订阅全局运行时配置（window.__APP_CONFIG）。
 *
 * 配置的事实源在 src/lib/settings.ts，任何变更都会广播
 * qianlu.config:change 并替换总线对象，这里只负责把变更映射进 React。
 */
export function useAppConfig(): AppConfig {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 初始化总线（幂等），并返回稳定的更新函数 */
export function useConfigActions(): {
  update: typeof updateConfig;
  ensureInit: () => AppConfig;
} {
  return { update: updateConfig, ensureInit: initConfig };
}
