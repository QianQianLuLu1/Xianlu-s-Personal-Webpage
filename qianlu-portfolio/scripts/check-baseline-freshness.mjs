#!/usr/bin/env node
/**
 * 构建期基线新鲜度门（README「GitHub 专区数据同步」契约）：
 * - projects.meta.json 缺失 / syncedAt 无效 / 超过 24h 未刷新 → 拒绝构建；
 * - degraded=true（GitHub 不可达的兜底产物）→ 同样拒绝；
 * - GITHUB_SYNC_MAX_AGE_MS 可覆盖阈值（测试用）；
 * - reconstructed=true（2026-11-08 源码丢失后从 dist 重建的基线，原始 syncedAt
 *   不可考）→ 默认拒绝，须显式 QIANLU_ACCEPT_RECONSTRUCTED_BASELINE=1 放行并告警。
 * dev / test 不经此门，本地可离线开发。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const META_PATH = path.join(dirname, '..', 'src', 'data', 'projects.meta.json');
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function fail(message) {
  console.error(`[baseline-freshness] ${message}`);
  process.exit(1);
}

let meta;
try {
  meta = JSON.parse(readFileSync(META_PATH, 'utf8'));
} catch {
  fail(`无法读取 ${META_PATH}，请先执行 npm run github:sync`);
}

if (meta.degraded === true) {
  fail(
    '基线处于 degraded 兜底状态（GitHub 不可达时生成），拒绝构建。请网络恢复后执行 npm run github:sync -- --force'
  );
}

if (meta.reconstructed === true) {
  if (process.env.QIANLU_ACCEPT_RECONSTRUCTED_BASELINE !== '1') {
    fail(
      '当前基线为 dist 重建版（原始同步时间戳不可考）。确认接受请以 QIANLU_ACCEPT_RECONSTRUCTED_BASELINE=1 重试，或执行 npm run github:sync 刷新'
    );
  }
  console.warn(
    '[baseline-freshness] ⚠ 正在使用 dist 重建基线（无原始同步时间戳）。建议尽快执行 npm run github:sync -- --force 恢复联网基线。'
  );
  process.exit(0);
}

const envMaxAge = Number(process.env.GITHUB_SYNC_MAX_AGE_MS);
const maxAgeMs =
  Number.isFinite(envMaxAge) && process.env.GITHUB_SYNC_MAX_AGE_MS !== undefined
    ? envMaxAge
    : DEFAULT_MAX_AGE_MS;

const syncedAt = Date.parse(meta.syncedAt ?? '');
if (!Number.isFinite(syncedAt)) {
  fail('projects.meta.json 缺少有效 syncedAt，请执行 npm run github:sync');
}

const ageMs = Date.now() - syncedAt;
if (ageMs > maxAgeMs) {
  fail(
    `基线已 ${(ageMs / 3_600_000).toFixed(1)} 小时未刷新（上限 ${(maxAgeMs / 3_600_000).toFixed(1)} 小时），请执行 npm run github:sync -- --force`
  );
}

console.log(
  `[baseline-freshness] 基线新鲜（${Math.max(0, ageMs / 60_000).toFixed(0)} 分钟前同步）`
);
