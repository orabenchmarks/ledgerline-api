# ADR-007: Per-key rate limiting

**Status:** accepted · **Date:** 2026-06-12

## Context

Ledgerline is exposed to partner integrations. A single misbehaving client has
twice saturated the service. We need a limit that is fair per API key, cheap
to enforce in-process, and observable by clients so they can back off.

## Decision

Rate limiting is applied **per API key**, after authentication, to every
authenticated route (never to `/health`).

- Algorithm: a **token bucket** per key. Capacity and refill depend on the key's
  tier: `free` → capacity **20**, refill **20 per 60 s**; `pro` → capacity
  **200**, refill **200 per 60 s**. Refill is continuous (fractional tokens
  accrue with time), not batched per minute.
- Every response, allowed or not, carries `X-RateLimit-Limit` (the capacity),
  `X-RateLimit-Remaining` (whole tokens left after this request, floored, never
  negative) and `X-RateLimit-Reset` (whole seconds until the bucket is full
  again, ceiled).
- A request that finds an empty bucket is rejected with **429** and body
  `{ "error": "RATE_LIMITED", "message": "..." }`, plus a `Retry-After` header
  with the whole seconds (ceiled, at least 1) until one token is available.
  Rejected requests consume nothing.
- The clock is injectable so tests never sleep; the default is `Date.now()`.

## Consequences

Buckets live in memory per process; a multi-process deployment needs a shared
store, which is out of scope for this ADR (see the roadmap). The middleware
must be added in `createApp` between authentication and the routes.
