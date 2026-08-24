/**
 * The full catalogue of insight features and their gate status.
 *
 * Every feature appears in the app. The ones whose data supports them show real
 * numbers; the rest show precisely what is missing and what unblocks them. A
 * parked feature is never rendered with a plausible-looking placeholder value —
 * that is the failure mode this registry exists to prevent.
 */

export type FeatureStatus = "live" | "parked";

export interface FeatureDefinition {
  id: string;
  name: string;
  claim: string;
  /** What the numbers mean and the training decision to make from them. */
  howToUse: string;
  group: "cross-source" | "mtb" | "overlap";
  /** What Gate A requires, in words. */
  requirement: string;
  /** How to un-park it, when parked. */
  unblock?: string;
}

export const FEATURES: FeatureDefinition[] = [
  {
    id: "F1",
    name: "Per-activity-type recovery cost",
    claim:
      "What each kind of session costs you the following night, against your own baseline.",
    howToUse:
      "Read the table as a price list: what each session type takes out of you that night. Put your costliest type (biggest HRV drop) before a rest day, not before another hard day. If two types cost the same, the hard/easy distinction between them is imaginary — plan them interchangeably.",
    group: "cross-source",
    requirement: "≥25 activity→next-night pairs, ≥8 in at least two session types",
  },
  {
    id: "F2",
    name: "Interference index",
    claim:
      "Whether hard endurance work in the previous 48h is blunting your strength sessions.",
    howToUse:
      "Once live: if strength quality drops when a big ride happened in the prior 48 h, separate the two by a full day or flip the order. Until then, the single most useful thing you can do is tag each strength session with an RPE right after finishing — ten seconds per session unlocks this.",
    group: "cross-source",
    requirement: "≥30 strength sessions with a quality measure",
    unblock:
      "Only 14 strength sessions are logged and none carry an RPE or focus tag. Add a tag per session and revisit at 30.",
  },
  {
    id: "F3",
    name: "Send-day gate",
    claim:
      "Flags days when your nervous system is off and the ride ahead is consequence-heavy.",
    howToUse:
      "Check it the morning of a technical ride. Red: keep the ride, change the menu — flow instead of jump lines, nothing new. Caution: double the warm-up and session the first sketchy feature before committing. Green means your nervous system is normal, not that crashes are impossible. This is injury avoidance, not performance tuning.",
    group: "cross-source",
    requirement: "≥60% of ride days have readiness or HRV",
    unblock:
      "Only 21% of ride days have ring data. Wear the ring the night before rides for ~6 weeks.",
  },
  {
    id: "F4",
    name: "Recovery latency",
    claim:
      "How many hours into sleep your HRV returns to baseline — the shape a morning average hides.",
    howToUse:
      "Watch the after-training number across weeks, not days. If hours-to-baseline climb while morning readiness still looks fine, fatigue is accumulating below the surface — insert two or three easy days before it becomes a forced break. One long latency after a huge day is normal; a trend is the signal.",
    group: "cross-source",
    requirement: "≥40 nights carrying Oura's 5-minute HRV series",
  },
  {
    id: "F5",
    name: "Illness / overreach early warning",
    claim:
      "Separates 'getting sick' from 'trained too hard' by combining temperature, resting HR and load.",
    howToUse:
      "Act on the verdict, not the raw numbers. Illness-watch: cut intensity for a day or two and sleep — training through an incubating illness turns two days into two weeks. Overreach-watch: keep moving but halve volume for a few days. Red: full rest day, no negotiation.",
    group: "cross-source",
    requirement: "≥60% ring wear in the trailing 60 days",
    unblock:
      "0% wear in the last 60 days. An early-warning system on sparse wear is a false-confidence machine, so it stays off until wear recovers.",
  },
  {
    id: "F6",
    name: "Rest-day audit",
    claim: "Whether your rest days are actually restful, and whether it shows up that night.",
    howToUse:
      "If the two numbers separate — calm rest days recover you, stressful ones do not — treat rest-day calm as part of the program: batch errands and stressful obligations onto training days and guard one genuinely quiet day per week. A stressful day off is a third training day in disguise.",
    group: "cross-source",
    requirement: "Daytime stress data on ≥50% of rest days",
  },
  {
    id: "F7",
    name: "Descent skill score",
    claim:
      "Smoothness on descents — speed variance and braking events per km, compared within the same trail.",
    howToUse:
      "Pick two or three benchmark trails you can repeat year-round and watch braking events/km on them. Falling = smoother, faster descending. Plateaued: run a dedicated skills session — fixed brake points before corners, eyes further down the trail. Mind the reliability note: below the bar, read direction, not decimals.",
    group: "mtb",
    requirement: "≥30 descents across ≥3 repeated trails (needs activity streams)",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F8",
    name: "Fear / arousal proxy",
    claim:
      "Heart rate on descents where you are doing almost no work — arousal, not exertion.",
    howToUse:
      "Descent heart rate above your cruising baseline is mostly arousal — fear made measurable. Repeat a trail until its number drops toward your norm before stepping up to the harder line. After a crash or a layoff, expect it elevated; rebuild on familiar trails until it settles instead of forcing the scary one.",
    group: "mtb",
    requirement: "Descent HR streams (depends on F7)",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F9",
    name: "Effort-normalized trail progression",
    claim:
      "Separates getting fitter (same time, lower HR) from getting better (lower time, same HR).",
    howToUse:
      "This separates got-fitter from got-better. Many skill-classified trails: technique is improving, keep the variety. Regressing trails: revisit them fresh, early in a ride, and session the sections that slowed. Zero fitness-classified trails while you want more engine: add structured climbing work — riding alone is not adding it.",
    group: "mtb",
    requirement: "Repeated segments with HR (depends on F7)",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F10",
    name: "Climb repeatability",
    claim: "How much your climbing speed decays from the first climb of a ride to the last.",
    howToUse:
      "Decay is how much you fade from the first climb to the last. Above ~15%: your opener is writing checks the last climb cannot cash — pace it easier, and train repeatability with three to five moderate hill repeats instead of one all-out effort. Falling decay across a season is fitness you can trust.",
    group: "mtb",
    requirement: "≥15 rides with streams",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F11",
    name: "Aerobic durability",
    claim: "HR drift at constant effort within long rides — your true endurance base.",
    howToUse:
      "Drift above ~5% means the same climbing work costs more heart rate late in long rides — the base is the limiter, not the legs. The fix is unglamorous: more long, genuinely easy rides. Judge a base block by this number falling; if it has not moved in six to eight weeks, the easy rides were not easy.",
    group: "mtb",
    requirement: "≥20 rides over 60 min with HR and velocity streams",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F12",
    name: "Technical vs aerobic load split",
    claim:
      "Splits a ride into climbing (aerobic) and descending (neuromuscular) load — a shuttle day and an XC loop are not the same stress.",
    howToUse:
      "Descent share tells you what a ride actually was. A 60%-descent shuttle day is arm, grip and attention stress even at low heart rate — do not schedule it as easy or stack a pull workout on top of it. Balance the week using the split, not duration or average HR.",
    group: "mtb",
    requirement: "Streams for ≥100 rides",
    unblock: "Needs per-activity streams. Reconnect Strava, then run the streams backfill.",
  },
  {
    id: "F13",
    name: "Connective-tissue load spacing",
    claim:
      "Flags back-to-back days that stack grip and shoulder load across descending and pulling.",
    howToUse:
      "Descending and pulling hammer the same forearms, elbows and shoulders, and tendons adapt slower than muscle. Keep 48 h between a heavy-descent day and a heavy pull day; when 7-day grip load sits in your top quartile, make the next strength session push or legs. Stacked-pair flags are your early tendonitis warning.",
    group: "overlap",
    requirement: "Descent load from F12",
    unblock: "Depends on F12, which needs per-activity streams.",
  },
  {
    id: "F14",
    name: "Discipline drift",
    claim:
      "Rolling 4-week strength-to-ride balance, so one discipline cannot quietly disappear for a month.",
    howToUse:
      "The bars are your strength:ride balance against your own norm. When it flags drifting, do not wait for the perfect session — two 30-minute strength sessions this week beat a planned hour that never happens. For a rider, maintained strength is crash armor as much as performance.",
    group: "overlap",
    requirement: "None beyond cached activities",
  },
  {
    id: "F15",
    name: "Sleep-debt weekend pattern",
    claim: "Whether weekday sleep debt shows up in weekend ride quality.",
    howToUse:
      "Currently an honest null — no detectable link between weekday sleep debt and weekend descending yet. If the correlation turns positive as weekends accumulate, Thursday and Friday nights become part of your bike setup: protect them before big weekends. Until then, collect and ignore.",
    group: "overlap",
    requirement: "≥12 weekends with weekday Oura and a scored ride",
    unblock: "Needs a ride-quality score from F7 or F11, which need streams.",
  },
];

export const FEATURE_GROUPS: { id: FeatureDefinition["group"]; label: string }[] = [
  { id: "cross-source", label: "Strava × Oura" },
  { id: "mtb", label: "Mountain biking" },
  { id: "overlap", label: "MTB + calisthenics" },
];
