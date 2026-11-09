/* 精简后开源板块视觉抽查：#tools 板块高度指标 + 亮/暗主题截图 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9227;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = join(SHOTS_ROOT, 'simplify-0905');
const PROFILE = join(SHOTS_ROOT, '.edge-profile-simplify');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)); } }, 20000);
    });
  }
}
const evalJS = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};
async function shotClip(cdp, name, clip) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log('[截图]', name, JSON.stringify(clip));
}
const scrollWheel = (cdp, y, dy) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y, deltaX: 0, deltaY: dy });

async function captureTheme(cdp, theme) {
  // 直接切 html.dark 类，绕过 localStorage 设置面板
  await evalJS(cdp, `(() => { document.documentElement.classList.toggle('dark', ${theme === 'dark'}); return true; })()`);
  await sleep(600);
  // 滚过整个板块触发 whileInView 入场，再回到板块顶部
  for (let i = 0; i < 4; i++) { await scrollWheel(cdp, 450, 700); await sleep(350); }
  await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
  await sleep(1200);
  const metrics = await evalJS(cdp, `(() => {
    const s = document.querySelector('#tools');
    const r = s.getBoundingClientRect();
    const cards = [...document.querySelectorAll('#tools .grid.gap-8 > div')].map(el => Math.round(el.getBoundingClientRect().height));
    return { sectionH: Math.round(r.height), cardH: cards, vh: innerHeight };
  })()`);
  console.log(`[${theme} 指标]`, JSON.stringify(metrics));
  // 板块整体截图（clip 可能超出视口，captureScreenshot 支持 beyond viewport）
  const box = await evalJS(cdp, `(() => {
    const el = document.querySelector('#tools');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y + scrollY)), width: Math.round(r.width), height: Math.round(r.height) };
  })()`);
  await shotClip(cdp, `tools_${theme}_section.png`, box);
  // 卡片级截图
  const cards = await evalJS(cdp, `(() => {
    return [...document.querySelectorAll('#tools .grid.gap-8 > div')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y + scrollY)), width: Math.round(r.width), height: Math.round(r.height) };
    });
  })()`);
  for (let i = 0; i < cards.length; i++) {
    await shotClip(cdp, `tools_${theme}_card${i + 1}.png`, cards[i]);
  }
  const text = await evalJS(cdp, `(() => {
    const s = document.querySelector('#tools');
    return { links: [...s.querySelectorAll('a')].map(a => a.href), text: s.innerText };
  })()`);
  console.log(`[${theme} 链接]`, JSON.stringify(text.links));
  console.log(`[${theme} 文本]`, JSON.stringify(text.text).slice(0, 600));
}

const main = async () => {
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);

    await captureTheme(cdp, 'light');
    await captureTheme(cdp, 'dark');

    // 移动端 390 亮色抽查
    await evalJS(cdp, `(() => { document.documentElement.classList.remove('dark'); return true; })()`);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1500);
    const m = await evalJS(cdp, `(() => {
      const s = document.querySelector('#tools');
      const r = s.getBoundingClientRect();
      return { sectionH: Math.round(r.height), hasHScroll: document.documentElement.scrollWidth > innerWidth + 2 };
    })()`);
    console.log('[移动端指标]', JSON.stringify(m));
    const mbox = await evalJS(cdp, `(() => {
      const r = document.querySelector('#tools').getBoundingClientRect();
      return { x: 0, y: Math.max(0, Math.round(r.y + scrollY)), width: Math.round(r.width), height: Math.round(r.height) };
    })()`);
    await shotClip(cdp, 'tools_mobile_section.png', mbox);

    console.log('[完成]');
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
