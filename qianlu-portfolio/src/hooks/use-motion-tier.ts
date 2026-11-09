import { useReducedMotion } from 'framer-motion';

import { useAppConfig } from '@/hooks/use-settings';

export type MotionTier = 'full' | 'simple';

/**
 * 入场动画档位（§13.4）。
 *
 * - full：位移 + 透明度、stagger、hover transform 全开；
 * - simple：兼容模式或 prefers-reduced-motion，只保留 200ms 纯 opacity。
 *
 * 同一元素只由一套工具驱动（§13.1 互斥规则）：GSAP 镜头推进（Hero 滚动
 * scrub）在组件内自行读取本档位，非 full 档直接不挂载；CSS 侧的降级形态
 * （.mode-compat / prefers-reduced-motion）由样式表独立处理，不经本 Hook。
 */
export function useMotionTier(): MotionTier {
  const { effectiveMode } = useAppConfig();
  const reduceMotion = useReducedMotion();
  return effectiveMode === 'full' && !reduceMotion ? 'full' : 'simple';
}
