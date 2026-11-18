import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import AnimatedNumber from '@/components/animated-number';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import PhotoPicture from '@/components/photo-picture';
import { useMotionTier } from '@/hooks/use-motion-tier';
import i18n from '@/lib/i18n';
import { DUR_FAST, SPRING_OVERLAY } from '@/lib/motion';
import type { Photo } from '@/data/photos.generated';

interface GalleryModalProps {
  photos: readonly Photo[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** 切换方向 → 入场位移的符号（§13.2 portfolio-modal-slide） */
type Direction = -1 | 1;

export default function GalleryModal({
  photos,
  activeIndex,
  onClose,
  onNavigate,
}: GalleryModalProps) {
  const { t } = useTranslation('home');
  const photo = activeIndex === null ? null : photos[activeIndex];
  const total = photos.length;
  const motionTier = useMotionTier();
  const [direction, setDirection] = useState<Direction>(1);

  const goPrev = () => {
    if (activeIndex === null || total === 0) return;
    setDirection(-1);
    onNavigate((activeIndex - 1 + total) % total);
  };

  const goNext = () => {
    if (activeIndex === null || total === 0) return;
    setDirection(1);
    onNavigate((activeIndex + 1) % total);
  };

  return (
    <Dialog open={photo !== null} onOpenChange={(open) => !open && onClose()}>
      {photo && (
        <DialogContent
          className="bg-cream max-h-[92vh] max-w-5xl overflow-y-auto p-4 sm:p-6"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') goPrev();
            if (event.key === 'ArrowRight') goNext();
          }}
        >
          <DialogTitle className="sr-only">
            {t('gallery.modalTitle', { title: photo.title })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('gallery.modalDesc', { current: (activeIndex ?? 0) + 1, total })}
          </DialogDescription>

          {/* mt-6 给右上角悬浮关闭钮（图标底缘 40px）让位，避免压住图片顶边 */}
          <div className="rounded-card bg-ink/5 mt-6 overflow-hidden">
            {/* key 随作品变化，左右切换时按方向弹入（spring 回弹）；兼容模式只做快速淡入 */}
            <motion.div
              key={photo.id}
              initial={
                motionTier === 'full'
                  ? { opacity: 0, x: 40 * direction * (i18n.dir() === 'rtl' ? -1 : 1) }
                  : { opacity: 0 }
              }
              animate={motionTier === 'full' ? { opacity: 1, x: 0 } : { opacity: 1 }}
              transition={motionTier === 'full' ? SPRING_OVERLAY : { duration: DUR_FAST }}
            >
              <PhotoPicture
                photo={photo}
                sizes="(min-width: 1024px) 80vw, 100vw"
                loading="eager"
                className="mx-auto max-h-[72vh] w-auto object-contain"
                alt={t('gallery.modalTitle', { title: photo.title })}
              />
            </motion.div>
          </div>

          {/* 控制条做成 2 级玻璃悬浮条；图片容器的 mt-6 关闭钮让位保持不变 */}
          <div className="glass-tier2 glass-float rounded-btn mt-3 flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-ink/60 text-sm">
              {photo.title} · {/* 翻页计数器：短滚动，从上一显示值续滚到新值并精确停住 */}
              <AnimatedNumber value={(activeIndex ?? 0) + 1} duration={0.4} /> /{' '}
              <AnimatedNumber value={total} duration={0.6} />
            </span>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} aria-label={t('gallery.prev')}>
                <ChevronLeft className="rtl:rotate-180" />
              </Button>
              <Button variant="outline" size="icon" onClick={goNext} aria-label={t('gallery.next')}>
                <ChevronRight className="rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
