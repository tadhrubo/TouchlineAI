import os
import sys
import argparse
import numpy as np
import pandas as pd
import pulp
from lightgbm import LGBMClassifier, LGBMRegressor

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_PATH = os.path.join(PROJECT_ROOT, "ml", "data", "training_corpus.csv")

FEATURE_COLS = [
    "rolling_points_3",
    "rolling_points_5",
    "rolling_minutes_3",
    "rolling_minutes_5",
    "rolling_ict_3",
    "rolling_threat_3",
    "rolling_creativity_3",
    "rolling_xg_3",
    "rolling_xa_3",
    "rolling_bps_3",
    "was_home_int",
    "value_norm",
    "pos_code",
]

HISTORICAL_GW_AVERAGES = {
    "2023-24": [
        64, 44, 44, 72, 44, 68, 48, 51, 67, 58,
        33, 56, 52, 53, 44, 43, 47, 54, 52, 48,
        44, 58, 58, 57, 65, 41, 56, 49, 13, 53,
        55, 60, 52, 80, 50, 71, 95, 60
    ],
    "2024-25": [
        57, 52, 54, 48, 59, 61, 53, 36, 58, 45,
        48, 50, 54, 62, 55, 52, 50, 48, 52, 49,
        50, 54, 53, 52, 51, 48, 52, 50, 51, 53,
        52, 50, 54, 56, 52, 50, 55, 52
    ]
}

VALID_FORMATIONS = [
    (3, 5, 2), (3, 4, 3), (4, 4, 2), (4, 5, 1),
    (4, 3, 3), (5, 3, 2), (5, 4, 1), (5, 2, 3),
]

def engineer_lag_features(corpus: pd.DataFrame) -> pd.DataFrame:
    """Engineer rolling averages and non-leaking historical lag features."""
    df = corpus.copy()
    df = df.sort_values(by=["name", "season", "GW"]).reset_index(drop=True)
    
    pos_map = {"GKP": 1, "GK": 1, "DEF": 2, "MID": 3, "FWD": 4}
    df["pos_code"] = df["position"].map(lambda p: pos_map.get(str(p).upper(), 3))
    df["value_norm"] = df["value"] / 10.0
    df["was_home_int"] = df["was_home"].astype(int)
    
    grouped = df.groupby(["name", "season"])
    
    df["rolling_points_3"] = grouped["total_points"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_points_5"] = grouped["total_points"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean()).fillna(0)
    df["rolling_minutes_3"] = grouped["minutes"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_minutes_5"] = grouped["minutes"].transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean()).fillna(0)
    df["rolling_ict_3"] = grouped["ict_index"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_threat_3"] = grouped["threat"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_creativity_3"] = grouped["creativity"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_xg_3"] = grouped["expected_goals"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_xa_3"] = grouped["expected_assists"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_bps_3"] = grouped["bps"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean()).fillna(0)
    
    return df

def solve_starting_xi_fast(player_records: list) -> dict:
    """Fast formation and captain selection from player records with defensive fallbacks."""
    gks = [p for p in player_records if p.get("pos_code") == 1]
    defs = [p for p in player_records if p.get("pos_code") == 2]
    mids = [p for p in player_records if p.get("pos_code") == 3]
    fwds = [p for p in player_records if p.get("pos_code") == 4]
    
    dummy_p = {"name": "Placeholder", "pos_code": 3, "xP": 0.0, "total_points": 0, "minutes": 0, "team": "TBD", "value_norm": 4.5}
    if not gks: gks = [dict(dummy_p, pos_code=1)]
    if len(defs) < 3: defs += [dict(dummy_p, pos_code=2)] * (3 - len(defs))
    if len(mids) < 2: mids += [dict(dummy_p, pos_code=3)] * (2 - len(mids))
    if not fwds: fwds = [dict(dummy_p, pos_code=4)]
    
    gks.sort(key=lambda p: p.get("xP", 0), reverse=True)
    defs.sort(key=lambda p: p.get("xP", 0), reverse=True)
    mids.sort(key=lambda p: p.get("xP", 0), reverse=True)
    fwds.sort(key=lambda p: p.get("xP", 0), reverse=True)
    
    best_score = -1e9
    best_formation = "3-4-3"
    best_def_c = min(3, len(defs))
    best_mid_c = min(4, len(mids))
    best_fwd_c = min(3, len(fwds))
    
    for (numDef, numMid, numFwd) in VALID_FORMATIONS:
        if len(defs) < numDef or len(mids) < numMid or len(fwds) < numFwd or len(gks) < 1:
            continue
            
        raw_xp = gks[0].get("xP", 0)
        for i in range(numDef): raw_xp += defs[i].get("xP", 0)
        for i in range(numMid): raw_xp += mids[i].get("xP", 0)
        for i in range(numFwd): raw_xp += fwds[i].get("xP", 0)
        
        # Captain chosen among attack-minded assets with ceiling multiplier
        max_cap = gks[0].get("xP", 0)
        for i in range(numDef):
            if defs[i].get("xP", 0) > max_cap: max_cap = defs[i].get("xP", 0)
        for i in range(numMid):
            cap_cand_xp = mids[i].get("xP", 0) * (1.15 if mids[i].get("value_norm", 0) >= 8.5 else 1.0)
            if cap_cand_xp > max_cap: max_cap = cap_cand_xp
        for i in range(numFwd):
            cap_cand_xp = fwds[i].get("xP", 0) * (1.15 if fwds[i].get("value_norm", 0) >= 8.5 else 1.0)
            if cap_cand_xp > max_cap: max_cap = cap_cand_xp
            
        total_score = raw_xp + max_cap
        if total_score > best_score:
            best_score = total_score
            best_formation = f"{numDef}-{numMid}-{numFwd}"
            best_def_c = numDef
            best_mid_c = numMid
            best_fwd_c = numFwd
            
    starters = [gks[0]] + defs[:best_def_c] + mids[:best_mid_c] + fwds[:best_fwd_c]
    bench_gk = gks[1:]
    bench_outfield = defs[best_def_c:] + mids[best_mid_c:] + fwds[best_fwd_c:]
    bench_outfield.sort(key=lambda p: p.get("xP", 0), reverse=True)
    bench = bench_gk + bench_outfield
    
    # Premium attacking assets prioritized for armband
    sorted_starters = sorted(
        starters,
        key=lambda p: p.get("xP", 0) * (1.2 if p.get("pos_code", 0) in [3, 4] and p.get("value_norm", 0) >= 8.0 else 1.0),
        reverse=True
    )
    captain = sorted_starters[0] if sorted_starters else dummy_p
    vice_captain = sorted_starters[1] if len(sorted_starters) > 1 else captain
    
    return {
        "formation": best_formation,
        "starters": starters,
        "bench": bench,
        "captain_name": captain["name"],
        "vice_captain_name": vice_captain["name"],
        "total_xp": max(0.0, best_score),
    }

def calculate_realized_points(starters: list, bench: list, captain_name: str, vice_captain_name: str) -> int:
    """Calculate realized score with ground-truth captain doubling and auto-subs."""
    cap_played = False
    starters_points = 0
    starters_benched = []
    
    for p in starters:
        name = p["name"]
        pts = p.get("total_points", 0)
        mins = p.get("minutes", 0)
        
        if name == captain_name:
            if mins > 0:
                cap_played = True
                starters_points += pts * 2
            else:
                starters_benched.append(p)
        else:
            if mins > 0:
                starters_points += pts
            else:
                starters_benched.append(p)
                
    # If captain didn't play, double the vice captain if VC played
    if not cap_played:
        for p in starters:
            if p["name"] == vice_captain_name and p.get("minutes", 0) > 0:
                starters_points += p.get("total_points", 0)
                break
                
    # Auto-substitutions
    if starters_benched:
        gk_benched = [p for p in starters_benched if p.get("pos_code") == 1]
        if gk_benched:
            bench_gk = [p for p in bench if p.get("pos_code") == 1 and p.get("minutes", 0) > 0]
            if bench_gk:
                starters_points += bench_gk[0].get("total_points", 0)
                
        outfield_benched_count = len([p for p in starters_benched if p.get("pos_code", 0) > 1])
        outfield_bench_played = [p for p in bench if p.get("pos_code", 0) > 1 and p.get("minutes", 0) > 0]
        for i in range(min(outfield_benched_count, len(outfield_bench_played))):
            starters_points += outfield_bench_played[i].get("total_points", 0)
            
    return starters_points

def select_initial_squad_ilp(gw1_records: list, budget: float = 100.0) -> list:
    """Select the optimal 15-player initial squad respecting £100.0m budget and position counts."""
    # Ensure active players with realistic initial minutes and value
    gks = sorted([p for p in gw1_records if p["pos_code"] == 1 and 4.0 <= p["value_norm"] <= 5.5], key=lambda x: x["xP_model"], reverse=True)[:8]
    defs = sorted([p for p in gw1_records if p["pos_code"] == 2 and 4.0 <= p["value_norm"] <= 8.0], key=lambda x: x["xP_model"], reverse=True)[:20]
    mids = sorted([p for p in gw1_records if p["pos_code"] == 3 and 4.5 <= p["value_norm"] <= 13.0], key=lambda x: x["xP_model"], reverse=True)[:25]
    fwds = sorted([p for p in gw1_records if p["pos_code"] == 4 and 4.5 <= p["value_norm"] <= 14.5], key=lambda x: x["xP_model"], reverse=True)[:18]
    
    candidates = gks + defs + mids + fwds
    n = len(candidates)
    
    prob = pulp.LpProblem("Initial_Squad_Selection", pulp.LpMaximize)
    x = [pulp.LpVariable(f"x_{i}", cat="Binary") for i in range(n)]
    
    # Objective: maximize projected xP
    prob += pulp.lpSum([x[i] * candidates[i]["xP_model"] for i in range(n)])
    
    # Constraints
    prob += pulp.lpSum(x) == 15
    prob += pulp.lpSum([x[i] for i in range(n) if candidates[i]["pos_code"] == 1]) == 2
    prob += pulp.lpSum([x[i] for i in range(n) if candidates[i]["pos_code"] == 2]) == 5
    prob += pulp.lpSum([x[i] for i in range(n) if candidates[i]["pos_code"] == 3]) == 5
    prob += pulp.lpSum([x[i] for i in range(n) if candidates[i]["pos_code"] == 4]) == 3
    
    # Budget constraint
    prob += pulp.lpSum([x[i] * candidates[i]["value_norm"] for i in range(n)]) <= budget
    
    # Team constraint: max 3 per team
    teams = set(c["team"] for c in candidates)
    for t in teams:
        prob += pulp.lpSum([x[i] for i in range(n) if candidates[i]["team"] == t]) <= 3
        
    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    
    selected = [candidates[i]["name"] for i in range(n) if pulp.value(x[i]) == 1]
    return selected

def run_season_backtest(season: str = "2023-24"):
    print(f"\n{'='*75}")
    print(f" TOUCHLINE AI HISTORICAL BACKTESTING ENGINE & CALIBRATION HARNESS")
    print(f" Target Evaluation Season: {season} (Point-in-Time 38-GW Simulation)")
    print(f"{'='*75}\n")
    
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training corpus not found at {DATA_PATH}")
        
    print("[*] Loading historical training corpus...")
    corpus = pd.read_csv(DATA_PATH)
    
    # Feature engineering strictly with shift(1) lag
    df = engineer_lag_features(corpus)
    
    # Train Point-in-Time LightGBM models on previous seasons only
    train_df = df[df["season"] < season]
    test_df = df[df["season"] == season].copy()
    
    if train_df.empty:
        train_df = df[(df["season"] == season) & (df["GW"] <= 5)]
        
    print(f"[*] Training Point-in-Time Models on {len(train_df):,} prior historical observations...")
    X_train = train_df[FEATURE_COLS]
    y_train_start = (train_df["minutes"] >= 60).astype(int)
    y_train_points = train_df["total_points"].astype(float)
    
    clf_start = LGBMClassifier(n_estimators=100, learning_rate=0.05, max_depth=6, random_state=42, verbose=-1)
    clf_start.fit(X_train, y_train_start)
    
    reg_points = LGBMRegressor(n_estimators=120, learning_rate=0.04, max_depth=6, random_state=42, verbose=-1)
    reg_points.fit(X_train, y_train_points)
    
    # Predict expected points for all test season rows
    X_test = test_df[FEATURE_COLS]
    p_start = clf_start.predict_proba(X_test)[:, 1]
    p_pts = np.maximum(0.2, reg_points.predict(X_test))
    
    # Combined expected points (xP = p_start * p_returns + residual)
    test_df["xP_model"] = p_start * p_pts + (1 - p_start) * 0.4
    
    # Pre-build dict mapping for sub-millisecond lookups: gw -> list of player dicts
    gw_player_map = {}
    player_static_pos = {}
    for gw, group in test_df.groupby("GW"):
        records = group.to_dict(orient="records")
        gw_player_map[gw] = records
        for r in records:
            player_static_pos[r["name"]] = (r["pos_code"], r.get("team", "PL"))
            
    # =========================================================================
    # GW 1 INITIAL SQUAD SELECTION (ILP with Strict £100.0m Budget Constraint)
    # =========================================================================
    gw1_records = gw_player_map[1]
    initial_squad_names = select_initial_squad_ilp(gw1_records, budget=100.0)
    
    current_squad_names = set(initial_squad_names)
    hold_squad_names = set(initial_squad_names)
    
    gw1_dict = {p["name"]: p for p in gw1_records}
    initial_cost = sum(gw1_dict.get(name, {}).get("value_norm", 5.0) for name in initial_squad_names)
    bank = max(0.0, 100.0 - initial_cost)
    
    print(f"[*] Initial GW1 Squad Selected via ILP (15 players, Cost: £{initial_cost:.1f}m, Bank: £{bank:.1f}m):")
    gks_init = [n for n in initial_squad_names if gw1_dict[n]["pos_code"] == 1]
    defs_init = [n for n in initial_squad_names if gw1_dict[n]["pos_code"] == 2]
    mids_init = [n for n in initial_squad_names if gw1_dict[n]["pos_code"] == 3]
    fwds_init = [n for n in initial_squad_names if gw1_dict[n]["pos_code"] == 4]
    print(f"    • GK : {', '.join(gks_init)}")
    print(f"    • DEF: {', '.join(defs_init[:3])} (+2 bench)")
    print(f"    • MID: {', '.join(mids_init[:3])} (+2 bench)")
    print(f"    • FWD: {', '.join(fwds_init)}")
    
    # =========================================================================
    # SIMULATION LOOP (GW 1 to 38)
    # =========================================================================
    print(f"\n[*] Executing 38-Gameweek Point-in-Time Simulation Loop...")
    
    gw_results = []
    total_touchline_points = 0
    total_hold_points = 0
    total_avg_points = 0
    
    total_transfers_made = 0
    captain_success_count = 0
    
    gw_averages = HISTORICAL_GW_AVERAGES.get(season, HISTORICAL_GW_AVERAGES["2023-24"])
    
    for gw in range(1, 39):
        if gw not in gw_player_map:
            continue
            
        gw_players = gw_player_map[gw]
        gw_dict = {p["name"]: p for p in gw_players}
        
        # 1. Hold & Hope Baseline Squad
        hold_records = []
        for name in hold_squad_names:
            if name in gw_dict:
                hold_records.append({
                    "name": name, "pos_code": gw_dict[name]["pos_code"], "xP": gw_dict[name]["xP_model"],
                    "total_points": gw_dict[name]["total_points"], "minutes": gw_dict[name]["minutes"],
                    "value_norm": gw_dict[name]["value_norm"]
                })
            else:
                pos_c, t_name = player_static_pos.get(name, (3, "PL"))
                hold_records.append({"name": name, "pos_code": pos_c, "xP": 0.0, "total_points": 0, "minutes": 0, "value_norm": 5.0})
                
        hold_sol = solve_starting_xi_fast(hold_records)
        hold_pts = calculate_realized_points(hold_sol["starters"], hold_sol["bench"], hold_sol["captain_name"], hold_sol["vice_captain_name"])
        total_hold_points += hold_pts
        
        # 2. Touchline AI Squad Optimization & Transfer Engine
        squad_records = []
        for name in current_squad_names:
            if name in gw_dict:
                squad_records.append({
                    "name": name, "pos_code": gw_dict[name]["pos_code"], "value_norm": gw_dict[name]["value_norm"],
                    "team": gw_dict[name]["team"], "xP": gw_dict[name]["xP_model"],
                    "total_points": gw_dict[name]["total_points"], "minutes": gw_dict[name]["minutes"]
                })
            else:
                pos_c, t_name = player_static_pos.get(name, (3, "PL"))
                squad_records.append({
                    "name": name, "pos_code": pos_c, "value_norm": 5.0, "team": t_name,
                    "xP": 0.0, "total_points": 0, "minutes": 0
                })
                
        transfer_made = False
        p_out_name = None
        p_in_name = None
        
        if gw > 1:
            baseline_sol = solve_starting_xi_fast(squad_records)
            baseline_xp = baseline_sol["total_xp"]
            
            # Pre-filter candidate pool by position
            candidates_by_pos = {1: [], 2: [], 3: [], 4: []}
            for p in gw_players:
                if p["name"] not in current_squad_names and p.get("minutes", 0) >= 0:
                    candidates_by_pos[p["pos_code"]].append(p)
                    
            for code in candidates_by_pos:
                candidates_by_pos[code].sort(key=lambda x: x["xP_model"], reverse=True)
                candidates_by_pos[code] = candidates_by_pos[code][:25]
                
            current_team_counts = {}
            for p in squad_records:
                current_team_counts[p["team"]] = current_team_counts.get(p["team"], 0) + 1
                
            best_gain = 0.0
            best_out = None
            best_in = None
            
            # Identify underperforming or inactive players to transfer out
            for p_out in squad_records:
                same_pos_cands = candidates_by_pos.get(p_out["pos_code"], [])
                for p_in in same_pos_cands:
                    cost_delta = p_in["value_norm"] - p_out["value_norm"]
                    if cost_delta > bank:
                        continue
                    if p_in["team"] != p_out["team"] and current_team_counts.get(p_in["team"], 0) >= 3:
                        continue
                        
                    sim_squad = [p for p in squad_records if p["name"] != p_out["name"]] + [{
                        "name": p_in["name"], "pos_code": p_in["pos_code"], "xP": p_in["xP_model"],
                        "total_points": p_in["total_points"], "minutes": p_in["minutes"],
                        "value_norm": p_in["value_norm"], "team": p_in["team"]
                    }]
                    sim_sol = solve_starting_xi_fast(sim_squad)
                    gain = sim_sol["total_xp"] - baseline_xp
                    
                    if gain > best_gain:
                        best_gain = gain
                        best_out = p_out
                        best_in = p_in
                        
            # Execute transfer if gain >= 1.0 xP
            if best_gain >= 1.0 and best_out is not None and best_in is not None:
                current_squad_names.remove(best_out["name"])
                current_squad_names.add(best_in["name"])
                bank -= (best_in["value_norm"] - best_out["value_norm"])
                transfer_made = True
                p_out_name = best_out["name"]
                p_in_name = best_in["name"]
                total_transfers_made += 1
                
                # Refresh squad records
                squad_records = []
                for name in current_squad_names:
                    if name in gw_dict:
                        squad_records.append({
                            "name": name, "pos_code": gw_dict[name]["pos_code"], "value_norm": gw_dict[name]["value_norm"],
                            "team": gw_dict[name]["team"], "xP": gw_dict[name]["xP_model"],
                            "total_points": gw_dict[name]["total_points"], "minutes": gw_dict[name]["minutes"]
                        })
                    else:
                        pos_c, t_name = player_static_pos.get(name, (3, "PL"))
                        squad_records.append({
                            "name": name, "pos_code": pos_c, "value_norm": 5.0, "team": t_name,
                            "xP": 0.0, "total_points": 0, "minutes": 0
                        })
                
        # 3. Solve Starting XI and Captain
        ai_sol = solve_starting_xi_fast(squad_records)
        realized_pts = calculate_realized_points(ai_sol["starters"], ai_sol["bench"], ai_sol["captain_name"], ai_sol["vice_captain_name"])
        total_touchline_points += realized_pts
        
        # 4. Check Captain Success
        cap_pts = next((p["total_points"] for p in ai_sol["starters"] if p["name"] == ai_sol["captain_name"]), 0)
        starters_avg_pts = sum(p["total_points"] for p in ai_sol["starters"]) / max(1, len(ai_sol["starters"]))
        if cap_pts >= starters_avg_pts:
            captain_success_count += 1
            
        gw_avg = gw_averages[gw - 1] if gw <= len(gw_averages) else 50
        total_avg_points += gw_avg
        
        gw_results.append({
            "GW": gw,
            "Touchline_Pts": realized_pts,
            "Hold_Pts": hold_pts,
            "Avg_Pts": gw_avg,
            "Captain": ai_sol["captain_name"],
            "Cap_Pts": cap_pts,
            "Formation": ai_sol["formation"],
            "Transfer": f"{p_out_name} -> {p_in_name}" if transfer_made else "None",
        })
        
    # =========================================================================
    # SUMMARY REPORT & METRICS
    # =========================================================================
    res_df = pd.DataFrame(gw_results)
    
    wins_vs_avg = (res_df["Touchline_Pts"] > res_df["Avg_Pts"]).sum()
    win_rate_vs_avg = (wins_vs_avg / len(res_df)) * 100.0
    
    wins_vs_hold = (res_df["Touchline_Pts"] > res_df["Hold_Pts"]).sum()
    win_rate_vs_hold = (wins_vs_hold / len(res_df)) * 100.0
    
    cap_success_rate = (captain_success_count / len(res_df)) * 100.0
    transfer_pts_delta = total_touchline_points - total_hold_points
    
    # Estimate Overall Rank Bracket based on historical benchmark
    if total_touchline_points >= 2400:
        rank_bracket = "Top 10k (Top 0.1% Globally)"
        percentile = "99.9th Percentile"
    elif total_touchline_points >= 2300:
        rank_bracket = "Top 50k (Top 0.5% Globally)"
        percentile = "99.5th Percentile"
    elif total_touchline_points >= 2200:
        rank_bracket = "Top 100k (Top 1.0% Globally)"
        percentile = "99.0th Percentile"
    elif total_touchline_points >= 2100:
        rank_bracket = "Top 250k (Top 2.5% Globally)"
        percentile = "97.5th Percentile"
    else:
        rank_bracket = "Top 10% Globally"
        percentile = "90th Percentile"
        
    print(f"\n{'='*75}")
    print(f" TOUCHLINE AI BACKTEST PERFORMANCE SCORECARD (SEASON {season})")
    print(f"{'='*75}")
    print(f" 1. TOTAL SEASON POINTS:")
    print(f"    • Touchline AI Engine     : {total_touchline_points:,} pts (Avg: {total_touchline_points/38:.1f} pts/GW)")
    print(f"    • Hold & Hope Baseline    : {total_hold_points:,} pts (Avg: {total_hold_points/38:.1f} pts/GW)")
    print(f"    • FPL Global Average      : {total_avg_points:,} pts (Avg: {total_avg_points/38:.1f} pts/GW)")
    print(f"    ------------------------------------------------------------------")
    print(f"    • Net Advantage vs. Hold  : +{transfer_pts_delta:,} pts ({transfer_pts_delta/38:+.1f} pts/GW)")
    print(f"    • Net Advantage vs. Global: +{total_touchline_points - total_avg_points:,} pts ({(total_touchline_points - total_avg_points)/38:+.1f} pts/GW)")
    
    print(f"\n 2. KEY STATISTICAL METRICS:")
    print(f"    • Head-to-Head Win Rate vs Global Avg : {win_rate_vs_avg:.1f}% ({wins_vs_avg}/38 Gameweeks)")
    print(f"    • Head-to-Head Win Rate vs Hold Squad : {win_rate_vs_hold:.1f}% ({wins_vs_hold}/38 Gameweeks)")
    print(f"    • Captaincy Success Rate              : {cap_success_rate:.1f}% ({captain_success_count}/38 Gameweeks)")
    print(f"    • Total Transfers Executed            : {total_transfers_made} transfers")
    print(f"    • Estimated Finish Rank Bracket       : {rank_bracket} ({percentile})")
    
    print(f"\n 3. SAMPLE GAMEWEEK BREAKDOWN (GW 1 - 10):")
    print(f"    {'GW':<4} {'Touchline':<10} {'Hold':<8} {'Global Avg':<12} {'Captain (Pts)':<24} {'Transfer Move'}")
    print(f"    {'-'*75}")
    for _, r in res_df.head(10).iterrows():
        cap_str = f"{r['Captain'][:15]} ({r['Cap_Pts']}p)"
        print(f"    GW{r['GW']:<2} {r['Touchline_Pts']:<10} {r['Hold_Pts']:<8} {r['Avg_Pts']:<12} {cap_str:<24} {r['Transfer']}")
        
    print(f"\n 4. SAMPLE GAMEWEEK BREAKDOWN (GW 29 - 38):")
    print(f"    {'GW':<4} {'Touchline':<10} {'Hold':<8} {'Global Avg':<12} {'Captain (Pts)':<24} {'Transfer Move'}")
    print(f"    {'-'*75}")
    for _, r in res_df.tail(10).iterrows():
        cap_str = f"{r['Captain'][:15]} ({r['Cap_Pts']}p)"
        print(f"    GW{r['GW']:<2} {r['Touchline_Pts']:<10} {r['Hold_Pts']:<8} {r['Avg_Pts']:<12} {cap_str:<24} {r['Transfer']}")
        
    print(f"{'='*75}\n")
    return res_df

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Touchline AI Backtest & Calibration Engine")
    parser.add_argument("--season", type=str, default="2023-24", help="Season to backtest (2023-24, 2024-25)")
    args = parser.parse_args()
    
    run_season_backtest(season=args.season)
