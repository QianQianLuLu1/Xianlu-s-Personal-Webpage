/**
 * GitHub 同步数据（客观字段）。
 *
 * 正常由 scripts/sync-github-projects.mjs 联网生成；本文件为 2026-11-08 从
 * dist/assets/index-zcH8GVbu.js（构建于 2026-11-08T00:33+08:00）逐字提取的重建版，
 * 原始同步时间不可考（见 projects.meta.json）。网络恢复后请用 github:sync 重新生成。
 */

export interface GeneratedRelease {
  version: string;
  tag: string;
  url: string;
  publishedAt: string;
}

export interface GeneratedProject {
  /** GitHub 仓库名（小写标识） */
  id: string;
  /** 对应的站内稳定路由 id */
  fallbackId: string;
  name: string;
  displayName: string;
  alias: string | null;
  description: string | null;
  repoUrl: string;
  fullName: string;
  language: string | null;
  license: string | null;
  archived: boolean;
  pushedAt: string;
  release: GeneratedRelease | null;
}

export const GENERATED_PROJECTS: readonly GeneratedProject[] = [
  {
    id: 'meowstarmap',
    fallbackId: 'nikki-gallery',
    name: 'MeowStarMap',
    displayName: '喵星图',
    alias: '暖暖相册 / NikkiGallery',
    description:
      '喵星图是面向《无限暖暖》打造的专属轻量化专业桌面媒体管理工具。NyanMap is a dedicated, lightweight, professional desktop media management tool designed for Infinity Nikki.',
    repoUrl: 'https://github.com/QianQianLuLu1/MeowStarMap',
    fullName: 'QianQianLuLu1/MeowStarMap',
    language: 'TypeScript',
    license: 'MIT',
    archived: false,
    pushedAt: '2026-11-05T07:03:15Z',
    release: {
      version: '2.5.6',
      tag: 'MeowStarMap-Setup-2.5.6',
      url: 'https://github.com/QianQianLuLu1/MeowStarMap/releases/tag/MeowStarMap-Setup-2.5.6',
      publishedAt: '2026-11-04T04:25:41Z',
    },
  },
  {
    id: 'flashgaze',
    fallbackId: 'flashgaze',
    name: 'FlashGaze',
    displayName: '瞬选灵眸',
    alias: null,
    description: '瞬选灵眸（FlashGaze）— AI 辅助本地图像评分 CLI',
    repoUrl: 'https://github.com/QianQianLuLu1/FlashGaze',
    fullName: 'QianQianLuLu1/FlashGaze',
    language: 'Python',
    license: 'MIT',
    archived: false,
    pushedAt: '2026-11-06T23:56:32Z',
    release: null,
  },
];