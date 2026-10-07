// 週1回の見直し日：振り返り・スクリーンタイムとの照合・設定の変更・パスコード・バックアップ
import { update, state, resetAll } from '../store.js';
import * as R from '../rules.js';
import { esc, dayKey, addDays, weekKey, fmtMin, hm } from '../util.js';
import { on, $, toast, ask } from '../ui.js';

export const title = '見直し';

const DAYS = '日月火水木金土';

function weekSummary(s) {
  const wk = weekKey(dayKey());
  let gates = 0; let ret = 0; let used = 0; let focus = 0; let evid = 0;
  for (let i = 0; i < 7; i++) {
    const d = s.days[addDays(wk, i)];
    if (!d) continue;
    gates += d.gates; ret += d.returned; used += d.used + d.overMin; focus += d.focusMin;
    evid += d.tasks.reduce((a, t) => a + t.evidence.length, 0);
  }
  return { gates, ret, used, focus, evid };
}

export function exportJson(s) {
  const blob = new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `michi-backup-${dayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function settingsForm(s, open) {
  const st = s.settings;
  if (!open) {
    return `<div class="win"><h3>今できる変更（厳しくする方向だけ）</h3>
      <p class="small muted">緩める変更は見直し日にだけできる。厳しくする変更はいつでもすぐ反映される。</p>
      <label class="f" for="capw">平日の上限（今 ${st.capWeekday}分）</label><input type="number" id="capw" min="0" max="${st.capWeekday}" value="${st.capWeekday}" inputmode="numeric">
      <label class="f" for="caph">休日の上限（今 ${st.capHoliday}分）</label><input type="number" id="caph" min="0" max="${st.capHoliday}" value="${st.capHoliday}" inputmode="numeric">
      <label class="f" for="addt">ロック対象を追加</label><input type="text" id="addt" maxlength="30" placeholder="新しく入れたゲームの名前">
      <label class="f" for="addh">毎日の習慣を追加</label><input type="text" id="addh" maxlength="40" placeholder="寝る前に明日の服を出す">
      <div class="err" id="serr" hidden></div>
      <button class="btn block" id="strict" style="margin-top:8px">反映する</button></div>`;
  }
  return `<div class="win"><h3>設定</h3>
    <div class="grid2">
      <div><label class="f" for="capw">平日の上限（分）</label><input type="number" id="capw" min="0" max="240" value="${st.capWeekday}" inputmode="numeric"></div>
      <div><label class="f" for="caph">休日の上限（分）</label><input type="number" id="caph" min="0" max="240" value="${st.capHoliday}" inputmode="numeric"></div>
      <div><label class="f" for="bs">就寝ロック開始</label><input type="time" id="bs" value="${st.bedStart}"></div>
      <div><label class="f" for="wk">就寝ロック終了</label><input type="time" id="wk" value="${st.wake}"></div>
    </div>
    <p class="tiny muted">就寝ロックの時刻は、スクリーンタイムの「休止時間」と同じにしてください。</p>
    <div class="grid3">
      <div><label class="f" for="rd">見直し日</label><select id="rd">${[...DAYS].map((d, i) => `<option value="${i}" ${Number(st.reviewDay) === i ? 'selected' : ''}>${d}曜</option>`).join('')}</select></div>
      <div><label class="f" for="rs">開始</label><input type="time" id="rs" value="${st.reviewStart}"></div>
      <div><label class="f" for="re">終了</label><input type="time" id="re" value="${st.reviewEnd}"></div>
    </div>
    <label class="f" for="tg">ロック対象（1行に1つ。オートメーションと合わせる）</label><textarea id="tg">${esc(st.targets.join('\n'))}</textarea>
    <label class="f" for="hb">毎日の習慣（1行に1つ）</label><textarea id="hb">${esc(st.habits.join('\n'))}</textarea>
    <label class="f" for="hd">休みにする日（祝日以外。1行に1つ、2026-12-29 の形）</label><textarea id="hd" placeholder="2026-12-29">${esc(st.holidays.join('\n'))}</textarea>
    <h3 style="margin-top:12px">約束の言葉</h3>
    <label class="f" for="cw">なぜやめたいか</label><textarea id="cw">${esc(s.contract.why)}</textarea>
    <label class="f" for="ci">なりたい自分</label><textarea id="ci">${esc(s.contract.ideal)}</textarea>
    <label class="f" for="ce">逃げたくなったら、こうする</label><input type="text" id="ce" value="${esc(s.contract.escape)}">
    <label class="f" for="ca">不安・疲れた時は、こうする</label><input type="text" id="ca" value="${esc(s.contract.anxious)}">
    <label class="f" for="cn">夜、布団に入ったら、こうする</label><input type="text" id="cn" value="${esc(s.contract.night)}">
    <div class="err" id="serr" hidden></div>
    <button class="btn primary block" id="saveall" style="margin-top:10px">設定を保存</button></div>`;
}

function vaultBox(s, open) {
  const v = s.vault;
  if (v.pending) {
    return `<div class="win gold"><h3>新しいパスコード</h3><div class="passcode">${esc(v.pending)}</div>
      <ol class="steps small">
        <li>設定 → スクリーンタイム →「スクリーンタイム・パスコードを変更」</li>
        <li>今のパスコードを入力し、上の4桁を2回入力する</li>
        <li>入力できたら、下のボタンで封印する（もう表示されない）</li>
      </ol>
      <button class="btn primary block" id="seal">入力した・封印する</button></div>`;
  }
  if (!open) {
    return `<div class="win flat"><h3>パスコード</h3><p class="small">${v.code ? `封印中（${new Date(v.sealedAt).toLocaleDateString('ja-JP')}から）。見直し日にだけ見られる。` : 'まだ封印されていない。導入ガイドで設定する。'}</p></div>`;
  }
  return `<div class="win"><h3>パスコード</h3>
    ${v.revealedAt ? `<div class="passcode">${esc(v.code)}</div><p class="small">使い終わったら、必ず新しいパスコードに作り直す。</p><button class="btn primary block" id="regen">新しいパスコードを作る</button>`
      : v.code ? `<p class="small">新しいアプリを入れる時など、本当に必要な時だけ見る。見たら作り直しになる。</p><button class="btn block" id="reveal">パスコードを見る</button>`
        : '<p class="small">まだ封印されていない。</p><button class="btn block" id="regen">パスコードを作る</button>'}</div>`;
}

export function render(s) {
  const now = new Date();
  const open = R.inReview(s, now);
  const nx = R.nextReview(s, now);
  const w = weekSummary(s);
  const { rec } = R.weekUsage(s, now);
  const chk = s.review.stCheck[weekKey(dayKey())];
  const head = open
    ? `<div class="win gold"><h2>見直しの時間</h2><p class="small">${s.settings.reviewEnd}まで。1週間を振り返って、ルールを整える。</p></div>`
    : `<div class="win flat"><h2>見直し日</h2><p class="small">次の見直し：${nx ? `${nx.getMonth() + 1}/${nx.getDate()}(${DAYS[nx.getDay()]}) ${s.settings.reviewStart}〜${s.settings.reviewEnd}` : '－'}</p>
       <p class="tiny muted">それまで、ルールを緩める変更・パスコードの表示はできない。</p></div>`;
  return `${head}
  <div class="win"><h3>今週</h3><div class="kv">
    <span>衝動（介入画面）</span><span class="v">${w.gates}回</span>
    <span>引き返した</span><span class="v">${w.ret}回${w.gates ? `（${Math.round((w.ret / w.gates) * 100)}%）` : ''}</span>
    <span>娯楽に使った</span><span class="v">${fmtMin(w.used)}</span>
    <span>集中した</span><span class="v">${fmtMin(w.focus)}</span>
    <span>作業の証拠</span><span class="v">${w.evid}件</span>
    <span>借金</span><span class="v">${R.debtTotal(s)}分</span>
  </div></div>

  <div class="win"><h3>スクリーンタイムと照合</h3>
    <p class="small">設定 → スクリーンタイム →「すべてのアクティビティを確認」→「週」で、ロック対象アプリの今週の合計時間を足して入れる。</p>
    <p class="small muted">このアプリの記録：${rec}分</p>
    ${chk ? `<p class="small">前回の照合（${hm(chk.at)}）：スクリーンタイム${chk.st}分・記録${chk.rec}分・差${chk.diff}分 ${chk.diff > 15 ? '<span class="ngmark">記録にない使用あり</span>' : '<span class="okmark">問題なし</span>'}</p>` : ''}
    <label class="f" for="stm">スクリーンタイムでの合計（分）</label><input type="number" id="stm" min="0" inputmode="numeric" placeholder="95">
    <div class="err" id="sterr" hidden>数字を入れてください</div>
    <button class="btn block" id="cross" style="margin-top:6px">照合する</button>
    <p class="tiny muted" style="margin-top:6px">15分を超える差は「記録にない使用」として魔王軍の襲撃になる（週1回まで）。</p>
  </div>

  ${settingsForm(s, open)}
  ${vaultBox(s, open)}

  <div class="win"><h3>正直な申告</h3>
    <p class="small">スクリーンタイムのパスコードをリセットした、休止時間を外したなど、夜のロックを破った時はここで申告する。周回が終わる。</p>
    <button class="btn danger block" id="confess">夜のロックを破った</button></div>

  <div class="win"><h3>バックアップ</h3>
    <p class="small">Safari のデータが消えた時のために、見直し日ごとに書き出しておく。戻せるのは、データが消えて最初からになった時だけ（導入の最初の画面から）。</p>
    <button class="btn block" id="export">バックアップを書き出す</button></div>

  <div class="win flat"><div class="grid2"><a class="btn" href="#guide">導入ガイド</a><a class="btn" href="#about">このアプリ</a></div>
    ${open ? '<button class="btn ghost block" id="reset" style="margin-top:8px">すべて消して最初から</button>' : ''}</div>`;
}

export function bind(root, s, app) {
  const open = R.inReview(s);
  $('#stm', root)?.addEventListener('input', () => { $('#sterr', root).hidden = true; });
  $('#cross', root).addEventListener('click', () => {
    const v = Number($('#stm', root).value);
    if ($('#stm', root).value === '' || !Number.isFinite(v) || v < 0) { $('#sterr', root).hidden = false; return; }
    const r = update((st) => R.crossCheck(st, v));
    if (r.penalty) ask({ title: '記録にない使用', body: `<p>差が${r.diff}分あった。</p><p class="pix" style="color:var(--red)">${esc(r.penalty.text)}</p>`, buttons: [{ label: '受け止める', value: 1 }] }).then(app.render);
    else { toast(r.diff > 15 ? '記録にない使用があった（今週は精算済み）' : '記録と合っている'); app.render(); }
  });
  $('#strict', root)?.addEventListener('click', () => {
    const err = $('#serr', root);
    const cw = Number($('#capw', root).value);
    const ch = Number($('#caph', root).value);
    const st0 = state().settings;
    if (!(cw >= 0 && cw <= st0.capWeekday && ch >= 0 && ch <= st0.capHoliday)) {
      err.textContent = '上限は下げることしかできません';
      err.hidden = false;
      return;
    }
    update((st) => {
      st.settings.capWeekday = Math.floor(cw);
      st.settings.capHoliday = Math.floor(ch);
      const t = $('#addt', root).value.trim();
      const h = $('#addh', root).value.trim();
      if (t && !st.settings.targets.includes(t)) st.settings.targets.push(t);
      if (h && !st.settings.habits.includes(h)) st.settings.habits.push(h);
    });
    toast('反映しました');
    app.render();
  });
  $('#saveall', root)?.addEventListener('click', () => {
    if (!R.inReview(state())) { toast('見直しの時間が終わりました'); app.render(); return; }
    const err = $('#serr', root);
    const lines = (id) => $(id, root).value.split('\n').map((x) => x.trim()).filter(Boolean);
    const hd = lines('#hd');
    if (hd.some((x) => !/^\d{4}-\d{2}-\d{2}$/.test(x))) { err.textContent = '休みにする日は 2026-12-29 の形で書いてください'; err.hidden = false; return; }
    const targets = lines('#tg');
    if (!targets.length) { err.textContent = 'ロック対象を1つ以上書いてください'; err.hidden = false; return; }
    update((st) => {
      Object.assign(st.settings, {
        capWeekday: Math.max(0, Math.floor(Number($('#capw', root).value) || 0)),
        capHoliday: Math.max(0, Math.floor(Number($('#caph', root).value) || 0)),
        bedStart: $('#bs', root).value || st.settings.bedStart,
        wake: $('#wk', root).value || st.settings.wake,
        reviewDay: Number($('#rd', root).value),
        reviewStart: $('#rs', root).value || st.settings.reviewStart,
        reviewEnd: $('#re', root).value || st.settings.reviewEnd,
        targets,
        habits: lines('#hb'),
        holidays: hd,
      });
      Object.assign(st.contract, {
        why: $('#cw', root).value.trim(), ideal: $('#ci', root).value.trim(),
        escape: $('#ce', root).value.trim(), anxious: $('#ca', root).value.trim(), night: $('#cn', root).value.trim(),
      });
    });
    toast('保存しました');
    app.render();
  });
  $('#reveal', root)?.addEventListener('click', async () => {
    const ok = await ask({ title: 'パスコードを見る', body: '<p>見たら、使い終わった後に必ず新しいパスコードへ作り直す。本当に必要？</p>', buttons: [{ label: '必要なので見る', value: true, cls: 'danger' }, { label: 'やめる', value: false, cls: 'ghost' }] });
    if (!ok) return;
    update((st) => R.revealPasscode(st));
    app.render();
  });
  $('#regen', root)?.addEventListener('click', () => {
    update((st) => R.newPasscode(st));
    app.render();
  });
  $('#seal', root)?.addEventListener('click', () => {
    update((st) => R.sealPasscode(st));
    toast('封印しました');
    app.render();
  });
  $('#confess', root).addEventListener('click', async () => {
    const ok = await ask({ title: '夜のロックを破った', body: '<p>周回が終わり、装備と材料をすべて失う。レベル・レシピ・星・クリアした章は残る。</p>', buttons: [{ label: '申告する', value: true, cls: 'danger' }, { label: 'やめる', value: false, cls: 'ghost' }] });
    if (!ok) return;
    const d = update((st) => R.nightBreach(st, '夜のロックを破ったと申告した'));
    await ask({ title: '周回が終わった', body: `<p class="pix">${esc(d ? d.text : 'この夜はすでに精算済み')}</p><p class="small">正直に申告できたことは、記録に残る。ここからまた始めよう。</p>`, buttons: [{ label: '拠点へ', value: 1 }] });
    app.go('home');
  });
  $('#export', root).addEventListener('click', () => exportJson(state()));
  $('#reset', root)?.addEventListener('click', async () => {
    if (!open) return;
    const ok = await ask({ title: 'すべて消す', body: '<p>記録・育成・設定がすべて消える。戻せない。</p>', buttons: [{ label: 'すべて消す', value: true, cls: 'danger' }, { label: 'やめる', value: false, cls: 'ghost' }] });
    if (!ok) return;
    resetAll();
    app.go('onboard');
  });
}

export function tick(root, s, app) {
  // 見直しの時間が始まった・終わった時に描き直す
  const open = R.inReview(s);
  if (open !== !!root.querySelector('#saveall') && !root.querySelector('#seal')) app.render();
}

