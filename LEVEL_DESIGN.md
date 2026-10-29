# Choosing Word Golf holes

A good hole offers a satisfying semantic journey. A short route found by the vector search only establishes that the hole is playable; it does not establish that its opening is enjoyable.

For each proposed hole:

- Check the actual scoring for plausible, recognisable opening connections. Both direct endpoint shots must still be rejected by the direct-leg check.
- When the waypoint needs a setup, look for a clever, explainable connection or shift of meaning. Hunting for vague verbs, adjectives or incidental associations must not be necessary to make progress.
- Prefer several credible opening options, including useful small setup shots. Inspect the intended routes in human terms, then verify them with the exact game model.
- Review the first leg and the final leg separately. An interesting finish does not compensate for an arbitrary first move.
- Use play data to identify openings where natural guesses repeatedly fail or go backwards. Reconsider the tee, waypoint or hole word before changing global thresholds or adding more attempts.

## Current format

New daily holes are all **Par 5 with a mandatory dogleg**. Players may reach the dogleg with its literal word or another word in its region. Do not assume the named waypoint is the best landing word. No curated golden-path overrides are needed for ordinary new holes. Use the current engine settings, not an older Par 3/4 estimator: waypoint allowance 0.265, final green 0.27, launch minimum 0.095 and maximum 0.215. Historical attempts retain their recorded rules for reproducible replay.

New distance-mode games also record `second_leg_finish_span: 0.12`: only automatic finishes after playing a subsequent second-leg word use a minimum semantic span of 0.12. The immediate dogleg-entry finish, normal shot contact and backward-shot rules stay unchanged. In particular, CREAM must not gain a new immediate finish to ICEBERG. Old saved histories without the setting retain their original finishing rule (span 0); do not reinterpret old results using the new allowance. A new retry from an old lie adopts the allowance only after its assumed prefix (`second_leg_finish_after`), so already-played shots are preserved.

## Recipe that worked for the fresh 30

On 29 October 2026 the player described the new batch (#136–#165) as quite good. Preserve the approach, rather than copying its words or exact routes:

1. **Start with an understandable conceptual journey.** Find a familiar phrase, physical relationship, material, function or change of word sense that connects two domains. Then choose a dogleg that gives this journey a useful middle objective. Do not start with random distant words and accept whatever vector search can connect.
2. **Make the opening inviting.** A concrete tee should suggest several natural things to try. A short setup shot is welcome; a hunt for an obscure association merely to leave the tee is not. Technical doglegs can work when familiar intermediate words provide a recognisable approach.
3. **Look for a satisfying turn.** A mouse can change from hardware to an animal; a trunk from luggage to timber; a lock from canal infrastructure to keys and then musical keys. Familiar words with different meanings can be more satisfying than rare vocabulary. Include other kinds of connection too, so every hole is not the same polysemy puzzle.
4. **Review both legs and the whole route.** Ask whether a player could explain every association simply, without inventing an incidental scenario. A brilliant final bridge does not excuse an arbitrary opening. Avoid relying on broadly applicable descriptions or category hopping as the only viable route.
5. **Vary the experience across the batch.** Mix accessible discoveries with deeper setups and different domains, tee types and routes. All being Par 5 does not mean all should require exactly five strokes. An engine-found short route is a playability check, not a reason by itself to reject a hole or call it excellent.
6. **Use fresh endpoint words.** When requested, check tees, doglegs and flags against the existing daily schedule and banked definitions; avoid repeats within the new batch too. Intermediary route words may recur. Distinguish this check from knowing every word ever played on a private device. Check exact vocabulary support before committing to a proposal.
7. **Replay a credible complete route in the authoritative engine.** Validate ordinary contact, direction, dogleg transitions, family/plural rescue and actual automatic finishes. Both tee→named-dogleg and named-dogleg→flag direct shots must fail the existing direct-leg check. Record the actual completed route and counted strokes, including the automatic finishing stroke. If natural ideas repeatedly fail, revise the hole rather than certifying it with an obscure but mechanically valid path.
8. **Keep a spoiler audit, then publish safely.** Save example routes and short semantic rationales outside the player-facing hints. They are examples, not exhaustive solutions or claims of optimality. Append after the last scheduled date; preserve every existing definition, ID and date. Alternate dogleg direction and retain the app's normal seeded visual variation. Verify the appended schedule and completed routes before publishing.

Try additional plausible openings where practical. One verified route does not establish that every natural guess will work, that a hole has only one solution, or that its difficulty is known.

## Human judgement and play feedback

Mechanical validity is necessary, not sufficient. Conversely, a humanly excellent association can be undervalued by the vectors. The player's **GONDOLA → SLIDE → MOTION → MOVEMENT → CONCERTO** idea is a useful example: the shift from physical to musical movement feels satisfying, even though the current engine does not grant that finish. Record that as a model limitation, not evidence that the player's idea was poor. Do not silently alter thresholds or add a special word override to make a proposed route pass.

The player's CUCUMBER route was **CUCUMBER → CREAM → LETTUCE → ICEBERG**. LETTUCE supplies the satisfying change of context. Do not mistake the shorter CREAM→ICEBERG association for an equally good semantic payoff just because a more permissive rule could finish it. Rare albatrosses are desirable when the route earns them; stroke count alone is not proof of quality.

Use subsequent play data to retain enjoyable holes, revise frustrating openings, and learn which natural alternatives the model misses. Prefer changing hole choices over global mechanics to rescue a single bad level. Keep experimental rules separate from the settings used to validate a published batch.

Reference batch, including spoilers and engine validation: [fresh daily 30](reports/fresh-daily-30/README.md). Source proposals: [fresh-daily-30-2026-10-29.json](data/fresh-daily-30-2026-10-29.json). Validation/publishing script: [append_fresh_daily_30.mjs](scripts/append_fresh_daily_30.mjs).
