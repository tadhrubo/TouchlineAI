import os
import sys
import json
import math
import joblib
import requests
import numpy as np
import pandas as pd
from pathlib import Path
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.metrics import roc_auc_score, mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
from dotenv import load_dotenv

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env.local")
load_dotenv(".env.local")
load_dotenv(".env")

DATA_PATH = BASE_DIR / "data" / "training_corpus.csv"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

FPL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

POS_MAP = {"GKP": 1, "GK": 1, "DEF": 2, "MID": 3, "FWD": 4}
GOAL_PTS = {1: 6.0, 2: 6.0, 3: 5.0, 4: 4.0}
CS_PTS = {1: 4.0, 2: 4.0, 3: 1.0, 4: 0.0}

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
    "next_was_home",
    "opp_xga_rolling_5",
    "value_norm",
    "pos_code",
]


def prepare_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Engineers leak-free rolling features and next-fixture opponent context."""
    # Ensure standard column naming
    if "GW" in df.columns and "round" not in df.columns:
        df["round"] = df["GW"]
    elif "round" not in df.columns:
        df["round"] = 1

    df = df.sort_values(["season", "name", "round"]).reset_index(drop=True)

    # Numeric coercion for core stats
    num_cols = [
        "total_points", "minutes", "ict_index", "threat", "creativity",
        "expected_goals", "expected_assists", "expected_goals_conceded",
        "bps", "value", "goals_scored", "assists", "bonus", "saves",
        "goals_conceded", "yellow_cards", "red_cards"
    ]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)
        else:
            df[c] = 0.0

    # Map position code (1=GKP, 2=DEF, 3=MID, 4=FWD)
    if "element_type" in df.columns:
        df["pos_code"] = pd.to_numeric(df["element_type"], errors="coerce").fillna(3).astype(int)
    elif "position" in df.columns:
        df["pos_code"] = df["position"].map(POS_MAP).fillna(3).astype(int)
    else:
        df["pos_code"] = 3

    df["was_home_int"] = df["was_home"].astype(str).str.lower().isin(["true", "1", "t"]).astype(int)
    df["value_norm"] = df["value"].apply(lambda v: v / 10.0 if v > 25 else v).clip(3.5, 16.0)

    # Compute Team Defensive Weakness (Opponent rolling xGA)
    if "team" in df.columns and "opponent_team" in df.columns:
        team_gw = (
            df.groupby(["season", "team", "round"])["goals_conceded"]
            .max()
            .reset_index()
            .sort_values(["season", "team", "round"])
        )
        team_gw["team_xga_5"] = (
            team_gw.groupby(["season", "team"])["goals_conceded"]
            .transform(lambda s: s.rolling(5, min_periods=1).mean())
            .fillna(1.35)
        )
    else:
        df["opp_xga_rolling_5"] = 1.35

    grouped = df.groupby(["name", "season"])

    # Rolling Player Features (up to current GW t)
    df["rolling_points_3"] = grouped["total_points"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_points_5"] = grouped["total_points"].transform(lambda s: s.rolling(5, min_periods=1).mean()).fillna(0)
    df["rolling_minutes_3"] = grouped["minutes"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_minutes_5"] = grouped["minutes"].transform(lambda s: s.rolling(5, min_periods=1).mean()).fillna(0)
    df["rolling_ict_3"] = grouped["ict_index"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_threat_3"] = grouped["threat"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_creativity_3"] = grouped["creativity"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_xg_3"] = grouped["expected_goals"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_xa_3"] = grouped["expected_assists"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)
    df["rolling_bps_3"] = grouped["bps"].transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0)

    # Next-Fixture Context (t + 1) -> Fixes temporal alignment bug
    df["next_was_home"] = grouped["was_home_int"].shift(-1).fillna(0).astype(int)
    df["opp_xga_rolling_5"] = grouped["expected_goals_conceded"].transform(
        lambda s: s.rolling(5, min_periods=1).mean()
    ).fillna(1.35)

    # Next-Fixture Targets (t + 1)
    df["target_minutes"] = grouped["minutes"].shift(-1)
    df["target_play"] = (df["target_minutes"] > 0).astype(int)
    df["target_start"] = (df["target_minutes"] >= 60).astype(int)
    df["target_points"] = grouped["total_points"].shift(-1)
    df["target_xg"] = grouped["expected_goals"].shift(-1).fillna(0.0)
    df["target_xa"] = grouped["expected_assists"].shift(-1).fillna(0.0)
    df["target_goals"] = grouped["goals_scored"].shift(-1).fillna(0.0)
    df["target_assists"] = grouped["assists"].shift(-1).fillna(0.0)
    df["target_bonus_saves"] = (
        grouped["bonus"].shift(-1).fillna(0.0)
        + (grouped["saves"].shift(-1).fillna(0.0) // 3)
    )

    # Drop final GW rows per player-season where t+1 doesn't exist
    df = df.dropna(subset=["target_minutes", "target_points"]).reset_index(drop=True)
    return df


def train_decomposed_models(df: pd.DataFrame):
    """Trains component-level models on their true conditional distributions."""
    train_mask = df["season"].isin(["2022-23", "2023-24"])
    test_mask = df["season"] == "2024-25"

    if train_mask.sum() == 0 or test_mask.sum() == 0:
        # Fallback chronological split if seasons differ
        split_idx = int(len(df) * 0.75)
        train_mask = df.index < split_idx
        test_mask = df.index >= split_idx

    X_train = df.loc[train_mask, FEATURE_COLS]
    X_test = df.loc[test_mask, FEATURE_COLS]

    # 1. Start Probability Classifier P(mins >= 60)
    clf_start = LGBMClassifier(
        n_estimators=180, learning_rate=0.035, max_depth=5, num_leaves=24,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=-1
    )
    clf_start.fit(X_train, df.loc[train_mask, "target_start"])

    # 2. Sub/Active Probability Classifier P(mins > 0)
    clf_play = LGBMClassifier(
        n_estimators=150, learning_rate=0.035, max_depth=5, num_leaves=24,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=-1
    )
    clf_play.fit(X_train, df.loc[train_mask, "target_play"])

    # 3. Active-Only Attacking Goal Rate Model (Fixes Zero-Inflation Crush!)
    active_train = train_mask & (df["target_minutes"] > 0)
    # Blend actual goals + expected_goals as smoothed target to reduce variance
    y_goal_rate = 0.55 * df.loc[active_train, "target_xg"] + 0.45 * df.loc[active_train, "target_goals"]
    reg_xg = LGBMRegressor(
        objective="tweedie", tweedie_variance_power=1.2,
        n_estimators=200, learning_rate=0.03, max_depth=5, num_leaves=24,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=-1
    )
    reg_xg.fit(df.loc[active_train, FEATURE_COLS], y_goal_rate.clip(lower=0.001))

    # 4. Active-Only Attacking Assist Rate Model
    y_assist_rate = 0.55 * df.loc[active_train, "target_xa"] + 0.45 * df.loc[active_train, "target_assists"]
    reg_xa = LGBMRegressor(
        objective="tweedie", tweedie_variance_power=1.2,
        n_estimators=200, learning_rate=0.03, max_depth=5, num_leaves=24,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=-1
    )
    reg_xa.fit(df.loc[active_train, FEATURE_COLS], y_assist_rate.clip(lower=0.001))

    # 5. Active-Only Bonus & Saves Regressor
    starter_train = train_mask & (df["target_minutes"] >= 60)
    reg_bonus = LGBMRegressor(
        objective="regression", n_estimators=140, learning_rate=0.03,
        max_depth=4, num_leaves=16, random_state=42, verbosity=-1
    )
    reg_bonus.fit(df.loc[starter_train, FEATURE_COLS], df.loc[starter_train, "target_bonus_saves"])

    # Evaluate on Holdout Season
    p_start_val = clf_start.predict_proba(X_test)[:, 1]
    p_play_val = np.maximum(p_start_val, clf_play.predict_proba(X_test)[:, 1])
    p_sub_val = np.clip(p_play_val - p_start_val, 0.0, 1.0)

    pred_xg = np.clip(reg_xg.predict(X_test), 0.0, 2.5)
    pred_xa = np.clip(reg_xa.predict(X_test), 0.0, 2.0)
    pred_bonus = np.clip(reg_bonus.predict(X_test), 0.0, 3.0)

    pos_arr = X_test["pos_code"].values
    goal_mult = np.vectorize(lambda p: GOAL_PTS.get(p, 4.0))(pos_arr)
    cs_mult = np.vectorize(lambda p: CS_PTS.get(p, 0.0))(pos_arr)

    opp_lambda = X_test["opp_xga_rolling_5"].values.clip(0.6, 2.6)
    p_cs = np.exp(-opp_lambda)
    gc_drag = np.where(pos_arr <= 2, -0.42 * opp_lambda, 0.0)

    # Expected Points = Appearance + Attacking + Clean Sheet + Bonus/Saves + GC Drag
    e_pts_if_start = (
        2.0
        + pred_xg * goal_mult
        + pred_xa * 3.0
        + p_cs * cs_mult
        + pred_bonus
        + gc_drag
    )
    e_pts_if_sub = 1.0 + 0.28 * (pred_xg * goal_mult + pred_xa * 3.0)
    holdout_xp = p_start_val * e_pts_if_start + p_sub_val * e_pts_if_sub

    y_true_pts = df.loc[test_mask, "target_points"].values
    auc = roc_auc_score(df.loc[test_mask, "target_start"], p_start_val)
    mae = mean_absolute_error(y_true_pts, holdout_xp)
    rmse = math.sqrt(mean_squared_error(y_true_pts, holdout_xp))
    rho, _ = spearmanr(y_true_pts, holdout_xp)

    print(f"\n[SOTA Holdout Metrics] Start ROC-AUC: {auc:.4f} | MAE: {mae:.4f} | RMSE: {rmse:.4f} | Spearman: {rho:.4f}")

    # Save Models
    joblib.dump(clf_start, MODELS_DIR / "lgbm_xmins.joblib")
    joblib.dump(clf_play, MODELS_DIR / "lgbm_xplay.joblib")
    joblib.dump(reg_xg, MODELS_DIR / "lgbm_xg.joblib")
    joblib.dump(reg_xa, MODELS_DIR / "lgbm_xa.joblib")
    joblib.dump(reg_bonus, MODELS_DIR / "lgbm_bonus.joblib")
    with open(MODELS_DIR / "features.json", "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)

    return clf_start, clf_play, reg_xg, reg_xa, reg_bonus


def run_live_sota_inference(models):
    """Fetches live FPL bootstrap + fixtures, runs Poisson + Monte Carlo simulation."""
    clf_start, clf_play, reg_xg, reg_xa, reg_bonus = models

    boot_res = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/", headers=FPL_HEADERS, timeout=20)
    boot_res.raise_for_status()
    boot = boot_res.json()

    events = boot.get("events", [])
    next_event = next((e for e in events if e.get("is_next")), None)
    curr_event = next((e for e in events if e.get("is_current")), None)
    target_gw = next_event["id"] if next_event else (curr_event["id"] if curr_event else 1)
    elapsed_gws = max(1, target_gw - 1)

    # Map Team Strength Ratings for Exact Poisson Opponent xG
    teams = boot.get("teams", [])
    team_map = {}
    for t in teams:
        so_h = t.get("strength_overall_home") or 3
        so_a = t.get("strength_overall_away") or 3
        default_h = 850 + so_h * 100
        default_a = 850 + so_a * 100
        raw_att_h = float(t.get("strength_attack_home") or 0)
        raw_att_a = float(t.get("strength_attack_away") or 0)
        raw_def_h = float(t.get("strength_defence_home") or 0)
        raw_def_a = float(t.get("strength_defence_away") or 0)

        team_map[t["id"]] = {
            "name": t["short_name"],
            "att_h": (raw_att_h if raw_att_h > 500 else default_h) / 1150.0,
            "att_a": (raw_att_a if raw_att_a > 500 else default_a) / 1150.0,
            "def_h": (raw_def_h if raw_def_h > 500 else default_h) / 1150.0,
            "def_a": (raw_def_a if raw_def_a > 500 else default_a) / 1150.0,
        }

    # Fetch Upcoming Gameweek Fixtures (Supports Double & Blank Gameweeks!)
    fix_res = requests.get(f"https://fantasy.premierleague.com/api/fixtures/?event={target_gw}", headers=FPL_HEADERS, timeout=20)
    fixtures = fix_res.json() if fix_res.ok else []

    team_fixtures = {t_id: [] for t_id in team_map}
    for fx in fixtures:
        th, ta = fx.get("team_h"), fx.get("team_a")
        if th in team_map and ta in team_map:
            # Expected goals scored by opponent against home team (th)
            lambda_opp_for_home = 1.15 * team_map[ta]["att_a"] / max(0.75, team_map[th]["def_h"])
            # Expected goals scored by opponent against away team (ta)
            lambda_opp_for_away = 1.38 * team_map[th]["att_h"] / max(0.75, team_map[ta]["def_a"])
            # Opponent defensive weakness (higher = easier to score against opponent)
            opp_weakness_for_home = 1.35 * (team_map[th]["att_h"] / max(0.75, team_map[ta]["def_a"]))
            opp_weakness_for_away = 1.15 * (team_map[ta]["att_a"] / max(0.75, team_map[th]["def_h"]))

            team_fixtures[th].append({
                "was_home": 1,
                "opp_team": team_map[ta]["name"],
                "lambda_opp": np.clip(lambda_opp_for_home, 0.55, 2.85),
                "opp_weakness": np.clip(opp_weakness_for_home, 0.65, 2.10),
            })
            team_fixtures[ta].append({
                "was_home": 0,
                "opp_team": team_map[th]["name"],
                "lambda_opp": np.clip(lambda_opp_for_away, 0.55, 2.85),
                "opp_weakness": np.clip(opp_weakness_for_away, 0.65, 2.10),
            })

    elements = boot.get("elements", [])
    predictions = []
    rng = np.random.default_rng(42)

    for el in elements:
        p_id = int(el["id"])
        team_id = int(el["team"])
        pos_code = int(el.get("element_type", 3))
        now_cost = float(el.get("now_cost", 50)) / 10.0
        status = el.get("status", "a")
        chance = el.get("chance_of_playing_next_round")

        minutes = float(el.get("minutes", 0))
        nineties = max(minutes / 90.0, 0.8)  # True per-90 denominator, avoids injury dilution!
        participation_rate = min(1.0, minutes / (elapsed_gws * 90.0))

        form_val = float(el.get("form") or 0.0)
        ppg_val = float(el.get("points_per_game") or 0.0)
        recent_mins_est = min(90.0, 90.0 * max(participation_rate, min(1.0, form_val / 3.5)))

        # Per-90 rates weighted by recent participation/form
        xg_per_90 = float(el.get("expected_goals_per_90") or (float(el.get("expected_goals") or 0.0) / nineties))
        xa_per_90 = float(el.get("expected_assists_per_90") or (float(el.get("expected_assists") or 0.0) / nineties))
        ict_per_90 = float(el.get("ict_index") or 0.0) / nineties
        threat_per_90 = float(el.get("threat") or 0.0) / nineties
        creat_per_90 = float(el.get("creativity") or 0.0) / nineties
        bps_per_90 = float(el.get("bps") or 0.0) / nineties

        fxs = team_fixtures.get(team_id, [])
        if not fxs:
            # Blank Gameweek (0 fixtures)
            predictions.append({
                "player_id": p_id,
                "name": el.get("web_name", ""),
                "gameweek": target_gw,
                "start_prob": 0.0,
                "projected_points": 0.0,
                "ceiling_points": 0.0,
                "haul_prob": 0.0,
            })
            continue

        total_xp = 0.0
        total_ceiling = 0.0
        max_haul_prob = 0.0
        primary_start_prob = 0.0

        for fx in fxs:
            feat_row = pd.DataFrame([{
                "rolling_points_3": form_val if form_val > 0 else ppg_val,
                "rolling_points_5": 0.6 * form_val + 0.4 * ppg_val,
                "rolling_minutes_3": recent_mins_est,
                "rolling_minutes_5": min(90.0, minutes / elapsed_gws),
                "rolling_ict_3": ict_per_90,
                "rolling_threat_3": threat_per_90,
                "rolling_creativity_3": creat_per_90,
                "rolling_xg_3": xg_per_90,
                "rolling_xa_3": xa_per_90,
                "rolling_bps_3": bps_per_90,
                "next_was_home": fx["was_home"],
                "opp_xga_rolling_5": fx["opp_weakness"],
                "value_norm": now_cost,
                "pos_code": pos_code,
            }])

            raw_p_start = float(clf_start.predict_proba(feat_row)[0, 1])
            raw_p_play = max(raw_p_start, float(clf_play.predict_proba(feat_row)[0, 1]))

            # Respect official FPL injury/availability flags
            if status in ["i", "s", "u", "n"]:
                p_start, p_play = 0.0, 0.0
            elif chance is not None:
                flag_mult = float(chance) / 100.0
                p_start = min(raw_p_start, flag_mult)
                p_play = min(raw_p_play, flag_mult)
            else:
                p_start, p_play = raw_p_start, raw_p_play

            p_sub = max(0.0, p_play - p_start)
            primary_start_prob = max(primary_start_prob, p_start)

            if p_play <= 0.01:
                continue

            # Fixture-adjusted attacking rates
            opp_scale = (fx["opp_weakness"] / 1.15) ** 0.85
            home_boost = 1.08 if fx["was_home"] == 1 else 0.94

            lam_g = float(np.clip(reg_xg.predict(feat_row)[0] * opp_scale * home_boost, 0.01, 1.45))
            lam_a = float(np.clip(reg_xa.predict(feat_row)[0] * opp_scale * home_boost, 0.01, 1.10))
            exp_bonus = float(np.clip(reg_bonus.predict(feat_row)[0], 0.0, 2.6))

            # Exact Poisson Clean Sheet & Goals Conceded Math
            lam_opp = fx["lambda_opp"]
            p_cs = math.exp(-lam_opp)
            gc_penalty = -0.45 * lam_opp if pos_code <= 2 else 0.0
            card_drag = -0.12

            g_pts = GOAL_PTS.get(pos_code, 4.0)
            cs_pts = CS_PTS.get(pos_code, 0.0)

            # Analytical Expected Points
            xp_if_start = (
                2.0
                + lam_g * g_pts
                + lam_a * 3.0
                + p_cs * cs_pts
                + exp_bonus
                + gc_penalty
                + card_drag
            )
            xp_if_sub = 1.0 + 0.30 * (lam_g * g_pts + lam_a * 3.0)
            fixture_xp = p_start * xp_if_start + p_sub * xp_if_sub
            total_xp += fixture_xp

            # Fast Vectorized Monte Carlo Simulation (2,500 draws) for Ceiling & Haul %
            n_sims = 2500
            u = rng.random(n_sims)
            is_start = u < p_start
            is_sub = (u >= p_start) & (u < (p_start + p_sub))

            sim_goals = rng.poisson(np.where(is_start, lam_g, np.where(is_sub, lam_g * 0.3, 0.0)))
            sim_assists = rng.poisson(np.where(is_start, lam_a, np.where(is_sub, lam_a * 0.3, 0.0)))
            sim_opp_goals = rng.poisson(lam_opp, size=n_sims)
            sim_cs = is_start & (sim_opp_goals == 0)
            sim_gc_pen = np.where(is_start & (pos_code <= 2), -(sim_opp_goals // 2), 0)
            sim_bonus = np.where(
                is_start & ((sim_goals + sim_assists) >= 1),
                rng.choice([0, 1, 2, 3], size=n_sims, p=[0.25, 0.25, 0.25, 0.25]),
                0,
            )

            sim_pts = (
                np.where(is_start, 2, np.where(is_sub, 1, 0))
                + sim_goals * g_pts
                + sim_assists * 3
                + np.where(sim_cs, cs_pts, 0)
                + sim_gc_pen
                + sim_bonus
            )

            total_ceiling += float(np.percentile(sim_pts, 90))
            max_haul_prob = max(max_haul_prob, float(np.mean(sim_pts >= 10)))

        opp_str = ""
        if fxs:
            opp_str = ", ".join([f"{fx['opp_team']} ({'H' if fx['was_home'] else 'A'})" for fx in fxs])

        predictions.append({
            "player_id": p_id,
            "name": el.get("web_name", ""),
            "team": team_map.get(team_id, {}).get("name", ""),
            "opponent": opp_str,
            "gameweek": target_gw,
            "start_prob": round(primary_start_prob, 3),
            "projected_points": round(total_xp, 2),
            "ceiling_points": round(total_ceiling, 1),
            "haul_prob": round(max_haul_prob, 3),
        })

    # Save rich predictions locally for AI Analyst & inspection
    with open(MODELS_DIR / "latest_sota_predictions.json", "w") as f:
        json.dump(predictions, f, indent=2)

    top_10 = sorted(predictions, key=lambda x: x["projected_points"], reverse=True)[:10]
    print("\n--- TOP 10 SOTA PROJECTED PLAYERS ---")
    for r in top_10:
        opp_info = f"({r.get('opponent', '')})"
        print(
            f"{r['name']:15s} | {opp_info:14s} | xP: {r['projected_points']:5.2f} | "
            f"Ceiling: {r['ceiling_points']:4.1f} | Haul%: {r['haul_prob']*100:4.1f}% | "
            f"Start%: {r['start_prob']*100:4.0f}%"
        )

    return predictions, target_gw


def upsert_predictions_to_supabase(predictions, target_gw):
    """Upserts predictions into Supabase player_predictions table, preserving exact schema."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[!] No Supabase credentials found, skipped remote database upsert.")
        return

    upsert_payload = []
    for r in predictions:
        p_id = int(r["player_id"])
        gw = int(r.get("gameweek", target_gw))
        proj_pts = float(r["projected_points"])
        raw_start = float(r.get("start_prob", 0.0))
        start_prob = raw_start * 100.0 if raw_start <= 1.0 else raw_start

        shap_explanation = {
            "drivers": [
                {"feature": "SOTA Poisson xG", "impact": f"{r.get('ceiling_points', 0)} ceiling"},
                {"feature": "Haul Probability", "impact": f"{round(r.get('haul_prob', 0) * 100, 1)}%"}
            ],
            "base_value": round(proj_pts, 2),
            "model_version": "SOTA-Poisson-MC-v2.0",
            "ceiling_points": r.get("ceiling_points", 0),
            "haul_prob": r.get("haul_prob", 0)
        }

        upsert_payload.append({
            "player_id": p_id,
            "gw": gw,
            "projected_points": round(proj_pts, 2),
            "start_probability": round(start_prob, 1),
            "shap_explanation": shap_explanation
        })

    try:
        from supabase import create_client
        print("[*] Connecting to Supabase...")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[*] Fetching valid player IDs from Supabase...")
        valid_players_res = supabase.table("players").select("id").execute()
        valid_player_ids = {p["id"] for p in valid_players_res.data}

        clean_payload = [p for p in upsert_payload if p["player_id"] in valid_player_ids]
        print(f"[*] Upserting {len(clean_payload)} player predictions to Supabase table 'player_predictions'...")

        chunk_size = 200
        for chunk_start in range(0, len(clean_payload), chunk_size):
            chunk = clean_payload[chunk_start : chunk_start + chunk_size]
            res = supabase.table("player_predictions").upsert(chunk, on_conflict="player_id,gw").execute()
            print(f"    -> Uploaded chunk {chunk_start // chunk_size + 1} ({len(chunk)} records)")
        print("[+] Live Inference & Supabase Upsert completed successfully!")
    except Exception as err:
        print(f"[!] Warning: Supabase upsert skipped ({err}). SOTA predictions are saved to {MODELS_DIR / 'latest_sota_predictions.json'}")


if __name__ == "__main__":
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training corpus not found at {DATA_PATH}. Run fetch_training_data.py first.")

    print(f"[*] Loading training corpus from {DATA_PATH}...")
    corpus = pd.read_csv(DATA_PATH)

    print("[*] Engineering SOTA features & next-fixture context...")
    df_prepared = prepare_training_data(corpus)

    print("[*] Training SOTA component-decomposed models (Active-Only Tweedie + Poisson)...")
    models = train_decomposed_models(df_prepared)

    print("[*] Running Live SOTA inference with Poisson Fixture adjustments & Monte Carlo simulations...")
    predictions, target_gw = run_live_sota_inference(models)

    print("[*] Upserting SOTA predictions to Supabase...")
    upsert_predictions_to_supabase(predictions, target_gw)
