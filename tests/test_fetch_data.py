import math
import unittest
from datetime import datetime, timedelta

import fetch_data as fd


class TestFetchDataCore(unittest.TestCase):
    def test_filter_outliers_catches_digit_drop_typo_and_tsla_extreme(self):
        price_history = [
            {"date": "2026-11-02", "close": 95600.0},
            {"date": "2026-11-05", "close": 345.0},
        ]
        # Kia digit-drop typo: prior_target=190000 -> target=29000 (ratio=0.30, drop vs prior=0.15)
        kr_reports = [
            {"date": "2026-11-02", "firm": "유안타증권", "target_price": 29000.0, "prior_target": 190000.0},
            {"date": "2026-11-02", "firm": "LS증권", "target_price": 155000.0, "prior_target": 165000.0},
        ]
        cleaned_kr = fd.filter_outliers(kr_reports, price_history[:1], "000270")
        self.assertEqual(len(cleaned_kr), 1)
        self.assertEqual(cleaned_kr[0]["firm"], "LS증권")

        # TSLA extreme bear outlier ($24.86 vs $345 -> ratio=0.072 < 0.20)
        tsla_reports = [
            {"date": "2026-11-05", "firm": "GLJ Research", "target_price": 24.86, "prior_target": 24.86},
            {"date": "2026-11-05", "firm": "UBS", "target_price": 425.0, "prior_target": 391.0},
        ]
        cleaned_tsla = fd.filter_outliers(tsla_reports, price_history[1:], "TSLA")
        self.assertEqual(len(cleaned_tsla), 1)
        self.assertEqual(cleaned_tsla[0]["firm"], "UBS")

    def test_compute_firm_stats_uses_issuance_and_realized_not_current_bias(self):
        all_stocks = {
            "NVDA": {
                "analyst_reports": [
                    {
                        "firm": "Morgan Stanley",
                        "current_bias_pct": -60.0,   # stale historical target vs today
                        "issuance_bias_pct": 25.0,   # true optimism on publication day
                        "realized_bias_pct": 12.0,   # true 3M realized error
                    },
                    {
                        "firm": "Morgan Stanley",
                        "current_bias_pct": -40.0,
                        "issuance_bias_pct": 15.0,
                        "realized_bias_pct": 8.0,
                    },
                ]
            }
        }
        stats = fd.compute_firm_stats(all_stocks)
        ms = stats["Morgan Stanley"]
        self.assertAlmostEqual(ms["avg_issuance_bias_pct"], 20.0)
        self.assertAlmostEqual(ms["avg_realized_bias_pct"], 10.0)
        self.assertEqual(ms["bias_category"], "긍정적")
        self.assertAlmostEqual(ms["by_stock"]["NVDA"]["avg_bias"], 20.0)
        self.assertAlmostEqual(ms["by_stock"]["NVDA"]["avg_realized_bias"], 10.0)

    def test_compute_revision_momentum_counts_up_down_and_breadth(self):
        active = [
            {"firm": "A", "target_price": 120.0, "prior_target": 100.0},  # +20% up
            {"firm": "B", "target_price": 110.0, "prior_target": 100.0},  # +10% up
            {"firm": "C", "target_price": 90.0, "prior_target": 100.0},   # -10% down
            {"firm": "D", "target_price": 100.0, "prior_target": 100.0},  # flat hold
        ]
        mom = fd.compute_revision_momentum(active, {})
        self.assertEqual(mom["up_count"], 2)
        self.assertEqual(mom["down_count"], 1)
        self.assertEqual(mom["hold_count"], 1)
        self.assertAlmostEqual(mom["breadth"], round((2 - 1) / 3, 3))
        self.assertAlmostEqual(mom["median_change_pct"], 5.0, places=1)

    def test_compute_hybrid_v2_prediction_and_ci(self):
        cur_p = 100.0
        adj_stats = {"min": 95.0, "median": 120.0, "mean": 125.0, "max": 140.0}
        res = fd.compute_hybrid_v2_forecast(
            cur_p=cur_p,
            adj_stats=adj_stats,
            alpha_i=0.06,
            rev_breadth=0.5,
            vol_annual=0.40,
        )
        # Expected return for mean: 0.010 + 0.5*0.06*0.25 + 0.025*0.5 = 0.010 + 0.0075 + 0.0125 = 0.030 -> 103.0
        self.assertAlmostEqual(res["pred_stats"]["mean"], 103.0, places=2)
        sig_3m = 0.40 * math.sqrt(90.0 / 365.0)
        self.assertAlmostEqual(res["ci_low"], 103.0 * (1.0 - sig_3m), places=1)
        self.assertAlmostEqual(res["ci_high"], 103.0 * (1.0 + sig_3m), places=1)
        self.assertLess(res["ci_low"], res["pred_stats"]["mean"])
        self.assertGreater(res["ci_high"], res["pred_stats"]["mean"])


if __name__ == "__main__":
    unittest.main()
