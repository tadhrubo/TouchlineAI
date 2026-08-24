import os
import sys
import requests
import pandas as pd
import numpy as np

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SEASONS = ["2022-23", "2023-24", "2024-25"]
BASE_URL = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/{season}/gws/merged_gw.csv"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def fetch_season_data(season: str) -> pd.DataFrame:
    """Download and clean single season merged gameweek data."""
    url = BASE_URL.format(season=season)
    print(f"[*] Fetching historical GW data for season {season} from {url}...")
    try:
        try:
            df = pd.read_csv(url, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(url, encoding="latin-1")
            
        df["season"] = season
        print(f"    -> Successfully loaded {len(df):,} rows for {season}")
        return df
    except Exception as e:
        print(f"[!] Error fetching {season}: {e}")
        return pd.DataFrame()

def build_training_corpus() -> pd.DataFrame:
    """Fetch all seasons and assemble unified ML training corpus."""
    os.makedirs(DATA_DIR, exist_ok=True)
    all_dfs = []
    
    for season in SEASONS:
        df_season = fetch_season_data(season)
        if not df_season.empty:
            all_dfs.append(df_season)
            
    if not all_dfs:
        raise RuntimeError("No historical data could be retrieved.")
        
    corpus = pd.concat(all_dfs, ignore_index=True)
    print(f"[*] Total raw corpus rows assembled: {len(corpus):,}")
    
    # Standardize column naming and key types
    if "GW" not in corpus.columns and "round" in corpus.columns:
        corpus["GW"] = corpus["round"]
        
    # Fill missing expected metrics for earlier seasons if null
    expected_cols = ["expected_goals", "expected_assists", "expected_goal_involvements", "expected_goals_conceded"]
    for col in expected_cols:
        if col in corpus.columns:
            corpus[col] = pd.to_numeric(corpus[col], errors="coerce").fillna(0.0)
        else:
            corpus[col] = 0.0
            
    # Clean numeric metrics
    numeric_cols = [
        "total_points", "minutes", "goals_scored", "assists", "clean_sheets",
        "goals_conceded", "bps", "bonus", "ict_index", "influence", "creativity",
        "threat", "value", "transfers_balance", "selected"
    ]
    for col in numeric_cols:
        if col in corpus.columns:
            corpus[col] = pd.to_numeric(corpus[col], errors="coerce").fillna(0.0)
            
    if "was_home" in corpus.columns:
        corpus["was_home"] = corpus["was_home"].astype(bool)
        
    # Sort chronologically by player and gameweek
    corpus = corpus.sort_values(by=["name", "season", "GW"]).reset_index(drop=True)
    
    # Save to disk as CSV for rapid ML iteration
    csv_path = os.path.join(DATA_DIR, "training_corpus.csv")
    corpus.to_csv(csv_path, index=False)
    print(f"[+] Saved corpus CSV to {csv_path} ({os.path.getsize(csv_path) / (1024*1024):.2f} MB)")
    
    return corpus

if __name__ == "__main__":
    df = build_training_corpus()
    print(f"[+] Historical Ingestion complete. Total records: {len(df):,}")
