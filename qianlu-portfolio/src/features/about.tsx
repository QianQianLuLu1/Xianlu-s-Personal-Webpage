import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { Camera, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SOCIAL_ICONS } from '@/components/icons/social-icon-map';
import { useMotionTier } from '@/hooks/use-motion-tier';
import { enterInView } from '@/lib/motion';
import { SOCIAL_LINKS } from '@/data/social';

const INTERESTS = ['portrait', 'night', 'nikki', 'pc', 'tools', 'cs'] as const;

export default function About() {
  const { t } = useTranslation('home');
  const motionTier = useMotionTier();

  return (
    <section id="about" className="bg-cream scroll-mt-19 py-28 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-20 text-center sm:mb-24">
            <h2 className="text-ink text-title mb-4 font-semibold">{t('about.title')}</h2>
            <p className="text-ink/65 text-lead mx-auto max-w-2xl text-balance">
              {t('about.lead')}
            </p>
          </div>

          <motion.div
            {...enterInView(motionTier)}
            className="grid items-start gap-12 lg:grid-cols-2"
          >
            <div className="space-y-8">
              <div>
                <h3 className="text-ink mb-4 flex items-center text-2xl font-semibold">
                  <Camera className="text-clay me-2 size-6" />
                  {t('about.whoTitle')}
                </h3>
                <p className="text-ink/70 mb-4 leading-relaxed">
                  <Trans
                    i18nKey="about.bio1"
                    ns="home"
                    components={{
                      brand: (
                        <span className="text-gradient-strong font-semibold">纤璐不会玩摄影</span>
                      ),
                    }}
                  />
                </p>
                <p className="text-ink/70 mb-4 leading-relaxed">{t('about.bio2')}</p>
                <p className="text-ink/70 leading-relaxed">{t('about.bio3')}</p>
              </div>

              <div>
                <h4 className="text-ink mb-3 flex items-center font-semibold">
                  <Wrench className="text-pine me-2 size-5" />
                  {t('about.doingTitle')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((item) => (
                    <Badge key={item} variant="secondary">
                      {t('about.interests.' + item)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Card className="card-lift ease-spring transition-[transform,box-shadow,border-color] duration-300">
              <CardContent className="pt-8">
                <h3 className="text-ink mb-1 text-xl font-semibold">{t('about.socialTitle')}</h3>
                <p className="text-ink/65 mb-6 text-sm">{t('about.socialSub')}</p>

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
                          <span className="font-medium">{t(link.label)}</span>
                          <span className="text-ink/70 ms-auto text-xs">{link.handle}</span>
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
