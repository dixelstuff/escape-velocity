# Experimental band-free cleverness v1

This final scoring operator runs entirely in the browser. It receives the unchanged vector-only semantic ingenuity I, strategic effectiveness S, route elegance E and authoritative actual leg stroke counts. No golf result, par or band is an input.

## Exact formula

J = 2IS/(I+S), or zero when I+S = 0.

Q = clamp(0.5 + 1.3(J−0.5) + 0.4(E−0.5), 0, 1).

Before penalty = 100 × Q^(2/3).

Final score = round(Before penalty × product(f(leg strokes))).

Q is the existing V6.7 harmonic quality. The concave power is an experimental continuous scale choice: it preserves zero and 100 and gives middle-quality evidence room for live comparison. It is not a percentile or independently validated cleverness probability. No route-specific adjustments are used.

| Actual strokes on leg | Factor |
|---|---:|
| 1 or 2 | 1 |
| 3 | 5/6 |
| 4 | 0.5 |
| n > 4 | 0.5 × 0.65^(n−4) |

Dogleg routes use both actual legs, including authoritative automatic finishing strokes. Par 3 uses the complete route as one leg, without a hypothetical second leg. Each leg factor applies once. Two three-stroke legs therefore receive 25/36; four plus three receives 5/12. A four-stroke leg limits the score to 50 before any other leg factor; five strokes limits it to 32.5. These are consequences of the multiplicative schedule, not additional ceilings. The old band, leg factor and hard ceiling do not feed the new result.

## Efficiency audit

Upstream evidence is deliberately preserved. Elegance does not charge a blanket per-word or per-stroke penalty: its verified redundancy term charges mechanically proven removable steps. Existing coherence terms, safeguards and exemptions are unchanged. Opportunity correction remains a correction for the number of candidate semantic moments, as requested. It is length-sensitive, but does not introduce another explicit stroke-factor schedule. Strongest-stage ingenuity remains intact; it has not been replaced by a word average.

Strategic effectiveness still reflects useful progress and geometry. This experiment does not purport to remove every statistical correlation between route length and upstream quality. It removes the direct golf-band penalty and applies the new actual-leg schedule once, without also applying the previous final restrictions.

## Validation and concerns

[All 25 comparisons](COMPARISON.md) include the 23 existing vector calibration routes and two real FEATHER routes replayed through the game engine. Full precision, authoritative states, component terms and penalty breakdowns are in comparison.json. Existing 23 components and previous scores are unchanged.

FEATHER A (2+2) scores 78, previously 77. FEATHER B (2+3) scores 65, previously 58. Their pre-penalty scores are 77.706 and 78.075. This meets the requested approximate 77/64 sanity check without hard-coded outcomes.

A par (P-C, 67) can exceed a birdie (E, 63). Routine eagles receive no result bonus: SQUID falls 92→81 and TORTOISE 94→87. HAMSTER rises 86→93 because its existing components are strong, so any disagreement with that semantic assessment remains an upstream limitation. HONEYCOMB rises 14→34 after removing its low golf-result band; its 3+3 factor is still 0.6944. VELVET's 4+3 rises 18→27, with a maximum of 41.67. Those increases merit human playtesting; they are not evidence of newly discovered semantic value. The nine-stroke RABBIT route remains low at 10.

Tests cover component and efficiency monotonicity, identical quality under different golf labels, single-leg bounds, long-leg bounds, ordinary eagle versus strong par, deterministic exact operator results and saved/copyable report breakdowns. Holding I/S/E constant, worsening either leg can never increase the score. Inserting words can still change upstream semantic evidence; no claim of unconditional monotonicity under arbitrary rewritten routes is made.

## Reproduce

- `node scripts/compare_band_free.mjs`
- `node tests/test_band_free.mjs`
- `node tests/test_vector_cleverness.mjs`

Gameplay, attempts, stroke scoring, vectors and leaderboards are unchanged. The previous harmonic fields remain intact; primary_score and band_free are additive report fields. The report version invalidates stale cached analysis so each completed attempt can show both operators.
