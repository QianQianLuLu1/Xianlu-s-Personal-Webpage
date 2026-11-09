/**
 * 运行时性能监测（计划 §2.2 / T8）。
 *
 * - RAF 循环按 1s 窗口统计帧数，把滚动平均帧率写入 __APP_CONFIG.rollingFps
 *   （1Hz 更新，设置面板「当前状态」区直接读该值）。
 * - 启动时用 RAF 时间戳差值测量真实显示器刷新率，写入 actualScreenHz。
 *
 * 后台标签页 rAF 停摆：检测到超长帧间隔时丢弃当前窗口，不发布 0 帧率，
 * 避免切回标签页时误触发调度器降级。
 */

import { updateConfig, type EffectiveMode } from '@/lib/settings';

const WINDOW_MS = 1000;
/** 超过该帧间隔视为标签页被隐藏/挂起，丢弃窗口 */
const GAP_MS = 2000;

const HZ_SAMPLE_FRAMES = 24;
const HZ_MIN = 24;
const HZ_MAX = 500;

/** 用连续 rAF 时间戳的中位帧间隔估算真实刷新率 */
export function measureScreenHz(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function' || document.hidden) {
      resolve(null);
      return;
    }

    const deltas: number[] = [];
    let last = 0;

    const tick = (now: number) => {
      if (last > 0) {
        const delta = now - last;
        // 排除挂起造成的异常帧间隔
        if (delta >= 1 && delta <= 100) deltas.push(delta);
      }
      last = now;

      if (deltas.length < HZ_SAMPLE_FRAMES) {
        requestAnimationFrame(tick);
        return;
      }

      deltas.sort((a, b) => a - b);
      const median = deltas[Math.floor(deltas.length / 2)];
      const hz = Math.round(1000 / median);
      resolve(hz >= HZ_MIN && hz <= HZ_MAX ? hz : null);
    };

    requestAnimationFrame(tick);
  });
}

/**
 * 启动帧率采样。返回清理函数（取消 RAF）。
 * StrictMode 下 effect 双调用安全：先 cleanup 再重启即可。
 */
export function startFpsMonitor(onSample?: (fps: number) => void): () => void {
  let rafId = 0;
  let windowStart = 0;
  let lastTick = 0;
  let frames = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;

    if (windowStart === 0) {
      windowStart = now;
    } else if (now - lastTick > GAP_MS) {
      // 标签页挂起后恢复：丢弃半个窗口，不发布失真帧率
      windowStart = now;
      frames = 0;
    }

    frames += 1;
    lastTick = now;

    const elapsed = now - windowStart;
    if (elapsed >= WINDOW_MS) {
      const fps = Math.round((frames * 1000) / elapsed);
      updateConfig({ rollingFps: fps });
      onSample?.(fps);
      windowStart = now;
      frames = 0;
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}

/**
 * 调度器使用的降级判据（纯函数，供测试）。
 * 目标帧率可能被用户设得高于显示器刷新率（如 60Hz 屏选 144），
 * 比较前先按实测刷新率封顶，否则低刷显示器上必然误判。
 */
export function shouldDegrade(
  effectiveMode: EffectiveMode,
  rollingFps: number,
  targetFps: number,
  screenHz: number | null = null
): boolean {
  const target = screenHz ? Math.min(targetFps, screenHz) : targetFps;
  return effectiveMode === 'full' && rollingFps > 0 && rollingFps < target * 0.5;
}
