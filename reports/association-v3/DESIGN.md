# Association Specificity V3 — experiment, not a scoring system

V3 adds a separate, lazy expandable result panel and JSON download. V2 and the earlier semantic analysis remain available. No shot rules, model vectors, legality, movement, stroke scoring, attempts or leaderboard ordering were changed. Engine edits only expose the read-only analysis operation. No final or provisional combined cleverness score is introduced.

## Directional pairs

For adjacent route words A,B, use the full supported vocabulary, excluding the query word itself. Sort descending cosine; exact ties within 1e-12 receive their average occupied rank (midrank). Lexical sorting makes ordering reproducible, but does not manufacture tie asymmetry. Population N = vocabulary−1.

* Directional percentile = `1−(midrank−1)/(N−1)`; higher is more prominent. These are vocabulary ranks, not player percentiles.
* Signed asymmetry = `log2(rank(A|B)/rank(B|A))`; also retain its absolute value.
* Reciprocal prominence = `1/sqrt(rank(B|A)*rank(A|B))`.
* Raw cosine, each direction's tie count, each endpoint's top100 mean similarity and existing hubness are retained separately.

Asymmetry is not rewarded. Density/hubness are diagnostic context, not an unvalidated correction. Rank normalization already exposes differing local competition, while cosine exposes association strength. Percentiles can look high for weak links in a 36k vocabulary; actual ranks and cosine must remain visible. The weakness of PRAWN/KING is not fixed by asymmetry.

## Conceptual substitution

For each A→B→C, evaluate every supported X except A,C. `Q(X)=min(cos(A,X),cos(X,C))` prevents a strong side from concealing a weak side (unlike an unqualified geometric mean). Chosen B is included in its joint standing but excluded from alternative counts. Report strict-greater competition rank, tie count and alternatives at least as strong as B.

Counts at Q≥0.1,0.2,0.3,0.4 are deliberately a sensitivity sweep, not a chosen definition of credibility. Also count candidates whose **worse endpoint midrank** is ≤100,500,1000. These rank-normalized comparisons are independent of raw-cosine thresholds. Neither proves human plausibility or creative rarity. Both raw sides and sixteen strongest alternatives by each criterion remain in JSON. No additional threshold filters routes or shot legality.

## Bounded mechanical substitution

Per bridge, interleave top24 Q and top24 worst-endpoint-rank candidates, deduplicate, then fill to48 from Q order. Exclude chosen B and endpoints. Whole-route limit256 tests, processed in route order; later words can have partial or zero coverage, explicitly reported. These are intentionally bounded samples, **not full-vocabulary legal-substitution counts**.

Each candidate replaces only B in the actual played manual route. `replaySelection` constructs a fresh authoritative Game, replays the original prefix, tries X and replays the actual suffix until completion or failure. It does not search for alternative suffixes. Full completion, executed substitution, successful contact, next-shot result, dogleg transition, resulting route/strokes and early completion are retained. A replacement of the original dogleg landing must itself reach the dogleg to count as role-preserving. The live engine recalculates the new second-leg baseline and finishing conditions. Early automatic completion is valid, separately flagged.

The original-word control must reproduce completion; V2's exact original replay must also pass before any mechanical comparison is claimed. Valid replacements prove mechanical completion, not equivalent semantics or equal strokes. The completion count may include shorter/longer automatic finishes; raw strokes make that inspectable. This retrieval scheme can miss satisfying low-vector phrase bridges and should not become a creativity score.

## Context, morphology and doglegs

V2 credited context evidence and ordering are copied, not reweighted. Existing objective morphology discounts, semantic witnesses and independent redundancy proofs remain intact. V3 annotates the actual dogleg landing once; no duplicate reward, flag affinity bonus or small-pool bonus. Pair strength, dictionary evidence, context switching and scarcity are independent outputs.

Dictionary term presence does not decide which sense was used. The compact comparison starts with V2's three strongest candidates; details and download retain **every chosen word and every adjacent pair**, including the first played word and final connection. No unplayed waypoint word is inserted into the semantic route.

## Performance and reproducibility

Existing semantic cosine rows are reused (LRU32, ≤8.9 MiB/model). Full ranks are computed once per endpoint and cached (LRU32, Float64 ranks + Uint32 ties, ≤13.3 MiB/model). Twelve route reports and up to four model/profile rank caches are bounded. No full 36k×36k matrix is allocated. Existing V2/earlier reports are shared in the worker. The no-worker fallback has equivalent authority but can block that browser's main thread; modern Chrome/iPhone use the worker.

The V3 panel requests nothing until expanded. Only then is the compact lexical table imported. There is no runtime dictionary API, new semantic model or Python/browser dependency. Full model completion remains necessary for honest full-vocabulary ranks; the existing verified progressive-loader retry path is reused.

`validation.json` records all13 supplied paths, all raw pair/bridge data, controls, bounded engine proofs and timings. `memory.json` is a separate Node26 measurement after V2 warming, including module import and lexical decode; it is **not browser/iPhone memory or speed**. Retained heap delta is about19.6MB on that run, while RSS grows about84MB (includes allocator/temporary work). These figures exclude the already loaded model and V2 heap. JSON-encoded table parsing and binary lookup avoid building a second giant decoded relationship map. Mobile performance still needs real-device feedback.

Rebuild offline:

```
.venv/bin/python scripts/build_phrase_evidence.py
node scripts/validate_association.mjs
node tests/test_association.mjs
node tests/test_association_panel.mjs
node tests/test_association_worker.mjs
```

The phrase builder defaults to the committed Wiktionary revision snapshot (no network). `--wiktionary` refreshes every generated candidate title from the thirteen route pairs; changed revisions require a new phrase-version identity. Neighbour ties, candidate order and budgets are deterministic. Timings, not mathematical output, vary by run. No example-word overrides or expected-winner tuning.

## Findings and failures

* KING PRAWN is verified by Wiktionary despite cosine0.117 and ranks4721/3884. V3 adds a missing kind of evidence without falsely increasing its V2 context score. Directional asymmetry alone fails this case.
* KING→RULER is highly reciprocal (15/9, cosine0.485). No direct shared-synset match is found in the conservative table; this is a coverage limit, **not** a claim that the words lack a conventional relationship.
* CHIPS remains V2's leading contextual pivot. For MOUSE/PIE,76 alternatives pass0.2, none pass0.3; only2/48 sampled replacements preserve its dogleg role and completion. This is suggestive, not exhaustive proof of uniqueness. Its actual computing/food witnesses remain visible. No BAKERY proximity reward is added.
* PATTERN and NOTES have161 and934 alternatives at0.2 and43/48 and41/48 sampled successful replacements. These counts usefully contextualize their V2 evidence. The existing proof that PATTERN+NOTES can be removed together remains a different result.
* RULER has534 alternatives at0.2 but0/48 sampled mechanical replacements. That contrast demonstrates why semantic breadth and mechanical difficulty must not be conflated.
* SMELL/PERFUME is a strong reciprocal connection (23/13); PERFUME/PERFUMERY and CHEMICAL/CHEMISTRY morphology discounts remain. Phrase evidence does not override them.
* SQUID INK is an attested Wiktionary multiword entry, but is not automatically called a fixed idiom or polysemous pivot. MOUSE PAD and its dictionary-attested spelling MOUSEPAD are recognised. HEAD OF SALES is never substituted as evidence for HEAD/SALESMAN.
* Phrase presence also finds ordinary DESIGN PATTERN and WATER PIPE. It cannot itself distinguish a creative use from a conventional sequence. Dictionary forms such as HARDSTONE can be rare or sense-specific; without corpus frequencies they are not called common or strong collocations.
* A low substitute count can simply reflect a weak side (KING's117/1000 raw incoming cosine) or threshold choice. Generic neighbours can still rank highly. This does not solve semantic sense disambiguation.

Promising: verified phrase support alongside distinct contextual witnesses; raw-vs-rank candidate sensitivity; exact counterfactual substitution with complete route replay. Do not use standalone asymmetry, zero-count scarcity, phrase presence, mechanical scarcity or high vocabulary percentiles as a cleverness score. This remains diagnostic evidence for human comparison.
