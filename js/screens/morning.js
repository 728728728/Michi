// 朝の3つ＋毎日の習慣
import { update, day } from '../store.js';
import * as R from '../rules.js';
import * as G from '../game.js';
import { esc, dayKey, mdw } from '../util.js';
import { on, $, $$, toast } from '../ui.js';

export const title = '朝の3つ';

function row(i, t) {
  const area = t?.area || 'shukatsu';
  return `<div class="win flat" data-row="${i}" ${t?.id ? `data-id="${t.id}"` : ''}>
    <div class="row between"><span class="pix">${i + 1}つ目</span>${t?.done ? '<span class="okmark small">撃破済み</span>' : ''}</div>
    <label class="f" for="t${i}">やること</label>
    <input type="text" id="t${i}" maxlength="60" value="${esc(t?.title || '')}" placeholder="${['ES 1社目を仕上げる', 'SPI 非言語を20問', '部屋の床を片付ける'][i]}" ${t?.done ? 'disabled' : ''}>
    <label class="f" for="a${i}">領域</label>
    <select id="a${i}" ${t?.done ? 'disabled' : ''}>${Object.entries(G.AREAS).map(([k, a]) => `<option value="${k}" ${k === area ? 'selected' : ''}>${a.name}（${G.FAMILY[a.family].name}）</option>`).join('')}</select>
    <label class="f" for="f${i}">最初の2分でやること</label>
    <input type="text" id="f${i}" maxlength="60" value="${esc(t?.first || '')}" placeholder="${['ファイルを開いて1行目を読む', '問題集を開いて1問目を読む', '床の物を3つ拾う'][i]}" ${t?.done ? 'disabled' : ''}>
  </div>`;
}

export function render(s) {
  const key = dayKey();
  const d = day(s, key);
  const carry = R.carryOver(s);
  const habits = s.settings.habits || [];
  return `<div class="win gold"><h2>${mdw(key)} 朝の3つ</h2>
    <p class="small">今日やることを3つまで。それぞれ「最初の2分」を必ず決める。決めたものが今日のモンスターになる。</p>
    ${d.morningAt ? '' : '<p class="small muted">決めるまで、持ち時間は使えない。</p>'}
  </div>
  ${carry.length ? `<div class="win"><h3>昨日までの残り</h3><div class="row wrap">${carry.map((c, i) => `<button class="btn small" data-carry="${i}">${esc(c.title)}</button>`).join('')}</div>
    <p class="tiny muted" style="margin-top:6px">押すと空いている欄に入る。</p></div>` : ''}
  ${[0, 1, 2].map((i) => row(i, d.tasks[i])).join('')}
  <div class="err" id="merr" hidden></div>
  <button class="btn primary block" id="save">${d.morningAt ? '更新する' : 'この3つで始める'}</button>
  <div class="win" style="margin-top:12px"><h3>毎日の習慣</h3>
    ${habits.length ? habits.map((h, i) => `<label class="check"><input type="checkbox" data-habit="${i}" ${d.habits[h] ? 'checked' : ''}><span>${esc(h)}</span></label>`).join('') : '<p class="small muted">習慣は見直し日に追加できる。</p>'}
  </div>`;
}

export function bind(root, s, app) {
  const carry = R.carryOver(s);
  on(root, '[data-carry]', 'click', (e, el) => {
    const c = carry[Number(el.dataset.carry)];
    for (let i = 0; i < 3; i++) {
      const t = $(`#t${i}`, root);
      if (!t.disabled && !t.value.trim()) {
        t.value = c.title;
        $(`#a${i}`, root).value = c.area;
        $(`#f${i}`, root).value = c.first;
        el.remove();
        return;
      }
    }
    toast('空いている欄がありません');
  });
  on(root, '[data-habit]', 'change', (e, el) => {
    const h = s.settings.habits[Number(el.dataset.habit)];
    update((st) => { day(st, dayKey()).habits[h] = el.checked; });
  });
  $('#save', root).addEventListener('click', () => {
    const err = $('#merr', root);
    const list = [];
    for (const r of $$('[data-row]', root)) {
      const i = r.dataset.row;
      const title = $(`#t${i}`, root).value.trim();
      const first = $(`#f${i}`, root).value.trim();
      if (!title && !first) continue;
      if (!title || !first) {
        err.textContent = `${Number(i) + 1}つ目：やることと「最初の2分」の両方を書いてください`;
        err.hidden = false;
        return;
      }
      list.push({ id: r.dataset.id || null, title, first, area: $(`#a${i}`, root).value });
    }
    if (!list.length) {
      err.textContent = '少なくとも1つ決めてください';
      err.hidden = false;
      return;
    }
    update((st) => R.setMorning(st, list));
    toast('今日のモンスターが現れた');
    app.go('home');
  });
}
