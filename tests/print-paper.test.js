// PDF印刷の用紙（判型サイズでの印刷）
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

const PX_PER_MM = 96 / 25.4;

function printStyle(t) {
  const el = t.document.getElementById('bookSizePrintStyle');
  return el ? el.textContent : null;
}

test('A4のときは用紙・文字の大きさを変えない', () => {
  const t = tool().render('本文', { printPaper: 'a4' });
  t.api.preparePrintPages();
  assert.equal(printStyle(t), null);
  t.api.restorePrintPages();
});

test('判型を選ぶと、その用紙サイズと余白で印刷し、印刷後に元へ戻す', () => {
  const t = tool().render('本文', { printPaper: 'bunko', lineLength: 40 });
  t.api.preparePrintPages();
  const css = printStyle(t);
  assert.ok(css.includes('@page{size:105mm 148mm;margin:10mm;}'), css);
  assert.match(css, /\.v-line\{font-size:[\d.]+px;\}/);
  t.api.restorePrintPages();
  assert.equal(printStyle(t), null);
});

test('1列に「1行の文字数」＋1字が収まる文字の大きさにする', () => {
  const { computeBookPrintMetrics, BOOK_SIZES } = tool().api;
  const size = BOOK_SIZES.bunko;
  const m = computeBookPrintMetrics(size, 40, 1, 0, 4.8);
  const heightPx = (size.height - size.margin * 2) * PX_PER_MM;
  assert.ok(m.fontPx * 41 <= heightPx, '1列が用紙の高さに収まる');
  assert.ok(m.fontPx * 41 > heightPx - 41 * 0.2, '小さくしすぎない');
  // 文庫・1列40字でおよそ9pt（12px前後）になる
  assert.ok(m.fontPx > 11 && m.fontPx < 13, String(m.fontPx));
});

test('2段組みでは1段の高さに収まる大きさにする', () => {
  const { computeBookPrintMetrics, BOOK_SIZES } = tool().api;
  const one = computeBookPrintMetrics(BOOK_SIZES.a5, 20, 1, 0, 4.8);
  const two = computeBookPrintMetrics(BOOK_SIZES.a5, 20, 2, 0, 4.8);
  assert.ok(two.fontPx < one.fontPx * 0.55);
});

test('1ページの列数が決まっているときは、横幅にも収まる大きさにする', () => {
  const { computeBookPrintMetrics, BOOK_SIZES } = tool().api;
  const size = BOOK_SIZES.bunko;
  const m = computeBookPrintMetrics(size, 20, 1, 16, 4.8);
  const widthPx = (size.width - size.margin * 2) * PX_PER_MM;
  assert.ok(m.fontPx * 1.9 * 16 + 4.8 * 15 <= widthPx, '16列が用紙の幅に収まる');
});

test('収まらないほど極端な指定では、文字の大きさは最小6pxで止める', () => {
  const { computeBookPrintMetrics, BOOK_SIZES } = tool().api;
  assert.equal(computeBookPrintMetrics(BOOK_SIZES.bunko, 20, 1, 30, 4.8).fontPx, 6);
});

test('1段組みのページ枠と組み合わせると、ページ分けは「1ページの行数」どおり', () => {
  const t = tool().render('一\n二\n三\n四\n五', { printPaper: 'a5', pageFrames: true, linesPerPage: 2 });
  t.api.preparePrintPages();
  assert.equal(t.pages('print-page').length, 3);
  t.api.restorePrintPages();
});

test('「同人誌サイズ」や「1行の文字数」を変えても用紙の選択は変わらない', () => {
  const t = tool().render('本文', { printPaper: 'b6', pageSizePreset: 'custom', lineLength: 33 });
  assert.equal(t.document.getElementById('printPaper').value, 'b6');
  t.api.preparePrintPages();
  assert.ok(printStyle(t).includes('size:128mm 182mm'));
  t.api.restorePrintPages();
});
