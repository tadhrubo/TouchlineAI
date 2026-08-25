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

STATUS_MAP = {
    "a": "available",
    "d": "doubtful",
    "i": "injured",
    "s": "suspended",
    "u": "unavailable",
    "n": "unavailable",
}

FPL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

def sync_slow_clock():
    """
    Slow-Clock Sync Pipeline:
    Runs every 4 hours to sync current player prices, ownership %, and injury flags.
    """
    print("[*] Starting Touchline AI Slow-Clock Sync...")
    
    # Task 3: Check Supabase credentials
    if not SUPABASE_URL:
        raise ValueError(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in environment variables. "
            "Please ensure NEXT_PUBLIC_SUPABASE_URL is configured in GitHub Secrets / .env.local."
        )
    if not SUPABASE_KEY:
        raise ValueError(
            "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables. "
            "Please ensure SUPABASE_SERVICE_ROLE_KEY is configured in GitHub Secrets / .env.local."
        )
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Fetch live bootstrap-static from FPL API with User-Agent bypass
    fpl_url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    print(f"[*] Fetching live FPL bootstrap static data from {fpl_url}...")
    
    try:
        res = requests.get(fpl_url, headers=FPL_HEADERS, timeout=20)
        print(f"[*] FPL API Response Status: {res.status_code}")
        res.raise_for_status()
    except requests.exceptions.RequestException as e:
        status_code = getattr(getattr(e, "response", None), "status_code", "UNKNOWN")
        print(f"[!] FPL API Request Failed! HTTP Status: {status_code} - Error: {e}")
        if getattr(e, "response", None) is not None:
            print(f"[!] Response Preview: {e.response.text[:300]}")
        raise
        
    data = res.json()
    elements = data.get("elements", [])
    print(f"    -> Successfully retrieved {len(elements)} players from FPL API.")
    
    # 2. Extract and format player price, ownership, and health records
    player_updates = []
    flagged_count = 0
    
    for el in elements:
        p_id = el["id"]
        web_name = el.get("web_name", "")
        first_name = el.get("first_name", "")
        second_name = el.get("second_name", "")
        team_id = el.get("team")
        element_type = el.get("element_type", 3)
        now_cost = el.get("now_cost", 50)
        selected_by = str(el.get("selected_by_percent", "0.0"))
        total_pts = el.get("total_points", 0)
        raw_status = el.get("status", "a")
        mapped_status = STATUS_MAP.get(raw_status, "available")
        news_text = el.get("news", "") or ""
        chance_playing = el.get("chance_of_playing_next_round")
        
        if news_text or mapped_status != "available":
            flagged_count += 1
            
        record = {
            "id": p_id,
            "web_name": web_name,
            "first_name": first_name,
            "second_name": second_name,
            "team_id": team_id,
            "element_type": element_type,
            "now_cost": now_cost,
            "selected_by_percent": selected_by,
            "total_points": total_pts,
            "status": mapped_status,
            "news": news_text,
            "chance_of_playing": chance_playing,
        }
        player_updates.append(record)
        
    print(f"[*] Prepared {len(player_updates)} player records ({flagged_count} currently flagged/injured).")
    
    # 3. Batch upsert into Supabase players table
    chunk_size = 150
    total_chunks = (len(player_updates) + chunk_size - 1) // chunk_size
    print(f"[*] Upserting records to Supabase 'players' table in {total_chunks} batches...")
    
    for i in range(0, len(player_updates), chunk_size):
        chunk = player_updates[i : i + chunk_size]
        supabase.table("players").upsert(chunk, on_conflict="id").execute()
        chunk_num = i // chunk_size + 1
        print(f"    -> Uploaded chunk {chunk_num}/{total_chunks} ({len(chunk)} records)")
        
    print("[+] Slow-Clock Sync completed successfully!")

if __name__ == "__main__":
    sync_slow_clock()
