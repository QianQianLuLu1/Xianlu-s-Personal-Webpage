/**
 * 性能调度器（计划 §4）：性能状态机 + 模式过渡执行。
 *
 * - 仅 mode='auto' 时运行降级状态机（手动选择优先，不被状态机覆盖）：
 *   连续 3s 实际帧率 < min(目标, 实测显示器刷新率) × 50% → 自动降级兼容模式，
 *   并按 §4.2 伪代码把 'compat' 写回持久化设置（用户可在面板改回）。
 * - 不做自动恢复（§4.1 抖动防护）；恢复只由用户在设置面板手动触发。
 * - 过渡（§4.3/§4.4）：documentElement 挂/摘 mode-compat 类（CSS 据此切换
 *   视差层数与入场动画形态，0.5s 内完成）、gsap.ticker.fps 跟随用户所选
 *   帧率（兼容模式的减负靠裁剪动效层实现）、SpotlightCanvas 等组件由
 *   React 依 effectiveMode 自行挂载/卸载。
 *
 * 降级只裁动效层数与特效强度，不改图片分辨率与文字布局（§4.5）。
 */

import { CONFIG_CHANGE_EVENT, getConfig, updateConfig, type EffectiveMode } from '@/lib/settings';
import { getCachedDetection, runDetection } from './benchmark';
import { measureScreenHz, startFpsMonitor, shouldDegrade } from './monitor';

/** 连续多少个 1s 采样低于阈值才触发降级（§4.1：连续 3s） */
const DEGRADE_CONSECUTIVE_SECONDS = 3;

type GsapModule = typeof import('gsap');

let gsapModule: GsapModule | null = null;

async function ensureGsap(): Promise<GsapModule> {
  if (!gsapModule) {
    // gsap 体积可观（§2.5 JS 预算），动态加载：主包不携带，兼容模式下若
    // 无任何 gsap 动画需求则按需决定是否拉取
    gsapModule = await import('gsap');
  }
  return gsapModule;
}

let stopMonitor: (() => void) | null = null;
let eventHandler: (() => void) | null = null;
let badSeconds = 0;
let running = false;
let appliedMode: EffectiveMode | null = null;
let appliedTickerFps = 0;

/** 把模式落到 documentElement：CSS 类 + data 属性（供样式与调试） */
function applyModeClass(mode: EffectiveMode): void {
  if (appliedMode === mode) return;
  appliedMode = mode;
  // 模式切换时清零坏样本计数，避免陈旧累计在切回 auto 后秒触发降级
  badSeconds = 0;

  const root = document.documentElement;
  root.classList.toggle('mode-compat', mode === 'compat');
  root.dataset.mode = mode;
}

async function applyTickerFps(fps: number): Promise<void> {
  if (appliedTickerFps === fps) return;
  try {
    const { gsap } = await ensureGsap();
    gsap.ticker.fps(fps);
    // 成功后才记守卫值；加载失败时保持旧值，下次 sync 自动重试
    appliedTickerFps = fps;
  } catch {
    // gsap 动态导入失败：不阻断调度器，静默等待下次重试
  }
}

function syncToConfig(): void {
  const config = getConfig();
  applyModeClass(config.effectiveMode);
  // 帧率始终跟随用户选择；兼容模式不再强制 60
  void applyTickerFps(config.fps);
}

/** 状态机触发的自动降级；§4.2 伪代码要求把 compat 持久化 */
function degradeToCompat(): void {
  badSeconds = 0;
  updateConfig({ mode: 'compat', effectiveMode: 'compat' });
}

/**
 * mode = auto 时用检测结果决定实际档位。
 * 优先取 24h 缓存（同步、无闪烁）；无缓存才现场跑基准（异步）。
 */
async function resolveAutoMode(): Promise<void> {
  if (getConfig().mode !== 'auto') return;

  const cached = getCachedDetection();
  if (cached) {
    if (getConfig().mode === 'auto') {
      updateConfig({ effectiveMode: cached.suggested });
    }
    return;
  }

  const fresh = await runDetection();
  // 等待期间用户可能已手动指定模式，此时尊重手动值
  if (getConfig().mode === 'auto') {
    updateConfig({ effectiveMode: fresh.suggested });
  }
}

function handleSample(fps: number): void {
  const config = getConfig();
  // 手动选择优先：仅 auto 模式运行降级状态机，不覆盖用户明确选择
  if (config.mode !== 'auto') return;
  if (shouldDegrade(config.effectiveMode, fps, config.fps, config.actualScreenHz)) {
    badSeconds += 1;
    if (badSeconds >= DEGRADE_CONSECUTIVE_SECONDS) {
      degradeToCompat();
    }
  } else {
    badSeconds = 0;
  }
}

/**
 * 启动调度器（应用生命周期内常驻）。返回清理函数。
 * StrictMode 下 effect 双调用安全：内部先清掉上一轮的循环与监听。
 */
export function startPerformanceScheduler(): () => void {
  if (running) stopPerformanceScheduler();
  running = true;
  badSeconds = 0;
  appliedMode = null;
  appliedTickerFps = 0;

  syncToConfig();

  stopMonitor = startFpsMonitor(handleSample);

  eventHandler = syncToConfig;
  window.addEventListener(CONFIG_CHANGE_EVENT, eventHandler);

  void resolveAutoMode();
  void measureScreenHz().then((hz) => {
    if (hz !== null) updateConfig({ actualScreenHz: hz });
  });

  return stopPerformanceScheduler;
}

export function stopPerformanceScheduler(): void {
  stopMonitor?.();
  stopMonitor = null;
  if (eventHandler) {
    window.removeEventListener(CONFIG_CHANGE_EVENT, eventHandler);
    eventHandler = null;
  }
  badSeconds = 0;
  running = false;
}
