// 集中タイマーと戦闘結果
import { update, day } from '../store.js';
import * as R from '../rules.js';
import * as G from '../game.js';
import { esc, fmtClock, nf, dayKey, MIN } from '../util.js';
import { on, $, toast } from '../ui.js';
import { heroSvg, spriteSvg } from '../sprites.js';

export const title = '集中';

const remain = (f) => f.start + f.planned * MIN - Date.now();

function chooser(s) {
  const d = day(s, dayKey());
  const tasks = d.tasks.filter((t) => !t.done);
  const opts = tasks.map((t, i) => `<label class="check"><input type="radio" name="task" value="${t.id}" ${i === 0 ? 'checked' : ''}>
      <span><span class="pix">${esc(t.title)}</span><br><span class="tiny muted">最初の2分：${esc(t.first)}</span></span></label>`).join('');
  return `<div class="win"><h2>集中する</h2>
    <p class="small muted">集中している間、勇者が裏で自動的に戦う。画面は見なくていい。終わったら戦果を受け取る。</p>
    ${opts || '<p class="small">今日のやることがない。<a href="#morning">朝の3つを決める</a>か、このままボスに直接挑む。</p>'}
    <label class="check"><input type="radio" name="task" value="" ${opts ? '' : 'checked'}><span>やることを決めずに、ボスに直接挑む</span></label>
    <label class="f">時間</label>
    <div class="grid3">${[2, 15, 25, 50, 90].map((m) => `<button class="btn ${m === 25 ? 'primary' : ''}" data-min="${m}">${m}分</button>`).join('')}</div>
    <p class="tiny muted" style="margin-top:8px">今のレート：作業${R.rateOf(s)}分 → 持ち時間1分（今日の上限${R.capOf(s)}分）</p>
  </div>`;
}

function running(s) {
  const f = s.focus;
  const t = R.findTask(s, f.taskId)?.task;
  const left = remain(f);
  const done = left <= 0;
  return `<div class="win ${done ? 'gold' : 'green'}">
    <div class="row between"><span class="pix">${t ? esc(t.title) : 'ボスに直接挑む'}</span><span class="pix small muted">${f.planned}分</span></div>
    ${t ? `<p class="small muted" style="margin:4px 0 0">最初の2分：${esc(t.first)}</p>` : ''}
    <div class="timer" data-timer>${done ? '00:00' : fmtClock(left)}</div>
    <div class="center">${heroSvg(s.game, 56)} <span class="pix muted">⚔</span> ${spriteSvg(G.CHAPTERS[s.game.chapter - 1].sprite, 64)}</div>
    ${done && f.kind === 'two' ? `<p class="pix center">2分たった。このまま続ける？</p>
      <div class="grid2"><button class="btn primary" data-ext="13">あと13分（計15分）</button><button class="btn" data-ext="23">あと23分（計25分）</button></div>` : ''}
    ${done && f.kind !== 'two' ? '<p class="pix center">時間だ。戦果を受け取ろう。</p>' : ''}
  </div>
  <div class="win">
    <label class="f" for="evi">何を進めた？（1行・必須）</label>
    <input type="text" id="evi" maxlength="120" placeholder="ESの志望動機を3行書いた">
    ${t ? `<label class="check"><input type="checkbox" id="kill"><span>「${esc(t.title)}」は完了した（とどめを刺す）</span></label>` : ''}
    <div class="err" id="eerr" hidden>何を進めたかを1行書いてください</div>
    <button class="btn ${done ? 'primary' : ''} block" id="end" style="margin-top:6px">${done ? '終えて戦果を受け取る' : 'ここで終える'}</button>
    ${done ? '' : '<p class="tiny muted" style="margin-top:6px">途中で終えた時は、やった分だけ数える。</p>'}
  </div>
  <p class="tiny muted center">この画面を閉じても、時間は進み続ける。</p>`;
}

export function render(s) {
  return s.focus ? running(s) : chooser(s);
}

export function bind(root, s, app) {
  on(root, '[data-min]', 'click', (e, el) => {
    const taskId = $('input[name=task]:checked', root)?.value || null;
    const m = Number(el.dataset.min);
    update((st) => R.startFocus(st, { taskId, minutes: m, kind: m === 2 ? 'two' : 'normal' }));
    app.render();
  });
  on(root, '[data-ext]', 'click', (e, el) => {
    update((st) => R.extendFocus(st, Number(el.dataset.ext)));
    app.render();
  });
  $('#evi', root)?.addEventListener('input', () => { $('#eerr', root).hidden = true; });
  $('#end', root)?.addEventListener('click', () => {
    const evidence = $('#evi', root).value.trim();
    const elapsed = R.focusElapsedMin(s.focus);
    if (!evidence && elapsed >= 1) { $('#eerr', root).hidden = false; $('#evi', root).focus(); return; }
    const killed = $('#kill', root)?.checked || false;
    if (elapsed < 1 && !killed) {
      update((st) => R.cancelFocus(st));
      toast('1分未満なので数えなかった');
      app.render();
      return;
    }
    update((st) => R.finishFocus(st, { evidence, done: killed }));
    app.go('result');
  });
}

export function tick(root, s, app) {
  const el = root.querySelector('[data-timer]');
  if (!el || !s.focus) return;
  const left = remain(s.focus);
  if (left <= 0 && el.textContent !== '00:00') app.render();
  else if (left > 0) el.textContent = fmtClock(left);
}

// ---------- 戦闘結果 ----------
export const result = {
  title: '戦果',
  render(s) {
    const r = s.result;
    if (!r) return '<div class="win"><p>まだ戦果はない。</p><a class="btn block" href="#focus">集中する</a></div>';
    const g = s.game;
    const sim = r.sim;
    const forgeLeft = s.forgeUntil - Date.now();
    return `<div class="win gold center">
      <h2>${r.min}分の集中</h2>
      <div class="dmg">${nf(sim.toMonster + sim.toBoss)} ダメージ</div>
      ${r.taskTitle ? `<p class="small">「${esc(r.taskTitle)}」に${nf(sim.toMonster)}、ボスに${nf(sim.toBoss)}</p>` : `<p class="small">ボスに${nf(sim.toBoss)}</p>`}
    </div>
    ${r.boss ? `<div class="win gold center"><h2>${esc(r.boss.boss)}を倒した！</h2>
      ${r.boss.final ? '<p class="pix">魔王を倒した。旅は終わった。</p>' : `<p class="pix">第${r.boss.next.n}章「${esc(r.boss.next.place)}」へ。遺物のレシピを手に入れた。</p><p class="small">${esc(r.boss.next.hint)}</p>`}</div>` : ''}
    ${r.kill ? `<div class="win green"><p class="pix">モンスターにとどめを刺した！ ${G.MATS[r.kill.mat]}+${r.kill.n}${r.kill.full ? '（完全撃破ボーナス）' : ''}</p></div>` : ''}
    ${r.lvAfter > r.lvBefore ? `<div class="win gold center"><p class="pix">レベルアップ！ Lv.${r.lvBefore} → Lv.${r.lvAfter}</p></div>` : ''}
    ${r.unlocked.length ? `<div class="win gold"><h3>新しいレシピ</h3><p class="pix">${r.unlocked.map((id) => esc(G.ITEMS[id].name)).join('・')}</p></div>` : ''}
    <div class="win"><h3>内訳</h3><div class="kv">
      <span>直接攻撃（${sim.actions}行動）</span><span class="v">${nf(sim.direct)}</span>
      ${sim.burn ? `<span>火傷</span><span class="v">${nf(sim.burn)}</span>` : ''}
      ${sim.poison ? `<span>毒</span><span class="v">${nf(sim.poison)}</span>` : ''}
      ${sim.crits ? `<span>会心</span><span class="v">${sim.crits}回</span>` : ''}
      ${sim.miss ? `<span>外れた（霧）</span><span class="v">${sim.miss}回</span>` : ''}
      ${sim.skipped ? `<span>封じられた行動</span><span class="v">${sim.skipped}回</span>` : ''}
      ${sim.regen ? `<span>ボスが再生した</span><span class="v">${nf(sim.regen)}</span>` : ''}
      ${sim.blocked ? `<span>硬さで防がれた</span><span class="v">${nf(sim.blocked)}</span>` : ''}
    </div></div>
    <div class="win"><h3>手に入れたもの</h3><div class="kv">
      <span>持ち時間</span><span class="v">+${r.earned}分（${r.rate}:1）</span>
      ${r.paid ? `<span>借金の返済</span><span class="v">${r.paid}分</span>` : ''}
      <span>鉄</span><span class="v">+${r.iron}</span>
      <span>ボスの残りHP</span><span class="v">${nf(g.bossHp)}</span>
    </div></div>
    ${forgeLeft > 0 ? `<a class="btn primary block" href="#forge">鍛冶屋へ（あと<span data-fl>${fmtClock(forgeLeft)}</span>）</a>` : ''}
    <a class="btn ghost block" href="#home" style="margin-top:8px">拠点へ</a>`;
  },
  tick(root, s) {
    const el = root.querySelector('[data-fl]');
    if (el) el.textContent = fmtClock(s.forgeUntil - Date.now());
  },
};
