/* 开源板块视觉验收补拍：文档坐标整段截图 + 卡片级截图（GPU 开启，captureBeyondViewport） */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9226;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile-projects2');
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)); } }, 30000);
    });
  }
}
const evalJS = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};
const scrollWheel = (cdp, y, dy) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y, deltaX: 0, deltaY: dy });

const main = async () => {
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);

    // 桌面端：缓慢滚过 #tools 触发所有 whileInView 动画
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1200);
    for (let i = 0; i < 8; i++) { await scrollWheel(cdp, 450, 500); await sleep(350); }
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1200);

    // 文档坐标整段截图（不依赖视口）
    const secDoc = await evalJS(cdp, `(() => {
      const r = document.querySelector('#tools').getBoundingClientRect();
      return { x: Math.max(0, Math.round(r.left)), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) };
    })()`);
    console.log('[section doc]', JSON.stringify(secDoc));
    const cap = async (name, clip, scale) => {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale } });
      writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
      console.log('[截图]', name, JSON.stringify(clip), 'scale', scale);
    };
    await cap('PRJ2_section_full_desktop.png', secDoc, 1.2);

    // 卡片级（文档坐标）
    const cardDocs = await evalJS(cdp, `(() => {
      return [...document.querySelectorAll('#tools .grid.gap-8 > div')].map(el => {
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.left)), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) };
      });
    })()`);
    for (let i = 0; i < cardDocs.length; i++) {
      await cap(`PRJ2_card${i + 1}_desktop.png`, cardDocs[i], 1.5);
    }

    // 滚动中的粘性导航（验证毛玻璃是否正常渲染）
    await evalJS(cdp, `(() => { window.scrollTo(0, ${secDoc.y + secDoc.height - 500}); return true; })()`);
    await sleep(1200);
    await cap('PRJ2_header_scrolled.png', { x: 0, y: secDoc.y + secDoc.height - 900, width: 1440, height: 900 }, 1);

    // 移动端 390：整段截图
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1200);
    for (let i = 0; i < 14; i++) { await scrollWheel(cdp, 420, 600); await sleep(250); }
    const secM = await evalJS(cdp, `(() => {
      const r = document.querySelector('#tools').getBoundingClientRect();
      return { x: 0, y: Math.round(r.top + scrollY), width: 390, height: Math.round(r.height) };
    })()`);
    console.log('[section mobile doc]', JSON.stringify(secM));
    await cap('PRJ2_section_full_mobile.png', secM, 1.5);

    console.log('[完成]');
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
