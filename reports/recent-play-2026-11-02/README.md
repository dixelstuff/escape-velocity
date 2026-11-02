# Recent play review — 2 November 2026

## Scope and counting

Three supplied exports were read locally. No app code, gameplay settings, scoring, hole definitions, progress or retirement list changed. Player-stat snapshots are cumulative and are not added together.

Deduplicate journeys by ID and latest updatedAt; exclude assumed prefix entries and automatic finishing entries; deduplicate actual submissions within each word triple by timestamp, normalised word, origin and stage. Errors retained as inputs, not mechanical shots. Counts describe captured activity, not lifetime attempts. Missing completion is not proof a hole was abandoned or unsolvable. One player; no enjoyment labels inferred.

There are 1,096 unique journey records, but many contain carried-forward route prefixes or no new input. After removing assumed prefixes, automatic finishes and duplicate submissions: **1,288 actual word submissions**, including **1,258 mechanically evaluated shots** and **30 errors without a shot**, across **68 played triples**. 60 have at least one captured completion. None of these are lifetime counts or player-population estimates.

## Bottlenecks to review, not automatically retire

| Hole | Actual inputs captured | Inputs through first observed finish | First-leg misses | Second-leg misses | Best strokes |
| --- | ---: | ---: | ---: | ---: | ---: |
| FROWN → PARCEL → SINCERE | 96 | 65 | 75 | 0 | 5 |
| MEND → SHADOW → RISK | 61 | 61 | 42 | 0 | 4 |
| ROAM → JUSTICE → POCKET | 40 | No finish recorded | 33 | 1 | — |
| BUTTON → ENVY → SHIVER | 57 | 57 | 31 | 1 | 6 |
| CATCH → PEACE → HOLLOW | 26 | No finish recorded | 1 | 22 | — |
| DRAFT → JEALOUSY → CUSHION | 60 | 46 | 25 | 9 | 6 |
| HUSH → REBOUND → LOFT | 51 | 31 | 18 | 14 | 5 |
| RUMOUR → SHELF → THIRST | 19 | No finish recorded | 11 | 0 | — |
| WHIM → HANDSHAKE → STAIN | 14 | No finish recorded | 12 | 0 | — |

These are review priorities, not a judgement that every high-effort hole is unenjoyable. The previously praised DANCE and CIRCLE remain positive controls. FROWN has substantial experimentation after its first completion; using total journeys alone would overstate the effort required to finish. Repeated retries preserve the same dogleg entry as assumed history, so they must not be counted as independently reaching a new landing.

ROAM, MEND, FROWN and BUTTON show first-leg access concerns. CATCH shows a different issue: only one newly played dogleg arrival is recorded (HOPE); 22 subsequent misses occur on the second leg, including 18 from VICTORY. That is a local continuation bottleneck, not proof every landing is poor. DRAFT has both first-leg and onward difficulty, with observed landings concentrated on ENVY/JEALOUSY. Inspect whether alternative familiar senses survive the engine before publishing similar combinations.

## Boundary versus landscape

There are 645 contact failures and 122 backward-only failures across the evaluated shots. Only 5 successful first-leg shots land less than or equal to 0.02 cosine below the recorded dogleg threshold. This diagnostic window is descriptive, not a proposed threshold change. The observed frustration is not explained simply by repeated successful landings narrowly outside the dogleg; many proposed moves fail contact or fail the forward-progress restriction. Contact near misses have not been counterfactually replayed here. No assertion is made that thresholds are globally right or wrong.

## Actual play versus the simulation pilot

| Hole | Best captured strokes | Cleverness on best-stroke completion | Simulated median strokes across styles |
| --- | ---: | ---: | --- |
| PALM → SUSPENSE → SHRINK | 5 | 76 | 6–7 |
| SCOOP → LOYALTY → RAIN | 6 | 42 | 6–8 |
| RIPPLE → PRIDE → GLUE | 4 | 76 | 5 |
| DRAFT → JEALOUSY → CUSHION | 6 | 49 | 5–7 |
| PIN → RELIEF → CLOUD | 4 | 70 | 5–6 |

RIPPLE's four-stroke completion is absent from all 6,000 simulated journeys for that hole. Its Cleverness 76 also exceeds that hole's sampled maximum 72. PALM's Cleverness 76 exceeds its sampled maximum 68. This directly confirms that the limited association pool misses human paths. DRAFT's legal-route simulations do not represent the 46 captured inputs through the first observed completion. Mechanical sampling feasibility is established; predictive validity for human effort/enjoyment is not. Comparisons are descriptive: a player's honed best is not the same unit as an independently sampled journey.

## Selection changes to carry forward

- Keep independently nominated, familiar, versatile words and no intended solution. Do not force a particular length or require few tries.
- Balance the recent emphasis on a distant/challenging second leg with evidence of accessible approaches. Low dogleg/flag cosine is neither a target nor proof of strategic depth.
- Probe whether several independently plausible human starting ideas can produce successful progress, not merely whether some beam-search witness exists. Inspect their actual contact requirements and forward restrictions.
- Review how reached landing words connect onward, especially whether different words merely collapse into the same synonym pocket. Several vector-distinct landings may still offer one human concept.
- For promising landings, inspect credible outgoing moves before flag-related words are reachable. Do not rescue a sparse landing with generic or strained associations just because the engine accepts them.
- Use recorded bottlenecks to choose independent holdout words/combinations for the next batch. Do not insert these exact solutions into the simulation graph and then claim improved predictive validation on the same holes.
- Keep high-effort enjoyable controls and quick satisfying controls. Never retire further holes without the player's approval. No thresholds or scores change from this review.

Detailed per-hole counts, observed landings and completion routes are in [summary.json](summary.json). These contain spoilers.
