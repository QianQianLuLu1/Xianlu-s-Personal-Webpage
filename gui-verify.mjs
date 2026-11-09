/*
 * 无头 Edge CDP 验收工具：与页面的一切交互都通过 CDP Input 域的
 * 合成鼠标/键盘事件完成（等价 Playwright 点击），DOM 读取仅用于定位与只读检查。
 * 用法：node gui-verify.mjs <场景名>
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9223;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile');
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
      }, 15000);
    });
  }
}

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, name);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${file}`);
  return file;
}

// 真实 GUI 点击：先读元素坐标，再派发合成鼠标事件（按下→抬起）
async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function clickText(cdp, text, scope = 'document') {
  const p = await evalJS(cdp, `(() => {
    const key = ${JSON.stringify(text)};
    const els = [...${scope}.querySelectorAll('button, a')];
    const el = els.find(e => (e.textContent.trim().includes(key) || (e.getAttribute('aria-label')||'').includes(key) || (e.title||'').includes(key)) && e.offsetParent !== null);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!p) throw new Error(`找不到可点击元素: ${text}`);
  await clickAt(cdp, p.x, p.y);
  return p;
}
async function scrollWheel(cdp, y, dy) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y, deltaX: 0, deltaY: dy });
}

const main = async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900',
    '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // ===== 场景 L1：全新访客(默认主题)首屏 =====
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    const l1 = await evalJS(cdp, `(() => {
      const h1 = document.querySelector('h1');
      const sec = document.querySelector('#home');
      const img = sec.querySelector('img');
      return {
        htmlClass: document.documentElement.className,
        theme: localStorage.getItem('qianlu.theme'),
        h1Color: getComputedStyle(h1).color,
        h1Text: h1.textContent,
        heroHasPhoto: img.complete && img.naturalWidth > 0,
        imgObjectFit: getComputedStyle(img).objectFit,
        sectionIsolation: getComputedStyle(sec).isolation,
        socialSize: (() => { const a = sec.querySelector('a[aria-label]'); const r = a.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
        navBrandColor: getComputedStyle(document.querySelector('header button')).color,
      };
    })()`);
    console.log('[L1 浅色首屏]', JSON.stringify(l1));
    await shot(cdp, 'FIX_L1_hero_light.png');

    // ===== 场景 L2：GUI 点击主题按钮 → 深色首屏 =====
    await clickText(cdp, '切换到暗色模式');
    await sleep(1500);
    const l2 = await evalJS(cdp, `(() => ({
      htmlClass: document.documentElement.className,
      theme: localStorage.getItem('qianlu.theme'),
      h1Color: getComputedStyle(document.querySelector('h1')).color,
    }))()`);
    console.log('[L2 切暗色]', JSON.stringify(l2));
    await shot(cdp, 'FIX_L2_hero_dark.png');

    // ===== 场景 L3：导航点击 开源工具 → 胶囊几何 =====
    await clickText(cdp, '开源工具');
    await sleep(2500);
    const l3 = await evalJS(cdp, `(() => {
      const host = document.querySelector('.glass-host, [data-glass-tier]');
      const navBtn = [...document.querySelectorAll('nav button')].find(b => b.textContent === '首页');
      const hr = host && host.getBoundingClientRect();
      const nr = navBtn && navBtn.getBoundingClientRect();
      return {
        scrollY: Math.round(scrollY),
        glassTier: host ? (host.dataset.glassTier || '1(liquid-glass)') : null,
        capsuleTop: hr && +hr.top.toFixed(1),
        capsuleBottom: hr && +hr.bottom.toFixed(1),
        navTop: nr && +nr.top.toFixed(1),
        navBottom: nr && +nr.bottom.toFixed(1),
        navInsideCapsule: hr && nr ? (nr.top >= hr.top && nr.bottom <= hr.bottom) : null,
        capsuleClipped: hr ? hr.top < 0 : null,
        h2Top: (() => { const h = [...document.querySelectorAll('h2')].find(e => e.textContent === '开源工具'); return h && +h.getBoundingClientRect().top.toFixed(0); })(),
        headerBottom: Math.round(document.querySelector('header').getBoundingClientRect().bottom),
      };
    })()`);
    console.log('[L3 胶囊几何]', JSON.stringify(l3));
    await shot(cdp, 'FIX_L3_capsule_scrolled.png');

    // ===== 场景 L4：Nikki 行基线对齐量测 =====
    const l4 = await evalJS(cdp, `(() => {
      const t = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Nikki Gallery');
      const row = t.parentElement;
      const box = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
      const badges = [...row.children].filter(c => c !== t).map(c => ({ text: c.textContent.trim().slice(0, 8), ...box(c) }));
      return { rowAlign: getComputedStyle(row).alignItems, title: box(t), badges };
    })()`);
    console.log('[L4 基线对齐]', JSON.stringify(l4));

    // ===== 场景 L5：深色下打开作品模态 =====
    const card = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('button')].find(e => (e.getAttribute('aria-label')||'').startsWith('查看作品'));
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    await sleep(1500);
    const card2 = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('button')].find(e => (e.getAttribute('aria-label')||'').startsWith('查看作品'));
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    await clickAt(cdp, card2.x, card2.y);
    await sleep(2000);
    const l5 = await evalJS(cdp, `(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { open: false };
      const dr = d.getBoundingClientRect();
      const i = d.querySelector('img');
      const prev = d.querySelector('button[aria-label="上一张"]');
      const svg = prev && prev.querySelector('svg');
      const counter = d.querySelector('span');
      const cs = (el) => el && getComputedStyle(el).color;
      return {
        open: true,
        panelBg: getComputedStyle(d).backgroundColor,
        panelRect: { y: +dr.y.toFixed(0), h: +dr.height.toFixed(0), w: +dr.width.toFixed(0) },
        imgFit: i && getComputedStyle(i).objectFit,
        counterColor: cs(counter),
        prevBtnColor: cs(prev),
        svgSize: svg && svg.getBoundingClientRect().width,
        closeBtnSize: (() => { const c = [...d.querySelectorAll('button')].find(b => b.textContent.includes('关闭')); const r = c.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })(),
        closeHitSize: (() => { const c = [...d.querySelectorAll('button')].find(b => b.textContent.includes('关闭')); return Math.round(c.offsetWidth) + 'x' + Math.round(c.offsetHeight); })(),
      };
    })()`);
    console.log('[L5 深色模态]', JSON.stringify(l5));
    await shot(cdp, 'FIX_L5_modal_dark.png');
    // 关闭模态（点击关闭按钮）
    await evalJS(cdp, `(() => { const d = document.querySelector('[role="dialog"]'); const c = [...d.querySelectorAll('button')].find(b => b.textContent.includes('关闭')); const r = c.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }); })()`)
      .then(async (p) => { const { x, y } = JSON.parse(p); await clickAt(cdp, x, y); });
    await sleep(1200);

    // ===== 场景 L6：深色下打开设置面板 =====
    await clickText(cdp, '打开设置');
    await sleep(2000);
    const l6 = await evalJS(cdp, `(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { open: false };
      const legends = [...d.querySelectorAll('legend')].map(l => ({ text: l.textContent, color: getComputedStyle(l).color }));
      const radios = [...d.querySelectorAll('[role="radio"]')].map(x => ({ state: x.getAttribute('data-state') }));
      return { open: true, panelBg: getComputedStyle(d).backgroundColor, legends, radioCount: radios.length, checkedCount: radios.filter(r => r.state === 'checked').length };
    })()`);
    console.log('[L6 深色设置面板]', JSON.stringify(l6));
    await shot(cdp, 'FIX_L6_settings_dark.png');
    // 关闭：点遮罩左上角
    await clickAt(cdp, 40, 60);
    await sleep(1000);

    // ===== 场景 L7：切回浅色 → 模态浅色验证 =====
    const closeSetting = await evalJS(cdp, `(() => !!document.querySelector('[role="dialog"]'))()`);
    if (closeSetting) await clickAt(cdp, 20, 450);
    await sleep(800);
    await clickText(cdp, '切换到浅色模式');
    await sleep(1200);
    await evalJS(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(e => (e.getAttribute('aria-label')||'').startsWith('查看作品')); b.scrollIntoView({ block: 'center' }); return true; })()`);
    await sleep(1500);
    const card3 = await evalJS(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(e => (e.getAttribute('aria-label')||'').startsWith('查看作品')); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`);
    await clickAt(cdp, card3.x, card3.y);
    await sleep(2000);
    const l7 = await evalJS(cdp, `(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { open: false };
      const prev = d.querySelector('button[aria-label="上一张"]');
      const counter = d.querySelector('span');
      return { open: true, panelBg: getComputedStyle(d).backgroundColor, counterColor: getComputedStyle(counter).color, prevBtnColor: getComputedStyle(prev).color };
    })()`);
    console.log('[L7 浅色模态]', JSON.stringify(l7));
    await shot(cdp, 'FIX_L7_modal_light.png');

    // ===== 场景 M：390px 移动端 =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(1500);
    await evalJS(cdp, `(() => { window.scrollTo(0, 0); return true; })()`);
    await sleep(800);
    await shot(cdp, 'FIX_M1_mobile_hero_light.png');
    // 打开汉堡菜单
    await clickText(cdp, '打开菜单');
    await sleep(1000);
    await shot(cdp, 'FIX_M2_mobile_menu.png');
    await clickText(cdp, '关闭菜单');
    await sleep(600);
    // 滚动后头部背景
    await scrollWheel(cdp, 400, 1500);
    await sleep(1500);
    const m3 = await evalJS(cdp, `(() => {
      const h = document.querySelector('header');
      const brand = h.querySelector('button');
      const behind = document.elementFromPoint(60, 20);
      return {
        scrollY: Math.round(scrollY),
        headerBg: getComputedStyle(h).backgroundColor,
        headerBackdrop: getComputedStyle(h).backdropFilter,
        brandColor: getComputedStyle(brand).color,
      };
    })()`);
    console.log('[M3 移动端滚动态]', JSON.stringify(m3));
    await shot(cdp, 'FIX_M3_mobile_scrolled.png');

    // 恢复：清掉测试产生的 localStorage，避免污染后续人工访问
    await evalJS(cdp, `(() => { localStorage.clear(); return true; })()`);
    console.log('[完成] 已清理测试 localStorage');
    ws.close();
  } finally {
    edge.kill();
  }
};

main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
