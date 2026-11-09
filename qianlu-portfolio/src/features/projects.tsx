import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Download, Github, HardDrive, MessageCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyIllustration, EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useImageLoaded } from '@/hooks/use-image-loaded';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { enterInView } from '@/lib/motion';
import { PROJECTS, type Project } from '@/data/projects';
import { cn } from '@/lib/utils';

const DOWNLOAD_ICONS: Record<string, typeof Github> = {
  迅雷下载: HardDrive,
  百度下载: HardDrive,
  'Github 下载': Github,
  'QQ 下载': MessageCircle,
};

/** 封面图 + 骨架屏：加载前按 16/9 脉冲占位，加载后 500ms 淡入（与 GalleryCard 同一模式） */
function ProjectCover({ project }: { project: Project }) {
  const { ref, loaded, onLoad } = useImageLoaded();

  return (
    <div className="bg-cream flex items-center justify-center p-8">
      <Link
        to={`/projects/${project.id}`}
        aria-label={`查看 ${project.name} 详情`}
        className="bg-ink/5 rounded-card relative block w-full overflow-hidden"
      >
        {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
        <span
          className={cn(
            'block transition-opacity duration-500 ease-out',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        >
          <img
            ref={ref}
            onLoad={onLoad}
            src={project.cover}
            alt={`${project.name} 封面`}
            className="aspect-video w-full object-cover transition-opacity hover:opacity-85"
            loading="lazy"
            decoding="async"
          />
        </span>
      </Link>
    </div>
  );
}

export default function Projects() {
  const motionTier = useMotionTier();

  return (
    <section id="tools" className="section-band bg-cream scroll-mt-19 py-28 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center sm:mb-24">
            <h2 className="text-ink text-title mb-4 font-semibold">开源工具</h2>
            <p className="text-ink/65 text-lead mx-auto max-w-2xl text-balance">
              把「暖暖玩家」和「不懂计算机」之间的等号，一点点擦掉
            </p>
          </div>

          {PROJECTS.length === 0 ? (
            <EmptyState
              illustration={<EmptyIllustration />}
              className="glass-tier2 glass-float rounded-card"
              title="开源工具整理中"
              description="工具列表暂时空着，可能正在准备上架，稍后再来看看。"
            />
          ) : (
            <div className="grid gap-10">
              {PROJECTS.map((project) => {
                const meta = [project.platform, project.language, project.license]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <motion.div key={project.id} {...enterInView(motionTier)}>
                    <Card
                      className={
                        'card-lift ease-spring overflow-hidden transition-[transform,box-shadow,border-color] duration-300'
                      }
                    >
                      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <ProjectCover project={project} />

                        <div className="flex flex-col justify-center">
                          <CardHeader>
                            <div className="mb-2 flex flex-wrap items-baseline gap-2">
                              <CardTitle className="text-2xl">
                                <Link
                                  to={`/projects/${project.id}`}
                                  className="hover:text-clay transition-colors"
                                >
                                  {project.name}
                                </Link>
                              </CardTitle>
                              {project.version && (
                                <Badge variant="secondary" className="py-0 leading-none">
                                  v{project.version}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-base leading-relaxed">
                              {project.summary}
                            </CardDescription>
                          </CardHeader>

                          <CardContent>
                            <p className="text-ink/65 text-sm">{meta}</p>

                            {/* 查看详情进二级页面；下载等更多入口由详情页承载 */}
                            <div className="mt-6 flex flex-wrap gap-3">
                              <Button asChild>
                                <Link to={`/projects/${project.id}`}>
                                  查看详情
                                  <ArrowRight />
                                </Link>
                              </Button>
                              {project.downloads && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button aria-label={`下载 ${project.name}`} variant="outline">
                                      <Download />
                                      下载
                                      <ChevronDown />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {project.downloads.map((item) => {
                                      const Icon = DOWNLOAD_ICONS[item.label] ?? Download;
                                      return (
                                        <DropdownMenuItem key={item.url} asChild>
                                          <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <Icon />
                                            {item.label}
                                          </a>
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
