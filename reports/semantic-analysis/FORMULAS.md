# Semantic analysis experiment — v2

These are inspectable computational measurements, not a cleverness score, player percentiles or a change to stroke play. They run only for a completed hole. No possible routes are enumerated. The existing model/vocabulary, dogleg thresholds and shot rules are unchanged.

## Route and word roles

Build the successful played route from the fixed tee, successful manual history entries in order, and the fixed final flag. Automatic finishes append the flag. A manually typed final flag is still a fixed endpoint and is excluded from bridge scoring. An unplayed dogleg label is never inserted. A deliberately played dogleg word is evaluated normally. A repeated word at two different positions has two context-specific evaluations. Assumed prefixes retained during retry represent words the player actually chose earlier, so they remain part of the completed path.

For each internal chosen word B, use its immediate predecessor A and successor C. The final chosen bridge's successor is the flag, including automatic and curated golden finishes. Use the exact typed word B, not any plural/adjective scoring substitute credited by the engine. Gameplay allowances still govern whether the route and dogleg landing were legal.

## Common neighbourhood

Use the 100 highest cosine similarities to B over the entire supported vocabulary, excluding B itself. Include A or C if either belongs to that set. There is no frequency, part-of-speech, hubness, stop-word or extra strength filter. Ties use code-point lexical word order. For a hypothetical vocabulary smaller than 101, use every available other word and report the actual denominator.

Use the same similarities as the selected existing vector profile, including the existing topic projection for a headwind hole. Current play uses the Current model. A full model is required: never compute a seemingly final result using only the first loaded vocabulary pack. Dot products use the game's decoded float16 vectors without extra renormalisation. Similarity rows use Float64 accumulations, matching the JavaScript scoring model.

## 1. Neighbourhood distinctiveness

`Q(B) = min(sim(A,B), sim(B,C))`.

For each neighbour n, `Q(n) = min(sim(A,n), sim(n,C))`.

`D(B) = count(Q(n) < Q(B) - 1e-12) / number_of_neighbours`.

The small tolerance treats floating-point equality as a tie. Ties receive no credit; no midrank convention is used. Display `100 D(B)%`. This is a rank within B's semantic neighbourhood, not among players, routes or the whole vocabulary. The inspector shows the lower/tied counts, chosen Q and all neighbour similarities.

## 2. Neighbourhood separation

For each of those same neighbours n, define continuous positive affinities:

```
x_n = max(0, sim(A,n))
y_n = max(0, sim(C,n))
L = sum(max(x_n - y_n, 0))
R = sum(max(y_n - x_n, 0))
O = sum(min(x_n, y_n))
E = L + R
T = L + R + 2 O
balance = 4 L R / E²
nonoverlap = E / T
S(B) = balance × nonoverlap
```

When a denominator is zero (numerically ≤1e-12), its factor is zero. Clamp the final floating-point value to [0,1]. Display `100 S(B)%`.

- L captures affinity that favours A; R captures affinity that favours C.
- O captures affinity shared by both sides.
- Balance is 1 for equal A-favouring and C-favouring affinity, and 0 for a wholly one-sided neighbourhood.
- Nonoverlap falls as shared affinity grows.
- S is 1 for balanced completely separate positive affinities; identical, entirely nonpositive or one-sided profiles give 0.
- Swapping A and C leaves S unchanged.

There is no strong/weak membership cutoff or fitted temperature. Clipping negative cosine at its natural zero reference is continuous, not binary membership classification. This formula does not use Q(B), B's distinctiveness rank, strokes, attempts, hub scores or human ratings.

**Known limitation:** separation describes the shape of affinity, not its absolute strength. Balanced disjoint affinities of .01 can have the same separation as balanced disjoint affinities of 1. The inspector therefore shows L/R/O, both factors and `mean_positive_affinity = T / (2 N)`. Do not interpret a large separation value as proof of a strong or satisfying bridge. Nor does the measure establish that the embedding distinguishes human word senses correctly.

## 3. Dogleg distinctiveness — separate comparison

Find the successful history event explicitly marked `waypoint_reached`. Its player-typed word B is the dogleg landing, regardless of whether it equals the printed waypoint.

Replay only the preceding played prefix using the shipped `Game`. At that exact incoming lie, test each supported word with the existing `pluralShot` legality logic. Admit words whose shot succeeds and is inside the dogleg region; exclude the current word, the final flag (forbidden before reaching the dogleg), and B itself from the comparison denominator. Existing water/contact requirements, plural and noun/adjective allowances are respected. The chosen landing must itself be reproducible.

Compare Q for each admitted alternative against the typed landing word's Q with the same A/C context and strict-lower convention as above. Thus the reference pool is **legally reachable dogleg landings from this incoming lie**, rather than just the 100 nearest neighbours. Do not require an alternative to reproduce the entire subsequent route: that would turn the measure into another route search. No new thresholds are introduced.

Show the number of alternatives, lower/tied counts and up to 12 alternatives by Q in the inspector. The downloadable JSON includes every alternative, its similarities and any scoring-form substitution. If a historical prefix cannot be reproduced, mark only this measure unavailable and retain the general neighbourhood measurements.

## Route summary

Report the maximum D and maximum S separately, identifying their words and positions. Ties choose the first played position. Report whether the same word and the same occurrence achieved both maxima. Do not average the route or convert these measures into a stroke bonus, ranking or label of cleverness. The new supported-pivot experiment below combines local factors only; the original D/S measures remain separate and unchanged. Dogleg distinctiveness remains a third independent line.

Immediately after holing, analyse the current completed route even when an earlier route remains the stroke best. The card labels it "This completed route" and the inspector displays the exact analysed path. On a locked-hole review without a current completed state, a recorded completed best may be analysed and labelled accordingly. Whole-course result cards do not show hole-level analysis.

## Performance, cache and reproducibility

Reuse the existing assessment web worker. Cache up to 32 cosine rows, 256 word neighbourhoods and 40 route reports per current UI session. Model profiles/headwinds have separate analyser contexts. The cache key includes formula version, model fingerprint, route/history, dogleg and relevant saved rule settings. Changing or replaying a hole does not let a late analysis overwrite a different result card. Failures are retryable and do not lock play.

The first analysis can wait for the existing background model download. Gameplay remains available while it loads; no extra model files or server calls are introduced. Word inspectors build the 100-neighbour table only when opened. Reports are downloadable JSON; full neighbourhood data is not automatically duplicated into localStorage scorecards.

The optional Worker-unavailable fallback performs the same deterministic computation after completion on the main thread. The recorded timings below are desktop Node measurements, not an iPhone performance claim.

## Reproducing the checks

```
node tests/test_semantic_analysis.mjs
node tests/test_semantic_panel.mjs
node scripts/benchmark_semantic_analysis.mjs
```

The tests include ideal separated/shared/one-sided/weak profiles, strict ranking ties, negative similarities, exact endpoint roles, repeated word positions, deterministic nearest-neighbour ties, real-model dogleg alternatives checked exhaustively at the actual lie, unchanged saved game state, cached results, stale asynchronous responses and retryable offline errors.

See `benchmark.json` and `BENCHMARK.md` for six contrasting completed routes. The measurements are not tuned to force the desired routes to win. Generic routes also achieve high distinctiveness, and the BASS pivot is not the maximum-separation word in its route. These are findings to inspect before considering any scoring use.


## 4. Setup gain

For each internal played B between A and C:

`G(B) = sim(B,C) − sim(A,C)`.

Retain signed raw cosine units, including negative values. Display a signed decimal, not a probability. Q, D and S are unchanged. For a payoff pivot P in `A → B → P → C`, **B’s** setup gain is `sim(B,P) − sim(A,P)`. This differs from P’s own setup gain into C. The inspector shows both.

## 5. Semantic backtracking and longer returns

For **every non-adjacent pair** of route positions i,j, including endpoints, compute:

```
r = max(0, sim(word_i, word_j))
e = max over i<k<j of max(0, r − min(sim(word_i,word_k), sim(word_j,word_k)))
raw_loop(i,j) = clamp(r × e, 0, 1)
```

Thus endpoints must be similar *and* an interior word must depart from that neighbourhood. An equally close synonym chain has no excursion. Real vector synonym chains may still have small signals; this is not a binary claim that a detour was pointless. Preserve every endpoint pair, return similarity, excursion and furthest interior position in JSON and in the expandable returns table.

When saved objective data is available, `gain = max(0, objective_j − objective_i)` and `adjusted_loop = raw_loop × (1 − gain)`. If the interval crosses an actual successful dogleg landing, adjusted_loop is zero, with its raw evidence still retained. This explicit protection prevents a useful dogleg return from being treated as pointless. A return spanning a dogleg is protected even if other parts of that broad interval were wasteful; narrower subintervals remain inspectable. It is deliberately conservative.

Route backtracking is the **maximum** adjusted loop, not a sum that grows automatically with route length. Each word also gets the maximum loop containing it as an interior position. The four-word pivot window uses the maximum loop wholly within that window. No distance-from-flag penalty is used.

## 6. Objective coordinates

Use successful actual history entries, their credited destination similarity, leg baseline and leg threshold. A credited plural/adjective destination is appropriate here because this measurement describes actual game progress; neighbourhood scores still use the typed word.

```
leg_fraction = clamp((destination − leg_baseline) / (leg_threshold − leg_baseline), 0, 1)
single-target objective = leg_fraction
dogleg objective = (leg_index + leg_fraction) / 2
```

Use denominator at least 1e-12. An actual dogleg landing receives exactly .5, then the baseline resets to the typed landing word’s similarity to the flag, as in the engine. Before that landing, the waypoint is the objective; its relation to the flag is irrelevant. After it, the flag is the objective. Two legs have equal weight; these are semantic coordinates, not the nonlinear map geometry. Fixed flag completion is recorded as 1 for route inspection, but **excluded from pivot-progress windows** so automatic completion does not itself create a productive pivot.

A pivot’s progress window starts two positions before the pivot and ends at its successor if that successor was player chosen, otherwise at the pivot itself. Net positive objective change over this window credits the preceding setup plus its immediate payoff, even if the setup alone was tiny. No per-shot minimum is imposed. If the window makes no net progress its productive score is zero.

For supplied abstract paths lacking saved rules/thresholds, objective progress is explicitly unavailable. Compute semantic diagnostics with the progression factor omitted and mark the pivot **semantic only**. Do not invent a waypoint or claim the abstract path was legal. Those values are not directly comparable with objective-adjusted gameplay scores.

## 7. Productive pivot experiment

For P in `A → B → P → C`:

```
g = max(0, G(B))
support = 0.5 + 0.5 × g/(1+g)
conceptual_difference = 1 − max(0, sim(B,C))
loop = maximum adjusted loop wholly inside [A,B,P,C]
progress_factor = sqrt(clamp(local_objective_gain,0,1))
productive_pivot(P) = S(P) × support × conceptual_difference × (1−loop) × progress_factor
```

Clamp to [0,1] for floating-point safety. The first chosen word has no preceding setup and gets no supported-pivot measurement; its original D/S and its setup gain into the next word remain available. Highest pivot wins, ties use earliest route position. Show the full four-word sequence and supporting word, not just P. Negative setup gains are retained but get no bonus; they do not automatically disqualify a potentially meaningful pivot. Positive setup adds a bounded bonus to the structural evidence rather than becoming a hard gate that excludes modest legitimate setups. A synonym chain is reduced by shared neighbourhood affinity (S), and again by similarity between the two sides. Loop and zero-progress factors reduce apparently interesting but unproductive journeys.

**These design choices are provisional:** the half base support, equal leg weighting, progress square root and multiplicative combination have not been fitted to human ratings. The score does not prove polysemy, intuitive satisfaction or necessity of a step. Low scores may still describe satisfying direct material/category bridges. A route may have one high pivot without every word doing well. No aggregate cleverness rating is produced, and the existing neighbourhood distinctiveness and dogleg distinctiveness do not feed this formula.

## Testing the extension

`node tests/test_semantic_journey.mjs` checks exact signed gains, short/long explicit return loops, a uniform synonym control, dogleg crossing protection, zero objective progress, immutable saved games, deterministic results and the supplied ROBOT path using the actual model. The existing six legal benchmark paths remain. Three semantic-only controls are added with an explicit missing-objectives label. `benchmark.json` retains all factor values, per-word gains, loop intervals and progress coordinates; `BENCHMARK.md` summarises findings and limitations. The path-local calculations add no nearest-neighbour searches: they reuse the existing 100-neighbour separation and cached vectors. Complexity is O(k³) for short route loops, with O(k²) output, independent of the number of possible game routes. All computations run in the existing analysis worker after completion.
