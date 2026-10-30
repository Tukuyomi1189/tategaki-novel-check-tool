// 誤字チェック（誤字の可能性がある箇所をプレビューで赤く表示する）
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

// 印の付いた箇所の文字列（ルビの読みは除く）
function typoTexts(t) {
  return Array.from(t.preview().querySelectorAll('.v-line:not(.v-title):not(.v-author) .typo')).map(function (el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('rt').forEach(function (rt) { rt.remove(); });
    return clone.textContent;
  });
}

test('句読点の連続に印を付ける', () => {
  assert.deepEqual(typoTexts(tool().render('彼は、、走った。。そして、。')), ['、、', '。。', '、。']);
});

test('助詞の重複に印を付ける', () => {
  assert.deepEqual(typoTexts(tool().render('本をを読む。雨ががふる。家にに帰る。')), ['をを', 'がが', 'にに']);
});

test('3つ以上続く同じ助詞・カタカナの「ガガ」には付けない', () => {
  assert.deepEqual(typoTexts(tool().render('「ががが」と鳴った。ガガッと音がした。')), []);
});

test('閉じかっこ直前の読点に印を付ける', () => {
  assert.deepEqual(typoTexts(tool().render('「待って、」と言った。')), ['、']);
});

test('段落の先頭の句読点に印を付ける（字下げの空白は飛ばす）', () => {
  assert.deepEqual(typoTexts(tool().render('、それから\n　。そして')), ['、', '。']);
});

test('日本語の間の半角スペースに印を付け、英単語の間には付けない', () => {
  assert.deepEqual(typoTexts(tool().render('彼は 走った。Hello World', { convertHyphen: false })), [' ']);
});

test('対応の取れていないかっこに印を付ける', () => {
  assert.deepEqual(typoTexts(tool().render('「閉じ忘れ')), ['「']);
  assert.deepEqual(typoTexts(tool().render('開き忘れ」')), ['」']);
  assert.deepEqual(typoTexts(tool().render('「種類違い』')), ['「', '』']);
});

test('対応の取れたかっこ・入れ子のかっこには付けない', () => {
  assert.deepEqual(typoTexts(tool().render('「『本』を読む（今日）」【注】')), []);
});

test('奇数個の三点リーダー・ダッシュに印を付け、偶数個には付けない', () => {
  assert.deepEqual(typoTexts(tool().render('そう…。まさか……。あ―。ええ――。')), ['…', '―']);
});

test('列の境目をまたぐ箇所は、両方の列に印を付ける', () => {
  const t = tool().render('あいうえおかきく本をを読む', { lineLength: 9, kinsoku: false });
  assert.deepEqual(t.columns(), ['あいうえおかきく本', 'をを読む']);
  assert.deepEqual(typoTexts(t), ['をを']);
  const t2 = tool().render('あいうえおかきくけ本をを', { lineLength: 11, kinsoku: false });
  assert.deepEqual(t2.columns(), ['あいうえおかきくけ本を', 'を']);
  assert.deepEqual(typoTexts(t2), ['を', 'を']);
});

test('ルビ・傍点の中でも印を付ける', () => {
  const t = tool().render('｜本《ほん》をを[[読む、、]]');
  assert.deepEqual(typoTexts(t), ['をを', '、、']);
  assert.equal(t.preview().querySelector('.bouten .typo').textContent, '、、');
});

test('文字数欄に件数を表示する', () => {
  assert.match(tool().render('本をを読む、、').stats(), /誤字の可能性: 2箇所/);
  assert.doesNotMatch(tool().render('本を読む。').stats(), /誤字の可能性/);
  // 段落の先頭の「、、」は2つのルールに当たるが、1箇所と数える
  assert.match(tool().render('、、それから').stats(), /誤字の可能性: 1箇所/);
});

test('OFFなら印を付けず、件数も表示しない', () => {
  const t = tool().render('本をを読む、、', { typoCheck: false });
  assert.deepEqual(typoTexts(t), []);
  assert.doesNotMatch(t.stats(), /誤字の可能性/);
});

test('コピー用テキストは変わらない', () => {
  assert.equal(tool().render('本をを読む、、').copyText(), '本をを読む、、');
});

test('印を付けても列の文字・総文字数は変わらない', () => {
  const on = tool().render('「本をを読む、、', { lineLength: 4 });
  const onColumns = on.columns();
  const onStats = on.stats().split('　／　誤字')[0];
  const off = tool().render('「本をを読む、、', { lineLength: 4, typoCheck: false });
  assert.deepEqual(onColumns, off.columns());
  assert.equal(onStats, off.stats());
});
