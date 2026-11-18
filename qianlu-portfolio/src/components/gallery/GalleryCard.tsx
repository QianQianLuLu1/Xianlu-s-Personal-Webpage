import { useTranslation } from 'react-i18next';

import PhotoPicture from '@/components/photo-picture';
import { useImageLoaded } from '@/hooks/use-image-loaded';
import { useKbPressProps } from '@/lib/press';
import { cn } from '@/lib/utils';
import type { Photo } from '@/data/photos.generated';

interface GalleryCardProps {
  photo: Photo;
  onOpen: () => void;
  /** 图片加载失败时回调，由父级把该卡片移出网格 */
  onError: () => void;
}

export default function GalleryCard({ photo, onOpen, onError }: GalleryCardProps) {
  const { t } = useTranslation('home');
  const kb = useKbPressProps();
  const { ref, loaded, onLoad } = useImageLoaded();

  // 参数校验：元数据缺宽高（或非法）时按 4/5 竖幅回退，保证占位高度有效、不产生 NaN
  const aspectRatio =
    photo.width !== null && photo.height !== null && photo.width > 0 && photo.height > 0
      ? `${photo.width} / ${photo.height}`
      : '4 / 5';

  return (
    <button
      type="button"
      onClick={onOpen}
      {...kb}
      className={cn(
        'group card-lift rounded-card border-hairline bg-cream focus-visible:ring-ring focus-visible:ring-offset-cream mb-6 block w-full cursor-pointer break-inside-avoid overflow-hidden border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:mb-8',
        // 浮起与按压共用一条过渡，交互回弹走弹性令牌（§13.2）
        'ease-spring transition-[transform,box-shadow,border-color] duration-200'
      )}
      aria-label={t('gallery.cardAria', { title: photo.title })}
    >
      <span data-slot="photo-frame" className="relative block w-full" style={{ aspectRatio }}>
        {/* 加载完成前按真实宽高比显示骨架，避免空白等待与布局抖动；button 内只允许 phrasing 内容，故用 span 而非 Skeleton(div) */}
        {!loaded ? (
          <span
            data-slot="skeleton"
            aria-hidden="true"
            className="bg-ink/10 absolute inset-0 animate-pulse rounded-none"
          />
        ) : null}
        <span
          data-slot="photo-fade"
          className={cn(
            'absolute inset-0 block transition-opacity duration-500 ease-out',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <PhotoPicture
            photo={photo}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            imgRef={ref}
            onLoad={onLoad}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={onError}
          />
        </span>
      </span>
    </button>
  );
}
