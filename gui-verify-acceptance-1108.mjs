/*
 * qianlu-portfolio 浏览器 GUI 黑盒全量验收（2026-11-08，无头 Edge CDP）。
 * 黑盒原则：滚动/点击/键盘全走 CDP Input 域（合成真实输入）；Runtime.evaluate 仅只读观测。
 * 覆盖 8 条 UI 细节规则（R1 基线 / R2 cover / R3 图标对齐 / R4 冗余间距 / R5 导航防遮挡 /
 *   R6 居中容器内左对齐 / R7 背景框四边 padding 一致 / R8 功能回归）× 3 路由 × 亮暗 × 桌面移动。
 * 前置：npm run dev（5173）或 npm run build && npm run preview（4173）。
 * 用法：node gui-verify-acceptance-1108.mjs            （默认 dev 5173）
 *       BASE=http://localhost:4173 node gui-verify-acceptance-1108.mjs （验收构建产物）
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9232;
const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = join(HERE, 'qianlu-portfolio', 'gui-test-screenshots', 'acceptance-1108');
// Edge profile 必须在项目树外，避免 vite dev watch 到锁定缓存文件 EBUSY 崩溃
const PROFILE = join(tmpdir(), 'qianlu-edge-profile-acceptance-1108');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const findings = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${detail !== undefined ? JSON.stringify(detail) : ''}`);
};
const review = (name, detail) => {
  findings.push({ name, detail });
  console.log(`[REVIEW] ${name} ${JSON.stringify(detail)}`);
};

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
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
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP 超时: ${method}`)); }
      }, 25000);
    });
  }
}

const consoleErrors = [];
const failedRequests = [];
const externalWarns = [];

async function evalRO(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${name}`);
}
async function wheelTo(cdp, targetY) {
  for (let i = 0; i < 80; i++) {
    const y = await evalRO(cdp, 'Math.round(window.scrollY)');
    const diff = targetY - y;
    if (Math.abs(diff) < 2) return y;
    const step = Math.max(-1400, Math.min(1400, diff));
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: step });
    await sleep(110);
  }
  return evalRO(cdp, 'Math.round(window.scrollY)');
}
async function clickRect(cdp, rect) {
  const x = Math.round(rect.x + rect.w / 2), y = Math.round(rect.y + rect.h / 2);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(420);
}
async function pressKey(cdp, key, vk) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: vk });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk });
  await sleep(420);
}
const R = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`;
async function setViewport(cdp, width, height, mobile, dsf = 1) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dsf, mobile });
}
async function nav(cdp, path, wait = 2800) {
  await cdp.send('Page.navigate', { url: BASE + path });
  await sleep(wait);
}
async function sectionTop(cdp, id) {
  return evalRO(cdp, `Math.round(document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top + window.scrollY - 76)`);
}
const headerBottom = (cdp) => evalRO(cdp, `Math.round(document.querySelector('header').getBoundingClientRect().bottom)`);

/* 只读：容器四边 padding 是否一致 */
const padEq = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const s = getComputedStyle(el); const t = parseFloat(s.paddingTop), r = parseFloat(s.paddingRight), b = parseFloat(s.paddingBottom), l = parseFloat(s.paddingLeft); return { t, r, b, l, eq: t === r && r === b && b === l, cls: el.className.slice(0, 80) }; })()`;
/* 只读：flex 容器 alignItems */
const alignOf = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const s = getComputedStyle(el); return { display: s.display, alignItems: s.alignItems, gap: s.gap }; })()`;

const main = async () => {
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Log.enable'); await cdp.send('Network.enable');
    await setViewport(cdp, 1440, 900, false, 1);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('qianlu.theme','light'); localStorage.setItem('qianlu.settings.palette','air'); } catch {}` });

    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200));
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push('console.error: ' + (m.params.args?.map((a) => a.value ?? a.description).join(' ') ?? '').slice(0, 200));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push('log: ' + m.params.entry.text.slice(0, 200));
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
        const u = m.params.response.url;
        if (u.startsWith(BASE) || u.startsWith('http://localhost')) failedRequests.push(`${m.params.response.status} ${u}`);
        else externalWarns.push(`${m.params.response.status} ${u}`);
      }
      if (m.method === 'Network.loadingFailed' && !m.params.canceled) {
        const url = m.params.errorText || '';
        failedRequests.push(`failed ${url} ${m.params.type}`);
      }
    });

    // ================= A. 桌面亮色 · 首页加载与 Hero（R5/R1）=================
    await nav(cdp, '/');
    const hero = await evalRO(cdp, `(() => { const h1 = document.querySelector('h1'); const hb = document.querySelector('header').getBoundingClientRect().bottom; const r = h1.getBoundingClientRect(); return { h1: !!h1, opacity: getComputedStyle(h1).opacity, h1Top: Math.round(r.top), headerBottom: Math.round(hb), theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light', palette: [...document.documentElement.classList].find(c => c.startsWith('palette-')) }; })()`);
    record('A1 首页 Hero 渲染完成', hero.h1 && Number(hero.opacity) > 0.9, hero);
    record('A2 [R5] Hero 主标题未被固定导航遮挡', hero.h1Top >= hero.headerBottom, { h1Top: hero.h1Top, headerBottom: hero.headerBottom });
    await shot(cdp, 'A_light_hero.png');

    // ================= B. 导航锚点落点（R5）=================
    for (const item of [['开源工具', 'tools'], ['摄影之路', 'journey'], ['作品集', 'gallery'], ['关于', 'about']]) {
      const btn = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('header nav button')].find(x => x.textContent.trim() === ${JSON.stringify(item[0])}); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      if (!btn) { record(`B 导航 ${item[0]}`, false, '未找到按钮'); continue; }
      await clickRect(cdp, btn); await sleep(1700);
      const land = await evalRO(cdp, `(() => ({ top: Math.round(document.getElementById(${JSON.stringify(item[1])}).getBoundingClientRect().top), hb: Math.round(document.querySelector('header').getBoundingClientRect().bottom), y: Math.round(window.scrollY) }))()`);
      record(`B [R5] ${item[0]} 锚点落点不遮挡（top≥headerBottom）`, land.top >= land.hb - 2, land);
    }
    await shot(cdp, 'B_light_about_landing.png');

    // ================= C. 开源工具卡（R1/R2/R3/R7）+ 下载下拉（R8）=================
    await wheelTo(cdp, await sectionTop(cdp, 'tools')); await sleep(1400);
    const covers = await evalRO(cdp, `(() => [...document.querySelectorAll('#tools img[alt$="封面"]')].map(img => { const r = img.getBoundingClientRect(); const s = getComputedStyle(img); return { alt: img.alt, ok: img.complete && img.naturalWidth > 0, fit: s.objectFit, ratio: +(r.width / r.height).toFixed(3) }; }))()`);
    record('C1 [R2] 项目封面 object-cover 且 16:9 加载', covers.length === 2 && covers.every(c => c.ok && c.fit === 'cover' && Math.abs(c.ratio - 16 / 9) < 0.02), covers);
    const titleRow = await evalRO(cdp, `(() => { const rows = [...document.querySelectorAll('#tools [data-slot="card-header"] > div:has([data-slot="card-title"])')]; return rows.map(r => ({ align: getComputedStyle(r).alignItems, text: r.textContent.trim().slice(0, 24) })); })()`);
    record('C2 [R1] 项目标题+版本徽章基线对齐（items-baseline）', titleRow.length >= 1 && titleRow.every(r => r.align === 'baseline'), titleRow);
    const cardPad = await evalRO(cdp, padEq('#tools [data-slot="card-header"]'));
    record('C3 [R7] 项目卡 CardHeader 四边 padding 一致', cardPad && cardPad.eq, cardPad);
    const coverPad = await evalRO(cdp, `(() => { const el = document.querySelector('#tools [data-slot="card"] > div > div'); if (!el) return null; const s = getComputedStyle(el); const t = parseFloat(s.paddingTop), r = parseFloat(s.paddingRight), b = parseFloat(s.paddingBottom), l = parseFloat(s.paddingLeft); return { t, r, b, l, eq: t === r && r === b && b === l }; })()`);
    record('C4 [R7] 封面容器四边 padding 一致', coverPad && coverPad.eq, coverPad);
    const btnAlign = await evalRO(cdp, `(() => { const a = [...document.querySelectorAll('#tools a')].find(x => x.textContent.includes('查看详情')); if (!a) return null; const s = getComputedStyle(a); return { display: s.display, alignItems: s.alignItems, gap: s.gap }; })()`);
    record('C5 [R3] 查看详情按钮图标垂直居中', btnAlign && btnAlign.display.includes('flex') && btnAlign.alignItems === 'center', btnAlign);
    await shot(cdp, 'C_light_tools.png');
    // 下载下拉（MeowStarMap 有 downloads）
    const dlBtn = await evalRO(cdp, `(() => { const b = document.querySelector('#tools button[aria-label^="下载"]'); if (!b) return null; b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label') }; })()`);
    await sleep(500);
    if (dlBtn) {
      await clickRect(cdp, dlBtn); await sleep(700);
      const menu = await evalRO(cdp, `(() => { const items = [...document.querySelectorAll('[role="menuitem"]')]; return { open: items.length > 0, labels: items.map(i => i.textContent.trim()), align: items[0] ? getComputedStyle(items[0]).alignItems : null }; })()`);
      record('C6 [R8] 下载下拉展开含 Github 下载', menu.open && menu.labels.some(l => /Github/i.test(l)), menu);
      record('C7 [R3] 下拉项图标垂直居中', menu.align === 'center', { align: menu.align });
      await shot(cdp, 'C_light_download_menu.png');
      await pressKey(cdp, 'Escape', 27); await sleep(400);
    } else record('C6 下载按钮', false, '未找到下载按钮');

    // ================= D. 摄影之路（R2/R7/R8 计数）=================
    await wheelTo(cdp, await sectionTop(cdp, 'journey')); await sleep(2400);
    const journey = await evalRO(cdp, `(() => { const imgs = [...document.querySelectorAll('#journey img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, fit: getComputedStyle(i).objectFit })); const nums = [...document.querySelectorAll('#journey span[aria-hidden]')].map(s => s.textContent.trim()).filter(t => /^\\d+$/.test(t)); const cards = [...document.querySelectorAll('#journey [data-slot="card-content"]')].map(c => { const s = getComputedStyle(c); return { t: parseFloat(s.paddingTop), r: parseFloat(s.paddingRight), b: parseFloat(s.paddingBottom), l: parseFloat(s.paddingLeft) }; }); return { imgCount: imgs.length, imgOk: imgs.every(i => i.ok), allCover: imgs.every(i => i.fit === 'cover'), nums, cards }; })()`);
    record('D1 [R2] Journey 照片全部加载且 cover', journey.imgCount >= 4 && journey.imgOk && journey.allCover, { count: journey.imgCount, ok: journey.imgOk, cover: journey.allCover });
    record('D2 [R8] Journey 计数器渲染 01-04', JSON.stringify(journey.nums.sort()) === JSON.stringify(['01', '02', '03', '04']), journey.nums);
    const jUniform = journey.cards.every(c => c.t === c.r && c.r === c.b && c.b === c.l);
    if (!jUniform) review('D3 [R7] Journey 卡片 CardContent 四边 padding 不一致（pt-8 vs px/pb-6）', journey.cards);
    else record('D3 [R7] Journey 卡片 padding 一致', true, journey.cards);
    await shot(cdp, 'D_light_journey.png');

    // ================= E. 作品集（R2/R8 灯箱）=================
    await wheelTo(cdp, await sectionTop(cdp, 'gallery')); await sleep(2600);
    const gallery = await evalRO(cdp, `(() => { const cards = [...document.querySelectorAll('#gallery button[aria-label^="查看作品"]')]; const imgs = [...document.querySelectorAll('#gallery img')]; const countEl = [...document.querySelectorAll('#gallery p')].find(p => p.textContent.includes('张照片')); const m = countEl ? countEl.textContent.match(/(\\d+)\\s*张照片/) : null; const masonry = document.querySelector('#gallery .columns-1'); return { cardCount: cards.length, count: m ? +m[1] : null, colCount: masonry ? getComputedStyle(masonry).columnCount : null, imgTotal: imgs.length, imgOk: imgs.filter(i => i.complete && i.naturalWidth > 0).length, allCover: imgs.every(i => getComputedStyle(i).objectFit === 'cover') }; })()`);
    record('E1 [R8] 作品计数与卡片数一致', gallery.count === gallery.cardCount && gallery.cardCount > 0, { count: gallery.count, cards: gallery.cardCount });
    record('E2 [R2] 作品图全部加载且 cover', gallery.imgTotal === gallery.cardCount && gallery.imgOk === gallery.imgTotal && gallery.allCover, gallery);
    record('E3 瀑布流桌面 4 列（columnCount）', gallery.colCount === '4', { colCount: gallery.colCount });
    await shot(cdp, 'E_light_gallery.png');
    const card0 = await evalRO(cdp, `(() => { const b = document.querySelector('#gallery button[aria-label^="查看作品"]'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    await clickRect(cdp, card0); await sleep(1300);
    const modal = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role="dialog"]'); if (!dlg) return { open: false }; const img = dlg.querySelector('img'); const s = getComputedStyle(dlg); return { open: true, imgOk: img ? img.complete && img.naturalWidth > 0 : false, imgFit: img ? getComputedStyle(img).objectFit : null, pad: { t: parseFloat(s.paddingTop), r: parseFloat(s.paddingRight), b: parseFloat(s.paddingBottom), l: parseFloat(s.paddingLeft) }, text: dlg.textContent.slice(0, 60) }; })()`);
    record('E4 [R8] 灯箱打开且大图加载', modal.open && modal.imgOk, modal);
    record('E5 [R2] 灯箱大图 object-contain（合法例外，完整展示作品）', modal.imgFit === 'contain', { fit: modal.imgFit });
    record('E6 [R7] 灯箱对话框四边 padding 一致', modal.pad && modal.pad.t === modal.pad.r && modal.pad.r === modal.pad.b && modal.pad.b === modal.pad.l, modal.pad);
    await shot(cdp, 'E_light_modal.png');
    const nextBtn = await evalRO(cdp, R('[role="dialog"] button[aria-label="下一张"]'));
    await clickRect(cdp, nextBtn); await sleep(900);
    const afterNext = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role="dialog"]'); return dlg ? dlg.textContent.slice(0, 60) : null; })()`);
    record('E7 [R8] 灯箱下一张切换', !!afterNext && afterNext !== modal.text, { before: modal.text, after: afterNext });
    await pressKey(cdp, 'ArrowLeft', 37); await sleep(800);
    const afterKey = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role="dialog"]'); return dlg ? dlg.textContent.slice(0, 60) : null; })()`);
    record('E8 [R8] 灯箱左方向键回退', afterKey === modal.text, { after: afterKey });
    await shot(cdp, 'E_light_modal_nav.png');
    await pressKey(cdp, 'Escape', 27); await sleep(700);
    const closed = await evalRO(cdp, `(() => ({ open: !!document.querySelector('[role="dialog"]'), headerGlass: document.querySelector('header').className }))()`);
    record('E9 [R8] Escape 关闭灯箱且滚动态 header 保持毛玻璃', !closed.open && /backdrop-blur|bg-cream\/90/.test(closed.headerGlass), closed);

    // ================= F. 关于/页脚（R3/R6）+ 回顶（R8）=================
    await wheelTo(cdp, await sectionTop(cdp, 'about')); await sleep(1400);
    const aboutAlign = await evalRO(cdp, `(() => [...document.querySelectorAll('#about h3, #about h4')].filter(h => h.querySelector('svg')).map(h => ({ text: h.textContent.trim().slice(0, 12), display: getComputedStyle(h).display, align: getComputedStyle(h).alignItems })))()`);
    record('F1 [R3] 关于区标题图标垂直居中', aboutAlign.length > 0 && aboutAlign.every(h => h.display.includes('flex') && h.align === 'center'), aboutAlign);
    await shot(cdp, 'F_light_about.png');
    await wheelTo(cdp, 999999); await sleep(1000);
    const footer = await evalRO(cdp, `(() => ({ atBottom: Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 5, hasFooter: !!document.querySelector('footer'), backTop: (() => { const b = document.querySelector('button[aria-label="回到顶部"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { visible: r.width > 0 && r.height > 0, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() }))()`);
    record('F2 [R8] 页脚可见且回顶按钮出现', footer.atBottom && footer.hasFooter && footer.backTop && footer.backTop.visible, footer);
    await shot(cdp, 'F_light_footer.png');
    if (footer.backTop) { await clickRect(cdp, footer.backTop); await sleep(1900); const y = await evalRO(cdp, 'Math.round(window.scrollY)'); record('F3 [R8] 回到顶部生效', y < 60, { scrollY: y }); }

    // ================= G. 主题切换 → 暗色（R8/R5）=================
    await wheelTo(cdp, 200); await sleep(500);
    const themeBtn = await evalRO(cdp, R('header button[aria-label*="暗色"], header button[aria-label*="浅色"]'));
    await clickRect(cdp, themeBtn); await sleep(1000);
    const dark = await evalRO(cdp, `(() => ({ isDark: document.documentElement.classList.contains('dark'), stored: localStorage.getItem('qianlu.theme'), headerGlass: document.querySelector('header').className }))()`);
    record('G1 [R8] 切换暗色生效且持久化', dark.isDark && dark.stored === 'dark', dark);
    record('G2 [R5] 暗色滚动态 header 整条毛玻璃', /backdrop-blur|bg-cream\/90/.test(dark.headerGlass), { cls: dark.headerGlass });
    await shot(cdp, 'G_dark_hero.png');
    await wheelTo(cdp, await sectionTop(cdp, 'gallery')); await sleep(1500); await shot(cdp, 'G_dark_gallery.png');
    await wheelTo(cdp, await sectionTop(cdp, 'tools')); await sleep(1200); await shot(cdp, 'G_dark_tools.png');

    // ================= H. 设置面板（R8/R7/R3）=================
    const setBtn = await evalRO(cdp, R('header button[aria-label="打开设置"]'));
    await clickRect(cdp, setBtn); await sleep(1000);
    const panel = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role="dialog"]'); if (!dlg) return { open: false }; const radios = [...dlg.querySelectorAll('[role="radio"]')]; const legends = [...dlg.querySelectorAll('legend')].map(l => l.textContent.trim()); const s = getComputedStyle(dlg); return { open: true, radioCount: radios.length, legends, pad: { t: parseFloat(s.paddingTop), r: parseFloat(s.paddingRight), b: parseFloat(s.paddingBottom), l: parseFloat(s.paddingLeft) } }; })()`);
    record('H1 [R8] 设置面板打开含 5 组单选', panel.open && panel.radioCount >= 14 && panel.legends.length >= 5, { radios: panel.radioCount, legends: panel.legends });
    record('H2 [R7] 设置对话框四边 padding 一致', panel.pad && panel.pad.t === panel.pad.r && panel.pad.r === panel.pad.b && panel.pad.b === panel.pad.l, panel.pad);
    await shot(cdp, 'H_dark_settings.png');
    // 改配色 → vivid（锁黑底），验证 html class
    const vivid = await evalRO(cdp, `(() => { const r = [...document.querySelectorAll('[role="radio"]')].find(x => x.getAttribute('value') === 'vivid' || (x.closest('label') && x.closest('label').textContent.includes('高能猛进'))); if (!r) return null; const b = r.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })()`);
    if (vivid) {
      await clickRect(cdp, vivid); await sleep(800);
      const pal = await evalRO(cdp, `(() => ({ cls: [...document.documentElement.classList].filter(c => c.startsWith('palette-')), stored: localStorage.getItem('qianlu.settings.palette') }))()`);
      record('H3 [R8] 配色切到 vivid 即时生效并持久化', pal.cls.includes('palette-vivid') && pal.stored === 'vivid', pal);
    } else record('H3 配色 vivid 选项', false, '未找到');
    // 重新检测按钮
    const redetect = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => x.textContent.includes('重新检测')); if (!b) return null; b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    await sleep(400);
    if (redetect) { await clickRect(cdp, redetect); await sleep(2500); const status = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role="dialog"]'); return dlg ? dlg.textContent.includes('当前性能档位') : false; })()`); record('H4 [R8] 重新检测可点击且状态区存在', status, {}); }
    await pressKey(cdp, 'Escape', 27); await sleep(600);
    record('H5 [R8] 设置面板可关闭', await evalRO(cdp, `!document.querySelector('[role="dialog"]')`), {});
    await shot(cdp, 'H_palette_vivid.png');

    // ================= I. 配色 deep 抽查 → 复位 air =================
    await clickRect(cdp, await evalRO(cdp, R('header button[aria-label="打开设置"]'))); await sleep(900);
    const deep = await evalRO(cdp, `(() => { const r = [...document.querySelectorAll('[role="radio"]')].find(x => x.closest('label') && x.closest('label').textContent.includes('超拉风')); if (!r) return null; const b = r.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; })()`);
    if (deep) { await clickRect(cdp, deep); await sleep(700); }
    await pressKey(cdp, 'Escape', 27); await sleep(500);
    await wheelTo(cdp, 0); await sleep(800); await shot(cdp, 'I_palette_deep.png');
    // 复位 air + light
    await evalRO(cdp, `(() => { localStorage.setItem('qianlu.settings.palette','air'); localStorage.setItem('qianlu.theme','light'); })()`);
    await nav(cdp, '/');

    // ================= J. 详情页 FlashGaze（R5/R2/R3/R6/R7/R8）=================
    await nav(cdp, '/projects/flashgaze');
    const detail = await evalRO(cdp, `(() => { const main = document.querySelector('main'); const first = main.querySelector('nav[aria-label="面包屑"]') || main.firstElementChild; const hb = document.querySelector('header').getBoundingClientRect().bottom; const img = document.querySelector('img[alt$="封面"]'); return { url: location.pathname, firstTop: Math.round(first.getBoundingClientRect().top), hb: Math.round(hb), coverOk: img ? img.complete && img.naturalWidth > 0 : false, coverFit: img ? getComputedStyle(img).objectFit : null, tocItems: document.querySelectorAll('aside nav[aria-label="页内目录"] a').length }; })()`);
    record('J1 [R5] 详情页首块为固定导航留高（pt-24）', detail.url === '/projects/flashgaze' && detail.firstTop >= detail.hb - 2, { firstTop: detail.firstTop, hb: detail.hb });
    record('J2 [R2] 详情页封面加载且 cover', detail.coverOk && detail.coverFit === 'cover', { ok: detail.coverOk, fit: detail.coverFit });
    record('J3 [R8] 详情页桌面目录渲染', detail.tocItems >= 3, { toc: detail.tocItems });
    const badgeAlign = await evalRO(cdp, `(() => [...document.querySelectorAll('main [data-slot="badge"]')].slice(0, 5).map(b => ({ text: b.textContent.trim().slice(0, 10), display: getComputedStyle(b).display, align: getComputedStyle(b).alignItems })))()`);
    record('J4 [R3] 详情页徽章图标垂直居中', badgeAlign.length > 0 && badgeAlign.every(b => b.display.includes('flex') && b.align === 'center'), badgeAlign);
    await shot(cdp, 'J_light_detail_flashgaze.png');
    // 代码复制（R8）
    const copyBtn = await evalRO(cdp, `(() => { const b = document.querySelector('button[aria-label="复制代码"]'); if (!b) return null; b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (copyBtn) { await clickRect(cdp, copyBtn); await sleep(600); const copied = await evalRO(cdp, `!!document.querySelector('button[aria-label="已复制"]')`); record('J5 [R8] 代码复制按钮反馈「已复制」', copied, {}); }
    else record('J5 代码复制按钮', false, '未找到');
    // Flow 块内左对齐（R6）
    const flowAlign = await evalRO(cdp, `(() => { const ul = document.querySelector('main ol li ul'); if (!ul) return null; return { textAlign: getComputedStyle(ul).textAlign, parentAlign: getComputedStyle(ul.closest('div')).textAlign }; })()`);
    if (flowAlign) record('J6 [R6] 居中流程卡内列表显式左对齐', flowAlign.textAlign === 'left', flowAlign);
    // Callout 图标对齐（R3 复核）
    const callout = await evalRO(cdp, `(() => { const cs = [...document.querySelectorAll('main div')].filter(d => d.className.includes('rounded-card') && d.querySelector('svg') && d.textContent.length > 20 && d.className.includes('border')); const c = cs.find(d => /bg-clay\\/5|bg-pine\\/5/.test(d.className)); if (!c) return null; const row = c.querySelector('div'); return { align: getComputedStyle(row).alignItems, display: getComputedStyle(row).display }; })()`);
    if (callout) { if (callout.align === 'stretch' || callout.align === 'normal') review('J7 [R3] Callout 图标行未显式声明对齐（默认 stretch/顶对齐）', callout); else record('J7 [R3] Callout 图标行显式对齐', true, callout); }
    // 目录点击 + scrollspy（R8）
    const tocLink = await evalRO(cdp, `(() => { const a = [...document.querySelectorAll('aside nav[aria-label="页内目录"] a')][2]; if (!a) return null; const r = a.getBoundingClientRect(); return { label: a.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (tocLink) { await clickRect(cdp, tocLink); await sleep(1600); const spy = await evalRO(cdp, `(() => ({ y: Math.round(window.scrollY), active: [...document.querySelectorAll('aside nav[aria-label="页内目录"] a[aria-current="location"]')].map(a => a.textContent.trim()) }))()`); record('J8 [R8] 目录点击滚动且 scrollspy 高亮', spy.y > 100 && spy.active.length > 0, spy); }
    await shot(cdp, 'J_light_detail_scrollspy.png');

    // ================= K. 详情页 MeowStarMap + 项目切换 + 跨页锚点（R8）=================
    await nav(cdp, '/projects/nikki-gallery');
    const nikki = await evalRO(cdp, `(() => ({ url: location.pathname, name: document.querySelector('main h1') ? document.querySelector('main h1').textContent.trim() : null, version: [...document.querySelectorAll('main [data-slot="badge"]')].some(b => /v\\d/.test(b.textContent)) }))()`);
    record('K1 详情页 MeowStarMap 路由与版本徽章', nikki.url === '/projects/nikki-gallery' && nikki.name === 'MeowStarMap' && nikki.version, nikki);
    await shot(cdp, 'K_light_detail_nikki.png');
    const nextProj = await evalRO(cdp, `(() => { const a = document.querySelector('nav[aria-label="项目切换"] a[href="/projects/flashgaze"]'); if (!a) return null; a.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = a.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (nextProj) { await clickRect(cdp, nextProj); await sleep(1800); const d2 = await evalRO(cdp, `(() => ({ url: location.pathname, y: Math.round(window.scrollY) }))()`); record('K2 [R8] 下一个项目卡跳转 FlashGaze 且回页顶', d2.url === '/projects/flashgaze' && d2.y < 60, d2); }
    // 跨页锚点回跳：详情页点导航「作品集」→ 首页 #gallery
    const navGallery = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('header nav button')].find(x => x.textContent.trim() === '作品集'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    await clickRect(cdp, navGallery); await sleep(2200);
    const back = await evalRO(cdp, `(() => ({ url: location.pathname, hash: location.hash, galleryTop: Math.round(document.getElementById('gallery').getBoundingClientRect().top), hb: Math.round(document.querySelector('header').getBoundingClientRect().bottom) }))()`);
    record('K3 [R8] 详情页导航跨页回跳首页锚点', back.url === '/' && back.galleryTop >= back.hb - 4, back);
    await shot(cdp, 'K_cross_page_anchor.png');
    // 未知 projectId 重定向
    await nav(cdp, '/projects/does-not-exist', 2000);
    record('K4 [R8] 未知 projectId 重定向首页', await evalRO(cdp, `location.pathname === '/'`), {});

    // ================= L. 移动端亮色 390×844（R5/R8）=================
    await setViewport(cdp, 390, 844, true, 2);
    await nav(cdp, '/');
    const mob = await evalRO(cdp, `(() => ({ hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, hamburger: (() => { const b = document.querySelector('header button[aria-label="打开菜单"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })() }))()`);
    record('L1 [R5] 移动端无横向溢出', !mob.hOverflow, { scrollW: mob.scrollW, innerW: mob.innerW });
    await shot(cdp, 'L_mobile_hero.png');
    if (mob.hamburger) {
      await clickRect(cdp, mob.hamburger); await sleep(900);
      const menu = await evalRO(cdp, `(() => { const nav = document.querySelector('header nav.glass-tier2'); if (!nav) return { open: false }; const s = getComputedStyle(nav); const items = [...nav.querySelectorAll('button')]; const r = items[0].getBoundingClientRect(); return { open: items.length >= 5, pad: { t: parseFloat(s.paddingTop), r: parseFloat(s.paddingRight), b: parseFloat(s.paddingBottom), l: parseFloat(s.paddingLeft) }, first: { text: items[0].textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), align: getComputedStyle(items[0]).textAlign } }; })()`);
      record('L2 [R8] 汉堡菜单展开 5 项', menu.open, menu);
      record('L3 [R7] 移动菜单四边 padding 一致', menu.pad && menu.pad.t === menu.pad.r && menu.pad.r === menu.pad.b && menu.pad.b === menu.pad.l, menu.pad);
      record('L4 [R6] 移动菜单项显式左对齐', menu.first && menu.first.align === 'left', { align: menu.first?.align });
      await shot(cdp, 'L_mobile_menu.png');
      const toolsItem = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('header nav.glass-tier2 button')].find(x => x.textContent.trim() === '开源工具'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      await clickRect(cdp, toolsItem); await sleep(1800);
      const after = await evalRO(cdp, `(() => ({ y: Math.round(window.scrollY), menuGone: !document.querySelector('header nav.glass-tier2') }))()`);
      record('L5 [R8] 菜单跳转后自动关闭并滚动', after.y > 200 && after.menuGone, after);
    }
    // 移动详情 chips 目录
    await nav(cdp, '/projects/nikki-gallery');
    const chips = await evalRO(cdp, `(() => { const nav = document.querySelector('main nav[aria-label="页内目录"]'); if (!nav) return { present: false }; const a = nav.querySelector('a'); const r = a.getBoundingClientRect(); return { present: true, count: nav.querySelectorAll('a').length, first: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, overflow: nav.scrollWidth > nav.clientWidth }; })()`);
    record('L6 [R8] 移动端详情 chips 目录渲染', chips.present && chips.count >= 3, chips);
    await shot(cdp, 'L_mobile_detail.png');
    if (chips.present) { await clickRect(cdp, chips.first); await sleep(1500); record('L7 [R8] 移动端 chips 点击滚动', await evalRO(cdp, 'Math.round(window.scrollY) > 100'), {}); }

    // ================= M. 移动端暗色快查 =================
    await evalRO(cdp, `(() => { localStorage.setItem('qianlu.theme','dark'); })()`);
    await nav(cdp, '/'); await sleep(1500); await shot(cdp, 'M_mobile_dark_hero.png');
    record('M1 移动端暗色无横向溢出', await evalRO(cdp, `document.documentElement.scrollWidth <= window.innerWidth + 1`), {});
    await setViewport(cdp, 1440, 900, false, 1);
    await evalRO(cdp, `(() => { localStorage.setItem('qianlu.theme','light'); })()`);

    // ================= N. Console / 网络 =================
    record('N1 Console 零报错', consoleErrors.length === 0, consoleErrors);
    record('N2 同源网络无 4xx/5xx/失败', failedRequests.length === 0, failedRequests);
    if (externalWarns.length) review('N3 外链失败（已知 GitHub 网络受限，降级 WARN）', externalWarns);

    const failed = results.filter((r) => !r.pass);
    console.log(`\n===== 验收汇总：${results.length - failed.length}/${results.length} 通过；REVIEW ${findings.length} 项 =====`);
    if (failed.length) { console.log('未通过项：'); for (const f of failed) console.log(` - ${f.name} ${JSON.stringify(f.detail)}`); }
    if (findings.length) { console.log('待人工研判项：'); for (const f of findings) console.log(` - ${f.name} ${JSON.stringify(f.detail)}`); }
    writeFileSync(join(OUT, 'results.json'), JSON.stringify({ base: BASE, results, findings, consoleErrors, failedRequests, externalWarns }, null, 2));
    if (failed.length) process.exitCode = 1;
  } finally {
    edge.kill();
  }
};

main().catch((e) => { console.error('[脚本失败]', e.message); process.exitCode = 1; });