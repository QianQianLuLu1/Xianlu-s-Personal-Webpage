import { useEffect, useState, type ReactNode } from 'react';
import LiquidGlass from 'liquid-glass-react';

import { useAppConfig } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import {
  GLASS_PRESETS,
  acquireTier1,
  releaseTier1,
  type GlassPresetName,
  type GlassTier,
} from '@/lib/tokens';

interface GlassSurfaceProps {
  /** 期望的表面等级。实际等级会因浏览器能力或实例上限自动降级 */
  level?: GlassTier;
  /** 1 级效果的参数档位 */
  preset?: GlassPresetName;
  cornerRadius?: number;
  padding?: string;
  /** 玻璃是否位于浅色背景之上，影响折射与阴影强度 */
  overLight?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 表面分层容器。
 *
 * 请求 1 级时会尝试挂载 liquid-glass-react；若浏览器不支持或 1 级实例
 * 已达上限，则自动降级为 2 级纯 CSS 毛玻璃。
 *
 * 关于 liquid-glass-react 的一个实现约束：该库会渲染 5 个并列兄弟节点
 * （1 个内容容器 + 4 个装饰层），装饰层的定位取自 `style.position/top/left`。
 * 若不显式指定，装饰层会退化为 `position: relative` 并挤占文档流。
 * 因此这里显式传入 position/top/left，并由 .glass-host 的 CSS 把装饰层
 * 强制归位到内容容器之上（见 index.css）。
 */
export default function GlassSurface({
  level = 1,
  preset = 'strong',
  cornerRadius = 16,
  padding = '8px 16px',
  overLight = false,
  className,
  children,
}: GlassSurfaceProps) {
  const { glassTier } = useAppConfig();
  // 兼容模式下所有 1 级实例统一切到简档（§4.3 步骤 5），仅保留磨砂
  const effectivePreset: GlassPresetName = glassTier === 'plain' ? 'plain' : preset;

  // 首帧一律按 2 级渲染，避免不支持时闪烁；挂载后再升级到 1 级
  const [tier, setTier] = useState<GlassTier>(2);

  useEffect(() => {
    if (level !== 1) {
      setTier(2);
      return;
    }

    if (acquireTier1()) {
      setTier(1);
      return () => releaseTier1();
    }

    setTier(2);
    return;
  }, [level]);

  if (tier === 1) {
    return (
      <div className="glass-host relative inline-block">
        <LiquidGlass
          className={cn('glass-container', className)}
          mode="standard"
          {...GLASS_PRESETS[effectivePreset]}
          cornerRadius={cornerRadius}
          padding={padding}
          overLight={overLight}
          style={{ position: 'relative', top: 0, left: 0 }}
        >
          {children}
        </LiquidGlass>
      </div>
    );
  }

  return (
    <div
      data-glass-tier="2"
      className={cn('glass-tier2', className)}
      style={{ borderRadius: `${cornerRadius}px`, padding }}
    >
      {children}
    </div>
  );
}
