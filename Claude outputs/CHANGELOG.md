# CHANGELOG — Mardy · 2026 Training

CURRENT: **v1.29** · built 16 Nov 2026 · PROGRAM-REV `2026-11-16-8week5k-timebased`
ROLLBACK: `claude/app-v1.28-rollback.html`
GATE: 141/141 passing

> ⚠ v1.11 was issued TWICE by two sessions working in parallel. Neither is
> current. v1.12 is the merge of both. See the v1.12 entry.

> Line 3 above is the single authoritative answer to "what version is this?".
> Any session — scheduled or interactive — reads it first and never guesses.
> Versions are zero-padded semver: v1.09, v1.10, v1.11. Never a bare v1.9.

---

## GATE — 16 Nov 2026 · no version bump, nothing redeployed

`regression.mjs` only. `app-current.html` and `sw-current.js` are byte-identical
(`cmp`-verified); `CURRENT:`, `ROLLBACK:` and `GATE:` are unchanged. Gate still
141/141.

**Why:** the last build spent ~810k tokens and over an hour copying canonical
files around and running all 141 checks to find out whether two were red. B34
has been open since 13 Oct and the project instructions have described all three
of these as shipped since 6 Oct. None existed.

**`node regression.mjs --state`** — 64 ms, no browser, no `node_modules`.
Prints every place a version is written and exits 1 on any disagreement:
`APP_VERSION` / `APP_BUILT` / `PROGRAM_REV` / badge fallback, `CACHE_VERSION`,
CHANGELOG `CURRENT` / `PROGRAM-REV` / `ROLLBACK` / `GATE`, the gate's own check
count, and every rollback on disk with the version each declares *internally*.
Verified against seven seeded failures, each caught with exit 1: a drifted
badge, an unbumped `CACHE_VERSION`, **CHANGELOG line 3 behind the app** (the
v1.12 incident), **a gate with a check removed** (the stale-gate incident), two
rollbacks on disk, a rollback named for a version it does not declare, and an
unpadded `v1.3`.

**`--only <suite>`** — runs matching suites and refuses to print "safe to ship".
13 s against 87 s for the fix-rerun loop.

**A full run now asserts the version state too**, so a stale copy of this file
cannot exit 0 quietly — the guard rule 2 has described since 6 Oct.

**`playwright` is now imported where it is used, not at the top.** A static
import is hoisted, so `--state` could not run without `node_modules` present —
the one situation it exists for: step 0 of a fresh clone. The test suite caught
this; the first version of `--state` was useless for its own purpose.

---

## v1.29 — 16 Nov 2026 · PROGRAM-REV `2026-11-16-8week5k-timebased`

**The running block is rebuilt on the 8-week plan he chose, the long run is
prescribed in minutes, and the app learned to read a run that states a time.**
Both axes move. Gate 138 → 141.

His message, 16 Nov:

> *"Base my running pace on the added picture."*
> *"Use the program he shares, where you only schedule one interval, one tempo,
> one long run (by time, not distance) and one easy run per week. The easy run
> is optional."*

Source: `runningtrainingplan.com/runningpress/5k-in-20-minutes-training-plan/`,
read this morning. **The page's own plan is not the structure he described** —
it prescribes five runs a week plus an optional sixth (Tue intervals, Wed easy,
Thu threshold, Sat easy, Sun endurance, Mon optional easy). What he asked for is
a reduction of it. He was told that before anything was written; the session
*content* is the page's, the run count is his.

His answers to the four questions this raised: the 8 weeks land on **wk 13–20**;
the two hard runs stay **Wed + Fri** so Tuesday, the bench day, is protected;
the long run converts at **6:06/km with both numbers shown**; and **drop the
trials and follow the page**.

### 1. The reader that had to move first, or the plan change broke the app

Nothing in this file could read a duration. `parseRunDistanceKm` wants a leading
`N km` and returns null otherwise, so `80 min easy` parses to nothing and **the
single biggest session of the week drops out of the weekly total in silence** —
with the long-run share, the +10% ceiling and the deload guard going with it.
That is the shape of the defect v1.27 fixed for the interval session, and the
reason this half had to land before the plan did.

- `parseRunDurationMin(text)` — a leading duration, the way
  `parseRunDistanceKm` reads a leading distance. **A bare number is refused**,
  for the reason `parsePaceSec` refuses one; so are zero, anything over ten
  hours, and a duration that does not lead the session.
- `durationToKm(min, paceSec)` — and it **returns null rather than guessing when
  the session states no pace.** A duration with no pace is not a distance.
- `sessionPaceSec(text)` — the pace to convert at, read off the session itself
  through `parsePlannedPaceBand`: a stated pace, or the midpoint of a stated
  band.

**The pace comes from the session, never from a constant held in the reader.**
Edit the pace on a session and its derived distance moves with it; there is no
second copy to drift. Same principle v1.20 applied to the heart-rate bands.

`parseQualityVolumeKm` gains **one sibling branch** — `≈ N min of quality @
P/km` beside the existing `≈ N km of quality` — so the kilometre path that four
checks already cover is byte-identical to what it was.

### 2. What the card shows

`long 80 min ≈ 13.1 · intervals 8.3 · threshold 8.6 · easy 6.6`

Both numbers, deliberately. The kilometres alone would hide what the plan
actually asks him to do; the minutes alone would hide the number every guard in
this file is denominated in.

### 3. Weeks 13–20

| wk | Wed — interval | Fri — threshold | Sun — long | total |
|---|---|---|---|---|
| 13 | 5×1000 m @ 4:51 | 2×13 min @ 4:55 | 60 min | 33.7 |
| 14 | 8×600 m hard | 25 min continuous | 80 min | 36.6 |
| 15 | 6×800 m @ 4:36 | 3×9 min @ 4:55 | 80 min | 37.0 |
| 16 | 5×1000 m @ 4:36 | 30 min continuous | 60 min | 34.5 |
| 17 | 10×200 m hard | 3×13 min @ 4:55 | 90 min | 38.3 |
| 18 | 6×800 m @ 4:36 | 30 min continuous | 90 min | 39.3 |
| 19 | 6×1000 m @ 4:36 | 2×15 min @ 4:55 | 60 min | 35.5 |
| 20 | 5×800 m @ 4:36 | 40 min easy | **5K RACE** | 29.2 |

Tuesday carries **one optional 40-minute easy run**, marked OPTIONAL in its own
text, and it is still *counted* — optional is not invisible.

**Paces are his chart's, and only his chart's**: 5K 4:36, 10K 4:51, threshold
4:55, long/easy 6:06. Nothing is interpolated. The two sessions the page writes
as "hard" with no pace read `@ 4:36/km or faster`, which is the page's own rule
("faster than 5k pace") expressed in a number he supplied.

**The threshold work is prescribed in minutes, not kilometres, and that is not
cosmetic.** The page offers both — "2x 3k (or 13 mins)" — because its author
assumes a ~4:20/km threshold. At his 4:55 the two forms diverge: 3 km takes him
14:45, not 13:00. Taking the minutes keeps the *stimulus* the plan intended
instead of a distance that silently lengthens every rep.

**wk 19 is the 120 kg attempt week and it steps back on its own.** 35.5 km
against wk 18's 39.3 — a −9.7% cut, and wk 18 is the block peak. The page's own
week 7 is a 60-minute long-run week before the race, so the taper the attempt
needs falls exactly where it is wanted. Nothing was engineered to make the gate
check pass; the arithmetic was run before a line was written.

**Every guard holds:** no build week steps more than **+8.6%**, both deload
weeks (16, 20 — the strength deloads, untouched) run below the week before
them, and the long-run share improves from 36–41% to **27.6–38.6%**.

### 4. Dropping the trials, and the one consequence he should see

He chose *"drop trials, follow the page"*. The page has no mid-plan trials — but
its week 8 is a **race**, and a race is the same thing a trial was: one all-out
effort against the clock that re-anchors every derived pace.

**So the race had to be recordable, or his own answer would have gone dark.**
With wk 16's trial removed, `getPlannedTrialKm` would have returned null from
here on, the trial card would never have rendered again, and **Goal 2 — "a
faster 5K", the thing this whole block is for — would have stopped stating a
number.** The detectors therefore widen from `N K TIME TRIAL` to also accept
`N K RACE`, written to require a leading distance so the `[RACE PACE]` tag,
which has existed since v1.14, cannot match. A gate check pins that distinction.

**Weeks 4 and 12 keep their trial sessions.** They are history — wk 4 is the
23:43 on 15 Sep and wk 12 is the one he was too ill to run — and rewriting weeks
he has already lived through is not what "drop trials" means.

**The race carries `target 22:45`, which is the number the plan already stated
at wk 16.** No target was invented. That leaves **B26** exactly where it was:
`TRAINING-CONTEXT.md` says the block target is 22:30 and the plan says 22:45.

### 5. A tenth instance of this file's oldest class, found by the plan change

`getGoalAnchors` scanned **the quality slot only** for the trial target:

```js
const t = getPlanned(e.week, 'quality') || '';
```

`getPlannedTrialKm` has scanned every run slot since v1.27. This loop had not —
so the moment the goal race moved to the Sunday slot, the run goal stopped
resolving at all and Goal 2 lost its number. Three gate checks caught it
immediately.

**Ask the data, not the container.** Tenth time. It was invisible until a plan
change moved the data, which is the same way v1.27 and v1.28 each found theirs.
**The gate's own check carried the identical assumption** and had to be
corrected with it.

### What now proves it — 3 new checks, 4 superseded, 7 corrected

**New, all 3 of which fail on v1.28:**

- **A duration is read, converted at the pace its own session states, and
  refused when ambiguous** — eleven reading fixtures including every refusal,
  five conversion refusals, the band midpoint, and the assertion that a duration
  with no stated pace is **not counted** rather than defaulted.
- **The week view states the time he was given and the distance it derived from
  it** — driven through the real week view at 320px, asserting both numbers and
  the weekly total render, with no overflow and no uncaught errors.
- **The goal race is a timed effort the app can record, and its time reaches the
  anchor** — the distance parses and appears in the session's own text, the
  classifier calls it a trial, **a `[RACE PACE]` session is asserted NOT to be a
  race**, and end to end: the card renders on race week, a time saves, and it
  becomes the pace anchor.

**Superseded by his instruction, replaced rather than weakened** — the same
treatment v1.27 gave v1.24's ramp-in checks:

- *every week runs two hard and two easy* → **one interval, one threshold, one
  long run by time and one optional easy**, asserting Wednesday is the interval,
  Friday the threshold, Tuesday marked OPTIONAL, and the long run stated as a
  duration.
- *the hard sessions alternate* → kept, but **scoped to one structural regime**.
  On 16 Nov the pair inverted: Wednesday became the interval where it had been
  the tempo. At that seam wk 11's Friday interval sits beside wk 13's Wednesday
  interval, which is the plan changing mid-block, not two VO2max sessions
  scheduled back to back.
- *quality paces ramp toward the goal* → **every prescribed pace is one of the
  paces on his own chart.** The chart's values are *not* written into the check;
  they are read back out of the plan and asserted to be a small consistent set,
  so it keeps meaning something when he supplies a new chart.
- *the easy run steps +0.5 km a week* → **one optional run, the same length
  every week, stated as a duration, and still counted.**

**Corrected because the new shape broke an assumption — each now asserts more:**

- *totals, nothing silently defaulted* — learns the duration shape **and**
  asserts the conversion: minutes × the pace that session states must equal the
  km the model counted, and a duration read as anything but `session-duration`
  fails.
- *the rep scheme on every hard session* — it read the quality slot alone and
  compared against the **week's** single quality volume, so on race week it
  measured the interval session against the race's distance and reported a
  correct plan as a mismatch. Now every slot, each against **its own** volume,
  and a session stated in minutes is asserted to **refuse** a rep-distance
  scheme rather than being skipped.
- *the long run is capped where the easy run is* — skips a slot the classifier
  calls a trial, so the race is not required to be run at ≤130 bpm.
- *the trial distance* and *the trend keys on distance* — the trend's
  **second distance is now synthesised**, not taken from the plan. Before this,
  the proof of the bug that check exists for only ran while his training
  happened to contain two trial distances, so his dropping the 10K would have
  switched it off.
- *the two goals are read from the plan* — the slot fix above, plus **"the most
  ambitious target" is now proven by seeding an override** that states a faster
  target on a week that already carries an effort, rather than by his plan
  happening to hold several.
- *GUARD: the +10% ceiling* — excludes the Marathon-Revolutie week **by its own
  tag**, the scoping four v1.27 checks already use. See the note below; the step
  is real and is reported rather than silenced.

**Three of the new and corrected checks were wrong on their first run and the
gate caught it.** One asserted the long run is always easy and fired on race
week, where the Sunday slot legitimately holds the race. One built its failure
message with `window.formatPace` **from Node**, where `window` does not exist.
The third scanned all 21 weeks and fired on weeks 1–12, which are already run
and carry the v1.24 tier paces — the trap recorded for v1.24: *a check over "the
plan" usually means "the editable part of the plan"*. All three were fixed, not
weakened.

### Two things he should see, neither of them changed

**Week 21 steps +23.9% out of the new block.** The Marathon-Revolutie preview
is untouched at 44.0 km and wk 19 now runs 35.5, so the step into it is large.
The guard excludes it because MR is a different programme with its own rules
written into its own text and a ramp step *into* it is not a ramp step — but the
jump is real, it is his to decide, and it is logged rather than smoothed.

**Week 17's threshold session is the page's own peak and it is a big one.**
3×13 min is 39 minutes of threshold work against 25–30 in every other week. That
is the page's prescription, not an interpolation. Left exactly as written.

---

## v1.28 — 19 Oct 2026 · PROGRAM-REV `2026-10-19-slotfix-wk19stepback`

**The slot-name class, finally fixed everywhere it lives — and the 120 kg
attempt stops landing on the biggest running week of the block.** Both axes
move. Gate 131 → 138.

Found by the 19 Oct scheduled review, which proposed and shipped nothing; both
changes were put to him and both were approved before anything was written.

> *"B37 + B32 + B33 together"* — the full slot-name fix.
> *"Step back wk 19 only"*, then, once the arithmetic was put to him,
> *"Trim wk 19 and wk 20 together"*.

### 1. Nine call sites, not three

v1.27 introduced `parseRunSessionKm` and moved `getWeeklyRunVolume` onto it, so
the **volume card** reads a hard session in any slot. Four other readers were
left keyed on the slot the session sits in. The grep this project's own notes
ask for — `dayKey ===`, `day.key ===`, `sessionKey ===` across the whole file —
finds **nine** branches. B32 was filed naming three.

| what it decided | measured consequence |
|---|---|
| the interval table | **eleven** `[INTERVALS]` sessions sit in the Friday slot (wk 7–19) and **not one of them could be logged as reps** |
| the live compliance widget | a correct VO2max heart rate was answered *"HR too high … Slow down or walk uphills"* |
| the same widget, for the Tuesday run | **nothing at all** — it states `≤130 bpm` and the widget was blank |
| the coach's RPE verdict | *"RPE 8 is high for an easy/long run"* on a session prescribed at 4:23/km |
| the rep-progression branch | the Friday session earned **0 suggestions in 12 of 12** unblocked weeks |
| `projectWeeklyVolume` | **this is B37, and it is the one that mattered most** — see below |

Everything now routes through `classifyRunSession(dayKey, planText)`, which has
read the session's own text since v1.24 and **already returned `quality` for
these sessions**. The right answer was computed and four surfaces did not ask
for it. The only surviving slot branch is `dayKey === 'longRun'` inside the
classifier itself, which is legitimate: a long run *is* defined by its slot.

The Tuesday easy run (`recovery2`) was in no branch at all — it fell through to
`isStrength`, which needs logged exercises a run logger never supplies. It has
therefore never once been checked against the 130 bpm cap he set on 15 Sep, on
the day he benches.

### 2. B37 — and why it had to ship in the same build

`projectWeeklyVolume` is the function behind the consequence line. It picked
its reader by the slot name:

```js
if (sessionKey === 'quality') { ...parseQualityVolumeKm... }
return parseRunDistanceKm(text);          // every other slot
```

**Measured on wk 9, the same `+1 rep` edit in the two slots that both hold hard
sessions:**

| | Wednesday (`quality`) | Friday (`easy`) |
|---|---|---|
| the volume model reads it | 6.0 → 7.0 km | 6.0 → 7.0 km |
| `projectWeeklyVolume` | `{diffKm: 2.3, total: 36.9, deltaPct: 13.9, exceedsCeiling: true}` | **`null`** |
| `volumeConsequenceLine` | `⚠ Wk 9 total 34.6 → 36.9 km (+2.3 km), +13.9% vs Wk 7 (32.4 km). That is past the +10% weekly step…` | **`''`** |

Today that was *masked*, because the Friday slot earned no suggestions at all.
**The moment the coach fix landed, Friday would have started offering rep bumps
with no cost attached** — precisely the failure B12 shipped at v1.18 to
prevent, and v1.18's own entry records why the two halves had to ship together:
the first suggestion it unblocked was a +12.1% ceiling breach. Same shape here,
bigger number: **+13.9%**.

**Eighth instance of this file's oldest class, in the function a few hundred
lines from the one v1.27 fixed.** Recorded in the notes: when a defect of this
class is fixed in one function, grep for every other function that *reads the
same thing*, not just the ones that share its name.

### 3. The quality branch progressed the wrong slot

Separately from the gating, the branch hardcoded `getPlanned(targetWk,
'quality')` and `sessionKey: 'quality'`, so a Friday interval session would
have proposed a change to **Wednesday's tempo**. It now uses the slot that was
actually logged.

### 4. What the hard-session widget says now

It states no `bpm` band of its own, so it falls back to the zone model — with
the right session kind behind it, which is the whole point. Below the zone a
hard session targets reads as a miss; in or above it reads as on target. The
easy and long runs are untouched: their chain is byte-identical, and the new
branch sits in front of it.

### 5. Week 19 steps back, and week 20 becomes a real deload

`TRAINING-CONTEXT.md` listed week 11's running step-back under **"Deliberate
decisions — do not optimise these away"**. Measured on 19 Oct, it was gone, and
so was every other one:

| attempt | week | running | week before | step |
|---|---|---|---|---|
| 112.5 kg | wk 7 | 32.4 | 30.4 | **+6.6%** |
| 115 kg | wk 11 | 37.3 | 36.8 | **+1.4%** |
| **120 kg** | **wk 19** | **45.5** | 44.5 | **+2.2%** |

**45.5 km at wk 19 was the highest weekly running volume in the whole block**,
and the 120 kg attempt — the primary goal, dated Tue 29 Dec in the session text
— sat inside it. Nobody chose that: the v1.26 easy-run rebuild put both easy
runs on a mechanical +0.5 km a week, and that ramp knows nothing about attempt
weeks, so it walked over the wk 11 cut and never created a wk 19 one.

**The arithmetic forced a second week into scope, and that was put back to him
before anything was written.** To stop being the peak, wk 19 had to drop below
wk 18's 44.5 — but wk 20 is a deload at 44.0 and the gate requires a deload to
run *strictly* less than the week before it. That left a 0.5 km window. The
window was that tight because **wk 20's deload was only 3.3% below wk 19**.

He chose to trim both:

| | was | now |
|---|---|---|
| wk 19 long run | 16 km | **14.5 km** — week 45.5 → **44.0** |
| wk 20 long run | 14.5 km | **13.5 km** — week 44.0 → **43.0** |

wk 18's 44.5 km is now the block peak; the attempt week sits 0.5 km under it,
and wk 20 is a 2.3% step down into the 10K trial instead of a 3.3% nudge.
**Both long-run shares land inside the 30–35% band the plan has held since
v1.13** — 33.0% and 31.4% — which takes two weeks out of **B28** as a side
effect. Nothing else moved: the easy-run +0.5 ramp, every hard session and
every pace are untouched.

**Weeks 7 and 11 still step up into their attempts.** He scoped this to wk 19,
wk 7 has already been run, and wk 11 is 3 Nov. The gate asserts the rule for
the **primary target only**, which is exactly the decision he made — not for
every attempt, because that would be asserting something he did not agree to.

### What now proves it — 7 new checks, all 7 of which fail on v1.27

No check names a slot or a week; each derives the session it drives from the
plan's own text, and prefers a hard session **outside** the quality slot so it
fails loudly if the plan ever moves them back.

- **An interval session renders the interval table whatever slot it sits in** —
  driven through the real week view, and it asserts the classifier already
  calls the session hard, so a pass cannot come from the plan quietly changing.
- **A hard session at its target intensity is not flagged as too fast** — the
  probe is the midpoint of the Z4 band *his own configuration* computes, so
  nothing here hardcodes a heart rate.
- **Every run slot that states a band gets a live verdict** — the check that
  catches the blank Tuesday widget, driven across every slot on a week that
  states a band on two of them.
- **Every run slot can earn a suggestion on some unblocked week**, and the
  suggestion moves the slot that was logged.
- **A hard session at its prescribed effort is not called high for an easy
  run** — the full coach output, end to end.
- **A suggestion on a hard session states its cost whatever slot it sits in** —
  B37, asserted across every hard session with a readable rep scheme, and it
  fails loudly if they ever all sit in one slot again.
- **The primary bench target does not land on a bigger running week than the
  one before it**, and is not the block peak.

**Two of the seven were wrong on their first run and the gate caught it.** One
asserted a control called `#addInterval`; the real id is `#addIntervalBtn` —
the interval table *was* rendering and the check was looking for the wrong
thing. The other navigated back to the weeks list through `#backToWeeks` alone,
which does not exist inside the session logger: getting out of a session needs
`#backToWeek` first and then `#backToWeeks`, and falling back to
`renderProgram()` re-renders whichever view `programView` names — the exact
trap recorded for v1.22. Both checks were fixed, not weakened, and both still
fail on v1.27.

**The gate could not be reproduced by the scheduled run that found all this.**
`project_read` returns `app-current.html` as a file on disk but `regression.mjs`
as inline text, so running it means re-typing ~2,000 lines, and a slip there
produces a false red. This build reproduced it and then **validated the copy by
running it against the untouched v1.27 first: 131/131, matching the `GATE:`
line exactly**, before trusting it for the edit. One deviation was needed — a
`'` escape inside a single-quoted string was rewritten as a double-quoted
string with the same resulting message. See **B34**, which this compounds and
which is now the strongest argument for building `--state`.

---

## v1.27 — 5 Oct 2026 · PROGRAM-REV `2026-10-05-run2hard-longeasy-blocklabels`

**Two hard runs a week from today, the long run run easy, and the block
headings stop lying about the ladder.** Both axes move. Gate 128 → 131.

His message, 5 Oct:

> *"the week titles or cycle titles are off with the weights they mention.
> Make sure this is updated to the current program."*
> *"i want to start my hard runs this week. That means that starting this week,
> i want to do 2 hard runs and 2 easy runs. my long run should also be ran
> easy."*
> *"i think my zone 2 hr is calculated wrong. It says it is up to 137. Is that
> really true, with a max of 183?"*

His answers to the four questions this raised: hard runs **Wed + Fri**, so
Tuesday stays easy and the bench day is protected; the long run **≤130 with the
pace band widened**; **drop week 8's trial**, next measurement wk 12.

### 1. The reader that had to move first, or the plan change broke the app

`getWeeklyRunVolume` chose its parser by the **slot name**:

```js
if (key === 'quality') { ...parseQualityVolumeKm... }
else                   { ...parseRunDistanceKm...   }
```

A second hard session has to live in the Friday slot. Its text opens
`[INTERVALS] 5×400 m`, `parseRunDistanceKm` returns null, and **that run drops
out of the weekly total in silence** — six to ten kilometres a week, gone from
the card the whole ramp is measured on.

**Sixth instance of this codebase's oldest defect: ask the data, not the
container.** v1.24 fixed exactly this in `classifyRunSession` — but only for
the quality slot. The same assumption was still in two more readers:

- `parseRunSessionKm(text)` — new, and `getWeeklyRunVolume` now uses it for
  every slot. A session that states a quality line or a trial is read as one
  wherever it sits. The Marathon-Revolutie shape is a leading distance that
  already contains its warm-up, so it stays on the distance reader.
- `classifyRunSession` now reads the tag's **content** in every slot, not
  merely whether a tag is present — the MR week tags every session and only
  its intensive one is hard.
- `getPlannedTrialKm` scans every run slot for the trial instead of assuming
  it sits in the quality one.

A week can now hold two quality-shaped sessions, so `getWeeklyVolume` picks
which one is *the* quality session deliberately: the trial if there is one,
otherwise the Wednesday slot.

### 2. Two hard, two easy — weeks 7–21

| | Tue | **Wed** | **Fri** | Sun |
|---|---|---|---|---|
| | easy, ≤130 | **TEMPO** | **INTERVALS** | long run, **easy, ≤130** |

Tuesday stays easy because it is the bench day — "run first, lift after", and
three of these weeks carry a max single.

**Not one weekly total moves, except week 8.** Each new session was sized to
the session it replaced: the Wednesday tempo carries the volume the old quality
session had, and the Friday intervals carry exactly what that easy run carried
(work + 2 km w-up + 1.5 km c-down). The ramp he approved on 30 Sep is intact;
only its character changed.

| wk | 7 | 8 | 9 | 10 | 11 | 13 | 14 | 15 | 17 | 18 | 19 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tempo work | 4.4 | 3.5 | 4.6 | 4.8 | 4.8 | 5.0 | 5.2 | 5.2 | 5.6 | 6.0 | 6.0 |
| interval work | 2.0 | 1.5 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0 | 5.5 | 6.0 | 6.5 |
| week total | 32.4 | 28.0 | 34.6 | 36.8 | 37.3 | 39.5 | 40.7 | 41.7 | 43.1 | 44.5 | 45.5 |

The interval work starts deliberately small — 5×400 m this Friday — because it
is his first week with two hard sessions and the volume had to come from
somewhere other than the total.

Paces keep the v1.24 tiers: threshold 5:00 → 4:53 → 4:46, intervals 4:37 →
4:30 → 4:23. Wednesday tempo then Friday intervals means the two kinds
alternate across the whole block by construction.

**Weeks 12, 16 and 20 keep the trial as their single hard effort**, with Friday
easy. That is the existing deload philosophy and he did not ask to change it.

**Week 8's trial is gone, at his instruction, and it leaves an asymmetry he
should see.** Week 8 is now a deload carrying two (reduced) hard sessions while
weeks 12, 16 and 20 are deloads carrying one. And the next measurement is
**wk 12, 9–15 Nov — eight weeks after the 23:43 on 15 Sep**, so every pace in
weeks 9–11 stays anchored to a trial two months old. Logged as **B30**.

### 3. The long run is run easy

`❤️ Zone 2: 119–137 bpm (5:50–6:10/km)` → `❤️ Zone 1–2: ≤130 bpm — run it easy
(5:45–6:40/km)`, weeks 7–20. Same cap as the easy runs, and the band now spans
his whole easy range instead of its fastest twenty seconds on the longest
session of the week. **That closes B19**, which had been open since v1.19.

### 4. The block headings were the pre-v1.11 ladder, and nothing ever checked

| block | said | its weeks actually prescribe |
|---|---|---|
| 1 (wk 1–4) | 115 kg | 107.5 tune-up |
| 2 (wk 5–8) | 117.5 kg | **112.5 attempt** |
| 3 (wk 9–12) | 🎯 120 kg | **115 attempt** |
| 4 (wk 13–16) | 122.5 kg | no attempt |
| 5 (wk 17–20) | 125 kg | **120 — the real target** |

Rendering on every week screen, with the 🎯 two blocks from where the target
is. `PHASE_INFO` held hardcoded label strings; it is now `PHASE_BLOCKS`
(weeks + colour) and `phaseLabel()` **derives** the label from
`getBenchLadder()` — the heaviest attempt the block's own weeks prescribe, with
the 🎯 on whichever block holds the primary target. It reads: *Block 2 —
112.5 kg · Block 3 — 115 kg · Block 5 — 🎯 120 kg.* It cannot drift again.

**Also corrected:** week 17's notes claimed `bench 4×6 @92.5` where the plan
says `@90` — drift I introduced at v1.26 and did not carry into the prose.
Weeks 10 and 14 now name their top singles the way weeks 6 and 18 do, and week
15 states its load. `MILESTONES` reseeded to the live ladder (112.5 · 115 ·
120, trials 11 Nov / 9 Dec / 6 Jan) — **it seeds fresh installs only**, so his
own stored copy is unchanged; Home → Upcoming Milestones → Edit is still how he
corrects it.

**Deleted:** the `HR_ZONES` constant. Declared, never referenced, and holding a
frozen copy of `119–137` — the duplication class that has produced a wrong
conclusion five times, sitting unused in the file.

### On the Zone 2 question — it is not a bug, it is a model

The app computes Z2 as **65–75% of max**, and 75% × 183 = 137.25 → 137. So the
number is right for the model it uses. Whether that model is right for him is a
different question: the common five-zone %HRmax split puts Z2 at 60–70%, which
at 183 would be 110–128. His stated caps — easy ≤130 (71% of max), long ≤137 —
are his own numbers, and since v1.20 the app judges every run against the band
written on that session, falling back to 119–137 only where none is stated. As
of this build the long run states ≤130 too, so the 137 ceiling now governs
almost nothing. **The real unknown is whether 183 is his max at all** — it is
the app's default, and if it came from 220−age it is ±10 bpm, which moves every
edge. Logged as **B31**: read a real max off a trial or a hard session, or make
the zone model configurable. Not changed, because it is his physiology and a
guess here moves every verdict in the app.

### What now proves it — 3 new checks, and 4 corrected

**Corrected, not removed.** Four v1.24/v1.26 checks were right about the old
plan and wrong about this one:

- *a ramp-in of at least three weeks carries no tempo or interval work* →
  **superseded by his instruction**, replaced with the structure he asked for:
  from the week the Friday slot first turns hard (derived, never a week
  number), every non-trial week runs exactly two hard sessions — one tempo, one
  interval — the long run is never hard, Tuesday is never hard, and four runs
  are still counted.
- *the hard sessions strictly alternate* and *quality paces ramp* both read
  only the quality slot, so they saw one session a week and reported every pair
  as "both tempo". Same assertions, now reading every slot in calendar order.
- *the easy runs restart and step +0.5* asserted **both** easy slots agreed.
  The Friday slot is no longer an easy run, so that stopped being a true
  description. The +0.5 ramp is still asserted on the Tuesday run.

All four exclude the Marathon-Revolutie week **by its own tag**, not by its
number.

**New, all three of which fail on v1.26:**

- **A hard session is counted whatever slot it sits in** — fixtures for every
  shape, then an end-to-end drive: a real `programOverrides` record drops an
  interval session into the Tuesday slot and the weekly total must move by the
  difference instead of losing the run, with nothing reported as uncounted and
  the classifier calling it quality.
- **The block headings are derived** — every block that names a load must name
  the heaviest attempt *its own weeks* prescribe, exactly one block carries the
  🎯, a block whose weeks prescribe no attempt names no load, and every plan
  week resolves to a heading.
- **The long run is capped where the easy run is** — its stated ceiling may not
  exceed the easy run's, and its pace band may not be narrower, on every week
  from the boundary. Both read from the plan; nothing hardcodes 130 or 137.

**One new check was wrong on its first run and the gate caught it**, twice. Its
first fixture for a plain easy run expected `session-distance` and got
`session-total` — the new reader had put the quality parser first and silently
relabelled every ordinary run. Then its trial fixture, written without the
`4×20s strides` line the plan always carries, mis-read its cool-down as 2 km.
The first was a real defect in the new code; the second is a latent parser
quirk in a shape the plan never uses, logged as **B29** rather than fixed here.

---

## v1.26 — 30 Sep 2026 · PROGRAM-REV `2026-09-30-bench120-dec29-row2b-easy5k`

**Four training changes he asked for, and the dead quality branch he cleared me
to fix.** Both axes move. Gate 119 → 128.

His message, 30 Sep, in his order:

> *"I think we should skip the back exercise on chest day. I am neuromuscularly
> drained at the end of the session."*
> *"Bench press: base my suggested weights of my recent attempt at 110kg which
> was 10/10, about two weeks ago… I cannot lift 1x115kg today, i think."*
> *"Perhaps we can be a little bit more creative with the metcon."*
> *"The distance of the easy runs is crazy now. Put this week at 5k, and build
> it up maybe 0.5k per week per run."*
> *"b27: dont worry about the strictness on climbing the quality ramp."*

Four of those change the training, so each was put back to him before anything
was written. His answers: the row **moves** to upper day 2 rather than being
deleted; **"I need to have that 120 this year. Try 112.5 next week, fresh, and
build a schedule that leads up to 120kg this year before 31 dec"**; rotating
finishers on **both** gym days; and the **two easy runs only** — the parked
fourth run and the long run stay as written.

### 1. The chest-day row moves to upper day 2 — weeks 6–21

`BB Row` (blocks A and C) / `Cable Row` (block B) comes out of Upper A and goes
into Upper B beside `Seated Low Row`. **Face Pulls stay** — they are the stated
shoulder constraint and the gate has asserted them in every Upper A since v1.21.

Back volume is unchanged at **8 row sets a week**; they moved, they were not
deleted, and a check asserts exactly that against the last untouched week rather
than against a number written into the gate.

Chest day is now nine lines instead of ten, and the row is gone from the end of
it — which is where the drain was.

### 2. The ladder, re-based on a true 110

**The diagnosis first, because it is worse than "115 is a bit heavy".** A 110
at RPE 10 two weeks ago *is* his 1RM. Against that:

- **wk 6 prescribed `Top Single 1×1 @110`** — a second max attempt dressed as a
  92–97% rung, five days before an attempt week.
- **wk 7 prescribed a 115 attempt** — 105% of a max he had just ground out.

That is the exact shape v1.11 diagnosed and the whole peaking design exists to
prevent, reappearing because the ladder was anchored to a max that was assumed
to have climbed and had not.

| wk | dates | was | now |
|---|---|---|---|
| 6 | 28 Sep – 4 Oct | Top Single @110 | **@105** (93% of 112.5) — a rung, not a max |
| 7 | 5–11 Oct | 115 ATTEMPT | **112.5 ATTEMPT · Tue 6 Oct** |
| 10 | 26 Oct – 1 Nov | Top Single @115 | **@107.5** (93% of 115) |
| 11 | 2–8 Nov | 117.5 ATTEMPT | **115 ATTEMPT · Tue 3 Nov** |
| 14 | 23–29 Nov | Top Single @115 | **@112.5** (94% of 120) |
| 15 | 30 Nov – 6 Dec | 120 ATTEMPT | **build week**, 4×4 @105 |
| 17 | 14–20 Dec | 4×6 @92.5 | **@90** |
| 18 | 21–27 Dec | 4×3 @105 | **4×3 @102.5 + Top Single @117.5** (98% of 120) |
| 19 | 28 Dec – 3 Jan | build week | **120 ATTEMPT — Tue 29 Dec 2026** |

**112.5 · 115 · 120 — three attempts, which is the A7 ceiling, and the last one
is on 29 December.** Every attempt stands on a trained single at 92% or more, so
the rule the gate enforces is satisfied without weakening it, and by the time he
takes 120 he will have *made 117.5 as a trained single* eight days earlier.

**Two things he should see.** The block now ends on an attempt rather than a
build week, so wk 20's deload is doing real work. And **wk 19 is 28 Dec – 3 Jan**
— the attempt is written for **Tuesday 29 December** and the session text says so
in full, with the year, because "before 31 Dec" cannot be checked against a week
label that straddles New Year. A gate check now parses that date and asserts it
falls inside the year; it is the first check in this project that reads a
calendar date out of a session and holds the plan to it.

**What was NOT re-based.** The working sets — 4×3, 4×6, the back-offs, paused
bench, close-grip — are almost all correct against a real 110 already (wk 6's
4×3 @97.5 is 88.6%), so only wk 17 and wk 18 moved, where they had drifted to
80% and 91% of a max that had not arrived. **His logged rep results could not be
read from here** — they live in localStorage and the Supabase table, and a cloud
session has no device bridge. The app does that itself: `getLoggedBenchHistory()`
and the rep-PR floor refine the estimate every time he saves a set, and the goal
block reports the gap from it.

### 3. Finishers on both days, rotating

The old metcon was four push-up-and-core variants on a four-week cycle — varied
in *format*, identical in *content*, and only on chest day.

**Chest day — chest + core, and all of it lockout-biased**, because that is where
120 fails: close-grip push-ups and hollow rocks; DB floor press, weighted sit-ups
and a hollow hold; dips, hanging leg raises and a plank; feet-elevated push-ups,
V-ups and Russian twists.

**Upper day 2 — kettlebell and dumbbell work, which it had none of**: KB swings
and man makers; KB swings, burpees and Russian twists; a lighter deload version;
and a five-round man-maker piece. Every man-maker line carries the cue **"clean
to the shoulders — nothing overhead"**, because Upper B already presses and
stacking a third overhead exposure is the thing the shoulder constraint exists
to stop.

**On the three attempt weeks the chest-day finisher is core only** — *"nothing on
the chest and nothing overhead after an attempt — the bar already had it."* That
is a judgement, not his instruction, and it is one line per week to reverse. It
is also the smaller half of **B23**'s point, which he has not answered: the
push-up metcon sitting on the heavy bench day is unquantified chest and triceps
fatigue on the one day that matters most. This build stops it on the three days
where it would cost an attempt; the other thirteen still carry it, by his choice
of "abs and chest are important on chestday".

### 4. The easy runs restart at 5 km

Both easy runs, weeks 6–20. +0.5 km a week on every build week; a deload week
takes the preceding build week's figure less about 20%, so a deload stays a
deload. The parked fourth run, the long run and week 21 are untouched.

| wk | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| easy ×2 | 5 | 5.5 | 4.5 | 6 | 6.5 | 7 | 5.5 | 7.5 | 8 | 8.5 | 7 | 9 | 9.5 | 10 | 8 |
| week total | 30.4 | 32.4 | 29 | 34.6 | 36.8 | 37.3 | 33 | 39.5 | 40.7 | 41.7 | 37 | 43.1 | 44.5 | 45.5 | 44 |

No build week steps more than **+6.8%**, every deload is below the week before
it, and the peak is **45.5 km at wk 19** against 52.5 before.

**One consequence he should decide on, and it is arithmetic rather than opinion.
The long run is now 41% of the week and falls only to 35% by January.** The
30–35% ceiling this plan has held since v1.13 is breached for the next two
months, because the long run stayed where it was while the easy runs halved.
Nothing was changed about it — he said easy runs — but it is **B28**, and
bringing the long run to ~10 km with the same +0.5 ramp would put the share back
inside the band immediately.

### 5. B27 — the quality branch could not fire, and now can

Its three detectors wanted `N×DDDm` with the m touching the digits, or
kilometres, or the word "min". Every hard session in the plan is written
`N×DDD m`, in metres, with a space; "min" appears in no session at all. Measured
across 21 weeks: **it had never produced a suggestion and could not.** Fifth
instance of the class this file keeps naming.

He cleared the judgement call that was holding it — *"dont worry about the
strictness on climbing the quality ramp"* — so it ships:

- `parseQualityRepScheme(text)` — the rep count, the rep distance and the work
  volume, from the session's own tagged first line. A parked easy run, a time
  trial and the Marathon-Revolutie session all return null; they state their own
  totals and are never rescaled mechanically.
- **It refuses a session whose stated `≈ N km of quality` disagrees with its own
  rep scheme**, rather than guessing which of the two is right.
- `rewriteQualityReps(text, n)` — adds reps **and moves the stated quality volume
  with them**, so the plan text and `getWeeklyRunVolume()` cannot drift apart.
  Exactly two lines may change; a gate check asserts that the warm-up, the
  cool-down and everything else come through byte-identical.

Because the volume line now moves, `projectWeeklyVolume` sees the change and the
existing consequence line states the real cost — so a suggestion that would
breach the 10% ceiling says so, which was the whole point of B12.

**The rewrite is offered, never applied.** It is a card with Yes and No on it,
as of v1.25.

### One build was broken and the gate caught it

The first version of the branch replacement left **one closing brace too many** —
the old `if (intMatch) {` block was closed both by the new code and by the tail
that was kept. The app did not boot: 112 of 128 checks went red at once with
`window.getWeeklyVolumeSeries is not a function`, which is what a parse error
looks like from the outside. Recorded in the notes: **when a replacement spans a
block boundary, count the braces on both sides of the splice**, and a mass
failure across unrelated suites means the file did not parse, not that the plan
moved.

### What now proves it — 9 new checks, 7 of which fail on v1.25

Four for the training changes, three for B27, two guard rails.

- **The chest day carries no row, and the sets moved rather than vanished** —
  asserted against the last week before the editable boundary, which is derived
  from the plan (the first week whose quality slot is parked), never from a
  number. It also fails loudly if that comparison week stops having a chest-day
  row, i.e. if the check has quietly stopped proving anything.
- **The primary target names its attempt date in its own text, that date parses,
  and it falls inside the year** — plus the target is the heaviest attempt and no
  attempt comes after it.
- **The easy runs came down and then step exactly +0.5 km on every build week**,
  both slots agree, every deload steps back, and the first editable week is
  strictly below the week before it. The Marathon-Revolutie week is excluded by
  its own tag, not by its number.
- **Both gym days finish on a conditioning piece**, each with at least three
  forms across the block, upper day 2's always names loaded work, and **no
  chest-day finisher puts pressing volume on an attempt week**.
- **The rep scheme reads the plan's own shape** — eleven fixtures including the
  refusals, plus a plan invariant that every tagged hard session parses and
  agrees with the volume model to within a metre.
- **Adding a rep moves the stated quality volume with it and changes nothing
  else** — exactly two lines differ, the result re-parses, and nine refusals
  return null rather than a half-edited session.
- **End to end: a hard session at RPE 5 now earns a suggestion**, its reps rise
  while the rep distance does not, the projection sees the volume increase, and
  the card states the resulting weekly total. This is the check that fails on
  v1.25 for the exact reason B27 existed.
- **GUARD** (both already held on v1.25, kept to protect this rewrite and the
  next): no build week breaches +10%, and every deload runs less than the week
  before it.

No check hardcodes a week number, a load, a distance or a date.

---

## v1.25 — 30 Sep 2026 · PROGRAM-REV unchanged

**The coach now states both goals on every session and asks before it changes
anything, and the suggestion builder is finally testable.** Closes BACKLOG
**B17**; ships parts 1 and 3 of **B25**, the item he deferred to this run.
Code only — no training content changed, so `PROGRAM_REV` does not move.
Gate 113 → 119.

**Mardy, 27 Sep: "I feel we can strongly improve it. Maybe ask questions at the
end of the session: I see x y z, would you like me to adjust this or this? make
it more interactive. It should always keep the goal i have very clear. 120kg
bench press and a faster 5k."**

### 1. B17 first, because it was the precondition

`buildCoachSuggestions` was declared **inside** `renderSessionLogger`, so it was
not on `window` and the only way to exercise it was to drive the real UI —
navigate, log, press the button — which reaches one branch per run. Seven
builds have shipped its strength branch with no direct assertion on it at all.

It is now a top-level builder like every other one in this file. The move is a
relocation, not a rewrite: it reads `WEEKS`, `getPlanned`, `getZ2Range`,
`isSuggestionBlockedWeek` and `volumeConsequenceLine`, all of which are already
top-level, so it closed over nothing. The only edit to its body is a `= {}`
default on the destructured parameter, so a degenerate call reports nothing
rather than throwing.

**What that immediately bought.** The strength branch is now asserted directly:
its edit must start from next week's own plan text, must not add or remove a
line, and — the assertion that matters — **stripping the `@N kg` figure must
make every changed line identical to the one it replaced.** An RPE 5 session
may raise a load; it may not touch anything else in the session while it does.

### 2. Both goals, on every session

v1.24 named the 120 kg target on a **gym** session only, through
`strengthCoachLines`, and never named the 5K goal on either kind of session.
On a run day the coach named the *next rung* — 107.5 kg on Wk 3 — which is a
milestone, not the goal. "Always keep the goal very clear" means both, always.

- `getGoalAnchors(wk, opts)` — pure. The bench goal is whichever week the plan
  marks `isPrimaryTarget`, with that week's own date label; the run goal is the
  **most ambitious trial target the plan itself states**, chosen by VDOT so a
  10K target and a 5K target are comparable.
- `goalAnchorLines(wk, opts)` — the prose, split from the anchors the way every
  analyser in this file splits them.

**Nothing is hardcoded — not 120, not 22:30, not a week number.** That matters
more here than anywhere: the coach has been wrong about his ladder twice by
holding its own copy of a number (v1.17, v1.18).

What it says today, with a bench set and the 15 Sep trial in the log:

> 🎯 Goal 1 — 120 kg bench, Wk 15 (30 Nov – 6 Dec), 9 weeks out. Best estimate
> 110.8 kg, 9.2 kg still to find.
> 🎯 Goal 2 — a faster 5K. Last trial 23:43 over 5 km (VDOT 40.8). The plan's
> own best target is 22:45 over 5 km on Wk 16 — 58 s to find, 2 VDOT points.
> Next trial Wk 8.

**And that surfaced something he should see. The plan states 22:45, not 22:30.**
`TRAINING-CONTEXT.md` records the working target for this block as 22:30; the
trial sessions themselves are written `target 23:15` (Wk 8) and `target 22:45`
(Wk 16), and Wk 4 and Wk 12 state no target at all. The goal line reports what
the *plan* says, because that is the file the app runs on. Logged as **B26** —
his numbers, his call which one is right.

The seconds gap is stated **only when the two distances match**, for the reason
`getTrialTrend` already refuses to compare across distances: a 10K target
against a 5K trial reads as a twenty-five-minute deficit on a better run.

Today's bench set counts toward the gap before it is saved, and it is passed in
as a parameter rather than read from `window._strengthAnalysis` — that global
survives a navigation and would quietly carry another week's session into the
number.

### 3. The card asks, and offers both answers

The suggestion block was headed "Program adjustments" and each card stated a
change with one button. It now opens `💡 1 change I would make — want me to?`
and each card reads as the question, with **Yes, apply** and **No, leave it**.

`coachQuestionFor(s)` builds the question from the suggestion's **own label**,
so a suggestion added later cannot forget to phrase itself, and adds `(Wk N)`
when the label does not already name its week.

**"No" is deliberately inert.** It writes nothing, queues nothing and creates no
override; it retires the question so an answered card cannot be answered again
by a stray tap in a gym. Accepting still applies exactly as before — the gate
now drives *both* answers in one check, so the decline path cannot be added at
the cost of the path that does the work.

### What is NOT here, and why

**Part 2 of B25 — genuinely interactive follow-ups — is not built.** A coach
that can be asked a second question is a conversation model, not a card, and
this build deliberately spent its budget on the precondition (B17) and on the
two parts that are provable. The session now *ends* on answerable questions,
which is the shape part 1 asked for. Re-ranked as **B25b**.

### A dead branch, measured and not fixed — see B27

While making the builder testable, its quality-session branch was run against
the plan. **It cannot fire on a single one of the 21 weeks.** Its three
detectors are `/(\d+)×(\d+)m/`, `/(\d+)×(\d+)\s*km/` and
`/(\d+)\s*min\s*(continuous|@)/i`; every quality session in the plan is written
`N×DDD m` **with a space before the m**, in metres, and the word "min" appears
in no session at all. So the first needs no space and never matches, the second
needs km and never matches, and the third has nothing to match.

This is the fourth instance of the class this file keeps naming: a detector
that does not fit the data it reads. It was not fixed in this build, and that
is a judgement rather than an omission — **making it live means the coach starts
offering to add reps to his hard sessions from Wk 9 on**, against a quality ramp
he agreed that climbs 4.0 → 6.0 km monotonically, and the `≈ N km of quality`
line would have to move with the rep count or the plan text and the volume model
would disagree with each other. What that branch *should* offer is a programme
decision. Logged as **B27** with the measurement and the two questions.

### What now proves it — 6 new checks, all 6 of which fail on v1.24

- The builder is on `window`, is **pure** (two identical calls agree, the plan
  and `programOverrides` are untouched by a call), targets only the next week
  and only the session that was logged, starts from that week's own plan text,
  returns nothing for a blocked week or a week outside the plan, and does not
  throw on four degenerate calls.
- The strength branch, asserted directly for the first time: right week, right
  session, starts from the plan, same line count, and every changed line
  differs from its original **in nothing but the kg figure**, which never falls
  on an RPE 5 session.
- The goals are read from the plan: the bench load literally appears in that
  week's own Upper A text, the date label is the week's own, the target time
  literally appears in that trial session's own text, its distance agrees with
  `getPlannedTrialKm`, and it is the **highest-VDOT** target of the three the
  plan states — a check that a merely-correct-looking pick would fail.
- The lines name both goals with their own numbers on a fresh install *and*
  with a bench set and a trial seeded, where the gap in kg and the gap in
  seconds must both be stated rather than the target repeated.
- End to end at 320px, on a **run** session and on a **gym** session: the
  rendered coach output names the bench load, the week it lands on, the plan's
  5K target and his last trial time. v1.24 fails this on both.
- End to end: the block opens with a question, each card asks one, both
  controls are present; **No** leaves `getPlanned` and `programOverrides`
  byte-identical and retires the card; **Yes**, pressed afterwards, still lands
  the override.

No check hardcodes a week, a load or a time.

---

## v1.24 — 27 Sep 2026 · PROGRAM-REV `2026-09-27-run4x-rampin-tempo-interval`

**Four runs a week, three weeks of that before any of them gets hard, then a
strict tempo/interval alternation at paces that ramp instead of sitting at the
goal.** Training content, his instruction. Both axes move. Gate 109 → 113.

**Mardy: "Coming week will be the first week i do four runs. I need to do that
for three weeks like that, before one of them is becoming a hard session.
Change this directly. Be smart with the programming on those hard sessions:
really switch between tempo and interval."**

The plan has always *written* four runs; he has been doing three. So this is
not an added session, it is the fourth slot finally being used — and the first
three weeks of using it should not also be the first three weeks of new
intensity.

### The ramp-in, weeks 6–8

| wk | dates | fourth run |
|---|---|---|
| 6 | 28 Sep – 4 Oct | 7.9 km easy — was `[TEMPO] 4×1100 m` |
| 7 | 5–11 Oct | 7.9 km easy — was `[INTERVALS] 8×550 m` |
| 8 | 12–18 Oct | 5K time trial (unchanged) |

Both converted sessions keep the **exact total** the quality session carried
(4.4 work + 2 w-up + 1.5 c-down = 7.9 km), so **not one weekly total moves** —
verified week by week against v1.23 before shipping. The weekly ramp is his and
this change does not touch it.

**Week 8 keeps its 5K trial, and that is a judgement he should see.** It is a
hard effort inside what is meant to be an easy block. It stays because it is
not a training session — it is the measurement that sets every pace from week 9
on, it sits on a deload, and `TRAINING-CONTEXT` records that the trial/deload
pairing must survive any restructure. So the honest description is: **two weeks
of purely easy four-run training, then a reduced week whose only hard effort is
the test itself.**

### Weeks 9–19: tempo and interval, alternating, nothing else

Before, the block cycled four session types — tempo, threshold, cruise and race
pace — which is a defensible design but not what he asked for. Now:

| wk | session | work | pace |
|---|---|---|---|
| 9 | TEMPO 2×2300 m | 4.6 | 5:00 |
| 10 | INTERVALS 6×800 m | 4.8 | 4:37 |
| 11 | TEMPO 2×2400 m | 4.8 | 5:00 |
| 13 | INTERVALS 5×1000 m | 5.0 | 4:37 |
| 14 | TEMPO 2×2600 m | 5.2 | 4:53 |
| 15 | INTERVALS 8×650 m | 5.2 | 4:30 |
| 17 | TEMPO 4×1400 m | 5.6 | 4:46 |
| 18 | INTERVALS 6×1000 m | 6.0 | 4:23 |
| 19 | TEMPO 3×2000 m | 6.0 | 4:46 |

**Every work volume is identical to what was there**, so again no weekly total
moves. Only the type, the rep structure and the pace changed.

**Week 9 is a tempo on purpose.** After three weeks of purely aerobic running
the right re-entry to intensity is threshold, not VO2max — extensive before
intensive. That choice then fixes the parity of the whole alternation.

**The paces now ramp — this is the real fix.** Every quality pace in the plan
was anchored to 22:30, which is his target and not his fitness, so run as
written every session was a race (A4, and the likeliest reason a four-run week
became three). They are now stepped in three tiers tied to the trial cadence:

| | before the wk 12 trial | before the wk 16 trial | final block |
|---|---|---|---|
| threshold | 5:00 | 4:53 | 4:46 |
| VO2max interval | 4:37 | 4:30 | 4:23 |

Tier one is his **current** fitness from the 23:43 (VDOT 40.8). Tier three is
22:30 fitness (VDOT 43.4). He runs toward the target rather than starting on
top of it, and once he enters a trial time the app re-anchors the coach's
verdicts automatically (v1.22).

**One collision he should know about.** Week 15 carries both the 120 kg bench
attempt and an interval session. Strict alternation and "week 9 starts with a
tempo" together fix that parity — there is no arrangement that gives both bench
attempt weeks the gentler session. Week 11 got the tempo because week 15's
running volume already steps back and the attempt is Tuesday; the session text
says to run it Thursday and to effort.

### Code: `classifyRunSession` reads the session, not the slot

Parking the fourth run as an easy run exposed a latent defect. The classifier
returned `quality` for anything in the quality slot **because of the key it sat
under**, so weeks 6 and 7 would have been judged against a Z4 target while
their own text says ≤130 bpm. It now reads the first non-empty line: every
quality prescription in this plan opens with a bracketed tag, and a parked easy
run does not.

The stated per-session HR band would have saved the verdict anyway — that is
what v1.20 built — but the coach would still have called an easy run a quality
session in its prose. Same class as reading the bench ladder off a week list:
**ask the data, not the container.**

### What now proves it — 4 new checks, all 4 of which fail on v1.23

None hardcodes a week number; all read each week's own text, so they stay valid
when the calendar moves.

- **The classifier** against fixtures and as a plan invariant: every week whose
  quality text opens with a tag classifies `quality`, every trial `trial`, and
  every parked week `easy`.
- **The ramp-in exists**: the longest stretch of consecutive weeks carrying no
  tempo or interval work, bounded by intensity on both sides, must be at least
  three weeks — derived, not asserted about weeks 6–8. Before this change the
  only such gaps were single trial weeks. It also asserts the parked weeks are
  still *counted* in the weekly volume and still run four sessions, so "no hard
  session" cannot quietly become "no session".
- **Strict alternation**: no two hard sessions of the same kind back to back,
  and every hard session tagged as one of the two kinds he asked for.
- **The paces ramp**: tempo and interval sequences each progress monotonically,
  the first is strictly slower than the last (so a pinned single anchor fails),
  and nothing is faster than the rep pace implied by the most ambitious trial
  target the plan itself states.

**Two of those checks were wrong on their first run and the gate caught it.**
They scanned all 21 weeks, and fired on weeks 1–5 — which are already run,
carry the old anchor's paces, and are not editable, because the logger
reconciles saved exercises by name. Both are now scoped to the weeks from the
ramp-in onward, with the boundary derived from the plan (the last parked week)
rather than from a number. Recorded in the notes: **a check over "the plan"
usually means "the editable part of the plan".**

---

## v1.23 — 27 Sep 2026 · PROGRAM-REV `2026-09-27-bench120-cgbp-lat-ladder3`

**Two defects he reported, and the upper-body rebuild he asked for.** Both axes
move: `PROGRAM_REV` because the training changed, `APP_VERSION` because the file
did. Gate 102 → 109.

### 1. The milestone editor discarded everything (reported: "I can click Edit but cannot edit or remove anything")

Headless, with clean storage, the widget worked — inputs typed, delete spliced.
So the bug was never in the widget, it was in the **journey**, and driving the
three real ones reproduced it immediately:

| journey | result before |
|---|---|
| rename a row → press **Done** | edit never reached state *or* disk |
| delete a row → press **Done** → reload | **deletion gone**, row back |
| one row missing a date → press **Save** | refused, error rendered at **y=1035px in an 844px viewport — off screen** |

One design flaw behind all three: the editor keeps a working copy in `state`
and only `ms-del`, `ms-add` and `ms-save` ever called `readBack()`. The toggle
is labelled **Done**, which reads as "commit", and it committed nothing — it
flipped the view flag and re-rendered, so anything typed since the last button
press was never even read out of the DOM. Delete mutated the working copy and
wrote nothing, so it survived exactly until the next boot. And one malformed
row refused the whole list with a message he could not see.

**What ships:** one `commit()` path shared by Save and Done; delete persists
immediately, because a delete is unambiguous and needing a second button press
to make it stick is what lost it; validation now distinguishes an **entirely
empty row** (added and abandoned — dropped silently) from a **half-filled one**
(a real mistake — refused, the error scrolled into view, the offending row's
inputs marked red). A refused commit keeps the editor open.

This also unblocks **B13** and **B22**, which were both stuck on "a code fix
cannot reach him because `getMilestones()` seeds once and then persists his
copy". It can now reach him because he can edit the list himself.

### 2. Rep PRs had no floor (reported: a 12×60 PR means 60 is proven at every rep count below 12)

He is right, and the store did not know it. `exercisePRs[key][reps]` kept each
rep count as an independent slot, so a 12-rep PR said nothing about the 8-rep
one and every weight suggestion read low for any rep count he had not happened
to hit exactly.

The missing rule: **a rep-max table must never increase as the rep count
falls.** `floor(r)` = the heaviest weight recorded at any rep count ≥ r.

- `applyRepPRFloor(prs)` — pure, idempotent. Walks from the highest rep count
  down carrying the heaviest **real** weight seen.
- Derived entries carry `implied: true` and `impliedFrom`, the rep count that
  proves them, so the app never reports a lift he did not perform.
- Where a real but lighter lift already sat in that slot, its weight is kept as
  `actualW`. That is what makes the whole thing idempotent — only real weights
  are ever read as sources, so re-running cannot ratchet.
- **The estimated 1RM is untouched by construction.** Epley at a fixed weight
  rises with reps, so an implied 60×1 can never beat the 60×12 that created it,
  and `getBestE1RM` reads real weights only. A gate check pins the equality.
- `updateExercisePRs` re-floors after each save, and separates two things that
  look alike: **beating** the recorded weight is a PR and is announced;
  **performing** a weight that was only implied is not a new PR — it was
  already proven — but it is a real record and replaces the derived one, or the
  log calls it implied forever.
- The most-recent-lift lookup skips implied entries, or the PR card would
  report "your last lift" as something with no date that never happened.
- The PR tab shows implied entries dimmed and labelled `implied · 12RM`.
  Hiding them would recreate exactly the confusion this fixes.
- `migrateRepPRFloor()` backfills everything already stored, at boot,
  idempotently — it returns how many exercises it changed, so a second run
  returning 0 is the proof rather than a claim.

### 3. The upper body, rebuilt for the bench (his instruction, set-neutral)

Counted across all 21 weeks first, because "is there enough shoulder work" is a
measurement, not an opinion. Per week, before:

| | sets/wk | | sets/wk |
|---|---|---|---|
| Back | **15.0** | Triceps | 7.0 |
| Chest | 12.0 | **Biceps** | **6.7** |
| Shoulders · vertical press | 4.0 | Shoulders · rear delt | 3.0 |
| **Shoulders · medial delt** | **0.0** | | |

Five findings: **zero lateral raises in twenty-one weeks** — absent, not light;
biceps volume equal to triceps volume inside a bench-peaking block; **no
close-grip, dips, floor press or incline anywhere**, so nothing lockout-specific
in a plan whose goal fails at lockout; `Pullover Machine` carrying 63 sets of
the block's lowest-yield work; and `Military Press` frozen at 4×6 for five
months as the only vertical press.

Four swaps, **weeks 6–21 only**. Weeks 1–4 are logged and week 5 is today; the
logger reconciles saved exercises by name, so editing them would report work he
has already done as removed from the plan.

| | was | now |
|---|---|---|
| Upper A | `Rope Pushdown 4×12` / `Skull Crusher 4×10` inside a triceps superset | **`Close-Grip Bench`**, lifted out of the superset and moved up beside the presses |
| Upper B | `Pullover Machine 3×12` | **`Lateral Raise`** |
| Upper B | first biceps exercise 4×10 | 3×10 — the set that funds the fourth lateral |
| Upper A | `Military Press 4×6`, every week | **waved** 4×8 / 4×5 / 3×6 by cycle position |

**Per week, after: medial delt 0 → 3.8, shoulders in total 7.0 → 10.3, back
15.0 → 12.0, biceps 6.7 → 6.0, and the triceps work is now a loaded compound
press instead of two cable extensions.** Total sets per week are unchanged,
deliberately — he is ramping running at the same time and this build buys
specificity, not volume.

**Loads were assigned, not agreed, and are reversible.** Close-Grip Bench is
written at the week's own paused-bench load minus 7.5 kg, dropping to 3×6 at
−5 more on unload and deload weeks. Military Press waves 45→50 on the 4×8 weeks
and 52.5→57.5 on the 4×5 weeks. Both are one line each to change.

**Not done:** `Incline DB Press` was *not* restored. v1.11 removed it
specifically to avoid a third pressing exposure against a stated shoulder
constraint, and reversing that is his call, not a side effect of a volume audit.

### 4. The bench ladder is now 115 → 117.5 → 120, all before the year ends

His instruction: *"if 115 lands cleanly, we should build up to 117.5 and then
120. Do that, all before end of the year, but realistically."*

| wk | dates | was | now |
|---|---|---|---|
| 7 | 5–11 Oct | 115 attempt | unchanged |
| 11 | 2–8 Nov | third build week, 4×4 @102.5 | **117.5 kg ATTEMPT**, on wk 10's 115 top single (97.9%) |
| 15 | 30 Nov – 6 Dec | 120 attempt | unchanged — now standing on a made 117.5 |
| 19 | 28 Dec – 3 Jan | 122.5 attempt | **build week, 4×4 @107.5** |

+2.5 kg per four-week cycle, each attempt on a trained rung — that is what
"realistically" buys. Week 11 carries an explicit fallback line: if week 7's 115
was a miss or a bad grind, repeat 115 there and leave 120 at week 15.

**Week 19's attempt had to come out, and this is the part he should see.** The
gate enforces at most three attempts in the block — the ceiling **A7** set,
because each attempt costs a taper week *and* the deload behind it. Adding
117.5 without removing something made four. Weakening that check to fit was not
an option, so week 19 became a build week: 115 · 117.5 · 120 are three
attempts, all before the year ends, which is exactly what he asked for. **A7 is
thereby answered too**, in the direction A7 itself recommended. One line to
reverse if he wants 122.5 back.

**Week 11's running step-back now lines up again.** v1.13 cut week 11's volume
5.9% "for the 120 kg attempt"; v1.21 moved the attempt out and left the cut
stranded. Week 11 is an attempt week again, so the step-back protects something
once more. That also retires open question 3 of **A6** in its current form.
*(Measured on 19 Oct at v1.28: it does not. The v1.26 easy-run ramp walked over
the cut and week 11 now runs MORE than week 10. See the v1.28 entry and B38.)*

### Three gate checks were wrong and were corrected, not removed

All three encoded "117.5 kg is retired", which was true until he put it back in
the ladder on purpose. **The number was never the defect.** The pre-v1.11
ladder's actual defect, diagnosed at v1.11, is a 20 kg gap between the heaviest
*trained* set and every attempt.

1. `no bench prescription or ramp reintroduces 117.5 kg` → **`every bench
   attempt stands on a trained single at 92% or more`**. This asserts the rule
   the ban was standing in for, so it also covers loads nobody has thought of
   yet, and it still catches the retired ladder — which had a 115 kg *attempt*
   at week 3 with nothing trained beneath it. That signature is pinned
   separately.
2. The November exclusion applied to **every** attempt. Too broad, and wrong
   once an intermediate rung is wanted: on a four-week cycle the only attempt
   slot between 115 and 120 falls in November. Narrowed to the primary target,
   which is what v1.21 actually cared about.
3. The milestone check's flat `117.5` ban → the attempts must **climb**.

**A first version of that third replacement was itself wrong and the gate caught
it.** It asserted every trained single climbs, and fired on week 14's 115 rung
sitting behind the week 11 attempt — which is the design working, not a fault.
A submaximal single after a max attempt is correct. Monotonicity belongs to
attempts, not to every single. Fourth time a canary has been right and the new
code wrong, and the first time the wrong thing was the check's own logic rather
than a comment.

### What now proves it — 7 new checks, all 7 of which fail on v1.22

Three drive the real milestone editor: **Done** must commit to state *and*
disk and close the editor; a delete must reach storage without a second press
and survive a reload; a half-filled row must be refused with the error
**inside the viewport** and the offending row marked, while an abandoned blank
row must be dropped rather than blocking the edit he did want. Four cover the
floor: the pure rule with idempotency across three runs, no invention above the
highest logged rep count and seven degenerate inputs; the invariant that the
floor never lowers a real entry and never moves the e1RM; the save path
including the promote-an-implied-entry case and the "confirming is not a PR"
case; and the boot backfill, asserted over the **whole** stored set — every
exercise must read non-increasing as the rep count rises and start at 1RM —
with a second migration returning 0 as the idempotency proof, and the PR card
labelling implied entries.

**One of those checks was itself broken and had to be repaired.** It seeded
`exercisePRs` and asserted the backfill, but a first boot runs
`purgeTrainingData()` and re-seeds `VERIFIED_EXERCISE_PRS` over whatever is
stored — so the fixture was wiped before `initApp()` ever saw it and the check
tested nothing. It now also satisfies the reset and epoch flags, i.e. it
simulates an existing install rather than a fresh one. Recorded in the notes:
**seeding storage in this app means seeding the migration flags too.**

---

## v1.22 — 27 Sep 2026 · PROGRAM-REV unchanged

**Time-trial results now have somewhere to live, and they anchor the paces.**
Closes BACKLOG **A2**, the top item, built as placement **(a)** — the
recommendation A2 itself recorded for the next run absent an answer. Code
only; no training content changed, so `PROGRAM_REV` does not move.
Gate 96 → 102.

**The plan prescribes a trial on every deload week plus a longer one at the
end, and `TRAINING-CONTEXT.md` calls them "the entire measurement system for
the running goal". The app could not record one.** The logger asks a trial
session for distance, average pace and heart rate — never the time. So the
single number the whole block is measured by was the one number that had no
field, and `state.runPRs` holds one string per distance, which is a PR and not
a series. This is the fifth instance of the pattern this file keeps naming,
with a twist: not unread data this time, but *underived* data — the app could
reconstruct a trial only by multiplying an average pace by a distance and
rounding twice.

**What ships — pure and exposed, so the gate asserts the model, not the prose.**

- `parseTrialTime` / `formatTrialTime` — `23:43`, `1:02:15`. **A bare number is
  refused**, for the reason `parsePaceSec` refuses one: `1423` could be seconds
  or a mangled `14:23`, and a guessed trial time becomes a fabricated VDOT and
  then a fabricated set of paces the coach reports back as fact. Anything
  under a minute or over ten hours returns null.
- `getPlannedTrialKm(wk)` — the trial distance read from the session's own text
  through `getPlanned()`, so his overrides count and no week list exists to
  drift. Null on a week that prescribes none.
- `getTrialResults()` / `saveTrialResult()` / `deleteTrialResult()` — an array
  of its own in localStorage, **deduped on (week, distance)** the way
  `addToQueue` dedupes on (week, session), so re-entering a time corrects that
  record rather than adding a second one. Epoch-filtered, so a
  retired-programme result cannot poison the trend, and a structurally wrong
  record is dropped rather than read.
- `getTrialTrend()` — each result with its pace, its VDOT, its derived paces
  and its delta **against the previous trial at the same distance**. Distance
  is part of the key, not an afterthought: comparing the 10K against a 5K
  would report a twenty-five-minute regression on a better run.
- **A card on the week view, on trial weeks only** — beside the Running volume
  card, on the same proven render path. That is where he is standing when he
  runs the trial. It shows the time, the pace, the VDOT, the delta against the
  last trial at that distance, the earlier results, and the easy / threshold /
  interval paces that fall out of it. A time it cannot read turns the field red
  and says nothing was saved, rather than swallowing it.

**`getLatestTrial()` now prefers a recorded result.** It previously
reconstructed a trial from a logged session's average pace. Where both exist
from the same week onward, the recorded clock time wins and the anchor reports
which it used. That anchor is what drives the A4 stale-prescription warning —
the coach line that says a session prescribes a pace faster than his current
fitness supports — so the whole v1.19 detection now runs off an exact time
instead of a double-rounded one.

**Storage.** Pushed through `syncExtrasSilent()`, the same best-effort path
`hrConfig` and `milestones` already use, so a `profiles` table without the
column stays non-fatal and localStorage remains canonical. The read-back
**unions on (week, distance) with the local copy winning a tie** — a trial
entered in the gym on a dead signal must not be erased by an older snapshot.
That is the same class of bug `resolvePlanned` had at v1.11, avoided by
construction rather than found later.

**What is NOT here, deliberately.** A Home-view trend block — option (b) in
A2 — is not built. (a) is the placement that makes the feature usable at all;
(b) reads the same model and can be layered on top whenever he wants it, and
is now a one-card job rather than a feature. Logged as **A2b**.

**What now proves it — 6 new checks, all 6 of which fail on v1.21.** Time
parsing and formatting including every refusal and the round trip; a plan
invariant asserting that the trial reader and the weekly volume model agree on
exactly which weeks carry a trial, that every parsed distance literally appears
in that session's own text, and that the block still holds two different trial
distances (so the same-distance keying is actually exercised); dedupe on
(week, distance) with a correction, a second distance in the same week, a later
week, six refusals that must store nothing, survival across a reload, deletion,
a corrupt store degrading to `[]`, and a retired-epoch record being dropped;
the trend's pace, VDOT ordering and **same-distance** delta, with the assertion
that the longer trial is NOT compared against a shorter one; the anchor
precedence in both directions, asserting the recorded time reaches the coach's
stale-prescription line; and an end-to-end drive of the real week view at 320px
asserting the card appears on a trial week and not on an ordinary one, that a
refused time is flagged and stored nowhere, that a good one reaches storage,
the rendered card and the anchor, and that the Running volume card and the
session list both survive.

No check hardcodes a week number or one of his distances. All of them read
whatever the plan currently says.

**One gate check had to be repaired while being written, and it is worth
knowing.** The end-to-end check navigated between two weeks by calling
`renderProgram()` again — which renders whichever view `state.programView`
names, and `state` is `let`-scoped and unreachable from the gate. So the second
navigation silently re-rendered the week it was already on and the check failed
for the wrong reason. It now goes back through the real `#backToWeeks` button,
which is the supported path a user takes. Recorded in the harness notes.

---

## v1.21 — 15 Sep 2026 · PROGRAM-REV `2026-09-15-bench120-dec-rot8`

**The 120 kg attempt moves to December, and the accessory work rotates for the
first time.** Training content, agreed with Mardy. Both axes move: `PROGRAM_REV`
because the training changed and `APP_VERSION` because the file did.
Gate 90 → 96.

### The measurement that started the second half

He asked how much the programme rotates exercises. Counted, across 21 weeks:

| | distinct exercise line-ups |
|---|---|
| Legs | **2** — and both hold the same five exercises; the only difference is whether Back Squat or Sumo is listed first |
| Upper A | 3 — the seven accessories in all 21 weeks; `Back-off` drops on deloads, `Top Single` appears twice |
| Upper B | **1** — identical, all 21 weeks |

Selection was the smaller half of it. **Nine accessories carried one
prescription for the entire block**: Jumping Lunges 3×20, Hip Thrust 3×15,
Dead Bug 3×15, Pec Deck 4×15, Rope Pushdown 4×12, Face Pulls 3×20, Pull-Ups
4×8, Pullover 3×12, Hammer Curl 3×15. The main lifts do rotate — Back Squat 21
distinct schemes, Sumo 20, BB Row 8, Seated Low Row 8 — so the contrast is
sharp: everything he progresses moved, everything else was frozen.

### The ladder — 120 kg lands in the first week of December

Week 15 is 30 Nov – 6 Dec, so the calendar already put an attempt slot exactly
where he asked for one. Week 7 (5–11 Oct) is already a 115 kg attempt, which is
the October attempt he wanted. The changes are therefore small and local:

| wk | dates | change |
|---|---|---|
| 11 | 2–8 Nov | **was the 120 attempt → third build week**, 4×4 @102.5, no taper |
| 14 | 23–29 Nov | **new** `Top Single 1×1 @115` — the 92–97% rung for 120, second exposure after wk 10 |
| 15 | **30 Nov – 6 Dec** | **120 kg ATTEMPT — THE DECEMBER TARGET**, replacing "120 retry if wk11 missed, else 122.5" |
| 19 | 28 Dec – 3 Jan | 125 → **122.5** |

**This also answers most of A7.** Attempts drop from four to three, so one
taper week and the deload behind it come back as training. Real bench-volume
weeks before the target go from **four** (5, 6, 9, 10) to **seven**. The thin
runway was the actual problem with the old November date; moving it fixes it
rather than papering over it.

**115 at week 14, not 117.5.** 115 kg is 96% of 120, inside the 92–97% band the
v1.11 peaking design rests on, and he will already have made it at week 10.
117.5 exists only in the retired pre-v1.11 ladder and the gate watches for its
return — week 19's attempt ramp also carried it and now reads 115.

**One thing chosen rather than agreed.** Week 19 was left as "122.5 or 125,
your call" in the proposal. 125 would have been a +5 kg jump off a 120 made
four weeks earlier, against the ladder's own +2.5 rhythm everywhere else, so it
is written as 122.5. Reversible in one line.

### Rotation — three blocks, main lifts fixed

Block A = wk 1–8 (unchanged) · Block B = wk 9–16 · Block C = wk 17–21.

| pattern | A | B | C |
|---|---|---|---|
| Legs · unilateral | Jumping Lunges | Split Squat | Leg Press |
| Legs · hip | Hip Thrust | RDL | Hip Thrust |
| Legs · core | Dead Bug | Pallof Press | Dead Bug |
| Upper A · chest | Pec Deck | Cable Fly | Pec Deck |
| Upper A · row | BB Row | Cable Row | BB Row |
| Upper A · triceps | Rope Pushdown | Skull Crusher | Rope Pushdown |
| Upper B · vertical pull | Pull-Ups | Weighted Pull-Ups | Lat Pulldown |
| Upper B · biceps | EZ-Bar Curl | DB Curl | EZ-Bar Curl |
| Upper B · core | Hanging Leg Raise | Ab Wheel | Hanging Leg Raise |

Result: legs 2 → **6** distinct line-ups, Upper A 3 → **6**, Upper B 1 → **3**.

**Weeks 1–8 were not touched.** Weeks 1–4 are history or in progress, and the
logger reconciles saved exercises **by name** — renaming an accessory there
would report work he has already logged as removed from the plan. The rotation
therefore starts at week 9, which is also the next block boundary.

**Two movements deliberately never rotate: Face Pulls and Band Dislocates.**
They are the stated shoulder constraint, and Band Dislocates must stay the
first line of Upper B so the prep happens before the pressing. Variety is the
wrong instinct there, and the gate now asserts both.

**One thing worth watching.** Hip Thrust → RDL in block B puts a third heavy
hinge pattern in a session that already has Back Squat 5×5 and Sumo 5×5. It is
written as `3×10 (RPE 7 — hamstring accessory, deliberately lighter than your
sumo)`, but if the lower back complains, Nordic Curl or Leg Curl are the
straight swaps and both are already in the picker. Logged as B20. *(Re-measured
19 Oct: the unilateral slot moved too, so block B carries FOUR loaded squat or
hinge patterns, not three. See B39.)*

### Code

`isNovemberTarget` becomes `isPrimaryTarget`, and its detector stops naming a
month. It tested for one specific month's literal, so moving the target broke
it by construction — the same drift class this file keeps finding. Added
`getWeekDates(wk)`, because `WEEKS` is a top-level const and nothing outside
that scope could ask when a week actually falls; a check asserting "the target
is in December" against a week *number* would stop meaning anything the moment
the calendar shifts.

**A canary caught this build's comment for the third time this session.** The
new explanatory comment quoted the old month literal as an example and the
assertion fired immediately. Three for three — quoting a watched literal in a
comment is not an occasional slip, it is the default mistake, and the canaries
are earning their keep.

**Two gate checks were wrong and were corrected, not removed.** A first version
of the unloggable-prescription check reported `Back-off` as dropped by the
logger on sixteen weeks — but that merge is deliberate (v1.02: logging it
separately split the main lift's PR history in two). It now asserts the
opposite for continuation lines: they must *not* become their own exercise. And
the November check failed on week 15 itself, which is labelled "30 Nov – 6 Dec"
and legitimately straddles; it now excludes only attempts lying wholly in
November.

**What now proves it — 6 new checks, 5 of which fail on v1.20.** The primary
target is a single week carrying a committed, non-conditional 120 kg attempt;
that week's own date label contains December, exactly one attempt falls in
October, none falls wholly in November, and there are at most three attempts in
the block; no bench line or ramp carries 117.5 (scoped to bench lines, because
117.5 is a legitimate squat and sumo load elsewhere); every session type has at
least three distinct exercise line-ups and no single line-up covers more than
62% of the block; Face Pulls and Band Dislocates appear in every week with
Band Dislocates first; and every exercise the plan prescribes is one
`parseExercisesFromPlan` can record.

The last two pass on v1.20 as well. They are guard rails for the next
restructure, not proof of this one, and are recorded as such rather than
counted as evidence.

---

## v1.20 — 15 Sep 2026 · PROGRAM-REV unchanged

**Heart-rate verdicts now come from the session in front of him, not from one
zone ceiling.** Closes BACKLOG B18. Code only — **no plan edit was needed**, and
`PROGRAM_REV` does not move. Gate 85 → 90.

**Mardy: "easy runs should remain below 130. long run can be up to 137."**

Both numbers were already written on every session, and had been since the
programme was built. The easy and recovery runs each state a one-sided cap; the
long runs each state a two-sided band; the Marathon-Revolutie week states its
own, higher one. Sixty-odd sessions, three shapes, and **nothing in the app
read any of them**. The coach and the live compliance widget both used
`getZ2Range()` — a single ceiling for every run — so an easy run at the long
run's ceiling was reported as compliant while the session text on the same
screen said otherwise.

That is the third surface in three builds where the app already held the right
answer and did not read it: the bench ladder (v1.17), `runPace` (v1.19), and
now the stated HR bands. The pattern is worth naming — **this codebase's
failure mode is not missing data, it is unread data.**

**What ships**

- `parsePlannedHrCap(text)` — the session's own band. A two-sided band wins
  over a one-sided cap in the same text. An inverted or implausible band, and
  numbers with no `bpm` unit, return null rather than a verdict.
- `hrBandLabel(band)` — how it is named back to him.
- `assessHrAgainstPlan(bpm, planText, kind)` — the session's stated band first,
  `assessHrAgainstZone()` as the fallback for a session that states none. The
  quality sessions state none, so they still judge against Z4.
- `analyseRunSession()` uses it, and the coach names whichever band it judged
  against, with the zone alongside.
- **The live compliance widget too** — the one he watches while typing a heart
  rate into the logger. It now reads the session's band, and a heart rate
  *below* a two-sided band reads as fine rather than as nothing at all.

Nothing is hardcoded. Change the band in a session's text and every verdict on
that session moves with it.

*(v1.28 note: the fallback is correct and its caller was not. The hard sessions
state no band, so they fell back to Z2 with the session kind taken from the
slot — see the v1.28 entry.)*

**A canary caught this build's own comment.** The first draft of the new
explanatory comment quoted the plan's HR strings as examples. The assertion
that counts those literals fired immediately — which is the trap recorded in
`BACKLOG.md` on 2 Sep, when a comment did the same thing to the week-21 long
run. The canary was right and the comment was wrong, twice now. The comment
describes the shapes in words instead.

**One gate expectation was wrong and was corrected, not removed.** A check
asserted that `assessHrAgainstPlan(130)` — a heart rate with no session — should
read `no-hr`. It reads `no-target`, which is the more useful answer: there is a
heart rate, there is just nothing to judge it against. Two different failures
should not collapse into one label.

**What now proves it — 5 new checks, all of which fail on v1.19.** Cap and band
parsing with every refusal; a plan invariant asserting that every run session
stating a `bpm` figure parses, that nothing parses where the text states none,
and that every parsed number literally appears in that session's own text; the
discriminating check — **the same heart rate must read `in` on a long run and
`above` on an easy run, with the probe value and both ceilings read from the
plan rather than hardcoded**, which one Z2 ceiling could never pass; the
zone-model fallback including a below-band verdict and degenerate input; and an
end-to-end drive of the live widget in both session types, asserting it renders
`good` on the long run and `bad` on the easy run at the same bpm.

---

## v1.19 — 15 Sep 2026 · PROGRAM-REV unchanged

**The coach now reads runs.** Requested by Mardy: "I want the AI coach to read
my runs and give me program suggestions based on my inputs." Code only — no
training content changed, so `PROGRAM_REV` does not move. Gate 74 → 85.

**The strength side got a real analyser at v1.17. The run side never had one,
and it failed in four ways, all the same class as the stale bench ladder.**

1. **`runPace` was a dead read.** The logger asks for average pace on every
   easy and long run. `saveSession()` stores it. The coach read it —
   `const pace = document.getElementById('runPace').value;` — and then never
   referenced the variable again. Zero uses. The one number that says whether
   an easy run was actually easy was collected, saved, and thrown away on
   every single session. `maxHR` was read and dropped the same way.
2. **Every heart-rate threshold was a hardcoded copy.** 130, 137, 138, 140,
   145, 155, `161–168`, `156–183`, `183`. `getHRZones()` computes all of them,
   clamps an absurd maxHR and honours a lactate-threshold pin. Change maxHR in
   Settings and every one of those literals silently became wrong, with no way
   to notice. Fourth instance of the duplication class after the bench ladder,
   the deload list and the attempt list.
3. **The prescribed pace was never parsed.** The plan states one on every run
   session. Nothing read it, so "did you run it as asked" — the whole question
   on a 5K block — could not be answered.
4. **Planned distance came from the first `N km` anywhere in the text**, which
   on a quality session is the warm-up. `parseRunDistanceKm()` has been the
   right answer since v1.15.

**What ships — pure and exposed, so the gate asserts the analysis, not the prose.**

- `parsePaceSec` / `formatPace` — `6:10`, `4:45/km`. A bare number is refused:
  370 could be seconds or minutes and guessing is how a pace becomes fiction.
  Anything outside 2:00–15:00/km returns null rather than a figure that would
  then be reported back as fact.
- `parsePlannedPaceBand(text)` — the prescription, as a band. A single pace
  becomes a zero-width band so every consumer handles one shape. `@ Zone 2`
  states no pace and returns null.
- `parseIntervalLog(row)` — one interval row read as a unit: distance and its
  own time, never across two arrays. A bare number is metres above 50 and
  kilometres below. A row missing either half drops out.
- `hrZoneFor(bpm)` / `assessHrAgainstZone(bpm, kind)` — **from `getHRZones()`**.
  Every verdict now moves when the configuration moves.
- `parseRunLog(raw)` — the whole logged run as one object, pace included.
- `classifyRunSession(dayKey, planText)` — `easy` / `long` / `quality` /
  `trial`, the trial read from the session's own `TIME TRIAL` marker.
- `vdotFromRace` / `vdotPaces` — Daniels-Gilbert, so the coach can compare the
  prescription to current fitness.
- `getLoggedRunHistory()` / `getLatestTrial()` — epoch-filtered, so a
  retired-programme record cannot poison the trend, and the most recent logged
  trial becomes the anchor.
- `analyseRunSession()` and `runCoachLines()` — the analysis, and the prose,
  kept separate as on the strength side.

**What it says on the first real session.** His 5K on 15 Sep was 23:43, which
is VDOT 40.8. The derived paces are easy 5:45–6:37, threshold 5:01, interval
4:37. The plan prescribes race pace 4:30, threshold 4:45–4:55, VO2max
4:25–4:28, and a long run at 5:50–6:10. **Every quality prescription in the
plan is 6–15 s/km faster than his current fitness supports**, because they were
anchored to a 22:30 target he has not reached yet. That is BACKLOG A4, and it
was theoretical until a trial was actually run.

The coach now says so, in the session, with the anchor named. **It does not
change a single pace.** Those are his; he has asked for a re-anchor and that
lands with the rest of the running rewrite, not here.

**One deliberate behaviour change.** Three heart-rate gates in
`buildCoachSuggestions` now read `getZ2Range()` instead of literals. At the
default maxHR of 183 the shifts are: the volume-bump gate 140 → 137, the
trim gate 138 → 137, and the fatigue gate 130 → mid-Z2 (128). All three move
toward *less* volume, which is the safe direction, and all three now track his
configuration instead of a copy of its defaults.

**Two gate checks were wrong and were fixed rather than removed.**

1. A check asserted that `parsePaceSec(370)` should return 370. It should not —
   a bare number is ambiguous in exactly the way `parseIntervalLog` already
   refuses. The expectation was wrong; the code was right. The check now pins
   the refusal.
2. The plan-invariant check looked for a prescribed pace only in the `@ 4:55/km`
   form and fired on all 21 long runs. The long and easy runs state their band
   as a parenthetical beside the heart-rate range —
   `❤️ Zone 2: 119–137 bpm (5:50–6:10/km)` — with no `@` anywhere. The parser
   was right and the detector was wrong. The check now reads both shapes, which
   makes it cover more of the plan than it did before.

**What now proves it — 11 new checks, all of which fail on v1.18.** Pace
parsing and formatting including every refusal; a plan invariant asserting that
wherever the plan states a pace it parses, and that every parsed value literally
appears in that session's own text (so the gate cannot drift from the plan and
hardcodes none of his paces); interval rows in metres and kilometres and the
half-logged refusals; **HR verdicts asserted at two different maxHR settings —
145 bpm must read Z3 and "too high for an easy run" at maxHR 183 and Z2 and
"compliant" at maxHR 200**, which is the check the hardcoded literals could
never have passed; `parseRunLog` carrying the pace that used to be discarded;
VDOT ordering, bounds and degenerate input; epoch-filtered history with a
strength session excluded and a trial becoming the anchor; the full analysis
across in-band / too-fast / short / unlogged / intervals; degenerate input on
nine entry points; a source canary that fails if the dead `runPace` read or any
hardcoded zone edge returns; and an end-to-end run of the real coach button at
320px with all network blocked, asserting the logged pace reaches the analysis
and the output names both the pace and the zone it judged against.

**Two things the analyser surfaced that are his to decide**, logged as B18 and
B19 rather than touched: the easy-run plan text says `Zone 1–2: ≤130 bpm` while
the app's own Z2 ceiling is 137 — two different numbers for one thing; and the
long run prescribes 5:50–6:10/km, which sits at the *fast* end of his current
easy range with nothing slower offered.

---

## v1.18 — 15 Sep 2026 · PROGRAM-REV unchanged

**The last two hardcoded week lists are gone, and one of them was wrong.**
Code only. Gate 69 → 74.

**BACKLOG B10 recorded these two lists as agreeing with the plan. Measured,
one of them does not.**

```js
const deloadWeeks  = [4,8,12,16,20];   // agrees with the plan
const attemptWeeks = [3,7,11,15,19];   // the PRE-v1.11 ladder
```

The plan's bench attempts are weeks **7, 11, 15 and 19**. Week 3 has carried a
107.5 kg tune-up single, not an attempt, since v1.11 — that substitution was
the entire point of the peaking revision. `buildCoachSuggestions` returns early
when the *next* week is a deload or an attempt week, so after any week-2
session the coach silently offered nothing at all for week 3. An ordinary build
week has been unreachable for six builds, on the authority of a ladder that was
diagnosed as broken and replaced.

This is the same defect class as the three v1.17 fixed, in the fourth copy.
B10 named one call site; there were **three** — the early return, the
strength-bump guard and the fatigue-deload guard. The second and third were
already unreachable behind the first, which is how a stale list survives
review: nothing it does is visible.

**What ships**

- `isSuggestionBlockedWeek(wk)` — `isDeloadWeekNum(wk) || isBenchAttemptWeek(wk)`,
  both of which read the week's own `🔽 DELOAD` and `PR attempt` markers and
  have been gate-covered since v1.17. All three call sites now go through it.
  Closes **B10** and **B14**.
- `projectWeeklyVolume(week, sessionKey, oldValue, newValue)` — what a proposed
  edit to one session does to that week's total, measured the way the Running
  volume card measures it, against the previous **build** week. Pure: nothing
  is written and no override is created.
- `volumeConsequenceLine(...)` — one line of prose for the above, appended to
  every suggestion that moves a run. Done once, at the end of the builder,
  rather than at each push site, so a suggestion added later cannot forget to
  carry its cost. Closes **B12** in the show-the-consequence form.

**The two changes had to ship together.** The first suggestion the unblocking
restores is a +1 km bump to week 3's easy run — which takes week 3 from 32.3 to
33.3 km, **+12.1% on week 2, past the 10% ceiling the whole ramp was built
around**. Unblocking week 3 without the consequence line would have handed him
a silent ceiling breach as the coach's first act. It is now offered with that
stated in the card:

> ⚠ Wk 3 total 32.3 → 33.3 km (+1 km), +12.1% vs Wk 2 (29.7 km). That is past
> the +10% weekly step the ramp was built around — your call, but it is a breach.

**Offered, not suppressed.** B12 drew the line and it is the right one:
suppressing a suggestion he would have accepted is a training decision and
stays his; showing him what it costs is not. Nothing here writes to the plan.

*(v1.28 note: `projectWeeklyVolume` picked its reader by the slot name, so this
protection was absent on any hard session outside the quality slot. See B37.)*

**Also corrected:** the header blockquote said "Line 2 above" while the
authoritative version is on line 3. Documentation only, but a version pointer
that is off by one is exactly the kind of thing this file exists to prevent.

**What now proves it — 5 new checks, all of which fail on v1.17.**

- `isSuggestionBlockedWeek` agrees with the plan's own markers on every week,
  blocks at least one week, and blocks nothing outside the plan.
- A **source canary**: no `deloadWeeks` / `attemptWeeks` declaration or
  `.includes(...)` call survives anywhere in the file. A hardcoded list that
  comes back fails the gate rather than waiting six builds to be noticed.
- End-to-end through the real UI: navigate to a week whose next week the plan
  leaves unblocked, log an over-performed long run, press the coach button and
  assert a suggestion is produced for that week — *and* that its reason states
  the resulting weekly total, names the week, and carries ⚠ when the
  projection breaches the ceiling. The week is derived from the plan, not
  hardcoded; a week the retired list wrongly blocked is preferred, and the
  check says so loudly if no such week is left, rather than passing for the
  wrong reason.
- `projectWeeklyVolume` arithmetic asserted against `getWeeklyVolumeSeries`
  (total, baseline, delta, ceiling flag), plus null on a non-run session, a
  zero-distance edit, an unparseable new value, a week outside the plan and
  three degenerate calls.
- `volumeConsequenceLine` states the week, the new total and the delta; flags a
  breach and only a breach; returns `''` for a strength session.

No check hardcodes one of his distances. All of them read whatever the plan
currently says.

---

## v1.17 — 2 Sep 2026 · PROGRAM-REV unchanged

**The offline coach now analyses the whole strength session, and its bench
ladder comes from the plan.** Mardy's report: the coach "is not very strong in
offline mode… not always doing that coherently… should be analytically
stronger". It was right to feel that way. Code only. Gate 54 → 69.

**Four analytical defects, all pushing the same way: it read one exercise,
read it wrong, and compared it to a plan that no longer existed.**

1. **It carried its own bench ladder** — `{3:115, 7:117.5, 11:120, 15:122.5,
   19:125}` — which is the **pre-v1.11 ladder**. v1.11 replaced week 3's
   115 kg attempt with a 107.5 kg tune-up single and moved 115 to week 7,
   precisely because 115 at week 3 was ~105% of a 110 max off an 86% top set.
   The coach was still coaching the version that had been diagnosed as broken.
   It also cited 117.5 kg, a number that exists nowhere in the plan.
2. **Its deload and attempt week lists were from the retired 32-week epoch**
   (weeks 17/24/32 and 21/31/33). The plan is 21 weeks. Those weeks do not
   exist, so **the attempt-week briefing and the deload warning could never
   fire** — the single most important coaching moment in the block, the 120 kg
   attempt in week 11, was unreachable dead code.
3. **e1RM paired weights with the wrong reps.** `weights` and `reps` were
   filtered into two separate arrays and zipped by index, so one set with a
   weight but no reps shifted every later pairing: `[(85,6),(85,–),(90,3)]`
   was read as `(85,6),(85,3),(90,nothing)`.
4. **It found the bench by first name match.** On Upper B that is `Paused
   Bench` — prescribed at 70–73% with 2–3 reps in reserve — so it estimated a
   max from a deliberately submaximal skill lift and then reported that 120 kg
   looked ambitious. And on weeks 6 and 10, the two weeks carrying the whole
   point of the peaking design, it ignored `Top Single` entirely because the
   name contains no "bench".

**What ships — all pure and exposed, so the gate asserts the analysis and not
the prose.**

- `parseSetLog(set)` — one set read as a unit. Weight and reps pair per set and
  never across two filtered arrays. A half-logged set drops out instead of
  corrupting its neighbours.
- `e1rmFromSet(set)` — **reps-in-reserve folded in**. An RPE 8 triple has ~2
  reps left and those reps are what make the estimate mean anything; raw Epley
  scores an RPE 6 six-rep set and an RPE 10 six-rep set identically. A set with
  no RPE is read at face value and *flagged*, never silently assumed maximal.
  Reps above 12 return null rather than a fantasy number. This is why the old
  coach kept reporting ~102 kg for a man benching 95×3 at RPE 8; it now reads
  ~110.8, which matches his own estimate of his max.
- `classifyBenchLift(name)` — `max` (Flat Bench, Flat BP, Bench Press, Top
  Single, Back-off) versus `skill` (Paused Bench, CGBP, incline, DB press,
  dips). Only the `max` group sets the estimate; the coach now *says* why the
  skill lifts are excluded rather than silently ignoring them.
- `parseBenchLadderWeek(wk)` / `getBenchLadder()` / `getNextBenchMilestone(wk)`
  — the ladder read from each week's own Upper A text through `getPlanned()`,
  so his overrides apply and a plan edit cannot leave the coach behind again.
  Week 15's `120 or 122.5 kg` is genuinely conditional (a retry only if week 11
  missed), so it reports both options and commits to neither.
- `isDeloadWeekNum(wk)` / `isBenchAttemptWeek(wk)` — from the week's own
  `🔽 DELOAD` marker and its own `PR attempt` marker. No week-number lists.
- `getLoggedBenchHistory()` — every stored session of the current epoch scanned
  for bench-group sets, reduced to one best e1RM per week, epoch-filtered so a
  retired-programme record cannot poison the trend. **The old coach had no
  history at all**; it could not tell a stalled month from a good day.
- `adviseExerciseLoad(ex, targetRpe, ctx)` — the thing that was missing
  entirely: a load verdict for **every** exercise in the workout, driven by the
  plan's own stated target RPE where it has one, because "did you hit the
  prescribed effort" is a better question than "did you hit the prescribed
  number". Steps 2.5 kg below 100 kg and 5 kg at or above it.
- `analyseStrengthSession()` and `strengthCoachLines()` — the analysis, and the
  prose, kept separate on purpose.

**Two coherence rules, added after reading the output rather than the tests.**
The first draft passed its gate and still said two contradictory things. On
week 11 — the 120 kg attempt week — it printed the attempt-week briefing
("resist adding volume") and then recommended adding 2.5 kg to the paused
bench. And it read RPE 6 on the paused bench as slack, when RPE 6 *is* the
prescription. So:

- A `skill` bench variant gets an implicit target RPE of 6.5 when the plan
  states none, so a compliant session reads **hold**, not "add 2.5 kg".
  Otherwise the coach would quietly grow a frequency session into a third heavy
  pressing exposure against a stated shoulder constraint.
- On a deload or attempt week an upward recommendation is suppressed and
  reported as **"⏸ In hand but not now"** — the information is kept, the
  contradiction is not.

**One assumption worth knowing.** A single logged at RPE 9 estimates ~7% above
the bar weight (107.5 × 1 @ RPE 9 → ~114.7 kg), because RPE 9 means one rep in
reserve. The plan's own framing calls 107.5 "~98% of 110". Both readings are
legitimate; the coach uses the RIR reading consistently. At RPE 10 a single
estimates exactly the bar weight.

**Nothing here writes to the plan.** The analyser produces advice. What a week
contains is still Mardy's call, and the accept/reject suggestion path is
unchanged.

**What now proves it — 15 new checks, all of which fail on v1.16.** Set-level
parsing and the desync bug; RIR arithmetic including the invariant that the
same load at RPE 10 must not estimate the same as at RPE 6; the lift
classification; a ladder check that asserts **every parsed load literally
appears in that week's plan text** (so the gate cannot drift from the plan and
does not hardcode his numbers); that 117.5 kg never reappears as a milestone;
that weeks 24/31/32/33 read as neither deload nor attempt; per-exercise
verdicts across easy / on-target / grind / missed-reps / no-RPE / unlogged;
that Paused Bench sets no max; the two coherence rules; bodyweight not printed
as "0 kg"; epoch-filtered history driving the gap; degenerate input on eight
entry points; and an end-to-end run of the real coach button at 320px with all
network blocked, asserting it names the 120 kg target and never cites 117.5.

---

## v1.16 — 2 Sep 2026 · PROGRAM-REV unchanged

**"Save exercise" now saves that exercise, and only that exercise.** Reported by
Mardy. Code only; no training content changed. Gate 46 → 54.

**The bug.** The per-exercise save button built its payload from
`window.getExercises()` — the *whole* list — and wrote the entire session
record. Pressing 💾 under Flat Bench committed the rows, the curls and the leg
raises with it. Worse, it also ran `updateExercisePRs()` across every exercise
on the card, and because the logger pre-fills each set with the plan's target
weight, that **minted PRs from numbers he had not lifted**. A single tap on one
exercise could write a 100 kg × 3 "PR" for a lift he had not started.

The gate reproduced it before the fix: *"Military Press was committed by
another exercise's save button: expected "", got "222""*.

**What ships**

- `mergeSingleExercise(stored, liveExercises, exIdx)` — pure, no DOM and no
  storage reads, so the gate asserts it directly. The target exercise carries
  its live values; every other position keeps what was already stored, and if
  nothing was stored it is written blank rather than with numbers the user did
  not choose to save.
- PR detection on a per-exercise save now runs for **that exercise only**.
- `readStoredSessionLocal()` — the merge reads the localStorage copy, which
  `saveSession()` always writes first, so no Supabase round trip sits between
  a button press and a saved set. In a gym on bad signal that matters.
- The bottom button is now **Save Workout** (was "Save Session"), and it stays
  the only thing that commits the session as a whole and marks it complete. A
  per-exercise save never marks a session complete.
- The confirmation names what was saved — "✓ Flat Bench saved" — because the
  whole complaint was not knowing what a button had just committed.

**Two deliberate decisions.**

The record is still written with an entry for *every* exercise, not just the
saved one. That is not laziness: the reload path reconciles saved exercises
**by name** against the plan, and a record missing entries makes it report them
as newly "added" in the plan-changed banner. Shaped like the workout, valued
only where he saved.

Workout-level fields — sleep quality, session RPE, notes — are preserved from
storage but **not** committed from the DOM by a per-exercise save. They belong
to the workout. If he types a note and taps 💾 under one exercise, the note is
not saved; Save Workout is what saves it. That is the literal reading of "one
save per exercise that only goes per exercise", and the alternative reintroduces
the same class of surprise in miniature.

**Bulk reps.** Each exercise now has a second "All sets" field for reps beside
the existing weight one. `parseBulkReps` accepts a bare integer 1–100 and
refuses everything else — `6-8`, `6–8`, `8 reps`, `6.5`, `BW`. A refused value
writes nothing and turns the field red rather than being silently dropped:
filling `6-8` into every set would store a string the PR detector discards
without a word, which is the same silent-data-loss class `parseRepsTarget`
already refuses. The weight field is deliberately **not** validated the same
way — `BW` is a legitimate entry for pull-ups and refusing it would break
bodyweight logging.

**What now proves it — 8 new checks, all of which fail on v1.15.** Four pure
checks on `mergeSingleExercise` (target committed; non-targets not; a second
save does not wipe the first; workout-level fields and orphaned logs survive;
bad indices and corrupt stored payloads refused), one on `parseBulkReps`, and
three that drive the real logger in a 320px viewport: the field and button
inventory per exercise block, an end-to-end save that types into two exercises,
taps one save button and asserts only one reached storage and the session was
not marked complete, and a bulk-reps fill that must reach every set of its own
exercise, leak into no other, and leave logged reps untouched when refused.

---

## v1.15 — 2 Sep 2026 · PROGRAM-REV unchanged

**Weekly running volume is now computed.** BACKLOG A1, the highest-value open
item. Code only — no training content changed, so `PROGRAM_REV` does not move.
Gate 37 → 46.

**Why.** The entire v1.13 ramp is defined by weekly totals and a 10% ceiling,
and nothing in the app computed either. Each week's volume existed only as
prose in `notes` (`run 16 + 13 + 13 + 5 quality`); nothing summed it, nothing
compared it to the week before, nothing warned on a drift. The one number the
running plan is built around was the one number the app could not show.

**What ships**

- `parseRunDistanceKm(text)` — leading distance of a run session. Returns
  `null`, not `0`, for anything that does not open with a distance, so "no run"
  is distinguishable from "zero km".
- `parseQualityVolumeKm(text)` — quality volume with the work / warm-up /
  cool-down split kept, and a `source` field recording which shape was read.
- `getWeeklyRunVolume(wk)` — one week, resolved **through `getPlanned()`**, so
  his own overrides count. A skipped session parses to nothing and the week
  legitimately shrinks rather than reporting a plan he did not run.
- `getWeeklyVolumeSeries()` / `getWeeklyVolume(wk)` — every week with its delta.
- A **Running volume** card in the week view: total, run count, the per-session
  breakdown, the long-run share, deload / time-trial tags, and the delta with a
  red ⚠ when a build week steps more than +10%.
- `isRunSession()` now reads the same `RUN_SESSION_KEYS` constant the volume
  reader walks, instead of its own duplicate copy of the list. A gate check
  asserts the two agree — duplicated lists are what drift.

**Three session shapes had to be read, and all three are in the data.**

| shape | example | read as |
|---|---|---|
| plain run | `7.4 km easy @ 6:15–6:40/km` | 7.4 |
| quality line | `≈ 4 km of quality + 2 km w-up + 1.5 km c-down` | 4 + 2 + 1.5 |
| time trial, no quality line | `🏃 5K TIME TRIAL` + `w-up 2 km` + `c-down 1.5 km` | 5 + 2 + 1.5 |

Weeks 8, 16 and 20 are the third shape — they carry **no** `≈ N km of quality`
line. That is the recorded trap: a parser assuming the line mis-read them once
and over-trimmed their easy runs. Their distance is read from the `5K` / `10K`
token instead, and a gate check pins it. A tagged Marathon-Revolutie session
(`[MR · …] 9 km` with `2 km w-up … 1.5 km c-down` on the next line) states its
own total with the warm-up already inside, so its leading distance is taken as
the whole session and nothing is added on top — otherwise week 21 inflates by
3.5 km.

**The delta is measured against the previous BUILD week, not the previous
calendar week.** Measuring against the calendar week reads every post-deload
rebound as a breach: week 9 is +23.9% on the week 8 deload but **+7.7%** on
week 7, and +7.7% is the number the ceiling was agreed against. Deload weeks
are detected from each week's own `🔽 DELOAD` notes marker, not from a
hardcoded `[4,8,12,16,20]` list — a hardcoded list is exactly what drifts.
(`buildCoachSuggestions` still holds such a list; logged as B10.
*Closed in v1.18 — and the attempt-week half of it was wrong.*)

**What now proves it — 9 new checks, all of which fail on v1.14.**

Split deliberately in two. **Parser checks** run against literal fixture
strings written into the gate, so they pin the reading rules and stay valid
when Mardy edits his training. **Plan checks** assert invariants over whatever
the plan currently says — totals equal the sum of their parts, every session
whose text carries a distance is counted and every session whose text does not
is excluded, nothing is silently defaulted, the delta baseline is always an
earlier non-deload week, `longRunShare` and `exceedsCeiling` are self-consistent.
No check hardcodes one of his distances: a gate that encodes this week's
numbers goes red the first time he legitimately changes them, and a gate that
cries wolf gets switched off. The ceiling flag is exercised by injecting a
`programOverrides` record that inflates one easy run, and the skip path by
injecting one that rests it.

**First measurement, and it holds.** Long-run share 30.5–32.7% across weeks
3–21, inside the 30–35% ceiling. No build-week step above **+9.4%**. 50 km
first landed at week 13 (50.5). Deloads at 4, 8, 12, 16, 20, each below the
week before it.

**Two small discrepancies the computation surfaced — his numbers, his call.**
v1.14 said "weekly totals from v1.13 are preserved". Measured, they are 0.2–0.6
km short on weeks 5, 6, 9, 10 and 12: the quality volume that was cut was only
partly reallocated to the easy runs. Peak is 52.5 km at week 18, not the 52.9
recorded in `TRAINING-CONTEXT.md`. Physiologically nothing; both are logged as
B11 rather than silently corrected, because weekly volume is his.

---

## v1.14 — 30 Aug 2026 · PROGRAM-REV `2026-08-30-bench120-vol50-q4to6`

Quality-session rebuild. v1.13's quality work was too intense and, worse,
non-monotonic — week 3 sat at 6.0 km, above sessions two months later. Gate 37/37.

**Quality work now climbs 4.0 → 6.0 km across seventeen weeks**, slowly and in
order. No week is harder than a later one.

| wk | work | session | intent |
|---|---|---|---|
| 3 | 4.0 | `[TEMPO] 2×2000 m @ 4:55/km` | aerobic entry, explicitly not hard |
| 5 | 4.2 | `[CRUISE] 6×700 m @ 4:50/km` | short rest is the stimulus |
| 6 | 4.4 | `[TEMPO] 4×1100 m @ 4:52/km` | |
| 7 | 4.4 | `[INTERVALS] 8×550 m @ 4:30/km` | first touch of race pace, short reps |
| 9 | 4.6 | `[TEMPO] 2×2300 m @ 4:50/km` | longest continuous threshold yet |
| 10 | 4.8 | `[INTERVALS] 6×800 m @ 4:28/km` | |
| 11 | 4.8 | `[RACE PACE] 4×1200 m @ 4:30/km` | goal-pace rehearsal |
| 13 | 5.0 | `[THRESHOLD] 5×1000 m @ 4:48/km` | 75s rest, cumulative by design |
| 14 | 5.2 | `[INTERVALS] 8×650 m @ 4:25/km` | faster than race pace, short enough to hold form |
| 15 | 5.2 | `[RACE PACE] 4×1300 m @ 4:30/km` | |
| 17 | 5.6 | `[THRESHOLD] 4×1400 m @ 4:45/km` | |
| 18 | 6.0 | `[INTERVALS] 6×1000 m @ 4:25/km` | peak quality week |
| 19 | 6.0 | `[RACE PACE] 5×1200 m @ 4:28/km` | sharpening, a shade under race pace |

**Session types rotate rather than one template being rescaled.** Four kinds
cycle through the block — tempo, cruise/threshold, VO2max intervals, and race
pace — anchored on a 22:30 5K target: race pace 4:30/km, threshold 4:45-4:55,
VO2max 4:25-4:28. The progression is in *specificity* as well as volume: early
weeks are continuous threshold work, race pace first appears in week 7 as short
reps, and the last third is dominated by goal-pace and slightly-faster work.

**Weekly totals from v1.13 are preserved** — the volume ramp Mardy approved is
unchanged. Quality volume freed by the reduction went into the two easy runs, so
weeks lose intensity rather than distance. Verified from the written file: no
build-week increase exceeds 10%, 50 km still lands week 13.
*(v1.15 measured this: 0.2–0.6 km short on weeks 5, 6, 9, 10, 12. See B11.)*

**One deviation to flag.** Week 3's split was his: long 10 · easy 6.8 · easy 6.0
· quality 6.0 = 32.3. Holding that total with quality down at 4.0 means the easy
runs become 7.4 / 7.4. The long run stays at his 10.0 and the total stays at
32.3; only the easy split moved. The alternative — keeping 6.8 / 6.0 exactly —
drops week 3 to 30.3 and makes week 5 a +17% step, which breaks the 10% ceiling
he asked to stay inside.

**Time trials unchanged**: 5K at weeks 4, 8, 12, 16 and the 10K at week 20. The
trial weeks carry 5 km of maximal work, which is more than the surrounding build
weeks' quality volume — that is intended. A trial is a test, and the rest of
those weeks is reduced to pay for it.

---

## v1.13 — 30 Aug 2026 · PROGRAM-REV `2026-08-30-bench120-nov-vol50`

Aggressive running-volume rebuild, weeks 3-20, at Mardy's instruction. Training
content only; no code change. Gate 37/37.

**Why.** The previous ramp reached 48.5 km/week only in week 20 (January) and
was nearly flat from week 6 with the long run pinned at 15 km. He asked for a
faster build, "marginally within the 10% increase per week".

**Result.** ~50 km/week reached at **week 13 (16-22 Nov)**, peak 52.9 km at
week 18, against week 20 previously. **No build-week increase exceeds 10%** —
verified against the file, not the intent.

| wk | long | easy ×2 | quality | total | Δ vs prev build |
|---|---|---|---|---|---|
| 3 | 10.0 | 6.8 / 6.0 | 6.0 | 32.3 | +8.8% (his numbers) |
| 4 | 9.0 | 5.5 / 5.5 | **5K TT** | 28.5 | deload |
| 5 | 11.5 | 8.0 / 8.0 | 4.5 | 35.5 | +9.9% |
| 6 | 12.5 | 9.0 / 9.0 | 4.8 | 38.8 | +9.3% |
| 7 | 13.5 | 10.0 / 10.0 | 4.5 | 41.5 | +7.0% · 115 kg attempt |
| 8 | 12.0 | 8.0 / 8.0 | 5K TT | 36.5 | deload |
| 9 | 14.5 | 11.0 / 11.0 | 5.0 | 45.0 | +8.4% |
| 10 | 15.5 | 12.5 / 12.5 | 5.4 | 49.4 | +9.8% |
| 11 | 15.0 | 11.5 / 11.5 | 5.0 | 46.5 | −5.9% · step back for the 120 kg attempt |
| 12 | 14.0 | 10.0 / 10.0 | **5K TT** | 42.5 | deload |
| 13 | 16.0 | 12.5 / 12.5 | 5.6 | 50.1 | +7.7% |
| 14 | 16.0 | 13.0 / 13.0 | 6.0 | 51.5 | +2.8% |
| 15 | 16.0 | 12.5 / 12.5 | 5.6 | 50.1 | −2.7% · 120 retry / 122.5 |
| 16 | 14.5 | 11.0 / 11.0 | 5K TT | 45.0 | deload |
| 17-19 | 16.0 | 13.0-13.5 | 6.0-6.4 | 51.5-52.9 | +2.8%, +2.7%, −2.6% |
| 20 | 14.5 | 8.5 / 8.5 | 10K TT | 45.0 | deload |

**Long-run share now holds 30-33% throughout.** It previously peaked at 40% in
week 4, above the conventional 30-35% ceiling. Fixed structurally by capping the
long run at 16 km and letting the easy runs carry the growth.

**Deload weeks are now real deloads.** Weeks 4, 8, 12, 16 and 20 were marked
🔽 DELOAD while running volume *rose* to the block's highest — the strength
deloaded, the running did not. Each now sits below the week before it, which is
also what makes a time trial on those weeks meaningful rather than a fatigue
measurement.

**5K time trials added at weeks 4 and 12**, joining the existing trials at 8
and 16. Week 20 keeps its 10K trial — that is one of the interim "fun races"
he asked for, not an oversight.

**Deliberately NOT touched, and why:**

- **Week 1** — already run. History.
- **Week 2** — his 3-run cutback, handled as a `programOverrides` change, not a
  plan edit.
- **Week 21** — a Marathon Revolutie preview week with its own rules encoded in
  the text ("never further than 14 km", "two runs a week at marathon HR"). A
  mechanical rescale would have violated its own constraints. The assertion that
  caught this fired on a `longRun` string starting `[MR · MARATHON HR] 14 km`
  rather than a bare distance.
- **Quality session prescriptions** — `[INTERVALS] 6×900 m @ 4:33/km` and the
  like. Rescaling interval work arithmetically produces nonsense paces. Volume
  growth went into the long run and the two easy runs; quality sessions keep
  their existing structure except where a trial replaces them.

**Two errors caught during this change, both by assertions:**

1. The first pass would have rewritten week 21, breaking the MR rules above.
2. Weeks 8 and 16 are time trials whose text has no `≈ N km of quality` line, so
   the parser defaulted their work volume to 10 km instead of 5. Their easy runs
   were over-trimmed to compensate. Caught on review of the written file and
   fixed before shipping — a reminder that the notes tail is the check, not the
   intent table.

**Open, for Mardy.** Week 3's quality work goes 4.0 → 6.0 km at his instruction,
which makes it the third-hardest quality session in the block, ahead of weeks 9,
11, 13 and 15. Implemented as `8×750 m @ 4:35/km` — shorter reps at the same
pace, so the added volume does not also add intensity. But the quality
progression across the block is now non-monotonic. Worth a deliberate pass to
re-scale the interval work across all weeks, rather than leaving week 3 as an
outlier.

---

## v1.12 — 30 Aug 2026 · merge of two divergent v1.11 builds

**Incident, recorded in full because the process failure matters more than the
code.**

Two sessions both branched from v1.10 and both shipped a build called v1.11:

| | scheduled run (19:37) | interactive session (20:00) |
|---|---|---|
| base | v1.10 | v1.10 |
| contained | 4 code fixes + 12 new gate checks | bench revision + PROGRAM_REV |
| PROGRAM_REV | `2026-07-19-fast5k` | `2026-08-30-bench120-nov` |

The interactive session wrote `claude/app-current.html` **without re-reading it
first**, destroying the scheduled run's build. Two different files claiming one
version number — the exact failure this system was built to prevent, committed
by the session that built it.

**Three distinct process failures, each with a fix:**

1. **The interactive session worked from a stale local copy.** The instructions
   say "work from `app-current.html`". It worked from a file loaded 45 minutes
   earlier. *Fix: re-read the canonical file from the project immediately before
   editing, every time, and compare its APP_VERSION against CHANGELOG line 2.
   If they disagree, someone else has shipped — stop and merge.*
2. **The scheduled run ignored a "do not ship" override.** The override was
   appended as extra text after a standing prompt containing numbered ship
   steps; the standing instructions won. *Fix: never neuter a run with appended
   text. To run one read-only, disable the trigger and fire a separate
   purpose-written prompt.*
3. **The stale local gate hid the damage.** The interactive session ran its own
   25-check copy and saw green, while the project's gate had grown to 37 checks
   the build would have failed. *Fix: the gate is a canonical file too. Re-read
   it from the project before running it — a green result from a stale gate is
   worse than no result, because it is believed.*

Run against the full 37-check gate, the interactive v1.11 failed **6 checks**:
tap targets, three theme-preference checks, override ordering, and the PR unit
bug. That is the measure of what was lost.

**Recovery.** The scheduled run's build was retrieved from its own session.
v1.12 = that build, with the bench revision re-applied on top by the same
deterministic script. That direction deliberately: the run's changes are spread
across the codebase, the programme changes are confined to plan strings, version
constants and one picker entry. Merging the small, well-bounded changeset onto
the large one is the lower-risk direction.

**What v1.12 contains — everything from both:**

From the scheduled run:
- **Theme preference was write-only.** `theme` was saved to localStorage on
  every write and read back by nothing; the only restore path was the Supabase
  profile, which never arrives offline. The app booted light every time and then
  overwrote the saved preference with that default. Now restored at boot, and
  the toggle works before authentication.
- **`resolvePlanned` walked array order, not timestamp order**, despite a doc
  comment claiming chronological. Since `loadProfile` merges
  `[...remote, ...localOnly]`, an older local change that failed to sync was
  appended last and silently beat a newer remote one. This was BACKLOG B5, the
  highest-severity silent-corruption item.
- **Tap targets raised to the 44px floor** (were 37 / 21 / 41).
- **`planQueryPR` doubled units** — "112.5 kg kg".
- **12 new gate checks**: theme preference, program overrides, offline write
  queue (which closes B4), coach PR rendering.

From the interactive session: the full bench peaking revision and paused-bench
substitution — see the v1.11 entry below, which describes work that is now in
v1.12 rather than in any shipped v1.11.

**Versioning.** v1.11 is permanently ambiguous and must never be referenced as a
build. Rollback is `app-v1.11-rollback.html`, which is specifically the
scheduled run's v1.11 — the one that passes the gate.

---

## v1.11 — 30 Aug 2026 · PROGRAM-REV `2026-08-30-bench120-nov`

Bench peaking revision, agreed with Mardy. Training content change; no code
behaviour change. Gate 25/25.

**Why.** He estimates his current bench 1RM at ~110 kg. The plan asked for a
115 kg attempt in week 3 — about 105% of that, three weeks in, off a top
training set of 95×3. The diagnosis was not "too few singles": it was a **20 kg
gap between the heaviest trained set (~86-91%) and every attempt (~105%)**.
The attempt-day ramps did touch 102-112, but only as a lead-in on the day
itself — there was no *trained* work in the 92-97% band where bracing, bar path
and load tolerance are actually built.

**Bench ladder changed**

| Wk | Was | Now |
|---|---|---|
| 3 | 115 kg attempt | **107.5 kg top single** (~98%) — a make, not a miss |
| 6 | 4×3 @97.5 | + **top single @110** — the missing 92-97% rung |
| 7 | 117.5 kg attempt | **115 kg attempt** |
| 10 | 4×3 @100 | + **top single @115** |
| 11 | 120 kg attempt | **120 kg attempt, flagged as the November target**; ramp now runs through 110 and 115, both already made as trained singles |
| 15 | 122.5 kg attempt | **120 retry if wk11 missed, else 122.5** — the plan no longer assumes wk11 succeeded |

Attempt weeks now carry an explicit "safeties set or a spotter" line.

**Second bench session added to Upper B — by substitution, not addition**

Every Upper B already contained `Incline DB Press 3×15`, so he was pressing
twice a week but benching once. Stacking paused bench on top would have made
three pressing exposures — the wrong answer when shoulder health is a stated
constraint. So the incline DB was **replaced**, not supplemented:

- `Paused Bench 3×4` (3×3 on deload weeks), progressing 77.5 → 87.5 kg by block
- Loaded at roughly 70-73% of estimated 1RM: this is a skill and frequency
  session, explicitly "2-3 reps in reserve, never a grind"
- Shoulder-conscious cues in the prescription: grip just inside the rings
  (less humeral horizontal abduction than a wide competition grip), elbows
  45-60° rather than flared, 2s controlled pause
- **`Band Dislocates` moved from the end of the session to the front**, so the
  existing shoulder prep actually happens before the pressing rather than after
  the biceps work

Net effect on Upper B: bench specificity up, total shoulder stress down,
session volume roughly unchanged.

**`Paused Bench` added to the exercise picker.** `defaultExercises` had
`Pause Squat` but no paused bench, so the plan would have prescribed a lift the
log could not record.

**Two near-misses caught by assertions while writing this, both worth keeping:**

1. A first pass asserted `'Incline DB Press' not in file`. It failed — because
   `defaultExercises` legitimately contains that string as a *pickable exercise
   name*. Deleting it would have removed a logging option users depend on. All
   plan edits are now scoped to the week-block offsets only.
2. The file has 25 `upperB:` occurrences against 21 plan weeks. The extra four
   are `SESSION_KEY_LABEL` / `sessionLabel` maps (`upperB: 'Upper B'`), not plan
   data. A loose regex would have corrupted the UI labels.

**Versioning note.** A programme change bumps **both** axes: `PROGRAM_REV`
because the training changed, and `APP_VERSION` because the shipped file
changed. The rule "never bump one for the other" means never use one to
*express* the other — not that they cannot move together. Two different files
must never both claim to be v1.10.

---

## v1.10 — 30 Aug 2026

Version integrity. No functional change to training logic; this build exists to
make every later build verifiable.

**Fixed — version identity was unresolvable**

The app had two version numbers on different axes and they had been conflated:

| Where | Said | Actually meant |
|---|---|---|
| HTML comment | `v1.11` (19 Jul) | the *training programme* revision |
| UI badge + `sw.js` | `v1.9` (22 Aug) | the *app build* |
| Project instructions | "latest is v1.11" | quoted the programme number as the build |

Worse, the padding was inconsistent (`v1.02`, `v1.3`, `v1.9`, `v1.11`). Is
v1.9 before or after v1.11? As a decimal, after. As semver, before. Neither
reading was safe, so no session could reliably identify the current build —
which is precisely how an automated run overwrites good code.

- Added `window.APP_VERSION` / `APP_BUILT` / `PROGRAM_REV` as the single source
  of truth, at the top of `<head>`.
- UI badge now renders from `APP_VERSION` instead of a hardcoded string, with
  the literal text retained as a JS-off fallback. Badge and constant can no
  longer drift.
- `sw.js` `CACHE_VERSION` mirrors `APP_VERSION`. Previously it could be bumped
  independently, so the shell cache could fail to evict on deploy.
- Retagged all programme-revision markers to `PROGRAM-REV 2026-07-19-fast5k`.
  The literal `v1.11` would otherwise have collided with the real build v1.11,
  two ships from now.
- Zero-padded 20 historical single-digit markers in comments (`v1.3` → `v1.03`).
  Comments only, no behaviour change — but history must not be ambiguous either.

**Added — regression gate (`claude/regression.mjs`)**

25 checks that must pass before any version bump. Real Chromium over real HTTP,
all external network blocked (fonts, supabase-js CDN, Supabase API) so a red
result always means the app broke, never that a CDN was slow — and because
"no network" is the normal case for an app used in a gym, not an edge case.

Covers: boot with zero uncaught errors; version integrity incl. badge↔constant↔
service-worker agreement; `parseWeightTarget` / `parseRepsTarget` refusing
ambiguous input (the silent data-loss class); HR zone contiguity, Z2 band,
threshold-pin overrides and maxHR clamping; coach date parsing incl. en-GB
DD/MM ordering; localStorage persistence and boot-with-corrupt-storage;
graceful degradation with the Supabase CDN absent; service worker registration;
no horizontal overflow at 390px and 320px; theme toggle incl. PWA status-bar
colour; tap-target sizes against a recorded baseline.

Three defects in the *tests* were caught and fixed while writing them, each
worth knowing:

1. `getHRZones()` returns an **array** of five zone objects, not a flat map.
2. `state` is declared `let` at script scope, so it is **not** on `window` —
   writing `window.state.x` is a silent no-op that makes tests read the app's
   defaults and pass for the wrong reason. State must be driven by seeding
   `localStorage` before navigation.
3. The theme handler is bound inside `initApp()`, which runs only after auth.

All three are documented in the harness so a future run cannot re-introduce a
fake-passing test.

**Baseline policy.** The gate's job is to stop *regression*, not to fail red
forever on debt that predates it. Known shortfalls (tap-target sizes) are
recorded as a baseline: shrinking further fails, and so does improving without
updating the baseline. Debt cannot rot silently in either direction.

---

## Earlier history

Not reconstructed — pre-v1.10 versioning was ambiguous by the account above and
retrofitting exact numbers would be invention. Programme lineage is preserved in
the retagged in-file comments (`PROGRAM-REV 2026-07-19-fast5k`, and the
`v1.02`–`v1.08` code-change markers).
