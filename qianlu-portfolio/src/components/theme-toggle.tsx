import { Moon, Sun } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { DUR_FAST, EASE_SWAP } from '@/lib/motion';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const label = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {/* §13.2 theme-toggle-spin：切换时图标 180° 旋转入场（状态切换缓动令牌） */}
      <motion.span
        key={theme}
        initial={reduceMotion ? false : { rotate: isDark ? -180 : 180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: DUR_FAST, ease: EASE_SWAP }}
        className="flex"
      >
        {isDark ? <Moon /> : <Sun />}
      </motion.span>
    </Button>
  );
}
