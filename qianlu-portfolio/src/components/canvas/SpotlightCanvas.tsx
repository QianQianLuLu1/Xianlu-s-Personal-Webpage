import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface SpotlightCanvasProps {
  /** 鼠标是否悬停在 Hero 内；控制光斑 500ms 渐入渐出（§13.3） */
  active: boolean;
  className?: string;
}

/**
 * Hero 鼠标跟随光斑（§11.5 / §2.4 第 5 项）。
 *
 * - 内部分辨率 = CSS 尺寸 × devicePixelRatio，不做降采样；
 * - 目标点按 0.12 系数缓动跟随，形成拖尾；
 * - 仅完整动效模式挂载（兼容模式由父级卸载），prefers-reduced-motion 时同样不启用；
 * - Hero 滚出视口后暂停绘制循环，回来再恢复，避免后台空转。
 */
export default function SpotlightCanvas({ active, className }: SpotlightCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let dpr = 1;
    let targetX = -1;
    let targetY = -1;
    let currentX = -1;
    let currentY = -1;
    let visible = true;

    /*
     * 光斑取色来自 index.css 的氛围令牌（浅色蓝/粉色晕、暗色白/亮蓝高光，
     * 随主题分档），消除 canvas 内的硬编码色值；令牌缺失时回退到与令牌
     * 相同的字面量，保证绘制不落空。
     */
    const readToken = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const readSpotlightTokens = () => ({
      coreRgb: readToken('--spotlight-core-rgb', '255 255 255'),
      coreAlpha: readToken('--spotlight-core-alpha', '0.14'),
      midRgb: readToken('--spotlight-mid-rgb', '57 143 254'),
      midAlpha: readToken('--spotlight-mid-alpha', '0.1'),
    });

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      // 首次移动直接落到指针位置，避免光斑从 (0,0) 飞过来
      if (currentX < 0) {
        currentX = targetX;
        currentY = targetY;
      }
    };

    const draw = () => {
      if (visible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;

        if (currentX >= 0) {
          // 每次实际绘制前重读令牌：主题切换（html.dark 翻转）后下一帧即取新色
          const { coreRgb, coreAlpha, midRgb, midAlpha } = readSpotlightTokens();
          const radius = 180 * dpr;
          const gradient = ctx.createRadialGradient(
            currentX * dpr,
            currentY * dpr,
            0,
            currentX * dpr,
            currentY * dpr,
            radius
          );
          gradient.addColorStop(0, `rgb(${coreRgb} / ${coreAlpha})`);
          gradient.addColorStop(0.5, `rgb(${midRgb} / ${midAlpha})`);
          gradient.addColorStop(1, `rgb(${coreRgb} / 0)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-500',
        active && 'opacity-100',
        className
      )}
    />
  );
}
