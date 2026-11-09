import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import GlassSurface from '@/components/glass/GlassSurface';
import { getTier1Count, resetTier1Count } from '@/lib/tokens';

// jsdom 无真实 shader/canvas 管线，把库替换为透传桩，只验证分层与配额逻辑
vi.mock('liquid-glass-react', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="liquid-glass">{children}</div>
  ),
}));

function stubCssSupports(supported: boolean) {
  vi.stubGlobal('CSS', { supports: () => supported });
}

beforeEach(() => {
  resetTier1Count();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('GlassSurface 分层（T5 验收）', () => {
  it('不支持时请求 1 级也降级为 2 级 CSS 层', () => {
    stubCssSupports(false);
    const { container, queryByTestId } = render(<GlassSurface level={1}>内容</GlassSurface>);

    expect(queryByTestId('liquid-glass')).toBeNull();
    expect(container.querySelector('[data-glass-tier="2"]')).not.toBeNull();
    expect(getTier1Count()).toBe(0);
  });

  it('level=2 直接渲染 CSS 层，不占用 1 级配额', () => {
    stubCssSupports(true);
    const { container, queryByTestId } = render(<GlassSurface level={2}>内容</GlassSurface>);

    expect(queryByTestId('liquid-glass')).toBeNull();
    expect(container.querySelector('[data-glass-tier="2"]')).not.toBeNull();
    expect(getTier1Count()).toBe(0);
  });

  it('支持时挂载 1 级实例，卸载后释放配额', () => {
    stubCssSupports(true);
    const { unmount, queryByTestId } = render(<GlassSurface level={1}>内容</GlassSurface>);

    expect(queryByTestId('liquid-glass')).not.toBeNull();
    expect(getTier1Count()).toBe(1);

    unmount();
    expect(getTier1Count()).toBe(0);
  });

  it('1 级实例数超过上限（3）时降级并告警（§5.1）', () => {
    stubCssSupports(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { container, getAllByTestId } = render(
      <>
        <GlassSurface level={1}>一</GlassSurface>
        <GlassSurface level={1}>二</GlassSurface>
        <GlassSurface level={1}>三</GlassSurface>
        <GlassSurface level={1}>四</GlassSurface>
      </>
    );

    expect(getAllByTestId('liquid-glass')).toHaveLength(3);
    expect(container.querySelectorAll('[data-glass-tier="2"]')).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
