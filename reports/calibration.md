# Semantic calibration

Model: Stanford GloVe 6B 300d. Vocabulary: 19,989 normalized vectors.
Tested 128 endpoint pairs per threshold (8 thematic candidates plus 120 seeded random pairs with endpoint cosine < 0.2). Random endpoints use the 5,000 most frequent supported words. This is a model experiment, not player statistics.

| Threshold | 1 | 2 | 3 | 4 | 5+ | Unreachable | Mean degree | Isolated words |
|---|---|---|---|---|---|---|---|---|
| 0.4 | 1 | 62 | 51 | 7 | 1 | 6 | 28.2 | 1371 |
| 0.45 | 0 | 17 | 43 | 31 | 18 | 19 | 12.9 | 2994 |
| 0.5 | 0 | 0 | 13 | 19 | 47 | 49 | 6.0 | 5254 |
| 0.55 | 0 | 0 | 0 | 2 | 32 | 94 | 2.8 | 8272 |

Search respects the starting boundary and finds the fewest submitted words to any arrival-zone word. The automatic target hop is excluded. `winning_planets` counts distinct shortest-depth arrival planets. `shortest_routes` counts minimum-length submitted sequences; `first_moves` counts distinct first words across those sequences. The JSON contains optimal routes for offline analysis; the browser never receives them.

## Selected puzzles

- forest → money, threshold 0.4: minimum 2 attempts, 31 shortest-depth arrival planets, 32 shortest routes, 5 opening moves. Route: forest → area → have → money (free).
  - forest → area: launch 0.4341, destination 0.2218.
  - area → have: launch 0.4031, destination 0.4207.
- penalty → ability, threshold 0.45: minimum 2 attempts, 7 shortest-depth arrival planets, 7 shortest routes, 2 opening moves. Route: penalty → half → make → ability (free).
  - penalty → half: launch 0.4712, destination 0.2044.
  - half → make: launch 0.4690, destination 0.4754.
- senior → together, threshold 0.45: minimum 2 attempts, 8 shortest-depth arrival planets, 9 shortest routes, 2 opening moves. Route: senior → said → just → together (free).
  - senior → said: launch 0.4845, destination 0.2786.
  - said → just: launch 0.4546, destination 0.4660.
- everyday → affection, threshold 0.45: minimum 2 attempts, 2 shortest-depth arrival planets, 4 shortest routes, 2 opening moves. Route: everyday → life → love → affection (free).
  - everyday → life: launch 0.4524, destination 0.2310.
  - life → love: launch 0.5386, destination 0.5818.
- bread → democracy, threshold 0.4: minimum 3 attempts, 18 shortest-depth arrival planets, 36 shortest routes, 2 opening moves. Route: bread → fresh → come → government → democracy (free).
  - bread → fresh: launch 0.4002, destination 0.2004.
  - fresh → come: launch 0.4039, destination 0.2871.
  - come → government: launch 0.4339, destination 0.4261.
- moon → kitchen, threshold 0.4: minimum 3 attempts, 5 shortest-depth arrival planets, 5 shortest routes, 3 opening moves. Route: moon → earth → beneath → bed → kitchen (free).
  - moon → earth: launch 0.5696, destination 0.1183.
  - earth → beneath: launch 0.4001, destination 0.2283.
  - beneath → bed: launch 0.4375, destination 0.4399.
- garden → computer, threshold 0.4: minimum 3 attempts, 16 shortest-depth arrival planets, 53 shortest routes, 5 opening moves. Route: garden → beautiful → good → business → computer (free).
  - garden → beautiful: launch 0.4116, destination 0.1058.
  - beautiful → good: launch 0.4329, destination 0.2264.
  - good → business: launch 0.4730, destination 0.4322.
- creative → smooth, threshold 0.45: minimum 4 attempts, 4 shortest-depth arrival planets, 9 shortest routes, 2 opening moves. Route: creative → innovation → development → transformation → transition → smooth (free).
  - creative → innovation: launch 0.5441, destination 0.1496.
  - innovation → development: launch 0.5287, destination 0.2383.
  - development → transformation: launch 0.4724, destination 0.2671.
  - transformation → transition: launch 0.5551, destination 0.4887.

## Interpretation

For the default threshold sweep, **0.40–0.45 appear most promising**. Compare one-attempt frequency against 2–4-attempt coverage in the measured table. At 0.50 and 0.55 the graph is much sparser, and longer paths or unreachable endpoints become more common. These results are specific to the curated vocabulary and endpoint sample.

Lower thresholds connect more semantic regions but can make one-attempt bridges common. Higher thresholds fragment the graph and make distant endpoints unreachable. Use the measured table to compare this tradeoff. Selected puzzles require 2–4 attempts with at least three shortest routes and at least two distinct opening moves; this does not establish that typical human play will take 2–4 attempts. Playtesting is still required. Some representative shortest paths use broad words such as have, well, but, or one, so numerical reachability does not guarantee a satisfying semantic journey. BFS reports one representative path and tie-breaks by frequency order; its example can be less interesting than alternative shortest paths. A content-word-only vocabulary would be a useful next experiment, rather than adding target bonuses or fabricated links. Names and unsuitable vocabulary filtering are heuristic and require editorial review before public release.

## The brief’s CHEESE → LANGUAGE example

At 0.45 the minimum is 3 submissions: cheese → taste → sense → context → language (free). Minimum-length routes: 1; distinct optimal opening words: 1. This makes an interesting manual lab example, but it fails the menu selection’s requirement for several optimal approaches.

- cheese → taste: launch cosine 0.4731; destination cosine 0.2341.
- taste → sense: launch cosine 0.4530; destination cosine 0.3257.
- sense → context: launch cosine 0.4978; destination cosine 0.4604.
