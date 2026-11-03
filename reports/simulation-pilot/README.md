# Five-hole route-distribution pilot — 2 November 2026

Five newly selected Par 5 dogleg holes are appended as **#317–#321**, with stable IDs internally dated 30 September–4 October 2027. Existing 345 definitions, gameplay, unlimited exploration, saved progress and the live Cleverness scorer are preserved. The app adds a collapsed **Compare with simulations** section on these five hole results cards only. It compares the route shown on the map (the latest finish or reviewed best-stroke route), not a different highest-Cleverness route.

| Hole | Tee | Dogleg | Flag |
| --- | --- | --- | --- |
| #317 | PALM | SUSPENSE | SHRINK |
| #318 | SCOOP | LOYALTY | RAIN |
| #319 | RIPPLE | PRIDE | GLUE |
| #320 | DRAFT | JEALOUSY | CUSHION |
| #321 | PIN | RELIEF | CLOUD |

The five were chosen from 15 fixed word-only proposals to provide different concrete/abstract contexts, landing breadth and second-leg landscapes. Their words precede the simulation; no route was prescribed or added to the gameplay. Bounded natural-context checks independently verify legal completions and alternative dogleg landings. [Source proposals](proposals.json), [candidate pool](candidates.json), [validation](validation.json).

## What was simulated

**30,000 seeded computer journeys**, 2,000 per style per hole. 15,297 completed within the simulation's 12-input budget. This is a local sampling budget, not a game limit.

- **Connection-first:** weights legal candidates by `(.1 + contactSimilarity)^4 × exp(1.5 × progress + 2 × finish + .5 × doglegReached)`.
- **Exploratory:** strength exponent .6 and progress coefficient .7, with the same finish/dogleg terms.
- **One-step planning:** strength exponent 1.5, progress coefficient 2, plus `2.5 × bestNextProgress` in the exponential. A next-step finish has progress 1. Lookahead uses the same legal candidate pool and engine.

Progress is the clipped change towards the active target, normalised by that leg's original semantic span. The dogleg switches the target through the authoritative engine. The sampler uses the shared per-word everyday-association graph plus the literal active target; it does **not** examine every vocabulary word. It excludes reusing a chosen word on the same leg as a sampling policy, while allowing cross-leg reuse subject to actual game rules. Candidates are tested by the unchanged engine and selected only when the shot succeeds. These are **legal-route samplers**, not human players: they do not model missed shots, typing, learning, time, restarts from earlier lies or best-after-many-journeys behaviour. Dead ends mean no action within this sampled pool, not no legal move anywhere.

The PRNG, seeds, policy coefficients, node cache bounds, model SHA, context SHA and sampling version are recorded in [the compact app dataset](../../static/simulation-pilot.json). Cached transition tests and cosine values change runtime only. There are no additional gameplay thresholds.

## Cleverness scoring and weights

Stroke histograms use **all completed simulated journeys**. Cleverness uses an independent seeded reservoir of **120 successful journey draws per style**, 1,800 draws total. Every chosen completion has the same inclusion chance within its style. Duplicate routes retain their occurrence frequency; they are not converted into a uniform distribution over unique routes. Those 1,800 draws contained **586 unique routes**; each unique route was independently replayed and scored once with the actual browser `VectorClevernessAnalyser`, using `band-free-harmonic-v5-cubic70-slope2`. No proxy formula, dictionary service, LLM or scoring server is used.

Cleverness histograms use displayed integer scores, so ties are explicit. **Lower Cleverness** is the proportion strictly below the player's displayed score; **More strokes** is the proportion strictly above the player's stroke count. Ties receive neither credit. These are sample proportions, **not player percentiles**. Same-stroke Cleverness comparisons appear only with at least 25 scored draws at that stroke count. Sampling styles stay separate; no arbitrary equal-weight mixture is presented as an objective baseline.

All scored routes and draw references remain inspectable in [scored-routes.json](scored-routes.json) and `draws-*.json`. The app receives histograms and joint stroke/Cleverness counts only, with no solution routes or spoilers.

## Original v5 distributions (historical reference)

Ranges / medians below are empirical. No normal distribution was fitted; discrete strokes and repeated routes produce skew and multiple Cleverness peaks.

| Hole | Style | Completions | Strokes range / median | Cleverness range / median |
| --- | --- | --- | --- | --- |
| #317 PALM → SUSPENSE → SHRINK | Connection-first | 831/2000 | 5–11 / 7 | 10–63 / 30 |
| #317 PALM → SUSPENSE → SHRINK | Exploratory | 925/2000 | 5–11 / 6 | 10–68 / 39 |
| #317 PALM → SUSPENSE → SHRINK | One-step planning | 1274/2000 | 5–11 / 6 | 10–68 / 44.5 |
| #318 SCOOP → LOYALTY → RAIN | Connection-first | 815/2000 | 5–13 / 8 | 6–54 / 24 |
| #318 SCOOP → LOYALTY → RAIN | Exploratory | 718/2000 | 5–13 / 7 | 4–62 / 31 |
| #318 SCOOP → LOYALTY → RAIN | One-step planning | 1148/2000 | 5–12 / 6 | 15–62 / 42 |
| #319 RIPPLE → PRIDE → GLUE | Connection-first | 455/2000 | 5–13 / 5 | 10–72 / 56 |
| #319 RIPPLE → PRIDE → GLUE | Exploratory | 575/2000 | 5–11 / 5 | 9–72 / 52 |
| #319 RIPPLE → PRIDE → GLUE | One-step planning | 1336/2000 | 5–12 / 5 | 24–72 / 56 |
| #320 DRAFT → JEALOUSY → CUSHION | Connection-first | 455/2000 | 5–13 / 5 | 11–55 / 55 |
| #320 DRAFT → JEALOUSY → CUSHION | Exploratory | 783/2000 | 5–13 / 7 | 6–55 / 32 |
| #320 DRAFT → JEALOUSY → CUSHION | One-step planning | 1220/2000 | 5–12 / 6 | 10–55 / 50 |
| #321 PIN → RELIEF → CLOUD | Connection-first | 1513/2000 | 4–13 / 6 | 7–62 / 37 |
| #321 PIN → RELIEF → CLOUD | Exploratory | 1356/2000 | 4–13 / 6 | 2–72 / 41.5 |
| #321 PIN → RELIEF → CLOUD | One-step planning | 1893/2000 | 4–10 / 5 | 19–72 / 53 |

### Original v5 sensitivity to the sampling policy (historical reference)

Largest difference between any two styles' cumulative distributions, in percentage points:

| Hole | Strokes CDF gap | Cleverness CDF gap |
| --- | --- | --- |
| #317 | 30.7 pp | 31.7 pp |
| #318 | 50.0 pp | 52.5 pp |
| #319 | 29.5 pp | 27.5 pp |
| #320 | 18.4 pp | 30.8 pp |
| #321 | 31.0 pp | 47.5 pp |

Policy changes can shift a hole's median by two strokes and its median Cleverness substantially. A three-style display is therefore useful; a single simulated percentile would conceal a major modelling choice. The 120-draw Cleverness sample is coarse, especially in rare stroke categories. Percentages should not be interpreted as precise population estimates.

The first four holes have no under-five-stroke completion in these particular samples. That is a **sampling blind spot**, not proof that birdies or eagles are impossible. The limited context graph can miss obvious or ingenious shortcuts; a routine human birdie may exceed all sampled routes. No result is labelled brilliant or assigned a player rank. This pilot should remain optional until compared with actual human play and broader independently built candidate pools.

## App behaviour and safeguards

- The comparison is collapsed initially and appears only for these five completed-hole views.
- Three styles are shown separately, with a style selector for two empirical histograms. A gold line marks the displayed route's stroke count and Cleverness.
- Comparison data is fetched lazily only after an eligible completion's score is available. Other holes fetch no simulation dataset. No simulation runs during play.
- The JSON is **16,954 bytes** uncompressed for all five holes. The new code is read-only and adds no storage records or scoring adjustments.
- Model, scorer and gameplay-setting signatures must match. Stale rules/scores are refused, sparse same-stroke samples are withheld, and pending responses cannot populate a different hole. Try again hides the comparison until a completed result is shown again.

## Runtime / reproduce

The run took **192.2 seconds**, with **1.03 GiB RSS at the end** on this machine (not a measured peak). The offline process enlarged exact cosine-row caches; browser scoring code and cache sizes are unchanged. Memory was traded for avoiding repeated full-vocabulary vector calculations.

1. `node scripts/build_route_simulation_pilot.mjs` rebuilds draws, exact live scores, histograms and the compact asset using recorded seeds and current fixed definitions. It takes a few minutes; it does not change the schedule or player data.
2. `node tests/test_simulation_pilot.mjs` checks fresh engine replays, live scorer equality, reproducible published counts/draws, reservoir accounting, matching signatures and minimum conditional sample size.
3. Regenerate the pilot whenever gameplay rules, vectors, the scorer or the sampling pool/policy changes. Keep historical research runs versioned rather than treating previous distributions as current truth.

This establishes feasibility and an inspectable live comparison, not a validated measure of player skill or human hole difficulty.

## Current v6 Cleverness distributions — 3 November 2026

The same seeded journeys, selected route draws, model and stroke distributions have been retained; Cleverness is refreshed with `band-free-harmonic-v6-dogleg-access`. The initial v5 Cleverness values above are historical reference. Current app values and fixtures use this table. This does not improve the sampler's human-representativeness limitations.

| Hole | Style | Current Cleverness min / median / max |
| --- | --- | --- |
| PALM → SUSPENSE → SHRINK | Connection-first | 10 / 30 / 63 |
| PALM → SUSPENSE → SHRINK | Exploratory | 10 / 39 / 68 |
| PALM → SUSPENSE → SHRINK | One-step planning | 10 / 44.5 / 68 |
| SCOOP → LOYALTY → RAIN | Connection-first | 6 / 24 / 57 |
| SCOOP → LOYALTY → RAIN | Exploratory | 4 / 31 / 62 |
| SCOOP → LOYALTY → RAIN | One-step planning | 15 / 42 / 62 |
| RIPPLE → PRIDE → GLUE | Connection-first | 10 / 56 / 72 |
| RIPPLE → PRIDE → GLUE | Exploratory | 9 / 52 / 73 |
| RIPPLE → PRIDE → GLUE | One-step planning | 24 / 56 / 73 |
| DRAFT → JEALOUSY → CUSHION | Connection-first | 11 / 58 / 58 |
| DRAFT → JEALOUSY → CUSHION | Exploratory | 6 / 32 / 58 |
| DRAFT → JEALOUSY → CUSHION | One-step planning | 10 / 50 / 58 |
| PIN → RELIEF → CLOUD | Connection-first | 7 / 37 / 62 |
| PIN → RELIEF → CLOUD | Exploratory | 2 / 41.5 / 72 |
| PIN → RELIEF → CLOUD | One-step planning | 19 / 53 / 72 |

Current maximum Cleverness CDF gaps between styles: PALM / SUSPENSE / SHRINK 31.7 percentage points, SCOOP / LOYALTY / RAIN 53.3 percentage points, RIPPLE / PRIDE / GLUE 27.5 percentage points, DRAFT / JEALOUSY / CUSHION 30.8 percentage points, PIN / RELIEF / CLOUD 47.5 percentage points. The refreshed [sensitivity data](sensitivity.json) uses the current scorer; the earlier table is retained as historical v5 evidence.

## V7 continuation rescore — 4 November 2026

The same 586 sampled routes and all original draw references now use `band-free-harmonic-v7-dogleg-continuation`. Nine displayed scores increased; route histories, stroke counts, outcomes, seeds and sampling frequencies are unchanged. This was a rescore, not a new simulation. See [rescore benchmark and changed IDs](../dogleg-continuation/simulation-rescore.json). Run `node scripts/rescore_simulation_pilot.mjs` to reproduce. Earlier distribution tables remain historical snapshots.
