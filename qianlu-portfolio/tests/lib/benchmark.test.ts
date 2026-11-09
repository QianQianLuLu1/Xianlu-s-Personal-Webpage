import { beforeEach, describe, expect, it } from 'vitest';

import {
  DETECT_CACHE_KEY,
  clearDetectionCache,
  getCachedDetection,
  suggestMode,
} from '@/lib/perf/benchmark';

beforeEach(() => {
  window.localStorage.clear();
});

describe('suggestMode（§2.1 三项判据，任意两项不达标 → 兼容）', () => {
  it('三项全达标 → 完整动效', () => {
    expect(suggestMode(60, 8, 8)).toBe('full');
  });

  it('仅基准不达标 → 完整动效', () => {
    expect(suggestMode(25, 8, 8)).toBe('full');
  });

  it('基准 + 核心数两项不达标 → 兼容', () => {
    expect(suggestMode(25, 2, 8)).toBe('compat');
  });

  it('基准 + 内存两项不达标 → 兼容', () => {
    expect(suggestMode(10, 8, 2)).toBe('compat');
  });

  it('基准不可测（后台标签页）时按其余两项判定', () => {
    expect(suggestMode(null, 8, 8)).toBe('full');
    expect(suggestMode(null, 2, 2)).toBe('compat');
  });

  it('核心数未知（0）不参与判负', () => {
    expect(suggestMode(60, 0, 8)).toBe('full');
  });

  it('deviceMemory API 缺失时只用基准 + 核心数判定', () => {
    expect(suggestMode(60, 8, null)).toBe('full');
    expect(suggestMode(25, 2, null)).toBe('compat');
  });
});

describe('检测结果缓存（24h 有效）', () => {
  const valid = {
    detectedAt: Date.now(),
    benchFps: 55,
    gpu: 'Test GPU',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    suggested: 'full',
  };

  it('有效缓存可读回', () => {
    window.localStorage.setItem(DETECT_CACHE_KEY, JSON.stringify(valid));
    expect(getCachedDetection()).toMatchObject({ suggested: 'full', benchFps: 55 });
  });

  it('超过 24h 过期', () => {
    window.localStorage.setItem(
      DETECT_CACHE_KEY,
      JSON.stringify({ ...valid, detectedAt: Date.now() - 25 * 60 * 60 * 1000 })
    );
    expect(getCachedDetection()).toBeNull();
  });

  it('格式非法时视为无缓存', () => {
    window.localStorage.setItem(DETECT_CACHE_KEY, '{oops');
    expect(getCachedDetection()).toBeNull();

    window.localStorage.setItem(DETECT_CACHE_KEY, JSON.stringify({ detectedAt: 'x' }));
    expect(getCachedDetection()).toBeNull();
  });

  it('suggested 字段白名单校验', () => {
    window.localStorage.setItem(DETECT_CACHE_KEY, JSON.stringify({ ...valid, suggested: 'turbo' }));
    expect(getCachedDetection()).toBeNull();
  });

  it('clearDetectionCache 清空缓存', () => {
    window.localStorage.setItem(DETECT_CACHE_KEY, JSON.stringify(valid));
    clearDetectionCache();
    expect(getCachedDetection()).toBeNull();
  });
});
