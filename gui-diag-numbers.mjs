/* 诊断：N1 数字为何没有中间值 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9227;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const PROFILE = join(WORKSPACE_ROOT, 'gui-test-screenshots', '.edge-profile-diag');
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
      setTimeout(() => { this.pending.has(id) && (this.pending.delete(id), reject(new Error('超时 ' + method))); }, 15000);
    });
  }
}
const evalJS = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};

const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
try {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp.send('Page.navigate', { url: BASE + '/' });
  await sleep(3000);

  console.log('[环境]', JSON.stringify(await evalJS(cdp, `(() => ({
    reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
    effectiveMode: window.__APP_CONFIG && window.__APP_CONFIG.effectiveMode,
    visibility: document.visibilityState,
    hasIO: 'IntersectionObserver' in window,
  }))()`)));

  // 滚动前先看首屏之外该数字的初始显示（full 档应停在起点 0）
  console.log('[滚动前]', await evalJS(cdp, `(() => { const el = document.querySelector('#gallery [data-animated-number]'); return el ? el.textContent : 'missing'; })()`));

  // 在页内用 MutationObserver 记录全部变化（含时间戳），排除轮询采样误差
  await evalJS(cdp, `(() => {
    window.__log = [];
    const el = document.querySelector('#gallery [data-animated-number]');
    const mo = new MutationObserver(() => window.__log.push([Math.round(performance.now()), el.textContent]));
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' });
    return true;
  })()`);
  await sleep(2500);
  console.log('[页内变化记录]', await evalJS(cdp, `JSON.stringify(window.__log.slice(0, 20))`));
  ws.close();
} finally {
  edge.kill();
}
