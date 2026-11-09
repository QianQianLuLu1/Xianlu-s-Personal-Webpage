import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GalleryCard from '@/components/gallery/GalleryCard';
import type { Photo } from '@/data/photos.generated';

const basePhoto: Photo = {
  id: 'photo-test',
  title: 'T1',
  width: 4000,
  height: 2500,
  sizes: {
    '4k': { avif: '/a-4k.avif', webp: '/a-4k.webp', pixelWidth: 3840, bytes: { avif: 1, webp: 1 } },
    '2k': { avif: '/a-2k.avif', webp: '/a-2k.webp', pixelWidth: 2560, bytes: { avif: 1, webp: 1 } },
  },
};

function renderCard(photo: Photo = basePhoto, onError = vi.fn()) {
  const view = render(<GalleryCard photo={photo} onOpen={() => {}} onError={onError} />);
  const img = view.container.querySelector('img') as HTMLImageElement;
  return { ...view, img, onError };
}

afterEach(() => {
  cleanup();
});

describe('GalleryCard 骨架屏与微交互', () => {
  it('加载完成前显示骨架，onLoad 后骨架退场、图片容器淡入', () => {
    const { container, img } = renderCard();

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    const fade = container.querySelector('[data-slot="photo-fade"]');
    expect(skeleton).not.toBeNull();
    expect(fade).toHaveClass('opacity-0');

    fireEvent.load(img);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(container.querySelector('[data-slot="photo-fade"]')).toHaveClass('opacity-100');
  });

  it('缓存图（img.complete 且解码成功）挂载即视为已加载，不闪骨架', () => {
    // 模拟命中缓存：在 ref 回调执行前把 complete 置为 true
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'complete'
    );
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get() {
        return true;
      },
    });
    const originalNaturalWidth = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'naturalWidth'
    );
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get() {
        return 2560;
      },
    });

    try {
      const { container } = render(
        <GalleryCard photo={basePhoto} onOpen={() => {}} onError={() => {}} />
      );

      expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
      expect(container.querySelector('[data-slot="photo-fade"]')).toHaveClass('opacity-100');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLImageElement.prototype, 'complete', originalDescriptor);
      }
      if (originalNaturalWidth) {
        Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', originalNaturalWidth);
      }
    }
  });

  it('按真实宽高比占位；元数据缺失时回退 4/5（参数校验）', () => {
    const { container } = renderCard();
    expect(container.querySelector('[data-slot="photo-frame"]')).toHaveStyle({
      aspectRatio: '4000 / 2500',
    });

    cleanup();

    const broken: Photo = { ...basePhoto, width: null, height: null };
    const { container: container2 } = renderCard(broken);
    expect(container2.querySelector('[data-slot="photo-frame"]')).toHaveStyle({
      aspectRatio: '4 / 5',
    });
  });

  it('加载失败触发 onError 回调，交由父级剔除', () => {
    const onError = vi.fn();
    const { img } = renderCard(basePhoto, onError);

    fireEvent.error(img);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
