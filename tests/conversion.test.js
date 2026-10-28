// 記号・数字・ルビ・傍点・濁点などの変換（コピー用テキストと縦書きプレビュー）
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

test('感嘆符・疑問符の変換', () => {
  const t = tool();
  assert.equal(t.render('！！ ？？ ！？ ？！').copyText(), '!! ⁇ !? ?!');
  assert.equal(t.render('！！！').copyText(), '!!！', '3文字以上は先頭から2文字ずつ');
  assert.equal(t.render('！！', { convertPunctuation: false }).copyText(), '！！', 'OFFなら変換しない');
});

test('縦中横の「!!」「!?」「?!」は1マスとして数える', () => {
  const t = tool();
  t.render('あ！！い', { lineLength: 3 });
  assert.deepEqual(t.columns(), ['あ!!い']);
  assert.equal(t.preview().querySelectorAll('.tcy').length, 1);
});

test('異体字セレクターを取り除く', () => {
  assert.equal(tool().render('‼️').copyText(), '‼');
});

test('波ダッシュ・半角チルダを全角チルダに統一する', () => {
  assert.equal(tool().render('あ〜い~う').copyText(), 'あ～い～う');
});

test('数字の漢数字変換', () => {
  const t = tool();
  assert.equal(t.render('123').copyText(), '百二十三');
  assert.equal(t.render('2026').copyText(), '二千二十六');
  assert.equal(t.render('10000').copyText(), '一万');
  assert.equal(t.render('1,234').copyText(), '千二百三十四');
  assert.equal(t.render('3.14').copyText(), '三点一四');
  assert.equal(t.render('１２').copyText(), '十二', '全角数字も変換する');
  assert.equal(t.render('123', { convertNumbers: false }).copyText(), '123');
});

test('ハイフンの長音記号変換', () => {
  const t = tool();
  assert.equal(t.render('まだか-').copyText(), 'まだかー');
  assert.equal(t.render('まだか-', { convertHyphen: false }).copyText(), 'まだか-');
});

test('ルビ: 入力の記法を問わず、選んだ出力形式に揃える', () => {
  const t = tool();
  const input = '本気《マジ》と｜食べ物《たべもの》と[[rb:大阪>おおさか]]';
  // 青空文庫形式では「漢字《よみ》」はそのままでも正しい記法なので｜を補わない
  assert.equal(t.render(input).copyText(), '本気《マジ》と｜食べ物《たべもの》と｜大阪《おおさか》');
  assert.equal(t.render(input, { rubyFormat: 'pixiv' }).copyText(), '[[rb:本気>マジ]]と[[rb:食べ物>たべもの]]と[[rb:大阪>おおさか]]');
});

test('ルビはプレビューで ruby 要素になる', () => {
  const t = tool();
  t.render('本気《マジ》');
  const ruby = t.preview().querySelector('ruby');
  assert.ok(ruby);
  assert.equal(ruby.querySelector('rt').textContent, 'マジ');
});

test('傍点: 青空文庫の注記形式で書き戻し、プレビューでは傍点用のspanにする', () => {
  const t = tool();
  t.render('「[[来るまで]]車で待つか」');
  assert.equal(t.copyText(), '「来るまで［＃「来るまで」に傍点］車で待つか」');
  assert.equal(t.preview().querySelector('.bouten').textContent, '来るまで');
  assert.equal(tool().render('［［強調］］').copyText(), '強調［＃「強調」に傍点］', '全角括弧も認識する');
});

test('濁点の強制付与 {{ }}', () => {
  const t = tool();
  assert.equal(t.render('{{あああ}}！').copyText(), 'あ゙あ゙あ゙！');
  assert.equal(t.render('｛｛あ｝｝').copyText(), 'あ゙', '全角括弧も認識する');
});

test('単独の濁点・半濁点を直前の文字に結合する', () => {
  const t = tool();
  assert.equal(t.render('あ゛う゜').copyText(), 'あ゙う゚');
  assert.equal(t.render('か゛は゜').copyText(), 'がぱ', '合成済みの文字がある組み合わせはその文字にする');
  assert.equal(t.render('ｶﾞｱﾞﾊﾟ').copyText(), 'ガア゙パ', '半角カタカナは全角にしてから結合する');
  assert.equal(t.render('゛だけ「゛」').copyText(), '゛だけ「゛」', '行頭・記号の直後は変換しない');
  assert.equal(t.render('あ゛', { convertDakuten: false }).copyText(), 'あ゛', 'OFFなら変換しない');
});

test('タイトル・著者名をプレビューの先頭に表示し、変換も適用する', () => {
  const t = tool();
  t.render('本文', { title: '久遠！！', author: '縦書太郎' });
  assert.equal(t.preview().querySelector('.v-title').textContent, '久遠!!');
  assert.equal(t.preview().querySelector('.v-author').textContent, '縦書太郎');
  assert.ok(t.preview().firstElementChild.classList.contains('v-title'), 'タイトルが一番先頭（右）');
});
