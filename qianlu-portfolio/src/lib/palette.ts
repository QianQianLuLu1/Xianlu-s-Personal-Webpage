import { PALETTE_CHOICES, type PaletteSetting } from '@/lib/settings';

const PALETTE_CLASSES = PALETTE_CHOICES.map((palette) => `palette-${palette}`);

/** 幂等切换 <html> 的 palette-* class，不影响 dark 等其他根类。 */
export function applyPalette(palette: PaletteSetting): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const className of PALETTE_CLASSES) {
    root.classList.toggle(className, className === `palette-${palette}`);
  }
}
