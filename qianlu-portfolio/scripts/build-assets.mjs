/**
 * 摄影作品素材处理管线。
 *
 *   素材源（只读）  ../素材/摄影作品/*.jpg（相对脚本位置自动推导，见下方 SOURCE_DIR）
 *   产物输出        public\photos\  +  public\photos\manifest.json
 *
 * 流程：内容哈希去重 → 生成 4K/2K 双档 → AVIF + WebP 双格式 → 体积预算校验 → 写 manifest
 *
 * 体积预算（超出则自动降 quality 重压）：
 *   4K AVIF ≤ 500KB   4K WebP ≤ 700KB
 *   2K AVIF ≤ 300KB   2K WebP ≤ 450KB
 *
 * 幂等：产物齐全时跳过重建，加 --force 强制重跑。
 * 不备份原图：素材源目录只读，脚本不会删除任何源文件，无需冗余副本
 * （备份到 public/ 会让约 140MB 原图进入部署包）。
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.resolve(PROJECT_ROOT, '..', '素材', '摄影作品');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'photos');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const GENERATED_TS_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'photos.generated.ts');

const FORCE = process.argv.includes('--force');

const VARIANTS = [
  { key: '4k', width: 3840 },
  { key: '2k', width: 2560 },
];

/** 体积预算（字节） */
const BUDGET = {
  '4k': { avif: 500 * 1024, webp: 700 * 1024 },
  '2k': { avif: 300 * 1024, webp: 450 * 1024 },
};

const START_QUALITY = { avif: 60, webp: 78 };
const MIN_QUALITY = 30;
const QUALITY_STEP = 8;

const AVIF_EFFORT = 4;
const MANIFEST_VERSION = 1;

function log(...args) {
  console.log('[build-assets]', ...args);
}

/** 按内容哈希去重，返回唯一文件列表（按文件名排序，保证顺序稳定） */
async function collectUniqueSources() {
  const entries = await readdir(SOURCE_DIR);
  const files = entries.filter((name) => /\.(jpe?g)$/i.test(name)).sort();

  if (files.length === 0) {
    throw new Error(`素材目录中没有找到 jpg 文件：${SOURCE_DIR}`);
  }

  const seen = new Map();
  let duplicateCount = 0;

  for (const name of files) {
    const fullPath = path.join(SOURCE_DIR, name);
    const content = await readFile(fullPath);
    const hash = createHash('sha256').update(content).digest('hex');

    if (seen.has(hash)) {
      duplicateCount += 1;
      continue;
    }
    seen.set(hash, { name, fullPath, bytes: content.length });
  }

  return { unique: [...seen.values()], total: files.length, duplicateCount };
}

/** 在体积预算内编码，超预算则逐步降低 quality */
async function encodeWithinBudget(pipeline, format, budgetBytes) {
  let quality = START_QUALITY[format];
  let buffer;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const instance = pipeline.clone();
    buffer =
      format === 'avif'
        ? await instance.avif({ quality, effort: AVIF_EFFORT }).toBuffer()
        : await instance.webp({ quality }).toBuffer();

    if (buffer.length <= budgetBytes) break;

    if (quality <= MIN_QUALITY) break;
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
  }

  return { buffer, quality, bytes: buffer.length };
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function main() {
  log('素材源：', SOURCE_DIR);

  // 幂等检查
  if (!FORCE) {
    try {
      const existing = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
      const allExist = await Promise.all(
        (existing.photos ?? []).flatMap((photo) =>
          Object.values(photo.sizes).flatMap((variant) =>
            [variant.avif, variant.webp].map((rel) =>
              stat(path.join(PROJECT_ROOT, 'public', rel)).then(
                () => true,
                () => false
              )
            )
          )
        )
      );
      const generatedExists = await stat(GENERATED_TS_PATH).then(
        () => true,
        () => false
      );

      if (allExist.length > 0 && allExist.every(Boolean) && generatedExists) {
        log(`产物已存在（${existing.photos.length} 张），跳过。需要重跑请加 --force`);
        return;
      }
    } catch {
      // manifest 不存在或已损坏，正常继续构建
    }
  }

  const { unique, total, duplicateCount } = await collectUniqueSources();
  log(`扫描 ${total} 个文件，去重后 ${unique.length} 张唯一（移除 ${duplicateCount} 个重复项）`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const photos = [];
  let fileCount = 0;
  let totalBytes = 0;

  for (const [index, source] of unique.entries()) {
    const id = `photo-${String(index + 1).padStart(2, '0')}`;
    const title = String(index + 1).padStart(2, '0');

    const base = sharp(source.fullPath);
    const meta = await base.metadata();
    const sizes = {};

    // 源图宽度不足时（withoutEnlargement 禁止放大），相邻档位会输出完全相同的文件。
    // 此时复用较小档位的产物，避免出现名不副实的「4K」，同时省下一份冗余文件。
    let lastWidth = null;
    let lastEntry = null;

    for (const variant of VARIANTS) {
      const targetWidth = Math.min(meta.width ?? variant.width, variant.width);

      if (lastWidth === targetWidth && lastEntry) {
        sizes[variant.key] = lastEntry;
        continue;
      }

      const resized = base.clone().resize({
        width: variant.width,
        withoutEnlargement: true,
      });

      const budget = BUDGET[variant.key];

      const [avif, webp] = await Promise.all([
        encodeWithinBudget(resized, 'avif', budget.avif),
        encodeWithinBudget(resized, 'webp', budget.webp),
      ]);

      const avifName = `${id}-${variant.key}.avif`;
      const webpName = `${id}-${variant.key}.webp`;

      await Promise.all([
        writeFile(path.join(OUTPUT_DIR, avifName), avif.buffer),
        writeFile(path.join(OUTPUT_DIR, webpName), webp.buffer),
      ]);

      lastEntry = {
        avif: `/photos/${avifName}`,
        webp: `/photos/${webpName}`,
        pixelWidth: targetWidth,
        bytes: { avif: avif.bytes, webp: webp.bytes },
      };
      sizes[variant.key] = lastEntry;
      lastWidth = targetWidth;
      fileCount += 2;
      totalBytes += avif.bytes + webp.bytes;
    }

    const ratio = meta.width && meta.height ? (meta.width / meta.height).toFixed(3) : null;
    const outWidth = meta.width ? Math.min(meta.width, VARIANTS[0].width) : null;
    const outHeight = outWidth && ratio ? Math.round(outWidth / Number(ratio)) : null;

    photos.push({
      id,
      title,
      width: outWidth,
      height: outHeight,
      sizes,
    });

    log(
      `${id}  源 ${formatKB(source.bytes)}  ${meta.width}×${meta.height}  →  ` +
        `4K ${formatKB(sizes['4k'].bytes.avif)}/${formatKB(sizes['4k'].bytes.webp)}  ` +
        `2K ${formatKB(sizes['2k'].bytes.avif)}/${formatKB(sizes['2k'].bytes.webp)}`
    );
  }

  const manifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      dir: SOURCE_DIR,
      scannedFiles: total,
      duplicateFiles: duplicateCount,
    },
    count: photos.length,
    photos,
  };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  // 同时生成一份 TS 模块供构建期导入，避免运行时额外请求一次 manifest
  const generatedTs = `// 本文件由 scripts/build-assets.mjs 自动生成，请勿手动修改。
// 重新生成：npm run assets:build

export interface PhotoVariant {
  avif: string;
  webp: string;
  pixelWidth: number;
  bytes: { avif: number; webp: number };
}

export interface Photo {
  id: string;
  title: string;
  width: number | null;
  height: number | null;
  sizes: { '4k': PhotoVariant; '2k': PhotoVariant };
}

export const PHOTOS: readonly Photo[] = ${JSON.stringify(photos, null, 2)};

export const PHOTOS_META = ${JSON.stringify(
    { version: manifest.version, generatedAt: manifest.generatedAt, count: manifest.count },
    null,
    2
  )};
`;

  await mkdir(path.dirname(GENERATED_TS_PATH), { recursive: true });
  await writeFile(GENERATED_TS_PATH, generatedTs, 'utf8');

  // 清理孤儿产物：生成后按 manifest 引用比对，只删除无人引用的文件。
  // 不做整目录清空，一来避免误删，二来删除量小、不会触发批量删除保护。
  const referenced = new Set(
    photos.flatMap((photo) =>
      Object.values(photo.sizes).flatMap((variant) => [
        path.basename(variant.avif),
        path.basename(variant.webp),
      ])
    )
  );
  const existingFiles = (await readdir(OUTPUT_DIR)).filter((name) => /\.(avif|webp)$/i.test(name));
  const orphans = existingFiles.filter((name) => !referenced.has(name));

  if (orphans.length > 0) {
    await Promise.all(orphans.map((name) => rm(path.join(OUTPUT_DIR, name))));
    log(`清理孤儿产物 ${orphans.length} 个：${orphans.join(', ')}`);
  }

  log(`完成：${photos.length} 张，共生成 ${fileCount} 个文件（复用档位不重复生成）`);
  log(`产物总大小：${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
  log('manifest：', MANIFEST_PATH);
}

main().catch((error) => {
  console.error('[build-assets] 失败：', error);
  process.exit(1);
});
