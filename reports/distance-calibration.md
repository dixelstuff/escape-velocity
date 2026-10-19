# Distance-based launch experiment

Rules: `distance-v1`. Normalized trip length is `min(1, abs(destination_cosine - current_target_cosine) / max(0.000001, arrival_threshold - starting_target_cosine))`. Required launch similarity is `0.25 + 0.15 * trip_length`. Forward and backward trips use the same formula. The fixed arrival threshold is 0.45. Revisited planets cost an attempt; entering the current word costs nothing.

The same 128 endpoint pairs from the original calibration were searched over all 19,989 words. Candidate edges have launch cosine ≥ 0.25; exact target-dependent requirements and the starting boundary are then applied at each BFS expansion. Revisits do not improve an optimal route because edges depend only on the current word and fixed puzzle settings. The free final hop is excluded.

| Rules | 1 | 2 | 3 | 4 | 5+ | Unreachable |
|---|---|---|---|---|---|---|
| Fixed 0.4 | 1 | 62 | 51 | 7 | 1 | 6 |
| Fixed 0.45 | 0 | 17 | 43 | 31 | 18 | 19 |
| Distance .25–.40, arrival .45 | 0 | 97 | 24 | 6 | 0 | 1 |

This compares complete rule settings, including different arrival thresholds where shown. These are model experiments, not player statistics. The new rule should make stepping-stone play more forgiving; it does not establish typical human scores. A one-attempt win still requires a launch cosine of at least 0.40 because any arrival-zone word is a full start-to-arrival jump.

## Selected puzzles (spoilers)

- coffee → science: minimum 2 attempts, 7 shortest routes, 5 optimal opening moves. Route: coffee → food → medical → science (free).
  - coffee → food: launch 0.4507, required 0.3317, destination 0.2776.
  - food → medical: launch 0.3882, required 0.3198, destination 0.4538.
- cheese → language: minimum 2 attempts, 7 shortest routes, 4 optimal opening moves. Route: cheese → taste → content → language (free).
  - cheese → taste: launch 0.4731, required 0.3224, destination 0.2341.
  - taste → content: launch 0.3317, required 0.3281, destination 0.4515.
- penalty → ability: minimum 2 attempts, 619 shortest routes, 55 optimal opening moves. Route: penalty → after → good → ability (free).
  - penalty → after: launch 0.3363, required 0.2920, destination 0.2015.
  - after → good: launch 0.4097, required 0.3596, destination 0.4537.
- everyday → affection: minimum 2 attempts, 272 shortest routes, 102 optimal opening moves. Route: everyday → all → love → affection (free).
  - everyday → all: launch 0.2989, required 0.2703, destination 0.2042.
  - all → love: launch 0.4481, required 0.4000, destination 0.5818.
- moon → kitchen: minimum 2 attempts, 4 shortest routes, 3 optimal opening moves. Route: moon → space → room → kitchen (free).
  - moon → space: launch 0.3937, required 0.3357, destination 0.2727.
  - space → room: launch 0.3916, required 0.3656, destination 0.5914.
- garden → computer: minimum 2 attempts, 21 shortest routes, 11 optimal opening moves. Route: garden → room → video → computer (free).
  - garden → room: launch 0.3728, required 0.3480, destination 0.3269.
  - room → video: launch 0.3284, required 0.3198, destination 0.4922.
- bread → democracy: minimum 2 attempts, 1 shortest routes, 1 optimal opening moves. Route: bread → whole → stability → democracy (free).
  - bread → whole: launch 0.3674, required 0.3248, destination 0.2916.
  - whole → stability: launch 0.3652, required 0.3566, destination 0.5160.
- forest → money: minimum 2 attempts, 129 shortest routes, 22 optimal opening moves. Route: forest → national → all → money (free).
  - forest → national: launch 0.3421, required 0.3273, destination 0.2700.
  - national → all: launch 0.3602, required 0.3301, destination 0.4682.

FOREST → MONEY remains available for comparison, but is no longer the opening puzzle. Flight lab can choose fixed mode and adjust the arrival threshold and short/long launch requirements. Older saved journeys retain their original rule version and are never silently rescored.
