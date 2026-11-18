import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGS, type Lang } from '@/lib/i18n';
import { FOCUS_RING_CLASS, PRESS_CLASS } from '@/lib/press';
import { cn } from '@/lib/utils';

/** 语言一律以母语自称显示，不随界面语言翻译 */
const LANG_NAMES: Record<Lang, string> = {
  zh: '中文',
  en: 'English',
  fr: 'Français',
  ru: 'Русский',
  es: 'Español',
  ar: 'العربية',
};

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={t('lang.switch')}
          title={t('lang.switch')}
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang}
            lang={lang}
            onClick={() => void i18n.changeLanguage(lang)}
            className={cn(i18n.language === lang && 'text-clay font-medium')}
          >
            <Check className={cn(i18n.language !== lang && 'opacity-0')} />
            {LANG_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 移动端汉堡菜单内的语言 pill 组：触控目标优于嵌套下拉 */
export function LanguagePills({ onSelect }: { onSelect?: () => void }) {
  const { t, i18n } = useTranslation();

  return (
    <div role="group" aria-label={t('lang.switch')} className="flex flex-wrap gap-1.5 px-3 py-2.5">
      {SUPPORTED_LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          onClick={() => {
            void i18n.changeLanguage(lang);
            onSelect?.();
          }}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            i18n.language === lang
              ? 'border-clay/50 bg-clay/10 text-clay'
              : 'border-hairline text-ink/70 hover:bg-ink/5',
            PRESS_CLASS,
            FOCUS_RING_CLASS
          )}
        >
          {LANG_NAMES[lang]}
        </button>
      ))}
    </div>
  );
}
