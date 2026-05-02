# Vehicle Maintenance Scheduler

A production-grade Node.js / TypeScript / Express service that fetches depots and vehicle tasks from the AffordMed evaluation API and selects, **per depot**, the maintenance task subset that maximises business *Impact* while keeping the total *Duration* within the depot's `MechanicHours`.

This is a 0/1 knapsack problem. We solve it with classic dynamic programming, not a greedy heuristic, because the spec asks for the optimum.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/v1/health` | Liveness check |
| `GET`  | `/api/v1/optimize` | Returns optimal plans for every depot |
| `GET`  | `/api/v1/optimize/depots/:depotId` | Returns the optimal plan for one depot |

### Sample response — `GET /api/v1/optimize`

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-05-02T07:42:11.123Z",
    "plans": [
      {
        "depotId": 1,
        "mechanicHours": 60,
        "selectedTasks": ["task1", "task5", "task7"],
        "totalImpact": 30,
        "totalDuration": 59,
        "consideredTaskCount": 12
      }
    ]
  }
}
```

### Error envelope

```json
{
  "success": false,
  "error": { "code": "UPSTREAM_FAILURE", "message": "Failed to fetch depots: ..." }
}
```

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR`   | 400 | Bad input (e.g. non-numeric `depotId`) |
| `NOT_FOUND`          | 404 | Unknown route |
| `UPSTREAM_FAILURE`   | 502 | AffordMed `/depots` or `/vehicles` failed |
| `INTERNAL_ERROR`     | 500 | Anything unexpected |

## Architecture

```
src/
├── algorithms/
│   └── knapsack.ts          # 0/1 knapsack DP + backtracking
├── clients/
│   ├── baseClient.ts        # axios instance with retry + logging
│   ├── depotClient.ts       # GET /depots
│   └── vehicleClient.ts     # GET /vehicles
├── config/
│   └── index.ts             # env-driven typed config
├── controllers/
│   └── optimizationController.ts
├── middleware/
│   ├── errorHandler.ts      # 404 + central error mapper
│   └── requestLogger.ts     # in/out request logging via middleware
├── routes/
│   ├── index.ts
│   └── optimizationRoutes.ts
├── services/
│   └── optimizationService.ts  # orchestrates fetch + per-depot solve
├── types/
│   └── index.ts             # upstream + domain types, typed errors
├── utils/
│   └── responseFormatter.ts
├── validators/
│   └── depotValidator.ts    # zod-based path-param validation
├── app.ts                   # builds the Express app
└── server.ts                # binds to port, handles signals
```

### Why this layout
The repository separates *transport* (`controllers`, `routes`, `middleware`), *domain* (`services`, `algorithms`), and *infrastructure* (`clients`, `config`). The service layer never imports Express, so the optimisation logic is fully unit-testable without HTTP.

### Logging integration (mandatory)
Every meaningful operation calls `Log()` from `@affordmed/logging-middleware`:
- request enter/exit (middleware/`requestLogger.ts`)
- upstream call begin/success/failure (clients/`baseClient.ts`)
- domain milestones — fetch start, optimisation complete, per-depot summary (services/`optimizationService.ts`)
- HTTP errors mapped by central handler (middleware/`errorHandler.ts`)
- process events — startup, shutdown, unhandled rejections (server.ts)

## Algorithm — 0/1 Knapsack

```
maximise   Σ Impact_i * x_i
subject to Σ Duration_i * x_i <= MechanicHours
           x_i ∈ {0, 1}
```

Implementation: `src/algorithms/knapsack.ts`.

| | |
|--|--|
| Time  | `O(n × W)` where `n` = task count, `W` = mechanic hours |
| Space | `O(n × W)` (kept 2D for trivial backtracking; can be reduced to `O(W)` if memory-bound) |

We deliberately reject the greedy `Impact / Duration` heuristic — it runs in `O(n log n)` but is only an approximation. For typical evaluation inputs (`n ≤ a few hundred`, `W ≤ a few hundred`) the DP completes in well under a millisecond.

### Task → depot mapping
If a task carries a `DepotID` field upstream we honour it. Otherwise the task is treated as depot-agnostic and considered for every depot. This is a deliberate, documented choice — the spec does not promise a depot link on every task.

## Setup

```bash
# 1. Install the logging middleware sibling first
cd ../logging_middleware
npm install
npm run build

# 2. Then this service
cd ../vehicle_maintenance_scheduler
npm install
cp .env.example .env       # fill in LOG_CLIENT_ID / LOG_CLIENT_SECRET
npm run dev                # http://localhost:3000
```

### Quick verification

```bash
curl -s http://localhost:3000/api/v1/health
curl -s http://localhost:3000/api/v1/optimize | jq
curl -s http://localhost:3000/api/v1/optimize/depots/1 | jq
```

## Engineering decisions

- **TypeScript strict mode** end-to-end.
- **Axios + `axios-retry`** for transient upstream failures, exponential backoff.
- **Zod** for path-param validation — no hand-rolled parsers.
- **Domain errors are typed** (`UpstreamFetchError`, `ValidationError`) and mapped to consistent HTTP statuses by a single error middleware.
- **Logger never throws** — `Log()` failures cannot take down the request path.
- **Graceful shutdown** wired to `SIGINT` / `SIGTERM`.
