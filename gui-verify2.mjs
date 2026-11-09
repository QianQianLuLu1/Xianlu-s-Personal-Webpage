/* 追加回归：BUG-7 主题面板同步 + 移动端 390px 场景 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9224;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile2');
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP 超时: ' + method)); } }, 15000);
    });
  }
}
const evalJS = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};
async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log('[截图]', name);
}
async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function clickText(cdp, text) {
  const p = await evalJS(cdp, `(() => {
    const key = ${JSON.stringify(text)};
    const el = [...document.querySelectorAll('button, a')].find(e =>
      (e.textContent.trim().includes(key) || (e.getAttribute('aria-label')||'').includes(key) || (e.title||'').includes(key)) && e.offsetParent !== null);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);
  if (!p) throw new Error('找不到: ' + text);
  await clickAt(cdp, p.x, p.y);
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

    // ===== B1: BUG-7 同步验证：加载(浅色) → 点页头切深色 → 开设置面板看 radio =====
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    await clickText(cdp, '切换到暗色模式');
    await sleep(1200);
    await clickText(cdp, '打开设置');
    await sleep(1800);
    const b1 = await evalJS(cdp, `(() => {
      const d = document.querySelector('[role="dialog"]');
      const groups = [...d.querySelectorAll('fieldset')];
      const themeGroup = groups.find(f => f.querySelector('legend')?.textContent === '深色模式');
      const checked = [...themeGroup.querySelectorAll('label')].filter(l => l.querySelector('[data-state="checked"]')).map(l => l.textContent.trim());
      return { actualTheme: document.documentElement.className.includes('dark') ? 'dark' : 'light', panelChecked: checked };
    })()`);
    console.log('[B1 主题同步]', JSON.stringify(b1));
    const b1Pass = b1.actualTheme === 'dark' && b1.panelChecked.includes('深色');
    console.log('[B1 结果]', b1Pass ? 'PASS' : 'FAIL');
    await shot(cdp, 'FIX_B1_theme_sync.png');
    // 关闭设置面板（ESC）
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(800);

    // ===== B2: ESC 关闭设置面板是否生效（顺带验证） =====
    const b2 = await evalJS(cdp, `(() => !document.querySelector('[role="dialog"]'))()`);
    console.log('[B2 ESC关闭面板]', b2 ? 'PASS' : 'FAIL');

    // ===== 移动端 390 =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    await evalJS(cdp, `(() => { window.scrollTo(0, 0); return true; })()`);
    await sleep(600);
    const m1 = await evalJS(cdp, `(() => ({
      theme: document.documentElement.className,
      h1Visible: (() => { const h = document.querySelector('h1'); const r = h.getBoundingClientRect(); return r.width > 0; })(),
      h1Color: getComputedStyle(document.querySelector('h1')).color,
      menuBtnSize: (() => { const b = document.querySelector('button[aria-label="打开菜单"]'); const r = b.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
    }))()`);
    console.log('[M1 移动端首屏]', JSON.stringify(m1));
    await shot(cdp, 'FIX_M1_mobile_hero.png');

    // 汉堡菜单
    await clickText(cdp, '打开菜单');
    await sleep(1000);
    const m2 = await evalJS(cdp, `(() => {
      const nav = document.querySelector('header nav:not(.hidden)');
      const items = nav ? [...nav.querySelectorAll('button')].map(b => b.textContent.trim()) : [];
      return { menuOpen: !!nav, items };
    })()`);
    console.log('[M2 菜单]', JSON.stringify(m2));
    await shot(cdp, 'FIX_M2_mobile_menu.png');
    await clickText(cdp, '关闭菜单');
    await sleep(600);

    // 滚动后头部背景
    await scrollWheel(cdp, 400, 1500);
    await sleep(1500);
    const m3 = await evalJS(cdp, `(() => {
      const h = document.querySelector('header');
      const brand = h.querySelector('button');
      return {
        scrollY: Math.round(scrollY),
        headerBg: getComputedStyle(h).backgroundColor,
        headerBackdrop: getComputedStyle(h).backdropFilter,
        brandColor: getComputedStyle(brand).color,
        brandOnPhotoReadable: getComputedStyle(brand).color !== 'rgba(0, 0, 0, 0)',
      };
    })()`);
    console.log('[M3 移动端滚动态]', JSON.stringify(m3));
    await shot(cdp, 'FIX_M3_mobile_scrolled.png');

    await evalJS(cdp, `(() => { localStorage.clear(); return true; })()`);
    console.log('[完成] localStorage 已清理');
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
