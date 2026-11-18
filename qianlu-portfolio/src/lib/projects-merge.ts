/**
 * 同步数据与站内文案合并：客观字段取 generated（缺失时回退 fallback），
 * 一句话定位取 project-details 的 tagline。输出顺序按 PROJECT_DETAILS 键序，
 * 决定详情页「上一个 / 下一个项目」的次序。
 */
import { PROJECT_DETAILS, type ProjectDetail, type ProjectId } from '@/data/project-details';
import { FALLBACK_PROJECTS } from '@/data/projects.fallback';
import { GENERATED_PROJECTS, type GeneratedProject } from '@/data/projects.generated';
import type { Project } from '@/data/projects';

/** 站内稳定路由 id → GitHub 仓库标识（改名映射） */
const ROUTE_TO_REPO: Record<ProjectId, string> = {
  'nikki-gallery': 'meowstarmap',
  flashgaze: 'flashgaze',
};

const REPO_TO_ROUTE: Record<string, string> = Object.entries(ROUTE_TO_REPO).reduce(
  (acc, [routeId, repoId]) => {
    acc[repoId] = routeId;
    return acc;
  },
  {} as Record<string, string>
);

function toProject(gen: GeneratedProject, copy?: ProjectDetail): Project {
  return {
    id: REPO_TO_ROUTE[gen.id] ?? gen.id,
    name: gen.name,
    version: gen.release?.version ?? null,
    summary: copy?.tagline ?? gen.description ?? '',
    features: [],
    useCases: [],
    highlights: [],
    tech: '',
    platform: null,
    repoUrl: gen.repoUrl,
    downloads: gen.release ? [{ channel: 'github', url: gen.release.url }] : undefined,
    cover:
      REPO_TO_ROUTE[gen.id] === 'nikki-gallery'
        ? '/projects/nikki-cover.webp'
        : '/projects/flashgaze-cover.webp',
    language: gen.language ?? '—',
    license: gen.license ?? '—',
  };
}

function merge(
  generated: readonly GeneratedProject[],
  fallback: readonly GeneratedProject[]
): Project[] {
  const generatedById = new Map(generated.map((p) => [p.id, p]));
  const fallbackById = new Map(fallback.map((p) => [p.id, p]));
  return Object.entries(PROJECT_DETAILS).map(([routeId, copy]) => {
    const repoId = ROUTE_TO_REPO[routeId as ProjectId] ?? routeId;
    const gen = generatedById.get(repoId) ?? fallbackById.get(repoId);
    if (!gen)
      throw new Error(
        `Missing project data: ${routeId} (neither synced nor fallback entry exists)`
      );
    return toProject(gen, copy);
  });
}

export const PROJECTS: Project[] = merge(GENERATED_PROJECTS, FALLBACK_PROJECTS);
