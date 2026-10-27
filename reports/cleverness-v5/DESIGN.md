# Cleverness V5 — semantic strategy research

V5 is diagnostic only. Gameplay, vectors, vocabulary, thresholds, stroke scoring and rankings are unchanged. There is no aggregate cleverness score or automated human-satisfaction ordering. V4 remains independently available and is embedded in every V5 JSON export.

## What was added

The route view brings together **approach → landing → departure**, necessary setup, observed outgoing shot, substitute failure stages and full-route economy. It operates on the completed route, never searches continuations in the browser. Position identifiers preserve repeated words in different legs. Automatic finishes count as strokes and as the successor association, not as player-chosen bridge words.

The existing exact-engine replay supplies three different facts: a word can be necessary for the next observed shot; it can switch the dogleg objective before that shot; and it can be removable while still completing the full route. These are deliberately not equated. For example, CASH is not removable in its complete route even though playing RISE instead can reach the dogleg. HONEYCOMB's PATTERN and NOTES can be jointly removed in a verified replay; this does not imply that their associations were meaningless. A necessary conventional move is not automatically ingenious.

Each bridge also decomposes the existing deterministic replacement sample into landing-role success, next-shot/early-finish success, and full suffix completion. These sets are nested. The union of top24 weakest-link and top24 worst-endpoint-rank candidates is filled to48, with a route budget256, as in V3/V4. No sample counts establish uniqueness or semantic equivalence. These are the same replays, not a new search or independent evidence.

## Competing semantic combinations

For each existing K=25/50/100/200 neighbourhood of bridge B, use V4's endpoint-excluded witnesses and its fixed two-way partition:

- `q = max(0, min(cos(A,B), cos(B,C)))`.
- `g = 1 - clamp(cos(A,C), 0, 1)`; no additional credit for negative endpoint cosine.
- `L = Σ max(cos(A,n)-cos(C,n),0) max(cos(B,n),0)`; R reverses A/C. Route endpoints have zero witness weights.
- `d` is V4's exclusive cluster-distribution difference (zero if either side has no support).
- `balance = 2 min(L,R)/(L+R)`, zero if both masses vanish.
- `mass = (L+R)/(2K)`, clamped to [0,1]. The bound follows from cosine differences ≤2 and positive bridge affinity ≤1. This deliberately leaves small absolute support small, rather than normalizing it away.
- `overlap` is V4's endpoint top100-neighbour Jaccard, excluding the bridge and other endpoint.

Three **raw comparison indices** are exported and inspectable:

1. Strength × gap: `q*g`.
2. Supported context switch: `q*g*d*balance*mass`.
3. Overlap sensitivity: index2 × `(1-overlap)`.

They are not percentages, probabilities, player percentiles, route scores or three independent measurements. No index orders routes in the interface. Raw links, ranks, context masses, silhouette, stability, lexical annotations and alternative controls remain visible. Stability is inspected rather than multiplied in: an unstable forced partition is uncertain, not evidence of no genuine secondary meaning. WordNet-only annotations are neutral when missing; no targeted Wiktionary snapshot, test-route phrase additions, word-specific weights or external explanations enter V5.

## Calibration: what worked and what failed

All six newly supplied routes reproduce under current settings, with the supplied 4/4/5 and 4/5/7 stroke counts. Thirteen prior recorded states retain their exact replay and removal results. Complete per-word values and proofs are in validation.json; compact comparisons in VALIDATION.md.

- **MARKET** combines a CURRENCY landing, a required objective transition, and an immediately successful VOLATILE departure. Only6/48 sampled replacements preserved the role and completed that suffix, compared with8/48 for CASH. MARKET's incoming FISH support is1.53 versus8.73 outgoing support; exclusive difference .257. This misses much of the familiar fish-market sense. Its supported switch index is .000408, only slightly above CASH .000373 and below NOTE .001136. **It does not recover A > B > C.** No route-level maximum is proposed: that would incorrectly promote BOOKS or other ordinary links.
- In PENGUIN A, the observed post-dogleg continuation has2 strokes; B also2; C3. All have zero proven removable strokes among their own words. Necessity therefore cannot distinguish the human preferences. C is longer, not proven wasteful. NOTE's very selective0/48 sample is not ingenuity evidence.
- **CHIPS** (.003297 supported switch) and **SPIRAL** (.003290) retain the useful context evidence seen in V4. CHAOTIC is shown with its necessary SPIRAL payoff rather than being dismissed for weak local separation. This is useful presentation of existing facts, not independent validation of a new metric.
- **VELVET A** is4 strokes versus5/7 and its post-dogleg finish is2 strokes versus3/3. Its RED link still has a relatively high .004117 index, despite the player judging RED→TELEVISION fortunate. TELEVISION→DRAMA remains conventional despite high .764 context difference. Thus semantic credibility is **not solved**. There is no imposed B/C preference.
- **DRIFT→ORBIT→EYE** has .342 context difference and .000567 supported switch, a false negative for an interesting secondary anatomical sense. Missing support is not a penalty to gameplay or any final score.
- **PRAWN→KING** remains weakly supported (.000010) without the targeted phrase snapshot. WordNet absence remains neutral. KING→RULER's0/48 substitutions do not justify a creativity bonus.
- **HAPPY→GLAD→PLEASED** retains .725 raw partition difference but has endpoint cosine .671. Gap and overlap expose the conventional-context problem but do not prove synonymy. Generic THING→SYSTEM→PROCESS still has .705 partition difference. A nonsense TURNIP→GALAXY→SCISSORS triple has a negative weakest link and therefore zero positive comparison indices, irrespective of gap.

### Assessment

**Useful additions:** explicit multi-function landing/continuation view; setup-and-payoff shown together; nested alternative failure stages; weakest route links next to exact verified removals; correctly scoped local short-solution landscape.

**Mostly redundant:** strength-gap, overlap-adjusted switch, and supported switch are transformations of V4 inputs. Their failures above mean they are rejected as automatic satisfaction rankings. They remain raw experiments under inspection, not endorsed cleverness measurements. Conventional transitions, polysemy missing from static vectors and human-intended associations remain unresolved. More blind human judgements on previously unseen routes would be needed before calibrating anything.

No semantic-distance-per-stroke, positive reward for wandering, rarity bonus, lexical-absence penalty, total cleverness score or example-specific tuning has been added.

## Local Hole Solution Landscape

Run from the repository root:

```sh
node scripts/hole-solution-landscape.mjs
# Or a supplied hole and par:
node scripts/hole-solution-landscape.mjs rabbit computing bakery 4
```

Outputs LANDSCAPE.md and landscape.json here. This utility is not imported by browser code. It has no production cache, storage, browser component or special level. It loads the existing Float16 model and uses the authoritative JS Game, rather than duplicating rules in Python.

Every vocabulary word is tested as a first-shot dogleg landing. Every vocabulary continuation is tested for each such landing, except trivially unplayable current/flag slots (flag is checked separately as the immediate finish). `pluralShot` is a **lossless engine preflight**, not a semantic-strength filter. Accepted candidates are submitted to a cloned Game; any remaining flag shot is submitted too. Morphology rescue, credited spelling, target reset, best-progress safety, repeated-waypoint restrictions, curated paths and automatic finish all use the engine. No shots may occur after automatic completion. Counts are separated by actual stroke count: immediate2, viaX3. An early curated completion cannot be silently counted as a3-stroke solution.

Exact Float64 cosine rows for tee/waypoint/flag/current landing are reused with the same accumulation and clamp as Embeddings.cosine; all other pairs use the original method. Vector rows are not renormalized for gameplay. The small independent oracle uses fresh Game submissions without preflight, row reuse or cloned prefixes and includes positive automatic-immediate-finish cases. All4,952 accepted real benchmark routes are independently replayed with the original model. Both accepted-route correctness and the exhaustive small-oracle comparison are tested.

Default benchmarks: PENGUIN/CURRENCY/VOLCANO, VELVET/SATELLITE/JEALOUSY, RABBIT/COMPUTING/BAKERY (Par4), ALMOND/CONFECTIONERY/STATUE (Par5), HAMSTER/EXERCISE/ELECTRICITY (Par4). All finish searches are exhaustive for their reported first-shot landings. PENGUIN and VELVET have **no one-shot dogleg landings**; no conclusion about their multi-shot strategies follows. No two-shot approaches or longer paths are enumerated.

The optional programmatic `maximumLandings` bounds only finishing enumeration, not first-shot discovery. Coverage explicitly reports total landings and landings examined, so unexamined routes are never represented as zero.

### Semantic variety and originality

Per-landing continuation concentration uses actual unit-vector pairwise mean cosine; representative words are selected farthest-first. A complete-route coverage sketch uses the mean cosine of the landing and continuation slots (flag occupies the continuation slot for immediate finishes). Up to8 farthest-first prototype routes define deterministic nearest-prototype cells. All members are retained in JSON. These forced cells are **not discovered meanings or named strategies**. Their sizes show concentration of this geometric sketch, not how many clever ideas exist.

`comparePlayerToLandscape` reports whether the actual landing/continuation belongs to the searched scope. A player's two-shot approach is explicitly out of scope, never rare or inferior by default. Shorter obscure solutions do not invalidate a longer satisfying journey. No reliable semantic-originality rank was established from these counts.

### Costs and scope

The reference local run examines36,306 words, with0/0/2/56/2 first-shot doglegs and0/0/100/4,742/110 viaX finishes. Whole search plus geometry took about0.11/0.09/0.27/4.12/0.25 seconds respectively on this machine after model loading. These are Node desktop measurements, not network or iPhone timings. No representative benchmark had an immediate finish; the independent small oracle covers that branch. Larger first-shot pools scale approximately with landings × vocabulary; the bounded option makes incomplete experiments explicit.

V5 route analysis reused V4 caches and took roughly0.24–0.80s across19 supplied routes locally, including profiles and V4. The extra combinations themselves do no new neighbourhood search. Browser panels request analysis only when opened, share the worker's V4 analyser and leave prior reports cached. V5 retains full V4 raw proofs, so exported JSON is deliberately verbose; this research output is not shipped as initial page data.
