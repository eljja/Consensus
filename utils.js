/* ================================================================
   Consensus Analytics — Shared Pure Utilities (Browser & Node UMD)
   ================================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ConsensusUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_FX_RATE = 1380;

  function resolveActiveCurrency(currentCurrency, currentLang, market) {
    let curr = currentCurrency || 'AUTO';
    if (curr === 'AUTO') {
      curr = currentLang === 'en' ? 'USD' : (market === 'KR' ? 'KRW' : 'USD');
    }
    return curr;
  }

  function getFxRate(market, activeCurr, usdKrwRate = DEFAULT_FX_RATE) {
    if (market === 'US' && activeCurr === 'KRW') return usdKrwRate;
    if (market === 'KR' && activeCurr === 'USD') return 1 / usdKrwRate;
    return 1;
  }

  function toUsdValue(val, market, usdKrwRate = DEFAULT_FX_RATE) {
    if (val == null || isNaN(val)) return -Infinity;
    return market === 'KR' ? val / usdKrwRate : val;
  }

  function formatPrice(val, market, currentCurrency, currentLang, usdKrwRate = DEFAULT_FX_RATE) {
    if (val == null || isNaN(val)) return '—';
    const curr = resolveActiveCurrency(currentCurrency, currentLang, market);
    const fx = getFxRate(market, curr, usdKrwRate);
    const converted = val * fx;

    if (curr === 'USD') {
      return '$' + converted.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (curr === 'KRW') {
      if (currentLang === 'en') {
        return '₩' + Math.round(converted).toLocaleString('en-US');
      }
      return Math.round(converted).toLocaleString('ko-KR') + '원';
    }
    return '$' + converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatCompactAxisPrice(val, activeCurr, currentLang) {
    if (val == null || isNaN(val) || val <= 0) return '';
    if (activeCurr === 'USD') {
      return '$' + (val >= 100 ? Math.round(val).toLocaleString('en-US') : val.toFixed(1));
    }
    if (currentLang === 'en') {
      if (val >= 1000000) return '₩' + (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return '₩' + Math.round(val / 1000).toLocaleString('en-US') + 'k';
      return '₩' + Math.round(val).toLocaleString('en-US');
    }
    return Math.round(val).toLocaleString('ko-KR') + '원';
  }

  function getPriceOnDate(priceHistory, targetDateStr, maxLookbackDays = 7) {
    if (!priceHistory || !priceHistory.length || !targetDateStr) return null;
    if (!priceHistory._map) {
      const map = {};
      priceHistory.forEach(p => { map[p.date] = p.close; });
      const sorted = Object.keys(map).sort();
      Object.defineProperty(priceHistory, '_map', { value: map, enumerable: false });
      Object.defineProperty(priceHistory, '_sorted', { value: sorted, enumerable: false });
    }
    const map = priceHistory._map;
    const sorted = priceHistory._sorted;

    if (map[targetDateStr] != null) return map[targetDateStr];

    let low = 0;
    let high = sorted.length - 1;
    let bestDate = null;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (sorted[mid] <= targetDateStr) {
        bestDate = sorted[mid];
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (!bestDate) return null;

    if (maxLookbackDays != null && maxLookbackDays >= 0) {
      const targetTs = Date.parse(targetDateStr + 'T00:00:00Z');
      const bestTs = Date.parse(bestDate + 'T00:00:00Z');
      if (!isNaN(targetTs) && !isNaN(bestTs)) {
        const diffDays = (targetTs - bestTs) / (24 * 60 * 60 * 1000);
        if (diffDays > maxLookbackDays) return null;
      }
    }
    return map[bestDate];
  }

  function compute52WeekStats(priceHistory, currentPrice) {
    if (!priceHistory || !priceHistory.length) return null;
    const latestStr = priceHistory[priceHistory.length - 1].date;
    const latestTs = Date.parse(latestStr + 'T00:00:00Z');
    if (isNaN(latestTs)) return null;

    const cutoffTs = latestTs - 365 * 24 * 60 * 60 * 1000;
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < priceHistory.length; i++) {
      const p = priceHistory[i];
      const ts = Date.parse(p.date + 'T00:00:00Z');
      if (!isNaN(ts) && ts >= cutoffTs && p.close != null && p.close > 0) {
        if (p.close < low) low = p.close;
        if (p.close > high) high = p.close;
      }
    }
    if (!isFinite(low) || !isFinite(high)) return null;
    const cur = currentPrice != null ? currentPrice : priceHistory[priceHistory.length - 1].close;
    const span = high - low;
    const positionPct = span > 0 ? Math.max(0, Math.min(100, ((cur - low) / span) * 100)) : 50;
    return { low, high, positionPct };
  }

  function computeRangeGauge({ current, min, max, adjMean, pred3m }) {
    const vals = [current, min, max, adjMean, pred3m].filter(v => v != null && isFinite(v) && v > 0);
    if (!vals.length) return null;
    const domainMin = Math.min(...vals);
    const domainMax = Math.max(...vals);
    const span = domainMax - domainMin;
    const toPct = (v) => {
      if (v == null || !isFinite(v)) return null;
      if (span <= 0) return 50;
      return Math.max(0, Math.min(100, ((v - domainMin) / span) * 100));
    };
    return {
      domainMin,
      domainMax,
      minPct: toPct(min),
      maxPct: toPct(max),
      currentPct: toPct(current),
      adjMeanPct: toPct(adjMean),
      predPct: toPct(pred3m),
    };
  }

  function sortStocks(stocks, sortMode, marketCapOrder) {
    const list = [...stocks];
    const order = marketCapOrder || [];
    if (sortMode === 'upside_desc') {
      return list.sort((a, b) => (b.realistic_median_upside ?? -9999) - (a.realistic_median_upside ?? -9999));
    }
    if (sortMode === 'upside_asc') {
      return list.sort((a, b) => (a.realistic_median_upside ?? 9999) - (b.realistic_median_upside ?? 9999));
    }
    if (sortMode === 'vol_desc') {
      return list.sort((a, b) => (b.volatility_annualized ?? -1) - (a.volatility_annualized ?? -1));
    }
    if (sortMode === 'reports_desc') {
      return list.sort((a, b) => (b.active_firms_count ?? 0) - (a.active_firms_count ?? 0));
    }
    // Default: market cap order
    return list.sort((a, b) => {
      const idxA = order.indexOf(a.ticker);
      const idxB = order.indexOf(b.ticker);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }

  function filterByTimeframe(items, timeframe, anchorTs) {
    if (!items || !items.length || !timeframe || timeframe === 'ALL') return items || [];
    const daysMap = { '6M': 183, '1Y': 366, '3Y': 1096, '5Y': 1826 };
    const days = daysMap[timeframe];
    if (!days) return items;

    let refTs = anchorTs;
    if (!refTs || isNaN(refTs)) {
      refTs = items.reduce((mx, item) => {
        const ts = Date.parse(item.date + 'T00:00:00Z');
        return !isNaN(ts) && ts > mx ? ts : mx;
      }, 0);
    }
    if (!refTs) return items;

    const cutoff = refTs - days * 24 * 60 * 60 * 1000;
    return items.filter(item => {
      const ts = Date.parse(item.date + 'T00:00:00Z');
      return !isNaN(ts) && ts >= cutoff;
    });
  }

  function groupFirmScatterSeries(firmMap, maxDistinct = 8, otherLabel = 'Other Firms') {
    const entries = Object.entries(firmMap || {})
      .filter(([, pts]) => pts && pts.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    if (entries.length <= maxDistinct) {
      return entries.map(([name, data]) => ({ name, type: 'scatter', data, isOther: false }));
    }

    const top = entries.slice(0, maxDistinct).map(([name, data]) => ({
      name,
      type: 'scatter',
      data,
      isOther: false,
    }));
    const otherPts = entries.slice(maxDistinct).flatMap(([, pts]) => pts);
    top.push({ name: otherLabel, type: 'scatter', data: otherPts, isOther: true });
    return top;
  }

  function selectBiasRankingEntries(entries, options = {}) {
    const minReports = options.minReports || 1;
    const mode = options.mode || 'compact';
    const compactLimit = options.compactLimit || 16;

    const filtered = (entries || [])
      .filter(e => e.count >= minReports)
      .sort((a, b) => b.avg - a.avg);

    if (mode === 'all' || filtered.length <= compactLimit) {
      return filtered;
    }

    const half = Math.floor(compactLimit / 2);
    const topPart = filtered.slice(0, half);
    const bottomPart = filtered.slice(filtered.length - (compactLimit - half));
    return [...topPart, ...bottomPart];
  }

  function escapeCsvCell(val) {
    if (val == null) return '';
    const str = String(val);
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function buildReportsCsv(rows, headers) {
    const lines = [headers.map(escapeCsvCell).join(',')];
    const hasAdj = headers.length >= 10;
    (rows || []).forEach(r => {
      const cols = hasAdj
        ? [
            r.date,
            r.stock,
            r.ticker,
            r.firm,
            r.analyst,
            r.reportPrice != null ? r.reportPrice : '',
            r.target != null ? r.target : '',
            r.adjTarget != null ? Math.round(r.adjTarget * 100) / 100 : '',
            r.bias != null ? r.bias.toFixed(1) + '%' : '',
            r.category || '',
          ]
        : [
            r.date,
            r.stock,
            r.ticker,
            r.firm,
            r.analyst,
            r.reportPrice != null ? r.reportPrice : '',
            r.target != null ? r.target : '',
            r.bias != null ? r.bias.toFixed(1) + '%' : '',
            r.category || '',
          ];
      lines.push(cols.map(escapeCsvCell).join(','));
    });
    return lines.join('\r\n');
  }

  function computeAdjustedTarget(rawTarget, firmBiasPct) {
    if (rawTarget == null || isNaN(rawTarget) || rawTarget <= 0) return null;
    const bias = (firmBiasPct != null && !isNaN(firmBiasPct)) ? firmBiasPct : 15.0;
    const denom = 1 + bias / 100;
    if (denom <= 0.1) return null;
    return rawTarget / denom;
  }

  function classifyDispersion(dispersionPct, lang = 'ko') {
    if (dispersionPct == null || isNaN(dispersionPct)) {
      return { level: 'med', label: lang === 'en' ? 'Moderate' : '보통', cls: 'chip-agree-med' };
    }
    if (dispersionPct < 15) {
      return { level: 'high', label: lang === 'en' ? 'High' : '높음', cls: 'chip-agree-high' };
    }
    if (dispersionPct <= 30) {
      return { level: 'med', label: lang === 'en' ? 'Moderate' : '보통', cls: 'chip-agree-med' };
    }
    return { level: 'low', label: lang === 'en' ? 'Wide Split' : '분산', cls: 'chip-agree-low' };
  }

  // Unified semantic color system:
  // Upside (+) = Emerald Green | Downside (-) = Rose Red | Neutral = Slate
  function getSemanticTone(upsidePct) {
    if (upsidePct == null || isNaN(upsidePct) || Math.abs(upsidePct) < 0.5) {
      return {
        direction: 'flat',
        bg: 'rgba(148, 163, 184, 0.08)',
        border: 'rgba(148, 163, 184, 0.22)',
        text: 'rgba(226, 232, 240, 0.9)',
        badgeBg: 'rgba(148, 163, 184, 0.16)',
        badgeText: '#cbd5e1',
        badge: '0.0%',
      };
    }

    if (upsidePct > 0) {
      const intensity = Math.min(upsidePct / 40.0, 1.0);
      const alphaBg = 0.09 + intensity * 0.20;
      const alphaBorder = 0.24 + intensity * 0.42;
      return {
        direction: 'up',
        bg: `rgba(16, 185, 129, ${alphaBg.toFixed(2)})`,
        border: `rgba(16, 185, 129, ${alphaBorder.toFixed(2)})`,
        text: '#a7f3d0',
        badgeBg: `rgba(16, 185, 129, ${(alphaBg + 0.14).toFixed(2)})`,
        badgeText: '#6ee7b7',
        badge: `+${upsidePct.toFixed(1)}%`,
      };
    }

    const intensity = Math.min(Math.abs(upsidePct) / 25.0, 1.0);
    const alphaBg = 0.09 + intensity * 0.20;
    const alphaBorder = 0.24 + intensity * 0.42;
    return {
      direction: 'down',
      bg: `rgba(244, 63, 94, ${alphaBg.toFixed(2)})`,
      border: `rgba(244, 63, 94, ${alphaBorder.toFixed(2)})`,
      text: '#fecdd3',
      badgeBg: `rgba(244, 63, 94, ${(alphaBg + 0.14).toFixed(2)})`,
      badgeText: '#fda4af',
      badge: `${upsidePct.toFixed(1)}%`,
    };
  }

  return {
    DEFAULT_FX_RATE,
    resolveActiveCurrency,
    getFxRate,
    toUsdValue,
    formatPrice,
    formatCompactAxisPrice,
    getPriceOnDate,
    compute52WeekStats,
    computeRangeGauge,
    sortStocks,
    filterByTimeframe,
    groupFirmScatterSeries,
    selectBiasRankingEntries,
    buildReportsCsv,
    computeAdjustedTarget,
    classifyDispersion,
    getSemanticTone,
  };
});
