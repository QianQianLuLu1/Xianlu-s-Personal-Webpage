import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ImageDown } from 'lucide-react';

import SpotlightCanvas from '@/components/canvas/SpotlightCanvas';
import AuroraBackground from '@/components/background/AuroraBackground';
import FloatingShapes from '@/components/background/FloatingShapes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SOCIAL_ICONS } from '@/components/icons/social-icon-map';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { useAppConfig } from '@/hooks/use-settings';
import { DUR_FAST, DUR_SLOW, EASE_ENTER, SPRING_INTERACT } from '@/lib/motion';
import { FOCUS_RING_CLASS, PRESS_CLASS, useKbPressProps } from '@/lib/press';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS } from '@/data/social';

function scrollToSection(href: string) {
  const element = document.querySelector(href);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

export default function Hero() {
  const motionTier = useMotionTier();
  const { effectiveMode } = useAppConfig();
  const kb = useKbPressProps();
  const [spotlightActive, setSpotlightActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // 镜头推进：滚动离开 Hero 途中背景整体 scale 1→1.15 + 轻微模糊。
  // 与计划单次 800ms 补间不同，这里用 scrub 跟随滚动进度，视觉意图一致且更顺滑；
  // 兼容模式 / reduced-motion 下不启用（§13.4）。
  // GSAP 体积可观（§2.5 JS 预算），连同 ScrollTrigger 动态加载。
  useEffect(() => {
    if (motionTier !== 'full') return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          gsap.fromTo(
            bgRef.current,
            { scale: 1, filter: 'blur(0px)' },
            {
              scale: 1.15,
              filter: 'blur(6px)',
              ease: 'none',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top top',
                end: 'bottom 20%',
                scrub: true,
              },
            }
          );
        }, sectionRef);
        revert = () => ctx.revert();
      }
    );

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [motionTier]);

  // 兼容模式退化为纯 opacity 快速淡入（§13.2 hero-text-fadein）
  const enter = (delay = 0) =>
    motionTier === 'full'
      ? {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: DUR_SLOW, delay, ease: EASE_ENTER },
        }
      : {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: DUR_FAST, delay },
        };

  return (
    <section
      id="home"
      ref={sectionRef}
      onMouseEnter={() => setSpotlightActive(true)}
      onMouseLeave={() => setSpotlightActive(false)}
      className="hero-stage bg-cream relative isolate flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* 背景层：纯代码生成的极光渐变 + 漂浮几何（不含任何图片）。
          isolate 让 -z-10 层留在本 section 的层叠上下文内，
          避免逃逸到根层叠上下文后被页面底色(bg-cream)盖住。 */}
      <div ref={bgRef} className="absolute inset-0 -z-10 will-change-transform">
        <AuroraBackground />
        <FloatingShapes />
        {/* 超大背景字：仅提供英文节奏，不参与语义与交互 */}
        <span
          aria-hidden="true"
          className="text-ink/[0.03] pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(4rem,16vw,16rem)] font-bold tracking-[-0.06em] whitespace-nowrap uppercase select-none"
        >
          QIANLU
        </span>
      </div>

      {/* 鼠标跟随光斑：仅完整动效模式挂载（§13.4），CSS 控制 500ms 渐入渐出 */}
      {motionTier === 'full' && effectiveMode === 'full' && (
        <SpotlightCanvas active={spotlightActive} />
      )}

      <div className="relative container mx-auto px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...enter(0)}>
            <Badge variant="secondary" className="bg-clay/10 text-clay mb-8">
              全网同名
            </Badge>
          </motion.div>

          <motion.h1
            {...enter(0.1)}
            className="text-gradient text-display mb-6 pb-[0.06em] font-bold text-balance"
          >
            纤璐不会玩摄影
          </motion.h1>

          <motion.p {...enter(0.2)} className="text-ink/85 text-lead mb-5 font-medium text-balance">
            在搭配师的世界里，顺手把计算机调教明白
          </motion.p>

          <motion.p
            {...enter(0.3)}
            className="text-ink/70 mx-auto mb-12 max-w-2xl text-base leading-relaxed text-balance sm:text-lg"
          >
            消解「暖暖玩家」与「不懂计算机」之间的刻板等号
          </motion.p>

          <motion.div
            {...(motionTier === 'full'
              ? {
                  initial: { opacity: 0, scale: 0.92 },
                  animate: { opacity: 1, scale: 1 },
                  // CTA 弹性入场：spring 回弹落位（EASE_POP 的 tween 已由 spring 取代）
                  transition: { delay: 0.3, ...SPRING_INTERACT },
                }
              : enter(0.3))}
            className="mb-14 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Button size="lg" onClick={() => scrollToSection('#tools')}>
              浏览开源工具
              <ArrowDown />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('#gallery')}
              className="border-ink/40 text-ink hover:bg-ink/5 hover:text-ink bg-transparent"
            >
              <ImageDown />
              查看摄影作品
            </Button>
          </motion.div>

          <motion.div {...enter(0.45)} className="flex items-center justify-center gap-1">
            {SOCIAL_LINKS.map((link) => {
              const Icon = SOCIAL_ICONS[link.id];
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  aria-label={link.label}
                  {...kb}
                  className={cn(
                    'text-ink/70 hover:bg-ink/5 hover:text-clay rounded-full p-3 transition-colors',
                    PRESS_CLASS,
                    FOCUS_RING_CLASS
                  )}
                >
                  <Icon className="size-5" />
                </a>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
