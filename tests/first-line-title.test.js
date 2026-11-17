// 原稿の1行目をタイトルにする
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

function titleText(t) {
  const el = t.preview().querySelector('.v-title');
  return el ? el.textContent : null;
}

test('オンにすると1行目をタイトルに表示し、本文の列から外す', () => {
  const t = tool().render('久遠の闇\n本文一\n本文二', { firstLineTitle: true });
  assert.equal(titleText(t), '久遠の闇');
  assert.deepEqual(t.columns(), ['本文一', '本文二']);
  const titleEl = t.document.getElementById('titleText');
  assert.equal(titleEl.value, '久遠の闇');
  assert.equal(titleEl.disabled, true);
});

test('1行目の直後の空行も本文から外す（途中の空行は残す）', () => {
  const t = tool().render('題\n\n\n一\n\n二', { firstLineTitle: true });
  assert.deepEqual(t.columns(), ['一', '', '二']);
});

test('列の行番号は原稿の行番号のまま', () => {
  const t = tool().render('題\n\n一\n二', { firstLineTitle: true });
  const paras = Array.from(t.preview().querySelectorAll('.v-line[data-para]')).map((el) => el.getAttribute('data-para'));
  assert.deepEqual(paras, ['2', '3']);
});

test('コピー用テキストは1行目を含む原稿のまま', () => {
  const t = tool().render('題\n本文', { firstLineTitle: true });
  assert.equal(t.copyText(), '題\n本文');
});

test('テキストとしてダウンロードではタイトルとして先頭に出す', async () => {
  const t = tool().render('題\n本文', { firstLineTitle: true });
  assert.equal(await t.exportTxt(), '題\n\n本文');
});

test('オフに戻すと手で入力していたタイトルに戻り、1行目は本文に戻る', () => {
  const t = tool().render('題\n本文', { title: '手入力' });
  t.set({ firstLineTitle: true });
  t.api.update();
  assert.equal(titleText(t), '題');
  t.set({ firstLineTitle: false });
  t.api.update();
  const titleEl = t.document.getElementById('titleText');
  assert.equal(titleEl.value, '手入力');
  assert.equal(titleEl.disabled, false);
  assert.equal(titleText(t), '手入力');
  assert.deepEqual(t.columns(), ['題', '本文']);
});

test('オフのときは1行目も本文として表示する', () => {
  const t = tool().render('題\n本文');
  assert.equal(titleText(t), null);
  assert.deepEqual(t.columns(), ['題', '本文']);
});
