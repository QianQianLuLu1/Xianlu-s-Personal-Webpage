/*
 * 补丁脚本：修正主脚本三处脚本侧读数问题（站点零改动）
 *  1. B2 标题/徽章文本基线 Range 精测（规则1）
 *  2. C1 Journey 计数器真实 DOM 读取
 *  3. J3 移动端菜单点「作品集」验证滚动+自动关闭
 * 用法：node gui-verify-acceptance-0902-patch.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9229;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = join(SHOTS_ROOT, 'acceptance-0902');
const PROFILE = join(SHOTS_ROOT, '.edge-profile-acceptance-patch');

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
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
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
async function clickRect(cdp, rect) {
  const x = Math.round(rect.x + rect.w / 2), y = Math.round(rect.y + rect.h / 2);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(400);
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

    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);

    // ===== B2: 标题/徽章文本基线（Range 只读精测）=====
    await wheelTo(cdp, 900);
    await sleep(1200);
    const base = await evalRO(cdp, `(() => {
      const out = {};
      const findTextRect = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n, r = null;
        while ((n = walker.nextNode())) { if (n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (!r || b.width > r.width) r = { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; } }
        return r;
      };
      const all = [...document.querySelectorAll('#tools *')];
      const titleEl = all.find(e => e.children.length === 0 && e.textContent.trim() === 'NikkiGallery')?.parentElement || all.find(e => e.textContent.trim() === 'NikkiGallery');
      const badgeEl = all.find(e => e.children.length === 0 && e.textContent.trim() === 'v2.3.6');
      if (titleEl && badgeEl) {
        out.titleTag = titleEl.tagName;
        out.title = { font: getComputedStyle(titleEl).fontSize, text: findTextRect(titleEl) };
        out.badge = { font: getComputedStyle(badgeEl).fontSize, text: findTextRect(badgeEl) };
        out.diff = out.title.text && out.badge.text ? out.badge.text.bottom - out.title.text.bottom : null;
      }
      return out;
    })()`);
    record('B2 标题(24px)+徽章(12px)文本基线对齐(|diff|<=4px)', !!base.diff || base.diff === 0 ? Math.abs(base.diff) <= 4 : false, base);
    const zoomClip = await evalRO(cdp, `(() => {
      const all = [...document.querySelectorAll('#tools *')];
      const badgeEl = all.find(e => e.children.length === 0 && e.textContent.trim() === 'v2.3.6');
      if (!badgeEl) return null;
      const r = badgeEl.parentElement.getBoundingClientRect();
      return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y + window.scrollY - 10), width: Math.min(700, r.width + 400), height: r.height + 20, scale: 1 };
    })()`);
    if (zoomClip) {
      const z = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: zoomClip });
      writeFileSync(join(OUT, 'B2_zoom_title_badges.png'), Buffer.from(z.data, 'base64'));
      console.log('[截图] B2_zoom_title_badges.png');
    }

    // ===== C1: Journey 计数器真实文本 =====
    const jTop = await evalRO(cdp, `Math.round(document.getElementById('journey').getBoundingClientRect().top + window.scrollY - 96)`);
    await wheelTo(cdp, jTop);
    await sleep(2800);
    const journey = await evalRO(cdp, `(() => {
      const walker = document.createTreeWalker(document.getElementById('journey'), NodeFilter.SHOW_ELEMENT);
      const nums = [];
      while (walker.nextNode()) {
        const e = walker.currentNode;
        const t = e.textContent.trim();
        if (/^\\d{2}$/.test(t) && e.querySelector('img') === null && t !== e.parentElement.textContent.trim()) nums.push(t);
      }
      const headings = [...document.querySelectorAll('#journey h3')].map(h => h.textContent.trim());
      return { nums: [...new Set(nums)], headings };
    })()`);
    record('C1 Journey 计数器动画到 01-04', JSON.stringify([...journey.nums].sort()) === JSON.stringify(['01', '02', '03', '04']), journey);
    record('C1b Journey 四阶段标题齐全', JSON.stringify(journey.headings) === JSON.stringify(['设备', '构图', '光影', '风格']), journey);

    // ===== J3: 移动端菜单点「作品集」验证滚动+自动关闭 =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    const ham = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('header button')].filter(b => b.getBoundingClientRect().width > 0).pop(); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    await clickRect(cdp, ham);
    await sleep(900);
    const item = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && x.textContent.trim() === '作品集' && r.top > 60; }); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (item) {
      await clickRect(cdp, item);
      await sleep(2000); // 平滑滚动到 #gallery
      const after = await evalRO(cdp, `(() => ({
        scrollY: Math.round(window.scrollY),
        galleryTop: Math.round(document.getElementById('gallery').getBoundingClientRect().top),
        menuClosed: ![...document.querySelectorAll('button')].some(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.top > 60 && /^首页$|^关于$/.test(x.textContent.trim()); })
      }))()`);
      record('J3fix 菜单点作品集→滚动到位+菜单自动关闭', after.scrollY > 300 && Math.abs(after.galleryTop - 96) <= 40 && after.menuClosed, after);
      const mshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(OUT, 'J3fix_mobile_gallery_landing.png'), Buffer.from(mshot.data, 'base64'));
      console.log('[截图] J3fix_mobile_gallery_landing.png');
    } else {
      record('J3fix 菜单项', false, '未找到作品集菜单项');
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    record('P1 补丁脚本 Console 零报错', consoleErrors.length === 0, consoleErrors);
    const failed = results.filter((r) => !r.pass);
    console.log(`\n===== 补丁汇总：${results.length - failed.length}/${results.length} 通过 =====`);
    if (failed.length) { for (const f of failed) console.log(` - ${f.name} ${JSON.stringify(f.detail)}`); process.exitCode = 1; }
  } finally { edge.kill(); }
};

main().catch((e) => { console.error('[脚本失败]', e.message); process.exitCode = 1; });
