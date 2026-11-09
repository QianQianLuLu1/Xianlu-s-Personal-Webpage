import { useState, useEffect } from 'react';
import GlassSurface from '@/components/glass/GlassSurface';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Get the current scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // Get the total scrollable height
      const scrollHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      // Calculate the scroll percentage
      const scrollPercentage = (scrollTop / scrollHeight) * 100;

      // Show button when user has scrolled 80% of the page or more
      setIsVisible(scrollPercentage >= 80);
    };

    // Add scroll event listener
    window.addEventListener('scroll', toggleVisibility);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className={`fixed right-8 bottom-8 z-(--z-top) transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      {/* 1 级液态玻璃：全站唯一 1 级实例（≤3 契约），悬浮于内容之上最能体现
          折射质感；不支持的浏览器 / 兼容档由 GlassSurface 自动降级为 2 级 CSS 磨砂 */}
      <GlassSurface level={1} preset="soft" cornerRadius={24} padding="0px" className="glass-float">
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="回到顶部"
          className="text-ink group ease-spring grid size-12 cursor-pointer place-items-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <ArrowUp className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </button>
      </GlassSurface>
    </div>
  );
}
