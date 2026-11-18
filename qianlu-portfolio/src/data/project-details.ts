/**
 * 开源项目详情页内容（二级页面 /projects/:projectId）。
 *
 * 数据分层：
 * - **客观字段**（名称 / 仓库地址 / 版本 / 语言 / 许可证 / Release）由
 *   scripts/sync-github-projects.mjs 从 GitHub REST API 联网生成，见 data/projects.generated.ts。
 * - **本文件**只承载编辑性内容：叙述文案、命令、参数表、章节结构。
 *
 * 内容来源：GitHub 公开仓库 README（2026-11-06 逐字核对）：
 * - https://github.com/QianQianLuLu1/MeowStarMap（原 NikkiGallery，已改名；README 徽章 2.5.6）
 * - https://github.com/QianQianLuLu1/FlashGaze（README 徽章 0.1.2，无 Release）
 *
 * 仓库改名说明：路由 id 仍为 `nikki-gallery`（URL 稳定），展示名取自同步数据。
 * 叙述性文案按站内语境重写；命令、参数、表格与技术事实与 README 保持一致。
 * i18n：本文件的叙述性字符串值均为 detail 命名空间的 key（见 locales 各语言目录的 detail.json），
 * 渲染时经 t() 解析；代码块（language / code）保持字面量，不参与翻译。
 * 涉及密钥的配置示例只保留变量名与占位说明，不内联任何密钥字面量。
 * star 数按既有决策不展示。
 */

export type ProjectId = 'flashgaze' | 'nikki-gallery';

/** 渲染器图标映射表的键（见 components/project/detail-blocks.tsx） */
export type DetailIcon =
  | 'scan'
  | 'gallery'
  | 'edit'
  | 'video'
  | 'organize'
  | 'dedup'
  | 'share'
  | 'languages'
  | 'theme'
  | 'plugins'
  | 'profile'
  | 'decrypt'
  | 'diagnose'
  | 'gauge'
  | 'explain'
  | 'scene'
  | 'providers'
  | 'agent'
  | 'offline'
  | 'degrade'
  | 'mcp';

export interface DetailFeature {
  icon: DetailIcon;
  title: string;
  description: string;
}

export interface DetailFlowNode {
  title: string;
  lines: readonly string[];
}

export interface DetailLink {
  label: string;
  href: string;
  description?: string;
}

export type DetailBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'features'; items: readonly DetailFeature[] }
  | { type: 'flow'; nodes: readonly DetailFlowNode[]; note?: string }
  | { type: 'steps'; items: readonly { title: string; text?: string }[] }
  | { type: 'code'; language?: string; code: string }
  | { type: 'table'; headers: readonly string[]; rows: readonly (readonly string[])[] }
  | { type: 'callout'; variant: 'info' | 'warn'; title?: string; text: string }
  | { type: 'links'; items: readonly DetailLink[] };

export interface ProjectSection {
  /** 锚点 id，同时用于页内目录与 URL hash */
  id: string;
  title: string;
  blocks: readonly DetailBlock[];
}

export interface ProjectDetail {
  /** Hero 区一句话定位（比 summary 更短） */
  tagline: string;
  /** Releases 页地址；无 Release 的项目为 null */
  releaseUrl: string | null;
  sections: readonly ProjectSection[];
}

export function isProjectId(value: string | undefined): value is ProjectId {
  return value === 'flashgaze' || value === 'nikki-gallery';
}

export const PROJECT_DETAILS: Record<ProjectId, ProjectDetail> = {
  flashgaze: {
    tagline: 'flashgaze.tagline',
    releaseUrl: null,
    sections: [
      {
        id: 'overview',
        title: 'flashgaze.overview.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.overview.b0',
          },
          {
            type: 'paragraph',
            text: 'flashgaze.overview.b1',
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'flashgaze.overview.b2.title',
            text: 'flashgaze.overview.b2.text',
          },
        ],
      },
      {
        id: 'how',
        title: 'flashgaze.how.title',
        blocks: [
          {
            type: 'flow',
            nodes: [
              {
                title: 'flashgaze.how.b0.nodes.0.title',
                lines: ['flashgaze.how.b0.nodes.0.lines.0'],
              },
              {
                title: 'flashgaze.how.b0.nodes.1.title',
                lines: ['flashgaze.how.b0.nodes.1.lines.0', 'flashgaze.how.b0.nodes.1.lines.1'],
              },
              {
                title: 'flashgaze.how.b0.nodes.2.title',
                lines: ['flashgaze.how.b0.nodes.2.lines.0', 'flashgaze.how.b0.nodes.2.lines.1'],
              },
              {
                title: 'flashgaze.how.b0.nodes.3.title',
                lines: [
                  'flashgaze.how.b0.nodes.3.lines.0',
                  'flashgaze.how.b0.nodes.3.lines.1',
                  'flashgaze.how.b0.nodes.3.lines.2',
                ],
              },
            ],
            note: 'flashgaze.how.b0.note',
          },
          {
            type: 'table',
            headers: [
              'flashgaze.how.b1.headers.0',
              'flashgaze.how.b1.headers.1',
              'flashgaze.how.b1.headers.2',
              'flashgaze.how.b1.headers.3',
            ],
            rows: [
              [
                'flashgaze.how.b1.rows.0.0',
                'flashgaze.how.b1.rows.0.1',
                'flashgaze.how.b1.rows.0.2',
                'flashgaze.how.b1.rows.0.3',
              ],
              [
                'flashgaze.how.b1.rows.1.0',
                'flashgaze.how.b1.rows.1.1',
                'flashgaze.how.b1.rows.1.2',
                'flashgaze.how.b1.rows.1.3',
              ],
              [
                'flashgaze.how.b1.rows.2.0',
                'flashgaze.how.b1.rows.2.1',
                'flashgaze.how.b1.rows.2.2',
                'flashgaze.how.b1.rows.2.3',
              ],
              [
                'flashgaze.how.b1.rows.3.0',
                'flashgaze.how.b1.rows.3.1',
                'flashgaze.how.b1.rows.3.2',
                'flashgaze.how.b1.rows.3.3',
              ],
              [
                'flashgaze.how.b1.rows.4.0',
                'flashgaze.how.b1.rows.4.1',
                'flashgaze.how.b1.rows.4.2',
                'flashgaze.how.b1.rows.4.3',
              ],
              [
                'flashgaze.how.b1.rows.5.0',
                'flashgaze.how.b1.rows.5.1',
                'flashgaze.how.b1.rows.5.2',
                'flashgaze.how.b1.rows.5.3',
              ],
              [
                'flashgaze.how.b1.rows.6.0',
                'flashgaze.how.b1.rows.6.1',
                'flashgaze.how.b1.rows.6.2',
                'flashgaze.how.b1.rows.6.3',
              ],
            ],
          },
          {
            type: 'paragraph',
            text: 'flashgaze.how.b2',
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'flashgaze.how.b3.title',
            text: 'flashgaze.how.b3.text',
          },
        ],
      },
      {
        id: 'features',
        title: 'flashgaze.features.title',
        blocks: [
          {
            type: 'features',
            items: [
              {
                icon: 'gauge',
                title: 'flashgaze.features.b0.0.title',
                description: 'flashgaze.features.b0.0.description',
              },
              {
                icon: 'explain',
                title: 'flashgaze.features.b0.1.title',
                description: 'flashgaze.features.b0.1.description',
              },
              {
                icon: 'scene',
                title: 'flashgaze.features.b0.2.title',
                description: 'flashgaze.features.b0.2.description',
              },
              {
                icon: 'providers',
                title: 'flashgaze.features.b0.3.title',
                description: 'flashgaze.features.b0.3.description',
              },
              {
                icon: 'agent',
                title: 'flashgaze.features.b0.4.title',
                description: 'flashgaze.features.b0.4.description',
              },
              {
                icon: 'offline',
                title: 'flashgaze.features.b0.5.title',
                description: 'flashgaze.features.b0.5.description',
              },
              {
                icon: 'degrade',
                title: 'flashgaze.features.b0.6.title',
                description: 'flashgaze.features.b0.6.description',
              },
              {
                icon: 'mcp',
                title: 'flashgaze.features.b0.7.title',
                description: 'flashgaze.features.b0.7.description',
              },
            ],
          },
        ],
      },
      {
        id: 'install',
        title: 'flashgaze.install.title',
        blocks: [
          {
            type: 'steps',
            items: [
              { title: 'flashgaze.install.b0.0.title', text: 'flashgaze.install.b0.0.text' },
              {
                title: 'flashgaze.install.b0.1.title',
                text: 'flashgaze.install.b0.1.text',
              },
              { title: 'flashgaze.install.b0.2.title', text: 'flashgaze.install.b0.2.text' },
            ],
          },
          {
            type: 'code',
            language: 'bash',
            code: 'git clone https://github.com/QianQianLuLu1/FlashGaze.git\ncd FlashGaze/flashgaze\npip install -e .',
          },
          {
            type: 'code',
            language: 'bash',
            code: 'pip install -e ".[mcp]"        # MCP Server（Claude Code / TRAE / Cursor / Codex）\npip install -e ".[gui]"        # Web GUI（Gradio），安装后运行 flashgaze-webui\npip install -e ".[vlm-multi]"  # 多 VLM 提供商（LiteLLM：GPT-4o / Claude 3 / Ollama）\npip install -e ".[cv-enhanced]" # BRISQUE 噪点评分（opencv-contrib-python）\npip install -e ".[portrait]"    # 人像评分（face_recognition）\npip install -e ".[dedup]"       # PHash 去重（imagededup）\npip install -e ".[exif]"        # EXIF 写回（piexif）\npip install -e ".[xlsx]"        # Excel 清单导出（openpyxl）\npip install -e ".[all]"         # 一次性安装以上全部\n# 插件系统为内置功能，无需 extra，运行时加 --enable-plugins 即可',
          },
          {
            type: 'table',
            headers: [
              'flashgaze.install.b3.headers.0',
              'flashgaze.install.b3.headers.1',
              'flashgaze.install.b3.headers.2',
            ],
            rows: [
              [
                'flashgaze.install.b3.rows.0.0',
                'flashgaze.install.b3.rows.0.1',
                'flashgaze.install.b3.rows.0.2',
              ],
              [
                'flashgaze.install.b3.rows.1.0',
                'flashgaze.install.b3.rows.1.1',
                'flashgaze.install.b3.rows.1.2',
              ],
              [
                'flashgaze.install.b3.rows.2.0',
                'flashgaze.install.b3.rows.2.1',
                'flashgaze.install.b3.rows.2.2',
              ],
              [
                'flashgaze.install.b3.rows.3.0',
                'flashgaze.install.b3.rows.3.1',
                'flashgaze.install.b3.rows.3.2',
              ],
              [
                'flashgaze.install.b3.rows.4.0',
                'flashgaze.install.b3.rows.4.1',
                'flashgaze.install.b3.rows.4.2',
              ],
              [
                'flashgaze.install.b3.rows.5.0',
                'flashgaze.install.b3.rows.5.1',
                'flashgaze.install.b3.rows.5.2',
              ],
              [
                'flashgaze.install.b3.rows.6.0',
                'flashgaze.install.b3.rows.6.1',
                'flashgaze.install.b3.rows.6.2',
              ],
              [
                'flashgaze.install.b3.rows.7.0',
                'flashgaze.install.b3.rows.7.1',
                'flashgaze.install.b3.rows.7.2',
              ],
              [
                'flashgaze.install.b3.rows.8.0',
                'flashgaze.install.b3.rows.8.1',
                'flashgaze.install.b3.rows.8.2',
              ],
              [
                'flashgaze.install.b3.rows.9.0',
                'flashgaze.install.b3.rows.9.1',
                'flashgaze.install.b3.rows.9.2',
              ],
            ],
          },
          {
            type: 'callout',
            variant: 'info',
            text: 'flashgaze.install.b4.text',
          },
        ],
      },
      {
        id: 'quickstart',
        title: 'flashgaze.quickstart.title',
        blocks: [
          {
            type: 'code',
            language: 'bash',
            code: '# 零成本快速初筛（仅 CV，无需 API Key）\nflashgaze ./photos --top 30 --json --no-vlm\n\n# VLM 精筛（需先设置环境变量 FLASHGAZE_API_KEY 为你的密钥）\nflashgaze ./photos --top 30 --json\n\n# 评分并复制高分图到新目录\nflashgaze ./photos --top 30 --json --export\n\n# 阈值模式（分数 >= 75 入选）\nflashgaze ./photos --threshold 75 --json --csv',
          },
          {
            type: 'paragraph',
            text: 'flashgaze.quickstart.b1',
          },
          {
            type: 'code',
            language: 'json',
            code: `{
  "status": "success",
  "code": 0,
  "summary": { "total": 120, "selected": 30, "avg_score": 68.45, "elapsed_ms": 15420 },
  "images": [
    {
      "file": "DSC_0042.jpg",
      "path": "/photos/DSC_0042.jpg",
      "sharpness": 92.5,
      "exposure": 88.0,
      "composition": null,
      "vlm_adjustment": 5.0,
      "score": 92.75,
      "selected": true,
      "error": null,
      "vlm_reason": "背景虚化突出主体",
      "vlm_provider": "qwen"
    }
  ]
}`,
          },
        ],
      },
      {
        id: 'cli',
        title: 'flashgaze.cli.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.cli.b0',
          },
          {
            type: 'table',
            headers: ['flashgaze.cli.b1.headers.0', 'flashgaze.cli.b1.headers.1'],
            rows: [
              ['flashgaze.cli.b1.rows.0.0', 'flashgaze.cli.b1.rows.0.1'],
              ['flashgaze.cli.b1.rows.1.0', 'flashgaze.cli.b1.rows.1.1'],
              ['flashgaze.cli.b1.rows.2.0', 'flashgaze.cli.b1.rows.2.1'],
              ['flashgaze.cli.b1.rows.3.0', 'flashgaze.cli.b1.rows.3.1'],
              ['flashgaze.cli.b1.rows.4.0', 'flashgaze.cli.b1.rows.4.1'],
              ['flashgaze.cli.b1.rows.5.0', 'flashgaze.cli.b1.rows.5.1'],
              ['flashgaze.cli.b1.rows.6.0', 'flashgaze.cli.b1.rows.6.1'],
              ['flashgaze.cli.b1.rows.7.0', 'flashgaze.cli.b1.rows.7.1'],
              ['flashgaze.cli.b1.rows.8.0', 'flashgaze.cli.b1.rows.8.1'],
              ['flashgaze.cli.b1.rows.9.0', 'flashgaze.cli.b1.rows.9.1'],
              ['flashgaze.cli.b1.rows.10.0', 'flashgaze.cli.b1.rows.10.1'],
              ['flashgaze.cli.b1.rows.11.0', 'flashgaze.cli.b1.rows.11.1'],
              ['flashgaze.cli.b1.rows.12.0', 'flashgaze.cli.b1.rows.12.1'],
              ['flashgaze.cli.b1.rows.13.0', 'flashgaze.cli.b1.rows.13.1'],
              ['flashgaze.cli.b1.rows.14.0', 'flashgaze.cli.b1.rows.14.1'],
              ['flashgaze.cli.b1.rows.15.0', 'flashgaze.cli.b1.rows.15.1'],
              ['flashgaze.cli.b1.rows.16.0', 'flashgaze.cli.b1.rows.16.1'],
              ['flashgaze.cli.b1.rows.17.0', 'flashgaze.cli.b1.rows.17.1'],
              ['flashgaze.cli.b1.rows.18.0', 'flashgaze.cli.b1.rows.18.1'],
              ['flashgaze.cli.b1.rows.19.0', 'flashgaze.cli.b1.rows.19.1'],
              ['flashgaze.cli.b1.rows.20.0', 'flashgaze.cli.b1.rows.20.1'],
              ['flashgaze.cli.b1.rows.21.0', 'flashgaze.cli.b1.rows.21.1'],
              ['flashgaze.cli.b1.rows.22.0', 'flashgaze.cli.b1.rows.22.1'],
              ['flashgaze.cli.b1.rows.23.0', 'flashgaze.cli.b1.rows.23.1'],
              ['flashgaze.cli.b1.rows.24.0', 'flashgaze.cli.b1.rows.24.1'],
              ['flashgaze.cli.b1.rows.25.0', 'flashgaze.cli.b1.rows.25.1'],
              ['flashgaze.cli.b1.rows.26.0', 'flashgaze.cli.b1.rows.26.1'],
              ['flashgaze.cli.b1.rows.27.0', 'flashgaze.cli.b1.rows.27.1'],
              ['flashgaze.cli.b1.rows.28.0', 'flashgaze.cli.b1.rows.28.1'],
              ['flashgaze.cli.b1.rows.29.0', 'flashgaze.cli.b1.rows.29.1'],
              ['flashgaze.cli.b1.rows.30.0', 'flashgaze.cli.b1.rows.30.1'],
              ['flashgaze.cli.b1.rows.31.0', 'flashgaze.cli.b1.rows.31.1'],
              ['flashgaze.cli.b1.rows.32.0', 'flashgaze.cli.b1.rows.32.1'],
            ],
          },
        ],
      },
      {
        id: 'vlm',
        title: 'flashgaze.vlm.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.vlm.b0',
          },
          {
            type: 'table',
            headers: [
              'flashgaze.vlm.b1.headers.0',
              'flashgaze.vlm.b1.headers.1',
              'flashgaze.vlm.b1.headers.2',
              'flashgaze.vlm.b1.headers.3',
            ],
            rows: [
              [
                'flashgaze.vlm.b1.rows.0.0',
                'flashgaze.vlm.b1.rows.0.1',
                'flashgaze.vlm.b1.rows.0.2',
                'flashgaze.vlm.b1.rows.0.3',
              ],
              [
                'flashgaze.vlm.b1.rows.1.0',
                'flashgaze.vlm.b1.rows.1.1',
                'flashgaze.vlm.b1.rows.1.2',
                'flashgaze.vlm.b1.rows.1.3',
              ],
              [
                'flashgaze.vlm.b1.rows.2.0',
                'flashgaze.vlm.b1.rows.2.1',
                'flashgaze.vlm.b1.rows.2.2',
                'flashgaze.vlm.b1.rows.2.3',
              ],
              [
                'flashgaze.vlm.b1.rows.3.0',
                'flashgaze.vlm.b1.rows.3.1',
                'flashgaze.vlm.b1.rows.3.2',
                'flashgaze.vlm.b1.rows.3.3',
              ],
            ],
          },
          {
            type: 'code',
            language: 'bash',
            code: '# 先在终端把环境变量 FLASHGAZE_API_KEY 设置为对应提供商的密钥，再按需选择：\n\n# 1. 通义千问（默认，100% 向后兼容——无需 LiteLLM）\nexport FLASHGAZE_VLM_PROVIDER=qwen\nexport FLASHGAZE_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1\nexport FLASHGAZE_MODEL=qwen-vl-max\n\n# 2. OpenAI GPT-4o（需安装 LiteLLM）\nexport FLASHGAZE_VLM_PROVIDER=openai\nexport FLASHGAZE_API_BASE=https://api.openai.com/v1\nexport FLASHGAZE_MODEL=gpt-4o\n\n# 3. Anthropic Claude 3（api_base 留空走 LiteLLM 默认端点）\nexport FLASHGAZE_VLM_PROVIDER=anthropic\nexport FLASHGAZE_MODEL=claude-3-5-sonnet-20241022\n\n# 4. Ollama 本地 VLM（无需真实 key）\nexport FLASHGAZE_VLM_PROVIDER=ollama\nexport FLASHGAZE_API_BASE=http://localhost:11434\nexport FLASHGAZE_MODEL=llama3.2-vision',
          },
          {
            type: 'callout',
            variant: 'warn',
            title: 'flashgaze.vlm.b3.title',
            text: 'flashgaze.vlm.b3.text',
          },
        ],
      },
      {
        id: 'scene',
        title: 'flashgaze.scene.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.scene.b0',
          },
          {
            type: 'table',
            headers: [
              'flashgaze.scene.b1.headers.0',
              'flashgaze.scene.b1.headers.1',
              'flashgaze.scene.b1.headers.2',
            ],
            rows: [
              [
                'flashgaze.scene.b1.rows.0.0',
                'flashgaze.scene.b1.rows.0.1',
                'flashgaze.scene.b1.rows.0.2',
              ],
              [
                'flashgaze.scene.b1.rows.1.0',
                'flashgaze.scene.b1.rows.1.1',
                'flashgaze.scene.b1.rows.1.2',
              ],
              [
                'flashgaze.scene.b1.rows.2.0',
                'flashgaze.scene.b1.rows.2.1',
                'flashgaze.scene.b1.rows.2.2',
              ],
              [
                'flashgaze.scene.b1.rows.3.0',
                'flashgaze.scene.b1.rows.3.1',
                'flashgaze.scene.b1.rows.3.2',
              ],
            ],
          },
          {
            type: 'code',
            language: 'bash',
            code: '# 用场景化提示词评分人像目录\nflashgaze ./portraits --scene portrait --top 20 --json\n\n# 评分风光目录\nflashgaze ./landscapes --scene landscape --top 30 --json',
          },
        ],
      },
      {
        id: 'mcp',
        title: 'flashgaze.mcp.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.mcp.b0',
          },
          {
            type: 'code',
            language: 'json',
            code: `{
  "mcpServers": {
    "flashgaze": {
      "command": "python",
      "args": ["-m", "flashgaze.mcp_server"]
    }
  }
}`,
          },
          {
            type: 'table',
            headers: ['flashgaze.mcp.b2.headers.0', 'flashgaze.mcp.b2.headers.1'],
            rows: [
              ['flashgaze.mcp.b2.rows.0.0', 'flashgaze.mcp.b2.rows.0.1'],
              ['flashgaze.mcp.b2.rows.1.0', 'flashgaze.mcp.b2.rows.1.1'],
              ['flashgaze.mcp.b2.rows.2.0', 'flashgaze.mcp.b2.rows.2.1'],
              ['flashgaze.mcp.b2.rows.3.0', 'flashgaze.mcp.b2.rows.3.1'],
              ['flashgaze.mcp.b2.rows.4.0', 'flashgaze.mcp.b2.rows.4.1'],
            ],
          },
          {
            type: 'paragraph',
            text: 'flashgaze.mcp.b3',
          },
          {
            type: 'callout',
            variant: 'warn',
            title: 'flashgaze.mcp.b4.title',
            text: 'flashgaze.mcp.b4.text',
          },
        ],
      },
      {
        id: 'gui',
        title: 'flashgaze.gui.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.gui.b0',
          },
          {
            type: 'code',
            language: 'bash',
            code: 'pip install -e ".[gui]"\nflashgaze-webui\n\n# 预填目录并使用 8080 端口\nflashgaze-webui --dir ./photos --port 8080\n\n# 局域网访问\nflashgaze-webui --host 0.0.0.0 --port 8080',
          },
          {
            type: 'table',
            headers: ['flashgaze.gui.b2.headers.0', 'flashgaze.gui.b2.headers.1'],
            rows: [
              ['flashgaze.gui.b2.rows.0.0', 'flashgaze.gui.b2.rows.0.1'],
              ['flashgaze.gui.b2.rows.1.0', 'flashgaze.gui.b2.rows.1.1'],
              ['flashgaze.gui.b2.rows.2.0', 'flashgaze.gui.b2.rows.2.1'],
              ['flashgaze.gui.b2.rows.3.0', 'flashgaze.gui.b2.rows.3.1'],
              ['flashgaze.gui.b2.rows.4.0', 'flashgaze.gui.b2.rows.4.1'],
            ],
          },
          {
            type: 'table',
            headers: ['flashgaze.gui.b3.headers.0', 'flashgaze.gui.b3.headers.1'],
            rows: [
              ['flashgaze.gui.b3.rows.0.0', 'flashgaze.gui.b3.rows.0.1'],
              ['flashgaze.gui.b3.rows.1.0', 'flashgaze.gui.b3.rows.1.1'],
              ['flashgaze.gui.b3.rows.2.0', 'flashgaze.gui.b3.rows.2.1'],
              ['flashgaze.gui.b3.rows.3.0', 'flashgaze.gui.b3.rows.3.1'],
              ['flashgaze.gui.b3.rows.4.0', 'flashgaze.gui.b3.rows.4.1'],
              ['flashgaze.gui.b3.rows.5.0', 'flashgaze.gui.b3.rows.5.1'],
              ['flashgaze.gui.b3.rows.6.0', 'flashgaze.gui.b3.rows.6.1'],
              ['flashgaze.gui.b3.rows.7.0', 'flashgaze.gui.b3.rows.7.1'],
            ],
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'flashgaze.gui.b4.title',
            text: 'flashgaze.gui.b4.text',
          },
        ],
      },
      {
        id: 'agent',
        title: 'flashgaze.agent.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.agent.b0',
          },
          {
            type: 'code',
            language: 'bash',
            code: '# 通过 skills CLI 安装\nnpx skills add QianQianLuLu1/FlashGaze\n\n# 或手动复制 SKILL.md 到对应工具的 skills 目录',
          },
          {
            type: 'paragraph',
            text: 'flashgaze.agent.b2',
          },
          {
            type: 'code',
            language: 'python',
            code: `import subprocess, json

result = subprocess.run(
    ["flashgaze", "./photos", "--top", "30", "--json", "--no-vlm"],
    capture_output=True, text=True, timeout=600
)
if result.returncode == 0:
    report = json.loads(result.stdout)
    for img in report["images"]:
        if img["selected"]:
            print(f"入选: {img['file']} 分数={img['score']}")`,
          },
        ],
      },
      {
        id: 'config',
        title: 'flashgaze.config.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.config.b0',
          },
          {
            type: 'table',
            headers: [
              'flashgaze.config.b1.headers.0',
              'flashgaze.config.b1.headers.1',
              'flashgaze.config.b1.headers.2',
            ],
            rows: [
              [
                'flashgaze.config.b1.rows.0.0',
                'flashgaze.config.b1.rows.0.1',
                'flashgaze.config.b1.rows.0.2',
              ],
              [
                'flashgaze.config.b1.rows.1.0',
                'flashgaze.config.b1.rows.1.1',
                'flashgaze.config.b1.rows.1.2',
              ],
              [
                'flashgaze.config.b1.rows.2.0',
                'flashgaze.config.b1.rows.2.1',
                'flashgaze.config.b1.rows.2.2',
              ],
              [
                'flashgaze.config.b1.rows.3.0',
                'flashgaze.config.b1.rows.3.1',
                'flashgaze.config.b1.rows.3.2',
              ],
              [
                'flashgaze.config.b1.rows.4.0',
                'flashgaze.config.b1.rows.4.1',
                'flashgaze.config.b1.rows.4.2',
              ],
              [
                'flashgaze.config.b1.rows.5.0',
                'flashgaze.config.b1.rows.5.1',
                'flashgaze.config.b1.rows.5.2',
              ],
              [
                'flashgaze.config.b1.rows.6.0',
                'flashgaze.config.b1.rows.6.1',
                'flashgaze.config.b1.rows.6.2',
              ],
              [
                'flashgaze.config.b1.rows.7.0',
                'flashgaze.config.b1.rows.7.1',
                'flashgaze.config.b1.rows.7.2',
              ],
              [
                'flashgaze.config.b1.rows.8.0',
                'flashgaze.config.b1.rows.8.1',
                'flashgaze.config.b1.rows.8.2',
              ],
            ],
          },
          {
            type: 'table',
            headers: ['flashgaze.config.b2.headers.0', 'flashgaze.config.b2.headers.1'],
            rows: [
              ['flashgaze.config.b2.rows.0.0', 'flashgaze.config.b2.rows.0.1'],
              ['flashgaze.config.b2.rows.1.0', 'flashgaze.config.b2.rows.1.1'],
              ['flashgaze.config.b2.rows.2.0', 'flashgaze.config.b2.rows.2.1'],
              ['flashgaze.config.b2.rows.3.0', 'flashgaze.config.b2.rows.3.1'],
              ['flashgaze.config.b2.rows.4.0', 'flashgaze.config.b2.rows.4.1'],
              ['flashgaze.config.b2.rows.5.0', 'flashgaze.config.b2.rows.5.1'],
              ['flashgaze.config.b2.rows.6.0', 'flashgaze.config.b2.rows.6.1'],
            ],
          },
          {
            type: 'paragraph',
            text: 'flashgaze.config.b3',
          },
        ],
      },
      {
        id: 'quality',
        title: 'flashgaze.quality.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'flashgaze.quality.b0',
          },
          {
            type: 'table',
            headers: ['flashgaze.quality.b1.headers.0', 'flashgaze.quality.b1.headers.1'],
            rows: [
              ['flashgaze.quality.b1.rows.0.0', 'flashgaze.quality.b1.rows.0.1'],
              ['flashgaze.quality.b1.rows.1.0', 'flashgaze.quality.b1.rows.1.1'],
              ['flashgaze.quality.b1.rows.2.0', 'flashgaze.quality.b1.rows.2.1'],
              ['flashgaze.quality.b1.rows.3.0', 'flashgaze.quality.b1.rows.3.1'],
              ['flashgaze.quality.b1.rows.4.0', 'flashgaze.quality.b1.rows.4.1'],
              ['flashgaze.quality.b1.rows.5.0', 'flashgaze.quality.b1.rows.5.1'],
              ['flashgaze.quality.b1.rows.6.0', 'flashgaze.quality.b1.rows.6.1'],
            ],
          },
        ],
      },
    ],
  },

  'nikki-gallery': {
    tagline: 'nikki-gallery.tagline',
    releaseUrl: 'https://github.com/QianQianLuLu1/MeowStarMap/releases',
    sections: [
      {
        id: 'overview',
        title: 'nikki-gallery.overview.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'nikki-gallery.overview.b0',
          },
          {
            type: 'paragraph',
            text: 'nikki-gallery.overview.b1',
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'nikki-gallery.overview.b2.title',
            text: 'nikki-gallery.overview.b2.text',
          },
        ],
      },
      {
        id: 'features',
        title: 'nikki-gallery.features.title',
        blocks: [
          {
            type: 'features',
            items: [
              {
                icon: 'scan',
                title: 'nikki-gallery.features.b0.0.title',
                description: 'nikki-gallery.features.b0.0.description',
              },
              {
                icon: 'gallery',
                title: 'nikki-gallery.features.b0.1.title',
                description: 'nikki-gallery.features.b0.1.description',
              },
              {
                icon: 'edit',
                title: 'nikki-gallery.features.b0.2.title',
                description: 'nikki-gallery.features.b0.2.description',
              },
              {
                icon: 'video',
                title: 'nikki-gallery.features.b0.3.title',
                description: 'nikki-gallery.features.b0.3.description',
              },
              {
                icon: 'organize',
                title: 'nikki-gallery.features.b0.4.title',
                description: 'nikki-gallery.features.b0.4.description',
              },
              {
                icon: 'profile',
                title: 'nikki-gallery.features.b0.5.title',
                description: 'nikki-gallery.features.b0.5.description',
              },
              {
                icon: 'share',
                title: 'nikki-gallery.features.b0.6.title',
                description: 'nikki-gallery.features.b0.6.description',
              },
              {
                icon: 'dedup',
                title: 'nikki-gallery.features.b0.7.title',
                description: 'nikki-gallery.features.b0.7.description',
              },
              {
                icon: 'share',
                title: 'nikki-gallery.features.b0.8.title',
                description: 'nikki-gallery.features.b0.8.description',
              },
            ],
          },
        ],
      },
      {
        id: 'more',
        title: 'nikki-gallery.more.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'nikki-gallery.more.b0',
          },
          {
            type: 'features',
            items: [
              {
                icon: 'languages',
                title: 'nikki-gallery.more.b1.0.title',
                description: 'nikki-gallery.more.b1.0.description',
              },
              {
                icon: 'theme',
                title: 'nikki-gallery.more.b1.1.title',
                description: 'nikki-gallery.more.b1.1.description',
              },
              {
                icon: 'plugins',
                title: 'nikki-gallery.more.b1.2.title',
                description: 'nikki-gallery.more.b1.2.description',
              },
              {
                icon: 'profile',
                title: 'nikki-gallery.more.b1.3.title',
                description: 'nikki-gallery.more.b1.3.description',
              },
              {
                icon: 'decrypt',
                title: 'nikki-gallery.more.b1.4.title',
                description: 'nikki-gallery.more.b1.4.description',
              },
              {
                icon: 'diagnose',
                title: 'nikki-gallery.more.b1.5.title',
                description: 'nikki-gallery.more.b1.5.description',
              },
            ],
          },
        ],
      },
      {
        id: 'stack',
        title: 'nikki-gallery.stack.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'nikki-gallery.stack.b0',
          },
          {
            type: 'table',
            headers: ['nikki-gallery.stack.b1.headers.0', 'nikki-gallery.stack.b1.headers.1'],
            rows: [
              ['nikki-gallery.stack.b1.rows.0.0', 'nikki-gallery.stack.b1.rows.0.1'],
              ['nikki-gallery.stack.b1.rows.1.0', 'nikki-gallery.stack.b1.rows.1.1'],
              ['nikki-gallery.stack.b1.rows.2.0', 'nikki-gallery.stack.b1.rows.2.1'],
              ['nikki-gallery.stack.b1.rows.3.0', 'nikki-gallery.stack.b1.rows.3.1'],
              ['nikki-gallery.stack.b1.rows.4.0', 'nikki-gallery.stack.b1.rows.4.1'],
              ['nikki-gallery.stack.b1.rows.5.0', 'nikki-gallery.stack.b1.rows.5.1'],
              ['nikki-gallery.stack.b1.rows.6.0', 'nikki-gallery.stack.b1.rows.6.1'],
              ['nikki-gallery.stack.b1.rows.7.0', 'nikki-gallery.stack.b1.rows.7.1'],
              ['nikki-gallery.stack.b1.rows.8.0', 'nikki-gallery.stack.b1.rows.8.1'],
              ['nikki-gallery.stack.b1.rows.9.0', 'nikki-gallery.stack.b1.rows.9.1'],
              ['nikki-gallery.stack.b1.rows.10.0', 'nikki-gallery.stack.b1.rows.10.1'],
              ['nikki-gallery.stack.b1.rows.11.0', 'nikki-gallery.stack.b1.rows.11.1'],
              ['nikki-gallery.stack.b1.rows.12.0', 'nikki-gallery.stack.b1.rows.12.1'],
              ['nikki-gallery.stack.b1.rows.13.0', 'nikki-gallery.stack.b1.rows.13.1'],
            ],
          },
        ],
      },
      {
        id: 'download',
        title: 'nikki-gallery.download.title',
        blocks: [
          {
            type: 'steps',
            items: [
              {
                title: 'nikki-gallery.download.b0.0.title',
                text: 'nikki-gallery.download.b0.0.text',
              },
              {
                title: 'nikki-gallery.download.b0.1.title',
                text: 'nikki-gallery.download.b0.1.text',
              },
            ],
          },
          {
            type: 'callout',
            variant: 'info',
            title: 'nikki-gallery.download.b1.title',
            text: 'nikki-gallery.download.b1.text',
          },
        ],
      },
      {
        id: 'dev',
        title: 'nikki-gallery.dev.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'nikki-gallery.dev.b0',
          },
          {
            type: 'code',
            language: 'bash',
            code: 'git clone https://github.com/QianQianLuLu1/MeowStarMap.git\ncd MeowStarMap\nnpm install      # 安装依赖\nnpm run dev      # 启动开发模式\nnpm run dist:win # 打包 Windows 安装包',
          },
          {
            type: 'table',
            headers: ['nikki-gallery.dev.b2.headers.0', 'nikki-gallery.dev.b2.headers.1'],
            rows: [
              ['nikki-gallery.dev.b2.rows.0.0', 'nikki-gallery.dev.b2.rows.0.1'],
              ['nikki-gallery.dev.b2.rows.1.0', 'nikki-gallery.dev.b2.rows.1.1'],
              ['nikki-gallery.dev.b2.rows.2.0', 'nikki-gallery.dev.b2.rows.2.1'],
              ['nikki-gallery.dev.b2.rows.3.0', 'nikki-gallery.dev.b2.rows.3.1'],
              ['nikki-gallery.dev.b2.rows.4.0', 'nikki-gallery.dev.b2.rows.4.1'],
            ],
          },
          {
            type: 'paragraph',
            text: 'nikki-gallery.dev.b3',
          },
          {
            type: 'code',
            code: `src/
├── main/          # Electron 主进程（IPC 通信、数据库、扫描器、服务层）
│   ├── app/           # 应用生命周期编排
│   ├── database/      # SQLite + 写入子进程
│   ├── ipc/           # IPC 通道处理（43 个 registerXxxHandlers + 4 个辅助）
│   ├── preload/       # preload 桥命名空间（33 个 api/*.ts）
│   ├── scanner/       # 文件扫描器（含子进程）
│   ├── services/      # 业务服务层（16 个服务/配置文件）
│   ├── sync/          # NikkiSync 协议移植面（认证 / 配对 / 服务端）
│   └── media-worker/  # 缩略图 / pHash / 重复检测子进程
├── renderer/      # 渲染进程（React 前端）
│   ├── components/    # 通用 / 编辑器 / 图库 / 布局 / 共鸣录 / 扫描 / 同步 / 视频组件
│   ├── pages/         # 页面与设置分区（含 settings/ 与 sync-gallery/）
│   ├── stores/        # Zustand 状态管理
│   └── i18n/          # 12 种语言文件
└── shared/        # 跨进程共享类型与错误码`,
          },
        ],
      },
      {
        id: 'docs',
        title: 'nikki-gallery.docs.title',
        blocks: [
          {
            type: 'paragraph',
            text: 'nikki-gallery.docs.b0',
          },
          {
            type: 'links',
            items: [
              {
                label: 'nikki-gallery.docs.b1.0.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/ARCHITECTURE.md',
                description: 'nikki-gallery.docs.b1.0.description',
              },
              {
                label: 'nikki-gallery.docs.b1.1.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/ARCHITECTURE.en.md',
                description: 'nikki-gallery.docs.b1.1.description',
              },
              {
                label: 'nikki-gallery.docs.b1.2.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/DEVELOPMENT.md',
                description: 'nikki-gallery.docs.b1.2.description',
              },
              {
                label: 'nikki-gallery.docs.b1.3.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/DEVELOPMENT.en.md',
                description: 'nikki-gallery.docs.b1.3.description',
              },
              {
                label: 'nikki-gallery.docs.b1.4.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/CHANGELOG.md',
                description: 'nikki-gallery.docs.b1.4.description',
              },
              {
                label: 'nikki-gallery.docs.b1.5.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/tree/main/docs',
                description: 'nikki-gallery.docs.b1.5.description',
              },
              {
                label: 'nikki-gallery.docs.b1.6.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/docs/tutorial/%E7%94%A8%E6%88%B7%E4%BD%BF%E7%94%A8%E6%95%99%E7%A8%8B.md',
                description: 'nikki-gallery.docs.b1.6.description',
              },
              {
                label: 'nikki-gallery.docs.b1.7.label',
                href: 'https://github.com/QianQianLuLu1/MeowStarMap/blob/main/docs/Storybook%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97.md',
                description: 'nikki-gallery.docs.b1.7.description',
              },
            ],
          },
        ],
      },
    ],
  },
} as const;
