# URL Shortener: v1 Performance Report

URL Shortener is a service that shortens long URLs into shorter, more manageable links.

**Current version (v1):**

| Feature | Status |
|---|---|
| Authentication | None |
| Indexing | None beyond the `UNIQUE` constraint on `short_code` (which creates an index) |
| Rate limiting | None |
| Cache | None |
| Redirection | None (`GET /:id` returns JSON) |

## 1. Test setup

| Item | Value |
|---|---|
| Tool | autocannon 8.0.0 (`pnpm exec autocannon`) |
| Runner | `node reports/loadtest.mjs <get\|all\|post>` |
| Topology | Load generator, Node server (port 4000) and Postgres on the same machine (16 cores) |
| Stack | Express 5, drizzle-orm, `pg` |
| autocannon request timeout | 10 s (the default). Requests over 10 s count as errors/timeouts |
| Raw output | `reports/raw/get-2026-09-25T20-48-27-639Z.md`, `reports/raw/post-2026-09-25T21-15-01-491Z.md`, `reports/raw/all-2026-09-25T21-29-42-104Z.md` |

**Routes tested**

| Route | What it does | Load target |
|---|---|---|
| `GET /api/v1/shorten/:id` | One indexed lookup by `short_code`, returns one row | `2sMySa8` |
| `GET /api/v1/shorten` | `select *` on the whole table, no pagination | n/a |
| `POST /api/v1/shorten` | Validates the body, inserts one row, returns it | `{"url":"https://example.com/load-test","title":"lt"}` |

**Test types**

| Test | Purpose | Parameters |
|---|---|---|
| Concurrency | Steady load at fixed connection counts | c=100, 1000, 10000, 60 s each |
| Ramp-up | Find where latency starts to degrade | c=10, 50, 100, 250, 500, 1000, 20 s per stage |
| Sustained | Detect leaks or degradation over time | c=100, 300 s |
| Spike | Sudden jump in traffic, then recovery | 100 rps (15 s), 10,000 rps (30 s), 100 rps (15 s) |
| Stress | Push past capacity to find the breaking point | c=2000, 5000, 10000, 20000, 30 s each |
| Other | Pipelining and fixed-rate runs | `-p 10` at c=100, `-R 500` at c=100 |

**Database state during the runs.** Runs were executed in the order `GET /:id` (about 17.5k rows in the table), then `POST` (which grew the table to **4,112,317 rows**), then `GET /`. Lookups by `short_code` use an index, so the `GET /:id` numbers are not sensitive to row count. `GET /` is (section 6).

## 2. Baseline (initial run, 30 s per run)

`GET /api/v1/shorten/:id`, `npx autocannon -c <N> -d 30 http://localhost:4000/api/v1/shorten/2sMySa8`

| Connections | Req/s avg | Req/s min | Bytes/s avg | Bytes/s min | Lat avg | Lat max |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 18,961.2 | 15,737 | 9.58 MB | 7.95 MB | 0.02 ms | 12 ms |
| 50 | 17,418.94 | 15,766 | 8.8 MB | 7.96 MB | 2.33 ms | 17 ms |
| 100 | 16,412.54 | 14,732 | 8.29 MB | 7.44 MB | 5.64 ms | 31 ms |
| 1000 | 13,678.67 | 12,854 | 6.91 MB | 6.49 MB | 72.57 ms | 178 ms |
| 10000 | 13,186.87 | 5,931 | 6.66 MB | 3 MB | 751.69 ms | 3,011 ms |

## 3. Results

Latencies are in milliseconds. "Errors" are autocannon errors (mostly 10 s timeouts). No run returned a non-2xx status.


### 3.1 Concurrency (60 s per run)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | c=100 | 17,624 | 1,057,420 | 5.33 ms | 5 ms | 7 ms | 40 ms | 0 |
| GET /:id | c=1000 | 13,398 | 803,820 | 74.12 ms | 73 ms | 91 ms | 158 ms | 0 |
| GET /:id | c=10000 | 13,556 | 813,355 | 734 ms | 729 ms | 910 ms | 1,332 ms | 0 |
| POST / | c=100 | 9,528 | 571,649 | 10 ms | 10 ms | 16 ms | 49 ms | 0 |
| POST / | c=1000 | 8,852 | 531,097 | 112 ms | 111 ms | 135 ms | 184 ms | 0 |
| POST / | c=10000 | 4,323 | 259,353 | 1,399 ms | 1,149 ms | 4,212 ms | 9,809 ms | 19,943 (7.1%) |

### 3.2 Ramp-up (20 s per stage, 10 → 50 → 100 → 250 → 500 → 1000)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | c=10 | 17,737 | 354,730 | 0.03 ms | 0 ms | 1 ms | 89 ms | 0 |
| GET /:id | c=50 | 18,723 | 374,487 | 2.16 ms | 2 ms | 4 ms | 8 ms | 0 |
| GET /:id | c=100 | 17,185 | 343,677 | 5.37 ms | 5 ms | 7 ms | 20 ms | 0 |
| GET /:id | c=250 | 15,768 | 315,369 | 15.38 ms | 15 ms | 20 ms | 47 ms | 0 |
| GET /:id | c=500 | 14,840 | 296,796 | 33.17 ms | 33 ms | 41 ms | 89 ms | 0 |
| GET /:id | c=1000 | 13,574 | 271,483 | 73.1 ms | 72 ms | 87 ms | 145 ms | 0 |
| POST / | c=10 | 538 | 10,765 | 8.61 ms | 1 ms | 2 ms | 8,114 ms | 10 (0.1%) |
| POST / | c=50 | 3,381 | 67,614 | 12.29 ms | 4 ms | 217 ms | 3,655 ms | 0 |
| POST / | c=100 | 2,827 | 56,544 | 34.86 ms | 17 ms | 436 ms | 4,048 ms | 0 |
| POST / | c=250 | 9,390 | 187,783 | 26.12 ms | 26 ms | 36 ms | 57 ms | 0 |
| POST / | c=500 | 9,145 | 182,906 | 54.12 ms | 53 ms | 77 ms | 110 ms | 0 |
| POST / | c=1000 | 495 | 9,897 | 995 ms | 131 ms | 7,038 ms | 9,981 ms | 972 (8.9%) |

> POST stages c=10, 50, 100 and 1000 are affected by multi-second stalls (max latency 3.7-8.1 s), not by load. See [section 5](#5-post-analysis).

### 3.3 Sustained load (5 min, c=100)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | c=100 | 17,312 | 5,193,666 | 5.37 ms | 5 ms | 7 ms | 18 ms | 0 |
| POST / | c=100 | 4,246 | 1,273,529 | 22.81 ms | 17 ms | 104 ms | 9,987 ms | 30 (0.0%) |

### 3.4 Spike (100 rps → 10,000 rps → 100 rps)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | baseline (target 100 rps) | 100 | 1,500 | 3.7 ms | 3 ms | 14 ms | 15 ms | 0 |
| GET /:id | peak (target 10,000 rps) | 10,002 | 300,043 | 35.29 ms | 34 ms | 77 ms | 163 ms | 0 |
| GET /:id | recovery (target 100 rps) | 100 | 1,500 | 3.76 ms | 3 ms | 11 ms | 12 ms | 0 |
| POST / | baseline (target 100 rps) | 100 | 1,500 | 146 ms | 123 ms | 454 ms | 531 ms | 0 |
| POST / | peak (target 10,000 rps) | 8,740 | 262,193 | 57.79 ms | 57 ms | 123 ms | 183 ms | 0 |
| POST / | recovery (target 100 rps) | 100 | 1,500 | 6.11 ms | 6 ms | 17 ms | 20 ms | 0 |

### 3.5 Stress (30 s per run, increasing connections)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | c=2000 | 13,463 | 403,874 | 148 ms | 145 ms | 177 ms | 302 ms | 0 |
| GET /:id | c=5000 | 13,551 | 406,520 | 367 ms | 360 ms | 467 ms | 662 ms | 0 |
| GET /:id | c=10000 | 13,281 | 398,408 | 746 ms | 731 ms | 1,242 ms | 1,447 ms | 0 |
| GET /:id | c=20000 | 10,640 | 308,537 | 1,948 ms | 1,758 ms | 6,153 ms | 9,608 ms | 556 (0.2%) |
| POST / | c=2000 | 3,897 | 116,913 | 248 ms | 227 ms | 1,135 ms | 7,568 ms | 1,990 (1.7%) |
| POST / | c=5000 | 2,837 | 85,108 | 1,223 ms | 905 ms | 6,860 ms | 9,996 ms | 4,389 (4.9%) |
| POST / | c=10000 | 8,714 | 261,376 | 1,131 ms | 1,119 ms | 1,578 ms | 1,920 ms | 0 |
| POST / | c=20000 | 187 | 5,049 | 4,039 ms | 4,074 ms | 4,135 ms | 6,468 ms | 45,866 (90.1%) |

### 3.6 Other (pipelining and fixed rate)

| Route | Load | Req/s (avg) | Total reqs | Lat avg | p50 | p99 | Max | Errors (timeouts) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GET /:id | pipelining x10, c=100 | 13,436 | 403,077 | 73.85 ms | 69 ms | 106 ms | 770 ms | 0 |
| GET /:id | fixed 500 rps, c=100 | 500 | 15,000 | 3.61 ms | 3 ms | 10 ms | 17 ms | 0 |
| POST / | pipelining x10, c=100 | 2,344 | 70,308 | 283 ms | 175 ms | 7,502 ms | 7,618 ms | 1,000 (1.4%) |
| POST / | fixed 500 rps, c=100 | 500 | 15,000 | 5.65 ms | 5 ms | 13 ms | 18 ms | 0 |


## 4. `GET /:id` analysis

| Observation | Evidence |
|---|---|
| Ceiling of about 17-18k req/s | 18,723 at c=50, 17,624 at c=100, 17,312 sustained over 5 min |
| Throughput drops about 25% past 100 connections, then stays flat | 13.4-13.6k req/s from c=1000 to c=10000; more connections add no capacity |
| Latency scales with connections (Little's law) | about 0.07 ms per connection: 5.3 ms at c=100, 74 ms at c=1000, 734 ms at c=10000 |
| Pipelining behaves like extra connections | `-c 100 -p 10` (1000 in flight) gives 13.4k req/s, 74 ms, matching c=1000 |
| Stable over time | 5.19M requests in 5 min, p99 7 ms, 0 errors |
| Handles a 100x spike | 10,002 req/s achieved with 35 ms avg and 0 errors; recovery latency back to 3.8 ms |
| Breaking point at c=20000 | Throughput falls to 10.6k req/s, p99 6.2 s, 556 timeouts; no failures at c=10000 or below |
| Consistent with the initial baseline | c=100: 17.6k vs 16.4k; c=1000: 13.4k vs 13.7k; c=10000: 13.6k vs 13.2k |

The ceiling is what a single Node event loop doing one Postgres round trip per request can serve. Past about 100 concurrent requests, extra clients only wait in the queue, so latency rises while throughput stays flat.

## 5. POST analysis

| Observation | Evidence |
|---|---|
| Healthy write ceiling of about 9-9.5k req/s | c=100: 9,528; c=250: 9,390; c=500: 9,145; c=1000: 8,852, all with 0 errors |
| About half the read throughput, about twice the latency | c=100: 9.5k vs 17.6k req/s; 10 ms vs 5.3 ms |
| Performance is bimodal, not load-driven | Some runs hit about 9k req/s; others stall for 4-10 s with no relation to concurrency (below) |
| Failed to sustain a spike to 10k rps | Achieved 8,740 req/s (87%), 58 ms avg, 0 errors. Recovery was fast (6 ms) |
| Not stable over 5 minutes | 4,246 req/s avg (vs 9.5k in the 60 s run), 30 timeouts, max latency 9,987 ms |
| Hard collapse at c=20000 | 187 req/s, 45,866 errors (about 90% of attempts) |
| Clean at a fixed 500 rps | 0 errors, 5.65 ms avg, p99 13 ms |

**Runs that stalled** (all show max latency of 3.6-10 s, close to the 10 s timeout):

| Run | Req/s | Max latency | Errors |
|---|---:|---:|---:|
| Ramp c=10 | 538 | 8,114 ms | 10 |
| Ramp c=50 | 3,381 | 3,655 ms | 0 |
| Ramp c=100 | 2,827 | 4,048 ms | 0 |
| Ramp c=1000 | 495 | 9,981 ms | 972 |
| Sustained c=100 | 4,246 | 9,987 ms | 30 |
| Stress c=2000 | 3,897 | 7,568 ms | 1,990 |
| Stress c=5000 | 2,837 | 9,996 ms | 4,389 |
| Pipelining x10 | 2,344 | 7,618 ms | 1,000 |

The pattern is not monotonic in load. c=10 stalled while c=250 and c=500 were clean, and c=10000 (8,714 req/s, 0 errors) was healthier than c=2000 and c=5000. The stalls therefore look like pauses in the database, not lack of server capacity. The likely causes are checkpoints or WAL flushes, autovacuum, and growth of the `short_code` unique index as the table went from 17.5k to 4.1M rows. **This is a hypothesis; it was not verified** (no Postgres metrics or logs were captured). Each request inserts one row and retries up to 3 times on error, and the larger runs write up to about 570k rows each.

## 6. `GET /` (list all): invalid results

| Fact | Detail |
|---|---|
| Result | 0 successful responses in all 19 runs; millions of connection errors per run (for example 1,002,125 errors in the first 60 s run) |
| Server state after the runs | Not reachable (`curl` returned status 000, connection refused) |
| Table size | 4,112,317 rows (after the POST runs) |
| Route behaviour | `select *` with no `LIMIT` and no pagination, then `JSON.stringify` of every row |

These runs do not measure performance and are **not** included in the summary tables. The most likely cause is that the first request tried to load and serialise about 4.1M rows and took down the server. At about 134 bytes per row (2.36 MB for 17.5k rows), the response would be about 550 MB, which is near or above the V8 maximum string length. **The crash cause is unconfirmed**; check the server logs.

Even on a small table this route does not scale: its cost grows linearly with table size, and every request holds the whole result set in memory. It needs pagination before it can be load tested meaningfully.

## 7. Summary

### 7.1 Route comparison

| Metric | `GET /:id` | `POST /` | `GET /` |
|---|---|---|---|
| Peak throughput (healthy) | 18,723 req/s (c=50) | 9,528 req/s (c=100) | n/a (invalid) |
| Latency at c=100 (avg / p99) | 5.3 ms / 7 ms | 10 ms / 16 ms | n/a |
| Latency at c=1000 (avg / p99) | 74 ms / 91 ms | 112 ms / 135 ms | n/a |
| Sustained 5 min at c=100 | 17,312 req/s, 0 errors | 4,246 req/s, 30 timeouts | n/a |
| Spike to 10,000 rps | Held (10,002 req/s, 35 ms) | Reached 8,740 req/s (87%), 58 ms | n/a |
| Breaking point | c=20000 (556 timeouts) | c=20000 (about 90% errors); erratic stalls at lower loads | Server down |
| Clean up to | c=10000 | c=1000 in steady runs, but stalls appear at any load | n/a |
| Stability | Stable | Erratic (multi-second stalls) | n/a |

### 7.2 Capacity by connection count

| Connections | `GET /:id` req/s | `GET /:id` avg latency | `POST /` req/s | `POST /` avg latency |
|---:|---:|---:|---:|---:|
| 10 | 17,737 | 0.03 ms | 538 (stalled) | 8.6 ms |
| 50 | 18,723 | 2.16 ms | 3,381 (stalled) | 12.3 ms |
| 100 | 17,185 | 5.37 ms | 2,827 (stalled) | 34.9 ms |
| 250 | 15,768 | 15.38 ms | 9,390 | 26.1 ms |
| 500 | 14,840 | 33.17 ms | 9,145 | 54.1 ms |
| 1000 | 13,574 | 73.10 ms | 495 (stalled) | 994.9 ms |

Ramp-up runs, 20 s each. "Stalled" rows are the runs described in section 5; the 60 s c=100 and c=1000 POST runs (9,528 and 8,852 req/s) show what those points achieve when the database does not stall.

### 7.3 Test outcome

| Test | `GET /:id` | `POST /` | `GET /` |
|---|---|---|---|
| Concurrency (100 / 1000 / 10000) | Pass | c=100, 1000 pass; c=10000 degraded (4.3k req/s, 19,943 timeouts) | Invalid |
| Ramp-up | Pass, smooth degradation | Erratic (4 of 6 stages stalled) | Invalid |
| Sustained 5 min | Pass | Degraded (30 timeouts, 10 s stalls) | Invalid |
| Spike | Pass | Partial (87% of target rate) | Invalid |
| Stress | Fails only at c=20000 | Fails at c=2000, 5000 and 20000 | Invalid |
| Pipelining x10 | Pass (13.4k req/s) | Degraded (1,000 timeouts) | Invalid |
| Fixed 500 rps | Pass | Pass | Invalid |

## 8. Conclusion

- **Reads (`GET /:id`) are solid for v1.** They deliver about 17-18k req/s, stay stable for 5 minutes, absorb a 100x spike without errors, and only fail at 20,000 concurrent connections. The limit is one Node process and one query per request, not a defect.
- **Writes (`POST /`) are usable but not reliable.** The healthy ceiling is about 9-9.5k req/s, but runs at almost any concurrency can stall for several seconds and hit the 10 s timeout. This is the main risk in v1. The cause is not verified, and the database is the prime suspect.
- **`GET /` is unbounded and broke the service.** With 4.1M rows the route cannot serve a request, and the server stopped responding during the run. It has to be paginated before it goes anywhere near production.
- **No route is protected.** There is no rate limiting, no auth and no cache, so any client can push the service to its breaking point, and one heavy request (`GET /`) can take the process down.
- **Realistic operating range on this machine:** up to about 100 concurrent connections gives the best latency (5-10 ms); up to about 1000 is acceptable (about 75 ms for reads); beyond that only queueing latency increases.

## 9. Recommendations for v2

| Priority | Change | Why |
|---|---|---|
| 1 | Add pagination (`limit`, cursor) to `GET /`, and a hard cap on page size | The route is unbounded and took the server down |
| 2 | Capture Postgres metrics during POST runs (`pg_stat_bgwriter`, checkpoint logs, autovacuum, pool wait) and confirm the stall cause | The stalls are unexplained |
| 3 | Add a cache (Redis or in-memory LRU) for `GET /:id` | Removes the database round trip from the read path |
| 4 | Tune the `pg` pool size and Postgres write settings; consider batching inserts | Writes are half the read throughput and unstable |
| 5 | Run multiple Node processes (cluster or PM2) | One event loop caps reads at about 18k req/s |
| 6 | Add rate limiting and request timeouts | Prevents any single client from reaching the breaking point |
| 7 | Rerun this suite with the load generator on a separate machine, on a database of realistic size | Numbers here share CPU with the server and Postgres |

## Appendix: reproducing

```bash
node reports/loadtest.mjs get              # about 17 min
node reports/loadtest.mjs post             # writes millions of rows
CONC="100 1000" STRESS="2000" node reports/loadtest.mjs all
node reports/loadtest.mjs get spike        # run a single suite
```

Run `post` after the read tests, and clean up test rows afterwards (`delete from urls where id > 7`). The suite names are `conc`, `ramp`, `sustained`, `spike`, `stress` and `other`. Output is saved to `reports/raw/`.
