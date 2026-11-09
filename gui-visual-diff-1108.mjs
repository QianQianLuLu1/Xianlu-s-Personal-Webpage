/*
 * 重建保真视觉对拍（2026-11-08）：dev(5173, 重建源码) vs preview(4173, 原始 dist)。
 * 两侧均预设 compat 模式冻结动画、light 主题、同视口同滚动位，截图后用 sharp 像素 diff。
 * 用法：node gui-visual-diff-1108.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, 'qianlu-portfolio', 'package.json'));
const sharp = require('sharp');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9231;
const OUT = join(HERE, 'qianlu-portfolio', 'gui-test-screenshots', 'visual-diff-1108');
// Edge profile 必须放在项目树外：vite dev 会 watch 项目内文件，Edge 锁定的缓存文件会导致 EBUSY 崩溃
const PROFILE = join(tmpdir(), 'qianlu-edge-profile-visual-diff');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('CDP 端口未就绪');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP 超时: ${method}`));
        }
      }, 20000);
    });
  }
}

async function evalRO(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}

const CAPTURES = [
  { name: 'home-hero', path: '/', section: null },
  { name: 'home-tools', path: '/', section: 'tools' },
  { name: 'home-journey', path: '/', section: 'journey' },
  { name: 'home-gallery', path: '/', section: 'gallery' },
  { name: 'detail-flashgaze', path: '/projects/flashgaze', section: null },
  { name: 'detail-nikki', path: '/projects/nikki-gallery', section: null },
];

async function captureSet(cdp, base, tag) {
  const files = {};
  for (const cap of CAPTURES) {
    await cdp.send('Page.navigate', { url: base + cap.path });
    await sleep(2600);
    if (cap.section) {
      await evalRO(cdp, `(() => { const el = document.getElementById(${JSON.stringify(cap.section)}); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'instant' }); })()`);
      await sleep(1600);
    }
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = join(OUT, `${tag}-${cap.name}.png`);
    writeFileSync(file, Buffer.from(r.data, 'base64'));
    files[cap.name] = file;
    console.log(`[截图] ${tag}-${cap.name}.png`);
  }
  return files;
}

async function diffPair(a, b) {
  const ia = sharp(a), ib = sharp(b);
  const ma = await ia.metadata(), mb = await ib.metadata();
  if (ma.width !== mb.width || ma.height !== mb.height) return { pct: 100, note: `尺寸不同 ${ma.width}x${ma.height} vs ${mb.width}x${mb.height}` };
  const ra = await ia.removeAlpha().raw().toBuffer();
  const rb = await ib.removeAlpha().raw().toBuffer();
  let diff = 0;
  const total = ra.length / 3;
  for (let i = 0; i < ra.length; i += 3) {
    if (Math.abs(ra[i] - rb[i]) > 10 || Math.abs(ra[i + 1] - rb[i + 1]) > 10 || Math.abs(ra[i + 2] - rb[i + 2]) > 10) diff++;
  }
  return { pct: +((diff / total) * 100).toFixed(3), diffPixels: diff, total };
}

const main = async () => {
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900',
    '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    // 冻结动画 + 固定主题/配色，保证两侧可比
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      try {
        localStorage.setItem('qianlu.settings.mode', 'compat');
        localStorage.setItem('qianlu.theme', 'light');
        localStorage.setItem('qianlu.settings.palette', 'air');
      } catch {}
    ` });

    const dist = await captureSet(cdp, 'http://localhost:4173', 'dist');
    const dev = await captureSet(cdp, 'http://localhost:5173', 'dev');

    console.log('\n===== 像素 diff（阈值 1%）=====');
    let worst = 0;
    for (const cap of CAPTURES) {
      const d = await diffPair(dist[cap.name], dev[cap.name]);
      worst = Math.max(worst, d.pct);
      console.log(`[${d.pct <= 1 ? 'PASS' : 'FAIL'}] ${cap.name}: ${d.pct}% 像素差异 ${JSON.stringify(d)}`);
    }
    console.log(`\n最大差异 ${worst}%`);
    if (worst > 1) process.exitCode = 1;
  } finally {
    edge.kill();
  }
};

main().catch((e) => {
  console.error('[脚本失败]', e.message);
  process.exitCode = 1;
});