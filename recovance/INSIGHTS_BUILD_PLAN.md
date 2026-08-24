# Insights Build Plan — evidence-gated, for Claude Code

A step-by-step plan to build the 15 cross-source metrics (Strava × Oura) without
assuming any of them is useful. Every feature must earn its UI by passing gates
on the user's real data; features that fail are parked with a stated reason and
a data-collection path, not built "because the idea sounds good."

**Prime directive: no polished UI before the metric has an approved evidence
card.** Cheap number/table first, dashboard component only after review.

---

## 0. Ground rules (read before building anything)

### The pipeline every feature goes through

```
Gate A: Data sufficiency ──> Build compute fn ──> Gate B: Backtest + evidence card
     (thresholds below)      (pure, tested)        (does it vary? is it stable?)
                                                          │
        parked ◄── fail                    user reviews card ── approve ──► minimal UI
        (with collection plan)                                                │
                                                                       Gate C: 2-week
                                                                       real-world use
                                                                          │
                                                                     polish / promote
```

- **Gate A — data sufficiency.** Hard numeric thresholds (per feature, below)
  checked by script against Postgres. Fail ⇒ the feature is PARKED. Parked ≠
  deleted: record what data is missing and how long collection takes.
- **Gate B — signal check.** Compute the metric over ALL history. It must:
  (a) actually vary (not constant / not pure noise — report distribution),
  (b) be stable under resampling (drop 20% of days, metric shouldn't flip),
  (c) show the relationship it claims, with effect size, or honestly report none.
  Output = an **evidence card** (see §0.3). The user approves or kills.
- **Gate C — usefulness in practice.** After 2 weeks of the minimal UI: did it
  change a decision? If the user can't name one decision it informed, demote or
  remove. This is the "useful vs nice-to-have" test — usage, not opinion.

### 0.2 Where things live

| Thing | Location |
|---|---|
| Stream data | new table `strava_streams` (Prisma model, §P0-2) |
| Derived per-activity metrics | new table `activity_metrics` |
| Derived per-day metrics + baselines | new table `metric_daily` |
| Compute functions | `src/lib/insights/<feature>.ts` — pure functions, no fetching |
| Backtest/audit scripts | `scripts/insights/*.ts` (run with `npx tsx`) |
| Evidence cards | `docs/evidence/<nn>-<slug>.md` (committed) |
| Minimal UI | one shared "Insights Lab" section on /insights: number + table + verdict badge |

### 0.3 Evidence card template (every feature produces one)

```md
# <Feature name>
Claim: <one sentence — what it measures and what decision it should change>
Data used: <n activities / n nights, date range, coverage %>
Result: <distribution, trend, correlation + effect size, or "no signal">
Stability: <resampling result>
Confounds noted: <e.g., seasonality, wear gaps>
Verdict proposal: SHIP (minimal UI) | PARK (need X more weeks of Y) | KILL (no signal)
```

### 0.4 Known data reality (audited 2026-08-11 — re-audit in P0-4)

- Strava cache: **374 activities** (2021-05 → 2026-08), 350 with GPS polyline,
  **205 with HR** (MTB: 117/165 with HR — good; road: 52/157 — patchy).
- Strength: **14 sessions** (13 WeightTraining + 1 Workout, all with HR) over
  ~18 months. This is SMALL — anything needing per-strength-session statistics
  is at risk until more sessions are logged.
- Oura: sampled coverage ≈ **35–47% of nights** in tested months. Sparse wear
  is the #1 threat to features 1, 3, 4, 5, 6, 15. Exact coverage measured in P0-4.
- Streams (per-second velocity/HR/altitude): **not yet ingested** — required by
  features 7–12. Strava rate limits: 200 req/15 min, 2 000/day.
- Strava app must remain Active; the OAuth flow already grants `activity:read_all`.

---

## Phase 0 — Foundation (build once, everything depends on it)

**P0-1. Backfill all Oura datasets.** Loop `getOuraDaily` for `daily_sleep`,
`daily_readiness`, `daily_activity`, `daily_stress`, `daily_resilience` and
`getOuraSleepPeriods` over 2021-05-01 → today (the cache layer handles gaps and
rate pacing; chunk by 90 days). Acceptance: `sync_ranges` shows one contiguous
range per dataset.

**P0-2. Streams ingestion.** 
1. Prisma model `StravaStream { userId, stravaId, streamType, payload Json, fetchedAt }`,
   unique `(userId, stravaId, streamType)`; migration.
2. `scripts/insights/backfill-streams.ts`: for every cached activity with a
   polyline or HR, GET `/activities/{id}/streams?keys=time,distance,velocity_smooth,altitude,grade_smooth,heartrate,moving&key_by_type=true`.
   **Rate limiting is mandatory**: ≤150 requests per 15-min window, hard stop at
   1 800/day, resumable (skip ids already stored, so re-running continues).
   374 activities ⇒ one evening of runtime. Record per-activity stream
   availability in `activity_metrics.streams_available`.
3. Acceptance: report `n activities with velocity+altitude`, `n with HR stream`.

**P0-3. Baselines library** (`src/lib/insights/baselines.ts`): rolling 30- and
60-day medians + MAD for nightly HRV, RHR, temp deviation, sleep duration, from
cached Oura rows. Skip-if-missing (no interpolation — absent nights stay absent).
Unit-tested with synthetic fixtures. Persist to `metric_daily`.

**P0-4. Data-sufficiency audit** (`scripts/insights/audit.ts`): one command that
prints/regenerates `docs/evidence/00-data-audit.md`: Oura wear % by month,
HR-stream coverage by activity type, strength-session count, nights with sleep
periods (5-min HRV samples), and a **go/park verdict per feature** using the
Gate A thresholds in this document. Re-run before each phase.

**P0-5. Validation harness** (`scripts/insights/backtest.ts <feature>`): loads
history, runs the feature's compute fn, emits the evidence card skeleton with
distribution/stability/correlation sections filled in. One shared implementation
of resampling and Spearman/Pearson with n and CI printed — no p-hacking helpers.

**P0-6. "Insights Lab" UI shell** on /insights: renders any approved metric as
stat tile + table + verdict badge (SHIPPED/TRIAL). One component, reused by all.

*Effort: P0 ≈ M/L overall. Nothing user-visible yet except the audit doc.*

---

## ROI ranking (build order, with reasons)

Decision value = does a number change what the athlete does this week?

| Rank | # | Feature | Gate A needs | Decision value | Effort | Depends on |
|---|---|---|---|---|---|---|
| 1 | 12 | Technical vs aerobic load split | streams for MTB rides | High (feeds 1,13; fixes "Relative Effort lies") | M | P0-2 |
| 2 | 1 | Per-activity-type recovery cost | ≥25 (session-type, next-night-Oura) pairs | High ("what does a shuttle day cost me") | M | 12, P0-1/3 |
| 3 | 13 | Connective-tissue load spacing | split from 12 + strength dates | High (injury avoidance, rule-based) | S | 12 |
| 4 | 3 | Send-day gate | readiness+temp coverage on ride days | High (safety, rule-based) | S | P0-1/3 |
| 5 | 11 | Aerobic durability (decoupling) | ≥20 rides >60 min with HR+velocity | Med-High | M | P0-2 |
| 6 | 10 | Climb repeatability | ≥15 multi-climb rides | Med | M | P0-2 |
| 7 | 7 | Descent skill score (flow) | ≥30 descents on ≥3 repeated trails | Med (fun, trend value) | L | P0-2 |
| 8 | 9 | Effort-normalized trail progression | repeated segments w/ HR | Med | M | 7's descent detection |
| 9 | 8 | Fear/arousal proxy | descent HR streams | Low-Med (novel, unproven) | S (after 7) | 7 |
| 10 | 6 | Rest-day audit | daily_stress coverage ≥50% | Med | S | P0-1 |
| 11 | 5 | Illness early-warning | temp+RHR coverage ≥60% recent | Med | S | P0-3 |
| 12 | 14 | Discipline drift | none beyond cache | Low-Med (simple ratio) | S | — |
| 13 | 4 | Recovery latency | ≥40 nights with 5-min HRV samples | Med (research-y) | M | P0-1 |
| 14 | 2 | Interference index | ≥30 strength sessions w/ quality measure | High *if provable* — currently n=14 | M | 12 + more data |
| 15 | 15 | Sleep-debt weekend pattern | ≥12 weekends with Oura weekday data | Low-Med | S | 7/11 for outcome var |

Features 2, 4, 15 are **expected to PARK at Gate A** on current data. The plan
still includes them — with the collection path that un-parks them.

---

## Phase 1 — Foundation metrics (12 → 1 → 13 → 3)

### F12. Technical vs aerobic load split
1. Gate A: streams present for ≥100 MTB/road rides (from P0-4).
2. `src/lib/insights/loadSplit.ts`: segment each ride's stream into climbing /
   descending / flat by smoothed grade (±3% hysteresis, ≥30 s segments). Output
   per-activity: `climb_time, descent_time, climb_load (HR-based TRIMP on climbs),
   descent_load (time × descent grade severity), flat_load`. Unit tests on
   synthetic streams (flat ride, pure climb, shuttle laps).
3. Backtest: distribution of descent share across MTB vs road rides — sanity:
   shuttle/park days must rank top; road rides near zero. Evidence card.
4. Gate B review → minimal UI: per-activity split bar in Insights Lab.
5. Persist to `activity_metrics` on every sync (idempotent).

### F1. Per-activity-type recovery cost
1. Gate A: join activities to next-night Oura (HRV, RHR, deep sleep) — need
   ≥25 pairs overall AND ≥8 pairs in ≥2 session types. (Session types: technical
   MTB [descent_load-heavy, from F12], endurance ride, strength, other.)
2. `src/lib/insights/recoveryCost.ts`: for each pair compute next-night deltas
   vs the P0-3 baseline (not vs yesterday). Aggregate per session type:
   median Δ + IQR, n. NO output for types with n<8 — show "insufficient data",
   never a fabricated number.
3. Backtest: report whether types separate (e.g., MTB-technical vs strength
   overlap entirely?). Honest null result is an acceptable card.
4. Review → minimal UI: "price list" table (type → HRV Δ, RHR Δ, n).
5. Kill criteria: after full backtest, if all session types are statistically
   indistinguishable, KILL (the split adds nothing over "any training day").

### F13. Connective-tissue (grip-chain) load spacing
1. Gate A: F12 shipped (descent_load exists); strength dates known. No minimum n
   — this is a rule, not a statistic.
2. `src/lib/insights/gripChain.ts`: rolling 7-day grip-chain load =
   Σ(descent_load) + Σ(strength sessions × fixed weight). Flag: two
   high-grip days within 48 h. Thresholds are personal percentiles (top-quartile
   days), not magic constants.
3. Backtest: how often would it have flagged last 12 months? >2 flags/week ⇒
   thresholds too sensitive, tune before UI (alert fatigue = dead feature).
4. Review → minimal UI: 14-day strip calendar with flags.

### F3. Send-day gate
1. Gate A: from P0-4, ≥60% of MTB-ride mornings have readiness OR (HRV+temp).
   If wear is too sparse ON RIDE DAYS specifically, PARK with note "wear the
   ring the night before rides for 6 weeks."
2. `src/lib/insights/sendGate.ts`: rule — flag when ≥2 of {readiness < personal
   20th percentile, temp deviation > +0.4 °C, sleep < 6.5 h} on a day whose
   planned/typical ride is technical (descent-heavy per F12 history or user tag).
3. Backtest: rate of red days over history (should be 5–15%; tune percentiles).
4. Review → minimal UI: today-card on dashboard, green/amber/red + the two
   reasons. Never a bare score.

**Milestone review after Phase 1** — user answers for each shipped metric:
"did this change a decision in the last 2 weeks?" No ⇒ demote before building more.

---

## Phase 2 — Streams/skill metrics (11 → 10 → 7 → 9 → 8)

### F11. Aerobic durability (HR-speed decoupling)
1. Gate A: ≥20 rides >60 min with HR + velocity + grade streams.
2. Compute: grade-adjusted speed (Minetti-style cost or simple grade bins),
   first-half vs second-half HR/GAS ratio on steady segments only (exclude
   stops, descents). Output decoupling % per ride; trend line over months.
3. Backtest: correlate with ride duration (expected positive) and across-season
   trend. Stability check vs segment-selection parameters.
4. Kill criteria: if decoupling is dominated by temperature/noise (no
   month-over-month stability), KILL the trend view, keep per-ride number only
   if the user finds it interpretable.

### F10. Climb repeatability
1. Gate A: detect climbs (sustained grade >3%, >2 min) — need ≥15 rides with ≥3
   comparable climbs (similar length/grade within-ride).
2. Compute: % decay in grade-adjusted climb speed from first to last climb,
   HR-matched. Backtest across history; card; review; minimal UI.

### F7. Descent skill score (flow)
1. Gate A: descent detection from F12; ≥30 descents total on ≥3 trails ridden
   ≥3 times (match descents by start/end geohash ~±100 m).
2. Compute per descent: speed variance (normalized), deceleration events/km
   (velocity drops >15% within 2 s), median speed vs trail's own history.
   Score = within-trail percentile, NOT cross-trail (different trails aren't
   comparable — this is the main validity trap; the card must show within-trail
   matching worked).
3. Backtest: same-trail repeats should correlate run-to-run (test-retest
   reliability r ≥ 0.5 or the "score" is noise ⇒ KILL or simplify to raw
   deceleration count).
4. Review → minimal UI: per-trail progression sparkline.

### F9. Effort-normalized trail progression
Reuses F7's matched descents/segments: plot time vs avg HR per repeat;
classify improvement as fitness (same time, lower HR) vs skill (lower time,
same HR). Ship only if ≥3 trails have ≥4 clean repeats.

### F8. Fear/arousal proxy
Descent HR minus expected HR-at-that-work (near-zero power ⇒ expected ≈
recovery HR). Card must test: does descent-HR-above-baseline decline with trail
familiarity? If no within-trail trend exists in the user's data, KILL — this
one is a hypothesis, not a promise.

---

## Phase 3 — Correlational & behavioral (6 → 5 → 14, then parked ones)

### F6. Rest-day audit — Gate A: daily_stress on ≥50% of no-training days.
Compute rest-day stress/activity score; card: do "bad rest days" precede worse
next-block metrics (F11 trend)? Even without correlation, the descriptive view
may pass Gate C — let usage decide.

### F5. Illness/overreach early-warning — Gate A: ≥60% wear in trailing 60 days
(an early-warning system with 40% sensor uptime is a false-confidence machine —
PARK below that, say so plainly).
Rule: temp dev > +0.4 °C AND RHR > baseline+MAD AND acute:chronic load > 1.3 ⇒
amber. Backtest against known sick days (ask user to label 2–3 from memory).

### F14. Discipline drift — no gate (pure arithmetic on cached data). Rolling
4-week strength:ride ratio vs a user-set target. Ship straight to minimal UI;
Gate C decides if it stays.

### F4. Recovery latency — Gate A: ≥40 nights with 5-min HRV series in
`oura_sleep_periods` AND ≥15 of them following training days. Compute time-to-
baseline-crossing per night; card correlates latency with F1 session types.
PARK if sample too small; revisit quarterly.

### F2. Interference index — **PARKED at n=14 strength sessions.**
Un-park path (start now, costs nothing):
1. Add optional per-session RPE + focus tag (push/pull/legs) to the manual log
   (one small form, stored in `activity_metrics`).
2. Re-audit when ≥30 tagged sessions exist (~3–4 months at current frequency).
3. Then: regress session quality (volume×RPE trend) on prior-48 h endurance
   load (from F12). Card must show effect size, not just direction.

### F15. Sleep-debt weekend pattern — Gate A: ≥12 weekends where ≥3 weekday
nights have Oura sleep AND the weekend has a scored ride (F7 or F11 output as
the outcome variable — build those first). PARK until both hold.

---

## Cross-cutting engineering steps

1. **Idempotent recompute**: `scripts/insights/recompute.ts [--since DATE]`
   rebuilds `activity_metrics` + `metric_daily`; safe to re-run; called at the
   end of every sync route.
2. **Tests**: every compute fn gets synthetic-fixture unit tests (flat ride,
   shuttle day, missing-HR night, sparse wear) — `npx tsx --test` or vitest.
3. **Missing data is rendered as missing.** No interpolated nights, no metrics
   from n<8 shown as numbers. Every UI number carries its n.
4. **Rate-limit budget**: streams backfill and nightly sync share a budget
   guard (150 req/15 min, 1 800/day) in one module.
5. **Evidence cards are committed** so verdicts and the data they were based on
   are auditable later.

## Suggested session breakdown for Claude Code

| Session | Scope | Exit artifact |
|---|---|---|
| 1 | P0-1 … P0-4 | `00-data-audit.md` with real go/park table |
| 2 | P0-5, P0-6, F12 | F12 evidence card + Lab shell |
| 3 | F1, F13 | two cards, minimal UIs if approved |
| 4 | F3 + Phase-1 milestone review | send-day card; demote list |
| 5 | F11, F10 | cards |
| 6 | F7 (+F9, F8 if F7 passes) | reliability numbers |
| 7 | F6, F5, F14 + re-audit for parked F2/F4/F15 | updated audit |

Each session starts by re-running `scripts/insights/audit.ts` and ends with the
user approving/killing cards. **The user's approval between sessions is part of
the plan, not a formality — it is the ROI check.**
