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

FPL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def sync_fast_clock(force_gw: int = None):
    """
    Fast-Clock Sync Pipeline:
    Runs every 5 minutes during matchday windows (Saturdays & Sundays)
    to ingest live provisional BPS, goals, assists, and live gameweek points.
    """
    print("[*] Starting Touchline AI Fast-Clock Matchday Sync...")
    
    if not SUPABASE_URL:
        raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in environment variables.")
    if not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.")
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Determine active gameweek from bootstrap-static
    fpl_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    print(f"[*] Checking active matchday event from {fpl_url}...")
    
    try:
        bs_res = requests.get(fpl_url, headers=FPL_HEADERS, timeout=15)
        print(f"[*] FPL Bootstrap Response Status: {bs_res.status_code}")
        bs_res.raise_for_status()
    except requests.exceptions.RequestException as e:
        status_code = getattr(getattr(e, "response", None), "status_code", "UNKNOWN")
        print(f"[!] FPL Bootstrap Request Failed! HTTP Status: {status_code} - Error: {e}")
        raise
        
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
    
    try:
        live_res = requests.get(live_url, headers=FPL_HEADERS, timeout=15)
        print(f"[*] FPL Live Match Stats Response Status: {live_res.status_code}")
        
        if live_res.status_code == 404:
            print(f"[!] Live stats not yet opened for GW{current_event}. Exiting gracefully.")
            return
            
        live_res.raise_for_status()
    except requests.exceptions.RequestException as e:
        status_code = getattr(getattr(e, "response", None), "status_code", "UNKNOWN")
        print(f"[!] FPL Live Stats Request Failed! HTTP Status: {status_code} - Error: {e}")
        raise
        
    live_data = live_res.json()
    elements = live_data.get("elements", [])
    print(f"    -> Retrieved telemetry for {len(elements)} player entities.")
    
    # 3. Extract and format live performance metrics
    live_records = []
    active_players_count = 0
    
    for el in elements:
        p_id = el["id"]
        stats = el.get("stats", {})
        
        mins = stats.get("minutes", 0)
        goals = stats.get("goals_scored", 0)
        assists = stats.get("assists", 0)
        cs = stats.get("clean_sheets", 0)
        gc = stats.get("goals_conceded", 0)
        og = stats.get("own_goals", 0)
        ps = stats.get("penalties_saved", 0)
        pm = stats.get("penalties_missed", 0)
        yc = stats.get("yellow_cards", 0)
        rc = stats.get("red_cards", 0)
        saves = stats.get("saves", 0)
        bonus = stats.get("bonus", 0)
        bps = stats.get("bps", 0)
        total_pts = stats.get("total_points", 0)
        in_dt = stats.get("in_dreamteam", False)
        
        if mins > 0 or total_pts != 0:
            active_players_count += 1
            
        record = {
            "player_id": p_id,
            "gw": current_event,
            "minutes": mins,
            "goals_scored": goals,
            "assists": assists,
            "clean_sheets": cs,
            "goals_conceded": gc,
            "own_goals": og,
            "penalties_saved": ps,
            "penalties_missed": pm,
            "yellow_cards": yc,
            "red_cards": rc,
            "saves": saves,
            "bonus": bonus,
            "bps": bps,
            "live_points": total_pts,
            "in_dreamteam": in_dt,
        }
        live_records.append(record)
        
    print(f"[*] Prepared {len(live_records)} live records ({active_players_count} players featured/active so far).")
    
    # 4. Upsert into live_gameweek_stats in Supabase
    chunk_size = 150
    total_chunks = (len(live_records) + chunk_size - 1) // chunk_size
    print(f"[*] Upserting live stats to Supabase in {total_chunks} batches...")
    
    for i in range(0, len(live_records), chunk_size):
        chunk = live_records[i : i + chunk_size]
        supabase.table("live_gameweek_stats").upsert(
            chunk, on_conflict="player_id,gw"
        ).execute()
        chunk_num = i // chunk_size + 1
        print(f"    -> Uploaded chunk {chunk_num}/{total_chunks} ({len(chunk)} records)")
        
    print(f"[+] Fast-Clock Live Matchday Sync for GW{current_event} completed successfully!")

if __name__ == "__main__":
    sync_fast_clock()
