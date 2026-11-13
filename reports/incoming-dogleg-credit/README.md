# Incoming dogleg access audit — 13 November 2026

Live implementation: **`band-free-harmonic-v8-incoming-dogleg`**, implemented in `static/incoming-dogleg-credit.mjs`. The correction below applies **only when the dogleg arrival takes two or more first-leg strokes**. One-shot arrivals, including PIPE in the original audit table, retain their existing scores. Gameplay and player storage identities are unchanged.

The initial broad audit below is retained to explain the finding. After excluding one-shot arrivals, 28 original routes have eligible incoming access; 8 also allow the recorded suffix from the named dogleg, and 6 of those gain displayed points. The implemented correction changes 18 of the 75 original displayed scores. All 17 one-shot arrivals and all 32 insertion controls in the frozen 107-route sample retain their exact unrounded scores.

Current reports carry route/landing-position-bound access evidence. Old v7 reports retain v7 when re-evaluated without sufficient evidence; retained route states are reanalysed through the existing worker and best-route refresh. Full and compact current reports reapply idempotently. Report/cache versions are updated throughout the browser and worker graph. Text exports include the incoming correction and bonus overlap. The original outgoing bonus budget is preserved.

Validation: `node tests/test_incoming_dogleg_credit.mjs` checks all 107 frozen routes, exact after-setup examples, one-shot exemptions, graded gains, unchanged I/E/opportunity/legs, bonus overlap, ceilings, literal neutrality, route-mismatched/missing evidence, compact/full idempotence and v7 fallback. The existing simulation sample was rescored without resampling: 33 of 586 unique routes changed displayed scores; strokes, outcomes, seeds and sampling frequencies are unchanged. Reproduce using `node scripts/rescore_simulation_pilot.mjs reports/incoming-dogleg-credit/simulation-rescore.json`.

Isolated desktop (1280×900) and mobile (390×844) Chrome checks passed through the actual browser worker: MARKET 85, PEN 83, one-shot PIPE unchanged at 79. Saved compact reports reproduce the same scores, text exports include the correction, and neither surface reported an uncaught page error. See [browser checks](browser-checks.json).

## Finding

The player's concern is supported by the live calculation. An alternative landing can be reachable from the preceding lie while the named dogleg is not, even when the named dogleg would support the recorded second leg. Similarity between the landing and named dogleg does not remove this demonstrated incoming advantage.

The scorer already checks this substitution with `Game` in `static/dogleg-strategy-bonus.mjs`. The incoming gain is the failed named-word shot's contact/backward shortfall divided by 0.05, clipped to [0,1]. It is independent of outgoing advantage. Removable landings are excluded. Thus there is no missing incoming-access test and no requirement to show a better second leg before earning its bonus.

However, `static/vector-cleverness/cleverness-v6.6.mjs` sets landing effectiveness to **half landing relevance plus half corner utility**. Corner utility evaluates improved onward geometry and the observed suffix from a stipulated named-dogleg lie. It does not incorporate the named dogleg's incoming reachability. If the named dogleg offers the same or better onward position, corner utility can be zero, leaving an effective and necessary turn with only half its relevance in this stage. The stage has weight 0.4 in overall strategic effectiveness. A bonus of at most `3QL` raw points partly compensates, but need not restore this reduction.

This is an under-credit within strategic effectiveness, rather than a direct penalty for similarity to the named word. In the audited eligible incoming-access cases, **none had an elegance redundancy charge on the landing**. The semantic ingenuity calculation should continue to assess the actual associations; mechanical access alone does not establish originality. V7 continuation treatment addresses other omission/finishing distinctions and does not repair these already recognised objective switches.

## Candidate correction

Use the existing validated incoming evidence, existing relevance scale and stage weight. Let `a` be the current incoming gain, `R` landing relevance, and `H` landing effectiveness **after** any V7 continuation adjustment. For an eligible landing not marked removable, reached after at least two first-leg strokes:

```
H_new = H + a * max(0, R - H)
S_new = clip(S + 0.4 * (H_new - H), 0, 1)
```

A strongly demonstrated incoming advantage restores relevance-level strategic credit. A marginal failed substitution produces only a marginal restoration. Existing larger effectiveness is retained. No originality, elegance or new stroke credit is added.

Avoid double counting: compute the base raw-score increase from this S adjustment and subtract it from the existing incoming bonus, retaining only a positive balance. Preserve the original, already weighted outgoing bonus amount. Equivalently, use the larger of the incoming component increase and old incoming bonus, plus the original outgoing amount. Keep the established leg ceiling and final cubic display transform. This audit holds the old bonus budget fixed rather than recalculating it from the increased quality.

This is preferable to increasing the global bonus: it repairs the component causing the under-credit and automatically gives no further increase where the old bonus already covers it. The candidate is a design recommendation, not a fitted estimate of human ratings.

## Initial broad audit results (before excluding one-shot arrivals)

The current browser vector scorer was rerun on 75 frozen completed calibration/user routes and the 32 existing strict insertion controls in `reports/dogleg-continuation/comparison.json`. Historical engine settings were preserved; these are not 107 freshly played routes under today's rules. No new route search was performed.

- 40 of the 75 original routes had eligible incoming-access gains.
- 16 of those also completed the recorded suffix from a stipulated named-dogleg lie: the closest mechanical match to the user's concern.
- In that 16-route subset, 14 displayed scores increased, with an average **2.78 unrounded display points** across all 16 and a largest rounded increase of **6**.
- Across the 75 originals, 29 displayed scores increased, averaging **1.04 unrounded display points** across all 75; the largest rounded increase was **7**.
- No score decreased. All 32 padding-control scores were unchanged; none gained an unearned advantage over its original.

Examples below all allow the recorded suffix from the named dogleg, while the named dogleg fails from the actual preceding lie. Bold marks the played dogleg landing.

| Named dogleg | Recorded route | Live | Candidate |
| --- | --- | ---: | ---: |
| CURRENCY | PENGUIN → FISH → **MARKET** → VOLATILE → VOLCANO | 83 | 85 |
| JUSTICE | TRIM → CUT → **LAW** → IDEA → SPARK | 85 | 88 |
| PLUMBING | FLUTE → **PIPE** → WATER → PLANT → BOTANY | 79 | 85 |
| WRITING | FEATHER → QUILL → **PEN** → INK → SQUID → OCEAN | 81 | 83 |

For PIPE, landing relevance is about 0.997 but corner utility is zero, giving landing effectiveness about 0.498. The current incoming bonus adds about 2.85 unrounded display points. The candidate restores the missing strategic component without adding that bonus again, yielding 85 instead of 79.

## Scope and verification

A failed direct named-dogleg shot proves that this particular substitution cannot preserve the approach stroke count. It does **not** prove the observed route is globally optimal, that no other same-length approach exists, or that reaching the named dogleg is impossible by every route. No extra claims or awards should depend on those untested alternatives.

The frozen sample and insertion controls support the direction of correction, not a guarantee covering all future routes. No exact route supplied in this chat was available. The check remains route-local and uses existing vectors; the live implementation includes scorer-version, retained-best reanalysis, compact-report/idempotence and cache updates described above.

Reproduce with `node scripts/investigate_incoming_dogleg_credit.mjs`. The script asserts unchanged input states, I/E and no-access scores, nondecreasing candidate scores, preserved ceilings, unchanged padding scores and no unearned insertion advantage. Full per-route evidence and values are in [comparison.json](comparison.json).

Existing regressions also passed:

- `node tests/test_dogleg_strategy_bonus.mjs`
- `node tests/test_dogleg_continuation.mjs` (including its 32 insertion controls)
