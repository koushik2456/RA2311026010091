"""
Vehicle Maintenance Scheduler
Solves 0/1 Knapsack: maximise total Impact within MechanicHours budget.
Algorithm: Bottom-up dynamic programming. O(n * W) time and space.
"""

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

# Load .env from repo root (parent of vehicle_scheduling/) or cwd
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

BASE_URL = os.getenv("BASE_URL", "http://20.207.122.201/evaluation-service")
CLIENT_ID     = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
EMAIL         = os.getenv("EMAIL")
ROLL_NO       = os.getenv("ROLL_NO")
ACCESS_CODE   = os.getenv("ACCESS_CODE")
ACCESS_TOKEN  = os.getenv("ACCESS_TOKEN", "").strip()


def _missing_env() -> list[str]:
    if ACCESS_TOKEN:
        return []
    missing = []
    for key, val in [
        ("CLIENT_ID", CLIENT_ID),
        ("CLIENT_SECRET", CLIENT_SECRET),
        ("EMAIL", EMAIL),
        ("ROLL_NO", ROLL_NO),
        ("ACCESS_CODE", ACCESS_CODE),
    ]:
        if not val:
            missing.append(key)
    return missing


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_auth_token() -> str:
    """Obtain Bearer token: use ACCESS_TOKEN from .env if set, else POST /auth."""
    if ACCESS_TOKEN:
        print("[auth] Using ACCESS_TOKEN from .env")
        return ACCESS_TOKEN
    payload = {
        "email": EMAIL,
        "name": "t vinay koushik",
        "rollNo": ROLL_NO,
        "accessCode": ACCESS_CODE,
        "clientID": CLIENT_ID,
        "clientSecret": CLIENT_SECRET,
    }
    resp = requests.post(f"{BASE_URL}/auth", json=payload, timeout=10)
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("Auth response had no access_token")
    print(f"[auth] Token obtained: {token[:30]}...")
    return token


# ── Data Fetching ─────────────────────────────────────────────────────────────

def fetch_depots(token: str) -> list[dict]:
    """GET /depots — returns list of {ID, MechanicHours}."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/depots", headers=headers, timeout=10)
    resp.raise_for_status()
    depots = resp.json().get("depots", [])
    print(f"[fetch] {len(depots)} depots retrieved")
    return depots


def fetch_vehicles(token: str) -> list[dict]:
    """GET /vehicles — returns list of {TaskID, Duration, Impact}."""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/vehicles", headers=headers, timeout=10)
    resp.raise_for_status()
    vehicles = resp.json().get("vehicles", [])
    print(f"[fetch] {len(vehicles)} vehicles retrieved")
    return vehicles


# ── Algorithm ─────────────────────────────────────────────────────────────────

def knapsack_dp(capacity: int, vehicles: list[dict]) -> tuple[int, list[str]]:
    """
    0/1 Knapsack via bottom-up DP.

    Args:
        capacity : MechanicHours budget for the depot
        vehicles : list of {TaskID, Duration, Impact}

    Returns:
        (max_impact, [selected TaskIDs])
    """
    n = len(vehicles)
    # dp[i][w] = max impact using first i items with weight limit w
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        duration = vehicles[i - 1]["Duration"]
        impact   = vehicles[i - 1]["Impact"]
        for w in range(capacity + 1):
            # Option 1: skip this vehicle
            dp[i][w] = dp[i - 1][w]
            # Option 2: include this vehicle (only if it fits)
            if duration <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - duration] + impact)

    # Backtrack to find selected items
    selected = []
    w = capacity
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            selected.append(vehicles[i - 1]["TaskID"])
            w -= vehicles[i - 1]["Duration"]

    return dp[n][capacity], selected


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    missing = _missing_env()
    if missing:
        print("Missing environment variables:", ", ".join(missing))
        print("Either set ACCESS_TOKEN in .env, or copy .env.example and fill those keys.")
        sys.exit(1)

    try:
        token    = get_auth_token()
        depots   = fetch_depots(token)
        vehicles = fetch_vehicles(token)
    except requests.exceptions.ConnectionError as e:
        print("Could not reach the evaluation server. Check network or BASE_URL.")
        print(str(e))
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print("HTTP error from server:", e.response.status_code if e.response else "?")
        if e.response is not None:
            try:
                print(e.response.json())
            except Exception:
                print(e.response.text[:500])
        sys.exit(1)
    except Exception as e:
        print("Unexpected error during fetch/auth:", str(e))
        sys.exit(1)

    if not vehicles:
        print("No vehicles returned; nothing to schedule.")
        return

    print("\n" + "=" * 60)
    print("VEHICLE MAINTENANCE SCHEDULER — RESULTS")
    print("=" * 60)

    for depot in depots:
        depot_id = depot["ID"]
        budget   = depot["MechanicHours"]

        max_impact, selected_tasks = knapsack_dp(budget, vehicles)

        print(f"\nDepot {depot_id} | Budget: {budget} hours")
        print(f"  Max Impact  : {max_impact}")
        print(f"  Tasks ({len(selected_tasks)}): {selected_tasks}")

        # Verify: sum of durations must not exceed budget
        selected_vehicles = [v for v in vehicles if v["TaskID"] in selected_tasks]
        total_hours = sum(v["Duration"] for v in selected_vehicles)
        print(f"  Hours Used  : {total_hours} / {budget}  ✓" if total_hours <= budget
              else f"  Hours Used  : {total_hours} / {budget}  ✗ BUDGET EXCEEDED")

    print("\n" + "=" * 60)
    print("Take a screenshot of this output for submission.")


if __name__ == "__main__":
    main()
