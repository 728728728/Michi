// 拠点（ホーム）
import { update, day } from '../store.js';
import * as R from '../rules.js';
import * as G from '../game.js';
import { sceneSvg } from '../sprites.js';
import { esc, nf, hm, fmtClock, dayKey } from '../util.js';
import { bar, on, $, toast } from '../ui.js';

export const title = '拠点';

function monsterRows(s, d) {
  if (!d.tasks.length) {
    return `<p class="muted">今日のモンスターはまだいない。<a href="#morning">朝の3つを決める</a>と現れる。</p>`;
  }
  return d.tasks.map((t) => {
    const fam = G.FAMILY[G.AREAS[t.area]?.family || 'slime'].name;
    const ratio = t.done ? 0 : Math.max(0, (t.hp - t.dmg) / t.hp);
    return `<div style="margin-bottom:10px">
      <div class="row between"><span class="pix">${esc(fam)}「${esc(t.title)}」</span>
      <span class="pix small ${t.done ? 'muted' : ''}">${t.done ? '撃破' : ratio === 0 ? '瀕死' : `${Math.round(ratio * 100)}%`}</span></div>
      ${bar(ratio)}
      ${t.done ? '' : `<div class="row between" style="margin-top:4px"><span class="tiny muted">最初の2分：${esc(t.first)}</span>
        <button class="btn small" data-kill="${t.id}">とどめ</button></div>`}
    </div>`;
  }).join('');
}

function equipRows(g) {
  return G.SLOTS.map(([slot, label]) => {
    const inst = G.itemByUid(g, g.equip[slot]);
    const d = inst ? G.ITEMS[inst.id] : null;
    return `<div class="equip-row"><span class="slot">${label}</span>
      <span class="item-name">${inst ? esc(G.itemLabel(inst)) : '<span class="muted">－</span>'}</span>
      <span>${d ? d.tags.map((t) => `<span class="tag">${t}</span>`).join('') : ''}</span></div>`;
  }).join('');
}

export function render(s) {
  const now = new Date();
  const g = s.game;
  const d = day(s, dayKey(now));
  const ch = G.CHAPTERS[g.chapter - 1];
  const lv = G.levelOf(g);
  const lvFrom = G.minForLevel(lv);
  const lvTo = G.minForLevel(lv + 1);
  const bal = R.balance(s);
  const rate = R.rateOf(s);
  const cap = R.capOf(s);
  const debt = R.debtTotal(s);
  const next = R.nextTask(s, now);
  const syn = G.synergies(g);
  const forgeLeft = s.forgeUntil - Date.now();
  const monsters = d.tasks.map((t) => ({ family: G.AREAS[t.area]?.family || 'slime', alive: !t.done }));

  const victory = g.victory ? `<div class="win gold center"><h2>魔王「無限の画面」を倒した</h2>
    <p>スマホに支配されない自分に、たどり着いた。この旅の記録は「記録」にずっと残る。</p></div>` : '';

  const focusBanner = s.focus ? `<a class="win green banner" href="#focus"><div class="row between"><span class="pix">⚔ 集中中</span><span class="pix" data-focus-left></span></div></a>` : '';

  return `${victory}${focusBanner}
  ${sceneSvg({ g, chapter: ch, monsters, bossRatio: g.bossHp / ch.hp, stars: g.stars })}
  <div class="win" style="margin-top:12px">
    <div class="row between"><h2 style="margin:0">第${ch.n}章 ${esc(ch.place)}</h2><span class="pix small muted">周回${g.run}</span></div>
    <div class="row between small" style="margin-top:6px"><span class="pix">勇者 Lv.${lv}</span><span class="muted">星 ${g.stars}</span></div>
    ${bar((g.totalFocusMin - lvFrom) / Math.max(1, lvTo - lvFrom), 'exp')}
    <div class="tiny muted">次のLvまで 集中あと${Math.max(0, lvTo - g.totalFocusMin)}分</div>
  </div>

  <div class="win ${bal ? '' : 'flat'}">
    <div class="row between"><h3 style="margin:0">今日の持ち時間</h3><span class="pix" style="font-size:24px;color:var(--gold)">${bal}分</span></div>
    <div class="small muted">集中${d.focusMin}分 → レート ${rate}:1（上限${cap}分）・使用${d.used}分${debt ? `・借金${debt}分` : ''}</div>
    ${d.confiscated ? '<div class="small" style="color:var(--red)">今日はショートを見たので没収されている</div>' : ''}
    ${!d.morningAt ? '<a class="btn primary block" href="#morning" style="margin-top:10px">朝の3つを決める</a>' : ''}
  </div>

  ${next && !s.focus ? `<div class="win gold">
    <h3>今やる1つ</h3>
    <p class="pix" style="font-size:18px;margin-bottom:4px">${esc(next.title)}</p>
    <p class="small muted">最初の2分：${esc(next.first)}</p>
    <div class="grid2"><button class="btn primary" data-start="2">2分だけやる</button><button class="btn" data-start="25">25分集中</button></div>
  </div>` : ''}

  <div class="win"><h3>今日のモンスター</h3>${monsterRows(s, d)}</div>

  <div class="win">
    <div class="row between"><h3 style="margin:0">ボス ${esc(ch.boss)}</h3></div>
    <div class="row between small"><span class="muted">HP</span><span class="pix">${nf(g.bossHp)} / ${nf(ch.hp)}</span></div>
    ${bar(g.bossHp / ch.hp, 'boss')}
    <p class="small muted" style="margin-top:6px">${esc(ch.hint)}</p>
  </div>

  <div class="win">
    <div class="row between"><h3 style="margin:0">装備</h3>
      <a class="btn small ${forgeLeft > 0 ? 'primary' : 'ghost'}" href="#forge">${forgeLeft > 0 ? `鍛冶屋 <span data-forge-left>${fmtClock(forgeLeft)}</span>` : '鍛冶屋（見るだけ）'}</a></div>
    ${equipRows(g)}
    ${syn.length ? `<div class="small" style="margin-top:8px;color:var(--green)">${syn.map((x) => `◆ ${esc(x)}`).join('<br>')}</div>` : '<p class="tiny muted" style="margin-top:6px">タグを組み合わせるとシナジーが発動する</p>'}
  </div>

  <div class="win"><h3>旅の記録</h3>
    <ul class="list log">${g.log.slice(0, 6).map((l) => `<li class="k-${l.kind}"><span class="t">${hm(l.t)}</span>${esc(l.text)}</li>`).join('') || '<li class="muted">まだ何も起きていない</li>'}</ul>
  </div>`;
}

export function bind(root, s, app) {
  on(root, '[data-start]', 'click', (e, el) => {
    const next = R.nextTask(s);
    const m = Number(el.dataset.start);
    update((st) => R.startFocus(st, { taskId: next?.id || null, minutes: m, kind: m === 2 ? 'two' : 'normal' }));
    app.go('focus');
  });
  on(root, '[data-kill]', 'click', (e, el) => killDialog(el.dataset.kill, app));
}

// とどめ：現実で完了したことを1行書く
export function killDialog(taskId, app) {
  const m = $('#modal');
  m.innerHTML = `<div class="win gold" role="dialog" aria-modal="true" aria-labelledby="kt">
    <h2 id="kt">とどめを刺す</h2>
    <p class="small">本当に終わった？ 何をやったかを1行で書くと、とどめが刺さる。</p>
    <label class="f" for="ev">何を進めた？</label>
    <input type="text" id="ev" maxlength="120" placeholder="ES 1社目を最後まで書いて保存した">
    <div class="err" id="everr" hidden>1行書いてから押してください</div>
    <div class="btns"><button class="btn primary block" id="ok">完了した</button><button class="btn ghost block" id="no">まだ</button></div></div>`;
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  $('#ev', m).addEventListener('input', () => { $('#everr', m).hidden = true; });
  $('#no', m).addEventListener('click', close);
  $('#ok', m).addEventListener('click', () => {
    const text = $('#ev', m).value.trim();
    if (!text) { $('#everr', m).hidden = false; return; }
    const r = update((st) => R.finishTask(st, taskId, text));
    close();
    if (r) toast(`撃破！ ${G.MATS[r.kill.mat]}+${r.kill.n}${r.unlocked.length ? `・新レシピ${r.unlocked.length}` : ''}`);
    app.render();
  });
  $('#ev', m).focus();
}

export function tick(root, s, app) {
  const f = root.querySelector('[data-forge-left]');
  if (f) {
    const left = s.forgeUntil - Date.now();
    if (left <= 0) app.render();
    else f.textContent = fmtClock(left);
  }
  const fl = root.querySelector('[data-focus-left]');
  if (fl && s.focus) fl.textContent = fmtClock(s.focus.start + s.focus.planned * 60000 - Date.now());
}
