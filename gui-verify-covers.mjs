/*
 * GitHub 专区封面替换验收脚本（无头 Edge CDP，与 gui-verify-redesign.mjs 同模式）：
 * 验证 封面换为真实截图 / 卡片图片区铺满左半栏 / 16:9 等高 / 移动端适配 / 详情页封面 / 零报错。
 * 前置：npm run build && npm run preview（localhost:4173）。
 * 用法：node gui-verify-covers.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9225;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile-covers');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${detail ? JSON.stringify(detail) : ''}`);
};

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

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, name);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${file}`);
  return file;
}

/** 等 #tools 内两张封面加载完成（懒加载，先滚入视口） */
async function waitCovers(cdp) {
  await evalJS(cdp, `document.getElementById('tools').scrollIntoView({ block: 'start', behavior: 'instant' })`);
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const s = await evalJS(cdp, `(() => {
      const imgs = [...document.querySelectorAll('#tools img[alt$="封面"]')];
      return { total: imgs.length, complete: imgs.filter((i) => i.complete && i.naturalWidth > 0).length };
    })()`);
    if (s.total === 2 && s.complete === 2) return s;
  }
  return evalJS(cdp, `(() => {
    const imgs = [...document.querySelectorAll('#tools img[alt$="封面"]')];
    return { total: imgs.length, complete: imgs.filter((i) => i.complete && i.naturalWidth > 0).length };
  })()`);
}

const main = async () => {
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900',
    '--disable-gpu', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // 收集 console 错误与页面异常
    const consoleErrors = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push('log: ' + m.params.entry.text.slice(0, 200));
    });
    // 收集封面网络响应状态
    const coverResponses = {};
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Network.responseReceived' && m.params.response.url.includes('-cover.webp')) {
        coverResponses[m.params.response.url] = m.params.response.status;
      }
    });

    // ===== C1 桌面端封面：真实截图、铺满左半栏、16:9 等高 =====
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(2500);
    const loaded = await waitCovers(cdp);
    record('C1 两张封面加载完成', loaded.total === 2 && loaded.complete === 2, loaded);

    const desktop = await evalJS(cdp, `(() => {
      const imgs = [...document.querySelectorAll('#tools img[alt$="封面"]')];
      const toInfo = (img) => {
        const r = img.getBoundingClientRect();
        const s = getComputedStyle(img);
        return {
          alt: img.alt,
          src: img.getAttribute('src'),
          natural: img.naturalWidth + 'x' + img.naturalHeight,
          boxW: Math.round(r.width),
          boxH: Math.round(r.height),
          ratio: +(r.width / r.height).toFixed(3),
          objectFit: s.objectFit,
          linkW: Math.round(img.closest('a').getBoundingClientRect().width),
        };
      };
      const infos = imgs.map(toInfo);
      return {
        infos,
        svgLeft: document.querySelectorAll('#tools img[src$=".svg"]').length,
        sameHeight: infos.length === 2 && Math.abs(infos[0].boxH - infos[1].boxH) <= 1,
      };
    })()`);
    const [a, b] = desktop.infos;
    record('C1 封面指向新 WebP', a.src === '/projects/nikki-cover.webp' && b.src === '/projects/flashgaze-cover.webp', { srcs: [a.src, b.src] });
    record('C1 无占位 SVG 残留', desktop.svgLeft === 0, { svgLeft: desktop.svgLeft });
    record('C1 封面铺满左半栏(>448 旧上限)', a.boxW > 448 && b.boxW > 448 && a.boxW === a.linkW && b.boxW === b.linkW, { boxWs: [a.boxW, b.boxW], linkWs: [a.linkW, b.linkW] });
    record('C1 图片区 16:9 等高', Math.abs(a.ratio - 16 / 9) < 0.02 && Math.abs(b.ratio - 16 / 9) < 0.02 && desktop.sameHeight, { ratios: [a.ratio, b.ratio], sameHeight: desktop.sameHeight, heights: [a.boxH, b.boxH] });
    record('C1 object-cover 防变形', a.objectFit === 'cover' && b.objectFit === 'cover', { objectFit: [a.objectFit, b.objectFit] });

    // 整段 #tools 截图（超出视口裁切）
    const clip = await evalJS(cdp, `(() => {
      const r = document.getElementById('tools').getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y) + window.scrollY, width: Math.min(r.width, 1440), height: Math.min(r.height, 4000) };
    })()`);
    const r1 = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
    writeFileSync(join(OUT, 'COVERS_C1_desktop_tools.png'), Buffer.from(r1.data, 'base64'));
    console.log(`[截图] ${join(OUT, 'COVERS_C1_desktop_tools.png')}`);

    // ===== C2 封面网络请求 200 =====
    const statuses = Object.entries(coverResponses);
    record('C2 封面请求均 200', statuses.length === 2 && statuses.every(([, s]) => s === 200), Object.fromEntries(statuses.map(([u, s]) => [u.split('/').pop(), s])));

    // ===== C3 详情页封面 =====
    for (const [path, file] of [['/projects/nikki-gallery', 'nikki-cover.webp'], ['/projects/flashgaze', 'flashgaze-cover.webp']]) {
      await cdp.send('Page.navigate', { url: BASE + path });
      await sleep(1800);
      const hero = await evalJS(cdp, `(() => {
        const img = document.querySelector('img[alt$="封面"]');
        if (!img) return { found: false };
        const r = img.getBoundingClientRect();
        return { found: true, src: img.getAttribute('src'), complete: img.complete && img.naturalWidth > 0, natural: img.naturalWidth + 'x' + img.naturalHeight, boxW: Math.round(r.width), ratio: +(r.width / r.height).toFixed(3) };
      })()`);
      record(`C3 详情页 ${path} 封面`, hero.found && hero.complete && hero.src.endsWith(file), hero);
      await shot(cdp, `COVERS_C3_detail_${file.replace('-cover.webp', '')}.png`);
    }

    // ===== C4 移动端 390px：封面占满卡宽、16:9 不变形 =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(2500);
    const mLoaded = await waitCovers(cdp);
    const mobile = await evalJS(cdp, `(() => {
      const imgs = [...document.querySelectorAll('#tools img[alt$="封面"]')];
      const infos = imgs.map((img) => {
        const r = img.getBoundingClientRect();
        return { alt: img.alt, boxW: Math.round(r.width), ratio: +(r.width / r.height).toFixed(3) };
      });
      return { infos, vw: window.innerWidth };
    })()`);
    record('C4 移动端封面加载', mLoaded.total === 2 && mLoaded.complete === 2, mLoaded);
    record('C4 移动端封面占满卡宽且 16:9', mobile.infos.every((i) => i.boxW >= 300 && Math.abs(i.ratio - 16 / 9) < 0.02), mobile);
    await shot(cdp, 'COVERS_C4_mobile_tools.png');
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // ===== C5 Console 零报错 =====
    record('C5 Console 零报错', consoleErrors.length === 0, consoleErrors);

    // ===== 汇总 =====
    const failed = results.filter((r) => !r.pass);
    console.log(`\n===== 验收汇总：${results.length - failed.length}/${results.length} 通过 =====`);
    if (failed.length) {
      console.log('未通过项：');
      for (const f of failed) console.log(` - ${f.name} ${JSON.stringify(f.detail)}`);
      process.exitCode = 1;
    }
  } finally {
    edge.kill();
  }
};

main().catch((e) => {
  console.error('[脚本失败]', e.message);
  process.exitCode = 1;
});
