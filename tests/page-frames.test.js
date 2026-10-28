// 1段組みのページ枠表示と印刷のページ分け
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

const FIVE_LINES = '一\n二\n三\n四\n五';

function pageTexts(t, cls) {
  return Array.from(t.pages(cls)).map((page) => Array.from(page.querySelectorAll('.v-line')).map((el) => el.textContent));
}

test('「1ページの行数」ごとにページ枠に分け、実際のページ数を表示する', () => {
  const t = tool().render(FIVE_LINES, { pageFrames: true, linesPerPage: 2 });
  assert.deepEqual(pageTexts(t), [['一', '二'], ['三', '四'], ['五']]);
  assert.match(t.stats(), /　3ページ（1ページ 2行）/);
});

test('改ページ記法の位置から次のページを始める', () => {
  const t = tool().render('一\n［＃改ページ］\n二\n三\n四', { pageFrames: true, linesPerPage: 2 });
  assert.deepEqual(pageTexts(t), [['一'], ['二', '三'], ['四']]);
});

test('タイトル・著者名は1ページ目の先頭の列として数える', () => {
  const t = tool().render(FIVE_LINES, { pageFrames: true, linesPerPage: 3, title: '題', author: '著' });
  assert.deepEqual(pageTexts(t), [['題', '著', '一'], ['二', '三', '四'], ['五']]);
});

test('「1ページの行数」が空欄、またはOFFならページ枠にしない', () => {
  assert.equal(tool().render(FIVE_LINES, { pageFrames: true, linesPerPage: '' }).pages().length, 0);
  const t = tool().render(FIVE_LINES, { pageFrames: false, linesPerPage: 2 });
  assert.equal(t.pages().length, 0);
  assert.match(t.stats(), /約3ページ（1ページ 2行）/);
});

test('2段組みのときはページ枠の設定を使わない（入力も無効）', () => {
  const t = tool().render(FIVE_LINES, { twoColumnMode: true, columnsPerRow: 5, pageFrames: true, linesPerPage: 2 });
  assert.equal(t.pages().length, 1);
  assert.equal(t.document.getElementById('pageFrames').disabled, true);
});

test('印刷も画面と同じページ分けにし、印刷後は元の表示に戻す', () => {
  const t = tool().render(FIVE_LINES, { pageFrames: true, linesPerPage: 2 });
  t.api.preparePrintPages();
  assert.deepEqual(pageTexts(t, 'print-page'), [['一', '二'], ['三', '四'], ['五']]);
  t.api.restorePrintPages();
  assert.equal(t.pages('print-page').length, 0);
  assert.equal(t.pages().length, 3);
});
