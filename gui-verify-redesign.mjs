/*
 * 七原则改造验收脚本（无头 Edge CDP，与 gui-verify.mjs 同模式）：
 * 验证 留白间距 / 栅格对齐 / 卡片浮起微交互 / 瀑布流 / 玻璃控件 / 骨架屏 / 空状态。
 * 前置：npm run build && npm run preview（localhost:4173）。
 * 用法：node gui-verify-redesign.mjs
 */
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
const PROFILE = join(SHOTS_ROOT, '.edge-profile-redesign');
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

async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, name);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`[截图] ${file}`);
  return file;
}

async function clickAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(60);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function hoverAt(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(450);
}

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

    // ===== R1 栅格：四个内容区容器左右边缘对齐 + 区块留白 =====
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3200);
    const grid = await evalJS(cdp, `(() => {
      const ids = ['tools', 'journey', 'gallery', 'about'];
      const lefts = [], pads = {};
      for (const id of ids) {
        const sec = document.getElementById(id);
        const inner = sec.querySelector('.max-w-6xl');
        const r = inner.getBoundingClientRect();
        lefts.push(Math.round(r.left));
        pads[id] = getComputedStyle(sec).paddingTop;
      }
      return { lefts, uniqueLefts: [...new Set(lefts)], pads };
    })()`);
    record('R1 栅格对齐', grid.uniqueLefts.length === 1, grid);
    record('R1 区块留白 py-28(112px)', Object.values(grid.pads).every((p) => p === '112px'), grid.pads);
    await shot(cdp, 'REDESIGN_R1_hero_light.png');

    // ===== R2 卡片浮起：Journey 卡 hover 位移与投影 =====
    // 注：无头软渲染会触发性能调度器自动降级 mode-compat（设计行为：
    // 位移停用、仅投影）。故分两段断言：投影加深必须发生；位移在
    // 临时移除 mode-compat（等价 full 档）后必须发生。
    const jCard = await evalJS(cdp, `(() => {
      const sec = document.getElementById('journey');
      const card = sec.querySelector('.card-lift');
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = card.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), htmlClass: document.documentElement.className };
    })()`);
    console.log('[诊断] html class =', jCard.htmlClass);
    await sleep(1200);
    const before = await evalJS(cdp, `(() => {
      const card = document.querySelector('#journey .card-lift');
      const s = getComputedStyle(card);
      return { transform: s.transform, shadow: s.boxShadow.slice(0, 60) };
    })()`);
    await hoverAt(cdp, jCard.x, jCard.y);
    const after = await evalJS(cdp, `(() => {
      const card = document.querySelector('#journey .card-lift');
      const s = getComputedStyle(card);
      return { transform: s.transform, shadow: s.boxShadow.slice(0, 60) };
    })()`);
    const shadowDeepened = after.shadow !== before.shadow;
    const compatActive = jCard.htmlClass.includes('mode-compat');
    record('R2 Journey 卡 hover 投影加深', shadowDeepened, { before, after, compatActive });

    // full 档（临时移除 mode-compat）下必须有 -4px 位移
    await evalJS(cdp, `document.documentElement.classList.remove('mode-compat')`);
    await hoverAt(cdp, jCard.x, jCard.y);
    const fullLift = await evalJS(cdp, `(() => {
      const card = document.querySelector('#journey .card-lift');
      return getComputedStyle(card).transform;
    })()`);
    record('R2 full 档 hover 上浮 -4px', fullLift.includes('-4'), { fullLift });
    await evalJS(cdp, `document.documentElement.classList.add('mode-compat')`);
    await shot(cdp, 'REDESIGN_R2_journey_hover.png');

    // ===== R3 瀑布流 + 骨架：禁缓存刷新后应先出现骨架，加载完退场 =====
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Page.navigate', { url: BASE + '/#gallery' });
    await sleep(300);
    const early = await evalJS(cdp, `(() => ({
      skeletons: document.querySelectorAll('#gallery [data-slot="skeleton"]').length,
      cards: document.querySelectorAll('#gallery button[aria-label^="查看作品"]').length,
    }))()`).catch(() => ({ skeletons: -1, cards: -1 }));
    // 轮询等待全部图片解码完成（软渲染下 4K AVIF 解码较慢，上限 20s）
    let settled = null;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      settled = await evalJS(cdp, `(() => {
        const imgs = [...document.querySelectorAll('#gallery img')];
        const fades = [...document.querySelectorAll('#gallery [data-slot="photo-fade"]')];
        return {
          total: imgs.length,
          complete: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
          skeletonsLeft: document.querySelectorAll('#gallery [data-slot="skeleton"]').length,
          fadedIn: fades.filter((f) => f.className.includes('opacity-100')).length,
          columns: getComputedStyle(document.querySelector('#gallery .columns-1')).columnCount,
          gap: getComputedStyle(document.querySelector('#gallery .columns-1')).columnGap,
        };
      })()`);
      if (settled.total > 0 && settled.complete === settled.total && settled.skeletonsLeft === 0) break;
    }
    record('R3 骨架屏先显示', early.skeletons > 0 || early.cards === 0, early);
    record('R3 图片加载完骨架退场', settled.total === settled.complete && settled.skeletonsLeft === 0 && settled.fadedIn === settled.total, settled);
    record('R3 瀑布流列数与间距', ['1', '2', '3', '4'].includes(String(settled.columns)) && parseFloat(settled.gap) >= 20, settled);

    // ===== R4 画廊卡 hover 浮起（同 R2：先投影，再移除 compat 验证位移） =====
    const gCard = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('#gallery button[aria-label^="查看作品"]')].find((el) => {
        const r = el.getBoundingClientRect();
        return r.top > 120 && r.bottom < 800;
      });
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: b.getAttribute('aria-label') };
    })()`);
    await hoverAt(cdp, gCard.x, gCard.y);
    const gShadow = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('#gallery button[aria-label^="查看作品"]')].find((el) => el.getAttribute('aria-label') === ${JSON.stringify(gCard.label)});
      return getComputedStyle(b).boxShadow.slice(0, 60);
    })()`);
    record('R4 画廊卡 hover 投影加深', gShadow.includes('0.18'), { label: gCard.label, shadow: gShadow });
    await evalJS(cdp, `document.documentElement.classList.remove('mode-compat')`);
    await hoverAt(cdp, gCard.x, gCard.y);
    const gLift = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('#gallery button[aria-label^="查看作品"]')].find((el) => el.getAttribute('aria-label') === ${JSON.stringify(gCard.label)});
      return getComputedStyle(b).transform;
    })()`);
    record('R4 full 档画廊卡 hover 上浮 -4px', gLift.includes('-4'), { transform: gLift });
    await evalJS(cdp, `document.documentElement.classList.add('mode-compat')`);

    // ===== R5 灯箱：玻璃控制条 + 关闭后页面可交互（不回归 header 冻结修复） =====
    await clickAt(cdp, gCard.x, gCard.y);
    await sleep(1800);
    const modal = await evalJS(cdp, `(() => {
      const bar = document.querySelector('[role="dialog"] .glass-tier2.glass-float');
      const img = document.querySelector('[role="dialog"] img');
      return { glassBar: !!bar, imgLoaded: img ? img.complete && img.naturalWidth > 0 : false };
    })()`);
    record('R5 灯箱玻璃控制条', modal.glassBar && modal.imgLoaded, modal);
    await shot(cdp, 'REDESIGN_R5_lightbox_glass.png');
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(1000);
    const afterClose = await evalJS(cdp, `(() => {
      const btn = [...document.querySelectorAll('nav button')].find((b) => b.textContent === '首页');
      const header = document.querySelector('header');
      const hs = getComputedStyle(header);
      return { dialogGone: !document.querySelector('[role="dialog"]'), headerPE: hs.pointerEvents, navBtn: !!btn };
    })()`);
    record('R5 关闭灯箱后 header 可交互', afterClose.dialogGone && afterClose.headerPE !== 'none', afterClose);

    // ===== R6 回顶按钮玻璃化 =====
    await evalJS(cdp, `window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })`);
    await sleep(900);
    const toTop = await evalJS(cdp, `(() => {
      const b = document.querySelector('button[aria-label="回到顶部"]');
      if (!b) return { found: false };
      const s = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return {
        found: true,
        visible: r.width > 0 && s.opacity !== '0',
        glass: b.className.includes('glass-tier2') && b.className.includes('glass-float'),
        backdrop: s.backdropFilter !== 'none',
        radius: s.borderRadius,
        center: { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) },
      };
    })()`);
    record('R6 回顶按钮玻璃化', toTop.found && toTop.visible && toTop.glass && toTop.backdrop, toTop);
    await shot(cdp, 'REDESIGN_R6_scrolltop_glass.png');
    await clickAt(cdp, toTop.center.x, toTop.center.y);
    let backTop = -1;
    for (let i = 0; i < 16; i++) {
      await sleep(350);
      backTop = await evalJS(cdp, `Math.round(scrollY)`);
      if (backTop < 100) break;
    }
    record('R6 回顶点击生效', backTop < 100, { scrollY: backTop });

    // ===== R7 空状态：拦截全部图片请求 → EmptyState 玻璃卡 =====
    await cdp.send('Fetch.enable', {
      patterns: [{ urlPattern: '*://localhost:4173/photos/*', interceptionStage: 'Request' }],
    });
    // 常驻监听器：任何时刻到达的 requestPaused 都立即失败，不丢事件
    const failHandler = (e) => {
      const m = JSON.parse(e.data);
      if (m.method === 'Fetch.requestPaused') {
        cdp
          .send('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'Failed' })
          .catch(() => {});
      }
    };
    ws.addEventListener('message', failHandler);
    // 带查询参数强制真实导航（同 URL 仅变 hash 不会重载页面、也不会重新请求图片）
    await cdp.send('Page.navigate', { url: BASE + '/?verify-empty=1#gallery' });
    // loading="lazy" 的图片只在进入视口时才发请求：逐屏滚动触发全部请求
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
    const empty = await evalJS(cdp, `(() => {
      const es = document.querySelector('#gallery [data-slot="empty-state"]');
      return {
        present: !!es,
        glass: es ? es.className.includes('glass-tier2') : false,
        title: es ? es.textContent.includes('照片还没就位') : false,
        action: !!document.querySelector('#gallery [data-slot="empty-state"] button'),
        cards: document.querySelectorAll('#gallery button[aria-label^="查看作品"]').length,
      };
    })()`);
    record('R7 全部失败出现空状态玻璃卡', empty.present && empty.title && empty.action && empty.cards === 0, empty);
    await shot(cdp, 'REDESIGN_R7_empty_state.png');

    // ===== R8 移动端瀑布流（390 宽单列/双列） =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: BASE + '/#gallery' });
    await sleep(4000);
    const mobile = await evalJS(cdp, `(() => {
      const cols = getComputedStyle(document.querySelector('#gallery .columns-1')).columnCount;
      const inner = document.querySelector('#gallery .max-w-6xl').getBoundingClientRect();
      return { columns: cols, innerWidth: Math.round(inner.width) };
    })()`);
    record('R8 移动端瀑布流', ['1', '2'].includes(String(mobile.columns)), mobile);
    await shot(cdp, 'REDESIGN_R8_mobile_gallery.png');
    await cdp.send('Emulation.clearDeviceMetricsOverride');

    // ===== 汇总 =====
    const failed = results.filter((r) => !r.pass);
    console.log(`\n===== 验收汇总：${results.length - failed.length}/${results.length} 通过 =====`);
    if (failed.length) {
      console.log('未通过项：');
      for (const f of failed) console.log(` - ${f.name}`);
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
