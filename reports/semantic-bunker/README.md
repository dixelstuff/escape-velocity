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

The ball flies to the centre of the existing dogleg sand shape, with a small dot on the sand and a yellow label out in the inner rough, connected by the usual thin leader line. No hit oval is drawn. No obstacle, path, tree, green or fairway geometry is added or moved. Labels remain upright on both dogleg orientations. Hypothetical forward-miss ghosts are suppressed for trap hits, avoiding a misleading label at a semantic destination the ball never reached.

## Data isolation

The original three-word custom IDs are unchanged. Experimental on/off configurations receive deterministic separate `custom-bunker-…` IDs and retain their own journeys and results. Their `bunker_experiment.source_id` keeps scenery identical to the source hole. They are excluded from ordinary recent-finishes/player-stat aggregation. No storage reset or migration is introduced. Saved originals and their best results remain intact.

The scoring formula and scorer version are unchanged. The optional rule is included in semantic cache identity so experiments cannot reuse incompatible cached mechanical evidence. Most changed analysis-module lines only invalidate cached imports of the updated authoritative engine.

## Cost

No new dataset or network API. A configured first-leg shot adds one 300-component dot product (or skips it entirely for nonmatching exact-only inputs); normal holes and second legs perform no bunker cosine. Bunker word rows use the existing progressive loader. The UI and matching logic are small static modules.

## Validation

`node tests/test_semantic_bunker.mjs` covers exact-only, threshold boundary, very close/below-threshold words, stage transition, ordinary miss accounting, unchanged normal route replay, deterministic bunker replay/retry/restart, equivalent spellings, target-ready hint, separate persistent control/test IDs, untouched original records, exclusion from normal stats, and existing bunker anchors for both orientations/viewports.

114 existing workflow checks (including the added bunker check; excluding the separately edited landscape research test locally) passed. Targeted scoring, storage/reset and UI checks also pass. An isolated native-Chrome test exercises desktop and mobile layouts: UI configuration, yellow label, unchanged centreline, catch feedback and similarity, reload of the test configuration, bunker-off comparison and return to the original. Real player storage was not used or cleared.

## Five 0.40 examples — 6 November

The admin experiment panel now offers a **Five example holes · similarity 0.40** picker and **Play example** button. Starting an example registers all five as separate test configurations, so they also appear in the normal admin hole selector and can be navigated in sequence. The original archive and public collection stay unchanged.

| Tee | Dogleg | Flag | Bunker |
| --- | --- | --- | --- |
| SPARE | DREAM | TENSION | SLEEP |
| PROMISE | SHADOW | LUCK | DOUBT |
| CHARM | SPLIT | DUTY | LOVE |
| DRESS | FREEDOM | SPARK | FREE |
| CIRCLE | RESCUE | WARM | FIRE |

These are variants of familiar, previously played holes rather than a new generation method. They remove a sleep-related approach, a doubtful interpretation, an affection-related opening, the free/freedom shortcut and a fire/rescue approach respectively. At 0.40 the exclusion is intentionally broader than the conservative default. Several ordinary opening associations remain on each example; this is a lightweight playable-opening check, not a guarantee of difficulty or an exhaustive route search.

`node tests/test_bunker_examples.mjs` loads the actual GloVe vectors and uses the authoritative game engine. Across ten plausible input controls per hole it retains 5, 5, 8, 4 and 5 legal openings respectively, while exercising catches on each. It also verifies exact catches, deterministic saved replay, independent persistent IDs and absence of changes to original/public definitions.

Both bunker orientations and mobile/desktop layouts are checked geometrically: the label sits more than 70 map units from its sand dot, and the full label clears the inner fairway bank into the rough. Browser smoke testing checks all five examples, their 0.40/non-exact configuration, marker/leader, lack of any hit oval, reload and on/off/original comparison. Neither gameplay nor scoring formulas changed.

## Both-leg revision — 6 November

New tests now use `semantic-bunker-v2-both-legs`. The same word, exact-match option and similarity threshold apply on both legs. Before the dogleg its marker is on the existing dogleg sand; after the turn it relocates to the existing rear greenside bunker. Failed second-leg swings count/end/retry just like other misses. A retry from a first-leg lie restores the dogleg marker; a retry from a second-leg lie retains the greenside marker. Automatic finishing strokes are unchanged: the exclusion checks intentionally submitted words.

Leader offsets are shortened from (6% width, 70 map units) to (3.5% width, 45 map units), with the label in the rough. The greenside label sits outside the rear edge of the green, using the same shorter offset. Neither location adds a hit oval or changes sand/green geometry.

Archived `semantic-bunker-v1` configurations keep their first-leg-only rules, saved event geometry and bests. New example/test configurations receive a different version in their deterministic identity, so they cannot replace these old results. Use **Play example** again or **Test this setting** to open the revised two-leg variant. Old configurations are identified as earlier first-leg-only tests in the panel. Original/public holes and scoring formulas are unchanged.

Tests cover exact/near catches on the second leg, unchanged ordinary second-leg shots, deterministic failure replay, last-lie retries, legacy successful second-leg replay, distinct old/new identities, marker selection in both orientations and label placement in rough on mobile/desktop layouts. Isolated browser checks exercise the turn, caught second-leg shot, reload and tapping back to tee.
