/*
 * “关于”板块补全验收（无头 Edge CDP，照抄 gui-verify-redesign.mjs 的连接写法）：
 * 验证 QQ 联系方式 + “我是谁”新文案在桌面 1440 与移动 390 两档视口的渲染。
 * 前置：npm run dev（localhost:5173）。
 * 用法：node gui-verify-about-qq.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9225;
const BASE = 'http://localhost:5173';
const WORKSPACE_ROOT = process.env.PORTFOLIO_WORKSPACE_ROOT ?? dirname(fileURLToPath(import.meta.url));
const SHOTS_ROOT = join(WORKSPACE_ROOT, 'gui-test-screenshots');
const OUT = SHOTS_ROOT;
const PROFILE = join(SHOTS_ROOT, '.edge-profile-about-qq');
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

const ABOUT_ASSERT = `(() => {
  const about = document.getElementById('about');
  if (!about) return { error: 'about section not found' };
  const rows = [...about.querySelectorAll('a[href]')];
  const qq = rows.find((a) => a.getAttribute('href') === 'https://qm.qq.com/q/j6m9nxRM30');
  const text = about.textContent;
  const grid = about.querySelector('.grid');
  const gridStyle = getComputedStyle(grid);
  const heroQQ = [...document.querySelectorAll('main a[aria-label="QQ"]')].map((a) => a.getAttribute('href'));
  const footerQQ = [...document.querySelectorAll('footer a[aria-label="QQ"]')].map((a) => a.getAttribute('href'));
  return {
    rowCount: rows.length,
    qqFound: !!qq,
    qqTarget: qq ? qq.getAttribute('target') : null,
    qqRel: qq ? qq.getAttribute('rel') : null,
    qqLabel: qq ? qq.textContent.replace(/\\s+/g, ' ').trim() : null,
    copy: {
      p1: text.includes('用镜头收藏温度、用代码整理灵感的独立创作者'),
      p2: text.includes('发在 B 站、小红书等平台'),
      p3: text.includes('FlashGaze') && text.includes('不如让它们自己跑起来'),
    },
    gridCols: gridStyle.gridTemplateColumns.split(' ').length,
    viewport: window.innerWidth,
    heroQQ,
    footerQQ,
  };
})()`;

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

    // ===== 桌面 1440 档 =====
    await cdp.send('Page.navigate', { url: BASE + '/#about' });
    await sleep(3500);
    const desk = await evalJS(cdp, ABOUT_ASSERT);
    record('桌面 QQ 条目存在且属性正确',
      desk.qqFound && desk.qqTarget === '_blank' && desk.qqRel === 'noopener noreferrer' && desk.rowCount === 4, desk);
    record('桌面 新文案三段齐全', desk.copy.p1 && desk.copy.p2 && desk.copy.p3, desk.copy);
    record('桌面 双列栅格', desk.gridCols === 2, { gridCols: desk.gridCols });
    record('桌面 Hero/页脚 QQ 图标', desk.heroQQ.length === 1 && desk.footerQQ.length === 1
      && desk.heroQQ[0] === 'https://qm.qq.com/q/j6m9nxRM30' && desk.footerQQ[0] === 'https://qm.qq.com/q/j6m9nxRM30',
      { heroQQ: desk.heroQQ, footerQQ: desk.footerQQ });
    await evalJS(cdp, `document.getElementById('about').scrollIntoView({ block: 'center' })`);
    await sleep(800);
    await shot(cdp, 'ABOUT_QQ_desktop_1440.png');

    // ===== 移动 390 档 =====
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: BASE + '/?verify-mobile=1#about' });
    await sleep(4000);
    const mob = await evalJS(cdp, ABOUT_ASSERT);
    record('移动 QQ 条目存在且属性正确',
      mob.qqFound && mob.qqTarget === '_blank' && mob.rowCount === 4, mob);
    record('移动 新文案三段齐全', mob.copy.p1 && mob.copy.p2 && mob.copy.p3, mob.copy);
    record('移动 单列布局', mob.gridCols === 1, { gridCols: mob.gridCols, viewport: mob.viewport });
    // 条目不溢出视口
    const overflow = await evalJS(cdp, `(() => {
      const a = document.querySelector('#about a[href="https://qm.qq.com/q/j6m9nxRM30"]');
      const r = a.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), viewport: window.innerWidth };
    })()`);
    record('移动 QQ 条目不溢出', overflow.left >= 0 && overflow.right <= overflow.viewport, overflow);
    await evalJS(cdp, `document.getElementById('about').scrollIntoView({ block: 'start' })`);
    await sleep(800);
    await shot(cdp, 'ABOUT_QQ_mobile_390.png');
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
