// ロックのルール：稼ぎ・通行証・閉じた時の精算・夜・見直し日
import { day, logEvent } from './store.js';
import {
  dayKey, addDays, keyToDate, inWindow, hmToMin, minOfDay, nextAt, shortcutDate, parseShortcutDate,
  isHoliday, uid, weekKey, MIN, DAY, randomDigits,
} from './util.js';
import * as G from './game.js';

export const PASS_SHORTCUT = 'Michi通行';

// ---------- 稼ぎのレート ----------
export function stageOf(s, key = dayKey()) {
  if (!s.settings.startDate) return 0;
  const days = Math.floor((keyToDate(key) - keyToDate(s.settings.startDate)) / DAY);
  if (days < 14) return 0;
  if (days < 28) return 1;
  return 2;
}

export function rateOf(s, key = dayKey()) {
  const st = stageOf(s, key);
  return isHoliday(key, s.settings.holidays) ? [1.5, 2, 3][st] : [2, 3, 4][st];
}

export const capOf = (s, key = dayKey()) =>
  isHoliday(key, s.settings.holidays) ? s.settings.capHoliday : s.settings.capWeekday;

// 作業時間から稼ぎを計算し直す。増えた分は、まず借金の返済にあてる
export function recalcEarn(s, key = dayKey()) {
  const d = day(s, key);
  const gross = Math.min(capOf(s, key), Math.floor(d.focusMin / rateOf(s, key)));
  let delta = gross - d.earnedGross;
  if (delta <= 0) return 0;
  d.earnedGross = gross;
  let paid = 0;
  for (const debt of s.debts) {
    if (debt.from > key || debt.left <= 0 || delta <= 0) continue;
    const p = Math.min(debt.left, delta);
    debt.left -= p;
    delta -= p;
    paid += p;
  }
  s.debts = s.debts.filter((x) => x.left > 0);
  d.debtPaid += paid;
  d.credit += delta;
  return delta;
}

export function balance(s, key = dayKey()) {
  const d = day(s, key);
  if (d.confiscated) return 0;
  return Math.max(0, d.credit - d.used);
}

export const debtTotal = (s) => s.debts.reduce((a, b) => a + b.left, 0);

// ---------- 時間帯 ----------
export const isNight = (s, now = new Date()) => inWindow(now, s.settings.bedStart, s.settings.wake);

// 「どの夜か」のキー（その夜が明けた朝の日付）
export function nightKey(s, now = new Date()) {
  const m = minOfDay(now);
  const start = hmToMin(s.settings.bedStart);
  return start > hmToMin(s.settings.wake) && m >= start ? addDays(dayKey(now), 1) : dayKey(now);
}

export function minutesUntilBed(s, now = new Date()) {
  return Math.floor((nextAt(now, s.settings.bedStart) - now) / MIN);
}

export function inReview(s, now = new Date()) {
  if (now.getDay() !== Number(s.settings.reviewDay)) return false;
  const m = minOfDay(now);
  return m >= hmToMin(s.settings.reviewStart) && m < hmToMin(s.settings.reviewEnd);
}

export function nextReview(s, now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== Number(s.settings.reviewDay)) continue;
    d.setHours(0, 0, 0, 0);
    d.setMinutes(hmToMin(s.settings.reviewStart));
    const end = new Date(d);
    end.setHours(0, 0, 0, 0);
    end.setMinutes(hmToMin(s.settings.reviewEnd));
    if (end > now) return d;
  }
  return null;
}

// ---------- 通行証 ----------
export const activePass = (s, now = Date.now()) =>
  s.passes.find((p) => !p.test && !p.rogue && p.start <= now && now < p.expiry) || null;

export function passBlock(s, now = new Date()) {
  const key = dayKey(now);
  const d = day(s, key);
  if (!s.onboarding.done) return '導入が終わっていません';
  if (isNight(s, now)) return '就寝ロックの時間です';
  if (s.focus) return '集中している間は通しません';
  if (!d.morningAt) return '今日の「朝の3つ」をまだ決めていません';
  if (d.confiscated) return '今日の持ち時間は没収されています（ショート）';
  if (minutesUntilBed(s, now) < 1) return '就寝ロックの直前です';
  if (balance(s, key) < 1) return '持ち時間が0分です';
  return null;
}

export function maxPassMin(s, now = new Date()) {
  return Math.max(0, Math.min(balance(s, dayKey(now)), minutesUntilBed(s, now)));
}

export const shortcutUrl = (name, text) =>
  `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(text)}`;

// 通行証ファイルの中身：1行目=期限、2行目=番号、3行目=アプリ、4行目=分（時計のタイマー用）
export const passPayload = (p) => `${shortcutDate(p.expiry)}\n${p.token}\n${p.app}\n${p.minutes}`;

export function issuePass(s, { app, minutes, declare, test = false }, now = Date.now()) {
  const p = {
    token: uid(6), app, minutes, declare: declare || '', start: now, expiry: now + minutes * MIN,
    test, closes: 0, lastClose: null, settled: false, shortsAsked: false, shorts: null, overMin: 0,
  };
  if (!test) {
    const d = day(s, dayKey(now));
    d.used += minutes;
    d.passes++;
    logEvent(s, 'pass', { app, minutes, declare: p.declare, token: p.token });
  }
  s.passes.push(p);
  if (s.passes.length > 400) s.passes.splice(0, s.passes.length - 400);
  if (s.gate) s.gate.outcome = 'passed';
  return { pass: p, url: shortcutUrl(PASS_SHORTCUT, passPayload(p)) };
}

export function parsePassText(text) {
  const lines = String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return null;
  return { expiry: parseShortcutDate(lines[0]), token: lines[1] || '', app: lines[2] || '' };
}

// ---------- 介入画面 ----------
export function openGate(s, app, now = Date.now()) {
  const g = s.gate;
  if (g && !g.closed && now - g.startedAt < 3 * MIN) {
    g.app = app || g.app;
    return g;
  }
  const d = day(s, dayKey(new Date(now)));
  d.gates++;
  s.gate = { id: uid(), app: app || '', startedAt: now, mood: null, outcome: null, closed: false };
  logEvent(s, 'gate', { app });
  return s.gate;
}

// 引き返した（迎撃成功）。魔の欠片は1日5個まで、10分以上あけた迎撃だけ
export function intercept(s, how, now = Date.now()) {
  const g = s.gate;
  const d = day(s, dayKey(new Date(now)));
  const res = { shard: false };
  if (g && !g.closed) {
    g.closed = true;
    g.outcome = how;
    d.returned++;
    s.game.intercepts++;
    logEvent(s, 'return', { how, mood: g.mood });
    if (d.shardsGot < 5 && now - d.lastShardAt >= 10 * MIN) {
      d.shardsGot++;
      d.lastShardAt = now;
      s.game.mats.shard++;
      res.shard = true;
    }
    G.addLog(s.game, 'win', `魔王軍を迎撃した（${howText(how)}）${res.shard ? '。魔の欠片+1' : ''}`, now);
  }
  return res;
}

const howText = (h) => ({ return: '引き返した', vent: '気持ちを書いた', start: '2分着手', rest: '回復を選んだ' }[h] || h);

// ---------- アプリを閉じた時の精算 ----------
// 戻り値の kind: ignore / inpass / settle / unauthorized / ask
export function handleClosed(s, app, passText, now = Date.now()) {
  const info = parsePassText(passText);
  const key = dayKey(new Date(now));
  if (!info || !info.token) return { kind: 'ignore' };
  const p = s.passes.find((x) => x.token === info.token);
  if (!p) {
    // 介入画面を通らずに作られた通行証（手動でショートカットを実行した）
    if (info.expiry && now - info.expiry < DAY && !s.passes.some((x) => x.rogue === info.token)) {
      s.passes.push({ token: `rogue-${info.token}`, rogue: info.token, start: now, expiry: now, settled: true });
      logEvent(s, 'rogue', { app, token: info.token });
      return { kind: 'unauthorized' };
    }
    return { kind: 'ignore' };
  }
  p.closes++;
  p.lastClose = now;
  if (p.test) {
    s.onboarding.checks.pass = true;
    return { kind: 'test', pass: p };
  }
  if (now <= p.expiry + MIN) return { kind: 'inpass', pass: p };
  if (p.settled) return { kind: 'ignore' };
  // 期限後に開こうとして介入画面へ飛ばされた時の「閉じた」は、使っていないので精算しない
  if (s.gate && s.gate.startedAt > p.expiry) {
    p.settled = true;
    p.overMin = 0;
    return { kind: 'ignore' };
  }
  const over = Math.ceil((now - p.expiry) / MIN);
  // 画面を消したまま放置した場合などは自動で測れないので、自己申告にする
  if (over > 30) return { kind: 'ask', pass: p, over };
  return { kind: 'settle', pass: p, over, key };
}

// 超過の精算。over 分を翌日以降の借金にし、魔王軍の襲撃を起こす
export function settleOver(s, p, over, now = Date.now()) {
  if (p.settled) return null;
  p.settled = true;
  p.overMin = over;
  if (over <= 0) return null;
  const key = dayKey(new Date(now));
  day(s, key).overMin += over;
  s.debts.push({ from: addDays(key, 1), left: over, at: now });
  logEvent(s, 'over', { app: p.app, over });
  return G.defeat(s.game, over < 5 ? 'minor' : 'major', `持ち時間を${over}分超えた`, key, now);
}

export function reportShorts(s, p, saw, now = Date.now()) {
  p.shortsAsked = true;
  p.shorts = saw;
  if (!saw) return null;
  const key = dayKey(new Date(now));
  day(s, key).confiscated = true;
  logEvent(s, 'shorts', { app: p.app });
  return G.defeat(s.game, 'major', 'ショートを見た', key, now);
}

export function punishRogue(s, now = Date.now()) {
  return G.defeat(s.game, 'major', '介入画面を通らずに通行した', dayKey(new Date(now)), now);
}

// ---------- 夜 ----------
// 夜の間に対象アプリが開かれた＝スクリーンタイムの休止時間が効いていない＝夜のロックが破られた
export function nightBreach(s, reason, now = new Date()) {
  const k = nightKey(s, now);
  if (s.nights.breaches.includes(k)) return null;
  s.nights.breaches.push(k);
  logEvent(s, 'night', { reason });
  return G.defeat(s.game, 'run', reason, dayKey(now), now.getTime());
}

// 守った夜の数だけ星を増やす（朝、最初に開いた時にまとめて数える）
export function countStars(s, now = new Date()) {
  if (!s.onboarding.done || !s.settings.startDate || isNight(s, now)) return 0;
  const today = dayKey(now);
  if (minOfDay(now) < hmToMin(s.settings.wake)) return 0;
  let k = s.nights.checked || s.settings.startDate;
  let n = 0;
  let guard = 0;
  while (k < today && guard++ < 90) {
    k = addDays(k, 1);
    if (!s.nights.breaches.includes(k)) {
      n++;
      s.game.stars++;
      s.game.mats.stardust++;
    }
  }
  s.nights.checked = today;
  if (n) G.addLog(s.game, 'star', `夜のロックを守った（星+${n}・星の砂+${n}）`, now.getTime());
  return n;
}

// ---------- 集中 ----------
export function startFocus(s, { taskId = null, minutes, kind = 'normal' }, now = Date.now()) {
  if (s.focus) return s.focus;
  s.focus = { id: uid(), taskId, dayKey: dayKey(new Date(now)), start: now, planned: minutes, kind };
  logEvent(s, 'focus-start', { taskId, minutes });
  return s.focus;
}

export function extendFocus(s, minutes) {
  if (s.focus) {
    s.focus.planned += minutes;
    s.focus.kind = 'normal';
  }
}

export const focusElapsedMin = (f, now = Date.now()) => Math.floor((now - f.start) / MIN);

export function findTask(s, id) {
  if (!id) return null;
  for (const [k, d] of Object.entries(s.days)) {
    const t = d.tasks.find((x) => x.id === id);
    if (t) return { task: t, key: k };
  }
  return null;
}

function killMonster(s, task, now) {
  const g = s.game;
  const area = G.AREAS[task.area] || G.AREAS.life;
  g.kills[area.family]++;
  const full = task.dmg >= task.hp;
  const n = 3 + (full ? 1 : 0);
  g.mats[area.mat] += n;
  G.addLog(g, 'kill', `${G.FAMILY[area.family].name}「${task.title}」を倒した（${G.MATS[area.mat]}+${n}）`, now);
  return { mat: area.mat, n, full };
}

// 集中を終える。done=やることを完了した（とどめ）
export function finishFocus(s, { evidence, done }, now = Date.now()) {
  const f = s.focus;
  if (!f) return null;
  const g = s.game;
  const elapsed = focusElapsedMin(f, now);
  const counted = Math.max(0, Math.min(elapsed, f.planned));
  const key = dayKey(new Date(now));
  const d = day(s, key);
  const lvBefore = G.levelOf(g);
  const unlockBefore = new Set(G.unlockedIds(g));
  const found = findTask(s, f.taskId);
  const task = found?.task || null;

  d.focusMin += counted;
  g.totalFocusMin += counted;
  const paidBefore = d.debtPaid;
  const earned = recalcEarn(s, key);
  const paid = d.debtPaid - paidBefore;

  const sim = G.simulate(g, { minutes: counted, monsterHp: task && !task.done ? Math.max(0, task.hp - task.dmg) : 0, seed: f.id });
  if (task) {
    task.dmg += sim.toMonster;
    task.spent = (task.spent || 0) + counted;
    if (evidence) task.evidence.push({ t: now, text: evidence, min: counted });
  }
  g.bossHp = Math.max(0, g.bossHp - sim.toBoss);
  const iron = counted >= 2 ? Math.max(1, Math.floor(counted / 5)) : 0;
  g.mats.iron += iron;

  let kill = null;
  if (done && task && !task.done) {
    task.done = true;
    task.doneAt = now;
    kill = killMonster(s, task, now);
  }
  const boss = G.checkBoss(g, now);
  const unlocked = G.unlockedIds(g).filter((id) => !unlockBefore.has(id));
  logEvent(s, 'focus', { min: counted, taskId: f.taskId, evidence, done: !!kill });
  if (counted > 0) G.addLog(g, 'fight', `${counted}分の集中で${sim.toMonster + sim.toBoss}ダメージ`, now);

  s.result = {
    t: now, min: counted, earned, paid, rate: rateOf(s, key), sim, iron, kill, boss, unlocked,
    lvBefore, lvAfter: G.levelOf(g), taskTitle: task?.title || null, evidence,
  };
  s.focus = null;
  if (counted >= 2) s.forgeUntil = now + 5 * MIN;
  return s.result;
}

export function cancelFocus(s) {
  s.focus = null;
}

// 集中なしで「やること」を完了にする（とどめだけ刺す）
export function finishTask(s, taskId, evidence, now = Date.now()) {
  const found = findTask(s, taskId);
  if (!found || found.task.done) return null;
  const t = found.task;
  const before = new Set(G.unlockedIds(s.game));
  t.done = true;
  t.doneAt = now;
  if (evidence) t.evidence.push({ t: now, text: evidence, min: 0 });
  const kill = killMonster(s, t, now);
  logEvent(s, 'done', { taskId, evidence });
  return { kill, unlocked: G.unlockedIds(s.game).filter((id) => !before.has(id)) };
}

// ---------- 朝の3つ ----------
export function setMorning(s, tasks, now = Date.now()) {
  const key = dayKey(new Date(now));
  const d = day(s, key);
  const hp = G.monsterHp(s.game.chapter);
  const keep = new Map(d.tasks.map((t) => [t.id, t]));
  d.tasks = tasks.slice(0, 3).map((t) => {
    const old = t.id && keep.get(t.id);
    if (old) return { ...old, title: t.title, area: t.area, first: t.first };
    return { id: uid(), title: t.title, area: t.area, first: t.first, hp, dmg: 0, done: false, doneAt: null, evidence: [], spent: 0 };
  });
  d.morningAt = d.morningAt || now;
  logEvent(s, 'morning', { n: d.tasks.length });
  return d;
}

// 昨日までに終わらなかったやること（朝の候補）
export function carryOver(s, now = new Date()) {
  const today = dayKey(now);
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const d = s.days[addDays(today, -i)];
    if (!d) continue;
    d.tasks.filter((t) => !t.done).forEach((t) => {
      if (!out.some((o) => o.title === t.title)) out.push({ title: t.title, area: t.area, first: t.first });
    });
  }
  return out.slice(0, 6);
}

// 今やるべき1つ（未完了のうち最初のもの）
export function nextTask(s, now = new Date()) {
  const d = day(s, dayKey(now));
  return d.tasks.find((t) => !t.done) || null;
}

// ---------- パスコードの封印 ----------
export function newPasscode(s) {
  s.vault.pending = randomDigits(4);
  return s.vault.pending;
}

export function sealPasscode(s, now = Date.now()) {
  if (!s.vault.pending) return false;
  if (s.vault.code) s.vault.history.push({ code: '****', sealedAt: s.vault.sealedAt, replacedAt: now });
  s.vault.code = s.vault.pending;
  s.vault.pending = null;
  s.vault.sealedAt = now;
  s.vault.revealedAt = null;
  return true;
}

export function revealPasscode(s, now = Date.now()) {
  if (!inReview(s, new Date(now)) || !s.vault.code) return null;
  s.vault.revealedAt = now;
  logEvent(s, 'reveal', {});
  return s.vault.code;
}

// ---------- 見直し日：スクリーンタイムとの照合 ----------
export function weekUsage(s, now = new Date()) {
  const wk = weekKey(dayKey(now));
  let rec = 0;
  for (let i = 0; i < 7; i++) {
    const d = s.days[addDays(wk, i)];
    if (d) rec += d.used + d.overMin;
  }
  return { week: wk, rec };
}

export function crossCheck(s, stMin, now = new Date()) {
  const { week, rec } = weekUsage(s, now);
  const diff = Math.round(stMin - rec);
  const prev = s.review.stCheck[week];
  const res = { week, st: stMin, rec, diff, penalty: null };
  if (diff > 15 && !(prev && prev.penalized)) {
    res.penalty = G.defeat(s.game, 'major', `記録にない使用が${diff}分見つかった`, dayKey(now), now.getTime());
    res.penalized = true;
  }
  s.review.stCheck[week] = { ...res, penalized: res.penalized || prev?.penalized || false, at: now.getTime() };
  logEvent(s, 'crosscheck', { st: stMin, rec, diff });
  return res;
}
