// 「1行の文字数」による列の折り返しと禁則処理
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

function cols(text, settings) {
  return tool().render(text, settings).columns();
}

test('1行の文字数ごとに列を折り返し、段落の改行は尊重する', () => {
  assert.deepEqual(cols('あいうえおかきくけこさし\nすせ', { lineLength: 5, kinsoku: false }), ['あいうえお', 'かきくけこ', 'さし', 'すせ']);
});

test('空行は空の列になる', () => {
  assert.deepEqual(cols('あ\n\nい', { lineLength: 5 }), ['あ', '', 'い']);
});

test('ルビは列をまたいで分割しない', () => {
  assert.deepEqual(cols('あいうえおかき｜久遠《くおん》だ', { lineLength: 8 }), ['あいうえおかき', '久遠だ']);
});

test('結合濁点付きの文字は1マスとして数え、濁点の手前で列を切らない', () => {
  assert.deepEqual(cols('あいうえおかきくけ{{あ}}あ', { lineLength: 10 }), ['あいうえおかきくけあ゙', 'あ']);
});

test('統計: 総文字数と列数', () => {
  const t = tool().render('あいうえおかきくけこ', { lineLength: 4, kinsoku: false });
  assert.match(t.stats(), /総文字数: 10字/);
  assert.match(t.stats(), /列数: 3列（1列 4字）/);
});

// 禁則処理: [入力, 1行の文字数, OFFのときの列, ONのときの列]
const KINSOKU_CASES = [
  ['句読点のぶら下げ', '彼は静かに振り返った。', 10, ['彼は静かに振り返った', '。'], ['彼は静かに振り返った。']],
  ['「。」」はぶら下げずに追い出す', 'あいうえおかきくけこ。」「次」', 10, ['あいうえおかきくけこ', '。」「次」'], ['あいうえおかきくけ', 'こ。」「次」']],
  ['閉じ括弧の追い出し', '彼は静かに振り返った」', 10, ['彼は静かに振り返った', '」'], ['彼は静かに振り返っ', 'た」']],
  ['小書き仮名の追い出し', 'あいうえおかきくけこっと', 10, ['あいうえおかきくけこ', 'っと'], ['あいうえおかきくけ', 'こっと']],
  ['長音記号の追い出し', 'あいうえおかきくけこーと', 10, ['あいうえおかきくけこ', 'ーと'], ['あいうえおかきくけ', 'こーと']],
  ['縦中横の感嘆符の追い出し', 'あいうえおかきくけこ！！', 10, ['あいうえおかきくけこ', '!!'], ['あいうえおかきくけ', 'こ!!']],
  ['開き括弧の行末禁則', 'あいうえおかきくけ（注', 10, ['あいうえおかきくけ（', '注'], ['あいうえおかきくけ', '（注']],
  ['三点リーダー2連は分割しない', 'あいうえおかきく……と', 9, ['あいうえおかきく', '……と'], ['あいうえおかき', 'く……と']],
  ['連続した数字は分割しない', 'あいうえおかきく2026年', 10, ['あいうえおかきく20', '26年'], ['あいうえおかきく', '2026年']],
  ['読点のぶら下げ', 'あいうえおかきくけこ、「次」', 10, ['あいうえおかきくけこ', '、「次」'], ['あいうえおかきくけこ、', '「次」']],
  ['解決できない連続は機械的に折り返す', 'ーーーーーーーーーーーーー', 10, ['ーーーーーーーーーー', 'ーーー'], ['ーーーーーーーーーー', 'ーーー']],
];

for (const [name, text, n, off, on] of KINSOKU_CASES) {
  test('禁則処理: ' + name, () => {
    assert.deepEqual(cols(text, { lineLength: n, kinsoku: false, convertNumbers: false }), off, 'OFF');
    assert.deepEqual(cols(text, { lineLength: n, kinsoku: true, convertNumbers: false }), on, 'ON');
  });
}

test('禁則処理は「テキストとしてダウンロード」の改行位置にも反映される', async () => {
  const t = tool().render('彼は静かに振り返った」', { lineLength: 10, kinsoku: true });
  assert.equal(await t.exportTxt(), '彼は静かに振り返っ\nた」');
});

test('禁則処理はコピー用テキストに影響しない', () => {
  assert.equal(tool().render('彼は静かに振り返った」', { lineLength: 10, kinsoku: true }).copyText(), '彼は静かに振り返った」');
});
