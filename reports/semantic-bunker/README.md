# Semantic dogleg bunker prototype

Optional admin experiment. No generated or existing hole definitions are changed.

## Use

Open `?admin=1`, select any hole, then expand **Choose or create a hole → Semantic bunker experiment**. Enter a bunker word and choose **Test this setting**. **Compare without bunker** opens a separate control using exactly the same source settings and landscape seed. **Return to original** opens the original saved hole.

- **Enable bunker word** can be turned off.
- **Exact match only** is the default. UK/US equivalent spellings share the exclusion, consistently with the existing spelling rule. This does not silently expand to plurals or adjective/noun families.
- Uncheck exact match to use raw GloVe cosine, initially **0.85**. A word is caught if its similarity is at least the threshold; the literal/equivalent word is always caught. The field accepts 0–1 for experiments; reducing it deliberately broadens the trap.
- Existing vocabulary validation and no-shot input restrictions remain in place. A trap doesn't make an otherwise invalid/current-word input into a shot.
- Feedback displays similarity to three decimals on the map; the experimental control retains six decimals. Full numeric data and configuration are saved in shot exports.

## Mechanics

A normal shot proposal is calculated with existing contact, directional progress, plural/family rescue and finish rules. On the first leg only, compare the **entered** word to `semantic_bunker.word` using raw GloVe (with shared UK/US representation, without headwind/local scaling). A catch changes success and won to false and records an ordinary `miss` plus `{word, similarity, threshold, exact, exact_only}` bunker evidence. It cannot switch targets or finish automatically. It ends the attempt and follows the existing last-lie retry flow. After reaching the dogleg, there is no bunker check. Retries and restored histories retain the recorded optional configuration.

The ball flies to the centre of the existing dogleg sand shape, with a yellow label/hit indication. No obstacle, path, tree, green or fairway geometry is added or moved. Labels remain upright on both dogleg orientations. Hypothetical forward-miss ghosts are suppressed for trap hits, avoiding a misleading label at a semantic destination the ball never reached.

## Data isolation

The original three-word custom IDs are unchanged. Experimental on/off configurations receive deterministic separate `custom-bunker-…` IDs and retain their own journeys and results. Their `bunker_experiment.source_id` keeps scenery identical to the source hole. They are excluded from ordinary recent-finishes/player-stat aggregation. No storage reset or migration is introduced. Saved originals and their best results remain intact.

The scoring formula and scorer version are unchanged. The optional rule is included in semantic cache identity so experiments cannot reuse incompatible cached mechanical evidence. Most changed analysis-module lines only invalidate cached imports of the updated authoritative engine.

## Cost

No new dataset or network API. A configured first-leg shot adds one 300-component dot product (or skips it entirely for nonmatching exact-only inputs); normal holes and second legs perform no bunker cosine. Bunker word rows use the existing progressive loader. The UI and matching logic are small static modules.

## Validation

`node tests/test_semantic_bunker.mjs` covers exact-only, threshold boundary, very close/below-threshold words, stage transition, ordinary miss accounting, unchanged normal route replay, deterministic bunker replay/retry/restart, equivalent spellings, target-ready hint, separate persistent control/test IDs, untouched original records, exclusion from normal stats, and existing bunker anchors for both orientations/viewports.

114 existing workflow checks (including the added bunker check; excluding the separately edited landscape research test locally) passed. Targeted scoring, storage/reset and UI checks also pass. An isolated native-Chrome test exercises desktop and mobile layouts: UI configuration, yellow label, unchanged centreline, catch feedback and similarity, reload of the test configuration, bunker-off comparison and return to the original. Real player storage was not used or cleared.
