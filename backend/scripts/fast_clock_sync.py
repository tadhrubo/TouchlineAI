import os
import sys
import requests
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
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def sync_fast_clock(force_gw: int = None):
    """
    Fast-Clock Sync Pipeline:
    Runs every 5 minutes during matchday windows (Saturdays & Sundays)
    to ingest live provisional BPS, goals, assists, and live gameweek points.
    """
    print("[*] Starting Touchline AI Fast-Clock Matchday Sync...")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase credentials in environment variables.")
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    headers = {"User-Agent": "TouchlineAI/1.0 (FastClockBot)"}
    
    # 1. Determine active gameweek from bootstrap-static
    fpl_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    print(f"[*] Checking active matchday event from {fpl_url}...")
    bs_res = requests.get(fpl_url, headers=headers, timeout=12)
    bs_res.raise_for_status()
    bs_data = bs_res.json()
    
    events = bs_data.get("events", [])
    current_event = force_gw
    if not current_event:
        current_obj = next((e for e in events if e.get("is_current")), None)
        if not current_obj:
            current_obj = next((e for e in events if e.get("is_next")), events[0])
        current_event = current_obj.get("id", 1)
        
    print(f"[*] Active Gameweek target: GW{current_event}")
    
    # 2. Fetch live event stats from FPL Live API
    live_url = f"https://fantasy.premierleague.com/api/event/{current_event}/live/"
    print(f"[*] Fetching live match statistics from {live_url}...")
    live_res = requests.get(live_url, headers=headers, timeout=15)
    
    if live_res.status_code == 404:
        print(f"[!] Live stats not yet opened for GW{current_event}. Exiting gracefully.")
        return
        
    live_res.raise_for_status()
    live_data = live_res.json()
    live_elements = live_data.get("elements", [])
    
    if not live_elements:
        print(f"[*] No live elements found for GW{current_event}.")
        return
        
    print(f"    -> Successfully retrieved live telemetry for {len(live_elements)} players.")
    
    # 3. Format records for Supabase live_gameweek_stats table
    live_records = []
    active_players_count = 0
    
    for item in live_elements:
        p_id = item["id"]
        stats = item.get("stats", {})
        
        minutes = stats.get("minutes", 0)
        bps = stats.get("bps", 0)
        live_pts = stats.get("total_points", 0)
        
        if minutes > 0 or live_pts != 0:
            active_players_count += 1
            
        record = {
            "player_id": p_id,
            "gw": current_event,
            "minutes": minutes,
            "goals_scored": stats.get("goals_scored", 0),
            "assists": stats.get("assists", 0),
            "clean_sheets": stats.get("clean_sheets", 0),
            "goals_conceded": stats.get("goals_conceded", 0),
            "own_goals": stats.get("own_goals", 0),
            "penalties_saved": stats.get("penalties_saved", 0),
            "penalties_missed": stats.get("penalties_missed", 0),
            "yellow_cards": stats.get("yellow_cards", 0),
            "red_cards": stats.get("red_cards", 0),
            "saves": stats.get("saves", 0),
            "bonus": stats.get("bonus", 0),
            "bps": bps,
            "live_points": live_pts,
            "in_dreamteam": stats.get("in_dreamteam", False),
        }
        live_records.append(record)
        
    print(f"[*] Prepared {len(live_records)} live player records ({active_players_count} players featured on pitch so far).")
    
    # 4. Batch upsert into Supabase live_gameweek_stats table
    chunk_size = 150
    total_chunks = (len(live_records) + chunk_size - 1) // chunk_size
    print(f"[*] Upserting live matchday telemetry to Supabase in {total_chunks} batches...")
    
    for i in range(0, len(live_records), chunk_size):
        chunk = live_records[i : i + chunk_size]
        supabase.table("live_gameweek_stats").upsert(chunk, on_conflict="player_id,gw").execute()
        chunk_num = i // chunk_size + 1
        print(f"    -> Uploaded live chunk {chunk_num}/{total_chunks} ({len(chunk)} records)")
        
    print("[+] Fast-Clock Matchday Sync completed successfully!")
    
    # Display top 5 live BPS leaders
    top_bps = sorted(live_records, key=lambda x: x["bps"], reverse=True)[:5]
    print("\n--- TOP 5 LIVE MATCHDAY BPS LEADERS ---")
    for p in top_bps:
        print(f"Player ID #{p['player_id']}: {p['live_points']} pts | {p['bps']} BPS | {p['minutes']} mins played")

if __name__ == "__main__":
    sync_fast_clock()
