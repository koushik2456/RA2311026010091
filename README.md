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

### Postman screenshots (localhost is enough)

You do **not** have to deploy for a valid screenshot. Run `npm start` in `notification_app_be`, then in Postman use:

- `GET http://localhost:3000/health` — quick sanity check  
- `GET http://localhost:3000/api/vehicle-schedule` — evaluation proxy + knapsack  
- `GET http://localhost:3000/api/notifications` — header `Authorization: Bearer <API_STUDENT_BEARER>` (value from `.env`)

Capture the **request URL + headers (if any)**, **response body**, and **response time** (Postman shows this below the response). That matches a typical assignment checklist.

### Optional: public URL without full deploy (ngrok)

If you want an `https://....` URL in Postman for the same local server:

1. Install [ngrok](https://ngrok.com/), run `ngrok http 3000`.  
2. Copy the `https://....ngrok-free.app` URL and call `GET https://....ngrok-free.app/api/vehicle-schedule` in Postman.

### Optional: deploy on Render

1. Push this repo to GitHub.  
2. In [Render](https://render.com) → New → Web Service → pick the repo.  
3. If you use the included **`render.yaml`**, Render picks build/start commands; otherwise set manually:  
   - **Build:** `npm install --prefix logging_middleware && npm install --prefix notification_app_be`  
   - **Start:** `cd notification_app_be && node index.js`  
4. In Render **Environment**, add **`BASE_URL`**, **`ACCESS_TOKEN`**, and **`API_STUDENT_BEARER`** (and any others from `.env.example` you use). Never commit secrets.

After deploy, Postman uses `https://<your-service>.onrender.com/api/vehicle-schedule` (Render may spin down free services after idle; first request can be slow).


