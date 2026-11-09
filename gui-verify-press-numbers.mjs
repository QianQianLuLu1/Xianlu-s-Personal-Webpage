/* 冒烟取证：按钮短暂按下态（指针+键盘） 与 展示数字滚动（减速停住） */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9226;
const BASE = 'http://localhost:4173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(OUT, '.edge-profile-press-numbers');
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
const keyDown = (cdp, key, code, vk) => cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk });
const keyUp = (cdp, key, code, vk) => cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });

// scale 走 Tailwind v4 独立 scale 属性（非 transform）；150ms 过渡，采样需等过渡落定
const PRESS_STATE = `(() => {
  const b = [...document.querySelectorAll('[data-slot="button"]')].find(e => e.textContent.includes('浏览开源工具'));
  const cs = getComputedStyle(b);
  return {
    active: b.matches(':active'),
    kbAttr: b.dataset.kbPress ?? null,
    scale: cs.scale,
    filter: cs.filter,
    layoutW: b.offsetWidth, layoutH: b.offsetHeight, layoutTop: b.offsetTop,
    siblingTop: (b.parentElement.nextElementSibling || b.nextElementSibling)?.getBoundingClientRect().top ?? null,
  };
})()`;

/** 页内 MutationObserver 采集数字全部变化（含时间戳），不受 CDP 轮询间隔影响 */
const attachNumberLog = (cdp, selector) =>
  evalJS(cdp, `(() => {
    window.__numLog = [];
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    new MutationObserver(() => window.__numLog.push([Math.round(performance.now()), el.textContent.trim()]))
      .observe(el, { childList: true, characterData: true, subtree: true });
    return true;
  })()`);
const readNumberLog = (cdp) => evalJS(cdp, `JSON.stringify(window.__numLog)`);

const main = async () => {
  const results = [];
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--window-size=1440,900', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    // 无头默认上报 prefers-reduced-motion: reduce，会命中组件降级分支；
    // 覆盖为 no-preference 才走真实滚动分支（降级分支由 R1 与组件单测分别覆盖）
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });
    // 全程序化取证：从文档创建起记录 ①IO 对 data-animated-number 的每次回调
    // ②该元素文本每次变化（16ms 轮询 + scrollY）③动效档位翻转
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      window.__io = []; window.__seen = []; window.__mode = [];
      // 手动钉在 full 档：headless 帧率实测偏低会触发调度器自动降级 compat，
      // 令“滚动分支”不可达；compat 分支的正确性由 R1 用例单独验证。
      try { localStorage.setItem('qianlu.settings.mode', 'full'); } catch {}
      const OrigIO = window.IntersectionObserver;
      window.IntersectionObserver = class extends OrigIO {
        constructor(cb, opts) {
          super((entries, obs) => {
            for (const e of entries) {
              if (e.target?.matches?.('[data-animated-number]')) {
                window.__io.push([Math.round(performance.now()), e.isIntersecting, +e.intersectionRatio.toFixed(2), Math.round(e.boundingClientRect.top)]);
              }
            }
            cb(entries, obs);
          }, opts);
        }
      };
      document.addEventListener('DOMContentLoaded', () => {
        let lastText = null, lastMode = '';
        setInterval(() => {
          const el = document.querySelector('#gallery [data-animated-number]');
          if (el) {
            const v = el.textContent.trim();
            if (v !== lastText) { lastText = v; window.__seen.push([Math.round(performance.now()), v, Math.round(scrollY)]); }
          }
          const m = (window.__APP_CONFIG ? window.__APP_CONFIG.effectiveMode : '?') + '/' + (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'R' : '-');
          if (m !== lastMode) { lastMode = m; window.__mode.push([Math.round(performance.now()), m]); }
        }, 16);
      });
    })()` });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3500);
    // startScreencast 强制 headless 以真实帧率出帧，rAF 驱动的补间不被压缩
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 40, everyNthFrame: 1 });
    await sleep(300);

    // ===== P1 指针按下：:active + scale 下沉 + 布局盒不变；松开恢复 =====
    const base = await evalJS(cdp, PRESS_STATE);
    const p = await evalJS(cdp, `(() => {
      const b = [...document.querySelectorAll('[data-slot="button"]')].find(e => e.textContent.includes('浏览开源工具'));
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    })()`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await sleep(300);
    const pressed = await evalJS(cdp, PRESS_STATE);
    await shot(cdp, 'PN_p1_pointer_pressed.png');
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await sleep(300);
    const released = await evalJS(cdp, PRESS_STATE);
    const p1 =
      pressed.active === true &&
      pressed.scale === '0.98' &&
      pressed.filter !== base.filter &&
      pressed.layoutW === base.layoutW && pressed.layoutH === base.layoutH &&
      pressed.siblingTop === base.siblingTop &&
      released.active === false && released.scale === base.scale && released.filter === base.filter;
    console.log('[P1 指针按下]', JSON.stringify({ base: { scale: base.scale, filter: base.filter }, pressed: { active: pressed.active, scale: pressed.scale, filter: pressed.filter, sibTopDelta: (pressed.siblingTop ?? 0) - (base.siblingTop ?? 0) }, released: { active: released.active, scale: released.scale } }));
    console.log('[P1 结果]', p1 ? 'PASS' : 'FAIL'); results.push(['P1 指针按下态', p1]);

    // ===== P2 键盘按下：Enter / Space 镜像 data-kb-press，keyup/blur 恢复 =====
    await evalJS(cdp, `(() => { [...document.querySelectorAll('[data-slot="button"]')].find(e => e.textContent.includes('浏览开源工具')).focus(); return true; })()`);
    await keyDown(cdp, 'Enter', 'Enter', 13);
    await sleep(300);
    const kEnter = await evalJS(cdp, PRESS_STATE);
    await keyUp(cdp, 'Enter', 'Enter', 13);
    const kEnterUp = await evalJS(cdp, PRESS_STATE);
    await keyDown(cdp, ' ', 'Space', 32);
    await sleep(300);
    const kSpace = await evalJS(cdp, PRESS_STATE);
    await shot(cdp, 'PN_p2_keyboard_pressed.png');
    await keyUp(cdp, ' ', 'Space', 32);
    const kSpaceUp = await evalJS(cdp, PRESS_STATE);
    await keyDown(cdp, 'Enter', 'Enter', 13);
    await evalJS(cdp, `(() => { document.activeElement.blur(); return true; })()`);
    const kBlur = await evalJS(cdp, PRESS_STATE);
    await keyUp(cdp, 'Enter', 'Enter', 13);
    const p2 =
      kEnter.kbAttr === 'true' && kEnter.scale === '0.98' &&
      kEnterUp.kbAttr === null &&
      kSpace.kbAttr === 'true' && kSpace.scale === '0.98' &&
      kSpaceUp.kbAttr === null &&
      kBlur.kbAttr === null;
    console.log('[P2 键盘按下]', JSON.stringify({ enter: kEnter.kbAttr, scaleOnEnter: kEnter.scale, enterUp: kEnterUp.kbAttr, space: kSpace.kbAttr, scaleOnSpace: kSpace.scale, spaceUp: kSpaceUp.kbAttr, blurDuringHold: kBlur.kbAttr }));
    console.log('[P2 结果]', p2 ? 'PASS' : 'FAIL'); results.push(['P2 键盘按下态', p2]);

    // ===== N1 照片总数滚动：停在 0 → 中间值若干 → 精确 25，且历时体现减速 =====
    // 调度器检测完成后把会话钉回 full 档（与 updateConfig 相同的总线语义：
    // 新对象引用 + qianlu.config:change 广播），以便验证“完整动效”滚动分支。
    await evalJS(cdp, `(() => {
      window.__APP_CONFIG = { ...window.__APP_CONFIG, mode: 'full', effectiveMode: 'full' };
      localStorage.setItem('qianlu.settings.mode', 'full');
      window.dispatchEvent(new CustomEvent('qianlu.config:change', { detail: { keys: ['mode', 'effectiveMode'] } }));
      return true;
    })()`);
    await sleep(400);
    console.log('[N1 探针]', JSON.stringify(await evalJS(cdp, `(() => {
      const el = document.querySelector('#gallery [data-animated-number]');
      const r = el.getBoundingClientRect();
      return { innerH: innerHeight, scrollY: Math.round(scrollY), elTop: Math.round(r.top), text: el.textContent, ioLog: window.__io, seenLog: window.__seen, modeLog: window.__mode };
    })()`)));
    await attachNumberLog(cdp, '#gallery [data-animated-number]'); // 先挂表，元素此时在视口外
    const before = await evalJS(cdp, `document.querySelector('#gallery [data-animated-number]').textContent.trim()`);
    await evalJS(cdp, `(() => { document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' }); return true; })()`);
    await sleep(2500);
    const n1log = JSON.parse(await readNumberLog(cdp));
    const n1seq = n1log.map(([, t]) => t);
    const n1mid = n1seq.filter((t) => /^\d+$/.test(t) && Number(t) > 0 && Number(t) < 25).length;
    const n1span = n1log.length > 1 ? n1log.at(-1)[0] - n1log[0][0] : 0;
    const n1 = before === '0' && n1seq.at(-1) === '25' && n1mid >= 3 && n1span >= 600;
    console.log('[N1 照片数滚动]', JSON.stringify({ beforeRoll: before, firstSteps: n1seq.slice(0, 8), final: n1seq.at(-1), midCount: n1mid, spanMs: n1span, commits: n1log.length }));
    console.log('[N1 结果]', n1 ? 'PASS' : 'FAIL'); results.push(['N1 照片总数滚动', n1]);

    // ===== N2 摄影之路序号 01–04 精确落位 =====
    await evalJS(cdp, `(() => { document.querySelector('#journey').scrollIntoView({ behavior: 'instant' }); return true; })()`);
    await sleep(1800);
    const n2finals = await evalJS(cdp, `(() => [...document.querySelectorAll('#journey [data-animated-number]')].map(e => e.textContent.trim()))()`);
    const n2 = JSON.stringify(n2finals) === JSON.stringify(['01', '02', '03', '04']);
    console.log('[N2 阶段序号]', JSON.stringify(n2finals));
    console.log('[N2 结果]', n2 ? 'PASS' : 'FAIL'); results.push(['N2 阶段序号滚动', n2]);
    await shot(cdp, 'PN_n2_journey_final.png');

    // ===== N3 弹窗翻页计数器：开卡 → 1/25；下一张 → 从 1 续滚到 2 并停住 =====
    await evalJS(cdp, `(() => { document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' }); return true; })()`);
    await sleep(600);
    await evalJS(cdp, `(() => { document.querySelector('#gallery button[aria-label^="查看作品"]').click(); return true; })()`);
    await sleep(1800);
    const d1 = await evalJS(cdp, `(() => [...document.querySelectorAll('[role="dialog"] [data-animated-number]')].map(e => e.textContent.trim()))()`);
    await attachNumberLog(cdp, '[role="dialog"] [data-animated-number]');
    await evalJS(cdp, `(() => { document.querySelector('[role="dialog"] button[aria-label="下一张"]').click(); return true; })()`);
    await sleep(900);
    const n3log = JSON.parse(await readNumberLog(cdp)).map(([, t]) => t);
    const d2 = await evalJS(cdp, `(() => [...document.querySelectorAll('[role="dialog"] [data-animated-number]')].map(e => e.textContent.trim()))()`);
    const n3 = d1.join('/') === '1/25' && d2.join('/') === '2/25' && n3log.length > 0;
    console.log('[N3 弹窗计数器]', JSON.stringify({ opened: d1, afterNext: d2, rollSteps: n3log.slice(0, 10) }));
    console.log('[N3 结果]', n3 ? 'PASS' : 'FAIL'); results.push(['N3 弹窗计数器滚动', n3]);
    await shot(cdp, 'PN_n3_modal_counter.png');

    // ===== R1 降级分支：reduced-motion 下数字直接显示终值（不停半程） =====
    await cdp.send('Page.stopScreencast');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp.send('Page.navigate', { url: BASE + '/' });
    await sleep(3000);
    await evalJS(cdp, `(() => { document.querySelector('#gallery').scrollIntoView({ behavior: 'instant' }); return true; })()`);
    await sleep(400);
    const r1 = await evalJS(cdp, `document.querySelector('#gallery [data-animated-number]').textContent.trim()`);
    const r1pass = r1 === '25';
    console.log('[R1 reduced-motion 降级直显终值]', r1);
    console.log('[R1 结果]', r1pass ? 'PASS' : 'FAIL'); results.push(['R1 减动效降级', r1pass]);

    console.log('===== 汇总 =====');
    for (const [name, ok] of results) console.log(ok ? 'PASS' : 'FAIL', '-', name);
    if (results.some(([, ok]) => !ok)) process.exitCode = 1;
    ws.close();
  } finally {
    edge.kill();
  }
};
main().catch((e) => { console.error('[失败]', e.message); process.exit(1); });
