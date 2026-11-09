import { describe, expect, it } from 'vitest';

import { shouldDegrade } from '@/lib/perf/monitor';

describe('shouldDegrade（§4.1 降级判据：实际 fps < 目标 × 50%）', () => {
  it('完整动效下低于阈值一半 → 触发', () => {
    expect(shouldDegrade('full', 40, 144)).toBe(true);
    expect(shouldDegrade('full', 29, 60)).toBe(true);
  });

  it('恰好等于一半 → 不触发（严格小于）', () => {
    expect(shouldDegrade('full', 72, 144)).toBe(false);
  });

  it('兼容模式不再重复触发', () => {
    expect(shouldDegrade('compat', 10, 144)).toBe(false);
  });

  it('帧率读数无效（0）不触发，避免挂起恢复后误判', () => {
    expect(shouldDegrade('full', 0, 144)).toBe(false);
  });

  describe('目标帧率按实测显示器刷新率封顶', () => {
    it('60Hz 显示器 + 目标 144：实测 60 不再误判', () => {
      expect(shouldDegrade('full', 60, 144, 60)).toBe(false);
      expect(shouldDegrade('full', 59, 120, 60)).toBe(false);
    });

    it('刷新率封顶后真实卡顿仍触发（实测 < 刷新率 × 50%）', () => {
      expect(shouldDegrade('full', 29, 60, 60)).toBe(true);
      expect(shouldDegrade('full', 29, 144, 60)).toBe(true);
    });

    it('刷新率高于目标时按目标计算', () => {
      expect(shouldDegrade('full', 29, 60, 144)).toBe(true);
      expect(shouldDegrade('full', 100, 180, 144)).toBe(false);
    });
  });
});
