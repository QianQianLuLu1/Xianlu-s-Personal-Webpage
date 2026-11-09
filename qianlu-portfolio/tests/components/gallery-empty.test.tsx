import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Gallery from '@/features/gallery';
import type { Photo } from '@/data/photos.generated';

// vi.mock 工厂会被提升到文件顶部，mock 数据必须经 vi.hoisted 一同提升
const { singlePhoto } = vi.hoisted(() => ({
  singlePhoto: {
    id: 'photo-mock',
    title: 'M1',
    width: 4000,
    height: 2500,
    sizes: {
      '4k': {
        avif: '/m-4k.avif',
        webp: '/m-4k.webp',
        pixelWidth: 3840,
        bytes: { avif: 1, webp: 1 },
      },
      '2k': {
        avif: '/m-2k.avif',
        webp: '/m-2k.webp',
        pixelWidth: 2560,
        bytes: { avif: 1, webp: 1 },
      },
    },
  },
})) as { singlePhoto: Photo };

// 空态与失败链路只依赖数据条目本身，用最小 mock 隔离生成文件
vi.mock('@/data/photos.generated', () => ({
  PHOTOS_META: { count: 1 },
  PHOTOS: [singlePhoto],
}));

afterEach(() => {
  cleanup();
});

describe('作品集空状态兜底', () => {
  it('有可展示照片时不出现空状态', () => {
    render(<Gallery />);

    expect(screen.queryByText('照片还没就位')).toBeNull();
    // 图片未加载前先显示骨架占位
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('全部照片加载失败时展示 EmptyState 引导', () => {
    render(<Gallery />);

    const img = document.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);

    expect(screen.getByText('照片还没就位')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷新重试/ })).toBeInTheDocument();
  });
});
