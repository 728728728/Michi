// このアプリについて（バージョンと変更点）
import { APP_VERSION, APP_VERSION_DATE, APP_CHANGES } from '../version.js';
import { esc } from '../util.js';

export const title = 'このアプリについて';

export function render() {
  return `<div class="win gold"><h2>Michi v${APP_VERSION}</h2><p class="small muted">${APP_VERSION_DATE}</p>
    <p class="small">本人専用のスマホロックと、習慣をつなぎ替えるための育成RPG。記録はすべてこの端末の Safari の中にだけ保存され、どこにも送られない。</p></div>
  ${Object.entries(APP_CHANGES).map(([v, list]) => `<div class="win"><h3>v${esc(v)}</h3><ul class="list small">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
  <div class="grid2"><a class="btn" href="#guide">導入ガイド</a><a class="btn" href="#home">拠点へ</a></div>`;
}
