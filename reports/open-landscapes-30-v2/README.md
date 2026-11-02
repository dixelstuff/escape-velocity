# Open landscapes, second batch — 3 November 2026

Added **#352–#381**, all Par 5 with a mandatory dogleg and unlimited play. Internal schedule dates: **4 November–3 December 2027**. Future preview remains available. All **380 previous archived definitions**, IDs, dates and saved-progress rules are unchanged. No holes were retired.

## Selection approach

Continue the balance the player explicitly liked in #322–#351: interesting familiar words, accessible choices, and room to return and improve. Do not maximise semantic distance, force long solutions or select words to fit a Cleverness bonus. No Cleverness score was used to select this batch.

One hundred word-only triples were fixed before engine checks. Independent context notes describe ordinary associations for each word; there is no intended route in proposals or live settings. Fifty-six combinations received deeper landing/continuation inspection. Thirty were selected after reviewing openings, reached landing choices and completion examples. Quick routes remain welcome; bounded witnesses are safety evidence, not the route the player should discover.

Word choice mixes physical actions, objects with several uses, experiences, social ideas and abstract qualities. Examples include STRIKE, SPELL, POUND, SPOT, FIRM, CLIP and TRIM; none needs an obscure specialist definition. There are **81 distinct words in 90 slots**, with no word used more than twice inside the batch. Familiarity takes priority over unused-word quotas.

Examples passed over:

- BOLT → ENVY → HARBOUR: the completion witness relies on a diffuse emotional/physical chain, with less convincing opportunities than preferred here.
- LEAN → GLORY → DUST: only one advancing opening in the initial independent context suggestions.
- LATCH → FAME → DRIFT: the recorded witness repeats CHANCE and ends through broadly descriptive CASUAL/LOOSE associations.
- WIRE → COURAGE → MINT: the completion example relies heavily on LIGHT/GENTLE/KIND/SWEET descriptive links.
- HUSH → FORTUNE → PLANT: the sample circles through SECRET/SHARE/FRIEND rather than demonstrating clear progression.

Other proposals failed the existing direct-leg rule or lacked a supported completion in the bounded check. This is not proof that a hole is unplayable. Some sound candidates were passed over simply for variety in the final mix.

## Recorded evidence

- All 30 have complete diagnostic routes independently replayed through the authoritative engine, including automatic finishing strokes.
- Successful advancing opening suggestions range from **3 to 11** per hole in the supplied context graph.
- The deeper checks found **1,076 reached landing words** across the batch. Every landing retains its actual incoming prefix and second-leg baseline.
- Each landing sees the same per-hole pool of candidate onward words, allowing differences in successful contact, progress and finishing to be inspected fairly.
- Context-supported onward-option sets differ on every selected hole. This is observed mechanical variety, not proof of distinct human concepts or enjoyment.
- Independent regression replay confirmed **261,980 shared-pool onward-shot probes** and all 30 completion examples.
- No shot rules, thresholds, vectors, vocabulary, scoring, limits, header, map layout or input behaviour changed.

The context graph can miss good associations and accept vague ones. Human play remains the authority; the recorded counts are not generation targets or difficulty ratings.

## New holes

| Hole | Tee | Dogleg | Flag |
| --- | --- | --- | --- |
| #352 | STRIKE | KINDNESS | CURTAIN |
| #353 | SPELL | PRESSURE | POCKET |
| #354 | POUND | ROMANCE | FLOW |
| #355 | SPOT | FREEDOM | WIRE |
| #356 | FIRM | WONDER | RIBBON |
| #357 | CLIP | DREAM | BREATH |
| #358 | TRIM | JUSTICE | SPARK |
| #359 | WINK | SEASON | GRIP |
| #360 | PATCH | CHANCE | WHISPER |
| #361 | SWEET | WITNESS | COIL |
| #362 | SHADE | FAME | CLEAN |
| #363 | FAINT | FAMILY | STAMP |
| #364 | POISE | DANGER | SILVER |
| #365 | SHADOW | RHYTHM | TREAT |
| #366 | CLAIM | MUSIC | TIP |
| #367 | GRANT | CURTAIN | ROLL |
| #368 | FROST | FREEDOM | FIRM |
| #369 | HURRY | PAPER | GRACE |
| #370 | CHEER | MYSTERY | PLANT |
| #371 | FEAST | BALANCE | HINT |
| #372 | PALE | STORY | LATCH |
| #373 | PUZZLE | HONOUR | SINK |
| #374 | SHARP | SHELTER | SPELL |
| #375 | SPARK | PATIENCE | RANK |
| #376 | SWING | MEMORY | BRACKET |
| #377 | TWIST | FAMILY | SHELF |
| #378 | BOUND | GIFT | WEATHER |
| #379 | POCKET | SPIRIT | STREAM |
| #380 | SILK | CURIOSITY | BEAM |
| #381 | MYSTERY | DUTY | CLIP |

## Files and validation

- `candidates.json`, `candidate-review.json`: all fixed nominations and dispositions.
- `proposals.json`, `directions.json`, `contexts-additions.json`: selected words and independent general association notes; no intended solutions.
- `safety.json`: compact offline diagnostic spoilers, opening checks, reached lies, shared probe pools and outcomes. This is not a browser asset.
- `validation.json`: original archive hash and exact appended definitions.
- `node tests/test_open_landscapes_30_v2.mjs` independently replays the completion examples and landing-choice probes, validates saved-progress preservation, and verifies all 380 prior definitions remain unchanged.
- Reproduce the bounded deeper checks with `node scripts/check_dogleg_choices.mjs reports/open-landscapes-30-v2/review-candidates.json reports/open-landscapes-30-v2/directions.json /tmp/open-v2-checks.json`. The raw result is large; the retained audit compacts per-shot results into equivalent outcome sets.

Publishing uses `scripts/append_open_landscapes_30_v2.mjs`, which refuses duplicate publication and duplicate canonical word triples. Reused UK/US forms retain their existing semantic identity.
