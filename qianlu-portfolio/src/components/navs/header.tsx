import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import GlassSurface from '@/components/glass/GlassSurface';
import ThemeToggle from '@/components/theme-toggle';
import SettingsPanel from '@/components/settings/SettingsPanel';
import LanguageSwitcher, { LanguagePills } from '@/components/navs/language-switcher';
import { FOCUS_RING_CLASS, PRESS_CLASS, useKbPressProps } from '@/lib/press';
import { cn } from '@/lib/utils';

/** 滚动超过该像素后导航栏切换为毛玻璃表面 */
const SCROLL_THRESHOLD = 80;

const NAV_ITEMS = [
  { href: '#home', label: 'nav.home' },
  { href: '#tools', label: 'nav.tools' },
  { href: '#journey', label: 'nav.journey' },
  { href: '#gallery', label: 'nav.gallery' },
  { href: '#about', label: 'nav.about' },
] as const;

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  // 暗色下 Hero 为黑底舞台，首页顶部导航需要反白；浅色下 Hero 是页面底色，
  // .hero-overlay 的反白覆盖仅在 .dark 生效（见 index.css），滚动后恢复页面底色
  const overHero = isHome && !isScrolled;
  // 键盘按下镜像：处理器按 currentTarget 生效，整组按钮共用一份
  const kb = useKbPressProps();
  const { t } = useTranslation();

  useEffect(() => {
    const syncScrolled = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    syncScrolled();
    window.addEventListener('scroll', syncScrolled, { passive: true });
    // 作品弹窗等锁滚容器开合不触发 scroll 事件，用轻量轮询兜底同步状态
    const poll = window.setInterval(syncScrolled, 300);
    return () => {
      window.removeEventListener('scroll', syncScrolled);
      window.clearInterval(poll);
    };
  }, []);

  const scrollToSection = (href: string) => {
    setIsMenuOpen(false);
    // 二级页面（如 /projects/*）没有首页锚点：先跳回首页，由首页按 hash 滚动到板块
    if (!isHome) {
      navigate(`/${href}`);
      return;
    }
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    if (!isHome) {
      navigate('/');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 暗色下 Hero 为黑底发布会舞台，首页顶部用 .hero-overlay 将品牌层反白
  // （该覆盖限定 .dark 生效，浅色首屏为页面底色无需反白）；
  // 滚动后移除该类，恢复页面底色的常规导航。

  const navLinks = (className: string) => (
    <nav className={className}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.href}
          onClick={() => scrollToSection(item.href)}
          {...kb}
          className={cn(
            'rounded-btn text-ink/70 hover:bg-ink/5 hover:text-clay cursor-pointer px-3 py-2 text-sm font-medium transition-colors',
            PRESS_CLASS,
            FOCUS_RING_CLASS
          )}
        >
          {t(item.label)}
        </button>
      ))}
    </nav>
  );

  return (
    <header
      className={cn(
        'fixed top-0 z-(--z-top) w-full transition-colors duration-200',
        overHero && 'hero-overlay',
        isScrolled && 'bg-cream/90 shadow-e1 backdrop-blur-md'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between gap-3 transition-[padding] duration-200 ${
            isScrolled ? 'py-2' : 'py-4'
          }`}
        >
          {/* 纯文字 logo：按下用“下沉+淡化”而非底色块，避免破坏无框外观 */}
          <button
            onClick={scrollToTop}
            {...kb}
            className={cn(
              'rounded-btn text-ink press:scale-[0.98] press:opacity-60 cursor-pointer text-lg font-bold whitespace-nowrap transition-[opacity,transform,scale] hover:opacity-70 sm:text-xl',
              FOCUS_RING_CLASS
            )}
          >
            纤璐不会玩摄影
          </button>

          {/* 桌面端：滚动后套毛玻璃胶囊，未滚动时保持透明。
              用 2 级 CSS 毛玻璃：1 级 liquid-glass 的装饰层会把内容整体
              顶高约 24px 导致胶囊顶部被视口裁切，2 级定位可靠。 */}
          <div className="hidden md:block">
            {isScrolled ? (
              <GlassSurface level={2} cornerRadius={999} padding="6px 8px">
                {navLinks('flex items-center gap-1')}
              </GlassSurface>
            ) : (
              navLinks('flex items-center gap-1')
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <SettingsPanel />
            <Button
              className="text-ink/70 hover:bg-ink/5 hover:text-ink bg-transparent md:hidden"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* 移动端下拉菜单：2 级毛玻璃浮层，与桌面端导航胶囊同一玻璃语言 */}
        {isMenuOpen && (
          <nav className="glass-tier2 glass-float rounded-card p-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                {...kb}
                className={cn(
                  'rounded-btn text-ink/80 hover:bg-ink/5 hover:text-clay block w-full cursor-pointer px-3 py-2.5 text-start text-sm font-medium transition-colors',
                  PRESS_CLASS,
                  FOCUS_RING_CLASS
                )}
              >
                {t(item.label)}
              </button>
            ))}
            <div className="border-hairline mt-1 border-t pt-1">
              <LanguagePills onSelect={() => setIsMenuOpen(false)} />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
