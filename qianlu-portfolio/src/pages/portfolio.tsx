import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import Header from '@/components/navs/header.tsx';
import Hero from '@/features/hero.tsx';
import Projects from '@/features/projects.tsx';
import Journey from '@/features/journey.tsx';
import Gallery from '@/features/gallery.tsx';
import About from '@/features/about.tsx';
import Footer from '@/components/navs/footer.tsx';
import ScrollToTop from '@/components/navs/scroll-to-top.tsx';

export default function Portfolio() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      // 从详情页返回首页等路由切换场景：即时回到页顶
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    // 等版面挂载完成后平滑滚动到锚点板块（header 导航从二级页回跳的场景）
    const timer = window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="bg-cream min-h-screen">
      <Header />
      <main>
        <Hero />
        <Projects />
        <Journey />
        <Gallery />
        <About />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
