import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Projects from '@/features/projects';
import ProjectDetailPage from '@/pages/project-detail';

// jsdom 未实现 window.scrollTo（详情页挂载/切换时会调用），替换为静默桩
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  window.scrollTo = vi.fn();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>首页占位</p>} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectDetailPage', () => {
  it('渲染 FlashGaze 详情：标题、章节与 CV 维度表', () => {
    renderAt('/projects/flashgaze');

    expect(screen.getByRole('heading', { level: 1, name: 'FlashGaze' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '项目简介' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '工作原理' })).toBeInTheDocument();
    expect(screen.getByText('拉普拉斯方差，线性映射，上限 500 封顶')).toBeInTheDocument();

    // 无 Release：次级 CTA 为页内快速开始锚点（目录中也有同名锚点，取 href 校验）
    const quickStartLinks = screen.getAllByRole('link', { name: /快速开始/ });
    expect(quickStartLinks.some((link) => link.getAttribute('href') === '#quickstart')).toBe(true);

    // SEO 标题随项目切换
    expect(document.title).toContain('FlashGaze');
  });

  it('渲染 MeowStarMap 详情：章节、技术栈表与 Releases 入口', () => {
    renderAt('/projects/nikki-gallery');

    // 仓库已改名：展示名取自 GitHub 同步数据，路由 id 保持稳定
    expect(screen.getByRole('heading', { level: 1, name: 'MeowStarMap' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '功能总览' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '开发者指南' })).toBeInTheDocument();
    expect(screen.getByText('Electron 41.10')).toBeInTheDocument();
    expect(screen.getByText('Vite 6.4')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /获取安装包/ })).toHaveAttribute(
      'href',
      'https://github.com/QianQianLuLu1/MeowStarMap/releases'
    );
    expect(document.title).toContain('MeowStarMap');
  });

  it('页内目录与上一/下一项目导航指向正确', () => {
    renderAt('/projects/flashgaze');

    // 桌面端目录为锚点链接
    expect(screen.getAllByRole('link', { name: 'MCP Server' }).length).toBeGreaterThan(0);

    // 仅两个项目：prev/next 均指向 MeowStarMap（路由 id 仍为 nikki-gallery）
    const switches = screen.getAllByRole('link', { name: /MeowStarMap/ });
    expect(switches.some((link) => link.getAttribute('href') === '/projects/nikki-gallery')).toBe(
      true
    );
  });

  it('未知项目 id 重定向回首页', () => {
    renderAt('/projects/not-exist');

    expect(screen.getByText('首页占位')).toBeInTheDocument();
  });
});

describe('首页开源工具卡片', () => {
  it('每张卡片带有指向详情页的「查看详情」链接', () => {
    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    const detailLinks = screen.getAllByRole('link', { name: /查看详情/ });
    expect(detailLinks).toHaveLength(2);
    expect(detailLinks.map((link) => link.getAttribute('href')).sort()).toEqual([
      '/projects/flashgaze',
      '/projects/nikki-gallery',
    ]);
  });

  it('一级卡片保持精简：功能明细与 GitHub 入口由详情页承载', () => {
    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    // 重量内容只出现在二级详情页，首页卡片不再渲染
    for (const label of ['核心功能', '项目亮点', '适用场景', '技术栈']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: /在 GitHub 查看/ })).not.toBeInTheDocument();
  });
});
