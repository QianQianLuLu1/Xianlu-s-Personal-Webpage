/**
 * 开源项目数据模型与入口。
 *
 * 历史：本文件曾手写全部项目条目，核实于 2026-08-29。
 * 现状：条目由 scripts/sync-github-projects.mjs 从 GitHub REST API 联网生成
 * （见 src/data/projects.generated.ts + projects.meta.json），构建期经
 * src/lib/projects-merge.ts 与站内文案合并后导出。
 *
 * 这样做的原因：仓库改名 / 发版 / 技术栈升级是持续发生的，手写常量必然过期
 * （本次即发现 NikkiGallery 已改名 MeowStarMap、版本从 2.3.6 走到 2.5.6、
 * Electron 40 → 41.10 等）。构建期强制校验基线新鲜度（scripts/check-baseline-freshness.mjs），
 * 超过 24 小时未联网同步的产物不允许进入构建。
 *
 * 手动刷新：npm run github:sync -- --force
 */

import type { GeneratedProject } from '@/data/projects.generated';
import { PROJECTS } from '@/lib/projects-merge';

export { PROJECTS };

export type DownloadChannel = 'thunder' | 'baidu' | 'github' | 'qq';

export interface Project {
  /** 站内路由 id（稳定，不随仓库改名变化） */
  id: string;
  name: string;
  /** 已核实的最新版本号 */
  version: string | null;
  /** 一句话定位 */
  summary: string;
  /** 核心功能 */
  features: readonly string[];
  /** 适用场景 */
  useCases: readonly string[];
  /** 项目亮点 */
  highlights: readonly string[];
  /** 技术栈 / 运行形态（一句话） */
  tech: string;
  /** 运行平台；未声明时为 null，UI 不渲染 */
  platform: string | null;
  repoUrl: string;
  /** 下载渠道；提供时卡片渲染「下载」下拉按钮，未提供则不渲染 */
  downloads?: readonly { channel: DownloadChannel; url: string }[];
  cover: string;
  /** 开发语言（GitHub API language 字段） */
  language: string;
  /** 许可证（GitHub API license 字段） */
  license: string;
}

/** 供 project-details.ts 等模块引用同步数据的类型 */
export type { GeneratedProject };
