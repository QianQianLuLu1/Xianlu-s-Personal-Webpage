import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraOff } from 'lucide-react';

import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';

afterEach(() => {
  cleanup();
});

describe('EmptyState 空状态', () => {
  it('渲染必填标题与可选描述', () => {
    render(
      <EmptyState icon={CameraOff} title="作品整理中" description="照片正在冲洗，请稍后再来。" />
    );

    expect(screen.getByText('作品整理中')).toBeInTheDocument();
    expect(screen.getByText('照片正在冲洗，请稍后再来。')).toBeInTheDocument();
  });

  it('动作区渲染且可点击', () => {
    const onClick = vi.fn();
    render(<EmptyState title="空空如也" action={<button onClick={onClick}>回到顶部</button>} />);

    fireEvent.click(screen.getByRole('button', { name: '回到顶部' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('缺省可选 props 时正常渲染，不渲染图标与动作', () => {
    const { container } = render(<EmptyState title="暂无内容" />);

    expect(screen.getByText('暂无内容')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('装饰图标整体 aria-hidden，不进入无障碍树', () => {
    const { container } = render(<EmptyState icon={CameraOff} title="暂无内容" />);

    const iconWrapper = container.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper?.querySelector('svg')).not.toBeNull();
  });

  it('传入插画时渲染插画（内联 SVG）且整体 aria-hidden', () => {
    const { container } = render(
      <EmptyState illustration={<EmptyIllustration />} title="暂无内容" />
    );

    const illustrationWrapper = container.querySelector('[aria-hidden="true"]');
    expect(illustrationWrapper).not.toBeNull();
    expect(illustrationWrapper?.querySelector('svg')).not.toBeNull();
  });

  it('插画与图标同时传入时互斥，仅渲染插画一个 svg', () => {
    const { container } = render(
      <EmptyState icon={CameraOff} illustration={<EmptyIllustration />} title="暂无内容" />
    );

    expect(container.querySelectorAll('svg').length).toBe(1);
    // lucide 图标渲染在圆形底上，插画模式下不应出现该圆形底
    expect(container.querySelector('.size-16')).toBeNull();
  });
});
