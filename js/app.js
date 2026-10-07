// 画面の切り替えと、ショートカットからの呼び出し（?ev=open / closed / morning）の受け取り
import { load, update, state, day } from './store.js';
import * as R from './rules.js';
import { dayKey, esc } from './util.js';
import { $, toast } from './ui.js';
import { APP_VERSION } from './version.js';
import * as home from './screens/home.js';
import * as gate from './screens/gate.js';
import * as back from './screens/back.js';
import * as focus from './screens/focus.js';
import * as morning from './screens/morning.js';
import * as forge from './screens/forge.js';
import * as record from './screens/record.js';
import * as review from './screens/review.js';
import * as onboard from './screens/onboard.js';
import * as guide from './screens/guide.js';
import * as about from './screens/about.js';

const SCREENS = { home, gate, back, focus, result: focus.result, morning, forge, record, review, onboard, guide, about };

const NAV = [
  ['home', '拠点', '⌂'],
  ['focus', '集中', '⚔'],
  ['morning', '朝の3つ', '☀'],
  ['record', '記録', '▤'],
  ['review', '見直し', '⚙'],
];

let current = '';
let lastRaw = null;

const rawState = () => { try { return localStorage.getItem('michi.state'); } catch { return null; } };
// 保存内容が変わった時だけ描き直す（入力中の文字を消さないため）
function renderIfChanged() { if (rawState() !== lastRaw) render(); }

export function go(name, replace = false) {
  const h = `#${name}`;
  if (replace) history.replaceState(null, '', h);
  else if (location.hash !== h) history.pushState(null, '', h);
  render();
}

function screenName() {
  const n = location.hash.replace('#', '').split('?')[0];
  return SCREENS[n] ? n : 'home';
}

function topBar(s) {
  const now = new Date();
  const bal = R.balance(s);
  let chip = `<span class="chip ${bal ? '' : 'zero'}" title="今日の持ち時間">⌛ ${bal}分</span>`;
  if (s.focus) chip = '<span class="chip focus">⚔ 集中中</span>';
  else if (R.isNight(s, now)) chip = '<span class="chip night">☾ 就寝ロック</span>';
  if (!s.onboarding.done) chip = '';
  return `<a class="brand" href="#home">Michi</a><span class="sp"></span>${chip}`;
}

export function render() {
  const s = load();
  let name = screenName();
  if (!s.onboarding.done && !['onboard', 'guide', 'about', 'back', 'gate'].includes(name)) name = 'onboard';
  const scr = SCREENS[name];
  const moved = current !== name;
  current = name;
  const main = $('#main');
  $('#top').innerHTML = topBar(s);
  const showNav = s.onboarding.done && scr.nav !== false;
  $('#nav').hidden = !showNav;
  $('#nav').innerHTML = NAV.map(([n, label, ic]) => `<a href="#${n}" class="${n === name ? 'on' : ''}"><span class="ic" aria-hidden="true">${ic}</span>${label}</a>`).join('');
  main.classList.toggle('full', !showNav);
  main.innerHTML = scr.render(s, app);
  scr.bind?.(main, s, app);
  document.title = scr.title ? `${scr.title} - Michi` : 'Michi';
  lastRaw = rawState();
  if (moved) window.scrollTo(0, 0);
}

// 毎秒：タイマーなど時間で変わる表示だけ更新する
function tick() {
  const scr = SCREENS[current];
  if (scr?.tick) scr.tick($('#main'), state(), app);
  const top = $('#top');
  if (top) {
    const s = state();
    const html = topBar(s);
    if (top.innerHTML !== html) top.innerHTML = html;
  }
}

const app = { go, render, toast, refresh: render };

// ---------- ショートカットからの呼び出し ----------
function intake() {
  const p = new URLSearchParams(location.search);
  const ev = p.get('ev');
  if (!ev) return null;
  const appName = p.get('app') || '';
  const passText = p.get('pass') || '';
  const now = new Date();
  let next = null;
  update((s) => {
    if (!s.onboarding.done) {
      // 導入中の動作テスト
      if (ev === 'open') {
        s.onboarding.checks[`open_${appName === 'game' ? 'game' : 'youtube'}`] = true;
        // テスト用の通行証があるのに飛んできた＝オートメーションが通行証を読めていない
        if (s.passes.some((x) => x.test && x.start <= now.getTime() && now.getTime() < x.expiry)) s.onboarding.checks.passFail = true;
      }
      if (ev === 'closed') {
        s.onboarding.checks[`closed_${appName === 'game' ? 'game' : 'youtube'}`] = true;
        const r = R.handleClosed(s, appName, passText, now.getTime());
        if (r.kind === 'test') s.onboarding.checks.passFail = false;
      }
      if (ev === 'morning') s.onboarding.checks.morning = true;
      s.notice = { kind: 'test', ev, app: appName, t: now.getTime() };
      next = 'onboard';
      return;
    }
    R.countStars(s, now);
    if (ev === 'open') {
      if (R.isNight(s, now)) {
        const d = R.nightBreach(s, `夜の${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}に「${appName}」が開かれた`, now);
        s.notice = { kind: 'night', defeat: d, t: now.getTime() };
        next = 'back';
        return;
      }
      if (R.activePass(s, now.getTime())) {
        s.notice = { kind: 'passok', t: now.getTime() };
        next = 'back';
        return;
      }
      R.openGate(s, appName, now.getTime());
      next = 'gate';
      return;
    }
    if (ev === 'closed') {
      const r = R.handleClosed(s, appName, passText, now.getTime());
      if (r.kind === 'ignore') {
        next = s.gate && !s.gate.closed && now - s.gate.startedAt < 3 * 60000 ? 'gate' : 'home';
        return;
      }
      if (r.kind === 'unauthorized') {
        const d = R.punishRogue(s, now.getTime());
        s.notice = { kind: 'rogue', defeat: d, t: now.getTime() };
      } else if (r.kind === 'settle') {
        const d = R.settleOver(s, r.pass, r.over, now.getTime());
        s.notice = { kind: 'settle', token: r.pass.token, over: r.over, defeat: d, t: now.getTime() };
      } else if (r.kind === 'ask') {
        s.notice = { kind: 'ask', token: r.pass.token, over: r.over, t: now.getTime() };
      } else {
        s.notice = { kind: r.kind, token: r.pass?.token, t: now.getTime() };
      }
      next = 'back';
      return;
    }
    if (ev === 'morning') next = day(s, dayKey(now)).morningAt ? 'home' : 'morning';
  });
  return next;
}

function start() {
  load();
  const next = intake();
  if (next) {
    history.replaceState(null, '', `${location.pathname}#${next}`);
  } else {
    update((s) => R.countStars(s));
  }
  render();
  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);
  // 別のタブで変わったら読み直す（ショートカットから開くたびにタブが増えるため）
  window.addEventListener('storage', (e) => { if (e.key === 'michi.state') renderIfChanged(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderIfChanged(); });
  setInterval(tick, 1000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

window.__michi = { version: APP_VERSION, esc };
start();
