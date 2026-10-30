# Choosing Word Golf holes

## Current editorial direction — 31 October 2026

**Choose interesting words first. Players discover the route.** The aim is an accessible landscape of associations, not an authored sequence of clever bridges. This supersedes the old route-first recipe and the October 30 emphasis on requiring setup shots.

FAME is the reference example: familiar, evocative, and open to different contexts without suggesting one compulsory category. It is a noun, so this is not a ban on nouns. Familiar verbs, adjectives and words with several grammatical uses can help vary the bank, but grammatical patterns are not a quality test either.

### Select the words

- Consider tee, dogleg and flag individually before looking for a route. Each should be familiar and worth thinking about. The dogleg and flag matter as much as the tee.
- Prefer words that suggest several meaningfully different directions: actions, experiences, emotions, social situations, physical qualities, functions or different senses. Three near-synonyms within one category do not establish versatility.
- Avoid repeatedly choosing tees whose main appeal is their species, ingredient or object category. MINNOW → FISH, SCALLOP → SHELL, TUNA → FISH and HOLLY → BERRY illustrate the problem. Animals and foods can still work; evaluate the actual possibilities rather than banning whole word classes.
- Avoid a procession of concrete nouns and named academic disciplines. A specialised -ology dogleg often makes SCIENCE or RESEARCH the predictable doorway, while adding vocabulary burden. This is an editorial warning, not a suffix ban; some discipline names are familiar and useful.
- Familiar does not mean generic, and unusual does not mean interesting. Do not use obscure species, technical terms or esoteric secondary meanings just to make a hole seem fresh. Reusing a strong accessible word in a different combination is better than reaching for rarer vocabulary to satisfy novelty quotas.
- Choose three seemingly distant words whose contexts leave room for exploration. Do not maximise vector distance. Reject triples that merely look quirky together but need strained associations to play.

### Check the opportunities, without designing the answer

1. List several natural starting directions for each word **before** searching for a complete route. Ask whether the opening is dominated by one obvious parent category, stock phrase or intermediate. This is qualitative judgement, not a numeric diversity quota.
2. Combine independently worthwhile words. Vary contexts and parts of speech across the bank without enforcing a noun/verb/adjective template.
3. Use the actual engine to check the existing direct-leg rule, vocabulary support, natural opening hits and plausible progress towards the dogleg and flag. Do not change thresholds to rescue editorial choices.
4. Probe more than one plausible opening and, where practical, different dogleg landings. This is a check for room to explore, not an exhaustive route search or proof of strategic diversity. Record what was tested and what was not.
5. A verified complete route is a safety check against a broken or frustrating hole. It is **not** the creative brief, an intended solution, evidence that a hole is fun, or a reason to route-first-search for another dogleg to fit that sequence. If only obscure or contrived paths work, revisit the words.
6. Do not require two shots to the dogleg, a minimum example stroke count, a particular polysemy switch, a high Cleverness score, or a surprising vector association as quality gates. These can all occur in a poor hole. Short and long solutions may both be enjoyable.
7. Review both legs and the complete triple. Several familiar words do not guarantee a familiar or natural relationship between them. A clever-looking finish cannot compensate for a narrow or awkward opening.
8. Keep optional diagnostic routes and evidence outside player-facing hints. Describe them as examples, never the route the player should find. Keep known historical audits, with their original rules, for reproducibility.
9. Let human play feedback decide. Editorial concerns are hypotheses unless supported by play data. Recommend questionable existing holes for review; retire additional ones only when the user authorises it.

### Publish safely

Append new holes after the existing schedule, preserving definitions, stable IDs, dates and saved progress. Alternate dogleg direction and keep seeded visual variation. Retire authorised combinations using the retirement list rather than deleting records or changing surviving IDs. Check novelty when requested, but never trade word quality for an unused-word quota. Do not add or replace holes merely because a review flagged them.

## Current format

New daily holes are all **Par 5 with a mandatory dogleg**. Players may reach the dogleg with its literal word or another word in its region. Do not assume the named waypoint is the best landing word. No curated golden-path overrides are needed for ordinary new holes. Use the current engine settings, not an older Par 3/4 estimator: waypoint allowance 0.265, final green 0.27, launch minimum 0.095 and maximum 0.215. Historical attempts retain their recorded rules for reproducible replay.

New distance-mode games also record `second_leg_finish_span: 0.12`: only automatic finishes after playing a subsequent second-leg word use a minimum semantic span of 0.12. The immediate dogleg-entry finish, normal shot contact and backward-shot rules stay unchanged. In particular, CREAM must not gain a new immediate finish to ICEBERG. Old saved histories without the setting retain their original finishing rule (span 0); do not reinterpret old results using the new allowance. A new retry from an old lie adopts the allowance only after its assumed prefix (`second_leg_finish_after`), so already-played shots are preserved.

New personal-game attempts also use `spelling_equivalence: "uk-us-v1"`. Use this explicit setting when validating newly authored routes: curated UK/US forms share one semantic row, while historic route audits without it retain original rules. See [the spelling audit](reports/spelling-equivalence/README.md) for coverage and examples of setup changes.

## Human judgement and play feedback

Mechanical validity is necessary, not sufficient. Conversely, a humanly excellent association can be undervalued by the vectors. The player's **GONDOLA → SLIDE → MOTION → MOVEMENT → CONCERTO** idea is a useful example: the shift from physical to musical movement feels satisfying, even though the current engine does not grant that finish. Record that as a model limitation, not evidence that the player's idea was poor. Do not silently alter thresholds or add a special word override to make a proposed route pass.

The player's CUCUMBER route was **CUCUMBER → CREAM → LETTUCE → ICEBERG**. LETTUCE supplies the satisfying change of context. Do not mistake the shorter CREAM→ICEBERG association for an equally good semantic payoff just because a more permissive rule could finish it. Rare albatrosses are desirable when the route earns them; stroke count alone is not proof of quality.

Use subsequent play data to retain enjoyable holes, revise frustrating openings, and learn which natural alternatives the model misses. Prefer changing hole choices over global mechanics to rescue a single bad level. Keep experimental rules separate from the settings used to validate a published batch.

Reference batch, including spoilers and engine validation: [fresh daily 30](reports/fresh-daily-30/README.md). Source proposals: [fresh-daily-30-2026-10-29.json](data/fresh-daily-30-2026-10-29.json). Validation/publishing script: [append_fresh_daily_30.mjs](scripts/append_fresh_daily_30.mjs).

## What changed after play feedback

The old recipe began with a conceptual journey and selected a dogleg to support it. The next revision rewarded setup shots and familiar changes of meaning. Both still overvalued the author's explanation of a route and encouraged species/food tees followed by category hops. They are superseded by the word-first process above.

The player explicitly retired GUAVA → HORTICULTURE → ROBIN, OKRA → CONSERVATION → SWALLOW, BELLOWS → FORGE → CLOVER, and then seven further holes on October 31. Other questionable holes are recommendations only. See [the complete bank review and shortlist](reports/hole-word-review-2026-10-31/README.md).

Historical batch reports remain as records of what was published and validated at the time, not current generation instructions. No automatic word-quality filter or gameplay rule is introduced by this guide.

The first word-first playtest is the [twenty-hole pilot](reports/word-first-20/README.md), published as #244–#263. Its proposals contain words and independent association notes, without prescribed routes. Bounded post-selection completion witnesses are safety diagnostics, not new templates for generation; mechanically valid generic associations do not establish enjoyment. Use the player's feedback on the words and exploration to assess this pilot.
