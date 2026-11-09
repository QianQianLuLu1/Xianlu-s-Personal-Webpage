import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  Clapperboard,
  Copy,
  CopyX,
  ExternalLink,
  FolderTree,
  Gauge,
  Info,
  KeyRound,
  Languages,
  Layers,
  LayoutGrid,
  MessageSquareText,
  Mountain,
  Palette,
  Plug,
  Puzzle,
  ScanSearch,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserCog,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  DetailBlock,
  DetailFeature,
  DetailFlowNode,
  DetailIcon,
  DetailLink,
} from '@/data/project-details';

/** 图标字符串 → lucide 组件（数据层不直接依赖组件库，映射集中在此） */
const DETAIL_ICONS: Record<DetailIcon, LucideIcon> = {
  scan: ScanSearch,
  gallery: LayoutGrid,
  edit: SlidersHorizontal,
  video: Clapperboard,
  organize: FolderTree,
  dedup: CopyX,
  share: Share2,
  languages: Languages,
  theme: Palette,
  plugins: Puzzle,
  profile: UserCog,
  decrypt: KeyRound,
  diagnose: Stethoscope,
  gauge: Gauge,
  explain: MessageSquareText,
  scene: Mountain,
  providers: Layers,
  agent: Bot,
  offline: WifiOff,
  degrade: ShieldCheck,
  mcp: Plug,
};

function ParagraphBlock({ text }: { text: string }) {
  return <p className="text-ink/70 leading-relaxed">{text}</p>;
}

function FeaturesBlock({ items }: { items: readonly DetailFeature[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = DETAIL_ICONS[item.icon] ?? Sparkles;
        return (
          <div key={item.title} className="border-hairline bg-pine/5 rounded-card border p-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="bg-clay/10 text-clay flex size-8 shrink-0 items-center justify-center rounded-full"
              >
                <Icon className="size-4" />
              </span>
              <h3 className="text-ink text-sm font-semibold">{item.title}</h3>
            </div>
            <p className="text-ink/60 mt-2.5 text-sm leading-relaxed">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function FlowBlock({ nodes, note }: { nodes: readonly DetailFlowNode[]; note?: string }) {
  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-4">
        {nodes.map((node, index) => (
          <li key={node.title} className="relative flex flex-col">
            <div className="border-hairline bg-pine/5 rounded-card h-full border p-4 text-center">
              <p className="text-ink font-mono text-sm font-semibold">{node.title}</p>
              {/* 多行步骤列表显式左对齐，不继承卡片的 text-center（UI 细节规则 6） */}
              <ul className="mt-1.5 space-y-0.5 text-left">
                {node.lines.map((line) => (
                  <li key={line} className="text-ink/60 text-xs leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            {index < nodes.length - 1 && (
              <>
                <ArrowRight
                  aria-hidden="true"
                  className="text-clay absolute top-1/2 -right-[22px] z-(--z-decor) hidden size-4 -translate-y-1/2 md:block"
                />
                <ArrowDown
                  aria-hidden="true"
                  className="text-clay mx-auto mt-1 block size-4 md:hidden"
                />
              </>
            )}
          </li>
        ))}
      </ol>
      {note && <p className="text-ink/65 mt-3 text-xs leading-relaxed">{note}</p>}
    </div>
  );
}

function StepsBlock({ items }: { items: readonly { title: string; text?: string }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden="true"
            className="bg-clay text-on-accent mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          >
            {index + 1}
          </span>
          <div>
            <h3 className="text-ink text-sm font-semibold">{step.title}</h3>
            {step.text && <p className="text-ink/60 mt-1 text-sm leading-relaxed">{step.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用（如非安全上下文）时静默，不影响阅读 */
    }
  };

  return (
    <figure className="border-hairline rounded-card overflow-hidden border">
      <figcaption className="border-hairline bg-ink/5 flex items-center justify-between border-b px-4 py-2">
        <span className="text-ink/65 font-mono text-xs">{language ?? 'text'}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? '已复制' : '复制代码'}
          className="code-copy-btn text-ink/65 hover:text-clay inline-flex cursor-pointer items-center gap-1 text-xs transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </figcaption>
      <pre className="bg-ink/[0.03] text-ink/80 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function TableBlock({
  headers,
  rows,
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="border-hairline rounded-card overflow-x-auto border">
      <table className="text-ink/70 w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="bg-pine/10">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="text-ink border-hairline border-b px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('\u0000')} className="border-hairline border-b last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    'border-hairline px-4 py-2.5 align-top',
                    cellIndex === 0 && 'text-ink font-medium whitespace-nowrap'
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalloutBlock({
  variant,
  title,
  text,
}: {
  variant: 'info' | 'warn';
  title?: string;
  text: string;
}) {
  const isWarn = variant === 'warn';
  const Icon = isWarn ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        isWarn ? 'border-clay/30 bg-clay/5' : 'border-pine/30 bg-pine/5'
      )}
    >
      {/* 图标与多行文案显式顶对齐（UI 细节规则 3），mt-0.5 让图标落在首行基线 */}
      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn('mt-0.5 size-4 shrink-0', isWarn ? 'text-clay' : 'text-pine')}
        />
        <div>
          {title && <p className="text-ink text-sm font-semibold">{title}</p>}
          <p className="text-ink/70 mt-0.5 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

function LinksBlock({ items }: { items: readonly DetailLink[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border-hairline hover:border-clay/40 hover:bg-ink/5 group rounded-card flex h-full items-start gap-3 border p-4 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-clay truncate font-mono text-sm font-medium group-hover:underline">
                {link.label}
              </p>
              {link.description && (
                <p className="text-ink/60 mt-1 text-xs leading-relaxed">{link.description}</p>
              )}
            </div>
            <ExternalLink
              aria-hidden="true"
              className="text-ink/55 group-hover:text-clay ml-auto size-4 shrink-0 transition-colors"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** 详情页章节内容块渲染器：按 block 类型分发到对应的排版组件 */
export default function DetailBlocks({ blocks }: { blocks: readonly DetailBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return <ParagraphBlock key={index} text={block.text} />;
          case 'features':
            return <FeaturesBlock key={index} items={block.items} />;
          case 'flow':
            return <FlowBlock key={index} nodes={block.nodes} note={block.note} />;
          case 'steps':
            return <StepsBlock key={index} items={block.items} />;
          case 'code':
            return <CodeBlock key={index} language={block.language} code={block.code} />;
          case 'table':
            return <TableBlock key={index} headers={block.headers} rows={block.rows} />;
          case 'callout':
            return (
              <CalloutBlock
                key={index}
                variant={block.variant}
                title={block.title}
                text={block.text}
              />
            );
          case 'links':
            return <LinksBlock key={index} items={block.items} />;
        }
      })}
    </>
  );
}
