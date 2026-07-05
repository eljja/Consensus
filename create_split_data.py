import json
from pathlib import Path
from datetime import datetime

print("Splitting data.json into summary.json and stocks/*.json...")

data_path = Path("d:/Code/Consensus/data.json")
if not data_path.exists():
    print("❌ data.json not found!")
    exit(1)

data = json.load(open(data_path, encoding='utf-8'))

output_dir = Path("d:/Code/Consensus")
stocks_dir = output_dir / "stocks"
stocks_dir.mkdir(parents=True, exist_ok=True)

def calc_stock_summary(stock):
    current_price = stock.get("current_price", 0)
    reports = stock.get("analyst_reports", [])
    valid = [r for r in reports if r.get("target_price") and r["target_price"] > 0]
    
    if not valid or not current_price:
        return {
            "raw_stats": {"min": 0, "max": 0, "median": 0, "mean": 0},
            "adj_stats": {"min": 0, "max": 0, "median": 0, "mean": 0},
            "realistic_median_upside": 0.0,
            "active_reports_count": 0,
            "active_firms_count": 0
        }
        
    price_hist = {p["date"]: p["close"] for p in stock.get("price_history", [])}
    sorted_dates = sorted(price_hist.keys())
    max_hist_date = sorted_dates[-1] if sorted_dates else ""
    
    def get_price(dt_str):
        if dt_str in price_hist:
            return price_hist[dt_str]
        past = [d for d in sorted_dates if d <= dt_str]
        return price_hist[past[-1]] if past else None
        
    # Firm 1y realized bias for this stock
    firm_biases = {}
    for r in valid:
        firm = r.get("firm")
        if not firm or not r.get("date"): continue
        try:
            dt = datetime.strptime(r["date"], "%Y-%m-%d")
            dt1y = dt.replace(year=dt.year + 1).strftime("%Y-%m-%d")
            if dt1y <= max_hist_date:
                p1y = get_price(dt1y)
                if p1y and p1y > 0:
                    b = (r["target_price"] - p1y) / p1y * 100.0
                    if -70.0 <= b <= 200.0:
                        if firm not in firm_biases: firm_biases[firm] = []
                        firm_biases[firm].append(b)
        except:
            pass
            
    firm_avg_bias = {f: max(-30.0, min(50.0, sum(l)/len(l))) for f, l in firm_biases.items()}
    
    # Active 90-day reports (most recent 1 per firm)
    max_date = max(r["date"] for r in valid)
    recent = [r for r in valid if (datetime.strptime(max_date, "%Y-%m-%d") - datetime.strptime(r["date"], "%Y-%m-%d")).days <= 90]
    firm_map = {}
    for r in sorted(recent, key=lambda x: x["date"]):
        firm_map[r["firm"]] = r
    active = list(firm_map.values())
    
    def calc_stats(vals):
        sorted_v = sorted(vals)
        mid = len(sorted_v) // 2
        med = sorted_v[mid] if len(sorted_v) % 2 != 0 else (sorted_v[mid-1] + sorted_v[mid]) / 2.0
        return {
            "min": sorted_v[0],
            "max": sorted_v[-1],
            "median": med,
            "mean": sum(sorted_v) / len(sorted_v)
        }
        
    raw_vals = [r["target_price"] for r in active]
    raw_stats = calc_stats(raw_vals)
    
    adj_vals = [r["target_price"] / (1.0 + firm_avg_bias.get(r["firm"], 15.0) / 100.0) for r in active]
    adj_stats = calc_stats(adj_vals)
    
    upside_median = ((adj_stats["median"] - current_price) / current_price) * 100.0
    
    return {
        "raw_stats": raw_stats,
        "adj_stats": adj_stats,
        "realistic_median_upside": upside_median,
        "active_reports_count": len(active),
        "active_firms_count": len(set(r["firm"] for r in active))
    }

summary_stocks = {}

for ticker, stock in data["stocks"].items():
    # 1. Calculate stock summary for summary.json
    s_info = calc_stock_summary(stock)
    summary_stocks[ticker] = {
        "name": stock["name"],
        "market": stock["market"],
        "ticker": ticker,
        "current_price": stock["current_price"],
        "reports_count": len(stock.get("analyst_reports", [])),
        "active_reports_count": s_info["active_reports_count"],
        "active_firms_count": s_info["active_firms_count"],
        "raw_stats": s_info["raw_stats"],
        "adj_stats": s_info["adj_stats"],
        "realistic_median_upside": s_info["realistic_median_upside"]
    }
    
    # 2. Write individual stock detail JSON to stocks/{ticker}.json
    stock_detail = {
        "ticker": ticker,
        "name": stock["name"],
        "market": stock["market"],
        "current_price": stock["current_price"],
        "price_history": stock.get("price_history", []),
        "analyst_reports": stock.get("analyst_reports", [])
    }
    stock_file = stocks_dir / f"{ticker}.json"
    with open(stock_file, "w", encoding="utf-8") as f:
        json.dump(stock_detail, f, ensure_ascii=False, indent=None)

# Write summary.json
summary_path = output_dir / "summary.json"
summary_data = {
    "generated_at": data.get("generated_at", datetime.now().isoformat()),
    "stocks": summary_stocks,
    "firm_stats": data.get("firm_stats", {})
}

with open(summary_path, "w", encoding="utf-8") as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=None)

summary_size = summary_path.stat().st_size / 1024
print(f"Created summary.json ({summary_size:.1f} KB)")
print(f"Created {len(summary_stocks)} individual stock files in stocks/")
