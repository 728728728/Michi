// 時刻・日付・表示まわりの小さな道具

export const MIN = 60 * 1000;
export const DAY = 24 * 60 * MIN;

export const pad = (n) => String(n).padStart(2, '0');

// 日付のキー（ローカル時刻の YYYY-MM-DD）。持ち時間は 0:00 で失効するので暦の日付で区切る
export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// "HH:MM" → その日の 0:00 からの分
export function hmToMin(hm) {
  const [h, m] = String(hm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const minOfDay = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

// 就寝ロックの時間帯か（開始が 0:00 より前でも後でも扱える）
export function inWindow(now, startHm, endHm) {
  const m = minOfDay(now);
  const s = hmToMin(startHm);
  const e = hmToMin(endHm);
  return s <= e ? m >= s && m < e : m >= s || m < e;
}

// 次に hm になる時刻（今日まだなら今日、過ぎていれば明日）
export function nextAt(now, hm) {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  t.setMinutes(hmToMin(hm));
  if (t <= now) t.setDate(t.getDate() + 1);
  return t;
}

// ショートカットが読める日時の文字列（例 2026/10/08 21:30:00）
export function shortcutDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseShortcutDate(s) {
  const m = String(s || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
}

export const hm = (ts) => {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
};

export function mdw(key) {
  const d = keyToDate(key);
  return `${d.getMonth() + 1}/${d.getDate()}(${'日月火水木金土'[d.getDay()]})`;
}

export function fmtMin(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}分`;
  return `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}`;
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export const nf = (n) => Math.round(n).toLocaleString('ja-JP');

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid(n = 8) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => a[b % a.length]).join('');
}

export function randomDigits(n) {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b % 10).join('');
}

// 決まった種から決まった乱数列（戦闘の会心だけに使う）
export function seeded(seedStr) {
  let h = 2166136261;
  for (const c of String(seedStr)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 日本の祝日（2026〜2028）。休日はレートを1段階緩める
const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20', '2026-04-29', '2026-05-03', '2026-05-04',
  '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12',
  '2026-11-03', '2026-11-23', '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-21', '2027-03-22',
  '2027-04-29', '2027-05-03', '2027-05-04', '2027-05-05', '2027-07-19', '2027-08-11', '2027-09-20', '2027-09-23',
  '2027-10-11', '2027-11-03', '2027-11-23', '2028-01-01', '2028-01-10', '2028-02-11', '2028-02-23', '2028-03-20',
  '2028-04-29', '2028-05-03', '2028-05-04', '2028-05-05', '2028-07-17', '2028-08-11', '2028-09-18', '2028-09-22',
  '2028-10-09', '2028-11-03', '2028-11-23',
]);

export function isHoliday(key, extra = []) {
  const d = keyToDate(key).getDay();
  return d === 0 || d === 6 || HOLIDAYS.has(key) || extra.includes(key);
}

// 週の区切り（月曜はじまり）のキー
export function weekKey(key) {
  const d = keyToDate(key);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return dayKey(d);
}
