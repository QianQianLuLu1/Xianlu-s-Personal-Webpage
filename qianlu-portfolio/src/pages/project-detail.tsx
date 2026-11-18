import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Code2,
  Download,
  Github,
  Monitor,
  Scale,
  Sparkles,
  Terminal,
} from 'lucide-react';

import Header from '@/components/navs/header.tsx';
import Footer from '@/components/navs/footer.tsx';
import ScrollToTop from '@/components/navs/scroll-to-top.tsx';
import DetailBlocks from '@/components/project/detail-blocks.tsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useImageLoaded } from '@/hooks/use-image-loaded';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { enterInView } from '@/lib/motion';
import { PROJECTS } from '@/data/projects';
import { PROJECT_DETAILS, isProjectId, type ProjectId } from '@/data/project-details';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/lib/press';

/** 入场动效统一参数（委托全站编排 enterInView；详情页区块阈值更低，进视口即触发） */
function sectionMotion(motionTier: 'full' | 'simple') {
  return enterInView(motionTier, { amount: 0.1 });
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();

  // 未知 id 一律回首页（纯静态托管下不存在服务端 404 页）
  if (!isProjectId(projectId)) return <Navigate to="/" replace />;

  return <ProjectDetailContent projectId={projectId} />;
}

function ProjectDetailContent({ projectId }: { projectId: ProjectId }) {
  const { t, i18n } = useTranslation(['detail', 'common']);
  const motionTier = useMotionTier();
  const project = PROJECTS.find((item) => item.id === projectId)!;
  const detail = PROJECT_DETAILS[projectId];
  const { ref: coverRef, loaded: coverLoaded, onLoad: coverOnLoad } = useImageLoaded();

  const [activeSection, setActiveSection] = useState(detail.sections[0]?.id ?? '');

  // 切换项目时回到页顶；behavior: 'instant' 覆盖全局 scroll-behavior: smooth，
  // 路由切换应是即时定位而非从上一页位置滚上去
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [projectId]);

  // SEO：标题与描述随项目 / 语言切换，卸载时恢复默认
  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('common:meta.projectTitle', { name: project.name });
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') ?? null;
    meta?.setAttribute(
      'content',
      t(project.summary, { ns: 'detail', defaultValue: project.summary })
    );
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== null) meta.setAttribute('content', previousDescription);
    };
  }, [project, t, i18n.language]);

  // 页内目录 scrollspy：高亮当前阅读章节（jsdom 无 IntersectionObserver 时跳过）
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      // 顶部让出固定导航栏的高度，底部提前换节
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    );
    for (const section of detail.sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [detail]);

  const currentIndex = PROJECTS.findIndex((item) => item.id === projectId);
  const prevProject = PROJECTS[(currentIndex + PROJECTS.length - 1) % PROJECTS.length];
  const nextProject = PROJECTS[(currentIndex + 1) % PROJECTS.length];
  const reveal = sectionMotion(motionTier);

  return (
    <div className="bg-cream min-h-screen">
      <Header />
      <main className="pt-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* 面包屑：首页 / 开源工具 / 项目名 */}
            <motion.nav
              aria-label={t('detail:chrome.breadcrumb')}
              className="text-ink/65 flex flex-wrap items-center gap-1 text-sm"
              {...reveal}
            >
              <Link
                to="/"
                className={cn('hover:text-clay rounded-btn transition-colors', FOCUS_RING_CLASS)}
              >
                {t('detail:chrome.home')}
              </Link>
              <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
              <Link
                to="/#tools"
                className={cn('hover:text-clay rounded-btn transition-colors', FOCUS_RING_CLASS)}
              >
                {t('detail:chrome.tools')}
              </Link>
              <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
              <span className="text-ink/80 font-medium">{project.name}</span>
            </motion.nav>

            {/* Hero：左侧信息 + 右侧封面 */}
            <motion.div
              className="mt-12 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
              {...reveal}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {project.version && <Badge variant="secondary">v{project.version}</Badge>}
                  <Badge variant="outline">
                    <Sparkles className="me-1 size-3" />
                    {t('detail:chrome.openSource')}
                  </Badge>
                  <Badge variant="outline">
                    <Scale className="me-1 size-3" />
                    {project.license}
                  </Badge>
                  <Badge variant="outline">
                    <Code2 className="me-1 size-3" />
                    {project.language}
                  </Badge>
                  {project.platform && (
                    <Badge variant="outline">
                      <Monitor className="me-1 size-3" />
                      {project.platform}
                    </Badge>
                  )}
                </div>
                <h1 className="text-ink mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  {project.name}
                </h1>
                <p className="text-ink/65 mt-3 leading-relaxed">{t(detail.tagline)}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                      <Github />
                      {t('detail:chrome.repo')}
                    </a>
                  </Button>
                  {detail.releaseUrl ? (
                    <Button asChild variant="outline">
                      <a href={detail.releaseUrl} target="_blank" rel="noopener noreferrer">
                        <Download />
                        {t('detail:chrome.getInstaller')}
                      </a>
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      {/* 页内锚点：全局 scroll-behavior: smooth 提供平滑滚动 */}
                      <a href="#quickstart">
                        <Terminal />
                        {t('detail:chrome.quickStart')}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <Card className="bg-cream overflow-hidden p-4">
                {/* 封面 + 骨架屏：加载前脉冲占位，加载后 500ms 淡入（与 GalleryCard 同一模式） */}
                <div className="bg-ink/5 rounded-card relative overflow-hidden">
                  {!coverLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
                  <span
                    className={cn(
                      'block transition-opacity duration-500 ease-out',
                      coverLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    <img
                      ref={coverRef}
                      onLoad={coverOnLoad}
                      src={project.cover}
                      alt={t('detail:chrome.coverAlt', { name: project.name })}
                      /* 固定比例容器内显式 object-cover（UI 细节规则 2）：不写 object-fit 时浏览器默认 fill，
                         图片比例会被容器接管，容器比例与原图不一致即拉伸失真。
                         与首页项目卡 features/projects.tsx 的封面同款写法（aspect-video + object-cover）。 */
                      className="aspect-video w-full object-cover"
                      decoding="async"
                    />
                  </span>
                </div>
              </Card>
            </motion.div>

            {/* 移动端章节导航：横向滚动 chips */}
            <nav
              aria-label={t('detail:chrome.tocAria')}
              className="border-hairline mt-10 flex gap-2 overflow-x-auto border-b pb-3 lg:hidden"
            >
              {detail.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    'border-hairline rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                    activeSection === section.id
                      ? 'bg-clay text-on-accent border-transparent font-medium'
                      : 'text-ink/60 hover:text-clay',
                    FOCUS_RING_CLASS
                  )}
                >
                  {t(section.title)}
                </a>
              ))}
            </nav>

            {/* 正文 + 桌面端固定目录 */}
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_200px]">
              <div className="min-w-0">
                {detail.sections.map((section, index) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    aria-label={t(section.title)}
                    className="border-hairline scroll-mt-24 pb-10"
                    {...reveal}
                  >
                    <h2 className="text-ink mb-5 flex items-center gap-3 text-2xl font-bold">
                      <span
                        aria-hidden="true"
                        className="bg-clay/10 text-clay flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      >
                        {index + 1}
                      </span>
                      {t(section.title)}
                    </h2>
                    <div className="space-y-5">
                      <DetailBlocks blocks={section.blocks} />
                    </div>
                  </motion.section>
                ))}
              </div>

              <aside className="hidden lg:block">
                <nav
                  aria-label={t('detail:chrome.tocAria')}
                  className="glass-tier2 glass-float rounded-card sticky top-24 p-4"
                >
                  <p className="text-ink/60 mb-2 text-xs font-semibold tracking-wide">
                    {t('detail:chrome.tocTitle')}
                  </p>
                  <ul className="space-y-1">
                    {detail.sections.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          aria-current={activeSection === section.id ? 'location' : undefined}
                          className={cn(
                            'block py-1 text-sm transition-colors',
                            activeSection === section.id
                              ? 'text-clay font-medium'
                              : 'text-ink/65 hover:text-ink',
                            FOCUS_RING_CLASS
                          )}
                        >
                          {t(section.title)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            </div>

            {/* 上一个 / 下一个项目 */}
            <nav
              aria-label={t('detail:chrome.projectNav')}
              className="border-hairline mt-6 grid gap-4 border-t pt-8 pb-16 sm:grid-cols-2"
            >
              <Link
                to={`/projects/${prevProject.id}`}
                className={cn(
                  'border-hairline hover:border-clay/40 hover:bg-ink/5 group rounded-card border p-5 transition-colors',
                  FOCUS_RING_CLASS
                )}
              >
                <p className="text-ink/60 flex items-center gap-1 text-xs">
                  <ArrowLeft aria-hidden="true" className="size-3.5 rtl:rotate-180" />
                  {t('detail:chrome.prev')}
                </p>
                <p className="text-ink group-hover:text-clay mt-1.5 font-semibold transition-colors">
                  {prevProject.name}
                </p>
                <p className="text-ink/65 mt-1 line-clamp-1 text-sm">
                  {t(prevProject.summary, { ns: 'detail', defaultValue: prevProject.summary })}
                </p>
              </Link>
              <Link
                to={`/projects/${nextProject.id}`}
                className={cn(
                  'border-hairline hover:border-clay/40 hover:bg-ink/5 group rounded-card border p-5 text-end transition-colors',
                  FOCUS_RING_CLASS
                )}
              >
                <p className="text-ink/60 flex items-center justify-end gap-1 text-xs">
                  {t('detail:chrome.next')}
                  <ArrowRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
                </p>
                <p className="text-ink group-hover:text-clay mt-1.5 font-semibold transition-colors">
                  {nextProject.name}
                </p>
                <p className="text-ink/65 mt-1 line-clamp-1 text-sm">
                  {t(nextProject.summary, { ns: 'detail', defaultValue: nextProject.summary })}
                </p>
              </Link>
            </nav>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
