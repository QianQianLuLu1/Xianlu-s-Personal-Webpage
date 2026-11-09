import type { ReactEventHandler, Ref } from 'react';

import { useAppConfig } from '@/hooks/use-settings';
import type { Photo } from '@/data/photos.generated';

interface PhotoPictureProps {
  photo: Photo;
  /** 提供给浏览器的布局宽度提示 */
  sizes?: string;
  className?: string;
  /** 装饰性图片传空字符串并配合 aria-hidden，避免读屏器播报无意义内容 */
  alt?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onError?: () => void;
  /** 图片成功解码后回调（配合骨架屏淡入） */
  onLoad?: ReactEventHandler<HTMLImageElement>;
  /** 透传到 <img> 的 ref，供缓存图 complete 兜底检测 */
  imgRef?: Ref<HTMLImageElement>;
}

/**
 * 摄影作品的响应式图片。
 *
 * 优先 AVIF，回退 WebP，最后回退 2K WebP 作为 src。
 * 4K/2K 双档通过 srcset 交给浏览器按视口与 DPR 自行选择；
 * 设置面板锁定 2K/4K 档时（§2.3）只提供对应一档，切换立即生效、无需刷新。
 */
export default function PhotoPicture({
  photo,
  sizes = '100vw',
  className,
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  onError,
  onLoad,
  imgRef,
}: PhotoPictureProps) {
  const { effectiveResolution } = useAppConfig();

  const fourK = photo.sizes['4k'];
  const twoK = photo.sizes['2k'];

  const lockedTier =
    effectiveResolution === '4k' ? fourK : effectiveResolution === '2k' ? twoK : null;

  // 源图不足 4K 时两档指向同一文件，srcset 去重避免浏览器重复下载
  const avifSet =
    lockedTier !== null
      ? `${lockedTier.avif} ${lockedTier.pixelWidth}w`
      : fourK.pixelWidth === twoK.pixelWidth
        ? `${twoK.avif} ${twoK.pixelWidth}w`
        : `${twoK.avif} ${twoK.pixelWidth}w, ${fourK.avif} ${fourK.pixelWidth}w`;

  const webpSet =
    lockedTier !== null
      ? `${lockedTier.webp} ${lockedTier.pixelWidth}w`
      : fourK.pixelWidth === twoK.pixelWidth
        ? `${twoK.webp} ${twoK.pixelWidth}w`
        : `${twoK.webp} ${twoK.pixelWidth}w, ${fourK.webp} ${fourK.pixelWidth}w`;

  return (
    <picture>
      <source type="image/avif" srcSet={avifSet} sizes={sizes} />
      <source type="image/webp" srcSet={webpSet} sizes={sizes} />
      <img
        ref={imgRef}
        src={twoK.webp}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        loading={loading}
        decoding={decoding}
        className={className}
        onError={onError}
        onLoad={onLoad}
        width={photo.width ?? undefined}
        height={photo.height ?? undefined}
      />
    </picture>
  );
}
