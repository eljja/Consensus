"""
Stock Consensus Bias Analysis — Data Fetcher & Analyzer
=========================================================
Collects analyst consensus data (target prices, grades) for 20 representative
US and Korean stocks, merges with actual price history, computes forecasting
bias metrics, and exports everything to frontend/data.json.

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

# US stocks (10)
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
}

# Korean stocks (10) — code : name
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
}

# How many years of Naver Finance research pages to scan
NAVER_SCAN_YEARS = 3

# Rate‑limiting delays (seconds)
NAVER_LIST_DELAY = 0.4
NAVER_DETAIL_DELAY = 0.4
HANKYUNG_DELAY = 0.3

# Bias thresholds
BIAS_OVERLY_OPTIMISTIC = 30   # > 30 %
BIAS_OPTIMISTIC = 15          # 15‑30 %
BIAS_CONSERVATIVE = -15       # < ‑15 %

OUTPUT_DIR = Path(__file__).resolve().parent / "frontend"

# Hankyung API auth token (public, embedded in their JS bundles)
HANKYUNG_TOKEN = "Bearer 0ZdNlr7LrQoawewqweq78k6usasBsqhqSIaUarSTf8mxnHuQVh9CvKAfpUy94LhBmZMg"

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
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return None


def naver_request(url: str) -> str:
    """Fetch a Naver Finance page, decode as cp949."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("cp949", errors="ignore")

# ---------------------------------------------------------------------------
# 1. Fetch actual price histories
# ---------------------------------------------------------------------------

def fetch_price_history(ticker: str, period: str = "5y") -> list[dict]:
    """Return list of {date, close} dicts."""
    print(f"  📈 Fetching price history for {ticker}...")
    t = yf.Ticker(ticker)
    hist = t.history(period=period)
    if hist.empty:
        print(f"    ⚠️  No price data for {ticker}")
        return []
    records = []
    for dt, row in hist.iterrows():
        records.append({
            "date": dt.strftime("%Y-%m-%d"),
            "close": round(float(row["Close"]), 2),
        })
    return records


def get_price_on_date(price_history: list[dict], target_date: str) -> float | None:
    """Find the closing price on or just before target_date."""
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

def fetch_us_analyst_targets(ticker: str) -> list[dict]:
    """Return list of analyst report dicts from yfinance upgrades_downgrades."""
    print(f"  🔍 Fetching US analyst targets for {ticker}...")
    t = yf.Ticker(ticker)
    try:
        ud = t.upgrades_downgrades
    except Exception:
        ud = None
    if ud is None or ud.empty:
        print(f"    ⚠️  No analyst data for {ticker}")
        return []

    reports = []
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
    print(f"    ✅ {len(reports)} reports found")
    return reports

# ---------------------------------------------------------------------------
# 3. Fetch KR analyst targets — Naver Finance scraping
# ---------------------------------------------------------------------------

def fetch_naver_kr_targets(kr_stock_names: dict[str, str]) -> dict[str, list[dict]]:
    """
    Scan Naver Finance research list pages, filter by target stock names,
    and fetch detail pages for target price / opinion.
    Returns {stock_code: [report_dicts]}.
    """
    print("\n📰 Scanning Naver Finance research reports...")
    # Invert name→code mapping
    name_to_code = {v: k for k, v in kr_stock_names.items()}
    results: dict[str, list[dict]] = {code: [] for code in kr_stock_names}

    cutoff_date = datetime.now() - timedelta(days=365 * NAVER_SCAN_YEARS)
    page = 1
    consecutive_old = 0
    total_scanned = 0
    matched_nids: set[str] = set()

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
        page_has_target = False
        all_old = True

        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 6:
                continue

            stock_name = cols[0].get_text(strip=True)
            date_text = cols[4].get_text(strip=True)

            # Parse date (format: YY.MM.DD)
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
            title = title_a.get_text(strip=True)
            link = title_a.get("href", "")
            nid_match = re.search(r"nid=(\d+)", link)
            nid = nid_match.group(1) if nid_match else None
            if not nid or nid in matched_nids:
                continue
            matched_nids.add(nid)

            broker = cols[2].get_text(strip=True)
            page_has_target = True
            total_scanned += 1

            results[code].append({
                "nid": nid,
                "date": report_date.strftime("%Y-%m-%d"),
                "firm": broker,
                "title": title,
                "stock_name": stock_name,
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

    # Fetch detail pages for target prices
    detail_count = 0
    for code, reports in results.items():
        for report in reports:
            nid = report.pop("nid", None)
            if not nid:
                continue
            detail_url = f"https://finance.naver.com/research/company_read.naver?nid={nid}"
            try:
                html = naver_request(detail_url)
                soup = BeautifulSoup(html, "html.parser")
                view_info = soup.find("div", class_="view_info_1")
                if view_info:
                    money_el = view_info.find("em", class_="money")
                    opinion_el = view_info.find("em", class_="coment")
                    report["target_price"] = safe_float(
                        money_el.get_text(strip=True) if money_el else None
                    )
                    report["grade"] = opinion_el.get_text(strip=True) if opinion_el else ""
                else:
                    report["target_price"] = None
                    report["grade"] = ""
            except Exception:
                report["target_price"] = None
                report["grade"] = ""

            report["analyst"] = ""
            report["prior_target"] = None
            report["action"] = ""
            report["source"] = "naver"
            report.pop("stock_name", None)
            report.pop("title", None)

            detail_count += 1
            if detail_count % 50 == 0:
                print(f"  📋 Fetched {detail_count} detail pages...")
            time.sleep(NAVER_DETAIL_DELAY)

    print(f"  ✅ Detail pages done: {detail_count} fetched")
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
    while True:
        params = urllib.parse.urlencode({"page": page, "businessCode": stock_code})
        url = f"{base}?{params}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception:
            break

        raw = data.get("data", [])
        items = list(raw.values()) if isinstance(raw, dict) else raw
        if not items:
            break

        for item in items:
            tp = safe_float(item.get("TARGET_STOCK_PRICES"))
            if tp is None or tp == 0:
                continue
            all_reports.append({
                "date": item.get("REPORT_DATE", ""),
                "firm": item.get("OFFICE_NAME", ""),
                "analyst": item.get("REPORT_WRITER", ""),
                "target_price": tp,
                "prior_target": safe_float(item.get("OLD_TARGET_STOCK_PRICES")),
                "grade": item.get("GRADE_VALUE", ""),
                "action": "",
                "source": "hankyung",
            })

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
    # Prefer Hankyung (has analyst name), then Naver
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
    """Add realized_bias_pct and current_bias_pct to each report in‑place."""
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

        # Realized bias: target vs actual price 12 months later
        try:
            report_date = datetime.strptime(r["date"], "%Y-%m-%d")
            future_date = report_date + timedelta(days=365)
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

        # Classify using current_bias_pct (fallback to realized)
        bias_val = r["current_bias_pct"] if r["current_bias_pct"] is not None else r["realized_bias_pct"]
        r["bias_category"] = classify_bias(bias_val)

# ---------------------------------------------------------------------------
# 7. Aggregate firm statistics
# ---------------------------------------------------------------------------

def compute_firm_stats(all_stocks: dict) -> dict:
    """Aggregate per‑firm statistics across all stocks."""
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

    # Summarize
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
    print("  Stock Consensus Bias Analysis — Data Fetcher")
    print("=" * 60)

    all_stocks: dict[str, dict] = {}

    # ── US Stocks ──────────────────────────────────────────────
    print("\n🇺🇸 Processing US Stocks...")
    for ticker, name in US_STOCKS.items():
        print(f"\n── {ticker} ({name}) ──")
        price_hist = fetch_price_history(ticker, period="5y")
        reports = fetch_us_analyst_targets(ticker)
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

    # ── KR Stocks ──────────────────────────────────────────────
    print("\n🇰🇷 Processing Korean Stocks...")

    # 3a. Fetch KR price histories
    for code, name in KR_STOCKS.items():
        yf_ticker = f"{code}.KS"
        print(f"\n── {code} ({name}) ──")
        price_hist = fetch_price_history(yf_ticker, period="5y")
        current_price = price_hist[-1]["close"] if price_hist else 0
        all_stocks[code] = {
            "name": name,
            "market": "KR",
            "ticker": code,
            "current_price": current_price,
            "price_history": price_hist,
            "analyst_reports": [],  # filled below
        }

    # 3b. Naver Finance scraping (bulk)
    naver_reports = fetch_naver_kr_targets(KR_STOCKS)

    # 3c. Hankyung API (per stock)
    print("\n📊 Fetching Hankyung Consensus data (supplementary)...")
    for code, name in KR_STOCKS.items():
        print(f"  🔍 Hankyung: {code} ({name})...")
        hk_reports = fetch_hankyung_kr_targets(code)
        print(f"    ✅ {len(hk_reports)} reports")

        # Merge with Naver
        nv = naver_reports.get(code, [])
        merged = merge_kr_reports(nv, hk_reports)

        # Filter out reports without target price
        merged = [r for r in merged if r.get("target_price") and r["target_price"] > 0]

        current_price = all_stocks[code]["current_price"]
        price_hist = all_stocks[code]["price_history"]
        compute_bias(merged, price_hist, current_price)
        all_stocks[code]["analyst_reports"] = merged
        print(f"    📊 Total merged: {len(merged)} reports")
        time.sleep(HANKYUNG_DELAY)

    # ── Firm stats ─────────────────────────────────────────────
    print("\n📊 Computing firm statistics...")
    firm_stats = compute_firm_stats(all_stocks)

    # ── Export ─────────────────────────────────────────────────
    print("\n💾 Exporting to data.json...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "stocks": all_stocks,
        "firm_stats": firm_stats,
    }
    output_path = OUTPUT_DIR / "data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=None)

    # Print summary
    total_reports = sum(len(s["analyst_reports"]) for s in all_stocks.values())
    total_firms = len(firm_stats)
    file_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\n{'=' * 60}")
    print(f"  ✅ Done!")
    print(f"  📁 Output: {output_path}")
    print(f"  📊 {total_reports} analyst reports across {len(all_stocks)} stocks")
    print(f"  🏢 {total_firms} unique firms")
    print(f"  💾 File size: {file_size:.1f} MB")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
