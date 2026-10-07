// 介入画面：対象アプリを開いた瞬間に出る
import { update, day } from '../store.js';
import * as R from '../rules.js';
import { esc, dayKey, addDays, weekKey } from '../util.js';
import { on, $, toast } from '../ui.js';

export const title = '待って';
export const nav = false;

const WAVE_MS = 60 * 1000;

const FACTS = [
  '衝動は波。上がって、何もしなければ数分で引いていく。',
  '開きたくなるのは、脳が「いつもの報酬」を予測したから。報酬が来ないと、予測は少しずつ弱まる。',
  '最初の2週間、衝動が一時的に強くなることがある。効いているサイン。',
  '夜の脳は自分を止める力がいちばん弱い。だから夜は仕組みに任せる。',
  '同じきっかけに別の行動をつなぐほど、新しい回路が太くなる。',
];

const MOODS = [
  ['escape', '逃げたい'],
  ['anxious', '不安'],
  ['tired', '疲れた'],
  ['bored', '退屈・なんとなく'],
];

function weekReturns(s) {
  const wk = weekKey(dayKey());
  let n = 0;
  for (let i = 0; i < 7; i++) n += s.days[addDays(wk, i)]?.returned || 0;
  return n;
}

function moodSay(mood, s, next) {
  const task = next ? `次は『${esc(next.title)}』。最初の2分は「${esc(next.first)}」だけ。` : '次にやることを1つ決めよう。';
  const ifthen = { escape: s.contract.escape, anxious: s.contract.anxious, tired: s.contract.anxious, bored: s.contract.escape }[mood];
  const base = {
    escape: `逃げたくなるのは、次の一歩が大きすぎるから。${task}`,
    bored: `「なんとなく」は脳の自動運転。ハンドルを握り直そう。${task}`,
    anxious: '不安なのは本当。でも動画は不安を消さない、遠ざけるだけ。まず、頭の中を1行だけ外に出そう。',
    tired: '疲れているなら、必要なのは刺激じゃなくて休息。画面を見るほど脳は休めない。',
  }[mood];
  return `${base}${ifthen ? `<div class="small muted" style="margin-top:8px">自分で決めた約束：${esc(ifthen)}</div>` : ''}`;
}

function passBox(s) {
  const block = R.passBlock(s);
  if (block) return `<p class="small muted center" style="margin-top:14px">${esc(block)}。今は開かない。</p>`;
  const max = R.maxPassMin(s);
  const opts = [5, 10, 15, 20, 30].filter((m) => m < max);
  opts.push(max);
  return `<details class="win flat" style="margin-top:14px;text-align:left">
    <summary class="small muted" style="cursor:pointer;min-height:32px">持ち時間を使って開く（残り${R.balance(s)}分）</summary>
    <label class="f" for="decl">何を見る？（1行）</label>
    <input type="text" id="decl" maxlength="80" placeholder="ゲームのデイリーだけ">
    <label class="f" for="pmin">何分？</label>
    <select id="pmin">${[...new Set(opts)].map((m) => `<option value="${m}">${m}分</option>`).join('')}</select>
    <p class="tiny muted" style="margin-top:8px">ショートを見たら、今日の残りの持ち時間は没収、いちばん強い装備も奪われる。時間を超えた分は明日の持ち時間から引かれる。</p>
    <div class="err" id="perr" hidden></div>
    <button class="btn block" id="issue" style="margin-top:6px">通行証を出す</button>
  </details>`;
}

export function render(s) {
  const g = s.gate;
  if (s.focus) {
    return `<div class="gate"><div class="win green"><h2>集中中だ</h2>
      <p>今は戦っている最中。持ち時間があっても通さない。</p>
      <div class="btns"><a class="btn primary block" href="#focus">集中に戻る</a></div></div></div>`;
  }
  if (!g) {
    return `<div class="win"><h2>介入画面</h2><p class="muted">対象アプリを開いた時に、ここに飛んでくる。</p><a class="btn block" href="#home">拠点へ</a></div>`;
  }
  const d = day(s, dayKey());
  if (g.closed) {
    const label = { return: '引き返した', vent: '気持ちを外に出した', start: '2分着手を選んだ', rest: '回復を選んだ', passed: '通行証を出した' }[g.outcome] || '';
    if (g.outcome === 'passed') {
      return `<div class="gate"><div class="win"><h2>通行証を出した</h2>
        <p class="small">ショートカットが開いたら、そのまま実行してください。保存されたら、アプリを開き直せば通れます。</p>
        <p class="small muted">戻ってきた時に「おかえり」画面が出ます。</p>
        <a class="btn block" href="#home">拠点へ</a></div></div>`;
    }
    return `<div class="gate"><div class="win green"><h2>迎撃成功</h2>
      <p class="pix">${esc(label)}。魔王軍は引いていった。</p>
      ${g.shard ? '<p class="pix" style="color:var(--gold)">魔の欠片 +1</p>' : ''}
      <p class="small muted">今週ここで引き返したのは ${weekReturns(s)}回。</p>
      ${g.outcome === 'rest' ? '<p>このまま画面を閉じて、休もう。</p>' : ''}
      <div class="btns"><a class="btn block" href="#home">拠点へ</a></div></div></div>`;
  }
  const left = WAVE_MS - (Date.now() - g.startedAt);
  if (left > 0) {
    const fact = FACTS[(d.gates + g.startedAt) % FACTS.length];
    return `<div class="gate">
      <p class="pix muted">今日${d.gates}回目の衝動</p>
      <div class="wave"><div class="ring"></div><div class="ring r2"></div><div class="say">吸って…吐いて</div></div>
      <div class="count" data-count>${Math.ceil(left / 1000)}</div>
      <p class="small muted">波が引くまで待つ。この60秒は飛ばせない。</p>
      ${s.contract.why ? `<div class="win flat" style="text-align:left"><div class="tiny muted">自分で書いた「なぜやめたいか」</div><div>${esc(s.contract.why)}</div></div>` : ''}
      <p class="small">${esc(fact)}</p>
      <p class="tiny muted">今週ここで引き返したのは ${weekReturns(s)}回</p>
    </div>`;
  }
  if (!g.mood) {
    return `<div class="gate"><h2>今の状態は？</h2><p class="small muted">いちばん近いものを1つ。</p>
      <div class="moods">${MOODS.map(([k, l]) => `<button class="btn" data-mood="${k}">${l}</button>`).join('')}</div></div>`;
  }
  const next = R.nextTask(s);
  const soft = g.mood === 'anxious' || g.mood === 'tired';
  const vent = g.venting ? `<div class="win flat" style="text-align:left">
      <label class="f" for="vent">今の気持ちを1行</label>
      <textarea id="vent" maxlength="300" placeholder="ESが進まなくて、自分には無理な気がしている"></textarea>
      <div class="err" id="verr" hidden>1文字でも書いてから押してください</div>
      <button class="btn ok block" id="ventok" style="margin-top:6px">書いた</button></div>` : '';
  const actions = soft
    ? `<button class="btn primary block" data-act="vent">気持ちを1行書く</button>
       <button class="btn ok block" data-act="rest">回復する（水・横になる・外の空気）</button>
       <button class="btn block" data-act="start">それでも2分だけやる</button>`
    : `<button class="btn primary block" data-act="start">2分だけやる</button>
       <button class="btn block" data-act="vent">気持ちを1行書く</button>`;
  return `<div class="gate">
    <div class="win gold"><div class="say-box">${moodSay(g.mood, s, next)}</div></div>
    ${vent}
    <div class="btns">${g.venting ? '' : actions}<button class="btn ghost block" data-act="return">引き返す</button></div>
    ${passBox(s)}
  </div>`;
}

export function bind(root, s, app) {
  on(root, '[data-mood]', 'click', (e, el) => {
    update((st) => { if (st.gate) st.gate.mood = el.dataset.mood; });
    app.render();
  });
  const finish = (how) => {
    const r = update((st) => R.intercept(st, how));
    update((st) => { if (st.gate) st.gate.shard = r.shard; });
  };
  on(root, '[data-act]', 'click', (e, el) => {
    const act = el.dataset.act;
    if (act === 'vent') {
      update((st) => { st.gate.venting = true; });
      app.render();
      $('#vent')?.focus();
      return;
    }
    if (act === 'start') {
      finish('start');
      update((st) => {
        const next = R.nextTask(st);
        R.startFocus(st, { taskId: next?.id || null, minutes: 2, kind: 'two' });
      });
      app.go('focus');
      return;
    }
    finish(act);
    app.render();
  });
  $('#vent', root)?.addEventListener('input', () => { $('#verr', root).hidden = true; });
  $('#ventok', root)?.addEventListener('click', () => {
    const text = $('#vent', root).value.trim();
    if (!text) { $('#verr', root).hidden = false; return; }
    update((st) => {
      st.vents.push({ t: Date.now(), mood: st.gate?.mood, text });
      if (st.vents.length > 1000) st.vents.shift();
      if (st.gate) st.gate.venting = false;
    });
    finish('vent');
    app.render();
  });
  $('#issue', root)?.addEventListener('click', () => {
    const decl = $('#decl', root).value.trim();
    const min = Number($('#pmin', root).value);
    const err = $('#perr', root);
    if (!decl) { err.textContent = '何を見るかを1行書いてください'; err.hidden = false; return; }
    const block = R.passBlock(s);
    if (block) { err.textContent = block; err.hidden = false; return; }
    const r = update((st) => {
      const out = R.issuePass(st, { app: st.gate?.app || '', minutes: Math.min(min, R.maxPassMin(st)), declare: decl });
      if (st.gate) st.gate.closed = true;
      return out;
    });
    toast(`${r.pass.minutes}分の通行証を出しました`);
    app.render();
    location.href = r.url;
  });
}

export function tick(root, s, app) {
  const c = root.querySelector('[data-count]');
  if (!c || !s.gate) return;
  const left = WAVE_MS - (Date.now() - s.gate.startedAt);
  if (left <= 0) app.render();
  else c.textContent = String(Math.ceil(left / 1000));
}

