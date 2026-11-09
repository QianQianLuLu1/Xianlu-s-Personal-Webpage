import { useState, type ReactNode } from 'react';
import { Gauge, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { useAppConfig } from '@/hooks/use-settings';
import { clearDetectionCache, getCachedDetection, runDetection } from '@/lib/perf/benchmark';
import { FPS_CHOICES, updateConfig, isStorageUsable, type PaletteSetting } from '@/lib/settings';
import { cn } from '@/lib/utils';

const MODE_OPTIONS = [
  { value: 'auto', label: '自动', hint: '按设备性能检测自动选择' },
  { value: 'full', label: '完整动效', hint: '全部动效与玻璃折射强档' },
  { value: 'compat', label: '兼容模式', hint: '关闭高开销动效，优先流畅度' },
] as const;

const RESOLUTION_OPTIONS = [
  { value: 'auto', label: '自动', hint: '按屏幕物理像素判定' },
  { value: '2k', label: '2K', hint: '2560 宽，平均单图更小' },
  { value: '4k', label: '4K', hint: '3840 宽，细节最全' },
] as const;

const PALETTE_OPTIONS = [
  { value: 'air', label: '极致轻薄', hint: '浅灰中性，日常最克制' },
  { value: 'vivid', label: '高能猛进', hint: '黑底撞色，强对比' },
  { value: 'spectrum', label: '神通妙彩', hint: '紫蓝绿柔渐变' },
  { value: 'deep', label: '超拉风', hint: '深海蓝科技感' },
] as const;

const MODE_LABEL: Record<string, string> = {
  full: '完整动效',
  compat: '兼容模式',
};

function describeBrowser(): string {
  if (typeof navigator === 'undefined') return '—';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : '未知浏览器';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '未知系统';
  return `${browser} · ${os}`;
}

interface OptionRowProps {
  legend: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  columns?: 2 | 3;
  swatch?: boolean;
}

function OptionRow({
  legend,
  name,
  value,
  options,
  onChange,
  columns = 3,
  swatch = false,
}: OptionRowProps) {
  // RadioGroupItem 才是可聚焦元素：item 获得键盘焦点时把聚焦环镜像到整张选项卡
  const optionFocusRing =
    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-cream';
  const optionsGrid =
    columns === 2 ? 'grid-cols-1 gap-2 sm:grid-cols-2' : 'grid-cols-1 gap-2 sm:grid-cols-3';
  return (
    <fieldset>
      <legend className="text-ink mb-2 text-sm font-semibold">{legend}</legend>
      <RadioGroup name={name} value={value} onValueChange={onChange} className={optionsGrid}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'rounded-btn press:bg-ink/10 flex cursor-pointer items-start gap-2.5 border p-3 transition-colors',
              value === option.value
                ? 'border-clay/50 bg-clay/5'
                : 'border-hairline hover:bg-ink/5',
              optionFocusRing
            )}
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <span className="min-w-0">
              {swatch && (
                <span
                  aria-hidden="true"
                  className="palette-swatch mb-1.5"
                  data-palette={option.value}
                />
              )}
              <span className="text-ink block text-sm font-medium">{option.label}</span>
              {option.hint && <span className="text-ink/65 block text-xs">{option.hint}</span>}
            </span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

function StatusRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-ink/65 text-sm">{term}</dt>
      <dd className="text-ink text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * 设置面板（计划 §3 / T15）。
 *
 * 六大区块：性能模式 / 资源分辨率 / 目标帧率 / 深色模式 / 配色性格 / 当前状态（只读）。
 * 全部设置即时生效；mode/resolution/fps/palette 持久化到 localStorage，
 * 深色模式沿用 use-theme 的 qianlu.theme 键。
 */
export default function SettingsPanel({
  triggerClassName,
}: {
  /** 透传给触发按钮，用于头部悬停在 Hero 上时切换浅色文字 */
  triggerClassName?: string;
}) {
  const config = useAppConfig();
  const { theme, setTheme } = useTheme();
  const [detecting, setDetecting] = useState(false);
  const storageUsable = isStorageUsable();

  const detection = getCachedDetection();

  const handleRedetect = async () => {
    setDetecting(true);
    clearDetectionCache();
    try {
      const fresh = await runDetection();
      if (config.mode === 'auto') {
        updateConfig({ effectiveMode: fresh.suggested });
      }
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName}
          aria-label="打开设置"
          title="设置"
        >
          <Gauge />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>所有更改立即生效，并保存在本机浏览器中。</DialogDescription>
        </DialogHeader>

        {!storageUsable && (
          <p className="rounded-btn border-clay/40 bg-clay/5 text-clay border px-3 py-2 text-xs">
            当前浏览器环境无法保存（隐私模式等），设置将仅在本会话生效。
          </p>
        )}

        <OptionRow
          legend="性能模式"
          name="mode"
          value={config.mode}
          options={MODE_OPTIONS}
          onChange={(value) => updateConfig({ mode: value as typeof config.mode })}
        />

        <OptionRow
          legend="资源分辨率"
          name="resolution"
          value={config.resolution}
          options={RESOLUTION_OPTIONS}
          onChange={(value) => updateConfig({ resolution: value as typeof config.resolution })}
        />

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-semibold">目标帧率</legend>
          <RadioGroup
            name="fps"
            value={String(config.fps)}
            onValueChange={(value) => updateConfig({ fps: Number(value) as typeof config.fps })}
            className="grid grid-cols-4 gap-2"
          >
            {FPS_CHOICES.map((fps) => (
              <label
                key={fps}
                className={cn(
                  'rounded-btn press:bg-ink/10 flex cursor-pointer flex-col items-center gap-1 border p-2.5 transition-colors',
                  config.fps === fps
                    ? 'border-clay/50 bg-clay/5'
                    : 'border-hairline hover:bg-ink/5',
                  'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-cream has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2'
                )}
              >
                <RadioGroupItem value={String(fps)} />
                <span className="text-ink text-sm font-medium">{fps}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-ink/65 mt-1.5 text-xs">
            若显示器刷新率低于所选档位，实际仍以显示器频率运行。
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-semibold">深色模式</legend>
          <RadioGroup
            name="theme"
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
            className="grid grid-cols-2 gap-2"
          >
            {(
              [
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'rounded-btn press:bg-ink/10 flex cursor-pointer items-center gap-2.5 border p-3 transition-colors',
                  theme === option.value
                    ? 'border-clay/50 bg-clay/5'
                    : 'border-hairline hover:bg-ink/5',
                  'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-cream has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2'
                )}
              >
                <RadioGroupItem value={option.value} />
                <span className="text-ink text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <OptionRow
          legend="配色性格"
          name="palette"
          value={config.palette}
          options={PALETTE_OPTIONS}
          columns={2}
          swatch
          onChange={(value) => updateConfig({ palette: value as PaletteSetting })}
        />
        <p className="text-ink/65 -mt-2 text-xs">
          配色性格会即时改变强调色、区块渐变与页脚；「高能猛进」为固定黑底，深浅模式观感一致。
        </p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-ink text-sm font-semibold">当前状态</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedetect}
              disabled={detecting}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RefreshCw className={cn('size-3', detecting && 'animate-spin')} />
              {detecting ? '检测中…' : '重新检测'}
            </Button>
          </div>
          <dl className="divide-hairline rounded-card border-hairline divide-y border px-4 py-1">
            <StatusRow term="当前性能档位">
              {MODE_LABEL[config.effectiveMode]}
              {config.mode === 'auto' ? '（自动）' : '（手动）'}
            </StatusRow>
            <StatusRow term="检测建议">
              {detection ? MODE_LABEL[detection.suggested] : '未检测'}
            </StatusRow>
            <StatusRow term="实时帧率">{config.rollingFps ?? '—'}</StatusRow>
            <StatusRow term="显示器刷新率">
              {config.actualScreenHz ? `${config.actualScreenHz} Hz` : '未知'}
            </StatusRow>
            <StatusRow term="当前加载分辨率">
              {config.effectiveResolution === '4k' ? '4K 档' : '2K 档'}
            </StatusRow>
            <StatusRow term="浏览器与平台">{describeBrowser()}</StatusRow>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
