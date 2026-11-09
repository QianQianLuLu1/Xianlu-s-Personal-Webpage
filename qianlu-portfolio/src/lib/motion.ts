/**
 * 动效节奏常量与入场工具。
 *
 * 数值与 src/index.css 的 --motion-* 令牌互为锚点（见该文件「动效节奏」注释），
 * 改动须两侧同步。
 */
import type { Transition } from 'framer-motion';

import type { MotionTier } from '@/hooks/use-motion-tier';

export const DUR_FAST = 0.2;
export const DUR_BASE = 0.3;
export const DUR_SLOW = 0.6;

export const EASE_ENTER: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_SWAP: [number, number, number, number] = [0.4, 0, 0.2, 1];
export const EASE_DECEL = 'easeOut' as const;

export const SPRING_INTERACT: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 26,
  mass: 0.9,
};
export const SPRING_OVERLAY: Transition = { type: 'spring', stiffness: 280, damping: 30 };

export interface EnterInViewOptions {
  y?: number;
  delay?: number;
  duration?: number;
  amount?: number;
}

/** 进入视口一次的入场动画；simple 档（兼容/reduced-motion）只保留 200ms 纯 opacity。 */
export function enterInView(
  tier: MotionTier,
  { y = 32, delay = 0, duration = DUR_SLOW, amount = 0.3 }: EnterInViewOptions = {}
) {
  return {
    initial: tier === 'full' ? { opacity: 0, y } : { opacity: 0 },
    whileInView: tier === 'full' ? { opacity: 1, y: 0 } : { opacity: 1 },
    viewport: { once: true, amount },
    transition: tier === 'full' ? { duration, delay, ease: EASE_ENTER } : { duration: DUR_FAST },
  };
}
