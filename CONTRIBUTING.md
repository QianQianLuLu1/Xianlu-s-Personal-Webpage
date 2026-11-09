# 贡献指南

本文件面向在仓库内修改代码或文档的贡献者，说明环境准备、安装、常用命令、代码风格与改动后自测。所有路径均相对于仓库根目录，命令可在仓库根直接执行；根层脚本只是转发到 `qianlu-portfolio/`。

## 环境准备

- Node：`>=22.22.2`。两个 `package.json` 均已声明 `"engines": { "node": ">=22.22.2" }`。该下限由 `qianlu-portfolio/node_modules/` 中含 `engines.node` 的 202 个依赖经 semver 求值得到，22.22.2 是唯一同时满足全部约束的最小版本；决定性约束来自 `jsdom@30.0.1` 的 `^22.22.2 || ^24.15.0 || >=26.0.0`，其次为 `undici@8.10.0` 的 `>=22.19.0` 等。必须保留第三段：写成 `>=22.22` 会放宽到 22.22.0 / 22.22.1 而失去依据。
- 注意 Node 23.x、24.0–24.14、25.x 虽满足该下限声明，仍会被部分依赖的 `engines` 拒绝并触发 npm EBADENGINE；按惯例项目只声明下限。
- npm：包管理器为 npm，依据 `qianlu-portfolio/package-lock.json` 的 lockfileVersion 3；未声明 `packageManager`。仓库内无 `.nvmrc`、`.node-version`、`.tool-versions`、CI 或 Dockerfile 配置。
- 仓库根为命令转发层：根 `package.json` 不含依赖与源码，脚本均为 `npm --prefix qianlu-portfolio run <键>` 的纯转发；实际应用在 `qianlu-portfolio/`，不要在根目录新建应用代码。

## 安装依赖

两种方式等价，任选其一：

- 在仓库根执行 `npm run bootstrap`（其值为 `npm --prefix qianlu-portfolio install`）。
- 在 `qianlu-portfolio/` 目录内执行 `npm install`。

**不要在仓库根直接 `npm install`**：根目录没有依赖清单，误装只会产生一个无意义的根 `node_modules`。

## 常用命令

根 `package.json` 是纯转发层：下表的根命令均为 `npm --prefix qianlu-portfolio run <键>`，退出码原样返回；「应用内实际脚本」列为 `qianlu-portfolio/package.json` 中同名键的逐字取值。

| 根命令（转发层） | 应用内实际脚本 | 说明 |
| --- | --- | --- |
| `npm run dev` | `vite` | 启动 Vite 开发服务器 |
| `npm run build` | `node scripts/check-baseline-freshness.mjs && tsc -b && vite build` | 校验基线新鲜度、类型检查并构建，产出 `qianlu-portfolio/dist/` |
| `npm run preview` | `vite preview` | 本地预览 `qianlu-portfolio/dist/` 构建产物 |
| `npm run test`（或 `npm test`） | `vitest run` | 运行一次 Vitest 用例 |
| `npm run lint` | `eslint .` | ESLint 静态检查 |
| `npm run typecheck` | `tsc -b --noEmit` | TypeScript 类型检查 |
| `npm run format` | `prettier --write "src/**/*.{ts,tsx,css}" "tests/**/*.{ts,tsx}"` | 按 Prettier 格式化源码与测试 |

其余脚本：`test:watch`（`vitest`）、`assets:build`（`node scripts/build-assets.mjs`）、`github:sync`（`node scripts/sync-github-projects.mjs`）、`audit:licenses`（依赖许可证白名单审计）、`bootstrap`（`npm --prefix qianlu-portfolio install`），完整键与取值见两个 `package.json`。

## 分支与提交约定

当前仓库只有一个 `master` 分支、没有 tag，提交历史为多条提交（以 `git log --oneline` 为准，含 2026-09-25 的 `chore:` 前缀初始导入），无合并提交；仓库内没有 commitlint 或 commit-msg 约定，`.qoder/commands/` 下的命令文档与 `hooks/pre-commit` 只约束验证链。样本不足以支撑任何分支命名或提交信息格式规范，因此**本文件不规定具体规范**，待项目所有者确定后再补。（本地钩子，未随仓库分发；`.git/config` 的 hooksPath 不随克隆分发）

## 代码风格与格式

- Prettier 配置见 `qianlu-portfolio/.prettierrc`：`semi: true`、`singleQuote: true`、`printWidth: 100`、`tabWidth: 2`、`trailingComma: "es5"`、`arrowParens: "always"`、`endOfLine: "auto"`，并启用 `prettier-plugin-tailwindcss` 决定 Tailwind 类顺序，不要手工排序。
- 不参与格式化的路径见 `qianlu-portfolio/.prettierignore`：`node_modules`、`dist`、`build`、`*.lock`，以及脚本自动生成并统一格式化的 `src/data/projects.generated.ts`、`src/data/projects.meta.json`、`src/data/photos.generated.ts`。
- ESLint 9 flat config 见 `qianlu-portfolio/eslint.config.js`：继承 `js.configs.recommended`、`tseslint.configs.recommended` 与 `eslint-config-prettier`；作用于 `**/*.{ts,tsx}`；`prettier/prettier` 为 `error`（未格式化代码会让 `npm run lint` 直接失败）；另展开 `react-hooks` 推荐规则、`react-refresh/only-export-components` 为 `warn`，并关闭 `@typescript-eslint/no-explicit-any` 与 `@typescript-eslint/no-require-imports`。
- 项目约定见 `.qoder/rules/qianlu-portfolio.md`：className 必须经 `cn()`（`@/lib/utils`）拼接；路径别名 `@/` → `src/` 需在 `qianlu-portfolio/tsconfig.app.json`、`qianlu-portfolio/vite.config.ts`、`qianlu-portfolio/vitest.config.ts` 三处同步；文件名 kebab-case、组件函数名 PascalCase。

## 目录与生成物

- `qianlu-portfolio/src/data/photos.generated.ts` 与 `qianlu-portfolio/public/photos/**` 由 `npm run assets:build` 生成，**禁止手改**；`src/data/projects.generated.ts`、`src/data/projects.meta.json` 同样由脚本生成。
- 工作区总览见 `README.md`，应用级说明见 `qianlu-portfolio/README.md`，目录结构见 `README.md` 的「目录结构」小节。

## 改动后自测

依据 `.qoder/commands/validate.md`，修改 `qianlu-portfolio/src/` 或 `qianlu-portfolio/tests/` 下的文件后，按以下顺序**严格串行**执行，任一步骤退出码非 0 立即停止后续步骤并贴出完整错误输出，不得在验证未全部通过时声称改动完成：

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`

补充规则：

- 改动涉及视觉/CSS/构建配置时，在第 3 步通过后追加 `npm run build`。
- lint 报 prettier 相关错误时，先执行 `npm run format`，再从第 2 步重新执行 lint；`format` 不是固定首步。
- 仓库内 `hooks/pre-commit` 把同一条 typecheck → lint → test 链绑定到提交生命周期（`.git/config` 的 `hooksPath = hooks`）；提交时失败会阻止提交，修复后重新提交即可，无需绕过钩子。（本地钩子，未随仓库分发；`.git/config` 的 hooksPath 不随克隆分发）

## 相关文档

- `README.md`：工作区总览、使用与运行方式、目录结构、授权。
- `qianlu-portfolio/README.md`：应用级技术栈、数据同步、质量检查、构建与致谢。
- `.qoder/rules/qianlu-portfolio.md`：项目约定与编码规范。
- `.qoder/commands/validate.md`：编辑后验证链。
- `hooks/pre-commit`：提交时验证钩子。（本地钩子，未随仓库分发；`.git/config` 的 hooksPath 不随克隆分发）
- `LICENSE`：MIT 许可证全文。
- `CHANGELOG.md`：变更记录（骨架）。
