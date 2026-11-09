/*
 * 七原则改造 · 补充截图（明/暗双主题分区，主题自适应）。
 * 前置：npm run preview（localhost:4173）。用法：node gui-shot-redesign.mjs
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
const PROFILE = join(SHOTS_ROOT, '.edge-profile-redesign2');
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

const evalJS = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};

const shot = async (cdp, name) => {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${name}`);
};

const click = async (cdp, p) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await sleep(60);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
};

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

    await cdp.send('Page.navigate', { url: BASE + '/?theme-shot=1' });
    await sleep(3500);

    // 逐区滚动触发入场动画与懒加载，然后回顶
    for (const id of ['tools', 'journey', 'gallery', 'about']) {
      await evalJS(cdp, `document.getElementById(${JSON.stringify(id)}).scrollIntoView({ behavior: 'instant' })`);
      await sleep(800);
    }
    await evalJS(cdp, `window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(700);

    const themeOf = () => evalJS(cdp, `document.documentElement.classList.contains('dark') ? 'dark' : 'light'`);
    const snapSections = async (label) => {
      const go = async (id, settle = 900) => {
        await evalJS(cdp, `document.getElementById(${JSON.stringify(id)}).scrollIntoView({ behavior: 'instant' })`);
        await sleep(settle);
      };
      await go('tools');
      await shot(cdp, `REDESIGN_${label}_tools.png`);
      await go('journey');
      await shot(cdp, `REDESIGN_${label}_journey.png`);
      await go('gallery', 1400);
      await shot(cdp, `REDESIGN_${label}_gallery.png`);
      await go('about');
      await shot(cdp, `REDESIGN_${label}_about.png`);
    };

    // 第一组：当前初始主题
    const first = await themeOf();
    console.log('[诊断] 初始主题 =', first);
    await shot(cdp, `REDESIGN_${first}_hero.png`);
    await snapSections(first);

    // 第二组：真实 GUI 点击主题切换按钮后
    const toggle = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('header button')].find((el) => (el.getAttribute('aria-label') || '').includes('切换到'));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: b.getAttribute('aria-label') };
    })()`);
    if (!toggle) throw new Error('找不到主题切换按钮');
    console.log('[诊断] 点击', toggle.label);
    await click(cdp, toggle);
    await sleep(1200);
    const second = await themeOf();
    if (second === first) throw new Error('主题切换未生效');
    await evalJS(cdp, `window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(700);
    await shot(cdp, `REDESIGN_${second}_hero.png`);
    await snapSections(second);
    console.log('[完成] 两组主题截图：', first, '→', second);
  } finally {
    edge.kill();
  }
};

main().catch((e) => { console.error('[脚本失败]', e.message); process.exitCode = 1; });
