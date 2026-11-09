import { motion } from 'framer-motion';
import { Aperture, Frame, Palette, Sun } from 'lucide-react';

import PhotoPicture from '@/components/photo-picture';
import AnimatedNumber from '@/components/animated-number';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';
import { useImageLoaded } from '@/hooks/use-image-loaded';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { DUR_SLOW, enterInView } from '@/lib/motion';
import { PHOTOS, type Photo } from '@/data/photos.generated';
import { JOURNEY_STAGES, type JourneyStage } from '@/data/journey';
import { cn } from '@/lib/utils';

const STAGE_ICONS: Record<JourneyStage['id'], typeof Aperture> = {
  gear: Aperture,
  composition: Frame,
  light: Sun,
  style: Palette,
};

/** 阶段配图 + 骨架屏：加载前按 4/3 脉冲占位，加载后 500ms 淡入（与 GalleryCard 同一模式） */
function StagePhoto({ photo, alt }: { photo: Photo; alt: string }) {
  const { ref, loaded, onLoad } = useImageLoaded();

  return (
    <div className="bg-ink/5 relative aspect-[4/3] w-full overflow-hidden">
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <span
        className={cn(
          'absolute inset-0 block transition-opacity duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      >
        <PhotoPicture
          photo={photo}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          alt={alt}
          imgRef={ref}
          onLoad={onLoad}
          className="h-full w-full object-cover"
        />
      </span>
    </div>
  );
}

export default function Journey() {
  const motionTier = useMotionTier();

  return (
    <section id="journey" className="bg-cream scroll-mt-19 py-28 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center sm:mb-24">
            <h2 className="text-ink text-title mb-4 font-semibold">摄影之路</h2>
            <p className="text-ink/65 text-lead mx-auto max-w-2xl text-balance">
              从摸清手里的设备，到拍出认得出是自己拍的片子
            </p>
          </div>

          {JOURNEY_STAGES.length === 0 ? (
            <EmptyState
              illustration={<EmptyIllustration />}
              className="glass-tier2 glass-float rounded-card"
              title="摄影之路筹备中"
              description="阶段内容暂未就位，稍后再来看看。"
            />
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {JOURNEY_STAGES.map((stage, index) => {
                const Icon = STAGE_ICONS[stage.id];
                // 阶段配图：作品集中的内容图，仅展示在卡片内部，不作背景
                const photo = PHOTOS.find((item) => item.id === stage.photoId);

                return (
                  <motion.div
                    key={stage.id}
                    {...enterInView(motionTier, { y: 24, delay: index * 0.1, duration: DUR_SLOW })}
                  >
                    <Card className="card-lift ease-spring bg-surface-muted h-full overflow-hidden shadow-none transition-[transform,box-shadow,border-color] duration-300">
                      {photo && <StagePhoto photo={photo} alt={stage.photoAlt} />}
                      {/* 顶距与侧距/底距同为 p-6，四边 padding 一致（UI 细节规则 7） */}
                      <CardContent className="pt-6">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="bg-pine/10 rounded-full p-3">
                            <Icon className="text-pine size-6" />
                          </div>
                          <span aria-hidden="true" className="text-clay/25 text-3xl font-bold">
                            {/* 展示型计数：进视口后 00→序号，减速停住 */}
                            <AnimatedNumber
                              value={stage.order}
                              format={(n) => String(Math.round(n)).padStart(2, '0')}
                            />
                          </span>
                        </div>
                        <h3 className="text-ink mb-2 text-xl font-semibold">{stage.title}</h3>
                        <p className="text-ink/70 text-sm leading-relaxed">{stage.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
