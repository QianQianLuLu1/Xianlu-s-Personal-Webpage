import * as React from 'react';

import { cn } from '@/lib/utils';

/*
 * 骨架屏占位块：内容（图片等异步资源）加载完成前以浅色脉冲块占住版位，
 * 避免用户对着空白等待。纯展示组件，无任何交互语义，故对辅助技术隐藏；
 * 脉冲动画在兼容模式与 prefers-reduced-motion 下停用（见 index.css）。
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('bg-ink/10 animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
