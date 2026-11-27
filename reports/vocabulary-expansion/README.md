# Selected vocabulary expansion

Adds exactly 1,822 approved words to the 36,306-word vocabulary, for 38,128 words. `selection.json` freezes the selected order and source-selection hash. The 417 deferred inflections remain excluded. This release does not apply the separate proposed existing-word removals or expand the input block list.

Every new word uses its original Stanford GloVe 6B 300d vector, normalised and packed exactly like the existing model. All prior word IDs, vector bytes, hub bytes, spelling representations, optional ABTT rows and LS radii remain unchanged. New hub scores use the frozen 24,995-word hub reference. New optional-profile rows use the original fitted transform and frozen-radius reference. Old full assets remain available for cached configurations and explicit research reproduction.

The existing progressive seed, starter and background packs remain byte-identical. One new background pack appends the 1,822 rows, adding about 1.01 MB compressed vector data. No additional download blocks initial hole rendering. Existing cache entries remain reusable. The new contact table adds frequency values for new words and recognises both vocabulary orders, preserving all original pair flags, frequencies, bonuses and rule versions. No new phrase-pair credits are inferred merely from inflection.

## Replays and scoring

For an existing played word, rescue still consults only the original vocabulary candidates. Newly appended inputs can use existing rescue rules, but cannot silently change the representation, destination or success of an old input. Existing UK/US spelling groups retain their prior canonical representative even when an appended spelling would otherwise take precedence. The frozen noun/adjective rescue table is unchanged; this is not a stemming expansion.

All original semantic-profile records are preserved byte-for-byte. Added profiles use neighbours and concentration percentiles from the original 36,306-word reference. Their occurrence and reciprocal diagnostics measure insertion against the original kth-neighbour thresholds. Profile geometry remains purely vector based.

The live vector scorer evaluates routes containing only original words against the exact original vocabulary/model/profile reference. It preserves prior numeric scores and scorer identity. Routes using added words use the expanded model and appended profiles with the same scoring formula. The reference model hash is recorded on reports that use it. The user-facing report key identifies the current model; a saved journey can accept that new key only for the explicitly known prefix-compatible release and exactly matching state/route. This rebinds report metadata on analysis, without changing the saved game, score identity or resetting player results. Unknown model reports are rejected.

## Build and checks

Run `scripts/extend_play_vocabulary.py --sources /path/to/original/data` with the existing numpy/wordfreq environment, then `node scripts/build-contact-pairs-v2.mjs`. The input directory supplies the original GloVe archive, frozen ABTT transform and original semantic-neighbour graph. The captured `baseline.json` supplies immutable original asset references. The offline `data/` model remains the original research snapshot; use this dedicated append builder for the release rather than regenerating the site from that older snapshot. No private player export or full source archive is published.

`build.json` records hashes and preservation checks. `history-parity.json` compares 22,286 historical shot observations across 33 exports: zero differing events or states. `tests/test_vocabulary_expansion.mjs` verifies all appended rows and old prefixes, all profile records, sampled new-neighbour fingerprints, real browser submissions, scoring of a new-word route, frozen old-route scores and safe report rebinding. Frozen research/calibration tests explicitly use their original reference vocabulary rather than silently reinterpreting old corpus counts. Current-model progressive, mechanics, persistence and scoring checks remain enabled. `deployment-checks.json` records the full Pages test suite.

Browser/worker imports use `vocabulary-expansion-v1` asset tokens. Contact rules and the `band-free-harmonic-v9-finishing-role82` scorer identity remain unchanged. No real browser storage was accessed for validation.
