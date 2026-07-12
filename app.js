/* ================================================================
   주식 컨센서스 예측 분석 대시보드 — app.js (i18n & Currency Conversion)
   ================================================================ */

(() => {
  'use strict';

  // ── State ──
  let DATA = null;
  let STOCK_CACHE = {};
  let selectedTicker = null;
  let charts = {};
  let sortState = { key: 'date', dir: 'desc' };
  let currentPage = 1;
  const PAGE_SIZE = 15;

  // ── Exchange Rate (USD / KRW) ──
  const USD_KRW_RATE = 1380;

  // ── Language & Currency State ──
  const urlParams = new URLSearchParams(window.location.search);
  const isEnPage = window.location.pathname.endsWith('index_en.html') || document.documentElement.lang === 'en';
  let currentLang = urlParams.get('lang') || (isEnPage ? 'en' : (localStorage.getItem('consensus_lang') || 'ko'));
  let currentCurrency = urlParams.get('curr') || (currentLang === 'en' ? 'USD' : (localStorage.getItem('consensus_curr') || 'AUTO'));

  // ── English Mappings for KR Stocks & Firms ──
  const KR_STOCK_EN_NAMES = {
    '005930': 'Samsung Electronics',
    '000660': 'SK Hynix',
    '373220': 'LG Energy Solution',
    '207940': 'Samsung Biologics',
    '005380': 'Hyundai Motor',
    '068270': 'Celltrion',
    '005490': 'POSCO Holdings',
    '035420': 'NAVER',
    '000270': 'Kia',
    '035720': 'Kakao',
    '105560': 'KB Financial Group',
    '055550': 'Shinhan Financial Group',
    '000810': 'Samsung Fire & Marine',
    '012330': 'Hyundai Mobis',
    '051910': 'LG Chem',
    '006400': 'Samsung SDI',
    '028260': 'Samsung C&T',
    '032830': 'Samsung Life Insurance',
    '015760': 'KEPCO',
    '034020': 'Doosan Enerbility'
  };

  const FIRM_EN_NAMES = {
    '삼성증권': 'Samsung Securities',
    'NH투자증권': 'NH Investment & Securities',
    '미래에셋증권': 'Mirae Asset Securities',
    'KB증권': 'KB Securities',
    '한국투자증권': 'Korea Investment & Securities',
    '신한투자증권': 'Shinhan Securities',
    '메리츠증권': 'Meritz Securities',
    '키움증권': 'Kiwoom Securities',
    '하나증권': 'Hana Securities',
    '유진투자증권': 'Eugene Investment & Securities',
    '대신증권': 'Daeshin Securities',
    '한화투자증권': 'Hanwha Investment & Securities',
    '교보증권': 'Kyobo Securities',
    '현대차증권': 'Hyundai Motor Securities',
    'IBK투자증권': 'IBK Securities',
    '유안타증권': 'Yuanta Securities',
    'DB금융투자': 'DB Financial Investment',
    '하이투자증권': 'iM Securities',
    'iM증권': 'iM Securities',
    'BNK투자증권': 'BNK Securities',
    '상상인증권': 'Sangsangin Securities',
    'DS투자증권': 'DS Investment & Securities',
    '카카오페이증권': 'Kakao Pay Securities',
    '토스증권': 'Toss Securities'
  };

  // ── I18N Dictionary ──
  const I18N = {
    ko: {
      title: '주식 컨센서스 예측 분석 대시보드',
      date_prefix: '데이터 생성일: ',
      live: 'LIVE',
      select_stock_title: '종목 선택 (총 40개 대표 종목)',
      search_placeholder: '종목 검색 (예: 삼성전자, Apple, NVDA...)',
      us_label: '🇺🇸 US',
      kr_label: '🇰🇷 KR',
      card_price: '현재가',
      card_target: '평균 목표가',
      card_bias: '평균 괴리율',
      card_reports: '리포트 수',
      vs_current: '현재가 대비 ',
      reports_sub: '최근 3개월 {count}개 증권사 최신',
      realistic_title: '🎯 현실적 투자 목표가 분석 (증권사별 편향 보정 모델)',
      realistic_sub: '증권사별 고유 편향 오차(Bias)를 개별 반영하여 산출한 4대 통계 (최대 / 최소 / 중앙값 / 평균값)',
      raw_badge: '1. 증권사 단순 제시 목표가',
      adj_badge: '2. 🎯 현실적 투자 목표가 (증권사별 편향 보정)',
      stat_max: '최대값 (Max)',
      stat_min: '최소값 (Min)',
      stat_med: '중앙값 (Median)',
      stat_avg: '평균값 (Mean)',
      adj_stat_max: '현실적 최대값 (Adj. Max)',
      adj_stat_min: '현실적 최소값 (Adj. Min)',
      adj_stat_med: '현실적 중앙값 (Adj. Median)',
      adj_stat_avg: '현실적 평균값 (Adj. Mean) ⭐',
      footer_note: '* 최근 3개월 이내 {count}개 증권사별 최신 리포트 1건을 추출한 뒤, 해당 종목에 대한 각 증권사의 역대 1년 실현 오차율(B_firm)을 개별 보정(T_adj = T_raw ÷ (1 + B_firm/100))하여 현실적 4대 투자 목표가를 산출했습니다.',
      timeline_title: '주가 + 목표가 타임라인',
      scale_linear: '📏 선형 (Linear)',
      scale_log: '📊 로그 축 (Log Scale)',
      scale_pct: '🎯 괴리율 (%)',
      ranking_title: '증권사별 Bias 랭킹',
      ranking_sub: '현재 선택된 종목에 대한 증권사 목표가 괴리율 비교',
      heatmap_title: '증권사 × 종목 히트맵',
      accuracy_title: '예측 정확도 트렌드',
      accuracy_sub: '리포트 수 상위 5개 증권사',
      accuracy_empty: '종목을 더 선택하면 정확도 트렌드가 표시됩니다.',
      table_title: '전체 리포트 목록',
      table_search_placeholder: '검색 (증권사, 종목, 애널리스트...)',
      th_date: '날짜',
      th_stock: '종목',
      th_firm: '증권사',
      th_analyst: '애널리스트',
      th_target: '목표가',
      th_bias: '발표 당시 괴리율(%)',
      th_category: '카테고리',
      table_total: '총 {count}건',
      footer: '© 2026 주식 컨센서스 예측 분석 시스템 | 데이터는 참고용이며 투자 권유가 아닙니다.',
      cat_overly_optimistic: '과대 긍정적',
      cat_optimistic: '긍정적',
      cat_accurate: '적정',
      cat_conservative: '보수적',
      chart_price_legend: '주가',
      chart_price_base: '기준 (발표 당시 주가)',
      chart_bias_title: '발표 당시 목표가 괴리율 (%)',
      chart_price_linear_title: '주가 / 목표가 (선형 축)',
      chart_price_log_title: '주가 / 목표가 (로그 축)',
      grade: '등급',
      bias: '발표 당시 괴리율',
      date_price: '발표 당시 주가',
      target_price: '목표가'
    },
    en: {
      title: 'Stock Consensus & Bias Analytics',
      date_prefix: 'Data Generated: ',
      live: 'LIVE',
      select_stock_title: 'Select Stock (40 Major US/KR Stocks)',
      search_placeholder: 'Search stock (e.g. Samsung, Apple, NVDA...)',
      us_label: '🇺🇸 US',
      kr_label: '🇰🇷 KR',
      card_price: 'Current Price',
      card_target: 'Avg Target Price',
      card_bias: 'Avg Bias %',
      card_reports: 'Active Reports',
      vs_current: 'vs Current ',
      reports_sub: 'latest reports from {count} firms (last 3M)',
      realistic_title: '🎯 Realistic Investment Targets (Bias Adjusted)',
      realistic_sub: '4 Core Statistics (Max / Min / Median / Mean) adjusted by individual analyst bias history',
      raw_badge: '1. Raw Brokerage Target Prices',
      adj_badge: '2. 🎯 Realistic Targets (Firm-Bias Adjusted)',
      stat_max: 'Max Target',
      stat_min: 'Min Target',
      stat_med: 'Median Target',
      stat_avg: 'Mean Target',
      adj_stat_max: 'Adj. Max Target',
      adj_stat_min: 'Adj. Min Target',
      adj_stat_med: 'Adj. Median Target',
      adj_stat_avg: 'Adj. Mean Target ⭐',
      footer_note: '* Calculated by taking the single latest report per firm (within 90d) across {count} firms and adjusting each target price by historical 1-yr bias: T_adj = T_raw / (1 + B_firm/100).',
      timeline_title: 'Price & Target Timeline',
      scale_linear: '📏 Linear Scale',
      scale_log: '📊 Log Scale',
      scale_pct: '🎯 Bias (%)',
      ranking_title: 'Firm Bias Ranking',
      ranking_sub: 'Average analyst target price bias by firm for selected stock',
      heatmap_title: 'Firm × Stock Heatmap',
      accuracy_title: 'Prediction Accuracy Trend',
      accuracy_sub: 'Top 5 coverage firms rolling bias trend',
      accuracy_empty: 'Select more stocks to view accuracy trend.',
      table_title: 'All Research Reports',
      table_search_placeholder: 'Search (Firm, Stock, Analyst...)',
      th_date: 'Date',
      th_stock: 'Stock',
      th_firm: 'Firm',
      th_analyst: 'Analyst',
      th_target: 'Target Price',
      th_bias: 'Issuance Bias (%)',
      th_category: 'Category',
      table_total: 'Total {count} reports',
      footer: '© 2026 Stock Consensus Analytics | For informational purposes only, not investment advice.',
      cat_overly_optimistic: 'Overly Optimistic',
      cat_optimistic: 'Optimistic',
      cat_accurate: 'Accurate',
      cat_conservative: 'Conservative',
      chart_price_legend: 'Stock Price',
      chart_price_base: 'Baseline (Price on Date)',
      chart_bias_title: 'Issuance Bias (%)',
      chart_price_linear_title: 'Price / Target (Linear)',
      chart_price_log_title: 'Price / Target (Log Scale)',
      grade: 'Grade',
      bias: 'Issuance Bias',
      date_price: 'Price on Date',
      target_price: 'Target Price'
    }
  };

  // ── Color palette for firms ──
  const FIRM_COLORS = [
    '#6366f1','#f59e0b','#22c55e','#ef4444','#06b6d4',
    '#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16',
    '#e879f9','#38bdf8','#fb7185','#a78bfa','#facc15',
    '#2dd4bf','#c084fc','#34d399','#fbbf24','#f472b6',
    '#818cf8','#4ade80','#fb923c','#60a5fa','#a3e635',
  ];

  // ── Helper Resolvers ──
  function getStockName(info) {
    if (!info) return '';
    if (currentLang === 'en' && info.market === 'KR' && KR_STOCK_EN_NAMES[info.ticker]) {
      return KR_STOCK_EN_NAMES[info.ticker];
    }
    return info.name;
  }

  function getFirmName(firm) {
    if (!firm) return '';
    if (currentLang === 'en' && FIRM_EN_NAMES[firm]) {
      return FIRM_EN_NAMES[firm];
    }
    return firm;
  }

  function formatPrice(val, market, forceCurrency) {
    if (val == null || isNaN(val)) return '—';

    let curr = forceCurrency || currentCurrency;
    if (curr === 'AUTO') {
      curr = currentLang === 'en' ? 'USD' : (market === 'KR' ? 'KRW' : 'USD');
    }

    if (curr === 'USD') {
      let usdVal = val;
      if (market === 'KR') {
        usdVal = val / USD_KRW_RATE;
      }
      return '$' + usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (curr === 'KRW') {
      let krwVal = val;
      if (market === 'US') {
        krwVal = val * USD_KRW_RATE;
      }
      if (currentLang === 'en') {
        return '₩' + Math.round(krwVal).toLocaleString('en-US');
      }
      return Math.round(krwVal).toLocaleString('ko-KR') + '원';
    }

    // Default Fallback
    if (market === 'KR') {
      if (currentLang === 'en') return '₩' + Math.round(val).toLocaleString('en-US');
      return Math.round(val).toLocaleString('ko-KR') + '원';
    }
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(val) {
    if (val == null) return '—';
    const sign = val > 0 ? '+' : '';
    return sign + val.toFixed(1) + '%';
  }

  function getPriceOnDate(priceHistory, targetDateStr) {
    if (!priceHistory || !priceHistory.length) return null;
    if (!priceHistory._map) {
      const map = {};
      priceHistory.forEach(p => { map[p.date] = p.close; });
      const sorted = Object.keys(map).sort();
      Object.defineProperty(priceHistory, '_map', { value: map, enumerable: false });
      Object.defineProperty(priceHistory, '_sorted', { value: sorted, enumerable: false });
    }
    const map = priceHistory._map;
    const sorted = priceHistory._sorted;

    if (map[targetDateStr]) return map[targetDateStr];

    let low = 0, high = sorted.length - 1, best = null;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (sorted[mid] <= targetDateStr) {
        best = map[sorted[mid]];
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  function getReportIssuanceBias(stock, r) {
    if (!r || r.target_price == null || r.target_price <= 0) return null;
    const pDate = getPriceOnDate(stock.price_history, r.date);
    if (pDate && pDate > 0) {
      return ((r.target_price - pDate) / pDate) * 100;
    }
    return r.current_bias_pct;
  }

  function biasCategory(bias) {
    const dict = I18N[currentLang];
    if (bias == null) return { label: '—', cls: '' };
    if (bias > 30) return { label: dict.cat_overly_optimistic, cls: 'badge-overly-optimistic' };
    if (bias > 15) return { label: dict.cat_optimistic, cls: 'badge-optimistic' };
    if (bias >= -15) return { label: dict.cat_accurate, cls: 'badge-accurate' };
    return { label: dict.cat_conservative, cls: 'badge-conservative' };
  }

  function biasColor(val) {
    if (val == null) return 'rgba(255,255,255,.2)';
    if (val > 30) return '#ef4444';
    if (val > 15) return '#f97316';
    if (val >= -15) return '#22c55e';
    return '#3b82f6';
  }

  function animateValue(el, target, market, isRawValue = true, duration = 600) {
    if (!el || target == null || isNaN(target)) return;
    const start = 0;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * ease;
      el.textContent = isRawValue ? formatPrice(current, market) : (current > 0 ? '+' : '') + current.toFixed(1) + '%';
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Stock Order ──
  const US_ORDER = [
    'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'LLY', 'JPM',
    'WMT', 'V', 'MA', 'NFLX', 'AMD', 'ORCL', 'COST', 'PEP', 'KO', 'DIS',
  ];

  const KR_ORDER = [
    '005930', '000660', '373220', '207940', '005380', '068270', '005490', '035420', '000270', '035720',
    '105560', '055550', '000810', '012330', '051910', '006400', '028260', '032830', '015760', '034020',
  ];

  function calculateStockRealisticMedian(stockSummary) {
    if (stockSummary && stockSummary.realistic_median_upside != null) {
      return stockSummary.realistic_median_upside;
    }
    return 0;
  }

  function getPillColorStyle(upsidePct) {
    if (Math.abs(upsidePct) < 0.5) {
      return {
        bg: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.15)',
        text: 'rgba(255, 255, 255, 0.8)',
        badgeBg: 'rgba(255, 255, 255, 0.1)',
        badgeText: '#cbd5e1',
        badge: '0.0%'
      };
    }

    if (upsidePct > 0) {
      const intensity = Math.min(upsidePct / 40.0, 1.0);
      const alphaBg = 0.12 + intensity * 0.28;
      const alphaBorder = 0.25 + intensity * 0.45;
      return {
        bg: `rgba(239, 68, 68, ${alphaBg.toFixed(2)})`,
        border: `rgba(239, 68, 68, ${alphaBorder.toFixed(2)})`,
        text: '#fca5a5',
        badgeBg: `rgba(239, 68, 68, ${(alphaBg + 0.15).toFixed(2)})`,
        badgeText: '#fecaca',
        badge: `+${upsidePct.toFixed(1)}%`
      };
    } else {
      const intensity = Math.min(Math.abs(upsidePct) / 25.0, 1.0);
      const alphaBg = 0.12 + intensity * 0.28;
      const alphaBorder = 0.25 + intensity * 0.45;
      return {
        bg: `rgba(59, 130, 246, ${alphaBg.toFixed(2)})`,
        border: `rgba(59, 130, 246, ${alphaBorder.toFixed(2)})`,
        text: '#93c5fd',
        badgeBg: `rgba(59, 130, 246, ${(alphaBg + 0.15).toFixed(2)})`,
        badgeText: '#bfdbfe',
        badge: `${upsidePct.toFixed(1)}%`
      };
    }
  }

  // ── Build Stock Pills ──
  function buildStockPills() {
    const usContainer = document.getElementById('pills-us');
    const krContainer = document.getElementById('pills-kr');
    usContainer.innerHTML = '';
    krContainer.innerHTML = '';

    const stocks = Object.values(DATA.stocks);
    const usStocks = stocks.filter(s => s.market === 'US');
    const krStocks = stocks.filter(s => s.market === 'KR');

    usStocks.sort((a, b) => US_ORDER.indexOf(a.ticker) - US_ORDER.indexOf(b.ticker));
    krStocks.sort((a, b) => KR_ORDER.indexOf(a.ticker) - KR_ORDER.indexOf(b.ticker));

    const createPill = (info, container) => {
      const pill = document.createElement('button');
      pill.className = 'stock-pill';
      pill.dataset.ticker = info.ticker;

      const koName = info.name;
      const enName = KR_STOCK_EN_NAMES[info.ticker] || info.name;
      pill.dataset.search = `${koName.toLowerCase()} ${enName.toLowerCase()} ${info.ticker.toLowerCase()}`;

      const upsidePct = calculateStockRealisticMedian(info);
      const style = getPillColorStyle(upsidePct);
      const displayName = getStockName(info);

      pill.style.backgroundColor = style.bg;
      pill.style.borderColor = style.border;
      pill.style.color = style.text;
      pill.innerHTML = `<span>${displayName} (${info.ticker})</span> <span style="font-size:0.7rem;font-weight:700;padding:2px 6px;border-radius:99px;background:${style.badgeBg};color:${style.badgeText};">${style.badge}</span>`;

      pill.addEventListener('click', () => selectStock(info.ticker));
      container.appendChild(pill);
    };

    usStocks.forEach(s => createPill(s, usContainer));
    krStocks.forEach(s => createPill(s, krContainer));

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

  // On-demand stock selection
  async function selectStock(ticker) {
    selectedTicker = ticker;
    document.querySelectorAll('.stock-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.ticker === ticker);
    });

    if (!STOCK_CACHE[ticker]) {
      try {
        const resp = await fetch(`stocks/${ticker}.json`);
        if (!resp.ok) {
          if (DATA.stocks[ticker] && DATA.stocks[ticker].analyst_reports) {
            STOCK_CACHE[ticker] = DATA.stocks[ticker];
          } else {
            throw new Error(`Cannot load stock detail for ${ticker}`);
          }
        } else {
          STOCK_CACHE[ticker] = await resp.json();
        }
      } catch (err) {
        console.error(err);
        return;
      }
    }
    updateDashboard();
  }

  function getActiveRecentReports(stock) {
    const targetStock = stock || STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!targetStock) return [];
    const allReports = (targetStock.analyst_reports || []).filter(r => r.target_price != null && r.target_price > 0);
    if (!allReports.length) return [];

    let maxTime = 0;
    allReports.forEach(r => {
      const t = new Date(r.date).getTime();
      if (!isNaN(t) && t > maxTime) maxTime = t;
    });
    if (!maxTime) return [];

    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    let cutoff = maxTime - ninetyDaysMs;
    let recent = allReports.filter(r => new Date(r.date).getTime() >= cutoff);

    if (recent.length < 3) {
      cutoff = maxTime - (180 * 24 * 60 * 60 * 1000);
      recent = allReports.filter(r => new Date(r.date).getTime() >= cutoff);
    }

    const firmLatestMap = {};
    recent.forEach(r => {
      const rTime = new Date(r.date).getTime();
      if (!firmLatestMap[r.firm] || rTime > new Date(firmLatestMap[r.firm].date).getTime()) {
        firmLatestMap[r.firm] = r;
      }
    });

    return Object.values(firmLatestMap);
  }

  // ── Update Summary Cards ──
  function updateCards() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;
    const market = stock.market;
    const activeReports = getActiveRecentReports(stock);
    const currentPrice = stock.current_price;
    const dict = I18N[currentLang];

    const targets = activeReports.map(r => r.target_price);
    const avgTarget = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : null;

    const biases = activeReports.map(r => getReportIssuanceBias(stock, r)).filter(b => b != null);
    const avgBias = biases.length ? biases.reduce((a, b) => a + b, 0) / biases.length : null;

    // Price
    animateValue(document.getElementById('val-price'), currentPrice, market, true);
    document.getElementById('sub-price').textContent = `${getStockName(stock)} · ${stock.market}`;

    // Target
    if (avgTarget != null) {
      animateValue(document.getElementById('val-target'), Math.round(avgTarget), market, true);
    } else {
      document.getElementById('val-target').textContent = '—';
    }
    const diff = avgTarget != null ? avgTarget - currentPrice : null;
    document.getElementById('sub-target').textContent = diff != null
      ? `${dict.vs_current}${diff >= 0 ? '+' : ''}${formatPrice(diff, market)}`
      : '';

    // Bias
    if (avgBias != null) {
      animateValue(document.getElementById('val-bias'), avgBias, market, false);
      const bc = biasCategory(avgBias);
      document.getElementById('sub-bias').textContent = bc.label;
      document.getElementById('sub-bias').style.color = biasColor(avgBias);
    } else {
      document.getElementById('val-bias').textContent = '—';
      document.getElementById('sub-bias').textContent = '';
    }

    // Reports
    const repValEl = document.getElementById('val-reports');
    if (repValEl) repValEl.textContent = activeReports.length;
    document.getElementById('sub-reports').textContent = dict.reports_sub.replace('{count}', activeReports.length);

    // Realistic Target Stats
    updateRealisticTargetStats(stock);
  }

  function updateRealisticTargetStats(stockArg) {
    const stock = stockArg || STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;
    const market = stock.market;
    const activeReports = getActiveRecentReports(stock);
    const currentPrice = stock.current_price;
    const dict = I18N[currentLang];
    if (!activeReports.length || !currentPrice) return;

    const allReports = (stock.analyst_reports || []).filter(r => r.target_price != null && r.target_price > 0);
    const priceHist = stock.price_history || [];

    const maxHistDate = priceHist.length ? priceHist[priceHist.length - 1].date : '';
    const firmBiasListMap = {};

    allReports.forEach(r => {
      if (!r.date || !r.firm) return;
      const dt = new Date(r.date);
      if (isNaN(dt.getTime())) return;

      const dt1y = new Date(dt);
      dt1y.setFullYear(dt1y.getFullYear() + 1);
      const dt1yStr = dt1y.toISOString().split('T')[0];

      if (dt1yStr <= maxHistDate) {
        const p1y = getPriceOnDate(priceHist, dt1yStr);
        if (p1y && p1y > 0) {
          const bias1y = ((r.target_price - p1y) / p1y) * 100;
          if (bias1y >= -70 && bias1y <= 200) {
            if (!firmBiasListMap[r.firm]) firmBiasListMap[r.firm] = [];
            firmBiasListMap[r.firm].push(bias1y);
          }
        }
      }
    });

    const firmAvgBiasMap = {};
    for (const [firm, list] of Object.entries(firmBiasListMap)) {
      const avg = list.reduce((a, b) => a + b, 0) / list.length;
      firmAvgBiasMap[firm] = Math.max(-30, Math.min(50, avg));
    }

    const calcStats = (vals) => {
      const sorted = [...vals].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return { min, max, median, mean };
    };

    const rawVals = activeReports.map(r => r.target_price);
    const rawStats = calcStats(rawVals);

    const adjVals = activeReports.map(r => {
      const b = firmAvgBiasMap[r.firm] !== undefined ? firmAvgBiasMap[r.firm] : 15.0;
      return r.target_price / (1 + (b / 100));
    });
    const adjStats = calcStats(adjVals);

    const renderStatBox = (valId, subId, val) => {
      const valEl = document.getElementById(valId);
      const subEl = document.getElementById(subId);
      if (!valEl || !subEl) return;

      animateValue(valEl, Math.round(val), market, true);
      const upside = ((val - currentPrice) / currentPrice) * 100;
      const sign = upside >= 0 ? '+' : '';
      subEl.textContent = `${dict.vs_current}${sign}${upside.toFixed(1)}%`;
      subEl.style.color = upside >= 0 ? '#4ade80' : '#ef4444';
    };

    renderStatBox('raw-stat-max', 'raw-sub-max', rawStats.max);
    renderStatBox('raw-stat-min', 'raw-sub-min', rawStats.min);
    renderStatBox('raw-stat-med', 'raw-sub-med', rawStats.median);
    renderStatBox('raw-stat-avg', 'raw-sub-avg', rawStats.mean);

    renderStatBox('adj-stat-max', 'adj-sub-max', adjStats.max);
    renderStatBox('adj-stat-min', 'adj-sub-min', adjStats.min);
    renderStatBox('adj-stat-med', 'adj-sub-med', adjStats.median);
    renderStatBox('adj-stat-avg', 'adj-sub-avg', adjStats.mean);

    const noteEl = document.getElementById('realistic-footer-note');
    if (noteEl) {
      noteEl.textContent = dict.footer_note.replace('{count}', activeReports.length);
    }
  }

  // ── State for Timeline Scale Mode ──
  let currentScaleMode = 'log';

  function initScaleToggles() {
    const container = document.getElementById('timeline-scale-toggles');
    if (!container || container.dataset.bound) return;
    container.dataset.bound = 'true';
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.scale-btn');
      if (!btn) return;
      const mode = btn.dataset.scale;
      if (!mode || mode === currentScaleMode) return;

      currentScaleMode = mode;
      container.querySelectorAll('.scale-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.scale === mode);
      });
      renderTimeline();
    });
  }

  // ── Chart 1: Timeline ──
  function renderTimeline() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;

    const dict = I18N[currentLang];
    const isPct = currentScaleMode === 'pct';
    const isLog = currentScaleMode === 'log';

    let series = [];
    let yaxisOpts = {};
    const scatterSeries = [];
    const scatterColors = [];
    let colorIdx = 0;

    if (isPct) {
      const priceData = (stock.price_history || []).map(p => ({
        x: new Date(p.date).getTime(), y: 0
      }));

      const firmMap = {};
      (stock.analyst_reports || []).forEach(r => {
        const issuanceBias = getReportIssuanceBias(stock, r);
        if (issuanceBias == null) return;
        const displayName = getFirmName(r.firm);
        const reportPrice = getPriceOnDate(stock.price_history, r.date);
        if (!firmMap[displayName]) firmMap[displayName] = [];
        firmMap[displayName].push({
          x: new Date(r.date).getTime(),
          y: parseFloat(issuanceBias.toFixed(1)),
          firm: displayName,
          analyst: r.analyst,
          target_price: r.target_price,
          report_price: reportPrice,
          bias: issuanceBias,
          grade: r.grade
        });
      });

      for (const [firm, pts] of Object.entries(firmMap)) {
        scatterSeries.push({ name: firm, type: 'scatter', data: pts });
        scatterColors.push(FIRM_COLORS[colorIdx % FIRM_COLORS.length]);
        colorIdx++;
      }

      const priceSeries = { name: dict.chart_price_base, type: 'line', data: priceData };
      series = [...scatterSeries, priceSeries];

      yaxisOpts = {
        labels: {
          style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
          formatter: v => v != null ? (v > 0 ? '+' : '') + v.toFixed(0) + '%' : ''
        },
        title: { text: dict.chart_bias_title, style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' } }
      };

    } else {
      const priceData = (stock.price_history || []).map(p => ({
        x: new Date(p.date).getTime(), y: p.close
      }));

      const firmMap = {};
      (stock.analyst_reports || []).forEach(r => {
        const displayName = getFirmName(r.firm);
        const reportPrice = getPriceOnDate(stock.price_history, r.date);
        const issuanceBias = getReportIssuanceBias(stock, r);
        if (!firmMap[displayName]) firmMap[displayName] = [];
        firmMap[displayName].push({
          x: new Date(r.date).getTime(),
          y: r.target_price,
          firm: displayName,
          analyst: r.analyst,
          target_price: r.target_price,
          report_price: reportPrice,
          bias: issuanceBias,
          grade: r.grade
        });
      });

      for (const [firm, pts] of Object.entries(firmMap)) {
        scatterSeries.push({ name: firm, type: 'scatter', data: pts });
        scatterColors.push(FIRM_COLORS[colorIdx % FIRM_COLORS.length]);
        colorIdx++;
      }

      const priceSeries = { name: dict.chart_price_legend, type: 'line', data: priceData };
      series = [...scatterSeries, priceSeries];

      if (isLog) {
        const allVals = [
          ...priceData.map(p => p.y),
          ...Object.values(firmMap).flatMap(pts => pts.map(p => p.y))
        ].filter(v => v != null && v > 0);

        const minVal = allVals.length ? Math.max(1, Math.floor(Math.min(...allVals) * 0.9)) : 10;
        const maxVal = allVals.length ? Math.ceil(Math.max(...allVals) * 1.1) : 100000;

        yaxisOpts = {
          logarithmic: true,
          logBase: 10,
          min: minVal,
          max: maxVal,
          labels: {
            style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
            formatter: v => {
              if (v == null || isNaN(v) || v <= 0) return '';
              return formatPrice(v, stock.market);
            }
          },
          title: {
            text: dict.chart_price_log_title,
            style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' }
          }
        };
      } else {
        yaxisOpts = {
          labels: {
            style: { colors: 'rgba(255,255,255,.4)', fontSize: '11px' },
            formatter: v => {
              if (v == null || isNaN(v)) return '';
              return formatPrice(v, stock.market);
            }
          },
          title: {
            text: dict.chart_price_linear_title,
            style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' }
          }
        };
      }
    }

    const firmCount = scatterSeries.length;
    const chartColors = [...scatterColors, '#6366f1'];
    const strokeWidths = [...Array(firmCount).fill(0), 3.5];
    const markerSizes = [...Array(firmCount).fill(3.8), 0];
    const opacities = [...Array(firmCount).fill(0.5), 1.0];

    const opts = {
      series,
      chart: {
        type: 'line', height: 480, background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
        animations: { enabled: true, easing: 'easeinout', speed: 600 },
      },
      colors: chartColors,
      stroke: { width: strokeWidths, curve: 'smooth' },
      markers: {
        size: markerSizes,
        strokeWidth: 0,
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
        position: 'bottom', horizontalAlign: 'center',
        labels: { colors: 'rgba(255,255,255,.6)' },
        fontSize: '11px', fontWeight: 500,
        itemMargin: { horizontal: 10, vertical: 5 }
      },
      tooltip: {
        theme: 'dark',
        shared: false,
        custom: function({ series: s, seriesIndex, dataPointIndex, w }) {
          const isLineSeries = seriesIndex === series.length - 1;
          const point = w.config.series[seriesIndex].data[dataPointIndex];
          if (!point) return '';
          const dateStr = new Date(point.x).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ko-KR');
          if (isLineSeries) {
            return `<div style="padding:10px 14px;font-size:12px;">
              <div style="color:rgba(255,255,255,.5);margin-bottom:4px;">${dateStr}</div>
              <div style="font-weight:700;">${isPct ? dict.chart_price_base : dict.chart_price_legend + ': ' + formatPrice(point.y, stock.market)}</div>
            </div>`;
          }
          const datePriceStr = point.report_price ? `<div>${dict.date_price}: <strong>${formatPrice(point.report_price, stock.market)}</strong></div>` : '';
          return `<div style="padding:10px 14px;font-size:12px;max-width:260px;">
            <div style="color:rgba(255,255,255,.5);margin-bottom:4px;">${dateStr}</div>
            <div style="font-weight:700;margin-bottom:2px;">${point.firm}</div>
            ${point.analyst ? `<div style="color:rgba(255,255,255,.5);margin-bottom:4px;">${point.analyst}</div>` : ''}
            ${datePriceStr}
            <div>${dict.target_price}: <strong>${formatPrice(point.target_price || point.y, stock.market)}</strong></div>
            ${point.grade ? `<div>${dict.grade}: ${point.grade}</div>` : ''}
            ${point.bias != null ? `<div>${dict.bias}: <span style="color:${biasColor(point.bias)}">${formatPercent(point.bias)}</span></div>` : ''}
          </div>`;
        }
      },
    };

    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new ApexCharts(document.getElementById('chart-timeline'), opts);
    charts.timeline.render();
  }

  // ── Reports Table Data ──
  let allTableData = [];
  let filteredData = [];

  function buildTableData() {
    allTableData = [];
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (stock && stock.analyst_reports) {
      stock.analyst_reports.forEach(r => {
        const issuanceBias = getReportIssuanceBias(stock, r);
        allTableData.push({
          date: r.date,
          stock: getStockName(stock),
          ticker: selectedTicker,
          market: stock.market,
          firm: getFirmName(r.firm),
          raw_firm: r.firm,
          analyst: r.analyst || '—',
          target: r.target_price,
          bias: issuanceBias,
          grade: r.grade || '',
          action: r.action || ''
        });
      });
    }
    filteredData = [...allTableData];
    applySort();
    renderTable();
  }

  // ── Chart 2: Bias Ranking ──
  function renderBiasRanking() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;

    const firmBias = {};
    (stock.analyst_reports || []).forEach(r => {
      const issuanceBias = getReportIssuanceBias(stock, r);
      if (issuanceBias == null) return;
      const name = getFirmName(r.firm);
      if (!firmBias[name]) firmBias[name] = [];
      firmBias[name].push(issuanceBias);
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
      series: [{ name: I18N[currentLang].card_bias, data: values }],
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
        formatter: (val, { dataPointIndex }) => `${val > 0 ? '+' : ''}${val}% (${counts[dataPointIndex]})`
      },
      xaxis: {
        categories,
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
    };

    if (charts.biasRanking) charts.biasRanking.destroy();
    charts.biasRanking = new ApexCharts(document.getElementById('chart-bias-ranking'), opts);
    charts.biasRanking.render();
  }

  // ── Chart 3: Heatmap ──
  function renderHeatmap() {
    const firmStats = DATA.firm_stats;
    if (!firmStats) return;

    const allStocks = Object.keys(DATA.stocks);
    const firms = Object.entries(firmStats)
      .sort((a, b) => b[1].total_reports - a[1].total_reports)
      .slice(0, 20);

    const series = firms.map(([firm, stats]) => {
      const data = allStocks.map((ticker) => {
        const byStock = stats.by_stock || {};
        const entry = byStock[ticker];
        const hasBias = entry && entry.avg_bias != null;
        return {
          x: getStockName(DATA.stocks[ticker]),
          y: hasBias ? parseFloat(entry.avg_bias.toFixed(1)) : null
        };
      });
      return { name: getFirmName(firm), data };
    });

    const dict = I18N[currentLang];
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
              { from: -100, to: -15.01, color: '#3b82f6', name: dict.cat_conservative },
              { from: -15, to: 15, color: '#374151', name: dict.cat_accurate },
              { from: 15.01, to: 30, color: '#f97316', name: dict.cat_optimistic },
              { from: 30.01, to: 200, color: '#ef4444', name: dict.cat_overly_optimistic },
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
        y: { formatter: v => v != null ? (v > 0 ? '+' : '') + v + '%' : '—' }
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
  async function renderAccuracyTrend() {
    const allReports = [];
    for (const [ticker, stock] of Object.entries(STOCK_CACHE)) {
      (stock.analyst_reports || []).forEach(r => {
        if (r.realized_bias_pct != null) {
          allReports.push({ ...r, ticker, date: r.date });
        }
      });
    }

    if (allReports.length < 50) {
      const majorTickers = ['005930', '000660', '005380', 'AAPL', 'NVDA', 'MSFT'].filter(t => DATA.stocks[t] && !STOCK_CACHE[t]);
      await Promise.all(majorTickers.map(async t => {
        try {
          const resp = await fetch(`stocks/${t}.json`);
          if (resp.ok) {
            STOCK_CACHE[t] = await resp.json();
            (STOCK_CACHE[t].analyst_reports || []).forEach(r => {
              if (r.realized_bias_pct != null) {
                allReports.push({ ...r, ticker: t, date: r.date });
              }
            });
          }
        } catch(e) { /* skip */ }
      }));
    }

    if (!allReports.length) {
      const el = document.getElementById('chart-accuracy');
      if (el) el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:rgba(255,255,255,.3);font-size:.85rem;">${I18N[currentLang].accuracy_empty}</div>`;
      return;
    }

    const firmCounts = {};
    allReports.forEach(r => { firmCounts[r.firm] = (firmCounts[r.firm] || 0) + 1; });
    const topFirms = Object.entries(firmCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    const firmReports = {};
    topFirms.forEach(f => { firmReports[f] = []; });
    allReports.forEach(r => {
      if (topFirms.includes(r.firm)) {
        firmReports[r.firm].push(r);
      }
    });

    const series = topFirms.map((firm) => {
      const sorted = firmReports[firm].sort((a, b) => new Date(a.date) - new Date(b.date));
      const window = 3;
      const data = sorted.map((r, idx) => {
        const start = Math.max(0, idx - window + 1);
        const slice = sorted.slice(start, idx + 1);
        const avg = slice.reduce((s, x) => s + Math.abs(x.realized_bias_pct), 0) / slice.length;
        return { x: new Date(r.date).getTime(), y: parseFloat(avg.toFixed(1)) };
      });
      return { name: getFirmName(firm), data };
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
        title: { text: '|Bias| Rolling Avg (%)', style: { color: 'rgba(255,255,255,.4)', fontSize: '11px' } },
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

    const dict = I18N[currentLang];
    document.getElementById('table-count').textContent = dict.table_total.replace('{count}', filteredData.length.toLocaleString());
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
            (r.firm || '').toLowerCase().includes(q) ||
            (r.raw_firm || '').toLowerCase().includes(q) ||
            (r.stock || '').toLowerCase().includes(q) ||
            (r.ticker || '').toLowerCase().includes(q) ||
            (r.analyst || '').toLowerCase().includes(q) ||
            (r.date || '').includes(q)
          );
        }
        applySort();
        currentPage = 1;
        renderTable();
      }, 200);
    });
  }

  // ── Language & Currency Controls Handler ──
  function applyLanguageDOM() {
    const dict = I18N[currentLang];
    document.documentElement.lang = currentLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (dict[key]) el.placeholder = dict[key];
    });

    document.querySelectorAll('#lang-switcher .ctrl-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });

    document.querySelectorAll('#curr-switcher .ctrl-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.curr === currentCurrency);
    });
  }

  function initControls() {
    const langGroup = document.getElementById('lang-switcher');
    if (langGroup && !langGroup.dataset.bound) {
      langGroup.dataset.bound = 'true';
      langGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-lang]');
        if (!btn) return;
        const targetLang = btn.dataset.lang;
        if (targetLang === currentLang) return;

        currentLang = targetLang;
        localStorage.setItem('consensus_lang', currentLang);

        // If on index.html and switched to en, or vice versa, offer direct page navigation or in-place update
        if (currentLang === 'en' && !window.location.pathname.endsWith('index_en.html')) {
          window.location.href = 'index_en.html';
          return;
        } else if (currentLang === 'ko' && window.location.pathname.endsWith('index_en.html')) {
          window.location.href = 'index.html';
          return;
        }

        applyLanguageDOM();
        buildStockPills();
        updateDashboard();
        renderHeatmap();
        renderAccuracyTrend();
      });
    }

    const currGroup = document.getElementById('curr-switcher');
    if (currGroup && !currGroup.dataset.bound) {
      currGroup.dataset.bound = 'true';
      currGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-curr]');
        if (!btn) return;
        const targetCurr = btn.dataset.curr;
        if (targetCurr === currentCurrency) return;

        currentCurrency = targetCurr;
        localStorage.setItem('consensus_curr', currentCurrency);
        applyLanguageDOM();
        updateDashboard();
      });
    }
  }

  // ── Master Update ──
  function updateDashboard() {
    updateCards();
    renderTimeline();
    renderBiasRanking();
    buildTableData();
  }

  // ── Initialization ──
  async function init() {
    try {
      let resp = await fetch('summary.json');
      if (!resp.ok) {
        resp = await fetch('data.json');
        if (!resp.ok) throw new Error('Cannot load data file.');
      }
      DATA = await resp.json();
    } catch (err) {
      console.error(err);
      document.getElementById('loading-overlay').innerHTML = `
        <div style="text-align:center;padding:40px">
          <p style="color:#ef4444;font-size:1.1rem;font-weight:600;margin-bottom:8px">⚠️ Data Load Error</p>
          <p style="color:rgba(255,255,255,.5);font-size:.85rem">${err.message}</p>
        </div>`;
      return;
    }

    if (DATA.generated_at) {
      const d = new Date(DATA.generated_at);
      const dict = I18N[currentLang];
      const formattedDate = currentLang === 'en'
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('generated-at').textContent = `${dict.date_prefix}${formattedDate}`;
    }

    try {
      applyLanguageDOM();
      initControls();
      buildStockPills();
      initScaleToggles();
      initTableSort();
      initTableSearch();

      const defaultTicker = DATA.stocks['005930'] ? '005930' : Object.keys(DATA.stocks)[0];
      if (defaultTicker) await selectStock(defaultTicker);

      renderHeatmap();
      renderAccuracyTrend();
    } catch (renderErr) {
      console.error('Error rendering dashboard components:', renderErr);
    } finally {
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
      }, 400);
    }
  }

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
