import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/button';
import { useKbPressProps } from '@/lib/press';

/** 用原生 hook 挂到一个裸 button 上，验证键盘镜像行为本身 */
function ProbeButton() {
  return (
    <button {...useKbPressProps()} type="button">
      probe
    </button>
  );
}

describe('useKbPressProps（键盘按下态镜像）', () => {
  it('Enter 按下设置 data-kb-press，松开立即清除', () => {
    render(<ProbeButton />);
    const btn = screen.getByRole('button', { name: 'probe' });

    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn.dataset.kbPress).toBe('true');

    fireEvent.keyUp(btn, { key: 'Enter' });
    expect(btn.dataset.kbPress).toBeUndefined();
  });

  it('Space 按下同样生效', () => {
    render(<ProbeButton />);
    const btn = screen.getByRole('button', { name: 'probe' });

    fireEvent.keyDown(btn, { key: ' ' });
    expect(btn.dataset.kbPress).toBe('true');
    fireEvent.keyUp(btn, { key: ' ' });
    expect(btn.dataset.kbPress).toBeUndefined();
  });

  it('按键未松开但焦点丢失（Esc/切窗）时清除，不留持续态', () => {
    render(<ProbeButton />);
    const btn = screen.getByRole('button', { name: 'probe' });

    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.blur(btn);
    expect(btn.dataset.kbPress).toBeUndefined();
  });

  it('其它按键与组合键不触发', () => {
    render(<ProbeButton />);
    const btn = screen.getByRole('button', { name: 'probe' });

    fireEvent.keyDown(btn, { key: 'a' });
    expect(btn.dataset.kbPress).toBeUndefined();

    fireEvent.keyDown(btn, { key: 'Enter', ctrlKey: true });
    expect(btn.dataset.kbPress).toBeUndefined();
  });

  it('子元素冒泡的键盘事件不算按钮自身按下', () => {
    render(
      <button {...useKbPressProps()} type="button">
        <span id="child">x</span>
      </button>
    );
    const btn = screen.getByRole('button');
    const child = document.getElementById('child')!;

    fireEvent.keyDown(child, { key: 'Enter', bubbles: true });
    expect(btn.dataset.kbPress).toBeUndefined();
  });
});

describe('Button 按下态样式', () => {
  it('默认渲染的 <button> 带 press: 工具类与键盘镜像事件', () => {
    render(<Button>cta</Button>);
    const btn = screen.getByRole('button', { name: 'cta' });

    expect(btn.className).toContain('press:scale-[0.98]');
    expect(btn.className).toContain('press:brightness-95');

    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn.dataset.kbPress).toBe('true');
  });

  it('asChild 渲染的 <a> 同样获得 press 类与镜像行为（Radix Slot 合并）', () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.com">link-cta</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'link-cta' });

    expect(link.className).toContain('press:bg-ink/10');

    fireEvent.keyDown(link, { key: 'Enter' });
    expect(link.dataset.kbPress).toBe('true');
    fireEvent.keyUp(link, { key: 'Enter' });
    expect(link.dataset.kbPress).toBeUndefined();
  });
});
