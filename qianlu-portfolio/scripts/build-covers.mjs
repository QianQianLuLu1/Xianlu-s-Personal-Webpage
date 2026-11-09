/**
 * GitHub 项目封面素材处理管线。
 *
 *   素材源（只读）  <PROJECT_ROOT>/../素材/GitHub/{FlashGaze,NikkiGallery}/IMG_*.{jpg,png}
 *   产物输出        public\projects\{flashgaze,nikki}-cover.webp
 *
 * 流程：读源图 → 缩放至宽 1600 → WebP → 体积预算校验（≤300KB，超出自动降 quality 重压）
 *
 * 体积预算：单张 ≤ 300KB（一级界面卡片左半栏渲染 ≤528px，2x DPR 约 1056px，1600 宽足够）
 *
 * 幂等：产物齐全时跳过重建，加 --force 强制重跑。
 * 不改动素材源目录任何文件。
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.resolve(PROJECT_ROOT, '..', '素材', 'GitHub');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'projects');

const FORCE = process.argv.includes('--force');

const TARGET_WIDTH = 1600;
const START_QUALITY = 82;
const MIN_QUALITY = 40;
const QUALITY_STEP = 8;
const BUDGET_BYTES = 300 * 1024;

const JOBS = [
  { name: 'FlashGaze', output: 'flashgaze-cover.webp' },
  { name: 'NikkiGallery', output: 'nikki-cover.webp' },
];

function log(...args) {
  console.log('[build-covers]', ...args);
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/** 在素材目录中找第一张图片（按文件名排序），找不到则报错 */
async function findSource(folder) {
  const dir = path.join(SOURCE_ROOT, folder);
  const entries = await readdir(dir);
  const files = entries.filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  if (files.length === 0) {
    throw new Error(`素材目录中没有找到图片：${dir}`);
  }
  if (files.length > 1) {
    log(`提示：${dir} 下有 ${files.length} 张图片，使用 ${files[0]}`);
  }
  return path.join(dir, files[0]);
}

/** 缩放 + WebP 压缩；超预算自动降 quality 重压，直到满足或触及下限 */
async function compress(sourcePath) {
  let quality = START_QUALITY;
  for (;;) {
    const buf = await sharp(sourcePath)
      .resize({ width: TARGET_WIDTH })
      .webp({ quality })
      .toBuffer();
    if (buf.length <= BUDGET_BYTES || quality <= MIN_QUALITY) {
      const meta = await sharp(buf).metadata();
      return { buf, quality, width: meta.width, height: meta.height };
    }
    quality -= QUALITY_STEP;
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const outputs = JOBS.map((job) => path.join(OUTPUT_DIR, job.output));
  const allExist = (await Promise.all(outputs.map(fileExists))).every(Boolean);
  if (allExist && !FORCE) {
    log('产物齐全，跳过重建（--force 可强制重跑）');
    return;
  }

  for (const [index, job] of JOBS.entries()) {
    const sourcePath = await findSource(job.name);
    const { buf, quality, width, height } = await compress(sourcePath);
    if (buf.length > BUDGET_BYTES) {
      throw new Error(`${job.output} 压缩后仍超预算：${(buf.length / 1024).toFixed(1)}KB`);
    }
    await writeFile(outputs[index], buf);
    log(
      `${job.output}: ${width}x${height} q${quality} ${(buf.length / 1024).toFixed(1)}KB <- ${path.basename(sourcePath)}`
    );
  }
  log('完成');
}

main().catch((error) => {
  console.error('[build-covers] 失败：', error);
  process.exit(1);
});
