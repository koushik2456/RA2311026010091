"""
Priority Inbox — Stage 6
Fetches notifications from evaluation API and returns top N by priority.

Priority formula:
  weight  = Placement:3, Result:2, Event:1
  priority = weight * 1000 + (1 / (age_in_seconds + 1))

Uses a min-heap of size N for efficient top-N maintenance.
"""

import os
import sys
import heapq
from pathlib import Path

import requests
from datetime import datetime, timezone
from dotenv import load_dotenv


def _load_env_files() -> None:
    seen = set()
    for base in (
        Path(__file__).resolve().parent.parent.parent,
        Path(__file__).resolve().parent.parent,
        Path.cwd(),
    ):
        path = base / ".env"
        key = str(path.resolve())
        if path.is_file() and key not in seen:
            load_dotenv(path, override=False)
            seen.add(key)


_load_env_files()

BASE_URL      = os.getenv("BASE_URL", "http://20.207.122.201/evaluation-service")
CLIENT_ID     = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
EMAIL         = os.getenv("EMAIL")
ROLL_NO       = os.getenv("ROLL_NO")
ACCESS_CODE   = os.getenv("ACCESS_CODE")
ACCESS_TOKEN  = os.getenv("ACCESS_TOKEN", "").strip()

WEIGHT = {"Placement": 3, "Result": 2, "Event": 1}


def get_auth_token() -> str:
    if ACCESS_TOKEN:
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
        raise RuntimeError("No access_token in auth response")
    return token


def fetch_notifications(token: str) -> list:
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json().get("notifications", [])


def compute_priority(notification: dict) -> float:
    """
    Higher score = higher priority.
    weight component dominates; recency breaks ties within same type.
    """
    ntype  = notification.get("Type", "Event")
    ts_str = notification.get("Timestamp", "")

    weight = WEIGHT.get(ntype, 1)

    try:
        ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()
    except (ValueError, TypeError):
        age_seconds = 0

    recency = 1.0 / (age_seconds + 1)
    return weight * 1000 + recency


def top_n_notifications(notifications: list, n: int = 10) -> list:
    """
    Return top N notifications by priority using a min-heap.
    Time complexity: O(k log N) where k = total notifications, N = top count.
    """
    heap = []  # min-heap: (priority, notification)

    for notif in notifications:
        priority = compute_priority(notif)
        if len(heap) < n:
            heapq.heappush(heap, (priority, notif))
        elif priority > heap[0][0]:
            heapq.heapreplace(heap, (priority, notif))

    # Sort descending by priority for display
    result = sorted(heap, key=lambda x: x[0], reverse=True)
    return [item[1] for item in result]


def main():
    missing = [] if ACCESS_TOKEN else [k for k, v in [
        ("CLIENT_ID", CLIENT_ID),
        ("CLIENT_SECRET", CLIENT_SECRET),
        ("EMAIL", EMAIL),
        ("ROLL_NO", ROLL_NO),
        ("ACCESS_CODE", ACCESS_CODE),
    ] if not v]
    if missing:
        print("Missing .env variables:", ", ".join(missing))
        print()
        print("Fix: in repo root .env set BASE_URL and ACCESS_TOKEN (see .env.example).")
        sys.exit(1)

    try:
        if not ACCESS_TOKEN:
            print("Fetching auth token...")
        token = get_auth_token()

        print("Fetching notifications...")
        notifications = fetch_notifications(token)
        print(f"Total notifications received: {len(notifications)}")

        top10 = top_n_notifications(notifications, n=10)

        print("\n" + "=" * 60)
        print("TOP 10 PRIORITY NOTIFICATIONS")
        print("=" * 60)
        for i, notif in enumerate(top10, 1):
            priority = compute_priority(notif)
            print(f"\n#{i} | Priority Score: {priority:.4f}")
            print(f"   ID      : {notif.get('ID')}")
            print(f"   Type    : {notif.get('Type')}")
            print(f"   Message : {notif.get('Message')}")
            print(f"   Time    : {notif.get('Timestamp')}")
        print("\n" + "=" * 60)
        print("Screenshot this output and save to notification_app_be/screenshots/")
    except requests.exceptions.ConnectionError as e:
        print("Network error — could not reach the server.")
        print(str(e))
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print("HTTP error:", getattr(e.response, "status_code", "?"))
        if e.response is not None:
            try:
                print(e.response.json())
            except Exception:
                print(e.response.text[:500])
        sys.exit(1)
    except Exception as e:
        print("Run failed:", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
