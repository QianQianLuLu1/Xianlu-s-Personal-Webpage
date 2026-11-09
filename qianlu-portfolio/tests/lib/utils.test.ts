import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('工具函数 cn()', () => {
  it('应合并多个 className', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('应过滤假值', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('tailwind-merge 应保留冲突类的后者', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
