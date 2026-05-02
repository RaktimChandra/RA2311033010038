# Notification System — Design Document

**Author:** Raktim Chandra · Roll No: RA2311033010038
**Scope:** A production-grade, horizontally scalable notification platform that delivers Placement, Event, and Result notifications to ~50,000+ students with strict reliability and latency SLOs.

This document answers all five evaluation stages.

---

## Stage 1 — REST API Design and Realtime Architecture

### 1.1 Resource Model

A `Notification` is the atomic unit:

```json
{
  "id": "uuid-v4",
  "studentId": "1042",
  "type": "Placement",
  "title": "TCS hiring drive — Apply by May 5",
  "message": "TCS is hiring for SDE-1. Eligibility: CGPA >= 7.0 ...",
  "metadata": { "company": "TCS", "deadline": "2026-05-05" },
  "isRead": false,
  "createdAt": "2026-05-02T07:42:11.123Z",
  "readAt": null
}
```

`type` is an enum: `Placement | Event | Result`. `metadata` is type-specific JSON.

### 1.2 Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/notifications` | Service-to-service (mTLS or signed JWT) | Publish a notification (single or fan-out) |
| `GET`  | `/api/v1/notifications/students/:studentId` | Student JWT | List a student's notifications, paginated |
| `GET`  | `/api/v1/notifications/:id` | Student JWT (owner only) | Fetch one notification |
| `PATCH`| `/api/v1/notifications/:id/read` | Student JWT | Mark a single notification read |
| `PATCH`| `/api/v1/notifications/students/:studentId/read-all` | Student JWT | Bulk mark read with a filter |
| `DELETE`| `/api/v1/notifications/:id` | Student JWT | Soft-delete (sets `deletedAt`) |
| `GET`  | `/api/v1/notifications/students/:studentId/unread-count` | Student JWT | Cheap badge counter |

### 1.3 Request Contracts

`POST /api/v1/notifications` accepts either a single recipient or a target group:

```json
{
  "type": "Placement",
  "title": "TCS hiring drive",
  "message": "...",
  "metadata": { "company": "TCS" },
  "target": {
    "kind": "GROUP",
    "filter": { "department": "CSE", "year": 2026 }
  },
  "idempotencyKey": "tcs-2026-05-02"
}
```

`idempotencyKey` is mandatory for producers. The service deduplicates by `(producerId, idempotencyKey)` so retried publishes never fan out twice.

### 1.4 Pagination

All list endpoints use cursor pagination, not offsets — `OFFSET N` is `O(N)` on a hot table.

```
GET /api/v1/notifications/students/1042?limit=20&cursor=eyJjcmVhdGVkQXQi...
→
{
  "items": [ ... ],
  "nextCursor": "eyJjcmVhdGVkQXQi..."
}
```

The cursor encodes `(createdAt, id)` so the index can resolve the next page in `O(log n)`.

### 1.5 Realtime Delivery

Three delivery channels run in parallel:

1. **WebSocket (primary, in-app):** authenticated socket per logged-in student, brokered by a stateless WebSocket gateway behind a load balancer with sticky sessions or a Redis pub/sub fan-out.
2. **Push notifications (mobile):** FCM / APNs workers subscribe to a Kafka topic.
3. **Email (best-effort fallback):** SES / SendGrid worker, throttled.

```
Producer
   │
   ▼
POST /notifications (validates, dedupes, persists row in `pending` state)
   │
   ▼
Kafka topic: notifications.created
   │
   ├──► WebSocket fan-out worker  ──► gateway ──► browser
   ├──► Push worker               ──► FCM / APNs ──► mobile
   └──► Email worker              ──► SES        ──► inbox
```

### 1.6 Auth Strategy

- **Producers** (placement portal, exam service, calendar service) authenticate via mTLS or asymmetric JWT signed by the issuer's private key — verified by the API gateway.
- **Consumers** (students) authenticate with short-lived access JWTs and refresh tokens.
- Authorisation: every read/write checks `jwt.studentId === path.studentId`. Service-to-service tokens carry a `producer` claim and are not allowed to read student-owned reads.

### 1.7 Idempotency and Ordering

- Producer idempotency: `(producerId, idempotencyKey)` unique constraint at the DB layer, plus a Redis SETNX for a fast-path reject before write.
- Consumer ordering: notifications carry a monotonically increasing `createdAt` and a UUID for stable tie-breaking. Clients sort by `(createdAt DESC, id DESC)`.

---

## Stage 2 — Database Choice and Scaling

### 2.1 SQL vs NoSQL

| Dimension | PostgreSQL | MongoDB / DynamoDB |
|-----------|-----------|--------------------|
| Schema flexibility (per-type metadata) | Possible via `JSONB` but indexes get heavy | Native document model |
| Write throughput at 50k–500k notifications/event | Vertical scale → bottleneck | Horizontal sharding native |
| Read pattern (single student feed) | Excellent with the right index | Excellent with shard key on `studentId` |
| Aggregations & reporting | First-class SQL | Weaker |
| Operational maturity | Battle-tested | Battle-tested |

**Decision:** **MongoDB** as the primary store for notifications, **PostgreSQL** as a secondary OLTP store for users / catalogues. Reasoning:

- The dominant access pattern is "give me notifications for student X, newest first" — Mongo with a shard key on `studentId` answers this in `O(log n)` per shard with no fan-out.
- Writes are bursty (placement drive at T0 creates 50k inserts in seconds). Mongo's tunable write concern + sharded inserts give us the headroom; a single Postgres primary would saturate.
- Per-type metadata varies (placement has `company`, result has `subject`, event has `venue`) — `JSONB` works in Postgres but queries on those keys require expression indexes per type.

For very-large-scale history (>1B rows, multi-year retention) we would consider **Cassandra** or **DynamoDB** with `(studentId, createdAt DESC)` as the partition+sort key.

### 2.2 Sharding and Partitioning

- Shard key: **`studentId`**. This co-locates a student's entire history on one shard, so the feed query never fans out.
- Hot-shard mitigation: hash-based sharding (not range), so a popular cohort doesn't pile onto one shard.
- Time-based partitioning per shard: a rolling collection per quarter (`notifications_2026Q2`) kept hot, older quarters moved to cold storage. Queries union only the relevant partitions.

### 2.3 Replication and Durability

- Replica set per shard, 3 nodes (1 primary + 2 secondaries) across availability zones.
- Reads of student feed go to nearest secondary with `readPreference=secondaryPreferred` and `maxStaleness=10s` — the user does not perceive 10 s of staleness on a notification list.
- Writes use `w=majority` with `journaling=true`. We cannot lose a placement notification.

### 2.4 Caching

- **Redis** in front of the unread-count endpoint per student (`unread:{studentId}`). Counter is incremented on insert and decremented on read-mark via a Lua script for atomicity.
- TTL of 60 s on full-feed reads keyed by `(studentId, cursor)` — protects the DB during stampedes.

---

## Stage 3 — Query Optimisation

### 3.1 The Problem Query

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
  AND isRead = false
ORDER BY createdAt DESC;
```

A naive table scan is `O(n)`. A single-column index on `studentID` narrows the range but the engine still has to filter by `isRead` and sort by `createdAt`.

### 3.2 The Right Index

Add **one compound index**, ordered to match the query:

```sql
CREATE INDEX idx_notifications_student_unread_recent
ON notifications (studentID, isRead, createdAt DESC);
```

Why this exact order:
1. `studentID` first — equality on the highest-cardinality dimension.
2. `isRead` second — equality on a boolean filter.
3. `createdAt DESC` last — the sort order, satisfied without a secondary sort step.

The engine now seeks straight to the contiguous slice `(1042, false, *)` and walks it in pre-sorted order.

| | Before | After |
|--|--------|-------|
| Algorithmic complexity | `O(n)` scan + `O(k log k)` sort | `O(log n + k)` |
| Behaviour at 10M rows | Full scan | Index range scan over k matching rows |

### 3.3 Why "Add Indexes Everywhere" is Wrong

Indexes are not free. Every additional index:
- Slows every `INSERT` / `UPDATE` (each index gets re-balanced).
- Consumes memory in the buffer pool — a hot index that doesn't fit RAM is worse than no index.
- Bloats the WAL / oplog — replication and backups grow.
- Confuses the query planner; the planner can pick a worse index than the one you intended.

**Rule of thumb:** add an index only after you can name the exact slow query it serves. Compound indexes that satisfy multiple queries are preferred over many single-column indexes.

### 3.4 Other Optimisations on this Endpoint

- **Covering index:** add `INCLUDE (id, type, title, createdAt)` (Postgres) so the engine never has to visit the heap.
- **Pagination via cursor:** never `OFFSET`. Cursor `(createdAt, id)` lets the index seek directly.
- **Read replicas** for the feed query.
- **Materialised unread counter** in Redis avoids hitting the DB for a UI badge that updates on every page load.

---

## Stage 4 — High Load Architecture

Target SLO: **p99 < 250 ms** for read endpoints, **publish-to-deliver < 5 s** for 95 % of recipients during a 50 k-recipient burst.

### 4.1 Topology

```
                ┌─────────────┐
                │   CDN /     │  (static assets, edge cache for public notices)
                │ Edge Cache  │
                └──────┬──────┘
                       ▼
                ┌─────────────┐
                │ API Gateway │  (TLS, JWT verify, rate limit, request id)
                └──────┬──────┘
                       ▼
        ┌──────────────────────────────┐
        │     Notification Service     │  (stateless, autoscaled)
        │  ─ writes go to Kafka ─      │
        └──────┬─────────────────┬─────┘
               │                 │
       ┌───────▼──────┐   ┌──────▼──────┐
       │ Redis Cache  │   │ Mongo Shards│
       │ (counters,   │   │  (sharded   │
       │  hot reads)  │   │  by studentId)│
       └──────────────┘   └─────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   Kafka Bus    │
              └─┬────┬────┬────┘
                │    │    │
        ┌───────▼─┐ ┌▼──┐ ┌▼─────────────┐
        │ WS Fan- │ │FCM│ │ Email Worker │
        │ out     │ │/APNS│└──────────────┘
        └─────────┘ └───┘
```

### 4.2 What Each Layer Does

- **CDN:** caches public, non-personalised content (e.g. read-only event announcements).
- **API Gateway:** terminates TLS, verifies JWT, applies per-token and per-IP token-bucket rate limits, attaches a request-id used by the logging middleware.
- **Notification Service:** stateless containers behind a Kubernetes HPA. Reads come from Redis → Mongo. Writes persist + publish to Kafka in the same transaction (via the **transactional outbox** pattern) so we never publish without persisting.
- **Kafka:** decouples publish from delivery. Partitions keyed by `studentId` so a student's notifications stay in order and a single consumer handles them.
- **WebSocket Gateway:** stateless front, sticky-session via consistent hashing; gateway-to-gateway pub/sub through Redis so a notification arriving at gateway A reaches a student connected to gateway B.
- **FCM / Email workers:** independent consumer groups, scaled per provider quota.

### 4.3 Specific Techniques

- **Transactional outbox** prevents the classic "wrote to DB, crashed before publishing to Kafka" bug. A separate process tails the outbox table and publishes.
- **Backpressure:** every consumer commits offsets manually. Slow workers do not block fast ones because they have separate consumer groups.
- **Rate limiting:** sliding-window in Redis, 60 req/min per student, 10 req/sec per producer.
- **Caching:** unread count, last-page feed, and notification-by-id are all in Redis with explicit invalidation on write.
- **Pagination:** cursor-based everywhere.
- **Connection limits:** WebSocket gateway caps 50k connections per node; LB autoscaling provisions more nodes before saturation.

---

## Stage 5 — Mass Notification Redesign (50,000 Users)

### 5.1 What's Wrong with the Naive Code

```python
for student in students:        # sequential loop
    send_email(student)         # blocking I/O
    save_db(student)            # blocking I/O
    push_notification(student)  # blocking I/O
```

| Problem | Why it matters |
|---------|----------------|
| Sequential | 50k × ~200 ms ≈ 167 minutes per blast |
| Blocking | One slow SMTP call freezes the whole loop |
| No retries | One failure → user silently misses the notification |
| No idempotency | Crash mid-loop means re-runs double-deliver |
| Failure propagation | DB hiccup kills the loop, even though email worked |
| No observability | Cannot tell which 12 students didn't get the email |

### 5.2 The Redesign

```
Producer
   │  POST /notifications  { target: { kind: "GROUP", filter: {...} } }
   ▼
Notification Service
   │ 1. Resolve filter → studentId list (chunked, streamed)
   │ 2. Persist parent envelope (idempotencyKey)
   │ 3. Publish N child events to Kafka  notifications.created
   ▼
┌────────────────── Kafka ──────────────────┐
│ topic: notifications.created (N partitions)│
└──┬────────────┬─────────────┬──────────────┘
   │            │             │
   ▼            ▼             ▼
 DB Worker   Email Worker   Push Worker
   │            │             │
   │ retry      │ retry       │ retry
   ▼            ▼             ▼
 Mongo        SES/SG         FCM/APNs
   │            │             │
   └─── on permanent failure ──► DLQ topic ──► alerting + ops dashboard
```

### 5.3 Properties

- **Asynchronous and parallel:** workers consume in parallel; each partition is one logical worker.
- **Batched DB writes:** the DB worker uses `bulkWrite()` of 500 docs per batch; 50k inserts → 100 round-trips, not 50,000.
- **Per-channel retry policy:** exponential backoff with jitter, 5 attempts. Email worker treats SMTP 4xx as permanent and 5xx as retryable; FCM treats `Unregistered` as permanent.
- **Dead-letter queue:** anything that exhausts retries lands in `notifications.dlq` for manual replay. Operators get an alert when DLQ depth > threshold.
- **Idempotency:** every child event carries `(parentNotificationId, studentId, channel)` as a unique key. A re-delivered Kafka message becomes a no-op upsert in Mongo and a guarded send in the email/push worker.
- **Eventual consistency:** the producer gets `202 Accepted` immediately with a `parentNotificationId`; a `GET /notifications/parents/:id` returns delivery progress (counts of delivered / failed / pending).
- **Observability:** every step calls our logging middleware (`Log("backend", "info", "service", ...)`). A request-id flows from the inbound HTTP call through Kafka headers to every worker — making "why didn't student 1042 get notified?" trivially traceable.
- **Cost control:** workers autoscale on Kafka lag, not on CPU. Empty queue → scale to zero replicas.

### 5.4 Worked Capacity Calculation

Suppose 50,000 students, three channels (DB write, push, email), 20-partition Kafka topic, 200 ms p95 per worker invocation.

```
work units = 50,000 × 3 = 150,000
parallelism = 20 partitions × 3 worker pools = effectively 60 in-flight calls
time ≈ ceil(150,000 / 60) × 200 ms ≈ 500 s ≈ 8.3 min
```

We can drive this lower by adding partitions and workers — the design is linear in resource. Compare with the naive 167 minutes: roughly a **20× speedup** at the same hardware budget, with retries and observability added.

### 5.5 Failure Modes Covered

| Failure | Behaviour |
|---------|-----------|
| Email provider 5xx | Worker retries with backoff; DLQ after 5 attempts |
| Mongo primary failover | Worker reconnects; Kafka offset un-committed → message redelivered |
| Worker pod crash | Kafka rebalances partitions; redelivery is idempotent so no double-send |
| Producer retries the publish | Duplicate `idempotencyKey` rejected at API ingress |
| Operator pushes a bad template | Pause consumer group, fix template, resume; DLQ holds anything affected |

---

## Appendix A — Tech Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| API   | Node.js + TypeScript + Express | Fast iteration, strong types, evaluation track is Node.js |
| Validation | zod | Schema-first, error-friendly |
| Primary DB | MongoDB (sharded) | Document model + horizontal scale |
| Secondary DB | PostgreSQL | Catalogues / users / billing-grade integrity |
| Cache | Redis | Counters, hot reads, rate limits, sticky-session pub/sub |
| Bus | Apache Kafka | Durable, partitioned, replayable, mature |
| Push | FCM / APNs | Standard mobile providers |
| Email | SES / SendGrid | Throttle-aware, DLQ-friendly |
| Observability | Logging middleware → AffordMed logs API; metrics → Prometheus; traces → OpenTelemetry | Mandatory + complete |

## Appendix B — What We Explicitly Did Not Do

- **No `OFFSET` pagination.** It is `O(N)` and degrades on hot tables.
- **No "index every column."** Indexes cost on writes and memory.
- **No synchronous fan-out from the API.** It does not survive 50k recipients and ties the request lifetime to the slowest channel.
- **No fire-and-forget without DLQ.** Retries without a dead-letter end up as silent data loss.
