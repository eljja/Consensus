'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const htmlKo = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const htmlEn = fs.readFileSync(path.join(rootDir, 'index_en.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

function extractIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) {
    ids.add(m[1]);
  }
  return ids;
}

function extractAttrValues(html, attr) {
  const vals = new Set();
  const re = new RegExp(`\\b${attr}="([^"]+)"`, 'g');
  for (const m of html.matchAll(re)) {
    vals.add(m[1]);
  }
  return vals;
}

test('Every DOM ID accessed via document.getElementById in app.js exists in both index.html and index_en.html', () => {
  const koIds = extractIds(htmlKo);
  const enIds = extractIds(htmlEn);

  const referencedIds = new Set();
  for (const m of appJs.matchAll(/getElementById\('([^']+)'\)/g)) {
    referencedIds.add(m[1]);
  }
  // Also include renderStatBox calls
  for (const m of appJs.matchAll(/renderStatBox\('([^']+)',\s*'([^']+)'/g)) {
    referencedIds.add(m[1]);
    referencedIds.add(m[2]);
  }

  assert.ok(referencedIds.size > 30, 'Expected substantial DOM ID coverage');

  const missingKo = [...referencedIds].filter(id => !koIds.has(id));
  const missingEn = [...referencedIds].filter(id => !enIds.has(id));

  assert.deepEqual(missingKo, [], `Missing IDs in index.html: ${missingKo.join(', ')}`);
  assert.deepEqual(missingEn, [], `Missing IDs in index_en.html: ${missingEn.join(', ')}`);
});

test('index.html and index_en.html have identical structural DOM IDs', () => {
  const koIds = [...extractIds(htmlKo)].sort();
  const enIds = [...extractIds(htmlEn)].sort();
  assert.deepEqual(koIds, enIds);
});

test('Every data-i18n, data-i18n-ph, and data-i18n-tip key exists in I18N ko and en dictionaries', () => {
  // Extract ko and en sections cleanly by matching keys inside I18N
  const i18nStart = appJs.indexOf('const I18N = {');
  const koStart = appJs.indexOf('ko: {', i18nStart);
  const enStart = appJs.indexOf('en: {', koStart);
  const i18nEnd = appJs.indexOf('  // ── Application State', enStart);

  const koBlock = appJs.slice(koStart, enStart);
  const enBlock = appJs.slice(enStart, i18nEnd);

  const getKeys = (block) => {
    const keys = new Set();
    for (const m of block.matchAll(/^\s{6}([a-z0-9_]+):/gm)) {
      keys.add(m[1]);
    }
    return keys;
  };

  const koKeys = getKeys(koBlock);
  const enKeys = getKeys(enBlock);

  const usedKeys = new Set([
    ...extractAttrValues(htmlKo, 'data-i18n'),
    ...extractAttrValues(htmlKo, 'data-i18n-ph'),
    ...extractAttrValues(htmlKo, 'data-i18n-tip'),
    ...extractAttrValues(htmlEn, 'data-i18n'),
    ...extractAttrValues(htmlEn, 'data-i18n-ph'),
    ...extractAttrValues(htmlEn, 'data-i18n-tip'),
  ]);

  const missingInKo = [...usedKeys].filter(k => !koKeys.has(k));
  const missingInEn = [...usedKeys].filter(k => !enKeys.has(k));

  assert.deepEqual(missingInKo, [], `Missing ko i18n keys: ${missingInKo.join(', ')}`);
  assert.deepEqual(missingInEn, [], `Missing en i18n keys: ${missingInEn.join(', ')}`);
});

test('Both HTML pages load utils.js before app.js and preserve SEO verification tags', () => {
  for (const [name, html] of [['index.html', htmlKo], ['index_en.html', htmlEn]]) {
    const utilsIdx = html.indexOf('src="utils.js"');
    const appIdx = html.indexOf('src="app.js"');
    assert.ok(utilsIdx > -1 && appIdx > -1 && utilsIdx < appIdx, `${name} must load utils.js before app.js`);
    assert.ok(html.includes('google-site-verification'), `${name} must keep google-site-verification`);
    assert.ok(html.includes('application/ld+json'), `${name} must keep JSON-LD structured data`);
  }
});
