"""
Stock Consensus Bias Analysis — Data Fetcher & Analyzer
=========================================================
Collects analyst consensus data (target prices, grades) for 40 representative
US and Korean stocks (20 US + 20 KR), merges with actual price history,
computes forecasting bias metrics, and exports everything to data.json.

Data Sources
------------
- US analyst targets : yfinance upgrades_downgrades (2012–present)
- KR analyst targets : Naver Finance research reports (2007–present)
                       + Hankyung Consensus API (2025.06–present, supplementary)
- Actual prices      : yfinance daily close (US & KR)
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from bs4 import BeautifulSoup

# Fix Windows cp949 console encoding
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# US stocks (20)
US_STOCKS = {
    "AAPL":  "Apple",
    "MSFT":  "Microsoft",
    "NVDA":  "NVIDIA",
    "AMZN":  "Amazon",
    "GOOGL": "Alphabet",
    "META":  "Meta Platforms",
    "TSLA":  "Tesla",
    "LLY":   "Eli Lilly",
    "AVGO":  "Broadcom",
    "JPM":   "JPMorgan Chase",
    "WMT":   "Walmart",
    "V":     "Visa",
    "MA":    "Mastercard",
    "NFLX":  "Netflix",
    "AMD":   "Advanced Micro Devices",
    "DIS":   "Walt Disney",
    "ORCL":  "Oracle",
    "COST":  "Costco",
    "PEP":   "PepsiCo",
    "KO":    "Coca-Cola",
}

# Korean stocks (20) — code : name
KR_STOCKS = {
    "005930": "삼성전자",
    "000660": "SK하이닉스",
    "373220": "LG에너지솔루션",
    "207940": "삼성바이오로직스",
    "005380": "현대차",
    "068270": "셀트리온",
    "005490": "POSCO홀딩스",
    "035420": "NAVER",
    "000270": "기아",
    "035720": "카카오",
    "105560": "KB금융",
    "055550": "신한지주",
    "000810": "삼성화재",
    "012330": "현대모비스",
    "051910": "LG화학",
    "006400": "삼성SDI",
    "028260": "삼성물산",
    "032830": "삼성생명",
    "015760": "한국전력",
    "034020": "두산에너빌리티",
}

# How many years of Naver Finance research pages to scan (55 days for incremental update)
NAVER_SCAN_YEARS = 0.15

# Rate-limiting delays (seconds)
NAVER_LIST_DELAY = 0.3
HANKYUNG_DELAY = 0.2

# Bias thresholds
BIAS_OVERLY_OPTIMISTIC = 30   # > 30 %
BIAS_OPTIMISTIC = 15          # 15-30 %
BIAS_CONSERVATIVE = -15       # < -15 %

OUTPUT_DIR = Path(__file__).resolve().parent

# Hankyung API auth token (public, embedded in their JS bundles)
HANKYUNG_TOKEN = "Bearer 0ZdNlr7LrQoawewqweq78k6usasBsqhqSIaUarSTf8mxnHuQVh9CvKAfpUy94LhBmZMg"

import math

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def classify_bias(bias_pct: float | None) -> str:
    if bias_pct is None:
        return "N/A"
    if bias_pct > BIAS_OVERLY_OPTIMISTIC:
        return "과대 긍정적"
    if bias_pct > BIAS_OPTIMISTIC:
        return "긍정적"
    if bias_pct < BIAS_CONSERVATIVE:
        return "보수적"
    return "적정"


def safe_float(val) -> float | None:
    if val is None or val == "" or val == "N/A":
        return None
    try:
        f = float(str(val).replace(",", ""))
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def sanitize_nan(obj):
    """Recursively convert float NaN/Infinity to None for strict JSON validity."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_nan(v) for v in obj]
    return obj


def fetch_splits(ticker_symbol: str) -> list[tuple[str, float]]:
    """Fetch and deduplicate split history for a ticker using yfinance."""
    try:
        t = yf.Ticker(ticker_symbol)
        splits_series = t.splits
        if splits_series.empty:
            return []
        items = []
        for dt, ratio in splits_series.items():
            dt_str = dt.strftime("%Y-%m-%d")
            items.append((dt_str, float(ratio)))
        
        items.sort(key=lambda x: x[0])
        
        # Deduplicate splits: if dates are within 30 days and ratios are same, keep only first
        cleaned = []
        for dt_str, ratio in items:
            is_duplicate = False
            dt_obj = datetime.strptime(dt_str, "%Y-%m-%d")
            for prev_dt, prev_ratio in cleaned:
                prev_obj = datetime.strptime(prev_dt, "%Y-%m-%d")
                if abs((dt_obj - prev_obj).days) <= 30 and abs(ratio - prev_ratio) / prev_ratio < 0.001:
                    is_duplicate = True
                    break
            if not is_duplicate:
                cleaned.append((dt_str, ratio))
        return cleaned
    except Exception as e:
        print(f"  ⚠️ Error fetching splits for {ticker_symbol}: {e}")
        return []


def adjust_reports_for_splits(reports: list[dict], splits_list: list[tuple[str, float]], price_history: list[dict]):
    """Adjust target_price and prior_target in reports for subsequent stock splits.
    Detects if the target is already split-adjusted in the source data to avoid double adjustment.
    """
    if not splits_list or not price_history:
        return
    
    price_map = {p["date"]: p["close"] for p in price_history}
    
    for r in reports:
        r_date = r.get("date")
        if not r_date:
            continue
        
        raw_tp = r.get("target_price_raw", r.get("target_price"))
        raw_pt = r.get("prior_target_raw", r.get("prior_target"))
        
        if raw_tp is None:
            continue
            
        p_close = price_map.get(r_date)
        if not p_close:
            p_close = get_price_on_date(price_history, r_date)
            
        if not p_close or p_close <= 0:
            continue
            
        factor = 1.0
        for s_date, ratio in splits_list:
            if s_date > r_date:
                factor *= ratio
        
        if factor != 1.0:
            # Check if this target price is already split-adjusted in yfinance/source database.
            # If R = raw_tp / p_close is normal (< 2.0 for forward split), it is already adjusted.
            # If R is pre-split (> 2.0 for forward split), we must adjust it.
            ratio = raw_tp / p_close
            should_adjust = False
            if factor > 1.0 and ratio > 2.0:
                should_adjust = True
            elif factor < 1.0 and ratio < 0.4:
                should_adjust = True
                
            if should_adjust:
                r["target_price_raw"] = raw_tp
                r["target_price"] = round(raw_tp / factor, 2)
                if raw_pt is not None:
                    r["prior_target_raw"] = raw_pt
                    r["prior_target"] = round(raw_pt / factor, 2)
            else:
                # Retain as already split-adjusted
                r["target_price"] = raw_tp
                if raw_pt is not None:
                    r["prior_target"] = raw_pt


def filter_outliers(reports: list[dict], price_history: list[dict], ticker: str) -> list[dict]:
    """Remove obvious database typos/errors based on stock price ratio on report date."""
    if not price_history:
        return reports
        
    price_map = {p["date"]: p["close"] for p in price_history}
    cleaned = []
    
    for r in reports:
        r_date = r.get("date")
        tp = r.get("target_price")
        if not r_date or tp is None:
            cleaned.append(r)
            continue
            
        p_close = price_map.get(r_date)
        if not p_close:
            p_close = get_price_on_date(price_history, r_date)
            
        if not p_close or p_close <= 0:
            cleaned.append(r)
            continue
            
        ratio = tp / p_close
        
        # Outlier conditions:
        # 1. High-side: target is > 3.5x stock price (always a database typo for our blue chips)
        # 2. Low-side: target is < 0.15x stock price (except TSLA, which has genuine extreme bears)
        is_outlier = False
        if ratio > 3.5:
            is_outlier = True
        elif ratio < 0.15 and ticker != "TSLA":
            is_outlier = True
            
        if is_outlier:
            print(f"  ⚠️  Filtered outlier report for {ticker} on {r_date}: Firm={r.get('firm')}, Target={tp}, StockPrice={p_close} (Ratio={ratio:.2f})")
            continue
            
        cleaned.append(r)
        
    return cleaned


def naver_request(url: str) -> str:
    """Fetch a Naver Finance page, decode as cp949."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("cp949", errors="ignore")

# ---------------------------------------------------------------------------
# 1. Fetch actual price histories
# ---------------------------------------------------------------------------

def fetch_price_history(ticker: str, period: str = "10y") -> list[dict]:
    """Return list of {date, close} dicts."""
    print(f"  📈 Fetching price history for {ticker}...")
    t = yf.Ticker(ticker)
    try:
        hist = t.history(period=period)
    except Exception as e:
        print(f"    ⚠️  Error fetching history for {ticker}: {e}")
        return []
    if hist.empty:
        print(f"    ⚠️  No price data for {ticker}")
        return []
    records = []
    for dt, row in hist.iterrows():
        c = row.get("Close")
        if c is None or pd.isna(c) or math.isnan(float(c)):
            continue
        records.append({
            "date": dt.strftime("%Y-%m-%d"),
            "close": round(float(c), 2),
        })
    return records


def get_price_on_date(price_history: list[dict], target_date: str) -> float | None:
    """Find the closing price on or just before target_date."""
    if not price_history:
        return None
    target = datetime.strptime(target_date, "%Y-%m-%d")
    best = None
    best_diff = timedelta(days=9999)
    for rec in price_history:
        d = datetime.strptime(rec["date"], "%Y-%m-%d")
        diff = target - d
        if timedelta(0) <= diff < best_diff:
            best = rec["close"]
            best_diff = diff
    return best

# ---------------------------------------------------------------------------
# 2. Fetch US analyst targets via yfinance
# ---------------------------------------------------------------------------

def fetch_finviz_targets(ticker: str) -> list[dict]:
    """Fetch and parse recent upgrades/downgrades and targets from Finviz as a fallback."""
    url = f"https://finviz.com/quote.ashx?t={ticker}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    })
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode("utf-8")
        
        soup = BeautifulSoup(html, "html.parser")
        ratings_rows = []
        for tr in soup.find_all("tr"):
            text = tr.get_text()
            if "Upgrade" in text or "Downgrade" in text or "Reiterated" in text or "Initiated" in text:
                cells = [td.get_text(strip=True) for td in tr.find_all("td")]
                if len(cells) >= 5:
                    ratings_rows.append(cells)
        
        reports = []
        for cells in ratings_rows:
            date_str = cells[0]
            if not re.match(r'^[A-Za-z]{3}-\d{2}-\d{2}$', date_str):
                continue
                
            try:
                dt_obj = datetime.strptime(date_str, "%b-%d-%y")
                formatted_date = dt_obj.strftime("%Y-%m-%d")
            except Exception:
                continue
                
            action = cells[1]
            firm = cells[2]
            grade = cells[3]
            target_str = cells[4]
            
            # Parse target and prior target (e.g. "$825 -> $800" or "$735")
            prices = re.findall(r'([0-9,]+(?:\.[0-9]+)?)', target_str.replace('$', ''))
            
            target_price = None
            prior_target = None
            
            if len(prices) >= 2:
                try:
                    prior_target = float(prices[0].replace(',', ''))
                    target_price = float(prices[1].replace(',', ''))
                except ValueError:
                    pass
            elif len(prices) == 1:
                try:
                    target_price = float(prices[0].replace(',', ''))
                except ValueError:
                    pass
                    
            if target_price is not None:
                reports.append({
                    "date": formatted_date,
                    "firm": firm,
                    "analyst": "",
                    "target_price": target_price,
                    "prior_target": prior_target,
                    "grade": grade,
                    "action": action.lower(),
                    "source": "finviz",
                })
        return reports
    except Exception as e:
        print(f"    ⚠️ Error fetching Finviz fallback data for {ticker}: {e}")
        return []


def fetch_us_analyst_targets(ticker: str) -> list[dict]:
    """Return list of analyst report dicts from yfinance upgrades_downgrades.
    If the data is stale (e.g. for META), queries Finviz for the latest reports.
    """
    print(f"  🔍 Fetching US analyst targets for {ticker}...")
    t = yf.Ticker(ticker)
    try:
        ud = t.upgrades_downgrades
    except Exception:
        ud = None

    reports = []
    if ud is not None and not ud.empty:
        for grade_date, row in ud.iterrows():
            target = safe_float(row.get("currentPriceTarget"))
            prior = safe_float(row.get("priorPriceTarget"))
            if target is None or target == 0:
                continue
            reports.append({
                "date": grade_date.strftime("%Y-%m-%d"),
                "firm": str(row.get("Firm", "")),
                "analyst": "",
                "target_price": target,
                "prior_target": prior,
                "grade": str(row.get("ToGrade", "")),
                "action": str(row.get("Action", "")),
                "source": "yfinance",
            })
    
    # Check if the yfinance data is missing or stale (older than 14 days)
    # Today is 2026-07-12
    needs_finviz_fallback = False
    if not reports:
        needs_finviz_fallback = True
    else:
        latest_report = max(reports, key=lambda x: x["date"])
        latest_date = datetime.strptime(latest_report["date"], "%Y-%m-%d")
        if (datetime.now() - latest_date).days > 14:
            needs_finviz_fallback = True
            
    if needs_finviz_fallback or ticker == "META":
        print(f"    ℹ️ yfinance data is stale or empty. Querying Finviz for latest {ticker}/US reports...")
        fv_reports = fetch_finviz_targets(ticker)
        if fv_reports:
            print(f"      ✅ Found {len(fv_reports)} reports on Finviz. Merging...")
            seen = {(r["date"], r["firm"]) for r in reports}
            for fvr in fv_reports:
                key = (fvr["date"], fvr["firm"])
                if key not in seen:
                    reports.append(fvr)
            # Re-sort reports descending
            reports.sort(key=lambda x: x["date"], reverse=True)

    print(f"    ✅ {len(reports)} reports found in total")
    return reports

# ---------------------------------------------------------------------------
# 3. Fetch KR analyst targets — Naver Finance multithreaded scraping
# ---------------------------------------------------------------------------

def fetch_naver_detail(report_item: dict) -> dict:
    """Worker function to fetch single Naver report detail page."""
    nid = report_item.get("nid")
    if not nid:
        return report_item

    detail_url = f"https://finance.naver.com/research/company_read.naver?nid={nid}"
    target_price = None
    grade = ""

    try:
        html = naver_request(detail_url)
        soup = BeautifulSoup(html, "html.parser")
        view_info = soup.find("div", class_="view_info_1")
        if view_info:
            money_el = view_info.find("em", class_="money")
            opinion_el = view_info.find("em", class_="coment")
            target_price = safe_float(
                money_el.get_text(strip=True) if money_el else None
            )
            grade = opinion_el.get_text(strip=True) if opinion_el else ""
    except Exception:
        pass

    return {
        "code": report_item["code"],
        "date": report_item["date"],
        "firm": report_item["firm"],
        "analyst": "",
        "target_price": target_price,
        "prior_target": None,
        "grade": grade,
        "action": "",
        "source": "naver",
    }


def fetch_naver_kr_targets(kr_stock_names: dict[str, str]) -> dict[str, list[dict]]:
    """
    Scan Naver Finance research list pages, filter by target stock names,
    and fetch detail pages concurrently for target price / opinion.
    Returns {stock_code: [report_dicts]}.
    """
    print("\n📰 Scanning Naver Finance research reports...")
    name_to_code = {v: k for k, v in kr_stock_names.items()}
    results: dict[str, list[dict]] = {code: [] for code in kr_stock_names}

    cutoff_date = datetime.now() - timedelta(days=365 * NAVER_SCAN_YEARS)
    page = 1
    consecutive_old = 0
    total_scanned = 0
    matched_nids: set[str] = set()

    pending_items = []

    while True:
        url = f"https://finance.naver.com/research/company_list.naver?&page={page}"
        try:
            html = naver_request(url)
        except Exception as e:
            print(f"  ⚠️  Error on page {page}: {e}")
            break

        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", class_="type_1")
        if not table:
            break

        rows = table.find_all("tr")
        all_old = True

        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 6:
                continue

            stock_name = cols[0].get_text(strip=True)
            date_text = cols[4].get_text(strip=True)

            try:
                report_date = datetime.strptime(date_text, "%y.%m.%d")
            except ValueError:
                continue

            if report_date >= cutoff_date:
                all_old = False

            if stock_name not in name_to_code:
                continue

            if report_date < cutoff_date:
                continue

            code = name_to_code[stock_name]
            title_a = cols[1].find("a")
            if not title_a:
                continue
            link = title_a.get("href", "")
            nid_match = re.search(r"nid=(\d+)", link)
            nid = nid_match.group(1) if nid_match else None
            if not nid or nid in matched_nids:
                continue
            matched_nids.add(nid)

            broker = cols[2].get_text(strip=True)
            total_scanned += 1

            pending_items.append({
                "code": code,
                "nid": nid,
                "date": report_date.strftime("%Y-%m-%d"),
                "firm": broker,
            })

        if all_old:
            consecutive_old += 1
        else:
            consecutive_old = 0

        if consecutive_old >= 3:
            print(f"  ⏹  Stopped scanning at page {page} (all reports older than {NAVER_SCAN_YEARS}y)")
            break

        if page % 50 == 0:
            print(f"  📄 Scanned page {page}... matched {total_scanned} reports so far")

        page += 1
        time.sleep(NAVER_LIST_DELAY)

    print(f"  ✅ List scan done: {total_scanned} matched reports across {page} pages")
    print(f"  🚀 Fetching {len(pending_items)} detail pages in parallel (10 threads)...")

    detail_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_naver_detail, item) for item in pending_items]
        for future in as_completed(futures):
            res = future.result()
            code = res.pop("code", None)
            if code and code in results:
                results[code].append(res)
            detail_count += 1
            if detail_count % 100 == 0:
                print(f"  📋 Fetched {detail_count} / {len(pending_items)} detail pages...")

    print(f"  ✅ Multithreaded detail fetching done: {detail_count} fetched")
    return results

# ---------------------------------------------------------------------------
# 4. Fetch KR analyst targets — Hankyung API (supplementary)
# ---------------------------------------------------------------------------

def fetch_hankyung_kr_targets(stock_code: str) -> list[dict]:
    """Fetch reports for a single KR stock from Hankyung API."""
    base = "https://markets.hankyung.com/api/consensus/search/report"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://markets.hankyung.com/consensus",
        "Authorization": HANKYUNG_TOKEN,
    }
    all_reports = []
    page = 1
    cutoff_date_str = (datetime.now() - timedelta(days=55)).strftime("%Y-%m-%d")
    while True:
        params = urllib.parse.urlencode({"page": page, "businessCode": stock_code})
        url = f"{base}?{params}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status != 200:
                    print(f"    ⚠️ Hankyung API HTTP {resp.status} for {stock_code}. Falling back to Naver data.")
                    break
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if page == 1:
                print(f"    ⚠️ Hankyung API fetch notice for {stock_code}: {e}")
            break

        raw = data.get("data", [])
        items = list(raw.values()) if isinstance(raw, dict) else raw
        if not items:
            break

        has_older = False
        for item in items:
            date_str = item.get("REPORT_DATE", "")
            if date_str and date_str < cutoff_date_str:
                has_older = True
            tp = safe_float(item.get("TARGET_STOCK_PRICES"))
            if tp is None or tp == 0:
                continue
            all_reports.append({
                "date": date_str,
                "firm": item.get("OFFICE_NAME", ""),
                "analyst": item.get("REPORT_WRITER", ""),
                "target_price": tp,
                "prior_target": safe_float(item.get("OLD_TARGET_STOCK_PRICES")),
                "grade": item.get("GRADE_VALUE", ""),
                "action": "",
                "source": "hankyung",
            })

        if has_older:
            break

        if page >= data.get("last_page", page):
            break
        page += 1
        time.sleep(HANKYUNG_DELAY)

    return all_reports

# ---------------------------------------------------------------------------
# 5. Merge & deduplicate KR reports
# ---------------------------------------------------------------------------

def merge_kr_reports(naver: list[dict], hankyung: list[dict]) -> list[dict]:
    """Merge Naver and Hankyung reports, deduplicate by (date, firm)."""
    seen = set()
    merged = []
    for r in hankyung + naver:
        key = (r["date"], r["firm"])
        if key not in seen:
            seen.add(key)
            merged.append(r)
    merged.sort(key=lambda x: x["date"], reverse=True)
    return merged

# ---------------------------------------------------------------------------
# 6. Compute bias metrics
# ---------------------------------------------------------------------------

def compute_bias(reports: list[dict], price_history: list[dict], current_price: float):
    """Add realized_bias_pct and current_bias_pct to each report in-place."""
    for r in reports:
        tp = r.get("target_price")
        if tp is None or tp == 0:
            r["realized_bias_pct"] = None
            r["current_bias_pct"] = None
            r["bias_category"] = "N/A"
            continue

        # Current bias: target vs current price
        if current_price and current_price > 0:
            r["current_bias_pct"] = round((tp - current_price) / current_price * 100, 1)
        else:
            r["current_bias_pct"] = None

        # Issuance bias: target vs stock price on report publication date
        report_date_price = get_price_on_date(price_history, r["date"])
        if report_date_price and report_date_price > 0:
            r["issuance_bias_pct"] = round((tp - report_date_price) / report_date_price * 100, 1)
        else:
            r["issuance_bias_pct"] = None

        # Realized bias: target vs actual price 3 months later
        try:
            report_date = datetime.strptime(r["date"], "%Y-%m-%d")
            future_date = report_date + timedelta(days=90)
            if future_date <= datetime.now():
                actual = get_price_on_date(price_history, future_date.strftime("%Y-%m-%d"))
                if actual and actual > 0:
                    r["realized_bias_pct"] = round((tp - actual) / actual * 100, 1)
                else:
                    r["realized_bias_pct"] = None
            else:
                r["realized_bias_pct"] = None
        except Exception:
            r["realized_bias_pct"] = None

        bias_val = r["issuance_bias_pct"] if r["issuance_bias_pct"] is not None else r["current_bias_pct"]
        r["bias_category"] = classify_bias(bias_val)

# ---------------------------------------------------------------------------
# 7. Aggregate firm statistics
# ---------------------------------------------------------------------------

def compute_firm_stats(all_stocks: dict) -> dict:
    """Aggregate per-firm statistics across all stocks."""
    firm_data: dict[str, dict] = {}

    for ticker, stock_info in all_stocks.items():
        for r in stock_info.get("analyst_reports", []):
            firm = r.get("firm", "")
            if not firm:
                continue
            if firm not in firm_data:
                firm_data[firm] = {
                    "total_reports": 0,
                    "current_biases": [],
                    "realized_biases": [],
                    "stocks_covered": set(),
                    "by_stock": {},
                }
            fd = firm_data[firm]
            fd["total_reports"] += 1
            fd["stocks_covered"].add(ticker)

            cb = r.get("current_bias_pct")
            rb = r.get("realized_bias_pct")
            if cb is not None:
                fd["current_biases"].append(cb)
            if rb is not None:
                fd["realized_biases"].append(rb)

            if ticker not in fd["by_stock"]:
                fd["by_stock"][ticker] = {"biases": [], "count": 0}
            fd["by_stock"][ticker]["count"] += 1
            if cb is not None:
                fd["by_stock"][ticker]["biases"].append(cb)

    result = {}
    for firm, fd in firm_data.items():
        avg_cb = round(np.mean(fd["current_biases"]), 1) if fd["current_biases"] else None
        avg_rb = round(np.mean(fd["realized_biases"]), 1) if fd["realized_biases"] else None
        by_stock = {}
        for tk, bs in fd["by_stock"].items():
            by_stock[tk] = {
                "avg_bias": round(np.mean(bs["biases"]), 1) if bs["biases"] else None,
                "count": bs["count"],
            }
        result[firm] = {
            "total_reports": fd["total_reports"],
            "avg_current_bias_pct": avg_cb,
            "avg_realized_bias_pct": avg_rb,
            "bias_category": classify_bias(avg_cb),
            "stocks_covered": sorted(fd["stocks_covered"]),
            "by_stock": by_stock,
        }

    return result

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  Stock Consensus Bias Analysis — Data Fetcher (40 Stocks)")
    print("=" * 60)

    # ── Load existing data for incremental updates ───────────────
    existing_data = {}
    stocks_dir = OUTPUT_DIR / "stocks"
    if stocks_dir.exists():
        print("📁 Loading existing analyst reports from stocks/*.json for incremental update...")
        for f in stocks_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    detail = json.load(file)
                    existing_data[f.stem] = detail
            except Exception as e:
                print(f"  ⚠️ Error loading {f.name}: {e}")
    else:
        print("📁 No existing stocks directory found. Doing full scan from config.")

    all_stocks: dict[str, dict] = {}

    # ── US Stocks (20) ─────────────────────────────────────────
    print(f"\n🇺🇸 Processing {len(US_STOCKS)} US Stocks...")
    for ticker, name in US_STOCKS.items():
        print(f"\n── {ticker} ({name}) ──")
        price_hist = fetch_price_history(ticker, period="10y")
        reports = fetch_us_analyst_targets(ticker)
        
        # Merge with existing reports
        existing_reports = []
        if ticker in existing_data:
            existing_reports = existing_data[ticker].get("analyst_reports", [])
        
        seen = set()
        merged = []
        for r in reports + existing_reports:
            key = (r["date"], r["firm"])
            if key not in seen:
                seen.add(key)
                merged.append(r)
        
        merged.sort(key=lambda x: x["date"], reverse=True)
        reports = merged

        # Adjust for stock splits
        splits = fetch_splits(ticker)
        adjust_reports_for_splits(reports, splits, price_hist)

        # Filter outliers
        reports = filter_outliers(reports, price_hist, ticker)

        current_price = price_hist[-1]["close"] if price_hist else 0
        compute_bias(reports, price_hist, current_price)
        all_stocks[ticker] = {
            "name": name,
            "market": "US",
            "ticker": ticker,
            "current_price": current_price,
            "price_history": price_hist,
            "analyst_reports": reports,
        }

    # ── KR Stocks (20) ─────────────────────────────────────────
    print(f"\n🇰🇷 Processing {len(KR_STOCKS)} Korean Stocks...")

    # 3a. Fetch KR price histories
    for code, name in KR_STOCKS.items():
        yf_ticker = f"{code}.KS"
        print(f"\n── {code} ({name}) ──")
        price_hist = fetch_price_history(yf_ticker, period="10y")
        current_price = price_hist[-1]["close"] if price_hist else 0
        all_stocks[code] = {
            "name": name,
            "market": "KR",
            "ticker": code,
            "current_price": current_price,
            "price_history": price_hist,
            "analyst_reports": [],
        }

    # 3b. Naver Finance scraping (bulk, multithreaded details)
    naver_reports = fetch_naver_kr_targets(KR_STOCKS)

    # 3c. Hankyung API (per stock)
    print("\n📊 Fetching Hankyung Consensus data (supplementary)...")
    for code, name in KR_STOCKS.items():
        yf_ticker = f"{code}.KS"
        price_hist = all_stocks[code]["price_history"]
        print(f"  🔍 Hankyung: {code} ({name})...")
        hk_reports = fetch_hankyung_kr_targets(code)
        print(f"    ✅ {len(hk_reports)} reports")

        nv = naver_reports.get(code, [])
        merged = merge_kr_reports(nv, hk_reports)
        
        # Merge with existing reports
        existing_reports = []
        if code in existing_data:
            existing_reports = existing_data[code].get("analyst_reports", [])
        
        seen = set()
        final_merged = []
        for r in merged + existing_reports:
            key = (r["date"], r["firm"])
            if key not in seen:
                seen.add(key)
                final_merged.append(r)
        
        final_merged.sort(key=lambda x: x["date"], reverse=True)
        final_merged = [r for r in final_merged if r.get("target_price") and r["target_price"] > 0]

        # Adjust for stock splits
        splits = fetch_splits(yf_ticker)
        adjust_reports_for_splits(final_merged, splits, price_hist)

        # Filter outliers
        final_merged = filter_outliers(final_merged, price_hist, code)

        current_price = all_stocks[code]["current_price"]
        compute_bias(final_merged, price_hist, current_price)
        all_stocks[code]["analyst_reports"] = final_merged
        print(f"    📊 Total merged: {len(final_merged)} reports")
        time.sleep(HANKYUNG_DELAY)

    # ── Firm stats ─────────────────────────────────────────────
    print("\n📊 Computing firm statistics...")
    firm_stats = compute_firm_stats(all_stocks)

    # ── Export ─────────────────────────────────────────────────
    print("\n💾 Exporting summary.json and stocks/*.json for fast lazy-loading...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stocks_dir = OUTPUT_DIR / "stocks"
    stocks_dir.mkdir(parents=True, exist_ok=True)

    gen_at = datetime.now().isoformat(timespec="seconds")

    # Helper for stock summary
    summary_stocks = {}

    for ticker, stock in all_stocks.items():
        # 1. Write individual stock detail file
        stock_detail = {
            "ticker": ticker,
            "name": stock["name"],
            "market": stock["market"],
            "current_price": stock["current_price"],
            "price_history": stock.get("price_history", []),
            "analyst_reports": stock.get("analyst_reports", [])
        }
        stock_detail = sanitize_nan(stock_detail)
        stock_file = stocks_dir / f"{ticker}.json"
        with open(stock_file, "w", encoding="utf-8") as f:
            json.dump(stock_detail, f, ensure_ascii=False, indent=None, allow_nan=False)

        # 2. Compute stock summary
        valid = [r for r in stock.get("analyst_reports", []) if r.get("target_price") and r["target_price"] > 0]
        cur_p = stock.get("current_price", 0)
        
        if valid and cur_p:
            price_hist = {p["date"]: p["close"] for p in stock.get("price_history", [])}
            sorted_dates = sorted(price_hist.keys())
            max_hist_date = sorted_dates[-1] if sorted_dates else ""

            def get_price(dt_str):
                if dt_str in price_hist: return price_hist[dt_str]
                past = [d for d in sorted_dates if d <= dt_str]
                return price_hist[past[-1]] if past else None

            firm_biases = {}
            for r in valid:
                firm = r.get("firm")
                if not firm or not r.get("date"): continue
                try:
                    dt = datetime.strptime(r["date"], "%Y-%m-%d")
                    dt3m = (dt + timedelta(days=90)).strftime("%Y-%m-%d")
                    if dt3m <= max_hist_date:
                        p3m = get_price(dt3m)
                        if p3m and p3m > 0:
                            b = (r["target_price"] - p3m) / p3m * 100.0
                            if -70.0 <= b <= 200.0:
                                if firm not in firm_biases: firm_biases[firm] = []
                                firm_biases[firm].append(b)
                except: pass

            # Bayesian Shrinkage for firm stock-specific bias towards global realized bias
            firm_avg_bias = {}
            for f, l in firm_biases.items():
                N = len(l)
                stock_bias = sum(l) / float(N)
                global_bias = firm_stats.get(f, {}).get("avg_realized_bias_pct")
                if global_bias is None:
                    global_bias = 15.0
                shrunk_bias = (N / (N + 5.0)) * stock_bias + (5.0 / (N + 5.0)) * global_bias
                firm_avg_bias[f] = max(-50.0, min(200.0, shrunk_bias))

            max_date = max(r["date"] for r in valid)
            max_dt_obj = datetime.strptime(max_date, "%Y-%m-%d")
            recent = [r for r in valid if (max_dt_obj - datetime.strptime(r["date"], "%Y-%m-%d")).days <= 90]
            if len(recent) < 3:
                recent = [r for r in valid if (max_dt_obj - datetime.strptime(r["date"], "%Y-%m-%d")).days <= 180]

            firm_map = {}
            for r in sorted(recent, key=lambda x: x["date"]):
                firm_map[r["firm"]] = r
            active = list(firm_map.values())

            # Add exponential time-decay weights (30-day half life)
            active_weighted = []
            for r in active:
                r_dt = datetime.strptime(r["date"], "%Y-%m-%d")
                age_days = max(0, (max_dt_obj - r_dt).days)
                w = math.exp(-math.log(2) / 30.0 * age_days)
                active_weighted.append({"report": r, "weight": w})

            def calc_unweighted_stats(vals):
                sorted_v = sorted(vals)
                mid = len(sorted_v) // 2
                med = sorted_v[mid] if len(sorted_v) % 2 != 0 else (sorted_v[mid-1] + sorted_v[mid]) / 2.0
                return {"min": sorted_v[0], "max": sorted_v[-1], "median": med, "mean": sum(sorted_v)/len(sorted_v)}

            def calc_weighted_stats(items, val_fn):
                sorted_items = sorted([(val_fn(x["report"]), x["weight"]) for x in items if val_fn(x["report"]) is not None], key=lambda x: x[0])
                if not sorted_items:
                    return {"min": 0, "max": 0, "median": 0, "mean": 0}
                min_v = sorted_items[0][0]
                max_v = sorted_items[-1][0]
                sum_w = sum(w for _, w in sorted_items)
                mean_v = sum(v * w for v, w in sorted_items) / sum_w if sum_w > 0 else sum(v for v, _ in sorted_items) / len(sorted_items)
                
                cum_w = 0.0
                half_w = sum_w / 2.0
                med_v = sorted_items[len(sorted_items) // 2][0]
                for v, w in sorted_items:
                    cum_w += w
                    if cum_w >= half_w:
                        med_v = v
                        break
                return {"min": min_v, "max": max_v, "median": med_v, "mean": mean_v}

            raw_vals = [r["target_price"] for r in active]
            raw_stats = calc_unweighted_stats(raw_vals) if raw_vals else {"min": 0, "max": 0, "median": 0, "mean": 0}

            adj_stats = calc_weighted_stats(active_weighted, lambda r: r["target_price"] / (1.0 + firm_avg_bias.get(r["firm"], 15.0) / 100.0))

            # 3-Month Price Prediction (Alpha = 0.05)
            pred_stats = {
                "min": cur_p + 0.05 * (adj_stats["min"] - cur_p),
                "max": cur_p + 0.05 * (adj_stats["max"] - cur_p),
                "median": cur_p + 0.05 * (adj_stats["median"] - cur_p),
                "mean": cur_p + 0.05 * (adj_stats["mean"] - cur_p),
            }

            upside_median = ((adj_stats["median"] - cur_p) / cur_p) * 100.0 if adj_stats["median"] else 0.0
            act_cnt = len(active)
            act_firms = len(set(r["firm"] for r in active))
        else:
            raw_stats = {"min": 0, "max": 0, "median": 0, "mean": 0}
            adj_stats = {"min": 0, "max": 0, "median": 0, "mean": 0}
            pred_stats = {"min": 0, "max": 0, "median": 0, "mean": 0}
            upside_median = 0.0
            act_cnt = 0
            act_firms = 0

        summary_stocks[ticker] = {
            "name": stock["name"],
            "market": stock["market"],
            "ticker": ticker,
            "current_price": stock["current_price"],
            "reports_count": len(stock.get("analyst_reports", [])),
            "active_reports_count": act_cnt,
            "active_firms_count": act_firms,
            "raw_stats": raw_stats,
            "adj_stats": adj_stats,
            "pred_stats": pred_stats,
            "predicted_price_3m": pred_stats["mean"],
            "realistic_median_upside": upside_median
        }

    # Write summary.json
    summary_data = {
        "generated_at": gen_at,
        "stocks": summary_stocks,
        "firm_stats": firm_stats,
    }
    summary_data = sanitize_nan(summary_data)
    summary_path = OUTPUT_DIR / "summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=None, allow_nan=False)

    # Backup data.json
    output = {
        "generated_at": gen_at,
        "stocks": all_stocks,
        "firm_stats": firm_stats,
    }
    output = sanitize_nan(output)
    output_path = OUTPUT_DIR / "data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=None, allow_nan=False)

    # Update sitemap.xml lastmod date
    sitemap_path = OUTPUT_DIR / "sitemap.xml"
    if sitemap_path.exists():
        today_date = datetime.now().strftime("%Y-%m-%d")
        try:
            content = sitemap_path.read_text(encoding="utf-8")
            import re
            updated_content = re.sub(r'<lastmod>.*?</lastmod>', f'<lastmod>{today_date}</lastmod>', content)
            sitemap_path.write_text(updated_content, encoding="utf-8")
        except Exception as e:
            print(f"  ⚠️ Failed to update sitemap.xml: {e}")

    # Print summary
    total_reports = sum(len(s["analyst_reports"]) for s in all_stocks.values())
    total_firms = len(firm_stats)
    summary_size = summary_path.stat().st_size / 1024
    print(f"\n{'=' * 60}")
    print(f"  ✅ Done!")
    print(f"  📁 Summary: {summary_path} ({summary_size:.1f} KB)")
    print(f"  📁 Stocks: {stocks_dir} ({len(all_stocks)} stock detail JSON files)")
    print(f"  📊 {total_reports} analyst reports across {len(all_stocks)} stocks")
    print(f"  🏢 {total_firms} unique firms")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
