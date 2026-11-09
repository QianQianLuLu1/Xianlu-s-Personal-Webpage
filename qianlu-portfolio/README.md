# qianlu-portfolio · 纤璐不会玩摄影个人网站

> 「用镜头收藏温度,用代码整理灵感」

纤璐不会玩摄影的个人品牌官方网站(单页 React 静态站)。

## 技术栈

- React 19 + TypeScript 5.8
- Vite 6(纯静态构建)
- Tailwind CSS 4
- shadcn/ui 风格组件(Radix UI)
- liquid-glass-react 1.1.1(毛玻璃表面)
- Framer Motion + GSAP + CSS Scroll-Driven Animations(动画三层)

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

## GitHub 专区数据同步

「开源工具」专区的**客观字段**（项目名 / 仓库地址 / 版本 / 语言 / 许可证 / Release）
由构建脚本从 GitHub REST API 自动拉取，不再手工维护：

```bash
npm run github:sync -- --force   # 联网刷新 src/data/projects.generated.ts 与 projects.meta.json
```

- **自动同步**：脚本逐个查询 `QianQianLuLu1/{MeowStarMap,FlashGaze}`，
  取最新正式版 Release 推导版本号（跳过 draft / prerelease）。
- **构建期强制校验基线新鲜度**：`npm run build` 前会检查 `projects.meta.json`，
  数据超过 **24 小时**未刷新则拒绝构建，并提示执行 `github:sync`。
  （`npm run dev` 与 `npm run test` 不受此门限制，本地可离线开发。）
- **容错**：GitHub 不可达时回退到 `src/data/projects.fallback.ts` 的手写兜底，
  并在 meta 中标记 `degraded=true`，构建期同样会被新鲜度门拦截。
- **仓库改名处理**：展示名以 GitHub 仓库名为准（改名即生效），
  但详情页路由 id 保持稳定（`/projects/nikki-gallery` 仍可达）。

阈值可用环境变量覆盖（测试用）：`GITHUB_SYNC_MAX_AGE_MS=<毫秒>`。

> **2026-11-08 重建基线说明**：当晚源码拷贝不完整，`projects.generated.ts` / `projects.fallback.ts` /
> `projects.meta.json` 等丢失，已从当日 `dist/assets/index-zcH8GVbu.js` 逐字重建（保真经 dev vs dist
> 截图像素 diff 0% 验证，见 `界面细节验收报告_2026-11-08.md`）。重建基线 `meta.reconstructed=true`、
> 原始 `syncedAt` 不可考，故 `npm run build` 须显式带 `QIANLU_ACCEPT_RECONSTRUCTED_BASELINE=1` 放行。
> `scripts/sync-github-projects.mjs` 本轮未重建（本机 GitHub 不可达无法验证），`github:sync` 暂不可用；
> 网络恢复后重建该脚本并执行 `npm run github:sync -- --force` 即可恢复联网基线、解除上述构建限制。

> **在仓库根目录也能直接跑命令**:上一级目录的 `package.json` 是纯转发层(不含任何依赖),
> 会把 `dev / build / typecheck / lint / test / test:watch / preview / format / assets:build / github:sync / audit:licenses`
> 原样转发到本目录,退出码也原样返回。
>
> - 安装依赖:在根目录执行 `npm run bootstrap`,或在本目录执行 `npm install`。
> - **不要在根目录直接 `npm install`**:根目录没有依赖清单,误装只会产生一个无意义的根 `node_modules`。

## 质量检查

```bash
npm run lint       # ESLint 9(忽略规则集中在 eslint.config.js 的 ignores)
npm run typecheck  # tsc -b --noEmit
npm test           # vitest run
npm run github:sync -- --force   # 刷新 GitHub 专区数据
```

## 构建

```bash
npm run build      # 产出 dist/
npm run preview    # 本地预览构建产物
```

## 目录结构(核心)

```
src/
├── components/    # 组件(navs / ui / glass / sections ...)
├── data/          # 静态数据(社交链接、项目信息等)
├── lib/           # 工具与配置存储
└── styles/        # 全局样式
```

## 致谢

- 基础模板:[geekpius/portfolio](https://github.com/geekpius/portfolio)(MIT 协议),基于其二次开发裁剪而来
- 毛玻璃组件:[rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) v1.1.1(MIT)
- UI 组件基底:[shadcn/ui](https://ui.shadcn.com/)(MIT)
- 图标:[Lucide](https://lucide.dev/)(ISC)

## 许可证

MIT
