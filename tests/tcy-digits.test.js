// 半角数字2桁までの縦中横
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

const NO_KANJI = { convertNumbers: false };

function tcyTexts(t) {
  return Array.from(t.preview().querySelectorAll('.v-line:not(.v-title):not(.v-author) .tcy')).map((el) => el.textContent);
}

test('半角数字1〜2桁を縦中横にし、1マスとして数える', () => {
  const t = tool().render('時刻は23時、残り5分。', Object.assign({ lineLength: 20 }, NO_KANJI));
  assert.deepEqual(tcyTexts(t), ['23', '5']);
  assert.match(t.stats(), /総文字数: 11字/); // 時刻は(3)+23(1)+時、残り(4)+5(1)+分。(2)
});

test('3桁以上は縦中横にしない', () => {
  const t = tool().render('西暦2026年と123個', NO_KANJI);
  assert.deepEqual(tcyTexts(t), []);
  assert.match(t.stats(), /総文字数: 12字/);
});

test('2桁の数字は列の途中で分割しない', () => {
  const t = tool().render('あいうえおかきくけ12', Object.assign({ lineLength: 10 }, NO_KANJI));
  assert.deepEqual(t.columns(), ['あいうえおかきくけ12']);
});

test('3桁の数字が列をまたいでも、切れた片方を縦中横にしない', () => {
  const t = tool().render('あいうえおかきく123', Object.assign({ lineLength: 10, kinsoku: false }, NO_KANJI));
  assert.deepEqual(t.columns(), ['あいうえおかきく12', '3']);
  assert.deepEqual(tcyTexts(t), []);
});

test('OFFなら縦中横にせず、1桁1マスで数える', () => {
  const t = tool().render('23時', Object.assign({ tcyDigits: false }, NO_KANJI));
  assert.deepEqual(tcyTexts(t), []);
  assert.match(t.stats(), /総文字数: 3字/);
});

test('全角数字は対象外', () => {
  assert.deepEqual(tcyTexts(tool().render('２３時', NO_KANJI)), []);
});

test('傍点の中の数字も縦中横にする', () => {
  const t = tool().render('[[残り5分]]', NO_KANJI);
  const bouten = t.preview().querySelector('.bouten');
  assert.equal(bouten.textContent, '残り5分');
  assert.equal(bouten.querySelector('.tcy').textContent, '5');
});

test('タイトルの数字も縦中横にする', () => {
  const t = tool().render('本文', Object.assign({ title: '第12話' }, NO_KANJI));
  assert.equal(t.preview().querySelector('.v-title .tcy').textContent, '12');
});

test('コピー用テキストは変わらない', () => {
  assert.equal(tool().render('23時', NO_KANJI).copyText(), '23時');
});
