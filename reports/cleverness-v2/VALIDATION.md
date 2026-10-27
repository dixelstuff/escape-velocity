# Cleverness v2 — supplied-route validation

Current model `3d9d067950da6a9f2d5de7edfb18087ab7cfb7f6acd4ce1d8181514e28a441f0`. No example-word special cases or threshold changes. All comparisons call Game.submit/pluralShot through the live engine.

| Case | Exact path reproduced | Mechanical finding | Semantic evidence leader |
|---|---|---|---|
| A · squid / printing / espionage | Yes | 0 avoidable strokes; setups: ink, document | ink, document |
| B · prawn / tyrant / salesman | Yes | 0 avoidable strokes; setups: king, ruler, head | head, ruler, king |
| C · robot / manic / stairs | Yes | 0 avoidable strokes; setups: activity, disorder, chaotic, spiral | spiral, disorder, chaotic |
| D · hamster / exercise / electricity | Yes | 0 avoidable strokes; setups: wheel | wheel, power |
| E · flute / plumbing / botany | Yes | 1 avoidable strokes; setups: pipe, plant | pipe, water, plant |
| F · apricot / perfumery / chemistry | Yes | 1 avoidable strokes; setups: chemical | perfume, smell, chemical |
| G · honeycomb / architecture / orchestra | Yes | 2 avoidable strokes; setups: design, music | pattern, lattice, notes |
| H · rabbit / computing / bakery | Yes | 3 avoidable strokes; setups: bunny, pad, electric, cook, oven | computer, pad, mouse |
| I · rabbit / computing / bakery | Yes | 0 avoidable strokes; setups: mouse, computer, engineer, baker | mouse, computer, engineer |
| J · rabbit / computing / bakery | Yes | 0 avoidable strokes; setups: mouse, chips, pie | chips, mouse, pie |
| K · almond / confectionery / statue | Yes | 0 avoidable strokes; setups: sugar, hard, stone | stone, sugar, hard |
| L · tortoise / navigation / wedding | Yes | 0 avoidable strokes; setups: sea, beach | beach, sea |
| M · mate / plate / fate | Yes | 0 avoidable strokes; setups: friend, date | dinner, date, friend |

## Interpretation

The ordering is diagnostic evidence, not a cleverness score or human sense classification. First played words are eligible. No stroke count or objective progress enters the semantic ordering. Lexical discounts affect only evidence at the matched objective association; original semantic data remains available.

Detailed JSON retains every submitted shot, actual vs requested routes, full bypass proofs, combined-removal proofs, per-word witnesses and dogleg candidate counts. A discrepancy is not silently patched by changing rules. The longer rabbit path demonstrates large compressions; the honeycomb path tests two removals together. Dogleg landing changes are replayed through the second leg.

Historical scorecards (when a matching supplied path is found) are noted with the recorded model hash. A mismatch is not treated as proof that the historical game was wrong.
