import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyPalette } from '@/lib/palette';
import {
  CONFIG_CHANGE_EVENT,
  STORAGE_KEYS,
  initConfig,
  resolveResolution,
  sanitizeFps,
  sanitizeMode,
  sanitizePalette,
  sanitizeResolution,
  screenPhysicalPixels,
  updateConfig,
} from '@/lib/settings';

beforeEach(() => {
  window.localStorage.clear();
  delete (window as { __APP_CONFIG?: unknown }).__APP_CONFIG;
});

describe('白名单校验（§2.6 参数校验）', () => {
  it('非法模式回退默认 auto', () => {
    expect(sanitizeMode('full')).toBe('full');
    expect(sanitizeMode('weird')).toBe('auto');
    expect(sanitizeMode(undefined)).toBe('auto');
  });

  it('非法分辨率回退默认 auto', () => {
    expect(sanitizeResolution('2k')).toBe('2k');
    expect(sanitizeResolution('8k')).toBe('auto');
    expect(sanitizeResolution(null)).toBe('auto');
  });

  it('非法帧率回退默认 144', () => {
    expect(sanitizeFps(60)).toBe(60);
    expect(sanitizeFps(90)).toBe(144);
    expect(sanitizeFps('60')).toBe(144);
  });

  it('非法配色性格回退默认 air', () => {
    expect(sanitizePalette('vivid')).toBe('vivid');
    expect(sanitizePalette('spectrum')).toBe('spectrum');
    expect(sanitizePalette('deep')).toBe('deep');
    expect(sanitizePalette('neon')).toBe('air');
    expect(sanitizePalette(undefined)).toBe('air');
  });
});

describe('分辨率档位解析（§2.3）', () => {
  it('auto 按屏幕物理像素 600 万为界', () => {
    expect(resolveResolution('auto', 6_000_000)).toBe('4k');
    expect(resolveResolution('auto', 5_999_999)).toBe('2k');
    expect(resolveResolution('auto', 0)).toBe('2k');
  });

  it('显式指定优先于检测', () => {
    expect(resolveResolution('2k', 8_000_000)).toBe('2k');
    expect(resolveResolution('4k', 0)).toBe('4k');
  });

  it('screenPhysicalPixels 返回非负数', () => {
    expect(screenPhysicalPixels()).toBeGreaterThanOrEqual(0);
  });
});

describe('applyPalette', () => {
  it('幂等切换 palette-* 类，且不影响 dark 等其他根类', () => {
    document.documentElement.className = 'dark';
    applyPalette('vivid');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('palette-vivid')).toBe(true);

    applyPalette('spectrum');
    expect(document.documentElement.classList.contains('palette-vivid')).toBe(false);
    expect(document.documentElement.classList.contains('palette-spectrum')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('initConfig', () => {
  it('无存储时全部默认，默认完整动效', () => {
    const config = initConfig();
    expect(config.mode).toBe('auto');
    expect(config.effectiveMode).toBe('full');
    expect(config.fps).toBe(144);
    expect(config.palette).toBe('air');
    expect(config.glassTier).toBe('strong');
    expect(config.parallaxLayers).toBe(5);
    expect(config.rollingFps).toBeNull();
  });

  it('存储值非法时回退默认', () => {
    window.localStorage.setItem(STORAGE_KEYS.mode, 'hacked');
    window.localStorage.setItem(STORAGE_KEYS.fps, '99999');
    const config = initConfig();
    expect(config.mode).toBe('auto');
    expect(config.fps).toBe(144);
  });

  it('持久化的 compat 直接以兼容模式生效', () => {
    window.localStorage.setItem(STORAGE_KEYS.mode, 'compat');
    const config = initConfig();
    expect(config.effectiveMode).toBe('compat');
    expect(config.glassTier).toBe('plain');
    expect(config.parallaxLayers).toBe(3);
  });

  it('缓存数值字符串可正常解析', () => {
    window.localStorage.setItem(STORAGE_KEYS.fps, '60');
    expect(initConfig().fps).toBe(60);
  });
});

describe('updateConfig（状态总线 §4.6）', () => {
  it('更新持久化键并写回 localStorage', () => {
    initConfig();
    updateConfig({ mode: 'compat', fps: 60, resolution: '2k', palette: 'deep' });
    expect(window.localStorage.getItem(STORAGE_KEYS.mode)).toBe('compat');
    expect(window.localStorage.getItem(STORAGE_KEYS.fps)).toBe('60');
    expect(window.localStorage.getItem(STORAGE_KEYS.resolution)).toBe('2k');
    expect(window.localStorage.getItem(STORAGE_KEYS.palette)).toBe('deep');
  });

  it('手动 full/compat 立即改变生效档位', () => {
    initConfig();
    updateConfig({ mode: 'compat' });
    expect(updateConfig({ mode: 'full' }).effectiveMode).toBe('full');
    expect(updateConfig({ mode: 'compat' }).effectiveMode).toBe('compat');
  });

  it('auto 不直接改变生效档位（交由调度器）', () => {
    initConfig();
    updateConfig({ mode: 'compat' });
    const config = updateConfig({ mode: 'auto' });
    expect(config.mode).toBe('auto');
    expect(config.effectiveMode).toBe('compat');
  });

  it('切档后派生令牌同步更新', () => {
    initConfig();
    const config = updateConfig({ mode: 'compat' });
    expect(config.glassTier).toBe('plain');
    expect(config.parallaxLayers).toBe(3);
  });

  it('每次变更广播 qianlu.config:change，detail 带变更键', () => {
    initConfig();
    const listener = vi.fn();
    window.addEventListener(CONFIG_CHANGE_EVENT, listener);

    updateConfig({ rollingFps: 55 });
    window.removeEventListener(CONFIG_CHANGE_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    const detail = listener.mock.calls[0][0].detail as { keys: string[] };
    expect(detail.keys).toContain('rollingFps');
  });
});

describe('存储降级到内存兜底（§2.6 localStorage 不可用）', () => {
  it('getItem/setItem 抛错时回退 memoryStore，会话内可读回，且 isDegradedToMemory 为 true', async () => {
    // settings.ts 的 storageBroken / memoryStore 是模块级且不可逆的状态：
    // 用 resetModules + 动态 import 取一份全新实例，既能观察 false→true 的降级跃迁，
    // 又不会把降级态泄漏给上面的 happy-path / 白名单用例。
    vi.resetModules();
    const { initConfig, updateConfig, isDegradedToMemory } = await import('@/lib/settings');

    // 全新实例尚未降级
    expect(isDegradedToMemory()).toBe(false);

    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('SecurityError: localStorage 不可用');
        },
        setItem: () => {
          throw new Error('QuotaExceededError: localStorage 不可用');
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      },
      configurable: true,
    });

    try {
      // setItem 抛错 → writeStored 回退 memoryStore；getItem 抛错 → safeGet 置降级位。
      updateConfig({ mode: 'compat', fps: 60 });

      // 完整链路：storage 抛错 → isDegradedToMemory()=true。
      expect(isDegradedToMemory()).toBe(true);

      // 会话内重新 initConfig：readStored 命中 memoryStore（不再触碰抛错的 localStorage），
      // 读回此前 writeStored 落地的值——getItem 一律抛错，这些值只可能来自内存兜底。
      const restored = initConfig();
      expect(restored.mode).toBe('compat');
      expect(restored.fps).toBe(60);
      expect(restored.effectiveMode).toBe('compat');
    } finally {
      Object.defineProperty(window, 'localStorage', {
        value: original,
        configurable: true,
      });
    }
  });
});
