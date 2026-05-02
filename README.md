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

1. Copy `.env.example` to `.env` at the repository root and fill in values from your registration response.
2. **Node:** from `logging_middleware`, run `npm install`. From `notification_app_be`, run `npm install`.
3. **Python:** `pip install -r requirements.txt`

## Run

- Vehicle scheduler: `cd vehicle_scheduling && python solution.py`
- Notification API: `cd notification_app_be && npm start`
- Priority inbox (Python): `cd notification_app_be/src/services && python priorityInbox.py`

Use port `3000` by default for the API unless `PORT` is set in `.env`.

## Notes

- Do not commit `.env` or `node_modules/`.
- Capture terminal output screenshots into the `screenshots/` folders where applicable.
