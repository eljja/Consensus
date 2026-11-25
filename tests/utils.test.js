'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const utils = require('../utils.js');

test('resolveActiveCurrency handles AUTO, USD, and KRW across languages and markets', () => {
  assert.equal(utils.resolveActiveCurrency('AUTO', 'ko', 'KR'), 'KRW');
  assert.equal(utils.resolveActiveCurrency('AUTO', 'ko', 'US'), 'USD');
  assert.equal(utils.resolveActiveCurrency('AUTO', 'en', 'KR'), 'USD');
  assert.equal(utils.resolveActiveCurrency('AUTO', 'en', 'US'), 'USD');
  assert.equal(utils.resolveActiveCurrency('KRW', 'en', 'US'), 'KRW');
  assert.equal(utils.resolveActiveCurrency('USD', 'ko', 'KR'), 'USD');
});

test('getFxRate converts accurately between US/KR native prices and active currency', () => {
  assert.equal(utils.getFxRate('US', 'USD', 1380), 1);
  assert.equal(utils.getFxRate('US', 'KRW', 1380), 1380);
  assert.equal(utils.getFxRate('KR', 'KRW', 1380), 1);
  assert.ok(Math.abs(utils.getFxRate('KR', 'USD', 1380) - (1 / 1380)) < 1e-9);
});

test('formatPrice formats USD and KRW cleanly in both ko and en', () => {
  assert.equal(utils.formatPrice(null, 'US', 'USD', 'ko', 1380), '—');
  assert.equal(utils.formatPrice(224.2, 'US', 'USD', 'ko', 1380), '$224.20');
  assert.equal(utils.formatPrice(274000, 'KR', 'KRW', 'ko', 1380), '274,000원');
  assert.equal(utils.formatPrice(274000, 'KR', 'KRW', 'en', 1380), '₩274,000');
  assert.equal(utils.formatPrice(138000, 'KR', 'USD', 'en', 1380), '$100.00');
  assert.equal(utils.formatPrice(100, 'US', 'KRW', 'ko', 1380), '138,000원');
});

test('getPriceOnDate returns exact or prior price within lookback window and null beyond cutoff', () => {
  const history = [
    { date: '2026-01-02', close: 100 },
    { date: '2026-01-05', close: 105 },
    { date: '2026-01-20', close: 120 },
  ];
  assert.equal(utils.getPriceOnDate(history, '2026-01-05'), 105);
  assert.equal(utils.getPriceOnDate(history, '2026-01-07'), 105); // 2 days after Jan 5
  assert.equal(utils.getPriceOnDate(history, '2026-01-19', 7), null); // 14 days gap > 7
  assert.equal(utils.getPriceOnDate(history, '2025-12-31'), null); // before history
});

test('compute52WeekStats returns high, low, and current percentile position', () => {
  const history = [
    { date: '2024-01-01', close: 10 },   // older than 1Y, ignored
    { date: '2026-01-10', close: 100 },
    { date: '2026-05-10', close: 200 },
    { date: '2026-09-21', close: 150 },
  ];
  const stats = utils.compute52WeekStats(history, 150);
  assert.equal(stats.low, 100);
  assert.equal(stats.high, 200);
  assert.equal(stats.positionPct, 50);
  assert.equal(utils.compute52WeekStats([], 150), null);
});

test('computeRangeGauge computes normalized marker positions between min and max bounds', () => {
  const gauge = utils.computeRangeGauge({
    current: 150,
    min: 100,
    max: 300,
    adjMean: 250,
    pred3m: 160,
  });
  assert.equal(gauge.domainMin, 100);
  assert.equal(gauge.domainMax, 300);
  assert.equal(gauge.currentPct, 25);
  assert.equal(gauge.predPct, 30);
  assert.equal(gauge.adjMeanPct, 75);

  // When current is below min, domain expands smoothly to include current
  const expanded = utils.computeRangeGauge({
    current: 80,
    min: 100,
    max: 200,
    adjMean: 160,
    pred3m: 90,
  });
  assert.equal(expanded.domainMin, 80);
  assert.equal(expanded.domainMax, 200);
  assert.equal(expanded.currentPct, 0);
  assert.ok(expanded.minPct > 15 && expanded.minPct < 18);
});

test('sortStocks supports marketCap, upsideDesc, upsideAsc, and volatilityDesc', () => {
  const stocks = [
    { ticker: 'AAPL', market: 'US', realistic_median_upside: -5.8, volatility_annualized: 0.25 },
    { ticker: 'NVDA', market: 'US', realistic_median_upside: 28.1, volatility_annualized: 0.38 },
    { ticker: 'TSLA', market: 'US', realistic_median_upside: -1.0, volatility_annualized: 0.47 },
  ];
  const order = ['NVDA', 'AAPL', 'TSLA'];

  assert.deepEqual(
    utils.sortStocks(stocks, 'mcap', order).map(s => s.ticker),
    ['NVDA', 'AAPL', 'TSLA']
  );
  assert.deepEqual(
    utils.sortStocks(stocks, 'upside_desc', order).map(s => s.ticker),
    ['NVDA', 'TSLA', 'AAPL']
  );
  assert.deepEqual(
    utils.sortStocks(stocks, 'upside_asc', order).map(s => s.ticker),
    ['AAPL', 'TSLA', 'NVDA']
  );
  assert.deepEqual(
    utils.sortStocks(stocks, 'vol_desc', order).map(s => s.ticker),
    ['TSLA', 'NVDA', 'AAPL']
  );
});

test('filterByTimeframe trims price history and reports cleanly relative to latest date', () => {
  const items = [
    { date: '2020-01-01', close: 10 },
    { date: '2024-06-01', close: 50 },
    { date: '2025-11-01', close: 80 },
    { date: '2026-09-21', close: 100 },
  ];
  const anchor = new Date('2026-09-21T00:00:00Z').getTime();
  assert.equal(utils.filterByTimeframe(items, 'ALL', anchor).length, 4);
  assert.equal(utils.filterByTimeframe(items, '1Y', anchor).length, 2);
  assert.equal(utils.filterByTimeframe(items, '3Y', anchor).length, 3);
  assert.equal(utils.filterByTimeframe(items, '6M', anchor).length, 1);
});

test('groupFirmScatterSeries keeps top N firms distinct and merges the rest into Other', () => {
  const firmMap = {};
  for (let i = 1; i <= 12; i++) {
    firmMap[`Firm${i}`] = Array.from({ length: i }, (_, idx) => ({ x: idx, y: idx * 10 }));
  }
  const grouped = utils.groupFirmScatterSeries(firmMap, 8, 'Other Firms');
  assert.equal(grouped.length, 9); // top 8 + 1 Other
  assert.equal(grouped[0].name, 'Firm12');
  assert.equal(grouped[7].name, 'Firm5');
  assert.equal(grouped[8].name, 'Other Firms');
  assert.equal(grouped[8].data.length, 1 + 2 + 3 + 4);
  assert.equal(grouped[8].isOther, true);
});

test('selectBiasRankingEntries filters by minReports and supports compact top/bottom split', () => {
  const entries = Array.from({ length: 24 }, (_, i) => ({
    firm: `Firm${i}`,
    avg: 50 - i * 4,
    count: i % 5 + 1,
  }));
  const filtered = utils.selectBiasRankingEntries(entries, { minReports: 3, mode: 'all' });
  assert.ok(filtered.every(e => e.count >= 3));

  const compact = utils.selectBiasRankingEntries(entries, { minReports: 1, mode: 'compact', compactLimit: 12 });
  assert.equal(compact.length, 12);
  // Top 6 highest + Bottom 6 lowest
  assert.equal(compact[0].firm, 'Firm0');
  assert.equal(compact[compact.length - 1].firm, 'Firm23');
});

test('buildReportsCsv properly escapes quotes, commas, and newlines', () => {
  const rows = [
    { date: '2026-09-20', stock: 'Apple', ticker: 'AAPL', firm: 'Bank, "A"', analyst: 'Jane Doe', reportPrice: 330, target: 350, bias: 6.1, category: 'Accurate' },
  ];
  const csv = utils.buildReportsCsv(rows, ['Date', 'Stock', 'Ticker', 'Firm', 'Analyst', 'PriceOnDate', 'Target', 'Bias', 'Category']);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('"Bank, ""A"""'));
});

test('getSemanticTone uses consistent emerald-for-upside and rose-for-downside palette', () => {
  const up = utils.getSemanticTone(22.5);
  const down = utils.getSemanticTone(-14.2);
  const flat = utils.getSemanticTone(0.2);

  assert.equal(up.direction, 'up');
  assert.equal(up.badge, '+22.5%');
  assert.ok(up.bg.includes('16, 185, 129')); // Emerald green

  assert.equal(down.direction, 'down');
  assert.equal(down.badge, '-14.2%');
  assert.ok(down.bg.includes('244, 63, 94')); // Rose red

  assert.equal(flat.direction, 'flat');
  assert.equal(flat.badge, '0.0%');
});

test('toUsdValue normalizes mixed US/KR prices to USD for fair screener sorting', () => {
  assert.equal(utils.toUsdValue(224.2, 'US', 1380), 224.2);
  assert.ok(Math.abs(utils.toUsdValue(1380000, 'KR', 1380) - 1000) < 1e-9);
  assert.equal(utils.toUsdValue(null, 'KR', 1380), -Infinity);
});

test('computeAdjustedTarget and classifyDispersion behave accurately across bounds', () => {
  assert.ok(Math.abs(utils.computeAdjustedTarget(120, 20) - 100) < 1e-9);
  assert.equal(utils.computeAdjustedTarget(null, 20), null);
  assert.equal(utils.classifyDispersion(11.2, 'ko').level, 'high');
  assert.equal(utils.classifyDispersion(22.0, 'en').level, 'med');
  assert.equal(utils.classifyDispersion(38.5, 'ko').level, 'low');
});


