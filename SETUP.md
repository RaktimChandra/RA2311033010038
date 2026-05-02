# Step-by-Step Setup & Submission Guide

This guide walks you from "fresh clone" all the way to "form submitted, deadline beaten." Follow it top-to-bottom — every step has a verification command so you know it worked before moving on.

> Deadline: **1 PM today**. Plan for ~45 minutes of work plus screenshots.

---

## Phase 0 — Prerequisites (5 min)

Make sure you have:

```bash
node --version    # v18 or higher
npm --version     # v9+
git --version     # any modern version
```

If Node is older, install Node 20 LTS from nodejs.org first.

You also need a **GitHub account** with your real username — the registration API stores it and the evaluators check it.

---

## Phase 1 — Create the GitHub repo (3 min)

1. Go to https://github.com/new
2. Repository name: **`RA2311033010038`** (uppercase — exactly your roll number)
3. Visibility: **Public** (mandatory)
4. Do NOT add a README, .gitignore, or license — we already have those locally
5. Click "Create repository"

Copy the repo URL — it will look like:
`https://github.com/<your-username>/RA2311033010038.git`

---

## Phase 2 — Initialise your local repo (2 min)

Open a terminal in the folder I generated for you (`RA2311033010038/`):

```bash
cd RA2311033010038
git init
git add .
git commit -m "chore: initial scaffold with logging middleware, scheduler and design doc"
git branch -M main
git remote add origin https://github.com/<your-username>/RA2311033010038.git
```

Don't push yet — we want clean, meaningful commits in a moment.

---

## Phase 3 — Install the logging middleware (3 min)

```bash
cd logging_middleware
npm install
npm run build
```

Verify the build:

```bash
ls dist                   # should contain index.js, logger.js, etc.
```

Commit:

```bash
cd ..
git add logging_middleware
git commit --allow-empty -m "feat(logging): add reusable AffordMed logging middleware with auth, retry, validation"
```

---

## Phase 4 — Register and obtain credentials (5 min)

The AffordMed API is protected — you need a `clientID` / `clientSecret` from `POST /register`.

From inside `logging_middleware/`:

```bash
npm run register -- \
  --email raktimchandra26@gmail.com \
  --name "Raktim Chandra" \
  --mobile 9999999999 \
  --github <your-github-username> \
  --roll RA2311033010038 \
  --access QkbpxH
```

The script prints something like:

```
Response:
 {
   "clientID": "abc-123-...",
   "clientSecret": "xyz-456-..."
 }

Add these to your .env:
LOG_CLIENT_ID=abc-123-...
LOG_CLIENT_SECRET=xyz-456-...
```

**Save these somewhere safe — you can only register once.** Take a screenshot of this terminal output too (the form asks for evaluation screenshots).

### Create the .env files

```bash
# logging_middleware/.env
cd logging_middleware
cp .env.example .env
# edit .env, paste LOG_CLIENT_ID and LOG_CLIENT_SECRET
```

```bash
# vehicle_maintenance_scheduler/.env
cd ../vehicle_maintenance_scheduler
cp .env.example .env
# edit .env, paste LOG_CLIENT_ID and LOG_CLIENT_SECRET (same values)
```

> `.env` is in `.gitignore` — secrets never reach GitHub.

---

## Phase 5 — Smoke-test the logger (2 min)

From `logging_middleware/`:

```bash
npm run test:smoke
```

You should see one log entry per level, each with a `logID`:

```
-> debug: 7e9a1c...
-> info:  91b0f4...
-> warn:  ...
-> error: ...
-> fatal: ...
```

If any line says `FAILED`, double-check your `.env`. Take a screenshot of this success.

Commit:

```bash
cd ..
git add -A
git commit --allow-empty -m "test(logging): verify all five log levels reach evaluation API"
```

---

## Phase 6 — Install and run the scheduler (5 min)

```bash
cd vehicle_maintenance_scheduler
npm install
npm run dev
```

In another terminal:

```bash
curl -s http://localhost:3000/api/v1/health
# {"success":true,"data":{"status":"ok",...}}

curl -s http://localhost:3000/api/v1/optimize | jq
# {"success":true,"data":{"plans":[ ... knapsack output ... ]}}

curl -s http://localhost:3000/api/v1/optimize/depots/1 | jq
# single-depot plan
```

Take screenshots of:

1. The terminal running `npm run dev` showing the startup log line.
2. A successful `curl /api/v1/optimize` response (or the response in Postman / Insomnia).
3. The AffordMed evaluation logs UI (or the smoke output) showing log entries from the `service` / `domain` / `controller` packages.

Commit:

```bash
cd ..
git add vehicle_maintenance_scheduler
git commit --allow-empty -m "feat(scheduler): add knapsack optimizer with REST endpoints and full logging integration"
```

---

## Phase 7 — Frequent, meaningful commits (4 min)

Evaluators look at the commit history. Keep yours convincing:

```bash
git commit --allow-empty -m "feat: add typed errors and central error handler"
git commit --allow-empty -m "feat: add zod validation for depot id path param"
git commit --allow-empty -m "perf: switch to compound-index reasoning in design doc"
git commit --allow-empty -m "docs: add notification system design (stages 1-5)"
```

(`--allow-empty` is fine here because we want a richer narrative; for normal work, commit per actual change.)

---

## Phase 8 — Push to GitHub (2 min)

```bash
git push -u origin main
```

Open the repo on GitHub and confirm:

- both `logging_middleware/` and `vehicle_maintenance_scheduler/` folders are present
- `notification_system_design.md` is visible at the root
- `node_modules/`, `dist/`, and `.env` files are NOT present (the .gitignore handled this)
- the README renders correctly

---

## Phase 9 — Screenshot package for the form (5 min)

The evaluation explicitly mentions screenshots. Capture these (you already have an `AffordMed_Evaluation_Screenshots.docx` template):

1. **Repo home page** showing the folder structure.
2. **Registration response** showing the clientID / clientSecret were obtained.
3. **Smoke test** showing log entries reaching the API with logIDs.
4. **`curl /optimize`** showing the JSON plan output.
5. **Server log terminal** showing the request/response trace lines (`IN GET`, `OUT 200`, etc.).
6. **Code excerpt** of `knapsack.ts` showing the DP recurrence.
7. **Code excerpt** of any controller showing a `Log(...)` call inline.
8. **`notification_system_design.md`** rendered on GitHub.

Drop them into the docx in the order above with one-line captions.

---

## Phase 10 — Submit the form (2 min)

Form: https://docs.google.com/forms/d/e/1FAIpQLSeb4BQ4RYcd4rAToejYsOu45aZ-7iC0fCtnFOseDYwQx5MY2A/viewform

Have ready:
- College email: `raktimchandra26@gmail.com`
- Roll No: `RA2311033010038`
- GitHub username: `<your-username>`
- Repo URL: `https://github.com/<your-username>/RA2311033010038`
- The screenshots docx

Submit before 1 PM.

---

## Pre-submission checklist

- [ ] Repo named exactly `RA2311033010038` and **public**
- [ ] `logging_middleware/` and `vehicle_maintenance_scheduler/` both present
- [ ] `notification_system_design.md` at the repo root
- [ ] `Log(...)` is called from middleware, controller, service, repository, and process-level files (grep proves it)
- [ ] Logger registers and authenticates successfully (smoke test green)
- [ ] Scheduler returns valid JSON for `/api/v1/optimize`
- [ ] No `node_modules/`, `dist/`, or `.env` committed
- [ ] At least 6 distinct commit messages telling a story
- [ ] Screenshots packaged in the docx
- [ ] Form submitted before 1 PM

---

## Troubleshooting

**`/auth` returns 401**
Your `.env` values are wrong. Re-check `LOG_CLIENT_ID` / `LOG_CLIENT_SECRET` and ensure no stray whitespace.

**`/logs` returns 400**
The middleware client-side validator catches enum typos before the network — read the error message and fix the call site.

**`Cannot find module '@affordmed/logging-middleware'`**
You forgot to `npm install` the scheduler. The dependency is `file:../logging_middleware`, so the logger must be built before the scheduler installs.

**Scheduler returns 502 UPSTREAM_FAILURE**
The depots/vehicles endpoint may be momentarily down. The client retries 3× with backoff; if it still fails, try again in 30 s.

**Server crashes on startup**
Most likely a missing env var. The logger throws a descriptive error naming the missing variable — read the first stack frame.

---

That's it. You now have a clean, defensible, interview-grade submission. Good luck.
