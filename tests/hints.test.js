// 使い方の説明の折りたたみ
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTool } = require('./helpers');

test('使い方の説明は既定で閉じていて、各項目も見出しだけで個別に開ける', () => {
  const t = createTool();
  const hints = t.document.getElementById('hints');
  assert.equal(hints.tagName, 'DETAILS');
  assert.equal(hints.open, false);
  const items = Array.from(hints.querySelectorAll('details.hint-item'));
  assert.ok(items.length >= 10);
  for (const item of items) {
    assert.equal(item.open, false);
    assert.ok(item.querySelector('summary').textContent.length <= 12, '見出しは短く');
    assert.ok(item.querySelector('p.hint').textContent.length > 0, '説明本文がある');
  }
  t.close();
});

test('説明の本文は見出しの重複なしでそのまま残る', () => {
  const t = createTool();
  const ruby = Array.from(t.document.querySelectorAll('.hint-item')).find((el) => el.querySelector('summary').textContent === 'ルビ');
  assert.ok(ruby.querySelector('p.hint').textContent.startsWith('「本気《マジ》」'));
  t.close();
});
