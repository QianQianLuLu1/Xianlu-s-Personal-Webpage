import { Trans, useTranslation } from 'react-i18next';

import { SOCIAL_ICONS } from '@/components/icons/social-icon-map';
import { FOCUS_RING_CLASS, PRESS_CLASS, useKbPressProps } from '@/lib/press';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS } from '@/data/social';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const kb = useKbPressProps();
  const { t } = useTranslation();

  return (
    <footer className="site-footer border-hairline border-t py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <p className="text-ink text-lg font-bold">纤璐不会玩摄影</p>

          <div className="flex items-center gap-1">
            {SOCIAL_LINKS.map((link) => {
              const Icon = SOCIAL_ICONS[link.id];
              const label = t(link.label, { ns: 'home' });
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  aria-label={label}
                  {...kb}
                  className={cn(
                    'footer-muted hover:bg-ink/5 hover:text-clay rounded-full p-2 transition-colors',
                    PRESS_CLASS,
                    FOCUS_RING_CLASS
                  )}
                >
                  <Icon className="size-5" />
                </a>
              );
            })}
          </div>

          <p className="footer-muted text-sm">{t('footer.copyright', { year: currentYear })}</p>

          <p className="footer-muted text-xs">
            <Trans
              i18nKey="footer.attribution"
              components={{
                1: (
                  <a
                    href="https://github.com/geekpius/portfolio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-clay focus-visible:ring-ring focus-visible:ring-offset-cream underline transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
