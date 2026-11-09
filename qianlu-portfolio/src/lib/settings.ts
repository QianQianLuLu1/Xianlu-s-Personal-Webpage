/**
 * 用户设置存储与全局状态总线（计划 §2.6 / §4.6）。
 *
 * - localStorage 键：qianlu.settings.*；所有读取都经白名单校验，非法值回退默认。
 * - localStorage 不可用（隐私模式等）时降级为内存存储，设置仅本会话生效。
 * - window.__APP_CONFIG 是全站共享的运行时状态；任何键变更都通过
 *   CustomEvent('qianlu.config:change') 广播，各组件按需监听。
 *
 * 深色模式不在本模块管理：按用户决定保持两态（light/dark），
 * 由 src/hooks/use-theme.ts 独立读写 qianlu.theme。
 * 配色性格（palette）是本模块管理的视觉偏好，持久化后由 usePalette 同步到 <html>。
 */

export type ModeSetting = 'auto' | 'full' | 'compat';
export type EffectiveMode = 'full' | 'compat';
export type ResolutionSetting = 'auto' | '2k' | '4k';
export type ResolvedResolution = '2k' | '4k';
export type FpsSetting = 60 | 120 | 144 | 180;
/** 配色性格：纯视觉偏好，不参与内容、路由或业务数据 */
export type PaletteSetting = 'air' | 'vivid' | 'spectrum' | 'deep';

export const FPS_CHOICES: readonly FpsSetting[] = [60, 120, 144, 180];
export const MODE_CHOICES: readonly ModeSetting[] = ['auto', 'full', 'compat'];
export const RESOLUTION_CHOICES: readonly ResolutionSetting[] = ['auto', '2k', '4k'];
export const PALETTE_CHOICES: readonly PaletteSetting[] = ['air', 'vivid', 'spectrum', 'deep'];

export const STORAGE_KEYS = {
  mode: 'qianlu.settings.mode',
  resolution: 'qianlu.settings.resolution',
  fps: 'qianlu.settings.fps',
  palette: 'qianlu.settings.palette',
} as const;

export const CONFIG_CHANGE_EVENT = 'qianlu.config:change';

export interface AppConfig {
  /** 用户设置的性能模式；auto = 交由检测与状态机决定 */
  mode: ModeSetting;
  /** 实际生效的性能模式 */
  effectiveMode: EffectiveMode;
  /** 用户设置的分辨率档位 */
  resolution: ResolutionSetting;
  /** 实际生效的分辨率档位（auto 时按屏幕物理像素判定） */
  effectiveResolution: ResolvedResolution;
  /** 目标帧率档位 */
  fps: FpsSetting;
  /** 配色性格（视觉偏好） */
  palette: PaletteSetting;
  /** 实测显示器刷新率（Hz），测量不可用时为 null */
  actualScreenHz: number | null;
  /** 1Hz 滚动平均帧率，采样未就绪时为 null */
  rollingFps: number | null;
  /** 毛玻璃令牌档位：完整动效用强档，兼容模式用简档 */
  glassTier: 'strong' | 'plain';
  /** 视差层数：完整动效 5 层，兼容 3 层 */
  parallaxLayers: 3 | 5;
}

export interface ConfigChangeDetail {
  /** 本次变更涉及的键（含被派生逻辑连带更新的键） */
  keys: (keyof AppConfig)[];
}

declare global {
  interface Window {
    __APP_CONFIG?: AppConfig;
  }
}

export const DEFAULT_MODE: ModeSetting = 'auto';
export const DEFAULT_RESOLUTION: ResolutionSetting = 'auto';
export const DEFAULT_FPS: FpsSetting = 144;
export const DEFAULT_PALETTE: PaletteSetting = 'air';

/** 4K 档阈值：屏幕物理像素 ≥ 600 万判定为 4K（§2.3） */
const PIXELS_4K_THRESHOLD = 6_000_000;

/* ---------------------------------- 校验 ---------------------------------- */

export function sanitizeMode(value: unknown): ModeSetting {
  return value === 'full' || value === 'compat' || value === 'auto' ? value : DEFAULT_MODE;
}

export function sanitizeResolution(value: unknown): ResolutionSetting {
  return value === '2k' || value === '4k' || value === 'auto' ? value : DEFAULT_RESOLUTION;
}

export function sanitizeFps(value: unknown): FpsSetting {
  return value === 60 || value === 120 || value === 144 || value === 180 ? value : DEFAULT_FPS;
}

export function sanitizePalette(value: unknown): PaletteSetting {
  return value === 'air' || value === 'vivid' || value === 'spectrum' || value === 'deep'
    ? value
    : DEFAULT_PALETTE;
}

/* ---------------------------------- 存储 ---------------------------------- */

let storageBroken = false;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    storageBroken = true;
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    storageBroken = true;
    return false;
  }
}

/**
 * localStorage 是否可用（读写都成功）。
 * 不可用时设置面板应提示「仅本会话生效」。
 */
export function isStorageUsable(): boolean {
  const probe = 'qianlu.probe';
  try {
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** 内存降级存储：localStorage 读写失败时的会话内兜底 */
const memoryStore = new Map<string, string>();

function readStored(key: string): string | null {
  if (memoryStore.has(key)) return memoryStore.get(key) ?? null;
  return safeGet(key);
}

function writeStored(key: string, value: string): void {
  if (!safeSet(key, value)) {
    memoryStore.set(key, value);
  }
}

/* ------------------------------ 派生与解析 ------------------------------ */

/** 分辨率档位解析：auto 按屏幕物理像素判定，否则用用户值（§2.3） */
export function resolveResolution(
  setting: ResolutionSetting,
  physicalPixels: number
): ResolvedResolution {
  if (setting === '2k' || setting === '4k') return setting;
  return physicalPixels >= PIXELS_4K_THRESHOLD ? '4k' : '2k';
}

/** 屏幕物理像素数（CSS 像素 × DPR），无法获取时按 2K 处理 */
export function screenPhysicalPixels(): number {
  if (typeof window === 'undefined') return 0;
  return (
    (window.screen?.width ?? 0) * (window.screen?.height ?? 0) * (window.devicePixelRatio || 1)
  );
}

/* ------------------------------ 状态总线 ------------------------------ */

function derive(mode: EffectiveMode): Pick<AppConfig, 'glassTier' | 'parallaxLayers'> {
  return mode === 'full'
    ? { glassTier: 'strong', parallaxLayers: 5 }
    : { glassTier: 'plain', parallaxLayers: 3 };
}

/** 读取持久化设置并组装初始总线状态（模块加载后手动调用一次） */
export function initConfig(): AppConfig {
  const mode = sanitizeMode(readStored(STORAGE_KEYS.mode));
  const resolution = sanitizeResolution(readStored(STORAGE_KEYS.resolution));
  const fps = sanitizeFps(Number(readStored(STORAGE_KEYS.fps)));
  const palette = sanitizePalette(readStored(STORAGE_KEYS.palette));

  const effectiveResolution = resolveResolution(resolution, screenPhysicalPixels());
  // 持久化了 'compat'（多为上一次自动降级的遗留）则直接生效，其余交由调度器检测
  const effectiveMode: EffectiveMode = mode === 'compat' ? 'compat' : 'full';

  const config: AppConfig = {
    mode,
    effectiveMode,
    resolution,
    effectiveResolution,
    fps,
    palette,
    actualScreenHz: null,
    rollingFps: null,
    ...derive(effectiveMode),
  };

  window.__APP_CONFIG = config;
  return config;
}

export function getConfig(): AppConfig {
  if (!window.__APP_CONFIG) return initConfig();
  return window.__APP_CONFIG;
}

/**
 * 更新总线并广播。持久化键（mode/resolution/fps）同时写入 localStorage，
 * 派生键（effectiveMode/effectiveResolution/glassTier/parallaxLayers）仅影响运行时状态。
 * 监听方收到事件后直接重读 getConfig() 即可，detail 只作提示。
 */
export function updateConfig(
  patch: Partial<Omit<AppConfig, 'glassTier' | 'parallaxLayers'>>
): AppConfig {
  const config = getConfig();
  const next: AppConfig = { ...config, ...patch };
  const changed = new Set<keyof AppConfig>();

  if (patch.mode !== undefined) {
    next.mode = sanitizeMode(patch.mode);
    writeStored(STORAGE_KEYS.mode, next.mode);
    // 手动指定 full/compat 时立即生效；auto 交给调度器按检测决定
    if (next.mode !== 'auto' && next.mode !== next.effectiveMode) {
      next.effectiveMode = next.mode;
      changed.add('effectiveMode');
    }
  }
  if (patch.resolution !== undefined) {
    next.resolution = sanitizeResolution(patch.resolution);
    writeStored(STORAGE_KEYS.resolution, next.resolution);
  }
  if (patch.fps !== undefined) {
    next.fps = sanitizeFps(patch.fps);
    writeStored(STORAGE_KEYS.fps, String(next.fps));
  }
  if (patch.palette !== undefined) {
    next.palette = sanitizePalette(patch.palette);
    writeStored(STORAGE_KEYS.palette, next.palette);
  }

  const resolvedResolution = resolveResolution(next.resolution, screenPhysicalPixels());
  if (resolvedResolution !== next.effectiveResolution) {
    next.effectiveResolution = resolvedResolution;
    changed.add('effectiveResolution');
  }
  Object.assign(next, derive(next.effectiveMode));

  window.__APP_CONFIG = next;

  for (const key of Object.keys(patch) as (keyof AppConfig)[]) {
    changed.add(key);
  }
  window.dispatchEvent(
    new CustomEvent<ConfigChangeDetail>(CONFIG_CHANGE_EVENT, {
      detail: { keys: [...changed] },
    })
  );

  return next;
}

/**
 * 读取持久化设置时是否发生过写入失败。
 * true 表示当前处于内存降级，面板需提示设置仅本会话生效。
 */
export function isDegradedToMemory(): boolean {
  return storageBroken;
}
