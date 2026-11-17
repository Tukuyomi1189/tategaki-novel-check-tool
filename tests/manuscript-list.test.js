// 原稿ファイル同期のプルダウンに並べるファイル一覧（「原稿」フォルダ配下をサブフォルダまでたどる）を検証する。
// サーバーの代わりに fetch を差し替え、Live Preview・python http.server が返すフォルダ一覧ページを模したHTMLを返す。
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { tool } = require('./helpers');

// Live Preview の一覧ページ: フォルダは「名前/」、親フォルダへのリンク「../」が先頭に付く
function livePreviewIndex(dirs, files) {
  const rows = ['<tr><td><a href="..">../</a></td></tr>']
    .concat(dirs.map(function (d) { return '<tr><td><a href="' + encodeURI(d) + '/">' + d + '/</a></td></tr>'; }))
    .concat(files.map(function (f) { return '<tr><td><a href="' + encodeURI(f) + '">' + f + '</a></td></tr>'; }));
  return '<!DOCTYPE html><html><body><h1>Index of</h1><table>' + rows.join('') + '</table></body></html>';
}

// python http.server の一覧ページ: 親フォルダへのリンクはなく、フォルダは「名前/」
function pythonIndex(dirs, files) {
  const items = dirs.map(function (d) { return '<li><a href="' + encodeURIComponent(d) + '/">' + d + '/</a></li>'; })
    .concat(files.map(function (f) { return '<li><a href="' + encodeURIComponent(f) + '">' + f + '</a></li>'; }));
  return '<!DOCTYPE HTML><html><body><h1>Directory listing</h1><ul>' + items.join('') + '</ul></body></html>';
}

// pages: { 'フォルダの相対パス/': HTML } に該当しないURLは404を返す
function mockFetch(t, pages) {
  const requested = [];
  t.window.fetch = function (url) {
    const path = decodeURIComponent(url);
    requested.push(path);
    const html = pages[path];
    return Promise.resolve({
      ok: html !== undefined,
      status: html !== undefined ? 200 : 404,
      text: function () { return Promise.resolve(html); },
    });
  };
  return requested;
}

test('サブフォルダの中の .txt も一覧に入り、各フォルダ内はファイル→サブフォルダの順に並ぶ', async () => {
  const t = tool();
  mockFetch(t, {
    '原稿/': livePreviewIndex(['第2部', '第10部', '第1部'], ['プロット.txt', 'あとがき.txt', 'メモ.md']),
    '原稿/第1部/': livePreviewIndex(['番外'], ['第10章.txt', '第2章.txt']),
    '原稿/第1部/番外/': livePreviewIndex([], ['おまけ.txt']),
    '原稿/第2部/': livePreviewIndex([], ['第1章.txt']),
    '原稿/第10部/': livePreviewIndex([], []),
  });
  const list = Array.from(await t.api.fetchManuscriptDirList());
  assert.deepEqual(list, [
    '原稿/あとがき.txt',
    '原稿/プロット.txt',
    '原稿/第1部/第2章.txt',
    '原稿/第1部/第10章.txt',
    '原稿/第1部/番外/おまけ.txt',
    '原稿/第2部/第1章.txt',
  ]);
});

test('親フォルダへのリンク「../」と . で始まるフォルダはたどらない', async () => {
  const t = tool();
  const requested = mockFetch(t, {
    '原稿/': livePreviewIndex(['.git', '章'], ['a.txt']),
    '原稿/章/': livePreviewIndex([], ['b.txt']),
  });
  const list = Array.from(await t.api.fetchManuscriptDirList());
  assert.deepEqual(list, ['原稿/a.txt', '原稿/章/b.txt']);
  assert.deepEqual(requested.sort(), ['原稿/', '原稿/章/']);
});

test('python http.server 形式の一覧ページでもサブフォルダをたどれる', async () => {
  const t = tool();
  mockFetch(t, {
    '原稿/': pythonIndex(['第1部'], ['序章.txt']),
    '原稿/第1部/': pythonIndex([], ['第1章.txt']),
  });
  const list = Array.from(await t.api.fetchManuscriptDirList());
  assert.deepEqual(list, ['原稿/序章.txt', '原稿/第1部/第1章.txt']);
});

test('読み込めないサブフォルダがあっても、ほかのファイルは一覧に残る', async () => {
  const t = tool();
  mockFetch(t, {
    '原稿/': livePreviewIndex(['消えた', '残る'], ['a.txt']),
    '原稿/残る/': livePreviewIndex([], ['b.txt']),
  });
  const list = Array.from(await t.api.fetchManuscriptDirList());
  assert.deepEqual(list, ['原稿/a.txt', '原稿/残る/b.txt']);
});

test('フォルダが循環していても、決まった深さで打ち切る', async () => {
  const t = tool();
  const requested = [];
  // どのフォルダを開いても「loop/」と x.txt がある（シンボリックリンクの循環を模す）
  t.window.fetch = function (url) {
    requested.push(decodeURIComponent(url));
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(livePreviewIndex(['loop'], ['x.txt'])); } });
  };
  const list = Array.from(await t.api.fetchManuscriptDirList());
  assert.equal(list[0], '原稿/x.txt');
  assert.equal(list.length, requested.length);
  assert.ok(requested.length <= 10, 'たどったフォルダ数: ' + requested.length);
});
