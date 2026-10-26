# Semantic journey benchmark — v2

Model: `3d9d067950da6a9f2d5de7edfb18087ab7cfb7f6acd4ce1d8181514e28a441f0`; vocabulary 36306. Existing neighbourhood formulas unchanged. No route search.

## Completed legal routes

| Route | Best pivot (score) | Backtracking | First / warm ms |
|---|---|---|---|
| pencil → lines → lake → bass → orchestra | lake 15.9% | 0.0% | 209 / 58 |
| pencil → bamboo → flute → orchestra | flute 1.6% | 0.0% | 83 / 16 |
| pencil → work → consists → orchestra | consists 2.7% | 0.0% | 75 / 16 |
| pencil → look → national → orchestra | national 2.0% | 0.0% | 70 / 12 |
| penguin → book → alien → galaxy | alien 14.4% | 0.0% | 119 / 10 |
| penguin → books → tablet → galaxy | tablet 11.0% | 0.0% | 74 / 10 |

## Semantic-only controls

These paths are supplied directly for vector diagnostics, without claiming legal gameplay or inventing a dogleg. Objective progress is unavailable and omitted from the pivot formula; scores should not be compared directly with objective-adjusted gameplay reports.

| Route | Best pivot | Pivot score | Backtracking |
|---|---|---|---|
| robot → activity → disorder → chaotic → spiral → stairs | spiral | 26.9% | 1.7% |
| ocean → beach → ocean → beach → sand | beach | 1.9% | 56.1% |
| big → large → huge → enormous → gigantic | huge | 2.9% | 7.5% |

### Supplied ROBOT example

- ACTIVITY: separation 4.5%, setup gain for its successor 0.220 (no preceding setup to score as pivot).
- DISORDER: separation 27.2%, setup gain for its successor 0.090, supported pivot 13.3%.
- CHAOTIC: separation 18.4%, setup gain for its successor 0.031, supported pivot 7.9%.
- SPIRAL: separation 54.0%, setup gain for its successor 0.297, supported pivot 26.9%.

SPIRAL is the strongest supported pivot; CHAOTIC contributes positive but modest setup gain. CHAOTIC’s gain into SPIRAL (+0.031) is distinct from SPIRAL’s own gain into STAIRS (+0.297); ACTIVITY also has substantial setup gain (+0.220) without being the strongest pivot. The synonym control has a small nonzero loop signal because real vectors are imperfect; the explicit return loop is much stronger.

The support weighting, equal leg weights and linear objective coordinates are provisional choices, not human-calibrated parameters. Generic bridges can still score highly. No single cleverness rating or scoring effect is introduced. Inspect benchmark.json for every component, loop and objective coordinate.
