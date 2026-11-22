/* ================================================================
   Stock Consensus & Bias Analytics — app.js (Optimized UX Engine)
   ================================================================ */

(() => {
  'use strict';

  const U = window.ConsensusUtils;
  if (!U) {
    console.error('ConsensusUtils (utils.js) must be loaded before app.js');
    return;
  }

  // ── Constants & Market Cap Order ──
  const USD_KRW_RATE = U.DEFAULT_FX_RATE;
  const PAGE_SIZE = 15;

  const US_ORDER = [
    'NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'AVGO', 'META', 'TSLA', 'LLY', 'JPM',
    'WMT', 'AMD', 'V', 'MA', 'COST', 'ORCL', 'KO', 'NFLX', 'SNDK', 'PEP', 'DIS'
  ];

  const KR_ORDER = [
    '005930', '000660', '005380', '009150', '373220', '207940', '028260', '105560',
    '032830', '000270', '055550', '034020', '012330', '068270', '006400', '035420',
    '000810', '005490', '051910', '015760', '035720'
  ];

  const FIRM_COLORS = [
    '#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f472b6',
    '#a78bfa', '#fb923c', '#38bdf8'
  ];

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
    '034020': 'Doosan Enerbility',
    '009150': 'Samsung Electro-Mechanics'
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
      loading_text: '컨센서스 데이터 분석 준비 중...',
      date_prefix: '데이터 생성일: ',
      quick_jump: '종목 검색',
      screener_btn: '42종목 스크리너',
      switch_stock_btn: '종목 변경',
      sticky_adj_label: '12M 보정',
      sticky_pred_label: '3M 예측',
      tab_all: '전체 42',
      tab_us: '🇺🇸 미국 21',
      tab_kr: '🇰🇷 한국 21',
      sort_label: '정렬',
      sort_mcap: '시총순 (기본)',
      sort_upside_desc: '상승여력 높은순 ↑',
      sort_upside_asc: '하방위험 높은순 ↓',
      sort_vol_desc: '변동성 높은순',
      sort_reports_desc: '활성 증권사 많은순',
      search_placeholder: '종목 필터 (예: 삼성전자, NVDA)...',
      expand_pills: '전체 펼치기',
      collapse_pills: '접기',
      pulse_top_upside: '▲ 상위 상승여력',
      pulse_top_downside: '▼ 하방 주의',
      legend_upside: '상승여력(+)',
      legend_downside: '하방위험(-)',
      us_label: '🇺🇸 US',
      kr_label: '🇰🇷 KR',
      share_link: '링크 복사',
      copied_toast: '종목 분석 링크가 클립보드에 복사되었습니다.',
      csv_toast: '리포트 CSV 파일 다운로드를 시작했습니다.',
      gauge_title: '현재가 vs 편향 보정 목표가 범위 (12M Adj. Range & 3M Forecast)',
      gauge_leg_cur: '현재가',
      gauge_leg_pred: '3M 예측',
      gauge_leg_adj: '12M 보정 평균',
      verdict_strong_up: '보정 목표가 대비 강한 상승여력',
      verdict_up: '보정 목표가 대비 완만한 상승여력',
      verdict_fair: '현실적 적정가 부근',
      verdict_down: '보정 목표가 상회 (과열 주의)',
      card_price: '현재가',
      card_adj_target: '12M 현실적 목표가',
      card_prediction: '3개월 후 예측가',
      card_bias: '발표 당시 평균 괴리율',
      vs_current: '현재가 대비 ',
      vs_raw_bubble: '단순 평균 대비 ',
      bubble_cut_suffix: ' 거품 제거',
      reports_sub: '최근 3개월 {count}개 증권사 최신 리포트',
      firms_chip: '활성 증권사 {count}곳',
      vol_chip_title: '최근 1년 일별 로그수익률 기준 연율화 변동성',
      alpha_chip_title: '종목 변동성에 연동된 3개월 가격 수렴 계수 (2~10%)',
      tip_adj_target: '각 증권사의 과거 3개월 실현 오차(Bias)를 베이지안 수축 모델로 보정해 낙관 거품을 제거한 12개월 현실적 평균 목표가입니다.',
      tip_prediction: '현재가에서 12개월 현실적 목표가로의 3개월 수렴 속도를 종목 변동성 연동 동적 α(2~10%)로 시뮬레이션한 단기 예측치입니다.',
      tip_bias: '리포트 발표 당일(±7일 이내) 실제 주가 대비 증권사가 제시한 목표가의 평균 프리미엄(%)입니다.',
      tip_adj_badge: 'T_adj = T_raw ÷ (1 + B_shrunk / 100). 표본이 적은 증권사의 왜곡을 막기 위해 글로벌 평균 편향으로 베이지안 수축을 적용합니다.',
      tip_pred_badge: 'P_3m = P_now + α_i × (T_adj - P_now). 고변동성 성장주는 높은 α, 저변동성 방어주는 낮은 α가 자동 적용됩니다.',
      realistic_title: '3단계 목표가 보정 파이프라인 (Raw → Bias-Adjusted → 3M Forecast)',
      realistic_sub: '증권사별 고유 편향 오차(Bias)와 종목 변동성을 단계적으로 반영한 4대 핵심 통계',
      raw_badge: '증권사 단순 제시 목표가',
      adj_badge: '현실적 투자 목표가 (편향 보정)',
      pred_badge: '3개월 후 예측가 (통계 모델)',
      stat_max: '최대값 (Max)',
      stat_min: '최소값 (Min)',
      stat_med: '중앙값 (Median)',
      stat_avg: '평균값 (Mean)',
      adj_stat_max: '현실적 최대 (Adj. Max)',
      adj_stat_min: '현실적 최소 (Adj. Min)',
      adj_stat_med: '현실적 중앙 (Adj. Median)',
      adj_stat_avg: '현실적 평균 (Adj. Mean) ⭐',
      pred_stat_max: '예측 최대 (Pred. Max)',
      pred_stat_min: '예측 최소 (Pred. Min)',
      pred_stat_med: '예측 중앙 (Pred. Median)',
      pred_stat_avg: '예측 평균 (Pred. Mean) ⭐',
      footer_note: '* 최근 3개월 이내 {count}개 증권사별 최신 리포트에 반감기 30일 시간 감쇄 가중치와 역대 3개월 실현 오차율(Bayesian Shrinkage)을 적용해 산출했습니다.',
      nav_timeline: '📈 타임라인',
      nav_ranking: '🏆 증권사 랭킹',
      nav_heatmap: '🔥 시장 히트맵',
      nav_accuracy: '📉 정확도 트렌드',
      nav_reports: '📋 리포트 목록',
      timeline_title: '주가 + 목표가 타임라인',
      timeline_desc: '상위 8개 커버 증권사 개별 표시 · 기타 증권사 통합 표시 (호버 시 상세 정보 확인)',
      scale_linear: '선형',
      scale_log: '로그 축',
      scale_pct: '괴리율 (%)',
      toggle_guides: '목표선 표시',
      other_firms: '기타 증권사',
      ranking_title: '증권사별 Bias 랭킹',
      ranking_sub: '선택 종목의 증권사별 평균 발표 괴리율 비교 (괄호: 리포트 건수)',
      ranking_showing: '전체 {total}개 중 {shown}개 증권사 표시 (최소 {min}건 이상)',
      min_rep_1: '전체',
      min_rep_3: '3건+',
      min_rep_5: '5건+',
      rank_compact: '상·하위 요약',
      rank_all: '전체 보기',
      heatmap_title: '증권사 × 종목 편향 히트맵',
      heatmap_sub: '시장별 주요 증권사의 종목별 평균 괴리율 · 셀을 클릭하면 해당 종목으로 이동합니다',
      accuracy_title: '예측 정확도 트렌드 (|실현 오차| 이동평균)',
      accuracy_sub: '낮을수록 실제 주가를 정확히 예측한 증권사입니다 (상위 커버 5개사)',
      acc_scope_stock: '현재 종목',
      acc_scope_market: '대표 6종목 종합',
      accuracy_empty: '실현 오차(90일 경과)를 계산할 수 있는 과거 리포트가 부족합니다.',
      table_title: '전체 리포트 목록',
      table_search_placeholder: '검색 (증권사, 애널리스트, 날짜)...',
      export_csv: 'CSV',
      cat_all: '전체',
      cat_no_data: '미커버',
      cat_overly_optimistic: '과대 긍정적',
      cat_optimistic: '긍정적',
      cat_accurate: '적정',
      cat_conservative: '보수적',
      th_date: '날짜',
      th_stock: '종목',
      th_firm: '증권사',
      th_analyst: '애널리스트',
      th_date_price: '발표 당시 주가',
      th_target: '목표가',
      th_bias: '발표 괴리율(%)',
      th_category: '성향',
      table_total: '총 {count}건',
      table_empty: '조건에 일치하는 리포트가 없습니다.',
      cmd_placeholder: '종목명 또는 티커 입력 (↑↓ 이동 · Enter 선택 · ESC 닫기)',
      screener_title: '42개 종목 컨센서스 비교 스크리너',
      screener_sub: '행을 클릭하면 해당 종목의 상세 분석 화면으로 이동합니다',
      scr_adj_mean: '12M 보정 평균',
      scr_upside: '보정 상승여력',
      scr_pred_3m: '3M 예측가',
      scr_vol: '변동성(σ)',
      scr_firms: '활성 증권사',
      footer: '© 2026 주식 컨센서스 예측 분석 시스템 | 데이터는 참고용이며 투자 권유가 아닙니다.',
      chart_price_legend: '주가',
      chart_price_base: '기준 (발표 당시 주가)',
      chart_bias_title: '발표 당시 목표가 괴리율 (%)',
      chart_price_linear_title: '주가 / 목표가 (선형)',
      chart_price_log_title: '주가 / 목표가 (로그)',
      grade: '등급',
      bias: '발표 당시 괴리율',
      date_price: '발표 당시 주가',
      target_price: '목표가',
      guide_current: '현재가',
      guide_adj: '12M 보정',
      guide_pred: '3M 예측',
      load_error_stock: '종목 상세 데이터를 불러오지 못했습니다.',
      retry_btn: '🔄 다시 시도'
    },
    en: {
      title: 'Stock Consensus & Bias Analytics',
      loading_text: 'Loading consensus analytics...',
      date_prefix: 'Data Generated: ',
      quick_jump: 'Quick Jump',
      screener_btn: '42-Stock Screener',
      switch_stock_btn: 'Switch Stock',
      sticky_adj_label: '12M Adj',
      sticky_pred_label: '3M Pred',
      tab_all: 'All 42',
      tab_us: '🇺🇸 US 21',
      tab_kr: '🇰🇷 KR 21',
      sort_label: 'Sort',
      sort_mcap: 'Market Cap (Default)',
      sort_upside_desc: 'Highest Upside ↑',
      sort_upside_asc: 'Most Downside ↓',
      sort_vol_desc: 'Highest Volatility',
      sort_reports_desc: 'Most Active Firms',
      search_placeholder: 'Filter stocks (e.g. Samsung, NVDA)...',
      expand_pills: 'Expand All',
      collapse_pills: 'Collapse',
      pulse_top_upside: '▲ Top Upside',
      pulse_top_downside: '▼ Caution / Downside',
      legend_upside: 'Upside (+)',
      legend_downside: 'Downside (-)',
      us_label: '🇺🇸 US',
      kr_label: '🇰🇷 KR',
      share_link: 'Share Link',
      copied_toast: 'Stock analysis link copied to clipboard.',
      csv_toast: 'Reports CSV export started.',
      gauge_title: 'Current Price vs Bias-Adjusted Target Range (12M Adj. & 3M Forecast)',
      gauge_leg_cur: 'Current',
      gauge_leg_pred: '3M Pred',
      gauge_leg_adj: '12M Adj. Mean',
      verdict_strong_up: 'Strong Upside vs Adjusted Consensus',
      verdict_up: 'Moderate Upside Potential',
      verdict_fair: 'Trading Near Fair Adjusted Target',
      verdict_down: 'Above Adjusted Target (Caution)',
      card_price: 'Current Price',
      card_adj_target: '12M Realistic Target',
      card_prediction: '3M Predicted Price',
      card_bias: 'Avg Issuance Bias',
      vs_current: 'vs Current ',
      vs_raw_bubble: 'vs Raw Mean ',
      bubble_cut_suffix: ' bias trimmed',
      reports_sub: 'latest reports from {count} firms (last 3M)',
      firms_chip: '{count} Active Firms',
      vol_chip_title: '1-year annualized volatility from daily log returns',
      alpha_chip_title: 'Dynamic 3-month convergence factor scaled by volatility (2–10%)',
      tip_adj_target: 'Realistic 12-month target mean derived by adjusting each brokerage target for its historical 3-month realized bias using Bayesian shrinkage.',
      tip_prediction: '3-month price forecast modeling partial convergence from current price toward the 12-month adjusted target using volatility-linked dynamic α (2–10%).',
      tip_bias: 'Average target premium (%) over the stock closing price on each report issuance date (±7d window).',
      tip_adj_badge: 'T_adj = T_raw / (1 + B_shrunk / 100). Bayesian shrinkage pulls low-sample firm estimates toward the global firm mean.',
      tip_pred_badge: 'P_3m = P_now + α_i × (T_adj - P_now). Higher-volatility stocks receive faster convergence α; defensive stocks receive lower α.',
      realistic_title: '3-Stage Target Adjustment Pipeline (Raw → Bias-Adjusted → 3M Forecast)',
      realistic_sub: 'Core statistics (Mean / Median / Max / Min) sequentially adjusted by firm bias & volatility',
      raw_badge: 'Raw Brokerage Targets',
      adj_badge: 'Realistic Targets (Firm-Bias Adjusted)',
      pred_badge: '3-Month Prediction (Statistical Model)',
      stat_max: 'Max Target',
      stat_min: 'Min Target',
      stat_med: 'Median Target',
      stat_avg: 'Mean Target',
      adj_stat_max: 'Adj. Max',
      adj_stat_min: 'Adj. Min',
      adj_stat_med: 'Adj. Median',
      adj_stat_avg: 'Adj. Mean ⭐',
      pred_stat_max: 'Pred. Max',
      pred_stat_min: 'Pred. Min',
      pred_stat_med: 'Pred. Median',
      pred_stat_avg: 'Pred. Mean ⭐',
      footer_note: '* Computed from the latest report per firm (within 90d) across {count} firms using 30-day half-life time decay and Bayesian-shrunk 3-month realized firm bias.',
      nav_timeline: '📈 Timeline',
      nav_ranking: '🏆 Firm Ranking',
      nav_heatmap: '🔥 Market Heatmap',
      nav_accuracy: '📉 Accuracy Trend',
      nav_reports: '📋 Reports',
      timeline_title: 'Price & Target Timeline',
      timeline_desc: 'Top 8 coverage firms highlighted individually · remaining firms grouped cleanly (hover for full report details)',
      scale_linear: 'Linear',
      scale_log: 'Log Scale',
      scale_pct: 'Bias (%)',
      toggle_guides: 'Target Guides',
      other_firms: 'Other Firms',
      ranking_title: 'Firm Bias Ranking',
      ranking_sub: 'Average analyst target price issuance bias by firm (parentheses: report count)',
      ranking_showing: 'Showing {shown} of {total} firms (min {min}+ reports)',
      min_rep_1: 'All',
      min_rep_3: '3+',
      min_rep_5: '5+',
      rank_compact: 'Top/Bottom 16',
      rank_all: 'Show All',
      heatmap_title: 'Firm × Stock Bias Heatmap',
      heatmap_sub: 'Average brokerage bias per stock by market · Click any cell to jump to that stock',
      accuracy_title: 'Prediction Accuracy Trend (Rolling |Realized Error|)',
      accuracy_sub: 'Lower values indicate tighter realized price accuracy (Top 5 coverage firms)',
      acc_scope_stock: 'Selected Stock',
      acc_scope_market: '6 Major Leaders',
      accuracy_empty: 'Not enough matured historical reports (90d+) to plot accuracy trend.',
      table_title: 'All Research Reports',
      table_search_placeholder: 'Search (Firm, Analyst, Date)...',
      export_csv: 'CSV',
      cat_all: 'All',
      cat_no_data: 'No Data',
      cat_overly_optimistic: 'Overly Optimistic',
      cat_optimistic: 'Optimistic',
      cat_accurate: 'Accurate',
      cat_conservative: 'Conservative',
      th_date: 'Date',
      th_stock: 'Stock',
      th_firm: 'Firm',
      th_analyst: 'Analyst',
      th_date_price: 'Price on Date',
      th_target: 'Target Price',
      th_bias: 'Issuance Bias (%)',
      th_category: 'Category',
      table_total: 'Total {count} reports',
      table_empty: 'No reports match the current filter.',
      cmd_placeholder: 'Search stock or ticker (↑↓ navigate · Enter select · ESC close)',
      screener_title: '42-Stock Consensus Comparison Screener',
      screener_sub: 'Click any row to open its full consensus analytics view',
      scr_adj_mean: '12M Adj. Mean',
      scr_upside: 'Adj. Upside',
      scr_pred_3m: '3M Forecast',
      scr_vol: 'Volatility (σ)',
      scr_firms: 'Active Firms',
      footer: '© 2026 Stock Consensus Prediction Analytics | For informational purposes only, not investment advice.',
      chart_price_legend: 'Stock Price',
      chart_price_base: 'Baseline (Price on Date)',
      chart_bias_title: 'Issuance Bias (%)',
      chart_price_linear_title: 'Price / Target (Linear)',
      chart_price_log_title: 'Price / Target (Log)',
      grade: 'Grade',
      bias: 'Issuance Bias',
      date_price: 'Price on Date',
      target_price: 'Target Price',
      guide_current: 'Current',
      guide_adj: '12M Adj',
      guide_pred: '3M Pred',
      load_error_stock: 'Failed to load stock detail data.',
      retry_btn: '🔄 Retry'
    }
  };

  // ── Application State ──
  const urlParams = new URLSearchParams(window.location.search);
  const isEnPage = window.location.pathname.endsWith('index_en.html') || document.documentElement.lang === 'en';
  let currentLang = urlParams.get('lang') || (isEnPage ? 'en' : (localStorage.getItem('consensus_lang') || 'ko'));
  let currentCurrency = urlParams.get('curr') || (currentLang === 'en' ? 'USD' : (localStorage.getItem('consensus_curr') || 'AUTO'));

  let DATA = null;
  let STOCK_CACHE = {};
  let selectedTicker = null;
  let activeRequestId = 0;
  let charts = {};

  // Discovery state
  let marketFilter = 'ALL';
  let stockSortMode = 'mcap';
  let pillsExpanded = false;

  // Chart states
  let timelineRange = '3Y';
  let currentScaleMode = 'log';
  let showTargetGuides = true;
  let rankingMode = 'compact';
  let rankingMinReports = 3;
  let heatmapMarket = isEnPage ? 'US' : 'KR';
  let accuracyScope = 'stock';

  // Computed stats cache for current stock (used by Hero, KPI, Pipeline, Timeline Guides, Sticky Bar)
  let currentComputed = null;

  // Table state
  let allTableData = [];
  let filteredData = [];
  let tableCategory = 'ALL';
  let sortState = { key: 'date', dir: 'desc' };
  let currentPage = 1;

  // Screener & Command Palette state
  let screenerMarket = 'ALL';
  let screenerSort = { key: 'upside', dir: 'desc' };
  let cmdActiveIndex = 0;
  let cmdMatches = [];

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
    return U.formatPrice(val, market, forceCurrency || currentCurrency, currentLang, USD_KRW_RATE);
  }

  function formatPercent(val) {
    if (val == null || isNaN(val)) return '—';
    const sign = val > 0 ? '+' : '';
    return sign + val.toFixed(1) + '%';
  }

  function getReportIssuanceBias(stock, r) {
    if (!r || r.target_price == null || r.target_price <= 0) return null;
    if (r.issuance_bias_pct != null) return r.issuance_bias_pct;
    if (stock && stock.price_history) {
      const pDate = U.getPriceOnDate(stock.price_history, r.date, 7);
      if (pDate && pDate > 0) {
        return ((r.target_price - pDate) / pDate) * 100;
      }
    }
    return null;
  }

  function biasCategoryInfo(bias) {
    const dict = I18N[currentLang];
    if (bias == null) return { key: 'unknown', label: '—', cls: '' };
    if (bias > 30) return { key: 'overly_optimistic', label: dict.cat_overly_optimistic, cls: 'badge-overly-optimistic' };
    if (bias > 15) return { key: 'optimistic', label: dict.cat_optimistic, cls: 'badge-optimistic' };
    if (bias >= -15) return { key: 'accurate', label: dict.cat_accurate, cls: 'badge-accurate' };
    return { key: 'conservative', label: dict.cat_conservative, cls: 'badge-conservative' };
  }

  function biasColor(val) {
    if (val == null) return 'rgba(203,213,225,.4)';
    if (val > 30) return '#fb7185';
    if (val > 15) return '#fb923c';
    if (val >= -15) return '#34d399';
    return '#60a5fa';
  }

  function animateValue(el, target, market, isPrice = true, duration = 340) {
    if (!el) return;
    if (el._animFrame) {
      cancelAnimationFrame(el._animFrame);
      el._animFrame = null;
    }
    if (target == null || isNaN(target)) {
      el.textContent = '—';
      el._lastVal = null;
      return;
    }

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const formatOut = (v) => isPrice ? formatPrice(v, market) : formatPercent(v);

    if (prefersReduced || el._lastVal == null || isNaN(el._lastVal) || el._lastMarket !== market || el._lastVal === target) {
      el._lastVal = target;
      el._lastMarket = market;
      el.textContent = formatOut(target);
      return;
    }

    const start = el._lastVal;
    el._lastVal = target;
    el._lastMarket = market;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const cur = start + (target - start) * ease;
      el.textContent = formatOut(cur);
      if (progress < 1) {
        el._animFrame = requestAnimationFrame(step);
      } else {
        el.textContent = formatOut(target);
        el._animFrame = null;
      }
    }
    el._animFrame = requestAnimationFrame(step);
  }

  // ── Toast Feedback ──
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
  }

  // ── Custom Floating Accessible Tooltip ──
  function initCustomTooltips() {
    const tipEl = document.getElementById('custom-tooltip');
    if (!tipEl) return;

    const showTip = (trigger) => {
      const key = trigger.dataset.i18nTip;
      const text = (key && I18N[currentLang][key]) || trigger.dataset.tipText || '';
      if (!text) return;
      tipEl.textContent = text;
      tipEl.classList.remove('hidden');

      const rect = trigger.getBoundingClientRect();
      const tipRect = tipEl.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - tipRect.width / 2;
      left = Math.max(12, Math.min(window.innerWidth - tipRect.width - 12, left));
      let top = rect.top - tipRect.height - 10;
      if (top < 12) top = rect.bottom + 10;

      tipEl.style.left = `${left}px`;
      tipEl.style.top = `${top}px`;
    };

    const hideTip = () => tipEl.classList.add('hidden');

    document.addEventListener('mouseover', (e) => {
      const trigger = e.target.closest('.info-tooltip');
      if (trigger) showTip(trigger);
    });
    document.addEventListener('mouseout', (e) => {
      const trigger = e.target.closest('.info-tooltip');
      if (trigger) hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const trigger = e.target.closest('.info-tooltip');
      if (trigger) showTip(trigger);
    });
    document.addEventListener('focusout', (e) => {
      const trigger = e.target.closest('.info-tooltip');
      if (trigger) hideTip();
    });
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.info-tooltip');
      if (trigger) {
        e.preventDefault();
        if (tipEl.classList.contains('hidden')) showTip(trigger);
        else hideTip();
      } else if (!tipEl.classList.contains('hidden')) {
        hideTip();
      }
    });
    window.addEventListener('scroll', hideTip, { passive: true });
  }

  // ── Market Pulse Strip (Top Opportunities & Cautions) ──
  function renderMarketPulse() {
    if (!DATA || !DATA.stocks) return;
    let pool = Object.values(DATA.stocks);
    if (marketFilter !== 'ALL') pool = pool.filter(s => s.market === marketFilter);

    const byUpside = [...pool].sort((a, b) => (b.realistic_median_upside ?? -999) - (a.realistic_median_upside ?? -999));
    const topUp = byUpside.slice(0, 3);
    const topDown = [...pool].sort((a, b) => (a.realistic_median_upside ?? 999) - (b.realistic_median_upside ?? 999)).slice(0, 2);

    const upWrap = document.getElementById('pulse-top-upside');
    const downWrap = document.getElementById('pulse-top-downside');

    const renderChip = (s, cls) => {
      const val = s.realistic_median_upside ?? 0;
      return `<button type="button" class="pulse-chip ${cls}" data-ticker="${s.ticker}">
        <span>${getStockName(s)}</span>
        <strong>${formatPercent(val)}</strong>
      </button>`;
    };

    if (upWrap) upWrap.innerHTML = topUp.map(s => renderChip(s, 'up')).join('');
    if (downWrap) downWrap.innerHTML = topDown.map(s => renderChip(s, 'down')).join('');

    const pulseStrip = document.getElementById('market-pulse-strip');
    if (pulseStrip && !pulseStrip.dataset.bound) {
      pulseStrip.dataset.bound = 'true';
      pulseStrip.addEventListener('click', (e) => {
        const chip = e.target.closest('.pulse-chip');
        if (chip && chip.dataset.ticker) selectStock(chip.dataset.ticker);
      });
    }
  }

  // ── Build Stock Discovery Pills ──
  function buildStockPills() {
    if (!DATA || !DATA.stocks) return;
    const usGroup = document.getElementById('market-group-us');
    const krGroup = document.getElementById('market-group-kr');
    const usContainer = document.getElementById('pills-us');
    const krContainer = document.getElementById('pills-kr');
    if (!usContainer || !krContainer) return;

    usContainer.innerHTML = '';
    krContainer.innerHTML = '';

    const stocks = Object.values(DATA.stocks);
    const usStocks = U.sortStocks(stocks.filter(s => s.market === 'US'), stockSortMode, US_ORDER);
    const krStocks = U.sortStocks(stocks.filter(s => s.market === 'KR'), stockSortMode, KR_ORDER);

    const createPill = (info, container) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'stock-pill';
      pill.dataset.ticker = info.ticker;
      if (info.ticker === selectedTicker) pill.classList.add('active');

      const koName = info.name;
      const enName = KR_STOCK_EN_NAMES[info.ticker] || info.name;
      pill.dataset.search = `${koName.toLowerCase()} ${enName.toLowerCase()} ${info.ticker.toLowerCase()}`;

      const upsidePct = info.realistic_median_upside ?? 0;
      const tone = U.getSemanticTone(upsidePct);
      const displayName = getStockName(info);

      pill.style.backgroundColor = tone.bg;
      pill.style.borderColor = tone.border;
      pill.style.color = tone.text;
      pill.innerHTML = `<span>${displayName}</span><span class="pill-pct" style="background:${tone.badgeBg};color:${tone.badgeText};">${tone.badge}</span>`;
      pill.title = `${displayName} (${info.ticker}) · ${formatPrice(info.current_price, info.market)}`;

      pill.addEventListener('click', () => selectStock(info.ticker));
      container.appendChild(pill);
    };

    usStocks.forEach(s => createPill(s, usContainer));
    krStocks.forEach(s => createPill(s, krContainer));

    if (usGroup) usGroup.classList.toggle('hidden', marketFilter === 'KR');
    if (krGroup) krGroup.classList.toggle('hidden', marketFilter === 'US');

    applyStockSearchFilter();
    renderMarketPulse();
  }

  function applyStockSearchFilter() {
    const input = document.getElementById('stock-search');
    const clearBtn = document.getElementById('stock-search-clear');
    const wrapper = document.getElementById('stock-selector-wrapper');
    const query = input ? input.value.trim().toLowerCase() : '';

    if (clearBtn) clearBtn.classList.toggle('hidden', !query);
    if (wrapper) {
      // Auto-expand when user types a search query
      wrapper.classList.toggle('collapsed', !pillsExpanded && !query);
    }

    document.querySelectorAll('.stock-pill').forEach(pill => {
      const text = pill.dataset.search || '';
      pill.style.display = !query || text.includes(query) ? '' : 'none';
    });
  }

  function initDiscoveryControls() {
    const marketTabs = document.getElementById('market-tabs');
    if (marketTabs && !marketTabs.dataset.bound) {
      marketTabs.dataset.bound = 'true';
      marketTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-tab');
        if (!btn) return;
        marketFilter = btn.dataset.market;
        marketTabs.querySelectorAll('.seg-tab').forEach(t => {
          const active = t.dataset.market === marketFilter;
          t.classList.toggle('active', active);
          t.setAttribute('aria-selected', String(active));
        });
        buildStockPills();
      });
    }

    const sortSel = document.getElementById('stock-sort');
    if (sortSel && !sortSel.dataset.bound) {
      sortSel.dataset.bound = 'true';
      sortSel.addEventListener('change', () => {
        stockSortMode = sortSel.value;
        buildStockPills();
      });
    }

    const searchInput = document.getElementById('stock-search');
    const clearBtn = document.getElementById('stock-search-clear');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', applyStockSearchFilter);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const visible = Array.from(document.querySelectorAll('.stock-pill')).find(p => {
            const parentGroup = p.closest('.market-group');
            return p.style.display !== 'none' && parentGroup && !parentGroup.classList.contains('hidden');
          });
          if (visible && visible.dataset.ticker) selectStock(visible.dataset.ticker);
        }
      });
    }
    if (clearBtn && !clearBtn.dataset.bound) {
      clearBtn.dataset.bound = 'true';
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        applyStockSearchFilter();
      });
    }

    const toggleBtn = document.getElementById('btn-toggle-pills');
    if (toggleBtn && !toggleBtn.dataset.bound) {
      toggleBtn.dataset.bound = 'true';
      toggleBtn.addEventListener('click', () => {
        pillsExpanded = !pillsExpanded;
        toggleBtn.setAttribute('aria-expanded', String(pillsExpanded));
        const span = toggleBtn.querySelector('span');
        if (span) span.textContent = pillsExpanded ? I18N[currentLang].collapse_pills : I18N[currentLang].expand_pills;
        applyStockSearchFilter();
      });
    }
  }

  // ── On-demand Stock Selection (Race-Condition Safe + Deep Link) ──
  async function selectStock(ticker, opts = {}) {
    if (!DATA || !DATA.stocks || !DATA.stocks[ticker]) return;

    const reqId = ++activeRequestId;
    selectedTicker = ticker;

    document.querySelectorAll('.stock-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.ticker === ticker);
    });

    // Sync URL query param without reload
    if (!opts.skipUrlUpdate) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('ticker', ticker);
      window.history.replaceState({ ticker }, '', nextUrl.toString());
    }

    if (!STOCK_CACHE[ticker]) {
      const timelineEl = document.getElementById('chart-timeline');
      if (timelineEl) {
        timelineEl.style.opacity = '0.45';
      }
      try {
        const resp = await fetch(`stocks/${ticker}.json?t=${Date.now()}`);
        if (!resp.ok) {
          if (DATA.stocks[ticker] && DATA.stocks[ticker].analyst_reports) {
            STOCK_CACHE[ticker] = DATA.stocks[ticker];
          } else {
            throw new Error(`HTTP ${resp.status}`);
          }
        } else {
          STOCK_CACHE[ticker] = await resp.json();
        }
      } catch (err) {
        if (reqId !== activeRequestId) return;
        console.error('Failed to load stock data for', ticker, err);
        if (timelineEl) {
          timelineEl.style.opacity = '1';
          timelineEl.innerHTML = `
            <div class="retry-box">
              <p class="retry-msg">⚠️ ${I18N[currentLang].load_error_stock}</p>
              <button type="button" class="retry-btn" onclick="window.selectStock('${ticker}')">${I18N[currentLang].retry_btn}</button>
            </div>`;
        }
        return;
      } finally {
        if (timelineEl) timelineEl.style.opacity = '1';
      }
    }

    if (reqId !== activeRequestId) return;
    updateDashboard();
    if (accuracyScope === 'stock') renderAccuracyTrend();
  }
  window.selectStock = selectStock;

  // ── Active Recent Reports & Target Calculation ──
  function getActiveRecentReports(stock) {
    const targetStock = stock || STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!targetStock) return [];
    const allReports = (targetStock.analyst_reports || []).filter(r => r.target_price != null && r.target_price > 0);
    if (!allReports.length) return [];

    let maxTime = 0;
    allReports.forEach(r => {
      const t = Date.parse(r.date + 'T00:00:00Z');
      if (!isNaN(t) && t > maxTime) maxTime = t;
    });
    if (!maxTime) return [];

    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    let recent = allReports.filter(r => Date.parse(r.date + 'T00:00:00Z') >= maxTime - ninetyDaysMs);
    if (recent.length < 3) {
      recent = allReports.filter(r => Date.parse(r.date + 'T00:00:00Z') >= maxTime - 180 * 24 * 60 * 60 * 1000);
    }

    const firmLatestMap = {};
    recent.forEach(r => {
      const rTime = Date.parse(r.date + 'T00:00:00Z');
      if (!firmLatestMap[r.firm] || rTime > Date.parse(firmLatestMap[r.firm].date + 'T00:00:00Z')) {
        firmLatestMap[r.firm] = r;
      }
    });

    const activeList = Object.values(firmLatestMap);
    const anchorMs = DATA && DATA.generated_at ? Date.parse(DATA.generated_at) : Date.now();
    const refMs = isNaN(anchorMs) ? maxTime : Math.max(anchorMs, maxTime);

    activeList.forEach(r => {
      const rTime = Date.parse(r.date + 'T00:00:00Z');
      const ageDays = Math.max(0, (refMs - rTime) / (24 * 60 * 60 * 1000));
      r.weight = Math.exp(-Math.log(2) / 30 * ageDays);
    });

    return activeList;
  }

  function computeStockMetrics(stock) {
    const summary = (DATA.stocks && DATA.stocks[stock.ticker]) || {};
    const activeReports = getActiveRecentReports(stock);
    const currentPrice = stock.current_price;
    const alpha = summary.alpha_applied != null ? summary.alpha_applied : 0.05;
    const vol = summary.volatility_annualized != null ? summary.volatility_annualized : null;

    // Weighted Issuance Bias across active reports
    const biasesWithW = activeReports.map(r => {
      const b = getReportIssuanceBias(stock, r);
      return b != null ? { bias: b, weight: r.weight } : null;
    }).filter(Boolean);
    const sumW = biasesWithW.reduce((s, x) => s + x.weight, 0);
    const avgBias = sumW > 0 ? biasesWithW.reduce((s, x) => s + x.bias * x.weight, 0) / sumW : null;

    // Use server-verified stats if available in summary.json for 100% consistency with backend model,
    // otherwise calculate directly on client.
    let rawStats = summary.raw_stats;
    let adjStats = summary.adj_stats;
    let predStats = summary.pred_stats;

    if (!rawStats || !adjStats || !predStats) {
      const allReports = (stock.analyst_reports || []).filter(r => r.target_price != null && r.target_price > 0);
      const priceHist = stock.price_history || [];
      const maxHistDate = priceHist.length ? priceHist[priceHist.length - 1].date : '';
      const firmBiasListMap = {};

      allReports.forEach(r => {
        if (!r.date || !r.firm) return;
        const dt = new Date(r.date + 'T00:00:00Z');
        if (isNaN(dt.getTime())) return;
        dt.setUTCDate(dt.getUTCDate() + 90);
        const dt3mStr = dt.toISOString().split('T')[0];
        if (dt3mStr <= maxHistDate) {
          const p3m = U.getPriceOnDate(priceHist, dt3mStr, 7);
          if (p3m && p3m > 0) {
            const bias3m = ((r.target_price - p3m) / p3m) * 100;
            if (bias3m >= -70 && bias3m <= 200) {
              if (!firmBiasListMap[r.firm]) firmBiasListMap[r.firm] = [];
              firmBiasListMap[r.firm].push(bias3m);
            }
          }
        }
      });

      const firmAvgBiasMap = {};
      for (const [firm, list] of Object.entries(firmBiasListMap)) {
        const N = list.length;
        const stockSpecificBias = list.reduce((a, b) => a + b, 0) / N;
        const globalBias = (DATA.firm_stats && DATA.firm_stats[firm]) ? DATA.firm_stats[firm].avg_realized_bias_pct : 15.0;
        const shrunkBias = (N / (N + 5)) * stockSpecificBias + (5 / (N + 5)) * globalBias;
        firmAvgBiasMap[firm] = Math.max(-50, Math.min(200, shrunkBias));
      }

      const rawVals = activeReports.map(r => r.target_price).sort((a, b) => a - b);
      const mid = Math.floor(rawVals.length / 2);
      rawStats = rawVals.length ? {
        min: rawVals[0],
        max: rawVals[rawVals.length - 1],
        mean: rawVals.reduce((a, b) => a + b, 0) / rawVals.length,
        median: rawVals.length % 2 !== 0 ? rawVals[mid] : (rawVals[mid - 1] + rawVals[mid]) / 2,
      } : { min: currentPrice, max: currentPrice, mean: currentPrice, median: currentPrice };

      const adjSorted = activeReports.map(r => {
        const b = firmAvgBiasMap[r.firm] !== undefined ? firmAvgBiasMap[r.firm] : 15.0;
        return { val: r.target_price / (1 + b / 100), weight: r.weight };
      }).sort((a, b) => a.val - b.val);

      const adjW = adjSorted.reduce((s, x) => s + x.weight, 0);
      let adjMed = adjSorted.length ? adjSorted[Math.floor(adjSorted.length / 2)].val : currentPrice;
      if (adjW > 0) {
        let cum = 0;
        for (const item of adjSorted) {
          cum += item.weight;
          if (cum >= adjW / 2) { adjMed = item.val; break; }
        }
      }
      adjStats = adjSorted.length ? {
        min: adjSorted[0].val,
        max: adjSorted[adjSorted.length - 1].val,
        mean: adjW > 0 ? adjSorted.reduce((s, x) => s + x.val * x.weight, 0) / adjW : currentPrice,
        median: adjMed,
      } : rawStats;

      predStats = {
        min: currentPrice + alpha * (adjStats.min - currentPrice),
        max: currentPrice + alpha * (adjStats.max - currentPrice),
        median: currentPrice + alpha * (adjStats.median - currentPrice),
        mean: currentPrice + alpha * (adjStats.mean - currentPrice),
      };
    }

    const wk52 = U.compute52WeekStats(stock.price_history, currentPrice);
    return {
      stock,
      summary,
      activeReports,
      currentPrice,
      alpha,
      vol,
      avgBias,
      rawStats,
      adjStats,
      predStats,
      wk52,
    };
  }

  // ── Update Hero, Sticky Bar, KPI Cards & 3-Stage Pipeline ──
  function updateHeroAndCards() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;

    const m = computeStockMetrics(stock);
    currentComputed = m;
    const dict = I18N[currentLang];
    const market = stock.market;
    const displayName = getStockName(stock);

    // 1. Hero Identity
    document.getElementById('hero-market-tag').textContent = market === 'KR' ? '🇰🇷 KRX' : '🇺🇸 NASDAQ/NYSE';
    document.getElementById('hero-ticker-tag').textContent = stock.ticker;
    document.getElementById('hero-stock-name').textContent = displayName;

    const volEl = document.getElementById('hero-vol-badge');
    if (volEl) {
      volEl.textContent = m.vol != null ? `σ ${(m.vol * 100).toFixed(1)}%` : 'σ —';
      volEl.title = dict.vol_chip_title;
    }
    const alphaEl = document.getElementById('hero-alpha-badge');
    if (alphaEl) {
      alphaEl.textContent = `α ${(m.alpha * 100).toFixed(1)}%`;
      alphaEl.title = dict.alpha_chip_title;
    }
    const firmsEl = document.getElementById('hero-firms-badge');
    if (firmsEl) {
      firmsEl.textContent = dict.firms_chip.replace('{count}', m.activeReports.length);
    }

    // 2. Price Target Range Gauge
    const gauge = U.computeRangeGauge({
      current: m.currentPrice,
      min: m.adjStats.min,
      max: m.adjStats.max,
      adjMean: m.adjStats.mean,
      pred3m: m.predStats.mean,
    });
    if (gauge) {
      const bandEl = document.getElementById('gauge-band');
      const curMarker = document.getElementById('marker-current');
      const predMarker = document.getElementById('marker-pred');
      const adjMarker = document.getElementById('marker-adj');
      if (bandEl) {
        bandEl.style.left = `${gauge.minPct}%`;
        bandEl.style.width = `${Math.max(2, gauge.maxPct - gauge.minPct)}%`;
      }
      if (curMarker) curMarker.style.left = `${gauge.currentPct}%`;
      if (predMarker) predMarker.style.left = `${gauge.predPct}%`;
      if (adjMarker) adjMarker.style.left = `${gauge.adjMeanPct}%`;

      const curTag = document.getElementById('marker-current-tag');
      if (curTag) {
        curTag.textContent = formatPrice(m.currentPrice, market);
        if (gauge.currentPct < 12) curTag.style.transform = 'translateX(-10%)';
        else if (gauge.currentPct > 88) curTag.style.transform = 'translateX(-90%)';
        else curTag.style.transform = 'translateX(-50%)';
      }
      document.getElementById('gauge-min-label').textContent = `Adj. Min ${formatPrice(m.adjStats.min, market)}`;
      document.getElementById('gauge-max-label').textContent = `Adj. Max ${formatPrice(m.adjStats.max, market)}`;
      document.getElementById('gauge-pred-val').textContent = formatPrice(m.predStats.mean, market);
      document.getElementById('gauge-adj-val').textContent = formatPrice(m.adjStats.mean, market);

      const adjUpside = ((m.adjStats.mean - m.currentPrice) / m.currentPrice) * 100;
      const verdictEl = document.getElementById('gauge-verdict');
      if (verdictEl) {
        let vText = dict.verdict_fair;
        let vCls = 'flat';
        if (adjUpside >= 15) { vText = dict.verdict_strong_up; vCls = 'up'; }
        else if (adjUpside >= 3) { vText = dict.verdict_up; vCls = 'up'; }
        else if (adjUpside <= -3) { vText = dict.verdict_down; vCls = 'down'; }
        verdictEl.textContent = `${vText} (${formatPercent(adjUpside)})`;
        verdictEl.className = `range-gauge-verdict ${vCls}`;
      }
    }

    // 3. Sticky Context Bar Sync
    const adjUpsidePct = ((m.adjStats.mean - m.currentPrice) / m.currentPrice) * 100;
    document.getElementById('sticky-market').textContent = market;
    document.getElementById('sticky-name').textContent = displayName;
    document.getElementById('sticky-ticker').textContent = stock.ticker;
    document.getElementById('sticky-price').textContent = formatPrice(m.currentPrice, market);
    document.getElementById('sticky-adj').textContent = formatPrice(m.adjStats.mean, market);
    const stickyUpEl = document.getElementById('sticky-adj-upside');
    if (stickyUpEl) {
      stickyUpEl.textContent = `(${formatPercent(adjUpsidePct)})`;
      stickyUpEl.className = adjUpsidePct >= 0 ? 'text-up' : 'text-down';
    }
    document.getElementById('sticky-pred').textContent = formatPrice(m.predStats.mean, market);

    // 4. 4 Balanced KPI Summary Cards
    animateValue(document.getElementById('val-price'), m.currentPrice, market, true);
    document.getElementById('sub-price').textContent = `${displayName} · ${stock.ticker}`;
    const wkWrap = document.getElementById('wk52-wrap');
    if (m.wk52 && wkWrap) {
      wkWrap.classList.remove('hidden');
      document.getElementById('wk52-low').textContent = `52W L ${formatPrice(m.wk52.low, market)}`;
      document.getElementById('wk52-high').textContent = `H ${formatPrice(m.wk52.high, market)}`;
      document.getElementById('wk52-fill').style.width = `${m.wk52.positionPct.toFixed(1)}%`;
      document.getElementById('wk52-pin').style.left = `${m.wk52.positionPct.toFixed(1)}%`;
    } else if (wkWrap) {
      wkWrap.classList.add('hidden');
    }

    // Card 2: 12M Realistic Target
    animateValue(document.getElementById('val-adj-hero'), m.adjStats.mean, market, true);
    const subAdjHero = document.getElementById('sub-adj-hero');
    subAdjHero.textContent = `${dict.vs_current}${formatPercent(adjUpsidePct)}`;
    subAdjHero.className = `card-sub num ${adjUpsidePct >= 0 ? 'text-up' : 'text-down'}`;
    const bubbleDiffPct = m.rawStats.mean > 0 ? ((m.adjStats.mean - m.rawStats.mean) / m.rawStats.mean) * 100 : 0;
    document.getElementById('meta-raw-compare').textContent = `${dict.vs_raw_bubble}${formatPercent(bubbleDiffPct)} (${formatPrice(m.rawStats.mean, market)})`;

    // Card 3: 3M Forecast
    animateValue(document.getElementById('val-prediction'), m.predStats.mean, market, true);
    const predUpsidePct = ((m.predStats.mean - m.currentPrice) / m.currentPrice) * 100;
    const subPred = document.getElementById('sub-prediction');
    subPred.textContent = `${dict.vs_current}${formatPercent(predUpsidePct)}`;
    subPred.className = `card-sub num ${predUpsidePct >= 0 ? 'text-up' : 'text-down'}`;
    document.getElementById('meta-pred-model').textContent =
      `α = ${(m.alpha * 100).toFixed(1)}%` + (m.vol != null ? ` · 1Y σ = ${(m.vol * 100).toFixed(1)}%` : '');

    // Card 4: Avg Issuance Bias + Coverage
    if (m.avgBias != null) {
      animateValue(document.getElementById('val-bias'), m.avgBias, market, false);
      const bc = biasCategoryInfo(m.avgBias);
      const subBias = document.getElementById('sub-bias');
      subBias.textContent = bc.label;
      subBias.style.color = biasColor(m.avgBias);
    } else {
      document.getElementById('val-bias').textContent = '—';
      document.getElementById('sub-bias').textContent = '';
    }
    document.getElementById('sub-reports').textContent = dict.reports_sub.replace('{count}', m.activeReports.length);

    // 5. 3-Stage Pipeline Matrix
    const renderStatBox = (valId, subId, val) => {
      const valEl = document.getElementById(valId);
      const subEl = document.getElementById(subId);
      if (!valEl || !subEl) return;
      animateValue(valEl, val, market, true);
      const up = ((val - m.currentPrice) / m.currentPrice) * 100;
      subEl.textContent = `${dict.vs_current}${formatPercent(up)}`;
      subEl.className = `stat-box-sub num ${up >= 0 ? 'text-up' : 'text-down'}`;
    };

    renderStatBox('raw-stat-avg', 'raw-sub-avg', m.rawStats.mean);
    renderStatBox('raw-stat-med', 'raw-sub-med', m.rawStats.median);
    renderStatBox('raw-stat-max', 'raw-sub-max', m.rawStats.max);
    renderStatBox('raw-stat-min', 'raw-sub-min', m.rawStats.min);

    renderStatBox('adj-stat-avg', 'adj-sub-avg', m.adjStats.mean);
    renderStatBox('adj-stat-med', 'adj-sub-med', m.adjStats.median);
    renderStatBox('adj-stat-max', 'adj-sub-max', m.adjStats.max);
    renderStatBox('adj-stat-min', 'adj-sub-min', m.adjStats.min);

    renderStatBox('pred-stat-avg', 'pred-sub-avg', m.predStats.mean);
    renderStatBox('pred-stat-med', 'pred-sub-med', m.predStats.median);
    renderStatBox('pred-stat-max', 'pred-sub-max', m.predStats.max);
    renderStatBox('pred-stat-min', 'pred-sub-min', m.predStats.min);

    const noteEl = document.getElementById('realistic-footer-note');
    if (noteEl) noteEl.textContent = dict.footer_note.replace('{count}', m.activeReports.length);
  }

  // ── Chart 1: Price + Target Timeline (with Timeframe, Grouping, & Guides) ──
  function renderTimeline() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;

    const dict = I18N[currentLang];
    const isPct = currentScaleMode === 'pct';
    const isLog = currentScaleMode === 'log';
    const activeCurr = U.resolveActiveCurrency(currentCurrency, currentLang, stock.market);
    const fx = U.getFxRate(stock.market, activeCurr, USD_KRW_RATE);

    const fullPriceHist = stock.price_history || [];
    const anchorTs = fullPriceHist.length ? Date.parse(fullPriceHist[fullPriceHist.length - 1].date + 'T00:00:00Z') : Date.now();
    const trimmedPriceHist = U.filterByTimeframe(fullPriceHist, timelineRange, anchorTs);
    const trimmedReports = U.filterByTimeframe(stock.analyst_reports || [], timelineRange, anchorTs);

    const firmMap = {};
    let priceData = [];
    let yaxisOpts = {};
    let annotations = { yaxis: [] };

    if (isPct) {
      priceData = trimmedPriceHist.map(p => ({ x: Date.parse(p.date + 'T00:00:00Z'), y: 0 }));
      trimmedReports.forEach(r => {
        const issuanceBias = getReportIssuanceBias(stock, r);
        if (issuanceBias == null) return;
        const displayName = getFirmName(r.firm);
        const reportPrice = U.getPriceOnDate(fullPriceHist, r.date, 7);
        if (!firmMap[displayName]) firmMap[displayName] = [];
        firmMap[displayName].push({
          x: Date.parse(r.date + 'T00:00:00Z'),
          y: parseFloat(issuanceBias.toFixed(1)),
          firm: displayName,
          analyst: r.analyst,
          target_price: Math.round(r.target_price * fx * 100) / 100,
          report_price: reportPrice != null ? Math.round(reportPrice * fx * 100) / 100 : null,
          bias: issuanceBias,
          grade: r.grade
        });
      });

      yaxisOpts = {
        labels: {
          style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' },
          formatter: v => v != null ? (v > 0 ? '+' : '') + v.toFixed(0) + '%' : ''
        },
        title: { text: dict.chart_bias_title, style: { color: 'rgba(148,163,184,.65)', fontSize: '11px' } }
      };
      if (showTargetGuides) {
        annotations.yaxis.push({
          y: 0,
          borderColor: 'rgba(148,163,184,.5)',
          strokeDashArray: 4,
          label: { text: '0% Baseline', style: { color: '#cbd5e1', background: 'rgba(15,23,42,.85)', fontSize: '10px' } }
        });
      }
    } else {
      priceData = trimmedPriceHist.map(p => ({
        x: Date.parse(p.date + 'T00:00:00Z'),
        y: Math.round(p.close * fx * 100) / 100
      }));

      trimmedReports.forEach(r => {
        if (r.target_price == null || r.target_price <= 0) return;
        const displayName = getFirmName(r.firm);
        const reportPrice = U.getPriceOnDate(fullPriceHist, r.date, 7);
        const issuanceBias = getReportIssuanceBias(stock, r);
        if (!firmMap[displayName]) firmMap[displayName] = [];
        firmMap[displayName].push({
          x: Date.parse(r.date + 'T00:00:00Z'),
          y: Math.round(r.target_price * fx * 100) / 100,
          firm: displayName,
          analyst: r.analyst,
          target_price: Math.round(r.target_price * fx * 100) / 100,
          report_price: reportPrice != null ? Math.round(reportPrice * fx * 100) / 100 : null,
          bias: issuanceBias,
          grade: r.grade
        });
      });

      const axisFmt = v => U.formatCompactAxisPrice(v, activeCurr, currentLang);

      if (showTargetGuides && currentComputed) {
        const adjY = Math.round(currentComputed.adjStats.mean * fx * 100) / 100;
        const predY = Math.round(currentComputed.predStats.mean * fx * 100) / 100;
        annotations.yaxis.push(
          {
            y: adjY,
            borderColor: '#34d399',
            strokeDashArray: 5,
            label: {
              borderColor: '#34d399',
              style: { color: '#052e16', background: '#34d399', fontSize: '10px', fontWeight: 700 },
              text: `${dict.guide_adj}: ${formatPrice(currentComputed.adjStats.mean, stock.market)}`
            }
          },
          {
            y: predY,
            borderColor: '#22d3ee',
            strokeDashArray: 3,
            label: {
              borderColor: '#22d3ee',
              position: 'left',
              offsetX: 60,
              style: { color: '#083344', background: '#22d3ee', fontSize: '10px', fontWeight: 700 },
              text: `${dict.guide_pred}: ${formatPrice(currentComputed.predStats.mean, stock.market)}`
            }
          }
        );
      }

      if (isLog) {
        const allVals = [
          ...priceData.map(p => p.y),
          ...Object.values(firmMap).flatMap(pts => pts.map(p => p.y))
        ].filter(v => v != null && v > 0);
        const minVal = allVals.length ? Math.max(0.5, Math.min(...allVals) * 0.88) : 10;
        const maxVal = allVals.length ? Math.max(...allVals) * 1.12 : 100000;

        yaxisOpts = {
          logarithmic: true,
          logBase: 10,
          min: minVal,
          max: maxVal,
          labels: { style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' }, formatter: axisFmt },
          title: { text: `${dict.chart_price_log_title} (${activeCurr})`, style: { color: 'rgba(148,163,184,.65)', fontSize: '11px' } }
        };
      } else {
        yaxisOpts = {
          labels: { style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' }, formatter: axisFmt },
          title: { text: `${dict.chart_price_linear_title} (${activeCurr})`, style: { color: 'rgba(148,163,184,.65)', fontSize: '11px' } }
        };
      }
    }

    // Group into Top 8 coverage firms + 1 clean "Other Firms" bucket so legend stays compact!
    const groupedScatter = U.groupFirmScatterSeries(firmMap, 8, dict.other_firms);
    const scatterColors = groupedScatter.map((s, idx) => s.isOther ? 'rgba(148,163,184,0.45)' : FIRM_COLORS[idx % FIRM_COLORS.length]);
    const priceSeries = { name: isPct ? dict.chart_price_base : dict.chart_price_legend, type: 'line', data: priceData };
    const series = [...groupedScatter.map(({ name, type, data }) => ({ name, type, data })), priceSeries];

    const firmCount = groupedScatter.length;
    const chartColors = [...scatterColors, '#818cf8'];
    const strokeWidths = [...Array(firmCount).fill(0), 2.8];
    const markerSizes = [...groupedScatter.map(s => s.isOther ? 3.2 : 4.2), 0];
    const opacities = [...groupedScatter.map(s => s.isOther ? 0.35 : 0.72), 1.0];

    const fmtConverted = (v) => {
      if (v == null || isNaN(v)) return '—';
      if (activeCurr === 'USD') return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return currentLang === 'en' ? '₩' + Math.round(v).toLocaleString('en-US') : Math.round(v).toLocaleString('ko-KR') + '원';
    };

    const opts = {
      series,
      chart: {
        type: 'line', height: 450, background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
        animations: { enabled: true, easing: 'easeinout', speed: 450 },
      },
      colors: chartColors,
      stroke: { width: strokeWidths, curve: 'smooth' },
      markers: { size: markerSizes, strokeWidth: 0, hover: { sizeOffset: 3 } },
      fill: { type: 'solid', opacity: opacities },
      annotations,
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: yaxisOpts,
      grid: { borderColor: 'rgba(148,163,184,.08)', strokeDashArray: 4 },
      legend: {
        position: 'bottom', horizontalAlign: 'center',
        labels: { colors: 'rgba(203,213,225,.75)' },
        fontSize: '11px', fontWeight: 500,
        itemMargin: { horizontal: 10, vertical: 4 }
      },
      tooltip: {
        theme: 'dark',
        shared: false,
        custom: function ({ seriesIndex, dataPointIndex, w }) {
          const isLineSeries = seriesIndex === series.length - 1;
          const point = w.config.series[seriesIndex].data[dataPointIndex];
          if (!point) return '';
          const dateStr = new Date(point.x).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ko-KR');
          if (isLineSeries) {
            const label = isPct ? dict.chart_price_base : `${dict.chart_price_legend}: ${fmtConverted(point.y)}`;
            return `<div style="padding:10px 14px;font-size:12px;">
              <div style="color:rgba(148,163,184,.8);margin-bottom:4px;">${dateStr}</div>
              <div style="font-weight:700;">${label}</div>
            </div>`;
          }
          const datePriceStr = point.report_price != null ? `<div>${dict.date_price}: <strong>${fmtConverted(point.report_price)}</strong></div>` : '';
          return `<div style="padding:10px 14px;font-size:12px;max-width:270px;line-height:1.5;">
            <div style="color:rgba(148,163,184,.8);margin-bottom:4px;">${dateStr}</div>
            <div style="font-weight:700;color:#fff;margin-bottom:2px;">${point.firm}</div>
            ${point.analyst ? `<div style="color:rgba(148,163,184,.8);margin-bottom:4px;">${point.analyst}</div>` : ''}
            ${datePriceStr}
            <div>${dict.target_price}: <strong>${fmtConverted(point.target_price != null ? point.target_price : point.y)}</strong></div>
            ${point.grade ? `<div>${dict.grade}: ${point.grade}</div>` : ''}
            ${point.bias != null ? `<div>${dict.bias}: <strong style="color:${biasColor(point.bias)}">${formatPercent(point.bias)}</strong></div>` : ''}
          </div>`;
        }
      }
    };

    const el = document.getElementById('chart-timeline');
    if (!el) return;
    if (charts.timeline) charts.timeline.destroy();
    el.innerHTML = '';
    charts.timeline = new ApexCharts(el, opts);
    charts.timeline.render();
  }

  // ── Chart 2: Firm Bias Ranking (Controlled Height + Min Reports Filter) ──
  function renderBiasRanking() {
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (!stock) return;
    const dict = I18N[currentLang];

    const firmBias = {};
    (stock.analyst_reports || []).forEach(r => {
      const issuanceBias = getReportIssuanceBias(stock, r);
      if (issuanceBias == null) return;
      const name = getFirmName(r.firm);
      if (!firmBias[name]) firmBias[name] = [];
      firmBias[name].push(issuanceBias);
    });

    const allEntries = Object.entries(firmBias).map(([firm, vals]) => ({
      firm,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length
    }));

    let effectiveMin = rankingMinReports;
    let eligible = allEntries.filter(e => e.count >= effectiveMin);
    if (eligible.length < 3 && effectiveMin > 1) {
      effectiveMin = 1;
      eligible = allEntries;
    }

    const entries = U.selectBiasRankingEntries(eligible, {
      minReports: effectiveMin,
      mode: rankingMode,
      compactLimit: 16
    });

    const subEl = document.getElementById('ranking-subtitle');
    if (subEl) {
      subEl.textContent = dict.ranking_showing
        .replace('{total}', allEntries.length)
        .replace('{shown}', entries.length)
        .replace('{min}', effectiveMin);
    }

    const categories = entries.map(e => e.firm);
    const values = entries.map(e => parseFloat(e.avg.toFixed(1)));
    const counts = entries.map(e => e.count);
    const colors = values.map(v => biasColor(v));

    const opts = {
      series: [{ name: dict.card_bias, data: values }],
      chart: {
        type: 'bar',
        height: Math.max(300, Math.min(1200, entries.length * 32 + 40)),
        background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 450 },
      },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 5, barHeight: '62%', distributed: true, dataLabels: { position: 'top' } }
      },
      colors,
      dataLabels: {
        enabled: true, textAnchor: 'start', offsetX: 8,
        style: { colors: ['#f8fafc'], fontSize: '11px', fontWeight: 600 },
        dropShadow: { enabled: true, top: 1, left: 1, blur: 2, color: '#070a14', opacity: 0.9 },
        formatter: (val, { dataPointIndex }) => `${val > 0 ? '+' : ''}${val}% (${counts[dataPointIndex]})`
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' },
          formatter: v => (v > 0 ? '+' : '') + v + '%'
        },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: 'rgba(226,232,240,.78)', fontSize: '11px' }, maxWidth: 210 }
      },
      grid: { borderColor: 'rgba(148,163,184,.08)', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      legend: { show: false },
      tooltip: {
        theme: 'dark',
        y: { formatter: (v, { dataPointIndex }) => `${v > 0 ? '+' : ''}${v}% (${counts[dataPointIndex]})` }
      }
    };

    const el = document.getElementById('chart-bias-ranking');
    if (!el) return;
    if (charts.biasRanking) charts.biasRanking.destroy();
    el.innerHTML = '';
    charts.biasRanking = new ApexCharts(el, opts);
    charts.biasRanking.render();
  }

  // ── Chart 3: Full-Width Market Heatmap (Clickable Cells!) ──
  function renderHeatmap() {
    const firmStats = DATA && DATA.firm_stats;
    if (!firmStats) return;

    const order = heatmapMarket === 'US' ? US_ORDER : KR_ORDER;
    const marketTickers = U.sortStocks(
      Object.values(DATA.stocks).filter(s => s.market === heatmapMarket),
      'mcap',
      order
    ).map(s => s.ticker);

    const firms = Object.entries(firmStats)
      .map(([firm, stats]) => {
        const coveredCount = marketTickers.reduce((sum, t) => sum + ((stats.by_stock && stats.by_stock[t]) ? stats.by_stock[t].count : 0), 0);
        return { firm, stats, coveredCount };
      })
      .filter(f => f.coveredCount > 0)
      .sort((a, b) => b.coveredCount - a.coveredCount)
      .slice(0, 16);

    const EMPTY_SENTINEL = -9999;
    const series = firms.map(({ firm, stats }) => {
      const data = marketTickers.map(ticker => {
        const entry = stats.by_stock && stats.by_stock[ticker];
        const hasBias = entry && entry.avg_bias != null && isFinite(entry.avg_bias);
        return {
          x: heatmapMarket === 'US' ? ticker : getStockName(DATA.stocks[ticker]),
          y: hasBias ? parseFloat(entry.avg_bias.toFixed(1)) : EMPTY_SENTINEL,
          ticker
        };
      });
      return { name: getFirmName(firm), data };
    });

    const dict = I18N[currentLang];
    const opts = {
      series,
      chart: {
        type: 'heatmap',
        height: Math.max(430, firms.length * 32 + 140),
        background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 400 },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const pt = series[config.seriesIndex] && series[config.seriesIndex].data[config.dataPointIndex];
            if (pt && pt.ticker && DATA.stocks[pt.ticker]) {
              selectStock(pt.ticker);
              document.getElementById('sec-hero').scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      },
      stroke: { width: 2, colors: ['#0b1020'] },
      plotOptions: {
        heatmap: {
          enableShades: false,
          radius: 5,
          useFillColorAsStroke: false,
          colorScale: {
            ranges: [
              { from: -10000, to: -9000, color: '#111827', name: dict.cat_no_data },
              { from: -1000, to: -15.01, color: '#2563eb', name: dict.cat_conservative },
              { from: -15, to: 15, color: '#334155', name: dict.cat_accurate },
              { from: 15.01, to: 30, color: '#ea580c', name: dict.cat_optimistic },
              { from: 30.01, to: 10000, color: '#e11d48', name: dict.cat_overly_optimistic },
            ]
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['rgba(248,250,252,.92)'], fontSize: '10px', fontWeight: 600 },
        formatter: val => (val != null && val > -9000) ? (val > 0 ? '+' : '') + val.toFixed(0) : ''
      },
      xaxis: {
        labels: {
          style: { colors: 'rgba(203,213,225,.82)', fontSize: '11px' },
          rotate: -40,
          rotateAlways: heatmapMarket === 'KR',
          maxHeight: 130,
          trim: false
        },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: 'rgba(226,232,240,.82)', fontSize: '11px' }, maxWidth: 190 }
      },
      grid: { show: false, padding: { bottom: 26, right: 10 } },
      legend: { position: 'top', labels: { colors: 'rgba(203,213,225,.78)' }, fontSize: '11px' },
      tooltip: {
        theme: 'dark',
        y: { formatter: v => (v != null && v > -9000) ? (v > 0 ? '+' : '') + v + '%' : '—' }
      },
      states: { hover: { filter: { type: 'lighten', value: 0.14 } } }
    };

    const el = document.getElementById('chart-heatmap');
    if (!el) return;
    if (charts.heatmap) charts.heatmap.destroy();
    el.innerHTML = '';
    charts.heatmap = new ApexCharts(el, opts);
    charts.heatmap.render();
  }

  // ── Chart 4: Accuracy Trend (Instant Stock Scope + Optional Market Scope) ──
  async function renderAccuracyTrend() {
    const el = document.getElementById('chart-accuracy');
    if (!el) return;
    const dict = I18N[currentLang];

    let allReports = [];
    if (accuracyScope === 'stock') {
      const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
      if (stock && stock.analyst_reports) {
        allReports = stock.analyst_reports
          .filter(r => r.realized_bias_pct != null)
          .map(r => ({ ...r, ticker: selectedTicker }));
      }
    } else {
      const majorTickers = ['005930', '000660', '005380', 'AAPL', 'NVDA', 'MSFT'].filter(t => DATA.stocks[t]);
      await Promise.all(majorTickers.map(async t => {
        if (!STOCK_CACHE[t]) {
          try {
            const resp = await fetch(`stocks/${t}.json?t=${Date.now()}`);
            if (resp.ok) STOCK_CACHE[t] = await resp.json();
          } catch (e) { /* skip */ }
        }
        const st = STOCK_CACHE[t];
        if (st && st.analyst_reports) {
          st.analyst_reports.forEach(r => {
            if (r.realized_bias_pct != null) allReports.push({ ...r, ticker: t });
          });
        }
      }));
    }

    if (!allReports.length) {
      if (charts.accuracy) { charts.accuracy.destroy(); charts.accuracy = null; }
      el.innerHTML = `<div style="text-align:center;padding:56px 20px;color:var(--text-tertiary);font-size:.86rem;">${dict.accuracy_empty}</div>`;
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
    allReports.forEach(r => { if (firmReports[r.firm]) firmReports[r.firm].push(r); });

    const series = topFirms.map(firm => {
      const sorted = firmReports[firm].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
      const win = 3;
      const data = sorted.map((r, idx) => {
        const slice = sorted.slice(Math.max(0, idx - win + 1), idx + 1);
        const avg = slice.reduce((s, x) => s + Math.abs(x.realized_bias_pct), 0) / slice.length;
        return { x: Date.parse(r.date + 'T00:00:00Z'), y: parseFloat(avg.toFixed(1)) };
      });
      return { name: getFirmName(firm), data };
    });

    const opts = {
      series,
      chart: {
        type: 'line', height: 340, background: 'transparent',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 500 },
      },
      colors: FIRM_COLORS.slice(0, 5),
      stroke: { width: 2.5, curve: 'smooth' },
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        type: 'datetime',
        labels: { style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
      },
      yaxis: {
        title: { text: '|Realized Error| Rolling Avg (%)', style: { color: 'rgba(148,163,184,.65)', fontSize: '11px' } },
        labels: { style: { colors: 'rgba(203,213,225,.55)', fontSize: '11px' }, formatter: v => v.toFixed(0) + '%' },
      },
      grid: { borderColor: 'rgba(148,163,184,.08)', strokeDashArray: 4 },
      legend: {
        position: 'top', horizontalAlign: 'left',
        labels: { colors: 'rgba(203,213,225,.75)' },
        fontSize: '11px', fontWeight: 500, itemMargin: { horizontal: 10, vertical: 4 },
      },
      tooltip: { theme: 'dark', x: { format: 'yyyy-MM-dd' }, y: { formatter: v => v.toFixed(1) + '%' } }
    };

    if (charts.accuracy) charts.accuracy.destroy();
    el.innerHTML = '';
    charts.accuracy = new ApexCharts(el, opts);
    charts.accuracy.render();
  }

  // ── Reports Table (with Category Chips, Price on Date, & CSV Export) ──
  function buildTableData() {
    allTableData = [];
    const stock = STOCK_CACHE[selectedTicker] || DATA.stocks[selectedTicker];
    if (stock && stock.analyst_reports) {
      stock.analyst_reports.forEach(r => {
        const reportPrice = U.getPriceOnDate(stock.price_history, r.date, 7);
        const issuanceBias = getReportIssuanceBias(stock, r);
        const bc = biasCategoryInfo(issuanceBias);
        allTableData.push({
          date: r.date,
          stock: getStockName(stock),
          ticker: selectedTicker,
          market: stock.market,
          firm: getFirmName(r.firm),
          raw_firm: r.firm,
          analyst: r.analyst || '—',
          reportPrice,
          target: r.target_price,
          bias: issuanceBias,
          catKey: bc.key,
          category: bc.label,
          catCls: bc.cls
        });
      });
    }
    currentPage = 1;
    applyTableFilters();
  }

  function applyTableFilters() {
    const input = document.getElementById('table-search');
    const clearBtn = document.getElementById('table-search-clear');
    const q = input ? input.value.trim().toLowerCase() : '';
    if (clearBtn) clearBtn.classList.toggle('hidden', !q);

    filteredData = allTableData.filter(r => {
      if (tableCategory !== 'ALL' && r.catKey !== tableCategory) return false;
      if (!q) return true;
      return (
        (r.firm || '').toLowerCase().includes(q) ||
        (r.raw_firm || '').toLowerCase().includes(q) ||
        (r.analyst || '').toLowerCase().includes(q) ||
        (r.date || '').includes(q)
      );
    });

    applySort();
    renderTable();
  }

  function applySort() {
    const { key, dir } = sortState;
    filteredData.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === 'target' || key === 'bias' || key === 'reportPrice') {
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
    if (!tbody) return;
    const dict = I18N[currentLang];
    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredData.slice(start, start + PAGE_SIZE);

    if (!page.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-cell">${dict.table_empty}</td></tr>`;
    } else {
      tbody.innerHTML = page.map(r => `<tr>
        <td class="num">${r.date}</td>
        <td><strong>${r.firm}</strong></td>
        <td>${r.analyst}</td>
        <td class="num-col">${r.reportPrice != null ? formatPrice(r.reportPrice, r.market) : '—'}</td>
        <td class="num-col"><strong>${formatPrice(r.target, r.market)}</strong></td>
        <td class="num-col" style="color:${biasColor(r.bias)};font-weight:700">${formatPercent(r.bias)}</td>
        <td><span class="badge ${r.catCls}">${r.category}</span></td>
      </tr>`).join('');
    }

    document.getElementById('table-count').textContent = dict.table_total.replace('{count}', filteredData.length.toLocaleString());
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    const prevBtn = `<button type="button" class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous">‹</button>`;
    const nextBtn = `<button type="button" class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next">›</button>`;
    const pageBtns = pages.map(p => {
      if (p === '...') return `<span class="page-btn" style="cursor:default;opacity:.35">…</span>`;
      return `<button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    container.innerHTML = prevBtn + pageBtns + nextBtn;
    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.page, 10);
        if (target >= 1 && target <= totalPages) {
          currentPage = target;
          renderTable();
        }
      });
    });
  }

  function exportFilteredCsv() {
    if (!filteredData.length) return;
    const dict = I18N[currentLang];
    const headers = [dict.th_date, dict.th_stock, 'Ticker', dict.th_firm, dict.th_analyst, dict.th_date_price, dict.th_target, dict.th_bias, dict.th_category];
    const csv = '\uFEFF' + U.buildReportsCsv(filteredData, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consensus_${selectedTicker || 'reports'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(dict.csv_toast);
  }

  // ── Command Palette (Quick Jump Modal) ──
  function openCommandPalette() {
    const modal = document.getElementById('cmd-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    if (!modal || !input) return;
    modal.classList.remove('hidden');
    input.value = '';
    cmdActiveIndex = 0;
    renderCommandResults('');
    setTimeout(() => input.focus(), 20);
  }

  function closeCommandPalette() {
    const modal = document.getElementById('cmd-palette-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderCommandResults(query) {
    const container = document.getElementById('cmd-palette-results');
    if (!container || !DATA) return;
    const q = query.trim().toLowerCase();
    const all = Object.values(DATA.stocks);

    cmdMatches = all.filter(s => {
      if (!q) return true;
      const enName = KR_STOCK_EN_NAMES[s.ticker] || s.name;
      return `${s.name} ${enName} ${s.ticker} ${s.market}`.toLowerCase().includes(q);
    });

    // Order by market cap
    const combinedOrder = [...US_ORDER, ...KR_ORDER];
    cmdMatches.sort((a, b) => {
      const ia = combinedOrder.indexOf(a.ticker);
      const ib = combinedOrder.indexOf(b.ticker);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    if (cmdActiveIndex >= cmdMatches.length) cmdActiveIndex = 0;

    if (!cmdMatches.length) {
      container.innerHTML = `<div style="padding:28px;text-align:center;color:var(--text-tertiary);font-size:.84rem;">${I18N[currentLang].table_empty}</div>`;
      return;
    }

    container.innerHTML = cmdMatches.map((s, idx) => {
      const up = s.realistic_median_upside ?? 0;
      const cls = up >= 0 ? 'text-up' : 'text-down';
      return `<button type="button" class="cmd-item ${idx === cmdActiveIndex ? 'selected' : ''}" data-ticker="${s.ticker}" role="option" aria-selected="${idx === cmdActiveIndex}">
        <span class="cmd-item-left">
          <span class="mini-market-badge">${s.market}</span>
          <span class="cmd-item-name">${getStockName(s)}</span>
          <span class="cmd-item-ticker">${s.ticker}</span>
        </span>
        <span class="cmd-item-right">
          <span>${formatPrice(s.current_price, s.market)}</span>
          <strong class="${cls}">${formatPercent(up)}</strong>
        </span>
      </button>`;
    }).join('');
  }

  // ── 42-Stock Market Screener Modal ──
  function openScreener() {
    const modal = document.getElementById('screener-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderScreenerTable();
  }

  function closeScreener() {
    const modal = document.getElementById('screener-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderScreenerTable() {
    const tbody = document.getElementById('screener-tbody');
    if (!tbody || !DATA) return;

    let rows = Object.values(DATA.stocks).map(s => ({
      ticker: s.ticker,
      market: s.market,
      name: getStockName(s),
      current_price: s.current_price,
      adj_mean: s.adj_stats ? s.adj_stats.mean : null,
      upside: s.realistic_median_upside ?? 0,
      pred_3m: s.predicted_price_3m ?? null,
      volatility: s.volatility_annualized ?? 0,
      alpha: s.alpha_applied ?? 0.05,
      firms: s.active_firms_count ?? 0,
    }));

    if (screenerMarket !== 'ALL') rows = rows.filter(r => r.market === screenerMarket);

    const { key, dir } = screenerSort;
    const priceKeys = new Set(['current_price', 'adj_mean', 'pred_3m']);
    rows.sort((a, b) => {
      if (key === 'name') {
        return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      let va = priceKeys.has(key) ? U.toUsdValue(a[key], a.market, USD_KRW_RATE) : (a[key] ?? -Infinity);
      let vb = priceKeys.has(key) ? U.toUsdValue(b[key], b.market, USD_KRW_RATE) : (b[key] ?? -Infinity);
      return dir === 'asc' ? va - vb : vb - va;
    });

    tbody.innerHTML = rows.map(r => {
      const upCls = r.upside >= 0 ? 'text-up' : 'text-down';
      const activeCls = r.ticker === selectedTicker ? 'active-row' : '';
      return `<tr class="${activeCls}" data-ticker="${r.ticker}">
        <td><span class="mini-market-badge" style="margin-right:6px">${r.market}</span><strong>${r.name}</strong> <span style="color:var(--text-tertiary);font-size:.72rem">${r.ticker}</span></td>
        <td class="num-col">${formatPrice(r.current_price, r.market)}</td>
        <td class="num-col">${formatPrice(r.adj_mean, r.market)}</td>
        <td class="num-col"><strong class="${upCls}">${formatPercent(r.upside)}</strong></td>
        <td class="num-col val-cyan">${formatPrice(r.pred_3m, r.market)}</td>
        <td class="num-col">${(r.volatility * 100).toFixed(1)}%</td>
        <td class="num-col">${(r.alpha * 100).toFixed(1)}%</td>
        <td class="num-col">${r.firms}</td>
      </tr>`;
    }).join('');
  }

  // ── Init Interactive Listeners ──
  function initChartAndTableControls() {
    // Timeline range toggles
    const rangeGroup = document.getElementById('timeline-range-toggles');
    if (rangeGroup && !rangeGroup.dataset.bound) {
      rangeGroup.dataset.bound = 'true';
      rangeGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-range]');
        if (!btn || btn.dataset.range === timelineRange) return;
        timelineRange = btn.dataset.range;
        rangeGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b.dataset.range === timelineRange));
        renderTimeline();
      });
    }

    // Timeline scale toggles
    const scaleGroup = document.getElementById('timeline-scale-toggles');
    if (scaleGroup && !scaleGroup.dataset.bound) {
      scaleGroup.dataset.bound = 'true';
      scaleGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scale]');
        if (!btn || btn.dataset.scale === currentScaleMode) return;
        currentScaleMode = btn.dataset.scale;
        scaleGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b.dataset.scale === currentScaleMode));
        renderTimeline();
      });
    }

    // Target guide lines toggle
    const guideBtn = document.getElementById('toggle-target-lines');
    if (guideBtn && !guideBtn.dataset.bound) {
      guideBtn.dataset.bound = 'true';
      guideBtn.addEventListener('click', () => {
        showTargetGuides = !showTargetGuides;
        guideBtn.classList.toggle('active', showTargetGuides);
        guideBtn.setAttribute('aria-pressed', String(showTargetGuides));
        renderTimeline();
      });
    }

    // Ranking min report filter
    const minGroup = document.getElementById('ranking-min-filter');
    if (minGroup && !minGroup.dataset.bound) {
      minGroup.dataset.bound = 'true';
      minGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-min]');
        if (!btn) return;
        rankingMinReports = parseInt(btn.dataset.min, 10);
        minGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.min, 10) === rankingMinReports));
        renderBiasRanking();
      });
    }

    // Ranking mode toggle
    const rankModeGroup = document.getElementById('ranking-mode-toggles');
    if (rankModeGroup && !rankModeGroup.dataset.bound) {
      rankModeGroup.dataset.bound = 'true';
      rankModeGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-mode]');
        if (!btn || btn.dataset.mode === rankingMode) return;
        rankingMode = btn.dataset.mode;
        rankModeGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === rankingMode));
        renderBiasRanking();
      });
    }

    // Heatmap market toggle
    const hmGroup = document.getElementById('heatmap-market-toggles');
    if (hmGroup && !hmGroup.dataset.bound) {
      hmGroup.dataset.bound = 'true';
      hmGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-hmarket]');
        if (!btn || btn.dataset.hmarket === heatmapMarket) return;
        heatmapMarket = btn.dataset.hmarket;
        hmGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b.dataset.hmarket === heatmapMarket));
        renderHeatmap();
      });
    }

    // Accuracy scope toggle
    const accGroup = document.getElementById('accuracy-scope-toggles');
    if (accGroup && !accGroup.dataset.bound) {
      accGroup.dataset.bound = 'true';
      accGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scope]');
        if (!btn || btn.dataset.scope === accuracyScope) return;
        accuracyScope = btn.dataset.scope;
        accGroup.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === accuracyScope));
        renderAccuracyTrend();
      });
    }

    // Table category filter chips
    const catGroup = document.getElementById('table-category-filters');
    if (catGroup && !catGroup.dataset.bound) {
      catGroup.dataset.bound = 'true';
      catGroup.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cat]');
        if (!chip) return;
        tableCategory = chip.dataset.cat;
        catGroup.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === tableCategory));
        currentPage = 1;
        applyTableFilters();
      });
    }

    // Table search + clear
    const tblSearch = document.getElementById('table-search');
    const tblClear = document.getElementById('table-search-clear');
    let debounce = null;
    if (tblSearch && !tblSearch.dataset.bound) {
      tblSearch.dataset.bound = 'true';
      tblSearch.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => { currentPage = 1; applyTableFilters(); }, 160);
      });
    }
    if (tblClear && !tblClear.dataset.bound) {
      tblClear.dataset.bound = 'true';
      tblClear.addEventListener('click', () => {
        if (tblSearch) { tblSearch.value = ''; tblSearch.focus(); }
        currentPage = 1;
        applyTableFilters();
      });
    }

    // Table column sort
    document.querySelectorAll('#report-table th.sortable').forEach(th => {
      if (th.dataset.bound) return;
      th.dataset.bound = 'true';
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'desc'; }

        document.querySelectorAll('#report-table th.sortable').forEach(h => {
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

    // CSV Export
    const csvBtn = document.getElementById('btn-export-csv');
    if (csvBtn && !csvBtn.dataset.bound) {
      csvBtn.dataset.bound = 'true';
      csvBtn.addEventListener('click', exportFilteredCsv);
    }

    // Share Link button
    const shareBtn = document.getElementById('btn-share-stock');
    if (shareBtn && !shareBtn.dataset.bound) {
      shareBtn.dataset.bound = 'true';
      shareBtn.addEventListener('click', async () => {
        const shareUrl = window.location.href;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
          }
          showToast(I18N[currentLang].copied_toast);
        } catch (e) {
          showToast(shareUrl);
        }
      });
    }
  }

  function initModalsAndShortcuts() {
    // Palette openers/closers
    const openPalBtn = document.getElementById('btn-open-palette');
    const stickySwitchBtn = document.getElementById('sticky-switch-btn');
    const closePalBtn = document.getElementById('cmd-palette-close');
    const palModal = document.getElementById('cmd-palette-modal');
    const palInput = document.getElementById('cmd-palette-input');
    const palResults = document.getElementById('cmd-palette-results');

    if (openPalBtn) openPalBtn.addEventListener('click', openCommandPalette);
    if (stickySwitchBtn) stickySwitchBtn.addEventListener('click', openCommandPalette);
    if (closePalBtn) closePalBtn.addEventListener('click', closeCommandPalette);
    if (palModal) {
      palModal.addEventListener('click', (e) => { if (e.target === palModal) closeCommandPalette(); });
    }
    if (palInput) {
      palInput.addEventListener('input', () => {
        cmdActiveIndex = 0;
        renderCommandResults(palInput.value);
      });
      palInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (cmdMatches.length) {
            cmdActiveIndex = (cmdActiveIndex + 1) % cmdMatches.length;
            renderCommandResults(palInput.value);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (cmdMatches.length) {
            cmdActiveIndex = (cmdActiveIndex - 1 + cmdMatches.length) % cmdMatches.length;
            renderCommandResults(palInput.value);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (cmdMatches[cmdActiveIndex]) {
            selectStock(cmdMatches[cmdActiveIndex].ticker);
            closeCommandPalette();
          }
        } else if (e.key === 'Escape') {
          closeCommandPalette();
        }
      });
    }
    if (palResults) {
      palResults.addEventListener('click', (e) => {
        const item = e.target.closest('.cmd-item');
        if (item && item.dataset.ticker) {
          selectStock(item.dataset.ticker);
          closeCommandPalette();
        }
      });
    }

    // Screener modal
    const openScrBtn = document.getElementById('btn-open-screener');
    const closeScrBtn = document.getElementById('screener-close');
    const scrModal = document.getElementById('screener-modal');
    const scrTabs = document.getElementById('screener-market-tabs');
    const scrTbody = document.getElementById('screener-tbody');

    if (openScrBtn) openScrBtn.addEventListener('click', openScreener);
    if (closeScrBtn) closeScrBtn.addEventListener('click', closeScreener);
    if (scrModal) scrModal.addEventListener('click', (e) => { if (e.target === scrModal) closeScreener(); });
    if (scrTabs) {
      scrTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-smarket]');
        if (!btn) return;
        screenerMarket = btn.dataset.smarket;
        scrTabs.querySelectorAll('.seg-tab').forEach(t => t.classList.toggle('active', t.dataset.smarket === screenerMarket));
        renderScreenerTable();
      });
    }
    document.querySelectorAll('#screener-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.ssort;
        if (screenerSort.key === key) screenerSort.dir = screenerSort.dir === 'asc' ? 'desc' : 'asc';
        else { screenerSort.key = key; screenerSort.dir = 'desc'; }
        document.querySelectorAll('#screener-table th.sortable').forEach(h => {
          h.classList.remove('active-sort');
          h.querySelector('.sort-icon').textContent = '⇅';
        });
        th.classList.add('active-sort');
        th.querySelector('.sort-icon').textContent = screenerSort.dir === 'asc' ? '▲' : '▼';
        renderScreenerTable();
      });
    });
    if (scrTbody) {
      scrTbody.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-ticker]');
        if (tr && tr.dataset.ticker) {
          selectStock(tr.dataset.ticker);
          closeScreener();
        }
      });
    }

    // Global Keyboard Shortcuts: '/' or Ctrl/Cmd+K for Palette, ESC to close modals
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      } else if (!inInput && e.key === '/') {
        e.preventDefault();
        openCommandPalette();
      } else if (e.key === 'Escape') {
        closeCommandPalette();
        closeScreener();
      }
    });
  }

  // ── Sticky Context Bar & Section ScrollSpy ──
  function initScrollObservers() {
    const heroEl = document.getElementById('sec-hero');
    const stickyBar = document.getElementById('sticky-stock-bar');
    if (heroEl && stickyBar) {
      const heroObs = new IntersectionObserver((entries) => {
        const show = !entries[0].isIntersecting && entries[0].boundingClientRect.top < 80;
        stickyBar.classList.toggle('visible', show);
        stickyBar.setAttribute('aria-hidden', String(!show));
      }, { threshold: 0 });
      heroObs.observe(heroEl);
    }

    const navLinks = document.querySelectorAll('.sec-nav-link');
    const secIds = Array.from(navLinks).map(a => a.dataset.sec).filter(Boolean);
    const secEls = secIds.map(id => document.getElementById(id)).filter(Boolean);

    if (secEls.length && navLinks.length) {
      const spyObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(link => link.classList.toggle('active', link.dataset.sec === entry.target.id));
          }
        });
      }, { rootMargin: '-22% 0px -65% 0px' });
      secEls.forEach(el => spyObs.observe(el));
    }
  }

  // ── Language & Currency Controls ──
  function renderGeneratedAtInfo() {
    if (!DATA || !DATA.generated_at) return;
    const d = new Date(DATA.generated_at);
    const dict = I18N[currentLang];
    const formattedDate = currentLang === 'en'
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const genEl = document.getElementById('generated-at');
    if (genEl) genEl.textContent = `${dict.date_prefix}${formattedDate}`;

    const badgeEl = document.getElementById('update-status-badge');
    if (badgeEl) {
      const diffDays = Math.floor(Math.max(0, Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        badgeEl.className = 'update-status-badge status-fresh';
        badgeEl.textContent = currentLang === 'ko' ? '✅ 최신 상태' : '✅ Up to Date';
        badgeEl.title = currentLang === 'ko' ? `생성 후 ${diffDays}일 경과 (주간 주기)` : `${diffDays}d since update (Weekly cycle)`;
      } else {
        badgeEl.className = 'update-status-badge status-stale';
        badgeEl.textContent = currentLang === 'ko' ? `⚠️ 업데이트 필요 (${diffDays}일 경과)` : `⚠️ Update Needed (${diffDays}d ago)`;
        badgeEl.title = currentLang === 'ko' ? '생성 후 7일이 지나 데이터 갱신이 권장됩니다.' : 'More than 7 days since last update.';
      }
    }
  }

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

    const toggleBtn = document.getElementById('btn-toggle-pills');
    if (toggleBtn) {
      const sp = toggleBtn.querySelector('span');
      if (sp) sp.textContent = pillsExpanded ? dict.collapse_pills : dict.expand_pills;
    }

    document.querySelectorAll('#lang-switcher .ctrl-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    document.querySelectorAll('#curr-switcher .ctrl-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.curr === currentCurrency);
    });
    renderGeneratedAtInfo();
  }

  function initHeaderControls() {
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
        const tickerQuery = selectedTicker ? `?ticker=${encodeURIComponent(selectedTicker)}` : '';

        if (currentLang === 'en' && !window.location.pathname.endsWith('index_en.html')) {
          window.location.href = `index_en.html${tickerQuery}`;
          return;
        } else if (currentLang === 'ko' && window.location.pathname.endsWith('index_en.html')) {
          window.location.href = `index.html${tickerQuery}`;
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
    updateHeroAndCards();
    renderTimeline();
    renderBiasRanking();
    buildTableData();
  }

  // ── Initialization ──
  async function init() {
    try {
      let resp = await fetch(`summary.json?t=${Date.now()}`);
      if (!resp.ok) {
        resp = await fetch(`data.json?t=${Date.now()}`);
        if (!resp.ok) throw new Error('Cannot load consensus data file.');
      }
      DATA = await resp.json();
    } catch (err) {
      console.error(err);
      const loader = document.getElementById('loading-overlay');
      if (loader) {
        loader.innerHTML = `
          <div style="text-align:center;padding:40px">
            <p style="color:#fb7185;font-size:1.1rem;font-weight:700;margin-bottom:8px">⚠️ Data Load Error</p>
            <p style="color:rgba(203,213,225,.65);font-size:.85rem">${err.message}</p>
          </div>`;
      }
      return;
    }

    try {
      applyLanguageDOM();
      initHeaderControls();
      initDiscoveryControls();
      initChartAndTableControls();
      initModalsAndShortcuts();
      initCustomTooltips();
      initScrollObservers();

      const requestedTicker = urlParams.get('ticker');
      const fallbackDefault = isEnPage
        ? (DATA.stocks['NVDA'] ? 'NVDA' : Object.keys(DATA.stocks)[0])
        : (DATA.stocks['005930'] ? '005930' : Object.keys(DATA.stocks)[0]);
      const initialTicker = (requestedTicker && DATA.stocks[requestedTicker]) ? requestedTicker : fallbackDefault;

      // Sync heatmap default market with initial stock market
      if (initialTicker && DATA.stocks[initialTicker]) {
        heatmapMarket = DATA.stocks[initialTicker].market;
        document.querySelectorAll('#heatmap-market-toggles .scale-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.hmarket === heatmapMarket);
        });
      }

      buildStockPills();
      if (initialTicker) await selectStock(initialTicker, { skipUrlUpdate: !requestedTicker });
      renderHeatmap();
      renderAccuracyTrend();
    } catch (renderErr) {
      console.error('Error rendering dashboard components:', renderErr);
    } finally {
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
      }, 280);
    }
  }

  function initFadeIn() {
    // Run smooth entry transitions immediately so anchor-jumping never leaves sections hidden
    document.querySelectorAll('.fade-in').forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFadeIn();
    init();
  });
})();
