// 導入（初日に約40分）：契約 → 脳の仕組み → 旅のルール → ショートカット → オートメーション → 動作テスト → スクリーンタイム → パスコード → 最初の朝
import { update, state, replaceAll } from '../store.js';
import * as R from '../rules.js';
import { esc, dayKey } from '../util.js';
import { on, $, $$, toast, ask } from '../ui.js';
import { shortcutSteps, automationSteps, homeIconSteps, screenTimeSteps, troubleshoot, bindCopy } from './guide.js';
import { heroSvg, spriteSvg } from '../sprites.js';

export const title = '導入';
export const nav = false;

const STEPS = ['ようこそ', '契約', '脳の仕組み', '旅のルール', 'ショートカット', 'オートメーション', '動作テスト', 'スクリーンタイム', 'パスコード', '最初の朝'];

const CHECKS = [
  ['open_youtube', 'YouTube を開いたら、ここへ飛んできた'],
  ['closed_youtube', 'YouTube を閉じたら、ここへ飛んできた'],
  ['open_game', 'ゲームを開いたら、ここへ飛んできた'],
  ['closed_game', 'ゲームを閉じたら、ここへ飛んできた'],
  ['pass', '通行証を出したら、飛ばされずに開けた（閉じた時に番号が届いた）'],
];

function progress(step) {
  return `<div class="progress" aria-label="${step + 1}/${STEPS.length}">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="tiny muted pix">${step + 1}/${STEPS.length} ${STEPS[step]}</p>`;
}

const nextBtns = (label = '次へ', back = true) => `<div class="btns">${`<button class="btn primary block" data-next>${label}</button>`}${back ? '<button class="btn ghost block" data-back>戻る</button>' : ''}</div>`;

function testBanner(s) {
  const n = s.notice;
  if (!n || n.kind !== 'test' || Date.now() - n.t > 10 * 60000) return '';
  const what = { open: '開いた', closed: '閉じた', morning: '朝のオートメーション' }[n.ev] || n.ev;
  return `<div class="win green"><p class="pix">テスト成功：${esc(n.app || '')} を${what}時に、ここへ飛んできた</p></div>`;
}

const steps = [
  // 0 ようこそ
  (s) => `<div class="win gold center">${heroSvg(s.game, 72)}<h1 style="margin-top:8px">Michi</h1>
      <p>YouTube やゲームの「気づいたら開いている」を、仕組みで断つためのアプリ。</p></div>
    <div class="win"><h3>これから約40分でやること</h3><ol class="steps small">
      <li>なぜやめたいかを、自分の言葉で書く</li><li>脳の仕組みと、このアプリのルールを知る</li>
      <li>iPhone のショートカットとオートメーションを作る（いちばん時間がかかる）</li>
      <li>本当に動くかテストする</li><li>スクリーンタイムを設定し、パスコードを封印する</li></ol>
      <p class="small muted">途中でやめても、続きから再開できる。</p></div>
    <div class="win flat"><h3>データが消えて、やり直す時</h3><p class="small">見直し日に書き出したバックアップから戻せる。</p>
      <input type="file" id="imp" accept="application/json,.json" aria-label="バックアップを選ぶ"></div>
    ${nextBtns('始める', false)}`,

  // 1 契約
  (s) => `<div class="win gold"><h2>契約</h2><p class="small">ここで書いた言葉は、介入画面や見直し日に出てくる。衝動に負けそうな時の自分に向けて書く。</p></div>
    <div class="win">
      <label class="f" for="cw">なぜ YouTube やゲームをやめたい？</label><textarea id="cw" placeholder="気づくと2時間たっていて、やるべきことに手をつけられない自分が嫌だから">${esc(s.contract.why)}</textarea>
      <label class="f" for="cr">取り戻した時間で何をしたい？</label><textarea id="cr" placeholder="就活をやり切る。作りたいアプリを完成させる">${esc(s.contract.reclaim)}</textarea>
      <label class="f" for="ci">半年後、どんな自分になっていたい？</label><textarea id="ci" placeholder="スマホに支配されず、自分で時間を決められる人">${esc(s.contract.ideal)}</textarea>
    </div>
    <div class="win"><h3>もし〜したら、こうする</h3><p class="small muted">きっかけと行動を先に決めておくと、迷う前に体が動く（実行意図）。</p>
      <label class="f" for="cn">夜、布団に入ったら</label><input type="text" id="cn" value="${esc(s.contract.night)}" placeholder="スマホを充電器に置いて、目覚ましだけ確認する">
      <label class="f" for="ce">作業から逃げたくなったら</label><input type="text" id="ce" value="${esc(s.contract.escape)}" placeholder="次の一歩を「2分だけ」に小さくする">
      <label class="f" for="ca">不安・疲れた時は</label><input type="text" id="ca" value="${esc(s.contract.anxious)}" placeholder="気持ちを1行書いて、水を飲む">
      <div class="err" id="cerr" hidden>「なぜやめたいか」だけは書いてください</div>
    </div>
    ${nextBtns('この言葉で誓う')}`,

  // 2 脳の仕組み
  () => `<div class="win gold"><h2>脳の仕組み</h2><p class="small">意志で我慢するのではなく、仕組みで衝動を空振りさせる。</p></div>
    <div class="win"><h3>1. 習慣は自動運転</h3><p class="small">「きっかけ → 行動 → 報酬」を繰り返すと、考える前に指が動くようになる。だから行動の手前に、必ず60秒の壁を挟む。</p></div>
    <div class="win"><h3>2. 消さずに、つなぎ替える</h3><p class="small">逃げたい・不安・疲れた、というきっかけは消えない。同じきっかけに「吐き出す」「2分だけやる」をつなぐ。繰り返すほど新しい回路が太くなる。</p></div>
    <div class="win"><h3>3. 衝動は波</h3><p class="small">衝動は上がって、何もしなければ数分で引く。介入画面の60秒は、波が引くのを待つ時間。</p></div>
    <div class="win"><h3>4. 夜の脳は戦えない</h3><p class="small">疲れた夜は、自分を止める前頭前野がいちばん弱い。だから夜は判断させずに、OSの仕組みで完全にロックする。</p></div>
    <div class="win"><h3>5. 報酬は確実で地味に</h3><p class="small">「出るか分からない報酬」は YouTube と同じ仕組みで脳を引っかける。このアプリの育成は、やった分だけ確実に育つ。</p></div>
    <div class="win red"><h3>最初の2週間</h3><p class="small">3〜10日目ごろ、衝動が一時的に強くなることがある（消去バースト）。報酬が来ないことへの脳の抵抗で、効いているサイン。ここを越えると衝動は減っていく。</p></div>
    ${nextBtns('分かった')}`,

  // 3 旅のルール
  (s) => `<div class="win gold center"><h2>旅のルール</h2>${heroSvg(s.game, 48)} <span class="pix muted">⚔</span> ${spriteSvg('king', 64)}
      <p class="small">魔王「無限の画面」を倒す旅。最終ゴールは「スマホに支配されない自分」。</p></div>
    <div class="win"><h3>攻める</h3><p class="small">朝に決めた「やること」がモンスターになる。集中している間、勇者が自動で戦う。とどめは、現実で完了した時だけ。材料を集めて、鍛冶屋で装備を作る。</p></div>
    <div class="win"><h3>守る</h3><p class="small">YouTube とゲームは魔王軍。介入画面で引き返すと迎撃成功（魔の欠片）。</p>
      <ul class="list small"><li>持ち時間を5分未満超えた → 材料の一部を奪われる</li><li>5分以上超えた・ショートを見た・介入画面を通らずに通った → いちばん強い装備が消える</li><li class="k-lose">夜のロックを破った → 周回が終わる。装備と材料をすべて失い、章の最初から</li></ul></div>
    <div class="win"><h3>持ち時間</h3><p class="small">作業した分だけ、娯楽の持ち時間が貯まる。最初の2週間は 2:1、次の2週間は 3:1、そのあとは 4:1。休日は1段階ゆるい。1日の上限は平日${s.settings.capWeekday}分・休日${s.settings.capHoliday}分。持ち時間が0なら、どんな日でも開かない。</p></div>
    <div class="win"><h3>見直し日</h3><p class="small">ルールを緩められるのは、週1回の見直し日（日曜 19:00〜22:00）だけ。厳しくする変更はいつでもできる。</p></div>
    ${nextBtns('受け入れる')}`,

  // 4 ショートカット
  (s) => `${testBanner(s)}<div class="win">${shortcutSteps()}</div>
    <div class="win"><h3>試す</h3><p class="small">作れたら、下のボタンでテスト用の通行証（2分）を出す。「ショートカットを開きますか？」と聞かれたら「開く」。通知が出れば成功。</p>
      <button class="btn block" id="testpass">テスト用の通行証を出す</button>
      ${s.onboarding.testToken ? '<p class="small okmark" style="margin-top:6px">テスト用の通行証を出した。動作テストの段階で確かめる。</p>' : ''}</div>
    <div class="win">${homeIconSteps()}</div>
    ${nextBtns()}`,

  // 5 オートメーション
  (s) => `${testBanner(s)}<div class="win">${automationSteps()}</div>${nextBtns('6つ作った')}`,

  // 6 動作テスト
  (s) => {
    const c = s.onboarding.checks;
    const all = CHECKS.every(([k]) => c[k]);
    return `${testBanner(s)}<div class="win gold"><h2>動作テスト</h2>
      <p class="small">実際に開いたり閉じたりして、ここへ飛んでくるか確かめる。飛んできたら、自動で✓がつく。</p></div>
      <div class="win"><ol class="steps small">
        <li>YouTube を開く → ここへ飛んでくる</li>
        <li>もう一度 YouTube に戻って、ホームに戻る（閉じる）→ ここへ飛んでくる</li>
        <li>ゲームでも同じことをする</li>
        <li>下のボタンでテスト用の通行証を出す → YouTube を開く → 今度は飛ばされずに開ける → ホームに戻ると、ここへ飛んでくる</li>
      </ol></div>
      <div class="win">${CHECKS.map(([k, l]) => `<div class="check">${c[k] ? '<span class="okmark">✓</span>' : '<span class="ngmark">・</span>'}<span class="small">${l}</span></div>`).join('')}
        ${c.passFail ? '<p class="small" style="color:var(--red)">通行証があるのに飛ばされた。「If」の条件を確認して、もう一度通行証を出して試す。</p>' : ''}
        <button class="btn block" id="testpass" style="margin-top:8px">テスト用の通行証を出す（2分）</button></div>
      ${all ? nextBtns('すべて確認できた') : `<div class="btns"><button class="btn primary block" disabled>すべて✓になると進める</button><button class="btn ghost block" data-back>戻る</button></div>
      <details class="win flat"><summary class="small muted" style="min-height:32px;cursor:pointer">うまくいかない時</summary>${troubleshoot()}
        <button class="btn ghost block" id="skip" style="margin-top:8px">未確認のまま進む（記録に残る）</button></details>`}`;
  },

  // 7 スクリーンタイム
  (s) => `<div class="win gold"><h2>スクリーンタイム</h2><p class="small">夜の完全ロック・Webの YouTube・新しいアプリのインストールを、OS の仕組みで止める。パスコードはまだ設定しない（次の段階で、このアプリが作る）。</p></div>
    <div class="win">${screenTimeSteps()}
      <div style="margin-top:8px">${[1, 2, 3, 4, 5].map((i) => `<label class="check"><input type="checkbox" data-st="${i}" ${s.onboarding.checks[`st${i}`] ? 'checked' : ''}><span class="small">手順${i}をやった</span></label>`).join('')}</div>
      <div class="err" id="sterr" hidden>手順1〜5をすべてやってから進んでください</div></div>
    ${nextBtns('設定した')}`,

  // 8 パスコード
  (s) => {
    const v = s.vault;
    if (v.code && !v.pending) {
      return `<div class="win green"><h2>封印した</h2><p class="small">パスコードは見直し日にだけ見られる。覚えてしまった時は、見直し日に作り直す。</p></div>${nextBtns()}`;
    }
    return `<div class="win gold"><h2>パスコードの封印</h2>
      <p class="small">自分で知っているパスコードは、結局自分で外せてしまう。このアプリがランダムに作り、封印する。表示は1回だけ。</p></div>
      ${v.pending ? `<div class="win"><div class="passcode">${esc(v.pending)}</div>
        <ol class="steps small"><li>設定 → スクリーンタイム →「スクリーンタイム・パスコードを使用」</li><li>上の4桁を2回入力する</li>
        <li>Apple ID を聞かれたら入力する（本当の緊急時の出口。リセットしたら見直し日に申告する）</li></ol>
        <p class="tiny muted">覚えようとしないこと。数字を見ながら打ったら、すぐ封印する。</p>
        <button class="btn primary block" id="seal">入力した・封印する</button></div>`
        : '<button class="btn primary block" id="gen">パスコードを作る</button>'}
      <div class="btns"><button class="btn ghost block" data-back>戻る</button></div>`;
  },

  // 9 最初の朝
  (s) => `<div class="win gold center"><h2>準備ができた</h2>${heroSvg(s.game, 64)}
      <p>今日から旅が始まる。最初に、今日の「朝の3つ」を決めよう。</p>
      <p class="small muted">夜は ${s.settings.bedStart}〜${s.settings.wake} に完全ロック。見直し日は日曜 ${s.settings.reviewStart}〜${s.settings.reviewEnd}。</p></div>
    ${s.onboarding.skipped ? '<div class="win red"><p class="small">動作テストを確認しないまま進んだ。見直し日に「導入ガイド」で確かめよう。</p></div>' : ''}
    ${nextBtns('旅を始める')}`,
];

export function render(s) {
  const step = Math.min(s.onboarding.step, steps.length - 1);
  return progress(step) + steps[step](s);
}

function go(app, delta) {
  update((st) => { st.onboarding.step = Math.max(0, Math.min(STEPS.length - 1, st.onboarding.step + delta)); });
  app.render();
  window.scrollTo(0, 0);
}

export function bind(root, s, app) {
  bindCopy(root);
  const step = s.onboarding.step;
  on(root, '[data-back]', 'click', () => go(app, -1));
  on(root, '[data-next]', 'click', () => {
    if (step === 1) {
      const why = $('#cw', root).value.trim();
      if (!why) { $('#cerr', root).hidden = false; $('#cw', root).focus(); return; }
      update((st) => Object.assign(st.contract, {
        why, reclaim: $('#cr', root).value.trim(), ideal: $('#ci', root).value.trim(),
        night: $('#cn', root).value.trim(), escape: $('#ce', root).value.trim(), anxious: $('#ca', root).value.trim(), signedAt: Date.now(),
      }));
    }
    if (step === 7) {
      const ok = $$('[data-st]', root).every((el) => el.checked);
      if (!ok) { $('#sterr', root).hidden = false; return; }
    }
    if (step === STEPS.length - 1) {
      update((st) => {
        st.onboarding.done = true;
        st.settings.startDate = dayKey();
        st.nights.checked = dayKey();
        st.notice = null;
      });
      app.go('morning');
      return;
    }
    go(app, 1);
  });
  on(root, '[data-st]', 'change', (e, el) => {
    update((st) => { st.onboarding.checks[`st${el.dataset.st}`] = el.checked; });
  });
  $('#testpass', root)?.addEventListener('click', () => {
    const r = update((st) => {
      const out = R.issuePass(st, { app: 'test', minutes: 2, declare: 'テスト', test: true });
      st.onboarding.testToken = out.pass.token;
      return out;
    });
    toast('テスト用の通行証を出しました');
    app.render();
    location.href = r.url;
  });
  $('#skip', root)?.addEventListener('click', async () => {
    const ok = await ask({ title: '未確認のまま進む', body: '<p class="small">動かないままだと、介入画面が出ない。見直し日に必ず確かめる。</p>', buttons: [{ label: '進む', value: true, cls: 'danger' }, { label: 'もう少し試す', value: false, cls: 'ghost' }] });
    if (!ok) return;
    update((st) => { st.onboarding.skipped = true; });
    go(app, 1);
  });
  $('#gen', root)?.addEventListener('click', () => { update((st) => R.newPasscode(st)); app.render(); });
  $('#seal', root)?.addEventListener('click', () => { update((st) => R.sealPasscode(st)); toast('封印しました'); app.render(); });
  $('#imp', root)?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const obj = JSON.parse(rd.result);
        if (!obj || typeof obj !== 'object' || !obj.game || !obj.settings) throw new Error('bad');
        const ok = await ask({ title: 'バックアップから戻す', body: `<p class="small">${obj.settings.startDate || '?'} から始めた記録を戻す。</p>`, buttons: [{ label: '戻す', value: true, cls: 'primary' }, { label: 'やめる', value: false, cls: 'ghost' }] });
        if (!ok) return;
        replaceAll(obj);
        toast('戻しました');
        app.go(state().onboarding.done ? 'home' : 'onboard');
      } catch {
        toast('バックアップのファイルとして読めませんでした');
      }
    };
    rd.readAsText(f);
  });
}
