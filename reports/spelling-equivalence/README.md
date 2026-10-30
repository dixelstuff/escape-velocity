# UK/US spelling equivalence

The current personal game starts new tee attempts with `spelling_equivalence: "uk-us-v1"`. This is an input-semantics version, **not a new Cleverness formula**. The existing cubic band-free harmonic scorer, coefficients, leg factors, opportunity correction, one-stroke bonus and scoring ceiling are unchanged.

## Shared representation

`static/spelling-equivalence.mjs` contains a small, hand-curated list of spelling families. Inflections are expanded once for these explicitly listed families, never by applying blanket substitutions to arbitrary input. At model initialisation the supported families become cached lookups. Both spellings select one existing row: the listed US spelling if it exists, otherwise the listed UK spelling. The rule is fixed independently of route quality or the calibration examples.

This avoids averaging vectors, searching spelling combinations, downloading another dictionary, rewriting the model, or regenerating the large precomputed neighbourhood-profile library. The original reference vocabulary and its neighbourhood geometry remain unchanged. Cleverness canonicalises the completed route and its word-bearing state fields before calculating evidence, so both spellings use the same profiles, context, lexical-component checks and strategy replay. Display routes and played labels retain the entered spelling. Reports include the semantic version and canonical route for research reproducibility.

Examples include COLOR/COLOUR, CENTER/CENTRE, THEATER/THEATRE, ORGANIZE/ORGANISE, ANALYZE/ANALYSE, TRAVELED/TRAVELLED, JEWELER/JEWELLER and their supported inflections. The lookup also accepts mapped spellings absent from the original vocabulary when their shared row exists. No new vectors are needed.

Conservative scope: CHECK/CHEQUE, TIRE/TYRE, CURB/KERB, STORY/STOREY, METER/METRE, DRAFT/DRAUGHT and PROGRAM/PROGRAMME are not blindly merged. Those forms differ in sense coverage, so treating the whole words as interchangeable could create unwanted bridges. Other unlisted spelling differences remain distinct until the curated list is extended.

## Gameplay and display

- Tee, dogleg, flag and player-entered words all use shared similarities and hub values.
- Contact, progress, dogleg membership, automatic finishing and visual lie offsets therefore agree for mapped variants.
- A spelling of the current word, or an alternative spelling of an earlier word on the same leg, is rejected without recording a shot. Existing cross-leg reuse remains permitted. A played literal dogleg cannot be replayed in the second leg under another spelling.
- Playing an alternative spelling of the flag is a single manual finishing stroke, without an extra automatic stroke.
- Player-entered labels and route text keep the original spelling; semantic label identities avoid duplicate endpoint labels.
- Existing plural and noun/adjective rescue conditions and tolerances are unchanged. DRUM/DRUMS and INSPECTION/INSPECTOR are not spelling aliases. Rescue candidate construction uses the shared spelling so UK and US forms receive identical limited rescue behaviour.
- Retired holes match spelling-equivalent endpoint combinations too. IDs, schedules, stored routes and stats are not renamed or merged.

## Historical compatibility

The core engine remains explicitly versioned; historical research and saved histories without this field use their original rows. Restoring a saved attempt does not reinterpret shots, change strokes or invalidate a route. A fresh start from the tee adopts the new rule. An old prefix retried from a later lie retains its recorded spelling rules for that attempt, as does continuing an already-started legacy attempt. Returning to the tee adopts equivalence. Existing historical best results remain historical results rather than being silently overwritten.

Profile/report caches distinguish new spelling semantics from legacy evidence. Browser module cache identities are updated, but vector/profile asset names and hashes are unchanged.

## Validation

The reproducible audit is [validation.json](validation.json); run `node scripts/check_spelling_equivalence.mjs`.

| CARROT → ORANGE → … → PRISM | Original vectors | Shared spelling semantics |
|---|---:|---:|
| COLOR | 86 | 86 |
| COLOUR | 89 | 86 |

Both new scores are **85.72712191606237 before rounding**, with equal I/S/E, complete band-free breakdowns and numerical shot evidence. Their original displayed spellings remain intact.

All **23 existing vector calibration routes** complete under the new rule and retain their existing displayed Cleverness scores.

Across the 69 non-retired, previously audited routes from the latest two authored batches:

- 62 routes have exactly unchanged mechanical states apart from the new rule field.
- Four others still finish in the same strokes, with different underlying spelling-vector evidence: TERRAPIN → DEFENCE → OMELETTE, CARROT → LIGHT → PRISM, HYENA → COMEDY → CLARINET, and CROW → PRINTER → PALETTE.
- Three formerly accepted routes need an additional natural setup under the shared representation. This is the direct consequence of removing their spelling-specific vector advantage, not a threshold adjustment:

| Hole | Verified current-rule example route | Strokes |
|---|---|---:|
| TURMERIC → CINEMATOGRAPHY → POPCORN | TURMERIC → YELLOW → COLOUR → FILMS → POPCORN | 4 |
| CELERY → CRAFT → KAYAK | CELERY → STALK → FIBRE → THREAD → CANVAS → BOAT → KAYAK | 6 |
| PETUNIA → MOULD → CANDELABRA | PETUNIA → FLOWER → POT → CLAY → MOULD → WAX → CANDLE → CANDELABRA | 7 |

These are bounded checks of observed routes, not shortest-route claims or exhaustive searches. Published historical route-audit tests still replay their original rules explicitly; current-rule compatibility is separately audited above.

`test_spelling_equivalence.mjs` checks all active aliases, model-row sharing, hub equality, inflections, endpoint combinations, label positions, entered spelling, repeat prevention, cross-leg reuse, manual finishing and exact historical replay. `test_spelling_cleverness.mjs` checks equal unrounded scores and evidence, separated cache identities and intact legacy 86/89 diagnostics. Existing scoring, plural and family-rescue regressions also remain required.

## Cost

The new module is about **6.4 KB uncompressed / 2.5 KB gzip**. The audit currently expands 726 curated form pairs, activates 608 supported spelling strings and accepts 65 additional spellings through existing rows. Lookup initialisation measured about **0.6 ms** locally. Both spellings share the original vector matrix; no duplicate matrix or new profiles are allocated.

An interleaved, warmed Node microbenchmark measured approximately **33.0 ms raw versus 38.1 ms with lookups per 100,000 300-dimensional cosine comparisons**: roughly **0.051 microseconds per comparison** extra. Browser/JIT results will vary; this is not a whole-game latency guarantee. Expensive neighbourhood scans still use the existing typed arrays and precomputed profiles, and UK/US routes share the same warmed semantic evidence. No repeated evaluation of spelling combinations occurs during a shot or score calculation.
