# Live cubic Cleverness scale

Live identity: `band-free-harmonic-v5-cubic70-slope2`.

The underlying `band-free-harmonic-v4-relaxed-legs` operator is retained exactly: semantic ingenuity, strategy, elegance, opportunity correction (0.08), quality-scaled one-stroke bonus (2), leg factors and raw ceiling are unchanged.

Apply this strictly increasing function to the final **unrounded** v4 score, after its bonus and raw ceiling. Round once for display:

- For `s ≤ 70`, let `t = s / 70`: `T(s) = 70 × (t + t³ − t²)`.
- For `s > 70`, let `t = (s − 70) / 30`: `T(s) = 70 + 30 × (2t − 2t² + t³)`.

The displayed ceiling is `T(100 × L)`. Reapplying the old numerical ceiling after stretching would flatten scores and change rankings, so it is not applied again. Raw scores and raw ceilings remain in diagnostics.

| Raw | Display (rounded) |
|---:|---:|
| 40 | 30 |
| 50 | 40 |
| 60 | 53 |
| 70 | 70 |
| 80 | 84 |
| 90 | 92 |
| 95 | 96 |

Stored v4 reports are recalculated from their original upstream evidence. Best-score summaries whose export history has been cleared are transformed from their retained unrounded values once, with a new version marker. This preserves route rankings; rounding can create displayed ties.

Best-route engine states are retained with player stats, independently of export batches. Returning to a completed hole reviews the lowest-stroke best (highest Cleverness breaks ties), plus any separate higher-Cleverness longer route. A fresh finish briefly identifies the just-played strokes/Cleverness above these bests. Clearing export history does not reinsert old journeys into subsequent exports.

Tests: `test_cubic_stretch.mjs`, `test_durable_results.mjs`, existing raw formula and live route regression checks. The two new tests cover monotonicity, endpoint/pivot behavior, the central slope, transformed ceiling, preservation of the raw operator, idempotent migration, clear/reload persistence and recovery of legacy compact route records.
