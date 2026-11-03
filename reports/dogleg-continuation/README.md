# Dogleg continuation adjustment — 4 November 2026

Live version: `band-free-harmonic-v7-dogleg-continuation`.

## Purpose and evidence

The previous treatment could compound a removable dogleg landing's reduced relevance, low corner utility and elegance deduction. Conversely, checking only the next contact could miss a landing's usefulness for the actual finish. The new evidence replays the recorded route with its actual nonliteral dogleg landing omitted. It does not search for alternatives. It uses the unchanged authoritative Game engine, including actual target transitions and automatic finishes. If the original automatic flag stroke no longer triggers, the same word is tested explicitly.

The evidence is neutral for literal waypoint landings, missing subsequent chosen words, unavailable/restricted replays, and mixed historical finishing rules (`second_leg_finish_after > 0`). A failed next contact retains the existing supported-role treatment. A successful next contact alone does not establish redundancy.

## Exact component adjustment

Let `R` be existing landing relevance, `H` existing landing stage effectiveness, `S` existing strategic effectiveness, and `E` existing elegance. All values below reuse existing evidence and scales.

**Removable landing:** the next chosen word can itself satisfy the dogleg and the observed continuation completes in fewer strokes. If the landing is already marked removable and charged by coherence:

- `H_new = max(H, R)`; existing removable relevance remains reduced (normally capped at 0.5).
- `S_new = clip(S + 0.4 × (H_new − H))`, preserving the existing landing-stage weight.
- Remove only this landing's marginal elegance redundancy deduction, respecting saturation: `E_new = clip(sum(original_elegance_terms) + p × (clip(n/s) − clip((n−1)/s)))`, where `p=0.20`, `s=2`, and `n` is the original number of charged positions.
- Other redundant positions remain charged. No new access bonus is awarded for this removable landing.

**Finishing setup:** the later word reaches the dogleg successfully but the recorded continuation, including the explicit original automatic flag word where applicable, cannot finish. Only a nonremovable landing not already credited as `necessary_next` or `objective_switch` qualifies:

- `demonstrated_role = clip(existing_role / ordinary_role)`, with existing `ordinary_role=0.30` and its existing specificity attenuation.
- `H_new = max(H, R, demonstrated_role)`.
- `S_new = clip(S + 0.4 × (H_new − H))`; `E` unchanged.

`clip` bounds values to [0,1]. Semantic ingenuity, opportunity correction, strongest moment selection, leg factors and ceilings, 50/50 harmonic combination, cubic display mapping, and one-stroke bonus formula/eligibility are unchanged. Quality-scaled bonus amounts naturally follow the adjusted quality. The existing dogleg access bonus retains its own evidence and bounds.

## Results

| Hole and completed route | Previous | V7 | Evidence |
| --- | ---: | ---: | --- |
| BRAVE [BALANCE] → CLIMB → EDGE → CUT → PAPER | 52 | 62 | CUT could replace EDGE and finish sooner |
| DRESS [FREEDOM] → BUY → FREE → IDEAS → SPARK | 57 | 65 | IDEAS could replace FREE and finish sooner |
| BLANK [TRUST] → CHECK → MONEY → TAKE → GARDEN | 69 | 78 | TAKE could turn later, but could not preserve the finish |

The shorter BRAVE → CLIMB → CUT → PAPER and DRESS → BUY → IDEAS → SPARK controls retain 90 and 88. The redundant routes still score substantially lower. MONEY receives credit for enabling the observed finish, rather than merely being different from TRUST.

The frozen comparison covers 75 completed calibration/user routes plus 32 strict one-word insertion controls (107 total). Seven of the 75 original routes changed displayed scores; all 15 original opportunity-calibration routes were unchanged. No insertion overtook its unpadded route solely through this adjustment without improved semantic ingenuity or elegance. These are bounded controls, not proof covering every possible route. An insertion that discards later original words by finishing early is a different route, not a padding control.

All 586 unique simulation-pilot routes were rescored without changing the sample. Nine displayed scores increased. See [rescore details](simulation-rescore.json), [full comparison](comparison.json), and [frozen inputs](inputs.json).

## Reproduction and verification

- `node tests/test_dogleg_continuation.mjs`: exact screenshot scores, authoritative continuation replay, neutral cases, compact/full idempotence, saturation and 32 insertion controls.
- `node scripts/check_dogleg_continuation.mjs`: regenerate comparison from frozen completed states; no solution search.
- `node scripts/rescore_simulation_pilot.mjs`: rescore unchanged sampled routes.
- Existing scoring/gameplay regression tests remain in CI. Isolated desktop and mobile Chrome checks confirmed retained v6 bests reanalyse to v7, a newly completed route matches saved/exported scoring, and retained player stats do not reappear as old exported journeys after history clearing.

The additional continuation evidence took 84.8 ms for 1,500 local evaluations, approximately 0.057 ms each, excluding the unchanged semantic-neighbour analysis. The new browser module is approximately 8 KB before compression and uses existing loaded vectors; no vocabulary or external service is added. Compact reports retain the classification, outcome and adjustment context but omit duplicate counterfactual shot events. Reapplying a compact or full report is idempotent. Old reports without sufficient proof retain their real prior scoring version until reanalysis from retained route history.

Gameplay, stroke scores, attempts, ball movement and semantic shot thresholds are unchanged.
