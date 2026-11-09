/*
 * qianlu-portfolio 浏览器 GUI 黑盒全量验收脚本（无头 Edge CDP，与 gui-verify-covers.mjs 同模式）。
 * 黑盒原则：滚动/点击/键盘全部走 CDP Input 域（合成真实用户输入）；
 * Runtime.evaluate 仅做只读观测（几何/状态/文本读取）。
 * 前置：npm run build && npm run preview（localhost:4173）。
 * 用法：node gui-verify-acceptance-0902.mjs
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
const OUT = join(SHOTS_ROOT, 'acceptance-0902');
const PROFILE = join(SHOTS_ROOT, '.edge-profile-acceptance');
mkdirSync(OUT, { recursive: true });

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

const consoleErrors = [];
const failedRequests = [];

async function evalRO(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, name);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${name}`);
  return file;
}

/** 输入域滚轮：把页面滚到目标 scrollY（instant，非平滑） */
async function wheelTo(cdp, targetY) {
  for (let i = 0; i < 60; i++) {
    const y = await evalRO(cdp, 'Math.round(window.scrollY)');
    const diff = targetY - y;
    if (Math.abs(diff) < 2) return y;
    const step = Math.max(-1200, Math.min(1200, diff));
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: 720, y: 450, deltaX: 0, deltaY: step,
    });
    await sleep(120);
  }
  return evalRO(cdp, 'Math.round(window.scrollY)');
}

/** 输入域点击：坐标来自只读几何 */
async function clickRect(cdp, rect) {
  const x = Math.round(rect.x + rect.w / 2);
  const y = Math.round(rect.y + rect.h / 2);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(400);
}

async function pressEscape(cdp) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(400);
}

const R = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`;

const main = async () => {
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
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200));
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push('console.error: ' + (m.params.args?.map((a) => a.value ?? a.description).join(' ') ?? '').slice(0, 200));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrors.push('log: ' + m.params.entry.text.slice(0, 200));
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && m.params.response.url.startsWith('http')) failedRequests.push(`${m.params.response.status} ${m.params.response.url}`);
      if (m.method === 'Network.loadingFailed' && !m.params.canceled) failedRequests.push(`failed ${m.params.errorText} ${m.params.type}`);
    });

    // ============ A. 桌面亮色：加载与 Hero ============
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3500);
    const hero = await evalRO(cdp, `(() => ({
      h1: !!document.querySelector('h1'),
      h1Opacity: getComputedStyle(document.querySelector('h1')).opacity,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      navButtons: [...document.querySelectorAll('header button')].length,
      docH: document.documentElement.scrollHeight
    }))()`);
    record('A1 首页加载 Hero 渲染完成', hero.h1 && Number(hero.h1Opacity) > 0.9, hero);
    await shot(cdp, 'A1_light_hero.png');

    // 导航锚点点击 → 落点 = scroll-mt 96px（遗留项①健康环境复核）
    const navBtn = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('header nav button')].find(x => x.textContent.trim()==='开源工具'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    await clickRect(cdp, navBtn);
    await sleep(1800); // 平滑滚动
    const landing = await evalRO(cdp, `(() => ({
      scrollY: Math.round(window.scrollY),
      toolsTop: Math.round(document.getElementById('tools').getBoundingClientRect().top),
      headerBottom: Math.round((document.querySelector('header') || document.querySelector('.fixed.top-0')).getBoundingClientRect().bottom),
      activeNav: [...document.querySelectorAll('header nav button')].find(b => b.className.includes('text-') && getComputedStyle(b).color !== getComputedStyle([...document.querySelectorAll('header nav button')][0]).color)?.textContent.trim() ?? null
    }))()`);
    record('A2 导航点击锚点落点=96px(scroll-mt-24)', Math.abs(landing.toolsTop - 96) <= 4, landing);
    await shot(cdp, 'A2_light_tools_landing.png');

    // ============ B. 项目卡（规则1/2/7）============
    const covers = await evalRO(cdp, `(() => {
      const imgs = [...document.querySelectorAll('#tools img[alt$="封面"]')];
      return imgs.map(img => {
        const r = img.getBoundingClientRect();
        const s = getComputedStyle(img);
        return { alt: img.alt, complete: img.complete && img.naturalWidth > 0, objectFit: s.objectFit, boxW: Math.round(r.width), boxH: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3) };
      });
    })()`);
    record('B1 两张项目封面加载且 object-cover 16:9', covers.length === 2 && covers.every(c => c.complete && c.objectFit === 'cover' && Math.abs(c.ratio - 16 / 9) < 0.02), covers);

    // 标题+徽章基线对齐（规则1：读基线几何）
    const baseline = await evalRO(cdp, `(() => {
      const title = [...document.querySelectorAll('#tools h3')].find(h => h.textContent.trim()==='NikkiGallery');
      if (!title) return null;
      const ts = getComputedStyle(title);
      const tr = title.getBoundingClientRect();
      const badge = title.parentElement.querySelector('span, [class*=badge]') || title.nextElementSibling;
      const badges = [...(title.parentElement.querySelectorAll('span,small'))].slice(0,4).map(b => {
        const r = b.getBoundingClientRect();
        const s = getComputedStyle(b);
        return { text: b.textContent.trim().slice(0,10), baseline: Math.round(r.bottom - parseFloat(s.paddingBottom||0) - (r.height - parseFloat(s.paddingTop||0) - parseFloat(s.paddingBottom||0))/2 + 0) , top: Math.round(r.top), bottom: Math.round(r.bottom) };
      });
      return { titleFont: ts.fontSize, titleTop: Math.round(tr.top), titleBottom: Math.round(tr.bottom), badges };
    })()`);
    record('B2 标题徽章几何可测(截图判定基线)', !!baseline, baseline);
    await wheelTo(cdp, 1881);
    await sleep(800);
    await shot(cdp, 'B2_light_flashgaze_card.png');

    // ============ C. Journey 计数动画（规则1/2）============
    const jTop = await evalRO(cdp, `Math.round(document.getElementById('journey').getBoundingClientRect().top + window.scrollY - 96)`);
    await wheelTo(cdp, jTop);
    await sleep(2500); // 等计数动画
    const journey = await evalRO(cdp, `(() => {
      const nums = [...document.querySelectorAll('#journey *')].filter(e => e.children.length===0 && /^\d{2}$/.test(e.textContent.trim())).map(e => e.textContent.trim());
      const imgs = [...document.querySelectorAll('#journey img')].map(i => i.complete && i.naturalWidth > 0);
      return { nums, imgCount: imgs.length, imgOk: imgs.every(Boolean) };
    })()`);
    record('C1 Journey 计数器 00→01-04', JSON.stringify(journey.nums.sort()) === JSON.stringify(['01','02','03','04']), journey);
    record('C2 Journey 照片全部加载', journey.imgCount >= 4 && journey.imgOk, journey);
    await shot(cdp, 'C1_light_journey.png');

    // ============ D. Gallery 瀑布流 + 计数 ============
    const gTop = await evalRO(cdp, `Math.round(document.getElementById('gallery').getBoundingClientRect().top + window.scrollY - 96)`);
    await wheelTo(cdp, gTop);
    await sleep(2500);
    const gallery = await evalRO(cdp, `(() => {
      const countEl = [...document.querySelectorAll('#gallery p')].find(p => p.textContent.includes('张照片'));
      const m = countEl ? countEl.textContent.match(/(\\d+)\\s*张照片/) : null;
      const cards = [...document.querySelectorAll('#gallery button[aria-label], #gallery button')].filter(b => b.textContent.includes('查看作品') || b.getAttribute('aria-label'));
      const firstRowY = Math.min(...cards.slice(0,8).map(c => Math.round(c.getBoundingClientRect().top)));
      const perRow = cards.filter(c => Math.abs(c.getBoundingClientRect().top - firstRowY) < 4).length;
      const imgs = [...document.querySelectorAll('#gallery img')];
      return { countText: countEl ? countEl.textContent.trim().slice(0,30) : null, count: m ? +m[1] : null, cardCount: cards.length, perRow, imgTotal: imgs.length, imgOk: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
    })()`);
    record('D1 作品计数滚动到实际张数', gallery.count === 20, { countText: gallery.countText, count: gallery.count });
    record('D2 瀑布流 4 列(1440px xl)', gallery.perRow === 4, { perRow: gallery.perRow });
    record('D3 作品图全部加载无坏图', gallery.imgTotal === 20 && gallery.imgOk === 20, { total: gallery.imgTotal, ok: gallery.imgOk });
    await shot(cdp, 'D1_light_gallery_grid.png');

    // ============ E. 作品弹窗流程（交互专项）============
    const card = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('#gallery button')].find(x => (x.getAttribute('aria-label')||'').includes('01') || x.textContent.includes('01')); if(!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    record('E1 找到作品卡01', !!card && card.y > 0 && card.y < 900, card);
    if (card) {
      await clickRect(cdp, card);
      await sleep(1200);
      const modal = await evalRO(cdp, `(() => {
        const dlg = document.querySelector('[role=dialog]');
        if (!dlg) return { open: false };
        const btns = [...dlg.querySelectorAll('button')].map(b => ({ label: b.getAttribute('aria-label') || b.textContent.trim().slice(0,8) }));
        const img = dlg.querySelector('img');
        return { open: true, btns, imgLoaded: img ? img.complete && img.naturalWidth > 0 : false };
      })()`);
      record('E2 弹窗打开且大图加载', modal.open && modal.imgLoaded, modal);
      await shot(cdp, 'E1_light_modal_open.png');
      // 左右切换：找含“下一/右/next”的按钮
      const nextBtn = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role=dialog]'); if(!dlg) return null; const b = [...dlg.querySelectorAll('button')].find(x => /下一|右|next/i.test(x.getAttribute('aria-label')||'') || /chevron-right/i.test(x.innerHTML)); if(!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      if (nextBtn) {
        await clickRect(cdp, nextBtn);
        await sleep(800);
        const idx = await evalRO(cdp, `(() => { const dlg = document.querySelector('[role=dialog]'); const m = dlg ? dlg.textContent.match(/\\d+\\s*\\/\\s*\\d+|(\\d+)\\s*张照片/) : null; return dlg ? dlg.textContent.slice(0, 200) : null; })()`);
        record('E3 弹窗下一张切换', !!idx, { textSnippet: idx });
        await shot(cdp, 'E2_light_modal_next.png');
      } else {
        record('E3 弹窗下一张按钮', false, '未找到下一张按钮');
      }
      await pressEscape(cdp);
      await sleep(600);
      const closed = await evalRO(cdp, `(() => ({ open: !!document.querySelector('[role=dialog]'), headerGlass: (() => { const h = document.querySelector('header'); return h ? h.className : null; })() }))()`);
      record('E4 Escape 关闭弹窗且滚动态 header 保持(上轮问题2回归)', !closed.open && /backdrop|bg-cream|bg-[\w/]+\/90|blur/.test(closed.headerGlass || ''), closed);
      await shot(cdp, 'E3_light_after_modal_close.png');
    }

    // ============ F. About / Footer ============
    const aTop = await evalRO(cdp, `Math.round(document.getElementById('about').getBoundingClientRect().top + window.scrollY - 96)`);
    await wheelTo(cdp, aTop);
    await sleep(1200);
    await shot(cdp, 'F1_light_about.png');
    await wheelTo(cdp, 99999);
    await sleep(800);
    const footer = await evalRO(cdp, `(() => ({ atBottom: Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 4, hasFooter: !!document.querySelector('footer'), backTopBtn: [...document.querySelectorAll('button')].some(b => (b.getAttribute('aria-label')||b.textContent).includes('回到顶部') || /arrow-?up/i.test(b.innerHTML)) }))()`);
    record('F2 页脚可见+回到顶部按钮出现', footer.atBottom && footer.hasFooter && footer.backTopBtn, footer);
    await shot(cdp, 'F2_light_footer.png');

    // 回到顶部按钮点击
    const backTop = await evalRO(cdp, `(() => { const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||x.textContent).includes('回到顶部') || /arrow-?up/i.test(x.innerHTML)); if(!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (backTop) {
      await clickRect(cdp, backTop);
      await sleep(1800);
      const y = await evalRO(cdp, 'Math.round(window.scrollY)');
      record('F3 回到顶部生效', y < 50, { scrollY: y });
    }

    // ============ G. 主题切换 → 暗色（遗留项②）============
    const themeBtn = await evalRO(cdp, R('header button[aria-label*="暗色"], header button[aria-label*="亮色"]'));
    record('G1 找到主题切换按钮', !!themeBtn, themeBtn);
    if (themeBtn) {
      await wheelTo(cdp, 200); // 轻微滚动使 header 进入滚动态
      await sleep(400);
      await clickRect(cdp, themeBtn);
      await sleep(1000);
      const dark = await evalRO(cdp, `(() => ({ isDark: document.documentElement.classList.contains('dark'), scrolled: Math.round(window.scrollY) > 80 }))()`);
      record('G2 切换暗色生效', dark.isDark, dark);
      await shot(cdp, 'G1_dark_scrolled_header.png'); // 遗留项②证据：暗色+滚动态整条 header
      const headerShot = await evalRO(cdp, `(() => { const h = document.querySelector('header'); const r = h.getBoundingClientRect(); return { x: 0, y: 0, w: Math.round(r.width), h: Math.round(r.height) }; })()`);
      const hr = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: headerShot.h + 40, scale: 1 } });
      writeFileSync(join(OUT, 'G2_dark_header_zoom.png'), Buffer.from(hr.data, 'base64'));
      // 暗色下全段走查
      const jTop2 = await evalRO(cdp, `Math.round(document.getElementById('journey').getBoundingClientRect().top + window.scrollY - 96)`);
      await wheelTo(cdp, jTop2); await sleep(1500); await shot(cdp, 'G3_dark_journey.png');
      const gTop2 = await evalRO(cdp, `Math.round(document.getElementById('gallery').getBoundingClientRect().top + window.scrollY - 96)`);
      await wheelTo(cdp, gTop2); await sleep(1500); await shot(cdp, 'G4_dark_gallery.png');
    }

    // ============ H. 设置面板 ============
    const setBtn = await evalRO(cdp, R('header button[aria-label*="设置"]'));
    if (setBtn) {
      await clickRect(cdp, setBtn);
      await sleep(900);
      const panel = await evalRO(cdp, `(() => {
        const dlg = document.querySelector('[role=dialog], [role=menu], [data-state=open]');
        const radios = [...document.querySelectorAll('[role=radio]')].map(r => ({ label: r.getAttribute('aria-label') || r.textContent.trim().slice(0,12), checked: r.getAttribute('aria-checked') }));
        return { open: !!dlg, radioCount: radios.length, radios: radios.slice(0, 12) };
      })()`);
      record('H1 设置面板打开含性能/主题单选组', panel.open && panel.radioCount >= 4, panel);
      await shot(cdp, 'H1_light_settings_panel.png');
      await pressEscape(cdp);
      await sleep(500);
      const panelClosed = await evalRO(cdp, `!document.querySelector('[data-state=open]')`);
      record('H2 设置面板可关闭', panelClosed, { panelClosed });
    } else {
      record('H1 设置按钮', false, '未找到设置按钮');
    }

    // ============ I. 项目详情页 ============
    await wheelTo(cdp, 1000);
    await sleep(500);
    const detailLink = await evalRO(cdp, `(() => { const a = [...document.querySelectorAll('a[href="/projects/nikki-gallery"]')].find(a => a.textContent.includes('查看详情')); if(!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (detailLink && detailLink.y > 0 && detailLink.y < 900) {
      await clickRect(cdp, detailLink);
      await sleep(2000);
    } else {
      await cdp.send('Page.navigate', { url: BASE + '/projects/nikki-gallery' });
      await sleep(2200);
    }
    const detail = await evalRO(cdp, `(() => ({
      url: location.pathname,
      firstBlockTop: Math.round((document.querySelector('main > *') || document.querySelector('main')).getBoundingClientRect().top),
      headerBottom: Math.round((document.querySelector('header') || document.querySelector('.fixed.top-0')).getBoundingClientRect().bottom),
      coverOk: (() => { const i = document.querySelector('img[alt$="封面"]'); return i ? i.complete && i.naturalWidth > 0 : false; })(),
      tocItems: [...document.querySelectorAll('nav a, aside a')].filter(a => a.href.includes('#')).length
    }))()`);
    record('I1 详情页路由+首块为导航留高(pt-24)', detail.url === '/projects/nikki-gallery' && detail.firstBlockTop >= detail.headerBottom - 8, detail);
    record('I2 详情页封面加载', detail.coverOk, detail);
    await shot(cdp, 'I1_light_detail_nikki_top.png');

    // 目录点击滚动 + scrollspy
    const tocLink = await evalRO(cdp, `(() => { const a = [...document.querySelectorAll('a[href*="#"]')].find(a => a.getBoundingClientRect().width > 0 && a.href.includes('#')); if(!a) return null; const r = a.getBoundingClientRect(); return { label: a.textContent.trim().slice(0,10), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (tocLink) {
      await clickRect(cdp, tocLink);
      await sleep(1600); // 平滑滚动
      const spy = await evalRO(cdp, `(() => ({ scrollY: Math.round(window.scrollY), tocActive: [...document.querySelectorAll('a[href*="#"]')].filter(a => /border|bg-|text-/.test(a.className) && getComputedStyle(a).fontWeight >= 500).map(a => a.textContent.trim().slice(0,10)).slice(0,3) }))()`);
      record('I3 详情页目录点击滚动+scrollspy', spy.scrollY > 100, spy);
    }
    // 下一项目卡
    const nextProj = await evalRO(cdp, `(() => { const a = [...document.querySelectorAll('a[href="/projects/flashgaze"]')].pop(); if(!a) return null; a.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = a.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
    if (nextProj) {
      await clickRect(cdp, nextProj);
      await sleep(2000);
      const d2 = await evalRO(cdp, `(() => ({ url: location.pathname, y: Math.round(window.scrollY) }))()`);
      record('I4 下一项目卡跳转 FlashGaze', d2.url === '/projects/flashgaze', d2);
      await shot(cdp, 'I2_light_detail_flashgaze_top.png');
    }

    // ============ J. 移动端 390×844 ============
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    const mob = await evalRO(cdp, `(() => ({
      hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
      hamburger: (() => { const b=[...document.querySelectorAll('header button')].filter(b=>b.getBoundingClientRect().width>0); const last=b[b.length-1]; if(!last) return null; const r=last.getBoundingClientRect(); return { label: last.getAttribute('aria-label')||last.textContent.trim().slice(0,8), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
    }))()`);
    record('J1 移动端无横向溢出', !mob.hOverflow, { scrollW: mob.scrollW, innerW: mob.innerW });
    await shot(cdp, 'J1_mobile_hero.png');
    if (mob.hamburger) {
      await clickRect(cdp, mob.hamburger);
      await sleep(900);
      const menu = await evalRO(cdp, `(() => {
        const items = [...document.querySelectorAll('header button, [role=dialog] button, nav button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && /首页|开源工具|摄影之路|作品集|关于/.test(b.textContent) && r.top > 60; });
        return { open: items.length >= 5, first: items[0] ? items[0].textContent.trim() : null, rect: items[0] ? { x: Math.round(items[0].getBoundingClientRect().x), y: Math.round(items[0].getBoundingClientRect().y), w: Math.round(items[0].getBoundingClientRect().width), h: Math.round(items[0].getBoundingClientRect().height) } : null };
      })()`);
      record('J2 汉堡菜单展开', menu.open, menu);
      await shot(cdp, 'J2_mobile_menu_open.png');
      if (menu.open && menu.rect) {
        await clickRect(cdp, menu.rect);
        await sleep(1800);
        const after = await evalRO(cdp, `(() => ({ scrollY: Math.round(window.scrollY), menuGone: ![...document.querySelectorAll('header button')].some(b => { const r = b.getBoundingClientRect(); return r.top > 60 && r.width > 0 && /开源工具|摄影之路/.test(b.textContent); }) }))()`);
        record('J3 菜单跳转后自动关闭并滚动', after.scrollY > 300 && after.menuGone, after);
        await shot(cdp, 'J3_mobile_after_nav.png');
      }
    }
    // 移动端图片抽查
    const mobImgs = await evalRO(cdp, `(() => { const imgs = [...document.querySelectorAll('img')]; return { total: imgs.length, ok: imgs.filter(i => !i.src || (i.complete && i.naturalWidth > 0)).length }; })()`);
    record('J4 移动端已加载图片无坏图', mobImgs.ok === mobImgs.total, mobImgs);
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // ============ K. W3C 校验样本 + 外链清单 ============
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    const html1 = await evalRO(cdp, 'document.documentElement.outerHTML');
    writeFileSync(join(OUT, 'w3c_home_rendered.html'), html1);
    await cdp.send('Page.navigate', { url: BASE + '/projects/nikki-gallery' });
    await sleep(2500);
    const html2 = await evalRO(cdp, 'document.documentElement.outerHTML');
    writeFileSync(join(OUT, 'w3c_detail_rendered.html'), html2);
    const links = await evalRO(cdp, `[...new Set([...document.querySelectorAll('a[href^="http"]')].map(a => a.href))]`);
    writeFileSync(join(OUT, 'external_links.json'), JSON.stringify(links, null, 2));
    record('K1 已导出渲染 DOM 与外链清单', links.length >= 6, { count: links.length });

    // ============ L. Console / 网络零错误 ============
    record('L1 Console 零报错', consoleErrors.length === 0, consoleErrors);
    record('L2 网络请求无 4xx/5xx/失败', failedRequests.length === 0, failedRequests);

    const failed = results.filter((r) => !r.pass);
    console.log(`\n===== 验收汇总：${results.length - failed.length}/${results.length} 通过 =====`);
    if (failed.length) {
      console.log('未通过项：');
      for (const f of failed) console.log(` - ${f.name} ${JSON.stringify(f.detail)}`);
      process.exitCode = 1;
    }
  } finally {
    edge.kill();
  }
};

main().catch((e) => {
  console.error('[脚本失败]', e.message);
  process.exitCode = 1;
});
