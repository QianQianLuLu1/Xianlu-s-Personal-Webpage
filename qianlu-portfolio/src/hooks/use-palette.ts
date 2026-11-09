import { useEffect } from 'react';

import { useAppConfig } from '@/hooks/use-settings';
import { applyPalette } from '@/lib/palette';

/** 把配色性格同步到 <html> 的 palette-* class，随设置面板即时换肤。 */
export function usePalette(): void {
  const { palette } = useAppConfig();
  useEffect(() => {
    applyPalette(palette);
  }, [palette]);
}
