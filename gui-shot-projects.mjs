/* 开源板块视觉验收截图：#tools 两个项目卡片（桌面 + 移动端） */
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
const PROFILE = join(SHOTS_ROOT, '.edge-profile-projects');
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
async function shotFull(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log('[截图]', name);
}
const scrollWheel = (cdp, y, dy) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y, deltaX: 0, deltaY: dy });

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

    // 桌面端：滚动到 #tools，触发 whileInView 动画
    const sec = await evalJS(cdp, `(() => {
      const s = document.querySelector('#tools');
      s.scrollIntoView({ block: 'start' });
      const r = s.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), height: Math.round(r.height), docH: document.documentElement.scrollHeight };
    })()`);
    console.log('[section]', JSON.stringify(sec));
    await sleep(1500);
    // 缓慢滚过整个板块，确保两张卡片都进入过视口
    for (let i = 0; i < 6; i++) { await scrollWheel(cdp, 450, 600); await sleep(400); }
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1500);

    const sec2 = await evalJS(cdp, `(() => {
      const s = document.querySelector('#tools');
      const r = s.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height), vh: innerHeight };
    })()`);
    // 整个板块可能高于视口，分两屏截图 + 卡片级截图
    const cards = await evalJS(cdp, `(() => {
      return [...document.querySelectorAll('#tools .grid.gap-8 > div')].map(el => {
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
      });
    })()`);
    console.log('[cards]', JSON.stringify(cards));
    await sleep(1200);
    // 卡片级截图（每张卡片单独截）
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const pos = await evalJS(cdp, `(() => {
        const el = document.querySelectorAll('#tools .grid.gap-8 > div')[${i}];
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
      })()`);
      await sleep(800);
      await shotClip(cdp, `PROJECTS_card${i + 1}_desktop.png`, pos);
    }
    // 板块整屏（滚动分段）
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1200);
    await shotFull(cdp, 'PROJECTS_section_top_desktop.png');
    await scrollWheel(cdp, 450, sec2.height > 900 ? sec2.height - 700 : 900);
    await sleep(1200);
    await shotFull(cdp, 'PROJECTS_section_bottom_desktop.png');

    // 内容文本抽取（供 judge 核对文案与链接）
    const text = await evalJS(cdp, `(() => {
      const s = document.querySelector('#tools');
      return {
        links: [...s.querySelectorAll('a')].map(a => a.href),
        text: s.innerText,
      };
    })()`);
    console.log('[链接]', JSON.stringify(text.links));
    console.log('[文本]', JSON.stringify(text.text));

    // 移动端 390
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1500);
    await shotFull(cdp, 'PROJECTS_mobile_top.png');
    for (let i = 0; i < 8; i++) { await scrollWheel(cdp, 420, 700); await sleep(300); }
    await sleep(800);
    await shotFull(cdp, 'PROJECTS_mobile_bottom.png');
    const mOverflow = await evalJS(cdp, `(() => ({ hasHScroll: document.documentElement.scrollWidth > innerWidth + 2 }))()`);
    console.log('[移动端横向溢出]', JSON.stringify(mOverflow));

    console.log('[完成]');
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
