# BACKLOG — Mardy · 2026 Training

Ranked open items. Rewritten 30 Aug 2026 at v1.14; earlier numbering (B1–B9) is
superseded — several items closed the same day and the list had drifted.
Updated 2 Sep 2026 at v1.15, 15 Sep 2026 at v1.18–v1.21, 27 Sep 2026 at
v1.22 and v1.23, 30 Sep 2026 at v1.25 and v1.26, and 5 Oct 2026 at v1.27.
**Reviewed 13 Oct 2026 by the weekly scheduled run** — five items, B32–B36.
**Reviewed 19 Oct 2026 by the weekly scheduled run, which built nothing. Later
the same day, on his approval, v1.28 shipped B32 + B33 + B37 together and the
wk 19 / wk 20 step-back from B38.**
**Reviewed 27 Oct 2026 by the weekly scheduled run — three new items, B40–B42,
and a correction to B39. Nothing was built.**
**Reviewed 3 Nov 2026 by the weekly scheduled run — two new items, B43 and B44;
B40 and B41 reproduced live on attempt morning; B38b closed as overtaken by the
calendar. Nothing was built, and nothing has shipped since 19 Oct.**
**Reviewed 10 Nov 2026 by the weekly scheduled run — three new items, B45–B47;
B41 reproduced live again on a second Tuesday; B40 closed as overtaken by the
calendar, with the gate check it asked for carried forward to B43. Nothing was
built.**
**16 Nov 2026 — v1.29 SHIPPED on his instruction: the running block wk 13–20
rebuilt on the 8-week plan he chose, the long run prescribed in minutes, and
the app taught to read a run that states a time. Gate 138 → 141. B43 closed as
overtaken; B30, B28, B45 and B46 re-measured against the new plan; two new
items, B48 and B49.**

## State as of 16 Nov 2026 — v1.29 shipped

**Gate: 141/141 passing, green**, on the build that shipped today. The three new
checks and the four superseded-and-replaced ones were each run against the
untouched v1.28 first and all seven go red on it, so they prove something.

**Version agreement:** `APP_VERSION v1.29` · badge `v1.29 · built 16 Nov 2026` ·
`sw.js CACHE_VERSION v1.29` · CHANGELOG line 3 `v1.29` ·
`PROGRAM_REV 2026-11-16-8week5k-timebased`. Rollback is
`claude/app-v1.28-rollback.html`, one minor behind, and the v1.27 rollback was
deleted.

**He was ill and did not run the wk 12 trial on 11 Nov.** The last measured 5K
is still the 23:43 of 15 Sep. The next measurement is the **wk 20 race**.

### What shipped

Weeks 13–20 now run one interval (Wed), one threshold (Fri), one long run by
time (Sun) and one optional 40-minute easy run (Tue), on the paces from the
chart he supplied. Trials are dropped at his instruction; the plan's closing 5K
race is read as a timed effort so the clock time still has a home. Full account
in the v1.29 changelog entry.

**A tenth instance of the slot-name class was found and fixed by the plan
change**: `getGoalAnchors` scanned the quality slot alone for the trial target,
so moving the goal race to the Sunday slot silenced Goal 2 completely. The gate
check for it carried the identical assumption.

### What did NOT ship, and is still waiting on him

**B41 + B44 remain the oldest live defect** — the Home card still opens Easy
Run 1 when it says Upper A, reproduced on two consecutive Tuesdays, and
**Tue 29 Dec is the 120 kg attempt**. Nothing about this build touched it.
B42's display drift is now *worse*, because the session subtitles describe a
plan that has been replaced twice over.

**Status key:**  `OPEN` · `CLOSED-vX.YY` · `DECLINED`

---

## Open

### Ranked order as of 16 Nov 2026

**v1.29 shipped the running rebuild. The top item has not moved since 27 Oct
and is now the only functional defect left on the board.**

1. **B41 + B44** — the Home card opens the **wrong session on Tuesday** and
   nothing at all on Sunday. Reproduced live on two consecutive Tuesdays.
   **Tue 29 Dec is the 120 kg attempt.** Raised 27 Oct, still unanswered.
2. **B42** — the session subtitles describe a plan replaced twice over. Three
   static copies. Cheaper after B44.
3. **B48** — **new.** wk 21 steps **+23.9%** out of the new block. Needs one
   word from him.
4. **B45** — the tempo/threshold sessions still cannot be logged rep by rep,
   and v1.29 widened the gap: they are now stated in minutes.
5. **B46** — one HR target zone for both hard session types, so a correctly-run
   interval session is flagged. v1.29 made this sharper, not softer.
6. **B26** — the plan says the 5K target is 22:45, `TRAINING-CONTEXT.md` says
   22:30. The wk 20 race carries 22:45. One line.
7. **B34** — `regression.mjs --state` still does not exist.
8. **B35** — the milestone and PR sync replaces the local copy instead of
   merging it.
9. **B28** — re-measured; the long run is 35–39% on four weeks of the new block.
10. **B49** — **new.** The threshold sessions carry no rep-distance scheme, so
    the coach cannot progress them at all.
11. **B47** — three dead declarations.
12. **B39 / B20** — watch item. The wrong count in `TRAINING-CONTEXT.md` was
    corrected at v1.29.
13. **B36** — the service worker has no timeout on the shell fetch (114 KB
    gzipped behind it).
14. B31 · B29 · B23 · B24 · A6 · A3 · A5 · B21 · B15 · B16 · B22/B13.

### B48 · Week 21 steps +23.9% out of the new block — `OPEN` · **new 16 Nov** · needs Mardy · one word

The Marathon-Revolutie preview week is untouched at **44.0 km**. The new block
ends with wk 19 at 35.5 and wk 20 at 29.2, so the step from wk 19 into wk 21 is
**+23.9%** — comfortably past the +10% ceiling this plan has held since v1.13.

**The gate does not flag it, and that is deliberate and explained.** The +10%
guard now excludes the MR week by its own tag, because MR is a separate
programme with its own rules written into its own text ("never further than
14 km", "two runs a week at marathon HR") and a ramp step *into* a different
programme is not a ramp step. Four v1.27 checks already scope themselves that
way. **But the step is real and his body does not know about the tag.**

**Three honest options:**

- **Leave it.** wk 21 is 11–17 Jan, a week after the race, and it is a preview
  week rather than a training week. Arguably the ramp ends at wk 20 and wk 21
  starts something new.
- **Trim wk 21** to ~39 km so the step is ~+10%. It has its own rules and this
  file's standing instruction is never to rescale it mechanically, so this
  would be a deliberate edit, not an arithmetic one.
- **Add a bridge week.** More structure than it probably deserves.

I would take **leave it** and say so plainly rather than silently: a preview
week for a different block, after a goal race, is not the same stressor as a
+23.9% step inside a ramp. But it is his body and his call.

**The decision I need:** *leave it*, *trim it*, or *tell me what wk 21 should
be now that the 10K trial it was waiting on has become a 5K race.*

### B49 · The threshold sessions carry no rep scheme, so the coach cannot progress them — `OPEN` · **new 16 Nov** · consequence of v1.29 · low

`parseQualityRepScheme` reads `N×DDD m`. From v1.29 the threshold sessions are
stated in minutes — `[THRESHOLD] 2×13 min @ 4:55/km` — so it correctly returns
**null** on all seven of them, and the gate now asserts that refusal rather than
skipping it.

**The consequence:** `rewriteQualityReps` and the coach's rep-progression branch
— which B27 shipped at v1.26 — cannot fire on a threshold session. They still
work on the interval sessions, which keep their metre-based reps. So the coach
can offer to add a rep to Wednesday and never to Friday.

**This may be correct rather than a defect.** The sessions are now prescribed by
an external 8-week plan he chose; a coach that offers to lengthen them is
offering to depart from it. But it is a capability that worked on every hard
session before this build and now works on half of them, so it is logged rather
than left implicit.

**Cost if he wants it:** `parseQualityRepScheme` gains a minutes variant
(`N×MM min`), and `rewriteQualityReps` moves the stated `≈ N min of quality`
line the way it already moves the km one. Half a day, and the existing
"exactly two lines may change" check extends to cover it.

**The decision I need:** *leave it* (I would — the plan is his and the page's,
and progressing it is not), or *build the minutes variant* if you want the coach
able to lengthen a threshold session.

### B26 · The plan and TRAINING-CONTEXT state two different 5K targets — `OPEN` · needs Mardy · one line

| | says |
|---|---|
| `TRAINING-CONTEXT.md` | the working target for this block is **22:30** |
| the wk 20 race session | `target 22:45` |

**v1.29 did not invent a target.** When the wk 16 trial was dropped, the race
needed one or `getGoalAnchors` would have had nothing to read, so it carries the
**22:45 the plan already stated at wk 16**. That was the conservative choice —
carrying a number forward rather than picking one — and it leaves the two
documents disagreeing exactly as they did on 30 Sep.

Measured on a clean install, `goalAnchorLines(13)` reads, verbatim:

> 🎯 Goal 2 — a faster 5K. No trial recorded yet, so every derived pace is still
> an assumption. The plan's own best target is 22:45 over 5 km on Wk 20.
> Next trial Wk 20.

**And note what his own chart implies.** 5K race pace **4:36/km × 5 = 23:00**.
So the chart he supplied on 16 Nov describes roughly a 23:00 runner, his last
measured 5K was 23:43, and the race target says 22:45. Three numbers, none of
them measured since 15 Sep.

**The decision I need:** *22:30 or 22:45* — one line in whichever file is wrong.

### B30 · No 5K measurement since 15 September — `OPEN` · **re-measured 16 Nov** · his call

He was **ill for the wk 12 trial on 11 Nov** and did not run it. So:

- the last measured 5K is the **23:43 of 15 Sep**, now nine weeks old;
- the wk 16 trial was dropped on 16 Nov at his instruction;
- **the next measurement is the wk 20 race, 4–10 Jan** — seven weeks away.

Everything the block derives runs off that 23:43 until then, *if it was ever
entered*. The chart he supplied on 16 Nov is now the written anchor for the
paces, but the app's own verdicts — the stale-prescription warning, the
seconds-to-goal figure, the derived pace bands — still read `getLatestTrial()`.

**Measured 16 Nov on a clean install, which is what a cloud session sees:**
`getGoalAnchors(13).run.latest` is **null**, and the goal line says *"No trial
recorded yet, so every derived pace is still an assumption."* **If his own
install says the same thing, the app has no anchor at all.**

**Home → Program → wk 4 → trial card → `23:43` → Save time.** I drove that path
on 10 Nov and again today: it stores, it re-anchors immediately, and the goal
line changes to state the gap. **One field, thirty seconds.** The same goes for
logging a bench set *with an RPE* — see B16; the goal block still says "No bench
set logged with an RPE yet" and the 120 kg attempt is seven weeks out.

**Nothing to decide here, and nothing I can do from a cloud session** — the data
lives on his phone. It is at the top of the board because it is the cheapest
thing on it.

### B41 · The Home "today" card opens the wrong session on Tuesday — `OPEN` · raised 27 Oct, unanswered · **reproduced live 3 Nov and again 10 Nov** · functional defect · see B44

**Mechanism, re-read off the shipped build this morning. It is one character.**
`renderHome` picks the next incomplete session by day-of-week, then emits
`data-dayindex="${nextIdx > 0 ? nextIdx - 1 : ''}"`. The two orderings do not
differ by one:

```
DOW_SESSION  = ["longRun", null,      "upperA", "quality", "lower", "easy",   "upperB"]   // 0 = Sunday
SESSION_DAYS = [ upperA,   recovery2,  quality,  lower,     easy,    upperB,   longRun ]
```

`nextIdx - 1` happens to be right for indices 3–6 and is wrong at both ends.
Tuesday is `nextIdx = 2` → `dayindex = 1` → `SESSION_DAYS[1]` = **`recovery2`**,
not `upperA`. Sunday is `nextIdx = 0` → `dayindex = ""` → `parseInt("")` is
`NaN` → the handler's `if (isNaN(dayIndex)) return;` fires and the tap does
nothing, **while the card still carries the `clickable` class**.

| day | the card says | tapping it opens |
|---|---|---|
| **Tue** | **Upper A** · *Bench · Mil Press · + easy run* | **`Easy Run 1`** |
| Wed | Intervals / Speed | the TEMPO session ✓ (right session, wrong name — B42) |
| Fri | Easy Run 2 | the INTERVALS session ✓ (right session, wrong name — B42) |
| **Sun** | **Long Run** | **nothing — the card is dead** |

**Why it matters more than it looks.** Tuesday is the bench day — *"run first,
lift after"* — and three weeks in this block carry a max single on a Tuesday.
Two of them have now been missed: Tue 6 Oct (112.5) and Tue 3 Nov (115). **The
last is Tue 29 Dec, the 120 kg attempt.** The Home card is the first thing the
app shows. And the long run, the single longest session of the week, is the one
session that cannot be opened from Home at all.

**Cost:** see B44 — read `getWeeklySchedule(wk)` and key into `SESSION_DAYS` by
session key, and the arithmetic disappears with the local copy. Four lines of
change, mostly deletion.

**What proves it, and I have confirmed it fails on v1.28 on two separate
dates:** for every weekday carrying a session, tapping the Home card lands in
the logger for **that same session key**, asserted against `getWeeklySchedule`
rather than a written-down list — and a card rendered `clickable` always
navigates. Six days, one check.

**The decision I need:** *yes* to fix both halves, and *(a) patch the index* or
*(b) delete the local copy and read `getWeeklySchedule`*. I would take **(b)** —
same size, and it closes B44 at the same time.

### B44 · The Home card is the only reader of the schedule that ignores a session move — `OPEN` · new 3 Nov · code health + latent defect · same fix as B41

**The app derives the weekly day→session mapping properly, in one place:**

```js
const DEFAULT_DOW_SESSION = ['longRun', null, 'upperA', 'quality', 'lower', 'easy', 'upperB'];
function getWeeklySchedule(wk) { … honours programOverrides of kind
                                   'session_day_shift' and 'session_swap' … }
```

**Four readers go through it** — `planMoveSession`, `planSwapSessions`,
`planQueryNext` and `planSkipSession`, i.e. the whole coach-chat scheduling
surface. The feature is live and reachable: the coach input placeholder is
literally `Try "move thursday quality to friday"`.

**`renderHome` does not use it.** It declares a fifth copy of the same list
inline, and then indexes four more parallel arrays off the day number —
`DOW_LABEL`, `DOW_SUB`, `DOW_ICON`, `DOW_COLOR` — which duplicate the `label` /
`sub` / `icon` / `color` fields `SESSION_DAYS` already carries per session.

**Two consequences, one latent and one live.**

- **Latent:** ask the coach to move the long run to Saturday and it will agree,
  `planQueryNext` will report it correctly, and **the Home card will still say
  Sunday** — the first screen in the app, disagreeing with the coach that just
  changed it. Not reproduced against a real override, because creating one needs
  the coach chat; reproduced as far as *the Home card never calls the function
  that applies them*, which is the whole claim.
- **Live:** the private copy is ordered by day-of-week while `SESSION_DAYS` is
  ordered by session, and `data-dayindex` is the arithmetic bridging them.
  **That arithmetic is B41.**

**Also dead:** `const DOW_PAIRED = { 2: 'recovery2' };` at line 2408, read
nowhere. It is the model's own statement that Tuesday carries two sessions; the
Home card expresses the same thing as the prose `"+ easy run"` in a hardcoded
subtitle instead. Same shape as the `HR_ZONES` constant deleted at v1.27.
**The 10 Nov sweep found four more dead declarations — see B45 and B47.**

**Cost:** read `getWeeklySchedule(wk)` instead of the literal, resolve the
session through `SESSION_DAYS.find(d => d.key === key)` rather than by index,
and delete `DOW_SESSION`, `DOW_LABEL`, `DOW_SUB`, `DOW_ICON`, `DOW_COLOR` and
`DOW_PAIRED`. Half a day, mostly deletion. The risk is the Home card's
appearance, which a check can pin. **Doing this is also what makes B42's derived
subtitles cheap**, because there would then be one place that names a session.

**What proves it:** two checks. (1) B41's. (2) With a `session_day_shift`
override seeded, the Home card and `planQueryNext` must name the same session
for the same day. **(1) fails on v1.28 today. (2) is new coverage rather than a
reproduction.**

**The decision I need:** *yes* — and whether to take the deletion in the same
build as B41 (I would) or to patch the index now and schedule the deletion.

### B45 · The tempo/threshold session cannot be logged rep by rep; the interval session can — `OPEN` · new 10 Nov · **re-measured 16 Nov against the new plan** · functional gap · needs Mardy

**v1.29 did not close this and made the shape plainer.** The new block runs one
interval session and one threshold session a week, Wednesday and Friday. The
interval session renders the rep table; the threshold session does not. So he
can see the inside of exactly half of his hard running, every week, for eight
weeks. `isTempo` is still computed in `renderSessionLogger` and still never
read. **See also B49**, which is the same gap one level down: a threshold
session stated in minutes carries no rep scheme at all.

The counts below are the pre-v1.29 measurement, kept as the record.

**Found by the declared-and-never-read sweep.** `renderSessionLogger` computes

```js
const isIntervals = !!planned && planned.includes('[INTERVALS]');
const isTempo    = !!planned && planned.includes('[TEMPO]');

if (isIntervals) {  … renders #intervalBody, #addIntervalBtn, seeds rows from the plan … }
```

**`isTempo` is assigned and never read.** One occurrence in the whole file. The
branch was intended and never written.

**Measured across every tagged hard session in the plan**, driving the real
logger through the real week view:

| | sessions | rep table rendered |
|---|---|---|
| `[INTERVALS]` | **13** (wk 1, 2, 7–11, 13–15, 17–19) | **yes** — `#intervalBody` + `#addIntervalBtn`, seeded with the plan's own rep count and distance |
| `[TEMPO]` | **12** (wk 3, 7–11, 13–15, 17–19) | **no** — the plain run form: Distance · Avg Pace · Avg HR · Max HR · RPE |
| `[CRUISE]` · wk 5 | 1 | no |

**`parseQualityRepScheme` already reads every one of them.** wk 13's tempo
returns `{reps:2, dist:2500, unit:'m', workKm:5}`; wk 17's returns
`{reps:4, dist:1400, workKm:5.6}`. The data to seed the table is computed, and
the logger does not ask for it. **This is "unread data" again — the ninth
instance of the class this file keeps naming, and the first one found by the
dead-declaration sweep rather than by a grep for a slot name.**

**What it costs, measured end to end on wk 13.** Both hard sessions logged at
exactly their prescribed pace, same RPE, same sleep. The coach output differs by
**three lines**, and they are the three that make a hard session worth logging:

| | Wednesday `[TEMPO] 2×2500 m @ 4:53` | Friday `[INTERVALS] 5×800 m @ 4:30` |
|---|---|---|
| interval rows rendered | **0** | **5** |
| `✅ 5 intervals logged, avg 4:30/km.` | — | ✓ |
| `✅ Split spread 0s across the reps — well paced.` | — | ✓ |
| `📈 Avg interval HR 171 (Z5), peak 171.` | — | ✓ |

**Split spread — did he fade across the reps — is the single most useful thing
a threshold session tells you, and the Wednesday session cannot produce it.**
From wk 7 he runs two hard sessions a week by his own instruction; he can see
the inside of one of them. **Six tempo sessions remain in the block** — wk 13,
14, 15, 17, 18 and 19 — against six remaining interval sessions, so this is
half of every remaining hard week.

**Cost:** small. The branch is `if (isIntervals || isTempo)` plus whatever
labelling the table should carry for continuous reps, and
`parseQualityRepScheme` already supplies count and distance for both. The risk
is the save path: `window._intervals` and the stored `intervals` array would
start appearing on a session kind that has never carried one, so the reconcile
and the coach's interval branch both need driving before and after.

**What proves it, and it does not exist today:** for **every** session the
classifier calls `quality` and `parseQualityRepScheme` can read, the logger
renders a rep table whose row count equals the plan's own rep count — driven
through the real week view, derived from the plan, never a list of weeks. It
goes red on twelve sessions on v1.28 today. **A second check should assert the
coach's split-spread line appears for a tempo session logged rep by rep**, or
the table ships without the thing it was for.

**The decision I need:** *yes* to log tempo reps the same way, or *no — a tempo
is a continuous effort and I log it as one distance.* I would take **yes**:
five of the twelve are written `4×1100`–`4×1500 m`, which is a rep session by
any reading, and the two-rep ones are still two timed efforts. If you want it
only for the multi-rep ones, say so and the branch keys on the parsed rep count
instead of the tag.

### B46 · A correctly-run interval session is flagged ⚠ on the same screen that says its pace is ✅ — `OPEN` · new 10 Nov · **sharper after v1.29** · needs Mardy · analysis defect

**v1.29 raised the stakes rather than lowering them.** The new interval sessions
are prescribed at **4:36/km — his own 5K race pace** — where the old ones ran
4:30–4:37 off a tiered ramp. A 5K-pace rep is a Z5 effort by definition, and
`RUN_TARGET_ZONE` still maps every `quality` session to **Z4**. So he will be
told he ran too hard on each of the eight interval sessions in this block, every
time he runs one correctly. **And B31 underneath it is load-bearing again**: the
Z4/Z5 boundary is 85% of a maxHR of 183 that may be ±10 bpm.

**The HR model has one target for both hard session types:**

```js
const RUN_TARGET_ZONE = { easy: 'Z2', long: 'Z2', quality: 'Z4', trial: 'Z5' };
```

and `classifyRunSession` returns `quality` for `TEMPO`, `THRESHOLD`, `CRUISE`,
`INTERVAL`, `RACE PACE` and `INTENSIVE` alike. **So a VO2max interval session
and a threshold tempo are judged against the same band** — while the plan
itself separates them by 23–30 s/km (threshold 5:00 → 4:46, intervals 4:37 →
4:23) and v1.24 built the whole alternation around the distinction.

**Measured on wk 13's Friday session, logged at exactly the prescribed pace.**
Two verdicts on the same session, on the same screen:

```
✅ Pace 4:30/km, inside the prescribed 4:30/km.
⚠ Avg HR 171 is in Z5 (168–183); a quality session targets Z4. Running an easy
  day in the middle zones costs recovery and buys very little.
```

The pace verdict says he executed it correctly. The HR verdict says he ran it
too hard. **Both are reading the same session.** An interval at VO2max pace
*is* a Z5 effort — the model already knows that, because `trial` is mapped to
`Z5` and a 5K trial is the same intensity.

**Two separate defects in those two lines.**

1. **The band.** `quality` needs to split into the two kinds the plan already
   tags. The classifier has the tag in hand and throws it away. Thirteen
   interval sessions will be told they ran too hard every time they are run
   correctly, and he will stop reading the line — which is the real cost, and
   it is the same cost as a gate that cries wolf.
2. **The sentence.** *"Running an easy day in the middle zones costs recovery
   and buys very little"* is hardcoded onto **both** branches of the above-band
   verdict (lines 6614–6615), whatever the session kind. It is an easy-run
   sentence appended to a hard-session verdict. Same class as B42, one level
   down: the verdict is derived and the prose around it is not.

**This makes B31 sharper, not softer.** B31 asks whether 183 is really his max.
If `quality` splits into threshold → Z4 and VO2max → Z5, then every interval
verdict starts depending on the Z4/Z5 boundary — `75–85%` and `85–100%` of a
number that may be ±10 bpm. The two items want answering together.

**Cost:** `RUN_TARGET_ZONE` gains a key, `classifyRunSession` returns the kind
it already parsed (or a second field, so nothing that switches on `'quality'`
breaks), and the two prose lines take the session kind they are describing.
Half a day, and it moves every heart-rate verdict on a hard session — so the
gate goes first.

**What proves it:** the v1.20 shape, one level up — **the same heart rate must
read `in` on an interval session and `above` on a tempo**, with the probe value
and both bands read from `getHRZones()` rather than hardcoded. Plus: no verdict
on a session the classifier calls hard may contain an easy-run phrase. I have
confirmed by hand that the first goes red on v1.28 today.

**The decision I need:** *split the bands* (I would — the plan already makes the
distinction and the app already has a Z5 target for the trial), or *leave one
band and just fix the sentence*, or *leave it* if you read the pace line and
ignore the HR one. **And B31's question underneath it: is 183 your max, or
should I pin `hrConfig.zoneBoundaries.z2High` to a number off your watch?**

### B42 · Five of seven session buttons misdescribe their own content — `OPEN` · raised 27 Oct, unanswered · **re-measured 10 Nov, unchanged** · display drift · medium

Two static copies of the plan's shape in the file, both describing a plan that
was replaced between v1.21 and v1.27.

**`SESSION_DAYS` (line 1523) — the week-view buttons.** Re-read this morning,
with what that session actually contains beside it:

| button | its subtitle | what the session holds |
|---|---|---|
| Legs | `Sumo DL · Back Squat 5×5 · **Lunges · Hip Thrust** · Core` | Back Squat · Sumo · **Split Squat · RDL**. Lunges and Hip Thrust are in **no** block-B week — the rotation replaced both at v1.21 |
| Upper B · Back | `Pull-ups · Low Row · **Pullover** · Biceps · Core` | **Pullover Machine was deleted at v1.23.** The session's headline lift is **Paused Bench**, which the subtitle has never named, and the **Cable Row** that moved here at v1.26 is not named either |
| Upper A · Chest | `Bench + back-offs · Mil Press · **Pec Deck** · Triceps · Metcon` | block B uses **Cable Fly**; **Close-Grip Bench** — the lockout work added at v1.23 *for this goal* — is not named |
| Easy Run 2 | `Fri · **aerobic volume · Zone 1–2**` | `[INTERVALS]`, every week from wk 7 |
| Intervals / Speed | `Wed · **VO2 · threshold · 5K pace**` | `[TEMPO]`, every week from wk 7 |

Only `Easy Run 1` and `Long Run` still describe themselves correctly.

**`DOW_LABEL` and `DOW_SUB` (lines 6784 and 6786) — a second and third copy, on
the Home card.** Re-read verbatim this morning:

```js
DOW_LABEL = ["Long Run","Rest Day","Upper A","Intervals / Speed","Legs","Easy Run 2","Upper B"];
DOW_SUB   = [ …, "VO2 · threshold · 5K pace", …, `HR Zone 1–2 easy (${_z2.low}–${_z2.high} bpm)`, … ];
```

So Wednesday is named **"Intervals / Speed"** over the tempo and Friday
**"Easy Run 2"** over the intervals — the two hard days named as each other's
session, on the first screen in the app. And Friday's subtitle renders
**`HR Zone 1–2 easy (119–137 bpm)`** over the VO2max session: the exact band
v1.28 stopped judging hard sessions against. The behaviour was fixed and the
sentence stating the wrong number was left on the screen he sees first.

**This is the class the project has paid for most often**, and the fix shape is
already in the file: `phaseLabel()` derives the block headings from the plan's
own text and cannot drift.

**Cost:** two options, different sizes.
- **(a) Correct the strings.** An hour, zero risk, drifts again the next time an
  accessory rotates. It has drifted three times already.
- **(b) Derive them**, the way `phaseLabel()` does — read the session's own
  first lines and tag. Half a day, cannot drift again.

I would take **(b)**, because (a) is what was done the last three times.
**B44 changes the arithmetic:** `DOW_LABEL` / `DOW_SUB` only exist because the
Home card does not resolve a session object. If B44 is taken, the Home half
disappears with it and (b) is left with one place to derive from rather than
three. **(b) after B44 is cheaper than (b) today.**

**What proves it:** each session button's subtitle names no exercise absent
from that week's own session text, and a slot whose text carries a hard-session
tag is not described with an easy-run or Zone 1–2 phrase. Derived from the plan
on every week, never from a list. It goes red on five of seven buttons today.

**The decision I need:** *(a) or (b)*, or *leave it* if you read the content and
never the button.

### B34 · `node regression.mjs --state` does not exist — `OPEN` · new 13 Oct · **re-confirmed 27 Oct, 3 Nov and 10 Nov** · process safety

The project instructions make this step 0 of every session and say it exits 1 on
any version disagreement. **Re-confirmed against the canonical `regression.mjs`
read from the project this morning: zero occurrences of the string `--state` in
4,627 lines.** `process.argv[2]` is the app path, so `node regression.mjs
--state` tries to read a file named `--state` and dies with `ENOENT`.

**The gate also still does not count its own checks.** The only reference to
`results.length` is the cosmetic tally in the final `console.log` (line 4626).
Nothing reads CHANGELOG, and nothing compares `APP_VERSION` against CHANGELOG
line 3 either. **Both self-protections rules 1 and 2 lean on are documented and
absent.**

**What this run did instead.** The gate was reconstructed by a delegated read,
validated three ways (`node --check` clean; 138 `^await check\(` registrations
matching the `GATE:` line; green on a build unchanged since 19 Oct) and run.
138/138. **The recipe works and it is now routine — this run spent far less of
its budget on it than 3 Nov did**, which is the argument for `--state` getting
*cheaper* to justify, not more expensive: the thing standing between a
transcription slip and a false red is still a hand-comparison of two numbers.

**Cost:** an afternoon, and it buys three things. `--state` is a file read and a
dozen comparisons with no browser. The self-count is `results.length` against a
number parsed out of CHANGELOG. Asserting CHANGELOG line 3 against
`APP_VERSION` is three lines more. All gate-only, so by the shipping protocol
they take a dated `## GATE —` entry and redeploy nothing.

**The decision I need:** *build it* or *fix the instructions to describe what
actually exists*. I would still take **build it**.

### B35 · A milestone or PR edit made offline can be erased by an older snapshot — `OPEN` · new 13 Oct · silent data loss

The same defect `resolvePlanned` had at v1.11, in the two places the fix was not
applied. `loadProfile` reads the optional columns back like this:

```js
state.milestones  = data.milestones;      // replaces
state.exercisePRs = data.exercise_prs;    // replaces
state.hrConfig    = { ...defaults, ...data.hr_config };   // replaces
```

while `trial_results`, four lines below, unions on `(week, distance)` with the
local copy winning a tie, with a comment explaining exactly why. The asymmetry is
what makes this an oversight rather than a decision.

**Why it is reachable.** `syncExtrasSilent()` is fire-and-forget: one `update`,
a `catch` that swallows everything, no retry and no queue entry. The offline
queue covers session writes only. So a milestone edited in the gym on a dead
signal exists in localStorage and nowhere else, and the next boot that gets a
profile row written from another device — or from this one before the edit —
replaces it.

**This now sits directly in front of the trial.** `trial_results` is the column
that *is* merged correctly, so the trial time itself is safe. But B30 asks him
to go and edit his milestones and enter a retroactive trial in the same week, and
the milestone half of that is the half that can be erased.

**Cost:** small, but it wants a refactor first. The merge is buried inside
`loadProfile`, which needs Supabase, so it cannot be asserted as it stands.
Lifting it to a pure `mergeProfileExtras(local, remote)` is the fix and the
testability in one move — the same shape as B17.

**What proves it:** a pure check that a local milestone absent from the remote
array survives the merge, that a remote one absent locally is added, that a
conflict resolves local-wins, and the same three for `exercisePRs` with the rep
floor still holding afterwards. I have **not** confirmed these fail today,
because the merge is not reachable from the gate — that is the point of the
refactor, and it is the honest state of this item.

**The decision I need:** *yes* to lift and merge, or *leave it* if you only ever
run one device. I would take **yes**.

### B28 · The long run is 35–39% of the week on four weeks — `OPEN` · **re-measured 16 Nov against the new plan** · needs Mardy · arithmetic, not opinion

**Re-measured 16 Nov against the build that shipped today.** The v1.26 ramp
that created this item is gone from wk 13 on, and the share improved with it.
Weeks 13–20: 29.1 · **35.8** · **35.4** · 28.4 · **38.6** · **37.7** · 27.6 ·
29.1%.

**Four weeks are still above the 30–35% ceiling** — wk 14, 15, 17 and 18, which
are exactly the four the page prescribes an 80- or 90-minute long run. The other
four sit comfortably inside it. That is a much smaller problem than the
thirteen-consecutive-week breach this item was raised for, and it is now the
page's shape rather than a side effect of something else.

Created by v1.26 and stated to him in the same breath. The two easy runs went
from 9 km to 5 km on his instruction; **the long run did not move**, because he
said easy runs. So the share went the other way.

This plan has held a 30–35% ceiling since v1.13 — one of the structural fixes in
that build — and the app's Running volume card reports it on every week screen.

**One line per week fixes it**: bring the long run to ~10 km now and give it the
same +0.5 km ramp, and the share sits at ~33% from here with the weekly totals
barely moving. The alternative reading is that 41% is fine on a 5K block with
four runs — a longer easy run is not the same stressor as a marathon long run —
in which case the ceiling in `TRAINING-CONTEXT.md` is the thing that should
change. **wk 13 starts Monday, so this is the week to decide it in.**

Either answer is a small build. Leaving both documents disagreeing is the one
outcome this project has learned to avoid.

### B47 · Three dead declarations, two of them with a claim attached — `OPEN` · **new 10 Nov** · low · code health

Found by the same sweep that produced B45. Excluding `DOW_PAIRED` (B44) and
`isTempo` (B45), the file holds three more identifiers that are declared and
never read:

1. **`planSignature` (line 6748) — declared, never called.** Its own comment
   says: *"Signature of the plan as the logger understands it. Stored alongside
   a saved session so we can tell later whether the program has since moved."*
   **Nothing stores it and nothing compares it.** The logger reconciles saved
   exercises **by name**, which catches an added or removed exercise and
   catches nothing else — so a changed set count, rep target or weight on an
   exercise he has already logged is invisible to the plan-changed banner,
   which is exactly what the signature was built to see. **A comment claiming a
   behaviour that does not exist is the B34 shape in miniature.** Either wire it
   up or delete it and the comment with it.
2. **`sessionNotes` (line 8623) — read from the DOM by the coach handler and
   never referenced.** `const sessionNotes = document.getElementById('notes').value;`
   **This is the `runPace` defect exactly** — a field collected, stored, read
   into a variable and thrown away. It matters a little more than it looks
   because the plan tells him to put his finisher score there (*"score = time →
   log it in Notes"*), so the one free-text signal he is instructed to produce
   reaches the coach and is dropped. Probably correct to drop — the coach is
   rule-based — but then the read should go.
3. **`originalText` (line 8772) — captured before the apply button is set to
   `'Saving…'` and never restored.** `await applyProgramUpdate(s)` is not
   wrapped, so if it throws the button is left disabled reading `Saving…` with
   no error, and the suggestion looks half-applied. Low likelihood, bad
   failure mode.

**Cost:** 1 and 3 are a few lines each; 2 is one line either way. None is a
behaviour change on its own except 1, which is a real capability if wired up.

**What proves it:** the dead-declaration sweep itself, as a source canary —
no `const`/`let`/`function` in the file may occur exactly once. It would go red
on five today and is the check that would have caught `DOW_PAIRED` and
`isTempo` before either became an item.

**The decision I need:** *delete all three* (cheapest, I would take it for 2 and
3), or *wire up `planSignature`* if you want the banner to notice a changed
weight on a week you have already logged. One word each.

### B39 · Block B's leg day — `OPEN` · new 19 Oct · **CORRECTED 27 Oct: the count was wrong** · de-ranked to a watch item

**B39 was filed on 19 Oct claiming block B carries four loaded squat/hinge
patterns. Measured across all eight block-B weeks (wk 9–16), that is wrong.**
Re-printed from wk 12 this morning:

```
Back Squat    4×5 @90 kg (lighter)          ← deload week
Sumo Deadlift 4×5 @110 kg
Split Squat   3×10 each (rear foot elevated, bodyweight)
RDL           3×10 (RPE 7 — hamstring accessory, deliberately lighter than your sumo)
```

**`Split Squat` is written `bodyweight`, in every one of the eight weeks.** So:

| block | weeks | **loaded** squat/hinge | unilateral slot |
|---|---|---|---|
| A | 1–8 | Back Squat · Sumo · Hip Thrust — **3** | Jumping Lunges (plyometric) |
| B | 9–16 | Back Squat · Sumo · RDL — **3** | Split Squat (**bodyweight**) |
| C | 17–21 | Back Squat · Sumo · Hip Thrust — **3** | Leg Press (machine) |

**Three in every block. Block B adds nothing.** What actually changed is the one
swap B20 recorded: **Hip Thrust → RDL**, a supported hip hinge replaced by a
spinally loaded one, in a session that already has Back Squat and Sumo.

**`TRAINING-CONTEXT.md` still repeats the wrong number under a ⚠.** Two
documents agreeing on a figure neither of them measured. **Fix the
TRAINING-CONTEXT paragraph when he answers this** — it has now been wrong there
for three weeks.

**The decision I need, unchanged:** *leave it and watch the lower back*, or
*swap the RDL* for Nordic Curl or Leg Curl, both already in the picker. I would
take **leave it and watch**. Block B runs to 7–13 Dec, so it is still worth one
word.

### B36 · The service worker has no timeout on the shell fetch — `OPEN` · new 13 Oct · **now has a number** · low · gym-signal

`index.html` is served network-first so a redeploy is picked up immediately,
which is the right call. But the fetch has no `AbortController` and no race
against the cache, so on a *flaky* signal — not a dead one — the app waits for
the browser's own timeout before falling back. A dead signal fails fast and the
cached shell appears instantly; one bar in a basement is the slow case, and that
is the normal case for this app.

**Re-confirmed 10 Nov against `sw-current.js`:** zero occurrences of
`AbortController`, `setTimeout` or `Promise.race` in the whole file.

**Measured this run, which is what the item was missing.** The shell is a single
file: **476,029 bytes raw, 117,101 bytes gzipped**, of which **421,783
characters are inline JavaScript** in five `<script>` blocks. So the
network-first path is waiting on a ~114 KB transfer before it is allowed to
fall back — not a 2 KB HTML stub. On a one-bar signal that is tens of seconds of
a white screen, with a perfectly good cached copy sitting one line away.

**Cost:** a few lines — race `fetch(req)` against a timer and serve the cached
shell if the timer wins, then update the cache in the background. The risk is a
shell one deploy stale if the timeout is too tight, which the background
revalidate already covers.

**What proves it:** a gate check that serves `index.html` with an injected delay
and asserts first paint under the chosen budget with a cache already warm.

**The decision I need:** a number. **1.5 s? 2 s?** Or *leave it*.

### B31 · Is 183 really his max heart rate? — `OPEN` · **promoted by B46** · needs one measurement

Raised by him on 5 Oct: *"i think my zone 2 hr is calculated wrong. It says it
is up to 137. Is that really true, with a max of 183?"*

**The arithmetic is right and the model is a choice.** `getHRZones()` computes
Z2 as 65–75% of max; 75% × 183 = 137.25 → 137. The common five-zone %HRmax
split puts Z2 at 60–70%, which at 183 would be 110–128. Neither is wrong; they
are different conventions, and the app has been using the generous one.

**Three things take most of the sting out of it.** His stated caps are his own
numbers, not the model's (easy ≤130 = 71% of max, long ≤137). Since v1.20 the
app judges each run against the band written on that session and only falls
back to the zone model where none is stated. And as of v1.27 the long run states
≤130 too.

**It is load-bearing, and B46 makes it more so.** The `[INTERVALS]` and
`[TEMPO]` sessions state no `bpm` band, so they fall back to the zone model —
currently to a single Z4 for both. If B46 splits them, the Z4/Z5 boundary
(85% of max) starts deciding thirteen interval verdicts, and that boundary is
85% of a number that may be ±10 bpm.

**Two ways to fix it properly, neither of which should be guessed at:**

1. **Measure it.** The highest heart rate he sees in a 5K trial or the last rep
   of an interval session is a far better anchor than a formula. **He runs a
   trial tomorrow — the Max HR field is already in the logger.**
2. **Pin the boundary directly.** `hrConfig.zoneBoundaries.z2High` already
   exists and overrides the percentage model on both sides — gate-covered since
   v1.10.

**Not changed, and deliberately.** Moving the zone model moves every heart-rate
verdict in the app, and the input it needs is a number off his watch.

### B29 · A trial written without its strides line mis-reads its cool-down — `OPEN` · low · latent

Found while writing the v1.27 gate. `parseQualityVolumeKm` on

```
🏃 5K TIME TRIAL — target 23:15
w-up 2 km
c-down 1.5 km easy
```

returns `cooldown: 2`, total 9 instead of 8.5. With the plan's real shape —
which carries `w-up 2 km + 4×20s strides, then all-out` — it reads 1.5
correctly.

**Harmless today**, and a gate check pins the real shape. It is logged because
the next person to write a trial session by hand will not know the line is
load-bearing. **Relevant to B30:** if a `target 23:15` line is added to wk 12,
add it to the headline and leave the w-up/c-down lines alone.

### A6 · Running programme rewrite — agreed in principle, blocked on three answers — `OPEN`

Agreed with Mardy on 15 Sep 2026, after an all-out 5K in **23:43**:

- Three runs a week, which is what he had been doing. The plan assumes four.
- Long run from **11 km**, +0.5 km/week, capped at 15 km.
- Two other runs starting at **5.5 km** and **3.0 km**, +0.5 km/week each.
- **Quality work stays in**, and the session types stay similar.
- **Paces re-anchored to what he runs now**, not to the 22:30 target.

**Largely overtaken by events.** v1.24, v1.26 and v1.27 have since rebuilt the
run week around **four** runs, re-based the easy runs and ramped the paces, all
on his later instructions. What survives is the open question of whether the
week should be three runs or four at all — and he has been running four since
wk 6.

**Three answers still needed before anything is written:**

1. **His logged weekly mileage for the last two weeks.** Not reachable from a
   cloud session — it lives in localStorage and the Supabase `session_logs`
   table, and there is no device bridge.
2. **Deload / time-trial weeks**, or a straight ramp with no cutback.
3. **Whether every attempt week steps back, or only the primary target.**
   Overtaken for this block — B38b, closed 3 Nov; there are no editable attempt
   weeks left. **Live again when the next block is written.**

**Implementation note:** write it as a `programOverrides` revision rather than a
plan rewrite, so his logged history stays intact and any week is reversible.

### B23 · Is there room for MORE upper volume? — `OPEN` · **needs one word**

He asked: *"can you check if the upper body work is not too little exercises or
reps/sets? I feel i can do more."* Measured after the v1.23 swaps, per week:
chest 12.1 + 3.5 compound, back 12.0, shoulders 10.3 (3.5 press · 3.8 medial
· 3.0 rear), biceps 6.0, triceps 3.0 isolation + the close-grip press.

Against the 10–20 hard-sets-per-muscle band, **chest, back and shoulders are
now all inside it and do not need more.** Two places genuinely have room:

1. **Triceps, 3 isolation sets + one compound.** Below the band, in a block
   whose goal lift fails at lockout. `Rope Pushdown 3×15` on Upper B — a fresh
   day, low systemic cost — would take it to ~7 quality sets. **Lowest-risk
   addition available; recommended.**
2. **Rep ranges.** Almost every upper accessory sits at 12–20 reps. Very little
   in the 6–10 range where the most transferable mass is built.

And one that is **his call because it touches a stated constraint**: a third
weekly bench exposure, as a light technique day. Powerlifting practice supports
2–3×/week for intermediates, but v1.11 chose two days specifically to protect
the shoulder. Not proposed unilaterally.

**Partly handled at v1.26.** On the three bench-attempt weeks the chest-day
finisher is now core only. That was a judgement, not his instruction, and it is
one line per week to reverse.

The original observation, still open for the other thirteen weeks: **the push-up
metcon sits on Upper A, right after heavy benching.** For a bench peak that is a
leak. It is his conditioning, so it stays until he says otherwise.

### B20 · Block B puts extra loaded hinge work in the leg session — `OPEN` · **see B39, corrected 27 Oct** · watch it

The v1.21 rotation swaps Hip Thrust for RDL in weeks 9–16. B39's four-pattern
count was wrong — Split Squat is bodyweight, so block B carries three, the same
as blocks A and C, and B20's original observation (a supported hinge replaced by
a spinally loaded one) is the whole of it.

**Block B runs to 7–13 Dec.** The decision and the straight swaps (Nordic Curl,
Leg Curl) are stated in B39.

### A2b · A Home-view trend block for the trial results — `OPEN` · low · **cheaper than it looks, and this is the week**

A2 shipped as placement **(a)**: the card lives on the week view, on trial
weeks only, which is where he is standing when he runs one. Option (b), an
always-visible trend on Home, was deliberately not built.

It is a one-card job: `getTrialTrend()` is pure, exposed and gate-covered, and a
Home block would only render it. **Verified this run that it returns everything
such a block needs** — per-trial pace, VDOT, same-distance `deltaSec` and
`isPB`. Worth doing if he says he wants the series in front of him without
navigating to a trial week. Not worth doing on a guess.

### B25b · A coach that can be asked a second question — `OPEN` · his call on scope

What is left of B25 part 2. The session now *ends* on answerable questions, but
each one is a single shot: he can say yes or no, not "why?" or "what if I move
it to Thursday instead?".

There is already a conversational surface in the file — `addCoachMessage`,
`renderCoachChat`, `handleCoachSend` and the clarify/change cards — that the
session logger's rule-based coach does not touch. The honest options are to
route the session's questions into that screen, or to add a second round of
canned follow-ups to the card. The first is the better app and the larger build;
the second is a week's work of guessing what he would ask. **Worth fifteen
minutes of his opinion before either is started.**

### B24 · The 5K running split — `PARTLY SHIPPED-v1.24 / v1.27` · one half still open

**The structure shipped at v1.24 and was replaced at v1.27 on his direct
instruction** — two hard runs and two easy, the long run run easy.

**Still open:** the original proposal also wanted the long run at **12–15 km**,
and it is 13.5–16 km carrying 40%+ of the week. That is B28.

**Paces must ramp, not be re-anchored once.** Shipped at v1.24 and verified
again this run: tempo 5:00 → 4:53 → 4:46, intervals 4:37 → 4:30 → 4:23, both
monotonic across the twenty-five tagged hard sessions.

| | 5K | VDOT | easy | threshold | interval |
|---|---|---|---|---|---|
| 15 Sep | 23:43 | 40.8 | 5:45–6:37 | 5:01 | 4:37 |
| target | 22:30 | 43.4 | 5:29–6:19 | 4:46 | 4:23 |

**Worth knowing for tomorrow:** the wk 13–15 tier is threshold 4:53 / interval
4:30. A 23:05 trial would be VDOT 42.1, whose derived paces are **4:53 and
4:30** — the tier he is about to enter is exactly right for that time. The
tiers were built for this and they land.

### A3 · Interim "fun races" have no slots — `OPEN` · needs Mardy

He asked for a fast mile, fast 5K and fast 10K between blocks. Only the week-20
10K exists. Placing the other two is a programme decision, not code.

### A4 · Quality paces are hardcoded against a 22:30 target — `DETECTION SHIPPED-v1.19` · **anchor improved v1.22** · **ramp shipped v1.24**

Every interval prescription carries an absolute pace. When a trial comes in
faster or slower, none of them move.

v1.19 shipped the *detection*; v1.22 improved what it anchors on; v1.24 shipped
the ramp, so the paces climb in three tiers tied to the trial cadence rather
than sitting at the goal.

What remains is that the ramp is still anchored to the 15 Sep 23:43 and **the
next trial is tomorrow** — see B30 — and that the app re-anchors automatically
only once he enters a trial time. **Verified this run that it does, immediately
and correctly, the moment a time is saved.**

### A5 · Verify the theme fix on his actual PWA install — `OPEN` · one-minute check

Fixed in v1.11 and carried forward; the gate proves it headless. Worth one real
check on his phone: set dark, force-quit, reopen in airplane mode, confirm it
stays dark. The installed PWA is the case that originally bit him.

### B21 · A trial session's logger still has no time field — `OPEN` · low · deliberate · **in front of him tomorrow**

v1.22 put the trial time on the **week view**, not in the session logger. On a
trial week the quality session's logger still asks for distance, average pace
and heart rate, and a trial is the one run where the clock time is the point.

Left as is on purpose: the card is the single entry point, and two places to
type the same number is how the two copies drift. **Confirmed again this run:
the wk 12 week view renders the trial card above the session buttons, so he
meets it before he opens the logger.** Worth revisiting only if he finds himself
in the logger looking for the field — **and tomorrow is the day to notice.**

### B15 · `Top Single` is classified as a bench lift by name alone — `OPEN` · low

`classifyBenchLift('Top Single')` returns `max`, because in this plan the only
`Top Single` is the bench rung in Upper A. **Re-confirmed 10 Nov: the rungs sit
at wk 6 (105), wk 10 (107.5), wk 14 (112.5) and wk 18 (117.5), all in Upper A,
and no `Top Single` appears in the leg session.** If one is ever added to Lower,
its squat or deadlift would feed the bench e1RM estimate. The fix is to key the
classification on the session as well as the name; not done now because it would
mean threading the session key through a pure function for a case that does not
exist yet.

### B16 · e1RM history needs the sessions to have been saved — `OPEN` · needs Mardy

`getLoggedBenchHistory()` reads stored sessions, so the trend line is only as
good as the log. Nothing to fix in code — but the payoff from v1.17 scales
directly with logging bench sets *with an RPE*. Without RPE the estimate is read
at face value and understates him by roughly 8–10 kg.

**Measured again 10 Nov on a clean install: "No bench set logged with an RPE
yet".** The 115 kg attempt was a week ago and the 120 kg attempt is seven weeks
out; with no RPE anywhere in the log, the goal block cannot state the gap it
exists to state. See B30.

### B22 · The standing sub-25:00 5K goal has been cleared and is still listed — `OPEN` · needs Mardy

`TRAINING-CONTEXT.md` records it: the 23:43 on 15 Sep clears the sub-25:00
milestone and it "should be retired". It is still a listed goal. Retiring it is
programme content and is not touched autonomously. **The editor works as of
v1.23**, so he can now do it — Home → Upcoming Milestones → Edit.

**Checked 10 Nov: the `MILESTONES` constant is still correct** — 112.5 on
2026-10-06, 115 on 2026-11-03, 120 on 2026-12-29, trials on 2026-11-11,
2026-12-09 and 2027-01-06, all agreeing with the live ladder and the trial
weeks. **But it seeds fresh installs only**, so his own stored copy may still
carry the pre-v1.11 dates. That is his two minutes in Settings — **and B35 says
do it on a good signal.**

### B11 · Two measured discrepancies against the recorded ramp — `DECLINED 2 Sep 2026`

**Mardy: "leave b11."** Left as measured. The numbers stay recorded so a future
run does not re-raise them as a finding.

1. v1.14 records "weekly totals from v1.13 are preserved". Measured, weeks 5, 6,
   9, 10 and 12 are **0.2–0.6 km short** of the v1.13 table.
2. Peak weekly volume is **52.5 km at week 18**, not the 52.9 recorded in
   `TRAINING-CONTEXT.md`.

*(Both figures are pre-v1.26. The live peak is 44.5 km at wk 18, re-measured
10 Nov. This item remains declined; the note is here so the numbers are not
confused.)*

### B13 · The app still displays a marathon goal and a stale bench ladder — `DECLINED 2 Sep 2026`

**Mardy: "b13 is not an issue."** Not to be raised again. Note that the *third*
copy of the stale ladder — the one inside the offline coach — was a live defect
rather than a display question and was fixed in v1.17; this item is only about
the `GOALS` chip and the user-editable `MILESTONES` list.

**A code fix alone still will not reach him.** `getMilestones()` seeds
`state.milestones` from the `MILESTONES` constant *once* and then persists the
user's own copy, so editing the constant changes fresh installs only. The honest
options are: he edits them in Settings → Milestones, or he approves a one-time
migration that re-seeds only the entries he has not touched.

---

## Closed

### B43 · Week 12's trial pointed at a trial that was deleted — `CLOSED 16 Nov — overtaken by the calendar`

Raised 3 Nov, re-raised 10 Nov the day before he was due to run it, never
answered. **He was ill and did not run the wk 12 trial.** Week 12 is now
history, and v1.29 dropped the remaining trials at his instruction, so the
stale line — `log the time — compare it against the wk4 and wk8 trials` — sits
on a session that will not be run again. Closed for the same reason B40 and
B38b were: asking him to decide something that no longer has an effect.

**The wk 12 text is left exactly as it is.** Weeks 1–12 are history and the
logger reconciles saved exercises by name; editing them to tidy prose is the
one thing this file says not to do.

**What survives is the gate check, and v1.29 did NOT build it.** Every `wk N`
reference in a session's prose should be asserted to name a week that actually
carries what the sentence claims. The 16 Nov sweep found **one** stale
cross-reference left in the whole block — wk 21's *"needs the Wk 20 10K result
first"*, which v1.29 corrected to the 5K race in the same edit — so the class is
currently clean, and a check would be protecting a clean file rather than
catching a live defect. **Re-raise the check the next time a week is edited
rather than rewritten; that is the condition under which this class appears.**

### B40 · Week 11's attempt-day text contradicts itself and names the wrong rung — `CLOSED 10 Nov — overtaken by the calendar` · **the gate check it asked for is carried forward to B43**

Raised 27 Oct, re-raised 3 Nov on attempt morning, never answered. **The
attempt was Tue 3 Nov. Week 11 is history.** Closed for the same reason B38b
was: leaving it open as "needs Mardy" asks him to decide something that no
longer has an effect.

**The text is still wrong and is recorded here so it is not re-discovered.**
`getPlanned(11, 'upperA')`, re-read 10 Nov and byte-identical to 27 Oct — the
first six lines are correct v1.26 content, the last three are v1.23 leftovers:

| the text says | the plan says | measured |
|---|---|---|
| "the rung is wk 10's **115** top single" | wk 10 is `Top Single 1×1 @**107.5** kg` | `parseBenchLadderWeek(10).top.load` = **107.5** |
| "which is **98%** of this" | 107.5 / 115 | **93.5%** |
| "if **wk 7's 115** was a miss" | wk 7 was the **112.5** attempt | `parseBenchLadderWeek(7)` = 112.5, kind `attempt` |
| "leave **120 at wk 15**" | wk 15 says *"Build week — no attempt here; the taper for 120 is at wk 19"* | 120 is at **wk 19**, `isPrimaryTarget` |

98% is where the stale line came from: on the v1.23 ladder wk 10 *was* a 115 top
single and wk 11 *was* a 117.5 attempt, and 115/117.5 = 97.9%.

**So on 3 Nov he opened a session carrying two mutually contradictory fallback
instructions and a claim that his heaviest made single was 7.5 kg heavier than
it was.** Whether that cost him the lift is not knowable from here, and asking
now would be asking him to relitigate a week that is gone.

**Three things survive this closure and must not be lost with it:**

1. **The gate check.** Every `N%` / `N kg` / `wk N` figure stated in a week's
   *prose* must agree with what `parseBenchLadderWeek` reads from the week it
   names, and no week may state two different fallback loads. **It is now
   specified under B43**, where it still has a live week to go red on.
2. **One sentence outside wk 11 is also loose, and is still live.** wk 14 reads
   *"the 94% rung for 120; second heavy single after wk 10"*. 112.5/120 =
   93.75% ✓, but the rungs are wk 6 (105) · wk 10 (107.5) · wk 14 (112.5) ·
   wk 18 (117.5), so wk 14 is the **third**, not the second. **wk 14 is
   23–29 Nov, thirteen days away.** Fold it into whatever edit touches the plan
   next; it is one word.
3. **The lesson.** wk 11 was the only attempt week *edited* rather than
   rewritten at v1.26, and it is the only one that drifted. Weeks 6, 7, 14, 15,
   18 and 19 were all read and are clean on their ladder prose.

### B38b · Weeks 7 and 11 still step up into their bench attempts — `CLOSED 3 Nov — overtaken by the calendar`

What was left of B38 after v1.28. He scoped the step-back to the primary target,
so the two earlier attempts were deliberately not touched.

| attempt | week | running | week before | step |
|---|---|---|---|---|
| 112.5 kg | wk 7 | 32.4 km | 30.4 km | **+6.6%** — history |
| 115 kg | wk 11 | 37.3 km | 36.8 km | **+1.4%** — attempt was Tue 3 Nov |
| 120 kg | wk 19 | 44.0 km | 44.5 km | **−1.1%** — fixed at v1.28 |

**Closed unanswered on 3 Nov, and the honest reason is the calendar.** The only
session left in wk 11 after the attempt was Sunday's long run, and trimming it
after the fact protects nothing.

**What survives is the rule, not this instance.** If he wants every attempt week
to step back rather than only the primary target, that is a one-line change to
the v1.28 check plus a trim per attempt week, scoped to the editable weeks — and
there are no editable attempt weeks left in this block. **Raise it when the next
block is written; do not re-raise it for wk 11.** Carried in A6 question 3.

### B37 · A coach suggestion on the Friday hard session stated no cost — `CLOSED-v1.28`

**Shipped 19 Oct with B32, which is the only way it could ship.**
`projectWeeklyVolume` now reads the session's own text through
`parseRunSessionKm`. **Eighth instance of this file's oldest class, in the
function immediately next to the one v1.27 fixed.**

**Measured on wk 9, driving the real functions.** The same
`rewriteQualityReps(..., +2 reps)` edit in the two slots that both hold hard
sessions:

| | Wednesday (`quality`), tempo | Friday (`easy`), intervals |
|---|---|---|
| volume model reads it | 6.0 → 7.0 km | 6.0 → 7.0 km |
| `projectWeeklyVolume` | `{diffKm: 2.3, total: 36.9, deltaPct: 13.9, exceedsCeiling: true}` | **`null`** |
| `volumeConsequenceLine` | `⚠ Wk 9 total 34.6 → 36.9 km (+2.3 km), +13.9%…` | **`''`** |

**Why it was ranked above B32 rather than beside it.** The Friday slot earned no
suggestions at all, so the null projection was *masked*. The moment B32's coach
fix landed it would have started offering rep bumps with no consequence line —
precisely the failure B12 shipped at v1.18 to prevent, with a bigger number.

### B32 · Every interval session in the plan was logged as if it were an easy run — `CLOSED-v1.28`

**Shipped 19 Oct.** All nine call sites route through `classifyRunSession`.
**Re-verified 10 Nov: the prescribed grep finds one behavioural slot branch in
the whole file, the legitimate `dayKey === 'longRun'` inside the classifier.**
**Seventh instance of this file's oldest class, created by v1.27 itself.**

| slot | weeks carrying an `[INTERVALS]` session |
|---|---|
| `quality` (Wed) | 1, 2 — both already run |
| `easy` (Fri) | **7, 8, 9, 10, 11, 13, 14, 15, 17, 18, 19** |

The grep found **nine** call sites where the item named three.

**The label half of this item was NOT fixed and is B42. The logging half has a
sibling that was never found: the TEMPO sessions, which this item's fix did not
reach because they were never slot-keyed — see B45.**

### B33 · The Tuesday easy run was invisible to the coach — `CLOSED-v1.28`

**Shipped 19 Oct with B32**, same one-line change. The Tuesday run now gets its
live compliance verdict and can earn a suggestion. Before the fix the
`recovery2` slot produced **0 suggestions out of 12** unblocked weeks and its
compliance widget rendered empty — so the Tuesday run, **the day he benches**,
had never once been checked against the 130 bpm cap he set on 15 Sep.

### B38 · The bench-attempt weeks had lost their running step-back — `PARTLY SHIPPED-v1.28` · the rest was B38b, closed

**wk 19 and wk 20 shipped 19 Oct on his instruction** — long runs 16 → 14.5 km
and 14.5 → 13.5 km, so the 120 kg attempt week is no longer the block peak and
wk 20 is a real deload again. `TRAINING-CONTEXT.md` had stated week 11's
step-back was deliberate; measured, it was gone — the v1.26 easy-run ramp walked
straight over it.

### B19 · The long run prescribes the fast end of his easy range — `CLOSED-v1.27`

Every long run stated `(5:50–6:10/km)` against an easy band of 5:45–6:37/km.
Closed at v1.27: every long run from wk 7 reads `❤️ Zone 1–2: ≤130 bpm — run it
easy (5:45–6:40/km)`. A gate check asserts the long run's ceiling never exceeds
the easy run's and its pace band is never narrower. Re-verified 10 Nov.

### B27 · The coach could not suggest anything on a hard session — `CLOSED-v1.26`

**Mardy, 30 Sep: "b27: dont worry about the strictness on climbing the quality
ramp."** `parseQualityRepScheme()` reads the rep count, rep distance and work
volume from the session's own tagged first line and **refuses a session whose
stated `≈ N km of quality` disagrees with its own rep scheme**.
`rewriteQualityReps()` adds reps **and moves the stated quality volume with
them**. **Re-verified 10 Nov: it parses all 26 tagged sessions, tempo and
interval alike — which is what makes B45 cheap.**

### B17 · The suggestion builder is still unreachable from the gate — `CLOSED-v1.25`

`buildCoachSuggestions` was declared **inside** `renderSessionLogger`, so it was
not on `window`. Lifted to top level at v1.25; it closed over nothing. It paid
for itself in the same build twice, and it is what made the per-slot suggestion
counts in B33 measurable at all.

### A2 · 5K time-trial results have nowhere to live — `CLOSED-v1.22`

`parseTrialTime` / `formatTrialTime`, `getPlannedTrialKm()` reading the distance
from the session's own text, a `trialResults` array deduped on (week, distance)
and epoch-filtered, `getTrialTrend()` comparing each result against the previous
trial **at the same distance**, and a card on the week view on trial weeks only.
`getLatestTrial()` prefers a recorded clock time. **Driven end to end again on
10 Nov, the day before he needs it — save, reload, trend, delta, anchor and goal
line all correct.** The Home trend is separately logged as **A2b**.

### A7 · The attempt week and the deload week were back to back — `CLOSED-v1.23`

Resolved at v1.23 in the direction this item itself recommended. The gate
enforces a three-attempt ceiling. *The ladder was re-based again at v1.26 and is
112.5 (wk 7) · 115 (wk 11) · 120 (wk 19) — still three attempts, each on a 92%
trained rung, verified again 10 Nov.*

**Do not touch the deload weeks themselves.** They carry the time trials, which
are the entire measurement system for the running goal.

### B10 / B14 · Hardcoded deload and attempt week lists — `CLOSED-v1.18`

The deload list `[4,8,12,16,20]` agreed with the plan. The attempt list
`[3,7,11,15,19]` did not — it was the pre-v1.11 ladder — so an ordinary build
week was silently blocked from ever receiving a suggestion, for six builds.
There were three call sites, not the one B10 named. Replaced by
`isSuggestionBlockedWeek(wk)`, covered by a plan-agreement check and a source
canary.

### B12 · A suggestion could breach the 10% ceiling without saying so — `CLOSED-v1.18`

`projectWeeklyVolume()` and `volumeConsequenceLine()`: every suggestion that
moves a run states what it does to that week's total and flags a ceiling breach.
The very first suggestion the B10 fix unblocked was **+12.1%** — past the
ceiling. The two changes had to ship together.

*Reopened in effect for one slot at v1.27 — see B37, closed at v1.28.*

### B18 · The plan text and the app disagreed about the Zone 2 ceiling — `CLOSED-v1.20`

**Mardy: "easy runs should remain below 130. long run can be up to 137."** Both
numbers were already written on every session and nothing read them.
`parsePlannedHrCap()` and `assessHrAgainstPlan()` now read each session's own
band, with the zone model as the fallback for sessions that state none.

*The slot-keyed callers that tripped over the fallback were B32, closed at
v1.28. **The fallback itself is now the subject of B46**: it has one target zone
for two hard session types. And the one surface still printing the Z2 band at a
hard session is the Home card's `DOW_SUB` — B42.*

### A1 · Weekly running volume is not computed anywhere — `CLOSED-v1.15`

`parseRunDistanceKm`, `parseQualityVolumeKm`, `getWeeklyRunVolume`,
`getWeeklyVolumeSeries` and a Running volume card in the week view. Reads
through `getPlanned()`, so his overrides count; delta measured against the
previous **build** week.

### B1 · Supabase RLS — `CLOSED 30 Aug 2026`

Audited live. `anon` key (correct — public by design), `relrowsecurity = true` on
both `profiles` and `session_logs`, each with a `cmd = ALL` policy scoped by
`auth.uid()`.

**Two things look like holes and are not — do not "fix" them into real ones.**
`with_check = null` is correct: Postgres reuses the `USING` expression as the
check expression when `WITH CHECK` is omitted. `roles = {public}` is safe
because `auth.uid()` is NULL when unauthenticated.

One `SECURITY DEFINER` function, `handle_new_user` — the expected Supabase
signup trigger. Its `search_path` was unpinned; now pinned to `''`.

Optional, not a defect: narrow both policies from `{public}` to `{authenticated}`.

### B3 · Tap targets below 44px — `CLOSED-v1.11`
### B4 · Offline write queue untested — `CLOSED-v1.11`
### B5 · Program override merge untested — `CLOSED-v1.11`

`resolvePlanned` was walking array order while its own comment claimed
chronological — and since `loadProfile` merges `[...remote, ...localOnly]`, an
older unsynced change beat a newer one. Fixed and covered. *The same defect is
still live for milestones and PRs — see B35.*

### B6 / B7 · Programme direction — `CLOSED-v1.13 / v1.14`

Superseded. The 4-runs-per-week structure was already implemented; the earlier
claim that the build prescribed 3 runs came from a stale HTML comment, not the
plan data.

---

## Notes for future runs — read before touching the plan

### Added 16 Nov 2026 — from the v1.29 build

- **A plan change is the best detector this project has for the slot-name
  class.** v1.27 found it by moving a hard session into the Friday slot; v1.28
  found four more the same way; v1.29 moved the goal race into the Sunday slot
  and `getGoalAnchors` — which had read the quality slot alone since v1.25 —
  silenced Goal 2 completely. **Tenth instance. Before changing which slot
  holds something, grep every reader for that slot's literal name.**
- **The gate's own checks carry the same assumptions the app does.** Three
  checks had to be corrected with the code because they also read
  `getPlanned(week, 'quality')` and assumed one hard session a week. **When you
  fix a slot assumption in the app, grep the gate for it too.**
- **When the plan's shape changes, a check can stop PROVING something while
  still passing.** Dropping the 10K trial would have left the
  same-distance-keying check unable to exercise the bug it exists for. The
  property belonged to `getTrialTrend`, not to his training, so the fixture was
  synthesised instead. **Ask what a check proves, not whether it is green.**
- **"Nothing silently defaulted" has to learn each new shape or it quietly
  stops meaning anything.** The totals check was extended to recognise a
  duration AND to assert the conversion — minutes × the session's own stated
  pace must equal the counted km. Widening the detector without adding the
  arithmetic would have been a weakening dressed as a fix.
- **A derived number needs its source on the same line.** The duration readers
  convert at the pace written on that very session and return null when none is
  stated. A default pace held in the reader would have been the fifth copy of a
  number this file has been burned by four times.
- **Three new or corrected checks were wrong on their first run.** One asserted
  the long run is always easy and fired on race week. One built its failure
  message with `window.formatPace` **from Node**. One scanned all 21 weeks and
  fired on weeks 1–12, which are history — the v1.24 trap, again. **A check
  over "the plan" still usually means "the editable part of the plan".**
- **Scope a structural guard by the plan's own tag, and report what the scoping
  hides.** The +10% guard now excludes the Marathon-Revolutie week. That is
  correct — MR is a separate programme — but the +23.9% step into it is real and
  is filed as **B48** rather than disappearing with the exclusion.
- **He read the source differently from the way it is written, and that was
  worth saying.** The page prescribes five runs a week plus an optional sixth;
  he asked for three plus an optional fourth and described it as the page's
  structure. Building what he asked for and telling him the two differ is the
  job. **Do not silently "correct" his reduction back to the source.**

### Added 10 Nov 2026 — from the scheduled review

- **Run the declared-and-never-read sweep every run; it is one command and it
  found two items this week.** Every `const` / `let` / `function` whose
  identifier occurs exactly once in the file:

  ```
  python3 -c "
  import re; s=open('app-current.html',encoding='utf-8').read()
  n={m.group(1) for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_\$][\w\$]*)\s*=',s)}
  n|={m.group(1) for m in re.finditer(r'\bfunction\s+([A-Za-z_\$][\w\$]*)\s*\(',s)}
  print([x for x in sorted(n) if len(x)>2 and len(re.findall(r'\b'+re.escape(x)+r'\b',s))==1])"
  ```

  Five hits today: `DOW_PAIRED` (known), and `isTempo`, `planSignature`,
  `sessionNotes`, `originalText` — all new. **A dead declaration is rarely just
  dead code in this file: `isTempo` was a branch that was never written (B45),
  `planSignature` is a comment claiming a behaviour that does not exist (B47),
  and `sessionNotes` is the `runPace` defect in a new place.**
- **A fix scoped to one symptom does not reach the class.** v1.28 fixed nine
  slot-keyed readers so an interval session is recognised in any slot. It did
  not ask the adjacent question — *which hard sessions can be logged at all* —
  and twelve tempo sessions have no rep table to this day. **After fixing a
  class in the readers, enumerate the data the readers serve and check each
  kind end to end.**
- **Two verdicts on one screen that disagree is a finding, and the gate cannot
  see it** because each is asserted alone. B46 was found by logging a session at
  exactly its prescribed values and reading the whole output as prose, rather
  than checking one line. **Do that once per run on a hard session: log it
  correctly and read every line the coach emits.**
- **Close an item when the calendar has answered it, and carry its gate check
  forward explicitly.** B40 is closed because wk 11 is history, but the check it
  asked for is still the only thing that would catch B43 — so the check moved to
  B43 rather than closing with the item. **A closed item must not take a live
  check down with it.**
- **The chromium path moved again, and the one in the last notes was wrong
  too.** It is `/opt/pw-browsers/chromium-1243/chrome-linux**64**/chrome` — note
  `chrome-linux64`, not `chrome-linux`. `regression.mjs` hardcodes
  `chromium-1194/chrome-linux/chrome` and falls back to a bare
  `chromium.launch()`, which works. **Check `ls /opt/pw-browsers/<ver>/` before
  writing a `CHROME_BIN`; a wrong path fails silently into the fallback.**
- **`document.querySelector('[data-week="N"]')` does not find the week button.**
  The Home "today" card also carries `data-week`, is emitted earlier in the DOM,
  and is a `DIV`. Use `button[data-week="N"]`, and navigate by clicking the
  **PROGRAM** nav item rather than calling `renderProgram()` — calling it
  directly leaves the Home content on screen and the next click lands somewhere
  unexpected. This cost a probe run.
- **Symlink `playwright-core` as well as `playwright`**, and `npm root -g` is
  not under the shell's `~`. The shell runs as root, so `~/gym` is `/root/gym`;
  use absolute paths throughout.

### Added 3 Nov 2026 — from the scheduled review

- **The prose-drift class has a second instance, and a sweep finds it in one
  command.** Grep every session in the plan for a reference to another week —
  `\bwk\s*\d+|\bweek\s*\d+` across all 21 weeks × 7 slots. The whole block
  contains **eight** such lines. **Do this sweep every run: it is cheap, it is
  complete, and the gate cannot see any of it.**
- **A hardcoded list is worse when the app already has the function.** The Home
  card's `DOW_SESSION` is not just a duplicate of a constant — it is a duplicate
  of `getWeeklySchedule(wk)`, which four other readers call. **Before filing a
  duplicated list, ask whether something already derives it; that turns a patch
  into a deletion.** See B44.
- **A declared-and-never-read constant is the tell.** *(10 Nov: made into a
  standing sweep — see above. It found four more.)*
- **Reproduce a day-dependent defect on the real date when the real date is the
  one that matters.** B41 was filed on 27 Oct with the weekday stubbed. Running
  it unstubbed on 3 Nov — a Tuesday, and attempt day — turned a mechanism into a
  screenshot of what he was looking at that morning. Wait for the day if the day
  is close.
- **Close an item when the calendar has answered it, and say that is why.**
- **The reconstructed gate CAN be validated, and this is the recipe.** Fetch
  `regression.mjs` into a local file through a delegated read so the
  transcription never passes through the reviewing context twice; then check
  three things before trusting a green: `node --check` is clean, the count of
  check registrations equals the `GATE:` line, and the run is green on a build
  that has not changed since it was last gated. *(10 Nov: all three held again,
  and it is now cheap. The delegated read is what makes it cheap.)*

### Added 27 Oct 2026 — from the scheduled review

- **The gate asserts the prescription; nothing asserts the prose around it.**
  **When a plan week is *edited* rather than rewritten, read the whole session
  text back and diff it against the week it refers to.** See B40, B43.
- **The display drift is now a third copy, and one of them is navigation.**
  **Two parallel arrays describing the same seven sessions is the defect;
  `phaseLabel()` is the shape of the fix.** See B41, B42.
- **De-rank an item whose measurement does not survive re-measurement, and say
  so.** **A finding from last week is a claim too. Print both.**
- **`phaseLabel(block, i)` takes a block object, not a week number.** Calling it
  with a week returns `''`, which looks exactly like a regression and is not.
  Check a function's signature before filing its empty output as a finding.

### Added 19 Oct 2026 — from the v1.28 build

- **A fix in one slot-keyed reader is not a fix in its neighbours, and the item
  that reports one will under-count them.** B32 was filed naming three call
  sites; the grep found **nine**. Count the sites before costing the fix.
- **A masked defect is still a defect, and fixing its mask releases it.**
  **Before shipping a fix, ask what the broken thing was protecting you from.**
- **Validate a reconstructed gate against the UNCHANGED build first.**
- **Two of the seven new checks were wrong on their first run.** One looked for
  `#addInterval`; the control is `#addIntervalBtn`. The other tried to leave the
  session logger through `#backToWeeks`, which only exists in the week view —
  getting out needs `#backToWeek` first. **Read what a red result is telling you
  before assuming the code moved.**
- **A plan trim can be boxed in by the gate's own guards, and the box is worth
  reporting rather than guessing around.**
- **The shell can drop `node_modules` and staged files between calls.**

### Earlier

- **The slot-name class has now been found EIGHT times.** *(27 Oct: closed in
  the logic at v1.28; still live in the display — B42. **10 Nov: a ninth
  instance, in a different shape — the data is read and the logger never asks
  for it. B45.**)*
- **A gate that asserts the model does not assert the route to it.** Every
  v1.19 interval check hands `analyseRunSession` a fixture array of splits. Not
  one of them asks whether the logger ever renders a field he could type a
  split into — so eleven interval sessions became unloggable and 131 checks
  stayed green. **10 Nov: twelve tempo sessions still are, and 138 checks are
  green. The lesson was written down and the sweep it implies was never run.
  When a check feeds a fixture, ask what produces that fixture in real life and
  whether anything covers it — for every session kind, not the one you found.**
- **A check that is documented is not a check that exists.** The project
  instructions describe `regression.mjs --state` and a gate self-count as
  shipped on 6 Oct. Neither is in the canonical file, and the command crashes.
  See B34.
- **"Ask the data, not the container" is not fixed until EVERY reader does it.**
- **A plan change can need a code change to be safe, and the order matters.**
- **Hardcoded display strings drift exactly like hardcoded logic, and nobody
  checks them.** `PHASE_INFO` carried the pre-v1.11 ladder through six builds.
  If a constant names one of his numbers, it is a copy, and it will be wrong.
  *(27 Oct: and if a constant names one of his exercises or sessions, the same
  holds — B42. **10 Nov: and if a sentence names a session kind, the same holds
  — see B46's second half.**)*
- **Scope a structural check to the plan's own exceptions by their tag.** Week
  21's `[MR · INTENSIVE]` session reads as hard; exclude it by the MR tag, never
  by the number 21.
- **When a replacement spans a block boundary, count the braces on both sides of
  the splice.** The v1.26 B27 edit left one `}` too many and **112 of 128 checks
  went red at once**. A mass failure across unrelated suites is almost always a
  parse error.
- **`new Function(scriptText)` over each inline `<script>` finds a parse error in
  a second.** The file has five inline blocks, the largest ~421,000 characters.
- **Ask before rewriting his training, then build exactly what he answered.**
  Three of the four answers on 30 Sep were not the option that looked most
  sensible from the outside.
- **A max attempt can hide inside the plan as a rung.** wk 6 once prescribed a
  `Top Single @110` — exactly his 1RM, five days before an attempt week.
- **A branch you cannot reach is a branch you cannot trust.** If a builder is
  not on `window`, that is the finding.
- **Run every detector against the data before trusting it.** Printing the
  plan's own strings beside the regex took one command and found a branch that
  had never fired. Do that first, not after.
- **Making a dead branch live is not automatically an improvement.** Fixing the
  mechanism and shipping the judgement are two different decisions.
- **A check over "the plan" usually means "the editable part of the plan".**
  Derive that boundary from the plan, never from a week number.
- **Seeding localStorage is not enough to seed state.** A first boot runs
  `purgeTrainingData()` and re-seeds `VERIFIED_EXERCISE_PRS`, and
  `migrateProgramEpoch2()` does the same for `programEpoch`. Seed the flags too.
- **A new check can be the wrong one.** Read what a red result is actually
  telling you before assuming the plan moved.
- **A banned literal is usually a proxy for a rule — write the rule.**
- **`state` is `let`-scoped, and so is `state.programView`.** A gate check that
  navigates between two weeks cannot call `renderProgram()` twice. Go back
  through the real `#backToWeeks` button.
- **Quoting a watched literal in a comment is the default mistake, not a slip.**
  Describe the shape in words; never paste the string.
- **Weeks 1–8 are not editable.** The logger reconciles saved exercises **by
  name**, so renaming an accessory there reports his own work as removed.
  *(10 Nov: weeks 1–11 now, in practice — wk 11's attempt is run.)*
- **This codebase's failure mode is unread data, not missing data.** The bench
  ladder was in the plan text (v1.17), `runPace` was in the logger and storage
  (v1.19), the per-session heart-rate bands were on all sixty-odd sessions
  (v1.20), and the trial distance was written on every trial session (v1.22).
  **10 Nov: the tempo rep scheme is parsed by `parseQualityRepScheme` on every
  one of the twelve sessions and the logger never asks for it (B45), and the
  session's own tag distinguishes threshold from VO2max and the HR model throws
  it away (B46).** Before adding a field, a constant or a list, search for the
  one that is already there.
- **v1.22 adds a fifth variant: *underived* data.** When a number is being
  derived rather than recorded, ask whether the recording is simply missing.
- **A field that is collected and stored is not necessarily read.** `runPace`
  survived nine builds as a dead read. *(10 Nov: `sessionNotes` is doing the
  same thing right now — B47.)*
- **The plan states a pace in TWO shapes and both must be read.** Quality
  sessions use `@ 4:55/km`. Long and easy runs state a band as a parenthetical
  beside the heart-rate range, with no `@` anywhere.
- **Heart-rate numbers come from `getHRZones()`, never from literals.**
- **A bare number is never a time or a pace.** `parsePaceSec`,
  `parseIntervalLog` and `parseTrialTime` all refuse one. Keep the refusal.
- **"Currently agrees with the plan" is a claim, not a fact — measure it.**
- **An item with a decision still live does not belong under Closed.**
- `getHRZones()` returns an array of five zone objects, not a flat map.
- `WEEKS`, `RUN_SESSION_KEYS` and the other top-level `const`s are **not** on
  `window`. To enumerate the plan go through `getWeeklyVolumeSeries()`, and
  `getWeekDates(wk)` for a week's own date label.
- **Functions declared inside `renderSessionLogger` are not on `window`.** To
  reach them the gate drives the UI: PROGRAM nav → `button[data-week="N"]` →
  the `.session-btn` whose text names the session → fill `#runKm` / `#rpe` →
  click `#askCoach` → read `window._pendingSuggestions`.
- **To get past the login screen in a probe, call `window.initApp()`.** Auth
  itself is unreachable with network blocked, by design.
- Plan weeks match `\n      (\d+): \{\n`. The file also contains `upperB` inside
  `SESSION_KEY_LABEL` maps and `Incline DB Press` inside the exercise picker —
  **neither is plan data.** Scope every plan edit to week-block offsets and
  assert the picker survived.
- The trial weeks are **4, 12, 16 and 20**; wk 8's trial was dropped at v1.27.
  Weeks 16 and 20 have no `≈ N km of quality` line.
- Week 21 is a Marathon Revolutie preview with its own rules in the text; its
  `longRun` starts `[MR · MARATHON HR] 14 km`. Never rescale it mechanically.
- Weekly volume: the `notes` prose counts quality **work only** and drops the
  warm-up and cool-down, so it understates every week by ~3.5 km.
  `getWeeklyVolume()` is the answer; do not sum the prose.
- Bench-lift classification lives in `BENCH_MAX_PATTERNS` /
  `BENCH_SKILL_PATTERNS`. `Paused Bench`, `CGBP`, incline and DB work are
  excluded from the max estimate **on purpose**. Do not "fix" them in.
- The coach's e1RM folds in reps-in-reserve from the logged RPE. Any change here
  moves every number the coach reports, so change the gate first.
- **Best-effort cloud columns go through `syncExtrasSilent()`.** Anything read
  back from one of those columns must **merge** with the local copy rather than
  replace it. Still live for `milestones` and `exercise_prs`. See B35.
- **Nexus blocks `playwright`.** `npm i playwright@1` fails 403 against
  `nexus-sonatype.intelic.ai`. Playwright is already installed globally —
  symlink it: `ln -sfn "$(npm root -g)/playwright" node_modules/playwright` and
  the same for `playwright-core`. Verify with
  `node -e "import('playwright').then(m=>console.log(typeof m.chromium))"`
  **from inside that directory**. Never run `npx playwright install`.
