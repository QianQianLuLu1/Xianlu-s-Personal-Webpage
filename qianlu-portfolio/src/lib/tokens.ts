/**
 * 毛玻璃表面分层令牌与能力检测。
 *
 * 1 级 = liquid-glass-react（liquid glass 折射效果）
 * 2 级 = 纯 CSS backdrop-filter（见 index.css 的 .glass-tier2）
 *
 * 全站同时挂载的 1 级实例上限为 3，超出则降级为 2 级并告警。
 */

export const GLASS_TIER1_MAX = 3;

export type GlassTier = 1 | 2;

/** 1 级实例计数器（模块级，跨组件共享） */
let tier1Count = 0;

/** 测试用：重置计数器 */
export function resetTier1Count(): void {
  tier1Count = 0;
}

/** 测试用：读取当前 1 级实例数 */
export function getTier1Count(): number {
  return tier1Count;
}

/**
 * 浏览器是否支持 1 级效果。
 *
 * Firefox 与 Safari 只部分支持（位移不可见），这两者直接降级为 2 级。
 * 该判断与 liquid-glass-react 官方 README 的说明一致。
 */
export function isLiquidGlassSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Safari（不含 Chrome/Edge 等基于 Chromium 的浏览器）
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return false;
  if (/Firefox|FxiOS/i.test(ua)) return false;

  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  const supportsBackdrop =
    CSS.supports('backdrop-filter', 'blur(1px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(1px)');

  return supportsBackdrop;
}

/**
 * 申请一个 1 级实例。返回 false 表示应降级为 2 级。
 * 调用方必须在卸载时配对调用 releaseTier1()。
 */
export function acquireTier1(): boolean {
  if (!isLiquidGlassSupported()) return false;

  if (tier1Count >= GLASS_TIER1_MAX) {
    console.warn(
      `[GlassSurface] 1 级毛玻璃实例已达上限（${GLASS_TIER1_MAX}），本次降级为 2 级。请减少 1 级用量。`
    );
    return false;
  }

  tier1Count += 1;
  return true;
}

/** 释放一个 1 级实例 */
export function releaseTier1(): void {
  tier1Count = Math.max(0, tier1Count - 1);
}

/** 1 级 liquid-glass-react 的参数档位（仅使用库文档中列出的 prop） */
export const GLASS_PRESETS = {
  /** 强档：导航栏等主要表面 */
  strong: {
    displacementScale: 70,
    blurAmount: 0.0625,
    saturation: 150,
    aberrationIntensity: 2.5,
    elasticity: 0.15,
  },
  /** 弱化档：次要悬浮元素 */
  soft: {
    displacementScale: 40,
    blurAmount: 0.05,
    saturation: 140,
    aberrationIntensity: 1.5,
    elasticity: 0.1,
  },
  /** 简档：几乎只有磨砂，无位移无色散（compat 契约档，不得增强） */
  plain: {
    displacementScale: 0,
    blurAmount: 0.125,
    saturation: 120,
    aberrationIntensity: 0,
    elasticity: 0,
  },
} as const;

export type GlassPresetName = keyof typeof GLASS_PRESETS;
