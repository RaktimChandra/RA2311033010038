# Logging Middleware

A reusable, production-grade TypeScript logging client for the **AffordMed Evaluation Service**. It authenticates, refreshes tokens, validates payloads against the official enums, and ships structured logs to `POST /evaluation-service/logs`.

This package is consumed by `vehicle_maintenance_scheduler` and is designed to be drop-in for any other backend service in the same evaluation.

## Why this exists

The evaluation makes logging integration mandatory: every meaningful operation must call `Log(stack, level, package, message)`. Hand-rolling that call site-by-site invites mistakes — invalid enums, missing auth, expired tokens, no retries. This package centralises all of it behind a one-line API.

## Features

- Singleton `Log()` function matching the spec exactly.
- Auto-authentication against `POST /evaluation-service/auth`.
- Lazy token caching with proactive refresh and 401 retry.
- Strict client-side validation for `stack`, `level`, and `package` enums.
- Exponential-backoff retries on network and 5xx errors via `axios-retry`.
- Never throws from `Log()` — failures are mirrored to stderr so logging cannot crash the host service. Use `Logger.logStrict` if you need throwing behaviour.
- Fully typed; ships `.d.ts` files.

## Install

This package is consumed locally in the monorepo. From any sibling project:

```bash
npm install ../logging_middleware
```

Or run a local build first if needed:

```bash
cd logging_middleware
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and fill in the credentials returned by `POST /evaluation-service/register`:

```
LOG_API_BASE_URL=http://20.207.122.201/evaluation-service
LOG_CLIENT_ID=<from /register>
LOG_CLIENT_SECRET=<from /register>
LOG_EMAIL=raktimchandra26@gmail.com
LOG_NAME=Raktim Chandra
LOG_ROLL_NO=RA2311033010038
LOG_ACCESS_CODE=QkbpxH
```

## Usage

```ts
import { Log } from '@affordmed/logging-middleware';

await Log('backend', 'info', 'service', 'Fetching vehicles');
await Log('backend', 'error', 'db', 'Vehicle API failed: connection reset');
await Log('backend', 'fatal', 'handler', 'Unhandled exception in /optimize');
```

### Allowed enums

| Field    | Allowed values |
|----------|----------------|
| `stack`  | `backend`, `frontend` |
| `level`  | `debug`, `info`, `warn`, `error`, `fatal` |
| `package` (backend) | `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service`, `auth`, `config`, `middleware`, `utils` |

Anything else is rejected client-side with `LoggerValidationError`.

## Architecture

```
src/
├── auth/tokenManager.ts   # bearer-token lifecycle, refresh, single-flight
├── config/index.ts        # env loader with strict validation
├── constants/index.ts     # frozen enum lists from the spec
├── services/logService.ts # POST /logs with 401-retry
├── types/index.ts         # public types + typed errors
├── utils/httpClient.ts    # axios instance with retry interceptor
├── utils/validator.ts     # client-side payload validation
├── logger.ts              # public Logger class + Log() facade
└── index.ts               # barrel export
```

## Smoke test

```bash
npm run test:smoke
```

Sends one log of every level. Each successful call prints its `logID`.

## Notes on resilience

- Concurrent refreshes are deduped via a single in-flight promise — no thundering herd against `/auth`.
- 4xx errors are not retried; they indicate a bug in the caller and should fail fast.
- The default `Log()` is intentionally non-throwing so a logging outage cannot take down the optimizer.
