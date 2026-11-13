# Random replacements and a welcoming public opening — 13 November 2026

The last twenty new holes are withdrawn from public play only, retaining their permanent archive definitions and saved progress. Their replacements occupy the same public range, **#324–343**. The same forty favourites remain featured, reordered to give a more welcoming first ten. The 283 middle holes at #41–323 retain their order. Public total remains 343; admin retains every archived hole.

## Following the current design file

Generation read `LEVEL_DESIGN.md` from disk. Its SHA-256 is recorded in pool.json, original-candidates.json, candidate-review.json and ordering.json, with an exact source snapshot in design-brief.md. The snapshot and this report are historical evidence, not alternative briefs. No earlier favourite route was used as a generation template.

The broad pool was nominated independently of triples, with six ordinary tee associations per word before random combination. There were 216 word nominations; 211 passed endpoint-policy, support, recent-word and vocabulary-friction screening. Random seed **2026111306** formed 200 original triples in a fixed order before engine checks. `nominate.py --verify` reproduces the recorded order using Python's standard random module. Accepted triples were never edited.

The first 65 candidates supplied twenty survivors. Forty-five were rejected: 26 repeated an endpoint already selected in this batch, 12 had fewer than three successful forward moves among their fixed six, four failed the direct-leg rules, and three had clear editorial giveaways. The editorial review covered the first 80 nominations; generation stopped at the twentieth survivor. Rejected triples were discarded whole. Cached opening results were reused when extending the reviewed prefix; final published survivors were independently replayed for validation. No continuation, route, landing-map, simulation or Cleverness search was performed.

The ordinary opening moves are access evidence, not proof of enjoyment. No advance proof of a clever route or strategic dogleg choice was required. Sixty distinct endpoints happen to survive without recent reuse; novelty is not treated as evidence of quality. Familiar random combinations may be surprising without being designed around an intended explanation.

## Welcoming first ten

These are previously rated holes, not newly authored or altered triples. Selection uses positive notes and familiar early routes, not Cleverness. Novice difficulty has not been calibrated with new players.

| # | Tee | Dogleg | Flag | Basis |
|---|---|---|---|---|
| 1 | ASK | BORDER | GLAD | Rated easy but satisfying. |
| 2 | HANDLE | INTEREST | FOSSIL | Rated a bit easy but still okay. |
| 3 | BAT | TRIAL | PINE | Satisfying, compact route with familiar words. |
| 4 | TRUNK | DELIVERY | PERFUME | Positively rated compact route. |
| 5 | TAP | HOSPITALITY | PORCELAIN | Grounded contexts and interest in improving the finish. |
| 6 | PLOT | ESTATE | BALLET | Easy opening redeemed by a satisfying onward discovery. |
| 7 | POOL | PROMOTION | HEDGE | Positively rated onward discovery. |
| 8 | KNIT | INDUSTRY | VACANT | Positively rated familiar contexts. |
| 9 | PUNCH | CELEBRATION | LEAFLET | Positively rated grounded contexts. |
| 10 | NET | TREATMENT | BASIN | Satisfying, compact route. |

The other thirty favourites preserve their relative order at #11–40, including all eight 5/5 holes. Deep discovery favourites such as LOG, CRAMP, BATTER and QUIVER are retained rather than made the first introduction.

## Twenty random survivors

| Public # | Original candidate | Tee | Dogleg | Flag | Forward opening probes |
|---|---|---|---|---|---|
| 324 | 2 | PEN | DENY | COCKPIT | 3/6 |
| 325 | 3 | TEAPOT | REJECT | ROSEMARY | 4/6 |
| 326 | 4 | DEAF | HOUR | MAID | 5/6 |
| 327 | 6 | SAILOR | TELL | EEL | 3/6 |
| 328 | 10 | FLASK | SCRUB | MINUTE | 3/6 |
| 329 | 11 | MEEK | ROW | KEG | 3/6 |
| 330 | 13 | AGE | SHED | JUDGE | 6/6 |
| 331 | 14 | OBJECT | DOODLE | BAIL | 3/6 |
| 332 | 15 | BROAD | NUT | BLEED | 5/6 |
| 333 | 21 | WAVY | LURE | MUFFIN | 3/6 |
| 334 | 30 | MOP | ERA | BUTLER | 5/6 |
| 335 | 31 | SLEIGH | BOOM | SHOVEL | 5/6 |
| 336 | 34 | YEAR | WASHER | CLOVE | 5/6 |
| 337 | 37 | FIN | INN | SCREW | 4/6 |
| 338 | 40 | SENTENCE | CURVED | BARN | 4/6 |
| 339 | 44 | MAST | MILL | CAPER | 5/6 |
| 340 | 47 | BREW | PILOT | WEEK | 4/6 |
| 341 | 55 | WARDEN | VAIN | AGREE | 5/6 |
| 342 | 58 | SLED | SURF | CHAPTER | 4/6 |
| 343 | 65 | PERIOD | PUB | FOUL | 5/6 |

Final access replay: 84/120 legal forward probes. Pool screening includes all previously public endpoints, the recently withdrawn twenty and the earlier withdrawn concept-transition batch. It does not claim every endpoint is new to the much older archive.

## Preservation and checks

`ordering.json` records previous and final public IDs, the unchanged featured set, reordered first ten, withdrawn twenty and retained middle. `validation.json` records the untouched archive prefix and appended definitions. Feedback/export cohort is `random-replacement-2026-11-13`.

`tests/test_random_replacement_twenty.mjs` checks random reproducibility, design hash, unchanged surviving triples, fixed opening ideas, first-forty membership, onboarding order, retained middle, new-hole positions, public-only withdrawals, archived identities, vocabulary/input policy, freshness, authoritative opening replay and saved progress in an isolated store. Prior curation tests reconstruct their original public view. Gameplay, scoring and feedback implementations are unchanged.
