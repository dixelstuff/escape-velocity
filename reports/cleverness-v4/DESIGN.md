# Cleverness V4 — geometry and observed strategy

V4 is a read-only, optional post-hole experiment. It produces no overall cleverness score and changes no vectors, shot rules, legality, attempts, scoring, hole generation or leaderboards. V2, V3 and the earlier analysis remain available.

## Source independence

**V4 excludes the targeted Wiktionary snapshot entirely.** Its execution imports the source-neutral V3 numerical core and a separate general WordNet table. The WordNet table is generated from every applicable WordNet3.0 headword/synset against the full game vocabulary before the V3 snapshot is read. No test route, hole word or example override affects this artifact or the full-vocabulary profile build. The V3 comparison wrapper retains its historical annotations separately; its table was split into a shared WordNet artifact and a tiny legacy supplement to avoid downloading duplicate full dictionaries.

WordNet semantic relationships, exact multiword headwords and existing morphology annotations are available. Missing WordNet evidence is neutral and does not modify V4 geometry, context, strategy or ordering. Existing V2 objective word-form discounts are preserved. KING PRAWN remains absent under these source constraints; V4 does not import the targeted evidence that V3 used to find it. No new Wiktionary extraction, external language-model API, or new semantic model was introduced.

## Full-vocabulary profiles

Every one of36,306 words has a deterministic profile at25/50/100/200 neighbours. Existing float16 vectors are decoded without changing the game's vectors.

Neighbour retrieval uses block float32 BLAS dot products over the complete vocabulary, excluding self. Top256 candidates are refined in float64 and sorted by exact dot product with lexical tie-breaking. A conservative gamma300 floating-point error bound triggers a full float64 row if the200/256 margin is unsafe; no rows required fallback in this build. The raw similarities therefore follow the existing model; the shipped neighbourhood ID fingerprints are checked against JavaScript's actual full rows before profiles are used.

For geometric diagnostics only, each existing vector is normalized to unit length. This avoids the small norm drift from float16 representation; game similarities and shot calculations continue using the original model unchanged.

For K unit neighbour vectors x:

* **Mean pairwise concentration** = `(||Σx||²−K)/(K(K−1))`. This exactly equals the mean off-diagonal cosine, without allocating a K×K Gram matrix.
* **Dispersion** =1−concentration; explicitly redundant, not an extra independent signal.
* **Density** = mean, standard deviation and minimum raw word-to-neighbour similarity, kept separate from neighbour-to-neighbour concentration.
* **Affinity effective size** = `exp(−Σ p log p)` for softmax raw affinities with fixed temperature0.1. This measures evenness of affinities, not number of meanings or topics.
* **Hubness**: existing game's u8 hub statistic is retained as a descriptive value. New top100/top200 in-degree counts how often the word appears in those full-vocabulary directed neighbour lists. No mechanical surcharge formula becomes a cleverness penalty.
* **Reciprocity** counts edges that are mutual at each K; it is distinct from occurrence and local density.
* Counts above raw cosine0.1/0.2/0.3/0.4 are a float32 sensitivity sweep, with possible boundary rounding. They are not semantic plausibility thresholds.
* Concentration's vocabulary percentile describes geometry across words, **not players, narrowness validation or cleverness**.

### Local partition experiment

At each K, fit a deterministic **two-way spherical partition**: nearest neighbour seeds cluster0, its farthest neighbour seeds cluster1, then8 centroid/assignment iterations. The number2 is a fixed hypothesis, **not two identified meanings**. We do not infer a defensible count of semantic senses from this method. Empty or singleton groups are handled explicitly.

Report group sizes, representative actual neighbour words nearest to each centroid, centroid cosine separation, spherical loss reduction versus one centroid, and exact average cosine-distance silhouette. For word i in group g, mean within-group cosine is `(x_i·Σ_g x−1)/(|g|−1)`; mean other-group cosine is `x_i·Σ_other x/|other|`. Thus silhouette can be computed exactly from group sums, without a K² matrix. Singleton silhouette is0.

For25/50/100 versus200, report adjusted Rand index on the shared neighbours, invariant to swapping cluster labels. Low or negative ARI exposes unstable partitions. No fabricated cluster labels or meaning explanations are assigned. Representative words may expose a partition of ordinary content words versus discourse/function words, rather than a useful sense distinction.

These partitions are cheap and inspectable but not a validated semantic clustering model. Multiple starts, adaptive cluster counts and contextual models were not added simply to force expected examples to work.

## Contextual specificity

For A→B→C, use B's own precomputed neighbourhood and partitions at all four sizes. The fixed endpoints A and C cannot witness themselves: their weights are zero when present in B's neighbourhood.

For neighbour n:

```
incoming exclusive weight = max(cos(A,n)−cos(C,n),0) × max(cos(B,n),0)
outgoing exclusive weight = max(cos(C,n)−cos(A,n),0) × max(cos(B,n),0)
```

Keep raw support mass per side. Normalize within each side only to inspect how that evidence is distributed over the two groups. **Exclusive cluster difference** is `abs(P_in(group0)−P_out(group0))`, the total variation distance for two groups; null if either side has zero support. It is not a score. Tiny raw mass can generate a large normalized difference, so both masses remain visible.

For either support distribution p:

* Effective support size = `1/Σp²`, and its fraction of K.
* Weighted support concentration = `(||Σp x||²−Σp²)/(1−Σp²)`, null if only one effective neighbour contributes.
* Top5 actual exclusive witnesses retain their raw support, endpoint similarities, B similarity and partition membership.

Also retain nonexclusive positive affinity support, both raw route-pair cosines, weakest association, A/C direct cosine and their top100-neighbour Jaccard excluding the bridge/other endpoint. The latter help distinguish within-context differences from a genuinely different conceptual region. None is multiplied into a new cleverness formula. The original V2 contextual evidence and ordering remain separate.

## Pair specificity

Each adjacent pair retains V3's full-vocabulary cosine, directional ranks/percentiles, asymmetry, reciprocal prominence and density, plus top25/50/100/200 neighbour-set intersection, Jaccard and overlap fraction. A continuous positive-affinity support region is examined in each endpoint's neighbourhood, excluding the other endpoint itself. Effective size and weighted concentration are retained.

Low overlap, a concentrated subset or asymmetric ranks cannot rescue a weak pair. WordNet support is an optional annotation; absence is neutral. No pair-specificity score or novelty bonus is manufactured.

## Strategy and doglegs

V2 authoritative engine replay still establishes whether B is needed to make C playable, whether B is required to switch dogleg targets, actual versus bypass hit margins (only comparable under the same objective), and proven route redundancy.

V4 attaches the actual four-word supporting sequence A→B→C→D, C's V2 context evidence and its own local context geometry, and whether C reaches the dogleg. This makes setup versus semantic payoff inspectable without declaring every necessary move ingenious. It does not reward B for travelling far.

The source-neutral V3 core provides the same bounded substitution retrieval: up to48 candidates per bridge,256 per route, each replacing B and replaying the actual prefix and remaining words with Game. Controls reproduce the original choice. Dogleg substitutions recalculate the second-leg baseline. No hypothetical continuation or vocabulary route search is performed.

Retain separately: how many replacements preserve the landing role, how many support the actual next shot or finish sooner, how many complete the entire actual continuation, and mean pairwise cosine of successful substitutes. That spread is geometric diversity, not a count of concepts. Role-preserving earlier completion is separately identified. A failed alternative is not called a trap solely because it starts farther/closer to the flag.

The dogleg summary points to the same pivot and demonstrated suffix. V2 legal-landing/immediate-completion counts are retained for interpretation. There is no flag proximity, baseline, shot progress, immediate-finish or duplicate dogleg credit.

## Results and failures

* **CHIPS**: the200-neighbour representatives include COMPUTERS/PRODUCTS/COMPUTER/TECHNOLOGY versus BUTTER/CHOCOLATE/CHEESE/BREAD. Silhouette0.153, ARI100→200=1.000. For MOUSE→CHIPS→PIE, exclusive support is4.09/4.57 and cluster difference0.792. This is useful independent support for V2's strongest pivot, without penalizing polysemy. The same2/48 bounded legal substitutions remain; they are not a creativity score.
* **KING**: its200-neighbour partition is royalty versus general/discourse words, with ARI100→200≈−0.027. Incoming PRAWN support is only0.07 versus19.57 on the outgoing side. It does not recover a credible seafood context. The static-vector limitation remains visible; no targeted phrase attestation is imported to repair it.
* **CHAOTIC / SPIRAL**: CHAOTIC retains the engine proof that DISORDER→SPIRAL cannot hit directly. SPIRAL has local cluster difference0.712, support4.16/5.39 and ARI≈0.808. The setup and following pivot can be examined together. This is more informative than scoring necessity alone, though not calibrated evidence of human ingenuity.
* **WHEEL / POWER**: WHEEL enables POWER; POWER's actual dogleg completion is useful. Incoming support for POWER is much weaker than its conventional ELECTRICITY side (0.81/9.10). The report retains the many immediate-finishing alternatives; automatic completion is not treated as rare ingenuity.
* **PATTERN / NOTES**: their existing substitution counts and proven joint redundancy remain. Their local partitions can reflect content versus broad/discourse associations, not inventive sense shifts. Nothing suppresses the original V2 evidence to force a ranking.
* **Global concentration is not reliable semantic narrowness.** Across the full vocabulary it correlates strongly with density (Spearman0.898) and in-degree (0.750). HARD has unusually high concentration despite being a broad everyday word. Specialist words can have more dispersed neighbours. We do not have independent human labels sufficient to demonstrate extra predictive value after contextual evidence.
* **Held-out controls expose false positives.** HAPPY→GLAD→PLEASED has cluster difference0.725 despite ordinary synonymy; endpoint cosine0.671 makes the overlapping context explicit. THING→SYSTEM→PROCESS reaches0.705. KITTEN→CAT→ANIMAL also splits despite a conventional category progression. The normalized split must not be used alone.
* **Secondary-sense false negatives persist.** VIOLIN→BOW→ARROW has a low split0.166 and weak incoming support. RIVER→BANK→MONEY is lopsided toward money. TREE→BARK→DOG is lopsided toward the tree side. Geometry does not consistently recover every meaning.
* **Weak nonsense can still split.** TURNIP→GALAXY→SCISSORS yields0.471 despite weakest route cosine−0.105. Raw pair strength and uncertainty are essential. A normalized difference is not relationship credibility.

Promising: stable local structure supported on both sides, inspected with endpoint context overlap and credible pair evidence; exact setup proof attached to the observed subsequent pivot; dogleg evaluation through the actual continuation. Not ready as positive score components: global concentration percentile, forced cluster count, unqualified normalized split, necessity, scarcity, proximity or completion. A combined score still requires broader human evaluation and calibration.

## Performance, storage and limitations

The full build took63.2s with numpy2.5.4/Apple Accelerate,4 BLAS threads. Peak process RSS was about1.19GB, offline only. All nearest neighbours, reciprocal edges and partitions were built uniformly; no example tuning. Frozen assets and runtime are deterministic. Rebuilding with a different BLAS/numpy platform may introduce tiny floating-point differences; neighbourhood fingerprints and source hashes prevent mixing incompatible profiles.

Profiles use361-byte binary records in128-word shards:13.11MB raw,11.44MB gzip across the full vocabulary. The catalogue is optional and the browser never downloads it all. Each shard is about46KB raw; a typical five-word route needed5 compressed shards,201KB total in the Node experiment. Gzip integrity is checked before decoding, and raw bytes are independently verified. Model SHA, word-order SHA, bounds and neighbour fingerprints are checked. Corrupt/unavailable compressed data can fall back to verified raw bytes; failures are retryable.

Existing vectors and cosine/rank caches are reused. Global profiles and clustering never run in the browser. Only requested route words are decoded. Shards are LRU16, nearest-ID cache128 words, unit-vector cache4096 (~9.8MB of numeric storage), report cache12; JS objects and existing model/analysis caches add memory.

Thirteen-route Node runs took roughly0.2–0.9s including V2/V3 calculations and local profile loading; these are not iPhone/network benchmarks. The separate warmed-V2 Node memory run recorded about28.3MB extra retained heap and104MB RSS, including WordNet parsing, V3 numerical diagnostics, profiles and V4 output; see `memory.json`. Runtime work stays in the analysis worker. The no-worker fallback can block the main thread. The new worker fetch binding is explicitly regression-tested.

The optional contextual language-model comparison was skipped: the project has no torch/transformers/sentence-transformers runtime or documented pretrained contextual model available. No large model was downloaded or API called.

Reproduce with:

```
VECLIB_MAXIMUM_THREADS=4 .venv/bin/python scripts/build_semantic_profiles.py
.venv/bin/python scripts/build_phrase_evidence.py  # WordNet artifact built independently; legacy V3 snapshot remains separate
node scripts/validate_cleverness_v4.mjs
.venv/bin/python tests/test_semantic_profiles.py
node tests/test_cleverness_v4.mjs
node tests/test_cleverness_v4_panel.mjs
node tests/test_cleverness_v4_worker.mjs
```

The reports include all13 supplied routes and8 new diagnostic triples chosen before inspecting their values. They are contrast cases, not blind human ratings or claimed playable holes. All individual raw metrics, representatives, scale stability, pair data, engine controls/substitutions, coverage and timing are downloadable from V4.
