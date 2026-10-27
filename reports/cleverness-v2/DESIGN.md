# Cleverness Analysis v2 — diagnostic design

This is a separate experiment alongside the retained earlier Semantic Analysis. There is **no overall 0–100 score**, no change to gameplay, no new word restrictions, and no input into strokes, leaderboards or course generation.

## Authoritative mechanics

`static/engine.mjs` remains the sole shot authority:

| Concern | Existing authority |
|---|---|
| Similarity and profile/headwind | `Embeddings.cosine`, `withWordModel`, `withHeadwind` |
| Distance requirement | `launchRequirement`, `Game.requirement` |
| Hub surcharge | `Game.requirement` (existing forward-distance surcharge) |
| Contact/backwards legality | `Game.shotResult` |
| Plural and noun/adjective allowances | `Game.pluralResult`, `Game.pluralShot`, `familyVariants` |
| Dogleg completion and landing baseline reset | `Game.submit` |
| Automatic and curated finish | `Game.finishesFrom`, `Game.finishShortfall`, `Game.submit`, `Game.isGolden` |

Diagnostic code calls `Game.submit` on independent games with the saved settings, profile, headwind, form allowances, challenge and golden paths. It never mutates the live game or adjusts thresholds. The margin is simply the engine's `launch − required`; an unavailable automatic margin stays null. A positive contact margin alone does not establish legality: backwards restrictions and dogleg ordering still apply.

First replay the original successful manual history and check completion, route, waypoint event and credited spelling. If it differs, mechanical findings are marked unavailable rather than changing the input. Historical hashes are retained when a matching scorecard is found; current reproduction is not a claim about an old model's behaviour.

## Semantic evidence, including first words

Every player-chosen internal word B between A and C is eligible, including the first shot. Fixed tee/flag endpoints are excluded; an unplayed waypoint is never inserted. Existing separation and distinctiveness remain numerically unchanged in the earlier analysis. Distinctiveness is reference data only because it is often saturated.

The new evidence supplements B's own 100-neighbour separation with **endpoint-context witnesses**. For each of the 100 nearest neighbours n of A, compute:

```
left_support(n) = max(0, sim(B,n)) × max(0, sim(A,n) − sim(C,n))
```

For neighbours of C, swap A and C for right_support. Exclude A, B and C themselves. Sort by support, lexical ties; retain five witness words per side. Let L and R be the mean of the strongest three supports on each side (or all available for a tiny vocabulary):

```
context_support = sqrt(L × R)
raw_context_evidence = (existing_separation + context_support) / 2
```

Endpoint witnesses can expose a secondary context missing from B's dominant neighbourhood. This is evidence of two contexts, **not proof of polysemy** or a human explanation. The code never invents labels such as “computing and food.” It shows actual witness words and raw scores.

For display ordering, contextual evidence is discounted to 10% when the immediate predecessor/successor is a detected morphological variation of B and is the waypoint or flag. A morphological shortcut to an **unplayed** waypoint is still reported with 10% objective-association credit, but it does not erase otherwise interesting incoming/outgoing contextual evidence. Raw data and original measures remain inspectable. No objective-affinity amount is added to the pivot ordering. Other words receive no blanket route penalty.

Show the leading candidate and up to two others, without adding them. Context-overlap evidence for each pair is `max(mean(sim(A1,A2),sim(C1,C2)), mean(sim(A1,C2),sim(C1,A2)))`, retained for future repeated-transition calibration. No threshold declares candidates independent, and no final diminishing-return formula is committed to.

The arithmetic ordering is provisional. It is not a cleverness score. Stroke count, attempts, objective progress, shot distance and route length are absent from it. Extra words are not summed into extra credit.

## Mechanical setups

For each actual A → B → C, reconstruct the exact prefix ending at A, then submit C directly. Compare that engine result with the actual shot after B:

- A failed direct contact/backwards shot means B is necessary **for this next shot from this prefix**.
- A dogleg-ordering block is reported separately as a required dogleg transition.
- If direct C succeeds, B is not labelled mechanically necessary merely because it increased the contact margin.
- Retain both shot results, requirements and form substitutions. A margin difference is computed only when both shots use the same active objective/stage; a dogleg switch is labelled as a different objective rather than a misleading margin gain.

This local necessity is not a claim that B is globally required. A longer sequence containing it may be compressible to a different later route word. The UI and JSON distinguish these findings.

## Proven redundancy and multiword compression

For each eligible individual word, remove it and replay every retained manual word through to the flag. A proof must complete successfully; if the game automatically finishes earlier, that is a real shorter completed route, not a hypothetical continuation. It is shown explicitly.

For larger bypasses, test pairs of **existing route positions** within the same original leg. Keep the original dogleg landing for these multiword tests. Single removal of a landing is also tested, but must replay and recalculate the entire second leg. No assumption of unchanged destination/baseline is made.

Construct a DAG over route positions using normal adjacent steps and proven bypasses that retain the landing. Propose a shortest retained-position sequence, then **replay the entire proposed combination**. Independent bypasses can interact through the best-progress watermark, forms, route-dependent golden rules or completion, so an unverified DAG result is not accepted. If it fails, a deterministic greedy fallback accepts each combined removal only after full replay. Compare a successful single changed-landing proof as well.

Avoidable strokes = original engine strokes − strokes in the demonstrated shorter completed route. Report only this proven amount, not a sum of overlapping removals. All individually valid bypasses remain visible, even when they cannot coexist. This is a proven bound, not a global optimum and not a stroke-derived creativity bonus.

Bounds: at most 64 manual words, at most 512 candidate bypass tests, plus verification of the proposed combination/fallback. Longer routes retain semantic analysis but flag mechanical coverage as unavailable; a pair-test cap flags partial coverage. Alternative vocabulary routes and continuations are never searched. Small setup moves are not penalised for lack of immediate progress.

## Lexical shortcuts

`static/lexical-relations.mjs` is generated by `scripts/build_lexical_relations.py` from the existing WordNet 3.0 archive and supported vocabulary. It contains 17,088 pairs, reusable for future hole diagnostics; **no automatic hole rejection is implemented**.

Evidence sources:

1. Explicit WordNet derivational pointers, requiring shared spelling (at least three initial letters and at least four letters per form) to exclude semantically related but orthographically unrelated links such as BIRD/AVIAN.
2. Standard WordNet inflection detachment rules and exception lists, accepting only dictionary-attested bases. Shared text alone is insufficient.
3. A conservative, explicitly labelled **probable** agent/place relation: a dictionary noun in -ery shares a verb base with an agent in -er whose derivation to that verb is explicitly in WordNet. This detects BAKER/BAKERY without a word-specific override.

PERFUME/PERFUMERY and CHEMICAL/CHEMISTRY use explicit derivational evidence. BAKER/BAKERY is labelled probable rather than falsely claiming a direct WordNet pointer. STONE/STATUE, PIPE/PLUMBING, CAR/CARPET and ART/PARTY are negative controls. No edit-distance or substring-only rule is used. The WordNet license is distributed in `static/WORDNET-LICENSE.txt`.

Dictionary morphology can still be sense-ambiguous (e.g. CUSTOM/CUSTOMS); it is not evidence that a player intended a trivial meaning. The 90% association discount is intentionally substantial but provisional. It affects diagnostic evidence only, not word legality or golf score. Other semantic links and raw data are preserved.

## Dogleg opportunity, coverage and overlapping evidence

Reuse the earlier analysis's legal one-shot landing pool at the actual incoming lie. Replay each candidate with `Game.submit` after the exact prefix. Record:

- actual typed landing and any credited form;
- recalculated second-leg baseline;
- immediate completion and whether it includes an automatic stroke;
- engine finish shortfall and direct-target margin;
- how many candidates finish immediately;
- how many alternatives have greater finish shortfall than the chosen landing.

Finish shortfall uses the credited spelling the engine uses for automatic completion; the second-leg baseline uses the typed landing, matching the engine. “Greater shortfall” is a numeric immediate-access comparison, **not an assertion about the difficulty of future word discovery**.

The pool is exhaustive over supported one-shot landing words from this incoming lie when all expected candidates reproduce. Always state actual/expected counts, vocabulary size and complete/partial coverage. It does not cover landings reachable only after additional setups, words outside the vocabulary, or all continuations. Tiny pools do not create uniqueness awards. TORTOISE has only one candidate here and gets no invented genius percentage.

POWER is an immediate finisher on HAMSTER/EXERCISE/ELECTRICITY, but so are 64 of its 287 candidate landings (including POWER). The count contextualises that opportunity instead of awarding ingenuity just because the golf result is an eagle. Dogleg semantic evidence overlaps general pivot evidence; it is not added again.

## Presentation, caching and performance

A new compact findings panel appears after completion. Word-level semantic/mechanical/economy/lexical details, bypass proofs, candidate coverage and limitations expand underneath. Downloadable JSON retains all candidate and witness measurements. The earlier Semantic Analysis remains available in its own comparison dropdown, with all original calculations intact.

The existing worker shares cached semantic reports between panels. V2 reuses its analyser's vectors, cosine rows and nearest neighbours. The lexical table and v2 computation module load lazily in the worker only when the new analysis is requested, not during initial page play. Cache 24 completed v2 reports and 24 shared semantic reports; model/profile/headwind context is included. UI responses are keyed and late responses cannot reopen or overwrite another hole. Allowance metadata forwarded by daily mode is excluded from identity because it does not affect shot mechanics; challenge version/par and golden paths are retained.

On the local desktop Node run, the 13 cold/partially warm cases took approximately 84–357 ms each including the earlier semantic calculation; repeats use the report cache. These are not iPhone timing claims. There is no route enumeration and no new model download. The lexical table is about 459 KB before HTTP compression, fetched only for post-hole diagnostics.

## Validation and remaining calibration

All A–M supplied paths currently reproduce. Exact assertions cover necessary setup, contact margins, both PATTERN/NOTES removals together, RABBIT → MOUSE compression, recalculated dogleg baseline success/failure, dictionary controls, tiny/full candidate coverage, immutable game state, worker protocol, UI cache identity and delayed-response safety.

Positive interpretation checks: INK and PIPE lead their examples; SPIRAL leads the ROBOT route; CHIPS leads the creative RABBIT dogleg. KING remains among the three candidates but ranks below HEAD and RULER. HONEYCOMB still produces high semantic evidence for mundane PATTERN/LATTICE; mechanical redundancy now makes their unnecessary role explicit instead of interpreting the raw semantic score as cleverness. This is a limitation, not silently tuned away.

Before any final 0–100 score: gather blind human labels, test secondary meanings, check generic/hub witnesses, calibrate lexical false positives and association discounts, validate setups versus mundane chains, normalise candidate-pool evidence, and design diminishing contributions for genuinely different pivots. Economy should remain demonstrated evidence rather than a surrogate stroke-count penalty. No final aggregation or tie-break rule is added here.

See `VALIDATION.md` and `validation.json` for every supplied case.
