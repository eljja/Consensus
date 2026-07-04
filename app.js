/* ================================================================
   주식 컨센서스 예측 분석 대시보드 — app.js
   ================================================================ */

(() => {
  'use strict';

  // ── State ──
  let DATA = null;
  let selectedTicker = null;
  let charts = {};
  let sortState = { key: 'date', dir: 'desc' };
  let currentPage = 1;
  const PAGE_SIZE = 15;

  // ── Color palette for firms ──
  const FIRM_COLORS = [
    '#6366f1','#f59e0b','#22c55e','#ef4444','#06b6d4',
    '#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16',
    '#e879f9','#38bdf8','#fb7185','#a78bfa','#facc15',
    '#2dd4bf','#c084fc','#34d399','#fbbf24','#f472b6',
    '#818cf8','#4ade80','#fb923c','#60a5fa','#a3e635',
  ];

  // ── Helpers ──
  function formatPrice(val, market) {
    if (val == null) return '—';
    if (market === 'KR') return val.toLocaleString('ko-KR') + '원';
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(val) {
    if (val == null) return '—';
    const sign = val > 0 ? '+' : '';
    return sign + val.toFixed(1) + '%';
  }

  function biasCategory(bias) {
    if (bias == null) return { label: '—', cls: '' };
    if (bias > 30) return { label: '과대 긍정적', cls: 'badge-overly-optimistic' };
    if (bias > 15) return { label: '긍정적', cls: 'badge-optimistic' };
    if (bias >= -15) return { label: '적정', cls: 'badge-accurate' };
    return { label: '보수적', cls: 'badge-conservative' };
  }

  function biasColor(val) {
    if (val == null) return 'rgba(255,255,255,.2)';
    if (val > 30) return '#ef4444';
    if (val > 15) return '#f97316';
    if (val >= -15) return '#22c55e';
    return '#3b82f6';
  }

  function animateValue(el, end, suffix = '', prefix = '', duration = 600) {
    const start = 0;
    const startTime = performance.now();
    const isNum = typeof end === 'number';
    if (!isNum) { el.textContent = prefix + end + suffix; return; }
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      if (Math.abs(end) >= 1000) {
        el.textContent = prefix + Math.round(current).toLocaleString('ko-KR') + suffix;
      } else {
        el.textContent = prefix + current.toFixed(end % 1 !== 0 ? 1 : 0) + suffix;
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── Stock Market Cap Ordering ──
  const KR_ORDER = [
    '005930', // 삼성전자 (#1)
    '000660', // SK하이닉스 (#2)
    '373220', // LG에너지솔루션
    '207940', // 삼성바이오로직스
    '005380', // 현대차
    '000270', // 기아
    '068270', // 셀트리온
    '105560', // KB금융
    '055550', // 신한지주
    '005490', // POSCO홀딩스
    '035420', // NAVER
    '012330', // 현대모비스
    '006400', // 삼성SDI
    '051910', // LG화학
    '028260', // 삼성물산
    '035720', // 카카오
    '032830', // 삼성생명
    '000810', // 삼성화재
    '015760', // 한국전력
    '034020', // 두산에너빌리티
  ];

  const US_ORDER = [
    'NVDA',  // NVIDIA (#1)
    'AAPL',  // Apple
    'MSFT',  // Microsoft
    'AMZN',  // Amazon
    'GOOGL', // Alphabet
    'META',  // Meta
    'AVGO',  // Broadcom
    'TSLA',  // Tesla
    'LLY',   // Eli Lilly
    'WMT',   // Walmart
    'JPM',   // JPMorgan Chase
    'V',     // Visa
    'MA',    // Mastercard
    'ORCL',  // Oracle
    'COST',  // Costco
    'NFLX',  // Netflix
    'AMD',   // Advanced Micro Devices
    'PEP',   // PepsiCo
    'KO',    // Coca-Cola
    'DIS',   // Walt Disney
  ];

  // ── Build Stock Pills ──
  function buildStockPills() {
    const usContainer = document.getElementById('pills-us');
    const krContainer = document.getElementById('pills-kr');
    usContainer.innerHTML = '';
    krContainer.innerHTML = '';

    const stocks = DATA.stocks;
    const usTickers = [];
    const krTickers = [];

    for (const [ticker, info] of Object.entries(stocks)) {
      if (info.market === 'US') usTickers.push(info);
      else krTickers.push(info);
    }

    usTickers.sort((a, b) => {
      const idxA = US_ORDER.indexOf(a.ticker);
      const idxB = US_ORDER.indexOf(b.ticker);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.ticker.localeCompare(b.ticker);
    });

    krTickers.sort((a, b) => {
      const idxA = KR_ORDER.indexOf(a.ticker);
      const idxB = KR_ORDER.indexOf(b.ticker);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.name.localeCompare(b.name);
    });

    const createPill = (info, container) => {
      const pill = document.createElement('button');
      pill.className = 'stock-pill';
      pill.dataset.ticker = info.ticker;
      pill.dataset.search = `${info.name.toLowerCase()} ${info.ticker.toLowerCase()}`;
      pill.textContent = `${info.name} (${info.ticker})`;
      pill.addEventListener('click', () => selectStock(info.ticker));
      container.appendChild(pill);
    };

    usTickers.forEach(s => createPill(s, usContainer));
    krTickers.forEach(s => createPill(s, krContainer));

    const stockSearchInput = document.getElementById('stock-search');
    if (stockSearchInput && !stockSearchInput.dataset.bound) {
      stockSearchInput.dataset.bound = 'true';
      stockSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        document.querySelectorAll('.stock-pill').forEach(pill => {
          const text = pill.dataset.search || '';
          pill.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }
  }

  function selectStock(ticker) {
    selectedTicker = ticker;
    document.querySelectorAll('.stock-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.ticker === ticker);
    });
    updateDashboard();
  }

  // ── Update Summary Cards ──
  function updateCards() {
    const stock = DATA.stocks[selectedTicker];
    if (!stock) return;
    const market = stock.market;
    const reports = stock.analyst_reports || [];
    const currentPrice = stock.current_price;

    // Average target
    const targets = reports.map(r => r.target_price).filter(t => t != null);
    const avgTarget = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;

    // Average bias
    const biases = reports.map(r => r.current_bias_pct).filter(b => b != null);
    const avgBias = biases.length ? biases.reduce((a, b) => a + b, 0) / biases.length : null;

    // Price
    const pricePrefix = market === 'KR' ? '' : '$';
    const priceSuffix = market === 'KR' ? '원' : '';
    animateValue(document.getElementById('val-price'), currentPrice, priceSuffix, pricePrefix);
    document.getElementById('sub-price').textContent = `${stock.name} · ${stock.market}`;

    // Target
    if (avgTarget != null) {
      animateValue(document.getElementById('val-target'), Math.round(avgTarget), priceSuffix, pricePrefix);
    } else {
      document.getElementById('val-target').textContent = '—';
    }
    const diff = avgTarget != null ? avgTarget - currentPrice : null;
    document.getElementById('sub-target').textContent = diff != null
      ? `현재가 대비 ${diff >= 0 ? '+' : ''}${market === 'KR' ? Math.round(diff).toLocaleString('ko-KR') + '원' : '$' + diff.toFixed(2)}`
      : '';

    // Bias
    if (avgBias != null) {
      animateValue(document.getElementById('val-bias'), avgBias, '%', avgBias >= 0 ? '+' : '');
      const bc = biasCategory(avgBias);
      document.getElementById('sub-bias').textContent = bc.label;
      document.getElementById('sub-bias').style.color = biasColor(avgBias);
    } else {
      document.getElementById('val-bias').textContent = '—';
      document.getElementById('sub-bias').textContent = '';
    }

    // Reports
    animateValue(document.getElementById('val-reports'), reports.length);
    const firms = new Set(reports.map(r => r.firm));
    document.getElementById('sub-reports').textContent = `${firms.size}개 증권사`;
  }

  // ── State for Timeline Scale Mode ──
  let currentScaleMode = 'linear';

  function initScaleToggles() {
    const container = document.getElementById('timeline-scale-toggles');
    if (!container || container.dataset.bound) return;
    container.dataset.bound = 'true';
    container.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.scale;
        if (!mode || mode === currentScaleMode) return;
        currentScaleMode = mode;
        container.querySelectorAll('.scale-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.scale === mode);
        });
        renderTimeline();
      });
    });
  }

  // ── Chart 1: Timeline ──
  function renderTimeline() {
    const stock = DATA.stocks[selectedTicker];
    if (!stock) return;

    const isKR = stock.market === 'KR';
    const isPct = currentScaleMode === 'pct';
    const isLog = currentScaleMode === 'log';

    let series = [];
    let yaxisOpts = {};
    const scatterSeries = [];
    const scatterColors = [];
    let colorIdx = 0;

    if (isPct) {
      // Percentage Bias % mode over time
      const priceData = (stock.price_history || []).map(p => ({
        x: new Date(p.date).getTime(), y: 0
      }));

      const firmMap = {};
      (stock.analyst_reports || []).forEach(r => {
        if (r.current_bias_pct == null) return;
        if (!firmMap[r.firm]) firmMap[r.firm] = [];
        firmMap[r.firm].push({
          x: new Date(r.date).getTime(),
          y: r.current_bias_pct,
          firm: r.firm,
          analyst: r.analyst,
          target_price: r.target_price,
          bias: r.current_bias_pct,
          grade: r.grade
        });
      });

      for (const [firm, pts] of Object.entries(firmMap)) {
        scatterSeries.push({ name: firm, type: 'scatter', data: pts });
        scatterColors.push(FIRM_COLORS[colorIdx % FIRM_COLORS.length]);
        colorIdx++;
      }

      const priceSeries = { name: '기준 (현재가)', type: 'line', data: priceData };
      series = [...scatterSeries, priceSeries];

      yaxisOpts = {
        labels: {
          style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
          formatter: v => v != null ? (v > 0 ? '+' : '') + v.toFixed(0) + '%' : ''
        },
        title: { text: '목표가 괴리율 (%)', style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' } }
      };

    } else {
      // Linear or Log scale price mode
      const priceData = (stock.price_history || []).map(p => ({
        x: new Date(p.date).getTime(), y: p.close
      }));

      const firmMap = {};
      (stock.analyst_reports || []).forEach(r => {
        if (!firmMap[r.firm]) firmMap[r.firm] = [];
        firmMap[r.firm].push({
          x: new Date(r.date).getTime(),
          y: r.target_price,
          firm: r.firm,
          analyst: r.analyst,
          target_price: r.target_price,
          bias: r.current_bias_pct,
          grade: r.grade
        });
      });

      for (const [firm, pts] of Object.entries(firmMap)) {
        scatterSeries.push({ name: firm, type: 'scatter', data: pts });
        scatterColors.push(FIRM_COLORS[colorIdx % FIRM_COLORS.length]);
        colorIdx++;
      }

      const priceSeries = { name: '주가', type: 'line', data: priceData };
      series = [...scatterSeries, priceSeries];

      yaxisOpts = {
        logarithmic: isLog,
        logBase: 10,
        labels: {
          style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
          formatter: v => {
            if (v == null || isNaN(v)) return '';
            return isKR ? (v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '만' : v.toLocaleString()) : '$' + v.toFixed(0);
          }
        },
        title: {
          text: isLog ? '주가 / 목표가 (로그 축 - 비율 유지가능)' : '주가 / 목표가 (선형 축)',
          style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' }
        }
      };
    }

    const firmCount = scatterSeries.length;
    // Price line series is placed LAST so SVG draws it ON TOP of all scatter dots!
    const chartColors = [...scatterColors, '#6366f1'];
    const strokeWidths = [...Array(firmCount).fill(0), 3.5];
    const markerSizes = [...Array(firmCount).fill(3.8), 0]; // 3.8 = 60% of original size 6
    const opacities = [...Array(firmCount).fill(0.85), 1];

    const opts = {
      series,
      chart: {
        type: 'line', height: 440, background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
      },
      colors: chartColors,
      stroke: { width: strokeWidths, curve: 'smooth' },
      markers: {
        size: markerSizes,
        strokeWidth: 0, // No border stroke around scatter dots!
        hover: { sizeOffset: 2 }
      },
      fill: {
        type: 'solid',
        opacity: opacities
      },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: yaxisOpts,
      grid: { borderColor: 'rgba(255,255,255,.06)', strokeDashArray: 4 },
      legend: {
        position: 'top', horizontalAlign: 'left',
        labels: { colors: 'rgba(255,255,255,.5)' },
        fontSize: '11px', fontWeight: 500,
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      tooltip: {
        theme: 'dark',
        shared: false,
        custom: function({ series: s, seriesIndex, dataPointIndex, w }) {
          const isLineSeries = seriesIndex === series.length - 1;
          const point = w.config.series[seriesIndex].data[dataPointIndex];
          if (!point) return '';
          if (isLineSeries) {
            return `<div style="padding:10px 14px;font-size:12px;">
              <div style="color:rgba(255,255,255,.5);margin-bottom:4px;">${new Date(point.x).toLocaleDateString('ko-KR')}</div>
              <div style="font-weight:700;">${isPct ? '현재가 기준 (0%)' : '주가: ' + formatPrice(point.y, stock.market)}</div>
            </div>`;
          }
          return `<div style="padding:10px 14px;font-size:12px;max-width:240px;">
            <div style="color:rgba(255,255,255,.5);margin-bottom:4px;">${new Date(point.x).toLocaleDateString('ko-KR')}</div>
            <div style="font-weight:700;margin-bottom:2px;">${point.firm}</div>
            ${point.analyst ? `<div style="color:rgba(255,255,255,.5);">${point.analyst}</div>` : ''}
            <div style="margin-top:6px;">목표가: <strong>${formatPrice(point.target_price || point.y, stock.market)}</strong></div>
            ${point.grade ? `<div>등급: ${point.grade}</div>` : ''}
            ${point.bias != null ? `<div>괴리율: <span style="color:${biasColor(point.bias)}">${formatPercent(point.bias)}</span></div>` : ''}
          </div>`;
        }
      },
    };

    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new ApexCharts(document.getElementById('chart-timeline'), opts);
    charts.timeline.render();
  }

  // ── Chart 2: Bias Ranking ──
  function renderBiasRanking() {
    const stock = DATA.stocks[selectedTicker];
    if (!stock) return;

    const firmBias = {};
    (stock.analyst_reports || []).forEach(r => {
      if (r.current_bias_pct == null) return;
      if (!firmBias[r.firm]) firmBias[r.firm] = [];
      firmBias[r.firm].push(r.current_bias_pct);
    });

    const entries = Object.entries(firmBias).map(([firm, vals]) => ({
      firm,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length
    })).sort((a, b) => b.avg - a.avg);

    const categories = entries.map(e => e.firm);
    const values = entries.map(e => parseFloat(e.avg.toFixed(1)));
    const counts = entries.map(e => e.count);
    const colors = values.map(v => {
      if (v > 30) return '#ef4444';
      if (v > 15) return '#f97316';
      if (v >= -15) return '#22c55e';
      return '#3b82f6';
    });

    const opts = {
      series: [{ name: '평균 괴리율', data: values }],
      chart: {
        type: 'bar', height: Math.max(300, entries.length * 36), background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 700 },
      },
      plotOptions: {
        bar: {
          horizontal: true, borderRadius: 5, barHeight: '60%',
          distributed: true,
          dataLabels: { position: 'top' }
        }
      },
      colors,
      dataLabels: {
        enabled: true, textAnchor: 'start', offsetX: 8,
        style: { colors: ['#fff'], fontSize: '11px', fontWeight: 600 },
        formatter: (val, { dataPointIndex }) => `${val > 0 ? '+' : ''}${val}% (${counts[dataPointIndex]}건)`
      },
      xaxis: {
        labels: {
          style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
          formatter: v => (v > 0 ? '+' : '') + v + '%'
        },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: 'rgba(255,255,255,.55)', fontSize: '11px' }, maxWidth: 200 }
      },
      grid: { borderColor: 'rgba(255,255,255,.06)', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      legend: { show: false },
      tooltip: {
        theme: 'dark',
        y: { formatter: v => (v > 0 ? '+' : '') + v + '%' }
      },
      categories,
      xaxis: {
        categories,
        labels: { style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' }, formatter: v => (v > 0 ? '+' : '') + v + '%' },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
    };
    // Fix: yaxis categories need to be inside xaxis for horizontal bar
    opts.xaxis = {
      labels: { style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' }, formatter: v => (v > 0 ? '+' : '') + v + '%' },
      axisBorder: { show: false }, axisTicks: { show: false },
    };
    opts.yaxis = {
      categories,
      labels: { style: { colors: 'rgba(255,255,255,.55)', fontSize: '11px' }, maxWidth: 200 },
    };
    opts.xaxis.categories = categories;

    // Actually for horizontal bar: categories go in xaxis
    delete opts.categories;
    opts.xaxis.categories = categories;

    if (charts.biasRanking) charts.biasRanking.destroy();
    charts.biasRanking = new ApexCharts(document.getElementById('chart-bias-ranking'), opts);
    charts.biasRanking.render();
  }

  // ── Chart 3: Heatmap ──
  function renderHeatmap() {
    const firmStats = DATA.firm_stats;
    if (!firmStats) return;

    const allStocks = Object.keys(DATA.stocks);
    const stockLabels = allStocks.map(t => DATA.stocks[t].name);

    // Get firms sorted by total_reports desc
    const firms = Object.entries(firmStats)
      .sort((a, b) => b[1].total_reports - a[1].total_reports)
      .slice(0, 20); // Limit for readability

    const series = firms.map(([firm, stats]) => {
      const data = allStocks.map((ticker, i) => {
        const byStock = stats.by_stock || {};
        const entry = byStock[ticker];
        const hasBias = entry && entry.avg_bias != null;
        return {
          x: DATA.stocks[ticker].name,
          y: hasBias ? parseFloat(entry.avg_bias.toFixed(1)) : null
        };
      });
      return { name: firm, data };
    });

    const opts = {
      series,
      chart: {
        type: 'heatmap', height: Math.max(350, firms.length * 32 + 60),
        background: 'transparent', fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 600 },
      },
      plotOptions: {
        heatmap: {
          shadeIntensity: 0,
          radius: 4,
          colorScale: {
            ranges: [
              { from: -100, to: -15.01, color: '#3b82f6', name: '보수적' },
              { from: -15, to: 15, color: '#374151', name: '적정' },
              { from: 15.01, to: 30, color: '#f97316', name: '긍정적' },
              { from: 30.01, to: 200, color: '#ef4444', name: '과대 긍정적' },
            ]
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['rgba(255,255,255,.8)'], fontSize: '10px', fontWeight: 600 },
        formatter: val => val != null ? (val > 0 ? '+' : '') + val : ''
      },
      xaxis: {
        labels: { style: { colors: 'rgba(255,255,255,.5)', fontSize: '10px' }, rotateAlways: false, rotate: -45 },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: 'rgba(255,255,255,.5)', fontSize: '10px' }, maxWidth: 180 }
      },
      grid: { show: false },
      legend: { position: 'top', labels: { colors: 'rgba(255,255,255,.5)' }, fontSize: '11px' },
      tooltip: {
        theme: 'dark',
        y: { formatter: v => v != null ? (v > 0 ? '+' : '') + v + '%' : '데이터 없음' }
      },
      states: {
        hover: { filter: { type: 'lighten', value: 0.15 } }
      }
    };

    if (charts.heatmap) charts.heatmap.destroy();
    charts.heatmap = new ApexCharts(document.getElementById('chart-heatmap'), opts);
    charts.heatmap.render();
  }

  // ── Chart 4: Accuracy Trend ──
  function renderAccuracyTrend() {
    // Collect all reports across all stocks, attach ticker
    const allReports = [];
    for (const [ticker, stock] of Object.entries(DATA.stocks)) {
      (stock.analyst_reports || []).forEach(r => {
        if (r.current_bias_pct != null) {
          allReports.push({ ...r, ticker, date: r.date });
        }
      });
    }

    // Count by firm
    const firmCounts = {};
    allReports.forEach(r => { firmCounts[r.firm] = (firmCounts[r.firm] || 0) + 1; });
    const topFirms = Object.entries(firmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    // Group reports by firm and sort by date
    const firmReports = {};
    topFirms.forEach(f => { firmReports[f] = []; });
    allReports.forEach(r => {
      if (topFirms.includes(r.firm)) {
        firmReports[r.firm].push(r);
      }
    });

    const series = topFirms.map((firm, i) => {
      const sorted = firmReports[firm].sort((a, b) => new Date(a.date) - new Date(b.date));
      // Rolling average (window = 3)
      const window = 3;
      const data = sorted.map((r, idx) => {
        const start = Math.max(0, idx - window + 1);
        const slice = sorted.slice(start, idx + 1);
        const avg = slice.reduce((s, x) => s + Math.abs(x.current_bias_pct), 0) / slice.length;
        return { x: new Date(r.date).getTime(), y: parseFloat(avg.toFixed(1)) };
      });
      return { name: firm, data };
    });

    const opts = {
      series,
      chart: {
        type: 'line', height: 360, background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
      },
      colors: FIRM_COLORS.slice(0, 5),
      stroke: { width: 2.5, curve: 'smooth' },
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        title: { text: '|괴리율| 이동평균 (%)', style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' } },
        labels: {
          style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
          formatter: v => v.toFixed(0) + '%'
        },
      },
      grid: { borderColor: 'rgba(255,255,255,.06)', strokeDashArray: 4 },
      legend: {
        position: 'top', horizontalAlign: 'left',
        labels: { colors: 'rgba(255,255,255,.5)' },
        fontSize: '11px', fontWeight: 500,
        itemMargin: { horizontal: 10, vertical: 4 },
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'yyyy-MM-dd' },
        y: { formatter: v => v.toFixed(1) + '%' }
      },
    };

    if (charts.accuracy) charts.accuracy.destroy();
    charts.accuracy = new ApexCharts(document.getElementById('chart-accuracy'), opts);
    charts.accuracy.render();
  }

  // ── Reports Table ──
  let allTableData = [];
  let filteredData = [];

  function buildTableData() {
    allTableData = [];
    for (const [ticker, stock] of Object.entries(DATA.stocks)) {
      (stock.analyst_reports || []).forEach(r => {
        allTableData.push({
          date: r.date,
          stock: stock.name,
          ticker: ticker,
          market: stock.market,
          firm: r.firm,
          analyst: r.analyst || '—',
          target: r.target_price,
          bias: r.current_bias_pct,
          grade: r.grade || '',
          action: r.action || ''
        });
      });
    }
    filteredData = [...allTableData];
    applySort();
  }

  function applySort() {
    const { key, dir } = sortState;
    filteredData.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'target' || key === 'bias') {
        va = va ?? -Infinity;
        vb = vb ?? -Infinity;
        return dir === 'asc' ? va - vb : vb - va;
      }
      va = (va || '').toString().toLowerCase();
      vb = (vb || '').toString().toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    const tbody = document.getElementById('report-tbody');
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredData.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = page.map(r => {
      const bc = biasCategory(r.bias);
      const market = r.market;
      return `<tr>
        <td>${r.date}</td>
        <td>${r.stock} <span style="color:var(--text-tertiary);font-size:.7rem">(${r.ticker})</span></td>
        <td>${r.firm}</td>
        <td>${r.analyst}</td>
        <td>${formatPrice(r.target, market)}</td>
        <td style="color:${biasColor(r.bias)};font-weight:600">${formatPercent(r.bias)}</td>
        <td><span class="badge ${bc.cls}">${bc.label}</span></td>
      </tr>`;
    }).join('');

    document.getElementById('table-count').textContent = `총 ${filteredData.length.toLocaleString()}건`;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 2);
      let end = Math.min(totalPages - 1, currentPage + 2);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    container.innerHTML = pages.map(p => {
      if (p === '...') return `<span class="page-btn" style="cursor:default;opacity:.3">…</span>`;
      return `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderTable();
      });
    });
  }

  // Table sort headers
  function initTableSort() {
    document.querySelectorAll('.report-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortState.key === key) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.key = key;
          sortState.dir = 'desc';
        }
        // Update header styles
        document.querySelectorAll('.report-table th.sortable').forEach(h => {
          h.classList.remove('active-sort');
          h.querySelector('.sort-icon').textContent = '⇅';
        });
        th.classList.add('active-sort');
        th.querySelector('.sort-icon').textContent = sortState.dir === 'asc' ? '▲' : '▼';

        applySort();
        currentPage = 1;
        renderTable();
      });
    });
  }

  // Table search
  function initTableSearch() {
    const input = document.getElementById('table-search');
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
          filteredData = [...allTableData];
        } else {
          filteredData = allTableData.filter(r =>
            r.firm.toLowerCase().includes(q) ||
            r.stock.toLowerCase().includes(q) ||
            r.ticker.toLowerCase().includes(q) ||
            r.analyst.toLowerCase().includes(q) ||
            r.date.includes(q)
          );
        }
        applySort();
        currentPage = 1;
        renderTable();
      }, 200);
    });
  }

  // ── Master Update ──
  function updateDashboard() {
    updateCards();
    renderTimeline();
    renderBiasRanking();
    // Heatmap and accuracy are global, not per-stock — only render once
  }

  // ── Initialization ──
  async function init() {
    try {
      const resp = await fetch('data.json');
      if (!resp.ok) throw new Error('데이터를 불러올 수 없습니다.');
      DATA = await resp.json();
    } catch (err) {
      console.error(err);
      document.getElementById('loading-overlay').innerHTML = `
        <div style="text-align:center;padding:40px">
          <p style="color:#ef4444;font-size:1.1rem;font-weight:600;margin-bottom:8px">⚠️ 데이터 로드 실패</p>
          <p style="color:rgba(255,255,255,.5);font-size:.85rem">${err.message}</p>
          <p style="color:rgba(255,255,255,.3);font-size:.75rem;margin-top:12px">data.json 파일이 같은 폴더에 있는지 확인해 주세요.</p>
        </div>`;
      return;
    }

    // Set generation time
    if (DATA.generated_at) {
      const d = new Date(DATA.generated_at);
      document.getElementById('generated-at').textContent =
        `데이터 생성일: ${d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    try {
      buildStockPills();
      initScaleToggles();
      buildTableData();
      initTableSort();
      initTableSearch();

      // Select 삼성전자 (005930) as default stock
      const defaultTicker = DATA.stocks['005930'] ? '005930' : Object.keys(DATA.stocks)[0];
      if (defaultTicker) selectStock(defaultTicker);

      // Global charts
      renderHeatmap();
      renderAccuracyTrend();
      renderTable();
    } catch (renderErr) {
      console.error('Error rendering dashboard components:', renderErr);
    } finally {
      // Hide loader guaranteed
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
      }, 400);
    }
  }

  // Trigger intersection-based fade-in
  function initFadeIn() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animationPlayState = 'running';
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFadeIn();
    init();
  });
})();
