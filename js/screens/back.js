// アプリを閉じた後：おかえり・超過の精算・ショートの自己申告・夜破り・無断通行
import { update, day } from '../store.js';
import * as R from '../rules.js';
import { esc, fmtClock } from '../util.js';
import { on } from '../ui.js';

export const title = 'おかえり';
export const nav = false;

const findPass = (s, token) => s.passes.find((p) => p.token === token) || null;

function defeatBox(d) {
  if (!d) return '';
  const cls = d.blocked ? 'green' : 'red';
  const head = d.kind === 'run' ? '周回が終わった' : d.blocked ? '盾が防いだ' : '魔王軍の襲撃';
  return `<div class="win ${cls}"><h2>${head}</h2><p class="pix">${esc(d.text)}</p>
    ${d.kind === 'run' ? `<p class="small">勇者のレベル（Lv.${d.kept.level}）、レシピ帳、星空（${d.kept.stars}）、クリアした章は残っている。ここからまた立ち上がれる。</p>` : ''}</div>`;
}

function nextBox(s) {
  const t = R.nextTask(s);
  if (!t && !day(s).tasks.length) return '<div class="win"><p class="small">今日の「朝の3つ」がまだ決まっていない。</p><a class="btn primary block" href="#morning">朝の3つを決める</a></div>';
  if (!t) return `<div class="win"><p class="small">今日のやることは片付いている。<a href="#morning">朝の3つを見直す</a></p></div>`;
  return `<div class="win gold"><h3>おかえり。次はこれ</h3>
    <p class="pix" style="font-size:18px;margin-bottom:4px">${esc(t.title)}</p>
    <p class="small muted">最初の2分：${esc(t.first)}</p>
    <button class="btn primary block" data-two>2分だけやる</button></div>`;
}

function shortsBox(p) {
  if (!p || p.shortsAsked || p.test) return '';
  return `<div class="win"><h3>正直に</h3><p>ショート動画を見た？</p>
    <div class="grid2"><button class="btn" data-shorts="0">見ていない</button><button class="btn danger" data-shorts="1">見た</button></div>
    <p class="tiny muted" style="margin-top:6px">見たら、今日の残りの持ち時間は没収、いちばん強い装備が奪われる。</p></div>`;
}

export function render(s) {
  const n = s.notice;
  if (!n) return `<div class="win"><p>おかえり。</p><a class="btn block" href="#home">拠点へ</a></div>`;
  const p = n.token ? findPass(s, n.token) : null;
  if (n.kind === 'night') {
    return `${defeatBox(n.defeat)}
      <div class="win"><h3>夜のロックが効いていない</h3>
      <p class="small">就寝ロックの時間に対象アプリが開かれた。スクリーンタイムの休止時間が外れているか、パスコードがリセットされている。</p>
      <p class="small">見直し日に「導入ガイド」のスクリーンタイムの手順をやり直そう。今は画面を閉じて、眠ろう。</p></div>
      <a class="btn block" href="#home">拠点へ</a>`;
  }
  if (n.kind === 'rogue') {
    return `${defeatBox(n.defeat)}<div class="win"><p class="small">介入画面を通らずに作られた通行証が見つかった。ショートカットを手で実行した記録として残る。</p></div>${nextBox(s)}<a class="btn ghost block" href="#home">拠点へ</a>`;
  }
  if (n.kind === 'passok') {
    const ap = R.activePass(s);
    return `<div class="win"><h2>通行証は有効</h2><p>あと <span class="pix" data-left>${ap ? fmtClock(ap.expiry - Date.now()) : '0:00'}</span>。アプリを開き直せば通れる。</p>
      <p class="small muted">それでもこの画面が出る時は、オートメーションが通行証ファイルを読めていない。「導入ガイド」を確認。</p></div><a class="btn block" href="#home">拠点へ</a>`;
  }
  if (n.kind === 'ask') {
    if (p && !p.settled) {
      return `<div class="win"><h2>どれくらい超えた？</h2>
        <p class="small">通行証の期限から${n.over}分たってから閉じられた。画面を消して置いていただけかもしれないので、正直に選んでください。</p>
        <div class="btns">
          <button class="btn" data-over="0">超えていない</button>
          <button class="btn" data-over="3">5分未満</button>
          <button class="btn" data-over="10">5〜15分</button>
          <button class="btn danger" data-over="${n.over}">それ以上（${n.over}分として扱う）</button>
        </div></div>`;
    }
  }
  const over = p?.overMin || n.over || 0;
  const d = n.defeat || (p && p.lastDefeat) || null;
  const head = over > 0
    ? `<div class="win red"><h2>${over}分超えた</h2><p class="small">超えた${over}分は、明日以降の持ち時間から差し引かれる。</p></div>`
    : n.kind === 'inpass' && p
      ? `<div class="win"><h2>おかえり</h2><p class="small">通行証はあと <span class="pix" data-left>${fmtClock(p.expiry - Date.now())}</span>。戻らなくていい。</p></div>`
      : `<div class="win green"><h2>おかえり</h2><p class="small">時間内に戻ってきた。</p></div>`;
  return `${head}${defeatBox(d)}${shortsBox(p)}${p && !p.shortsAsked ? '' : nextBox(s)}<a class="btn ghost block" href="#home">拠点へ</a>`;
}

export function bind(root, s, app) {
  const n = s.notice;
  on(root, '[data-shorts]', 'click', (e, el) => {
    update((st) => {
      const p = findPass(st, n.token);
      const d = R.reportShorts(st, p, el.dataset.shorts === '1');
      if (d) st.notice.defeat = d;
    });
    app.render();
  });
  on(root, '[data-over]', 'click', (e, el) => {
    update((st) => {
      const p = findPass(st, n.token);
      const d = R.settleOver(st, p, Number(el.dataset.over));
      st.notice = { ...st.notice, kind: 'settle', over: Number(el.dataset.over), defeat: d };
    });
    app.render();
  });
  on(root, '[data-two]', 'click', () => {
    update((st) => {
      const t = R.nextTask(st);
      R.startFocus(st, { taskId: t?.id || null, minutes: 2, kind: 'two' });
    });
    app.go('focus');
  });
}

export function tick(root, s) {
  const el = root.querySelector('[data-left]');
  if (!el || !s.notice) return;
  const p = s.notice.token ? findPass(s, s.notice.token) : R.activePass(s);
  if (p) el.textContent = fmtClock(p.expiry - Date.now());
}
