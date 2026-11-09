import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import GalleryCard from '@/components/gallery/GalleryCard';
import GalleryModal from '@/components/gallery/GalleryModal';
import AnimatedNumber from '@/components/animated-number';
import { Button } from '@/components/ui/button';
import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { DUR_BASE, enterInView } from '@/lib/motion';
import { PHOTOS, PHOTOS_META } from '@/data/photos.generated';

/** 卡片 stagger 间隔 30ms，masonry 下太靠后的卡片不再累加等待（§13.2） */
const STAGGER_STEP = 0.03;
const STAGGER_CAP = 0.3;

export default function Gallery() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const motionTier = useMotionTier();

  // 单张图 404 或解码失败时把该卡片移出网格，而不是留一个破图占位
  const visiblePhotos = PHOTOS.filter((photo) => !failedIds.includes(photo.id));

  const rawIndex = activeId ? visiblePhotos.findIndex((photo) => photo.id === activeId) : -1;
  const activeIndex = rawIndex >= 0 ? rawIndex : null;

  return (
    <section id="gallery" className="bg-surface-muted scroll-mt-19 py-28 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center sm:mb-24">
            <h2 className="text-ink text-title mb-4 font-semibold">作品集</h2>
            <p className="text-ink/65 text-lead mx-auto max-w-2xl text-balance">
              {/* 照片总数为展示型计数：进视口后滚动停住 */}
              <AnimatedNumber value={PHOTOS_META.count} />{' '}
              张照片，记录光、街区与那些还没想好标题的瞬间
            </p>
          </div>

          {visiblePhotos.length === 0 ? (
            <EmptyState
              illustration={<EmptyIllustration />}
              className="glass-tier2 glass-float rounded-card"
              title="照片还没就位"
              description="作品暂时没有加载出来，可能是网络波动，稍等片刻或刷新重试。"
              action={
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw aria-hidden="true" /> 刷新重试
                </Button>
              }
            />
          ) : (
            <div className="columns-1 gap-6 sm:columns-2 sm:gap-8 lg:columns-3 xl:columns-4">
              {visiblePhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  {...enterInView(motionTier, {
                    y: 24,
                    delay: Math.min(index * STAGGER_STEP, STAGGER_CAP),
                    duration: DUR_BASE,
                    amount: 0.2,
                  })}
                >
                  <GalleryCard
                    photo={photo}
                    onOpen={() => setActiveId(photo.id)}
                    onError={() =>
                      setFailedIds((current) =>
                        current.includes(photo.id) ? current : [...current, photo.id]
                      )
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <GalleryModal
        photos={visiblePhotos}
        activeIndex={activeIndex}
        onClose={() => setActiveId(null)}
        onNavigate={(index) => setActiveId(visiblePhotos[index]?.id ?? null)}
      />
    </section>
  );
}
