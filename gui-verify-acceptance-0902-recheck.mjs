/*
 * 修复后回归：重建 dist 的 W3C 复检样本（含 doctype）+ 画廊卡/详情页视觉回归截图。
 * 用法：node gui-verify-acceptance-0902-recheck.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9231;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = join(SHOTS_ROOT, 'acceptance-0902');
const PROFILE = join(SHOTS_ROOT, '.edge-profile-acceptance-recheck');

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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP 超时: ${method}`)); } }, 20000);
    });
  }
}
const consoleErrors = [];
async function evalRO(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
async function waitGallery(cdp) {
  for (let i = 0; i < 20; i++) {
    const ok = await evalRO(cdp, `!!document.getElementById('gallery')`);
    if (ok) return true;
    await sleep(500);
  }
  const state = await evalRO(cdp, `({ path: location.pathname, title: document.title, rootKids: document.getElementById('root') ? document.getElementById('root').children.length : -1 })`);
  throw new Error('gallery 未就绪: ' + JSON.stringify(state));
}
async function wheelTo(cdp, targetY) {
  for (let i = 0; i < 60; i++) {
    const y = await evalRO(cdp, 'Math.round(window.scrollY)');
    const diff = targetY - y;
    if (Math.abs(diff) < 2) return y;
    const step = Math.max(-1200, Math.min(1200, diff));
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: step });
    await sleep(120);
  }
  return evalRO(cdp, 'Math.round(window.scrollY)');
}
async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${name}`);
}

const main = async () => {
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push(m.params.entry.text.slice(0, 200));
    });

    // 首页：画廊卡回归 + DOM 采样
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3500);
    await waitGallery(cdp);
    const gTop = await evalRO(cdp, `Math.round(document.getElementById('gallery').getBoundingClientRect().top + window.scrollY - 96)`);
    await wheelTo(cdp, gTop);
    await sleep(2500);
    const cards = await evalRO(cdp, `(() => {
      const imgs = [...document.querySelectorAll('#gallery img')];
      const skel = document.querySelector('#gallery [data-slot="skeleton"]');
      const skelTag = skel ? skel.tagName : null;
      return { imgTotal: imgs.length, imgOk: imgs.filter(i => i.complete && i.naturalWidth > 0).length, skeletonTag: skelTag };
    })()`);
    console.log(`[回归] 画廊卡片 ${JSON.stringify(cards)}`);
    await shot(cdp, 'R1_light_gallery_after_fix.png');
    // 打开一张卡验证弹窗仍正常
    const card = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('#gallery button')].find(x => (x.getAttribute('aria-label')||'').includes('03')); if(!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (card) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: card.x + card.w / 2, y: card.y + card.h / 2, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: card.x + card.w / 2, y: card.y + card.h / 2, button: 'left', clickCount: 1 });
      await sleep(1200);
      const modal = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role=dialog]'); const img = dlg && dlg.querySelector('img'); return { open: !!dlg, imgOk: img ? img.complete && img.naturalWidth > 0 : false }; })()`);
      console.log(`[回归] 弹窗 ${JSON.stringify(modal)}`);
      await shot(cdp, 'R2_light_modal_after_fix.png');
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await sleep(500);
    }
    const homeHtml = await evalRO(cdp, `"<!DOCTYPE html>\\n" + document.documentElement.outerHTML`);
    writeFileSync(join(OUT, 'w3c_home_rendered_v2.html'), homeHtml);

    // 详情页：功能卡标题层级 + DOM 采样
    await cdp.send('Page.navigate', { url: BASE + '/projects/nikki-gallery' });
    await sleep(2500);
    const d = await evalRO(cdp, `(() => {
      const h2s = [...document.querySelectorAll('main h2')].map(h => h.textContent.trim());
      const h3s = [...document.querySelectorAll('main h3')].map(h => h.textContent.trim());
      const h4s = [...document.querySelectorAll('main h4')].length;
      return { h2Count: h2s.length, h3Sample: h3s.slice(0, 6), h4Count: h4s };
    })()`);
    console.log(`[回归] 详情页标题层级 ${JSON.stringify(d)}`);
    const dTop = await evalRO(cdp, `(() => { const h = [...document.querySelectorAll('main h2')].find(x => x.textContent.includes('功能总览') || x.textContent.includes('功能')); return h ? Math.round(h.getBoundingClientRect().top + window.scrollY - 96) : 600; })()`);
    await wheelTo(cdp, dTop);
    await sleep(1200);
    await shot(cdp, 'R3_light_detail_features_after_fix.png');
    const detailHtml = await evalRO(cdp, `"<!DOCTYPE html>\\n" + document.documentElement.outerHTML`);
    writeFileSync(join(OUT, 'w3c_detail_rendered_v2.html'), detailHtml);

    console.log(`[回归] Console 错误数: ${consoleErrors.length} ${consoleErrors.slice(0, 5)}`);
  } finally { edge.kill(); }
};

main().catch((e) => { console.error('[脚本失败]', e.message); process.exitCode = 1; });
