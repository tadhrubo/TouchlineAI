import os
import sys
import json
from typing import List, Dict, Any, Optional
import pulp
import pandas as pd
import numpy as np

# Ensure clean UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

class FPLOptimizer:
    """
    Integer Linear Programming (ILP) Solver for Fantasy Premier League.
    Solves Starting XI, Captaincy, Bench Priority, and 1/2-Transfer Moves.
    """

    def __init__(
        self,
        player_df: pd.DataFrame,
        current_squad_ids: List[int],
        bank: float = 0.0,
        free_transfers: int = 1,
        transfer_cost: float = 4.0
    ):
        """
        :param player_df: DataFrame containing all active players with:
                          id, web_name, team_id, team_short, element_type, now_cost, projected_points, start_probability, shap_explanation
        :param current_squad_ids: List of 15 player IDs in the active manager squad
        :param bank: In the bank funds in £ millions (e.g. 2.0)
        :param free_transfers: Free transfers count (e.g. 1 or 2)
        :param transfer_cost: Points penalty per extra transfer beyond FT (default: 4.0)
        """
        self.df = player_df.copy()
        
        # Ensure standard column names and types
        if "id" not in self.df.columns and "player_id" in self.df.columns:
            self.df["id"] = self.df["player_id"]
            
        self.df["id"] = self.df["id"].astype(int)
        self.df["element_type"] = self.df["element_type"].astype(int)
        self.df["team_id"] = self.df["team_id"].astype(int)
        
        # Normalize costs: if cost > 30, it is in tenths of millions (e.g. 80 -> 8.0)
        if self.df["now_cost"].max() > 30:
            self.df["cost_m"] = self.df["now_cost"] / 10.0
        else:
            self.df["cost_m"] = self.df["now_cost"].astype(float)
            
        self.df["projected_points"] = pd.to_numeric(self.df["projected_points"], errors="coerce").fillna(0.0)
        self.df["start_probability"] = pd.to_numeric(self.df["start_probability"], errors="coerce").fillna(50.0)
        
        self.current_squad_ids = [int(i) for i in current_squad_ids]
        self.bank = float(bank)
        self.free_transfers = int(free_transfers)
        self.transfer_cost = float(transfer_cost)
        
        # Calculate current squad valuation
        squad_df = self.df[self.df["id"].isin(self.current_squad_ids)]
        self.current_team_value = float(squad_df["cost_m"].sum())
        self.total_budget = self.current_team_value + self.bank

    def optimize_starting_xi(self, custom_squad_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Solve optimal 11 starters, captain, vice-captain, and ordered bench for the given 15 players.
        """
        squad_ids = custom_squad_ids if custom_squad_ids is not None else self.current_squad_ids
        squad_df = self.df[self.df["id"].isin(squad_ids)].copy().reset_index(drop=True)
        
        if len(squad_df) != 15:
            # Fallback if fewer or more players present
            squad_df = squad_df.head(15)
            
        prob = pulp.LpProblem("Optimize_Starting_XI", pulp.LpMaximize)
        
        # Decision variables
        starter_vars = {}
        captain_vars = {}
        vice_vars = {}
        
        for idx, row in squad_df.iterrows():
            p_id = row["id"]
            starter_vars[p_id] = pulp.LpVariable(f"start_{p_id}", cat="Binary")
            captain_vars[p_id] = pulp.LpVariable(f"cap_{p_id}", cat="Binary")
            vice_vars[p_id] = pulp.LpVariable(f"vice_{p_id}", cat="Binary")
            
        # Objective: Maximize starting points + captain bonus + vice captain tiebreaker
        prob += pulp.lpSum([
            starter_vars[row["id"]] * row["projected_points"] +
            captain_vars[row["id"]] * row["projected_points"] +
            vice_vars[row["id"]] * (0.01 * row["projected_points"])
            for _, row in squad_df.iterrows()
        ])
        
        # Constraints
        # 1. Exactly 11 starters
        prob += pulp.lpSum([starter_vars[pid] for pid in squad_df["id"]]) == 11
        
        # 2. Exactly 1 captain and 1 vice-captain
        prob += pulp.lpSum([captain_vars[pid] for pid in squad_df["id"]]) == 1
        prob += pulp.lpSum([vice_vars[pid] for pid in squad_df["id"]]) == 1
        
        # 3. Captain and vice-captain must be starters, and cannot be the same player
        for pid in squad_df["id"]:
            prob += captain_vars[pid] <= starter_vars[pid]
            prob += vice_vars[pid] <= starter_vars[pid]
            prob += captain_vars[pid] + vice_vars[pid] <= 1
            
        # 4. Positional constraints for Starting XI (1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD)
        gk_ids = squad_df[squad_df["element_type"] == 1]["id"].tolist()
        def_ids = squad_df[squad_df["element_type"] == 2]["id"].tolist()
        mid_ids = squad_df[squad_df["element_type"] == 3]["id"].tolist()
        fwd_ids = squad_df[squad_df["element_type"] == 4]["id"].tolist()
        
        prob += pulp.lpSum([starter_vars[pid] for pid in gk_ids]) == 1
        prob += pulp.lpSum([starter_vars[pid] for pid in def_ids]) >= 3
        prob += pulp.lpSum([starter_vars[pid] for pid in def_ids]) <= 5
        prob += pulp.lpSum([starter_vars[pid] for pid in mid_ids]) >= 2
        prob += pulp.lpSum([starter_vars[pid] for pid in mid_ids]) <= 5
        prob += pulp.lpSum([starter_vars[pid] for pid in fwd_ids]) >= 1
        prob += pulp.lpSum([starter_vars[pid] for pid in fwd_ids]) <= 3
        
        # Solve
        prob.solve(pulp.PULP_CBC_CMD(msg=False))
        
        if prob.status != pulp.LpStatusOptimal:
            raise RuntimeError("Optimal Starting XI could not be solved by ILP.")
            
        # Extract results
        starters = []
        bench_gkp = []
        bench_outfield = []
        captain_info = None
        vice_info = None
        
        def_count = 0
        mid_count = 0
        fwd_count = 0
        
        for _, row in squad_df.iterrows():
            pid = row["id"]
            is_start = bool(starter_vars[pid].varValue > 0.5)
            is_cap = bool(captain_vars[pid].varValue > 0.5)
            is_vice = bool(vice_vars[pid].varValue > 0.5)
            
            p_dict = {
                "id": pid,
                "web_name": row["web_name"],
                "team_short": row["team_short"],
                "element_type": row["element_type"],
                "cost": row["cost_m"],
                "projected_points": round(float(row["projected_points"]), 2),
                "start_probability": round(float(row["start_probability"]), 1),
                "is_captain": is_cap,
                "is_vice_captain": is_vice,
                "shap_explanation": row.get("shap_explanation", {})
            }
            
            if is_cap:
                captain_info = p_dict
            if is_vice:
                vice_info = p_dict
                
            if is_start:
                starters.append(p_dict)
                if row["element_type"] == 2:
                    def_count += 1
                elif row["element_type"] == 3:
                    mid_count += 1
                elif row["element_type"] == 4:
                    fwd_count += 1
            else:
                if row["element_type"] == 1:
                    bench_gkp.append(p_dict)
                else:
                    bench_outfield.append(p_dict)
                    
        # Sort outfield bench by projected points descending (standard auto-sub priority)
        bench_outfield.sort(key=lambda p: p["projected_points"], reverse=True)
        ordered_bench = bench_gkp + bench_outfield
        for b_idx, b_player in enumerate(ordered_bench):
            b_player["bench_order"] = b_idx
            
        # Sort starters by position (GK, DEF, MID, FWD)
        starters.sort(key=lambda p: (p["element_type"], -p["projected_points"]))
        
        formation_str = f"{def_count}-{mid_count}-{fwd_count}"
        raw_xi_xp = sum(p["projected_points"] for p in starters)
        cap_bonus = captain_info["projected_points"] if captain_info else 0.0
        total_starting_xp = raw_xi_xp + cap_bonus
        
        return {
            "formation": formation_str,
            "starters": starters,
            "bench": ordered_bench,
            "captain": captain_info,
            "vice_captain": vice_info,
            "raw_xi_xp": round(raw_xi_xp, 2),
            "captain_bonus": round(cap_bonus, 2),
            "total_starting_xp": round(total_starting_xp, 2),
            "bench_xp": round(sum(p["projected_points"] for p in ordered_bench), 2)
        }

    def optimize_transfers(self, max_transfers: int = 1) -> Dict[str, Any]:
        """
        Solve optimal transfers (up to max_transfers) across the full 600+ player corpus
        to maximize Starting XI projected points net of any transfer hit penalties.
        """
        max_t = int(max_transfers)
        
        # Calculate baseline (no transfers)
        baseline_xi = self.optimize_starting_xi(self.current_squad_ids)
        baseline_xp = baseline_xi["total_starting_xp"]
        
        # Optimization problem
        prob = pulp.LpProblem("FPL_Transfer_Optimizer", pulp.LpMaximize)
        
        all_players = self.df.reset_index(drop=True)
        player_ids = all_players["id"].tolist()
        
        # Decision variables
        in_squad_vars = {}
        starter_vars = {}
        captain_vars = {}
        
        for pid in player_ids:
            in_squad_vars[pid] = pulp.LpVariable(f"squad_{pid}", cat="Binary")
            starter_vars[pid] = pulp.LpVariable(f"start_{pid}", cat="Binary")
            captain_vars[pid] = pulp.LpVariable(f"cap_{pid}", cat="Binary")
            
        # Aux variable for transfers taken
        transfers_taken = 15 - pulp.lpSum([in_squad_vars[pid] for pid in self.current_squad_ids])
        
        # Objective: Maximize total starting points + captain bonus - penalty for extra transfers
        # If max_transfers <= free_transfers, penalty is 0
        if max_t <= self.free_transfers:
            prob += pulp.lpSum([
                starter_vars[row["id"]] * row["projected_points"] +
                captain_vars[row["id"]] * row["projected_points"]
                for _, row in all_players.iterrows()
            ])
        else:
            # Linearize penalty: penalty = transfer_cost * (transfers_taken - free_transfers)
            extra_transfers = transfers_taken - self.free_transfers
            prob += pulp.lpSum([
                starter_vars[row["id"]] * row["projected_points"] +
                captain_vars[row["id"]] * row["projected_points"]
                for _, row in all_players.iterrows()
            ]) - (self.transfer_cost * extra_transfers)
            
        # 1. Total squad size must be exactly 15
        prob += pulp.lpSum([in_squad_vars[pid] for pid in player_ids]) == 15
        
        # 2. Position constraints in 15-man squad (2 GK, 5 DEF, 5 MID, 3 FWD)
        gk_ids = all_players[all_players["element_type"] == 1]["id"].tolist()
        def_ids = all_players[all_players["element_type"] == 2]["id"].tolist()
        mid_ids = all_players[all_players["element_type"] == 3]["id"].tolist()
        fwd_ids = all_players[all_players["element_type"] == 4]["id"].tolist()
        
        prob += pulp.lpSum([in_squad_vars[pid] for pid in gk_ids]) == 2
        prob += pulp.lpSum([in_squad_vars[pid] for pid in def_ids]) == 5
        prob += pulp.lpSum([in_squad_vars[pid] for pid in mid_ids]) == 5
        prob += pulp.lpSum([in_squad_vars[pid] for pid in fwd_ids]) == 3
        
        # 3. Max 3 players per Premier League team
        for team_id in all_players["team_id"].unique():
            team_pids = all_players[all_players["team_id"] == team_id]["id"].tolist()
            prob += pulp.lpSum([in_squad_vars[pid] for pid in team_pids]) <= 3
            
        # 4. Total squad cost constraint: <= current_team_value + bank
        prob += pulp.lpSum([in_squad_vars[row["id"]] * row["cost_m"] for _, row in all_players.iterrows()]) <= self.total_budget
        
        # 5. Transfer count constraint: transfers <= max_t
        prob += transfers_taken <= max_t
        prob += transfers_taken >= 0
        
        # 6. Starting XI constraints (11 starters, 1 captain)
        prob += pulp.lpSum([starter_vars[pid] for pid in player_ids]) == 11
        prob += pulp.lpSum([captain_vars[pid] for pid in player_ids]) == 1
        
        for pid in player_ids:
            prob += starter_vars[pid] <= in_squad_vars[pid]
            prob += captain_vars[pid] <= starter_vars[pid]
            
        prob += pulp.lpSum([starter_vars[pid] for pid in gk_ids]) == 1
        prob += pulp.lpSum([starter_vars[pid] for pid in def_ids]) >= 3
        prob += pulp.lpSum([starter_vars[pid] for pid in def_ids]) <= 5
        prob += pulp.lpSum([starter_vars[pid] for pid in mid_ids]) >= 2
        prob += pulp.lpSum([starter_vars[pid] for pid in mid_ids]) <= 5
        prob += pulp.lpSum([starter_vars[pid] for pid in fwd_ids]) >= 1
        prob += pulp.lpSum([starter_vars[pid] for pid in fwd_ids]) <= 3
        
        # Solve with CBC solver
        prob.solve(pulp.PULP_CBC_CMD(msg=False))
        
        if prob.status != pulp.LpStatusOptimal:
            raise RuntimeError("Optimal Transfers could not be solved by ILP.")
            
        # Extract selected 15-man squad
        new_squad_ids = [pid for pid in player_ids if in_squad_vars[pid].varValue > 0.5]
        
        # Determine transfers in and out
        out_ids = [pid for pid in self.current_squad_ids if pid not in new_squad_ids]
        in_ids = [pid for pid in new_squad_ids if pid not in self.current_squad_ids]
        
        transfers_out = []
        for pid in out_ids:
            row = all_players[all_players["id"] == pid].iloc[0]
            transfers_out.append({
                "id": pid,
                "web_name": row["web_name"],
                "team_short": row["team_short"],
                "cost": row["cost_m"],
                "projected_points": round(float(row["projected_points"]), 2),
                "element_type": int(row["element_type"])
            })
            
        transfers_in = []
        for pid in in_ids:
            row = all_players[all_players["id"] == pid].iloc[0]
            transfers_in.append({
                "id": pid,
                "web_name": row["web_name"],
                "team_short": row["team_short"],
                "cost": row["cost_m"],
                "projected_points": round(float(row["projected_points"]), 2),
                "element_type": int(row["element_type"]),
                "shap_explanation": row.get("shap_explanation", {})
            })
            
        # Compute optimal starting XI for new squad
        new_xi = self.optimize_starting_xi(new_squad_ids)
        new_gross_xp = new_xi["total_starting_xp"]
        
        actual_transfers = len(in_ids)
        penalty_pts = max(0, actual_transfers - self.free_transfers) * self.transfer_cost
        new_net_xp = new_gross_xp - penalty_pts
        net_gain = round(new_net_xp - baseline_xp, 2)
        
        new_squad_cost = sum(all_players[all_players["id"].isin(new_squad_ids)]["cost_m"])
        remaining_bank = round(self.total_budget - new_squad_cost, 2)
        
        return {
            "transfers_count": actual_transfers,
            "transfers_out": transfers_out,
            "transfers_in": transfers_in,
            "penalty_points": penalty_pts,
            "cost_delta": round(sum(p["cost"] for p in transfers_in) - sum(p["cost"] for p in transfers_out), 2),
            "remaining_bank": remaining_bank,
            "baseline_xp": baseline_xp,
            "new_gross_xp": new_gross_xp,
            "new_net_xp": round(new_net_xp, 2),
            "net_gain": net_gain,
            "optimized_xi": new_xi
        }
