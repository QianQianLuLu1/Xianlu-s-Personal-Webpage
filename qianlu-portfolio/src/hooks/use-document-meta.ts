import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** 首页标题与 meta 随语言即时刷新（详情页由 project-detail 自行管理并在卸载时恢复） */
export function useDocumentMeta(): void {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const title = t('meta.title');
    const description = t('meta.description');
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  }, [t, i18n.language]);
}
