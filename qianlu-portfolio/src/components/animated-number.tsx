import { useEffect, useRef, useState, type RefObject } from 'react';
import { animate } from 'framer-motion';

import { useMotionTier } from '@/hooks/use-motion-tier';
import { EASE_DECEL } from '@/lib/motion';

/**
 * 展示型计数数字的滚动组件（进入视口后从 from 滚到 value，easeOut 减速停住）。
 *
 * - 补间复用 framer-motion 的 animate()（项目既有依赖，官方 count-up 模式）；
 * - 视图触发用最小原生 IntersectionObserver 实现：framer-motion 的 useInView
 *   在无 IO 的环境下会直接 new IntersectionObserver 抛错（v11.18 无守卫），
 *   这里特性检测后降级为“立即可见”；
 * - 动画结束 onUpdate 之外再显式落到精确终值，杜绝“显示到一半停住”；
 * - value 中途变化（如弹窗翻页计数器）从当前显示值续滚到新值，不跳变；
 * - compat / prefers-reduced-motion（useMotionTier==='simple'，§13.4）直接显示终值。
 *
 * 适用边界：仅用于“数量型展示数字”（照片数、阶段序号、x / total 计数器）。
 * 版本号、2K/4K、fps 选项、实时帧率、版权年份等标识符/遥测数字不要使用本组件。
 */

export interface AnimatedNumberProps {
  /** 目标值（整数展示；小数由 format 决定取舍） */
  value: number;
  /** 滚动时长（秒），默认 1.2s */
  duration?: number;
  /** 起始值，默认 0 */
  from?: number;
  /** 显示格式化，默认四舍五入取整 */
  format?: (n: number) => string;
  className?: string;
}

const DEFAULT_FORMAT = (n: number) => String(Math.round(n));

/** 元素进入视口一次即定格；无 IntersectionObserver 环境直接视为可见 */
function useInViewOnce(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (inView || !el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, ref]);

  return inView;
}

/** 入参校验：非法时返回 false，组件退化为直接渲染原始值 */
function isValidParams(value: number, from: number, duration: number): boolean {
  return (
    Number.isFinite(value) && Number.isFinite(from) && Number.isFinite(duration) && duration > 0
  );
}

export function AnimatedNumber({
  value,
  duration = 1.2,
  from = 0,
  format = DEFAULT_FORMAT,
  className,
}: AnimatedNumberProps) {
  const tier = useMotionTier();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInViewOnce(ref);
  const valid = isValidParams(value, from, duration);

  const [display, setDisplay] = useState(from);
  // 动画进行中的实时显示值（ref 保证 value 变化时从半程位置续滚而非跳回起点）
  const liveRef = useRef(display);
  liveRef.current = display;

  useEffect(() => {
    if (!valid) {
      console.warn('[AnimatedNumber] 非法入参，直接渲染原值', { value, from, duration });
      return;
    }
    // 关键守卫：未进入视口前一律不动作。启动阶段调度器的性能检测会短暂
    // 落在 compat 档（约数百 ms），若此时直写终值，滚动动画会被提前吞掉。
    if (!inView) return;
    if (tier !== 'full') {
      setDisplay(value); // 减动效/兼容档：可见时直接定格终值，不滚动
      return;
    }

    const controls = animate(liveRef.current, value, {
      duration,
      ease: EASE_DECEL,
      onUpdate: (latest) => setDisplay(latest),
      onComplete: () => setDisplay(value), // 兜底精确终值，杜绝停在半程
    });
    return () => controls.stop();
  }, [valid, tier, inView, value, duration, from]);

  const safeText = (() => {
    if (!valid) return String(value);
    try {
      return format(display);
    } catch {
      return DEFAULT_FORMAT(display);
    }
  })();

  return (
    <span ref={ref} data-animated-number className={className}>
      {safeText}
    </span>
  );
}

export default AnimatedNumber;
