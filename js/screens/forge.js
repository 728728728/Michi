// 鍛冶屋：集中を終えた直後の5分だけ、作る・強化する・付け替えるができる
import { update } from '../store.js';
import * as G from '../game.js';
import { esc, fmtClock } from '../util.js';
import { on, toast } from '../ui.js';

export const title = '鍛冶屋';

export function describe(d) {
  const x = [];
  if (d.atk) x.push(`攻撃+${d.atk}`);
  if (d.hits) x.push(`攻撃回数+${d.hits}`);
  if (d.burn) x.push(`1撃ごとに火傷+${d.burn}`);
  if (d.burnMul) x.push(`火傷ダメージ×${d.burnMul}`);
  if (d.poison) x.push(`毎行動 毒+${d.poison}`);
  if (d.poisonMul) x.push(`毒ダメージ×${d.poisonMul}`);
  if (d.crit) x.push(`会心率+${Math.round(d.crit * 100)}%`);
  if (d.critMul) x.push(`会心が${d.critMul}倍に`);
  if (d.dmg) x.push(`ダメージ+${Math.round(d.dmg * 100)}%`);
  if (d.night) x.push(`星10個ごとに+${Math.round(d.night * 100)}%`);
  if (d.shield) x.push(`材料を奪う襲撃を1日${d.shield}回防ぐ`);
  if (d.resonance) x.push(`タグ1種ごとに+${Math.round(d.resonance * 100)}%`);
  if (d.dual) x.push('毒と火傷が両方あると、どちらも×1.5');
  if (d.pierce) x.push('硬さを無視');
  if (d.sure) x.push('攻撃が必ず当たる');
  if (d.area) x.push('取り巻きごと攻撃');
  if (d.resist) x.push('行動を封じられない');
  return x.join('・');
}

const costText = (g, c) => Object.entries(c).map(([k, v]) => `<span style="color:${(g.mats[k] || 0) >= v ? 'var(--ink)' : 'var(--red)'}">${G.MATS[k]}${v}</span>`).join(' ');

export function render(s) {
  const g = s.game;
  const left = s.forgeUntil - Date.now();
  const open = left > 0;
  const owned = g.items;
  const head = open
    ? `<div class="win gold"><div class="row between"><h2 style="margin:0">鍛冶屋</h2><span class="pix" data-left style="font-size:22px;color:var(--gold)">${fmtClock(left)}</span></div>
       <p class="small" style="margin:4px 0 0">集中を終えた直後の5分だけ開いている。作る・強化する・付け替える。</p></div>`
    : `<div class="win flat"><h2>鍛冶屋（閉店中）</h2><p class="small">集中を終えると5分だけ開く。今は見るだけ。</p>
       <a class="btn block" href="#focus">集中する</a></div>`;

  const mats = `<div class="win"><h3>材料</h3><div class="mats">${Object.entries(G.MATS).map(([k, n]) => `<span>${n} <b>${g.mats[k] || 0}</b></span>`).join('')}</div></div>`;

  const slots = `<div class="win"><h3>装備</h3>${G.SLOTS.map(([slot, label]) => {
    const kind = G.slotKind(slot);
    const cands = owned.filter((i) => G.ITEMS[i.id].slot === kind);
    const cur = g.equip[slot];
    return `<div class="equip-row"><span class="slot">${label}</span>
      ${open ? `<select data-slot="${slot}" aria-label="${label}">${kind === 'acc' || kind === 'relic' ? '<option value="">なし</option>' : ''}${cands.map((i) => `<option value="${i.uid}" ${i.uid === cur ? 'selected' : ''}>${esc(G.itemLabel(i))}</option>`).join('')}</select>`
        : `<span class="item-name">${cur ? esc(G.itemLabel(G.itemByUid(g, cur))) : '－'}</span>`}
      <span></span></div>`;
  }).join('')}
    <div class="small" style="margin-top:8px;color:var(--green)">${G.synergies(g).map((x) => `◆ ${esc(x)}`).join('<br>') || '<span class="muted">発動中のシナジーなし</span>'}</div></div>`;

  const inv = `<div class="win"><h3>持ち物</h3>${owned.filter((i) => !G.ITEMS[i.id].starter).map((i) => {
    const d = G.ITEMS[i.id];
    const cost = G.upgradeCost(i.plus);
    const max = i.plus >= G.MAX_PLUS;
    return `<div class="recipe"><div class="row between"><span class="item-name">${esc(G.itemLabel(i))}</span><span>${d.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</span></div>
      <div class="tiny muted">${esc(describe(d))}${d.slot === 'weapon' ? '・強化1回で攻撃+1' : '・強化1回でダメージ+3%'}</div>
      ${open && !max ? `<div class="row between" style="margin-top:4px"><span class="tiny">強化：${costText(g, cost)}</span><button class="btn small" data-up="${i.uid}" ${G.canAfford(g, cost) ? '' : 'disabled'}>+${i.plus + 1}にする</button></div>` : ''}
      ${max ? '<div class="tiny okmark">最大まで強化済み</div>' : ''}</div>`;
  }).join('') || '<p class="small muted">まだ作った装備はない。</p>'}</div>`;

  const ids = Object.keys(G.ITEMS).filter((id) => !G.ITEMS[id].starter);
  const unlocked = ids.filter((id) => G.isUnlocked(g, id));
  const locked = ids.filter((id) => !G.isUnlocked(g, id));
  const recipe = (id, isOpen) => {
    const d = G.ITEMS[id];
    const kind = { weapon: '武器', armor: '防具', acc: '装飾', relic: '遺物' }[d.slot];
    return `<div class="recipe ${isOpen ? '' : 'locked'}"><div class="row between"><span class="item-name">${esc(d.name)} <span class="tiny muted">${kind}</span></span><span>${d.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</span></div>
      <div class="tiny muted">${esc(describe(d))}</div>
      ${isOpen ? `<div class="row between" style="margin-top:4px"><span class="tiny">${costText(g, d.cost)}</span>${open ? `<button class="btn small" data-make="${id}" ${G.canAfford(g, d.cost) ? '' : 'disabled'}>作る</button>` : ''}</div>`
        : `<div class="tiny">解放：${esc(d.unlock[0])}</div>`}</div>`;
  };
  const recipes = `<div class="win"><h3>レシピ帳（${unlocked.length}/${ids.length}）</h3>${unlocked.map((id) => recipe(id, true)).join('')}${locked.map((id) => recipe(id, false)).join('')}</div>`;

  return head + mats + slots + inv + recipes;
}

export function bind(root, s, app) {
  const isOpen = () => s.forgeUntil - Date.now() > 0;
  on(root, '[data-make]', 'click', (e, el) => {
    if (!isOpen()) return app.render();
    const inst = update((st) => G.craft(st.game, el.dataset.make));
    if (inst) toast(`${G.ITEMS[inst.id].name}を作った`);
    app.render();
  });
  on(root, '[data-up]', 'click', (e, el) => {
    if (!isOpen()) return app.render();
    const ok = update((st) => G.upgrade(st.game, el.dataset.up));
    if (ok) toast('強化した');
    app.render();
  });
  on(root, '[data-slot]', 'change', (e, el) => {
    if (!isOpen()) return app.render();
    update((st) => G.equip(st.game, el.dataset.slot, el.value || null));
    app.render();
  });
}

export function tick(root, s, app) {
  const el = root.querySelector('[data-left]');
  if (!el) return;
  const left = s.forgeUntil - Date.now();
  if (left <= 0) app.render();
  else el.textContent = fmtClock(left);
}
