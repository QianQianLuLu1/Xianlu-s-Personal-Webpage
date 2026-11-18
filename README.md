# 纤璐不会玩摄影 · 个人网站工作区

> 「用镜头收藏温度,用代码整理灵感」

本文件位于仓库根目录（git 仓库根），说明整个工作区。仓库根的 `package.json` 是纯命令转发层，不含任何依赖；实际的网站应用在 [`qianlu-portfolio/`](qianlu-portfolio/)，应用级的详细说明见 [`qianlu-portfolio/README.md`](qianlu-portfolio/README.md)。

## 项目简介与定位

「纤璐不会玩摄影」的个人品牌官方网站，一个中文单页 React 静态站（无 SSR、无后端），内容涵盖摄影作品、计算机科普与开源工具，面向摄影学习者与关注开源工具的开发者。页面标题与站点描述见 `qianlu-portfolio/index.html`，站点定位见 `qianlu-portfolio/README.md`。

## 功能与现状

- 首页区块：首页、开源工具、摄影之路、作品集、关于（`qianlu-portfolio/src/components/navs/header.tsx`）。
- 两条路由：`/` 与 `/projects/:projectId`，详情页 id 为 `flashgaze`、`nikki-gallery`（`qianlu-portfolio/src/App.tsx`、`qianlu-portfolio/src/data/project-details.ts`）。
- 「开源工具」专区的客观字段由 `qianlu-portfolio/src/data/projects.generated.ts` 承载，GitHub 不可达时回退到 `qianlu-portfolio/src/data/projects.fallback.ts`；当前基线为 2026-11-08 从历史构建产物逐字重建的版本（`qianlu-portfolio/src/data/projects.meta.json` 标记 `reconstructed=true`）。联网同步脚本 `qianlu-portfolio/scripts/sync-github-projects.mjs` 未随工作区恢复，`npm run github:sync` 暂不可用；构建期新鲜度门 `qianlu-portfolio/scripts/check-baseline-freshness.mjs` 仍有效：`degraded`、超 24 小时未刷新与重建基线默认拒绝构建，重建基线须以 `QIANLU_ACCEPT_RECONSTRUCTED_BASELINE=1` 显式放行。细节见 `qianlu-portfolio/README.md` 的「GitHub 专区数据同步」。
- 站点公开的社交渠道见 `qianlu-portfolio/src/data/social.ts`。
- 现状：`qianlu-portfolio/tests/` 有 Vitest 用例；`qianlu-portfolio/` 下当前无 `dist/` 构建产物，需要时以 `npm run build` 重出（当前基线须放行，见上条）。构建为纯静态托管，`qianlu-portfolio/vite.config.ts` 在构建后把 `dist/index.html` 复制为 `dist/404.html`，以支持 SPA 直达与刷新。（`dist/` 为本地构建产物，已忽略）
- 部署状态：目前暂无正式部署平台；仓库内无 CI 配置。

## 使用与运行方式

包管理器为 npm（依据 `qianlu-portfolio/package-lock.json`，lockfileVersion 3）。命令可在仓库根直接执行，根层脚本只是转发到 `qianlu-portfolio/`，退出码原样返回。

> 安装依赖：在仓库根执行 `npm run bootstrap`，或在 `qianlu-portfolio/` 内执行 `npm install`。
> **不要在仓库根直接 `npm install`**：根目录没有依赖清单，误装只会产生一个无意义的根 `node_modules`。

```bash
npm run dev        # vite，http://localhost:5173
npm run build      # 校验基线新鲜度 + tsc -b + vite build，产出 qianlu-portfolio/dist/
                   # （当前基线为重建版，须以 QIANLU_ACCEPT_RECONSTRUCTED_BASELINE=1 放行）
npm run preview    # vite preview，本地预览构建产物
npm test           # vitest run
npm run lint       # eslint .
npm run typecheck  # tsc -b --noEmit
npm run format     # prettier --write
npm run audit:licenses           # 依赖许可证白名单审计
```

另有 `test:watch` 与 `assets:build` 两个脚本；新鲜度阈值可用 `GITHUB_SYNC_MAX_AGE_MS` 覆盖。`github:sync` 所依赖的同步脚本当前缺失、暂不可用（见 `qianlu-portfolio/README.md` 的 2026-11-08 重建基线说明）。完整命令清单见两个 `package.json`。

入口链：`qianlu-portfolio/index.html` → `qianlu-portfolio/src/main.tsx` → `qianlu-portfolio/src/App.tsx`；静态资源在 `qianlu-portfolio/public/`。

环境要求：Node.js `>=22.22.2`。该下限取自 `qianlu-portfolio/node_modules/` 中 202 条 `engines.node` 约束的公共可满足最小值，决定性约束为 `jsdom@30.0.1` 的 `^22.22.2 || ^24.15.0 || >=26.0.0`；两个 `package.json` 已用 `engines` 字段声明。仓库内无 `.nvmrc`、`.node-version`、`.tool-versions`、CI 或 Dockerfile 配置，也未声明 `packageManager`。（`node_modules/` 为本地依赖目录，已忽略）

## 技术要点与依赖说明

- React 19 + TypeScript 5.8
- Vite 6(纯静态构建)
- Tailwind CSS 4(CSS-first，无 tailwind.config.*)
- shadcn/ui 风格组件(Radix UI)、liquid-glass-react 1.1.1(毛玻璃表面)
- Framer Motion + GSAP + CSS Scroll-Driven Animations(动画三层)
- react-router-dom、lucide-react
- 测试与质量：Vitest 4 + jsdom、ESLint 9、Prettier 3

应用源码为 TypeScript（`qianlu-portfolio/src/` 下的 `.ts` / `.tsx`）；JavaScript 仅用于配置、`qianlu-portfolio/scripts/` 下的 `.mjs` 工具脚本，以及仓库根的验收脚本。完整依赖与脚本见 [`qianlu-portfolio/package.json`](qianlu-portfolio/package.json)，锁文件为 `qianlu-portfolio/package-lock.json`。两个 `package.json` 均已声明 `"license": "MIT"`（与 [`LICENSE`](LICENSE) 一致）与 `"engines": { "node": ">=22.22.2" }`；未声明 `packageManager` 等其它版本字段。

## 目录结构

仅列关键路径（相对于本文件所在目录）：

```
.
├── README.md                          # 本文件：工作区总览
├── LICENSE                            # MIT 许可证全文
├── .gitignore                         # 仓库根 Git 边界
├── .gitattributes                     # 换行策略
├── package.json                       # 命令转发层，无依赖
└── qianlu-portfolio/                  # 唯一的网站应用
    ├── README.md                      # 应用级说明
    ├── package.json / package-lock.json
    ├── index.html                     # HTML 入口
    ├── vite.config.ts / vitest.config.ts / tsconfig*.json
    ├── src/                           # 应用源码
    ├── public/                        # 静态资源(favicon.svg、photos/、projects/)
    ├── scripts/                       # 构建与数据同步脚本
    ├── tests/                         # Vitest 用例
    └── dist/                          # 构建产物(按需生成，已忽略)
```

## 更多说明

- 应用级说明（技术栈、GitHub 专区同步、质量检查、构建、致谢）：[`qianlu-portfolio/README.md`](qianlu-portfolio/README.md)
- `qianlu-portfolio/` 下的中文实施计划与验收报告为本地一次性产物，本轮已清理并在根 `.gitignore` 为 9 份登记精确忽略规则；下列文件名仅作历史索引，不随仓库分发：`qianlu-portfolio/全量GUI黑盒验收报告_2026-11-07.md`、`qianlu-portfolio/GitHub专区同步改造实施计划_2026-11-06.md`。

## 授权与联系方式

本项目采用 MIT License，完整条款见同目录的 [`LICENSE`](LICENSE)：

> Copyright (c) 2026 QianLu

应用级 `qianlu-portfolio/README.md` 的「许可证」章节同样标注 MIT。第三方模板与组件的致谢（geekpius/portfolio、rdev/liquid-glass-react、shadcn/ui、Lucide）见该文件「致谢」章节。

联系方式：邮箱 `45001634@qq.com`；GitHub 账号 [QianQianLuLu1](https://github.com/QianQianLuLu1)；哔哩哔哩 <https://b23.tv/vxdnlqI>；站点公开的社交渠道见 `qianlu-portfolio/src/data/social.ts`。

## 外部链接

- 仓库地址：<https://github.com/QianQianLuLu1/Xianlu-s-Personal-Webpage>（由项目所有者确认）。远端 LICENSE 与本仓库仅版权人一行不同，本仓库已按远端 `QianLu` 统一。
- 站点目前暂无正式部署平台与线上地址。
