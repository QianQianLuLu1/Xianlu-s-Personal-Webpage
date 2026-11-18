import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LanguageSwitcher, { LanguagePills } from '@/components/navs/language-switcher';
import i18n from '@/lib/i18n';

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('zh');
});

describe('LanguageSwitcher 桌面触发器', () => {
  it('渲染带本地化 aria-label 的触发按钮', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: '切换语言' })).toBeInTheDocument();
  });
});

describe('LanguagePills 移动端语言组', () => {
  it('展示六种语言的母语名', () => {
    render(<LanguagePills />);
    for (const name of ['中文', 'English', 'Français', 'Русский', 'Español', 'العربية']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('点击法语即时切换文案、持久化并回调收起菜单', async () => {
    let closed = false;
    render(<LanguagePills onSelect={() => (closed = true)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    await vi.waitFor(() => expect(i18n.language).toBe('fr'));
    expect(localStorage.getItem('qianlu.lang')).toBe('fr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(closed).toBe(true);
    expect(i18n.t('nav.home')).not.toBe('首页');
  });

  it('点击阿拉伯语切换为 RTL', async () => {
    render(<LanguagePills />);
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    await vi.waitFor(() => expect(i18n.language).toBe('ar'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
