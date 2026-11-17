// 縦書きプレビューの読みやすさ・操作の改善（英単語の向き、タイトルの縮小、誤字の理由と移動、列から原稿の行番号、HTML保存）を検証する。
// 拡大表示・ホイール・キー操作・ページ番号・改ページの線は、レイアウト計算のない jsdom では確かめられないため対象外。
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool, createTool } = require('./helpers');

function bodyLines(t) {
  return Array.from(t.preview().querySelectorAll('.v-line:not(.v-title):not(.v-author)'));
}

test('大文字だけの短い略語は正立、それ以外の英単語は横倒し（spanで囲まない）', () => {
  const t = tool().render('Trick or OK、BBQとHELLO', { lineLength: 40 });
  const upright = Array.from(t.preview().querySelectorAll('.latin-upright')).map((el) => el.textContent);
  assert.deepEqual(upright, ['OK', 'BBQ']);
  assert.ok(t.columns()[0].startsWith('Trick or OK'), '英単語の文字はそのまま残る');
});

test('列の境目で英単語が分かれても、単語全体で決めた向きのまま', () => {
  const t = tool().render('あいWORD', { lineLength: 4 });
  // WORD（大文字4字）は2列に分かれても両方とも正立
  assert.deepEqual(t.columns(), ['あいWO', 'RD']);
  const upright = Array.from(t.preview().querySelectorAll('.latin-upright')).map((el) => el.textContent);
  assert.deepEqual(upright, ['WO', 'RD']);
  const t2 = tool().render('あいWords', { lineLength: 4 });
  assert.equal(t2.preview().querySelectorAll('.latin-upright').length, 0, '小文字を含む単語は分かれても横倒し');
});

test('タイトルの英単語も同じ規則で向きを決める', () => {
  const t = tool().render('本文', { title: 'Trick OK' });
  const upright = Array.from(t.preview().querySelectorAll('.v-title .latin-upright')).map((el) => el.textContent);
  assert.deepEqual(upright, ['OK']);
});

test('長いタイトル・著者名は1列に収まるようそれだけを小さくし、短いときは指定しない', () => {
  const t = tool().render('本文', { title: '時期遅れのハロウィンパーティー', author: '著者', lineLength: 20 });
  const scale = parseFloat(t.preview().style.getPropertyValue('--v-title-scale'));
  assert.ok(scale > 0 && scale < 1, 'タイトルの倍率: ' + scale);
  assert.equal(t.preview().style.getPropertyValue('--v-author-scale'), '');
  assert.equal(t.preview().querySelectorAll('.v-title').length, 1, 'タイトルは1列のまま');

  const short = tool().render('本文', { title: '短い題', lineLength: 20 });
  assert.equal(short.preview().style.getPropertyValue('--v-title-scale'), '');
});

test('誤字の印には理由が付き、半角スペースには目立たせる印も付く', () => {
  const t = tool().render('本をを読む。彼は 走った。', { convertHyphen: false });
  const typos = Array.from(t.preview().querySelectorAll('.typo'));
  assert.equal(typos[0].textContent, 'をを');
  assert.equal(typos[0].title, '誤字の可能性: 助詞が重なっています');
  assert.equal(typos[1].textContent, ' ');
  assert.ok(typos[1].classList.contains('typo-space'));
  assert.match(typos[1].title, /半角スペース/);
});

test('理由の違う印が隣り合うときは分けて囲み、移動では1か所として数える', () => {
  const t = tool().render('本をを、、読む。', { typoCheck: true });
  const typos = Array.from(t.preview().querySelectorAll('.typo')).map((el) => el.textContent);
  assert.deepEqual(typos, ['をを', '、、']);
  assert.match(t.stats(), /誤字の可能性: 1箇所/);
  assert.equal(t.document.getElementById('typoNavStatus').textContent, '誤字の印 1箇所');
  t.document.getElementById('typoNext').click();
  assert.equal(t.document.getElementById('typoNavStatus').textContent, '1 / 1箇所: 助詞が重なっています／句読点が続いています');
  assert.equal(t.preview().querySelectorAll('.typo-current').length, 2, '1か所の印すべてを選択中にする');
});

test('「次の誤字」「前の誤字」で順に移動し、端からは反対の端へ回る', () => {
  const t = createTool();
  t.render('本をを読む。\n家にに帰る。\n雨ががふる。');
  const next = t.document.getElementById('typoNext');
  const prev = t.document.getElementById('typoPrev');
  const status = () => t.document.getElementById('typoNavStatus').textContent;
  const current = () => t.preview().querySelector('.typo-current').textContent;
  next.click();
  assert.equal(current(), 'をを');
  next.click();
  assert.equal(current(), 'にに');
  assert.match(status(), /^2 \/ 3箇所/);
  prev.click();
  prev.click();
  assert.equal(current(), 'がが', '先頭から戻ると末尾へ');
  t.close();
});

test('誤字がないときは移動ボタンを押せない', () => {
  const t = tool().render('問題のない文章。');
  assert.equal(t.document.getElementById('typoNext').disabled, true);
  assert.equal(t.document.getElementById('typoPrev').disabled, true);
});

test('各列に原稿の段落番号を持たせる（改ページ記法の行は列にならないが、行番号は数える）', () => {
  const t = tool().render('一行目\n\n［＃改ページ］\n四行目は長いので折り返す', { lineLength: 5 });
  const paras = bodyLines(t).map((el) => el.getAttribute('data-para'));
  // 4行目（12字）は5字ずつ3列に分かれる
  assert.deepEqual(paras, ['0', '1', '3', '3', '3']);
});

test('列をクリックすると原稿の行番号を表示し、入力欄のその行を選択する（フォーカスは移さない）', () => {
  const t = createTool();
  t.render('一行目\n二行目\n三行目');
  const input = t.document.getElementById('inputText');
  const before = input.value;
  bodyLines(t)[2].dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  assert.match(t.document.getElementById('columnSourceStatus').textContent, /入力の 3行目/);
  assert.equal(input.value.slice(input.selectionStart, input.selectionEnd), '三行目');
  // 入力欄にフォーカスが移ると、続けて押したキー（スペースなど）で選択中の行が上書きされてしまう
  assert.notEqual(t.document.activeElement, input);
  assert.equal(t.document.activeElement, t.preview(), 'キー操作で読み進められるよう、プレビューを選んだ状態にする');
  t.preview().dispatchEvent(new t.window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  assert.equal(input.value, before, '原稿は変わらない');
  t.close();
});

test('タイトル・著者名の列をクリックしても行番号は出さない', () => {
  const t = createTool();
  t.render('本文', { title: '題名' });
  const statusEl = t.document.getElementById('columnSourceStatus');
  const before = statusEl.textContent;
  t.preview().querySelector('.v-title').dispatchEvent(new t.window.MouseEvent('click', { bubbles: true }));
  assert.equal(statusEl.textContent, before);
  t.close();
});

async function exportHtml(t) {
  let blob = null;
  t.window.URL.createObjectURL = function (b) { blob = b; return 'blob:test'; };
  t.document.getElementById('exportHtml').click();
  return new Promise(function (resolve) {
    const reader = new t.window.FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.readAsText(blob);
  });
}

test('HTML保存には誤字の印・行番号を出さず、縮小したタイトルの倍率と新しい表示の書式は含める', async () => {
  const t = createTool();
  t.render('本をを読む。\n［＃改ページ］\n次', { title: '時期遅れのハロウィンパーティー', lineLength: 20 });
  const html = await exportHtml(t);
  assert.ok(!/class="typo/.test(html), '誤字の印は出さない');
  assert.ok(!/data-para/.test(html), '行番号は出さない');
  assert.ok(html.includes('本をを読む。'), '本文はそのまま');
  assert.match(html, /<div class="vertical-preview" style="--v-title-scale:0\.\d+;">/);
  assert.ok(html.includes('content:"改ページ"'), '改ページの印の書式');
  assert.ok(html.includes('counter(preview-page)'), 'ページ番号の書式');
  assert.ok(!html.includes('--v-font-size:'), '画面用の縮小した文字の大きさは書き出さない');
  t.close();
});

test('段落の使い回しは、列分けに関わる設定を変えると作り直す', () => {
  const t = tool();
  t.render('あいうえおかきくけこ', { lineLength: 5 });
  assert.deepEqual(t.columns(), ['あいうえお', 'かきくけこ']);
  t.render('あいうえおかきくけこ', { lineLength: 10 });
  assert.deepEqual(t.columns(), ['あいうえおかきくけこ']);
  t.render('本をを読む', { typoCheck: true });
  assert.equal(t.preview().querySelectorAll('.typo').length, 1);
  t.render('本をを読む', { typoCheck: false });
  assert.equal(t.preview().querySelectorAll('.typo').length, 0);
});
