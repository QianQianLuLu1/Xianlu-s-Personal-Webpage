/**
 * 性能检测（计划 §2.1）：轻量 Canvas 基准 + 硬件线索 → 建议性能档位。
 *
 * 三项判据（任意两项不达标 → 建议兼容模式）：
 * 1. 基准帧率 ≥ 30fps（60 帧、每帧 1000 个随机三角形）
 * 2. hardwareConcurrency ≥ 4
 * 3. deviceMemory ≥ 4（API 不存在时跳过该项）
 *
 * 检测结果缓存至 localStorage 键 qianlu.perf.detect，24 小时有效；
 * 过期或格式非法时视为无缓存，由调用方重测。
 */

import type { EffectiveMode } from '@/lib/settings';

export interface PerfDetection {
  detectedAt: number;
  benchFps: number;
  gpu: string | null;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  suggested: EffectiveMode;
}

export const DETECT_CACHE_KEY = 'qianlu.perf.detect';
export const DETECT_TTL_MS = 24 * 60 * 60 * 1000;

const BENCH_FRAMES = 60;
const TRIANGLES_PER_FRAME = 1000;
const BENCH_MIN_FPS = 30;

/* ------------------------------- 纯评分逻辑 ------------------------------- */

/**
 * 依据三项判据给出建议档位。benchFps 传 null 表示基准不可测（如后台标签页），
 * 该项按不达标但不计入「两项不达标」规则处理——只有其余两项都失败才判兼容。
 */
export function suggestMode(
  benchFps: number | null,
  hardwareConcurrency: number,
  deviceMemory: number | null
): EffectiveMode {
  let failed = 0;
  let knownCriteria = 0;

  if (benchFps !== null) {
    knownCriteria += 1;
    if (benchFps < BENCH_MIN_FPS) failed += 1;
  }

  knownCriteria += 1;
  if (hardwareConcurrency > 0 && hardwareConcurrency < 4) failed += 1;

  if (deviceMemory !== null) {
    knownCriteria += 1;
    if (deviceMemory < 4) failed += 1;
  }

  // 「任意两项不达标」规则；判据缺失时按比例收敛到剩余项
  const threshold = knownCriteria >= 3 ? 2 : Math.min(knownCriteria, 2);
  return failed >= threshold ? 'compat' : 'full';
}

/* -------------------------------- 基准测量 -------------------------------- */

function measureBenchFps(): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || document.hidden) {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof requestAnimationFrame !== 'function') {
      resolve(null);
      return;
    }

    let frame = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (frame === 0) startTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 离屏压测画布（从不进入 DOM），非 UI 表面：硬编码陶红属设计令牌豁免项
      // （见《全站质感升级实施计划_2026-10-02.md》§T1），色值取 --brand-clay 浅色档
      ctx.fillStyle = '#a8472a';
      ctx.beginPath();
      for (let i = 0; i < TRIANGLES_PER_FRAME; i += 1) {
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      }
      ctx.fill();

      frame += 1;
      if (frame < BENCH_FRAMES) {
        requestAnimationFrame(tick);
        return;
      }
      resolve(((BENCH_FRAMES - 1) * 1000) / Math.max(1, now - startTime));
    };

    requestAnimationFrame(tick);
  });
}

/** WebGL 拿 GPU 渲染器字符串，拿不到（隐私增强模式等）返回 null */
function detectGpu(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    if (!gl || !ext) return null;
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || null;
  } catch {
    return null;
  }
}

/* -------------------------------- 缓存管理 -------------------------------- */

function validateDetection(raw: unknown): PerfDetection | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.detectedAt !== 'number') return null;
  if (typeof d.benchFps !== 'number') return null;
  if (typeof d.hardwareConcurrency !== 'number') return null;
  if (d.suggested !== 'full' && d.suggested !== 'compat') return null;
  return {
    detectedAt: d.detectedAt,
    benchFps: d.benchFps,
    gpu: typeof d.gpu === 'string' ? d.gpu : null,
    hardwareConcurrency: d.hardwareConcurrency,
    deviceMemory: typeof d.deviceMemory === 'number' ? d.deviceMemory : null,
    suggested: d.suggested,
  };
}

/** 读取 24h 内的有效缓存；无缓存、过期或格式非法都返回 null */
export function getCachedDetection(now = Date.now()): PerfDetection | null {
  try {
    const raw = window.localStorage.getItem(DETECT_CACHE_KEY);
    if (!raw) return null;
    const parsed = validateDetection(JSON.parse(raw));
    if (!parsed) return null;
    if (now - parsed.detectedAt > DETECT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDetectionCache(): void {
  try {
    window.localStorage.removeItem(DETECT_CACHE_KEY);
  } catch {
    // 忽略：无缓存等价于目标状态
  }
}

/* -------------------------------- 完整检测 -------------------------------- */

/**
 * 跑一次完整检测并写入缓存。
 * 页面处于后台（rAF 停摆）时 benchFps 为 null，仅凭硬件线索评分。
 */
export async function runDetection(): Promise<PerfDetection> {
  const benchFps = await measureBenchFps();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const hardwareConcurrency = nav.hardwareConcurrency || 0;
  const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;

  const detection: PerfDetection = {
    detectedAt: Date.now(),
    benchFps: benchFps ?? 0,
    gpu: detectGpu(),
    hardwareConcurrency,
    deviceMemory,
    suggested: suggestMode(benchFps, hardwareConcurrency, deviceMemory),
  };

  try {
    window.localStorage.setItem(DETECT_CACHE_KEY, JSON.stringify(detection));
  } catch {
    // 缓存写不进去（隐私模式）不影响本次检测结果
  }

  return detection;
}
