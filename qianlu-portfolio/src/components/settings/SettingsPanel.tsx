import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

const MODE_OPTIONS = [{ value: 'auto' }, { value: 'full' }, { value: 'compat' }] as const;

const RESOLUTION_OPTIONS = [{ value: 'auto' }, { value: '2k' }, { value: '4k' }] as const;

const PALETTE_OPTIONS = [
  { value: 'air' },
  { value: 'vivid' },
  { value: 'spectrum' },
  { value: 'deep' },
] as const;

function describeBrowser(t: (key: string) => string): string {
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
            : t('status.unknownBrowser');
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
            : t('status.unknownOs');
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
  const { t } = useTranslation('settings');
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
          aria-label={t('trigger.open')}
          title={t('trigger.title')}
        >
          <Gauge />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {!storageUsable && (
          <p className="rounded-btn border-clay/40 bg-clay/5 text-clay border px-3 py-2 text-xs">
            {t('storageWarning')}
          </p>
        )}

        <OptionRow
          legend={t('mode.legend')}
          name="mode"
          value={config.mode}
          options={MODE_OPTIONS.map((option) => ({
            value: option.value,
            label: t(`mode.${option.value}.label`),
            hint: t(`mode.${option.value}.hint`),
          }))}
          onChange={(value) => updateConfig({ mode: value as typeof config.mode })}
        />

        <OptionRow
          legend={t('resolution.legend')}
          name="resolution"
          value={config.resolution}
          options={RESOLUTION_OPTIONS.map((option) => ({
            value: option.value,
            label: t(`resolution.${option.value}.label`),
            hint: t(`resolution.${option.value}.hint`),
          }))}
          onChange={(value) => updateConfig({ resolution: value as typeof config.resolution })}
        />

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-semibold">{t('fps.legend')}</legend>
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
          <p className="text-ink/65 mt-1.5 text-xs">{t('fps.note')}</p>
        </fieldset>

        <fieldset>
          <legend className="text-ink mb-2 text-sm font-semibold">{t('theme.legend')}</legend>
          <RadioGroup
            name="theme"
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
            className="grid grid-cols-2 gap-2"
          >
            {([{ value: 'light' }, { value: 'dark' }] as const).map((option) => (
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
                <span className="text-ink text-sm font-medium">{t(`theme.${option.value}`)}</span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <OptionRow
          legend={t('palette.legend')}
          name="palette"
          value={config.palette}
          options={PALETTE_OPTIONS.map((option) => ({
            value: option.value,
            label: t(`palette.${option.value}.label`),
            hint: t(`palette.${option.value}.hint`),
          }))}
          columns={2}
          swatch
          onChange={(value) => updateConfig({ palette: value as PaletteSetting })}
        />
        <p className="text-ink/65 -mt-2 text-xs">{t('palette.note')}</p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-ink text-sm font-semibold">{t('status.title')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedetect}
              disabled={detecting}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RefreshCw className={cn('size-3', detecting && 'animate-spin')} />
              {detecting ? t('status.detecting') : t('status.redetect')}
            </Button>
          </div>
          <dl className="divide-hairline rounded-card border-hairline divide-y border px-4 py-1">
            <StatusRow term={t('status.tier')}>
              {t(`mode.${config.effectiveMode}.label`)}
              {config.mode === 'auto' ? t('status.autoSuffix') : t('status.manualSuffix')}
            </StatusRow>
            <StatusRow term={t('status.suggestion')}>
              {detection ? t(`mode.${detection.suggested}.label`) : t('status.notDetected')}
            </StatusRow>
            <StatusRow term={t('status.fps')}>{config.rollingFps ?? '—'}</StatusRow>
            <StatusRow term={t('status.refreshRate')}>
              {config.actualScreenHz ? `${config.actualScreenHz} Hz` : t('status.unknown')}
            </StatusRow>
            <StatusRow term={t('status.resolution')}>
              {config.effectiveResolution === '4k' ? t('status.res4k') : t('status.res2k')}
            </StatusRow>
            <StatusRow term={t('status.browser')}>{describeBrowser(t)}</StatusRow>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
