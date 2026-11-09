import { motion } from 'framer-motion';
import { Camera, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SOCIAL_ICONS } from '@/components/icons/social-icon-map';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { enterInView } from '@/lib/motion';
import { SOCIAL_LINKS } from '@/data/social';

const INTERESTS = ['人像摄影', '夜景', '无限暖暖', 'PC 画质与帧率优化', '开源工具', '计算机科普'];

export default function About() {
  const motionTier = useMotionTier();

  return (
    <section id="about" className="bg-cream scroll-mt-19 py-28 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center sm:mb-24">
            <h2 className="text-ink text-title mb-4 font-semibold">关于</h2>
            <p className="text-ink/65 text-lead mx-auto max-w-2xl text-balance">
              消解「暖暖玩家」与「不懂计算机」之间的刻板等号
            </p>
          </div>

          <motion.div
            {...enterInView(motionTier)}
            className="grid items-start gap-12 lg:grid-cols-2"
          >
            <div className="space-y-8">
              <div>
                <h3 className="text-ink mb-4 flex items-center text-2xl font-semibold">
                  <Camera className="text-clay mr-2 size-6" />
                  我是谁
                </h3>
                <p className="text-ink/70 mb-4 leading-relaxed">
                  {'我是纤璐，全网同名'}
                  <span className="text-gradient-strong font-semibold">「纤璐不会玩摄影」</span>
                  {'——一个用镜头收藏温度、用代码整理灵感的独立创作者。平时拍照，也写代码。'}
                </p>
                <p className="text-ink/70 mb-4 leading-relaxed">
                  在搭配师的世界里做轻量计算机科普：把无限暖暖的画质、帧率、闪退这些事，
                  拆成一步步能照着做的设置，发在 B 站、小红书等平台。
                </p>
                <p className="text-ink/70 leading-relaxed">
                  后来干脆把经验做成了开源工具：Nikki Gallery
                  替玩家把散落的游戏截图与录像管成一本本地相册，FlashGaze 用 AI
                  在本机批量给照片打分——与其每次都从头教一遍，不如让它们自己跑起来。
                </p>
              </div>

              <div>
                <h4 className="text-ink mb-3 flex items-center font-semibold">
                  <Wrench className="text-pine mr-2 size-5" />
                  在做的事
                </h4>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Card className="card-lift ease-spring transition-[transform,box-shadow,border-color] duration-300">
              <CardContent className="pt-8">
                <h3 className="text-ink mb-1 text-xl font-semibold">全网同名：纤璐不会玩摄影</h3>
                <p className="text-ink/65 mb-6 text-sm">在下面这些地方也能找到我</p>

                <div className="space-y-2">
                  {SOCIAL_LINKS.map((link) => {
                    const Icon = SOCIAL_ICONS[link.id];
                    return (
                      <Button
                        key={link.id}
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Icon className="text-clay size-5" />
                          <span className="font-medium">{link.label}</span>
                          <span className="text-ink/70 ml-auto text-xs">{link.handle}</span>
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
