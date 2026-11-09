import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface AnimateOpts {
  duration?: number;
  ease?: unknown;
  onUpdate?: (v: number) => void;
  onComplete?: () => void;
}

/**
 * 可控 animate 桩：
 * complete = 一次性滚到底并回调 onComplete（浏览器正常收尾）；
 * half     = 只 onUpdate 到中点就“被打断”（没有 onComplete），
 *            用于验证 value 变化后从半程值续滚、最终精确落位。
 */
const state = vi.hoisted(() => ({
  calls: [] as { from: number; to: number; opts: AnimateOpts }[],
  behavior: 'complete' as 'complete' | 'half',
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    animate: (from: number, to: number, opts: AnimateOpts) => {
      state.calls.push({ from, to, opts });
      if (state.behavior === 'complete') {
        opts.onUpdate?.(to);
        opts.onComplete?.();
      } else {
        opts.onUpdate?.((from + to) / 2);
      }
      return { stop: vi.fn() };
    },
  };
});

import AnimatedNumber from '@/components/animated-number';
import { updateConfig } from '@/lib/settings';

describe('AnimatedNumber 数字滚动', () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.behavior = 'complete';
    updateConfig({ mode: 'full' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('完整动效档：触发滚动动画，最终精确停在目标值（不停半程）', () => {
    render(<AnimatedNumber value={18} />);

    expect(state.calls).toHaveLength(1);
    expect(state.calls[0].to).toBe(18);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('中途被打断后数值变化：从当前显示值续滚，收尾仍是精确新终值', () => {
    state.behavior = 'half';
    const { rerender } = render(<AnimatedNumber value={18} />);
    // 第一次动画只走到中点 9（18/2），停在半程显示
    expect(screen.getByText('9')).toBeInTheDocument();

    state.behavior = 'complete';
    rerender(<AnimatedNumber value={20} />);
    const second = state.calls[1];
    // 从半程的 9 续滚到 20，而不是跳回起点
    expect(second.from).toBe(9);
    expect(second.to).toBe(20);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('兼容档（compat）：不做动画，首帧即终值', () => {
    updateConfig({ mode: 'compat' });
    render(<AnimatedNumber value={18} />);

    expect(state.calls).toHaveLength(0);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('自定义 format 生效（如阶段序号补零）', () => {
    render(<AnimatedNumber value={3} format={(n) => String(Math.round(n)).padStart(2, '0')} />);
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('非法入参（NaN / duration<=0）：告警并直接渲染原始值，不抛异常', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<AnimatedNumber value={Number.NaN} />);
    expect(screen.getByText('NaN')).toBeInTheDocument();

    render(<AnimatedNumber value={5} duration={0} />);
    expect(warn).toHaveBeenCalled();
    expect(state.calls).toHaveLength(0);
  });

  it('format 抛错时回退默认取整，不崩溃', () => {
    render(
      <AnimatedNumber
        value={7}
        format={() => {
          throw new Error('boom');
        }}
      />
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
