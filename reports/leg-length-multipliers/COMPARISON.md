# Targeted live leg-factor update

The scorer remains band-free-harmonic-v2-one-stroke. Only legFactor changes: 1=1, 2=1, 3=0.88, 4=0.66, 5=0.45. For n>=6 the original 0.5 × 0.65^(n−4) remains unchanged (6=0.21125, 7=0.1373125). The schedule is nonincreasing.

L remains the product of actual leg factors. I/S/E, harmonic quality, mapping power, bonus rule and min(score,100×L) ceiling are unchanged. Cache/report revision is advanced so stale saved analyses are recomputed when opened; the scorer name is unchanged. No gameplay or presentation changes.

The usual 2+2 birdies are unchanged. A 1+3 or 3+1 birdie increases because its three-stroke leg receives the requested increase; preserving those scores would contradict the new universal schedule.

| Calibration | Legs | Previous v2 | Updated v2 |
|---|---|---:|---:|
| P-A | 2+2 | 74 | 74 |
| P-B | 2+2 | 79 | 79 |
| P-C | 2+3 | 67 | 70 |
| V-A | 2+2 | 78 | 78 |
| V-B | 2+3 | 64 | 67 |
| V-C | 4+3 | 27 | 38 |
| A | 1+2 | 84 | 84 |
| B | 2+2 | 67 | 67 |
| C | 2+3 | 60 | 63 |
| D | 2+1 | 95 | 95 |
| E | 1+3 | 65 | 69 |
| F | 2+2 | 60 | 60 |
| G | 3+3 | 34 | 38 |
| H | 5+4 | 10 | 18 |
| I | 2+3 | 69 | 73 |
| J | 2+2 | 81 | 81 |
| K | 1+3 | 64 | 67 |
| L | 1+2 | 89 | 89 |
| M | 2+2 | 74 | 74 |
| AN-A | 2+2 | 70 | 70 |
| AN-B | 2+2 | 71 | 71 |
| AN-C | 2+3 | 62 | 65 |
| AN-D | 2+3 | 62 | 65 |
| FEATHER-A | 2+2 | 78 | 78 |
| FEATHER-B | 2+3 | 65 | 69 |

Historical calibration inputs and upstream component fixtures are preserved. Tests verify those components, exact factor scaling, unchanged short legs and 6+ legs, monotonicity through 20 strokes, product aggregation, final-only rounding, bonus and ceiling.
