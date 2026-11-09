import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';

import { getConfig } from '@/lib/settings';

/**
 * 键盘按下态镜像（配合 index.css 的 press: 变体使用）。
 *
 * CSS :active 只由指针触发；键盘 Enter/Space 需自行镜像到 data-kb-press，
 * 松开（keyup）、失焦（blur，覆盖 Esc/切窗/焦点转移）时立即清除，
 * 保证是瞬时反馈而非持续选中态。已核实 framer-motion 11 的 press 手势
 * 不含键盘路径，故保留此最小实现。
 *
 * 本文件保持无 hook 的纯函数形态（调用方会在 render 参数里内联展开，
 * 见 tests/press.test.tsx），因此「点触光感」（index.css 的 .press-glow）
 * 的动效档位不在渲染期经 useMotionTier 读取，而在事件触发时实时判定：
 * 与 useMotionTier 同源的两个信号——设置总线 effectiveMode 与
 * prefers-reduced-motion。事件时点读取还能天然跟随设置面板的即时切换，
 * 无过期闭包问题。
 */

const PRESS_KEYS = new Set(['Enter', ' ']);

/** 无修饰键的 Enter/Space 才算“按下按钮”，避免劫持 Ctrl+Enter 等组合键 */
function isPlainPressKey(event: KeyboardEvent<HTMLElement>): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey && PRESS_KEYS.has(event.key);
}

/**
 * 点触光感是否可用 = full 动效档（与 useMotionTier 同源）。
 * compat 模式或 prefers-reduced-motion: reduce 时为 false，光效停用，
 * 按压反馈退回既有的底色加深 / 微缩放（CSS 侧另有 animation: none 兜底）。
 */
function isGlowEnabled(): boolean {
  if (getConfig().effectiveMode !== 'full') return false;
  if (typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 触发一次点触光感：先摘后挂（隔一帧），保证上一轮动画未结束时连点
 * 也能重新起播。动画结束态为全透明（forwards），残留属性无副作用。
 */
function armGlow(element: HTMLElement): void {
  element.removeAttribute('data-glow');
  requestAnimationFrame(() => element.setAttribute('data-glow', ''));
}

export function useKbPressProps() {
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!isGlowEnabled()) return;
      // 触摸/笔的 button 恒为 0；鼠标只认左键
      if (event.button !== 0) return;
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--glow-x', `${event.clientX - rect.left}px`);
      element.style.setProperty('--glow-y', `${event.clientY - rect.top}px`);
      armGlow(element);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      // 只响应按钮自身持有的焦点；子节点（如内部链接）冒泡上来的不算
      if (event.target !== event.currentTarget) return;
      if (!isPlainPressKey(event)) return;
      event.currentTarget.dataset.kbPress = 'true';
      // 键盘按压没有指针坐标，光效落在默认中心（--glow-x/y: 50%）
      if (isGlowEnabled()) armGlow(event.currentTarget);
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (!PRESS_KEYS.has(event.key)) return;
      delete event.currentTarget.dataset.kbPress;
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      delete event.currentTarget.dataset.kbPress;
    },
  };
}

/**
 * 裸 <button> / 按钮样式 <a> 共用的按下视觉类：
 * 微下沉（transform 不占布局）+ 半透明底色的加深版本 + 点触光感挂载点
 * （.press-glow 的视觉与降级见 index.css）。自带 transition 覆盖
 * （与既有的 transition-colors 经 tailwind-merge 去重），保证 scale 也有
 * 短过渡。实心背景的 Button variant 各自 press: 配色见 ui/button.tsx。
 */
export const PRESS_CLASS =
  'press-glow press:bg-ink/10 press:scale-[0.98] transition-[background-color,color,border-color,transform,scale] duration-150';

/**
 * 键盘聚焦可视态共享类：与 ui/button、ui/radio-group 内建的聚焦环同一规范
 * （ring-ring 语义令牌 + 底色偏移），供裸 <button> / <a> 补齐，
 * 保证 Tab 遍历全站都有统一的聚焦指示。
 */
export const FOCUS_RING_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream';
