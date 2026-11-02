# Dogleg strategic access bonus — 3 November 2026

Current live identity: **band-free-harmonic-v6-dogleg-access**. This extends the previous cubic-stretched scorer; I/S/E, opportunity correction, skippability diagnostics, harmonic mapping, leg factors, one-stroke bonus and ceilings are unchanged.

## Evidence

Use the authoritative engine on the completed route only. From its original preceding lie, substitute the literal dogleg for the actual landing. Independently stipulate a literal-dogleg second-leg lie with its own baseline and test the player's actual next word. If the original route automatically finished on entry, test the equivalent single finishing stroke at the flag. A literal dogleg that already finishes, or already is the next word, has no outgoing deficit. Illegal repeat-word errors and missing evidence are neutral, not a creativity award.

For a failed substitution, let `d` be the larger of its contact shortfall (`required − launch`) and its backward-boundary shortfall. Each gain is `clip(d / 0.05, 0, 1)`. The .05 span is an explicit design scale, not a learned human percentile. A tiny failed margin earns a tiny gain. Literal landings earn no new bonus. One additional exact replay skips the landing: if that completes with fewer strokes, no bonus is awarded. No alternative-route search, lexical dataset or word-specific rule is used.

## Formula and double-counting protection

Let `R` be the existing unrounded raw band-free score, `Q` its pre-map harmonic quality, `L` its leg multiplier, and `a, b` the incoming/outgoing gains. Set:

```
D = 3 × Q × L
C = R − oldRawScore(I, max(0, S − 0.02), E, same legs)
incoming = D × a
outgoing = max(0, D × b − C)
bonus = incoming + (1 − a) × outgoing
newRaw = min(R + bonus, 100 × L)
newDisplayed = round(existingCubicStretch(newRaw))
```

The old outgoing-access term can contribute at most `.4 × .5 × .10 = .02` to S. `C` deliberately deducts the **maximum possible** existing raw-score effect, rather than guessing that it was absent and awarding outgoing access twice. This can under-credit an outgoing choice when the old term was gated off; that is a conservative design trade-off. Existing geometry credit is not added again or removed. Incoming credit supplies part of the same single-route budget; both failures cannot earn two full bonuses. The new bonus is non-negative and at most `3QL` before the original display stretch. There are no new golf-result bands or word-type penalties.

## Checks and observed changes

Across 68 calibration/recent-play rows, mean displayed increase is **1.53**, maximum **4**, and **17** retain their displayed score. Those include repeated calibration routes; this is a diagnostic sample, not a population distribution. No score decreases. Close rankings can change: KANGAROO–FUR–SEAL–COURT rises from 93 to 95, overtaking the unchanged 94 for the POUCH–PANTS–SUIT route. This is a consequence of rewarding demonstrated landing access, not a semantic-quality judgement that SEAL is inherently more original. The bonus should remain modest and be judged through playtesting. The full unrounded comparison is in [comparison.json](comparison.json).

| Route / choice | Previous | New |
| --- | ---: | ---: |
| FEATHER → QUILL → PEN → FOUNTAIN → OCEAN | 85 | 87 |
| FEATHER → QUILL → PEN → INK → SQUID → OCEAN | 78 | 81 |
| KANGAROO → POUCH → PANTS → SUIT → COURT | 94 | 94 |
| KANGAROO → FUR → SEAL → COURT | 93 | 95 |
| CIGAR → IMPORTED → SHIP → BOW → NECKLACE | 86 | 88 |
| HAMSTER → WHEEL → POWER → ELECTRICITY | 96 | 98 |
| APPLAUSE → ROUND → FUNDING → FLOW → RIVER | 85 | 87 |
| CLAIM → OPEN → WINDOW → AIR → FRESH | 77 | 77 |
| BREEZE → SAIL → FREE → SAMPLE → PAINT | 77 | 79 |

## Persistence, diagnostics and performance

The report and compact export retain the mechanical evidence, original unrounded raw score, incoming/outgoing gains, prior-credit bound, requested/applied bonus and final score. Rounding occurs only for display. Current report/scorer identities and worker/module URLs invalidate stale caches.

Old saved best routes are retained. On opening a hole their current scores are recalculated in the existing worker, including after the disposable play log was cleared. Both retained best routes are queued; a delayed result for one cannot discard the other before it has a current score. Rescoring does not add a journey, count an attempt, change recency, or put old routes back into a fresh export. Old compact reports without new mechanical evidence remain explicitly labelled v5, not silently promoted to v6. Unsupported historical evidence is not fabricated.

Work is O(route length): reuse the already validated dogleg snapshot, replay the incoming prefix, test the outgoing move, and perform one skip-landing replay. No new vectors, vocabulary scans, network API, WordNet or server scorer. Browser checks verify mobile/desktop retained-score refresh (77 → 79 on BREEZE), updated stats and no synthetic completed export history. The new module is a small cached code asset. The additional engine-based evidence measured about 0.164 ms per BREEZE route over 500 local repetitions, separate from the existing semantic analysis.

The five simulation-pilot distributions have also been regenerated with unchanged samples/seeds and the new score version, so the optional comparison uses the same scorer as the player. Gameplay outcomes and sampled stroke counts are unchanged.

Regression coverage includes graded/tied/missing access, literal neutrality, real FREE/FUNDING/WINDOW examples, a deliberately skippable landing, repeated/automatic finishing neutrality, ceilings and leg scaling, saved-report idempotence, retained-best ordering and UK/US equivalence. Existing calibration tests preserve exact pre-bonus scores and upstream components while checking the new final score separately.
