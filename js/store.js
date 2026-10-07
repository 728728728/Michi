// 端末内保存（localStorage）。読み書きに失敗しても落ちないようにする
import { newGame } from './game.js';
import { dayKey } from './util.js';

const KEY = 'michi.state';
const BAK = 'michi.state.bak';

export function defaults() {
  return {
    v: 1,
    createdAt: Date.now(),
    onboarding: { step: 0, done: false, checks: {}, skipped: false, testToken: null },
    contract: { why: '', reclaim: '', ideal: '', night: '', escape: '', anxious: '', signedAt: null },
    settings: {
      startDate: null,
      bedStart: '00:00',
      wake: '07:30',
      capWeekday: 60,
      capHoliday: 90,
      reviewDay: 0,
      reviewStart: '19:00',
      reviewEnd: '22:00',
      targets: ['YouTube', 'ゲーム'],
      habits: ['起きたら水を1杯飲む', '机の上を片付ける', 'ストレッチ5分'],
      holidays: [],
    },
    days: {},
    debts: [],
    passes: [],
    focus: null,
    gate: null,
    result: null,
    forgeUntil: 0,
    notice: null,
    nights: { checked: null, breaches: [] },
    events: [],
    vents: [],
    game: newGame(),
    vault: { code: null, sealedAt: null, revealedAt: null, history: [] },
    review: { done: {}, stCheck: {} },
  };
}

function migrate(s) {
  const d = defaults();
  const out = { ...d, ...s };
  for (const k of ['onboarding', 'contract', 'settings', 'nights', 'vault', 'review']) out[k] = { ...d[k], ...(s[k] || {}) };
  out.game = { ...d.game, ...(s.game || {}) };
  out.game.mats = { ...d.game.mats, ...(out.game.mats || {}) };
  out.game.kills = { ...d.game.kills, ...(out.game.kills || {}) };
  return out;
}

let cache = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(BAK);
    cache = raw ? migrate(JSON.parse(raw)) : defaults();
  } catch {
    cache = defaults();
  }
  return cache;
}

export const state = () => cache || load();

export function save() {
  try {
    const json = JSON.stringify(cache);
    localStorage.setItem(KEY, json);
    localStorage.setItem(BAK, json);
    return true;
  } catch {
    return false;
  }
}

// 書き換えて保存（他のタブで開いていても、最新を読み直してから書く）
export function update(fn) {
  load();
  const r = fn(cache);
  save();
  return r;
}

export function replaceAll(obj) {
  cache = migrate(obj);
  save();
}

export function resetAll() {
  cache = defaults();
  save();
}

export function day(s, key = dayKey()) {
  if (!s.days[key]) {
    s.days[key] = {
      tasks: [], habits: {}, morningAt: null,
      focusMin: 0, earnedGross: 0, credit: 0, debtPaid: 0, used: 0, overMin: 0,
      confiscated: false, gates: 0, returned: 0, passes: 0, shardsGot: 0, lastShardAt: 0,
    };
  }
  return s.days[key];
}

export function logEvent(s, type, data = {}) {
  s.events.push({ t: Date.now(), type, ...data });
  if (s.events.length > 6000) s.events.splice(0, s.events.length - 6000);
}
