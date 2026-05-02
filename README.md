# Backend evaluation repository

This repository contains:

- **Logging middleware** — posts structured logs to the evaluation service with Bearer authentication.
- **Vehicle maintenance scheduler** — 0/1 knapsack (dynamic programming) to assign maintenance tasks within mechanic-hour budgets per depot.
- **Campus notifications** — design notes in `notification_system_design.md` and a Node.js API plus a Python priority-inbox helper.

## Layout

| Path | Purpose |
|------|---------|
| `logging_middleware/` | Reusable `Log()` module |
| `vehicle_scheduling/` | Python script and screenshots folder |
| `notification_app_be/` | Notification microservice entrypoint and `src/` |
| `notification_system_design.md` | Six-stage design write-up |

## Setup

1. Copy `.env.example` to `.env` at the repository root. Set **`BASE_URL`** and **`ACCESS_TOKEN`** (the long `access_token` value only). Client ID, secret, email, roll number, and access code are **not** required when `ACCESS_TOKEN` is set.
2. **Node:** from `logging_middleware`, run `npm install`. From `notification_app_be`, run `npm install`.
3. **Python:** `pip install -r requirements.txt`

## `.env` location

Put **`.env` next to `README.md`** (repository root). You can also use `vehicle_scheduling/.env` or the folder you run Python from; the scripts load those in order and merge keys.

## Run

- Vehicle scheduler: `cd vehicle_scheduling && python solution.py` (or `python vehicle_scheduling/solution.py` from the repo root)
- Notification API: `cd notification_app_be && npm start`
- Priority inbox (Python): `cd notification_app_be/src/services && python priorityInbox.py`

### HTTP: vehicle schedule (Node)

With the server running and `.env` containing **`BASE_URL`** + **`ACCESS_TOKEN`**:

`GET http://localhost:3000/api/vehicle-schedule`

The server calls the evaluation service (`/depots`, `/vehicles`), runs the same knapsack logic as `vehicle_scheduling/solution.py`, and returns JSON (`ok`, `depotCount`, `vehicleCount`, `results` per depot). No `Authorization` header is required on this route; the token stays on the server.


