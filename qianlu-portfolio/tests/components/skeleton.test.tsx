import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Skeleton } from '@/components/ui/skeleton';

afterEach(() => {
  cleanup();
});

describe('Skeleton 骨架屏占位块', () => {
  it('渲染 aria-hidden 的占位 div，对辅助技术隐藏', () => {
    const { container } = render(<Skeleton />);

    const node = container.querySelector('[data-slot="skeleton"]');
    expect(node).not.toBeNull();
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node).toHaveTextContent('');
  });

  it('默认带脉冲与浅色占位样式', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
    expect(container.firstChild).toHaveClass('bg-ink/10');
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('自定义类名与默认类合并，且不影响透传属性', () => {
    const { container } = render(
      <Skeleton className="rounded-card absolute inset-0" data-testid="photo-skeleton" />
    );

    const node = container.firstChild as HTMLElement;
    expect(node).toHaveClass('absolute');
    expect(node).toHaveClass('inset-0');
    expect(node).toHaveClass('rounded-card');
    expect(node).toHaveClass('animate-pulse');
    expect(node).toHaveAttribute('data-testid', 'photo-skeleton');
  });
});
