// 育成「時間奪還の旅」：データと戦闘の計算（画面には依存しない）
import { seeded } from './util.js';

export const AREAS = {
  shukatsu: { name: '就活', family: 'golem', mat: 'stone' },
  study: { name: '勉強・資格', family: 'worm', mat: 'scale' },
  life: { name: '生活習慣', family: 'slime', mat: 'jelly' },
  make: { name: '制作', family: 'gear', mat: 'gear' },
};

export const FAMILY = {
  golem: { name: 'ゴーレム', kills: 'golem' },
  worm: { name: 'ワーム', kills: 'worm' },
  slime: { name: 'スライム', kills: 'slime' },
  gear: { name: 'からくり', kills: 'gear' },
};

export const MATS = {
  iron: '鉄',
  stone: '石核',
  scale: '知恵の鱗',
  jelly: 'ゼリー',
  gear: '歯車',
  shard: '魔の欠片',
  stardust: '星の砂',
};

export const TAGS = ['炎', '連撃', '毒', '会心', '盾', '夜', '貫通', '必中', '範囲', '耐性'];

// 章とボス。trait は弱点の仕組み（それぞれ対策のタグがある）
export const CHAPTERS = [
  { n: 1, place: '夜更かしの森', boss: '眠らずの梟', sprite: 'owl', hp: 16000, traits: [], hint: '特別な仕組みはない。ビルドの基本を覚えよう', sky: '#0b1d3a', ground: '#173404' },
  { n: 2, place: '先延ばしの沼', boss: '泥人形「あとでやる」', sprite: 'mud', hp: 90000, traits: ['regen'], hint: '与えたダメージの半分を再生する。毒が入っていると再生できない', sky: '#1d1f2e', ground: '#3b3a1a' },
  { n: 3, place: '十五秒の渓谷', boss: '女王蜂「ショート」', sprite: 'bee', hp: 110000, traits: ['swarm'], hint: '取り巻きが攻撃を吸う。範囲タグがないとダメージが35%に落ちる', sky: '#2a1b0b', ground: '#5a3b10' },
  { n: 4, place: '呼び声の塔', boss: 'セイレーン「通知」', sprite: 'siren', hp: 150000, traits: ['interfere'], hint: '3回に1回、行動を封じられる。耐性タグで防げる', sky: '#16123a', ground: '#2c2c4a' },
  { n: 5, place: '退屈の砂漠', boss: '砂の王「なんとなく」', sprite: 'sand', hp: 170000, traits: ['armor'], hint: '硬い。直接攻撃のダメージが半分になる。貫通タグで無視できる', sky: '#3a2a10', ground: '#8a6a2a' },
  { n: 6, place: '不安の霧', boss: '霧の巨人', sprite: 'fog', hp: 200000, traits: ['evasion'], hint: '攻撃の40%が外れる。必中タグで必ず当たる', sky: '#2a2f38', ground: '#3f4652' },
  { n: 7, place: '魔王城', boss: '魔王「無限の画面」', sprite: 'king', hp: 480000, traits: ['regen', 'swarm', 'interfere', 'armor', 'evasion'], hint: 'これまでの章の仕組みをすべて持つ', sky: '#14061f', ground: '#26215C' },
];

export const monsterHp = (chapter) => 90 + chapter * 60;

// 火傷・毒の重なりの上限（長い集中ほど強いが、青天井にはしない）
export const STACK_CAP = 40;

// 解放条件の判定に使う値
const cleared = (g) => g.cleared.length;

// 装備のデータ。slot: weapon/armor/acc/relic
export const ITEMS = {
  wood: { name: '木の剣', slot: 'weapon', tags: [], atk: 2, starter: true },
  cloth: { name: '旅人の服', slot: 'armor', tags: [], starter: true },

  iron: { name: '鉄の剣', slot: 'weapon', tags: [], atk: 5, cost: { iron: 8 }, unlock: ['最初から', () => true] },
  flame: { name: '燃える刃', slot: 'weapon', tags: ['炎'], atk: 4, burn: 1, cost: { iron: 8, stone: 4 }, unlock: ['ゴーレムを2体倒す', (g) => g.kills.golem >= 2] },
  fang: { name: '毒牙の短剣', slot: 'weapon', tags: ['毒'], atk: 3, poison: 2, cost: { iron: 6, jelly: 4 }, unlock: ['スライムを2体倒す', (g) => g.kills.slime >= 2] },
  twin: { name: '双剣「連理」', slot: 'weapon', tags: ['連撃'], atk: 3, hits: 1, cost: { iron: 10, gear: 4 }, unlock: ['からくりを2体倒す', (g) => g.kills.gear >= 2] },
  staff: { name: '星読みの杖', slot: 'weapon', tags: ['夜'], atk: 3, night: 0.06, cost: { stardust: 5, scale: 4 }, unlock: ['ワームを2体倒す', (g) => g.kills.worm >= 2] },
  lance: { name: '貫きの槍', slot: 'weapon', tags: ['貫通'], atk: 7, pierce: true, cost: { iron: 16, stone: 8, shard: 4 }, unlock: ['4章をクリア', (g) => cleared(g) >= 4] },
  bow: { name: '真眼の弓', slot: 'weapon', tags: ['必中'], atk: 6, sure: true, cost: { iron: 16, scale: 8, shard: 6 }, unlock: ['5章をクリア', (g) => cleared(g) >= 5] },
  great: { name: '魔断の大剣', slot: 'weapon', tags: [], atk: 14, cost: { iron: 25, shard: 20 }, unlock: ['魔王軍を通算30回迎撃', (g) => g.intercepts >= 30] },

  mail: { name: '鎖かたびら', slot: 'armor', tags: ['盾'], shield: 1, dmg: 0.05, cost: { iron: 12 }, unlock: ['勇者Lv3', (g) => levelOf(g) >= 3] },
  dawn: { name: '夜明けの外套', slot: 'armor', tags: ['夜', '盾'], shield: 1, night: 0.04, cost: { stardust: 4, iron: 4 }, unlock: ['夜を3回守る', (g) => g.stars >= 3] },
  ember: { name: '灰燼の鎧', slot: 'armor', tags: ['炎'], burn: 1, cost: { stone: 10, iron: 10, shard: 6 }, unlock: ['ゴーレムを10体倒す', (g) => g.kills.golem >= 10] },
  robe: { name: '静寂の法衣', slot: 'armor', tags: ['耐性'], resist: true, dmg: 0.1, cost: { scale: 8, jelly: 6, shard: 4 }, unlock: ['3章をクリア', (g) => cleared(g) >= 3] },

  gauntlet: { name: '連撃の籠手', slot: 'acc', tags: ['連撃'], hits: 1, cost: { gear: 6, iron: 6 }, unlock: ['からくりを5体倒す', (g) => g.kills.gear >= 5] },
  crown: { name: '灰の王冠', slot: 'acc', tags: ['炎'], burnMul: 2, cost: { stone: 8, shard: 5 }, unlock: ['ゴーレムを6体倒す', (g) => g.kills.golem >= 6] },
  serpent: { name: '蛇の指輪', slot: 'acc', tags: ['毒'], poison: 1, poisonMul: 2, cost: { jelly: 8, shard: 5 }, unlock: ['スライムを6体倒す', (g) => g.kills.slime >= 6] },
  eye: { name: '狩人の目', slot: 'acc', tags: ['会心'], crit: 0.15, cost: { scale: 6 }, unlock: ['ワームを4体倒す', (g) => g.kills.worm >= 4] },
  crest: { name: '処刑人の紋章', slot: 'acc', tags: ['会心'], critMul: 3, cost: { shard: 10, stone: 6 }, unlock: ['2章をクリア', (g) => cleared(g) >= 2] },
  vortex: { name: '渦の護符', slot: 'acc', tags: ['範囲'], area: true, dmg: 0.05, cost: { gear: 8, jelly: 8 }, unlock: ['2章をクリア', (g) => cleared(g) >= 2] },
  ward: { name: '守りの紋章', slot: 'acc', tags: ['盾'], shield: 1, cost: { iron: 8, jelly: 4 }, unlock: ['勇者Lv5', (g) => levelOf(g) >= 5] },
  will: { name: '鋼の意志', slot: 'acc', tags: ['耐性'], resist: true, cost: { stone: 10, iron: 10 }, unlock: ['3章をクリア', (g) => cleared(g) >= 3] },
  lantern: { name: '夜灯のランタン', slot: 'acc', tags: ['夜'], night: 0.05, crit: 0.05, cost: { stardust: 8, gear: 4 }, unlock: ['夜を14回守る', (g) => g.stars >= 14] },
  bell: { name: '共鳴の鈴', slot: 'acc', tags: [], resonance: 0.06, cost: { shard: 15, gear: 6 }, unlock: ['魔王軍を通算50回迎撃', (g) => g.intercepts >= 50] },

  r1: { name: '梟の眼', slot: 'relic', tags: ['夜', '会心'], crit: 0.1, night: 0.03, cost: { shard: 6, stardust: 4 }, unlock: ['1章のボスを倒す', (g) => cleared(g) >= 1] },
  r2: { name: '泥の心臓', slot: 'relic', tags: ['毒', '炎'], dual: 1.5, cost: { shard: 10, stardust: 6 }, unlock: ['2章のボスを倒す', (g) => cleared(g) >= 2] },
  r3: { name: '女王の針', slot: 'relic', tags: ['連撃', '範囲'], hits: 2, area: true, cost: { shard: 14, stardust: 8 }, unlock: ['3章のボスを倒す', (g) => cleared(g) >= 3] },
  r4: { name: 'セイレーンの竪琴', slot: 'relic', tags: ['耐性'], resist: true, dmg: 0.25, cost: { shard: 18, stardust: 10 }, unlock: ['4章のボスを倒す', (g) => cleared(g) >= 4] },
  r5: { name: '砂王の冠', slot: 'relic', tags: ['貫通', '会心'], pierce: true, crit: 0.2, cost: { shard: 22, stardust: 12 }, unlock: ['5章のボスを倒す', (g) => cleared(g) >= 5] },
  r6: { name: '霧の外套', slot: 'relic', tags: ['必中'], sure: true, dmg: 0.3, cost: { shard: 26, stardust: 14 }, unlock: ['6章のボスを倒す', (g) => cleared(g) >= 6] },
};

export const SLOTS = [
  ['weapon', '武器'],
  ['armor', '防具'],
  ['acc1', '装飾'],
  ['acc2', '装飾'],
  ['relic', '遺物'],
];
export const slotKind = (slot) => (slot.startsWith('acc') ? 'acc' : slot);

export const MAX_PLUS = 10;

export function upgradeCost(plus) {
  const c = { iron: 4 * (plus + 1) };
  if (plus >= 4) c.shard = plus - 3;
  return c;
}

export function newGame() {
  return {
    run: 1,
    chapter: 1,
    bossHp: CHAPTERS[0].hp,
    cleared: [],
    totalFocusMin: 0,
    items: [
      { uid: 'w0', id: 'wood', plus: 0 },
      { uid: 'a0', id: 'cloth', plus: 0 },
    ],
    equip: { weapon: 'w0', armor: 'a0', acc1: null, acc2: null, relic: null },
    mats: { iron: 0, stone: 0, scale: 0, jelly: 0, gear: 0, shard: 0, stardust: 0 },
    kills: { golem: 0, worm: 0, slime: 0, gear: 0 },
    intercepts: 0,
    stars: 0,
    shieldUse: { day: '', n: 0 },
    log: [],
    runs: [],
    seq: 1,
    victory: null,
  };
}

// 勇者のレベル：累計の集中時間で上がる（周回が終わっても残る）
export const levelOf = (g) => 1 + Math.floor(Math.sqrt((g.totalFocusMin || 0) / 6));
export const minForLevel = (lv) => (lv - 1) ** 2 * 6;

export const itemByUid = (g, u) => g.items.find((i) => i.uid === u) || null;

export function equipped(g) {
  return SLOTS.map(([slot]) => itemByUid(g, g.equip[slot])).filter(Boolean);
}

// 装備の「強さ」：魔王軍はいちばん強いものを狙う
export function itemPower(inst) {
  const d = ITEMS[inst.id];
  if (!d || d.starter) return 0;
  const cost = Object.values(d.cost || {}).reduce((a, b) => a + b, 0);
  return cost + inst.plus * 6 + (d.slot === 'relic' ? 40 : 0);
}

export function itemLabel(inst) {
  const d = ITEMS[inst.id];
  return `${d.name}${inst.plus ? ` +${inst.plus}` : ''}`;
}

// 装備からビルドの数値をまとめる
export function buildStats(g) {
  const s = {
    atk: 3 + Math.floor(levelOf(g) * 0.3),
    hits: 1, burn: 0, burnMul: 1, poison: 0, poisonMul: 1,
    crit: 0.05, critMul: 2, dmg: 0, night: 0, shield: 0, resonance: 0, dual: 1,
    pierce: false, sure: false, area: false, resist: false,
    tags: new Set(),
  };
  for (const inst of equipped(g)) {
    const d = ITEMS[inst.id];
    s.atk += (d.atk || 0) + (d.slot === 'weapon' ? inst.plus : 0);
    if (d.slot !== 'weapon') s.dmg += inst.plus * 0.03;
    s.hits += d.hits || 0;
    s.burn += d.burn || 0;
    s.burnMul *= d.burnMul || 1;
    s.poison += d.poison || 0;
    s.poisonMul *= d.poisonMul || 1;
    s.crit += d.crit || 0;
    s.critMul = Math.max(s.critMul, d.critMul || 0);
    s.dmg += d.dmg || 0;
    s.night += d.night || 0;
    s.shield += d.shield || 0;
    s.resonance += d.resonance || 0;
    if (d.dual) s.dual = Math.max(s.dual, d.dual);
    if (d.pierce) s.pierce = true;
    if (d.sure) s.sure = true;
    if (d.area) s.area = true;
    if (d.resist) s.resist = true;
    d.tags.forEach((t) => s.tags.add(t));
  }
  s.dmg += s.night * Math.floor((g.stars || 0) / 10);
  s.dmg += s.resonance * s.tags.size;
  if (s.dual > 1 && s.burn > 0 && s.poison > 0) {
    s.burnMul *= s.dual;
    s.poisonMul *= s.dual;
  }
  s.crit = Math.min(0.75, s.crit);
  return s;
}

// 発動中のシナジー（画面で「何が効いているか」を見せる）
export function synergies(g) {
  const s = buildStats(g);
  const out = [];
  if (s.burn && s.hits > 1) out.push(`炎×連撃：1行動で火傷が${s.burn * s.hits}つ積もる`);
  if (s.burn && s.burnMul > 1) out.push(`火傷のダメージ ×${+s.burnMul.toFixed(2)}`);
  if (s.poison && s.poisonMul > 1) out.push(`毒のダメージ ×${+s.poisonMul.toFixed(2)}`);
  if (s.dual > 1 && s.burn && s.poison) out.push('泥の心臓：毒と炎が共鳴');
  if (s.crit >= 0.2) out.push(`会心率 ${Math.round(s.crit * 100)}%（会心は${s.critMul}倍）`);
  if (s.night) out.push(`夜：星10個ごとに+${Math.round(s.night * 100)}%（星${g.stars}個 → 今+${Math.round(s.night * Math.floor(g.stars / 10) * 100)}%）`);
  if (s.resonance) out.push(`共鳴：タグ${s.tags.size}種 → +${Math.round(s.resonance * s.tags.size * 100)}%`);
  if (s.shield) out.push(`盾：材料を奪う襲撃を1日${s.shield}回防ぐ`);
  return out;
}

// 戦闘の計算。minutes 分の集中を1分1行動として、まずモンスター、余りをボスへ
export function simulate(g, { minutes, monsterHp: mHp = 0, seed = 'x' }) {
  const s = buildStats(g);
  const ch = CHAPTERS[g.chapter - 1];
  const traits = new Set(ch ? ch.traits : []);
  const rnd = seeded(seed);
  const acts = Math.max(0, Math.floor(minutes));
  let mLeft = mHp;
  let bLeft = g.bossHp;
  const r = { toMonster: 0, toBoss: 0, direct: 0, burn: 0, poison: 0, crits: 0, miss: 0, skipped: 0, regen: 0, blocked: 0, actions: acts };
  let burnStacks = 0;
  let poisonStacks = 0;
  let hitIdx = 0;
  for (let a = 0; a < acts; a++) {
    const vsBoss = mLeft <= 0;
    if (vsBoss && bLeft <= 0) break;
    let dealt = 0;
    const skip = vsBoss && traits.has('interfere') && !s.resist && a % 3 === 2;
    if (skip) {
      r.skipped++;
    } else {
      for (let h = 0; h < s.hits; h++) {
        hitIdx++;
        if (vsBoss && traits.has('evasion') && !s.sure && (hitIdx % 5 === 1 || hitIdx % 5 === 3)) {
          r.miss++;
          continue;
        }
        let d = s.atk * (1 + s.dmg);
        if (rnd() < s.crit) {
          d *= s.critMul;
          r.crits++;
        }
        if (vsBoss && traits.has('armor') && !s.pierce) {
          r.blocked += d / 2;
          d /= 2;
        }
        dealt += d;
        r.direct += d;
        burnStacks = Math.min(STACK_CAP, burnStacks + s.burn);
      }
      poisonStacks = Math.min(STACK_CAP, poisonStacks + s.poison);
    }
    const bd = burnStacks * 1 * s.burnMul;
    const pd = poisonStacks * 1.5 * s.poisonMul;
    dealt += bd + pd;
    r.burn += bd;
    r.poison += pd;
    if (vsBoss && traits.has('swarm') && !s.area) dealt *= 0.35;
    if (vsBoss && traits.has('regen') && poisonStacks === 0) {
      r.regen += dealt / 2;
      dealt /= 2;
    }
    dealt = Math.max(0, dealt);
    if (!vsBoss) {
      const use = Math.min(mLeft, dealt);
      mLeft -= use;
      r.toMonster += use;
      dealt -= use;
    }
    if (dealt > 0) {
      const use = Math.min(bLeft, dealt);
      bLeft -= use;
      r.toBoss += use;
    }
  }
  ['toMonster', 'toBoss', 'direct', 'burn', 'poison', 'regen', 'blocked'].forEach((k) => (r[k] = Math.round(r[k])));
  r.bossLeft = Math.round(bLeft);
  return r;
}

export const isUnlocked = (g, id) => {
  const d = ITEMS[id];
  return d && !d.starter && d.unlock[1](g);
};

export function canAfford(g, cost) {
  return Object.entries(cost).every(([k, v]) => (g.mats[k] || 0) >= v);
}

export function pay(g, cost) {
  Object.entries(cost).forEach(([k, v]) => (g.mats[k] -= v));
}

export function craft(g, id) {
  const d = ITEMS[id];
  if (!isUnlocked(g, id) || !canAfford(g, d.cost)) return null;
  pay(g, d.cost);
  const inst = { uid: `i${g.seq++}`, id, plus: 0 };
  g.items.push(inst);
  return inst;
}

export function upgrade(g, u) {
  const inst = itemByUid(g, u);
  if (!inst || ITEMS[inst.id].starter || inst.plus >= MAX_PLUS) return false;
  const c = upgradeCost(inst.plus);
  if (!canAfford(g, c)) return false;
  pay(g, c);
  inst.plus++;
  return true;
}

export function equip(g, slot, u) {
  const inst = u ? itemByUid(g, u) : null;
  if (u && (!inst || ITEMS[inst.id].slot !== slotKind(slot))) return false;
  // 同じ装備を2つの枠に付けない
  if (u) SLOTS.forEach(([sl]) => { if (g.equip[sl] === u) g.equip[sl] = null; });
  g.equip[slot] = u || null;
  if (!g.equip.weapon) g.equip.weapon = g.items.find((i) => i.id === 'wood')?.uid || null;
  if (!g.equip.armor) g.equip.armor = g.items.find((i) => i.id === 'cloth')?.uid || null;
  return true;
}

export function addLog(g, kind, text, t = Date.now()) {
  g.log.unshift({ t, kind, text });
  if (g.log.length > 300) g.log.length = 300;
}

function removeItem(g, u) {
  g.items = g.items.filter((i) => i.uid !== u);
  SLOTS.forEach(([sl]) => { if (g.equip[sl] === u) g.equip[sl] = null; });
  equip(g, 'weapon', g.equip.weapon);
}

function stealMats(g, ratio) {
  const lost = {};
  for (const k of Object.keys(g.mats)) {
    const n = Math.floor(g.mats[k] * ratio);
    if (n > 0) {
      g.mats[k] -= n;
      lost[k] = n;
    }
  }
  return lost;
}

const matsText = (m) => Object.entries(m).map(([k, v]) => `${MATS[k]}${v}`).join('・') || 'なし';

// 魔王軍に負けた時。kind: minor（材料の一部）/ major（いちばん強い装備）/ run（周回終了）
export function defeat(g, kind, reason, dayKeyStr, t = Date.now()) {
  if (kind === 'minor') {
    const s = buildStats(g);
    if (g.shieldUse.day !== dayKeyStr) g.shieldUse = { day: dayKeyStr, n: 0 };
    if (g.shieldUse.n < s.shield) {
      g.shieldUse.n++;
      addLog(g, 'block', `${reason}。盾が襲撃を防いだ`, t);
      return { kind, blocked: true, text: '盾が襲撃を防いだ。何も奪われなかった' };
    }
    const lost = stealMats(g, 0.3);
    if (!Object.keys(lost).length) {
      addLog(g, 'lose', `${reason}。魔王軍が来たが、奪える材料はなかった`, t);
      return { kind, lost, text: '魔王軍が材料を奪いに来たが、奪えるものはなかった' };
    }
    addLog(g, 'lose', `${reason}。材料を奪われた（${matsText(lost)}）`, t);
    return { kind, lost, text: `材料を奪われた：${matsText(lost)}` };
  }
  if (kind === 'major') {
    const cands = equipped(g).filter((i) => itemPower(i) > 0).sort((a, b) => itemPower(b) - itemPower(a));
    if (cands.length) {
      const it = cands[0];
      const name = itemLabel(it);
      removeItem(g, it.uid);
      addLog(g, 'lose', `${reason}。「${name}」が奪われ、消えた`, t);
      return { kind, item: name, text: `「${name}」が奪われ、消えた` };
    }
    const lost = stealMats(g, 0.5);
    addLog(g, 'lose', `${reason}。装備がないので材料の半分を奪われた（${matsText(lost)}）`, t);
    return { kind, lost, text: `奪える装備がなかったので、材料の半分を奪われた：${matsText(lost)}` };
  }
  // 周回終了：装備と材料をすべて失い、章の最初からやり直し
  const kept = { level: levelOf(g), stars: g.stars, cleared: g.cleared.length };
  g.runs.push({ run: g.run, endedAt: t, chapter: g.chapter, reason });
  g.run++;
  g.items = g.items.filter((i) => ITEMS[i.id].starter);
  g.equip = { weapon: g.items.find((i) => i.id === 'wood').uid, armor: g.items.find((i) => i.id === 'cloth').uid, acc1: null, acc2: null, relic: null };
  Object.keys(g.mats).forEach((k) => (g.mats[k] = 0));
  g.bossHp = CHAPTERS[g.chapter - 1].hp;
  addLog(g, 'run', `${reason}。周回${g.run - 1}が終わった。装備と材料をすべて失った`, t);
  return { kind, kept, text: `周回${g.run - 1}が終わった。装備と材料をすべて失い、${g.chapter}章の最初からやり直し` };
}

// ボスを倒したら次の章へ
export function checkBoss(g, t = Date.now()) {
  if (g.bossHp > 0 || g.victory) return null;
  const ch = CHAPTERS[g.chapter - 1];
  g.cleared.push(g.chapter);
  addLog(g, 'boss', `${ch.boss}を倒した。遺物のレシピを手に入れた`, t);
  if (g.chapter >= CHAPTERS.length) {
    g.victory = t;
    return { final: true, boss: ch.boss };
  }
  g.chapter++;
  g.bossHp = CHAPTERS[g.chapter - 1].hp;
  return { final: false, boss: ch.boss, next: CHAPTERS[g.chapter - 1] };
}

// 新しく解放されたレシピ（前後を比べて差分を返す）
export function unlockedIds(g) {
  return Object.keys(ITEMS).filter((id) => isUnlocked(g, id));
}
