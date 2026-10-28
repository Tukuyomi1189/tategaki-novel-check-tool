// 改ページ記法（［＃改ページ］／[newpage]）
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

function breakIndexes(t) {
  return Array.from(t.preview().querySelectorAll('.v-line:not(.v-title):not(.v-author)'))
    .map((el, i) => (el.hasAttribute('data-page-break') ? i : -1))
    .filter((i) => i >= 0);
}

test('記法の行は列にせず、次の列に改ページの印を付ける', () => {
  const t = tool().render('一章\n［＃改ページ］\n二章');
  assert.deepEqual(t.columns(), ['一章', '二章']);
  assert.deepEqual(breakIndexes(t), [1]);
});

test('青空文庫形式・pixiv形式、半角・全角の括弧、前後の空白を認識する', () => {
  for (const marker of ['［＃改ページ］', '[#改ページ]', '[newpage]', '［newpage］', '  [newpage]  ']) {
    assert.deepEqual(breakIndexes(tool().render('一\n' + marker + '\nニ')), [1], marker);
  }
});

test('文中の記法は改ページにしない', () => {
  const t = tool().render('一[newpage]二');
  assert.deepEqual(breakIndexes(t), []);
});

test('先頭・末尾の記法は無視し、連続した記法は1つにまとめる', () => {
  const t = tool().render('［＃改ページ］\n一\n［＃改ページ］\n［＃改ページ］\n二\n［＃改ページ］');
  assert.deepEqual(t.columns(), ['一', '二']);
  assert.deepEqual(breakIndexes(t), [1]);
});

test('コピー用テキストは「ルビの出力形式」に合わせた記法に揃える', () => {
  const t = tool();
  assert.equal(t.render('一\n[newpage]\n二').copyText(), '一\n［＃改ページ］\n二');
  assert.equal(t.render('一\n［＃改ページ］\n二', { rubyFormat: 'pixiv' }).copyText(), '一\n[newpage]\n二');
});

test('テキストとしてダウンロードにも記法を出力する', async () => {
  const t = tool().render('あいうえお\n[newpage]\nかき', { lineLength: 3, kinsoku: false });
  assert.equal(await t.exportTxt(), 'あいう\nえお\n［＃改ページ］\nかき');
});

test('1段組みのページ数の目安は、区切られた部分ごとに切り上げる', () => {
  // 3列 + 改ページ + 1列、1ページ2行 → 2ページ + 1ページ
  const t = tool().render('一\n二\n三\n［＃改ページ］\n四', { linesPerPage: 2 });
  assert.match(t.stats(), /約3ページ（1ページ 2行）/);
});

test('2段組みでは改ページの位置から次のページを始める', () => {
  // 1段2列・1ページ2段: 「一二三」で1ページ目（2段目は1列）、改ページ後の「四」は2ページ目
  const t = tool().render('一\n二\n三\n［＃改ページ］\n四', { twoColumnMode: true, columnsPerRow: 2 });
  const pages = Array.from(t.pages());
  assert.equal(pages.length, 2);
  assert.equal(pages[1].querySelector('.v-line').textContent, '四');
  assert.match(t.stats(), /2ページ/);
});

test('OFFなら記法の行も本文として扱う', () => {
  const t = tool().render('一\n［＃改ページ］\n二', { pageBreak: false });
  assert.deepEqual(t.columns(), ['一', '［＃改ページ］', '二']);
  assert.deepEqual(breakIndexes(t), []);
  assert.equal(t.copyText(), '一\n［＃改ページ］\n二');
});
