/*
 * 深链接复核：无头 Edge（健康渲染管线）直接打开 /#gallery 与 /#journey，验证初始落位。
 * 用法：node gui-verify-deeplink-check.mjs
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const PROFILE = join(WORKSPACE_ROOT, 'gui-test-screenshots', '.edge-profile-deeplink');

async function main() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=9235',
    `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9235/json/list');
        const tabs = await res.json();
        const page = tabs.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
        if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
      } catch {}
      await wait(250);
    }
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    let id = 0; const pending = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    for (const hash of ['#gallery', '#journey', '#about']) {
      await send('Page.navigate', { url: 'http://localhost:4173/' + hash });
      await wait(3500);
      const r = await ev(`(() => ({
        hash: location.hash,
        scrollY: Math.round(window.scrollY),
        targetTop: Math.round((document.getElementById(location.hash.slice(1)) || { getBoundingClientRect: () => ({ top: NaN }) }).getBoundingClientRect().top),
        ready: !!document.getElementById('gallery')
      }))()`);
      console.log(`[深链接] ${hash} -> ${JSON.stringify(r)}`);
    }
  } finally { edge.kill(); }
}
main().catch((e) => { console.error('[失败]', e.message); process.exitCode = 1; });
