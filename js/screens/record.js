// 記録：脳の回復の見える化・取り戻した時間・作業の証拠・旅の記録
import { esc, dayKey, addDays, mdw, weekKey, keyToDate, fmtMin, hm, DAY } from '../util.js';

export const title = '記録';

const RECLAIM_PER_RETURN = 20; // 引き返した1回で取り戻した時間の推定（分）

function sumDays(s, from, n, f) {
  let x = 0;
  for (let i = 0; i < n; i++) {
    const d = s.days[addDays(from, i)];
    if (d) x += f(d);
  }
  return x;
}

function chart7(s, cols) {
  const today = dayKey();
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const vals = keys.map((k) => cols.map((c) => c.f(s.days[k] || {})));
  const max = Math.max(1, ...vals.flat());
  return `<div class="chart">${vals.map((v) => `<div class="col" style="flex-direction:row;align-items:flex-end;gap:2px">${v.map((x, i) => `<div class="${cols[i].cls}" style="flex:1;height:${(x / max) * 100}%;min-height:${x ? 2 : 0}px" title="${x}"></div>`).join('')}</div>`).join('')}</div>
    <div class="chart-l">${keys.map((k) => `<span>${mdw(k).replace(/^\d+\//, '')}</span>`).join('')}</div>
    <div class="legend">${cols.map((c) => `<span><i class="${c.cls}"></i>${c.label}</span>`).join('')}</div>`;
}

function weeks(s) {
  const start = s.settings.startDate;
  if (!start) return [];
  const out = [];
  let wk = weekKey(start);
  const now = weekKey(dayKey());
  let guard = 0;
  while (wk <= now && guard++ < 60) {
    out.push({
      wk,
      gates: sumDays(s, wk, 7, (d) => d.gates || 0),
      returned: sumDays(s, wk, 7, (d) => d.returned || 0),
      used: sumDays(s, wk, 7, (d) => (d.used || 0) + (d.overMin || 0)),
      focus: sumDays(s, wk, 7, (d) => d.focusMin || 0),
    });
    wk = addDays(wk, 7);
  }
  return out.slice(-8);
}

export function render(s) {
  const g = s.game;
  const ws = weeks(s);
  const totalReturned = Object.values(s.days).reduce((a, d) => a + (d.returned || 0), 0);
  const totalFocus = g.totalFocusMin;
  const days = s.settings.startDate ? Math.floor((keyToDate(dayKey()) - keyToDate(s.settings.startDate)) / DAY) + 1 : 0;
  const month = dayKey().slice(0, 7);
  const monthNights = days ? Array.from({ length: 31 }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
    .filter((k) => k > s.settings.startDate && k <= dayKey() && k <= (s.nights.checked || '')).filter((k) => !s.nights.breaches.includes(k)).length : 0;
  const evid = [];
  Object.entries(s.days).forEach(([k, d]) => d.tasks.forEach((t) => t.evidence.forEach((e) => evid.push({ k, t: e.t, title: t.title, text: e.text, min: e.min }))));
  s.events.filter((e) => e.type === 'focus' && !e.taskId && e.evidence).forEach((e) => evid.push({ k: dayKey(new Date(e.t)), t: e.t, title: 'ボスに直接', text: e.evidence, min: e.min }));
  evid.sort((a, b) => b.t - a.t);
  const maxW = Math.max(1, ...ws.map((w) => w.gates));

  return `<div class="win gold"><h2>取り戻した時間</h2>
    <div class="grid2">
      <div><div class="tiny muted">引き返した回数</div><div class="pix" style="font-size:26px">${totalReturned}回</div></div>
      <div><div class="tiny muted">取り戻した時間（推定）</div><div class="pix" style="font-size:26px">${fmtMin(totalReturned * RECLAIM_PER_RETURN)}</div></div>
      <div><div class="tiny muted">集中した時間</div><div class="pix" style="font-size:22px">${fmtMin(totalFocus)}</div></div>
      <div><div class="tiny muted">譲らなかった夜（今月）</div><div class="pix" style="font-size:22px">${monthNights}夜</div></div>
    </div>
    <p class="tiny muted" style="margin-top:6px">取り戻した時間は「引き返した1回＝${RECLAIM_PER_RETURN}分」として推定。始めてから${days}日目。星は通算${g.stars}個。</p>
  </div>

  <div class="win"><h3>脳の回復（週ごとの衝動）</h3>
    ${ws.length ? `<div class="chart" style="grid-template-columns:repeat(${ws.length},minmax(0,1fr))">${ws.map((w) => `<div class="col"><div class="b1" style="height:${((w.gates - w.returned) / maxW) * 100}%"></div><div class="b2" style="height:${(w.returned / maxW) * 100}%"></div></div>`).join('')}</div>
    <div class="chart-l" style="grid-template-columns:repeat(${ws.length},minmax(0,1fr))">${ws.map((w, i) => `<span>${i + 1}週</span>`).join('')}</div>
    <div class="legend"><span><i class="b2"></i>引き返した</span><span><i class="b1"></i>開いた・通行</span></div>
    <p class="small" style="margin-top:8px">${ws.map((w) => (w.gates ? Math.round((w.returned / w.gates) * 100) : 0)).map((p, i) => `${i + 1}週 ${p}%`).join('　')}</p>` : '<p class="small muted">導入が終わると記録が始まる。</p>'}
    <p class="tiny muted">最初の1〜2週間は衝動が一時的に増えることがある（消去バースト）。そのあと回数が下がり、引き返す割合が上がっていけば、脳の回路がつなぎ替わってきている。</p>
  </div>

  <div class="win"><h3>この7日間</h3>
    ${chart7(s, [
      { label: '衝動', cls: 'b1', f: (d) => d.gates || 0 },
      { label: '引き返した', cls: 'b2', f: (d) => d.returned || 0 },
    ])}
    <hr class="sep">
    ${chart7(s, [
      { label: '集中（分）', cls: 'b2', f: (d) => d.focusMin || 0 },
      { label: '娯楽（分）', cls: 'b3', f: (d) => (d.used || 0) + (d.overMin || 0) },
    ])}
  </div>

  <div class="win"><h3>作業の証拠</h3>
    <ul class="list log">${evid.slice(0, 40).map((e) => `<li><span class="t">${mdw(e.k)}</span><span class="pix">${esc(e.title)}</span>${e.min ? ` <span class="tiny muted">${e.min}分</span>` : ''}<br>${esc(e.text)}</li>`).join('') || '<li class="muted">集中を終えると、ここに残る</li>'}</ul>
  </div>

  <div class="win"><h3>吐き出した気持ち</h3>
    <ul class="list log">${s.vents.slice(-15).reverse().map((v) => `<li><span class="t">${mdw(dayKey(new Date(v.t)))} ${hm(v.t)}</span>${esc(v.text)}</li>`).join('') || '<li class="muted">介入画面で書いた気持ちが、ここに残る</li>'}</ul>
  </div>

  <div class="win"><h3>周回の記録</h3>
    <p class="small">今は周回${g.run}・第${g.chapter}章。クリアした章：${g.cleared.length ? g.cleared.map((n) => `${n}章`).join('・') : 'なし'}</p>
    <ul class="list log">${g.runs.slice().reverse().map((r) => `<li class="k-run"><span class="t">${mdw(dayKey(new Date(r.endedAt)))}</span>周回${r.run}（${r.chapter}章）：${esc(r.reason)}</li>`).join('') || '<li class="muted">まだ一度も周回は終わっていない</li>'}</ul>
  </div>

  <div class="win"><h3>旅の記録（すべて）</h3>
    <ul class="list log">${g.log.slice(0, 80).map((l) => `<li class="k-${l.kind}"><span class="t">${mdw(dayKey(new Date(l.t)))} ${hm(l.t)}</span>${esc(l.text)}</li>`).join('') || '<li class="muted">まだ何も起きていない</li>'}</ul>
  </div>
  <p class="center tiny"><a href="#about">このアプリについて</a></p>`;
}
