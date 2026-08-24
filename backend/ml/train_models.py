import os
import sys
import json
import joblib
import requests
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, roc_auc_score
import shap
from supabase import create_client, Client

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
DATA_PATH = os.path.join(BASE_DIR, "data", "training_corpus.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
ENV_PATH = os.path.join(PROJECT_ROOT, ".env.local")

# Load environment variables
load_dotenv(ENV_PATH)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

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

FEATURE_NAME_MAP = {
    "rolling_points_3": "Recent Form (3-GW)",
    "rolling_points_5": "Medium-Term Form (5-GW)",
    "rolling_minutes_3": "Recent Minutes Played",
    "rolling_minutes_5": "Season Rotation Index",
    "rolling_ict_3": "ICT Threat & Influence",
    "rolling_threat_3": "Goal Threat Score",
    "rolling_creativity_3": "Key Passes & Creativity",
    "rolling_xg_3": "Expected Goals (xG)",
    "rolling_xa_3": "Expected Assists (xA)",
    "rolling_bps_3": "Bonus Point Baseline",
    "was_home_int": "Home Advantage",
    "value_norm": "Squad Valuation",
    "pos_code": "Positional Baseline",
}

def engineer_features(corpus: pd.DataFrame) -> pd.DataFrame:
    """Engineer rolling averages and non-leaking historical lag features."""
    print("[*] Engineering rolling lag features...")
    df = corpus.copy()
    
    # Sort chronologically by player and gameweek
    df = df.sort_values(by=["name", "season", "GW"]).reset_index(drop=True)
    
    # Map position to numeric code
    pos_map = {"GKP": 1, "GK": 1, "DEF": 2, "MID": 3, "FWD": 4}
    df["pos_code"] = df["position"].map(lambda p: pos_map.get(str(p).upper(), 3))
    
    # Value normalized (millions)
    df["value_norm"] = df["value"] / 10.0
    df["was_home_int"] = df["was_home"].astype(int)
    
    # Compute rolling lagged features per player group
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
    
    # Target variables
    df["target_start"] = (df["minutes"] >= 60).astype(int)
    df["target_points"] = df["total_points"].astype(float)
    
    return df

def train_lightgbm_models(df: pd.DataFrame):
    """Train xMins Classifier and xReturns Regressor."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Split train/validation (earlier seasons for train, 2024-25 for validation)
    train_mask = df["season"].isin(["2022-23", "2023-24"])
    test_mask = df["season"] == "2024-25"
    
    X_train = df.loc[train_mask, FEATURE_COLS]
    y_train_start = df.loc[train_mask, "target_start"]
    y_train_points = df.loc[train_mask, "target_points"]
    
    X_test = df.loc[test_mask, FEATURE_COLS]
    y_test_start = df.loc[test_mask, "target_start"]
    y_test_points = df.loc[test_mask, "target_points"]
    
    print(f"[*] Training dataset size: {len(X_train):,} samples | Validation size: {len(X_test):,} samples")
    
    # 1. Train xMins (Start Probability) Model
    print("[*] Training LightGBM xMins Classifier...")
    clf_start = LGBMClassifier(
        n_estimators=120,
        learning_rate=0.04,
        max_depth=5,
        num_leaves=24,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=-1
    )
    clf_start.fit(X_train, y_train_start)
    
    test_preds_start = clf_start.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test_start, test_preds_start)
    print(f"[+] xMins Classification ROC-AUC on 2024-25 holdout: {auc:.4f}")
    
    # 2. Train xReturns (Projected Points) Model
    print("[*] Training LightGBM xReturns Regressor...")
    reg_points = LGBMRegressor(
        n_estimators=160,
        learning_rate=0.035,
        max_depth=6,
        num_leaves=32,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=-1
    )
    reg_points.fit(X_train, y_train_points)
    
    test_preds_points = reg_points.predict(X_test)
    mae = mean_absolute_error(y_test_points, test_preds_points)
    rmse = np.sqrt(mean_squared_error(y_test_points, test_preds_points))
    print(f"[+] xReturns Regression on 2024-25 holdout -> MAE: {mae:.3f} pts | RMSE: {rmse:.3f} pts")
    
    # Save models
    joblib.dump(clf_start, os.path.join(MODELS_DIR, "lgbm_xmins.joblib"))
    joblib.dump(reg_points, os.path.join(MODELS_DIR, "lgbm_xreturns.joblib"))
    with open(os.path.join(MODELS_DIR, "features.json"), "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)
        
    print(f"[+] Saved trained model artifacts to {MODELS_DIR}")
    return clf_start, reg_points

def run_live_inference_and_export(clf_start, reg_points):
    """Fetch current FPL players, perform inference + SHAP, and upsert to Supabase."""
    print("[*] Connecting to live FPL API & Supabase database...")
    
    # Initialize Supabase client
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE credentials in environment variables.")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Fetch live bootstrap data
    fpl_res = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", timeout=15)
    fpl_res.raise_for_status()
    fpl_data = fpl_res.json()
    
    elements = fpl_data.get("elements", [])
    events = fpl_data.get("events", [])
    
    # Find next active gameweek
    next_event = next((e for e in events if e.get("is_next")), None)
    if not next_event:
        next_event = next((e for e in events if e.get("is_current")), events[0])
    target_gw = next_event.get("id", 1)
    print(f"[*] Target Gameweek for prediction: GW{target_gw}")
    
    # Initialize SHAP TreeExplainer
    print("[*] Initializing SHAP TreeExplainer for feature importance...")
    explainer = shap.TreeExplainer(reg_points)
    
    if isinstance(explainer.expected_value, (list, np.ndarray)):
        base_val = float(explainer.expected_value[0])
    else:
        base_val = float(explainer.expected_value)
        
    # Build live feature matrix for all 600+ players
    player_rows = []
    player_meta = []
    
    for el in elements:
        p_id = el["id"]
        form_val = float(el.get("form") or 0.0)
        ict_val = float(el.get("ict_index") or 0.0)
        threat_val = float(el.get("threat") or 0.0)
        creativity_val = float(el.get("creativity") or 0.0)
        total_pts = float(el.get("total_points") or 0.0)
        now_cost = float(el.get("now_cost") or 50) / 10.0
        element_type = int(el.get("element_type") or 3)
        minutes = float(el.get("minutes") or 0.0)
        
        # Approximate rolling features from season metrics
        feat_dict = {
            "rolling_points_3": form_val,
            "rolling_points_5": max(form_val, total_pts / max(target_gw - 1, 1)),
            "rolling_minutes_3": min(minutes / max(target_gw - 1, 1), 90.0),
            "rolling_minutes_5": min(minutes / max(target_gw - 1, 1), 90.0),
            "rolling_ict_3": ict_val / max(target_gw - 1, 1),
            "rolling_threat_3": threat_val / max(target_gw - 1, 1),
            "rolling_creativity_3": creativity_val / max(target_gw - 1, 1),
            "rolling_xg_3": threat_val / 100.0,
            "rolling_xa_3": creativity_val / 100.0,
            "rolling_bps_3": float(el.get("bps") or 0.0) / max(target_gw - 1, 1),
            "was_home_int": 1, # default neutral/home expectation
            "value_norm": now_cost,
            "pos_code": element_type,
        }
        
        player_rows.append(feat_dict)
        player_meta.append({
            "player_id": p_id,
            "web_name": el.get("web_name"),
            "chance_of_playing": el.get("chance_of_playing_next_round"),
            "status": el.get("status")
        })
        
    X_live = pd.DataFrame(player_rows)[FEATURE_COLS]
    
    # Model predictions
    raw_start_probs = clf_start.predict_proba(X_live)[:, 1]
    raw_projected_pts = reg_points.predict(X_live)
    
    # SHAP explanations
    shap_vals = explainer.shap_values(X_live)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]
        
    # Prepare Supabase payload
    upsert_payload = []
    
    for i, meta in enumerate(player_meta):
        p_id = meta["player_id"]
        start_prob = float(raw_start_probs[i])
        proj_pts = float(raw_projected_pts[i])
        
        # Adjust start probability based on real FPL injury flag
        chance = meta["chance_of_playing"]
        if chance is not None:
            flag_prob = float(chance) / 100.0
            start_prob = min(start_prob, flag_prob)
        elif meta["status"] in ["i", "s", "n"]:
            start_prob = 0.0
            
        # Bound points realistically
        proj_pts = max(0.2, proj_pts * (0.4 + 0.6 * start_prob))
        
        # Extract top 2 positive/impact SHAP feature drivers
        player_shaps = shap_vals[i]
        top_indices = np.argsort(np.abs(player_shaps))[::-1][:2]
        
        drivers = []
        for idx in top_indices:
            feat_key = FEATURE_COLS[idx]
            friendly_name = FEATURE_NAME_MAP.get(feat_key, feat_key)
            impact_val = float(player_shaps[idx])
            sign = "+" if impact_val >= 0 else ""
            drivers.append({
                "feature": friendly_name,
                "impact": f"{sign}{impact_val:.2f} pts"
            })
            
        shap_explanation = {
            "drivers": drivers,
            "base_value": round(base_val, 2),
            "model_version": "LightGBM-v1.0"
        }
        
        upsert_payload.append({
            "player_id": p_id,
            "gw": target_gw,
            "projected_points": round(proj_pts, 2),
            "start_probability": round(start_prob * 100.0, 1),
            "shap_explanation": shap_explanation
        })
        
    print(f"[*] Upserting {len(upsert_payload)} player predictions to Supabase table 'player_predictions'...")
    
    # Upsert in chunks of 200
    chunk_size = 200
    for chunk_start in range(0, len(upsert_payload), chunk_size):
        chunk = upsert_payload[chunk_start : chunk_start + chunk_size]
        res = supabase.table("player_predictions").upsert(chunk, on_conflict="player_id,gw").execute()
        print(f"    -> Uploaded chunk {chunk_start // chunk_size + 1} ({len(chunk)} records)")
        
    print("[+] Live Inference & Supabase Upsert completed successfully!")
    
    # Print sample top projected players
    top_players = sorted(upsert_payload, key=lambda x: x["projected_points"], reverse=True)[:5]
    print("\n--- TOP 5 PROJECTED PLAYERS FOR NEXT GW ---")
    for tp in top_players:
        meta_p = next(m for m in player_meta if m["player_id"] == tp["player_id"])
        print(f"[{meta_p['web_name']}] xP: {tp['projected_points']} pts | Start%: {tp['start_probability']}% | Drivers: {tp['shap_explanation']['drivers']}")

if __name__ == "__main__":
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training corpus not found at {DATA_PATH}. Run fetch_training_data.py first.")
        
    print(f"[*] Loading training corpus from {DATA_PATH}...")
    corpus = pd.read_csv(DATA_PATH)
    
    df_engineered = engineer_features(corpus)
    clf_start, reg_points = train_lightgbm_models(df_engineered)
    run_live_inference_and_export(clf_start, reg_points)
