# Recovance — Feature Reference

Everything the app does, page by page and layer by layer. For setup, see
`DATABASE_SETUP.md` and `STRAVA_SETUP.md`; for the evidence-gated insights
roadmap, see `INSIGHTS_BUILD_PLAN.md` and `docs/evidence/`.

---

## Pages

### `/` — Home
A live launchpad: what's in your database (activities, sleep nights, rides
analysed, insights live), connection status chips, first-run guidance when
empty, and one-line descriptions of every page. No demo content.

### `/dashboard`
- **Activity map** (Mapbox, dark): real route lines decoded from Strava
  polylines with a glow underlay, sport-colored start points sized by distance,
  routes/points/both toggle, a legend that doubles as a per-sport filter, rich
  popups linking to Strava, and a stat row (activities · km · elevation ·
  moving time). A flat Leaflet map is available as an alternate mode.
- **Auto-load**: cached activities render on page open, no clicks. The sync
  button fetches only date ranges never seen before.

### `/training`
- Activity calendar with per-day counts.
- Activity statistics computed from the loaded activities.
- Same auto-load + sync-new-only behaviour as the dashboard.

### `/recovery`
- **Recovery overview** (top of page): latest-night stat tiles — readiness,
  sleep hours, HRV, lowest HR, efficiency — each with a delta against the
  loaded period's median and a 14-night sparkline; a sleep-stage bar
  (deep/REM/light/awake); a clickable strip of recent nights that drives the
  detail sections; one date range and one Refresh button for the whole page.
- **Night details**: full Oura sleep record for the selected night (schedule,
  stages, vitals).
- **Readiness details**: score, temperature deviations, contributor breakdown.
- **Burnout risk analysis**: weekly scores over the selected range with an
  expandable per-week daily table, an SVG risk timeline with low/moderate/high
  zones, and summary stats. Score weights are adjustable behind an optional
  panel.
- **Advanced**: raw sleep-session lookup by Oura session id (collapsed).

### `/insights`
- **Insights Lab** — all 15 cross-source metrics (below), live ones computed
  from the database, parked ones stating exactly what data they need.
- **Oura insights**: sleep / activity / stress charts over a chosen range.
- **Strava insights**: activity analysis over the same range.
- One compact date-range row controls the sections; data loads automatically.

### `/connect`
- **Provider connections**: Strava, Oura, WHOOP — connect, disconnect,
  refresh, with per-provider status and setup hints when server credentials are
  missing. Connecting also signs you in (creates the user + session).
- **Garmin uploads**: activity and sleep CSV upload with drag-in file pickers,
  plus a **one-click "Use your saved export"** button when `Activities.csv` /
  `Sleep.csv` are found alongside the project. Re-uploads update in place.

---

## The 15 insight metrics (Insights Lab)

Status reflects the data audit; a parked metric shows its unlock path in the
app rather than a fake number.

| # | Metric | What it tells you | Status |
|---|---|---|---|
| F1 | Recovery cost | What each session type costs you the following night (HRV, RHR, deep sleep vs your own baseline) | **Live** |
| F2 | Interference index | Whether endurance work in the prior 48 h blunts strength sessions | Parked — needs ≥30 tagged strength sessions |
| F3 | Send-day gate | Flags consequence-heavy ride days when your nervous system is off | Parked — needs ring wear on ride mornings |
| F4 | Recovery latency | Hours into sleep before HRV returns to baseline — the shape a morning average hides | **Live** |
| F5 | Illness early warning | Temp + RHR + load spike, separated from normal training stress | Parked — needs ≥60 % recent ring wear |
| F6 | Rest-day audit | Whether rest days are actually restful, verified against next-night HRV | **Live** |
| F7 | Descent skill score | Braking events/km across repeats of the same trail, with a test-retest reliability check | **Live** |
| F8 | Fear/arousal proxy | Descent HR over ride baseline, tracked across repeats of the same trail | **Live** |
| F9 | Trail progression | Fitness (same time, lower HR) vs skill (lower time, same HR) on repeats | **Live** |
| F10 | Climb repeatability | Decay from your first climb of a ride to your last (VAM, grade-matched) | **Live** |
| F11 | Aerobic durability | Cardiac drift on climbs late vs early in long rides | **Live** |
| F12 | Load split | Each ride divided into climbing (aerobic) vs descending (technical) load | **Live** |
| F13 | Grip-chain spacing | Flags stacked descending + pulling days that hammer the same tendons | **Live** |
| F14 | Discipline drift | Rolling 4-week strength:ride balance with drift alerts | **Live** |
| F15 | Sleep-debt weekends | Weekday sleep debt vs weekend braking roughness (honest null until data says otherwise) | **Live** |

Honesty rules enforced in code: every number carries its sample size; buckets
under n=8 render "insufficient data"; missing nights stay missing (no
interpolation); baselines exclude the day they describe; naps never count as
the night's sleep.

---

## Data layer

- **Self-hosted PostgreSQL 17** (Docker, port 5433) with Prisma 7. Tables:
  users, sessions, connected accounts, Strava activities + streams, Oura daily
  records + sleep periods, Garmin activity + sleep, sync ranges, activity
  metrics, daily metrics, provider cache.
- **Read-through caching everywhere**: pages read Postgres first; only date
  ranges never fetched before hit the provider APIs. Coverage is tracked in
  `sync_ranges`, so "no data that night" is remembered and never re-fetched.
- **Stale-if-erroring**: when a provider is down or rate-limited, the last
  cached copy is served flagged as stale instead of an error page.
- **Server-side tokens**: OAuth tokens live in the database and auto-refresh;
  the browser never needs to hold one. Legacy manual tokens still work.
- **Strava rate-limit budget**: stream backfills pace themselves under
  150 requests / 15 min and 1,800 / day, and resume where they stopped.
- **Garmin CSV parsing** handles the export's quirks: unquoted commas in
  dates, years omitted on recent rows (inferred from file order), week ranges
  expanded to one row per day, upserts on natural keys.

## Auth & providers

- OAuth for **Strava** (`read,activity:read_all`), **Oura**, **WHOOP**, with
  CSRF-protected flows; the callback creates the user, stores tokens, and sets
  a session cookie — connecting *is* signing in.
- A single "local" user backs installs that only use the server-side
  `OURA_API_TOKEN`, so no login is ever required for personal use.
- Provider errors are translated to actions: app deactivated, missing scope,
  rate limited, expired token (auto-refresh + retry).

## API surface (selected)

| Route | Purpose |
|---|---|
| `POST /api/strava/activities` | Cached activity range (`cache_only` for page loads) |
| `GET /api/strava/activities/recent` · `/[id]` · `/athlete/stats` | Cache-backed Strava reads |
| `POST /api/sleep/oura` · `/readiness` · `/sleep_detail_days` | Cached Oura daily collections |
| `POST /api/oura/daily_activity` · `daily_stress` · `daily_resilience` | Cached Oura daily collections |
| `POST /api/sleep/sleep_details` | Single sleep session (cache-first) |
| `GET /api/whoop/{recovery,sleep,workout,cycle,profile}` | Cache-backed WHOOP reads |
| `GET /api/insights` | Computes all live insight metrics from the database |
| `POST /api/burnout/calculate` · `/api/training/*` | Weekly burnout & training analyses |
| `POST /api/garmin/upload-activities` · `upload-sleep` · `import-default` | Garmin CSV ingestion |
| `GET/POST /api/auth/[provider]/…` · `/api/auth/status` | OAuth flows and config status |

## Scripts

| Command | What it does |
|---|---|
| `npm run db:up` / `db:migrate` / `db:seed` / `db:studio` | Database lifecycle |
| `npx tsx scripts/insights/backfill-oura.ts` | Full-history Oura backfill (cache-aware) |
| `npx tsx scripts/insights/backfill-streams.ts` | Rate-limited, resumable Strava stream backfill |
| `npx tsx scripts/insights/audit.ts` | Regenerates `docs/evidence/00-data-audit.md` — the go/park table |
