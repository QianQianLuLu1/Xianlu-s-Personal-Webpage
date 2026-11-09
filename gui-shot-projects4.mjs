/* 决定性取证：导航胶囊与 FlashGaze 卡片正文重叠处的毛玻璃渲染（含落点校验） */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9229;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile-projects4');
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

    // 触发所有 whileInView 动画
    await evalJS(cdp, `(() => { document.querySelector('#tools').scrollIntoView({ block: 'start' }); return true; })()`);
    await sleep(1200);
    for (let i = 0; i < 10; i++) { await scrollWheel(cdp, 450, 500); await sleep(300); }

    // 用 scrollTo 直接定位 FlashGaze 卡片（带 3 次落点校验重试）
    for (let attempt = 1; attempt <= 3; attempt++) {
      const pos = await evalJS(cdp, `(() => {
        const cards = document.querySelectorAll('#tools .grid.gap-8 > div');
        const r = cards[1].getBoundingClientRect();
        const target = Math.round(r.top + scrollY + 130);
        window.scrollTo(0, target);
        return { target };
      })()`);
      await sleep(1500);
      const check = await evalJS(cdp, `(() => {
        const pill = document.querySelector('[data-glass-tier="2"]');
        const pr = pill.getBoundingClientRect();
        const cx = Math.round(pr.x + pr.width / 2);
        const cy = Math.round(pr.y + pr.height / 2);
        const under = document.elementFromPoint(cx, cy);
        const cards = document.querySelectorAll('#tools .grid.gap-8 > div');
        const cr = cards[1].getBoundingClientRect();
        return {
          scrollY: Math.round(scrollY),
          under: under ? (under.className + '').slice(0, 60) || under.tagName : 'null',
          underText: under ? (under.textContent || '').slice(0, 40) : '',
          cardTopInViewport: Math.round(cr.top),
          pillRect: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
          backdropComputed: getComputedStyle(pill).backdropFilter,
        };
      })()`);
      console.log('[attempt ' + attempt + ']', JSON.stringify(check));
      // 卡片顶部应已滚过视口顶部（卡片正文在胶囊后方）
      if (check.cardTopInViewport < check.pillRect.y && check.underText.includes('混合评分') === false) break;
      if (check.cardTopInViewport < 0) break;
    }

    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, 'PRJ4_header_over_cardtext.png'), Buffer.from(r.data, 'base64'));
    console.log('[截图] PRJ4_header_over_cardtext.png');
    console.log('[完成]');
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
