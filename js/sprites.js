// ドット絵（SVG の 1px 四角で描く）
import { ITEMS } from './game.js';

const SPR = {
  hero: [
    '....hhhh....',
    '...hhhhhh...',
    '...hssssh..w',
    '...hskssk..w',
    '....ssss...w',
    '..ccaaaac..w',
    '..caaaaaasss',
    '..caayaac..w',
    '...aaaaa....',
    '...aa.aa....',
    '...bb.bb....',
    '..bbb.bbb...',
  ],
  golem: [
    '...gggggg...',
    '..gggggggg..',
    '..ggrggrgg..',
    '.gggggggggg.',
    'ggg.gggg.ggg',
    'gg..gggg..gg',
    '....gggg....',
    '...gg..gg...',
    '..ggg..ggg..',
  ],
  worm: [
    '......pppp..',
    '.....ppkppk.',
    '.....pppppp.',
    '..pp..pppp..',
    '.pppp..pp...',
    'pp..pppp....',
    'p....pp.....',
  ],
  slime: [
    '....tttt....',
    '..tttttttt..',
    '.ttkttttktt.',
    '.tttttttttt.',
    'tttttwwttttt',
    'tttttttttttt',
    '.tttttttttt.',
  ],
  gear: [
    '..m.mmmm.m..',
    '...mmmmmm...',
    '.mmmkmmkmmm.',
    '..mmmmmmmm..',
    '.mmm.mm.mmm.',
    '..m.mmmm.m..',
    '...mm..mm...',
  ],
  owl: [
    '.....oo....oo.....',
    '....oooooooooo....',
    '...ooyyooooyyoo...',
    '...ooykooookyoo...',
    '...oooooqqooooo...',
    '..oooooooooooooo..',
    '.ooo.oooooooo.ooo.',
    'oo...oooooooo...oo',
    '.....oooooooo.....',
    '......oo..oo......',
    '......q....q......',
  ],
  mud: [
    '......mmmmm.......',
    '....mmmmmmmmm.....',
    '...mmrmmmmmrmm....',
    '...mmmmmmmmmmm....',
    '..mmmmkkkkkmmmm...',
    '.mmmmmmmmmmmmmmm..',
    'mm.mmmmmmmmmmm.mm.',
    'm..mmmmmmmmmmm..m.',
    '...mmmm...mmmm....',
    '..mmmmm...mmmmm...',
  ],
  bee: [
    '..ww......ww......',
    '.wwww....wwww.....',
    '..wwyyyyyyww......',
    '....ykkykkyy......',
    '...yyyyyyyyyy.....',
    '...kkkkkkkkkk.....',
    '...yyyyyyyyyy.....',
    '....kkkkkkkk......',
    '.....yyyyyy.......',
    '.......kk.........',
  ],
  siren: [
    '......ffff........',
    '.....ffssff.......',
    '....ffskskff......',
    '....ff.ss.ff......',
    '....fppppppf......',
    '...p.pppppp.p.....',
    '.....tttttt.......',
    '....tttttttt......',
    '...tttt..tttt.....',
    '..ttt......ttt....',
  ],
  sand: [
    '....y..y..y.......',
    '....yyyyyyy.......',
    '...sssssssss......',
    '..sssrsssrsss.....',
    '..sssssssssss.....',
    '.sssssskkssssss...',
    'ssss.sssssss.ssss.',
    'sss..sssssss..sss.',
    '.....sss.sss......',
    '....ssss.ssss.....',
  ],
  fog: [
    '...ccccccccc......',
    '..ccccccccccc.....',
    '.cccwwcccwwccc....',
    '.ccckwcccckwcc....',
    'cccccccccccccc....',
    'ccc.cccccccc.cc...',
    'cc..cccccccc..c...',
    '....cccccccc......',
    '...ccc....ccc.....',
    '..cc........cc....',
  ],
  king: [
    '...y.y.y.y.y......',
    '...yyyyyyyyy......',
    '..kkkkkkkkkkk.....',
    '..kkrkkkkkrkk.....',
    '..kkkkkkkkkkk.....',
    '.ppkkkkkkkkkpp....',
    'pppkkkwwwkkkppp...',
    'pp.kkkkkkkkk.pp...',
    '...kkkkkkkkk......',
    '..kkkk...kkkk.....',
  ],
};

const PAL = {
  hero: { h: '#633806', s: '#F5C4B3', k: '#2C2C2A', y: '#FAC775', b: '#444441' },
  golem: { g: '#888780', r: '#E24B4A' },
  worm: { p: '#7F77DD', k: '#26215C' },
  slime: { t: '#1D9E75', k: '#04342C', w: '#9FE1CB' },
  gear: { m: '#BA7517', k: '#412402' },
  owl: { o: '#5F5E5A', y: '#FAC775', k: '#2C2C2A', q: '#BA7517' },
  mud: { m: '#6b5a2e', r: '#E24B4A', k: '#2c2414' },
  bee: { w: '#B5D4F4', y: '#EF9F27', k: '#2C2C2A' },
  siren: { f: '#5DCAA5', s: '#F4C0D1', k: '#26215C', p: '#D4537E', t: '#185FA5' },
  sand: { y: '#FAC775', s: '#c9a25a', r: '#A32D2D', k: '#633806' },
  fog: { c: '#B4B2A9', w: '#F1EFE8', k: '#2C2C2A' },
  king: { y: '#FAC775', k: '#2a1240', r: '#E24B4A', p: '#534AB7', w: '#B5D4F4' },
};

// 装備で勇者の色が変わる
function heroPal(g) {
  const w = g.items.find((i) => i.uid === g.equip.weapon);
  const a = g.items.find((i) => i.uid === g.equip.armor);
  const wt = w ? ITEMS[w.id].tags : [];
  const at = a ? ITEMS[a.id].tags : [];
  const pick = (tags, map, def) => map[tags.find((t) => map[t])] || def;
  const blade = pick(wt, { 炎: '#EF9F27', 毒: '#97C459', 連撃: '#B5D4F4', 夜: '#AFA9EC', 貫通: '#F1EFE8', 必中: '#5DCAA5' }, w && w.id !== 'wood' ? '#D3D1C7' : '#a07a4a');
  const armor = pick(at, { 夜: '#534AB7', 盾: '#5F5E5A', 炎: '#A32D2D', 耐性: '#0F6E56' }, a && a.id !== 'cloth' ? '#378ADD' : '#8a7a5a');
  const cape = g.equip.relic ? '#E24B4A' : '#A32D2D';
  return { ...PAL.hero, w: blade, a: armor, c: cape };
}

function draw(rows, pal, ox, oy, flip = false) {
  let out = '';
  const w = rows[0].length;
  rows.forEach((r, y) => {
    [...r].forEach((c, x) => {
      const col = pal[c];
      if (col) out += `<rect x="${ox + (flip ? w - 1 - x : x)}" y="${oy + y}" width="1" height="1" fill="${col}"/>`;
    });
  });
  return out;
}

export const FAMILY_SPR = { golem: 'golem', worm: 'worm', slime: 'slime', gear: 'gear' };

// 拠点の場面。monsters: [{family, alive}]
export function sceneSvg({ g, chapter, monsters = [], bossRatio = 1, stars = 0, cls = '' }) {
  const W = 160;
  const H = 96;
  let h = `<rect width="${W}" height="${H}" fill="${chapter.sky}"/>`;
  // 星：守った夜の数（最大80個まで描く）
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < Math.min(80, stars); i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * 40);
    h += `<rect x="${x}" y="${y}" width="1" height="1" fill="${i % 7 === 0 ? '#FAC775' : '#FAEEDA'}"/>`;
  }
  h += draw(['..mmm', '.mm..', 'mm...', 'mm...', 'mm...', '.mm..', '..mmm'], { m: '#FAC775' }, 141, 5);
  // 遠くの魔王城（章が進むほど近づく）
  const sc = 0.5 + chapter.n * 0.12;
  const cx = 104;
  const base = 58;
  [[0, -14, 40, 14], [4, -22, 6, 8], [17, -28, 8, 14], [30, -22, 6, 8], [19, -32, 4, 4]].forEach(([x, y, w, hh]) => {
    h += `<rect x="${(cx + x * sc).toFixed(1)}" y="${(base + y * sc).toFixed(1)}" width="${(w * sc).toFixed(1)}" height="${(hh * sc).toFixed(1)}" fill="#26215C"/>`;
  });
  h += `<rect x="${(cx + 20 * sc).toFixed(1)}" y="${(base - 24 * sc).toFixed(1)}" width="${(2 * sc).toFixed(1)}" height="${(2 * sc).toFixed(1)}" fill="#E24B4A"/>`;
  h += `<rect x="0" y="58" width="${W}" height="38" fill="${chapter.ground}"/><rect x="0" y="58" width="${W}" height="2" fill="#27500A" opacity=".7"/>`;
  for (let i = 0; i < 9; i++) {
    const x = i * 18 + 2;
    h += `<rect x="${x + 3}" y="51" width="6" height="7" fill="#27500A" opacity=".8"/><rect x="${x + 5}" y="57" width="2" height="3" fill="#444441"/>`;
  }
  // 勇者
  h += draw(SPR.hero, heroPal(g), 14, 66);
  // 今日のモンスター
  monsters.slice(0, 3).forEach((m, i) => {
    const x = 40 + i * 20;
    const y = 72 + (i % 2) * 6;
    if (m.alive) h += draw(SPR[FAMILY_SPR[m.family]] || SPR.slime, PAL[FAMILY_SPR[m.family]] || PAL.slime, x, y);
    else h += `<rect x="${x + 4}" y="${y + 3}" width="3" height="5" fill="#888780"/><rect x="${x + 3}" y="${y + 4}" width="5" height="1" fill="#888780"/>`;
  });
  // 章のボス
  if (bossRatio > 0) {
    h += draw(SPR[chapter.sprite], PAL[chapter.sprite], 132, 64, true);
    h += `<rect x="128" y="88" width="26" height="3" fill="#0C447C"/><rect x="128" y="88" width="${(26 * bossRatio).toFixed(1)}" height="3" fill="#7F77DD"/>`;
  } else {
    h += `<rect x="138" y="80" width="10" height="2" fill="#FAC775"/>`;
  }
  return `<svg class="scene ${cls}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${chapter.place}の場面">${h}</svg>`;
}

export function spriteSvg(name, size = 48) {
  const rows = SPR[name];
  if (!rows) return '';
  const w = rows[0].length;
  return `<svg class="spr" viewBox="0 0 ${w} ${rows.length}" width="${size}" height="${Math.round((size * rows.length) / w)}" shape-rendering="crispEdges" aria-hidden="true">${draw(rows, PAL[name], 0, 0)}</svg>`;
}

export function heroSvg(g, size = 48) {
  const rows = SPR.hero;
  return `<svg class="spr" viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${draw(rows, heroPal(g), 0, 0)}</svg>`;
}
