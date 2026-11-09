import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  /** 装饰图标（lucide），传入后渲染在圆形底上；整体对辅助技术隐藏 */
  icon?: LucideIcon;
  /** 装饰插画（内联 SVG），传入时优先于 icon 渲染；整体对辅助技术隐藏 */
  illustration?: React.ReactNode;
  /** 必填主标题，如「作品整理中」 */
  title: string;
  /** 引导文案，说明空的原因与下一步 */
  description?: string;
  /** 可选动作区，通常放一个 Button */
  action?: React.ReactNode;
  className?: string;
};

/*
 * 默认空状态插画：相框 + 远山 + 太阳 + 星点，细线条风格。
 * 配色全部走品牌 CSS 变量，明暗主题自适应；不含位图资源，无新增请求。
 */
function EmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
      className={cn('h-auto w-40', className)}
    >
      {/* 背景软色斑 */}
      <circle cx="80" cy="62" r="50" fill="var(--brand-pine)" fillOpacity="0.08" />
      {/* 相框 */}
      <rect
        x="40"
        y="28"
        width="80"
        height="64"
        rx="10"
        fill="var(--brand-cream)"
        fillOpacity="0.7"
        stroke="var(--brand-ink)"
        strokeOpacity="0.35"
        strokeWidth="2.5"
      />
      {/* 远山 */}
      <path
        d="M52 76 L66 54 L76 66 L88 50 L104 76"
        stroke="var(--brand-clay)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 太阳 */}
      <circle cx="100" cy="42" r="5" stroke="var(--brand-clay)" strokeWidth="2.5" />
      {/* 星点 */}
      <path
        d="M126 20 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z"
        fill="var(--brand-pine)"
        fillOpacity="0.4"
      />
    </svg>
  );
}

/*
 * 空状态：列表为空时替代白板/一行灰字，用插画/图标 + 标题 + 引导文案 + 动作
 * 提供明确出路。纯展示组件，布局自带充足留白，可在玻璃卡内使用。
 */
function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'text-ink flex flex-col items-center justify-center px-6 py-16 text-center sm:py-24',
        className
      )}
    >
      {illustration ? (
        <div aria-hidden="true">{illustration}</div>
      ) : Icon ? (
        <div
          aria-hidden="true"
          className="bg-ink/5 text-ink/55 border-hairline flex size-16 items-center justify-center rounded-full border"
        >
          <Icon className="size-8" />
        </div>
      ) : null}
      <p className="mt-6 text-lg font-semibold">{title}</p>
      {description ? (
        <p className="text-ink/65 mt-2 max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

export { EmptyState, EmptyIllustration };
