// 導入ガイド：iPhone のショートカット・オートメーション・スクリーンタイムの手順
import { esc } from '../util.js';
import { on, copyText } from '../ui.js';
import { PASS_SHORTCUT } from '../rules.js';
import { state } from '../store.js';
import { hmToMin, pad } from '../util.js';

const cfg = () => state().settings;
// 就寝ロックの30分前（予告の時刻）
function warnAt() {
  const m = (hmToMin(cfg().bedStart) - 30 + 1440) % 1440;
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

export const title = '導入ガイド';

export function baseUrl() {
  return `${location.origin}${location.pathname.replace(/index\.html$/, '')}`;
}

export const urls = () => {
  const b = baseUrl();
  return {
    base: b,
    openYoutube: `${b}?ev=open&app=youtube`,
    openGame: `${b}?ev=open&app=game`,
    closedYoutube: `${b}?ev=closed&app=youtube&pass=`,
    closedGame: `${b}?ev=closed&app=game&pass=`,
    morning: `${b}?ev=morning`,
  };
};

const code = (text) => `<span class="code">${esc(text)}</span><button class="btn small ghost" data-copy="${esc(text)}">コピー</button>`;

export function shortcutSteps() {
  return `<h3>ショートカット「${PASS_SHORTCUT}」</h3>
  <p class="small">介入画面で通行証を出した時に呼ばれる。通行証（期限）をファイルに保存する。</p>
  <ol class="steps small">
    <li>「ショートカット」App →「ショートカット」タブ → 右上の「＋」</li>
    <li>上の名前を「${PASS_SHORTCUT}」に変える（1文字でも違うと呼べない）${code(PASS_SHORTCUT)}</li>
    <li>「アクションを検索」で「ファイルを保存」を追加する</li>
    <li>「ファイルを保存」の保存するものを「ショートカットの入力」にする（青い文字をタップして選ぶ）</li>
    <li>「＞」を開いて「保存先を尋ねる」をオフ。「サブパス」に次を入れ、「上書き」をオン ${code('Michi/pass.txt')}</li>
    <li>（おすすめ）「テキストを分割」（区切り：改行）→「リストから項目を取得」（項目のインデックス：4）→「タイマーを開始」（分：取得した項目）を足す。時計アプリの「タイマー終了時」を「再生停止」にしておくと、時間で動画が止まる</li>
    <li>最後に「通知を表示」を足して「通行証を保存した。アプリを開き直して通れる」と入れる</li>
    <li>右上「完了」</li>
  </ol>`;
}

export function automationSteps() {
  const u = urls();
  const openSteps = (name, url) => `<li>「オートメーション」タブ → 右上の「＋」→「App」</li>
    <li>「App」で <b>${name}</b> を選ぶ。「開いている」だけチェック（「閉じている」は外す）</li>
    <li>「すぐに実行」を選び、「実行時に通知」をオフ →「次へ」→「新規の空のオートメーション」</li>
    <li>「ファイルを取得」を追加 →「＞」で「ドキュメントピッカーを表示」をオフ、「ファイルパス」に次を入れ、「見つからない場合はエラー」をオフ ${code('Michi/pass.txt')}</li>
    <li>「テキストを分割」を追加（区切り：改行）</li>
    <li>「リストから項目を取得」を追加（最初の項目）</li>
    <li>「入力から日付を取得」を追加</li>
    <li>「If」を追加：入力を「日付」にし、条件を「が次より後」、比べる値を「現在の日付」にする</li>
    <li>「If」の中は空のまま。「その他の場合」の中に「URLを開く」を入れ、次のURLにする ${code(url)}</li>
    <li>右上「完了」</li>`;
  const closedSteps = (name, url) => `<li>「オートメーション」→「＋」→「App」→ <b>${name}</b> を選び、「閉じている」だけチェック</li>
    <li>「すぐに実行」・「実行時に通知」オフ →「次へ」→「新規の空のオートメーション」</li>
    <li>「ファイルを取得」（パス ${esc('Michi/pass.txt')}、ピッカーオフ、エラーオフ）</li>
    <li>「URLエンコード」を追加（入力：ファイル）</li>
    <li>「テキスト」を追加し、次の文字を貼り付けたあと、最後に「URLエンコード済みテキスト」の変数を差し込む ${code(url)}</li>
    <li>「URLを開く」を追加（入力：テキスト）→「完了」</li>`;
  return `<h3>オートメーション（6つ）</h3>
  <p class="small">対象アプリを開いた瞬間に、通行証がなければこのアプリへ飛ばす。閉じた時は使った時間を記録する。</p>
  <div class="win flat"><h3>1. YouTube を開いた時</h3><ol class="steps small">${openSteps('YouTube', u.openYoutube)}</ol></div>
  <div class="win flat"><h3>2. ゲームを開いた時</h3><ol class="steps small">${openSteps('ロック対象のゲームをすべて', u.openGame)}</ol>
    <p class="tiny muted">新しいゲームを入れたら、見直し日にここへ追加する。</p></div>
  <div class="win flat"><h3>3. YouTube を閉じた時</h3><ol class="steps small">${closedSteps('YouTube', u.closedYoutube)}</ol></div>
  <div class="win flat"><h3>4. ゲームを閉じた時</h3><ol class="steps small">${closedSteps('ロック対象のゲームをすべて', u.closedGame)}</ol></div>
  <div class="win flat"><h3>5. ${warnAt()} の予告</h3><ol class="steps small">
    <li>「＋」→「時刻」→ ${warnAt()}・毎日・「すぐに実行」</li>
    <li>「通知を表示」：「あと30分で就寝ロック。画面を閉じる準備を」</li></ol></div>
  <div class="win flat"><h3>6. ${cfg().wake} の朝</h3><ol class="steps small">
    <li>「＋」→「時刻」→ ${cfg().wake}・毎日・「すぐに実行」</li>
    <li>「URLを開く」${code(u.morning)}</li></ol></div>`;
}

export function homeIconSteps() {
  return `<h3>ホーム画面のアイコン（おすすめ）</h3>
  <p class="small">このアプリは Safari で動かす（ショートカットから開いた画面と同じ保存領域を使うため）。ホーム画面には「Safariで開く」ショートカットを置く。</p>
  <ol class="steps small">
    <li>ショートカットで新規作成 → 名前「Michi」→「URLを開く」${code(urls().base)}</li>
    <li>「i」（詳細）→「ホーム画面に追加」</li>
  </ol>
  <p class="tiny muted">Safari の「ホーム画面に追加」は使わない（保存領域が別になり、記録が分かれてしまう）。</p>`;
}

export function screenTimeSteps() {
  return `<ol class="steps small">
    <li>設定 → スクリーンタイム →「アプリとWebサイトのアクティビティ」をオン</li>
    <li>「休止時間」→「スケジュール」オン → 毎日 開始 ${cfg().bedStart}・終了 ${cfg().wake} →「休止時間中にブロック」オン</li>
    <li>「常に許可」→ 電話・メッセージ・LINE・時計・マップだけ。YouTube・ゲーム・Safari・ショートカットは入れない</li>
    <li>「コンテンツとプライバシーの制限」オン →「iTunesおよびApp Storeでの購入」→「インストール」を「許可しない」</li>
    <li>「コンテンツとプライバシーの制限」→「App Storeとメディアと Webと Gameのコンテンツ」(またはコンテンツ制限) →「Webコンテンツ」→「成人向けWebサイトを制限」→「許可しない」に追加 ${code('youtube.com')} ${code('m.youtube.com')}</li>
    <li>（おすすめ）YouTube App の設定 →「すべての履歴を管理」→ 再生履歴をオフ。ホームのおすすめが出にくくなる</li>
  </ol>`;
}

export function troubleshoot() {
  return `<ul class="list small">
    <li><b>介入画面に飛ばない</b>：オートメーションが「すぐに実行」になっているか。Appの選択と「開いている」のチェックを確認。</li>
    <li><b>通行証を出しても飛ばされる</b>：「ファイルを保存」のサブパスと「ファイルを取得」のパスが同じ（Michi/pass.txt）か。「If」の条件が「が次より後」「現在の日付」か。</li>
    <li><b>「おかえり」画面が出ない</b>：「閉じている」のオートメーションで、URLの最後に「URLエンコード済みテキスト」を差し込んだか。</li>
    <li><b>記録が消えた・分かれた</b>：Safari の「ホーム画面に追加」から開いていないか。ショートカットの「URLを開く」で Safari から開く。</li>
    <li><b>Safari のタブが増える</b>：ショートカットから開くたびに新しいタブになる。どのタブも同じ記録を見ているので、ときどき閉じればよい。</li>
  </ul>`;
}

export function render() {
  return `<div class="win gold"><h2>導入ガイド</h2><p class="small">設定をやり直したい時や、うまく動かない時に見る。</p></div>
  <div class="win">${shortcutSteps()}</div>
  <div class="win">${automationSteps()}</div>
  <div class="win">${homeIconSteps()}</div>
  <div class="win"><h3>スクリーンタイム</h3>${screenTimeSteps()}</div>
  <div class="win"><h3>うまく動かない時</h3>${troubleshoot()}</div>
  <a class="btn block" href="#home">戻る</a>`;
}

export function bind(root) {
  bindCopy(root);
}

export function bindCopy(root) {
  on(root, '[data-copy]', 'click', (e, el) => copyText(el.dataset.copy));
}
