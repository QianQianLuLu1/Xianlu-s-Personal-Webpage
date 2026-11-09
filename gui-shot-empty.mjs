/*
 * R7 空状态场景补拍：拦截全部照片请求 → 滚动触发懒加载全失败 → 对准空状态玻璃卡截图。
 * 前置：npm run preview（localhost:4173）。用法：node gui-shot-empty.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9227;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile-redesign3');
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
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    await cdp.send('Fetch.enable', {
      patterns: [{ urlPattern: '*://localhost:4173/photos/*', interceptionStage: 'Request' }],
    });
    const failHandler = (e) => {
      const m = JSON.parse(e.data);
      if (m.method === 'Fetch.requestPaused') {
        cdp.send('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'Failed' }).catch(() => {});
      }
    };
    ws.addEventListener('message', failHandler);

    await cdp.send('Page.navigate', { url: BASE + '/?verify-empty-shot=1#gallery' });
    for (let i = 0; i < 40; i++) {
      await evalJS(cdp, `window.scrollBy({ top: 700, behavior: 'instant' })`).catch(() => {});
      await sleep(250);
      const left = await evalJS(cdp, `document.querySelectorAll('#gallery button[aria-label^="查看作品"]').length`).catch(() => 0);
      if (left === 0) break;
    }
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const left = await evalJS(cdp, `document.querySelectorAll('#gallery button[aria-label^="查看作品"]').length`).catch(() => -1);
      if (left === 0) break;
    }
    ws.removeEventListener('message', failHandler);
    await cdp.send('Fetch.disable').catch(() => {});

    // 对准空状态玻璃卡取景（区块标题 + 卡片同框）
    await evalJS(cdp, `(() => {
      const es = document.querySelector('#gallery [data-slot="empty-state"]');
      const anchor = document.querySelector('#gallery h2');
      const top = anchor.getBoundingClientRect().top + scrollY - 96;
      window.scrollTo({ top, behavior: 'instant' });
      return { present: !!es, title: es?.textContent.includes('照片还没就位') };
    })()`);
    // 等计数动画（0→25）播完再拍，避免瞬态数字入镜
    await sleep(2200);
    const state = await evalJS(cdp, `(() => {
      const es = document.querySelector('#gallery [data-slot="empty-state"]');
      const r = es.getBoundingClientRect();
      return { inView: r.top > 0 && r.bottom < 900, cards: document.querySelectorAll('#gallery button[aria-label^="查看作品"]').length };
    })()`);
    console.log('[状态]', JSON.stringify(state));
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, 'REDESIGN_R7_empty_state.png'), Buffer.from(r.data, 'base64'));
    console.log('[截图] REDESIGN_R7_empty_state.png 已更新');
  } finally {
    edge.kill();
  }
};

main().catch((e) => { console.error('[脚本失败]', e.message); process.exitCode = 1; });
