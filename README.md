# RA2311033010038 — AffordMed Backend Evaluation Submission

**Candidate:** Raktim Chandra
**Roll No:** RA2311033010038
**Track:** Backend
**Stack:** Node.js · TypeScript · Express · Axios · Zod

This repository contains all three deliverables for the AffordMed Campus Hiring Evaluation (Backend track):

| Deliverable | Path | Purpose |
|-------------|------|---------|
| Logging Middleware | [`logging_middleware/`](./logging_middleware) | Reusable, validated, auth-aware logger that ships every backend operation to the AffordMed evaluation logs API |
| Vehicle Maintenance Scheduler | [`vehicle_maintenance_scheduler/`](./vehicle_maintenance_scheduler) | REST service that fetches depots / vehicles and runs a 0/1 knapsack DP to maximise impact under mechanic-hour constraints |
| Notification System Design | [`notification_system_design.md`](./notification_system_design.md) | 5-stage system design — APIs, DB scaling, query optimisation, high-load architecture, mass notification redesign |

## Mandatory logging integration

Per the spec, every meaningful backend operation calls `Log(stack, level, package, message)`:

- request enter / exit
- upstream call begin / success / failure
- domain milestones (fetch, optimisation done, per-depot summary)
- HTTP errors
- process startup, shutdown, unhandled rejections

Grep for proof:

```bash
grep -R "Log(" vehicle_maintenance_scheduler/src
```

## Repository layout

```
RA2311033010038/
├── README.md                         ← this file
├── notification_system_design.md     ← Stage 1–5 design doc
├── logging_middleware/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
└── vehicle_maintenance_scheduler/
    ├── src/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── README.md
```

## Quick start

See [`SETUP.md`](./SETUP.md) for the full step-by-step guide including registration, GitHub push, and screenshot capture for the form.

```bash
# 1. Build the logger
cd logging_middleware && npm install && npm run build

# 2. Register and grab clientID/clientSecret
npm run register -- \
  --email raktimchandra26@gmail.com \
  --name "Raktim Chandra" \
  --mobile 9999999999 \
  --github <your-github-username> \
  --roll RA2311033010038 \
  --access QkbpxH

# 3. Paste the clientID/clientSecret into both .env files

# 4. Run the scheduler
cd ../vehicle_maintenance_scheduler && npm install && npm run dev
# → http://localhost:3000/api/v1/optimize
```
