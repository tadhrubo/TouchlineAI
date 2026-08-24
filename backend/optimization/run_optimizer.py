import os
import sys
import json
import argparse
import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env.local")

load_dotenv(ENV_PATH)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

from solver import FPLOptimizer

def load_fpl_manager_data(entry_id: str):
    """Fetch manager overview, current event, budget, and squad picks."""
    print(f"[*] Fetching live FPL data for Entry ID #{entry_id}...")
    headers = {"User-Agent": "TouchlineAI/1.0"}
    
    # 1. Manager overview
    overview_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/"
    ov_res = requests.get(overview_url, headers=headers, timeout=12)
    ov_res.raise_for_status()
    ov_data = ov_res.json()
    
    # 2. Bootstrap static for current event & transfers
    bs_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    bs_res = requests.get(bs_url, headers=headers, timeout=12)
    bs_res.raise_for_status()
    bs_data = bs_res.json()
    
    events = bs_data.get("events", [])
    current_event = next((e["id"] for e in events if e.get("is_current")), 1)
    
    # 3. Squad picks
    picks_url = f"https://fantasy.premierleague.com/api/entry/{entry_id}/event/{current_event}/picks/"
    picks_res = requests.get(picks_url, headers=headers, timeout=12)
    picks_res.raise_for_status()
    picks_data = picks_res.json()
    
    squad_ids = [p["element"] for p in picks_data.get("picks", [])]
    entry_history = picks_data.get("entry_history", {})
    
    # Bank in £ millions (e.g. 20 -> 2.0m)
    bank_tenths = entry_history.get("bank", 0)
    bank_m = bank_tenths / 10.0
    
    # Free transfers
    ft_count = entry_history.get("event_transfers_cost", 0) # estimate from history
    # Default 1 free transfer if not explicitly given
    free_transfers = 1
    
    return {
        "entry_id": entry_id,
        "manager_name": f"{ov_data.get('player_first_name', '')} {ov_data.get('player_last_name', '')}".strip(),
        "team_name": ov_data.get("name", "My Team"),
        "gameweek": current_event,
        "squad_ids": squad_ids,
        "bank": bank_m,
        "free_transfers": free_transfers,
    }

def fetch_player_predictions_from_supabase() -> pd.DataFrame:
    """Fetch players joined with latest predictions and teams from Supabase."""
    print("[*] Querying player predictions from Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Query players
    p_res = supabase.table("players").select("id, web_name, element_type, now_cost, team_id").execute()
    players_df = pd.DataFrame(p_res.data)
    
    # Query teams
    t_res = supabase.table("teams").select("id, short_name").execute()
    teams_df = pd.DataFrame(t_res.data).rename(columns={"id": "team_id", "short_name": "team_short"})
    
    # Query predictions
    pred_res = supabase.table("player_predictions").select("player_id, gw, projected_points, start_probability, shap_explanation").execute()
    preds_df = pd.DataFrame(pred_res.data).rename(columns={"player_id": "id"})
    
    # Merge
    merged = players_df.merge(teams_df, on="team_id", how="left")
    if not preds_df.empty:
        merged = merged.merge(preds_df, on="id", how="left")
    else:
        merged["projected_points"] = 2.0
        merged["start_probability"] = 75.0
        merged["shap_explanation"] = {}
        
    merged["projected_points"] = merged["projected_points"].fillna(0.5)
    merged["start_probability"] = merged["start_probability"].fillna(50.0)
    
    return merged

def run_optimization(entry_id: str = "1482998", max_transfers: int = 1):
    """Run full optimization pipeline and return structured JSON."""
    manager_info = load_fpl_manager_data(entry_id)
    player_df = fetch_player_predictions_from_supabase()
    
    squad_ids = manager_info["squad_ids"]
    bank = manager_info["bank"]
    ft = manager_info["free_transfers"]
    
    optimizer = FPLOptimizer(
        player_df=player_df,
        current_squad_ids=squad_ids,
        bank=bank,
        free_transfers=ft,
        transfer_cost=4.0
    )
    
    # 1. Optimize Starting XI (No transfers)
    starting_xi_result = optimizer.optimize_starting_xi()
    
    # 2. Optimize 1-Transfer Move
    one_transfer_result = optimizer.optimize_transfers(max_transfers=1)
    
    # 3. Optimize 2-Transfer Move
    two_transfer_result = optimizer.optimize_transfers(max_transfers=2)
    
    output = {
        "manager": manager_info,
        "baseline_starting_xi": starting_xi_result,
        "best_1_transfer": one_transfer_result,
        "best_2_transfers": two_transfer_result
    }
    
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Touchline AI ILP Squad Optimizer")
    parser.add_argument("--entry_id", type=str, default="1482998", help="FPL Entry ID")
    parser.add_argument("--max_transfers", type=int, default=1, help="Max transfers to solve")
    parser.add_argument("--json", action="store_true", help="Output raw JSON only")
    args = parser.parse_args()
    
    res = run_optimization(entry_id=args.entry_id, max_transfers=args.max_transfers)
    
    if args.json:
        print(json.dumps(res, indent=2))
    else:
        mgr = res["manager"]
        print(f"\n=======================================================")
        print(f" TOUCHLINE AI ILP OPTIMIZATION REPORT: {mgr['team_name']} (#{mgr['entry_id']})")
        print(f" Manager: {mgr['manager_name']} | Bank: £{mgr['bank']}m | FT: {mgr['free_transfers']}")
        print(f"=======================================================")
        
        xi = res["baseline_starting_xi"]
        print(f"\n[1] OPTIMAL STARTING XI (Formation: {xi['formation']})")
        print(f"    Total Starting Projected xP: {xi['total_starting_xp']} pts (Raw XI: {xi['raw_xi_xp']} + Cap Bonus: {xi['captain_bonus']})")
        print(f"    Captain (C): {xi['captain']['web_name']} ({xi['captain']['team_short']}) - {xi['captain']['projected_points']} xP")
        print(f"    Vice (VC)  : {xi['vice_captain']['web_name']} ({xi['vice_captain']['team_short']}) - {xi['vice_captain']['projected_points']} xP")
        
        print("\n    Starting 11:")
        for p in xi["starters"]:
            cap_mark = " (C)" if p["is_captain"] else " (VC)" if p["is_vice_captain"] else ""
            print(f"      • {p['web_name']:<14} ({p['team_short']}) - £{p['cost']}m | {p['projected_points']} xP | Start%: {p['start_probability']}%{cap_mark}")
            
        print("\n    Bench Priority:")
        for p in xi["bench"]:
            slot = "Sub GK" if p["element_type"] == 1 else f"Bench #{p['bench_order']}"
            print(f"      [{slot}] {p['web_name']:<14} ({p['team_short']}) - {p['projected_points']} xP")
            
        t1 = res["best_1_transfer"]
        print(f"\n[2] BEST 1-TRANSFER RECOMMENDATION (Net Gain: {t1['net_gain']:+0.2f} xP)")
        if t1["transfers_out"] and t1["transfers_in"]:
            p_out = t1["transfers_out"][0]
            p_in = t1["transfers_in"][0]
            print(f"    OUT: {p_out['web_name']} ({p_out['team_short']}) £{p_out['cost']}m [{p_out['projected_points']} xP]")
            print(f"    IN : {p_in['web_name']} ({p_in['team_short']}) £{p_in['cost']}m [{p_in['projected_points']} xP]")
            print(f"    Remaining Bank: £{t1['remaining_bank']}m | New Starting xP: {t1['new_net_xp']} pts")
            if p_in.get("shap_explanation", {}).get("drivers"):
                print(f"    SHAP Drivers for {p_in['web_name']}: {p_in['shap_explanation']['drivers']}")
        else:
            print("    Hold transfer. Current squad is already optimal for 1 transfer.")
            
        t2 = res["best_2_transfers"]
        print(f"\n[3] BEST 2-TRANSFER RECOMMENDATION (Net Gain: {t2['net_gain']:+0.2f} xP)")
        for p_out, p_in in zip(t2["transfers_out"], t2["transfers_in"]):
            print(f"    OUT: {p_out['web_name']} ({p_out['team_short']}) -> IN: {p_in['web_name']} ({p_in['team_short']})")
        print(f"    Hit Penalty: -{t2['penalty_points']} pts | Net Team xP: {t2['new_net_xp']} pts | Remaining Bank: £{t2['remaining_bank']}m")
        print(f"=======================================================\n")
