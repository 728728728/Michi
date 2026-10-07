// 画面の共通部品
import { esc } from './util.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer = null;
export function toast(text, ms = 2600) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

// 確認ダイアログ。buttons: [{label, value, cls}]
export function ask({ title, body = '', buttons }) {
  return new Promise((resolve) => {
    const m = $('#modal');
    m.innerHTML = `<div class="win gold" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">${esc(title)}</h2><div>${body}</div>
      <div class="btns">${buttons.map((b, i) => `<button class="btn block ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    m.hidden = false;
    $$('button[data-i]', m).forEach((btn) => btn.addEventListener('click', () => {
      m.hidden = true;
      m.innerHTML = '';
      resolve(buttons[Number(btn.dataset.i)].value);
    }));
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('コピーしました');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('コピーしました'); } catch { toast('コピーできませんでした。長押しで選んでください'); }
    ta.remove();
  }
}

export const bar = (ratio, cls = '') =>
  `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, ratio * 100)).toFixed(1)}%"></i></div>`;

export const on = (root, sel, ev, fn) => $$(sel, root).forEach((el) => el.addEventListener(ev, (e) => fn(e, el)));
