// テスト共通: index.html を jsdom で読み込み、画面の入力欄・チェックボックスを操作して結果を取り出す。
// jsdom にはレイアウト計算がないため、実際に描画された列の幅を測る処理（幅ベースの2段組みなど）は検証できない。
// 列の分け方・変換結果・ページ数のような「数で決まる」部分を検証する。
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// テストで指定できる設定と、対応する画面要素のID
const SETTING_IDS = {
  title: 'titleText',
  author: 'authorText',
  pageSizePreset: 'pageSizePreset',
  lineLength: 'lineLength',
  rubyFormat: 'rubyFormat',
  convertPunctuation: 'convertPunctuation',
  convertNumbers: 'convertNumbers',
  convertHyphen: 'convertHyphen',
  convertDakuten: 'convertDakuten',
  kinsoku: 'kinsoku',
  tcyDigits: 'tcyDigits',
  pageBreak: 'pageBreak',
  twoColumnMode: 'twoColumnMode',
  columnsPerRow: 'columnsPerRow',
  linesPerPage: 'linesPerPage',
  pageFrames: 'pageFrames',
  printBookSize: 'printBookSize',
};

// 既定値: サンプルのタイトル・著者名を消し、画面の既定値（チェックボックスの初期状態など）はそのまま使う
const BASE_SETTINGS = { title: '', author: '' };

function createTool() {
  const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  window.print = function () {};

  // 「テキストとしてダウンロード」などの出力内容を横取りする
  let lastDownload = null;
  window.URL.createObjectURL = function (blob) { lastDownload = blob; return 'blob:test'; };
  window.URL.revokeObjectURL = function () {};

  const api = window.__tategakiTest;

  function set(settings) {
    for (const [key, value] of Object.entries(settings)) {
      const id = SETTING_IDS[key];
      if (!id) throw new Error('未知の設定: ' + key);
      const el = document.getElementById(id);
      if (!el) throw new Error('画面に要素がありません: #' + id);
      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else {
        el.value = String(value);
      }
      if (el.disabled !== undefined && key === 'twoColumnMode') {
        // 画面の操作と同じく、2段組みの切り替えで関連入力の有効・無効も切り替える
        el.dispatchEvent(new window.Event('input'));
      }
    }
  }

  // 画面を開いた直後の設定（＝ index.html の既定値）。毎回ここに戻してから各テストの設定を当てる
  const defaults = {};
  for (const [key, id] of Object.entries(SETTING_IDS)) {
    const el = document.getElementById(id);
    if (el) defaults[key] = el.type === 'checkbox' ? el.checked : el.value;
  }

  function render(text, settings = {}) {
    set(Object.assign({}, defaults, BASE_SETTINGS, settings));
    document.getElementById('inputText').value = text;
    api.update();
    return tool;
  }

  // 本文の列（タイトル・著者名を除く）を、ルビの読みを除いた文字列の配列で返す
  function columns() {
    return Array.from(document.querySelectorAll('#verticalPreview .v-line:not(.v-title):not(.v-author)'))
      .map(function (el) {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('rt').forEach(function (rt) { rt.remove(); });
        return clone.textContent;
      });
  }

  function readBlob(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new window.FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  }

  // 「テキストとしてダウンロード」の内容
  async function exportTxt() {
    lastDownload = null;
    document.getElementById('exportTxt').click();
    return readBlob(lastDownload);
  }

  const tool = {
    window,
    document,
    set,
    render,
    columns,
    exportTxt,
    preview: function () { return document.getElementById('verticalPreview'); },
    copyText: function () { return document.getElementById('outputText').value; },
    stats: function () { return document.getElementById('stats').textContent; },
    pages: function (cls) { return document.querySelectorAll('#verticalPreview .' + (cls || 'preview-page')); },
    api,
    close: function () { window.close(); },
  };
  return tool;
}

// 1回の検証ごとに新しい画面を作るとjsdomの読み込みが遅いため、ファイル単位で1つを使い回す
let shared = null;
function tool() {
  if (!shared) shared = createTool();
  return shared;
}

module.exports = { createTool, tool };
