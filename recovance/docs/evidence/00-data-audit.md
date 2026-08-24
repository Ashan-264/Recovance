# 00 — Data sufficiency audit

Generated: 2026-08-11T03:22:00.192Z
User: `cmsnvdafx0000cbuvzhn77ppj`

Measured against the Gate A thresholds in `INSIGHTS_BUILD_PLAN.md`. PARK means the data cannot support the feature yet — not that the idea is bad.

**9 GO / 6 PARK**

## Verdicts

| ID | Feature | Requirement | Measured | Verdict |
|---|---|---|---|---|
| F12 | Technical vs aerobic load split | streams for ≥100 rides | 324 of 326 rides have streams | **GO** |
| F1 | Per-activity-type recovery cost | ≥25 activity→next-night pairs AND ≥8 pairs in ≥2 buckets | 77 pairs; buckets with ≥8: 3 (road:43, other:3, mtb:23, strength:8) | **GO** |
| F13 | Connective-tissue load spacing | F12 shipped (needs descent load) | depends on F12 (324 rides with streams) | **GO** |
| F3 | Send-day gate | ≥60% of ride days have readiness/HRV | 70/326 ride days (21%) | **PARK** |
| F11 | Aerobic durability (decoupling) | ≥20 rides >60 min with HR + streams | 103 qualifying rides | **GO** |
| F10 | Climb repeatability | ≥15 rides with streams (climb detection) | 324 rides with streams | **GO** |
| F7 | Descent skill score | ≥30 descents on ≥3 repeated trails (needs MTB streams) | 165 of 165 MTB rides have streams | **GO** |
| F9 | Effort-normalized trail progression | F7 shipped | depends on F7 | **PARK** |
| F8 | Fear/arousal proxy | F7 shipped + descent HR streams | depends on F7 | **PARK** |
| F6 | Rest-day audit | daily_stress on ≥50% of rest days | 231/377 rest days (61%) | **GO** |
| F5 | Illness / overreach early warning | ≥60% ring wear in trailing 60 days | 0/60 nights (0%) | **PARK** |
| F14 | Discipline drift | none (arithmetic on cached activities) | 374 activities | **GO** |
| F4 | Recovery latency | ≥40 nights with 5-min HRV series | 429 nights carry an HRV series | **GO** |
| F2 | Interference index | ≥30 strength sessions with a quality measure | 14 strength sessions, none RPE-tagged | **PARK** |
| F15 | Sleep-debt weekend pattern | ≥12 weekends with weekday Oura + a scored ride (F7/F11) | depends on F7/F11 outcome variable | **PARK** |

### Notes

- **F3** — Wear the ring the night before rides to un-park.
- **F5** — An early-warning system on sparse wear is a false-confidence machine — stays parked.
- **F4** — Plenty of history, but no recent wear — findings will describe 2024–25, not today.
- **F2** — Un-park: add per-session RPE + focus tag, revisit at 30 sessions.

## Strava inventory

| Type | Activities | With HR | With GPS | With streams |
|---|---|---|---|---|
| MountainBikeRide | 165 | 117 | 164 | 165 |
| Ride | 157 | 52 | 154 | 155 |
| Run | 15 | 5 | 14 | 15 |
| WeightTraining | 13 | 13 | 0 | 13 |
| Walk | 10 | 7 | 8 | 9 |
| Rowing | 5 | 5 | 2 | 5 |
| GravelRide | 4 | 3 | 4 | 4 |
| Hike | 3 | 2 | 3 | 3 |
| Handcycle | 1 | 0 | 1 | 1 |
| Workout | 1 | 1 | 0 | 1 |
| **Total** | **374** | **205** | **350** | **371** |

Date range: 2021-05-08 → 2026-08-09

## Oura inventory

| Dataset | Rows |
|---|---|
| daily_activity | 600 |
| daily_readiness | 422 |
| daily_resilience | 141 |
| daily_sleep | 422 |
| daily_stress | 310 |
| sleep_periods | 711 |

- Nights with an HRV reading: **433**
- Nights with a temperature deviation: **420**
- Nights carrying the 5-minute HRV series: **429**
- Ring wear, trailing 60 days: **0/60 (0%)**
- Ring wear, trailing 365 days: **49/365 (13%)**

## What this means for the build order

- Ready to build: F12, F1, F13, F11, F10, F7, F6, F14, F4
- Parked: F3, F9, F8, F5, F2, F15
