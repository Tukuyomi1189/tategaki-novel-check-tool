// スマホ向けの表示調整（文字の大きさの自動調整・設定欄の折りたたみ・出力ボタンの表記）
// 実際の高さに合わせた計算結果や見た目はレイアウト計算のない jsdom では確かめられないため、
// 計算式と、画面に依存しない部分を検証する。
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool, createTool } = require('./helpers');

test('欄の高さに収まる文字の大きさを計算する', () => {
  const { computeFitFontPx } = tool().api;
  // 高さ600pxに34字分（33字＋ぶら下げ1字）→ 17.6px
  assert.equal(computeFitFontPx(600, 34, 20.8), 17.6);
  assert.ok(computeFitFontPx(600, 34, 20.8) * 34 <= 600);
});

test('通常の大きさより大きくはせず、最小8pxで止める', () => {
  const { computeFitFontPx } = tool().api;
  assert.equal(computeFitFontPx(2000, 21, 20.8), 20.8);
  assert.equal(computeFitFontPx(100, 200, 20.8), 8);
});

test('高さが測れないときは調整しない', () => {
  const { computeFitFontPx } = tool().api;
  assert.equal(computeFitFontPx(0, 34, 20.8), null);
  assert.equal(computeFitFontPx(-5, 34, 20.8), null);
});

test('OFFなら文字の大きさを通常に戻す', () => {
  const t = tool();
  t.preview().style.setProperty('--v-font-size', '10px');
  t.render('本文', { fitPreview: false });
  assert.equal(t.preview().style.getPropertyValue('--v-font-size'), '');
});

test('印刷のときは画面用の文字の大きさを使わない', () => {
  const t = tool().render('本文');
  t.preview().style.setProperty('--v-font-size', '10px');
  t.api.preparePrintPages();
  assert.equal(t.preview().style.getPropertyValue('--v-font-size'), '');
  t.api.restorePrintPages();
});

test('設定欄は折りたためる（幅の広い画面では既定で開いている）', () => {
  const t = createTool();
  const settings = t.document.getElementById('settings');
  assert.equal(settings.tagName, 'DETAILS');
  assert.equal(settings.open, true);
  assert.ok(settings.querySelector('.controls #lineLength'), '設定の入力欄は折りたたみの中にある');
  assert.equal(t.document.getElementById('fitPreview').checked, false, '幅の広い画面では既定OFF');
  t.close();
});

test('出力ボタンは通常の表記と短い表記を持ち、読み上げ用の名前は通常の表記', () => {
  const t = tool();
  const expected = { exportTxt: ['テキストとしてダウンロード', 'テキスト保存'], exportHtml: ['HTMLとして保存', 'HTML保存'], exportPdf: ['PDFとして印刷', 'PDF印刷'] };
  for (const [id, [long, short]] of Object.entries(expected)) {
    const btn = t.document.getElementById(id);
    assert.equal(btn.querySelector('.label-long').textContent, long);
    assert.equal(btn.querySelector('.label-short').textContent, short);
    assert.equal(btn.getAttribute('aria-label'), long);
  }
});
